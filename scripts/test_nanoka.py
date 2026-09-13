import urllib.request

headers = {'User-Agent': 'Mozilla/5.0'}
url = "https://static.nanoka.cc/assets/ww/UIResources/Common/Image/IconRolePile/T_IconRole_Pile_jinxi_UI.webp"
try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as r:
        print("static.nanoka.cc status:", r.status, "len:", len(r.read()))
except Exception as e:
    print("static.nanoka.cc error:", e)
