#!/usr/bin/env python3

# --- repo-relative paths (auto-inserted for the GitHub repo) ---
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
CHAT = os.path.join(ROOT, "chat-worker")
"""Professional batch cleaning of product descriptions (Syda store).

Cleans the defects the deterministic cleaner cannot fix, in AI batches:
  1. AR descriptions with planning-note scaffolding ("زاوية X:", أفكار residue)
     -> professional rewrite that PRESERVES every feature/benefit (القيمة المضافة).
  2. AR very-short descriptions -> conservative expansion from the product name only.
  3. EN descriptions -> faithful re-translation from the cleaned AR.

Zero-hallucination guarantees (per product, hard-fail -> retry -> deterministic fallback):
  - every number in the output must exist in the input (name/desc)
  - no markdown/bullet/emoji symbols, no planning-note vocabulary
  - length-ratio and content-word coverage windows
  - fallback keeps the deterministic-cleaned text with scaffold prefixes stripped

Output: syda-analysis/professional-clean.json  {pid: {src_hash, description, mode, reasons}}
        syda-analysis/translations.json        (descriptionEn updated in place)
        syda-analysis/professional-clean-log.json (full before/after audit trail)
Resume-safe: skips already-processed ids. Batches of <=5 products / <=4500 chars.
"""
import json, os, re, sys, time, hashlib, threading, urllib.request, urllib.error
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from syda_clean import clean_name, clean_desc

ACCOUNT_AI = os.environ.get("CF_ACCOUNT_ID", "02fcf95818efed008f495dd6e02c3ef6")          # AI account — ALSO serves the LIVE chatbot (use as fallback only!)
TOKEN_AI = os.environ.get("CF_API_TOKEN", "")
ACCOUNT_SITE = os.environ.get("CF_ACCOUNT_SITE", "03efbdbe7f8da54f935d03a024470f4a")       # site account — fresh AI quota, no other consumers (PRIMARY)
TOKEN_SITE = os.environ.get("CF_API_TOKEN_SITE", "")
MODEL = "@cf/openai/gpt-oss-120b"

ANALYSIS = DATA
OUT_AR = f"{ANALYSIS}/professional-clean.json"
OUT_LOG = f"{ANALYSIS}/professional-clean-log.json"

BATCH_N = 8
BATCH_CHARS = 7000

# ---------------- API (rate-limit aware) ----------------


class RateLimitError(Exception):
    pass


_api_lock = threading.Lock()
_last_call = [0.0]
MIN_GAP = 1.1          # seconds between API calls (global pacing across workers)
_BACKOFFS = [15, 30, 45, 60]
_ACCOUNTS = [(ACCOUNT_SITE, TOKEN_SITE), (ACCOUNT_AI, TOKEN_AI)]   # primary = site, failover = AI (chatbot!)
_cur_acc = [0]
_acc_dead = [False, False]


def _request_for(prompt, max_tokens):
    acc, tok = _ACCOUNTS[_cur_acc[0]]
    return urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{acc}/ai/run/{MODEL}",
        data=json.dumps({
            "messages": [
                {"role": "system", "content": "Reasoning: low\nأنت محرر محتوى تسويقي محترف. اتبع التعليمات والتنسيق المطلوب حرفياً. نص عادي فقط بدون أي رموز ماركداون."},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": max_tokens,
            "temperature": 0.2,
        }).encode(),
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
        method="POST",
    )


def call_ai(prompt, max_tokens=12000):
    last_err = None
    for attempt in range(len(_BACKOFFS) + 2):
        # switch to a live account if the current one is quota-dead
        if _acc_dead[_cur_acc[0]]:
            if all(_acc_dead):
                raise RateLimitError("all accounts quota-exhausted")
            _cur_acc[0] = 1 - _cur_acc[0]
        with _api_lock:
            wait = MIN_GAP - (time.time() - _last_call[0])
            if wait > 0:
                time.sleep(wait)
            _last_call[0] = time.time()
        try:
            with urllib.request.urlopen(_request_for(prompt, max_tokens), timeout=240) as r:
                data = json.load(r)
            if not data.get("success"):
                raise RuntimeError(f"API error: {json.dumps(data.get('errors'))[:200]}")
            res = data["result"]
            return (res.get("choices", [{}])[0].get("message", {}).get("content") or res.get("response") or "").strip()
        except urllib.error.HTTPError as e:
            body = b""
            try:
                body = e.read()
            except Exception:
                pass
            txt = body.decode(errors="ignore")
            quota = e.code == 429 or "4006" in txt or "daily free allocation" in txt
            if quota:
                # this account's daily neurons are gone — mark dead and switch immediately
                print(f"    account {_ACCOUNTS[_cur_acc[0]][0][:8]}… quota exhausted, switching", flush=True)
                _acc_dead[_cur_acc[0]] = True
                if all(_acc_dead):
                    raise RateLimitError("all accounts quota-exhausted")
                _cur_acc[0] = 1 - _cur_acc[0]
                continue
            if e.code in (500, 502, 503, 504) and attempt < len(_BACKOFFS):
                time.sleep(_BACKOFFS[min(attempt, len(_BACKOFFS) - 1)])
                continue
            raise
        except Exception as e:
            last_err = e
            if attempt < len(_BACKOFFS):
                time.sleep(_BACKOFFS[attempt])
                continue
            raise
    raise RateLimitError(f"exhausted retries: {last_err}")

# ---------------- validation ----------------

