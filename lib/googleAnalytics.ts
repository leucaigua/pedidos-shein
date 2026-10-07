import { createSign } from 'node:crypto';
import type { DashboardRange, DashboardTraffic } from '@/lib/dashboard';

let tokenCache: { token: string; expiresAt: number } | null = null;
const reportCache = new Map<string, { data: DashboardTraffic; expiresAt: number }>();

async function accessToken(email: string, key: string): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const jwt = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iss: email, scope: 'https://www.googleapis.com/auth/analytics.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const signature = createSign('RSA-SHA256').update(jwt).sign(key.replace(/\\n/g, '\n'), 'base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${jwt}.${signature}` }), signal: AbortSignal.timeout(8000), cache: 'no-store' });
  if (!res.ok) throw new Error('Google Analytics authentication failed');
  const data = await res.json();
  tokenCache = { token: data.access_token, expiresAt: Date.now() + Math.max(0, Number(data.expires_in) - 60) * 1000 };
  return tokenCache.token;
}
interface Report { rows?: { dimensionValues?: { value: string }[]; metricValues: { value: string }[] }[] }
export async function getDashboardTraffic(range: DashboardRange): Promise<DashboardTraffic> {
  const empty: DashboardTraffic = { status: 'not_configured', sessions: null, users: null, pageViews: null, daily: [] };
  const property = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
  const email = process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL;
  const key = process.env.GOOGLE_ANALYTICS_PRIVATE_KEY;
  if (!property || !email || !key || !/^\d+$/.test(property)) return empty;
  const cacheKey = `${property}:${range.start}:${range.end}`;
  const cached = reportCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  try {
    const token = await accessToken(email, key);
    async function report(start: string, end: string, daily = false): Promise<Report> {
      const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateRanges: [{ startDate: start, endDate: end }], metrics: (daily ? ['sessions'] : ['sessions', 'totalUsers', 'screenPageViews']).map((name) => ({ name })), ...(daily ? { dimensions: [{ name: 'date' }], orderBys: [{ dimension: { dimensionName: 'date' } }] } : {}) }),
        signal: AbortSignal.timeout(8000), cache: 'no-store',
      });
      if (!res.ok) throw new Error('Google Analytics report failed');
      return res.json();
    }
    const previousEnd = new Date(`${range.start}T12:00:00Z`);
    previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
    const [current, previous, daily] = await Promise.all([report(range.start, range.end), report(range.previousStart, previousEnd.toISOString().slice(0, 10)), report(range.start, range.end, true)]);
    const values = current.rows?.[0]?.metricValues || [];
    const sessions = Number(values[0]?.value || 0);
    const previousSessions = Number(previous.rows?.[0]?.metricValues[0]?.value || 0);
    const data: DashboardTraffic = { status: 'connected', sessions: { value: sessions, previous: previousSessions, change: previousSessions > 0 ? (sessions - previousSessions) / previousSessions * 100 : null }, users: Number(values[1]?.value || 0), pageViews: Number(values[2]?.value || 0), daily: (daily.rows || []).map((row) => { const date = row.dimensionValues?.[0]?.value || ''; return { date: `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`, visits: Number(row.metricValues[0]?.value || 0) }; }) };
    if (reportCache.size > 20) reportCache.clear();
    reportCache.set(cacheKey, { data, expiresAt: Date.now() + 5 * 60_000 });
    return data;
  } catch { return { ...empty, status: 'error' }; }
}
