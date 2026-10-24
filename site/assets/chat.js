/* Syda Chat Widget — multilingual AI shopping assistant for syda.pages.dev
 * Visual identity matches the store: green #087a4b / dark #06452f / gold #d4a72c / cream #fffaf0, Cairo font.
 * Talks to the syda-chat Worker (deterministic catalog retrieval + validated AI answers — no hallucinated products/links).
 */
(() => {
  "use strict";

  const WORKER_URL = "https://syda-chat.balbolghol-ai.workers.dev/chat";
  const MAX_HISTORY = 10;

  const AR = {
    title: "مساعد صيدة",
    subtitle: "يجيبك بلغتك ويدلك على المنتج المناسب",
    online: "متصل الآن",
    placeholder: "اكتب سؤالك عن أي منتج…",
    send: "إرسال",
    welcome: "مرحباً بك في متجر صيدة! 🌟\nأنا مساعدك الذكي — اسألني عن أي منتج تحتاجه بأي لغة، وسأدلك على المنتج المناسب فوراً.",
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
  };
  const EN = {
    title: "Syda Assistant",
    subtitle: "Answers in your language, guides you to the right product",
    online: "Online",
    placeholder: "Ask me about any product…",
    send: "Send",
    welcome: "Welcome to Syda! 🌟\nI'm your smart assistant — ask me about any product you need, in any language, and I'll point you to it right away.",
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
.syda-chat-fab{position:fixed;bottom:20px;right:20px;width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#0c8b57,#06452f);color:#fff;border:0;cursor:pointer;box-shadow:0 6px 20px rgba(6,69,47,.35);z-index:80;display:flex;align-items:center;justify-content:center;transition:transform .2s}
.syda-chat-fab:hover{transform:scale(1.08)}
.syda-chat-fab svg{width:27px;height:27px;fill:#fff}
.syda-chat-fab .dot{position:absolute;top:2px;left:2px;width:13px;height:13px;border-radius:50%;background:#d4a72c;border:2px solid #fff}
.syda-chat-box{position:fixed;bottom:90px;right:20px;width:372px;max-width:calc(100vw - 24px);height:min(560px,calc(100vh - 120px));background:#fff;border-radius:18px;box-shadow:0 12px 40px rgba(6,69,47,.28);z-index:81;display:none;flex-direction:column;overflow:hidden;border:1px solid #ebdfbd;font-family:Cairo,Arial,Tahoma,sans-serif}
.syda-chat-box.open{display:flex}
.syda-chat-head{background:linear-gradient(110deg,#06452f,#0c8b57);color:#fff;padding:13px 16px;display:flex;align-items:center;gap:11px;flex-direction:row}
.syda-chat-head .avatar{width:40px;height:40px;border-radius:50%;background:#d4a72c;display:flex;align-items:center;justify-content:center;font-size:20px;flex:none}
.syda-chat-head .meta{flex:1;min-width:0}
.syda-chat-head .ttl{font-weight:bold;font-size:15px}
.syda-chat-head .sub{font-size:11px;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;direction:rtl}
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
.syda-chat-in{display:flex;gap:8px;padding:10px;border-top:1px solid #ebdfbd;background:#fff}
.syda-chat-in input{flex:1;border:1.5px solid #dfcf9c;border-radius:22px;padding:10px 14px;font:inherit;font-size:13px;outline:none;background:#fffaf0}
.syda-chat-in input:focus{border-color:#087a4b}
.syda-chat-in button{background:#d4a72c;color:#17251e;border:0;border-radius:22px;padding:10px 16px;font:inherit;font-weight:bold;cursor:pointer}
.syda-chat-in button:disabled{opacity:.5;cursor:default}
@media(max-width:600px){.syda-chat-box{right:8px;left:8px;width:auto;bottom:84px}}
`;

  // ---------- state ----------
  let history = [];          // [{role, content}] — sent to the worker for context
  let busy = false;
  let welcomed = false;

  // ---------- dom ----------
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  const fab = document.createElement("button");
  fab.className = "syda-chat-fab";
  fab.setAttribute("aria-label", "chat");
  fab.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 3C6.98 3 3 6.36 3 10.5c0 2.24 1.18 4.25 3.05 5.62-.13 1.06-.55 2.3-1.5 3.44-.24.28.06.77.5.64 1.9-.55 3.5-1.5 4.63-2.4.72.12 1.5.2 2.32.2 5.02 0 9-3.36 9-7.5S17.02 3 12 3z"/></svg><span class="dot"></span>`;
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
        <div class="avatar">🛍️</div>
        <div class="meta">
          <div class="ttl">${L.title}</div>
          <div class="sub">${L.subtitle}</div>
          <div class="st"><i></i>${L.online}</div>
        </div>
        <button class="syda-chat-x" aria-label="${L.closeChat}">×</button>
      </div>
      <div class="syda-chat-msgs"></div>
      <div class="chips"></div>
      <div class="chat-note">${L.poweredBy}</div>
      <div class="syda-chat-in">
        <input type="text" maxlength="500" placeholder="${L.placeholder}" aria-label="${L.placeholder}">
        <button>${L.send}</button>
      </div>`;
    box.querySelector(".syda-chat-x").onclick = close;
    box.querySelector(".syda-chat-in button").onclick = send;
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
    const card = document.createElement("div");
    card.className = "chat-card";
    card.innerHTML = `
      <img src="${esc(p.image || "/assets/logo.png")}" alt="${esc(name)}" loading="lazy" onerror="this.onerror=null;this.src='/assets/logo.png'">
      <div class="cinfo">
        <div class="cname">${esc(name)}</div>
        <div class="cprice">${fmtPrice(p.price)}${p.oldPrice && p.oldPrice > p.price ? `<span class="old">${fmtPrice(p.oldPrice)}</span>` : ""}</div>
      </div>
      <div class="cbtns">
        <a class="cbtn view" href="${esc(p.url)}">${L.viewDetails}</a>
        <button class="cbtn add">${L.addToCart}</button>
      </div>`;
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

  // ---------- cart integration (works with both app.js pages and product pages) ----------
  function addToCart(item) {
    try {
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
    const sub = box.querySelector(".sub"); if (sub) sub.textContent = L.subtitle;
    const ph = box.querySelector(".syda-chat-in input"); if (ph) ph.placeholder = L.placeholder;
    const btn = box.querySelector(".syda-chat-in button"); if (btn) btn.textContent = L.send;
    renderChips();
  }

  function open() {
    box.classList.add("open");
    fab.style.display = "none";
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
