from html.parser import HTMLParser
from pathlib import Path
import json
import re
import xml.etree.ElementTree as ET

root = Path(__file__).parent
store_url = "https://apps.apple.com/app/apple-store/id6814292849?pt=129488749&ct=Site&mt=8"

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))

errors = []
for filename in ["index.html", "whats-new.html", "whats-new/index.html", "privacy.html", "privacy/index.html", "support.html", "support/index.html", "beta.html", "beta/index.html"]:
    text = (root / filename).read_text()
    page = Page(text)
    ids = [attrs["id"] for _, attrs in page.tags if "id" in attrs]
    if len(ids) != len(set(ids)):
        errors.append(filename + ": duplicate ids")
    if sum(tag == "h1" for tag, _ in page.tags) != 1:
        errors.append(filename + ": expected one h1")
    if sum(tag == "link" and attrs.get("rel") == "canonical" for tag, attrs in page.tags) != 1:
        errors.append(filename + ": expected one canonical")
    for tag, attrs in page.tags:
        if tag == "img" and not attrs.get("alt"):
            errors.append(filename + ": image needs alt")
        for key in ["href", "src"]:
            url = attrs.get(key, "")
            if url.startswith("#") and url[1:] not in ids:
                errors.append(filename + ": broken anchor " + url)
            if url.startswith("/") and not url.startswith("//"):
                path = url.split("#")[0].split("?")[0]
                target = root / path.lstrip("/")
                if path == "/":
                    target = root / "index.html"
                elif path.endswith("/"):
                    target = target / "index.html"
                if not target.exists():
                    errors.append(filename + ": missing local target " + url)
            if "apps.apple.com" in url and url != store_url:
                errors.append(filename + ": unexpected App Store URL")

home = (root / "index.html").read_text()
json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', home, re.S).group(1))
assert home.count('href="' + store_url.replace("&", "&amp;") + '"') >= 3
assert "No accounts. No ads. No tracking." in home
assert "No subscriptions. No in-app purchases." in home
for filename in ["whats-new.html", "whats-new/index.html"]:
    text = (root / filename).read_text()
    assert "beta-open" not in text and "beta-form" not in text and "beta.js" not in text
assert (root / "whats-new.html").read_bytes() == (root / "whats-new/index.html").read_bytes()
for filename in ["launch.css", "interior.css"]:
    css = (root / filename).read_text()
    assert css.count("{") == css.count("}")
for filename in ["privacy", "support", "beta"]:
    assert (root / (filename + ".html")).read_bytes() == (root / filename / "index.html").read_bytes()
version = re.search(r'href="/launch\.css\?v=(\d+)"', home).group(1)
assert 'src="/site.js?v=' + version + '" defer' in home and (root / "site.js").exists()
for filename in ["whats-new.html", "privacy.html", "support.html", "beta.html"]:
    assert 'href="/interior.css?v=' + version + '"' in (root / filename).read_text()
assert home.count('class="budget-row"') == 5 and 'id="budget-range"' in home
assert home.count('class="tour-slide"') == home.count('class="tour-link"') == 9
beta = (root / "beta.html").read_text()
assert 'id="beta-form"' in beta and 'src="/beta.js?v=' + version + '"' in beta and 'href="/beta/"' in home
ET.parse(root / "sitemap.xml")
ET.parse(root / "assets/favicon.svg")
if errors:
    raise SystemExit("\n".join(errors))
print("PASS: nine HTML routes, internal links and anchors, unique IDs, headings, canonicals, exact App Store URLs, release-route parity, JSON-LD, XML, CSS brace balance and removed beta controls.")
print("LIMIT: static checks only; no rendered layout, screen-reader, external screenshot availability or Core Web Vitals verification.")
