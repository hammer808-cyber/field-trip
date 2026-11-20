"""Fetch CC-licensed example photos for the 15 Errand Deck cards via Wikimedia Commons.

Writes: public/assets/challenges/errand-deck-XX.jpg + scripts/errand-example-photos-manifest.json
Only accepts 2xx JPEG bytes (magic-checked). Only CC BY, CC BY-SA, CC0, or
public domain — anything else (e.g. GFDL-only) is skipped. Skips cards already fetched.
Modeled on scripts/fetch-jet-setter-example-photos.py.

Eye-check round (Nov 20, 2026): two first picks failed the eye-check and were
replaced — see docs/EXAMPLE_PHOTOS-errand.md. The QUERIES below are the ones
that actually produced the winners, and PICK_TITLES names the winning file per
card; the script prefers that title when it appears in the results, otherwise
it takes the first license-OK JPEG (same fallback as the earlier deck scripts).

Wikimedia rate-limits hard — expect HTTP 429s; the script retries with
backoff. Note: upload.wikimedia.org (unscaled originals) 429'd persistently
from this machine while thumb.wikimedia.org (1280px thumbs, used here) kept
working, so downloads go through the thumb URLs.
"""
import json, os, re, time, urllib.request, urllib.parse, urllib.error

OUT = "public/assets/challenges"
MANIFEST = "scripts/errand-example-photos-manifest.json"
UA = {"User-Agent": "FieldtripExamplePhotos/1.0 (example photos for the Fieldtrip app; contact: field-trip repo)"}

QUERIES = {
    "errand-deck-01": ("supermarket aisle shelves", "grocery store aisle sign"),
    "errand-deck-02": ("shopping carts parking lot", "cart corral parking lot"),
    "errand-deck-03": ("vending machine snacks", "chocolate display store"),
    "errand-deck-04": ("supermarket entrance people", "person holding shopping basket"),
    "errand-deck-05": ("red shopping basket", "shopping basket groceries supermarket"),
    "errand-deck-06": ("supermarket checkout counter", "checkout lane cashier supermarket"),
    "errand-deck-07": ("dog shopping cart store", "dog in shopping cart"),
    "errand-deck-08": ("friends supermarket shopping", "couple grocery shopping cart"),
    "errand-deck-09": ("people waiting bench", "waiting room chairs people"),
    "errand-deck-10": ("woman carrying shopping bags street", "hands holding shopping bags"),
    "errand-deck-11": ("receipt paper store", "shopping receipt close up"),
    "errand-deck-12": ("coffee cup to go", "takeaway coffee cup hand"),
    "errand-deck-13": ("shopping bags car", "car trunk shopping bags"),
    "errand-deck-14": ("store closed sign door", "long queue supermarket checkout"),
    "errand-deck-15": ("friends laughing together", "friends laughing shopping"),
}

PICK_TITLES = {
    "errand-deck-01": "File:Aisle in L Intermarche supermarket in Quebec City.jpg",
    "errand-deck-02": "File:Shopping carts littered across a store parking lot in El Monte, USA.jpg",
    "errand-deck-03": "File:Cool M&M Candy Vending Machine (52989445950).jpg",
    "errand-deck-04": "File:Supermarket entrance - Flickr - @imaxeslugo.jpg",
    "errand-deck-05": "File:Shopping with kids (5418349069).jpg",
    "errand-deck-06": "File:Publix checkout aisle.jpg",
    "errand-deck-07": "File:Service dog out shopping.jpg",
    "errand-deck-08": "File:Asian Family Customers Shopping in The Super Market.jpg",
    "errand-deck-09": "File:People Waiting For San Francisco Muni (84006253).jpg",
    "errand-deck-10": "File:Shopping freak (Unsplash).jpg",
    "errand-deck-11": "File:Family Dollar store receipt.jpg",
    "errand-deck-12": "File:Person holding to-go coffee (Unsplash).jpg",
    "errand-deck-13": "File:Customers about to load a car on the roof parking space 8c35060v.jpg",
    "errand-deck-14": "File:Close-up of a closed sign hanging on a store door (51284470254).jpg",
    "errand-deck-15": "File:Two friends sitting together, chatting and laughing.jpg",
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
                status, body = get_bytes(url)
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
    time.sleep(2)

json.dump(manifest, open(MANIFEST, "w"), indent=2)
print(f"manifest: {len(manifest)}/15 cards")
print("NOTE: files downloaded here are the 1280px Commons thumbs — recompress")
print("with PIL (max width 1024, JPEG quality 78) before wiring, as in")
print("docs/EXAMPLE_PHOTOS-errand.md.")
