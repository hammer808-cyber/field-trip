"""Fetch CC-licensed example photos for the 15 Texas cards via Openverse.

Writes: public/assets/challenges/texas-XX.<ext> + scripts/texas-example-photos-manifest.json
Only accepts 2xx image bytes (JPEG/PNG/WebP magic). Skips cards already fetched.
"""
import json, os, sys, time, urllib.request, urllib.parse

OUT = "public/assets/challenges"
MANIFEST = "scripts/texas-example-photos-manifest.json"
UA = {"User-Agent": "Mozilla/5.0 (Fieldtrip example-photo fetch; contact: fieldtrip app)"}

# card -> (primary query, fallback query)
QUERIES = {
    "texas-01": ("Texas sunset wide sky clouds", "sunset sky clouds horizon"),
    "texas-02": ("taco food truck", "food truck tacos"),
    "texas-03": ("cowboy boots", "cowboy boots pair"),
    "texas-04": ("bluebonnets Texas field", "bluebonnet flowers"),
    "texas-05": ("y'all sign", "Texas welcome sign"),
    "texas-06": ("barbecue smoker smoke", "bbq pit smoke"),
    "texas-07": ("honky tonk dance hall", "country music dance floor"),
    "texas-08": ("longhorn cattle", "Texas longhorn"),
    "texas-09": ("Whataburger", "fast food restaurant sign orange"),
    "texas-10": ("Texas flag flying", "Texas state flag"),
    "texas-11": ("Texas swimming hole river", "swimming hole river"),
    "texas-12": ("high school football stadium lights night", "football stadium lights night"),
    "texas-13": ("Big Bend National Park desert", "West Texas desert landscape"),
    "texas-14": ("kolache pastry", "bakery pastry box"),
    "texas-15": ("Don't Mess With Texas sign", "Texas pride sign"),
}

def get_json(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def get_bytes(url):
    req = urllib.request.Request(url, headers={**UA, "Referer": "https://api.openverse.org/"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.status, r.headers.get_content_type(), r.read()

def magic_ok(b, ctype):
    if b[:3] == b"\xff\xd8\xff": return "jpg"
    if b[:8] == b"\x89PNG\r\n\x1a\n": return "png"
    if b[:4] == b"RIFF" and b[8:12] == b"WEBP": return "webp"
    return None

def search(query):
    q = urllib.parse.quote(query)
    url = f"https://api.openverse.org/v1/images/?q={q}&license_type=commercial&page_size=5"
    data = get_json(url)
    return data.get("results", [])

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
            url = res.get("url")
            if not url or not url.startswith("https://"):
                continue
            try:
                status, ctype, body = get_bytes(url)
            except Exception as e:
                print(f"{card}: fetch failed {url[:60]}: {e}")
                continue
            ext = magic_ok(body, ctype)
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
        "file": fname,
        "bytes": len(body),
        "source_url": res.get("url"),
        "source_page": res.get("foreign_landing_url"),
        "license": res.get("license"),
        "creator": res.get("creator"),
        "title": res.get("title"),
    }
    print(f"{card}: {fname} ({len(body)//1024} KB) [{res.get('license')}] {res.get('title','')[:50]}")
    time.sleep(0.5)

json.dump(manifest, open(MANIFEST, "w"), indent=2)
print(f"manifest: {len(manifest)}/15 cards")
