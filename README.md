# متجر صيدة — Syda Store

الكود المصدري الكامل لمتجر **[syda.pages.dev](https://syda.pages.dev)** — موقع تجارة إلكترونية عصري على **Cloudflare Pages** (2966 منتجاً متزامناً مع **[syda.dukan.shop](https://syda.dukan.shop)**)، مع **تطبيق أندرويد رسمي** يُبنى ويُوقّع ويُنشر آلياً عبر GitHub Actions، ومساعد ذكي متعدد اللغات بلا هلوسة.

---

## 📁 بنية المشروع

| المسار | الوصف |
|--------|-------|
| `site/` | الموقع كاملاً بالتصميم الجديد (هيدر احترافي، بطاقات حديثة، شريط تطبيق، دعم داكن) — يُنشر مباشرة على Cloudflare Pages |
| `app/` | تطبيق الأندرويد (Capacitor): وضع شامل غامر، أيقونة اللوغو، تحديث تلقائي |
| `chat-worker/` | المساعد الذكي: Cloudflare Worker بنموذج `@cf/openai/gpt-oss-120b` |
| `tools/` | سكربتات المزامنة (سحب ← فرز ← ترجمة ← بناء ← كتالوج الشات) |
| `data/` | ذاكرة الترجمة — تُعاد استخدامها في كل مزامنة |
| `docs/` | ملفات المعرفة المشتركة: [نظام التصميم](docs/DESIGN-SYSTEM.md) و[دليل التطبيق](docs/APP-GUIDE.md) |
| `AGENTS.md` | القواعد الحاكمة للعمل الجماعي — **اقرأه قبل أي تعديل** |

## 🎨 التصميم (v2.0)

تصميم عصري مستوحى من **Amazon** (هيدر داكن عالي التباين وبحث بارز) و**Jumia** (شارات الخصم وعناصر الثقة وشريط التطبيق) و**Seeda** (الزوايا الناعمة وتفاعلات الهوفر) — مع الحفاظ الكامل على هوية صيدة: الأخضر `#087a4b` والذهبي `#d4a72c` وخط Cairo واللوغو الرسمي. التفاصيل الكاملة في `docs/DESIGN-SYSTEM.md`.

## 📱 تطبيق الأندرويد

- **رابط التحميل الدائم** (يعطي دائماً آخر إصدار):
  `https://github.com/tarikchouika/Syda/releases/latest/download/syda-store.apk`
- **بناء آلي**: كل دفعة لـ `main` تُبنى وتُوقّع وتُنشر تلقائياً (GitHub Actions)
- **توقيع دائم 30 سنة** (حتى 2056) — بصمة الملكية موثقة في `docs/APP-GUIDE.md`
- **وضع شامل غامر** يخفي شريطي أندرويد ويتكيف مع كل الشاشات والنوتش
- **دليل التثبيت وتجاوز Play Protect**: [syda.pages.dev/app](https://syda.pages.dev/app)
- زر التحميل + QR مدمجان في الموقع (الهوم والفوتر وصفحة /app)

## 🚀 النشر

### الموقع (Cloudflare Pages)
جاهز كما هو — **Root directory = `site`**، بدون أمر بناء. الطلبات تعمل عبر Pages Function في `site/functions/api/order.js` (تحقق ثم تمرير إلى `api.dukan.shop`).

### التطبيق (آلي)
```bash
git push   # سير العمل يبني APK موقّعاً ويحدّث الإصدار الدائم تلقائياً
```
أو يدوياً للتطوير: `cd app && npm install && npx cap sync android && cd android && ./gradlew assembleDebug`

### المساعد (Cloudflare Workers)
```bash
cd chat-worker && npx wrangler deploy
```

## 🔄 مزامنة المنتجات من syda.dukan.shop

```bash
cp site/assets/products.json data/products.json        # خط الأساس
python3 tools/scrape-dukan.py                          # سحب الكتالوج
python3 tools/diff-catalogs.py                         # الجديد/المحذوف
python3 tools/assess-changes.py                        # ما يحتاج ترجمة
CF_API_TOKEN=... python3 tools/translate-remaining-cf.py   # ترجمة EN
python3 tools/build-site.py                            # بناء 2966 صفحة
python3 tools/gen-chat-catalog.py                      # كتالوج الشات بوت
npx wrangler pages deploy site --project-name=syda     # نشر
```

| متغير البيئة | الاستخدام |
|--------------|-----------|
| `CF_API_TOKEN` | رمز Cloudflare بصلاحية Workers AI — للترجمة والنشر |
| `CF_ACCOUNT_ID` | معرف الحساب (اختياري) |

## 🤖 المساعد الذكي

يرد **بلغة الزائر تلقائياً** (عربية، إنجليزية، فرنسية، إسبانية…)، ويوصي **فقط بمنتجات حقيقية من الكتالوج** مع بطاقات قابلة للإضافة للسلة — صفر هلوسة عبر التحقق من كل منتج قبل إرساله. محدود 20 رسالة/5 دقائق، وCORS مقيّد بـ `*.syda.pages.dev`.

## 🛍️ نبذة عن المتجر

متجر شامل لاحتياجات المنزل والأجهزة الذكية والجمال والسيارة والألعاب — 12 فئة، دفع عند الاستلام، إرجاع 15 يوم، واجهة عربية/إنجليزية بتبديل فوري ووضع داكن.

---

## English Summary

**Syda Store** — the complete source of [syda.pages.dev](https://syda.pages.dev): a modern static e-commerce site on Cloudflare Pages (2,966 products synced from syda.dukan.shop, redesign inspired by Amazon/Jumia/Seeda), an official **Android app** (Capacitor, immersive full-screen, auto-built + signed + released via GitHub Actions with a 30-year ownership key), and a multilingual anti-hallucination AI chatbot (gpt-oss-120b).

**Deploy:** Pages → root `site` (no build); App → automatic on push; Worker → `npx wrangler deploy`.
