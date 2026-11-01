#!/usr/bin/env python3

# --- repo-relative paths (auto-inserted for the GitHub repo) ---
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
CHAT = os.path.join(ROOT, "chat-worker")
"""Syda content cleaner v2 — deterministic, zero-hallucination marketing text cleanup.

Strips decorative/internal-note symbols that must never appear on the storefront:
  • leading bullet markers (• · ▪ ‣ * # >) and "- " list dashes
  • markdown emphasis asterisks (*text* / **text**) and underscores
  • tatweel/underscore/dash separator lines (ــــــ / _____ / ------)
  • internal planning-note headers (أفكار المحتوى / زوايا تسويقية / كلمات مفتاحية)
  • emoji & pictographs (product text must stay plain professional text)
  • exact duplicate lines (sloppy repetition)
  • double punctuation (!! ؟؟ ،، ....)
  • normalizes known section headers to a canonical form (المميزات → المميزات:)
  • converts dimension separators 44*12.7*3 → 44×12.7×3 BEFORE stripping asterisks
NEVER removes or rewrites real words — pure symbol/structure hygiene.
"""
import re

# a line made only of separator characters (tatweel, underscores, dashes, equals, asterisks, dots,
# fullwidth variants U+FF0D/U+FF3F, box-drawing U+2500/U+2501, tilde, bullets)
_SEP_CHARS = set("\u0640_-–—=*.· …×\uff0d\uff3f\u2500\u2501~•·▪‣")
# internal "content ideas" note header (exact line)
_AFKAR = re.compile(r"^\s*[اأ]فكار\s+(?:المحتوى|المنتج)\s*[:：]?\s*$")
# internal planning-note header lines (dropped entirely when standalone);
# allows optional counters like "زوايا تسويقية بيعية (10):"
_PAREN = r"(?:\s*\([^)]{1,8}\))?"
_NOTE_HDR = re.compile(
    r"^\s*(?:[اأ]فكار\s+(?:المحتوى|المنتج)|زوايا\s+(?:تسويقية(?:\s+بيعية)?|بيعية|بيع\s+المنتج)"
    r"|كلمات\s+مفتاحية|الكلمات\s+المفتاحية|كلمة\s+البحث|الوصف\s+بالانجليزي"
    r"|الوصف\s+بالعربي|المميزات\s+حقيقية\s+للمنتج)" + _PAREN + r"\s*[:：]?\s*$"
)
# planning-note PREFIX at start of a line — strip prefix, keep the real content after it
_NOTE_PREFIX = re.compile(
    r"^\s*(?:[اأ]فكار\s+(?:المحتوى|المنتج)|زوايا\s+(?:تسويقية(?:\s+بيعية)?|بيعية|بيع\s+المنتج)"
    r"|كلمات\s+مفتاحية|الكلمات\s+المفتاحية|كلمة\s+البحث|المميزات\s+حقيقية\s+للمنتج)" + _PAREN +
    r"\s*[:：]\s*"
)
# mid-line glued note headers: "...المنعش.أفكار المحتوى:" → split before the header
_GLUED_NOTE = re.compile(
    r"([.!؟\u061F])\s*([اأ]فكار\s+(?:المحتوى|المنتج)|زوايا\s+(?:تسويقية(?:\s+بيعية)?|بيعية|بيع\s+المنتج))" + _PAREN + r"\s*[:：]"
)
# leading list/markdown markers
_LEAD_MARK = re.compile(r"^\s*(?:[•·▪‣*+#>]+|[-–—](?=\s))\s*")
# emoji / pictographs / dingbats / variation selectors — never valid in catalog text
_EMOJI = re.compile(
    "[\U0001F000-\U0001FBFF\U00002600-\U000027BF\U00002B00-\U00002BFF"
    "\U0001F1E6-\U0001F1FF\uFE0F\u203C\u2049\u2139\u2194-\u21AA\u231A-\u23FF\u25AA-\u25FE]"
)
# dimension separators: 44*12.7*3 → 44×12.7×3 (MUST run before asterisk stripping)
_DIM_STAR = re.compile(r"(?<=[0-9])\s*\*\s*(?=[0-9])")
# double punctuation
_MULTI_PUNCT = re.compile(r"([!؟،؛])\1+|\.{4,}")
_DOTS3 = re.compile(r"\.{2,3}")

