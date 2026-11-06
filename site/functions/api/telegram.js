/**
 * Syda store — Telegram webhook (Pages Function): /api/telegram
 *
 * Bot: @sydasupports_bot — customer-service relay between site visitors and the team.
 * The visitor chats on the website; staff chat in Telegram. No Telegram account
 * is needed by the visitor — this webhook mirrors messages both ways via KV.
 *
 * Roles (all staff must /start the bot once; the superadmin grants permissions):
 *   superadmin — everything + /role to delegate admin/coadmin permissions
 *   admin      — reply to any conversation + /assign conversations to coadmins
 *   coadmin    — customer service: replies to conversations assigned to them,
 *                can take unassigned conversations via /open
 *
 * Commands:
 *   /start /help          — role-aware help
 *   /id                   — your Telegram id (needed for role delegation)
 *   /chats                — open conversations (coadmin: unassigned + own)
 *   /open SID             — take/transfer a conversation and bind it as current
 *   /assign SID ID        — assign a conversation to a coadmin (admin+)
 *   /close [SID]          — close a conversation (default: current) — /done alias
 *   /leave                — unbind current conversation without closing
 *   /role ID admin|coadmin|none — delegate permissions (superadmin only)
 *   /admins               — list the team and their roles (admin+)
 * Plain text  — replies to the bound (current) conversation.
 */

import {
  SUPERADMIN_SEED, ROLE_AR, json, escHtml, validK,
  kvGet, getRoles, putRoles, roleOf, allStaffIds,
  getSession, putSession, getOpenKeys, removeFromOpen,
  loadMsgs, pushMsg,
  getStaff, putStaff,
  tgCall, tgSend, tgAnswerCallback,
} from "./support-lib.js";

const CMDS = [
  "/chats — المحادثات المفتوحة",
  "/open SID — فتح محادثة والرد عليها",
  "/assign SID ID — إسناد محادثة لكوأدمين",
  "/close SID — إغلاق محادثة (أو /done للمحادثة الحالية)",
  "/leave — فك الارتباط بالمحادثة الحالية",
  "/id — معرّفك التيليغرامي",
];

const HELP_BY_ROLE = {
  superadmin: CMDS.concat([
    "/role ID admin|coadmin|none — تفويض الصلاحيات",
    "/admins — فريق الدعم والأدوار",
  ]),
  admin: CMDS.concat(["/admins — فريق الدعم والأدوار"]),
  coadmin: CMDS,
  none: [],
};

function helpText(role, id) {
  if (role === "none") {
    return (
      "🛡 هذا بوت <b>فريق خدمة عملاء متجر صيدة</b>.\n\n" +
      "وصولك مقيّد حالياً. أرسل معرّفك التالي للسوبر أدمين لتفعيل صلاحيتك:\n" +
      `<code>${escHtml(id)}</code>`
    );
  }
  const lines = HELP_BY_ROLE[role].map((l) => "• " + escHtml(l)).join("\n");
  return `👋 <b>بوت دعم صيدة</b>\nصلاحيتك: <b>${ROLE_AR[role]}</b>\n\n${lines}\n\nاكتب أي نص للرد على المحادثة المرتبطة بك (افتحها بـ /open SID).`;
}

function ago(ts) {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "الآن";
  if (s < 3600) return Math.floor(s / 60) + " د";
  if (s < 86400) return Math.floor(s / 3600) + " س";
  return Math.floor(s / 86400) + " ي";
}

async function closeSession(env, sess, byName) {
  sess.status = "closed";
  sess.updatedAt = Date.now();
  await putSession(env.SUPPORT_KV, sess);
  await pushMsg(env.SUPPORT_KV, sess.k, "sys", "", { code: "closed" });
  await removeFromOpen(env.SUPPORT_KV, sess.k);
}

