#!/usr/bin/env python3
"""Translate the remaining 12 products via Cloudflare Workers AI (gpt-oss-120b)."""

# --- repo-relative paths (auto-inserted for the GitHub repo) ---
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
CHAT = os.path.join(ROOT, "chat-worker")
import json, time, urllib.request

ACCOUNT = os.environ.get("CF_ACCOUNT_ID", "02fcf95818efed008f495dd6e02c3ef6")
TOKEN = os.environ.get("CF_API_TOKEN", "")
if not TOKEN:
    raise SystemExit("Set the CF_API_TOKEN environment variable (Cloudflare API token with Workers AI permission) first.")
MODEL = "@cf/openai/gpt-oss-120b"

DUKAN = os.path.join(DATA, "dukan-catalog.json")
OUT = os.path.join(DATA, "translations.json")
IDS = ['SA030501JJCNEW599','SA04010800KC00HANZAL','SA050101ZNB0099','SA050103ZPO199','SA01025464NEW','SA030107YNV599','SA04010700ODOR00','SA04010700SMKC00','SA050106ML0099','SA050301GLM199','SA050502BB0099','SA05100104099']

state = json.load(open(OUT, encoding="utf-8"))
dukan = {p["id"]: p for p in json.load(open(DUKAN, encoding="utf-8"))}


def build_prompt(p):
    return f"""Translate this product from Arabic to English.

Rules:
- Product name: a concise natural e-commerce title (keep model numbers, brands, measurements as-is).
- Description: faithful COMPLETE translation preserving line breaks and structure.
- Keep numerals, units, brand names unchanged. Do not add or invent content.

ID: {p['id']}
NAME_AR: {p['name']}
DESC_AR_START
{p['description']}
DESC_AR_END

Answer EXACTLY in this format:
ID: {p['id']}
N: <English name>
D_START
<English description>
D_END"""


def parse(text):
    import re
    m = re.search(r"ID:\s*([^\n]+)\s*\n\s*N:\s*([^\n]*)\n\s*D_START\n([\s\S]*?)\n?\s*D_END", text)
    if not m:
        raise ValueError("parse failed")
    return {"nameEn": m.group(2).strip(), "descriptionEn": m.group(3).strip()}


def call_ai(prompt):
    body = {
        "messages": [
            {"role": "system", "content": "Reasoning: low\nYou are a precise professional translator. Follow the output format exactly."},
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
    with urllib.request.urlopen(req, timeout=120) as r:
        d = json.load(r)
    c = d["result"]["choices"][0]["message"]
    return c.get("content") or ""


for pid in IDS:
    if pid in state:
        print(pid, "already done")
        continue
    p = dukan[pid]
    for attempt in range(1, 5):
        try:
            text = call_ai(build_prompt(p))
            res = parse(text)
            if not res["nameEn"]:
                raise ValueError("empty name")
            state[pid] = res
            json.dump(state, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
            print(pid, "OK —", res["nameEn"][:60])
            break
        except Exception as e:
            print(pid, f"attempt {attempt} failed: {str(e)[:100]}")
            time.sleep(5 * attempt)
    time.sleep(1)

missing = [i for i in IDS if i not in state]
print(f"REMAINING: {len(missing)}", missing)