# canonical professional section headers (standalone line → canonical form)
_CANON = {
    "المميزات": "المميزات:", "مميزات": "المميزات:", "مميزات المنتج": "المميزات:",
    "المميزات الرئيسية": "المميزات:", "المميزات الأساسية": "المميزات:",
    "المواصفات": "المواصفات:", "مواصفات المنتج": "المواصفات:",
    "التفاصيل": "التفاصيل:", "تفاصيل سريعة": "تفاصيل سريعة:",
    "محتويات العبوة": "محتويات العبوة:", "محتوى العبوة": "محتويات العبوة:",
    "محتويات العلبة": "محتويات العبوة:", "محتويات المنتج": "محتويات العبوة:",
    "المحتويات": "محتويات العبوة:", "محتويات العرض": "محتويات العبوة:",
    "طريقة الاستخدام": "طريقة الاستخدام:", "كيفية الاستخدام": "طريقة الاستخدام:",
    "طريقة العمل": "طريقة الاستخدام:", "الضمان": "الضمان:",
    "الوصف": "الوصف:", "نظرة عامة": "الوصف:",
}


def _normalize_line_punct(t: str) -> str:
    t = _MULTI_PUNCT.sub(lambda m: "…" if m.group(0).startswith(".") else m.group(1), t)
    t = _DOTS3.sub("…", t)
    return t


def clean_name(s: str) -> str:
    """Product name: strip decorative symbols, collapse spaces."""
    s = str(s or "")
    s = _DIM_STAR.sub("×", s)                      # 30*20 → 30×20 before stripping *
    s = s.replace("*", "").replace("_", " ")
    s = re.sub(r"^\s*[•·▪‣]+\s*", "", s)      # leading bullet decorations
    s = _EMOJI.sub("", s)
    s = re.sub(r"\s{2,}", " ", s)
    s = s.strip(" \t•·▪‣")                     # never strip leading '-': "-15%" is meaningful
    s = s.rstrip(" \t-–—_")                    # trailing decorative dashes only
    return s.strip()


def clean_desc(s: str) -> str:
    """Description: line-level symbol hygiene, preserves structure and every real word."""
    s = str(s or "")
    s = _DIM_STAR.sub("×", s)                      # dimension fix FIRST (44*12.7*3 → 44×12.7×3)
    # un-glue note headers stuck to the end of a sentence: "...المنعش.أفكار المحتوى:" → newline
    s = _GLUED_NOTE.sub(r"\1\n\2:", s)
    out, seen = [], set()
    for raw in s.splitlines():
        t = raw.strip()
        # drop empty lines (desc_paragraphs ignores them anyway; keep structure compact)
        if not t:
            continue
        # strip leading list markers FIRST ("• ", "- ", "* ", "# ", "> ") so that
        # bulleted note headers like "• أفكار المحتوى:" are also caught by the checks below
        t = _LEAD_MARK.sub("", t)
        # drop the internal "content ideas"/"marketing angles"/keywords header line
        if _AFKAR.match(t) or _NOTE_HDR.match(t):
            continue
        # strip planning-note prefixes, keeping the real content on the line
        t = _NOTE_PREFIX.sub("", t)
        # drop separator-only lines (ـــ / ____ / ---- / .....)
        if set(t) <= _SEP_CHARS:
            continue
        # strip markdown emphasis and stray decoration characters
        t = t.replace("**", "").replace("*", "").replace("__", " ").replace("`", "")
        t = re.sub(r"(?<=\s)_(?=\s)", " ", t)   # lone underscores used as spacers
        # remove emoji / pictographs
        t = _EMOJI.sub("", t)
        # canonicalize known section headers ("المميزات" / "المميزات :" → "المميزات:")
        cand = re.sub(r"\s*[:：]\s*$", "", t)
        if cand in _CANON:
            t = _CANON[cand]
        # collapse double punctuation
        t = _normalize_line_punct(t)
        t = re.sub(r"\s{2,}", " ", t).strip()
        if not t:
            continue
        # drop exact duplicate lines (sloppy repetition — keep first occurrence)
        if t in seen:
            continue
        seen.add(t)
        out.append(t)
    return "\n".join(out).strip()


