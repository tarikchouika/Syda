#!/usr/bin/env python3

# --- repo-relative paths (auto-inserted for the GitHub repo) ---
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
CHAT = os.path.join(ROOT, "chat-worker")
"""Refinalize the professional cleaning state after cleaner/pattern upgrades.

1. Rebuild AR targets with the CURRENT cleaner (fresh hashes, fresh detection).
2. Re-hash every state entry against the fresh clean (fixes stale hashes).
3. Re-validate every stored description with the CURRENT defect detectors:
   - det/fallback entries are recomputed from the fresh clean;
   - AI entries that still carry defects are downgraded to det + upgrade-pending.
4. Re-run the EN deterministic pass with the CURRENT EN patterns for any
   product whose EN still shows defects; leftovers get en_upgrade_pending.
"""
import json, re, sys, os, hashlib, importlib.util

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from syda_clean import clean_name, clean_desc

spec = importlib.util.spec_from_file_location("pc", os.path.join(os.path.dirname(os.path.abspath(__file__)), "professional-clean.py"))
pc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pc)

ANALYSIS = DATA
state = json.load(open(f"{ANALYSIS}/professional-clean.json", encoding="utf-8"))
log = json.load(open(f"{ANALYSIS}/professional-clean-log.json", encoding="utf-8"))
dukan = {p["id"]: p for p in json.load(open(f"{ANALYSIS}/dukan-catalog.json", encoding="utf-8"))}
translations = json.load(open(f"{ANALYSIS}/translations.json", encoding="utf-8"))
old_site = {p["id"]: p for p in json.load(open(f"{ANALYSIS}/products.json", encoding="utf-8"))}
targets = json.load(open(f"{ANALYSIS}/clean-targets.json", encoding="utf-8"))

def sha1(t):
    return hashlib.sha1((t or "").encode("utf-8")).hexdigest()

AR_DEFECT = re.compile(r"(^|\n)\s*زاوية[\s:：]|زوايا\s+(?:تسويقية|بيعية)|أفكار\s+(?:المحتوى|المنتج)|كلمات\s+مفتاحية")

n_rehash = n_recompute = n_downgrade = n_new_det = 0
for pid, d in targets["ar_targets"].items():
    fresh = d  # targets rebuilt below? — recompute fresh from raw for safety
    fresh = clean_desc(dukan[pid].get("description") or "")
    short = "very_short" in (targets["ar_reasons"].get(pid) or [])
    e = state.get(pid)
    if not e or not e.get("description"):
        if short:
            continue  # very-short empties wait for the AI upgrade pass
        det = pc.scaffold_strip(fresh)
        state[pid] = {"src_hash": sha1(fresh), "description": det, "mode": "det",
                      "reasons": targets["ar_reasons"].get(pid, []), "ar_upgrade_pending": True}
        n_new_det += 1
        continue
    old_hash = e.get("src_hash")
    e["src_hash"] = sha1(fresh)
    if old_hash != e["src_hash"]:
        n_rehash += 1
    stored = e.get("description") or ""
    if e.get("mode") in ("det", "fallback"):
        det = pc.scaffold_strip(fresh)
        if det != stored:
            log[pid] = {"mode": "det-recomputed", "before": stored, "after": det,
                        "reasons": targets["ar_reasons"].get(pid, [])}
        e["description"] = det
        e["ar_upgrade_pending"] = True
        n_recompute += 1
    elif AR_DEFECT.search(stored) or pc._ZAWIYA_LINESTART.search(stored) or pc._FORBIDDEN_AR.search(stored):
        det = pc.scaffold_strip(fresh)
        log[pid] = {"mode": "det-downgraded", "before": stored, "after": det,
                    "reasons": targets["ar_reasons"].get(pid, []), "note": "AI output carried defects"}
        e["description"] = det
        e["mode"] = "det"
        e["ar_upgrade_pending"] = True
        n_downgrade += 1

# EN re-pass with current patterns
n_en_fixed = n_en_pending = 0
en_ids = set(targets["en_retranslate"])
all_ids = set(dukan)  # sweep everything, not just the old target list
for pid in all_ids:
    cur = clean_desc(translations.get(pid, {}).get("descriptionEn")
                     or (old_site.get(pid, {}) or {}).get("descriptionEn") or "")
    if not cur or not pc.en_has_defects(cur):
        continue
    fixed = pc.en_scaffold_strip(cur)
    if not pc.en_has_defects(fixed):
        if pid in translations:
            translations[pid]["descriptionEn"] = fixed
        else:
            translations[pid] = {"nameEn": old_site.get(pid, {}).get("nameEn") or "", "descriptionEn": fixed}
        e = state.get(pid) or {}
        e["en"] = fixed
        e["en_done"] = True
        e.pop("en_upgrade_pending", None)
        state[pid] = e
        n_en_fixed += 1
    else:
        # still defective after deterministic strip — needs AI; store best-effort? keep original, flag pending
        e = state.get(pid) or {}
        e["en_upgrade_pending"] = True
        state[pid] = e
        n_en_pending += 1

json.dump(state, open(f"{ANALYSIS}/professional-clean.json", "w"), ensure_ascii=False, indent=1)
json.dump(log, open(f"{ANALYSIS}/professional-clean-log.json", "w"), ensure_ascii=False, indent=1)
json.dump(translations, open(f"{ANALYSIS}/translations.json", "w"), ensure_ascii=False, indent=1)
print(f"REFINALIZE: re-hash {n_rehash} | det recomputed {n_recompute} | AI downgraded {n_downgrade} | new det {n_new_det}")
print(f"EN: fixed now {n_en_fixed} | still pending AI {n_en_pending}")