async function findSessionBySid(env, sid) {
  const keys = await getOpenKeys(env.SUPPORT_KV);
  const open = await Promise.all(keys.map((k) => kvGet(env.SUPPORT_KV, "sess:" + k)));
  return open.find((s) => s && s.sid === String(sid).toUpperCase()) || null;
}

/** Recent visitor messages shown to staff when opening a conversation. */
async function recentVisitorText(env, k, lang) {
  const msgs = await loadMsgs(env.SUPPORT_KV, k);
  const recent = msgs.list.filter((m) => m.from === "visitor").slice(-5);
  if (!recent.length) return lang === "en" ? "(no messages yet)" : "(لا رسائل بعد)";
  return recent.map((m) => "👤 " + escHtml(m.text.slice(0, 200))).join("\n");
}

// ---------- command handlers ----------

async function cmdChats(env, from, role) {
  const keys = await getOpenKeys(env.SUPPORT_KV);
  if (!keys.length) return await tgSend(env, from.id, "📭 لا توجد محادثات مفتوحة حالياً.");
  const open = (await Promise.all(keys.map((k) => kvGet(env.SUPPORT_KV, "sess:" + k))))
    .filter((s) => s && s.status === "open");
  let list = open;
  if (role === "coadmin") {
    const me = String(from.id);
    list = open.filter((s) => !s.assignee || String(s.assignee) === me);
  }
  if (!list.length) return await tgSend(env, from.id, "📭 لا توجد محادثات متاحة لك (المسندة لك فقط ككوأدمين).");
  list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const rows = list.slice(0, 15).map((s) => {
    const assignee = s.assignee ? (escHtml(s.assigneeName || "وكيل")) : "—";
    return `#${escHtml(s.sid)} · ${s.lang === "en" ? "EN" : "ع"} · نشاط ${ago(s.updatedAt || s.createdAt)} · وكيل: ${assignee}`;
  });
  const buttons = list.slice(0, 10).map((s) => [{ text: "💬 " + s.sid, callback_data: "open:" + s.sid }]);
  await tgSend(env, from.id, "📋 <b>المحادثات المفتوحة</b>\n" + rows.join("\n"), {
    reply_markup: { inline_keyboard: buttons },
  });
}

async function cmdOpen(env, from, role, sid, callbackId) {
  const sess = await findSessionBySid(env, sid);
  if (!sess) {
    if (callbackId) await tgAnswerCallback(env, callbackId, "لم يتم العثور على المحادثة");
    return await tgSend(env, from.id, `❌ لا توجد محادثة مفتوحة بالمعرّف ${escHtml(sid)}. جرّب /chats`);
  }
  const me = String(from.id);
  if (role === "coadmin" && sess.assignee && String(sess.assignee) !== me) {
    if (callbackId) await tgAnswerCallback(env, callbackId, "محادثة مُسندة لوكيل آخر");
    return await tgSend(env, from.id, `🔒 #${sess.sid} مُسندة لوكيل آخر — الكوأدمين يرد على المحادثات المسندة له فقط.`);
  }
  if (sess.status !== "open") {
    if (callbackId) await tgAnswerCallback(env, callbackId, "المحادثة مغلقة");
    return await tgSend(env, from.id, `🔒 #${sess.sid} مغلقة بالفعل.`);
  }

  const name = (from.first_name || from.username || "وكيل").slice(0, 60);
  const wasUnassigned = !sess.assignee;
  const previous = sess.assigneeName || null;
  sess.assignee = me;
  sess.assigneeName = name;
  sess.updatedAt = Date.now();
  await putSession(env.SUPPORT_KV, sess);
  await pushMsg(env.SUPPORT_KV, sess.k, "sys", "", { code: "joined", name });
  await putStaff(env.SUPPORT_KV, me, { cur: sess.k, name, lastSeen: Date.now() });

  const context = await recentVisitorText(env, sess.k, sess.lang);
  const header =
    `✅ أنت الآن ترد على <b>#${escHtml(sess.sid)}</b>` +
    (wasUnassigned ? "" : ` (نُقلت من ${escHtml(previous || "وكيل")})`) +
    `\n🌐 ${sess.lang === "en" ? "English" : "العربية"} · ${sess.page ? "من: " + escHtml(shortPage(sess.page)) : ""}\n\n` +
    `آخر رسائل الزائر:\n${context}\n\nاكتب رسالتك الآن — ستظهر للزائر مباشرة. عند الانتهاء: /done`;
  if (callbackId) await tgAnswerCallback(env, callbackId, "تم فتح " + sess.sid);
  return await tgSend(env, from.id, header);
}

