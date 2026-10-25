# AGENTS.md — قواعد العمل الجماعي لمشروع صيدة

> ملف المعرفة المشتركة الأساسي. **يجب على كل وكيل (AI) أو مطور قراءته كاملاً قبل أي تعديل.**
> الهدف: الحفاظ على المكتسبات، التنسيق، والتدقيق عبر ملفات معرفة موحدة.

## 🗂️ خريطة ملفات المعرفة

| الملف | الغرض |
|-------|-------|
| `AGENTS.md` (هذا الملف) | القواعد الحاكمة والاتفاقيات |
| `docs/DESIGN-SYSTEM.md` | نظام التصميم: الألوان، الخطوط، المكونات |
| `docs/APP-GUIDE.md` | تطبيق الأندرويد: البناء، التوقيع، النشر |
| `README.md` | نظرة عامة + خطوط الأنابيب (Pipelines) |
| `worklog.md` (بيئة العمل) | سجل تسلسلي لكل المهام المنجزة |

## 🔒 قواعد لا تُكسر (المكتسبات المحفوظة)

1. **الهوية البصرية ثابتة**: أخضر `#087a4b` / غامق `#06452f` / ذهبي `#d4a72c` / كريمي `#fffaf0`، خط Cairo، RTL أولاً.
2. **اللوغو مقدس**: `/assets/logo.png` هو مصدر أيقونة التطبيق والفاڤيكون — لا يُعدّل ولا يُستبدل.
3. **سلة الطلب ومسار الشراء** (`/api/order` → `api.dukan.shop`) يعمل ويُختبر بايت-ببايت — أي تعديل على `site-ui.js` يجب أن يحافظ على الدوال: `saydaCartTotals`, `saydaBuildOrder`, `saydaSubmitOrder`, `saydaShowInvoice`, `saydaBindCity`.
4. **الشات بوت** يعمل عبر Worker منفصل (`chat-worker/`) بنموذج `gpt-oss-120b` مع كتالوج حقيقي — لا تغيير في بروتوكول `@@PRODUCTS:` أو آلية التحقق من الهلوسة.
5. **ثنائية اللغة AR/EN** عبر `localStorage('sayda-lang')` + حدث `languagechange` — كل نص جديد يُضاف يجب أن يدعم اللغتين (سمات `data-ar`/`data-en` للنصوص الثابتة).
6. **الوضع الداكن** (`body.dark`) مدعوم — أي مكون جديد يجب أن يُختبر فيه.
7. **التطبيق الأندرويد موقّع بمفتاح 30 سنة** — المفتاح في GitHub Secrets (`KEYSTORE_BASE64` + كلمات المرور) ولا يُولَّد من جديد أبداً. نسخة احتياطية لدى المالك: `syda-signing-kit/`.
8. **رابط التحميل الدائم**: `https://github.com/tarikchouika/Syda/releases/latest/download/syda-store.apk` — مذكور في الموقع (`/app` والفوتر) — لا يتغير.

## 🏗️ بنية المستودع

```
site/          → موقع Cloudflare Pages (2966 منتجاً) — يُنشر كما هو
app/           → تطبيق Capacitor (يغلف syda.pages.dev بوضع شامل غامر)
chat-worker/   → Worker المساعد الذكي (Workers AI)
tools/         → سكربتات المزامنة: سحب ← فرز ← ترجمة ← بناء ← كتالوج الشات
data/          → ذاكرة الترجمة (translations.json) — تُعاد استخدامها كل مزامنة
docs/          → ملفات المعرفة المشتركة
```

## 🔄 خط أنابيب مزامنة المنتجات (الترتيب إلزامي)

```
tools/scrape-dukan.py     # سحب الكتالوج من دوكان → data/dukan-catalog.json
tools/diff-catalogs.py    # فرز الجديد/المحذوف → new-ids.json
tools/assess-changes.py   # تقييم ما يحتاج إعادة ترجمة → retrans-ids.json
(CF_API_TOKEN=…) tools/translate-remaining-cf.py   # ترجمة عبر Workers AI
tools/build-site.py       # بناء الموقع + فهرس الشات (2966 صفحة)
tools/gen-chat-catalog.py # توليد كتالوج الشات بوت
نشر: wrangler pages deploy site --project-name=syda  +  (cd chat-worker && wrangler deploy)
```

## ✅ قائمة تدقيق قبل أي دمج (Definition of Done)

- [ ] `node --check` يمر على كل ملف JS معدّل
- [ ] لا أخطاء Console في الصفحات: الرئيسية، منتج، فئة، /app، قانونية
- [ ] لا تجاوز أفقي (overflow) على 1440px و390px
- [ ] AR + EN كلاهما يعرض نصوصاً سليمة (RTL/LTR)
- [ ] الوضع الداكن سليم
- [ ] سلة الشراء: إضافة ← نافذة الطلب ← التحقق من المدخلات
- [ ] الشات بوت يفتح ويرد باللغة الصحيحة
- [ ] زر تحميل التطبيق يعمل (وغير ظاهر داخل التطبيق نفسه — `body.in-app`)
- [ ] تحديث `worklog.md` بقسم جديد `Task ID / Agent / Work Log / Stage Summary`

## 🌐 سلوكيات محفوظة عن قصد (لا "تصلحها")

- الأسعار بالريال (ر.س/SAR) وتكلفة الشحن 28 ر.س — هذا سلوك المتجر المصدر الأصلي.
- طلب النموذج يرسل `countryIsoCode2:'SA'` — مطابق لسلوك دوكان الأصلي.
- `releases/latest/download/...` يحوّل دائماً لآخر إصدار — هذا مقصود (رابط دائم).
