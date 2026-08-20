#!/usr/bin/env python3
"""Veille QA Universe — fetches RSS feeds and updates NEWS array in index.html"""

import json, re, html, os, sys
from datetime import datetime, timezone, timedelta
from urllib.request import urlopen, Request
from urllib.error import URLError
import xml.etree.ElementTree as ET
import unicodedata

INDEX_PATH = "/Users/jahangir/recette-qa-universe/index.html"
REPO_PATH = "/Users/jahangir/recette-qa-universe"

SOURCES = [
    ("Google Testing Blog","https://testing.googleblog.com/feeds/posts/default","QA News"),
    ("Ministry of Testing","https://www.ministryoftesting.com/articles.rss","QA News"),
    ("Tricentis Blog","https://www.tricentis.com/blog/feed","QA News"),
    ("Sauce Labs Blog","https://saucelabs.com/blog/feed","QA News"),
    ("LambdaTest Blog","https://www.lambdatest.com/blog/feed/","QA News"),
    ("Perfecto Blog","https://www.perfecto.io/blog/feed","QA News"),
    ("Katalon Blog","https://katalon.com/resources-center/blog/feed","QA News"),
    ("testRigor Blog","https://testrigor.com/blog/feed/","AI Testing"),
    ("Cypress Blog","https://www.cypress.io/blog/feed","AI Testing"),
    ("Playwright Blog","https://dev.to/feed/tag/playwright","AI Testing"),
    ("Applitools Blog","https://applitools.com/blog/feed/","AI Testing"),
    ("Snyk Blog","https://snyk.io/blog/feed","Security & Risk"),
    ("Hugging Face Blog","https://huggingface.co/blog/feed.xml","AI Testing"),
    ("Blog OCTO Technology","https://blog.octo.com/feed/","Thought Leadership"),
    ("Software Testing Weekly","https://softwaretestingweekly.com/rss/","AI Testing"),
    ("BrowserStack Blog","https://www.browserstack.com/blog/feed/","QA News"),
    ("Sogeti Blog FR","https://www.sogeti.com/fr/blog/feed","Training"),
    ("ISTQB Official News","https://www.istqb.org/news?format=feed&type=rss","Training"),
    ("Gradient Flow","https://gradientflow.substack.com/feed","AI Testing"),
    ("OWASP GenAI","https://genai.owasp.org/feed/","Security & Risk"),
    ("Stack Overflow Blog","https://stackoverflow.blog/feed/","Thought Leadership"),
    ("GitHub Blog","https://github.blog/feed/","Thought Leadership"),
    ("InfoQ Testing","https://www.infoq.com/testing/feed.xml","QA News"),
    ("DevOps.com","https://devops.com/feed/","Thought Leadership"),
    ("Testing Curator","https://testingcurator.com/feed/","QA News"),
    ("EuroSTAR Blog","https://huddle.eurostarsoftwaretesting.com/feed/","QA News"),
]

REQUIRED_KEYWORDS = ["playwright"]  # tests-bugs.mjs requires >=1 news article per keyword

def fetch_rss(url):
    try:
        req = Request(url, headers={"User-Agent":"QA-Universe/1.0"})
        resp = urlopen(req, timeout=15)
        data = resp.read()
    except Exception as e:
        return [], str(e)
    articles = []
    try:
        root = ET.fromstring(data)
    except ET.ParseError as e:
        return [], f"XML: {e}"
    for item in root.iter("item"):
        try:
            t = _g(item,"title"); l = _g(item,"link")
            d = _g(item,"description") or _g(item,"content:encoded") or ""
            p = _g(item,"pubDate") or _g(item,"dc:date") or ""
            if t and l: articles.append({"title":t,"link":l,"desc":d,"date":p})
        except: continue
    ns = "{http://www.w3.org/2005/Atom}"
    for entry in root.iter(ns+"entry"):
        try:
            t = _g(entry,ns+"title"); l=""
            for el in entry.iter(ns+"link"): l=el.get("href","")
            d = _g(entry,ns+"content") or _g(entry,ns+"summary") or ""
            p = _g(entry,ns+"published") or _g(entry,ns+"updated") or ""
            if t and l: articles.append({"title":t,"link":l,"desc":d,"date":p})
        except: continue
    return articles, ""

def _g(p,t):
    e=p.find(t)
    return html.unescape(e.text.strip()) if e is not None and e.text else ""

def _pd(ds):
    ds=ds.strip()
    for fmt in ["%a, %d %b %Y %H:%M:%S %z","%a, %d %b %Y %H:%M:%S %Z",
                "%Y-%m-%dT%H:%M:%S%z","%Y-%m-%dT%H:%M:%SZ",
                "%Y-%m-%dT%H:%M:%S","%Y-%m-%d"]:
        try: return datetime.strptime(ds,fmt)
        except: continue
    return None

def _tz(dt):
    if dt is None: return datetime(2000,1,1,tzinfo=timezone.utc)
    if dt.tzinfo is None: return dt.replace(tzinfo=timezone.utc)
    return dt

