# متجر صيدة — Syda Store

الكود المصدري الكامل لمتجر **[syda.pages.dev](https://syda.pages.dev)** — موقع تجارة إلكترونية ثابت وسريع مبني على **Cloudflare Pages**، متزامن مع المتجر المصدر **[syda.dukan.shop](https://syda.dukan.shop)**، ومزوَّد بمساعد ذكي متعدد اللغات لا يخترع منتجات أبداً.

---

## 📁 بنية المشروع

| المسار | الوصف |
|--------|-------|
| `site/` | الموقع كاملاً: **2966 منتجاً**، 12 فئة، الصفحات القانونية، سلة المشتريات، ونظام الطلبات — يُنشر مباشرة على Cloudflare Pages |
| `chat-worker/` | المساعد الذكي: Cloudflare Worker يعمل بنموذج `@cf/openai/gpt-oss-120b` من Workers AI |
| `tools/` | سكربتات مزامنة المنتجات والبناء (سحب ← فرز ← ترجمة ← بناء ← نشر) |
| `data/` | ذاكرة الترجمة `translations.json` — تمنع إعادة ترجمة المنتجات المشتركة عند كل مزامنة |

## 🤖 المساعد الذكي

- **يرد بلغة الزائر تلقائياً** — عربية، إنجليزية، فرنسية، إسبانية وأكثر (حتى بالخط اللاتيني أو العربي)
- **صفر هلوسة**: يُستخرج المرشحون من الكتالوج الحقيقي (`chat-worker/src/catalog.js`) ويتم التحقق من كل منتج قبل إرساله — لا منتجات مخترعة ولا روابط وهمية
- **بطاقات منتجات تفاعلية** قابلة للإضافة إلى السلة مباشرة من المحادثة
- حماية: حد استخدام 20 رسالة / 5 دقائق لكل زائر، و CORS مقيّد بـ `*.syda.pages.dev`
- الهوية البصرية مطابقة للمتجر (الأخضر `#087a4b`، الذهبي `#d4a72c`، خط Cairo، دعم RTL/LTR)

## 🚀 النشر

### الموقع (Cloudflare Pages)

الموقع جاهز للنشر كما هو — لا يحتاج أي عملية بناء:

1. من لوحة Cloudflare: **Workers & Pages → Create → Pages → Connect to Git** واختر هذا المستودع
2. إعداد البناء: **Root directory = `site`** — أمر البناء: *(فارغ)* — مجلد الإخراج: `/`

> الطلبات تعمل عبر Pages Function في `site/functions/api/order.js` التي تتحقق من البيانات ثم تمررها إلى `api.dukan.shop` (الدفع عند الاستلام + روابط الدفع).

### المساعد (Cloudflare Workers)

```bash
cd chat-worker
npx wrangler deploy
```

يحتاج حساب Cloudflare مع ربط Workers AI (مفعّل في `wrangler.toml` عبر `[ai]`). بعد النشر حدّث عنوان الـ Worker داخل `site/assets/chat.js` إن اختلف.

## 🔄 مزامنة المنتجات من syda.dukan.shop

```bash
# 1) الكتالوج الحالي يصبح خط الأساس للمقارنة
cp site/assets/products.json data/products.json

# 2) سحب الكتالوج الجديد من دوكان (كل الصفحات تلقائياً)
python3 tools/scrape-dukan.py

# 3) الفرز: الجديد / المحذوف
python3 tools/diff-catalogs.py

# 4) تحديد ما تغيّر جوهرياً ويحتاج إعادة ترجمة
python3 tools/assess-changes.py

# 5) ترجمة الجديد والمتغير إلى الإنجليزية عبر Workers AI
#    (نفس نمط tools/translate-remaining-cf.py — حدّد قائمة المعرّفات ثم شغّله)
export CF_API_TOKEN="رمز-Cloudflare-مع-صلاحية-Workers-AI"
export CF_ACCOUNT_ID="معرف-الحساب"   # اختياري
python3 tools/translate-remaining-cf.py

# 6) إعادة بناء الموقع كاملاً + فهرس المساعد
python3 tools/build-site.py

# 7) توليد كتالوج المساعد من الفهرس
python3 tools/gen-chat-catalog.py

# 8) النشر (الموقع عبر Pages، والمساعد عبر wrangler deploy)
```

**متغيرات البيئة المطلوبة للسكربتات فقط** (لا تُخزَّن في المستودع):

| المتغير | الاستخدام |
|---------|-----------|
| `CF_API_TOKEN` | رمز Cloudflare بصلاحية Workers AI — لسكربتات الترجمة |
| `CF_ACCOUNT_ID` | معرف حساب Cloudflare — اختياري (القيمة الافتراضية مضبوطة) |

## 🛍️ نبذة عن المتجر

متجر مغربي متخصص في احتياجات المنزل والأدوات الذكية: كل احتياجات المنزل، أفضل العروض، مستلزمات التنظيف، الإلكترونيات، اللياقة، الأثاث الخارجي، الأجهزة المنزلية، تحسينات المنزل، التخزين، الجمال الطبيعي، مستلزمات السيارة، والألعاب. يدعم الواجهة العربية (افتراضي) والإنجليزية مع تبديل فوري، والدفع عند الاستلام في جميع المدن المغربية.

---

## English Summary

**Syda Store** — the complete source of [syda.pages.dev](https://syda.pages.dev): a static e-commerce site on Cloudflare Pages (2,966 products synced from syda.dukan.shop) plus a multilingual AI shopping assistant on Cloudflare Workers (model: `@cf/openai/gpt-oss-120b`).

- `site/` — deployable static site + `/api/order` Pages Function (validates and proxies orders to api.dukan.shop)
- `chat-worker/` — anti-hallucination chatbot: answers in the visitor's language, recommends only real catalog products with add-to-cart cards, rate-limited, CORS-restricted to `*.syda.pages.dev`
- `tools/` — the full product-sync pipeline (scrape → diff → translate → build → regenerate chatbot catalog)
- `data/` — translation memory reused across syncs

**Deploy:** Pages → connect this repo with root directory `site` (no build command); Worker → `cd chat-worker && npx wrangler deploy`.
