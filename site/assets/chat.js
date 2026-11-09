/* Syda Chat Widget — multilingual AI shopping assistant for syda.pages.dev
 * Visual identity matches the store: green #087a4b / dark #06452f / gold #d4a72c / cream #fffaf0, Cairo font.
 * Talks to the syda-chat Worker (deterministic catalog retrieval + validated AI answers — no hallucinated products/links).
 */
(() => {
  "use strict";

  const WORKER_URL = "https://syda-chat.tarikc.workers.dev/chat";
  const SUPPORT_URL = "/api/support"; // same-origin Pages Function (Telegram relay)
  const MAX_HISTORY = 10;

  const AR = {
    title: "مساعد صيدة",
    subtitle: "يجيبك بلغتك ويدلك على المنتج المناسب",
    online: "متصل الآن",
    placeholder: "اكتب سؤالك عن أي منتج…",
    send: "إرسال",
    welcome: "مرحباً بك في متجر صيدة! 🌟\nأنا مساعدك الذكي — اسألني عن أي منتج تحتاجه بأي لغة، وسأدلك على المنتج المناسب فوراً.\n\n🧑‍💼 ولمخاطبة موظف مباشرة اضغط زر «التحدث مع خدمة العملاء» بالأسفل.",
    suggestions: ["عروض وخصومات", "منتجات للسيارة", "أدوات المطبخ", "العناية بالبشرة والشعر"],
    viewDetails: "عرض التفاصيل",
    addToCart: "أضف للسلة",
    added: "تمت الإضافة إلى السلة ✓",
    more: "مطابقات أخرى:",
    typing: "يكتب الآن…",
    offline: "تعذر الاتصال بالمساعد مؤقتاً. حاول مرة أخرى بعد قليل.",
    openChat: "تحدث مع مساعد صيدة",
    closeChat: "إغلاق المحادثة",
    poweredBy: "مساعد ذكي — إجابات موثوقة من كتالوج المتجر فقط",
    brandAlt: "صيدة",
    priceOnRequest: "السعر عند الطلب",
    onRequestNote: "هذا المنتج بسعر عند الطلب. تواصل معنا لمعرفة السعر وتأكيد الطلب.",
    supportBtn: "التحدث مع خدمة العملاء",
    supportBack: "↩ العودة إلى المساعد الذكي",
    supportSent: "تم تحويلك إلى فريق خدمة العملاء ✅\nاكتب رسالتك هنا وسيصلك رد الموظف مباشرة في هذه النافذة.",
    supportResumed: "عودةً إلى محادثة خدمة العملاء — سيظهر لك أي رد جديد فور وصوله.",
    supportResumeChip: "💬 متابعة محادثة الدعم المفتوحة",
    supportJoined: "👤 {name} من فريق صيدة انضم إلى المحادثة",
    supportJoinedNoName: "👥 انضم أحد موظفي الدعم إلى المحادثة",
    supportClosed: "🔴 أُغلقت محادثة الدعم. يمكنك دائماً طلب المساعدة مجدداً.",
    supportLeft: "عُدت إلى المساعد الذكي — محادثة الدعم ما زالت محفوظة ويمكنك العودة إليها من الزر بالأسفل.",
    supportLive: "أنت الآن تتحدث مع فريق خدمة العملاء",
    supportOffline: "تعذر الاتصال بخدمة العملاء الآن. حاول بعد قليل.",
    supportEnd: "إنهاء المحادثة مع خدمة العملاء",
  };
  const EN = {
    title: "Syda Assistant",
    subtitle: "Answers in your language, guides you to the right product",
    online: "Online",
    placeholder: "Ask me about any product…",
    send: "Send",
    welcome: "Welcome to Syda! 🌟\nI'm your smart assistant — ask me about any product you need, in any language, and I'll point you to it right away.\n\n🧑‍💼 To talk to a human, tap the “Talk to customer service” button below.",
    suggestions: ["Offers & deals", "Car accessories", "Kitchen tools", "Skin & hair care"],
    viewDetails: "View details",
    addToCart: "Add to cart",
    added: "Added to cart ✓",
    more: "Other matches:",
    typing: "Typing…",
    offline: "Could not reach the assistant right now. Please try again shortly.",
    openChat: "Chat with Syda Assistant",
    closeChat: "Close chat",
    poweredBy: "AI assistant — answers grounded in the store catalog only",
    brandAlt: "Syda",
    priceOnRequest: "Price on request",
    onRequestNote: "This product is priced on request. Contact us to confirm the price.",
    supportBtn: "Talk to customer service",
    supportBack: "↩ Back to the smart assistant",
    supportSent: "You are now connected to our customer service team ✅\nWrite your message here and the agent's reply will arrive in this window.",
    supportResumed: "Back to your customer service conversation — any new reply will appear here as soon as it arrives.",
    supportResumeChip: "💬 Resume your open support conversation",
    supportJoined: "👤 {name} from the Syda team joined the conversation",
    supportJoinedNoName: "👥 A support agent joined the conversation",
    supportClosed: "🔴 The support conversation was closed. You can always ask for help again.",
    supportLeft: "You are back with the smart assistant — your support conversation is saved and you can return to it anytime from the button below.",
    supportLive: "You are now chatting with customer service",
    supportOffline: "Could not reach customer service right now. Please try again shortly.",
    supportEnd: "End the customer service conversation",
  };
  const t = () => (localStorage.getItem("sayda-lang") === "en" ? EN : AR);
  const isEn = () => localStorage.getItem("sayda-lang") === "en";

  const esc = (v) => String(v == null ? "" : v).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  const fmtPrice = (n) => {
    const v = Math.round(Number(n) * 100) / 100;
    return (Number.isInteger(v) ? String(v) : v.toFixed(2)) + " " + (isEn() ? "SAR" : "ر.س");
  };

  // ---------- styles ----------
  const css = `
.syda-chat-fab{position:fixed;bottom:20px;right:20px;width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#0c8b57,#06452f);color:#fff;border:0;cursor:pointer;box-shadow:0 6px 20px rgba(6,69,47,.35);z-index:960;display:flex;align-items:center;justify-content:center;transition:transform .2s;padding:0}
.syda-chat-fab:hover{transform:scale(1.08)}
.syda-chat-fab .flogo{width:44px;height:44px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 2px #d4a72c}
.syda-chat-fab .flogo img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block}
.syda-chat-fab .dot{position:absolute;top:2px;left:2px;width:13px;height:13px;border-radius:50%;background:#d4a72c;border:2px solid #fff}
body:has(.mobile-buybar) .syda-chat-fab{bottom:calc(94px + env(safe-area-inset-bottom))}
.syda-chat-box{position:fixed;bottom:90px;right:20px;width:372px;max-width:calc(100vw - 24px);height:min(560px,calc(100vh - 120px));background:#fff;border-radius:18px;box-shadow:0 12px 40px rgba(6,69,47,.28);z-index:960;display:none;flex-direction:column;overflow:hidden;border:1px solid #ebdfbd;font-family:Cairo,Arial,Tahoma,sans-serif}
.syda-chat-box.open{display:flex}
.syda-chat-head{background:linear-gradient(110deg,#06452f,#0c8b57);color:#fff;padding:13px 16px;display:flex;align-items:center;gap:11px;flex-direction:row}
.syda-chat-head .avatar{width:42px;height:42px;border-radius:50%;background:#fff;border:2px solid #d4a72c;display:flex;align-items:center;justify-content:center;flex:none;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.25)}
.syda-chat-head .avatar img{width:100%;height:100%;object-fit:cover;display:block}
.syda-chat-head .meta{flex:1;min-width:0}
.syda-chat-head .ttl{font-weight:bold;font-size:15px}
.syda-chat-head .sub{font-size:11px;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.syda-chat-head .st{font-size:10px;color:#b7f5d6;display:flex;align-items:center;gap:4px}
.syda-chat-head .st i{width:7px;height:7px;border-radius:50%;background:#4ade80;display:inline-block}
.syda-chat-x{background:rgba(255,255,255,.15);border:0;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:16px;flex:none}
.syda-chat-msgs{flex:1;overflow-y:auto;padding:14px;background:#fffaf0;display:flex;flex-direction:column;gap:10px}
.syda-chat-msgs .msg{max-width:86%;padding:10px 13px;border-radius:14px;font-size:13.5px;line-height:1.8;white-space:pre-wrap;word-break:break-word}
.msg.bot{background:#fff;border:1px solid #ebdfbd;border-bottom-right-radius:4px;align-self:flex-start}
.msg.user{background:#087a4b;color:#fff;border-bottom-left-radius:4px;align-self:flex-end}
html[dir=ltr] .msg.bot{border-bottom-right-radius:14px;border-bottom-left-radius:4px}
html[dir=ltr] .msg.user{border-bottom-left-radius:14px;border-bottom-right-radius:4px}
.chat-cards{display:flex;flex-direction:column;gap:8px;align-self:stretch}
.chat-card{display:flex;gap:10px;background:#fff;border:1px solid #ebdfbd;border-radius:13px;padding:9px;align-items:center}
.chat-card img{width:62px;height:62px;border-radius:10px;object-fit:cover;flex:none;background:#fffaf0}
.chat-card .cinfo{flex:1;min-width:0}
.chat-card .cname{font-size:12.5px;font-weight:bold;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.chat-card .cprice{color:#087a4b;font-weight:bold;font-size:13px;margin-top:2px}
.chat-card .cprice .old{color:#9b9b9b;text-decoration:line-through;font-weight:normal;font-size:11px;margin-inline-start:5px}
.chat-card .cbtns{display:flex;flex-direction:column;gap:5px;flex:none}
.chat-card .cbtn{border:0;border-radius:9px;padding:6px 10px;font:inherit;font-size:11px;font-weight:bold;cursor:pointer;text-decoration:none;text-align:center}
.chat-card .view{background:#d4a72c;color:#17251e}
.chat-card .add{background:#087a4b;color:#fff}
.chat-more{font-size:11.5px;color:#4a5d52;align-self:stretch}
.chat-more a{color:#087a4b;text-decoration:none;font-weight:bold}
.typing{display:inline-flex;gap:4px;padding:12px 14px}
.typing i{width:7px;height:7px;border-radius:50%;background:#087a4b;animation:sydatyp 1.2s infinite}
.typing i:nth-child(2){animation-delay:.2s}.typing i:nth-child(3){animation-delay:.4s}
@keyframes sydatyp{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1}}
.chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 14px 10px;background:#fffaf0}
.chip{border:1px solid #d4a72c;background:#fff;color:#06452f;border-radius:16px;padding:6px 12px;font:inherit;font-size:12px;cursor:pointer}
.chip:hover{background:#d4a72c}
.chat-note{font-size:10px;color:#8aa094;text-align:center;padding:0 10px 7px;background:#fffaf0}
.support-btn{display:block;width:calc(100% - 28px);margin:8px 14px 0;background:#087a4b;color:#fff;border:0;border-radius:12px;padding:10px 14px;font:inherit;font-size:13px;font-weight:bold;cursor:pointer;text-align:center}
.support-btn:hover{background:#06452f}
.support-back{display:none;width:calc(100% - 28px);margin:8px 14px 0;background:#fff;color:#06452f;border:1.5px solid #d4a72c;border-radius:12px;padding:9px 14px;font:inherit;font-size:12.5px;font-weight:bold;cursor:pointer;text-align:center}
.support-back:hover{background:#fffaf0}
.chip.resume{background:#fffaf0;border-color:#087a4b;color:#087a4b;font-weight:bold}
.syda-chat-box.support-live .chips{display:none}
.syda-chat-box.support-live .support-btn{display:none}
.syda-chat-box.support-live .support-back{display:block}
.support-end{display:none;margin:0 14px 6px;background:transparent;color:#a2650c;border:1.5px dashed #d4a72c;border-radius:12px;padding:7px 12px;font:inherit;font-size:11.5px;font-weight:bold;cursor:pointer;text-align:center}
.support-end:hover{background:#fffaf0}
.syda-chat-box.support-live .support-end{display:block}
.syda-chat-fab .sbadge{position:absolute;top:-3px;right:-3px;min-width:18px;height:18px;border-radius:9px;background:#d4a72c;color:#17251e;font-size:11px;font-weight:bold;display:none;align-items:center;justify-content:center;padding:0 4px;border:2px solid #fff;z-index:2}
.syda-chat-in{display:flex;gap:8px;padding:10px;border-top:1px solid #ebdfbd;background:#fff}
.syda-chat-in input{flex:1;border:1.5px solid #dfcf9c;border-radius:22px;padding:10px 14px;font:inherit;font-size:13px;outline:none;background:#fffaf0}
.syda-chat-in input:focus{border-color:#087a4b}
.syda-chat-in button{background:#d4a72c;color:#17251e;border:0;border-radius:22px;padding:10px 16px;font:inherit;font-weight:bold;cursor:pointer}
.syda-chat-in button:disabled{opacity:.5;cursor:default}
/* ---- dark mode: widget follows body.dark with the store identity (green/gold) ----
   All pairs measured >= 4.5:1 (WCAG AA): --ink #e8f0ea on #13241b = 13.95:1,
   gold #d4a72c on #13241b = 8.4:1, #0d1712 text on gold = 8.4:1 */
body.dark .syda-chat-box{background:#13241b;border-color:#2d4436}
body.dark .syda-chat-msgs{background:#0d1712}
body.dark .msg.bot{background:#1a2f23;border-color:#2d4436;color:#e8f0ea}
body.dark .msg.user{background:#0c8b57;color:#fff}
body.dark .chat-card{background:#1a2f23;border-color:#2d4436;color:#e8f0ea}
body.dark .chat-card img{background:#1a2f23}
body.dark .chat-card .view{background:#d4a72c;color:#0d1712}
body.dark .chat-card .add{background:#0c8b57;color:#fff}
body.dark .chips{background:#0d1712}
body.dark .chip{background:#13241b;color:#e8f0ea;border-color:#d4a72c}
body.dark .chip.resume{background:#1a2f23;color:#e8c04d}
body.dark .chat-note{color:#a3b8ac;background:#0d1712}
body.dark .support-back{background:#13241b;color:#e8f0ea}
body.dark .support-back:hover{background:#1a2f23}
body.dark .support-end:hover{background:#1a2f23}
body.dark .syda-chat-in{background:#13241b;border-color:#2d4436}
body.dark .syda-chat-in input{background:#0d1712;border-color:#3d5a48;color:#e8f0ea}
body.dark .syda-chat-in button{background:#d4a72c;color:#0d1712}
@media(max-width:600px){
.syda-chat-box{top:0;right:0;left:0;bottom:0;width:auto;max-width:100%;height:auto;border-radius:0;border:0;box-shadow:none;z-index:960}
.syda-chat-head{padding-top:calc(13px + env(safe-area-inset-top));padding-bottom:13px}
.syda-chat-in{padding-bottom:calc(10px + env(safe-area-inset-bottom))}
}
`;

  // ---------- state ----------
  let history = [];          // [{role, content}] — sent to the worker for context
  let busy = false;
  let welcomed = false;
  let sup = null;            // human-support session: {k, sid, seq, active, staff}
  let supTimer = null;
  const SUP_POLL_MS = 2500; // fast sync: D1-backed relay is strongly consistent; poll every 2.5s

  const supSaved = () => {
    try { const v = JSON.parse(localStorage.getItem("sayda-support") || "null"); return v && v.k ? v : null; } catch (e) { return null; }
  };
  const supSave = () => { try { sup && sup.k ? localStorage.setItem("sayda-support", JSON.stringify({ k: sup.k, seq: sup.seq })) : localStorage.removeItem("sayda-support"); } catch (e) { } };

  // ---------- dom ----------
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  const fab = document.createElement("button");
  fab.className = "syda-chat-fab";
  fab.setAttribute("aria-label", "chat");
  fab.innerHTML = `<span class="flogo"><img src="/assets/logo.png" alt=""></span><span class="dot"></span><span class="sbadge">1</span>`;
  document.body.appendChild(fab);

  const box = document.createElement("div");
  box.className = "syda-chat-box";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "Syda assistant chat");
  document.body.appendChild(box);

  function renderShell() {
    const L = t();
    box.innerHTML = `
      <div class="syda-chat-head">
        <div class="avatar"><img src="/assets/logo.png" alt="${esc(L.brandAlt)}"></div>
        <div class="meta">
          <div class="ttl">${L.title}</div>
          <div class="sub">${L.subtitle}</div>
          <div class="st"><i></i>${L.online}</div>
        </div>
        <button class="syda-chat-x" aria-label="${L.closeChat}">×</button>
      </div>
      <div class="syda-chat-msgs"></div>
      <div class="chips"></div>
      <button class="support-btn" type="button">${L.supportBtn}</button>
      <button class="support-back" type="button">${L.supportBack}</button>
      <button class="support-end" type="button">${L.supportEnd}</button>
      <div class="chat-note">${L.poweredBy}</div>
      <div class="syda-chat-in">
        <input type="text" maxlength="500" placeholder="${L.placeholder}" aria-label="${L.placeholder}">
        <button>${L.send}</button>
      </div>`;
    box.querySelector(".syda-chat-x").onclick = close;
    box.querySelector(".syda-chat-in button").onclick = send;
    box.querySelector(".support-btn").onclick = startSupport;
    box.querySelector(".support-back").onclick = () => exitLive(false);
    box.querySelector(".support-end").onclick = endSupport;
    const input = box.querySelector(".syda-chat-in input");
    input.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); send(); } };
    renderChips();
    if (!welcomed) {
      addMsg("bot", L.welcome);
      welcomed = true;
    }
  }

  function renderChips() {
    const L = t();
    const wrap = box.querySelector(".chips");
    if (!wrap) return;
    wrap.innerHTML = "";
    const saved = supSaved();
    if (saved && !(sup && sup.active)) {
      const r = document.createElement("button");
      r.className = "chip resume";
      r.textContent = L.supportResumeChip;
      r.onclick = () => { if (!busy) startSupport(); };
      wrap.appendChild(r);
    }
    L.suggestions.forEach((s) => {
      const b = document.createElement("button");
      b.className = "chip";
      b.textContent = s;
      b.onclick = () => { const i = box.querySelector(".syda-chat-in input"); if (i && !busy) { i.value = s; send(); } };
      wrap.appendChild(b);
    });
  }

  function msgsEl() { return box.querySelector(".syda-chat-msgs"); }
  function scrollDown() { const m = msgsEl(); if (m) m.scrollTop = m.scrollHeight; }

  function addMsg(kind, text) {
    const d = document.createElement("div");
    d.className = "msg " + kind;
    d.textContent = text;
    msgsEl().appendChild(d);
    scrollDown();
    return d;
  }

  function productCard(p) {
    const L = t();
    const name = isEn() ? (p.nameEn || p.name) : p.name;
    const onRequest = !(p.price != null) || Number(p.price) > 999;
    const card = document.createElement("div");
    card.className = "chat-card";
    card.innerHTML = `
      <img src="${esc(p.image || "/assets/logo.png")}" alt="${esc(name)}" loading="lazy" onerror="this.onerror=null;this.src='/assets/logo.png'">
      <div class="cinfo">
        <div class="cname">${esc(name)}</div>
        <div class="cprice">${onRequest ? esc(L.priceOnRequest) : fmtPrice(p.price)}${!onRequest && p.oldPrice && p.oldPrice > p.price ? `<span class="old">${fmtPrice(p.oldPrice)}</span>` : ""}</div>
      </div>
      <div class="cbtns">
        <a class="cbtn view" href="${esc(p.url)}">${L.viewDetails}</a>
        <button class="cbtn add" ${onRequest ? "disabled title=" + esc(L.onRequestNote) : ""}>${onRequest ? esc(L.priceOnRequest) : L.addToCart}</button>
      </div>`;
    if (onRequest) {
      const b = card.querySelector(".add");
      b.style.opacity = ".55";
      b.onclick = () => addMsg("bot", L.onRequestNote);
      return card;
    }
    card.querySelector(".add").onclick = () => {
      addToCart({ id: p.id, name: p.name, nameEn: p.nameEn || p.name, price: Number(p.price) || 0 });
      const b = card.querySelector(".add");
      b.textContent = L.added;
      b.disabled = true;
      setTimeout(() => { b.textContent = L.addToCart; b.disabled = false; }, 1800);
    };
    return card;
  }

  function addProducts(products, results) {
    if (products && products.length) {
      const wrap = document.createElement("div");
      wrap.className = "chat-cards";
      products.forEach((p) => wrap.appendChild(productCard(p)));
      msgsEl().appendChild(wrap);
    }
    if (results && results.length) {
      const L = t();
      const more = document.createElement("div");
      more.className = "chat-more";
      more.innerHTML = L.more + " " + results.map((p) => `<a href="${esc(p.url)}">${esc(isEn() ? (p.nameEn || p.name) : p.name)}</a>`).join(" · ");
      msgsEl().appendChild(more);
    }
    scrollDown();
  }

  function showTyping() {
    const d = document.createElement("div");
    d.className = "msg bot typing";
    d.innerHTML = "<i></i><i></i><i></i>";
    msgsEl().appendChild(d);
    scrollDown();
    return d;
  }

  // ---------- human support (Telegram relay) ----------
  function fabBadge(on) {
    const b = fab.querySelector(".sbadge");
    if (b) b.style.display = on ? "flex" : "none";
  }

  function updateSupportHeader() {
    const sub = box.querySelector(".sub");
    if (sub && sup && sup.active) sub.textContent = t().supportLive + (sup.staff ? " — " + sup.staff : "");
  }

  function enterLive(resumed) {
    if (!sup) return;
    sup.active = true;
    box.classList.add("support-live");
    addMsg("bot", resumed ? t().supportResumed : t().supportSent);
    updateSupportHeader();
    supSave();
    if (supTimer) clearInterval(supTimer);
    supTimer = setInterval(pollSupport, SUP_POLL_MS);
    pollSupport();
  }

  function exitLive(closed) {
    if (supTimer) { clearInterval(supTimer); supTimer = null; }
    if (sup) sup.active = false;
    box.classList.remove("support-live");
    if (closed) {
      addMsg("bot", t().supportClosed);
      sup = null;
      supSave();
    } else {
      addMsg("bot", t().supportLeft);
      supSave();
    }
    renderChips();
    updateLabels();
  }

  async function startSupport() {
    if (busy || (sup && sup.active)) return;
    busy = true;
    try {
      const saved = supSaved();
      const k = (saved && saved.k) || (crypto.randomUUID ? crypto.randomUUID() : "k" + Date.now().toString(16) + "-" + Math.random().toString(16).slice(2, 10) + "-4" + Math.random().toString(16).slice(2, 10) + "-a" + Math.random().toString(16).slice(2, 10) + "-" + Math.random().toString(16).slice(2, 14));
      const res = await fetch(SUPPORT_URL + "/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ k, lang: isEn() ? "en" : "ar", page: String(location.href).slice(0, 300) }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        sup = { k, sid: d.sid, seq: d.resumed && saved && saved.k === k ? (saved.seq || 0) : (d.seq || 0), active: false, staff: d.assigneeName || null };
        enterLive(!!d.resumed);
      } else {
        addMsg("bot", t().supportOffline);
      }
    } catch (e) {
      addMsg("bot", t().supportOffline);
    } finally {
      busy = false;
    }
  }

  async function endSupport() {
    if (busy || !sup || !sup.active) return;
    busy = true;
    try {
      await fetch(SUPPORT_URL + "/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ k: sup.k }),
      });
    } catch (e) { /* closed locally regardless */ }
    exitLive(true);
    busy = false;
  }

  async function sendSupport(text) {
    busy = true;
    const btn = box.querySelector(".syda-chat-in button");
    btn.disabled = true;
    try {
      const res = await fetch(SUPPORT_URL + "/msg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ k: sup.k, text }),
      });
      if (res.status === 410) { exitLive(true); return; }
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.ok !== true) addMsg("bot", t().supportOffline);
    } catch (e) {
      addMsg("bot", t().supportOffline);
    } finally {
      busy = false;
      btn.disabled = false;
      const i = box.querySelector(".syda-chat-in input");
      if (i) i.focus();
    }
  }

  async function pollSupport() {
    if (!sup || !sup.active) return;
    try {
      const res = await fetch(SUPPORT_URL + "/poll?k=" + encodeURIComponent(sup.k) + "&after=" + (sup.seq || 0), { cache: "no-store" });
      const d = await res.json().catch(() => null);
      if (!d || d.ok !== true) return;
      if (d.status === "none") { exitLive(true); return; }
      let fresh = false;
      (d.msgs || []).forEach((m) => {
        if (!m || (m.seq || 0) <= (sup.seq || 0)) return;
        sup.seq = m.seq;
        if (m.from === "staff") { addMsg("bot", (m.name ? "👤 " + m.name + "\n" : "") + m.text); fresh = true; }
        else if (m.from === "sys") {
          if (m.code === "joined") addMsg("bot", m.name ? t().supportJoined.replace("{name}", m.name) : t().supportJoinedNoName);
          else if (m.code === "closed") { sup.seq = m.seq; exitLive(true); }
        }
      });
      if (d.assigneeName && d.assigneeName !== sup.staff) { sup.staff = d.assigneeName; updateSupportHeader(); }
      supSave();
      if (fresh && !box.classList.contains("open")) fabBadge(true);
      if (d.status === "closed" && sup && sup.active) exitLive(true);
    } catch (e) { /* transient — next tick retries */ }
  }

  // ---------- cart integration (works with both app.js pages and product pages) ----------
  function addToCart(item) {
    try {
      if (!item || !(Number(item.price) > 0) || Number(item.price) > 999) return; // price-on-request items are never orderable via cart
      let cart = [];
      try { cart = JSON.parse(localStorage.getItem("sayda-cart") || "[]"); } catch (e) { }
      if (!Array.isArray(cart)) cart = [];
      const old = cart.find((x) => x && x.id === item.id);
      if (old) old.qty = (old.qty || 1) + 1;
      else cart.push({ id: item.id, name: item.name, nameEn: item.nameEn || item.name, price: Number(item.price) || 0, qty: 1 });
      localStorage.setItem("sayda-cart", JSON.stringify(cart));
      updateCounters(cart);
      // sync the page's own cart state when available
      try {
        if (typeof S !== "undefined" && S && typeof loadCart === "function") { S.cart = loadCart(); if (typeof save === "function") save(); if (typeof openCart === "function") openCart(); return; }
      } catch (e) { }
      try {
        if (typeof product !== "undefined" && typeof renderOrder === "function" && typeof save === "function") {
          (0, eval)("cart = " + JSON.stringify(cart));
          save();
          if (typeof openOrder === "function") openOrder();
          return;
        }
      } catch (e) { }
    } catch (e) { /* storage unavailable — silent */ }
  }

  function updateCounters(cart) {
    const qty = (cart || []).reduce((n, x) => n + (x && (x.qty || 1)), 0);
    document.querySelectorAll("#count,[data-count]").forEach((e) => { e.textContent = qty; });
  }

  // ---------- chat flow ----------
  async function send() {
    if (busy) return;
    const input = box.querySelector(".syda-chat-in input");
    const text = (input.value || "").trim();
    if (!text) return;
    input.value = "";
    addMsg("user", text);
    if (sup && sup.active) { sendSupport(text); return; } // live human-support mode
    history.push({ role: "user", content: text });
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);

    busy = true;
    const btn = box.querySelector(".syda-chat-in button");
    btn.disabled = true;
    const typing = showTyping();
    try {
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: history.slice(0, -1), lang: isEn() ? "en" : "ar" }),
      });
      let data = {};
      try { data = await res.json(); } catch (e) { }
      typing.remove();
      if (!res.ok && res.status !== 200) {
        const msg = (data && data.reply) || t().offline;
        addMsg("bot", msg);
      } else if (data.reply) {
        addMsg("bot", data.reply);
        addProducts(data.products || [], data.results || []);
        history.push({ role: "assistant", content: data.reply });
        if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
      } else {
        addMsg("bot", t().offline);
      }
    } catch (e) {
      typing.remove();
      addMsg("bot", t().offline);
    } finally {
      busy = false;
      btn.disabled = false;
      input.focus();
    }
  }

  function updateLabels() {
    const L = t();
    const ttl = box.querySelector(".ttl"); if (ttl) ttl.textContent = L.title;
    const sub = box.querySelector(".sub"); if (sub) sub.textContent = (sup && sup.active) ? (L.supportLive + (sup.staff ? " — " + sup.staff : "")) : L.subtitle;
    const ph = box.querySelector(".syda-chat-in input"); if (ph) ph.placeholder = L.placeholder;
    const btn = box.querySelector(".syda-chat-in button"); if (btn) btn.textContent = L.send;
    const sb = box.querySelector(".support-btn"); if (sb) sb.textContent = L.supportBtn;
    const kb = box.querySelector(".support-back"); if (kb) kb.textContent = L.supportBack;
    const eb = box.querySelector(".support-end"); if (eb) eb.textContent = L.supportEnd;
    renderChips();
  }

  function open() {
    box.classList.add("open");
    fab.style.display = "none";
    fabBadge(false);
    renderChips();
    const i = box.querySelector(".syda-chat-in input");
    if (i) i.focus();
  }
  function close() {
    box.classList.remove("open");
    fab.style.display = "flex";
  }

  fab.onclick = open;

  renderShell();
  // site-ui.js re-applies language on DOMContentLoaded and dispatches 'languagechange';
  // only refresh labels so the conversation is never wiped.
  window.addEventListener("languagechange", updateLabels);
})();
