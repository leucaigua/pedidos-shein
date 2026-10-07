import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Ejecuta la lógica de métricas sin red, credenciales ni escrituras en Supabase.
const exports = {};
const source = ts.transpileModule(fs.readFileSync(new URL('../lib/dashboard.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(source, { exports });
const { dashboardRange, aggregateDashboard, caracasDate } = exports;
const range = dashboardRange(7, new Date('2026-10-07T14:00:00Z'));
const order = (overrides = {}) => ({ id: 'order', codigo: 'PS-TEST', created_at: '2026-10-02T12:00:00Z', cliente_nombre: 'Cliente', cliente_estado: 'Monagas', total: 100, estado: 'pendiente_pago', estado_pago: 'pendiente', archivado: false, archivado_motivo: null, ...overrides });

test('el período usa días de Caracas y compara la misma cantidad de días', () => {
  assert.equal(caracasDate('2026-10-01T03:59:59Z'), '2026-09-30');
  assert.equal(range.start, '2026-10-01');
  assert.equal(range.end, '2026-10-07');
  assert.equal(range.previousStart, '2026-09-24');
  assert.equal(range.fromISO, '2026-09-24T04:00:00.000Z');
  assert.equal(range.toISO, '2026-10-08T04:00:00.000Z');
});

test('ventas, ticket y cobros separan pagos confirmados, abonos y pedidos sin pago', () => {
  const data = aggregateDashboard(range, [
    order({ id: 'a', estado: 'comprando', estado_pago: 'abono_60', total: 100 }),
    order({ id: 'b', estado: 'entregado', estado_pago: 'pagado_total', total: 200, archivado: true, archivado_motivo: 'completado' }),
    order({ id: 'c', total: 50 }),
    order({ id: 'd', total: 900, estado: 'entregado', estado_pago: 'pagado_total', archivado: true, archivado_motivo: 'no_pago' }),
    order({ id: 'e', created_at: '2026-09-25T12:00:00Z', total: 50, estado_pago: 'pagado_total' }),
  ], [], [], []);
  assert.equal(data.metrics.orders.value, 4);
  assert.equal(data.metrics.sales.value, 300);
  assert.equal(data.metrics.sales.previous, 50);
  assert.equal(data.metrics.sales.change, 500);
  assert.equal(data.metrics.average.value, 150);
  assert.equal(data.metrics.collected.value, 260);
  assert.equal(data.metrics.receivable, 40);
  assert.equal(data.metrics.pendingOrders, 1);
  assert.equal(data.metrics.pendingAmount, 50);
  assert.equal(data.daily.length, 7);
  assert.equal(data.daily.reduce((sum, row) => sum + row.ventas, 0), 300);
  assert.equal(data.daily.reduce((sum, row) => sum + row.pedidos, 0), 4);
  assert.equal(data.paymentMethods.reduce((sum, row) => sum + row.count, 0), 2);
});

test('las cotizaciones archivadas no son oportunidades pendientes y se calcula recuperación real', () => {
  const data = aggregateDashboard(range, [], [
    { created_at: '2026-10-01T12:00:00Z', estado: 'pendiente_aprobacion', archivado: false },
    { created_at: '2026-10-01T12:00:00Z', estado: 'pendiente_aprobacion', archivado: true },
    { created_at: '2026-10-01T12:00:00Z', estado: 'aprobada', archivado: false },
  ], [
    { created_at: '2026-10-01T12:00:00Z', recuperado: true, total: 100 },
    { created_at: '2026-10-01T12:00:00Z', recuperado: false, total: 80 },
  ], [{ created_at: '2026-10-01T12:00:00Z' }]);
  assert.equal(data.metrics.quotes.value, 3);
  assert.equal(data.metrics.pendingQuotes, 1);
  assert.equal(data.metrics.approvedQuotes, 1);
  assert.equal(data.metrics.recoveryRate, 50);
  assert.equal(data.metrics.unrecoveredAmount, 80);
  assert.equal(data.metrics.subscribers, 1);
});

test('un período vacío no genera divisiones por cero ni incrementos ficticios', () => {
  const data = aggregateDashboard(range, [], [], [], []);
  assert.equal(data.metrics.average.value, 0);
  assert.equal(data.metrics.recoveryRate, 0);
  assert.equal(data.metrics.sales.change, null);
  assert.ok(data.daily.every((day) => day.pedidos === 0 && day.ventas === 0));
  assert.equal(data.recent.length, 0);
});