_NUM = re.compile(r"\d+(?:[.,]\d+)?")
_AR_WORD = re.compile(r"[\u0621-\u064A]{4,}")
_FORBIDDEN_ANY = re.compile("[*#•·▪‣`_]|[\\U0001F000-\\U0001FBFF\\U00002600-\\U000027BF\\U00002B00-\\U00002BFF\\U0000FE0F]")
_FORBIDDEN_AR = re.compile(r"زوايا\s+(?:تسويقية|بيعية|بيع)|أفكار\s+(?:المحتوى|المنتج)|كلمات\s+مفتاحية|كلمة\s+البحث|الوصف\s+بالانجليزي")
_DASH_LIST = re.compile(r"(^|\n)\s*[-–—]\s+\S")


def numbers_of(*texts):
    out = set()
    for t in texts:
        for n in _NUM.findall(t or ""):
            out.add(n.rstrip("."))
            if "." in n:
                out.add(n.replace(".", ","))
                a, _, b = n.partition(".")
                out.add(a); out.add(b)
            if "," in n:
                out.add(n.replace(",", "."))
    return out


def content_words(t):
    return set(_AR_WORD.findall(t or ""))


_ZAWIYA_LINESTART = re.compile(r"(^|\n)\s*زاوية[\s:：]")


def _dup_ratio(out):
    """Cross-line char-5gram repetition ratio — detects semantically duplicated feature lines."""
    grams_per_line = []
    for l in out.splitlines():
        norm = re.sub(r"[^\u0621-\u064A\u0660-\u0669a-zA-Z0-9]", "", l)
        if len(norm) < 15:
            continue
        grams = {norm[i:i+5] for i in range(len(norm) - 4)}
        if grams:
            grams_per_line.append(grams)
    if len(grams_per_line) < 2:
        return 0.0
    seen, repeated, total = set(), 0, 0
    for grams in grams_per_line:
        total += len(grams)
        repeated += len(grams & seen)
        seen |= grams
    return repeated / max(1, total)


def validate_ar(src, name, out, short_mode=False):
    """Return list of violations (empty = pass)."""
    errs = []
    if _FORBIDDEN_ANY.search(out):
        errs.append("symbols")
    if _FORBIDDEN_AR.search(out):
        errs.append("scaffold-words")
    if re.search(r"(^|\n)\s*زاوية\s+[^\s:：]{2,25}\s*[:：]", out):
        errs.append("zawiya-header")
    if _ZAWIYA_LINESTART.search(out):
        errs.append("zawiya-linestart")
    if _DASH_LIST.search(out):
        errs.append("dash-list")
    dr = _dup_ratio(out)
    if dr > 0.15:
        errs.append(f"dup-content:{dr:.2f}")
    bad_nums = numbers_of(out) - numbers_of(src, name)
    if bad_nums:
        errs.append(f"numbers:{sorted(bad_nums)[:4]}")
    if short_mode:
        if not (60 <= len(out) <= 420):
            errs.append(f"len:{len(out)}")
        name_words = [w for w in re.findall(r"[\u0621-\u064A]{4,}", name or "")][:4]
        if name_words and not any(w in out for w in name_words):
            errs.append("name-detached")
    else:
        ratio = len(out) / max(1, len(src))
        if not (0.45 <= ratio <= 1.7):
            errs.append(f"ratio:{ratio:.2f}")
        sw = content_words(src)
        if sw:
            joined = " ".join(content_words(out))
            cov = sum(1 for w in sw if w in joined or (len(w) > 5 and w[:4] in joined)) / len(sw)
            if cov < 0.45:
                errs.append(f"coverage:{cov:.2f}")
    return errs


def validate_en(ar_text, out):
    errs = []
    if re.search(r"(?i)marketing\s+angles?|selling\s+angles?|content\s+ideas|keywords?\s*:", out):
        errs.append("scaffold-words")
    # "Screen angle:" / "Sound Corner:" style planning headers (>=2 lines = scaffolding block)
    n_angle = len(re.findall(r"(?im)^[a-z ]{0,20}(?:angles?|corners?)\s*:", out))
    if n_angle >= 2:
        errs.append(f"angle-scaffold:{n_angle}")
    if _FORBIDDEN_ANY.search(out):
        errs.append("symbols")
    if _DASH_LIST.search(out):
        errs.append("dash-list")
    bad_nums = numbers_of(out) - numbers_of(ar_text)
    if bad_nums:
        errs.append(f"numbers:{sorted(bad_nums)[:4]}")
    ratio = len(out) / max(1, len(ar_text))
    if not (0.5 <= ratio <= 2.2):
        errs.append(f"ratio:{ratio:.2f}")
    if len(out) < 30:
        errs.append("too-short")
    return errs

# ---------------- deterministic fallback ----------------

_ZAWIYA_PREFIX = re.compile(r"^\s*زاوية\s+[^\s:：]{2,25}\s*[:：]\s*")
_ZAWIYA_HDRONLY = re.compile(r"^\s*زاوية\s+[^\s:：]{2,25}\s*[:：]?\s*$")
_AFKAR_LINE = re.compile(r"^\s*[اأ]فكار\s+(?:المحتوى|المنتج)\b.*$")


