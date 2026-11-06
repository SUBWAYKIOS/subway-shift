// ===========================================================================
// 🏢 VĂN PHÒNG ẢO (v55) — quán dựng 3D, mỗi người một nhân vật chibi.
// ---------------------------------------------------------------------------
// 'ofav'   = { empId | 'm': { a: {nhân vật}, at } }                  — nhân vật của từng người
// 'ofchat' = { list: [{ id, f, m, e, to, at }], cnt: { 'YYYY-MM': { người: số tin } } }
// 'ofxp'   = { fin: 'YYYY-MM' (tháng cuối đã cộng vào tot), tot: { empId: điểm } }
// 'ofcfg'  = { layout: 'auto' | 'otagawa' | 'basic' }               — quản lý chọn bố cục phòng
// Điểm thành tích TỰ TÍNH từ dữ liệu sẵn có (điểm danh, lịch, checklist, lời cảm ơn, tin nhắn) — nhân viên
// không tự cộng được. Cấp (Lv) mở khoá phụ kiện / kiểu tóc / thú cưng. Máy chủ kiểm lại khi lưu nhân vật.
// ===========================================================================
var OFC_AV_SPEC_ = { h: 2, b: 2, sk: 7, fs: 2, ey: 7, ec: 5, br: 4, mo: 6, fx: 3, hs: 11, hc: 11, of: 5, oc: 11, pc: 5, ac: 12, pet: 3, uw: 1, ef: 4 };
var OFC_LOCK_ = { ac: { 7: 2, 8: 3, 9: 4, 10: 5, 11: 7, 12: 9 }, pet: { 1: 3, 2: 5, 3: 6 }, hs: { 10: 4, 11: 6 }, of: { 5: 3 }, ef: { 1: 3, 2: 5, 3: 7, 4: 9 } };
var OFC_LV_ = [0, 40, 100, 180, 280, 400, 550, 730, 950, 1200];
var OFC_EMOJI_ = ['👍', '🎉', '💪', '😂', '🙏', '❤️', '👋', '☕', '🥪', '😴', '🔥', '✨'];
var OFC_BADGES_ = [
  { k: 'early', i: '🌅', goal: 5 }, { k: 'hard', i: '💪', goal: 10 }, { k: 'loved', i: '💚', goal: 3 },
  { k: 'team', i: '🤝', goal: 3 }, { k: 'tidy', i: '✅', goal: 20 }, { k: 'chat', i: '💬', goal: 5 }, { k: 'help', i: '✈', goal: 1 }];

function ofcObj_(key) { var o = readJsonKey_(key); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; }
function ofcYm_(offset) { return thxYm_(offset || 0); }
function ofcLevel_(xp) { var lv = 1; for (var i = 1; i < OFC_LV_.length; i++) if (xp >= OFC_LV_[i]) lv = i + 1; return lv; }
function ofcWho_(who) { return who.r === 'mgr' ? (who.dl ? String(who.dl) : 'm') : String(who.e); }

/** Chuẩn hoá nhân vật: số nguyên trong khoảng cho phép; món chưa mở khoá → về mặc định. */
function ofcAvNorm_(a, lv, gift) {
  var out = {}; gift = gift || {};
  a = a && typeof a === 'object' ? a : {};
  Object.keys(OFC_AV_SPEC_).forEach(function (k) {
    if (k === 'ef' && a.ef == null) return;          // hiệu ứng chưa chọn = tự động theo cấp
    var v = Math.round(Number(a[k]));
    if (!isFinite(v) || v < 0 || v > OFC_AV_SPEC_[k]) v = (k === 'uw' ? 1 : 0);
    var need = (OFC_LOCK_[k] || {})[v];
    if (need && lv < need && (gift[k] || []).indexOf(v) === -1) v = 0;
    out[k] = v;
  });
  return out;
}

/** Điểm của MỘT tháng cho mọi người: { empId: { xp, n: { in, on, hk, tr, ts, ch, sup } } } */
function ofcMonthXp_(ym, emps, chatCnt) {
  var att = ofcObj_('att:' + ym), sched = readMonthNormalized_('schedule:' + ym, emps);
  var hk = ofcObj_('hk:' + ym), thx = ofcObj_('thx:' + ym), cfg = attCfg_(), grace = Number(cfg.grace) || 5;
  var today = todayStr_(), now = Date.now(), out = {};
  var attUsed = Object.keys(att).some(function (d) { return att[d] && Object.keys(att[d]).length; });
  emps.forEach(function (e) { out[e.id] = { xp: 0, n: { 'in': 0, on: 0, hk: 0, tr: 0, ts: 0, ch: 0, sup: 0 } }; });
  var nd = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate();
  for (var d = 1; d <= nd; d++) {
    var ymd = ym + '-' + ('0' + d).slice(-2);
    if (ymd > today) break;
    var dm = sched[String(d)] || {}, da = att[String(d)] || {};
    emps.forEach(function (e) {
      var o = out[e.id], en = dm[e.id], l = Array.isArray(da[e.id]) ? da[e.id] : [];
      var shifts = en && !en.off && en.shifts ? en.shifts : [];
      var home = shifts.filter(function (x) { return !x.isSupport; }), sup = shifts.filter(function (x) { return x.isSupport; });
      var dayStart = attDayStart_(ymd);
      if (sup.length && dayStart + Number(sup[0].start) * 3600000 < now) o.n.sup++;
      var firstIn = null; l.forEach(function (p) { if (p.k === 'in' && firstIn == null) firstIn = p.t; });
      if (firstIn != null) {
        o.n['in']++;
        if (home.length && firstIn <= dayStart + Number(home[0].start) * 3600000 + grace * 60000) o.n.on++;
      } else if (!attUsed && home.length && dayStart + Number(home[home.length - 1].end) * 3600000 < now) o.n['in']++;
    });
    var hd = hk[('0' + d).slice(-2)] || {};
    Object.keys(hd).forEach(function (id) { var by = hd[id] && String(hd[id].by || ''); if (out[by]) out[by].n.hk++; });
  }
  (Array.isArray(thx.list) ? thx.list : []).forEach(function (x) {
    if (out[x.t]) out[x.t].n.tr++;
    if (out[x.f]) out[x.f].n.ts++;
  });
  var cc = (chatCnt || {})[ym] || {};
  Object.keys(out).forEach(function (id) {
    var n = out[id].n; n.ch = Number(cc[id]) || 0;
    out[id].xp = n['in'] * 10 + n.on * 5 + Math.min(n.hk, 40) * 2 + n.tr * 8 + Math.min(n.ts, 10) * 3 + Math.min(n.ch, 20) + n.sup * 15;
  });
  return out;
}

/** Điểm tích luỹ (các tháng đã qua, lưu sẵn) + tháng này (tính lại, nhớ tạm 5 phút). */
function ofcXp_(emps, chat) {
  var cur = ofcYm_(0), prev = ofcYm_(-1), c = CacheService.getScriptCache(), ck = 'ofxp:' + cur;
  var hit = c.get(ck); if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  var st = ofcObj_('ofxp');
  if (st.fin !== prev) {
    // Cộng (các) tháng đã xong vào tổng. Lần đầu: chỉ cộng tháng trước — khởi đầu ai cũng có chút điểm.
    var tot = st.tot && typeof st.tot === 'object' ? st.tot : {};
    var from = st.fin && st.fin < prev ? st.fin : null, ms = [];
    if (!from) ms = [prev];
    else { var y = Number(from.slice(0, 4)), m = Number(from.slice(5, 7)); for (var g = 0; g < 12; g++) { m++; if (m > 12) { m = 1; y++; } var s = y + '-' + ('0' + m).slice(-2); if (s > prev) break; ms.push(s); } }
    ms.forEach(function (ym) {
      var mx = ofcMonthXp_(ym, emps, chat.cnt);
      Object.keys(mx).forEach(function (id) { tot[id] = (Number(tot[id]) || 0) + mx[id].xp; });
    });
    st = { fin: prev, tot: tot };
    try { kvSet_('ofxp', JSON.stringify(st), 'văn phòng: điểm', false, true); } catch (e) {}
  }
  var now = ofcMonthXp_(cur, emps, chat.cnt), out = {}, gr = ofcGrants_();
  Object.keys(now).forEach(function (id) {
    now[id].n.gm = ofcGameXp_(cur, id); now[id].xp += now[id].n.gm;
    now[id].n.gr = Number((gr[id] || {}).xp) || 0;
    var xp = Math.max(0, (Number((st.tot || {})[id]) || 0) + now[id].xp + now[id].n.gr);
    out[id] = { xp: xp, lv: ofcLevel_(xp), mx: now[id].xp, n: now[id].n };
  });
  try { c.put(ck, JSON.stringify(out), 300); } catch (e) {}
  return out;
}
function ofcXpBust_() { try { CacheService.getScriptCache().remove('ofxp:' + ofcYm_(0)); } catch (e) {} }

