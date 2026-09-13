import os
import urllib.request
import re

os.makedirs("public/assets/characters", exist_ok=True)

path = r"C:\Users\schmuck\.gemini\antigravity-cli\brain\a2e71cae-4214-4fd8-a597-311d0b4b152c\.system_generated\steps\299\content.md"
with open(path, "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

links = list(set(re.findall(r'https://static\.wikia\.nocookie\.net/wutheringwaves/images/[^\s"\'<>]+\.(?:png|webp)', text)))

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': 'https://wutheringwaves.fandom.com/'
}

# Download all Splash_Art and Resonator_ images
download_map = {}
for l in links:
    clean_url = l.split("/revision/")[0]
    filename = clean_url.split("/")[-1]
    if "splash_art" in filename.lower():
        # normalize to lowercase key: e.g. Aemeath_Splash_Art.png -> aemeath_splash.png
        base_name = filename.lower().replace("_splash_art", "_splash")
        dest = f"public/assets/characters/{base_name}"
        download_map[dest] = clean_url

print(f"Total splash arts to download: {len(download_map)}")

for dest, url in download_map.items():
    if os.path.exists(dest) and os.path.getsize(dest) > 5000:
        print(f"Already have {dest} ({os.path.getsize(dest)} bytes)")
        continue
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as r:
            data = r.read()
            with open(dest, "wb") as f:
                f.write(data)
            print(f"Downloaded {dest} ({len(data)} bytes)")
    except Exception as e:
        print(f"Failed {dest} from {url}: {e}")

print("Splash arts download complete!")
