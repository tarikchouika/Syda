#!/usr/bin/env python3
"""Scrape the full product catalog from the Dukan public API (syda.dukan.shop)."""

# --- repo-relative paths (auto-inserted for the GitHub repo) ---
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
CHAT = os.path.join(ROOT, "chat-worker")
import json, time, sys, urllib.request, urllib.error, os
from concurrent.futures import ThreadPoolExecutor, as_completed

API = "https://api.dukan.shop/api/storefront/products"
ORIGIN = "https://syda.dukan.shop"
OUT = os.path.join(DATA, "dukan-catalog.json")
PAGE_SIZE = 30

def fetch_page(page):
    url = f"{API}?page={page}&pageSize={PAGE_SIZE}"
    req = urllib.request.Request(url, headers={
        "Origin": ORIGIN,
        "Referer": ORIGIN + "/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/json",
    })
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=45) as r:
                return page, json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and attempt < 3:
                time.sleep(2 * (attempt + 1))
                continue
            raise
        except Exception:
            if attempt < 3:
                time.sleep(2 * (attempt + 1))
                continue
            raise
    raise RuntimeError(f"page {page} failed")

def main():
    # First page to learn pagination
    _, first = fetch_page(1)
    pagination = first.get("pagination", {})
    total_pages = pagination.get("totalPages", 1)
    total_elements = pagination.get("totalElements", 0)
    print(f"Total products: {total_elements} | pages: {total_pages}")

    products = {}
    def absorb(page_data):
        for p in page_data.get("products", []):
            products[p["id"]] = p

    absorb(first)

    pages = list(range(2, total_pages + 1))
    done = 1
    with ThreadPoolExecutor(max_workers=4) as ex:
        futures = {ex.submit(fetch_page, p): p for p in pages}
        for fut in as_completed(futures):
            page, data = fut.result()
            absorb(data)
            done += 1
            if done % 20 == 0 or done == total_pages:
                print(f"  progress: {done}/{total_pages} pages, {len(products)} unique products")

    print(f"Scraped {len(products)} unique products")
    catalog = sorted(products.values(), key=lambda p: p.get("id", ""))
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False)
    print(f"Saved to {OUT} ({os.path.getsize(OUT)/1e6:.1f} MB)")

    # Stats
    cats = {}
    for p in catalog:
        cats[p.get("category") or "?"] = cats.get(p.get("category") or "?", 0) + 1
    print("Categories:", json.dumps(cats, ensure_ascii=False))
    missing_name = sum(1 for p in catalog if not p.get("name"))
    no_img = sum(1 for p in catalog if not (p.get("images") or []))
    print(f"missing name: {missing_name}, no images: {no_img}")

if __name__ == "__main__":
    main()
