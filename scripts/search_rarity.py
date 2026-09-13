import urllib.request
import re

headers = {'User-Agent': 'Mozilla/5.0'}
url = "https://wuwa.aza.gg/_app/immutable/nodes/5.BMVEH5ak.js"
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as r:
    code = r.read().decode('utf-8')

matches = re.findall(r'.{0,150}gacha_ing_rarity.{0,150}', code)
for m in matches:
    print("MATCH:", m)
