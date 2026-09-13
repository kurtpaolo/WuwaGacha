import urllib.request
import re

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': 'https://wutheringwaves.fandom.com/'
}

url = "https://wutheringwaves.fandom.com/wiki/Convene/Gallery"
try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as r:
        html = r.read().decode('utf-8', errors='ignore')
        print("Fandom Gallery HTML length:", len(html))
        # Find video or webm links
        media = re.findall(r'https://static\.wikia\.nocookie\.net/wutheringwaves/images/[^\s"\'<>]+\.(?:webm|mp4|ogg)', html)
        print("Found media links in Gallery:", set(media))
except Exception as e:
    print("Error:", e)
