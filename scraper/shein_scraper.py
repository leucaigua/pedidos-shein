#!/usr/bin/env python3
"""
SHEIN product scraper — hybrid approach.

Mobile share links (api-shein.shein.com):
  → requests to get name + image from og meta tags (fast, no bot detection)
  → Selenium on the redirected product URL to get the price

Desktop links (us.shein.com / www.shein.com):
  → Selenium with anti-detection measures

Usage: python3 shein_scraper.py <url>
Output: JSON to stdout
"""

import sys
import json
import time
import re
import warnings
warnings.filterwarnings("ignore")

import requests as req_lib
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

JUNK_NAMES = {
    '', 'shein', 'www.shein.com', 'us.shein.com',
    "women's & men's clothing, shop online fashion",
    'fashion online', 'shein official website',
}

def is_junk_name(name: str) -> bool:
    n = name.lower().strip()
    if n in JUNK_NAMES or len(n) < 6:
        return True
    # Descripciones genéricas del sitio
    if n.startswith('shein') and ('fashion' in n or 'clothing' in n or 'design' in n):
        return True
    # Nombre demasiado largo → es descripción, no título
    if len(n) > 180:
        return True
    return False

def extract_name_from_url(url: str) -> str:
    """Extrae y limpia el nombre del producto del slug de la URL de SHEIN.
    Maneja tanto slugs con guiones (escritorio) como camelCase (móvil) y sufijos -cat-XXXX.
    """
    # Regex corregido: acepta sufijos opcionales como -cat-1764 antes de .html
    match = re.search(r'/([^/?]+?)-p-\d+(?:-[^/?]*)?\.html', url)
    if not match:
        return ''
    slug = match.group(1)

    # Si el slug usa guiones como separadores (escritorio)
    if '-' in slug:
        return (slug
                .replace('-s-', "'s ")
                .replace('-', ' ')
                .strip())

    # Si es camelCase sin guiones (móvil m.shein.com)
    name = re.sub(r'([a-z0-9])([A-Z])', r'\1 \2', slug)       # 2NewFashion → 2 New Fashion
    name = re.sub(r'([A-Z]{2,})([A-Z][a-z])', r'\1 \2', name) # PUMaterial → PU Material
    name = re.sub(r'([A-Z])([A-Z][a-z])', r'\1 \2', name)     # KUnderarm → K Underarm
    name = name.replace(',', ', ')
    return name.strip()

def is_mobile_share_link(url: str) -> bool:
    return 'api-shein.shein.com' in url or 'sharejump' in url

def is_mobile_product_link(url: str) -> bool:
    """Link directo de producto en m.shein.com (no share, sino URL de producto móvil)."""
    return 'm.shein.com' in url and '-p-' in url

def is_captcha_url(url: str) -> bool:
    return 'risk/challenge' in url or 'captcha' in url.lower()

HEADERS_REQ = {
    'User-Agent': (
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) '
        'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 '
        'Mobile/15E148 Safari/604.1'
    ),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-VE,es;q=0.9,en;q=0.8',
}


# ─────────────────────────────────────────────
# Paso 1 — Extraer nombre/imagen del link móvil
#          via requests (sin bot detection)
# ─────────────────────────────────────────────

def fetch_meta_from_share(url: str) -> dict:
    """Extrae og:title, og:image y la URL real del producto del share link."""
    try:
        r = req_lib.get(url, headers=HEADERS_REQ, timeout=12, allow_redirects=True)
        html = r.text

        # og:title
        nombre = ''
        for pat in [
            r'property=["\']og:title["\'][^>]*content=["\'](.*?)["\']',
            r'content=["\'](.*?)["\'][^>]*property=["\']og:title["\']',
        ]:
            m = re.search(pat, html)
            if m and not is_junk_name(m.group(1)):
                nombre = m.group(1).strip()
                break
        if not nombre:
            m = re.search(r'<title>(.*?)</title>', html, re.DOTALL)
            if m and not is_junk_name(m.group(1)):
                nombre = m.group(1).strip()

        # og:image
        imagen = ''
        for pat in [
            r'property=["\']og:image["\'][^>]*content=["\'](https://[^"\']+)["\']',
            r'content=["\'](https://img[^"\']+)["\'][^>]*property=["\']og:image["\']',
            r'name=["\']twitter: image["\'][^>]*content=["\'](https://[^"\']+)["\']',
        ]:
            m = re.search(pat, html)
            if m:
                imagen = m.group(1).strip()
                break

        # URL real del producto (si está incrustada en el HTML)
        product_url = ''
        m = re.search(
            r'(https://(?:us|www|m)\.shein\.com/[^\s"\'<>]*-p-\d+\.html[^\s"\'<>]*)',
            html
        )
        if m:
            product_url = m.group(1)

        return {'nombre': nombre, 'imagen': imagen, 'product_url': product_url}
    except Exception:
        return {'nombre': '', 'imagen': '', 'product_url': ''}


# ─────────────────────────────────────────────
# Paso 2 — Selenium para precio (y datos extra)
# ─────────────────────────────────────────────

def build_driver() -> webdriver.Chrome:
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument('--window-size=1440,900')
    options.add_argument('--disable-gpu')
    options.add_argument(
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    )
    options.add_experimental_option('excludeSwitches', ['enable-automation'])
    options.add_experimental_option('useAutomationExtension', False)

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    driver.execute_cdp_cmd(
        'Page.addScriptToEvaluateOnNewDocument',
        {'source': "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"},
    )
    return driver


