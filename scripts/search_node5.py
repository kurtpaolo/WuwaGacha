import urllib.request
import re

headers = {'User-Agent': 'Mozilla/5.0'}
url = "https://wuwa.aza.gg/_app/immutable/nodes/5.BMVEH5ak.js"
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as r:
    code = r.read().decode('utf-8')

# Search for video logic
matches = re.findall(r'.{0,100}(?:webm|video|gacha_ing|rarity|quality).{0,100}', code)
print(f"Found {len(matches)} occurrences:")
for m in matches[:15]:
    print("---", m)
