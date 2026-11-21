"""Fetch CC-licensed example photos for the 20 Winter cards via Wikimedia Commons.

Writes: public/assets/challenges/winter-XX.jpg + scripts/winter-example-photos-manifest.json
Only accepts 2xx JPEG bytes (magic-checked). Only CC BY, CC BY-SA, CC0, or
public domain — anything else (e.g. GFDL-only) is skipped. Skips cards already fetched.
Modeled on scripts/fetch-errand-example-photos.py.

Eye-check round (Nov 21, 2026): first picks were checked by eye and the
replacements are recorded in docs/EXAMPLE_PHOTOS.md. The QUERIES below are
the ones that actually produced the winners, and PICK_TITLES names the
winning file per card; the script prefers that title when it appears in the
results, otherwise it takes the first license-OK JPEG (same fallback as the
earlier deck scripts).

Wikimedia rate-limits hard — expect HTTP 429s; the script retries with
backoff and sleeps 50s between downloads. Note: upload.wikimedia.org
(unscaled originals) 429'd persistently from this machine while
thumb.wikimedia.org (1280px thumbs, used here) kept working, so downloads
go through the thumb URLs. 1024px thumbs return HTTP 400 — use 1280px.
"""
import json, os, re, time, urllib.request, urllib.parse, urllib.error

OUT = "public/assets/challenges"
MANIFEST = "scripts/winter-example-photos-manifest.json"
UA = {"User-Agent": "FieldtripExamplePhotos/1.0 (example photos for the Fieldtrip app; contact: field-trip repo)"}

QUERIES = {
    "winter-01": ("paper snowflakes", "paper snowflake window"),
    "winter-02": ("christmas tree ornament", "kitsch christmas ornament"),
    "winter-03": ("bowl of soup steam", "steaming bowl of soup"),
    "winter-04": ("bare tree winter sky", "leafless tree winter"),
    "winter-05": ("snowsuit child snow", "parka snow person"),
    "winter-06": ("foggy morning street", "fog mist morning landscape"),
    "winter-07": ("orange tree laden fruit", "citrus tree oranges growing"),
    "winter-08": ("palm tree christmas lights", "palm tree string lights"),
    "winter-09": ("winter beach empty", "beach winter sand ocean"),
    "winter-10": ("puddle reflection sky", "rain puddle reflection street"),
    "winter-11": ("gingerbread house", "gingerbread house christmas candy"),
    "winter-12": ("christmas carolers singing", "carol singers christmas"),
    "winter-13": ("fireplace fire flames", "fireplace living room fire"),
    "winter-14": ("snowball fight", "snowball fight people snow"),
    "winter-15": ("wrapped christmas gift", "christmas gift exchange party"),
    "winter-16": ("skier skiing downhill snow", "skis snow slope skier"),
    "winter-17": ("stone fireplace log cabin interior", "fireplace cabin living room fire"),
    "winter-18": ("snowman", "snowman built snow carrot"),
    "winter-19": ("Mission Inn Festival of Lights Riverside", "christmas lights building night"),
    "winter-20": ("ice skating rink people", "ice rink skaters winter"),
}

PICK_TITLES = {
    "winter-01": "File:Paper snowflakes (Unsplash).jpg",
    "winter-02": "File:Alpaca Christmas ornament - November 2023 - Sarah Stierch.jpg",
    "winter-03": "File:DFC 3982 A steaming bowl of homemade vegetable soup garnished with chopped parsley served with a slice of rustic brown bread.jpg",
    "winter-04": "File:Bare tree against a winter sky - geograph.org.uk - 6716344.jpg",
    "winter-05": "File:Child walking along a snow-covered path beside a fence in winter.jpg",
    "winter-06": "File:Bidwell Park on a foggy winter morning (2025)-L1000379.jpg",
    "winter-07": "File:Citrus Trees heavily laden with ripe fruit.jpg",
    "winter-08": "File:Christmas lights on palm trees.jpg",
    "winter-09": "File:Empty beach at Waxham, Norfolk - geograph.org.uk - 319596.jpg",
    "winter-10": "File:Simple serene beauty of sky captured as a reflection in roadside puddle.jpg",
    "winter-11": "File:Gingerbread house with candy.jpg",
    "winter-12": "File:Christmas carolers, Charlois, Rotterdam (2022) 01.jpg",
    "winter-13": "File:Fireplace-RM.jpg",
    "winter-14": "File:Snowball fight.jpg",
    "winter-15": "File:Christmas wrap.jpg",
    "winter-16": "File:Skier and snowboarder come down Aiguille slope, Saint-Sorlin-d'Arves, 2023.jpg",
    "winter-17": "File:(Do not use this image until after Jan 25, 2014) FS Cabin2 fire and living room sofa Virginia State Parks (10873549344).jpg",
    "winter-18": "File:Snowman at Dunstall - geograph.org.uk - 1152841.jpg",
    "winter-19": "File:Mission Inn Lights 12-13-14i (16022035145).jpg",
    "winter-20": "File:Ice skating rink - Rockefeller center.jpg",
}