function ofcBadges_(n) {
  var v = { early: n.on, hard: n['in'], loved: n.tr, team: n.ts, tidy: n.hk, chat: n.ch, help: n.sup };
  return OFC_BADGES_.map(function (b) { return { k: b.k, i: b.i, goal: b.goal, n: Math.min(b.goal, Number(v[b.k]) || 0) }; });
}

/** Ngày sinh hôm nay (chỉ tên — không lộ năm / tuổi). Nhớ tạm 6 giờ. */
function ofcBirthdays_(emps) {
  var md = todayStr_().slice(5), c = CacheService.getScriptCache(), ck = 'ofbd:' + todayStr_();
  var hit = c.get(ck); if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  var out = [];
  emps.forEach(function (e) { try { var b = String(hrGet_(e.id).birth || ''); if (b && b.slice(5) === md) out.push(e.id); } catch (er) {} });
  try { c.put(ck, JSON.stringify(out), 21600); } catch (e) {}
  return out;
}

/** Trạng thái hôm nay của một người: in (đang làm) · brk (nghỉ giải lao) · out (đã về) · soon (≤ 60 phút nữa vào) ·
 *  later (hôm nay có ca, còn lâu) · late (tới giờ mà chưa bấm thẻ) · sup (đi chi viện quán khác) · '' (không có ca). */
function ofcStatus_(sh, l, attOn, now, dayStart) {
  var home = sh.filter(function (x) { return !x.isSupport; }), sup = sh.filter(function (x) { return x.isSupport; });
  var last = l.length ? String(l[l.length - 1].k) : '';
  if (last === 'in' || last === 'be') return 'in';
  if (last === 'bs') return 'brk';
  if (last === 'out') return 'out';
  var hrs = (now - dayStart) / 3600000;
  if (sup.length && hrs >= Number(sup[0].start) && hrs < Number(sup[sup.length - 1].end)) return 'sup';
  if (!home.length) return sup.length ? 'sup' : '';
  var st = Number(home[0].start), en = Number(home[home.length - 1].end);
  if (hrs < st) return st - hrs <= 1 ? 'soon' : 'later';
  if (hrs >= en) return 'out';
  if (attOn) return 'late';
  for (var i = 0; i < home.length; i++) {
    var x = home[i];
    if (hrs >= Number(x.start) && hrs < Number(x.end)) {
      if (x.breakStart != null && x.breakEnd != null && hrs >= Number(x.breakStart) && hrs < Number(x.breakEnd)) return 'brk';
      return 'in';
    }
  }
  return 'brk';      // giữa hai khúc ca
}

/** Ai đang mở app (mỗi người một ô nhớ tạm 5 phút — không ghi bảng tính, không tranh nhau ghi). */
function ofcSeen_(id) { try { CacheService.getScriptCache().put('ofon:' + id, String(Date.now()), 300); } catch (e) {} }
function ofcOnline_(ids) {
  var out = {}, now = Date.now();
  try {
    var got = CacheService.getScriptCache().getAll(ids.map(function (id) { return 'ofon:' + id; }));
    ids.forEach(function (id) { var t = Number(got['ofon:' + id]); if (t && now - t < 150000) out[id] = t; });
  } catch (e) {}
  return out;
}
/** Nhịp "đang mở app" (gọi mỗi phút khi app đang mở ở tab bất kỳ). */
function officeHere(token) { var who = auth_(token); ofcSeen_(ofcWho_(who)); return 1; }

/** Mọi thứ quán ảo cần, MỘT lần gọi. */
function officeState(token) {
  var who = auth_(token), me = ofcWho_(who), mgr = who.r === 'mgr';
  ofcSeen_(me);
  var emps = readEmployees_(), now = Date.now(), ymd = todayStr_(), ym = ymd.slice(0, 7), d = String(Number(ymd.slice(8)));
  var dayStart = attDayStart_(ymd), cfg = attCfg_(), attOn = !!cfg.on;
  var sched = readMonthNormalized_('schedule:' + ym, emps);
  if (!mgr) sched = staffVisibleSched_(ym, sched);
  var dm = sched[d] || {}, da = ofcObj_('att:' + ym)[d] || {};
  var av = ofcObj_('ofav'), chat = ofcObj_('ofchat'), xp = ofcXp_(emps, chat);
  var bd = ofcBirthdays_(emps), gr = ofcGrants_(), tcs = ofcTenchou_();
  var people = emps.map(function (e) {
    var en = dm[e.id], sh = en && !en.off && en.shifts ? en.shifts : [], l = Array.isArray(da[e.id]) ? da[e.id] : [];
    var x = xp[e.id] || { xp: 0, lv: 1 };
    return {
      id: e.id, name: e.name, av: (av[e.id] || {}).a || null, st: ofcStatus_(sh, l, attOn, now, dayStart),
      sh: sh.map(function (s) { var o = { s: Number(s.start), e: Number(s.end) }; if (s.isSupport) o.sup = 1; if (s.endAtClose) o.L = 1;
        if (s.breakStart != null && s.breakEnd != null) { o.bs = Number(s.breakStart); o.be = Number(s.breakEnd); } return o; }),
      off: !!(en && en.off), lv: x.lv, bd: bd.indexOf(e.id) !== -1 ? 1 : 0,
      rk: (function () { var r = Math.round(Number(e.rank)); return r >= 1 && r <= 4 ? r : 0; })(), tc: tcs[e.id] ? 1 : 0,
      kd: ((gr[e.id] || {}).kudos || []).filter(function (k) { return k.at > now - 3 * 86400000; }).slice(-3),
      kn: ((gr[e.id] || {}).kudos || []).length
    };
  });
  // Người quán khác tới giúp hôm nay (chi viện) — đứng ở quán mình theo giờ đã xếp.
  var guests = [];
  try {
    ((supScan_(ym, myStore_().id) || {})[d] || []).forEach(function (g, i) {
      var sh = [{ start: g.start, end: g.end, breakStart: g.bs, breakEnd: g.be }];
      guests.push({ id: 'g' + i + '_' + String(g.empId || '').slice(0, 8), name: String(g.empName || '?'), store: String(g.storeName || ''),
        st: ofcStatus_(sh, [], false, now, dayStart), sh: [{ s: Number(g.start), e: Number(g.end) }], guest: 1 });
    });
  } catch (e) {}
  var cut = now - 48 * 3600000;
  var mine = xp[me] || { xp: 0, lv: 1, mx: 0, n: { 'in': 0, on: 0, hk: 0, tr: 0, ts: 0, ch: 0, sup: 0 } };
  var memos = [];
  try { memos = readMemos_(ym).filter(function (m) { return Number(d) >= m.from && Number(d) <= m.to; })
    .map(function (m) { return { k: m.kind, t: m.title, x: m.text || '' }; }).slice(0, 8); } catch (e) {}
  return {
    v: 1, now: now, ymd: ymd, me: me, mgr: mgr, att: attOn, store: storeLabel_(),
    layout: String(ofcObj_('ofcfg').layout || 'auto'), mav: (av.m || {}).a || null,
    on: ofcOnline_(emps.map(function (e) { return e.id; }).concat(['m'])),
    people: people, guests: guests,
    chat: (Array.isArray(chat.list) ? chat.list : []).filter(function (x) { return x.at > cut; }).slice(-40),
    memos: memos,
    mine: { xp: mine.xp, lv: mine.lv, mx: mine.mx, n: mine.n, badges: ofcBadges_(mine.n), lvs: OFC_LV_ },
    av: me === 'm' ? ((av.m || {}).a || null) : ((av[me] || {}).a || null),
    lock: OFC_LOCK_, emoji: OFC_EMOJI_,
    ranks: readSettings_().rankNames || [], tc: !mgr && tcs[me] ? 1 : 0, dl: who.dl || '',
    gift: me !== 'm' ? ((gr[me] || {}).items || {}) : {}, myKudos: me !== 'm' ? ((gr[me] || {}).kudos || []).slice(-20) : [],
    draw: (function () { var r = ofcObj_('ofdraw:' + ym); return r.list ? { at: r.at, list: r.list, prizes: r.prizes, mode: r.mode } : null; })(),
    games: { bake: ofcGameTop_('bake'), 'catch': ofcGameTop_('catch'), memo: ofcGameTop_('memo') },
    tcIds: mgr ? Object.keys(tcs) : []
  };
}

