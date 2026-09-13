import os
import urllib.request

os.makedirs("public/assets/characters", exist_ok=True)
os.makedirs("public/assets/elements", exist_ok=True)
os.makedirs("public/assets/weapon_types", exist_ok=True)
os.makedirs("public/assets/weapons", exist_ok=True)

BASE_URL = "https://raw.githubusercontent.com/ryanbenson/wuthering-waves-assets/master/images"
headers = {'User-Agent': 'Mozilla/5.0'}

# 1. Elements
elements = ["spectro", "havoc", "glacio", "fusion", "electro", "aero"]
for el in elements:
    dest = f"public/assets/elements/{el}.png"
    if not os.path.exists(dest) or os.path.getsize(dest) < 100:
        try:
            req = urllib.request.Request(f"{BASE_URL}/{el}.png", headers=headers)
            with urllib.request.urlopen(req, timeout=10) as r:
                with open(dest, "wb") as f:
                    f.write(r.read())
            print(f"Downloaded element: {el}")
        except Exception as e:
            print(f"Element {el} error: {e}")

# 2. Weapon types
weapon_types = ["sword.webp", "broadblade.webp", "pistol.webp", "gauntlet.webp", "rectifier.webp"]
for wt in weapon_types:
    dest = f"public/assets/weapon_types/{wt}"
    if not os.path.exists(dest) or os.path.getsize(dest) < 100:
        try:
            req = urllib.request.Request(f"{BASE_URL}/{wt}", headers=headers)
            with urllib.request.urlopen(req, timeout=10) as r:
                with open(dest, "wb") as f:
                    f.write(r.read())
            print(f"Downloaded weapon type: {wt}")
        except Exception as e:
            print(f"Weapon type {wt} error: {e}")

# 3. Resonator portraits from repo
char_map = {
    "jiyan": "Jiyan.png",
    "yinlin": "Yinlin.png",
    "jinhsi": "Jinhsi.png",
    "changli": "Changli.png",
    "zhezhi": "Zhezhi.png",
    "xiangli_yao": "XiangliYao.png",
    "shorekeeper": "Shorekeeper.png",
    "youhu": "Youhu.png",
    "camellya": "Camellya.png",
    "lumi": "Lumi.png",
    "carlotta": "Carlotta.png",
    "roccia": "Roccia.png",
    "phoebe": "Phoebe.png",
    "brant": "Brant.png",
    "cartethyia": "Cartethyia.png",
    "ciaccona": "Ciaccona.png",
    "cantarella": "Cantarella.png",
    "zani": "Zani.png",
    "phrolova": "Phrolova.png",
    "lupa": "Lupa.png",
    "luuk_herssen": "LuukHerssen.png",
    "buling": "Buling.png",
    "augusta": "Augusta.png",
    "denia": "Denia.png",
    "galbrena": "Galbrena.png",
    "hiyuki": "Hiyuki.png",
    "iuno": "Iuno.png",
    "chisa": "Chisa.png",
    "mornye": "Mornye.png",
    "hsin": "Hsin.png",
    "qiuyuan": "Qiuyuan.png",
    "lucilla": "Lucilla.png",
    "sigrika": "Sigrika.png",
    "suisui": "Suisui.png",
    "qingxiao": "Qingxiao.png",
    "jingran": "Jingran.png",
    "aemeath": "Aemeath.png",
    "rebecca": "Rebecca.png",
    "lynae": "Lynae.png",
    "lucy": "Lucy.png",
    "suoming": "Suoming.png",
    "verina": "Verina.png",
    "calcharo": "Calcharo.png",
    "encore": "Encore.png",
    "jianxin": "Jianxin.png",
    "lingyang": "Lingyang.png",
    "danjin": "Danjin.png",
    "sanhua": "Sanhua.png",
    "mortefi": "Mortefi.png",
    "chixia": "Chixia.png",
    "yangyang": "Yangyang.png",
    "baizhi": "Baizhi.png",
    "taoqi": "Taoqi.png",
    "aalto": "Aalto.png",
    "yuanwu": "Yuanwu.png",
}

for c_id, filename in char_map.items():
    dest = f"public/assets/characters/{c_id}_portrait.png"
    if not os.path.exists(dest) or os.path.getsize(dest) < 100:
        try:
            req = urllib.request.Request(f"{BASE_URL}/{filename}", headers=headers)
            with urllib.request.urlopen(req, timeout=10) as r:
                with open(dest, "wb") as f:
                    f.write(r.read())
            print(f"Downloaded portrait: {c_id}")
        except Exception as e:
            print(f"Portrait {c_id} error: {e}")

print("Batch download finished.")