def scaffold_strip(d):
    """Deterministic last-resort: remove the internal planning scaffolding.

    Rule: if the description keeps >= 3 real content lines outside the «زاوية» block,
    drop the زاوية lines entirely (their content is duplicated by the professional
    sections that follow). Otherwise strip the labels and keep the content."""
    lines = [l.strip() for l in d.splitlines() if l.strip()]
    zawiya = [t for t in lines if re.match(r"^زاوية[\s:：]", t)]
    others = [t for t in lines if not re.match(r"^زاوية[\s:：]", t)]

    def strip_label(t):
        if _ZAWIYA_HDRONLY.match(t):
            return ""
        t = _ZAWIYA_PREFIX.sub("", t)  # "زاوية X: content" → content
        if re.match(r"^زاوية\s", t):
            words = t.split()  # words[0] = زاوية, then label words + content
            if len(words) - 2 >= 5:
                t = " ".join(words[3:])      # 2-word label (e.g. "زاوية لا تحتاج SIM")
            elif len(words) - 1 >= 3:
                t = " ".join(words[2:])      # 1-word label (e.g. "زاوية الجودة")
            else:
                t = " ".join(words[1:])      # barely anything: drop just زاوية
        return t.strip()

    if len(others) >= 3:
        out = []
        for t in others:
            if _ZAWIYA_HDRONLY.match(t) or _AFKAR_LINE.match(t):
                continue
            t = _ZAWIYA_PREFIX.sub("", t)
            if t:
                out.append(t)
        return clean_desc("\n".join(out))
    # too little outside the block: keep زاوية content, labels stripped
    out = []
    for t in lines:
        if _AFKAR_LINE.match(t) or _ZAWIYA_HDRONLY.match(t):
            continue
        t = strip_label(t)
        if t:
            out.append(t)
    return clean_desc("\n".join(out))

# ---------------- EN deterministic scaffold strip ----------------

_EN_PLANNING_HDR = re.compile(r"(?i)^(?:(?:sales|top|best)\s+)?(?:marketing\s+angles?|selling\s+angles?|content\s+ideas|keywords?|key\s*words|seo\s*keywords?)(?:\s*\([^)]{1,8}\))?\s*[:：]?\s*$")
_EN_ANGLE_PREFIX = re.compile(r"(?i)^[a-z][a-z ]{2,24}?\s+(?:angles?|corners?)\s*[:：]\s*")
_EN_ANGLE_HDRONLY = re.compile(r"(?i)^[a-z][a-z ]{2,24}?\s+(?:angles?|corners?)\s*[:：]?\s*$")
# colon-less planning line: "Deep Moisture Angle Deeply moisturizes the skin..."
_EN_ANGLE_NOCOLON = re.compile(r"(?i)^[a-z][a-z ]{2,30}?\s+angles?\s+(?=[A-Z][a-z])")


_EN_SECTION_HDR = re.compile(r"(?i)^(features?|specifications?|package\s+contents?|what'?s\s+in\s+the\s+box|how\s+to\s+use|usage|warranty|description|details?|quick\s+details?)\s*[:：]?\s*$")
_EN_LABELED = re.compile(r"^[A-Z][A-Za-z0-9 ,&()'/-]{2,40}[:：]\s*\S")


def en_scaffold_strip(d):
    """Deterministic EN mirror of scaffold_strip.

    - «Marketing/Selling Angles» header: drop the header AND its labeled block
      (content is duplicated in the Features section) — same rule as the AR زوايا block.
    - «Content Ideas» header: drop the header only, keep its content lines — same as AR أفكار.
    - «X Angle/Corner:» lines: dropped when enough other content remains.
    - «Keywords:» lines: dropped."""
    lines = [l.strip() for l in d.splitlines() if l.strip()]
    out = []
    i = 0
    while i < len(lines):
        t = lines[i]
        if _EN_PLANNING_HDR.match(t) and re.match(r"(?i)^(?:(?:sales|top|best)\s+)?(?:marketing|selling)\s+angles?", t):
            # drop the header + the labeled block that follows, until a standard section or unlabeled line
            i += 1
            dropped = 0
            while i < len(lines) and not _EN_SECTION_HDR.match(lines[i]) and (
                    _EN_LABELED.match(lines[i]) or _EN_ANGLE_NOCOLON.match(lines[i]) or
                    _EN_ANGLE_PREFIX.match(lines[i]) or _EN_ANGLE_HDRONLY.match(lines[i])):
                i += 1
                dropped += 1
            # if we dropped everything (no Features section survived), keep the labeled content instead
            rest = lines[i:]
            if len([x for x in rest if not _EN_SECTION_HDR.match(x)]) < 3 and dropped:
                # salvage: re-add the labeled lines we just skipped
                j = i - dropped
                while j < i:
                    out.append(lines[j])
                    j += 1
            continue
        if re.match(r"(?i)^content\s+ideas?\s*[:：]?\s*$", t):
            i += 1
            continue
        if re.match(r"(?i)^keywords?\s*[:：]", t):
            i += 1
            continue
        out.append(t)
        i += 1
    # drop "X Angle:" / colon-less "X Angle <Sentence>" lines when >= 3 real lines remain
    def is_angle_line(t):
        return bool(_EN_ANGLE_PREFIX.match(t) or _EN_ANGLE_HDRONLY.match(t) or _EN_ANGLE_NOCOLON.match(t))
    others = [t for t in out if not is_angle_line(t)]
    if len(others) >= 3:
        out = others
    else:
        stripped = []
        for t in out:
            if _EN_ANGLE_HDRONLY.match(t):
                continue
            t = _EN_ANGLE_PREFIX.sub("", t)
            if _EN_ANGLE_NOCOLON.match(t):
                t = _EN_ANGLE_NOCOLON.sub("", t)
            if t:
                stripped.append(t)
        out = stripped
    return clean_desc("\n".join(out))


