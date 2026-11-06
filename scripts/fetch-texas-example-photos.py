"""Fetch CC-licensed example photos for the 15 Texas cards via Wikimedia Commons.

Writes: public/assets/challenges/texas-XX.<ext> + scripts/texas-example-photos-manifest.json
Only accepts 2xx image bytes (JPEG/PNG magic). Skips cards already fetched.
"""
import json, os, time, urllib.request, urllib.parse

OUT = "public/assets/challenges"
MANIFEST = "scripts/texas-example-photos-manifest.json"
UA = {"User-Agent": "FieldtripExamplePhotos/1.0 (example photos for the Fieldtrip app; contact: field-trip repo)"}

QUERIES = {
    "texas-01": ("Texas sunset sky", "sunset sky clouds"),
    "texas-02": ("taco truck Texas", "tacos food truck"),
    "texas-03": ("cowboy boots", "cowboy boots pair"),
    "texas-04": ("bluebonnet Texas", "bluebonnet flowers"),
    "texas-05": ("y'all sign", "yall sign Texas"),
    "texas-06": ("barbecue smoker", "BBQ pit smoker"),
    "texas-07": ("honky tonk Texas", "country dance hall"),
    "texas-08": ("Texas longhorn", "longhorn cattle"),
    "texas-09": ("Whataburger", "Whataburger restaurant"),
    "texas-10": ("Texas flag flying", "Texas state flag Austin"),
    "texas-11": ("Barton Springs", "swimming hole Texas"),
    "texas-12": ("high school football stadium Texas", "football stadium lights night"),
    "texas-13": ("Big Bend National Park", "West Texas desert"),
    "texas-14": ("kolache", "bakery pastry"),
    "texas-15": ("Don't Mess With Texas", "Texas pride sign"),
}

def get_json(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def get_bytes(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.status, r.read()

def magic_ext(b):
    if b[:3] == b"\xff\xd8\xff": return "jpg"
    if b[:8] == b"\x89PNG\r\n\x1a\n": return "png"
    if b[:4] == b"RIFF" and b[8:12] == b"WEBP": return "webp"
    return None

def search(query):
    q = urllib.parse.quote(query)
    url = ("https://commons.wikimedia.org/w/api.php?action=query&format=json"
           f"&generator=search&gsrsearch={q}&gsrnamespace=6&gsrlimit=8"
           "&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200")
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
            # thumburls carry a ?utm_source= query string; judge by the path
            ext_path = urllib.parse.urlparse(url).path.lower()
            if not url.startswith("https://") or not any(ext_path.endswith(e) for e in (".jpg", ".jpeg", ".png", ".webp")):
                continue
            try:
                status, body = get_bytes(url)
            except Exception as e:
                print(f"{card}: fetch failed: {e}")
                continue
            ext = magic_ext(body)
            if status == 200 and ext and len(body) > 20000:
                picked = (res, body, ext)
                break
        if picked:
            break
        time.sleep(0.5)
    if not picked:
        print(f"{card}: NO USABLE PHOTO (queries: {q1!r} / {q2!r})")
        continue
    res, body, ext = picked
    fname = f"{card}.{ext}"
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
print(f"manifest: {len(manifest)}/15 cards")
