#!/usr/bin/env python3
"""FINAL quality audit of the built products.json (AR + EN) after professional cleaning."""

# --- repo-relative paths (auto-inserted for the GitHub repo) ---
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
CHAT = os.path.join(ROOT, "chat-worker")
import json, re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from syda_clean import clean_desc

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
products = json.load(open(os.path.join(ROOT, "site", "assets", "products.json")))
state = json.load(open(os.path.join(DATA, "professional-clean.json")))

# 1) override application check
pmap = {p["id"]: p for p in products}
applied, missing = 0, []
for pid, e in state.items():
    d = e.get("description")
    if not d:
        continue
    if pid in pmap and pmap[pid].get("description") == d:
        applied += 1
    else:
        missing.append(pid)
print("override present in build:", applied, "| missing:", len(missing), missing[:6])

# 2) defect patterns
P_ZAWIYA_LINE = re.compile(r"(^|\n)\s*زاوية[\s:：]")
P_SCAFFOLD = re.compile(r"زوايا\s+(?:تسويقية|بيعية)|أفكار\s+(?:المحتوى|المنتج)|كلمات\s+مفتاحية|السرية\s*[:：]\s*$|كلمة\s+البحث")
P_EN_SCAFFOLD = re.compile(r"(?i)marketing\s+angles?|selling\s+angles?|content\s+ideas|keywords?\s*:")
EMOJI = re.compile("[\U0001F000-\U0001FBFF\U00002600-\U000027BF\U00002B00-\U00002BFF\U0000FE0F]")
DIMS = re.compile(r"\d{2,}[.,]\d+\s*(?:سنتيمتر|سم|مم)")
SEP_EXOTIC = re.compile(r"[－─━＿]")

ar_bad, en_bad = [], []
n_emoji = n_dims = n_sep = 0
for p in products:
    d = p.get("description") or ""
    if P_ZAWIYA_LINE.search(d) or P_SCAFFOLD.search(d):
        ar_bad.append(p["id"])
    if EMOJI.search(d):
        n_emoji += 1
    if DIMS.search(d):
        n_dims += 1
    if SEP_EXOTIC.search(d):
        n_sep += 1
    dE = p.get("descriptionEn") or ""
    if P_EN_SCAFFOLD.search(dE) or P_ZAWIYA_LINE.search(dE) or P_SCAFFOLD.search(dE):
        en_bad.append(p["id"])
    if EMOJI.search(dE):
        n_emoji += 1

print(f"FINAL AUDIT  AR defects: {len(ar_bad)}  |  EN defects: {len(en_bad)}")
if ar_bad:
    print("  AR bad sample:", ar_bad[:10])
if en_bad:
    print("  EN bad sample:", en_bad[:10])
print(f"emoji remaining: {n_emoji} | broken dims: {n_dims} | exotic separators: {n_sep}")

# 3) dup-line check on final descs
n_dup = 0
for p in products:
    lines = [l.strip() for l in (p.get("description") or "").splitlines() if l.strip()]
    if len(lines) != len(set(lines)):
        n_dup += 1
print("products with exact duplicate lines:", n_dup)

# 4) very_short remaining
n_short = sum(1 for p in products if len(p.get("description") or "") < 40)
print("very short (<40 chars) AR descriptions:", n_short)