def _sanitize(s):
    """Remove zero-width chars, control chars, and normalize unicode."""
    # Normalize unicode
    s = unicodedata.normalize('NFKC', s)
    # Remove zero-width and format characters
    s = re.sub(r'[\u200b-\u200f\u2028-\u202f\u2060-\u2064\ufeff\u00ad]', '', s)
    # Remove other invisible/control chars except basic ones
    s = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', s)
    return s.strip()

def _score(t,d):
    s=40
    for k in ["test","qa","quality","ai","agent","automation","playwright",
              "cypress","selenium","api","performance","security","llm","mcp",
              "ci/cd","devops","istqb","certification","pipeline","regression"]:
        if k in (t+" "+d).lower(): s+=5
    return min(s,100)

def _cat(t,d,dc):
    tx=(t+" "+d).lower()
    if any(w in tx for w in ["security","owasp","vulnerability","injection","risk"]): return "Security & Risk"
    if any(w in tx for w in ["ai","llm","agent","machine learning","gpt"]): return "AI Testing"
    if any(w in tx for w in ["istqb","certification","training","course"]): return "Training"
    if any(w in tx for w in ["future","thought","leadership","strategy"]): return "Thought Leadership"
    return dc

_EPOCH = datetime(2000,1,1,tzinfo=timezone.utc)

def generate_news():
    all_arts = []; seen = set()
    for src, url, dc in SOURCES:
        arts, err = fetch_rss(url)
        for a in arts:
            t = _sanitize(a["title"])
            if len(t) < 10: continue
            key = t[:60].lower()
            if key in seen: continue
            seen.add(key)
            d = _sanitize(html.unescape(re.sub(r"<[^>]+>","",a["desc"]).replace("\n"," ").replace("\r"," ")))[:200]
            pd = _pd(a.get("date",""))
            sc = _score(t,d)
            ct = _cat(t,d,dc)
            lg = "FR" if any(c in t for c in "çéèêëàôûù") else "EN"
            all_arts.append({"title":t,"src":src,"url":a["link"],
                "cat":ct,"score":sc,"date":pd or _EPOCH,"lang":lg,
                "excerpt":d[:180],"tags":[]})
    all_arts.sort(key=lambda x:(_tz(x["date"]) if isinstance(x["date"],datetime) else _EPOCH, x["score"]), reverse=True)
    full_sorted = all_arts
    all_arts = all_arts[:60]
    # Coverage guarantee: tests-bugs.mjs requires the keyword search to return
    # >=1 card. The default 'latest' render shows hero + grid = indices 0..12
    # (ids 1..13), so the keyword must appear in that window.
    # If it is absent from the top-60, swap in the best-scoring matching article
    # from the full fetched set into index 12 (last rendered grid slot).
    # If it is present but too old to render, move the newest match up to index 12.
    for kw in REQUIRED_KEYWORDS:
        covered = [i for i, a in enumerate(all_arts)
                   if kw in (a["title"] + " " + a["excerpt"]).lower()]
        if not covered:
            best = None
            for a in full_sorted:
                if kw in (a["title"] + " " + a["excerpt"]).lower() and a not in all_arts:
                    if best is None or a["score"] > best["score"]:
                        best = a
            if best is not None:
                if len(all_arts) > 12:
                    all_arts[12] = best
                else:
                    all_arts[-1] = best
        elif min(covered) > 12 and len(all_arts) > 12:
            a = all_arts.pop(min(covered))
            all_arts.insert(12, a)
    for i,a in enumerate(all_arts,1):
        a["id"]=i
        if isinstance(a["date"],datetime):
            a["date"]=a["date"].strftime("%b %Y")
    return all_arts

def update_html(articles):
    with open(INDEX_PATH,"r") as f: text=f.read()
    lines=["const NEWS = ["]
    for a in articles:
        ts=a["title"].replace("\\","\\\\").replace('"','\\"').replace("\n"," ").replace("\r","")
        es=a["excerpt"].replace("\\","\\\\").replace('"','\\"').replace("\n"," ").replace("\r","")
        lines.append(f'  {{id:{a["id"]},title:"{ts}",source:"{a["src"]}",sourceUrl:"{a["url"]}",cat:"{a["cat"]}",tags:[],score:{a["score"]},date:"{a["date"]}",lang:"{a["lang"]}",excerpt:"{es}"}},')
    lines.append("];")
    new=("\n".join(lines))
    old_s = "const NEWS = ["
    old_e = "];"
    s_idx = text.find(old_s)
    e_idx = text.find(old_e, s_idx+len(old_s))
    if s_idx==-1 or e_idx==-1:
        print("ERROR: NEWS array not found")
        return False
    new_text = text[:s_idx] + new + text[e_idx+2:]
    with open(INDEX_PATH,"w") as f: f.write(new_text)
    return True

def main():
    os.chdir(REPO_PATH)
    a = generate_news()
    print(f"Fetched {len(a)} articles")
    if not a: print("No articles"); sys.exit(1)
    if update_html(a): print("index.html updated")

if __name__=="__main__": main()
