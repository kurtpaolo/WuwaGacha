import urllib.request
import os

url = "https://raw.githubusercontent.com/ryanbenson/wuthering-waves-assets/master/images/Zhezhi.png"
dest = "public/assets/characters/zhezhi_portrait.png"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as r:
        data = r.read()
        with open(dest, "wb") as f:
            f.write(data)
        print(f"Downloaded {dest}: {len(data)} bytes")
except Exception as e:
    print("Error:", e)
