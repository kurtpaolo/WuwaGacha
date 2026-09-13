import urllib.request
import re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

# Fetch the manifest/chunks
req = urllib.request.Request('https://wuwa.aza.gg/gacha', headers=headers)
with urllib.request.urlopen(req) as r:
    html = r.read().decode('utf-8', errors='ignore')

chunks = re.findall(r'/_app/immutable/[^"\']+\.js', html)
print("Found chunks in HTML:", chunks)

for c in chunks:
    c_url = 'https://wuwa.aza.gg' + c
    print("Fetching:", c_url)
    try:
        creq = urllib.request.Request(c_url, headers=headers)
        with urllib.request.urlopen(creq) as cr:
            content = cr.read().decode('utf-8', errors='ignore')
            # Look for video, webm, mp4, rarity
            vids = re.findall(r'["\']([^"\']*(?:gacha|rarity|video|convene)[^"\']*)["\']', content, re.IGNORECASE)
            if vids:
                print(f"Keywords in {c}:", set(vids))
            # Also find any other chunks referenced
            subchunks = re.findall(r'/_app/immutable/[^"\']+\.js', content)
            for sc in subchunks:
                if sc not in chunks:
                    chunks.append(sc)
    except Exception as e:
        print("Error fetching chunk:", e)