def en_has_defects(en):
    if re.search(r"(?i)(?:(?:sales|top|best)\s+)?(?:marketing|selling)\s+angles?|content\s+ideas|keywords?\s*:", en):
        return True
    if len(re.findall(r"(?im)^[a-z ]{0,20}(?:angles?|corners?)\s*:", en)) >= 2:
        return True
    if len(re.findall(r"(?im)^[a-z ]{2,30}\s+angles?\s+[A-Z]", en)) >= 2:
        return True
    if re.search(r"[\u0621-\u064A]{4,}\s*[:]", en) and re.search(r"زاوية|زوايا|أفكار", en):
        return True
    return False


# ---------------- prompts ----------------

AR_SYSTEM_RULES = """إرشادات التنظيف الصارمة:
1. البنود التي تبدأ بـ«زاوية ...» في هذا الوصف هي مسودة تخطيط تسويقي داخلي كتبها صاحب المتجر لنفسه، وليست محتوى للنشر: يجب أن تختفي تماماً من النسخة النهائية بهيئتها هذه، ولا يجوز أن يبدأ أي سطر بكلمة «زاوية».
2. مضمونها لا يضيع: أي معلومة أو ميزة وردت في بنود «زاوية» ولم ترد في بقية الوصف يجب إدراجها بشكل طبيعي ضمن القسم المناسب (المميزات: أو المواصفات: أو غيرهما). أما المعلومات المكررة فتذكر مرة واحدة فقط.
3. لا تكرار إطلاقاً: كل ميزة أو معلومة تظهر مرة واحدة فقط في الوصف النهائي، والنتيجة النهائية يجب أن تكون خالية من أي ازدواج للمحتوى.
4. حافظ على كل ميزة ومعلومة موجودة في الوصف خارج بنود «زاوية» — لا تحذف أي محتوى حقيقي منها.
5. لا تضف أي معلومة أو رقم أو مواصفة أو ادعاء غير موجود في الأصل.
6. أبقِ الأرقام والقياسات والماركات وأسماء الطرازات حرفياً كما هي.
7. أبقِ العناوين المهنية القياسية إن وُجدت مثل: المميزات: المواصفات: تفاصيل سريعة: محتويات العبوة: طريقة الاستخدام: الضمان:
8. «زاوية/زوايا» بمعنى زاوية الرؤية أو الدوران أو التصوير (مثل «زوايا رؤية واسعة») مواصفة فيزيائية حقيقية — أبقها لكن صغها داخل الجملة وليس في بداية السطر.
9. اكتب بأسلوب عربي فصيح مهني وسلس مناسب لمتجر إلكتروني محترم.
10. نص عادي فقط: ممنوع استخدام أي رمز من هذه: * _ # • - > ` وممنوع الإيموجي.
11. حافظ على بنية سطر لكل ميزة."""

EN_TRANSLATE_RULES = """Translate this product description from Arabic to English for a Saudi e-commerce store.
Rules:
- Faithful COMPLETE translation, preserving the line structure (one line per feature).
- Keep numerals, units and brand names unchanged. Do NOT add, invent or omit any content.
- PLAIN TEXT ONLY: never use markdown symbols such as * - _ # or bullet characters."""


def build_ar_batch(items):
    """items: list of (pid, name, desc, short_mode)"""
    parts = [f"""لديك {len(items)} أوصاف منتجات تحتاج تنظيفاً احترافياً للنشر في المتجر.

{AR_SYSTEM_RULES}"""]
    for i, (pid, name, desc, short_mode) in enumerate(items, 1):
        if short_mode:
            parts.append(f"""
[منتج {i}]
المعرف: {pid}
اسم المنتج: {name}
الوصف الحالي قصير جداً وغير كافٍ. اكتب وصفاً تسويقياً مهنياً من سطرين إلى ثلاثة أسطر مستنداً حصراً إلى اسم المنتج ونوعه المفهوم منه، دون اختلاق أي مواصفة أو رقم أو مادة أو ميزة تقنية محددة غير مذكورة. استخدم صياغة عامة مقبولة تجارياً.
DESC_START
{desc}
DESC_END""")
        else:
            parts.append(f"""
[منتج {i}]
المعرف: {pid}
اسم المنتج: {name}
DESC_START
{desc}
DESC_END""")
    parts.append("""
أجب بنفس الترتيب وبالتنسيق نفسه تماماً لكل منتج، دون أي كلام إضافي:
[منتج 1]
DESC_START
(الوصف المنظف)
DESC_END
[منتج 2]
DESC_START
(الوصف المنظف)
DESC_END
وهكذا.""")
    return "\n".join(parts)


def build_en_batch(items):
    """items: list of (pid, ar_desc)"""
    parts = [EN_TRANSLATE_RULES, ""]
    for i, (pid, ar) in enumerate(items, 1):
        parts.append(f"[منتج {i}]\nID: {pid}\nD_START\n{ar}\nD_END\n")
    parts.append("""Answer EXACTLY in this format for every product, same order, nothing else:
[منتج 1]
ID: <id>
D_START
<English description>
D_END
[منتج 2]
ID: <id>
D_START
<English description>
D_END""")
    return "\n".join(parts)


def parse_blocks(text, kind="ar"):
    """Parse model answer into {index: cleaned_text}."""
    out = {}
    for m in re.finditer(r"\[منتج\s*(\d+)\]([^\[]*)", text):
        idx = int(m.group(1))
        body = m.group(2)
        if kind == "ar":
            mm = re.search(r"DESC_START\s*\n([\s\S]*?)\n?\s*DESC_END", body)
        else:
            mm = re.search(r"D_START\s*\n([\s\S]*?)\n?\s*D_END", body)
        if mm:
            out[idx] = mm.group(1).strip()
    return out

# ---------------- main pipeline ----------------

def sha1(t):
    return hashlib.sha1((t or "").encode("utf-8")).hexdigest()


