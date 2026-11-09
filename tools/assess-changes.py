#!/usr/bin/env python3
"""Assess how much Arabic names/descriptions changed for common products."""

# --- repo-relative paths (auto-inserted for the GitHub repo) ---
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
CHAT = os.path.join(ROOT, "chat-worker")
import json, difflib

site = {p["id"]: p for p in json.load(open(os.path.join(DATA, "products.json"), encoding="utf-8"))}
dukan = {p["id"]: p for p in json.load(open(os.path.join(DATA, "dukan-catalog.json"), encoding="utf-8"))}

name_changes = []
desc_changes = []
for pid, s in site.items():
    d = dukan.get(pid)
    if not d:
        continue
    if s.get("name") != d.get("name"):
        ratio = difflib.SequenceMatcher(None, s.get("name",""), d.get("name","")).ratio()
        name_changes.append((ratio, pid, s.get("name",""), d.get("name","")))
    if s.get("description") != d.get("description"):
        ratio = difflib.SequenceMatcher(None, s.get("description","")[:500], d.get("description","")[:500]).ratio()
        desc_changes.append((ratio, pid))

print(f"Name changes: {len(name_changes)}")
major = [c for c in name_changes if c[0] < 0.7]
minor = [c for c in name_changes if c[0] >= 0.7]
print(f"  major (<0.7 similarity, need re-translation): {len(major)}")
print(f"  minor (>=0.7, keep existing EN): {len(minor)}")
print("\nExamples of MAJOR name changes:")
for r, pid, old, new in sorted(major)[:5]:
    print(f"  [{r:.2f}] {old[:50]!r} -> {new[:50]!r}")
print("\nExamples of MINOR name changes:")
for r, pid, old, new in sorted(minor)[:5]:
    print(f"  [{r:.2f}] {old[:50]!r} -> {new[:50]!r}")

print(f"\nDescription changes: {len(desc_changes)}")
dmajor = [c for c in desc_changes if c[0] < 0.7]
print(f"  major (<0.7): {len(dmajor)}")
print(f"  minor: {len(desc_changes) - len(dmajor)}")

# Re-translation needed: major name change OR major desc change
need_retrans = {pid for r, pid, *_ in major} | {pid for r, pid in dmajor}
need_retrans -= {pid for pid in need_retrans if pid not in site}
print(f"\nProducts needing re-translation: {len(need_retrans)}")
new_ids = set(json.load(open(os.path.join(DATA, "new-ids.json"))))
total_translate = len(need_retrans) + len(new_ids)
print(f"Total products to translate (new + re-trans): {total_translate}")
json.dump(sorted(need_retrans), open(os.path.join(DATA, "retrans-ids.json"), "w"))