/** Lưu nhân vật của chính mình (quản lý: nhân vật "Quản lý"). */
function saveAvatar(token, json) {
  var who = auth_(token), me = ofcWho_(who), a;
  try { a = JSON.parse(String(json || '{}')); } catch (e) { throw new Error('Dữ liệu nhân vật không hợp lệ.'); }
  var lv = 99;
  if (me !== 'm') { var x = ofcXp_(readEmployees_(), ofcObj_('ofchat'))[me]; lv = x ? x.lv : 1; }
  var clean = ofcAvNorm_(a, lv, me !== 'm' ? ((ofcGrants_()[me] || {}).items || {}) : {});
  kvUpdate_('ofav', function (raw) {
    raw = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    raw[me] = { a: clean, at: Date.now() };
    return raw;
  }, 'văn phòng: nhân vật');
  return clean;
}

/** Nói một câu / thả biểu cảm trong văn phòng (hiện thành bong bóng trên đầu nhân vật). */
function officeSay(token, text, emoji, toId) {
  var who = auth_(token), me = ofcWho_(who);
  var m = String(text == null ? '' : text).replace(/[\u0000-\u001f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  var e = OFC_EMOJI_.indexOf(String(emoji || '')) !== -1 ? String(emoji) : '';
  if (!m && !e) throw new Error('Hãy nhập lời nhắn hoặc chọn biểu cảm.');
  var to = String(toId || '');
  if (to && to !== 'm') { try { assertEmployeeExists_(to); } catch (er) { to = ''; } }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  var out;
  try {
    var sheet = getSheet_(), obj = readMonthObject_(sheet, 'ofchat'), now = Date.now();
    var list = (Array.isArray(obj.list) ? obj.list : []).filter(function (x) { return x && x.at > now - 48 * 3600000; });
    var mineL = list.filter(function (x) { return x.f === me; });
    if (mineL.length && now - mineL[mineL.length - 1].at < 2500) throw new Error('Chậm lại chút nhé 🙂');
    if (mineL.filter(function (x) { return x.at > now - 24 * 3600000; }).length >= 80) throw new Error('Hôm nay bạn đã nhắn nhiều rồi — mai nhắn tiếp nhé.');
    out = { id: Utilities.getUuid().slice(0, 8), f: me, m: m, e: e, at: now };
    if (to && to !== me) out.to = to;
    list.push(out);
    obj.list = list.slice(-60);
    var ym = ofcYm_(0), cnt = obj.cnt && typeof obj.cnt === 'object' ? obj.cnt : {};
    Object.keys(cnt).forEach(function (k) { if (k < ofcYm_(-2)) delete cnt[k]; });
    var cm = cnt[ym] || (cnt[ym] = {}); cm[me] = (Number(cm[me]) || 0) + 1;
    obj.cnt = cnt;
    pubPut_(sheet, 'ofchat', obj);
  } finally { lock.releaseLock(); }
  ofcXpBust_();
  return out;
}

/** Quản lý: chọn bố cục phòng (auto = theo tên quán). */
function officeConfig(token, json) {
  requireManager_(token);
  var o; try { o = JSON.parse(String(json || '{}')); } catch (e) { o = {}; }
  var cur = ofcObj_('ofcfg'), ids = {}; readEmployees_().forEach(function (e) { ids[e.id] = 1; });
  var lay = o.layout === undefined ? (cur.layout || 'auto') : (['auto', 'otagawa', 'basic'].indexOf(String(o.layout)) !== -1 ? String(o.layout) : 'auto');
  var tc = Array.isArray(o.tc) ? o.tc.map(String).filter(function (id) { return ids[id]; }).slice(0, 20) : (Array.isArray(cur.tc) ? cur.tc : []);
  kvSet_('ofcfg', JSON.stringify({ layout: lay, tc: tc }), 'quán: cấu hình');
  return { layout: lay, tc: tc };
}

// ===========================================================================
// 🏪 QUÁN SỐNG ĐỘNG (v56): đồng bộ gần tức thì · Tenchou · khen thưởng · trò chơi · quay thưởng
// ---------------------------------------------------------------------------
// 'oflv:<id>' (CacheService, 2 phút) = { x, y, a, yw, t, m }   — vị trí / động tác người đang mở tab Quán
// 'ofgrant'  = { empId: { xp, items: { ac: [12], pet: [3] }, kudos: [{ k, n, at, by }] } }
// 'ofgame:YYYY-MM' = { bake: { empId: điểm cao nhất }, catch: {...} }
// 'ofdraw:YYYY-MM' = { at, by, prizes, mode, list: [{ id, name, p }], hist: [...] }
// ===========================================================================
var OFC_ACTS_ = ['', 'wipe', 'mop', 'vac', 'bake', 'sit', 'dance', 'dance2', 'wave', 'cheer', 'clap', 'heart', 'sleep', 'phone', 'eat', 'coffee', 'stretch', 'thumb', 'bow', 'think', 'guitar'];
var OFC_KUDOS_ = { guest: 30, bake: 20, clean: 20, fast: 15, team: 20, smile: 15, help: 20, star: 50 };
var OFC_GAMES_ = { bake: 900, 'catch': 3000, memo: 1000 };
var TENCHOU_DENY_ = /^(forgetMgrDevice|mgrDevices|mgrDevicesClear|changeManagerPassword|resetManagerPasswordToDefault|payPwStatus|setPayPw|resetPayPw|listHistory|restoreHistory|tidyBackupsNow|runDailyBackup|backupNow|setDailyBackup|getBackupStatus|authorizeBackup|authorizeLine|saveLineToken|unlinkLineGroup|purgeEmployee|saveEmployees|saveSettings|exportHours|hr[A-Z]\w*|docTpl\w*|apl(List|Get|Update|Delete|Add|Hire|CfgSave|CfgGet)|ye(Get|Save)|bizLoad|posImport|posClear|salesSave|rcpSave|invItemsSave|invSave|bizApplyHc|posMonths|posRange|attKiosk\w*|attCard(Reg|Del|List)|attResetKey|attArchive\w*|attLogGet|attClose|attReopen|attConfig|hubJoin|hubAllow|storeCodeSave|setFrontUrl|cleanUpLegacyData|importSpreadsheetFile|officeConfig|owner\w*|wa[A-Z]\w*|cost[A-Z]\w*|attEdit|hl(Month|Config)|survey\w*|selfCheck|pushTest|mgrMailTest|setPin|resetPin|issueClaimCode|revokeDevices|empQuickLink|tenchouSession)$/;

/** Ai có quyền Tenchou: chức vụ cao nhất (Cửa hàng trưởng / 店長) + những người quản lý tự chọn. */
function ofcTenchou_() {
  var cfg = ofcObj_('ofcfg'), out = {};
  (Array.isArray(cfg.tc) ? cfg.tc : []).forEach(function (id) { out[String(id)] = 1; });
  readEmployees_().forEach(function (e) { if (Math.round(Number(e.rank)) === 4) out[e.id] = 1; });
  return out;
}
function tenchouGuard_(p) {
  if (!ofcTenchou_()[p.dl] || (Number(p.dv) || 0) !== empVer_(p.dl)) throw new Error('Quyền Tenchou đã bị tắt — hãy đăng nhập lại.');
  if (!CUR_FN_) throw new Error('Chế độ Tenchou chỉ dùng được trên link GitHub của quán.');
  if (TENCHOU_DENY_.test(CUR_FN_)) throw new Error('Mục này chỉ quản lý (mật khẩu quản lý) mới mở được.');
}
/** Nhân viên có quyền Tenchou → phiên quản lý 4 giờ (không cần mật khẩu quản lý), bị chặn lương / hồ sơ / mật khẩu / sao lưu. */
function tenchouSession(token) {
  var who = auth_(token);
  if (who.r !== 'emp') throw new Error('Chỉ dùng từ máy nhân viên.');
  var me = String(who.e);
  if (!ofcTenchou_()[me]) throw new Error('Bạn chưa được giao quyền Tenchou.');
  var pl = { r: 'mgr', e: null, v: mgrVer_(), x: Date.now() + 4 * 3600000, dl: me, dv: empVer_(me) };
  var name = (readEmployees_().filter(function (e) { return e.id === me; })[0] || {}).name || '';
  return { token: signToken_(pl), name: name };
}

/** Vị trí / động tác của mình + lấy của mọi người (gọi ~2 giây/lần khi đang mở tab Quán). */
function ofcLive(token, json, since) {
  var who = auth_(token), me = ofcWho_(who), c = CacheService.getScriptCache(), now = Date.now();
  ofcSeen_(me);
  if (json) {
    var o = {}; try { o = JSON.parse(String(json)); } catch (e) { o = {}; }
    var st = { t: now, x: Math.max(0, Math.min(3000, Math.round(Number(o.x) || 0))), y: Math.max(0, Math.min(3000, Math.round(Number(o.y) || 0))),
               a: OFC_ACTS_.indexOf(String(o.a || '')) !== -1 ? String(o.a || '') : '', yw: Math.round((Number(o.yw) || 0) * 100) / 100, m: o.m ? 1 : 0 };
    try { c.put('oflv:' + me, JSON.stringify(st), 120); } catch (e) {}
  }
  var ids = readEmployees_().map(function (e) { return e.id; }).concat(['m']), got = {}, p = {};
  try { got = c.getAll(ids.map(function (id) { return 'oflv:' + id; })); } catch (e) {}
  ids.forEach(function (id) { var v = got['oflv:' + id]; if (v && id !== me) { try { var s = JSON.parse(v); if (now - s.t < 90000) p[id] = s; } catch (e) {} } });
  var chat = ofcObj_('ofchat'), sn = Number(since) || 0;
  return { now: now, p: p, on: ofcOnline_(ids), chat: (Array.isArray(chat.list) ? chat.list : []).filter(function (x) { return x.at > sn; }).slice(-20) };
}

function ofcGrants_() { return ofcObj_('ofgrant'); }
function ofcSysChat_(m, extra) {
  try {
    var sheet = getSheet_(), obj = readMonthObject_(sheet, 'ofchat'), now = Date.now();
    var list = (Array.isArray(obj.list) ? obj.list : []).filter(function (x) { return x && x.at > now - 48 * 3600000; });
    var e = { id: Utilities.getUuid().slice(0, 8), f: 'sys', m: String(m).slice(0, 120), e: '', at: now };
    Object.keys(extra || {}).forEach(function (k) { e[k] = extra[k]; });
    list.push(e); obj.list = list.slice(-60); pubPut_(sheet, 'ofchat', obj);
    return e;
  } catch (er) { return null; }
}
/** Quản lý / Tenchou: cộng (trừ) điểm, mở khoá đồ, khen thưởng (hiện ruy băng vinh danh 3 ngày + tin hệ thống). */
function officeGrant(token, json) {
  var who = requireManager_(token), o;
  try { o = JSON.parse(String(json || '{}')); } catch (e) { throw new Error('Dữ liệu không hợp lệ.'); }
  var to = String(o.to || ''); assertEmployeeExists_(to);
  if (who.dl && who.dl === to) throw new Error('Không tự khen thưởng cho chính mình được 🙂');
  var kudo = OFC_KUDOS_[o.kudo] != null ? String(o.kudo) : '';
  var xp = Math.max(-500, Math.min(500, Math.round(Number(o.xp) || 0)));
  if (kudo && !o.xp) xp = OFC_KUDOS_[kudo];
  var note = String(o.note == null ? '' : o.note).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 60);
  var items = (Array.isArray(o.items) ? o.items : []).filter(function (q) {
    return Array.isArray(q) && OFC_LOCK_[q[0]] && OFC_LOCK_[q[0]][Number(q[1])]; }).slice(0, 20);
  if (!kudo && !xp && !items.length) throw new Error('Hãy chọn khen thưởng, điểm hoặc món mở khoá.');
  var by = who.dl ? String(who.dl) : 'm', out;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_(), g = readMonthObject_(sheet, 'ofgrant'), r = g[to] || (g[to] = { xp: 0, items: {}, kudos: [] });
    r.xp = (Number(r.xp) || 0) + xp;
    items.forEach(function (q) { var a = r.items[q[0]] || (r.items[q[0]] = []); if (a.indexOf(Number(q[1])) === -1) a.push(Number(q[1])); });
    if (kudo || note) { r.kudos = (r.kudos || []).concat([{ k: kudo || 'star', n: note, at: Date.now(), by: by, xp: xp }]).slice(-40); }
    pubPut_(sheet, 'ofgrant', g);
    out = { xp: r.xp, items: r.items, kudos: r.kudos.slice(-5) };
  } finally { lock.releaseLock(); }
  ofcXpBust_();
  var nm = (readEmployees_().filter(function (e) { return e.id === to; })[0] || {}).name || '';
  ofcSysChat_('🏅 ' + nm, { kd: kudo || (xp ? 'xp' : 'unlock'), to: to, xp: xp, n: note, by: by });
  return out;
}