def save_json(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)  # atomic — never leaves a half-written file


def load_json(path, default):
    if os.path.exists(path):
        try:
            return json.load(open(path, encoding="utf-8"))
        except Exception:
            pass
    return default


def make_batches(items, n, chars):
    """items: list of dicts; returns list of batches (lists)."""
    batches, cur, cur_chars = [], [], 0
    for it in items:
        sz = len(it.get("desc", "")) + len(it.get("name", ""))
        if cur and (len(cur) >= n or cur_chars + sz > chars):
            batches.append(cur)
            cur, cur_chars = [], 0
        cur.append(it)
        cur_chars += sz
    if cur:
        batches.append(cur)
    return batches


def _feedback_hint(errs):
    hint = ""
    if any(str(e).startswith("dup") for e in errs):
        hint = "\nتنبيه: محاولتك السابقة تضمنت تكراراً للمحتوى (الميزة نفسها مذكورة مرتين). احذف بنود «زاوية» كاملة وأبقِ كل ميزة مرة واحدة فقط."
    if any(str(e).startswith("zawiya") for e in errs):
        hint += "\nتنبيه: محاولتك السابقة تركت سطوراً تبدأ بكلمة «زاوية» — احذفها جميعاً وصغ أي زاوية فيزيائية داخل الجملة."
    if any(str(e).startswith("numbers") for e in errs):
        hint += "\nتنبيه: محاولتك السابقة أضافت أرقاماً غير موجودة في الأصل — أبقِ الأرقام الأصلية فقط."
    return hint


def process_ar_batch(batch, bi):
    """Worker: clean one AR batch. Returns (list of (pid, state_entry, log_entry), rate_limited)."""
    results = []
    payload = [(it["pid"], it["name"], it["desc"], it["short"]) for it in batch]
    parsed = {}
    try:
        for attempt in range(3):
            try:
                raw = call_ai(build_ar_batch(payload))
                parsed = parse_blocks(raw, "ar")
                if not parsed or len(parsed) < len(batch):
                    raise ValueError(f"parse {len(parsed)}/{len(batch)}")
                break
            except RateLimitError:
                return [], True
            except Exception as e:
                parsed = {}
                if attempt == 2:
                    print(f"  [AR] batch {bi} batchcall failed: {str(e)[:90]}", flush=True)
                else:
                    time.sleep(4)
    except Exception:
        return [], False
    for i, it in enumerate(batch, 1):
        pid = it["pid"]
        cand = clean_desc(parsed.get(i, ""))
        errs = validate_ar(it["desc"], it["name"], cand, short_mode=it["short"]) if cand else ["empty"]
        if cand and not errs:
            results.append((pid, {"src_hash": sha1(it["desc"]), "description": cand,
                                  "mode": "ai-short" if it["short"] else "ai", "reasons": it.get("reasons", [])},
                           {"mode": "ai-short" if it["short"] else "ai", "before": it["desc"], "after": cand,
                            "reasons": it.get("reasons", [])}))
            continue
        # single retry with explicit feedback
        fixed = False
        if errs and errs != ["empty"]:
            hint = _feedback_hint(errs)
            for attempt in range(2):
                try:
                    raw = call_ai(build_ar_batch([(pid, it["name"], it["desc"], it["short"])]) + hint)
                    p1 = parse_blocks(raw, "ar")
                    cand = clean_desc(p1.get(1, ""))
                    if cand and not validate_ar(it["desc"], it["name"], cand, short_mode=it["short"]):
                        results.append((pid, {"src_hash": sha1(it["desc"]), "description": cand,
                                              "mode": "ai-retry", "reasons": it.get("reasons", [])},
                                       {"mode": "ai-retry", "before": it["desc"], "after": cand,
                                        "reasons": it.get("reasons", []), "first_errors": errs}))
                        fixed = True
                        break
                except RateLimitError:
                    break
                except Exception:
                    time.sleep(4)
        if not fixed and not errs:
            pass
        elif not fixed:
            if errs == ["empty"]:
                continue  # batch call failed entirely (rate limit) — leave for next run, NO fallback
            fb_text = scaffold_strip(it["desc"]) if not it["short"] else it["desc"]
            results.append((pid, {"src_hash": sha1(it["desc"]), "description": fb_text,
                                  "mode": "fallback", "reasons": it.get("reasons", []),
                                  "errors": errs[:6]},
                           {"mode": "fallback", "before": it["desc"], "after": fb_text,
                            "reasons": it.get("reasons", []), "errors": errs[:6]}))
    return results, False