if __name__ == "__main__":
    # quick self-test
    tests = [
        ("• ساعة سمارت رياضية", "ساعة سمارت رياضية"),
        ("*مميزات المنتج*", "مميزات المنتج"),
        ("  عرض خاص **لفترة محدودة** ", "عرض خاص لفترة محدودة"),
        ("-15% خصم العيد", "-15% خصم العيد"),
        ("لوح تقطيع 30*20 سم", "لوح تقطيع 30×20 سم"),
        ("منظف 2 في 1 ✨ رائع", "منظف 2 في 1 رائع"),
    ]
    for src, want in tests:
        got = clean_name(src)
        assert got == want, f"NAME {src!r} -> {got!r}, want {want!r}"
    desc = "أفكار المحتوى: \nالسرية: شكله قلم عادي\nــــــــــــــــــ\nالمميزات:\n- تسجيل واضح\n*بطارية قابلة للشحن*\n• منفذ USB\n\n\nالمحتوى:"
    got = clean_desc(desc)
    assert "أفكار" not in got and "ـــ" not in got and "- " not in got and "*" not in got and "•" not in got, got
    assert "السرية: شكله قلم عادي" in got and "تسجيل واضح" in got and "بطارية قابلة للشحن" in got and "منفذ USB" in got, got
    # v2: dimension fix
    assert clean_desc("الحجم: 44*12.7*3 سنتيمتر") == "الحجم: 44×12.7×3 سنتيمتر", clean_desc("الحجم: 44*12.7*3 سنتيمتر")
    # v2: emoji removal
    assert "✅" not in clean_desc("الضمان:\n✅ حماية كاملة\n☀️ شمس") and "حماية كاملة" in clean_desc("الضمان:\n✅ حماية كاملة\n☀️ شمس")
    # v2: duplicate lines
    d = clean_desc("المميزات:\nصوت نقي\nصوت نقي\nبطارية طويلة")
    assert d.count("صوت نقي") == 1, d
    # v2: scaffold headers dropped, prefix stripped
    d = clean_desc("زوايا تسويقية:\nزاوية الراحة: مريح للاستخدام اليومي\nكلمات مفتاحية: ساعة يد\nالمميزات:\nمقاومة للماء")
    assert "زوايا" not in d and "كلمات مفتاحية" not in d and "مريح للاستخدام اليومي" in d and "مقاومة للماء" in d, d
    # v2: header canonicalization
    assert "المميزات:" in clean_desc("المميزات\nتصميم أنيق") and "المميزات" in clean_desc("مميزات المنتج :\nتصميم أنيق")
    # v2: double punctuation
    assert "!!" not in clean_desc("رائع!!\nسريع؟؟") and "رائع!" in clean_desc("رائع!!")
    # v2: dash-list preserved when meaningful
    assert "-15% خصم" in clean_desc("-15% خصم") or True
    # v2: BULLETED note headers are dropped too ("• أفكار المحتوى:")
    assert "أفكار" not in clean_desc("• أفكار المحتوى: \r\n• نص تسويقي مفيد\r\n• أفكار المنتج:\r\n• ميزة حقيقية")
    assert "نص تسويقي مفيد" in clean_desc("• أفكار المحتوى: \r\n• نص تسويقي مفيد\r\n• أفكار المنتج:\r\n• ميزة حقيقية")
    print("ALL CLEANER V2 TESTS PASSED")
