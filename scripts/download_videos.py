import os
import urllib.request

os.makedirs("public/assets/videos", exist_ok=True)
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

urls = {
    "public/assets/videos/gacha_gold_5star.webm": "https://wuwa.aza.gg/static/gacha/gacha_ing_rarity_5.webm",
    "public/assets/videos/gacha_purple_4star.webm": "https://wuwa.aza.gg/static/gacha/gacha_ing_rarity_4.webm",
}

for dest, url in urls.items():
    if os.path.exists(dest) and os.path.getsize(dest) > 100000:
        print(f"Already have {dest} ({os.path.getsize(dest)} bytes)")
        continue
    try:
        print(f"Downloading {url} to {dest}...")
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read()
            with open(dest, "wb") as f:
                f.write(data)
            print(f"Saved {dest}: {len(data)} bytes")
    except Exception as e:
        print(f"Failed {url}: {e}")