function shortPage(url) {
  try {
    const u = new URL(url);
    return u.pathname.length > 30 ? u.pathname.slice(0, 30) + "…" : u.pathname;
  } catch (e) {
    return String(url).slice(0, 30);
  }
}

async function cmdAssign(env, from, role, sid, targetId) {
  const sess = await findSessionBySid(env, sid);
  if (!sess) return await tgSend(env, from.id, `❌ لا توجد محادثة بالمعرّف ${escHtml(sid)}.`);
  const targetRole = await roleOf(env.SUPPORT_KV, targetId);
  if (targetRole === "none") {
    return await tgSend(env, from.id, `❌ <code>${escHtml(targetId)}</code> ليس من فريق الدعم — أعطه صلاحية أولاً (كوأدمين أو أدمن).`);
  }
  const targetStaff = await getStaff(env.SUPPORT_KV, targetId);
  const name = targetStaff.name || "الوكيل";
  sess.assignee = String(targetId);
  sess.assigneeName = name;
  sess.updatedAt = Date.now();
  await putSession(env.SUPPORT_KV, sess);
  await pushMsg(env.SUPPORT_KV, sess.k, "sys", "", { code: "joined", name });
  const context = await recentVisitorText(env, sess.k, sess.lang);
  await putStaff(env.SUPPORT_KV, String(targetId), { ...targetStaff, cur: sess.k, lastSeen: Date.now() });
  await tgSend(env, targetId, `📋 أُسندت إليك محادثة <b>#${escHtml(sess.sid)}</b>:\n${context}\n\nاكتب ردك مباشرة هنا. عند الانتهاء: /done`);
  return await tgSend(env, from.id, `✅ تم إسناد #${escHtml(sess.sid)} إلى ${escHtml(name)} (${ROLE_AR[targetRole]}).`);
}

async function cmdClose(env, from, role, sid) {
  const me = String(from.id);
  let sess = sid ? await findSessionBySid(env, sid) : null;
  if (!sess && !sid) {
    const staff = await getStaff(env.SUPPORT_KV, me);
    if (staff.cur) sess = await getSession(env.SUPPORT_KV, staff.cur);
  }
  if (!sess) return await tgSend(env, from.id, "❌ حدد محادثة: /close SID (أو افتح محادثة أولاً بـ /open).");
  if (sess.status !== "open") return await tgSend(env, from.id, `#${sess.sid} مغلقة بالفعل.`);
  if (role === "coadmin" && String(sess.assignee) !== me) {
    return await tgSend(env, from.id, "🔒 الكوأدمين يغلق محادثاته المسندة فقط.");
  }
  await closeSession(env, sess, "staff");
  const staff = await getStaff(env.SUPPORT_KV, me);
  if (staff.cur === sess.k) await putStaff(env.SUPPORT_KV, me, { ...staff, cur: null });
  if (sess.assignee && String(sess.assignee) !== me) {
    await tgSend(env, sess.assignee, `✅ #${escHtml(sess.sid)} أُغلقت بواسطة ${escHtml(from.first_name || "الأدمن")}.`);
  }
  return await tgSend(env, from.id, `✅ أُغلقت المحادثة #${escHtml(sess.sid)} — شكراً لك!`);
}

