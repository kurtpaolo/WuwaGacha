import urllib.request
import re
import json

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
req = urllib.request.Request('https://wuwa.aza.gg/gacha', headers=headers)
with urllib.request.urlopen(req) as r:
    html = r.read().decode('utf-8', errors='ignore')

assets = set(re.findall(r'["\'](/static/[^"\']+)["\']', html))
print('Total /static/ links in HTML:', len(assets))
for a in sorted(assets):
    print(a)

vids = set(re.findall(r'["\']([^"\']+\.(?:webm|mp4|ogg|mp3|wav))["\']', html, re.IGNORECASE))
print('Media in HTML:', vids)

# find all script tags
all_scripts = re.findall(r'<script\b[^>]*>(.*?)</script>', html, re.DOTALL)
print('Total inline scripts:', len(all_scripts))
for i, s in enumerate(all_scripts):
    if 'video' in s.lower() or 'gacha' in s.lower() or 'audio' in s.lower() or 'convene' in s.lower():
        print(f"Match in inline script {i}:", s[:500])