def run_ar(targets, reasons_map, state, log, workers=3, todo_ids=None):
    todo = list(todo_ids) if todo_ids is not None else [pid for pid in targets if pid not in state]
    print(f"[AR] todo: {len(todo)} / {len(targets)}", flush=True)
    if not todo:
        return False
    items = [{"pid": pid, "name": clean_name(pnames[pid]), "desc": targets[pid],
              "short": "very_short" in (reasons_map.get(pid) or []),
              "reasons": reasons_map.get(pid, [])} for pid in todo]
    batches = make_batches(items, BATCH_N, BATCH_CHARS)
    print(f"[AR] batches: {len(batches)} | workers: {workers}", flush=True)
    ok = fb = 0
    stopped = False
    from concurrent.futures import ThreadPoolExecutor, as_completed
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(process_ar_batch, batch, bi): bi for bi, batch in enumerate(batches, 1)}
        done_n = rl_streak = 0
        for fut in as_completed(futures):
            done_n += 1
            try:
                res = fut.result()
                if len(res) == 2 and res[1] is True:
                    rl_streak += 1
                    if rl_streak >= workers * 2:
                        print("  [AR] RATE-LIMITED STOP — rerun the script to resume", flush=True)
                        pool.shutdown(wait=False, cancel_futures=True)
                        stopped = True
                        break
                    continue
                rl_streak = 0
                for pid, st, lg in res[0]:
                    state[pid] = st
                    log[pid] = lg
                    if st["mode"] == "fallback":
                        fb += 1
                    else:
                        ok += 1
            except Exception as e:
                print(f"  [AR] batch crashed: {str(e)[:120]}", flush=True)
            if done_n % 5 == 0 or done_n == len(batches):
                save_json(OUT_AR, state)
                save_json(OUT_LOG, log)
                print(f"  [AR] {done_n}/{len(batches)} batches (ai={ok}, fallback={fb})", flush=True)
    save_json(OUT_AR, state)
    save_json(OUT_LOG, log)
    print(f"[AR] DONE: ai={ok} fallback={fb} stopped={stopped}", flush=True)
    return stopped


_ID_BLOCK = re.compile(r"ID:\s*([^\n]+)\s*\n\s*D_START\s*\n([\s\S]*?)\n?\s*D_END")


def process_en_batch(batch, bi, tmap):
    """Worker: translate one EN batch. Returns (list of (pid, new_en_or_None, log_entry), rate_limited)."""
    results = []
    payload = [(it["pid"], tmap[it["pid"]]["ar"]) for it in batch]
    by_pid = {}
    try:
        for attempt in range(3):
            try:
                raw = call_ai(build_en_batch(payload))
                by_pid = {m.group(1).strip(): m.group(2).strip() for m in _ID_BLOCK.finditer(raw)}
                parsed = parse_blocks(raw, "en")
                if len(by_pid) < len(batch) and len(parsed) >= len(batch):
                    by_pid = {it["pid"]: parsed[i] for i, it in enumerate(batch, 1) if i in parsed}
                if len(by_pid) < len(batch):
                    raise ValueError(f"parse {len(by_pid)}/{len(batch)}")
                break
            except RateLimitError:
                return [], True
            except Exception as e:
                by_pid = {}
                if attempt == 2:
                    print(f"  [EN] batch {bi} batchcall failed: {str(e)[:90]}", flush=True)
                else:
                    time.sleep(4)
    except Exception:
        return [], False
    for it in batch:
        pid = it["pid"]
        t = tmap[pid]
        cand = clean_desc(by_pid.get(pid, ""))
        errs = validate_en(t["ar"], cand) if cand else ["empty"]
        if errs and errs != ["empty"]:
            for attempt in range(2):
                try:
                    raw = call_ai(build_en_batch([(pid, t["ar"])]))
                    one = {m.group(1).strip(): m.group(2).strip() for m in _ID_BLOCK.finditer(raw)}
                    cand = clean_desc(one.get(pid, parse_blocks(raw, "en").get(1, "")))
                    if cand and not validate_en(t["ar"], cand):
                        errs = []
                        break
                except RateLimitError:
                    break
                except Exception:
                    time.sleep(4)
        if errs == ["empty"]:
            continue  # batch call failed (rate limit) — leave for next run
        if cand and not errs:
            results.append((pid, cand, {"mode": "en-retranslate", "before": t["cur_en"], "after": cand}))
        else:
            results.append((pid, None, {"mode": "en-kept", "before": t["cur_en"], "after": t["cur_en"], "errors": errs[:6]}))
    return results, False


