#!/usr/bin/env python3
"""Generate the worker catalog module from the chat catalog index JSON."""

# --- repo-relative paths (auto-inserted for the GitHub repo) ---
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
CHAT = os.path.join(ROOT, "chat-worker")
import json, os

SRC = os.path.join(DATA, "chat-catalog-index.json")
DST = os.path.join(CHAT, "src", "catalog.js")

data = json.load(open(SRC, encoding="utf-8"))
payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
with open(DST, "w", encoding="utf-8") as f:
    f.write("// AUTO-GENERATED from the Syda catalog sync. Do not edit manually.\n")
    f.write("// Format: [id, name, nameEn, price, oldPrice, category, image, descSnippet]\n")
    f.write(f"export const CATALOG = {payload};\n")
print(f"catalog.js: {len(data)} products, {os.path.getsize(DST)/1e6:.2f} MB raw")
