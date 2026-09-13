import urllib.request
import re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
req = urllib.request.Request('https://wuwa.aza.gg/_app/immutable/entry/app.Dv9x12sy.js', headers=headers)
with urllib.request.urlopen(req) as r:
    text = r.read().decode('utf-8')

chunks = dict(re.findall(r'nodes/(\d+)\.([a-zA-Z0-9_-]+)\.js', text))
print("Node 5 hash:", chunks.get('5'))
node_url = f"https://wuwa.aza.gg/_app/immutable/nodes/5.{chunks.get('5')}.js"
nreq = urllib.request.Request(node_url, headers=headers)
with urllib.request.urlopen(nreq) as nr:
    ntext = nr.read().decode('utf-8')
    media = set(re.findall(r'["\']([^"\']+\.(?:webm|mp4|flac|ogg|mp3|wav|png|webp))["\']', ntext))
    print("Media count in node 5:", len(media))
    for m in sorted(media):
        print(" ", m)