/** Điểm trò chơi (lưu điểm cao nhất tháng). Điểm trò chơi đổi ra điểm kinh nghiệm có trần — không cày được. */
function officeGameScore(token, game, score) {
  var who = auth_(token), me = ofcWho_(who);
  game = String(game || ''); if (!OFC_GAMES_[game]) throw new Error('Trò chơi không hợp lệ.');
  score = Math.max(0, Math.min(OFC_GAMES_[game], Math.round(Number(score) || 0)));
  var key = 'ofgame:' + ofcYm_(0), best = 0;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_(), g = readMonthObject_(sheet, key), t = g[game] || (g[game] = {});
    best = Math.max(Number(t[me]) || 0, score);
    if (best !== Number(t[me])) { t[me] = best; pubPut_(sheet, key, g); }
  } finally { lock.releaseLock(); }
  ofcXpBust_();
  return { best: best, top: ofcGameTop_(game) };
}
function ofcGameTop_(game) {
  var t = (ofcObj_('ofgame:' + ofcYm_(0))[game]) || {};
  return Object.keys(t).map(function (id) { return { id: id, s: Number(t[id]) || 0 }; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 10);
}
function ofcGameXp_(ym, id) {
  var g = ofcObj_('ofgame:' + ym), x = 0;
  x += Math.min(15, Math.floor((Number((g.bake || {})[id]) || 0) / 40));
  x += Math.min(15, Math.floor((Number((g['catch'] || {})[id]) || 0) / 120));
  x += Math.min(15, Math.floor((Number((g.memo || {})[id]) || 0) / 60));
  return x;
}

/** 🎁 Quay thưởng cuối tháng: máy chủ bốc thăm (công bằng, không ai sửa được kết quả trên máy mình). */
function luckyDraw(token, json) {
  var who = requireManager_(token), o;
  try { o = JSON.parse(String(json || '{}')); } catch (e) { throw new Error('Dữ liệu không hợp lệ.'); }
  var ym = ofcYm_(0), key = 'ofdraw:' + ym, emps = readEmployees_(), byId = {};
  emps.forEach(function (e) { byId[e.id] = e; });
  var prizes = (Array.isArray(o.prizes) ? o.prizes : []).map(function (p) {
    return { n: String(p && p.n || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 30), c: Math.max(1, Math.min(20, Math.round(Number(p && p.c) || 1))) };
  }).filter(function (p) { return p.n; }).slice(0, 10);
  if (!prizes.length) throw new Error('Hãy nhập ít nhất một phần quà.');
  var pool = (Array.isArray(o.ids) ? o.ids : []).map(String).filter(function (id) { return byId[id]; });
  if (!pool.length) throw new Error('Chưa chọn ai tham gia.');
  var xp = o.mode === 'xp' ? ofcXp_(emps, ofcObj_('ofchat')) : {};
  var prev = ofcObj_(key);
  if (prev.list && prev.list.length && !o.redo) throw new Error('Tháng này đã quay rồi — bấm "Quay lại" nếu muốn quay lần nữa.');
  var slots = []; prizes.forEach(function (p) { for (var i = 0; i < p.c; i++) slots.push(p.n); });
  var left = pool.slice(), list = [];
  slots.forEach(function (pz) {
    if (!left.length) return;
    var w = left.map(function (id) { return o.mode === 'xp' ? 1 + Math.sqrt(Math.max(0, ((xp[id] || {}).mx) || 0)) : 1; });
    var sum = w.reduce(function (a, b) { return a + b; }, 0), r = Math.random() * sum, k = 0;
    while (k < left.length - 1 && r > w[k]) { r -= w[k]; k++; }
    var id = left.splice(k, 1)[0];
    list.push({ id: id, name: byId[id].name, p: pz });
  });
  var rec = { at: Date.now(), by: who.dl ? String(who.dl) : 'm', ym: ym, mode: o.mode === 'xp' ? 'xp' : 'eq', prizes: prizes, pool: pool.length, list: list,
              hist: (prev.hist || []).concat(prev.list ? [{ at: prev.at, list: prev.list }] : []).slice(-5) };
  kvSet_(key, JSON.stringify(rec), 'quay thưởng');
  ofcSysChat_('🎁 ' + list.map(function (x) { return x.name + ' — ' + x.p; }).join(' · '), { kd: 'draw' });
  return rec;
}

// ===========================================================================
// 📊 BÁO CÁO CHỦ QUÁN (v56) + dữ liệu WingArc (Dr.Sum Datalizer)
// 'wa:YYYY-MM' = { d: { 'D': { rev, cust, eat, take, deli, h: { '8': yên, … } } }, files: [...], at }
// Bot trên máy Mac (không có API) tải CSV rồi gửi lên bằng "khoá bot" (quản lý tạo, chỉ ghi được dữ liệu doanh thu).
// ===========================================================================
function waNum_(v, lo, hi) { var t = String(v == null ? '' : v).replace(/[,¥￥\s]/g, ''); if (t === '') return null; var n = Number(t); return isFinite(n) && n >= lo && n <= hi ? n : null; }
function waMerge_(ym, inp, src) {
  ym = assertYearMonth_(ym);
  var n = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate(), days = 0;
  var cur = readJsonKey_('wa:' + ym); if (!cur.d) cur = { d: {}, files: [] };
  var revOut = {};
  Object.keys((inp && inp.d) || {}).forEach(function (k) {
    var dd = Number(k); if (!(dd >= 1 && dd <= n)) return;
    var x = inp.d[k] || {}, o = cur.d[String(dd)] || {};
    ['rev', 'cust', 'eat', 'take', 'deli'].forEach(function (f) { var v = waNum_(x[f], 0, 99999999); if (v !== null) o[f] = Math.round(v); });
    if (x.h && typeof x.h === 'object') { o.h = o.h || {}; Object.keys(x.h).forEach(function (hh) { var H = Number(hh), v = waNum_(x.h[hh], 0, 9999999); if (H >= 0 && H <= 26 && v !== null) o.h[String(H)] = Math.round(v); }); }
    cur.d[String(dd)] = o; days++;
    if (o.rev) revOut[String(dd)] = o.rev;
  });
  cur.files = (cur.files || []).concat([{ name: String((inp && inp.name) || src || '').slice(0, 80), at: Date.now(), n: days, src: src || 'csv' }]).slice(-20);
  cur.at = Date.now();
  kvSet_('wa:' + ym, JSON.stringify(cur), 'WingArc', true);
  if (Object.keys(revOut).length) {               // doanh thu ngày → dùng chung với "Doanh thu & nguyên liệu"
    var s = readJsonKey_('sales:' + ym); s.d = s.d || {};
    Object.keys(revOut).forEach(function (d) { s.d[d] = revOut[d]; });
    kvSet_('sales:' + ym, JSON.stringify(s), 'WingArc', true);
  }
  try { CacheService.getScriptCache().remove('ohist'); } catch (e) {}   // trang "Từ lúc mở tiệm" thấy ngay tháng vừa nhập
  return { days: days };
}
function waImport(token, ym, json) {
  requireManager_(token);
  var inp; try { inp = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { throw new Error('Dữ liệu không hợp lệ.'); }
  return waMerge_(ym, inp, 'csv');
}
/** Khoá cho bot WingArc: tạo mới (hiện MỘT lần) hoặc tắt. Máy chủ chỉ giữ mã băm. */
function waBotKey(token, on) {
  requireManager_(token);
  if (!on) { props_().deleteProperty('WA_BOT'); return { on: false }; }
  var key = 'wa_' + Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  props_().setProperty('WA_BOT', sha256_(getSecret_('APP_SALT') + '|wabot|' + key));
  return { on: true, key: key };
}
function waBotStatus(token) { requireManager_(token); var c = readJsonKey_('wabotlog'); return { on: !!props_().getProperty('WA_BOT'), last: c.at || 0, n: c.n || 0, msg: c.m || '' }; }
/** Bot gửi dữ liệu: { months: { 'YYYY-MM': { d: {...}, pos: { it: {...} } } } } — chỉ ghi doanh thu / số bán, không đọc được gì. */
function waBotImport(key, json) {
  var h = props_().getProperty('WA_BOT');
  var th = throttle_('wabot');
  if (!h || sha256_(getSecret_('APP_SALT') + '|wabot|' + String(key || '')) !== h) { th.fail(); throw new Error('Khoá bot không đúng.'); }
  th.ok();
  var inp; try { inp = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { throw new Error('Dữ liệu không hợp lệ.'); }
  var out = {}, n = 0;
  Object.keys((inp && inp.months) || {}).slice(0, 3).forEach(function (ym) {
    var m = inp.months[ym] || {};
    out[ym] = {};
    if (m.d) { out[ym].wa = waMerge_(ym, { d: m.d, name: m.name || 'bot' }, 'bot'); n += out[ym].wa.days; }
    if (m.pos && m.pos.it) { out[ym].pos = posMerge_(assertYearMonth_(ym), { it: m.pos.it, name: 'bot' }); }
  });
  try { kvSet_('wabotlog', JSON.stringify({ at: Date.now(), n: n, m: Object.keys(out).join(',') }), 'bot', true); } catch (e) {}
  return { ok: true, months: out };
}
/** Số liệu cho bản báo cáo chủ quán (giờ xếp ca / giờ làm thực của từng người, WingArc tháng này + tháng trước). */
function ownerReport(token, ym) {
  requireManager_(token);
  return ownerReport_(assertYearMonth_(ym));
}
/** v57: số liệu báo cáo chủ quán (dùng chung cho quản lý và link chỉ xem của chủ quán).
 *  Giờ xếp ca tính theo giờ đóng cửa từng ngày; ca 応援 của nhân viên mình sang quán khác KHÔNG tính vào quán này
 *  (ghi riêng supOut), còn người quán khác tới chi viện thì CỘNG vào giờ làm của quán này (guests). */
function ownerReport_(ym) {
  var pym = ymShift_(ym, -1), emps = readEmployees_(), sched = readMonthNormalized_('schedule:' + ym, emps), att = readJsonKey_('att:' + ym);
  var cm = {}; try { cm = readCloseHours_(ym) || {}; } catch (eC) {}
  var sh = {}, ah = {}, sd = {}, ad = {}, so = {};
  Object.keys(sched).forEach(function (d) {
    Object.keys(sched[d] || {}).forEach(function (id) {
      var e = sched[d][id]; if (!e || e.off || !e.shifts) return;
      e.shifts.forEach(function (x) {
        var hrs = netOfShiftAt_(x, cm, d); if (!(hrs > 0)) return;
        if (x.isSupport) { so[id] = (so[id] || 0) + hrs; return; }
        sh[id] = (sh[id] || 0) + hrs; sd[d] = (sd[d] || 0) + hrs;
      });
    });
  });
  Object.keys(att || {}).forEach(function (d) {
    Object.keys(att[d] || {}).forEach(function (id) {
      var l = att[d][id]; if (!Array.isArray(l) || !l.length) return;
      var hrs = attWorkHours_(l, null); if (hrs > 0) { ah[id] = (ah[id] || 0) + hrs; ad[d] = (ad[d] || 0) + hrs; }
    });
  });
  // Người quán khác tới chi viện (đọc lịch các quán trong mạng — giống màn "Chi viện").
  var guests = [], gDay = {};
  try {
    if (hubOn_()) {
      var gs = supScan_(ym, supMe_().id), byKey = {};
      Object.keys(gs || {}).forEach(function (d) {
        (gs[d] || []).forEach(function (g) {
          var hrs = netOfShiftAt_({ start: g.start, end: g.end, endAtClose: g.atClose, breakStart: g.bs, breakEnd: g.be }, cm, d);
          if (!(hrs > 0)) return;
          var k = g.store + '|' + g.empId, o = byKey[k];
          if (!o) { o = byKey[k] = { id: 'g:' + String(g.empId).slice(0, 24), name: String(g.empName || '?').slice(0, 30), store: String(g.storeName || '').slice(0, 40), h: 0, days: 0 }; guests.push(o); }
          o.h += hrs; o.days++; gDay[d] = (gDay[d] || 0) + hrs;
        });
      });
    }
  } catch (eG) { guests = []; gDay = {}; }
  var st = readSettings_();
  return { ym: ym, store: storeLabel_(), wage: st.wage || 0, emps: emps.map(function (e) { return { id: e.id, name: e.name, rk: Math.round(Number(e.rank)) || 0 }; }),
           sched: sh, att: ah, schedDay: sd, attDay: ad, attOn: !!attCfg_().on, guests: guests, guestDay: gDay, supOut: so,
           wa: readJsonKey_('wa:' + ym), waPrev: readJsonKey_('wa:' + pym), salesPrev: readJsonKey_('sales:' + pym), bot: { on: !!props_().getProperty('WA_BOT'), last: (readJsonKey_('wabotlog').at || 0) },
           wx: (readJsonKey_('wx:' + ym).d) || {}, costs: costRead_(), today: todayStr_() };
}

// ===========================================================================
// 🔗 v57: LINK BÁO CÁO CHO CHỦ QUÁN — một link cố định, CHỈ XEM, quản lý tắt / đổi lúc nào cũng được.
// ===========================================================================
function ownerLinkInfo_() {
  var P = props_(), k = P.getProperty('OWNER_KEY') || '', u = frontUrl_();
  return { on: !!k, url: k && u ? joinUrl_(u, 'or', k) : '', key: k, at: Number(P.getProperty('OWNER_KEY_AT') || 0), seen: Number(P.getProperty('OWNER_SEEN') || 0) };
}
/** act: '' xem · 'new' tạo / đổi link (link cũ hết hiệu lực) · 'off' tắt. */
function ownerLink(token, act) {
  requireManager_(token);
  var P = props_();
  if (act === 'new') {
    var k = 'o' + Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
    P.setProperty('OWNER_KEY', k); P.setProperty('OWNER_KEY_AT', String(Date.now())); P.deleteProperty('OWNER_SEEN');
  } else if (act === 'off') { P.deleteProperty('OWNER_KEY'); P.deleteProperty('OWNER_KEY_AT'); P.deleteProperty('OWNER_SEEN'); }
  return ownerLinkInfo_();
}
function ownerKeyOk_(key) {
  var k = props_().getProperty('OWNER_KEY') || '', g = String(key || '');
  var th = throttle_('ownv');
  var same = k.length > 20 && g.length === k.length;
  if (same) { var x = 0; for (var i = 0; i < k.length; i++) x |= k.charCodeAt(i) ^ g.charCodeAt(i); same = x === 0; }
  if (!same) { th.fail(); throw new Error('Link báo cáo này không còn hiệu lực. Hãy hỏi quản lý quán link mới.'); }
  th.ok();
}
/** Trang chủ quán (không đăng nhập): số liệu một tháng. Chỉ đọc — không có hàm ghi nào dùng khoá này. */
function ownerView(key, ym) {
  ownerKeyOk_(key);
  var cur = jstDateStr_(0).slice(0, 7);
  // Mở link lần đầu: tháng này nếu đã có số liệu, không thì tháng trước (đầu tháng chưa có gì để xem).
  var has_ = function (m) { var w = readJsonKey_('wa:' + m), x = readJsonKey_('sales:' + m); return !!((w.d && Object.keys(w.d).length) || (x.d && Object.keys(x.d).length)); };
  ym = ym ? assertYearMonth_(ym) : (has_(cur) ? cur : ymShift_(cur, -1));
  if (ym > cur || ym < ymShift_(cur, -36)) ym = cur;
  try { props_().setProperty('OWNER_SEEN', String(Date.now())); } catch (e) {}
  var months = [];
  for (var i = 0; i < 13; i++) { var m = ymShift_(cur, -i); if (i < 2 || has_(m)) months.push(m); }
  var st = readSettings_();
  var hist = []; try { hist = ownerHistory_(); } catch (eH) {}
  return { ok: true, ym: ym, months: months, r: ownerReport_(ym), d: bizLoad_(ym), hist: hist, lang: st.ownerLang || '' };
}

// ===========================================================================
// 🌤 v58: THỜI TIẾT (dữ liệu 気象庁 — 出典：気象庁ホームページ) + 💴 CHI PHÍ / LỢI NHUẬN + 📈 TỪ LÚC MỞ TIỆM
// ===========================================================================
var WX_TTL_ = 1800;                                        // nhớ tạm 30 phút
var WX_STORES_ = [                                         // toạ độ mặc định theo tên quán (Cài đặt có thể ghi đè lat/lon)
  { re: /セントレア|centrair|中部国際/i, lat: 34.8584, lon: 136.8054 },
  { re: /太田川|東海|forest|フォレスト/i, lat: 35.0207, lon: 136.8967 },
  { re: /常滑|tokoname/i, lat: 34.8865, lon: 136.8323 }
];
function wxLoc_() {
  var st = readSettings_(), lat = Number(st.wxLat), lon = Number(st.wxLon);
  if (isFinite(lat) && isFinite(lon) && lat && lon) return { lat: lat, lon: lon };
  var n = storeLabel_();
  for (var i = 0; i < WX_STORES_.length; i++) if (WX_STORES_[i].re.test(n)) return { lat: WX_STORES_[i].lat, lon: WX_STORES_[i].lon };
  return { lat: 35.1667, lon: 136.9667 };                  // 名古屋
}
/** Tải nhiều địa chỉ JSON cùng lúc; lỗi → null (tách riêng để kiểm thử thay được). */
function wxHttp_(urls) {
  try {
    return UrlFetchApp.fetchAll(urls.map(function (u) { return { url: u, muteHttpExceptions: true }; })).map(function (r) {
      try { return r.getResponseCode() === 200 ? r.getContentText() : null; } catch (e) { return null; }
    });
  } catch (e) { return urls.map(function () { return null; }); }
}
function wxJ_(t) { try { return t ? JSON.parse(t) : null; } catch (e) { return null; } }
/** Mã thời tiết 気象庁 (100 晴れ / 200 くもり / 300 雨 / 400 雪) hoặc chữ → nhóm s|c|r|n. */
function wxKind_(x) {
  var s = String(x == null ? '' : x);
  if (/^\d{3}$/.test(s)) { var c = s.charAt(0); return c === '1' ? 's' : c === '2' ? 'c' : c === '3' ? 'r' : c === '4' ? 'n' : 'c'; }
  return /雪/.test(s) ? 'n' : /雨/.test(s) ? 'r' : /くもり|曇/.test(s) ? 'c' : /晴/.test(s) ? 's' : 'c';
}
/** Trạm アメダス gần quán nhất (bảng trạm nhớ tạm 1 ngày, mã trạm nhớ trong Properties). */
function wxStation_(loc, tableText) {
  var P = props_(), key = 'WX_ST', saved = P.getProperty(key), tag = loc.lat.toFixed(3) + ',' + loc.lon.toFixed(3);
  if (saved && saved.indexOf(tag + '|') === 0) { var q = saved.split('|'); return { id: q[1], name: q[2] || '' }; }
  var tb = wxJ_(tableText); if (!tb) return null;
  var best = null, bd = 1e9;
  Object.keys(tb).forEach(function (id) {
    var r = tb[id]; if (!r || !r.lat || !r.lon || !r.elems || String(r.elems).charAt(0) !== '1') return;     // phải đo nhiệt độ
    var la = r.lat[0] + r.lat[1] / 60, lo = r.lon[0] + r.lon[1] / 60, d = Math.pow(la - loc.lat, 2) + Math.pow((lo - loc.lon) * 0.82, 2);
    if (d < bd) { bd = d; best = { id: id, name: r.kjName || '' }; }
  });
  if (best) try { P.setProperty(key, tag + '|' + best.id + '|' + best.name); } catch (e) {}
  return best;
}
/** Gom dữ liệu thời tiết hiện tại + 3 giờ + 7 ngày. */
function wxFetch_() {
  var C = CacheService.getScriptCache(), hit = C.get('wx:v58');
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  var B = 'https://www.jma.go.jp/bosai/', loc = wxLoc_(), stSaved = props_().getProperty('WX_ST');
  var needTb = !(stSaved && stSaved.indexOf(loc.lat.toFixed(3) + ',' + loc.lon.toFixed(3) + '|') === 0);
  var urls = [B + 'jmatile/data/wdist/VPFD/230010.json', B + 'forecast/data/forecast/230000.json', B + 'amedas/data/latest_time.txt'];
  if (needTb) urls.push(B + 'amedas/const/amedastable.json');
  var T = wxHttp_(urls), vp = wxJ_(T[0]), fc = wxJ_(T[1]), out = { at: Date.now(), src: '気象庁', h3: [], days: [], pop6: [], obs: null };
  // 3 giờ: thời tiết khu Tây (西部) + nhiệt độ điểm 名古屋
  try {
    var aT = vp.areaTimeSeries, pT = vp.pointTimeSeries, temps = {};
    (pT.timeDefines || []).forEach(function (t, i) { var k = String(t.dateTime || t).slice(0, 16); temps[k] = pT.temperature ? pT.temperature[i] : null; });
    (aT.timeDefines || []).forEach(function (t, i) {
      var k = String(t.dateTime || t).slice(0, 16), w = (aT.weather || [])[i];
      out.h3.push({ t: k, k: wxKind_(w), w: String(w || '').slice(0, 12), c: temps[k] != null && temps[k] !== '' ? Number(temps[k]) : null });
    });
  } catch (e0) {}
  // 6 giờ: khả năng mưa (西部); 7 ngày: 愛知県 + 名古屋
  try {
    var s0 = fc[0].timeSeries, pops = s0[1], ar = pops.areas.filter(function (a) { return a.area && a.area.code === '230010'; })[0] || pops.areas[0];
    pops.timeDefines.forEach(function (t, i) { out.pop6.push({ t: String(t).slice(0, 16), p: ar.pops[i] === '' ? null : Number(ar.pops[i]) }); });
    var w0 = s0[0], a0 = w0.areas.filter(function (a) { return a.area && a.area.code === '230010'; })[0] || w0.areas[0];
    out.today = { code: a0.weatherCodes[0], k: wxKind_(a0.weatherCodes[0]), w: String(a0.weathers ? a0.weathers[0] : '').replace(/\s+/g, ' ').slice(0, 40) };
  } catch (e1) {}
  try {
    var wk = fc[1].timeSeries, wa = wk[0].areas[0], wt = (wk[1].areas || [])[0] || {};
    wk[0].timeDefines.forEach(function (t, i) {
      out.days.push({ d: String(t).slice(0, 10), code: wa.weatherCodes[i], k: wxKind_(wa.weatherCodes[i]), pop: wa.pops && wa.pops[i] !== '' ? Number(wa.pops[i]) : null,
        lo: wt.tempsMin && wt.tempsMin[i] !== '' ? Number(wt.tempsMin[i]) : null, hi: wt.tempsMax && wt.tempsMax[i] !== '' ? Number(wt.tempsMax[i]) : null });
    });
    // hôm nay / ngày mai: lấy cao–thấp từ bản ngắn hạn nếu bản tuần để trống
    var s2 = fc[0].timeSeries[2], tm = (s2.areas || [])[0];
    if (tm && out.days[0] && out.days[0].hi == null) { var hv = tm.temps.map(Number).filter(isFinite); if (hv.length) out.days[0].hi = Math.max.apply(null, hv.slice(0, 2)); }
    if (out.today && out.days[0] && out.days[0].d === todayStr_()) { out.days[0].k = out.today.k; out.days[0].code = out.today.code; }
  } catch (e2) {}
  // Quan trắc thật: アメダス gần quán nhất
  try {
    var lt = String(T[2] || '').trim(), st = wxStation_(loc, needTb ? T[3] : null);
    if (lt && st) {
      var ts = lt.slice(0, 19).replace(/[-T:]/g, ''), mp = wxJ_(wxHttp_([B + 'amedas/data/map/' + ts + '.json'])[0]), o = mp && mp[st.id];
      var v = function (k) { return o && o[k] && o[k][0] != null && o[k][1] === 0 ? Number(o[k][0]) : (o && o[k] && o[k][0] != null ? Number(o[k][0]) : null); };
      if (o) out.obs = { at: lt.slice(0, 16), st: st.name, temp: v('temp'), rain1h: v('precipitation1h'), hum: v('humidity'), wind: v('wind') };
    }
  } catch (e3) {}
  if (out.h3.length || out.days.length || out.obs) { try { C.put('wx:v58', JSON.stringify(out), WX_TTL_); } catch (e4) {} }
  return out;
}
/** Ghi nhật ký thời tiết từng ngày (cao / thấp / mưa / loại) — dùng cho báo cáo + lịch. Mỗi 30 phút tối đa một lần. */
function wxLog_(w) {
  try {
    var C = CacheService.getScriptCache(); if (C.get('wxlog')) return; C.put('wxlog', '1', WX_TTL_);
    var today = todayStr_(), ym = today.slice(0, 7), d = String(Number(today.slice(8, 10))), cur = readJsonKey_('wx:' + ym);
    if (!cur.d) cur = { d: {} };
    var o = cur.d[d] || {}, ob = w.obs, hr = String(new Date(Date.now() + 9 * 3600000).getUTCHours());
    if (ob && ob.temp != null) { o.hi = o.hi == null ? ob.temp : Math.max(o.hi, ob.temp); o.lo = o.lo == null ? ob.temp : Math.min(o.lo, ob.temp); }
    if (ob && ob.rain1h != null) { o.rh = o.rh || {}; o.rh[hr] = ob.rain1h; o.rain = Math.round(Object.keys(o.rh).reduce(function (a, k) { return a + (Number(o.rh[k]) || 0); }, 0) * 10) / 10; }
    if (w.today) o.k = o.rain >= 1 ? 'r' : w.today.k;
    else if (o.rain >= 1) o.k = 'r';
    cur.d[d] = o; kvSet_('wx:' + ym, JSON.stringify(cur), 'weather', true, true);
  } catch (e) {}
}
/** Thời tiết cho app (mọi người đã đăng nhập). */
function wxGet(token) {
  auth_(token);
  var w = wxFetch_(); wxLog_(w);
  var ym = todayStr_().slice(0, 7);
  w.log = (readJsonKey_('wx:' + ym).d) || {};
  w.logPrev = (readJsonKey_('wx:' + ymShift_(ym, -1)).d) || {};
  return w;
}

// ---- 💴 chi phí cố định / biến đổi (mỗi quán) ----
var COST_KEYS_ = { rent: 'fix', common: 'fix', royalty: 'pct', adfund: 'pct', util: 'fix', net: 'fix', card: 'pct', deli: 'pctd', social: 'pctl', commute: 'fix', supplies: 'fix', repair: 'fix', insure: 'fix', deprec: 'fix', other: 'fix' };
function costRead_() {
  var c = readJsonKey_('costs'); c = c && typeof c === 'object' ? c : {};
  return { open: /^\d{4}-\d{2}$/.test(c.open || '') ? c.open : '', items: c.items && typeof c.items === 'object' ? c.items : {}, extra: Array.isArray(c.extra) ? c.extra : [],
           target: Number(c.target) || 0, at: c.at || 0 };
}
function costGet(token) { requireManager_(token); return costRead_(); }
/** Lưu: { open:'YYYY-MM', items:{ rent: 300000, royalty: 8, … }, extra:[{n:'…', t:'fix'|'pct', v}], target: lợi nhuận mục tiêu/tháng }. */
function costSave(token, json) {
  requireManager_(token);
  var o; try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { throw new Error('Dữ liệu không hợp lệ.'); }
  var num = function (v, max) { var n = Number(v); return isFinite(n) && n >= 0 && n <= max ? Math.round(n * 100) / 100 : null; };
  var items = {};
  Object.keys(COST_KEYS_).forEach(function (k) { var v = num((o.items || {})[k], COST_KEYS_[k] === 'fix' ? 99999999 : 100); if (v !== null && v > 0) items[k] = v; });
  var extra = (Array.isArray(o.extra) ? o.extra : []).slice(0, 10).map(function (x) {
    var t = x && x.t === 'pct' ? 'pct' : 'fix', v = num(x && x.v, t === 'fix' ? 99999999 : 100);
    return { n: String((x && x.n) || '').replace(/[<>]/g, '').trim().slice(0, 24), t: t, v: v || 0 };
  }).filter(function (x) { return x.n && x.v > 0; });
  var open = /^\d{4}-\d{2}$/.test(String(o.open || '')) ? String(o.open) : '';
  if (open && (open < '2000-01' || open > todayStr_().slice(0, 7))) throw new Error('Tháng mở tiệm không hợp lệ.');
  var c = { open: open, items: items, extra: extra, target: num(o.target, 99999999) || 0, at: Date.now() };
  kvSet_('costs', JSON.stringify(c), 'costs', true);
  try { CacheService.getScriptCache().remove('ohist'); } catch (e) {}
  return c;
}

// ---- 📈 tóm tắt từng tháng (từ tháng mở tiệm) ----
/** Một tháng: doanh thu, khách, ngày có số liệu, giờ xếp ca (cả người chi viện), kênh bán. Tháng đã qua → nhớ lại để lần sau đọc nhanh. */
function ownerSummary_(ym) {
  var cur = todayStr_().slice(0, 7), done = ym < cur;
  var sv = done ? readJsonKey_('osum:' + ym) : null; if (!(sv && sv.v === 3)) sv = null;   // chỉ cache GIỜ công (tốn) — doanh thu luôn đọc lại (bot có thể lấy lùi tháng cũ)
  var wa = (readJsonKey_('wa:' + ym).d) || {}, sl = (readJsonKey_('sales:' + ym).d) || {}, n = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate();
  var o = { v: 3, ym: ym, rev: 0, cust: 0, days: 0, eat: 0, take: 0, deli: 0, h: 0 };
  for (var d = 1; d <= n; d++) {
    var w = wa[d] || wa[String(d)] || {}, r = Number(w.rev) || Number(sl[d] || sl[String(d)]) || 0;
    if (r) { o.rev += r; o.days++; }
    o.cust += Number(w.cust) || 0; o.eat += Number(w.eat) || 0; o.take += Number(w.take) || 0; o.deli += Number(w.deli) || 0;
  }
  if (sv) { o.h = sv.h || 0; return o; }
  try {
    var R = ownerReport_(ym);
    Object.keys(R.sched || {}).forEach(function (k) { o.h += R.sched[k]; });
    (R.guests || []).forEach(function (g) { o.h += g.h || 0; });
    o.h = Math.round(o.h * 10) / 10;
  } catch (e) {}
  if (done && o.h) { try { kvSet_('osum:' + ym, JSON.stringify({ v: 3, h: o.h }), 'osum', true, true); } catch (e2) {} }
  return o;
}
/** Danh sách tháng từ tháng mở tiệm (hoặc tháng sớm nhất có số liệu, tối đa 60 tháng) tới tháng này. */
function ownerHistory_() {
  var C = CacheService.getScriptCache(), hit = C.get('ohist');
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  var cur = todayStr_().slice(0, 7), cs = costRead_(), from = cs.open;
  if (!from) {                                             // chưa nhập tháng mở tiệm → lùi tới tháng sớm nhất có doanh thu (tối đa 36 tháng)
    from = cur;
    for (var i = 1; i <= 36; i++) { var m = ymShift_(cur, -i), w = readJsonKey_('wa:' + m), s = readJsonKey_('sales:' + m); if ((w.d && Object.keys(w.d).length) || (s.d && Object.keys(s.d).length)) from = m; }
  }
  var out = [], m2 = from, guard = 0;
  while (m2 <= cur && guard++ < 60) { out.push(ownerSummary_(m2)); m2 = ymShift_(m2, 1); }
  try { C.put('ohist', JSON.stringify(out), 600); } catch (e) {}
  return out;
}
function ownerHistory(token) { requireManager_(token); return { open: costRead_().open, months: ownerHistory_() }; }