async function cmdRole(env, from, role, args) {
  if (role !== "superadmin") {
    return await tgSend(env, from.id, "🔒 تفويض الصلاحيات متاح للسوبر أدمين فقط.");
  }
  const parts = args.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    const staff = await allStaffIds(env.SUPPORT_KV);
    return await tgSend(env, from.id, "الاستخدام: <code>/role ID admin|coadmin|none</code>");
  }
  const targetId = parts[0].replace(/[^\d]/g, "");
  const action = (parts[1] || "").toLowerCase();
  if (!targetId || !["admin", "coadmin", "none"].includes(action)) {
    return await tgSend(env, from.id, "الاستخدام: <code>/role ID admin|coadmin|none</code>");
  }
  if (targetId === SUPERADMIN_SEED && action !== "admin") {
    return await tgSend(env, from.id, "⚠️ السوبر أدمين الرئيسي ثابت ولا يُخفض.");
  }
  const roles = await getRoles(env.SUPPORT_KV);
  roles.admins.delete(targetId);
  roles.coadmins.delete(targetId);
  if (action === "admin") roles.admins.add(targetId);
  if (action === "coadmin") roles.coadmins.add(targetId);
  await putRoles(env.SUPPORT_KV, roles);
  const targetStaff = await getStaff(env.SUPPORT_KV, targetId);
  await tgSend(env, targetId, `🔔 تم تحديث صلاحيتك في بوت دعم صيدة: <b>${ROLE_AR[action] === "بدون صلاحية" ? "بدون صلاحية" : ROLE_AR[action]}</b>. أرسل /help للاطلاع على الأوامر.`);
  return await tgSend(env, from.id, `✅ صلاحية <code>${targetId}</code> أصبحت: <b>${ROLE_AR[action]}</b>`);
}

async function cmdAdmins(env, from, role) {
  if (role === "none" || role === "coadmin") {
    return await tgSend(env, from.id, "🔒 متاح للأدمن فأعلى.");
  }
  const staff = await allStaffIds(env.SUPPORT_KV);
  const fmt = (ids, label) => ids.length ? `\n<b>${label}</b>:\n` + ids.map((i) => "<code>" + escHtml(i) + "</code>").join("\n") : "";
  const text = "👥 <b>فريق دعم صيدة</b>" + fmt(staff.superadmins, "سوبر أدمين") + fmt(staff.admins, "أدمن") + fmt(staff.coadmins, "كوأدمين");
  await tgSend(env, from.id, text);
}

async function cmdLeave(env, from) {
  const me = String(from.id);
  const staff = await getStaff(env.SUPPORT_KV, me);
  if (!staff.cur) return await tgSend(env, from.id, "لا توجد محادثة مرتبطة بك حالياً.");
  await putStaff(env.SUPPORT_KV, me, { ...staff, cur: null });
  return await tgSend(env, from.id, "↩️ تم فك الارتباط بالمحادثة الحالية (لم تُغلق).");
}

// ---------- plain-text reply routing ----------

async function handleReply(env, from, role, text) {
  const me = String(from.id);
  const staff = await getStaff(env.SUPPORT_KV, me);
  const name = (from.first_name || from.username || "وكيل").slice(0, 60);
  await putStaff(env.SUPPORT_KV, me, { ...staff, name, lastSeen: Date.now() });

  if (!staff.cur) {
    return await tgSend(env, from.id, "📌 لا توجد محادثة مرتبطة بك. اعرض المفتوحة بـ /chats ثم افتح واحدة بـ /open SID.");
  }
  const sess = await getSession(env.SUPPORT_KV, staff.cur);
  if (!sess || sess.status !== "open") {
    await putStaff(env.SUPPORT_KV, me, { ...staff, cur: null });
    return await tgSend(env, from.id, "🔒 المحادثة المرتبطة بك لم تعد مفتوحة. جرّب /chats");
  }
  if (role === "coadmin" && String(sess.assignee) !== me) {
    return await tgSend(env, from.id, `🔒 #${escHtml(sess.sid)} مُسندة لوكيل آخر — ردودك تُرسل لمحادثاتك فقط.`);
  }
  await pushMsg(env.SUPPORT_KV, sess.k, "staff", text, { name });
  // keep the session "current" — staff may send several messages in a row
}

