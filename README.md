# صيدة — Syda Store

متجر إلكتروني شامل (3029 منتجاً) على Cloudflare Pages + مساعد ذكي + بوت دعم تيليغرام.

## 🗂️ البنية

```
site/          → موقع Cloudflare Pages (3029 منتجاً) + Functions:
                  /api/order  → إرسال الطلبات إلى api.dukan.shop
                  /api/support/* → ترحيل رسائل الدعم (زائر ⇄ تيليغرام)
                  /api/telegram   → ويبهوك بوت الدعم + أوامر الفريق
app/           → تطبيق Capacitor (يغلف syda.pages.dev)
chat-worker/   → Worker المساعد الذكي (Workers AI — gpt-oss-120b)
tools/         → سكربتات المزامنة: سحب ← فرز ← ترجمة ← بناء ← كتالوج الشات
data/          → ذاكرة الترجمة (translations.json)
docs/          → ملفات المعرفة المشتركة (DESIGN-SYSTEM / APP-GUIDE / SUPPORT-BOT)
```

## 🤖 بوت الدعم البشري

الزائر يطلب «التحدث مع خدمة العملاء» من الشات → محادثة فريدة تُرحَّل ثنائياً إلى [@sydasupports_bot](https://t.me/sydasupports_bot).
الزائر **لا يحتاج حساب تيليغرام**. الأدوار: سوبر أدمين (كل الصلاحيات + التفويض) / أدمن (رد + إسناد) / كوأدمين (خدمة عملاء فقط).
التفاصيل الكاملة في `docs/SUPPORT-BOT.md`.

## 🔄 خط أنابيب مزامنة المنتجات

```
tools/scrape-dukan.py → tools/diff-catalogs.py → tools/assess-changes.py
→ (CF_API_TOKEN=…) tools/translate-remaining-cf.py → tools/build-site.py
→ tools/gen-chat-catalog.py
نشر: (cd site && wrangler pages deploy . --project-name=syda --branch=main)
    + (cd chat-worker && wrangler deploy)
```

## 📚 ابدأ هنا

1. `AGENTS.md` — القواعد الحاكمة (اقرأها كاملة قبل أي تعديل).
2. `docs/DESIGN-SYSTEM.md` — الهوية البصرية.
3. `docs/SUPPORT-BOT.md` — دعم العملاء عبر تيليغرام.
4. `worklog.md` — سجل المهام المنجزة.
