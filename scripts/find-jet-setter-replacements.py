"""Search Commons for replacement candidates for the failed Jet Setter first picks.

Prints JSON lines: card, title, license, artist, page, url.
Only CC BY / CC BY-SA / CC0 / public domain JPEGs. Uses filetype:bitmap to
keep Internet Archive book scans out of the results.
Usage: python3 scripts/find-jet-setter-replacements.py <card-id> "<query>" [<query2> ...]
"""
import json, re, sys, time, urllib.request, urllib.parse

UA = {"User-Agent": "FieldtripExamplePhotos/1.0 (example photos for the Fieldtrip app; contact: field-trip repo)"}
LICENSE_OK = re.compile(r"^(CC BY(-SA)?( \d\.\d)?|CC0|Public domain)", re.IGNORECASE)

def get_json(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def search(query):
    q = urllib.parse.quote(query + " filetype:bitmap")
    url = ("https://commons.wikimedia.org/w/api.php?action=query&format=json"
           f"&generator=search&gsrsearch={q}&gsrnamespace=6&gsrlimit=10"
           "&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1280")
    data = get_json(url)
    pages = (data.get("query") or {}).get("pages") or {}
    out = []
    for p in pages.values():
        info = (p.get("imageinfo") or [{}])[0]
        url = info.get("thumburl") or info.get("url", "")
        ext_path = urllib.parse.urlparse(url).path.lower()
        if not url.startswith("https://") or not ext_path.endswith((".jpg", ".jpeg")):
            continue
        lic = ((info.get("extmetadata") or {}).get("LicenseShortName") or {}).get("value", "")
        if not LICENSE_OK.match(lic or ""):
            continue
        out.append({
            "title": p.get("title", ""),
            "url": url,
            "license": lic,
            "artist": ((info.get("extmetadata") or {}).get("Artist") or {}).get("value", ""),
            "page": f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(p.get('title','').replace(' ', '_'))}",
            "width": info.get("width"), "height": info.get("height"),
        })
    return out

card = sys.argv[1]
seen = set()
for q in sys.argv[2:]:
    try:
        results = search(q)
    except Exception as e:
        print(f"# search {q!r} failed: {e}", file=sys.stderr)
        continue
    for res in results:
        if res["title"] in seen:
            continue
        seen.add(res["title"])
        print(json.dumps({"card": card, "query": q, **res}))
    time.sleep(2)