// ---------- update dispatch ----------

async function handleUpdate(env, update) {
  // inline button: open:<sid>
  const cb = update.callback_query;
  if (cb && cb.data && cb.data.startsWith("open:")) {
    const from = cb.from || {};
    const role = await roleOf(env.SUPPORT_KV, from.id);
    if (role === "none") return await tgAnswerCallback(env, cb.id, "غير مصرح — تواصل مع السوبر أدمين");
    await cmdOpen(env, from, role, cb.data.slice(5), cb.id);
    return;
  }

  const message = update.message;
  if (!message || !message.text) {
    // staff sending photos/voice → polite hint (text-only relay)
    if (message && message.from) {
      await tgSend(env, message.from.id, "📩 حالياً يدعم البوت الرسائل النصية فقط — أرسل نصاً.");
    }
    return;
  }
  const from = message.from || {};
  const id = String(from.id);
  const text = String(message.text || "").trim();
  const role = await roleOf(env.SUPPORT_KV, id);

  const staff = await getStaff(env.SUPPORT_KV, id);
  await putStaff(env.SUPPORT_KV, id, { ...staff, name: (from.first_name || from.username || "").slice(0, 60), lastSeen: Date.now() });

  if (/^\/(start|help)$/i.test(text)) return await tgSend(env, id, helpText(role, id));
  if (/^\/id$/i.test(text)) {
    return await tgSend(env, id, `🆔 معرّفك: <code>${escHtml(id)}</code>\nصلاحيتك: <b>${ROLE_AR[role]}</b>`);
  }
  if (role === "none") return await tgSend(env, id, helpText("none", id));

  if (/^\/chats?$/i.test(text)) return await cmdChats(env, from, role);
  if (/^\/open\s+(\S+)/i.test(text)) return await cmdOpen(env, from, role, text.match(/^\/open\s+(\S+)/i)[1], null);
  if (/^\/(open|chat)$/i.test(text)) return await tgSend(env, id, "الاستخدام: /open SID — خذ المعرف من /chats");
  if (/^\/assign\s+(\S+)\s+(\d+)/i.test(text)) {
    const m = text.match(/^\/assign\s+(\S+)\s+(\d+)/i);
    if (role === "coadmin") return await tgSend(env, id, "🔒 الإسناد متاح للأدمن فأعلى.");
    return await cmdAssign(env, from, role, m[1], m[2]);
  }
  if (/^\/(close|done)(\s+\S+)?$/i.test(text)) {
    const m = text.match(/^\/(?:close|done)(?:\s+(\S+))?$/i);
    return await cmdClose(env, from, role, m[1] || null);
  }
  if (/^\/leave$/i.test(text)) return await cmdLeave(env, from);
  if (/^\/role(\s|$)/i.test(text)) return await cmdRole(env, from, role, text.replace(/^\/role\s*/i, ""));
  if (/^\/admins?$/i.test(text)) return await cmdAdmins(env, from, role);

  return await handleReply(env, from, role, text.slice(0, 1000));
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // webhook authenticity: secret token set at setWebhook time
  const secret = env.TG_WEBHOOK_SECRET;
  if (secret && request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== secret) {
    return json(403, { ok: false });
  }

  let update;
  try {
    update = await request.json();
  } catch (e) {
    return json(400, { ok: false });
  }
  if (!update || typeof update !== "object") return json(400, { ok: false });

  try {
    await handleUpdate(env, update);
  } catch (e) {
    // never fail the webhook — Telegram would retry endlessly; errors surface in logs
    console.error("tg_webhook_error", (e && e.stack) || String(e));
  }
  return json(200, { ok: true });
}

export async function onRequest() {
  return json(405, { ok: false, error: "method_not_allowed" });
}
