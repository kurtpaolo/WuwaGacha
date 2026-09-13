import urllib.request
import json
import os

os.makedirs("public/assets/elements", exist_ok=True)
os.makedirs("public/assets/currencies", exist_ok=True)

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': 'https://wutheringwaves.fandom.com/'
}

items = {
    "spectro": "https://static.wikia.nocookie.net/wutheringwaves/images/e/e6/Spectro.png",
    "havoc": "https://static.wikia.nocookie.net/wutheringwaves/images/2/23/Havoc.png",
    "fusion": "https://static.wikia.nocookie.net/wutheringwaves/images/e/e2/Fusion.png",
    "aero": "https://static.wikia.nocookie.net/wutheringwaves/images/8/87/Aero.png",
    "electro": "https://static.wikia.nocookie.net/wutheringwaves/images/a/a2/Electro.png",
    "glacio": "https://static.wikia.nocookie.net/wutheringwaves/images/f/f6/Glacio.png",
    "astrite": "https://static.wikia.nocookie.net/wutheringwaves/images/f/f6/Item_Astrite.png",
    "radiant_tide": "https://static.wikia.nocookie.net/wutheringwaves/images/1/1b/Item_Radiant_Tide.png",
    "forging_tide": "https://static.wikia.nocookie.net/wutheringwaves/images/7/75/Item_Forging_Tide.png",
    "lustrous_tide": "https://static.wikia.nocookie.net/wutheringwaves/images/8/8f/Item_Lustrous_Tide.png",
    "afterglow_coral": "https://static.wikia.nocookie.net/wutheringwaves/images/e/e0/Item_Afterglow_Coral.png",
    "oscillated_coral": "https://static.wikia.nocookie.net/wutheringwaves/images/2/2d/Item_Oscillated_Coral.png",
}

for name, url in items.items():
    folder = "elements" if name in ["spectro", "havoc", "fusion", "aero", "electro", "glacio"] else "currencies"
    dest = f"public/assets/{folder}/{name}.png"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
            with open(dest, "wb") as f:
                f.write(data)
            print(f"Downloaded {dest} ({len(data)} bytes)")
    except Exception as e:
        print(f"Failed {name}: {e}")