# Accept only CC BY / CC BY-SA (any version), CC0, or public domain.
LICENSE_OK = re.compile(r"^(CC BY(-SA)?( \d\.\d)?|CC0|Public domain)", re.IGNORECASE)

def get_json(url, tries=5):
    for i in range(tries):
        req = urllib.request.Request(url, headers=UA)
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 and i < tries - 1:
                wait = 10 * (2 ** i)
                print(f"  429, waiting {wait}s")
                time.sleep(wait)
                continue
            raise
        except Exception:
            if i < tries - 1:
                time.sleep(5)
                continue
            raise

def get_bytes(url, tries=5):
    for i in range(tries):
        req = urllib.request.Request(url, headers=UA)
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429 and i < tries - 1:
                wait = 10 * (2 ** i)
                print(f"  429, waiting {wait}s")
                time.sleep(wait)
                continue
            raise
        except Exception:
            if i < tries - 1:
                time.sleep(5)
                continue
            raise

def thumb_url(url):
    """Normalize a Commons URL to a thumb.wikimedia.org 1280px thumb.

    The API returns thumburl on thumb.wikimedia.org for large originals,
    but for originals narrower than 1280px it returns the unscaled original
    on upload.wikimedia.org — and that host 429s persistently from this
    machine (Nov 21, 2026: the winter-04 fetch 429'd until the URL was
    rebuilt as a thumb URL). A thumb URL can be built from the original's
    hash path, and thumbor serves it fine.
    """
    from urllib.parse import urlparse
    parts = urlparse(url)
    path = parts.path
    if "/wikipedia/commons/thumb/" in path:
        return url.replace("upload.wikimedia.org", "thumb.wikimedia.org")
    m = re.match(r"^/wikipedia/commons/([0-9a-f]/[0-9a-f]{2})/(.+)$", path)
    if m:
        h, fn = m.groups()
        return f"https://thumb.wikimedia.org/wikipedia/commons/thumb/{h}/{fn}/1280px-{fn}"
    return url

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
        # Prefer the recorded winning title; else first license-OK JPEG.
        ordered = sorted(results, key=lambda r: 0 if r["title"] == PICK_TITLES.get(card) else 1)
        for res in ordered:
            url = res["url"]
            ext_path = urllib.parse.urlparse(url).path.lower()
            if not url.startswith("https://") or not ext_path.endswith((".jpg", ".jpeg")):
                continue
            if not LICENSE_OK.match(res["license"] or ""):
                print(f"{card}: skipping {res['title'][:50]} (license: {res['license']})")
                continue
            try:
                status, body = get_bytes(thumb_url(url))
            except Exception as e:
                print(f"{card}: fetch failed: {e}")
                continue
            if status == 200 and body[:3] == b"\xff\xd8\xff" and len(body) > 20000:
                picked = (res, body)
                break
        if picked:
            break
        time.sleep(2)
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
    time.sleep(50)

json.dump(manifest, open(MANIFEST, "w"), indent=2)
print(f"manifest: {len(manifest)}/20 cards")
print("NOTE: files downloaded here are the 1280px Commons thumbs — recompress")
print("with PIL (max width 1024, JPEG quality 78) before wiring, as in")
print("docs/EXAMPLE_PHOTOS.md.")
