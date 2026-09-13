import urllib.request
import re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
req = urllib.request.Request('https://wuwa.aza.gg/_app/immutable/entry/app.Dv9x12sy.js', headers=headers)
with urllib.request.urlopen(req) as r:
    text = r.read().decode('utf-8')

# Search for chunks
chunks = re.findall(r'nodes/(\d+)\.([a-zA-Z0-9_-]+)\.js', text)
print("Nodes found:", chunks)

for node_num, hash_str in chunks:
    node_url = f"https://wuwa.aza.gg/_app/immutable/nodes/{node_num}.{hash_str}.js"
    print("Checking node:", node_num, node_url)
    try:
        nreq = urllib.request.Request(node_url, headers=headers)
        with urllib.request.urlopen(nreq) as nr:
            ntext = nr.read().decode('utf-8')
            media = set(re.findall(r'["\']([^"\']+\.(?:webm|mp4|flac|ogg|mp3|wav|png|webp))["\']', ntext))
            if media:
                print(f"Media in node {node_num}:", media)
    except Exception as e:
        print(f"Error on node {node_num}:", e)
