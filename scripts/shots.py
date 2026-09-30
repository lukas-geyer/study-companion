# Screenshots of the built app (dist/) for visual checks:  python3 scripts/shots.py [--dark] [--mobile] [--de]
import asyncio, http.server, os, sys, threading, functools
from playwright.async_api import async_playwright

ROOT = os.path.join(os.path.dirname(__file__), '..')
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.join(ROOT, 'shots')
os.makedirs(OUT, exist_ok=True)
dark = '--dark' in sys.argv
mobile = '--mobile' in sys.argv
lang = 'de-AT' if '--de' in sys.argv else 'en-GB'
tag = ('m' if mobile else 'd') + ('-dark' if dark else '') + ('-de' if '--de' in sys.argv else '')

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

def serve():
    h = functools.partial(Quiet, directory=DIST)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8765), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

async def main():
    srv = serve()
    errors = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844} if mobile else {'width': 1280, 'height': 900},
                                  device_scale_factor=2 if mobile else 1, color_scheme='dark' if dark else 'light', locale=lang)
        pg = await ctx.new_page()
        pg.on('console', lambda m: errors.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        await pg.goto('http://127.0.0.1:8765/')
        await pg.wait_for_timeout(900)
        await pg.screenshot(path=f'{OUT}/{tag}-0-welcome.png', full_page=True)
        await pg.get_by_role('button', name='Explore an example first').or_(pg.get_by_role('button', name='Zuerst ein Beispiel ansehen')).click()
        await pg.wait_for_timeout(500)
        await pg.screenshot(path=f'{OUT}/{tag}-1-today.png', full_page=True)
        for i, name in enumerate(['Week', 'Year', 'Setup'], 2):
            names = {'Week': 'Woche', 'Year': 'Jahr', 'Setup': 'Einstellungen'}
            await pg.get_by_role('tab', name=name).or_(pg.get_by_role('tab', name=names[name])).click()
            await pg.wait_for_timeout(400)
            await pg.screenshot(path=f'{OUT}/{tag}-{i}-{name.lower()}.png', full_page=True)
        await b.close()
    srv.shutdown()
    print('\n'.join(errors) or 'no console errors')

asyncio.run(main())
