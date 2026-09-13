import os
import urllib.request

os.makedirs("public/assets/characters", exist_ok=True)
os.makedirs("public/assets/banners", exist_ok=True)
os.makedirs("public/assets/weapons", exist_ok=True)
os.makedirs("public/assets/elements", exist_ok=True)
os.makedirs("public/assets/audio", exist_ok=True)

# Character splash and convenes
characters = {
    "jiyan": {
        "splash": "https://static.wikia.nocookie.net/wutheringwaves/images/7/7d/Jiyan_Splash_Art.png",
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/6/6a/Jiyan_Convene_Draw.png",
        "still": "https://static.wikia.nocookie.net/wutheringwaves/images/1/14/Jiyan_Convene_Still.png",
        "cutout": "https://static.wikia.nocookie.net/wutheringwaves/images/8/85/Jiyan_Splash_Art_Cutout.png",
    },
    "yinlin": {
        "splash": "https://static.wikia.nocookie.net/wutheringwaves/images/5/5f/Yinlin_Splash_Art.png",
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/5/5c/Yinlin_Convene_Draw.png",
        "still": "https://static.wikia.nocookie.net/wutheringwaves/images/a/a2/Yinlin_Convene_Still.png",
        "cutout": "https://static.wikia.nocookie.net/wutheringwaves/images/3/35/Yinlin_Splash_Art_Cutout.png",
    },
    "jinhsi": {
        "splash": "https://static.wikia.nocookie.net/wutheringwaves/images/1/17/Jinhsi_Splash_Art.png",
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/4/49/Jinhsi_Convene_Draw.png",
        "still": "https://static.wikia.nocookie.net/wutheringwaves/images/c/c0/Jinhsi_Convene_Still.png",
        "cutout": "https://static.wikia.nocookie.net/wutheringwaves/images/6/68/Jinhsi_Splash_Art_Cutout.png",
    },
    "changli": {
        "splash": "https://static.wikia.nocookie.net/wutheringwaves/images/8/82/Changli_Splash_Art.png",
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/7/7a/Changli_Convene_Draw.png",
        "still": "https://static.wikia.nocookie.net/wutheringwaves/images/1/18/Changli_Convene_Still.png",
        "cutout": "https://static.wikia.nocookie.net/wutheringwaves/images/7/7f/Changli_Splash_Art_Cutout.png",
    },
    "xiangli_yao": {
        "splash": "https://static.wikia.nocookie.net/wutheringwaves/images/a/a1/Xiangli_Yao_Splash_Art.png",
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/1/18/Xiangli_Yao_Convene_Draw.png",
        "still": "https://static.wikia.nocookie.net/wutheringwaves/images/7/7f/Xiangli_Yao_Convene_Still.png",
        "cutout": "https://static.wikia.nocookie.net/wutheringwaves/images/4/40/Xiangli_Yao_Splash_Art_Cutout.png",
    },
    "shorekeeper": {
        "splash": "https://static.wikia.nocookie.net/wutheringwaves/images/4/4a/Shorekeeper_Splash_Art.png",
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/1/12/Shorekeeper_Convene_Draw.png",
        "still": "https://static.wikia.nocookie.net/wutheringwaves/images/8/81/Shorekeeper_Convene_Still.png",
        "cutout": "https://static.wikia.nocookie.net/wutheringwaves/images/d/d4/The_Shorekeeper_Splash_Art_Cutout.png",
    },
    "camellya": {
        "splash": "https://static.wikia.nocookie.net/wutheringwaves/images/7/7f/Camellya_Splash_Art.png",
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/1/1e/Camellya_Convene_Draw.png",
        "still": "https://static.wikia.nocookie.net/wutheringwaves/images/a/a6/Camellya_Convene_Still.png",
        "cutout": "https://static.wikia.nocookie.net/wutheringwaves/images/2/21/Camellya_Splash_Art_Cutout.png",
    },
    "carlotta": {
        "splash": "https://static.wikia.nocookie.net/wutheringwaves/images/c/c0/Carlotta_Splash_Art.png",
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/2/2f/Carlotta_Convene_Draw.png",
        "still": "https://static.wikia.nocookie.net/wutheringwaves/images/a/a2/Carlotta_Convene_Still.png",
    },
    "roccia": {
        "splash": "https://static.wikia.nocookie.net/wutheringwaves/images/1/1d/Roccia_Splash_Art.png",
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/c/c3/Roccia_Convene_Draw.png",
        "still": "https://static.wikia.nocookie.net/wutheringwaves/images/5/50/Roccia_Convene_Still.png",
    },
    "phoebe": {
        "splash": "https://static.wikia.nocookie.net/wutheringwaves/images/c/c9/Phoebe_Splash_Art.png",
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/b/b6/Phoebe_Convene_Draw.png",
        "still": "https://static.wikia.nocookie.net/wutheringwaves/images/b/bf/Phoebe_Convene_Still.png",
    },
    "verina": {
        "splash": "https://static.wikia.nocookie.net/wutheringwaves/images/b/b1/Verina_Splash_Art.png",
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/c/c4/Verina_Convene_Draw.png",
        "still": "https://static.wikia.nocookie.net/wutheringwaves/images/0/00/Verina_Convene_Still.png",
        "cutout": "https://static.wikia.nocookie.net/wutheringwaves/images/8/86/Verina_Splash_Art_Cutout.png",
    },
    "calcharo": {
        "splash": "https://static.wikia.nocookie.net/wutheringwaves/images/8/8a/Calcharo_Splash_Art.png",
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/4/47/Calcharo_Convene_Draw.png",
        "still": "https://static.wikia.nocookie.net/wutheringwaves/images/b/ba/Calcharo_Convene_Still.png",
        "cutout": "https://static.wikia.nocookie.net/wutheringwaves/images/1/1c/Calcharo_Splash_Art_Cutout.png",
    },
    "encore": {
        "splash": "https://static.wikia.nocookie.net/wutheringwaves/images/7/79/Encore_Splash_Art.png",
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/d/db/Encore_Convene_Draw.png",
        "still": "https://static.wikia.nocookie.net/wutheringwaves/images/c/c1/Encore_Convene_Still.png",
        "cutout": "https://static.wikia.nocookie.net/wutheringwaves/images/3/34/Encore_Splash_Art_Cutout.png",
    },
    "jianxin": {
        "splash": "https://static.wikia.nocookie.net/wutheringwaves/images/f/ff/Jianxin_Splash_Art.png",
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/0/04/Jianxin_Convene_Draw.png",
        "still": "https://static.wikia.nocookie.net/wutheringwaves/images/0/09/Jianxin_Convene_Still.png",
        "cutout": "https://static.wikia.nocookie.net/wutheringwaves/images/f/f1/Jianxin_Splash_Art_Cutout.png",
    },
    "lingyang": {
        "splash": "https://static.wikia.nocookie.net/wutheringwaves/images/a/ad/Lingyang_Splash_Art.png",
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/9/92/Lingyang_Convene_Draw.png",
        "still": "https://static.wikia.nocookie.net/wutheringwaves/images/6/62/Lingyang_Convene_Still.png",
        "cutout": "https://static.wikia.nocookie.net/wutheringwaves/images/8/8e/Lingyang_Splash_Art_Cutout.png",
    },
    "danjin": {
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/6/66/Danjin_Convene_Draw.png",
    },
    "chixia": {
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/5/51/Chixia_Convene_Draw.png",
    },
    "mortefi": {
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/a/af/Mortefi_Convene_Draw.png",
    },
    "sanhua": {
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/2/2c/Sanhua_Convene_Draw.png",
    },
    "yangyang": {
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/7/73/Yangyang_Convene_Draw.png",
        "splash": "https://static.wikia.nocookie.net/wutheringwaves/images/d/d3/Yangyang_Xuanling_Splash_Art.png"
    },
    "baizhi": {
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/9/90/Baizhi_Convene_Draw.png",
    },
    "taoqi": {
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/b/b1/Taoqi_Convene_Draw.png",
    },
    "aalto": {
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/4/46/Aalto_Convene_Draw.png",
    },
    "yuanwu": {
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/5/50/Yuanwu_Convene_Draw.png",
    },
    "youhu": {
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/2/23/Youhu_Convene_Draw.png",
    },
    "lumi": {
        "draw": "https://static.wikia.nocookie.net/wutheringwaves/images/b/ba/Lumi_Convene_Draw.png",
    }
}

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': 'https://wutheringwaves.fandom.com/'
}

for char_id, types in characters.items():
    for type_name, url in types.items():
        ext = "png" if ".png" in url else "webp"
        dest_filename = f"public/assets/characters/{char_id}_{type_name}.{ext}"
        if os.path.exists(dest_filename) and os.path.getsize(dest_filename) > 1000:
            continue
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = resp.read()
                with open(dest_filename, "wb") as out_f:
                    out_f.write(data)
                print(f"Downloaded {dest_filename} ({len(data)} bytes)")
        except Exception as e:
            print(f"Failed {dest_filename}: {e}")

print("Character download batch complete.")
