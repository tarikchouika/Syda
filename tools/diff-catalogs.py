#!/usr/bin/env python3
"""Diff & merge analysis: existing site catalog vs fresh Dukan catalog."""

# --- repo-relative paths (auto-inserted for the GitHub repo) ---
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
CHAT = os.path.join(ROOT, "chat-worker")
import json

SITE = os.path.join(DATA, "products.json")
DUKAN = os.path.join(DATA, "dukan-catalog.json")

site = json.load(open(SITE, encoding="utf-8"))
dukan = json.load(open(DUKAN, encoding="utf-8"))

site_ids = {p["id"] for p in site}
dukan_ids = {p["id"] for p in dukan}

new_ids = dukan_ids - site_ids
removed_ids = site_ids - dukan_ids
common_ids = site_ids & dukan_ids

print(f"Site products: {len(site_ids)}")
print(f"Dukan products: {len(dukan_ids)}")
print(f"NEW (in Dukan, not on site): {len(new_ids)}")
print(f"REMOVED (on site, not in Dukan): {len(removed_ids)}")
print(f"COMMON: {len(common_ids)}")

# Check field structure differences on a common product
site_by_id = {p["id"]: p for p in site}
dukan_by_id = {p["id"]: p for p in dukan}
sample_common = next(iter(common_ids))
s, d = site_by_id[sample_common], dukan_by_id[sample_common]
print("\n--- Field comparison on common product", sample_common, "---")
print("Site keys:  ", sorted(s.keys()))
print("Dukan keys: ", sorted(d.keys()))

# Price changes among common products
price_changed = 0
img_changed = 0
name_changed = 0
for pid in common_ids:
    s, d = site_by_id[pid], dukan_by_id[pid]
    if json.dumps(s.get("price"), sort_keys=True) != json.dumps(d.get("price"), sort_keys=True):
        price_changed += 1
    s_imgs = [i.get("medium") for i in (s.get("images") or [])]
    d_imgs = [i.get("medium") for i in (d.get("images") or [])]
    if s_imgs != d_imgs:
        img_changed += 1
    if s.get("name") != d.get("name"):
        name_changed += 1
print(f"\nAmong {len(common_ids)} common: price changed: {price_changed}, images changed: {img_changed}, name changed: {name_changed}")

# How many existing products have English translations?
with_en = sum(1 for p in site if p.get("nameEn"))
print(f"Site products with nameEn: {with_en}/{len(site)}")

# New products: do any have English names from Dukan already?
new_with_en = sum(1 for pid in new_ids if dukan_by_id[pid].get("nameEn"))
print(f"New products with nameEn already: {new_with_en}/{len(new_ids)}")

# Save the lists for the next steps
json.dump(sorted(new_ids), open(os.path.join(DATA, "new-ids.json"), "w"))
json.dump(sorted(removed_ids), open(os.path.join(DATA, "removed-ids.json"), "w"))
print("\nSaved new-ids.json and removed-ids.json")

# Sample new product
if new_ids:
    nid = sorted(new_ids)[0]
    print("\nSample NEW product:", json.dumps(dukan_by_id[nid], ensure_ascii=False)[:600])
