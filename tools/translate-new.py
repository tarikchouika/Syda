#!/usr/bin/env python3

# --- repo-relative paths (auto-inserted for the GitHub repo) ---
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
CHAT = os.path.join(ROOT, "chat-worker")
"""Translate NEW + RENAMED products AR->EN via Cloudflare Workers AI (gpt-oss-120b).

Anti-hallucination: faithful translation only, no invention, no markdown symbols.
Resume-safe: skips IDs already present unless forced. Post-cleaned with syda_clean.
"""
import json, os, re, sys, time, urllib.request, urllib.error

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from syda_clean import clean_name, clean_desc

ACCOUNT = os.environ.get("CF_ACCOUNT_ID", "02fcf95818efed008f495dd6e02c3ef6")
TOKEN = os.environ.get("CF_API_TOKEN", "")
MODEL = "@cf/openai/gpt-oss-120b"

ANALYSIS = DATA
DUKAN = f"{ANALYSIS}/dukan-catalog.json"
OUT = f"{ANALYSIS}/translations.json"

# products renamed on Dukan since last sync -> EN translation is stale, force re-translate
RENAMED = ["SA030101DS0099", "SA030109WOY499", "SA030201AI009100W", "SA030402GZY999",
           "SA040108CALV0099", "SA04011LACNEW00099"]


def build_prompt(p):
    return f"""Translate this product listing from Arabic to English for a Saudi e-commerce store.

Rules:
- Product name: a concise natural e-commerce title (keep model numbers, brands, measurements as-is).
- Description: faithful COMPLETE translation, preserving the line structure.
- Keep numerals, units and brand names unchanged. Do NOT add, invent or omit any content.
- PLAIN TEXT ONLY: never use markdown symbols such as * - _ # or bullet characters.

ID: {p['id']}
NAME_AR: {p['name']}
DESC_AR_START
{p['description'] or '(no description)'}
DESC_AR_END

Answer EXACTLY in this format:
ID: {p['id']}
N: <English name>
D_START
<English description>
D_END"""


def parse(text):
    m = re.search(r"ID:\s*([^\n]+)\s*\n\s*N:\s*([^\n]*)\n\s*D_START\n([\s\S]*?)\n?\s*D_END", text)
    if not m:
        raise ValueError("parse failed")
    name = m.group(2).strip()
    desc = m.group(3).strip()
    if desc in ("(no description)", ""):
        desc = ""
    if not name:
        raise ValueError("empty name")
    if "*" in name or "*" in desc or re.search(r"(^|\n)\s*[-•]\s", desc):
        raise ValueError("markdown symbols in output")
    return {"nameEn": name, "descriptionEn": desc}


def call_ai(prompt):
    body = {
        "messages": [
            {"role": "system", "content": "Reasoning: low\nYou are a precise professional translator. Follow the output format exactly. Plain text only, no markdown symbols."},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 4000,
        "temperature": 0.15,
    }
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/ai/run/{MODEL}",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.load(r)
    if not data.get("success"):
        raise RuntimeError(f"API error: {json.dumps(data.get('errors'))[:200]}")
    res = data["result"]
    msg = res.get("choices", [{}])[0].get("message", {}).get("content") or res.get("response") or ""
    return msg.strip()


def main():
    dukan = {p["id"]: p for p in json.load(open(DUKAN, encoding="utf-8"))}
    new_ids = json.load(open(f"{ANALYSIS}/new-ids.json", encoding="utf-8"))
    state = json.load(open(OUT, encoding="utf-8"))

    todo = [pid for pid in new_ids if pid not in state] + [pid for pid in RENAMED if pid in dukan]
    print(f"To translate: {len(todo)} ({len(new_ids)} new, {len([p for p in RENAMED if p in dukan])} re-named)")

    done, failed = 0, []
    for i, pid in enumerate(todo, 1):
        p = dukan[pid]
        # translate from the CLEANED source so the EN mirrors the published AR exactly
        src = {"id": pid, "name": clean_name(p.get("name") or ""), "description": clean_desc(p.get("description") or "")}
        entry = None
        for attempt in range(3):
            try:
                raw = call_ai(build_prompt(src))
                entry = parse(raw)
                # deterministic post-clean (belt & braces)
                entry["nameEn"] = clean_name(entry["nameEn"])
                entry["descriptionEn"] = clean_desc(entry["descriptionEn"])
                break
            except Exception as e:
                if attempt == 2:
                    failed.append((pid, str(e)[:120]))
                else:
                    time.sleep(3 * (attempt + 1))
        if entry:
            state[pid] = entry
            done += 1
            with open(OUT, "w", encoding="utf-8") as f:
                json.dump(state, f, ensure_ascii=False, indent=1)
        if i % 10 == 0 or i == len(todo):
            print(f"  progress {i}/{len(todo)} (ok={done}, failed={len(failed)})")

    print(f"DONE: {done} translated, {len(failed)} failed")
    for pid, err in failed:
        print(f"  FAILED {pid}: {err}")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
