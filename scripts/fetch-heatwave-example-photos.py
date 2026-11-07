"""Fetch CC-licensed example photos for the 25 Heatwave Receipts cards via Wikimedia Commons.

Writes: public/assets/challenges/heatwave-XX.jpg + scripts/heatwave-example-photos-manifest.json
Only accepts 2xx JPEG bytes (magic-checked). Only CC BY, CC BY-SA, CC0, or
public domain — anything else (e.g. GFDL-only) is skipped. Skips cards already fetched.
Modeled on scripts/fetch-texas-example-photos.py.
"""
import json, os, re, time, urllib.request, urllib.parse

OUT = "public/assets/challenges"
MANIFEST = "scripts/heatwave-example-photos-manifest.json"
UA = {"User-Agent": "FieldtripExamplePhotos/1.0 (example photos for the Fieldtrip app; contact: field-trip repo)"}

QUERIES = {
    "heatwave-01": ("wilted plant heat", "melting ice cream sun"),
    "heatwave-02": ("people shade tree summer", "tree shade park"),
    "heatwave-03": ("colorful flowers bright", "colorful mural wall"),
    "heatwave-04": ("inflatable pool float", "plastic flamingo"),
    "heatwave-05": ("cocktail umbrella drink", "tropical drink beach"),
    "heatwave-06": ("beach summer sunglasses", "ice cream cone beach"),
    "heatwave-07": ("shadow person ground", "feet shadow sidewalk"),
    "heatwave-08": ("person sunset viewpoint", "sunset silhouette person"),
    "heatwave-09": ("selfie smiling person", "woman selfie phone"),
    "heatwave-10": ("blue sky clouds sunny", "sunny sky clouds"),
    "heatwave-11": ("receipt paper", "coffee cup cafe table"),
    "heatwave-12": ("friends laughing group", "group of friends summer"),
    "heatwave-13": ("group of friends standing", "friends walking street"),
    "heatwave-14": ("funny sign", "humorous sign"),
    "heatwave-15": ("snacks table friends", "food sharing table"),
    "heatwave-16": ("dog looking window", "cat watching"),
    "heatwave-17": ("grocery store aisle", "shopping cart supermarket"),
    "heatwave-18": ("iced coffee cup", "lemonade glass summer"),
    "heatwave-19": ("shopping bags paper", "shopping bags carried"),
    "heatwave-20": ("car window road view", "road trip car window"),
    "heatwave-21": ("shopping cart full groceries", "supermarket checkout line"),
    "heatwave-22": ("traffic jam cars", "long queue people"),
    "heatwave-23": ("detour sign road", "road closed sign"),
    "heatwave-24": ("empty plates table restaurant", "dirty dishes table after meal"),
    "heatwave-25": ("scenic sunset view", "beautiful landscape sunset"),
}

# Accept only CC BY / CC BY-SA (any version), CC0, or public domain.
LICENSE_OK = re.compile(r"^(CC BY(-SA)?( \d\.\d)?|CC0|Public domain)", re.IGNORECASE)

def get_json(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def get_bytes(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.status, r.read()

def search(query):
    q = urllib.parse.quote(query)
    url = ("https://commons.wikimedia.org/w/api.php?action=query&format=json"
           f"&generator=search&gsrsearch={q}&gsrnamespace=6&gsrlimit=8"
           "&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1280")
    data = get_json(url)
    pages = (data.get("query") or {}).get("pages") or {}
    out = []
    for p in pages.values():
        info = (p.get("imageinfo") or [{}])[0]
        out.append({
            "title": p.get("title", ""),
            "url": info.get("thumburl") or info.get("url", ""),
            "license": ((info.get("extmetadata") or {}).get("LicenseShortName") or {}).get("value", ""),
            "artist": ((info.get("extmetadata") or {}).get("Artist") or {}).get("value", ""),
            "page": f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(p.get('title','').replace(' ', '_'))}",
        })
    return out

os.makedirs(OUT, exist_ok=True)
manifest = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
for card, (q1, q2) in QUERIES.items():
    if card in manifest and os.path.exists(os.path.join(OUT, manifest[card]["file"])):
        print(f"{card}: already have {manifest[card]['file']}")
        continue
    picked = None
    for q in (q1, q2):
        try:
            results = search(q)
        except Exception as e:
            print(f"{card}: search '{q}' failed: {e}")
            continue
        for res in results:
            url = res["url"]
            # JPEG only: the gate test requires heatwave-XX.jpg, and photos
            # on Commons are JPEG in practice. Thumburls carry a query string;
            # judge by the path.
            ext_path = urllib.parse.urlparse(url).path.lower()
            if not url.startswith("https://") or not ext_path.endswith((".jpg", ".jpeg")):
                continue
            if not LICENSE_OK.match(res["license"] or ""):
                print(f"{card}: skipping {res['title'][:50]} (license: {res['license']})")
                continue
            try:
                status, body = get_bytes(url)
            except Exception as e:
                print(f"{card}: fetch failed: {e}")
                continue
            if status == 200 and body[:3] == b"\xff\xd8\xff" and len(body) > 20000:
                picked = (res, body)
                break
        if picked:
            break
        time.sleep(0.5)
    if not picked:
        print(f"{card}: NO USABLE PHOTO (queries: {q1!r} / {q2!r})")
        continue
    res, body = picked
    fname = f"{card}.jpg"
    with open(os.path.join(OUT, fname), "wb") as f:
        f.write(body)
    manifest[card] = {
        "file": fname, "bytes": len(body),
        "source_url": res["url"], "source_page": res["page"],
        "license": res["license"], "creator": res["artist"], "title": res["title"],
    }
    print(f"{card}: {fname} ({len(body)//1024} KB) [{res['license']}] {res['title'][:60]}")
    time.sleep(0.5)

json.dump(manifest, open(MANIFEST, "w"), indent=2)
print(f"manifest: {len(manifest)}/25 cards")
