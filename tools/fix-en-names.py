#!/usr/bin/env python3
"""Fix the 7 products whose EN name came back in Arabic."""

# --- repo-relative paths (auto-inserted for the GitHub repo) ---
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
CHAT = os.path.join(ROOT, "chat-worker")
import json, time, re, urllib.request

ACCOUNT = os.environ.get("CF_ACCOUNT_ID", "02fcf95818efed008f495dd6e02c3ef6")
TOKEN = os.environ.get("CF_API_TOKEN", "")
if not TOKEN:
    raise SystemExit("Set the CF_API_TOKEN environment variable (Cloudflare API token with Workers AI permission) first.")
MODEL = "@cf/openai/gpt-oss-120b"
OUT = os.path.join(DATA, "translations.json")
DUKAN = os.path.join(DATA, "dukan-catalog.json")

state = json.load(open(OUT, encoding="utf-8"))
dukan = {p["id"]: p for p in json.load(open(DUKAN, encoding="utf-8"))}
targets = [k for k, v in state.items() if any('\u0600' <= c <= '\u06FF' for c in v['nameEn'])]
print("Fixing:", targets)


def call(prompt):
    body = {
        "messages": [
            {"role": "system", "content": "Reasoning: low\nYou translate product names from Arabic to natural English e-commerce titles. Output ONLY the English title, nothing else."},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 300,
        "temperature": 0.15,
    }
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/ai/run/{MODEL}",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        d = json.load(r)
    return (d["result"]["choices"][0]["message"].get("content") or "").strip().strip("•- ")


for pid in targets:
    ar_name = dukan[pid]["name"].strip().strip("•- ")
    for attempt in range(3):
        try:
            en = call(f"Arabic product name: {ar_name}\nEnglish title:")
            if en and not any('\u0600' <= c <= '\u06FF' for c in en):
                state[pid]["nameEn"] = en
                print(pid, "->", en[:70])
                break
        except Exception as e:
            print(pid, "err:", str(e)[:80])
            time.sleep(4)
    time.sleep(1)

json.dump(state, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
left = [k for k, v in state.items() if any('\u0600' <= c <= '\u06FF' for c in v['nameEn'])]
print("Still Arabic:", len(left), left)
