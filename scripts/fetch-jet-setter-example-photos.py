"""Fetch CC-licensed example photos for the 25 Jet Setter cards via Wikimedia Commons.

Writes: public/assets/challenges/jet-setter-XX.jpg + scripts/jet-setter-example-photos-manifest.json
Only accepts 2xx JPEG bytes (magic-checked). Only CC BY, CC BY-SA, CC0, or
public domain — anything else (e.g. GFDL-only) is skipped. Skips cards already fetched.
Modeled on scripts/fetch-heatwave-example-photos.py.

Replacement round (Nov 18, 2026): 13 first picks failed the eye-check and
were replaced — see docs/EXAMPLE_PHOTOS.md ("Jet Setter: first picks that
failed"). The QUERIES below are the ones that actually produced the winners:
for 08, 09, 17, 18, 19, 21, and 22 they are the replacement searches; for 01,
03, 10, 13, 14, and 16 the winners came from the original queries (only the
pick changed, not the query).
"""
import json, os, re, time, urllib.request, urllib.parse

OUT = "public/assets/challenges"
MANIFEST = "scripts/jet-setter-example-photos-manifest.json"
UA = {"User-Agent": "FieldtripExamplePhotos/1.0 (example photos for the Fieldtrip app; contact: field-trip repo)"}

QUERIES = {
    "jet-setter-01": ("beach sandals sunglasses vacation", "pool chairs beach towels"),
    "jet-setter-02": ("resort pool umbrellas", "hotel lobby palm plants"),
    "jet-setter-03": ("pool lounge chairs towels", "beach chairs umbrella sand"),
    "jet-setter-04": ("turquoise ocean beach", "blue water boat harbor"),
    "jet-setter-05": ("beach towels sand", "colorful towels beach"),
    "jet-setter-06": ("beach sunset palm", "sunset ocean golden hour"),
    "jet-setter-07": ("feet beach sandals", "person relaxing beach chair"),
    "jet-setter-08": ("people jumping beach", "beach volleyball friends"),
    "jet-setter-09": ("applying sunscreen", "beach umbrella shade people"),
    "jet-setter-10": ("cocktail pool bar", "person pool drink summer"),
    "jet-setter-11": ("hammock relaxing beach", "person reading beach chair"),
    "jet-setter-12": ("friends beach group photo", "family beach vacation"),
    "jet-setter-13": ("friends eating beach food", "seafood restaurant table"),
    "jet-setter-14": ("friends laughing beach", "funny beach sign"),
    "jet-setter-15": ("dog beach", "plush toy beach sand"),
    "jet-setter-16": ("people lounging pool chairs", "friends relaxing beach chairs"),
    "jet-setter-17": ("suitcases luggage", "packed suitcase clothes"),
    "jet-setter-18": ("hotel room bed", "resort balcony view"),
    "jet-setter-19": ("frozen margarita", "piña colada beach"),
    "jet-setter-20": ("souvenir shop beach", "seashells souvenir market"),
    "jet-setter-21": ("snacks bag chips", "picnic snacks food"),
    "jet-setter-22": ("detour road sign", "road closed sign"),
    "jet-setter-23": ("empty beach chairs sunset", "sandy beach towel sand"),
    "jet-setter-24": ("postcard beach view", "scenic beach panorama"),
    "jet-setter-25": ("sunset beach friends", "beautiful beach sunset people"),
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
            # JPEG only: the gate test requires jet-setter-XX.jpg, and photos
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
