"""Fetch CC-licensed example photos for the 5 Starter Signals cards via Wikimedia Commons.

Writes: public/assets/challenges/starter-N.jpg + scripts/starter-example-photos-manifest.json
Only accepts 2xx JPEG bytes (magic-checked). Only CC BY, CC BY-SA, CC0, or
public domain — anything else (e.g. GFDL-only) is skipped. Skips cards already fetched.
Modeled on scripts/fetch-jet-setter-example-photos.py.

Eye-check round (Nov 20, 2026): two first picks failed and were replaced —
see docs/EXAMPLE_PHOTOS-starter.md ("How they were chosen"). The QUERIES
below are the ones that actually produced the winners.
"""
import json, os, re, time, urllib.request, urllib.parse

OUT = "public/assets/challenges"
MANIFEST = "scripts/starter-example-photos-manifest.json"
UA = {"User-Agent": "FieldtripExamplePhotos/1.0 (example photos for the Fieldtrip app; contact: field-trip repo)"}

QUERIES = {
    "starter-1": ("sunflower blue sky", "vibrant flowers garden"),
    "starter-2": ("watermelon slice summer", "ice cream cone summer"),
    "starter-3": ("park bench under tree shade", "shady park bench trees"),
    # Added Nov 27, 2026 (Starter flow redesign: 5 cards, 1 to finish).
    "starter-4": ("person shadow pavement sunlight", "long shadow sidewalk sun"),
    "starter-5": ("red door bright color", "colorful painted wall bright"),
}

# Accept only CC BY / CC BY-SA (any version), CC0, or public domain.
LICENSE_OK = re.compile(r"^(CC BY(-SA)?( \d\.\d)?|CC0|Public domain)", re.IGNORECASE)

def get_json(url, retries=4):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(10 * (i + 1))
                continue
            raise
    raise Exception("429 exhausted")

def get_bytes(url, retries=4):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(10 * (i + 1))
                continue
            raise
    raise Exception("429 exhausted")

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
            # JPEG only: the gate test requires starter-N.jpg, and photos
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
print(f"manifest: {len(manifest)}/5 cards")
