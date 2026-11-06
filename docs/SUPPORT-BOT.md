# بوت دعم تيليغرام — Syda Support Bot

> تكامل خدمة العملاء البشرية عبر بوت تيليغرام [@sydasupports_bot](https://t.me/sydasupports_bot) مع الشات بوت الموقعي.
> الزائر **لا يحتاج حساب تيليغرام** — الشات بوت وسيط ينقل الرسائل مباشرة بين الزائر والفريق.

## 🏗️ المعمارية

```
الزائر (المتصفح)                         الفريق (تيليغرام)
      │                                        │
      │ POST /api/support/start                │
      │ POST /api/support/msg ──────┐          │
      │ GET  /api/support/poll      │          │
      │ POST /api/support/end       ▼          │
      │                      Pages Function    │
      │                     site/functions/api/│
      │                       support/[route]  │
      │                              │         │
      │                      KV: syda_support  │
      │                              │         │
      │            POST /api/telegram ◄────────│ webhook (سرّ مشترك)
      │            (أوامر + ردود نصية)          │ sendMessage
```

- **التخزين**: KV namespace `syda_support` (`d3449bcd40334d6892cab214fd03f6cf`) — جلسات، رسائل، أدوار، فهرس المحادثات المفتوحة.
- **الأسرار**: `TG_BOT_TOKEN` و`TG_WEBHOOK_SECRET` كـ Pages secrets (لا توكن في الكود).
- **النطاق**: نفس أصل syda.pages.dev — لا CORS، لا Worker إضافي. الـWorker القديم (`syda-chat`) لم يُمس (الشات الذكي كما هو).

## 🔑 الأدوار الثلاثة

| الدور | الصلاحيات |
|-------|-----------|
| **سوبر أدمين** (المعرّف الثابت `5700612979`) | كل الصلاحيات + تفويض الأدوار (`/role`) |
| **أدمن** | الرد على أي زبون + إسناد المحادثات للكوأدمين (`/assign`) + `/admins` |
| **كوأدمين** | خدمة العملاء فقط: الرد على المحادثات المسندة له (أو غير المسندة) |

## 🤖 أوامر البوت

| الأمر | الوصف | المتاح لـ |
|-------|-------|----------|
| `/start` `/help` | مساعدة حسب الدور | الجميع |
| `/id` | معرّفك التيليغرامي (للتفويض) | الجميع |
| `/chats` | المحادثات المفتوحة (زر لكل محادثة) | الفريق |
| `/open SID` | فتح محادثة والرد عليها | الفريق |
| `/assign SID ID` | إسناد محادثة لكوأدمين/أدمن | أدمن+ |
| `/close SID` أو `/done` | إغلاق محادثة (الحالية افتراضياً) | الفريق |
| `/leave` | فك الارتباط دون إغلاق | الفريق |
| `/role ID admin\|coadmin\|none` | تفويض/سحب الصلاحيات | سوبر أدمين فقط |
| `/admins` | قائمة الفريق والأدوار | أدمن+ |
| *نص عادي* | رد على المحادثة المرتبطة بك | الفريق |

## 🔌 عقد API (نقاط الزائر)

| النقطة | المدخل | المخرج |
|--------|--------|--------|
| `POST /api/support/start` | `{k, lang, page}` | `{ok, sid, seq, resumed, assigneeName}` |
| `POST /api/support/msg` | `{k, text}` | `{ok}` — 410 إذا أُغلقت |
| `GET /api/support/poll?k&after` | — | `{ok, status: open\|closed\|none, msgs[], assigneeName}` |
| `POST /api/support/end` | `{k}` | `{ok}` |

رسائل poll: `{seq, from: staff\|sys, text, name, code: joined\|closed}`.

## 🛡️ الحمايات

- فحص Origin/Referer (نطاق syda.pages.dev فقط) على نقاط الزائر.
- سرّ الويبهوك (`X-Telegram-Bot-Api-Secret-Token`) — نداءات تيليغرام غير الموقعة تُرفض 403.
- تحقق من صيغة مفتاح الجلسة + سقف 1000 حرف للرسالة + سقف 200 رسالة/جلسة.
- حد معدل (بحدود العزل — نفس نهج الـWorker الحالي): 10 محادثات جديدة/5 دقائق/IP، 30 رسالة/5 دقائق/جلسة.
- TTL للجلسات والرسائل: 7 أيام.

## 🎨 الواجهة (chat.js)

- زر **«التحدث مع خدمة العملاء»** أخضر (#087a4b) تحت الشرائح — يختفي في وضع الدعم الحي.
- وضع الدعم الحي: شريط فرعي «أنت الآن تتحدث مع فريق خدمة العملاء — اسم الموظف»، زر عودة ذهبي، وزر «إنهاء المحادثة» بحد ذهبي متقطع.
- polling كل 5 ثوانٍ + شارة FAB ذهبية عند وصول رد والنافذة مغلقة + استئناف المحادثة المفتوحة عبر chip مخصص.
- ثنائي اللغة كاملاً (AR/EN عبر `languagechange`) وبالهوية البصرية نفسها (Cairo، الأخضر/الذهبي/الكريمي).

## 🚀 التشغيل والصيانة

```bash
cd site
npx wrangler pages deploy . --project-name=syda --branch=main

# إعادة تفعيل الويبهوك (عند الحاجة):
curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://syda.pages.dev/api/telegram" \
  -d "secret_token=<TG_WEBHOOK_SECRET>" \
  -d 'allowed_updates=["message","callback_query"]'
```

- السوبر أدمين يبدأ بمراسلة البوت `/start` ثم `/role <id> coadmin` لكل عضو فريق (يأخذ الـid من أمر `/id` عند العضو).
- الجلسات تُنشأ من المتصفح بمفتاح `crypto.randomUUID()` يُحفظ في `localStorage('sayda-support')`.