def selenium_get_price_and_data(url: str, wait_redirect: bool = False) -> dict:
    """
    Abre la URL con Selenium y extrae precio, nombre e imagen.
    Si wait_redirect=True, espera a que el JS redirija a la página del producto.
    """
    driver = build_driver()
    try:
        driver.get(url)

        # Esperar redirect JS (para links móviles)
        if wait_redirect:
            try:
                WebDriverWait(driver, 15).until(
                    lambda d: (
                        d.current_url != url
                        and 'sharejump' not in d.current_url
                        and 'api-shein' not in d.current_url
                    )
                )
            except Exception:
                pass

        final_url = driver.current_url

        # Abortar si SHEIN nos mandó al captcha
        if is_captcha_url(final_url):
            return {'precio': 0, 'nombre': '', 'imagen': '', 'url': final_url}

        # Esperar h1 del producto
        try:
            WebDriverWait(driver, 12).until(
                EC.presence_of_element_located((By.TAG_NAME, 'h1'))
            )
        except Exception:
            pass

        time.sleep(2.5)

        nombre = ''
        precio = 0.0
        imagen = ''

        # ── Nombre ─────────────────────────────────────────────────────
        for sel in [
            "h1",
            "[class*='product-intro__head-name']",
            "[class*='goods-name']",
            "[class*='ProductName']",
        ]:
            try:
                el = driver.find_element(By.CSS_SELECTOR, sel)
                text = el.text.strip()
                if text and not is_junk_name(text):
                    nombre = text
                    break
            except Exception:
                continue

        if not nombre:
            try:
                og = driver.find_element(By.CSS_SELECTOR, "meta[property='og:title']")
                val = (og.get_attribute('content') or '').strip()
                if not is_junk_name(val):
                    nombre = val
            except Exception:
                pass

        # ── Precio ─────────────────────────────────────────────────────
        price_selectors = [
            "[class*='from'] [class*='priceColor']",
            "[class*='price-current']",
            "[class*='sale-price']",
            "[class*='priceColor']",
            "[class*='ProductPrice']",
            "[class*='product-price']",
        ]
        for sel in price_selectors:
            try:
                for el in driver.find_elements(By.CSS_SELECTOR, sel):
                    m = re.search(r'[\$€£]?\s*(\d+\.?\d*)', el.text.strip())
                    if m:
                        val = float(m.group(1))
                        if 0.5 < val < 2000:
                            precio = val
                            break
                if precio:
                    break
            except Exception:
                continue

        # Fallback precio: todos los $XX.XX visibles en la página
        if not precio:
            try:
                body = driver.find_element(By.TAG_NAME, 'body').text
                prices = [
                    float(p) for p in re.findall(r'\$(\d+\.\d{2})', body)
                    if 0.5 < float(p) < 2000
                ]
                if prices:
                    precio = min(prices)
            except Exception:
                pass

        # ── Imagen ─────────────────────────────────────────────────────
        for sel in [
            "[class*='crop-image-container'] img",
            "[class*='product-intro__thumbs'] img",
            "[class*='galleryItem'] img",
        ]:
            try:
                el = driver.find_element(By.CSS_SELECTOR, sel)
                src = el.get_attribute('src') or el.get_attribute('data-src') or ''
                if src.startswith('http'):
                    imagen = src
                    break
            except Exception:
                continue

        if not imagen:
            try:
                og = driver.find_element(By.CSS_SELECTOR, "meta[property='og:image']")
                imagen = og.get_attribute('content') or ''
            except Exception:
                pass

        return {'precio': precio, 'nombre': nombre, 'imagen': imagen, 'url': final_url}

    finally:
        driver.quit()


# ─────────────────────────────────────────────
# Orquestador principal
# ─────────────────────────────────────────────

def scrape(url: str) -> dict:

    if is_mobile_share_link(url):
        # ── Share link (api-shein.shein.com) ─────────────────────────
        # requests obtiene nombre + imagen sin captcha
        meta = fetch_meta_from_share(url)
        nombre = meta['nombre']
        imagen = meta['imagen']
        precio = 0.0

        # Selenium sigue el redirect JS para intentar obtener precio
        selenium_data = selenium_get_price_and_data(url, wait_redirect=True)
        precio = selenium_data.get('precio', 0.0)
        if not nombre and not is_junk_name(selenium_data.get('nombre', '')):
            nombre = selenium_data['nombre']
        if not imagen and selenium_data.get('imagen'):
            imagen = selenium_data['imagen']
        if not nombre:
            nombre = extract_name_from_url(selenium_data.get('url', url))

    elif is_mobile_product_link(url):
        # ── Link directo m.shein.com ─────────────────────────────────
        # El nombre siempre viene del slug camelCase de la URL (más fiable)
        nombre = extract_name_from_url(url)
        imagen = ''
        precio = 0.0

        # Intentar obtener imagen via meta tags (puede funcionar sin captcha)
        try:
            meta = fetch_meta_from_share(url)
            if meta.get('imagen'):
                imagen = meta['imagen']
            # Solo usar nombre del meta si el URL no dio resultado
            if not nombre and meta.get('nombre') and not is_junk_name(meta['nombre']):
                nombre = meta['nombre']
        except Exception:
            pass

    else:
        # ── Link escritorio (us.shein.com / www.shein.com) ───────────
        # Cloudflare bloquea Selenium en estos dominios consistentemente.
        # Extraer nombre del URL directamente y devolver rápido.
        nombre = extract_name_from_url(url)
        precio = 0.0
        imagen = ''

    return {
        'ok': bool(nombre),
        'nombre': nombre,
        'precio': precio,
        'imagen': imagen,
        'url': url,
    }


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'ok': False, 'error': 'URL requerida'}))
        sys.exit(1)

    url = sys.argv[1]
    try:
        result = scrape(url)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        nombre = extract_name_from_url(url)
        print(json.dumps({
            'ok': bool(nombre),
            'nombre': nombre,
            'precio': 0,
            'imagen': '',
            'url': url,
            'error': str(e),
        }, ensure_ascii=False))