def run_en(en_ids, state, log, workers=3):
    translations = load_json(f"{ANALYSIS}/translations.json", {})
    old_site = {p["id"]: p for p in json.load(open(f"{ANALYSIS}/products.json", encoding="utf-8"))}
    # PHASE 1 — deterministic EN scaffold removal (no neurons spent)
    det_fixed = 0
    todo = []
    for pid in en_ids:
        if state.get(pid, {}).get("en_done"):
            continue
        ar = (state.get(pid, {}).get("description")) or ar_clean.get(pid, "")
        cur_en = clean_desc(translations.get(pid, {}).get("descriptionEn")
                            or (old_site.get(pid, {}) or {}).get("descriptionEn") or "")
        ar_mode = state.get(pid, {}).get("mode")
        ar_ai_merged = ar_mode in ("ai", "ai-retry", "ai-short")
        if cur_en and en_has_defects(cur_en) and not ar_ai_merged:
            # deterministic fix only for products whose AR was NOT AI-merged
            # (AI-merged AR contains unique info folded in — EN needs a real re-translation)
            fixed_en = en_scaffold_strip(cur_en)
            if fixed_en and not en_has_defects(fixed_en):
                if pid in translations:
                    translations[pid]["descriptionEn"] = fixed_en
                else:
                    translations[pid] = {"nameEn": old_site.get(pid, {}).get("nameEn") or "", "descriptionEn": fixed_en}
                st = state.get(pid) or {}
                st["en"] = fixed_en
                st["en_done"] = True
                st["en_mode"] = "det"
                state[pid] = st
                log[f"{pid}__en"] = {"mode": "en-det", "before": cur_en, "after": fixed_en}
                det_fixed += 1
                continue
        # needs AI (or nothing to translate)
        if not ar or len(ar) < 25:
            st = state.get(pid) or {}
            st["en_done"] = True   # nothing meaningful to translate
            state[pid] = st
            continue
        todo.append({"pid": pid, "ar": ar, "cur_en": cur_en,
                     "prio": 0 if (state.get(pid, {}).get("mode") in ("ai", "ai-retry", "ai-short")) else 1})
    save_json(f"{ANALYSIS}/translations.json", translations)
    save_json(OUT_AR, state)
    save_json(OUT_LOG, log)
    print(f"[EN] deterministic pass fixed {det_fixed}; AI todo: {len(todo)}", flush=True)
    if not todo:
        return False
    # priority: AR-AI-cleaned products first (consistency), then the rest
    todo.sort(key=lambda t: t["prio"])
    tmap = {t["pid"]: t for t in todo}
    batches = make_batches([{"pid": t["pid"], "desc": t["ar"], "name": ""} for t in todo], BATCH_N, BATCH_CHARS)
    print(f"[EN] batches: {len(batches)} | workers: {workers}", flush=True)
    ok = kept = 0
    stopped = False
    from concurrent.futures import ThreadPoolExecutor, as_completed
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(process_en_batch, batch, bi, tmap): bi for bi, batch in enumerate(batches, 1)}
        done_n = rl_streak = 0
        for fut in as_completed(futures):
            done_n += 1
            try:
                res = fut.result()
                if len(res) == 2 and res[1] is True:
                    rl_streak += 1
                    if rl_streak >= workers * 2:
                        print("  [EN] RATE-LIMITED STOP — rerun the script to resume", flush=True)
                        pool.shutdown(wait=False, cancel_futures=True)
                        stopped = True
                        break
                    continue
                rl_streak = 0
                for pid, new_en, lg in res[0]:
                    log[f"{pid}__en"] = lg
                    if new_en is None:
                        kept += 1
                        continue
                    if pid in translations:
                        translations[pid]["descriptionEn"] = new_en
                    else:
                        translations[pid] = {"nameEn": tmap[pid]["cur_en"] or "", "descriptionEn": new_en}
                    st = state.get(pid) or {}
                    st["en"] = new_en
                    st["en_done"] = True
                    state[pid] = st
                    ok += 1
            except Exception as e:
                print(f"  [EN] batch crashed: {str(e)[:120]}", flush=True)
            if done_n % 5 == 0 or done_n == len(batches):
                save_json(f"{ANALYSIS}/translations.json", translations)
                save_json(OUT_AR, state)
                save_json(OUT_LOG, log)
                print(f"  [EN] {done_n}/{len(batches)} batches (ok={ok}, kept={kept})", flush=True)
    save_json(f"{ANALYSIS}/translations.json", translations)
    save_json(OUT_AR, state)
    save_json(OUT_LOG, log)
    print(f"[EN] DONE: translated={ok} kept={kept} stopped={stopped}", flush=True)
    return stopped


