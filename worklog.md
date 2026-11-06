# Worklog — سجل مهام مشروع صيدة

---

## Task ID: TG-SUPPORT-2026-11-06
**Agent:** ZCode (z.ai agent mode)
**Stage Summary:** تكامل بوت تيليغرام لخدمة العملاء — علاقة ثنائية الاتجاه زائر ⇄ فريق الدعم عبر Pages Functions + KV، بأدوار ثلاثة، دون أي انحدار.

### Work Log

1. **استكشاف**: قراءة AGENTS.md بالكامل، chat-worker (المساعد الذكي — لم يُمس)، site/functions/api/order.js، chat.js، site-ui.js، DESIGN-SYSTEM.md.
2. **كشف انحدار محتمل (مهم)**: الإنتاج الحي أحدث من GitHub — commit واحد قديم فقط في المستودع بينما المنشور يحوي: قالب صفحات منتجات محسّناً (CTA بأسلوب Jumia، stock-chips، tiers بتصميم جديد)، style.css (+3.2KB)، chat.js بدعم مسبق نحو `/support` على الـWorker القديم، وproducts.json مع 1128 فرق محتوى. **الحل**: مرآة كاملة للإنتاج (3059 ملفاً، 111MB) ومزامنة المستودع منها قبل أي تعديل + commit حماية `8ef6196`.
3. **البنية الخلفية** (جديدة كلياً على حساب Pages نفسه — لا CORS، لا Worker جديد):
   - `site/functions/api/support-lib.js`: KV helpers، أدوار، جلسات، رسائل، Telegram API، إشعارات.
   - `site/functions/api/support/[route].js`: نقاط الزائر — `/start`, `/msg`, `/poll`, `/end` (عقد مطابق للسابق + `/end` جديد).
   - `site/functions/api/telegram.js`: الويبهوك + أوامر الأدوار الثلاثة (superadmin 5700612979 / admin / coadmin) + توجيه الردود النصية + أزرار inline.
4. **الواجهة**: chat.js — تحويل SUPPORT_URL إلى `/api/support` (نفس الأصل)، زر «إنهاء المحادثة مع خدمة العملاء» في وضع الدعم الحي، تحديث التسميات AR/EN.
5. **الاختبار**: Node بمحاكاة KV/TG (سيناريو 14 خطوة نجح)، `wrangler pages dev` حي (زائر⇄موظف⇄زائر)، UI بمتصفح وكيل (RTL/EN، لا أخطاء كونسول).
6. **النشر**: KV namespace `syda_support` (d3449bcd40334d6892cab214fd03f6cf)، secrets: TG_BOT_TOKEN + TG_WEBHOOK_SECRET، نشر main → `a6c87699`، تفعيل الويبهوك الإنتاجي مع allowed_updates=[message, callback_query].
7. **التحقق الحي**: E2E كامل على syda.pages.dev من متصفح حقيقي: زائر يرسل → سوبر أدمين `/open` + رد → الرد يظهر في نافذة الزائر تلقائياً (polling) → `/done` → رسالة إغلاق للزائر + `localStorage` نظيف. تحقق الأدوار: تفويض coadmin نجح، محاولة غير مصرح بها رُفضت، سرّ الويبهوك مطلوب (403 بدونه).
8. **مراجعة انحدارية**: مقارنة بعد النشر مقابل لقطة ما قبل النشر — صفحات المنتجات والفئات والقانونية وchat.js/style.css/products.json **IDENTICAL**، `/api/order` يتصرف كالسابق تماماً (EMPTY_CART على سلة فارغة)، الـWorker القديم يعمل (`/health` سليم). الأسعار المحمية نموذجياً: 130 ر.س/للقطعة، tiers 107/99/94، «اشترِ الآن — الدفع عند الاستلام».

### ملفات جديدة/معدلة
- جديد: `site/functions/api/support-lib.js`, `site/functions/api/support/[route].js`, `site/functions/api/telegram.js`, `site/wrangler.toml`, `docs/SUPPORT-BOT.md`
- معدل: `site/assets/chat.js` (SUPPORT_URL نفس الأصل + زر الإنهاء + تسميات)
- مزامنة إنتاجية: 3047 ملفاً (منتجات/أصول/بيانات) — commit حماية `8ef6196`

### ملاحظات
- التوكن **ليس في الكود** — Pages secret فقط.
- مهمة التنظيف المجدولة (Job 503128) **لم تُمس** إطلاقاً.
- الحد المعدل في حدود العزل (per-isolate) — نفس نهج الـWorker الحالي؛ الحمايات الدائمة: فحص الأصل، سرّ الويبهوك، تحقق المفاتيح، سقوف الرسائل.
