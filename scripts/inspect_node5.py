import urllib.request
import re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
node_url = "https://wuwa.aza.gg/_app/immutable/nodes/5.D45sZ17F.js"
req = urllib.request.Request(node_url, headers=headers)
with urllib.request.urlopen(req) as r:
    ntext = r.read().decode('utf-8')

print("Node 5 length:", len(ntext))
media = set(re.findall(r'["\']([^"\']+\.(?:webm|mp4|flac|ogg|mp3|wav|png|webp))["\']', ntext))
print("Media in node 5:", media)

# Search for any videos
vids = set(re.findall(r'["\']([^"\']+\.webm)["\']', ntext))
print("Webm in node 5:", vids)

# Search audio
audios = set(re.findall(r'["\']([^"\']+\.(?:flac|ogg|mp3|wav))["\']', ntext))
print("Audio in node 5:", audios)
