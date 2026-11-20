"""Fetch CC-licensed example photos for the 15 SoCal Summer cards via Wikimedia Commons.

Writes: public/assets/challenges/socal-XX.jpg + scripts/socal-example-photos-manifest.json
Only accepts 2xx JPEG bytes (magic-checked). Only CC BY, CC BY-SA, CC0, or
public domain — anything else (e.g. GFDL-only) is skipped. Skips cards already fetched.
Modeled on scripts/fetch-jet-setter-example-photos.py.

Eye-check round (Nov 20, 2026): five first picks failed the eye-check and
were replaced — see docs/EXAMPLE_PHOTOS-socal.md. The QUERIES below are the
ones that actually produced the winners, and PREFERRED records the exact
winning title per card: the script prefers that title among the search
results, because several winners were not the first usable result (e.g.
socal-06, socal-10, socal-11). After downloading, recompress with PIL
(max width 1024, JPEG quality 78; q70 for socal-07 and q72 for socal-08,
the two fine-detail outliers) and update the manifest bytes to the final
on-disk sizes.

Gotchas learned on this deck:
- Request iiurlwidth=1280. Width 1024 is NOT an allowed thumbor width and
  the thumb host answers HTTP 400 ("Use thumbnail sizes listed on
  https://w.wiki/GHai") — which arrives as a 200 HTML error page, so the
  JPEG magic check is what catches it.
- Skip document scans by title (.pdf/.djvu/.tif): their thumbnails are
  JPEGs, so the extension check alone does not filter them out. The first
  searches for Boardwalk Snack, Extreme Shadows, and Beach Gear Archive
  returned nothing but scanned books.
- Wikimedia rate-limits hard (HTTP 429) and the upload.wikimedia.org
  original-file host stalls under load; the script retries 429s with
  backoff and sleeps between cards. Expect a slow run.
"""
import json, os, re, time, urllib.request, urllib.parse, urllib.error

OUT = "public/assets/challenges"
MANIFEST = "scripts/socal-example-photos-manifest.json"
UA = {"User-Agent": "FieldtripExamplePhotos/1.0 (example photos for the Fieldtrip app; contact: field-trip repo)"}

QUERIES = {
    "socal-01": ('ocean shoreline waves beach', 'beach waterline sand ocean'),
    "socal-02": ('palm tree silhouette sky', 'palm trees California beach'),
    "socal-03": ('ice cream cone hand', 'soft serve ice cream'),
    "socal-04": ('mural street art wall', 'colorful graffiti mural'),
    "socal-05": ('sunset sky orange pink clouds', 'golden hour sunset beach'),
    "socal-06": ('bicycle beach path', 'bike lane coastal road'),
    "socal-07": ('little free library', 'pink flamingo lawn ornament'),
    "socal-08": ('shadow palm tree sidewalk', 'long shadow person sunset', 'tree shadow wall sunlight'),
    "socal-09": ('park bench tree shade', 'green park lawn trees bench'),
    "socal-10": ('lighthouse California coast', 'Santa Monica pier'),
    "socal-11": ('iced coffee cup cafe', 'cold brew coffee glass ice'),
    "socal-12": ('beach umbrella', 'beach towel sand'),
    "socal-13": ('neon sign shop', 'hand painted sign storefront'),
    "socal-14": ('postcards souvenir shop', 'souvenir shop beach trinkets'),
    "socal-15": ('picnic blanket', 'family picnic blanket grass'),
}

