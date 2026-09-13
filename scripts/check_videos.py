import urllib.request
import re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

for url in [
    'https://wuwa.aza.gg/static/gacha/gacha_ing_rarity_3.webm',
    'https://wuwa.aza.gg/static/gacha/gacha_ing_rarity_4.webm',
    'https://wuwa.aza.gg/static/gacha/gacha_ing_rarity_5.webm',
    'https://wuwa.aza.gg/static/gacha/gacha_idle_background.flac',
]:
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as r:
            length = r.headers.get('Content-Length')
            content_type = r.headers.get('Content-Type')
            print(f"{url} -> status {r.status}, type: {content_type}, size: {length}")
    except Exception as e:
        print(f"{url} -> Error: {e}")
