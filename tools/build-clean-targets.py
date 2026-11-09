#!/usr/bin/env python3
"""Build professional-cleaning target lists after deterministic v2 clean."""

# --- repo-relative paths (auto-inserted for the GitHub repo) ---
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
CHAT = os.path.join(ROOT, "chat-worker")
import json, re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from syda_clean import clean_name, clean_desc

ANALYSIS = DATA
dukan = json.load(open(f"{ANALYSIS}/dukan-catalog.json", encoding="utf-8"))
translations = json.load(open(f"{ANALYSIS}/translations.json", encoding="utf-8"))
old_site = {p["id"]: p for p in json.load(open(f"{ANALYSIS}/products.json", encoding="utf-8"))}

# --- AR targets: defects that need professional (AI) rewriting ---
P_ZAWIYA_LINE = re.compile(r"(^|\n)\s*زاوية[\s:：]", re.M)   # زاوية at LINE START (header w/ or w/o colon)
P_AFKAR = re.compile(r"أفكار")
P_KEYWORDS = re.compile(r"كلمات\s+مفتاحية|الكلمات\s+المفتاحية|كلمة\s+البحث")
P_SECRECY = re.compile(r"(^|\n)\s*السرية\s*[:：]", re.M)
P_MUHTAWA = re.compile(r"(^|\n)\s*المحتوى\s*[:：]\s*($|\n)", re.M)  # bare المحتوى: header
P_PHONE = re.compile(r"(واتس|واتساب|whatsapp|هاتف|جوال|اتصل)\s*[:\-]?\s*[\d\s+]{8,}", re.I)
P_URL = re.compile(r"https?://|www\.", re.I)
P_DESC_EN = re.compile(r"الوصف\s+بالانجليزي|الوصف\s+بالعربي")
P_EN_SCAFFOLD = re.compile(r"(?i)(marketing\s+angles?|selling\s+angles?|content\s+ideas|keywords?\s*:|زاوية|زوايا|أفكار\s+المحتوى)")

ar_targets, ar_reasons = {}, {}
for p in dukan:
    pid = p["id"]
    d = clean_desc(p.get("description") or "")
    nm = clean_name(p.get("name") or "")
    rs = []
    if P_ZAWIYA_LINE.search(d): rs.append("zawiya_line")
    if P_AFKAR.search(d): rs.append("afkar")
    if P_KEYWORDS.search(d): rs.append("keywords")
    if P_SECRECY.search(d): rs.append("secrecy")
    if P_MUHTAWA.search(d): rs.append("muhtawa_hdr")
    if P_PHONE.search(d): rs.append("phone")
    if P_URL.search(d): rs.append("url")
    if P_DESC_EN.search(d): rs.append("desc_note")
    if len(d) < 40: rs.append("very_short")
    if rs:
        ar_targets[pid] = d
        ar_reasons[pid] = rs

from collections import Counter
rc = Counter()
for rs in ar_reasons.values():
    for r in rs: rc[r] += 1
print("=== AR targets ===")
print("total:", len(ar_targets))
for k, v in rc.most_common(): print(f"  {k:14s} {v}")

# --- EN targets: current EN (merge order like build-site) with defects ---
def current_en(pid, cleaned_ar):
    if pid in translations:
        return clean_desc(translations[pid].get("descriptionEn") or "")
    if pid in old_site:
        return clean_desc(old_site[pid].get("descriptionEn") or "")
    return cleaned_ar

en_all_defect, en_need_retranslate, en_fallback_ar = [], [], 0
for p in dukan:
    pid = p["id"]
    cleaned_ar = clean_desc(p.get("description") or "")
    en = current_en(pid, cleaned_ar)
    is_fallback = pid not in translations and pid not in old_site
    if is_fallback: en_fallback_ar += 1
    if P_EN_SCAFFOLD.search(en):
        en_all_defect.append(pid)
        en_need_retranslate.append(pid)
    elif pid in ar_targets:
        en_need_retranslate.append(pid)   # AR cleaned -> refresh EN for consistency

print("\n=== EN ===")
print("EN with defects (scaffolding in EN):", len(en_all_defect))
print("EN re-translate set (defects ∪ AR-cleaned):", len(set(en_need_retranslate)))
print("EN fallback = Arabic copy (no translation at all):", en_fallback_ar)

# fallback products that ALSO have AR defects or are very short
fb_with_ar_issue = [pid for pid in ar_targets if pid not in translations and pid not in old_site]
print("fallback-AR products that are AR targets:", len(fb_with_ar_issue))

json.dump({"ar_targets": ar_targets, "ar_reasons": ar_reasons,
           "en_retranslate": sorted(set(en_need_retranslate))},
          open(f"{ANALYSIS}/clean-targets.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("\nSaved clean-targets.json")