if __name__ == "__main__":
    only = sys.argv[1] if len(sys.argv) > 1 else "all"
    max_batches = int(sys.argv[2]) if len(sys.argv) > 2 else 0  # 0 = unlimited (test mode uses 1)

    if only == "reset-empty":
        # drop fallback entries whose batch call never happened (rate limit) so AI can retry them
        st = load_json(OUT_AR, {})
        lg = load_json(OUT_LOG, {})
        drop = [pid for pid, e in st.items()
                if e.get("mode") == "fallback" and (not e.get("errors") or "empty" in (e.get("errors") or []))]
        for pid in drop:
            st.pop(pid, None)
            lg.pop(pid, None)
        save_json(OUT_AR, st)
        save_json(OUT_LOG, lg)
        print(f"RESET: dropped {len(drop)} rate-limit fallbacks; remaining entries {len(st)}")
        sys.exit(0)

    if only == "apply-det":
        # Apply the deterministic professional fallback to every AR target not yet processed,
        # and best-effort deterministic EN for products still waiting for AI.
        # Entries are flagged *_upgrade_pending so a later "polish" run re-runs AI on them
        # once the daily neuron quota resets.
        t = json.load(open(f"{ANALYSIS}/clean-targets.json", encoding="utf-8"))
        translations = load_json(f"{ANALYSIS}/translations.json", {})
        old_site = {p["id"]: p for p in json.load(open(f"{ANALYSIS}/products.json", encoding="utf-8"))}
        st = load_json(OUT_AR, {})
        lg = load_json(OUT_LOG, {})
        n_ar = n_en = 0
        for pid, d in t["ar_targets"].items():
            if pid in st and st[pid].get("description"):
                continue
            short = "very_short" in (t["ar_reasons"].get(pid) or [])
            fb = d if short else scaffold_strip(d)
            st[pid] = {"src_hash": sha1(d), "description": fb, "mode": "det",
                       "reasons": t["ar_reasons"].get(pid, []), "ar_upgrade_pending": not short}
            lg[pid] = {"mode": "det", "before": d, "after": fb, "reasons": t["ar_reasons"].get(pid, [])}
            n_ar += 1
        # EN best-effort for products with en defects not yet en_done
        for pid in t["en_retranslate"]:
            e = st.get(pid) or {}
            if e.get("en_done"):
                continue
            cur = clean_desc(translations.get(pid, {}).get("descriptionEn")
                             or (old_site.get(pid, {}) or {}).get("descriptionEn") or "")
            if not cur:
                e["en_done"] = True
                st[pid] = e
                continue
            fixed = en_scaffold_strip(cur)
            if pid in translations:
                translations[pid]["descriptionEn"] = fixed
            else:
                translations[pid] = {"nameEn": old_site.get(pid, {}).get("nameEn") or "", "descriptionEn": fixed}
            e["en"] = fixed
            e["en_done"] = True
            e["en_upgrade_pending"] = True
            st[pid] = e
            lg[f"{pid}__en"] = {"mode": "en-det-forced", "before": cur, "after": fixed}
            n_en += 1
        save_json(OUT_AR, st)
        save_json(OUT_LOG, lg)
        save_json(f"{ANALYSIS}/translations.json", translations)
        print(f"APPLY-DET: {n_ar} AR + {n_en} EN got deterministic cleaning with upgrade-pending flags")
        sys.exit(0)

    if only == "polish":
        # Upgrade pass: re-run AI for entries flagged ar_upgrade_pending / en_upgrade_pending.
        # Runs entirely on the site account (primary) with failover; stops gracefully on quota.
        t = json.load(open(f"{ANALYSIS}/clean-targets.json", encoding="utf-8"))
        dukan = json.load(open(f"{ANALYSIS}/dukan-catalog.json", encoding="utf-8"))
        pnames = {p["id"]: clean_name(p.get("name") or "") for p in dukan}
        ar_clean = {p["id"]: clean_desc(p.get("description") or "") for p in dukan}
        state = load_json(OUT_AR, {})
        log = load_json(OUT_LOG, {})

        # rebuild AR targets limited to upgrade-pending entries
        targets = {pid: ar_clean[pid] for pid, e in state.items()
                   if e.get("ar_upgrade_pending") and pid in ar_clean}
        reasons_map = {pid: t["ar_reasons"].get(pid, ["upgrade"]) for pid in targets}
        # very_short flag: keep short-mode validation for products whose source is tiny
        for pid in targets:
            if len(targets[pid]) < 40:
                reasons_map[pid] = list(set(reasons_map.get(pid, []) + ["very_short"]))
        print(f"[POLISH-AR] pending: {len(targets)}", flush=True)
        stopped = False
        if targets:
            stopped = run_ar(targets, reasons_map, state, log, workers=3, todo_ids=list(targets))
            # re-apply upgrade flag for anything that landed as det/fallback again
            for pid in targets:
                e = state.get(pid)
                if e and e.get("mode") in ("det", "fallback") and len(ar_clean.get(pid, "")) >= 40:
                    e["ar_upgrade_pending"] = True
                elif e and e.get("mode") in ("ai", "ai-retry", "ai-short"):
                    e.pop("ar_upgrade_pending", None)
        save_json(OUT_AR, state)
        save_json(OUT_LOG, log)
        pending_ar = sum(1 for e in state.values() if e.get("ar_upgrade_pending"))

        if not stopped:
            # EN upgrade pass
            en_pending = {pid for pid, e in state.items() if e.get("en_upgrade_pending")}
            print(f"[POLISH-EN] pending: {len(en_pending)}", flush=True)
            if en_pending:
                for pid in en_pending:
                    st = state.get(pid) or {}
                    st.pop("en_done", None)
                    st.pop("en_upgrade_pending", None)
                    state[pid] = st
                save_json(OUT_AR, state)
                stopped = run_en(en_pending, state, log, workers=3)
                for pid in en_pending:
                    st = state.get(pid) or {}
                    if not st.get("en_done"):
                        st["en_upgrade_pending"] = True
                        state[pid] = st
                save_json(OUT_AR, state)
                save_json(OUT_LOG, log)
        pending_en = sum(1 for e in state.values() if e.get("en_upgrade_pending"))
        print(f"POLISH RESULT: pending_ar={pending_ar} pending_en={pending_en} stopped={stopped}", flush=True)
        print("POLISH COMPLETE" if (pending_ar == 0 and pending_en == 0) else "POLISH INCOMPLETE", flush=True)
        sys.exit(0)

    t = json.load(open(f"{ANALYSIS}/clean-targets.json", encoding="utf-8"))
    targets, reasons_map, en_ids = t["ar_targets"], t["ar_reasons"], set(t["en_retranslate"])
    dukan = json.load(open(f"{ANALYSIS}/dukan-catalog.json", encoding="utf-8"))
    pnames = {p["id"]: clean_name(p.get("name") or "") for p in dukan}
    ar_clean = {p["id"]: clean_desc(p.get("description") or "") for p in dukan}

    state = load_json(OUT_AR, {})
    log = load_json(OUT_LOG, {})

    # limit batches for test runs
    if max_batches:
        _mb = max_batches
        _orig = make_batches
        make_batches = lambda items, n, chars: _orig(items, n, chars)[:_mb]
        # shrink target lists to what the limited batches cover
        ar_items = [{"pid": pid, "name": pnames[pid], "desc": targets[pid]} for pid in targets if pid not in state]
        _batches = make_batches([dict(it, short=False) for it in ar_items], BATCH_N, BATCH_CHARS)
        _covered = {it["pid"] for b in _batches for it in b}
        targets = {pid: d for pid, d in targets.items() if pid in _covered or pid in state}
        if only in ("en", "all"):
            _eb = make_batches([{"pid": pid, "desc": "", "name": ""} for pid in sorted(en_ids)], BATCH_N, BATCH_CHARS)
            _ec = {it["pid"] for b in _eb for it in b}
            en_ids = {pid for pid in en_ids if pid in _ec}
        make_batches = _orig
        # restore short flag in targets for run_ar
        print(f"[TEST MODE] limited to {_mb} batch(es) per phase")

    started = datetime.now().strftime("%H:%M:%S")
    print(f"professional-clean started {started} | mode={only}", flush=True)
    stopped = False
    if only in ("ar", "all"):
        stopped = run_ar(targets, reasons_map, state, log)
    if only in ("en", "all") and not stopped:
        stopped = run_en(en_ids, state, log)
    print("ALL DONE" + (" (RATE-LIMITED — rerun to resume)" if stopped else ""), flush=True)