# Exact winning title per card (from the eye-checked picks). Prefer this
# title when it appears in the search results; fall back to first usable.
PREFERRED = {
    "socal-01": 'File:Breaking waves (Pacific Ocean shoreline at Heceta Head beach, Oregon, USA) 10.jpg',
    "socal-02": 'File:Golden sunset with flying bird and palm trees silhouette at Rangamati.jpg',
    "socal-03": 'File:Ice cream cone at the beach.jpg',
    "socal-04": 'File:A remarkable mural on a car park wall - geograph.org.uk - 7756456.jpg',
    "socal-05": 'File:Colorful sky with orange and pink clouds reflecting in the water of a paddy field at dusk in Don Det Laos.jpg',
    "socal-06": 'File:Beaches boardwalk and bike path (2481690050).jpg',
    "socal-07": 'File:Battered Little Free Library on the Hill.jpg',
    "socal-08": 'File:Sunset Beach - 016 (3468391204).jpg',
    "socal-09": 'File:People’s Park in Davao City (009).jpg',
    "socal-10": 'File:Lighthouse California-06499 - Point Arena Lighthouse (21719124282).jpg',
    "socal-11": 'File:Chiang Mai, Thailand, Ice coffee.jpg',
    "socal-12": 'File:Parasols, Evening, Beach, Rincon de la Victoria, Andalusia, Spain.jpg',
    "socal-13": 'File:Equator coffees neon sign.jpg',
    "socal-14": 'File:Board walk, a souvenir shop selling postcards is in the image (NBY 422406).jpg',
    "socal-15": 'File:Man and woman picnic under a tree next to a car (AM 77435-1).jpg',
}

# Accept only CC BY / CC BY-SA (any version), CC0, or public domain.
LICENSE_OK = re.compile(r"^(CC BY(-SA)?( \d\.\d)?|CC0|Public domain)", re.IGNORECASE)
# Document scans: their thumbnails are JPEGs, so filter by title instead.
DOC_TITLE = re.compile(r"\.(pdf|djvu|tif|tiff)$", re.IGNORECASE)

def get_json(url, tries=6):
    for attempt in range(tries):
        req = urllib.request.Request(url, headers=UA)
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < tries - 1:
                wait = 15 * (attempt + 1)
                print(f"  429, waiting {wait}s...")
                time.sleep(wait)
                continue
            raise
    raise RuntimeError("retries exhausted")

def get_bytes(url, tries=6):
    for attempt in range(tries):
        req = urllib.request.Request(url, headers=UA)
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < tries - 1:
                wait = 15 * (attempt + 1)
                print(f"  429, waiting {wait}s...")
                time.sleep(wait)
                continue
            raise
    raise RuntimeError("retries exhausted")

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
for card, queries in QUERIES.items():
    if card in manifest and os.path.exists(os.path.join(OUT, manifest[card]["file"])):
        print(f"{card}: already have {manifest[card]['file']}")
        continue
    usable = []
    for q in queries:
        try:
            results = search(q)
        except Exception as e:
            print(f"{card}: search '{q}' failed: {e}")
            continue
        for res in results:
            if DOC_TITLE.search(res["title"]):
                continue
            url = res["url"]
            ext_path = urllib.parse.urlparse(url).path.lower()
            if not url.startswith("https://") or not ext_path.endswith((".jpg", ".jpeg")):
                continue
            if not LICENSE_OK.match(res["license"] or ""):
                print(f"{card}: skipping {res['title'][:50]} (license: {res['license']})")
                continue
            usable.append(res)
        time.sleep(1.0)
        if len(usable) >= 6:
            break
    if not usable:
        print(f"{card}: NO USABLE PHOTO (queries: {queries!r})")
        continue
    # Prefer the recorded winning title; otherwise take the first usable.
    ordered = sorted(usable, key=lambda r: 0 if r["title"] == PREFERRED.get(card) else 1)
    picked = None
    for res in ordered:
        try:
            status, body = get_bytes(res["url"])
        except Exception as e:
            print(f"{card}: fetch failed: {e}")
            continue
        if status == 200 and body[:3] == b"\xff\xd8\xff" and len(body) > 20000:
            picked = (res, body)
            break
        time.sleep(1.0)
    if not picked:
        print(f"{card}: NO USABLE PHOTO (downloads failed)")
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
    time.sleep(1.0)

json.dump(manifest, open(MANIFEST, "w"), indent=2)
print(f"manifest: {len(manifest)}/15 cards")
