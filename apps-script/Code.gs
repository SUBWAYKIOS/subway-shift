/**
 * Xếp ca làm — SUBWAY  ·  Backend Apps Script
 * =============================================================================
 * PHIÊN BẢN NÀY KHÔNG DÙNG EMAIL GOOGLE ĐỂ NHẬN DIỆN NGƯỜI DÙNG.
 *
 * Lý do: nhân viên không có tài khoản Google công ty, nên Web App buộc phải
 * deploy ở chế độ "Anyone" (ẩn danh). Ở chế độ đó Google KHÔNG tiết lộ danh
 * tính người truy cập — Session.getActiveUser().getEmail() trả về chuỗi RỖNG
 * cho tất cả mọi người, kể cả quản lý. Mọi cơ chế phân quyền dựa trên
 * MANAGER_EMAILS / EmpMap ở bản cũ vì vậy không thể hoạt động.
 *
 * Thay thế:
 *   - Quản lý  : đăng nhập bằng MẬT KHẨU QUẢN LÝ (lưu dạng hash trong
 *                Script Properties, không nằm trong Sheet).
 *   - Nhân viên: đăng nhập bằng MÃ PIN của riêng mình. Lần đầu chọn tên,
 *                nhân viên TỰ ĐẶT mã cho mình; từ đó tên đó bị khóa.
 *                Quản lý có thể reset mã khi ai đó quên.
 *   - Sau khi đăng nhập, server cấp 1 TOKEN có chữ ký HMAC + hạn dùng 12 giờ.
 *                Mọi hàm ghi dữ liệu đều đòi token và tự kiểm vai trò —
 *                client không thể tự khai "tôi là quản lý" hay "tôi là người kia".
 *
 * Các hàm kết thúc bằng dấu "_" là hàm nội bộ: Apps Script KHÔNG cho phép gọi
 * chúng từ google.script.run. Nhờ vậy bề mặt API công khai chỉ gồm đúng những
 * hàm liệt kê ở mục "API CÔNG KHAI" bên dưới, và tất cả đều có guard.
 *
 * -----------------------------------------------------------------------------
 * CÀI ĐẶT
 * 1) Mở Google Sheet dùng làm database > Extensions > Apps Script.
 * 2) Dán toàn bộ file này vào Code.gs (xoá nội dung cũ).
 * 3) File > New > HTML, đặt tên đúng là "Index", dán nội dung Index.html vào.
 * 4) Deploy > New deployment > Web app:
 *        Execute as     : Me        (dùng quyền của bạn để đọc/ghi Sheet,
 *                                    nhân viên KHÔNG cần quyền vào Sheet)
 *        Who has access : Anyone    (bắt buộc, vì nhân viên không có tài khoản)
 * 5) Cấp quyền lần đầu, copy link .../exec gửi cho nhân viên.
 * 6) Mở link, bấm "Quản lý", đăng nhập bằng mật khẩu mặc định bên dưới,
 *    rồi ĐỔI MẬT KHẨU NGAY trong app.
 * 7) Lần sửa code sau: Deploy > Manage deployments > sửa deployment hiện có
 *    sang phiên bản mới (đừng tạo deployment mới) để giữ nguyên link cũ.
 *
 * ⚠️ Ai có link đều MỞ được app và xem được danh sách tên + lịch. Mã PIN chỉ
 *    bảo vệ quyền GHI. Đây là đánh đổi bắt buộc khi nhân viên không đăng nhập.
 * -----------------------------------------------------------------------------
 * API CÔNG KHAI (client gọi được):
 *   doGet, bootstrap, loginManager, loginEmployee, claimEmployee,
 *   changeManagerPassword, setPin, resetPin, loadMonth, saveShiftEntry (quản lý),
 *   saveWishEntry, saveWishEntriesForEmployee, clearMyMonth (đăng ký nhân viên),
 *   savePlan, getPlan, applyPlan, deletePlan (ba ô kế hoạch A/B/C),
 *   importSpreadsheetFile (đọc file .xlsx tải lên, không lưu lại ở đâu),
 *   saveMemo, deleteMemo (hộp nhắc nhở), saveLearnBase, learnFromMonth,
 *   getLearn, resetLearn (máy học nhẹ từ cách quản lý sửa lịch),
 *   saveRequestEntry, saveRequestEntriesForEmployee, saveEmployees,
 *   saveShiftEntriesForEmployee, getPresets, savePresets,
 *   getIcsLinks, getMyIcsLink, revokeIcsKey, exportHours,
 *   saveMonthSchedule, restoreMonthSchedule, setMonthLock, saveCloseHour,
 *   saveSettings, saveSwapEntry, saveDayInfo, purgeEmployee, savePrintPdf
 * =============================================================================
 */

var SHEET_NAME     = 'KV';
var PIN_SHEET_NAME = 'Pins';

/** Mật khẩu quản lý mặc định — CHỈ dùng được khi chưa từng đổi mật khẩu.
 *  Đổi ngay trong app sau lần đăng nhập đầu tiên; sau khi đổi, giá trị này
 *  hết tác dụng vĩnh viễn (app sẽ so với hash trong Script Properties). */
var DEFAULT_MANAGER_PASSWORD = 'subway1111';

var TOKEN_TTL_MS  = 12 * 60 * 60 * 1000; // token hết hạn sau 12 giờ
var PIN_MIN_LEN   = 6;                 // v24: mã nhân viên tối thiểu 6 số (mã cũ ngắn hơn vẫn đăng nhập được, rồi bị nhắc đổi)
var PIN_MAX_LEN   = 12;
var PIN_DIGITS    = true;              // v24: mã mới chỉ gồm chữ số
var EMP_FAIL_MAX  = 5;                 // v24: sai 5 lần → khoá 15 phút
var EMP_LOCK_SEC  = 900;
var MGR_FORCE_PWD_CHANGE = true;       // v24: còn mật khẩu mặc định → bắt đổi trước khi dùng app
var LOCK_WAIT_MS  = 28000;         // nhiều người cùng lưu: chờ lâu hơn trước khi báo bận (trình duyệt còn tự thử lại)
var CACHE_TTL     = 21600;               // 6 giờ, mức tối đa của CacheService
var MAX_CACHE_BYTES = 90 * 1024;         // chừa biên dưới giới hạn 100KB

var DEFAULT_EMPLOYEES = ['ヒエウ','ラム','平野','愛深','まい','ともみ','もか','ほった','まこ','みゆ',
  'ゆいな','ゆうき','しずく','もりた','どい','りこ','あいり','もと','にしおか','ティエン'];

// ===========================================================================
// GIAO DIỆN WEB
// ===========================================================================

function doGet(e) {
  var p = (e && e.parameter) || {};
  // Link lịch cá nhân: app Lịch của điện thoại gọi vào đây, không phải người mở.
  if (p.ics) { warmSecrets_(); return serveIcs_(p.ics, p.k || ''); }
  // Máy điểm danh camera trực tiếp (v.12): trang riêng + API JSON — xem attServeKiosk_.
  if (p.kiosk) return attServeKiosk_();
  if (p.api === 'att') { warmSecrets_(); return attServeApi_(p); }
  warmSecrets_();
  // Tên này hiện trên tab trình duyệt VÀ dưới icon khi nhân viên
  // "Thêm vào màn hình chính" — nên lấy luôn tên quán đã đặt trong Cài đặt.
  var title = 'SUBWAY シフト';
  try {
    var sn = readSettings_().storeName;
    if (sn) title = sn;
  } catch (err) { /* chưa cấu hình thì dùng tên mặc định */ }
  var out = HtmlService.createHtmlOutputFromFile('Index');
  // v24: mở bằng đường dẫn có khoá máy (?dk=…) → chèn sẵn tên người vào trang, màn chào hiện
  // "おはようございます、ラムさん" ngay khi trang bắt đầu hiện, trước cả khi app tải xong.
  if (p.dk) {
    try {
      // Nhớ lời chào theo người (1 giờ) → khỏi đọc danh sách nhân viên; khoá đã huỷ thì vẫn không chào.
      var wc = CacheService.getScriptCache(), wp = dkEmp_(p.dk), wk = wp ? 'who:' + wp.e : '';
      var js = wk && devAlive_(wp.d, wp.e) ? wc.get(wk) : null;
      if (!js && wk) {
        var who = peekDevice_(p.dk);
        if (who) {
          js = JSON.stringify({ n: who.name, s: title === 'SUBWAY シフト' ? '' : title, l: who.lang || '' }).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, '');
          try { if (wk) wc.put(wk, js, 3600); } catch (e3) {}
        }
      }
      if (js) {
        var html = out.getContent();
        if (html.indexOf('<!--SBW_WHO-->') !== -1) out = HtmlService.createHtmlOutput(html.replace('<!--SBW_WHO-->', '<script>window.__SBW_WHO=' + js + ';</script>'));
      }
    } catch (eW) { /* lỗi gì cũng chỉ mất lời chào có tên */ }
  }
  try { out.setTitle(title); } catch (err) { /* không đặt được tiêu đề cũng không sao */ }
  // ⚠️ addMetaTag CHỈ nhận đúng 4 tên thẻ: viewport, apple-mobile-web-app-capable,
  // mobile-web-app-capable, google-site-verification. Thêm tên khác (ví dụ
  // theme-color hay apple-mobile-web-app-title) là doGet NÉM LỖI và cả app không
  // mở được. Tên hiện dưới icon màn hình chính lấy từ setTitle ở trên.
  addMeta_(out, 'viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
  addMeta_(out, 'apple-mobile-web-app-capable', 'yes');
  addMeta_(out, 'mobile-web-app-capable', 'yes');
  return out;
}

/** Thêm thẻ meta nhưng không bao giờ để nó làm chết cả trang: doGet là cửa duy
 *  nhất vào app, hỏng ở đây là 20 người không vào được. */
function addMeta_(out, name, content) {
  try { out.addMetaTag(name, content); } catch (err) { /* tên không được phép thì bỏ qua */ }
}

// ===========================================================================
// BÍ MẬT & BĂM (HASH)
// ===========================================================================

function props_() { return PropertiesService.getScriptProperties(); }

/** Lấy (hoặc sinh lần đầu) 1 chuỗi bí mật lưu trong Script Properties.
 *  Script Properties KHÔNG nằm trong Sheet, nên người xem Sheet không đọc được.
 *  CỐ Ý không dùng LockService ở đây: hàm này được gọi từ bên trong những đoạn
 *  đã giữ script lock (vd. setPin), mà lock của Apps Script không tái nhập được
 *  — thêm lock vào đây sẽ gây kẹt cứng ở lần chạy đầu tiên. Bí mật được tạo sẵn
 *  trong doGet/bootstrap nên trên thực tế không có hai lần tạo tranh nhau. */
function getSecret_(key) {
  var p = props_();
  var v = p.getProperty(key);
  if (!v) {
    v = Utilities.getUuid() + '-' + Utilities.getUuid();
    p.setProperty(key, v);
  }
  return v;
}

/** Tạo sẵn các bí mật ở nơi chắc chắn chưa giữ lock nào. */
function warmSecrets_() { getSecret_('APP_SALT'); getSecret_('TOKEN_SECRET'); }

function sha256_(str) {
  return Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(str), Utilities.Charset.UTF_8));
}

/** Hash mã PIN có kèm empId, để 2 người đặt trùng mã vẫn ra 2 hash khác nhau. */
function hashPin_(empId, pin)  { return 'h1:' + sha256_(getSecret_('APP_SALT') + '|pin|' + empId + '|' + pin); }
function hashPwd_(pwd)         { return 'h1:' + sha256_(getSecret_('APP_SALT') + '|mgr|' + pwd); }

// ===========================================================================
// TOKEN PHIÊN (stateless, có chữ ký HMAC — client không tự chế được)
// ===========================================================================

function signToken_(payload) {
  var body = Utilities.base64EncodeWebSafe(JSON.stringify(payload));
  var sig  = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(body, getSecret_('TOKEN_SECRET')));
  return body + '.' + sig;
}

function verifyToken_(token) {
  if (!token || typeof token !== 'string') return null;
  var parts = token.split('.');
  if (parts.length !== 2) return null;
  var expected = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(parts[0], getSecret_('TOKEN_SECRET')));
  if (expected !== parts[1]) return null;
  var payload;
  try {
    payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
  } catch (err) { return null; }
  if (!payload || !payload.x || payload.x < Date.now()) return null;
  // Phiên mở từ "máy đã ghi nhớ": quản lý đăng xuất máy đó là phiên chết ngay.
  if (payload.d && !devAlive_(payload.d, payload.e)) return null;
  // Quản lý đặt lại / xoá mã, hoặc xoá nhân viên → mọi phiên cũ của người đó chết ngay.
  if (payload.r === 'emp' && (Number(payload.v) || 0) !== empVer_(payload.e)) return null;
  // v41: đổi mật khẩu quản lý → mọi phiên quản lý cũ (máy lạ đã biết mật khẩu cũ) chết ngay.
  if (payload.r === 'mgr' && (Number(payload.v) || 0) !== mgrVer_()) return null;
  return payload;
}

function mgrVer_() { return Number(props_().getProperty('MGR_VER')) || 0; }
function bumpMgrVer_() { var n = mgrVer_() + 1; props_().setProperty('MGR_VER', String(n)); return n; }

// Số "đời" mã của từng nhân viên (Script Property EMP_VER = { empId: n }). Tăng lên là
// mọi token cũ của người đó hết hiệu lực.
var EMPVER_ = null;
function empVer_(empId) {
  if (EMPVER_ === null) { try { EMPVER_ = JSON.parse(props_().getProperty('EMP_VER') || '{}') || {}; } catch (e) { EMPVER_ = {}; } }
  return Number(EMPVER_[String(empId)]) || 0;
}
function bumpEmpVer_(empId) {
  var m; try { m = JSON.parse(props_().getProperty('EMP_VER') || '{}') || {}; } catch (e) { m = {}; }
  m[String(empId)] = (Number(m[String(empId)]) || 0) + 1;
  props_().setProperty('EMP_VER', JSON.stringify(m));
  EMPVER_ = m;
}

// ===========================================================================
// GHI NHỚ ĐĂNG NHẬP TRÊN MÁY (30 ngày kể từ lần mở gần nhất)
// ===========================================================================
// Script Property SESS_DEV = { devId: { e: empId, c: lúc tạo, t: lần dùng gần nhất, ua: 'iPhone'… } }
// Khoá máy (dk) = token ký HMAC { r:'dev', e, d } — KHÔNG tự hết hạn; hạn nằm ở t trên
// máy chủ, nên quản lý xoá được bất kỳ lúc nào (đăng xuất từ xa) và máy để quá
// 30 ngày không mở thì tự hết hiệu lực. Đặt lại mã / xoá nhân viên = xoá luôn máy.
var DEV_PROP = 'SESS_DEV';
var DEV_TTL_MS = 90 * 24 * 60 * 60 * 1000;   // v24: nhân viên ghi nhớ 90 ngày, gia hạn mỗi lần mở
var DEV_MAX_PER_EMP = 5;
var DEV_MAX_CHARS = 8000;               // v41: chừa chỗ dưới giới hạn ~9KB của một property
var DEV_ = null;   // đọc một lần cho mỗi lượt chạy
function readDevs_() {
  if (DEV_) return DEV_;
  try { DEV_ = JSON.parse(props_().getProperty(DEV_PROP) || '{}') || {}; } catch (e) { DEV_ = {}; }
  return DEV_;
}
function writeDevs_(m) {
  var now = Date.now();
  Object.keys(m).forEach(function (k) { if (!m[k] || now - (Number(m[k].t) || 0) > DEV_TTL_MS) delete m[k]; });
  // v41: một Script Property chỉ chứa ~9KB. Quá thì setProperty ném lỗi → đăng nhập/mở app chết
  // cả quán. Bỏ dần máy lâu không mở nhất cho tới khi vừa.
  var js = JSON.stringify(m);
  if (js.length > DEV_MAX_CHARS) {
    var ks = Object.keys(m).sort(function (a, b) { return (Number(m[a].t) || 0) - (Number(m[b].t) || 0); });
    while (ks.length && js.length > DEV_MAX_CHARS) { delete m[ks.shift()]; js = JSON.stringify(m); }
  }
  try { props_().setProperty(DEV_PROP, js); } catch (e) { console.warn('writeDevs_: ' + e); }
  DEV_ = m;
}
function devAlive_(d, empId) {
  var x = readDevs_()[d];
  return !!(x && String(x.e) === String(empId) && Date.now() - (Number(x.t) || 0) <= DEV_TTL_MS);
}
function uaLabel_(ua) {
  var s = String(ua || '').slice(0, 24).replace(/[<>"']/g, '');
  return s || '?';
}
/** Tạo máy mới cho nhân viên. Gọi khi ĐANG giữ script lock hoặc tự lấy lock. */
function newDevice_(empId, ua, haveLock) {
  var lock = null;
  if (!haveLock) {
    lock = LockService.getScriptLock();
    if (!lock.tryLock(LOCK_WAIT_MS)) return null;     // không ghi nhớ được thì vẫn cho đăng nhập
  }
  try {
    DEV_ = null;
    var m = readDevs_(), d = Utilities.getUuid().replace(/-/g, '').slice(0, 20), now = Date.now();
    var mine = Object.keys(m).filter(function (k) { return String(m[k].e) === String(empId); })
      .sort(function (a, b) { return (m[a].t || 0) - (m[b].t || 0); });
    while (mine.length >= DEV_MAX_PER_EMP) delete m[mine.shift()];   // giữ tối đa 5 máy / người
    m[d] = { e: empId, c: now, t: now, ua: uaLabel_(ua) };
    writeDevs_(m);
    return { d: d, dk: signToken_({ r: 'dev', e: empId, d: d }) };
  } finally { if (lock) lock.releaseLock(); }
}
/** Xoá máy: theo devId, theo nhân viên, hoặc tất cả (empId === '*'). Không tự lấy lock. */
function dropDevices_(empId, devId) {
  DEV_ = null;
  var m = readDevs_(), n = 0;
  Object.keys(m).forEach(function (k) {
    if ((devId && k === devId) || (!devId && (empId === '*' || String(m[k].e) === String(empId)))) { delete m[k]; n++; }
  });
  if (n) writeDevs_(m);
  return n;
}
/** Mở app bằng khoá máy: trả phiên mới, hoặc lý do không dùng được. */
function resumeDevice_(dk) {
  var p = null;
  try {
    var parts = String(dk || '').split('.');
    if (parts.length === 2 && Utilities.base64EncodeWebSafe(
          Utilities.computeHmacSha256Signature(parts[0], getSecret_('TOKEN_SECRET'))) === parts[1]) {
      p = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
    }
  } catch (e) { p = null; }
  if (!p || p.r !== 'dev' || !p.d || !p.e) return { err: 'bad' };
  var m = readDevs_(), x = m[p.d];
  if (!x || String(x.e) !== String(p.e)) return { err: 'revoked' };
  if (Date.now() - (Number(x.t) || 0) > DEV_TTL_MS) return { err: 'expired' };
  var emps = readEmployees_(), ok = false;
  for (var i = 0; i < emps.length; i++) if (emps[i].id === p.e) ok = true;
  if (!ok) return { err: 'revoked' };
  // Gia hạn: mỗi lần mở app tính lại 30 ngày (ghi tối đa 1 lần / giờ cho đỡ tốn).
  if (Date.now() - (Number(x.t) || 0) > 60 * 60 * 1000) {
    var lock = LockService.getScriptLock();
    if (lock.tryLock(3000)) {
      try { DEV_ = null; var m2 = readDevs_(); if (m2[p.d]) { m2[p.d].t = Date.now(); writeDevs_(m2); } }
      finally { lock.releaseLock(); }
    }
  }
  markSeen_(p.e, 'login', false);
  var out = { token: signToken_({ r: 'emp', e: p.e, d: p.d, v: empVer_(p.e), x: Date.now() + TOKEN_TTL_MS }), e: p.e };
  if (pinWeakMap_()[String(p.e)]) out.weak = true;
  if (x.ua === 'Link') out.link = true;      // v2026.10.16: đường dẫn riêng — người tạo đã được dặn không gửi cho ai
  return out;
}
/** v24: đọc khoá máy KHÔNG gia hạn / KHÔNG ghi gì — chỉ để doGet chào đúng tên ngay khi tải trang. */
function peekDevice_(dk) {
  try {
    var parts = String(dk || '').split('.');
    if (parts.length !== 2 || Utilities.base64EncodeWebSafe(
          Utilities.computeHmacSha256Signature(parts[0], getSecret_('TOKEN_SECRET'))) !== parts[1]) return null;
    var p = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
    if (!p || p.r !== 'dev' || !devAlive_(p.d, p.e)) return null;
    var emps = readEmployees_();
    for (var i = 0; i < emps.length; i++) if (emps[i].id === p.e) return emps[i];
  } catch (e) {}
  return null;
}
/**
 * v24: ĐƯỜNG DẪN VÀO NHANH của nhân viên — một "máy" riêng tên 'Link' (90 ngày từ lần mở gần nhất).
 * Mở link là vào thẳng app (iPhone: thêm vào màn hình chính từ link này). renew = xoá link cũ, tạo link mới.
 */
function empQuickLink(token, renew) {
  var p = auth_(token);
  if (p.r !== 'emp') throw new Error('Chỉ nhân viên mới tạo được đường dẫn vào nhanh.');
  var empId = String(p.e), base = frontUrl_() || readSettings_().appUrl || '';
  if (!base) throw new Error('Chưa triển khai web app — không lấy được link máy chủ.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  var d = null;
  try {
    DEV_ = null;
    var m = readDevs_();
    Object.keys(m).forEach(function (k) {
      if (String(m[k].e) === empId && m[k].ua === 'Link') { if (renew || d) delete m[k]; else d = k; }
    });
    if (d) { m[d].t = Date.now(); writeDevs_(m); }
    else {
      if (renew) writeDevs_(m);
      var nd = newDevice_(empId, 'Link', true);
      if (!nd) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
      d = nd.d;
    }
  } finally { lock.releaseLock(); }
  var dk = signToken_({ r: 'dev', e: empId, d: d });
  return { url: base + (base.indexOf('?') === -1 ? '?' : '&') + 'dk=' + encodeURIComponent(dk), days: Math.round(DEV_TTL_MS / 86400000) };
}
/** Nhân viên bấm Đăng xuất trên máy đang ghi nhớ: xoá đúng máy đó. */
function forgetDevice(token) {
  var p = verifyToken_(token);
  if (!p || p.r !== 'emp' || !p.d) return false;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) return false;
  try { dropDevices_(null, p.d); } finally { lock.releaseLock(); }
  return true;
}
/** Quản lý: đăng xuất từ xa — một người (empId) hoặc tất cả ('*'). */
function revokeDevices(token, empId) {
  requireManager_(token);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try { return dropDevices_(empId === '*' ? '*' : String(empId || '')); } finally { lock.releaseLock(); }
}
/** Tóm tắt máy đang ghi nhớ cho quản lý: { empId: [{ ua, c, t }] } (không lộ khoá). */
function devicesForClient_() {
  var m = readDevs_(), out = {}, now = Date.now();
  Object.keys(m).forEach(function (k) {
    var x = m[k]; if (!x || now - (Number(x.t) || 0) > DEV_TTL_MS) return;
    (out[x.e] = out[x.e] || []).push({ ua: x.ua || '?', c: x.c || 0, t: x.t || 0 });
  });
  return out;
}

// Người đang gọi (mỗi lượt gọi từ trình duyệt là một lần chạy riêng của Apps
// Script nên biến này không lẫn giữa hai người). Dùng để ghi "ai sửa gần nhất".
var WHO_ = null;

var ALLOW_PC_ = false;   // v24: chỉ changeManagerPassword được dùng phiên "phải đổi mật khẩu"
function auth_(token) {
  var p = verifyToken_(token);
  if (!p) throw new Error('Phiên làm việc đã hết hạn. Hãy tải lại trang và đăng nhập lại.');
  if (p.r === 'mgr' && p.pc && !ALLOW_PC_) throw new Error('Hãy đổi mật khẩu quản lý mặc định trước khi dùng app.');
  WHO_ = p;
  return p;
}

// ===========================================================================
// THỜI GIAN SỬA ĐỔI GẦN NHẤT CỦA TỪNG THÁNG
// ===========================================================================
// modMap (Script Properties) = { 'YYYY-MM': { s, sBy, w, wBy } }
//   s / sBy : lần cuối LỊCH XẾP thay đổi, và ai sửa ('m' = quản lý)
//   w / wBy : lần cuối ĐĂNG KÝ / YÊU CẦU thay đổi, và ai sửa (empId hoặc 'm')
// Gắn vào các hàm ghi cấp thấp nên mọi đường sửa (kéo giờ, xếp nháp, dán kế
// hoạch, khôi phục, xoá nhân viên…) đều được ghi lại. Chỉ giữ 24 tháng gần nhất.
var MOD_PROP = 'modMap';
function readMod_() {
  try { return JSON.parse(props_().getProperty(MOD_PROP) || '{}') || {}; } catch (e) { return {}; }
}
function touchMod_(key) {
  var m = /^(schedule|wish|requests):(\d{4}-\d{2})$/.exec(String(key));
  if (!m) return;
  try {
    var all = readMod_(), ym = m[2], r = all[ym] || (all[ym] = {});
    var by = (WHO_ && WHO_.r === 'emp') ? String(WHO_.e) : 'm';
    if (m[1] === 'schedule') { r.s = Date.now(); r.sBy = by; }
    else { r.w = Date.now(); r.wBy = by; }
    var keys = Object.keys(all).sort();
    while (keys.length > 24) delete all[keys.shift()];
    props_().setProperty(MOD_PROP, JSON.stringify(all));
  } catch (e) { /* chỉ là thông tin phụ */ }
}

function requireManager_(token) {
  var p = auth_(token);
  if (p.r !== 'mgr') throw new Error('Chỉ quản lý mới có quyền thực hiện thao tác này.');
  return p;
}

/** Quản lý sửa được cho bất kỳ ai; nhân viên chỉ sửa được cho chính mình. */
function requireCanEdit_(token, empId) {
  var p = auth_(token);
  if (p.r === 'mgr') return p;
  if (p.r === 'emp' && String(p.e) === String(empId)) return p;
  throw new Error('Bạn chỉ có thể sửa ca làm và yêu cầu của chính mình.');
}

/** Hãm phanh chống dò mã. v24: mã nhân viên sai 5 lần → khoá 15 phút. */
function throttle_(bucket) {
  var cache = CacheService.getScriptCache();
  var key = 'fail:' + bucket;
  // Mã nhân viên: EMP_FAIL_MAX lần sai / EMP_LOCK_SEC giây. Mật khẩu quản lý (≥ 6 ký tự): 15 lần / 10 phút,
  // để người ngoài cố tình gõ sai không dễ khoá được quản lý.
  var mgr = bucket === 'mgr', max = mgr ? 15 : EMP_FAIL_MAX, ttl = mgr ? 600 : EMP_LOCK_SEC;
  // GIỮ CHỖ một lần thử TRƯỚC khi so mã, trong lock: gửi song song cũng không thử quá giới hạn.
  // Đúng mã thì xoá bộ đếm. Hàm này không bao giờ được gọi khi đang giữ script lock.
  var lock = LockService.getScriptLock(), got = lock.tryLock(5000), n;
  try {
    n = parseInt(cache.get(key) || '0', 10);
    if (n < max) cache.put(key, String(n + 1), ttl);
  } finally { if (got) lock.releaseLock(); }
  if (n >= max) throw new Error(mgr ? 'Nhập sai quá nhiều lần. Vui lòng chờ 10 phút rồi thử lại.' : 'Nhập sai quá nhiều lần. Vui lòng chờ 15 phút rồi thử lại.');
  return {
    fail: function () { /* đã tính lúc giữ chỗ */ },
    ok:   function () { cache.remove(key); }
  };
}

// ===========================================================================
// ĐĂNG NHẬP
// ===========================================================================

/** Client gọi đầu tiên khi mở app. Không cần token — chỉ trả danh sách tên
 *  và trạng thái "đã đặt mã PIN hay chưa", không trả bất kỳ mã nào. */
// Phải trùng với APP_VERSION trong Index.html — lệch là app báo "dán lại cả hai file".
var APP_VERSION = '2026.10.24.5';

function bootstrap(dk, ym) {
  var t0 = Date.now();
  warmSecrets_();
  var ST = readSettings_(), AT = ST.att || {};
  var employees = [], empErr = '';
  try { employees = readEmployees_(); } catch (eE) { empErr = String((eE && eE.message) || eE); }   // v41: vẫn mở được màn đăng nhập quản lý để khôi phục
  var session = null, sessionErr = null;
  if (dk) {
    var r; try { r = resumeDevice_(dk); } catch (eR) { r = { err: 'data' }; }
    if (r.token) session = r; else sessionErr = r.err;
  }
  // Máy đã ghi nhớ vào thẳng → không cần biết ai đã đặt mã (chỉ màn đăng nhập dùng) → bớt một lượt đọc sheet.
  var pinMap = session && session.token ? null : readAllPinIds_();
  var tM = 0, month = null;
  if (session && session.token && ym) {
    var t1 = Date.now();
    try { month = loadMonth(session.token, ym); } catch (e) { month = null; }
    tM = Date.now() - t1;
  }
  return {
    session: session,          // mở bằng máy đã ghi nhớ → vào thẳng (v24: session.weak = mã cũ cần đổi)
    sessionErr: sessionErr,    // 'expired' | 'revoked' | 'bad'
    employees: employees.map(function (e) {
      return { id: e.id, name: e.name, hasPin: pinMap ? !!pinMap[e.id] : true };
    }),
    empErr: empErr,
    storeName: ST.storeName,
    look: { skin: ST.skin, accent: ST.accent, noteColor: ST.noteColor },
    managerPasswordIsDefault: !props_().getProperty('MANAGER_PWD_HASH'),
    attOn: !!AT.on,       // hiện mục "打刻" ở màn đăng nhập
    attKiosk: AT.on ? attKioskUrl_() : '',
    attMode: AT.mode || 'show',
    attMethods: AT.methods || null,
    hr: hrBoot_(),
    version: APP_VERSION,
    // Máy đã ghi nhớ: gửi luôn dữ liệu tháng trong CÙNG lượt gọi (bớt một vòng hỏi máy chủ ~1 giây khi mở app).
    month: month,
    // Thời gian máy chủ xử lý (ms) — hiện ở ⚙ của nhân viên để đo tốc độ mở app.
    perf: { srv: Date.now() - t0, month: tM }
  };
}

// --- Cấu hình chung của cửa hàng (không phụ thuộc tháng) --------------------
// storeName : tên quán hiện trên đầu app và trên bảng in.
// openHour  : giờ mở cửa của quán (mặc định 8:00), bước 30 phút.
// closeHour : giờ đóng cửa MẶC ĐỊNH ("L", mặc định 21:00). Ngày nào khác thì
//             quản lý vẫn sửa riêng ở ô "Đóng cửa (L)" của ngày đó.
// staffing  : định mức số người cần theo từng khung 1 tiếng, tách theo thứ.
//             Ô thứ i ứng với giờ staffBase + i (dữ liệu cũ: 8..20, staffBase=8).
// budgetSa  : trần giờ SA cho cả tháng; null = không đặt.

function readSettings_() {
  var raw = kvGet_('settings');
  var o = {};
  if (raw) { try { o = JSON.parse(raw) || {}; } catch (e) { o = {}; } }
  return normalizeSettings_(o);
}

var STAFF_KEYS = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'hol'];

function normalizeSettings_(o) {
  var out = { storeName: '', staffing: {}, staffBase: 8, openHour: 8, closeHour: 21, lastOrder: null, loStay: 2,
              budgetSa: null, budgetStaff: null, appUrl: '',
              restHours: 11, weeklyOff: true, rush: [[11, 13.5], [17, 19]], quiet: null,
              shiftTpl: [], noteTpl: [],
              // Ngày 発注 (đặt hàng) và 納品 (nhận hàng) theo THỨ trong tuần.
              // 0 = Chủ nhật … 6 = Thứ Bảy. Bật/tắt riêng để sau này đổi cho dễ.
              orderOn: true,  orderDows: [1, 3, 4, 5, 0],
              deliverOn: true, deliverDows: [1, 2, 4, 5, 6],
              orderOff: [], deliverOff: [] };
  // Mấy câu ghi chú ca hay dùng (vd. tên tiệm được điều đi) — bấm một phát là
  // điền, không phải gõ lại mỗi lần.
  if (o.noteTpl && typeof o.noteTpl.length === 'number') {
    for (var ni = 0; ni < o.noteTpl.length && out.noteTpl.length < 8; ni++) {
      var nv = String(o.noteTpl[ni] == null ? '' : o.noteTpl[ni]).trim().slice(0, 60);
      if (nv && out.noteTpl.indexOf(nv) === -1) out.noteTpl.push(nv);
    }
  }
  // Nghỉ giữa ca hôm trước và ca hôm sau. 11 tiếng là mức nhà nước khuyến nghị
  // (勤務間インターバル), chưa bắt buộc. 0 = không áp dụng.
  var rh = Number(o.restHours);
  out.restHours = (isFinite(rh) && rh >= 0 && rh <= 24) ? rh : 11;
  // Mỗi tuần ít nhất một ngày nghỉ — điều 35 Luật Lao động, bắt buộc.
  out.weeklyOff = (o.weeklyOff === undefined) ? true : !!o.weeklyOff;
  // Kết nối với các quán khác (xin / nhận chi viện). Mặc định tắt.
  out.hubOn = !!o.hubOn;
  // Mã quán (v.8): 2–6 chữ in hoa/số, đứng trước số nhân viên → mã nhân viên "OTA-007".
  out.storeCode = /^[A-Z0-9]{2,6}$/.test(String(o.storeCode || '')) ? String(o.storeCode) : '';
  out.storeCodeAuto = !!(out.storeCode && o.storeCodeAuto);     // mã do máy tự đặt → đổi tên quán thì đặt lại
  // Giao diện (v.6): mẫu mặc định của quán, màu chủ đạo, màu chữ dặn dò, màu bản in.
  out.skin = ['modern', 'blue', 'mono', 'classic'].indexOf(o.skin) !== -1 ? o.skin : 'modern';
  var hex6 = function (x) { return /^#[0-9a-fA-F]{6}$/.test(String(x || '')) ? String(x) : ''; };
  out.accent = hex6(o.accent);
  out.noteColor = hex6(o.noteColor);
  out.prc = {};
  ['work', 'brk', 'sup', 'need', 'gap', 'note', 'bar'].forEach(function (k) { var v = hex6(o.prc && o.prc[k]); if (v) out.prc[k] = v; });
  out.prSum = ['none', 'half', 'month'].indexOf(o.prSum) !== -1 ? o.prSum : 'half';
  out.prBudget = o.prBudget === undefined ? true : !!o.prBudget;
  out.prStyle = o.prStyle === 'compact' ? 'compact' : 'full';
  out.prNeed = o.prNeed === undefined ? true : !!o.prNeed;
  // Tuỳ chỉnh bản in (v.10)
  var po = o.prOpt && typeof o.prOpt === 'object' ? o.prOpt : {};
  out.prOpt = { fs: [0.9, 1, 1.12].indexOf(Number(po.fs)) !== -1 ? Number(po.fs) : 1 };
  ['tasks', 'off', 'notes', 'stats'].forEach(function (k) { out.prOpt[k] = po[k] === undefined ? true : !!po[k]; });
  ['code', 'star', 'stamp', 'at'].forEach(function (k) { out.prOpt[k] = !!po[k]; });
  out.prOpt.title = String(po.title == null ? '' : po.title).replace(/[<>]/g, '').trim().slice(0, 40);
  // Điều kiện thay thế cho định mức (v.9): "cần N người — có M người ベテラン là đủ".
  // Điểm danh bằng QR (v.11, thử nghiệm): quản lý bật/tắt; grace = số phút đến trễ vẫn chưa tính là muộn.
  var at0 = o.att && typeof o.att === 'object' ? o.att : {}, gr = Math.round(Number(at0.grace));
  var ku = String(at0.kioskUrl == null ? '' : at0.kioskUrl).trim();
  // methods (v.14): bật RIÊNG từng cách — show: màn hình quán hiện QR · scan: máy quét mã của nhân viên · nfc: chạm thẻ IC.
  var mt0 = at0.methods && typeof at0.methods === 'object' ? at0.methods : { show: at0.mode !== 'scan', scan: at0.mode === 'scan', nfc: false };
  var mt = { show: !!mt0.show, scan: !!mt0.scan, nfc: !!mt0.nfc };
  if (!mt.show && !mt.scan && !mt.nfc) mt.show = true;
  out.att = { on: !!at0.on, grace: (isFinite(gr) && gr >= 0 && gr <= 30) ? gr : 5,
              mode: (mt.scan && !mt.show && !mt.nfc) ? 'scan' : 'show',      // giữ cho bản cũ: show / scan
              methods: mt, health: at0.health !== false, auto: at0.auto !== false,
              kioskUrl: /^https:\/\/[^\s"<>]{4,300}$/.test(ku) ? ku : '',   // trang máy quét tự host (nếu có)
              // v2026.10.16: kiểm tra việc trước khi bấm thẻ về — bật/tắt + mã các việc phải xong
              closeCheck: { on: !!(at0.closeCheck && at0.closeCheck.on),
                            ids: (at0.closeCheck && Array.isArray(at0.closeCheck.ids) ? at0.closeCheck.ids : []).map(String).filter(function (x) { return /^[\w-]{1,40}$/.test(x); }).slice(0, 30) } };
  out.altRules = [];
  (Array.isArray(o.altRules) ? o.altRules : []).slice(0, 8).forEach(function (r) {
    var n = Math.round(Number(r && r.n)), m = Math.round(Number(r && r.m));
    if (!(n >= 2 && n <= 20 && m >= 1 && m < n)) return;
    if (out.altRules.some(function (x) { return x.n === n; })) return;
    out.altRules.push({ n: n, m: m });
  });
  out.altRules.sort(function (a, b) { return a.n - b.n; });
  // Thứ tự nhân viên (v.7): bản in / màn ngày xếp theo giờ vào · chức vụ · thứ tự quán.
  var ORD_ = ['time', 'rank', 'list'], oo = o.ord || {};
  out.ord = {
    print: ORD_.indexOf(oo.print) !== -1 ? oo.print : 'time',
    day: ORD_.indexOf(oo.day) !== -1 ? oo.day : 'time',
    supLast: oo.supLast === undefined ? true : !!oo.supLast
  };
  out.rankNames = [0, 1, 2, 3].map(function (i) {
    var v = o.rankNames && o.rankNames[i];
    return String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12);
  });
  // Lương giờ bình quân (ước tính chi phí nhân sự trong báo cáo tháng) — chỉ quản lý thấy.
  var wg = Math.round(Number(o.wage));
  out.wage = (isFinite(wg) && wg >= 0 && wg <= 10000) ? wg : 0;
  // v23: tỷ lệ nhân công mục tiêu (%) cho dự toán giờ theo 予算 — mặc định 22, cho phép 10–50, bước 0,5.
  var lp = Math.round(Number(o.laborPct) * 2) / 2;
  out.laborPct = (isFinite(lp) && lp >= 10 && lp <= 50) ? lp : 22;
  // Ngôn ngữ BẢN IN (in / xuất PDF): mặc định tiếng Nhật, không đổi theo ngôn ngữ giao diện.
  out.printLang = ['ja', 'vi', 'en'].indexOf(o.printLang) !== -1 ? o.printLang : 'ja';
  // Email báo cho quản lý khi nhân viên báo nghỉ / xin đổi ca (tối đa 3 địa chỉ, cách nhau dấu phẩy).
  out.mailOn = !!o.mailOn;
  out.mailTo = String(o.mailTo == null ? '' : o.mailTo).split(/[,;\s]+/).map(function (x) { return x.trim(); })
    .filter(function (x) { return /^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$/.test(x); }).slice(0, 3).join(',');
  // Quán đi chi viện + giờ mở/đóng cửa của quán đó (ca ✈ tính L theo quán đó).
  out.supStores = [];
  if (o.supStores && typeof o.supStores.length === 'number') {
    for (var si = 0; si < o.supStores.length && out.supStores.length < 8; si++) {
      var sx = o.supStores[si] || {}, snm = String(sx.name == null ? '' : sx.name).trim().slice(0, 40);
      var so = Math.round(Number(sx.open) * 2) / 2, sc = Math.round(Number(sx.close) * 2) / 2;
      if (!snm || !(isFinite(so) && isFinite(sc) && so >= 0 && sc <= 27 && sc - so >= 4)) continue;
      if (out.supStores.some(function (y) { return y.name === snm; })) continue;
      out.supStores.push({ name: snm, open: so, close: sc });
    }
  }
  // Nhân viên chỉ thấy lịch ĐÃ CÔNG BỐ (ngày chưa chốt không hiện ca). TẮT mặc định:
  // bật sẵn làm nhân viên mở app thấy trống trơn những ngày chưa chốt (tưởng mất dữ liệu).
  out.hideDraft = o.hideDraft === true;
  // Kỹ năng tự thêm: [{k:"c1ab", n:"Nướng bánh"}], tối đa 12.
  out.customTags = [];
  if (o.customTags && typeof o.customTags.length === 'number') {
    var seenK = {};
    for (var ci = 0; ci < o.customTags.length && out.customTags.length < 12; ci++) {
      var ct = o.customTags[ci] || {};
      var ck = String(ct.k || ''), cn = String(ct.n == null ? '' : ct.n).trim().slice(0, 20);
      if (!CUSTOM_TAG_RE.test(ck) || !cn || seenK[ck]) continue;
      seenK[ck] = true; out.customTags.push({ k: ck, n: cn });
    }
  }
  // Yêu cầu kỹ năng theo khung giờ: [{tag, from, to, n, dows}] — vd. 8:00–10:00
  // cần ít nhất 1 người "mở cửa được". dows: 0..6 = CN..T7, 7 = ngày lễ; rỗng = mọi ngày.
  out.skillReq = [];
  if (o.skillReq && typeof o.skillReq.length === 'number') {
    for (var ri = 0; ri < o.skillReq.length && out.skillReq.length < 20; ri++) {
      var rq = o.skillReq[ri] || {};
      var rtag = String(rq.tag || '');
      var okTag = ALLOWED_TAGS.indexOf(rtag) !== -1 ||
                  out.customTags.some(function (c) { return c.k === rtag; });
      var rf = Math.round(Number(rq.from) * 2) / 2, rt = Math.round(Number(rq.to) * 2) / 2;
      var rn = Math.round(Number(rq.n));
      if (!okTag || !isFinite(rf) || !isFinite(rt) || rf < 0 || rt > 26 || rt <= rf) continue;
      var dws = [];
      if (rq.dows && typeof rq.dows.length === 'number') {
        for (var di = 0; di < rq.dows.length && dws.length < 8; di++) {
          var dv = Math.round(Number(rq.dows[di]));
          if (isFinite(dv) && dv >= 0 && dv <= 7 && dws.indexOf(dv) === -1) dws.push(dv);
        }
      }
      out.skillReq.push({ tag: rtag, from: rf, to: rt, n: (isFinite(rn) && rn >= 1 && rn <= 9) ? rn : 1, dows: dws.sort() });
    }
  }
  if (typeof o.storeName === 'string') out.storeName = o.storeName.slice(0, 60);
  // Link phát cho nhân viên. Chỉ nhận https:// để mã QR không dẫn đi đâu khác.
  if (typeof o.appUrl === 'string' && /^https:\/\//.test(o.appUrl)) out.appUrl = o.appUrl.slice(0, 300);
  // Định mức người theo khung giờ, tách riêng TỪNG THỨ + ngày lễ:
  //   d0 = Chủ nhật … d6 = Thứ Bảy, hol = ngày lễ.
  // Dữ liệu cũ chỉ có 3 dòng wd/sat/sun nên chuyển sang: CN lấy sun, T7 lấy
  // sat, T2–T6 lấy wd, ngày lễ lấy sun (ngày lễ đông khách như chủ nhật).
  var src = o.staffing || {};
  var legacy = (src.d0 === undefined && src.d1 === undefined &&
                (src.wd !== undefined || src.sat !== undefined || src.sun !== undefined));
  function pickRow(key) {
    if (!legacy) return src[key] || [];
    if (key === 'd0') return src.sun || [];
    if (key === 'd6') return src.sat || [];
    if (key === 'hol') return src.sun || [];
    return src.wd || [];
  }
  // Giờ mở / đóng cửa của quán. Mỗi quán một bản app riêng nên đặt ở đây.
  var oh = Number(o.openHour), ch = Number(o.closeHour);
  out.openHour = (isFinite(oh) && oh >= 0 && oh <= 14) ? Math.round(oh * 2) / 2 : 8;
  out.closeHour = (isFinite(ch) && ch >= 12 && ch <= 26) ? Math.round(ch * 2) / 2 : 21;
  if (out.closeHour - out.openHour < 4) out.closeHour = Math.min(26, out.openHour + 4);
  // Last order: tới giờ này chỉ giữ loStay người ở lại dọn tới L. null = không dùng.
  var lo = Number(o.lastOrder);
  out.lastOrder = (o.lastOrder != null && o.lastOrder !== '' && isFinite(lo) &&
                   lo > out.openHour && lo < out.closeHour) ? Math.round(lo * 2) / 2 : null;
  var ls = Math.round(Number(o.loStay));
  out.loStay = (isFinite(ls) && ls >= 1 && ls <= 9) ? ls : 2;
  var sb = Math.round(Number(o.staffBase));
  out.staffBase = (isFinite(sb) && sb >= 0 && sb <= 20) ? sb : 8;
  STAFF_KEYS.forEach(function (k) {
    var row = pickRow(k);
    out.staffing[k] = [];
    // Dữ liệu cũ luôn 13 ô (8h–20h). Nay số ô theo giờ mở–đóng cửa, tối đa 24.
    var len = Math.min(24, Math.max(1, (row && row.length) || 13));
    for (var i = 0; i < len; i++) {
      var v = Number(row[i]);
      out.staffing[k].push((isFinite(v) && v > 0) ? Math.min(99, Math.round(v)) : 0);
    }
  });
  // 発注 / 納品: danh sách thứ, kèm danh sách NGÀY tắt riêng lẻ (vd. ngày lễ
  // không đặt hàng) — dạng "YYYY-MM-D" để không lẫn giữa các tháng.
  function dowList(a, def) {
    if (!a || typeof a.length !== 'number') return def.slice();
    var out = [];
    for (var i = 0; i < a.length && out.length < 7; i++) {
      var v = Math.round(Number(a[i]));
      if (isFinite(v) && v >= 0 && v <= 6 && out.indexOf(v) === -1) out.push(v);
    }
    return out;
  }
  function dayKeyList(a) {
    if (!a || typeof a.length !== 'number') return [];
    var out = [];
    for (var i = 0; i < a.length && out.length < 400; i++) {
      var k = String(a[i] == null ? '' : a[i]);
      if (/^\d{4}-\d{2}-\d{1,2}$/.test(k) && out.indexOf(k) === -1) out.push(k);
    }
    return out;
  }
  out.orderOn = (o.orderOn === undefined) ? true : !!o.orderOn;
  out.deliverOn = (o.deliverOn === undefined) ? true : !!o.deliverOn;
  out.orderDows = dowList(o.orderDows, [1, 3, 4, 5, 0]);
  out.deliverDows = dowList(o.deliverDows, [1, 2, 4, 5, 6]);
  out.orderOff = dayKeyList(o.orderOff);
  out.deliverOff = dayKeyList(o.deliverOff);
  ['budgetSa', 'budgetStaff'].forEach(function (k) {
    var v = Number(o[k]);
    out[k] = (isFinite(v) && v > 0) ? v : null;
  });
  // Giờ cao điểm, tối đa 4 khung, mỗi khung [từ, đến] trong ngày. Khung ngược
  // hoặc rỗng bị loại; loại hết thì quay về mặc định trưa + tối.
  if (Array.isArray(o.rush)) {
    var rr = [];
    for (var ri = 0; ri < o.rush.length && rr.length < 4; ri++) {
      var pair = o.rush[ri];
      if (!pair || pair.length < 2) continue;
      var a = Number(pair[0]), b = Number(pair[1]);
      if (!isFinite(a) || !isFinite(b)) continue;
      a = Math.max(0, Math.min(24, Math.round(a * 2) / 2));
      b = Math.max(0, Math.min(24, Math.round(b * 2) / 2));
      if (b > a) rr.push([a, b]);
    }
    if (rr.length) out.rush = rr;
  }
  // Ca chuẩn của quán: những khung giờ quán vẫn hay dùng, ví dụ 09:00–15:00,
  // 16:00–21:00. Máy xếp nháp sẽ chuộng những khung này hơn giờ lẻ.
  out.shiftTpl = [];
  if (Array.isArray(o.shiftTpl)) {
    for (var ti = 0; ti < o.shiftTpl.length && out.shiftTpl.length < 8; ti++) {
      var tp = o.shiftTpl[ti];
      if (!tp || tp.length < 2) continue;
      var ta = Number(tp[0]), tb = Number(tp[1]);
      if (!isFinite(ta) || !isFinite(tb)) continue;
      ta = Math.max(0, Math.min(24, Math.round(ta * 2) / 2));
      tb = Math.max(0, Math.min(24, Math.round(tb * 2) / 2));
      if (tb > ta) out.shiftTpl.push([ta, tb]);
    }
  }
  // Khung giờ vắng khách — chỗ ưu tiên nhét giờ nghỉ giải lao vào. null = chưa
  // khai, lúc đó máy tự tìm lúc dư người nhất.
  if (o.quiet && o.quiet.length >= 2) {
    var qa = Number(o.quiet[0]), qb = Number(o.quiet[1]);
    if (isFinite(qa) && isFinite(qb)) {
      qa = Math.max(0, Math.min(24, Math.round(qa * 2) / 2));
      qb = Math.max(0, Math.min(24, Math.round(qb * 2) / 2));
      if (qb > qa) out.quiet = [qa, qb];
    }
  }
  return out;
}

/**
 * Link /exec mà Google đang cấp cho bản triển khai này.
 * Dùng để dựng mã QR ngay trong app, khỏi phải chép tay từ hộp thoại triển khai.
 * Lưu ý: nếu quản lý tạo "Bản triển khai mới" thay vì sửa bản cũ, hàm này trả về
 * link MỚI — nên màn Cài đặt vẫn cho sửa tay và ghi đè vào settings.appUrl.
 */
function getAppUrl(token) {
  requireManager_(token);
  return frontUrl_();          // v44: có trang GitHub thì trả link trang GitHub
}

function saveSettings(token, settingsJson) {
  requireManager_(token);
  var o;
  try { o = JSON.parse(settingsJson); } catch (e) { throw new Error('Dữ liệu cấu hình không hợp lệ.'); }
  var prev = readSettings_();
  // Mã quán do máy chủ cấp / màn Kết nối đổi — bản cài đặt cũ trên máy không được xoá mất.
  if (o) { o.storeCode = prev.storeCode || ''; o.storeCodeAuto = prev.storeCodeAuto; }    // mã quán chỉ đổi qua storeCodeSave / hubJoin
  if (o) o.att = prev.att;                       // bật/tắt điểm danh chỉ đổi qua attConfig
  // Mã quán máy tự đặt khi chưa có tên quán → đặt tên rồi thì tạo lại theo tên (vd. Ootagawa → OOT).
  if (o && prev.storeCodeAuto && String(o.storeName || '') !== String(prev.storeName || '')) { o.storeCode = ''; o.storeCodeAuto = false; }
  var norm = normalizeSettings_(o || {});
  kvSet_('settings', JSON.stringify(norm));
  CLOSE_DEF_ = null;
  ensureMailTrigger_(!!(norm.mailOn && norm.mailTo) || staffMailInUse_());
  if (prev.hubOn && !norm.hubOn) { try { supHubOffNotify_(); } catch (eH) {} }    // v41: báo các quán đang được mình cử người tới
  if (!!prev.hubOn !== !!norm.hubOn) { ensureHubTrigger_(!!norm.hubOn); hubRegister_(true); }
  return true;
}

// ---------------------------------------------------------------------------
// v41: CÁCH ĐỌC MẬT KHẨU DO MÁY CHỦ TỰ DỰNG (trước đây máy gửi lên tới 80 "cách đọc" →
// kẻ đoán mật khẩu được thử 80 mật khẩu cho mỗi lần sai). Giờ máy chỉ gửi chuỗi đã gõ;
// máy chủ tự đổi: toàn góc → nửa góc, telex/VNI có dấu → phím đã bấm, kana → romaji. Tối đa 12.
// ---------------------------------------------------------------------------
var PW_MAX_CANDS_ = 12;
var VN_TONE_ = { '́': ['s', '1'], '̀': ['f', '2'], '̉': ['r', '3'], '̃': ['x', '4'], '̣': ['j', '5'] };
function pwNfkc_(s) { s = String(s == null ? '' : s); try { return s.normalize('NFKC'); } catch (e) { return s; } }
function pwAscii_(s) { return /^[\x21-\x7E]*$/.test(s); }
function pwDeAccent_(s) { var x = String(s).replace(/đ/g, 'd').replace(/Đ/g, 'D'); try { x = x.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {} return x; }
function vnSplit_(ch) {
  if (ch === 'đ') return { b: 'd', m: 'd', t: null };
  if (ch === 'Đ') return { b: 'D', m: 'd', t: null };
  var d = ch; try { d = ch.normalize('NFD'); } catch (e) {}
  var b = d.charAt(0), m = null, tn = null;
  if (!/[A-Za-z]/.test(b)) return null;
  for (var i = 1; i < d.length; i++) {
    var c = d.charAt(i);
    if (c === '̂') m = 'circ'; else if (c === '̆') m = 'breve'; else if (c === '̛') m = 'horn'; else if (VN_TONE_[c]) tn = c; else return null;
  }
  return { b: b, m: m, t: tn };
}
function vnWordKeys_(word, vni, wAlone) {
  var base = '', keys = [];
  for (var i = 0; i < word.length; i++) {
    var sp = vnSplit_(word.charAt(i)); if (!sp) return null;
    var nx = i + 1 < word.length ? vnSplit_(word.charAt(i + 1)) : null;
    if (!vni && wAlone && sp.m === 'horn' && sp.b.toLowerCase() === 'u' && !(nx && nx.m === 'horn')) {
      base += sp.b === 'U' ? 'W' : 'w';
      if (sp.t) keys.push({ k: VN_TONE_[sp.t][0], at: base.length, tone: true });
      continue;
    }
    base += sp.b;
    var at = base.length, last = keys.length ? keys[keys.length - 1] : null;
    if (sp.m) {
      var k = sp.m === 'circ' ? (vni ? '6' : sp.b.toLowerCase()) : sp.m === 'breve' ? (vni ? '8' : 'w') : sp.m === 'horn' ? (vni ? '7' : 'w') : (vni ? '9' : sp.b.toLowerCase());
      if (sp.m === 'horn' && last && last.horn && last.hornEnd === at - 1) { last.at = at; last.hornEnd = at; }
      else keys.push({ k: k, at: at, horn: sp.m === 'horn', hornEnd: at });
    }
    if (sp.t) keys.push({ k: VN_TONE_[sp.t][vni ? 1 : 0], at: at, tone: true });
  }
  return { base: base, keys: keys };
}
function vnBuild_(base, keys, pos) {
  var out = '';
  for (var i = 0; i < base.length; i++) { out += base.charAt(i); for (var j = 0; j < keys.length; j++) if (pos[j] === i + 1) out += keys[j].k; }
  return out;
}
function vnWordVariants_(wk) {
  var L = wk.base.length, K = wk.keys, out = [];
  function add(pos) { var s = vnBuild_(wk.base, K, pos); if (out.indexOf(s) === -1) out.push(s); }
  add(K.map(function (k) { return k.at; }));
  add(K.map(function () { return L; }));
  add(K.map(function (k) { return k.tone ? L : k.at; }));
  add(K.map(function (k) { return k.tone ? k.at : L; }));
  return out;
}
function vnVariants_(s, vni, wAlone) {
  var parts = [], cur = '', isW = false;
  for (var i = 0; i < s.length; i++) {
    var ch = s.charAt(i), w = !!vnSplit_(ch);
    if (w !== isW && cur) { parts.push({ w: isW, s: cur }); cur = ''; }
    isW = w; cur += ch;
  }
  if (cur) parts.push({ w: isW, s: cur });
  var acc = [''];
  for (var p = 0; p < parts.length; p++) {
    var vs = [parts[p].s];
    if (parts[p].w && /[^A-Za-z]/.test(parts[p].s)) { var wk = vnWordKeys_(parts[p].s, vni, wAlone); vs = wk ? vnWordVariants_(wk) : [parts[p].s]; }
    var nx = [];
    for (var a = 0; a < acc.length && nx.length < 16; a++) for (var b = 0; b < vs.length && nx.length < 16; b++) nx.push(acc[a] + vs[b]);
    acc = nx;
  }
  return acc;
}
var KANA_RO_ = (function () {
  var m = {}, h = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽぁぃぅぇぉゔ';
  var r = ['a','i','u','e','o','ka','ki','ku','ke','ko','sa','shi','su','se','so','ta','chi','tsu','te','to','na','ni','nu','ne','no','ha','hi','fu','he','ho',
           'ma','mi','mu','me','mo','ya','yu','yo','ra','ri','ru','re','ro','wa','wo','n','ga','gi','gu','ge','go','za','ji','zu','ze','zo','da','ji','zu','de','do',
           'ba','bi','bu','be','bo','pa','pi','pu','pe','po','a','i','u','e','o','vu'];
  for (var i = 0; i < h.length; i++) m[h.charAt(i)] = r[i];
  return m;
})();
var KANA_KUN_ = { shi: 'si', chi: 'ti', tsu: 'tu', fu: 'hu', ji: 'zi' };
function kanaRomaji_(s, kun) {
  var t0 = s.replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); }), out = '', dbl = false;
  for (var i = 0; i < t0.length; i++) {
    var c = t0.charAt(i), n = t0.charAt(i + 1), r = KANA_RO_[c];
    if (c === 'っ') { dbl = true; continue; }
    if (c === 'ー') { out += '-'; continue; }
    if (r === undefined) { out += c; dbl = false; continue; }
    if (kun && KANA_KUN_[r]) r = KANA_KUN_[r];
    if ('ゃゅょ'.indexOf(n) !== -1 && /i$/.test(r) && r !== 'i') {
      var y = { 'ゃ': 'a', 'ゅ': 'u', 'ょ': 'o' }[n];
      if (!kun && /^(shi|chi|ji)$/.test(r)) r = r.slice(0, -1) + y; else r = r.slice(0, -1) + 'y' + y;
      i++;
    }
    if (dbl) { r = r.charAt(0) + r; dbl = false; }
    out += r;
  }
  return out;
}
/** Các mật khẩu sẽ thử cho chuỗi người dùng gõ (chuỗi gốc trước), tối đa PW_MAX_CANDS_. */
function pwCands_(raw) {
  raw = String(raw == null ? '' : raw);
  if (raw.length > 64) raw = raw.slice(0, 64);
  var out = [];
  function add(x) { x = String(x == null ? '' : x); if (x && x.length <= 64 && out.indexOf(x) === -1 && out.length < PW_MAX_CANDS_) out.push(x); }
  add(raw.trim());                                        // mật khẩu cũ có thể có dấu cách / chữ thường giữ nguyên
  var s = pwNfkc_(raw).replace(/\s+/g, '');
  if (pwAscii_(s)) { add(s); return out; }
  function addA(x) { x = pwNfkc_(x).replace(/\s+/g, ''); if (pwAscii_(x)) add(x); }
  if (/[ぁ-ゖァ-ヺー]/.test(s)) { addA(kanaRomaji_(s, false)); addA(kanaRomaji_(s, true)); addA(kanaRomaji_(s, false).replace(/n(?=[^aiueoy]|$)/g, 'nn')); }
  var tx = vnVariants_(s, false, false), vn = vnVariants_(s, true, false), tw = vnVariants_(s, false, true);
  for (var i = 0; i < 3; i++) if (tx[i]) addA(tx[i]);
  for (var j = 0; j < 2; j++) if (vn[j]) addA(vn[j]);
  if (tw[0]) addA(tw[0]);
  addA(pwDeAccent_(s));
  addA(s.replace(/[^\x21-\x7E]/g, ''));
  tx.concat(tw, vn).forEach(addA);
  return out;
}
/** Mã số (PIN / mật khẩu phiếu lương): toàn góc → nửa góc, bỏ khoảng trắng. */
function pinNorm_(v) { return pwNfkc_(v).replace(/\s+/g, ''); }
/** Chỉ số cách đọc khớp mật khẩu quản lý (-1 = không khớp). Danh sách "alts" từ máy KHÔNG còn được dùng. */
function mgrPwdMatch_(password) {
  var stored = props_().getProperty('MANAGER_PWD_HASH');
  var list = pwCands_(password);
  for (var i = 0; i < list.length; i++) if (stored ? stored === hashPwd_(list[i]) : list[i] === DEFAULT_MANAGER_PASSWORD) return i;
  return -1;
}
function loginManager(password, alts) {
  var th = throttle_('mgr');
  var stored = props_().getProperty('MANAGER_PWD_HASH');
  var mi = mgrPwdMatch_(password), ok = mi !== -1;
  if (!ok) { th.fail(); throw new Error('Mật khẩu quản lý không đúng.'); }
  th.ok();
  // v24: còn mật khẩu mặc định → phiên chỉ dùng được để đổi mật khẩu (app hiện hộp bắt đổi ngay).
  var must = !stored && MGR_FORCE_PWD_CHANGE;
  var pl = { r: 'mgr', e: null, v: mgrVer_(), x: Date.now() + TOKEN_TTL_MS };
  if (must) pl.pc = 1;
  return {
    token: signToken_(pl),
    isDefaultPassword: !stored,
    mustChange: must,
    mi: mi
  };
}

function changeManagerPassword(token, oldPassword, newPassword, oldAlts) {
  ALLOW_PC_ = true;
  try { requireManager_(token); } finally { ALLOW_PC_ = false; }
  var thc = throttle_('mgr');
  if (mgrPwdMatch_(oldPassword) === -1) { thc.fail(); throw new Error('Mật khẩu hiện tại không đúng.'); }
  thc.ok();
  var np = pwNfkc_(newPassword).trim();
  if (np.length < 6) throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
  if (!/^[\x21-\x7E]+$/.test(np)) throw new Error('Mật khẩu mới chỉ dùng chữ ABC không dấu, số và ký hiệu (bộ gõ tiếng Việt / tiếng Nhật đang bật?).');
  if (np === DEFAULT_MANAGER_PASSWORD) throw new Error('Không dùng lại mật khẩu mặc định.');
  props_().setProperty('MANAGER_PWD_HASH', hashPwd_(np));
  // v41: mọi phiên quản lý cũ (kể cả máy lạ từng biết mật khẩu cũ) hết hiệu lực; máy này nhận phiên mới.
  var mv = bumpMgrVer_();
  // v24: trả phiên mới (không còn cờ "phải đổi mật khẩu").
  return { ok: true, token: signToken_({ r: 'mgr', e: null, v: mv, x: Date.now() + TOKEN_TTL_MS }) };
}

/** Nhân viên đã có mã — đăng nhập bằng mã đó. */
function loginEmployee(empId, pin, remember, ua, alts) {
  assertEmployeeExists_(empId);
  var th = throttle_('emp:' + empId);
  var stored = readPin_(empId);
  if (!stored) {
    throw new Error('Tên này chưa được đặt mã. Hãy bấm lại và chọn "Tạo mã mới".');
  }
  // Bộ gõ Nhật: máy chủ tự thử bản nửa góc / chỉ giữ chữ số (không nhận danh sách đoán từ máy nữa).
  if (!pinMatches_(empId, stored, pin)) {
    var p0 = String(pin == null ? '' : pin), pn = pinNorm_(p0);
    var alt = [p0.trim(), pn, pn.replace(/[^0-9]/g, '')].filter(function (x) { return x && pinMatches_(empId, stored, x); })[0];
    if (alt) pin = alt;
  }
  if (!pinMatches_(empId, stored, pin)) {
    th.fail();
    throw new Error('Mã xác thực không đúng.');
  }
  th.ok();
  // Nâng cấp âm thầm mã cũ (lưu dạng chữ thường) sang dạng hash.
  if (String(stored).indexOf('h1:') !== 0) writePin_(empId, hashPin_(empId, String(pin)));
  markSeen_(empId, 'login', true);
  var weak = pinWeak_(pin);
  try { setPinWeak_(empId, weak); } catch (eW) {}
  var ses = empSession_(empId, remember, ua, false);
  if (weak) ses.weak = true;          // v24: mã cũ ngắn hơn 6 số → app bắt đổi
  return ses;
}

/** Phiên nhân viên sau khi nhập đúng mã; có ghi nhớ thì kèm khoá máy (dk). */
function empSession_(empId, remember, ua, haveLock) {
  if (remember) {
    var dv = newDevice_(empId, ua, haveLock);
    if (dv) return { token: signToken_({ r: 'emp', e: empId, d: dv.d, v: empVer_(empId), x: Date.now() + TOKEN_TTL_MS }), dk: dv.dk };
  }
  return { token: signToken_({ r: 'emp', e: empId, v: empVer_(empId), x: Date.now() + TOKEN_TTL_MS }) };
}

// ---------------------------------------------------------------------------
// v41: MÃ ĐĂNG KÝ. Trước đây ai mở link cũng "Tạo mã mới" được cho bất kỳ tên nào chưa có mã
// (nhân viên mới, người vừa được reset) → chiếm tên, xem lịch / phiếu lương của người đó.
// Nay quản lý cấp mã đăng ký 6 số (hạn 14 ngày, dùng một lần); nhân viên nhập kèm khi tạo mã.
// Script Property CLAIM_CODES = { empId: { h: hash, x: hết hạn } }
// ---------------------------------------------------------------------------
var CLAIM_TTL_MS = 14 * 24 * 3600 * 1000;
function claimCodes_() {
  var m; try { m = JSON.parse(props_().getProperty('CLAIM_CODES') || '{}') || {}; } catch (e) { m = {}; }
  var now = Date.now();
  Object.keys(m).forEach(function (k) { if (!m[k] || (Number(m[k].x) || 0) < now) delete m[k]; });
  return m;
}
function claimHash_(empId, code) { return sha256_(getSecret_('APP_SALT') + '|claim|' + empId + '|' + code); }
function newClaimCode_(empId) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + '|' + Date.now() + '|' + empId), n = 0;
  for (var i = 0; i < 6; i++) n = (n * 256 + ((raw[i] + 256) % 256)) % 1000000000;
  var code = ('000000' + (n % 1000000)).slice(-6);
  var m = claimCodes_();
  m[String(empId)] = { h: claimHash_(empId, code), x: Date.now() + CLAIM_TTL_MS };
  props_().setProperty('CLAIM_CODES', JSON.stringify(m));
  return { code: code, until: Date.now() + CLAIM_TTL_MS };
}
function dropClaimCode_(empId) {
  var m = claimCodes_();
  if (m[String(empId)]) { delete m[String(empId)]; props_().setProperty('CLAIM_CODES', JSON.stringify(m)); }
}
/** Quản lý: cấp (hoặc cấp lại) mã đăng ký cho nhân viên CHƯA có mã đăng nhập. */
function issueClaimCode(token, empId) {
  requireManager_(token);
  assertEmployeeExists_(empId);
  if (readPin_(empId)) throw new Error('Nhân viên này đã có mã đăng nhập. Muốn cấp lại thì bấm "Xoá mã" trước.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try { return newClaimCode_(empId); } finally { lock.releaseLock(); }
}

/** Lần đầu: nhân viên tự đặt mã cho tên của mình — cần MÃ ĐĂNG KÝ quản lý cấp (v41).
 *  Chỉ chạy được khi tên đó CHƯA có mã — nên không thể dùng để chiếm tên người đã đăng ký. */
function claimEmployee(empId, newPin, remember, ua, claimCode) {
  assertEmployeeExists_(empId);
  var pin = pinNorm_(newPin);
  validatePinFormat_(pin);
  var code = pinNorm_(claimCode);
  if (!code) throw new Error('Cần mã đăng ký do quản lý cấp. Hãy nhờ quản lý mở danh sách nhân viên → ⋯ → "Cấp mã đăng ký".');
  var th = throttle_('emp:' + empId);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    if (readPin_(empId)) {
      throw new Error('Tên này đã được đặt mã rồi. Nếu bạn quên mã, hãy nhờ quản lý reset giúp.');
    }
    var cc = claimCodes_()[String(empId)];
    if (!cc || cc.h !== claimHash_(empId, code)) {
      th.fail();
      throw new Error(cc ? 'Mã đăng ký không đúng.' : 'Mã đăng ký đã hết hạn hoặc chưa được cấp. Hãy nhờ quản lý cấp mã mới.');
    }
    writePin_(empId, hashPin_(empId, pin));
    dropClaimCode_(empId);
  } finally {
    lock.releaseLock();
  }
  th.ok();
  markSeen_(empId, 'login', true);
  return empSession_(empId, remember, ua, false);
}

function validatePinFormat_(pin) {
  if (pin.length < PIN_MIN_LEN) throw new Error('Mã phải có ít nhất ' + PIN_MIN_LEN + ' ký tự.');
  if (pin.length > PIN_MAX_LEN) throw new Error('Mã không được dài quá ' + PIN_MAX_LEN + ' ký tự.');
  if (PIN_DIGITS && !/^\d+$/.test(pin)) throw new Error('Mã chỉ được gồm chữ số.');
}
/** v24: mã đang dùng có yếu không (ngắn hơn chuẩn mới / có chữ) → nhắc đổi. */
function pinWeak_(pin) { var p = String(pin == null ? '' : pin).trim(); return p.length < PIN_MIN_LEN || (PIN_DIGITS && !/^\d+$/.test(p)); }
function pinWeakMap_() { try { return JSON.parse(props_().getProperty('PIN_WEAK') || '{}') || {}; } catch (e) { return {}; } }
function setPinWeak_(empId, on) {
  var m = pinWeakMap_(), k = String(empId);
  if (on ? m[k] : !m[k]) return;
  if (on) m[k] = 1; else delete m[k];
  props_().setProperty('PIN_WEAK', JSON.stringify(m));
}
/** Nhân viên tự đổi mã (tab Cài đặt): cần mã cũ; mã mới theo chuẩn mới. Máy đã ghi nhớ vẫn giữ. */
function changeMyPin(token, oldPin, newPin) {
  var p = auth_(token);
  if (p.r !== 'emp') throw new Error('Chỉ nhân viên mới đổi được mã của mình.');
  var empId = String(p.e), th = throttle_('emp:' + empId), stored = readPin_(empId);
  if (!stored || !(pinMatches_(empId, stored, oldPin) || pinMatches_(empId, stored, pinNorm_(oldPin)))) { th.fail(); throw new Error('Mã hiện tại không đúng.'); }
  th.ok();
  var np = pinNorm_(newPin);
  validatePinFormat_(np);
  if (np === String(oldPin == null ? '' : oldPin).trim()) throw new Error('Mã mới phải khác mã cũ.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try { writePin_(empId, hashPin_(empId, np)); setPinWeak_(empId, false); } finally { lock.releaseLock(); }
  return true;
}

function assertEmployeeExists_(empId) {
  var list = readEmployees_();
  for (var i = 0; i < list.length; i++) if (list[i].id === empId) return;
  throw new Error('Không tìm thấy nhân viên này. Hãy tải lại trang.');
}

// ===========================================================================
// QUẢN LÝ MÃ PIN (sheet "Pins": empId | pinHash | updatedAt)
// ===========================================================================

/** Bảng tính đang gắn với script — lấy 1 lần cho cả lượt chạy (mỗi lần gọi là một lượt tra cứu tốn thời gian). */
var SS_ACTIVE_ = null;
function activeSS_() { if (!SS_ACTIVE_) SS_ACTIVE_ = SpreadsheetApp.getActiveSpreadsheet(); return SS_ACTIVE_; }

function getPinSheet_() {
  var ss = activeSS_();
  var sheet = ss.getSheetByName(PIN_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(PIN_SHEET_NAME);
    sheet.appendRow(['empId', 'pinHash', 'updatedAt']);
    sheet.setFrozenRows(1);
    sheet.getRange('B:B').setNumberFormat('@');
  }
  return sheet;
}

function findPinRow_(sheet, empId) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(empId)) return i + 1;
  }
  return -1;
}

function readPin_(empId) {
  var sheet = getPinSheet_();
  var row = findPinRow_(sheet, empId);
  if (row === -1) return null;
  var v = String(sheet.getRange(row, 2).getValue()).trim();
  return v || null;
}

function writePin_(empId, hash) {
  var sheet = getPinSheet_();
  var row = findPinRow_(sheet, empId);
  var stamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');   // v41: luôn giờ Nhật
  if (row === -1) sheet.appendRow([empId, hash, stamp]);
  else { sheet.getRange(row, 2).setValue(hash); sheet.getRange(row, 3).setValue(stamp); }
}

function deletePin_(empId) {
  var sheet = getPinSheet_();
  var row = findPinRow_(sheet, empId);
  if (row !== -1) sheet.deleteRow(row);
}

function readAllPinIds_() {
  var data = getPinSheet_().getDataRange().getValues();
  var map = {};
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim()) map[String(data[i][0])] = true;
  }
  return map;
}

/** Chấp nhận cả hash mới lẫn mã cũ lưu dạng chữ thường (để không mất dữ liệu
 *  khi nâng cấp từ bản trước). Mã cũ sẽ tự được nâng cấp sau lần đăng nhập đúng. */
function pinMatches_(empId, stored, pin) {
  var s = String(stored).trim();
  var p = String(pin == null ? '' : pin).trim();
  if (s.indexOf('h1:') === 0) return s === hashPin_(empId, p);
  return s === p;
}

/** Quản lý đặt thẳng mã cho 1 nhân viên (không cần biết mã cũ). */
function setPin(token, empId, pin) {
  requireManager_(token);
  assertEmployeeExists_(empId);
  var p = pinNorm_(pin);
  validatePinFormat_(p);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try { writePin_(empId, hashPin_(empId, p)); dropDevices_(empId); bumpEmpVer_(empId); setPinWeak_(empId, false); dropClaimCode_(empId); } finally { lock.releaseLock(); }
  CacheService.getScriptCache().remove('fail:emp:' + empId);
  return true;
}

// ---------- v24: CÀI ĐẶT CỦA NHÂN VIÊN ----------
/** Ngôn ngữ mặc định của nhân viên (theo người, dùng trên mọi máy). */
/** v2026.10.16: mã nhân viên trong khoá máy (chỉ kiểm chữ ký, không đọc gì thêm) — để nhớ lời chào theo người. */
function dkEmp_(dk) {
  try {
    var parts = String(dk || '').split('.');
    if (parts.length !== 2 || Utilities.base64EncodeWebSafe(
          Utilities.computeHmacSha256Signature(parts[0], getSecret_('TOKEN_SECRET'))) !== parts[1]) return null;
    var x = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
    return x && x.r === 'dev' && x.e && x.d ? { e: String(x.e), d: x.d } : null;
  } catch (e) { return null; }
}
/** Đổi tên / ngôn ngữ → bỏ lời chào đã nhớ của những người này. */
function forgetWho_(ids) {
  try { CacheService.getScriptCache().removeAll((ids || []).map(function (id) { return 'who:' + id; })); } catch (e) {}
}
function saveMyPrefs(token, empId, json) {
  requireCanEdit_(token, empId);
  forgetWho_([String(empId)]);
  var o; try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { o = null; }
  o = o || {};
  var lang = ['vi', 'en', 'ja'].indexOf(o.lang) !== -1 ? o.lang : '';
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_(), row = findRow_(sheet, 'employees');
    var raw = row === -1 ? null : readCellValue_(sheet, row), list = [];
    try { list = JSON.parse(raw || '[]') || []; } catch (e2) { list = []; }
    var hit = null;
    list.forEach(function (e) { if (String(e.id) === String(empId)) hit = e; });
    if (!hit) throw new Error('Không tìm thấy nhân viên này.');
    if (lang) hit.lang = lang; else delete hit.lang;
    var j = JSON.stringify(list);
    writeCellValue_(sheet, row, j);
    putCacheSafe_('employees', j);
  } finally { lock.releaseLock(); }
  return { lang: lang };
}
/**
 * Phiếu lương (給与明細) của một người trong một năm — CHỈ chính người đó hoặc quản lý.
 * Tiền lấy từ bảng 年末調整 quản lý đã nhập (総支給 / 社会保険 / 源泉税 từng tháng); giờ làm + số ngày từ chấm công.
 * Nhân viên KHÔNG thấy tháng chỉ là số ước tính (≈) hay chưa nhập.
 */
/** Mật khẩu phiếu lương: nhân viên TỰ đặt lần đầu (4–8 chữ số), lưu dạng băm có muối trong 'paypw'. */
function payPwMap_() { var m = readJsonKey_('paypw'); return (m && typeof m === 'object' && !Array.isArray(m)) ? m : {}; }
function payPwHash_(salt, pw) { return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(salt) + ':' + String(pw))); }
/** Trạng thái: nhân viên đã đặt mật khẩu phiếu lương chưa. */
function payPwStatus(token, empId) {
  requireCanEdit_(token, empId);
  return { set: !!payPwMap_()[String(empId)] };
}
/** Nhân viên tự đặt mật khẩu phiếu lương (lần đầu). Đổi sau này cần mật khẩu cũ. */
function setPayPw(token, empId, newPw, oldPw) {
  var who = requireCanEdit_(token, empId);
  if (who.r !== 'emp') throw new Error('Chỉ nhân viên mới tự đặt được mật khẩu phiếu lương.');
  empId = String(empId || '');
  var np = pinNorm_(newPw);
  if (!/^\d{4,8}$/.test(np)) throw new Error('Mật khẩu phiếu lương phải là 4–8 chữ số.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  var cur = null;
  try { cur = payPwMap_()[empId] || null; } finally { lock.releaseLock(); }
  if (cur) {
    var th = throttle_('pay:' + empId);
    if (payPwHash_(cur.s, String(oldPw == null ? '' : oldPw)) !== cur.h && payPwHash_(cur.s, pinNorm_(oldPw)) !== cur.h) throw new Error('Mật khẩu phiếu lương cũ chưa đúng.');
    th.ok();
  }
  var salt = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  kvUpdate_('paypw', function (m) {
    m = (m && typeof m === 'object' && !Array.isArray(m)) ? m : {};
    m[empId] = { s: salt, h: payPwHash_(salt, np), at: Date.now() };
    return m;
  }, 'mật khẩu phiếu lương');
  return { ok: true };
}
/** Quản lý đặt lại khi nhân viên quên — nhân viên tự đặt mật khẩu mới ở lần mở kế tiếp. */
function resetPayPw(token, empId) {
  requireManager_(token);
  empId = String(empId || '');
  kvUpdate_('paypw', function (m) {
    m = (m && typeof m === 'object' && !Array.isArray(m)) ? m : {};
    delete m[empId];
    return m;
  }, 'đặt lại mật khẩu phiếu lương');
  return true;
}
function myPayslip(token, empId, year, payPw) {
  var who = requireCanEdit_(token, empId);
  empId = String(empId || '');
  year = yeYear_(year);
  // Nhân viên phải nhập đúng mật khẩu phiếu lương (quản lý xem được mà không cần — để đối chiếu lương).
  if (who.r !== 'mgr') {
    var pr = payPwMap_()[empId];
    if (!pr) throw new Error('Chưa đặt mật khẩu phiếu lương.');
    var pth = throttle_('pay:' + empId);
    if (payPwHash_(pr.s, String(payPw == null ? '' : payPw)) !== pr.h) throw new Error('Mật khẩu phiếu lương chưa đúng.');
    pth.ok();
  }
  var emp = null;
  readEmployees_().forEach(function (e) { if (String(e.id) === empId) emp = e; });
  if (!emp) throw new Error('Không tìm thấy nhân viên này.');
  var rec = (readJsonKey_('ye:' + year) || {})[empId] || null, p = hrGet_(empId), out = [];
  for (var mo = 1; mo <= 12; mo++) {
    var ym = year + '-' + ('0' + mo).slice(-2), raw = readJsonKey_('att:' + ym) || {}, hrs = 0, days = 0;
    Object.keys(raw).forEach(function (d) { var l = (raw[d] || {})[empId]; if (Array.isArray(l) && l.length) { days++; hrs += attWorkHours_(l, null); } });
    var x = rec && rec.m ? rec.m[mo - 1] : null, has = !!(x && x.g);
    if (has && x.est && who.r !== 'mgr') has = false;
    out.push({ m: mo, hrs: Math.round(hrs * 10000) / 10000, days: days, pay: has ? { g: x.g, si: x.si || 0, tx: x.tx || 0, est: !!x.est } : null });
  }
  var co = {}; try { co = hrCo_() || {}; } catch (e) {}
  return { year: year, name: emp.name, wage: p.wage == null ? null : p.wage, store: readSettings_().storeName || '', co: { name: co.name || '', store: co.store || '' }, months: out };
}
/** Quản lý xoá mã — nhân viên đó sẽ tự đặt lại mã mới ở lần đăng nhập kế tiếp. */
function resetPin(token, empId) {
  requireManager_(token);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  var cc;
  try { deletePin_(empId); dropDevices_(empId); bumpEmpVer_(empId); cc = newClaimCode_(empId); } finally { lock.releaseLock(); }
  CacheService.getScriptCache().remove('fail:emp:' + empId);
  // v41: trả luôn mã đăng ký để nhân viên tạo mã mới (không còn ai cũng tạo được).
  return { ok: true, code: cc.code, until: cc.until };
}

// ===========================================================================
// KHO KEY-VALUE (sheet "KV": key | scope | value) — nay chỉ còn scope 'shared'
// ===========================================================================

function getSheet_() {
  var ss = activeSS_();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['key', 'scope', 'value']);
    sheet.setFrozenRows(1);
    sheet.getRange('C:C').setNumberFormat('@'); // giữ JSON ở dạng chữ
  }
  return sheet;
}

/**
 * Tìm dòng của một khoá. Trước đây mỗi lần tìm đọc TOÀN BỘ sheet (cả các ô JSON
 * dài hàng chục nghìn ký tự) — một lần lưu ca gọi tới 5–6 lần, sheet càng lớn càng
 * chậm, nhiều người lưu cùng lúc là "hệ thống bận". Nay chỉ đọc 2 cột A:B và nhớ
 * chỉ mục trong lượt chạy này; trước khi dùng lại kiểm 1 ô cho chắc (lượt chạy
 * khác có thể đã xoá dòng). Không bao giờ nhớ "không có" — luôn đọc lại.
 */
var ROWIDX_ = {};
function rowIdxKey_(sheet) {
  try { return sheet.getParent().getId() + '#' + sheet.getName(); } catch (e) { return String(sheet.getName()); }
}
function findRow_(sheet, key) {
  var sk = rowIdxKey_(sheet), idx = ROWIDX_[sk];
  if (idx && Object.prototype.hasOwnProperty.call(idx, key)) {
    var r = idx[key];
    var chk = sheet.getRange(r, 1, 1, 2).getValues()[0];
    if (chk[0] === key && chk[1] === 'shared') return r;
  }
  idx = {};
  var last = sheet.getLastRow();
  if (last >= 2) {
    var v = sheet.getRange(2, 1, last - 1, 2).getValues();
    for (var i = 0; i < v.length; i++) {
      if (v[i][1] === 'shared' && !Object.prototype.hasOwnProperty.call(idx, v[i][0])) idx[v[i][0]] = i + 2;
    }
  }
  ROWIDX_[sk] = idx;
  return Object.prototype.hasOwnProperty.call(idx, key) ? idx[key] : -1;
}

function cacheKey_(key) { return 'kv:shared:' + key; }

function byteLength_(str) { return Utilities.newBlob(String(str)).getBytes().length; }

function putCacheSafe_(key, value) {
  if (KV_MEMO_) { if (byteLength_(value) < MAX_CACHE_BYTES) KV_MEMO_[key] = String(value); else delete KV_MEMO_[key]; }
  var cache = CacheService.getScriptCache();
  // Dấu "vừa ghi" (30s): người ĐỌC không có lock thấy dấu này thì không được nhét bản họ
  // vừa đọc vào cache — tránh bản cũ đè lên bản mới (đọc trước, ghi sau, cất cache sau cùng).
  try { cache.put('w:' + cacheKey_(key), '1', 30); } catch (e) {}
  if (byteLength_(value) < MAX_CACHE_BYTES) cache.put(cacheKey_(key), value, CACHE_TTL);
  else cache.remove(cacheKey_(key)); // quá to thì thôi không cache, đọc lại từ Sheet
}
/** Cất cache từ phía ĐỌC (không giữ lock): bỏ qua nếu vừa có người ghi khoá này. */
function putCacheFromRead_(key, value) {
  var cache = CacheService.getScriptCache();
  if (cache.get('w:' + cacheKey_(key)) !== null) return;
  if (byteLength_(value) < MAX_CACHE_BYTES) cache.put(cacheKey_(key), value, CACHE_TTL);
}

// ===========================================================================
// ĐỌC / GHI MỘT GIÁ TRỊ DÀI VÀO SHEET
// ---------------------------------------------------------------------------
// Google Sheets chỉ cho tối đa 50.000 ký tự MỘT Ô. Cả tháng lịch của quán 20
// người khai kín đã là 60–67 nghìn ký tự, có tăng ca thì hơn 100 nghìn — ghi
// vào một ô là Google từ chối, thao tác lưu thất bại và thay đổi mất luôn.
// Đo được: 101 trên 620 lần lưu thất bại khi tháng đầy.
//
// Cách làm: giá trị dài được chia thành nhiều mẩu, mỗi mẩu một ô liền nhau từ
// cột C sang phải. Mỗi mẩu có dấu "~" ở đầu, vừa để nhận ra đây là dữ liệu đã
// chia, vừa để Sheets không bao giờ hiểu nhầm mẩu nào thành công thức (bắt đầu
// bằng "=") hay thành số. Giá trị ngắn vẫn ghi y như cũ, dữ liệu cũ đọc bình
// thường, không cần chuyển đổi gì.
// ===========================================================================
var CELL_CHUNK = 45000;          // chừa khoảng an toàn dưới mức 50.000
var CHUNK_MARK = '~';

function readCellValue_(sheet, row, startCol) {
  var c0 = startCol || 3;
  var width = Math.max(1, sheet.getLastColumn() - (c0 - 1));
  var vals = sheet.getRange(row, c0, 1, width).getValues()[0];
  var first = vals[0];
  if (first === '' || first === null || first === undefined) return null;
  first = String(first);
  if (first.charAt(0) !== CHUNK_MARK) return first;        // giá trị ngắn / dữ liệu cũ
  var out = '';
  for (var i = 0; i < vals.length; i++) {
    var v = vals[i];
    if (v === '' || v === null || v === undefined) break;
    v = String(v);
    if (v.charAt(0) !== CHUNK_MARK) break;
    out += v.slice(1);
  }
  return out;
}

function writeCellValue_(sheet, row, value, startCol) {
  var c0 = startCol || 3;
  value = (value === null || value === undefined) ? '' : String(value);
  var pieces;
  if (value.length <= CELL_CHUNK && value.charAt(0) !== CHUNK_MARK) {
    pieces = [value];
  } else {
    pieces = [];
    var step = CELL_CHUNK - 1;                               // chừa 1 ký tự cho dấu "~"
    for (var i = 0; i < value.length; i += step) pieces.push(CHUNK_MARK + value.slice(i, i + step));
  }
  // Ghi đủ số ô cần, và XOÁ các ô thừa bên phải nếu lần trước dài hơn — nếu
  // không, phần đuôi cũ sẽ bị đọc nối vào thành JSON hỏng.
  var width = Math.max(pieces.length, sheet.getLastColumn() - (c0 - 1));
  // v41: dữ liệu dài cần nhiều ô hơn số cột hiện có của sheet → thêm cột trước (không thì ghi lỗi "vượt quá cột").
  try {
    var maxC = sheet.getMaxColumns(), need = c0 - 1 + width;
    if (need > maxC) sheet.insertColumnsAfter(maxC, need - maxC);
  } catch (eC) {}
  var line = [];
  for (var j = 0; j < width; j++) line.push(j < pieces.length ? pieces[j] : '');
  var rng = sheet.getRange(row, c0, 1, width);
  rng.setNumberFormat('@');                                 // chữ thường, không bao giờ là công thức
  rng.setValues([line]);
}

/** Thêm một khoá mới vào cuối sheet rồi ghi giá trị (có chia ô nếu dài). */
function appendKeyValue_(sheet, key, value) {
  sheet.appendRow([key, 'shared', '']);
  var row = sheet.getLastRow();
  writeCellValue_(sheet, row, value);
  var idx = ROWIDX_[rowIdxKey_(sheet)];
  if (idx && !Object.prototype.hasOwnProperty.call(idx, key)) idx[key] = row;
}

// ===========================================================================
// SAO LƯU — BA LỚP ĐỘC LẬP
// ---------------------------------------------------------------------------
// Lớp 1  Chia ô (ở trên): tháng đông người không còn bị Google từ chối ghi.
// Lớp 2  Lịch sử phiên bản: trước khi đè một khoá dữ liệu, chụp bản cũ vào sheet
//        "History" trong CÙNG file. Mỗi khoá giữ 40 bản. Cứu được lỗi thao tác
//        và lỗi của chính app (đã từng: xếp lại từ đầu xoá lời khai, lưu cài đặt
//        xoá sạch thiết lập nâng cao).
// Lớp 3  Bản sao nguyên file mỗi ngày vào một thư mục riêng trong Drive, giữ 30
//        ngày. Cứu được cả khi file chính bị xoá, bị sửa tay hỏng, bị ghi đè.
//
// Mọi bước sao lưu đều bọc try/catch: sao lưu hỏng thì KHÔNG được làm hỏng việc
// lưu chính. Mất một bản sao còn hơn mất thay đổi của người dùng.
// ===========================================================================
var HISTORY_SHEET = 'History';
var HISTORY_KEEP = 40;             // mỗi khoá giữ tối đa 40 bản gần nhất
var HISTORY_GAP_SEC = 600;         // cùng một khoá, 10 phút mới chụp thêm một bản
var BACKUP_FOLDER = 'SUBWAY シフト — sao lưu';
var BACKUP_KEEP = 30;              // giữ 30 bản sao file gần nhất

/** Chỉ chụp dữ liệu nghiệp vụ. Không bao giờ chụp thứ liên quan mật khẩu/PIN. */
function historyKeyWanted_(key) {
  return /^(schedule|wish|requests|dayinfo|emplock|swap|jobs|prof|ye):/.test(key) ||
         key === 'employees' || key === 'settings' || key === 'jobtpl';
}

function getHistorySheet_() {
  var ss = activeSS_();
  var sh = ss.getSheetByName(HISTORY_SHEET);
  if (!sh) {
    sh = ss.insertSheet(HISTORY_SHEET);
    sh.appendRow(['time', 'key', 'reason', 'value']);
    sh.setFrozenRows(1);
  }
  return sh;
}

/**
 * Chụp lại GIÁ TRỊ CŨ của một khoá trước khi bị ghi đè. Gọi khi đang giữ lock,
 * và chỉ ghi thẳng vào sheet History — không đi qua kvSet_ nên không bị kẹt lock.
 *
 * Mỗi lần kéo thanh giờ là một lần ghi cả tháng, nên không thể chụp mỗi lần:
 * cùng một khoá thì 10 phút mới chụp một bản. Thao tác lớn (ghi cả tháng, sửa
 * danh sách, xoá nhân viên, khôi phục) thì luôn chụp.
 */
function snapshot_(key, oldValue, reason, force) {
  try {
    if (!historyKeyWanted_(key)) return;
    if (oldValue === null || oldValue === undefined || oldValue === '') return;
    var cache = CacheService.getScriptCache();
    var tk = 'snapT:' + key;
    if (!force && cache.get(tk)) return;
    var sh = getHistorySheet_();
    // Mã riêng cho từng bản: mốc thời gian + đuôi ngẫu nhiên. Chỉ dùng mốc thời
    // gian thì hai bản chụp trong cùng một mili giây trùng mã, khôi phục có thể
    // lấy nhầm bản — đã bắt được lỗi này, 1 lần trong 4 lần chạy thử.
    var id = new Date().toISOString() + '#' + Utilities.getUuid().slice(0, 8);
    sh.appendRow([id, key, reason || 'tự động', '']);
    writeCellValue_(sh, sh.getLastRow(), oldValue, 4);
    cache.put(tk, '1', HISTORY_GAP_SEC);
    pruneHistory_(sh, key);
  } catch (e) { /* sao lưu hỏng thì bỏ qua, KHÔNG chặn việc ghi chính */ }
}

function pruneHistory_(sh, key) {
  var last = sh.getLastRow();
  if (last < 2) return;
  var keys = sh.getRange(2, 2, last - 1, 1).getValues();
  var rows = [];
  for (var i = 0; i < keys.length; i++) if (String(keys[i][0]) === key) rows.push(i + 2);
  if (rows.length <= HISTORY_KEEP) return;
  var drop = rows.slice(0, rows.length - HISTORY_KEEP);          // cũ nhất ở trên
  for (var j = drop.length - 1; j >= 0; j--) sh.deleteRow(drop[j]);  // xoá từ dưới lên
}

/** Danh sách các bản đã chụp của một khoá, mới nhất trước. Chỉ quản lý. */
function listHistory(token, key) {
  requireManager_(token);
  if (!historyKeyWanted_(String(key))) throw new Error('Khoá này không có lịch sử.');
  var ss = activeSS_();
  var sh = ss.getSheetByName(HISTORY_SHEET);
  if (!sh || sh.getLastRow() < 2) return [];
  var last = sh.getLastRow();
  var meta = sh.getRange(2, 1, last - 1, 3).getValues();
  var out = [];
  for (var i = meta.length - 1; i >= 0; i--) {
    if (String(meta[i][1]) !== key) continue;
    var v = readCellValue_(sh, i + 2, 4) || '';
    var full = String(meta[i][0]);
    out.push({ id: full, time: full.split('#')[0], reason: String(meta[i][2]), size: v.length });
  }
  return out;
}

/**
 * Khôi phục một khoá về đúng bản đã chụp lúc `time`. Bản hiện tại được chụp lại
 * TRƯỚC (bắt buộc), nên khôi phục nhầm vẫn khôi phục ngược lại được.
 */
function restoreHistory(token, key, id) {
  requireManager_(token);
  key = String(key);
  var time = String(id);
  if (!historyKeyWanted_(key)) throw new Error('Khoá này không có lịch sử.');
  var sh = activeSS_().getSheetByName(HISTORY_SHEET);
  if (!sh || sh.getLastRow() < 2) throw new Error('Chưa có bản sao lưu nào.');
  var meta = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
  var row = -1;
  for (var i = 0; i < meta.length; i++)
    if (String(meta[i][0]) === time && String(meta[i][1]) === key) { row = i + 2; break; }
  if (row === -1) throw new Error('Không tìm thấy bản sao lưu này (có thể đã quá cũ và bị dọn).');
  var value = readCellValue_(sh, row, 4);
  if (!value) throw new Error('Bản sao lưu này rỗng.');
  try { JSON.parse(value); } catch (e) { throw new Error('Bản sao lưu này bị hỏng, không khôi phục được.'); }
  var sm = /^schedule:(\d{4}-\d{2})$/.exec(key);
  if (sm) return schedBulkWrite_(sm[1], value, 'trước khi khôi phục', null);   // không đè ngày đã công bố
  kvSet_(key, value, 'trước khi khôi phục', true);
  return true;
}

function backupFolder_() {
  var it = DriveApp.getFoldersByName(BACKUP_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(BACKUP_FOLDER);
}

/** Quản lý bấm "Sắp xếp bản sao lưu cũ": gom file lung tung vào thư mục, đổi tên theo ngày + quán. */
function tidyBackupsNow(token) {
  requireManager_(token);
  var ss = activeSS_();
  var folder = backupFolder_();
  var r = tidyBackups_(folder, ss.getId(), storeLabel_(), 25);
  PropertiesService.getScriptProperties().setProperty('backupFolderUrl', folder.getUrl());
  r.folderUrl = folder.getUrl();
  return r;
}

// Mỗi bản sao lưu đặt tên "2026-09-25 03:00 · SUBWAY Ootagawa · sao lưu tự động"
// (ngày trước, rồi tên quán) và đánh dấu quán trong phần mô tả của file, để
// nhiều quán dùng chung MỘT thư mục mà vẫn tách bạch: mỗi quán chỉ dọn bản
// cũ của chính mình, không xoá nhầm của quán kia.
var BACKUP_TAG = 'subway-shift-backup';

function storeLabel_() {
  var n = String(readSettings_().storeName || '').replace(/[\\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
  return n || 'SUBWAY';
}
function backupTagOf_(file) {
  try { return String(file.getDescription() || ''); } catch (e) { return ''; }
}
function isMyBackup_(file, myId, myName) {
  var d = backupTagOf_(file);
  if (d.indexOf(BACKUP_TAG) === -1) return false;
  return d.indexOf('store=' + myId) !== -1 || d.indexOf('store-name=' + myName + '|') !== -1;
}

/**
 * Dọn bản sao lưu kiểu cũ:
 *  1. Bản sao lưu nằm lung tung (ngoài thư mục, vd. còn ở "Drive của tôi")
 *     -> dời hết vào thư mục sao lưu.
 *  2. Bản tên cũ "SUBWAY シフト 2026-09-20 03:00 (tự động)" chưa biết của quán
 *     nào -> mở ra đọc tên quán, đổi sang tên mới và gắn nhãn quán.
 * Mỗi lượt chỉ mở tối đa `limit` file để không quá giờ chạy của Apps Script;
 * lần sao lưu sau dọn tiếp.
 */
function tidyBackups_(folder, myId, myName, limit) {
  var moved = 0, renamed = 0, opened = 0;
  var folderId = folder.getId();
  try {
    var it = DriveApp.searchFiles('title contains "SUBWAY シフト 20" and trashed = false');
    while (it.hasNext()) {
      var f = it.next(), inFolder = false, ps = f.getParents();
      while (ps.hasNext()) if (ps.next().getId() === folderId) inFolder = true;
      if (!inFolder) { f.moveTo(folder); moved++; }
    }
  } catch (e) { /* tìm không được thì thôi, lần sau thử lại */ }
  var files = folder.getFiles();
  while (files.hasNext() && opened < limit) {
    var x = files.next();
    if (backupTagOf_(x).indexOf(BACKUP_TAG) !== -1) continue;
    var m = /^SUBWAY シフト (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) \((.*)\)$/.exec(x.getName());
    if (!m) continue;
    opened++;
    var name = '';
    try {
      var sh = SpreadsheetApp.openById(x.getId()).getSheetByName(SHEET_NAME);
      var row = sh ? findRow_(sh, 'settings') : -1;
      if (row !== -1) name = String((JSON.parse(readCellValue_(sh, row) || '{}') || {}).storeName || '').trim();
    } catch (e2) { name = ''; }
    var label = name || 'SUBWAY';
    try {
      x.setName(m[1] + ' · ' + label + ' · sao lưu ' + m[2]);
      x.setDescription(BACKUP_TAG + (name === myName ? ' store=' + myId : '') + ' store-name=' + label + '|');
      renamed++;
    } catch (e3) {}
  }
  return { moved: moved, renamed: renamed };
}

/** LỚP 3: sao nguyên file vào thư mục sao lưu chung, dọn bớt bản quá cũ CỦA QUÁN NÀY. */
function doBackup_(reason) {
  var ss = activeSS_();
  var myId = ss.getId(), myName = storeLabel_();
  var stamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
  var copy = ss.copy(stamp + ' · ' + myName + ' · sao lưu ' + reason);
  var folder = backupFolder_();
  var cf = DriveApp.getFileById(copy.getId());
  cf.moveTo(folder);
  try { cf.setDescription(BACKUP_TAG + ' store=' + myId + ' store-name=' + myName + '|'); } catch (eD) {}
  try { tidyBackups_(folder, myId, myName, 6); } catch (eT) {}
  var files = [], it = folder.getFiles();
  while (it.hasNext()) { var f0 = it.next(); if (isMyBackup_(f0, myId, myName)) files.push(f0); }
  files.sort(function (a, b) { return b.getDateCreated().getTime() - a.getDateCreated().getTime(); });
  for (var i = BACKUP_KEEP; i < files.length; i++) files[i].setTrashed(true);
  var props = PropertiesService.getScriptProperties();
  props.setProperty('lastBackupAt', String(Date.now()));
  props.setProperty('lastBackupUrl', copy.getUrl());
  props.setProperty('backupFolderUrl', folder.getUrl());
  return { at: Date.now(), url: copy.getUrl(), folderUrl: folder.getUrl(),
           kept: Math.min(files.length, BACKUP_KEEP) };
}

/**
 * Trình kích hoạt hằng ngày gọi hàm này lúc 3 giờ sáng.
 *
 * Hàm không có dấu "_" thì google.script.run gọi được từ ngoài, nên phải tự
 * giới hạn: mỗi 20 giờ tối đa một lần. Ai gọi bừa cũng không tạo được hàng
 * loạt file trong Drive của quản lý.
 */
function runDailyBackup() {
  var last = Number(PropertiesService.getScriptProperties().getProperty('lastBackupAt') || 0);
  // Hàm này gọi được từ ngoài (không cần đăng nhập) nên MỌI việc đều nằm sau giới hạn 20 giờ.
  if (Date.now() - last < 20 * 3600 * 1000) return false;
  // v41: sao lưu lỗi thì lastBackupAt không đổi → trước đây ai gọi liên tục cũng chạy lại hoài. Giữ chỗ lần thử trước.
  var P = PropertiesService.getScriptProperties(), tryAt = Number(P.getProperty('backupTryAt') || 0);
  if (Date.now() - tryAt < 3600 * 1000) return false;
  P.setProperty('backupTryAt', String(Date.now()));
  try { sweepJobPhotos_(true); } catch (e) {}
  try { pruneOldData_(); } catch (e0) {}
  try { doBackup_('tự động'); return true; } catch (e) { return false; }
}

// ---------------------------------------------------------------------------
// DỌN DỮ LIỆU CŨ — chạy kèm sao lưu hằng ngày (và nút trong "Kiểm tra hệ thống").
// Không đụng lịch / đăng ký / yêu cầu của bất kỳ tháng nào; chỉ bỏ các bản phụ:
//   • bak:schedule / bakallow (bản để bấm Hoàn tác) của tháng cũ hơn 2 tháng
//   • pubsnap (bản chụp từng lần công bố) của tháng cũ hơn 12 tháng
//   • dòng sheet History của các khoá theo tháng cũ hơn 6 tháng
// ---------------------------------------------------------------------------
function pruneOldData_() {
  var now = new Date(Date.now() + 9 * 3600 * 1000);
  var ymOf = function (k) { var m = String(k).match(/(\d{4})-(\d{2})/); return m ? Number(m[1]) * 12 + Number(m[2]) : null; };
  var cur = now.getUTCFullYear() * 12 + now.getUTCMonth() + 1;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) return { kv: 0, hist: 0, busy: true };
  var nKv = 0, nHist = 0;
  try {
    var sheet = getSheet_(), last = sheet.getLastRow();
    if (last >= 2) {
      var keys = sheet.getRange(2, 1, last - 1, 2).getValues(), drop = [], dropKeys = [];
      for (var i = 0; i < keys.length; i++) {
        var k = String(keys[i][0]), ym = ymOf(k);
        if (keys[i][1] !== 'shared' || ym === null) continue;
        if ((/^bak:schedule:|^bakallow:schedule:/.test(k) && cur - ym > 2) || (/^pubsnap:/.test(k) && cur - ym > 12) || (/^thx:/.test(k) && cur - ym > 6)) { drop.push(i + 2); dropKeys.push(k); }
      }
      for (var j = drop.length - 1; j >= 0; j--) { sheet.deleteRow(drop[j]); nKv++; }
      if (drop.length) {
        ROWIDX_ = {};
        try { CacheService.getScriptCache().removeAll(dropKeys.map(cacheKey_)); } catch (eC) {}   // không để bản cache cũ "sống lại"
      }
    }
    var sh = activeSS_().getSheetByName(HISTORY_SHEET);
    if (sh && sh.getLastRow() >= 2) {
      var hk = sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues(), hd = [];
      for (var h = 0; h < hk.length; h++) { var y2 = ymOf(hk[h][0]); if (y2 !== null && cur - y2 > 6) hd.push(h + 2); }
      for (var q = hd.length - 1; q >= 0; q--) { sh.deleteRow(hd[q]); nHist++; }
    }
  } finally {
    lock.releaseLock();
  }
  return { kv: nKv, hist: nHist };
}

/** 🩺 Kiểm tra hệ thống (quản lý): số dòng, khoá lớn nhất, sao lưu, thời gian mở tháng. */
function selfCheck(token, yearMonth, doPrune) {
  requireManager_(token);
  var out = { version: APP_VERSION, warn: [] };
  if (doPrune) out.pruned = pruneOldData_();
  var t0 = Date.now();
  try { loadMonth(token, assertYearMonth_(yearMonth)); } catch (e) { out.warn.push('loadMonth: ' + e.message); }
  out.loadMs = Date.now() - t0;
  var sheet = getSheet_(), last = sheet.getLastRow(), wide = sheet.getLastColumn();
  out.rows = Math.max(0, last - 1);
  var sizes = [];
  if (last >= 2) {
    var vals = sheet.getRange(2, 1, last - 1, Math.max(3, wide)).getValues();
    vals.forEach(function (r) {
      if (r[1] !== 'shared') return;
      var n = 0; for (var c = 2; c < r.length; c++) n += String(r[c] == null ? '' : r[c]).length;
      sizes.push({ key: String(r[0]), size: n });
    });
  }
  sizes.sort(function (a, b) { return b.size - a.size; });
  out.top = sizes.slice(0, 6);
  out.totalKB = Math.round(sizes.reduce(function (s, x) { return s + x.size; }, 0) / 1024);
  try {
    var hs = activeSS_().getSheetByName(HISTORY_SHEET);
    out.historyRows = hs ? Math.max(0, hs.getLastRow() - 1) : 0;
  } catch (e2) { out.historyRows = null; }
  try { out.daily = dailyTriggers_().length > 0; } catch (e3) { out.daily = null; }
  out.lastBackupAt = Number(PropertiesService.getScriptProperties().getProperty('lastBackupAt') || 0) || null;
  if (out.loadMs > 6000) out.warn.push('slow');
  if (!out.daily) out.warn.push('nodaily');
  if (out.top[0] && out.top[0].size > 400000) out.warn.push('big');
  if (out.historyRows > 3000) out.warn.push('history');
  return out;
}

/** Quản lý bấm "Sao lưu ngay". Chặn bấm liên tục: 5 phút một lần. */
function backupNow(token) {
  requireManager_(token);
  var last = Number(PropertiesService.getScriptProperties().getProperty('lastBackupAt') || 0);
  if (Date.now() - last < 5 * 60 * 1000) throw new Error('Vừa sao lưu xong, đợi vài phút rồi hãy bấm lại.');
  return doBackup_('bấm tay');
}

function dailyTriggers_() {
  return ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === 'runDailyBackup';
  });
}

/** Bật / tắt sao lưu hằng ngày lúc 3 giờ sáng. */
function setDailyBackup(token, on) {
  requireManager_(token);
  dailyTriggers_().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  if (on) ScriptApp.newTrigger('runDailyBackup').timeBased().everyDays(1).atHour(3).create();
  return getBackupStatus(token);
}

function getBackupStatus(token) {
  requireManager_(token);
  var props = PropertiesService.getScriptProperties();
  var n = 0;
  try {
    var sh = activeSS_().getSheetByName(HISTORY_SHEET);
    n = sh ? Math.max(0, sh.getLastRow() - 1) : 0;
  } catch (e) {}
  var daily = false;
  try { daily = dailyTriggers_().length > 0; } catch (e) {}
  return {
    daily: daily,
    lastAt: Number(props.getProperty('lastBackupAt') || 0) || null,
    lastUrl: props.getProperty('lastBackupUrl') || '',
    folderUrl: props.getProperty('backupFolderUrl') || '',
    historyCount: n
  };
}

/**
 * CHẠY MỘT LẦN trong trình soạn thảo Apps Script (chọn hàm này rồi bấm Chạy)
 * để Google hỏi quyền truy cập Drive và quyền đặt lịch chạy. Web app chạy dưới
 * quyền của anh nên anh phải cấp trước thì nút sao lưu trong app mới dùng được.
 */
function authorizeBackup() {
  DriveApp.getRootFolder();
  ScriptApp.getProjectTriggers();
  return 'Đã cấp quyền. Giờ có thể bật sao lưu hằng ngày trong app.';
}

/**
 * Đọc trước NHIỀU khoá trong MỘT lần gọi bộ nhớ đệm (CacheService.getAll) — loadMonth cần ~30 khoá,
 * trước đây mỗi khoá một lần gọi (~20–40ms/lần) → mở app chậm cả giây. Chỉ sống trong một lượt chạy.
 */
var KV_MEMO_ = null;
function kvPrefetch_(keys) {
  try {
    var cache = CacheService.getScriptCache(), ck = keys.map(cacheKey_), got = cache.getAll(ck) || {};
    KV_MEMO_ = KV_MEMO_ || {};
    keys.forEach(function (k, i) { var v = got[ck[i]]; if (v !== undefined && v !== null) KV_MEMO_[k] = v; });
  } catch (e) { /* lỗi bộ nhớ đệm: đọc từng khoá như cũ */ }
  // Khoá nào bộ nhớ đệm chưa có (lần đầu sau khi sửa dữ liệu) → đọc thẳng từ sheet trong MỘT lượt quét.
  try {
    var miss = keys.filter(function (k) { return !(KV_MEMO_ && Object.prototype.hasOwnProperty.call(KV_MEMO_, k)); });
    if (miss.length) kvLoadMany_(miss);
  } catch (e2) { /* lỗi gì thì để kvGet_ đọc từng khoá như cũ */ }
}

/** Đọc nhiều khoá từ sheet: quét cột khoá MỘT lần, rồi mỗi khoá đúng một lượt đọc ô.
 *  Trước đây khoá nào không có trong bộ nhớ đệm thì quét lại cả cột — 31 khoá = ~60 lượt gọi sheet. */
function kvLoadMany_(keys) {
  var sheet = getSheet_(), idx = {}, last = sheet.getLastRow();
  if (last >= 2) {
    var kv = sheet.getRange(2, 1, last - 1, 2).getValues();
    for (var i = 0; i < kv.length; i++) {
      if (kv[i][1] === 'shared' && !Object.prototype.hasOwnProperty.call(idx, kv[i][0])) idx[kv[i][0]] = i + 2;
    }
  }
  ROWIDX_[rowIdxKey_(sheet)] = idx;
  var width = Math.max(1, sheet.getLastColumn() - 2);
  KV_MEMO_ = KV_MEMO_ || {};
  keys.forEach(function (k) {
    var row = Object.prototype.hasOwnProperty.call(idx, k) ? idx[k] : -1;
    var value = null;
    if (row !== -1) {
      var vals = sheet.getRange(row, 3, 1, width).getValues()[0];
      value = valueFromCells_(vals);
    }
    putCacheFromRead_(k, value === null ? '\u0000NULL\u0000' : value);
    KV_MEMO_[k] = value === null ? '\u0000NULL\u0000' : value;
  });
}
/** Giải mã giá trị từ các ô (cùng luật với readCellValue_). */
function valueFromCells_(vals) {
  var first = vals[0];
  if (first === '' || first === null || first === undefined) return null;
  first = String(first);
  if (first.charAt(0) !== CHUNK_MARK) return first;
  var out = '';
  for (var i = 0; i < vals.length; i++) {
    var v = vals[i];
    if (v === '' || v === null || v === undefined) break;
    v = String(v);
    if (v.charAt(0) !== CHUNK_MARK) break;
    out += v.slice(1);
  }
  return out;
}
function kvGet_(key) {
  if (KV_MEMO_ && Object.prototype.hasOwnProperty.call(KV_MEMO_, key)) {
    var mv = KV_MEMO_[key];
    return mv === '\u0000NULL\u0000' ? null : mv;
  }
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey_(key));
  if (cached !== null) return cached === '\u0000NULL\u0000' ? null : cached;
  var sheet = getSheet_();
  var row = findRow_(sheet, key);
  var value = row === -1 ? null : readCellValue_(sheet, row);
  // Qua putCacheSafe_ để kiểm kích thước: CacheService từ chối giá trị trên
  // 100KB. Trước đây gọi thẳng cache.put, nên tháng nào to quá (quán đông, có
  // tăng ca) thì chỉ riêng việc MỞ tháng đó ra cũng ném lỗi.
  putCacheFromRead_(key, value === null ? '\u0000NULL\u0000' : value);
  return value;
}

/** Ghi THẲNG, không kiểm quyền — chỉ được gọi từ các hàm đã có guard ở trên. */
function kvSet_(key, value, reason, force, noWait) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(noWait ? 0 : LOCK_WAIT_MS)) {
    if (noWait) return false;          // ghi phụ (vá dữ liệu cũ): đang có người giữ lock thì để lần sau
    throw new Error('Hệ thống đang bận (nhiều người cùng thao tác), vui lòng thử lại sau ít giây.');
  }
  try {
    var sheet = getSheet_();
    var row = findRow_(sheet, key);
    // LỚP 2: chụp lại bản cũ vào sheet History trước khi đè.
    if (row !== -1) snapshot_(key, readCellValue_(sheet, row), reason, force);
    if (row === -1) appendKeyValue_(sheet, key, value);
    else writeCellValue_(sheet, row, value);
    putCacheSafe_(key, String(value)); // cập nhật cache khi VẪN còn giữ lock
    touchMod_(key);
  } finally {
    lock.releaseLock();
  }
  return true;
}

/** Đọc–sửa–ghi MỘT khoá trong cùng một lock (hai máy cùng sửa không đè mất của nhau).
 *  fn(giá trị đã parse hoặc null) → giá trị mới (object/array). Có chụp lịch sử như kvSet_. */
function kvUpdate_(key, fn, reason, force) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận (nhiều người cùng thao tác), vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_(), row = findRow_(sheet, key);
    var raw = row !== -1 ? readCellValue_(sheet, row) : null, cur = null;
    if (raw) { try { cur = JSON.parse(raw); } catch (e) { cur = null; } }
    var next = fn(cur);
    var json = JSON.stringify(next);
    if (row !== -1) snapshot_(key, raw, reason, force);
    if (row === -1) appendKeyValue_(sheet, key, json); else writeCellValue_(sheet, row, json);
    putCacheSafe_(key, json);
    touchMod_(key);
    return next;
  } finally { lock.releaseLock(); }
}

// ===========================================================================
// DANH SÁCH NHÂN VIÊN
// ===========================================================================

function readEmployees_() {
  var raw = kvGet_('employees');
  if (raw) {
    try {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.length && typeof parsed[0] === 'string') {
        // dữ liệu rất cũ: mảng tên thuần -> chuyển sang {id, name}
        var upgraded = parsed.map(function (n) { return { id: genId_(), name: n }; });
        kvSet_('employees', JSON.stringify(upgraded));
        return upgraded;
      }
      if (parsed && parsed.length) return parsed;
      // v41: danh sách RỖNG (quản lý xoá hết) là dữ liệu thật — trước đây bị coi là "chưa có" và tự tạo lại
      // 20 nhân viên mẫu. Chỉ tạo mẫu khi khoá 'employees' chưa từng tồn tại.
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // Ô dữ liệu hỏng (ghi dở / sửa tay): KHÔNG ghi đè bằng danh sách mẫu — mất hết nhân viên thật.
      throw new Error('Danh sách nhân viên đang bị lỗi dữ liệu — mở "Lịch sử / khôi phục" để lấy lại bản trước, hoặc báo người cài app.');
    }
    throw new Error('Danh sách nhân viên đang bị lỗi dữ liệu — mở "Lịch sử / khôi phục" để lấy lại bản trước, hoặc báo người cài app.');
  }
  var seeded = DEFAULT_EMPLOYEES.map(function (n) { return { id: genId_(), name: n }; });
  kvSet_('employees', JSON.stringify(seeded));
  return seeded;
}

function genId_() {
  return 'e' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}

// Nhãn kỹ năng. Danh sách CỐ ĐỊNH chứ không cho gõ tự do, vì bộ tự xếp lịch và
// các cảnh báo phải tham chiếu được đúng tên nhãn.
//   open  オープン可   mở cửa được
//   close クローズ可   đóng cửa được
//   reg   レジ         đứng quầy được
//   sand  サンド       làm bánh được
//   new   新人         người mới, chưa đứng một mình được
//   train 教育可       kèm được người mới
var ALLOWED_TAGS = ['open', 'close', 'reg', 'sand', 'new', 'train', 'master'];

/**
 * Khung giờ làm được của một người, theo TỪNG THỨ trong tuần.
 * Mảng 7 phần tử, chỉ số 0 = Chủ nhật … 6 = Thứ Bảy.
 * Mỗi phần tử là null (thứ đó làm giờ nào cũng được) hoặc [từ, đến].
 *
 * Dùng cho người có ràng buộc cố định: du học sinh có lớp sáng nên Hai–Sáu chỉ
 * làm sau 17:00, mẹ bỉm phải về trước 18:00 đón con… Đây là ràng buộc CỨNG,
 * bộ xếp lịch nháp không bao giờ được xếp ra ngoài khung này.
 */
/** Khung giờ làm được: 8 ô — 0..6 là CN..T7, ô 7 là NGÀY LỄ. */
function normalizeWin_(v) {
  var out = [null, null, null, null, null, null, null, null];
  if (!v || typeof v.length !== 'number') return out;
  for (var i = 0; i < 8 && i < v.length; i++) {
    var pair = v[i];
    if (!pair || typeof pair.length !== 'number' || pair.length < 2) continue;
    var a = Number(pair[0]), b = Number(pair[1]);
    if (!isFinite(a) || !isFinite(b)) continue;
    a = Math.max(0, Math.min(24, Math.round(a * 2) / 2));
    b = Math.max(0, Math.min(24, Math.round(b * 2) / 2));
    if (b > a) out[i] = [a, b];
  }
  return out;
}

// Kỹ năng tự thêm (Cài đặt → Kỹ năng): khoá dạng "c" + vài chữ/số, tên nằm
// trong settings.customTags.
var CUSTOM_TAG_RE = /^c[0-9a-z]{1,10}$/;
function isTagKey_(tg) { return ALLOWED_TAGS.indexOf(tg) !== -1 || CUSTOM_TAG_RE.test(tg); }

function normalizeTags_(v) {
  if (!v || typeof v.length !== 'number') return [];
  var out = [], seen = {};
  for (var i = 0; i < v.length && out.length < 24; i++) {
    var tg = String(v[i]);
    if (!isTagKey_(tg) || seen[tg]) continue;
    seen[tg] = true; out.push(tg);
  }
  return out;
}

/**
 * Nhân viên tự đặt khung giờ làm được của CHÍNH MÌNH theo từng thứ.
 *
 * Dùng requireCanEdit_ nên quản lý gọi cho ai cũng được, còn nhân viên chỉ sửa
 * được của mình — người khác là ném lỗi, không âm thầm ghi nhầm.
 *
 * Chỉ động vào đúng trường win của đúng một người, không ghi đè cả danh sách,
 * để nhân viên không thể vô tình xoá tên người khác hay đổi trần giờ của mình.
 */
function saveMyWindow(token, empId, winJson) {
  requireCanEdit_(token, empId);
  var win;
  try { win = JSON.parse(winJson); } catch (e) { throw new Error('Dữ liệu khung giờ không hợp lệ.'); }
  // Đọc – sửa – ghi TRỌN trong một lượt khoá, đọc thẳng từ Sheet (không qua
  // cache). Đọc ngoài khoá thì quản lý lưu danh sách xen giữa là một bên mất.
  // Chỉ dùng hàm cấp thấp bên trong: kvGet_/kvSet_ tự giữ khoá, LockService
  // không tái nhập được — gọi chúng ở đây là kẹt cứng.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_();
    var row = findRow_(sheet, 'employees');
    var raw = row === -1 ? null : readCellValue_(sheet, row);
    var list = [];
    try { list = JSON.parse(raw || '[]') || []; } catch (e2) { list = []; }
    var found = false;
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) !== String(empId)) continue;
      list[i].win = normalizeWin_(win);
      list[i].winAt = Date.now();          // để lần quản lý lưu danh sách sau không đè mất
      found = true;
      break;
    }
    if (!found) throw new Error('Không tìm thấy nhân viên này.');
    var json = JSON.stringify(list);
    snapshot_('employees', raw, 'nhân viên sửa giờ cố định', false);
    writeCellValue_(sheet, row, json);
    putCacheSafe_('employees', json);
  } finally {
    lock.releaseLock();
  }
  return true;
}

/** Quản lý lưu lại toàn bộ danh sách nhân viên (thêm/xoá/đổi tên). */
function saveEmployees(token, employeesJson) {
  requireManager_(token);
  var list;
  try { list = JSON.parse(employeesJson); } catch (e) { throw new Error('Dữ liệu danh sách nhân viên không hợp lệ.'); }
  try { forgetWho_(readEmployees_().map(function (e) { return e.id; })); } catch (eW) {}
  if (!list || typeof list.length !== 'number') throw new Error('Dữ liệu danh sách nhân viên không hợp lệ.');
  var seen = {};
  for (var i = 0; i < list.length; i++) {
    var e = list[i];
    if (!e || !e.id || !e.name) throw new Error('Có nhân viên thiếu mã hoặc tên.');
    if (seen[e.id]) throw new Error('Mã nhân viên bị trùng: ' + e.id);
    seen[e.id] = true;
    // Phân loại để tính SA時間 / オーナー・社員時間. Thiếu hoặc sai thì coi là SA.
    e.type = (e.type === 'staff') ? 'staff' : 'sa';
    // Giới hạn giờ của riêng người này. null = không đặt.
    //   maxWeek  : trần giờ mỗi tuần (vd. du học sinh 28 giờ)
    //   minMonth : SÀN giờ mỗi tháng — nhân viên chính thức ăn lương tháng thì
    //              phải xếp đủ giờ, thiếu là quán trả lương cho giờ không dùng
    //   maxMonth : trần giờ mỗi tháng, cho người chỉ muốn làm vừa phải
    var mw = Number(e.maxWeek);
    e.maxWeek = (isFinite(mw) && mw > 0) ? mw : null;
    var mnM = Number(e.minMonth);
    e.minMonth = (isFinite(mnM) && mnM > 0) ? mnM : null;
    var mxM = Number(e.maxMonth);
    e.maxMonth = (isFinite(mxM) && mxM > 0) ? mxM : null;
    if (e.minMonth && e.maxMonth && e.minMonth > e.maxMonth) {
      throw new Error('Sàn giờ tháng không được lớn hơn trần giờ tháng (' + e.name + ').');
    }
    e.tags = normalizeTags_(e.tags);
    e.win = normalizeWin_(e.win);
    // Độ dài ca người này thích nhất. Baito hay chọn đúng 6 tiếng vì quá 6 là
    // luật bắt nghỉ 45 phút không công. null = không đặt.
    var pl = Number(e.prefLen);
    e.prefLen = (isFinite(pl) && pl > 0 && pl <= 12) ? (Math.round(pl * 2) / 2) : null;
    // 🔰 nhân viên mới (dấu 初心者マーク) và thẻ kỹ năng "người mới" là MỘT việc: hai bên luôn khớp nhau.
    // Ngày đánh dấu lần đầu (newSince) dùng để nhắc xem xét bỏ đánh dấu sau 3 tháng.
    e.newbie = e.newbie === true;
    var ns = String(e.newSince || '');
    e.newSince = e.newbie ? (/^\d{4}-\d{2}-\d{2}$/.test(ns) ? ns : todayStr_()) : '';
    if (e.newbie && e.tags.indexOf('new') === -1 && e.tags.length < 24) e.tags.push('new');
    if (!e.newbie) e.tags = e.tags.filter(function (x) { return x !== 'new'; });
    // Thu nhập mục tiêu mỗi tháng (円): 0 = không đặt. Báo khi dự kiến ra ngoài khoảng này.
    var mi = Math.round(Number(e.minIncome)), ma = Math.round(Number(e.maxIncome));
    e.minIncome = (isFinite(mi) && mi > 0 && mi <= 2000000) ? mi : 0;
    e.maxIncome = (isFinite(ma) && ma > 0 && ma <= 2000000) ? ma : 0;
    // Mức ưu tiên xếp ca (người có giờ cố định): 0 = bình thường, 1 thấp, 2 vừa, 3 cao.
    var pr = Math.round(Number(e.priority));
    e.priority = (isFinite(pr) && pr >= 1 && pr <= 3) ? pr : 0;
    // Tiền đi lại MỖI NGÀY đi làm (円). Chỉ quản lý thấy — loadMonth lọc bỏ với nhân viên.
    var tv = Math.round(Number(e.travel));
    e.travel = (isFinite(tv) && tv > 0 && tv <= 100000) ? tv : 0;
    // Cho phép tách 2 ca trong ngày (vd. 8–12 và 17–L). Chỉ nhân viên chính thức.
    e.splitOk = (e.type === 'staff') && e.splitOk === true;
    // Chức vụ (v.7): 0 = không, 1 トレーナー, 2 シフトリーダー, 3 副店長, 4 店長 — dùng để xếp thứ tự.
    var rk = Math.round(Number(e.rank));
    if (isFinite(rk) && rk >= 1 && rk <= 4) e.rank = rk; else delete e.rank;
  }
  // Ghi trong một lượt khoá, và GIỮ khung giờ nhân viên vừa tự sửa nếu bản
  // trên máy quản lý cũ hơn (winAt). Không vậy thì quản lý chỉ đổi SA/社員 của
  // một người là đè mất giờ cố định người khác vừa khai.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_();
    var row = findRow_(sheet, 'employees');
    var raw = row === -1 ? null : readCellValue_(sheet, row);
    var cur = [];
    try { cur = JSON.parse(raw || '[]') || []; } catch (e3) { cur = []; }
    var byId = {};
    cur.forEach(function (c) { if (c && c.id) byId[c.id] = c; });
    list.forEach(function (e) {
      var old = byId[e.id];
      var inAt = Number(e.winAt) || 0, oldAt = old ? (Number(old.winAt) || 0) : 0;
      if (old && oldAt > inAt) { e.win = normalizeWin_(old.win); e.winAt = oldAt; }
      else e.winAt = inAt || null;
      // Email nhân viên tự đăng ký: bản trên máy quản lý cũ hơn thì giữ bản đã lưu.
      if (old && (Number(old.mailAt) || 0) > (Number(e.mailAt) || 0)) {
        if (old.email) { e.email = old.email; e.mp = old.mp; } else { delete e.email; delete e.mp; }
        e.mailAt = old.mailAt;
      }
      if (e.email && !/^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$/.test(String(e.email))) delete e.email;
      if (old && old.lang) e.lang = old.lang; else delete e.lang;   // v24: ngôn ngữ do nhân viên tự chọn
    });
    // Số nhân viên do máy chủ cấp, không đổi được từ máy (giữ số cũ, người mới lấy số kế tiếp).
    assignEmpCodes_(list, cur);
    var json = JSON.stringify(list);
    if (row !== -1) snapshot_('employees', raw, 'sửa danh sách', true);
    if (row === -1) appendKeyValue_(sheet, 'employees', json);
    else writeCellValue_(sheet, row, json);
    putCacheSafe_('employees', json);
  } finally {
    lock.releaseLock();
  }
  return true;
}




// ===========================================================================
// HỘP NHẮC NHỞ (memo) — việc của quán trong ngày, ai cũng đọc được
// ===========================================================================
// Ví dụ: có khách đặt bàn (予約), mở bán món mới, bắt đầu đợt camping…
// Lưu ở khoá "memo:YYYY-MM": mảng { id, from, to, kind, title, text, at }.
//   from/to : ngày trong tháng (1..31), nhắc nhở kéo dài nhiều ngày thì from<to
//   kind    : yoyaku | newitem | campaign | training | other
// Chỉ quản lý ghi; nhân viên đọc (để còn biết hôm nay quán có việc gì).

var MEMO_KINDS = ['yoyaku', 'newitem', 'campaign', 'training', 'other'];
var MEMO_MAX = 60;

function readMemos_(yearMonth) {
  var raw = kvGet_('memo:' + yearMonth);
  if (!raw) return [];
  try { var a = JSON.parse(raw); return (a && a.length) ? a : []; } catch (e) { return []; }
}

function saveMemo(token, yearMonth, memoJson) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth);
  var m;
  try { m = JSON.parse(memoJson); } catch (e) { throw new Error('Nội dung nhắc nhở không hợp lệ.'); }
  if (!m || !String(m.title || '').trim()) throw new Error('Nhắc nhở phải có tiêu đề.');
  return kvUpdate_('memo:' + ym, function (list) {
    list = Array.isArray(list) ? list : [];
    var from = Math.max(1, Math.min(31, Math.round(Number(m.from) || 1)));
    var to = Math.max(from, Math.min(31, Math.round(Number(m.to) || from)));
    var item = {
      id: String(m.id || Utilities.getUuid()).slice(0, 40),
      from: from, to: to,
      kind: (MEMO_KINDS.indexOf(String(m.kind)) === -1) ? 'other' : String(m.kind),
      title: String(m.title).trim().slice(0, 80),
      text: String(m.text == null ? '' : m.text).trim().slice(0, 500),
      at: Date.now()
    };
    var idx = -1;
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === item.id) idx = i;
    if (idx === -1) {
      if (list.length >= MEMO_MAX) throw new Error('Tháng này đã có quá nhiều nhắc nhở (tối đa ' + MEMO_MAX + ').');
      list.push(item);
    } else {
      item.at = list[idx].at || item.at;
      list[idx] = item;
    }
    list.sort(function (a, b) { return a.from - b.from || a.to - b.to; });
    return list;
  }, 'nhắc nhở', true);
}

function deleteMemo(token, yearMonth, memoId) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth);
  return kvUpdate_('memo:' + ym, function (list) {
    return (Array.isArray(list) ? list : []).filter(function (x) { return x && x.id !== String(memoId); });
  }, 'xoá nhắc nhở', true);
}

// ===========================================================================
// GIAO VIỆC (作業) — việc hằng ngày / hằng tuần / hằng tháng + việc riêng một ngày
// ===========================================================================
// Mục đích: hết cảnh "nạnh việc". Mỗi việc có TÊN NGƯỜI làm, làm xong thì tích
// (máy chủ ghi giờ), việc quan trọng thì phải chụp ảnh làm bằng chứng.
//
//   jobtpl        = [ {id, title, freq:'d'|'w'|'m', dows:[0..6], mdays:[1..31],
//                      slot:'any'|'open'|'mid'|'close', photo, note, from:'YYYY-MM-DD',
//                      until:'YYYY-MM-DD'|null, at} ]
//                   Việc LẶP LẠI. Hiện ở mọi ngày khớp lịch, từ ngày `from` đến
//                   trước ngày `until` (xoá = đặt until để ngày cũ không bị đổi).
//                   mdays > số ngày của tháng = ngày cuối tháng (31 = "cuối tháng").
//   jobs:<YM>     = { "<ngày>": { t: { <tplId>: STATE }, x: [ {id, title, slot, photo, note, ...STATE} ] } }
//                   t = trạng thái của việc lặp lại trong ngày đó; x = việc riêng ngày đó.
//   STATE         = { to:[empId…], skip:bool, done:{by, at}|null,
//                     ph:[{f:fileId, at, by, ex:msChụp|null, fl:'old'|'noexif'|null}] }
//
// Ảnh: lưu vào thư mục Drive riêng của quán, chỉ quản lý xem được, tự bỏ vào
// thùng rác sau JOB_PHOTO_DAYS ngày (dấu ✓ và giờ thì giữ mãi).

var JOB_TPL_KEY = 'jobtpl';
var JOB_TPL_MAX = 60;
var JOB_DAY_MAX = 30;
var JOB_SLOTS = ['any', 'open', 'mid', 'close'];
var JOB_PHOTO_DAYS = 7;
var JOB_PHOTO_MAX_B64 = 2600000;      // ~1.9MB — ảnh đã thu nhỏ trên máy chỉ cỡ 200KB
var JOB_PHOTO_OLD_MS = 15 * 60 * 1000; // chụp cách lúc gửi quá 15 phút → gắn cờ
var JOB_FOLDER_PREFIX = 'SUBWAY 作業写真 — ';

function readJobTpl_() {
  var raw = kvGet_(JOB_TPL_KEY);
  if (!raw) return [];
  try { var a = JSON.parse(raw); return (a && a.length) ? a : []; } catch (e) { return []; }
}

function jstDateStr_(offsetDays) {
  return new Date(Date.now() + 9 * 3600 * 1000 + (offsetDays || 0) * 86400000).toISOString().slice(0, 10);
}
function ymdOf_(ym, day) { return ym + '-' + ('0' + day).slice(-2); }

function normJobBase_(o) {
  var title = String((o && o.title) || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!title) throw new Error('Việc phải có tên.');
  return {
    title: title,
    slot: JOB_SLOTS.indexOf(String(o.slot)) === -1 ? 'any' : String(o.slot),
    photo: !!o.photo,
    note: String(o.note == null ? '' : o.note).trim().slice(0, 200)
  };
}

// --- Tự dịch tên việc sang ngôn ngữ nhân viên chọn (vi / ja / en) ---------
// Dùng LanguageApp (Google Dịch có sẵn trong Apps Script, không cần cấp thêm
// quyền). Dịch MỘT LẦN lúc lưu rồi cất vào tr, nhân viên mở app không phải chờ.
// Quản lý sửa tay bản dịch nào thì giữ bản đó (trM[lang] = true) cho tới khi
// đổi tên việc gốc.
var JOB_LANGS = ['vi', 'ja', 'en'];
function jobTranslate_(base, prev, manualJson) {
  var man = {};
  try { man = (typeof manualJson === 'string' ? JSON.parse(manualJson) : manualJson) || {}; } catch (e) { man = {}; }
  var same = prev && prev.title === base.title && (prev.note || '') === base.note && prev.tr;
  var tr = same ? JSON.parse(JSON.stringify(prev.tr)) : {}, trM = same ? JSON.parse(JSON.stringify(prev.trM || {})) : {};
  JOB_LANGS.forEach(function (lg) {
    var m = man[lg];
    if (m && String(m.t || '').trim()) {
      tr[lg] = { t: String(m.t).replace(/\s+/g, ' ').trim().slice(0, 80), n: String(m.n == null ? (tr[lg] && tr[lg].n) || '' : m.n).trim().slice(0, 300) };
      trM[lg] = true;
      return;
    }
    if (tr[lg]) return;
    try {
      tr[lg] = {
        t: String(LanguageApp.translate(base.title, '', lg) || base.title).slice(0, 80),
        n: base.note ? String(LanguageApp.translate(base.note, '', lg) || base.note).slice(0, 300) : ''
      };
    } catch (e) { /* hết lượt dịch trong ngày: hiện tên gốc */ }
  });
  return { tr: tr, trM: trM };
}

/** Việc lặp lại có rơi vào ngày này không (ym = 'YYYY-MM'). */
function jobTplOn_(tpl, ym, day) {
  if (!tpl) return false;
  var ymd = ymdOf_(ym, day);
  if (tpl.from && ymd < tpl.from) return false;
  if (tpl.until && ymd >= tpl.until) return false;
  var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7));
  if (tpl.freq === 'w') return (tpl.dows || []).indexOf(new Date(Date.UTC(y, m - 1, day)).getUTCDay()) !== -1;
  if (tpl.freq === 'm') {
    var last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return (tpl.mdays || []).some(function (n) { return Math.min(Number(n), last) === day; });
  }
  return true;
}

// --- Giao theo VAI TRÒ + danh sách mục con ---------------------------------
//   role : 'none' = giao tay · 'open' = người mở cửa · 'close' = người đóng cửa
//          (có ca tới L) · 'win' = người có ca trong khung wf–wt (wt 99 = tới L).
//   mins : số phút ước tính — máy (phía trình duyệt) chia đều các việc cùng vai
//          trò cho những người đủ điều kiện theo tổng phút, xoay vòng theo ngày.
//   items: [{t, tr}] các mục con; tích đủ hết mới được xong / chụp ảnh.
// Quản lý giao tay (st.to) thì thắng phần tự chia.
var JOB_ROLES = ['none', 'open', 'close', 'win'];
var JOB_ITEMS_MAX = 20;

function normJobItems_(raw, prevItems) {
  var out = [];
  (raw || []).forEach(function (it) {
    var t = String((it && typeof it === 'object') ? (it.t || '') : (it || '')).replace(/\s+/g, ' ').trim().slice(0, 120);
    if (!t || out.length >= JOB_ITEMS_MAX) return;
    var prev = (prevItems || []).filter(function (p) { return p && p.t === t && p.tr; })[0];
    var man = (it && typeof it === 'object') ? it.tr : null;
    var tr = prev ? JSON.parse(JSON.stringify(prev.tr)) : {};
    JOB_LANGS.forEach(function (lg) {
      var mv = man && man[lg] && (typeof man[lg] === 'object' ? man[lg].t : man[lg]);
      if (mv && String(mv).trim()) { tr[lg] = { t: String(mv).trim().slice(0, 160) }; return; }
      if (tr[lg]) return;
      try { tr[lg] = { t: String(LanguageApp.translate(t, '', lg) || t).slice(0, 160) }; } catch (e) { /* hiện bản gốc */ }
    });
    out.push({ t: t, tr: tr });
  });
  return out;
}

function halfHour_(v, lo, hi) {
  var n = Math.round(Number(v) * 2) / 2;
  return isFinite(n) ? Math.max(lo, Math.min(hi, n)) : null;
}

/** Chuẩn hoá một việc lặp lại. prev = bản cũ (sửa) hoặc null (mới). */
function normTpl_(o, prev) {
  o = o || {};
  var base = normJobBase_(o);
  var freq = ['d', 'w', 'm'].indexOf(String(o.freq)) === -1 ? 'd' : String(o.freq);
  var dows = [], mdays = [];
  (o.dows || []).forEach(function (w) { w = Math.round(Number(w)); if (w >= 0 && w <= 6 && dows.indexOf(w) === -1) dows.push(w); });
  (o.mdays || []).forEach(function (n) { n = Math.round(Number(n)); if (n >= 1 && n <= 31 && mdays.indexOf(n) === -1) mdays.push(n); });
  dows.sort(); mdays.sort(function (a, b) { return a - b; });
  if (freq === 'w' && !dows.length) throw new Error('Chọn ít nhất một thứ trong tuần.');
  if (freq === 'm' && !mdays.length) throw new Error('Chọn ít nhất một ngày trong tháng.');
  var role = JOB_ROLES.indexOf(String(o.role)) === -1 ? 'none' : String(o.role);
  var wf = null, wt = null;
  if (role === 'win') {
    wf = halfHour_(o.wf, 0, 30); wt = Number(o.wt) >= 99 ? 99 : halfHour_(o.wt, 0, 30);
    if (wf === null || wt === null || !(wt > wf)) throw new Error('Khung giờ không hợp lệ (giờ kết thúc phải sau giờ bắt đầu).');
  }
  var today = jstDateStr_(0);
  var from = /^\d{4}-\d{2}-\d{2}$/.test(String(o.from || '')) ? String(o.from) : today;
  if (from > today) from = today;   // lên lịch trước cho tháng sau vẫn hiện
  var item = {
    id: prev ? prev.id : ('j' + Utilities.getUuid().replace(/-/g, '').slice(0, 10)),
    title: base.title, freq: freq, dows: freq === 'w' ? dows : [], mdays: freq === 'm' ? mdays : [],
    slot: base.slot, photo: base.photo, note: base.note,
    role: role, wf: wf, wt: wt, mins: Math.max(1, Math.min(240, Math.round(Number(o.mins) || 15))),
    items: normJobItems_(o.items, prev && prev.items),
    from: prev ? (prev.from || from) : from, until: null, at: Date.now()
  };
  var trx = jobTranslate_(base, prev, o.tr);
  item.tr = trx.tr; item.trM = trx.trM;
  return item;
}

function saveJobTemplate(token, tplJson) {
  requireManager_(token);
  var o;
  try { o = JSON.parse(tplJson); } catch (e) { throw new Error('Nội dung việc không hợp lệ.'); }
  var list = readJobTpl_(), idx = -1, id = String((o && o.id) || '');
  for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) idx = i;
  var item = normTpl_(o, idx === -1 ? null : list[idx]);
  if (idx === -1) {
    if (list.filter(function (x) { return x && !x.until; }).length >= JOB_TPL_MAX) throw new Error('Đã có quá nhiều việc lặp lại (tối đa ' + JOB_TPL_MAX + ').');
    list.push(item);
  } else list[idx] = item;
  kvSet_(JOB_TPL_KEY, JSON.stringify(list), 'việc lặp lại', true);
  return list;
}

/** Nhập một lượt cả bộ việc (bộ chuẩn SUBWAY dựng sẵn trong app). Việc trùng tên đang dùng thì bỏ qua. */
function importJobTemplates(token, listJson) {
  requireManager_(token);
  var arr;
  try { arr = JSON.parse(listJson); } catch (e) { throw new Error('Danh sách việc không hợp lệ.'); }
  if (!arr || !arr.length) throw new Error('Danh sách việc trống.');
  var list = readJobTpl_(), have = {}, added = 0, skipped = 0;
  list.forEach(function (x) { if (x && !x.until) have[x.title] = true; });
  arr.forEach(function (o) {
    var t = String((o && o.title) || '').replace(/\s+/g, ' ').trim();
    if (!t || have[t]) { skipped++; return; }
    if (list.filter(function (x) { return x && !x.until; }).length >= JOB_TPL_MAX) throw new Error('Đã có quá nhiều việc lặp lại (tối đa ' + JOB_TPL_MAX + ').');
    var it = normTpl_(o, null);
    list.push(it); have[it.title] = true; added++;
  });
  kvSet_(JOB_TPL_KEY, JSON.stringify(list), 'nhập bộ việc', true);
  return { list: list, added: added, skipped: skipped };
}

/** Xoá việc lặp lại: các ngày đã qua vẫn giữ (để còn lịch sử ai làm), từ hôm nay trở đi thì mất.
 *  Việc mới tạo từ hôm nay trở đi thì xoá hẳn. */
function deleteJobTemplate(token, id) {
  requireManager_(token);
  var today = jstDateStr_(0);
  var list = readJobTpl_().filter(function (x) {
    if (!x || x.id !== String(id)) return true;
    if ((x.from || '') >= today) return false;
    x.until = today;
    return true;
  });
  kvSet_(JOB_TPL_KEY, JSON.stringify(list), 'xoá việc lặp lại', true);
  return list;
}

function readJobs_(ym) { return readJsonKey_('jobs:' + ym); }

/** Đọc – sửa – ghi ô việc của MỘT ngày trong một lượt khoá. fn(dayObj) sửa tại chỗ. */
function mutateJobDay_(ym, day, fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận (nhiều người cùng lưu), vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_(), key = 'jobs:' + ym;
    var obj = readMonthObject_(sheet, key);
    var d = obj[day] || { t: {}, x: [] };
    if (!d.t) d.t = {};
    if (!d.x) d.x = [];
    var out = fn(d);
    var empty = !d.x.length && !Object.keys(d.t).length;
    if (empty) delete obj[day]; else obj[day] = d;
    writeMonthObject_(sheet, key, obj, 'việc', false);
    return out === undefined ? (obj[day] || { t: {}, x: [] }) : out;
  } finally {
    lock.releaseLock();
  }
}

function assertJobDay_(ym, day) {
  ym = assertYearMonth_(ym);
  day = Math.round(Number(day));
  var last = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate();
  if (!(day >= 1 && day <= last)) throw new Error('Ngày không hợp lệ.');
  return day;
}

/** Tìm (và tạo nếu cần) trạng thái của việc `key` trong ngày. key = 't:<tplId>' | 'x:<id>'. */
function jobState_(d, ym, day, key, create) {
  var k = String(key || '');
  if (k.indexOf('t:') === 0) {
    var tid = k.slice(2);
    if (!d.t[tid]) {
      if (!create) return null;
      var tpl = readJobTpl_().filter(function (x) { return x && x.id === tid; })[0];
      if (!jobTplOn_(tpl, ym, day)) throw new Error('Việc này không có trong ngày ' + day + '.');
      d.t[tid] = { to: [] };
    }
    return d.t[tid];
  }
  if (k.indexOf('x:') === 0) {
    var xid = k.slice(2);
    for (var i = 0; i < d.x.length; i++) if (d.x[i] && d.x[i].id === xid) return d.x[i];
  }
  if (!create) return null;
  throw new Error('Không tìm thấy việc này (có thể quản lý vừa xoá). Tải lại trang.');
}
function jobNeedsPhoto_(ym, key, st) {
  var k = String(key);
  if (k.indexOf('x:') === 0) return !!st.photo;
  var tpl = readJobTpl_().filter(function (x) { return x && x.id === k.slice(2); })[0];
  return !!(tpl && tpl.photo);
}
function jobTitle_(key, st) {
  var k = String(key);
  if (k.indexOf('x:') === 0) return st.title || '';
  var tpl = readJobTpl_().filter(function (x) { return x && x.id === k.slice(2); })[0];
  return tpl ? tpl.title : '';
}
function cleanTo_(to) {
  var ids = {}; readEmployees_().forEach(function (e) { ids[e.id] = true; });
  var out = [];
  (to || []).forEach(function (id) { id = String(id); if (ids[id] && out.indexOf(id) === -1) out.push(id); });
  return out.slice(0, 6);
}

/**
 * Quản lý: tạo / sửa việc của một ngày, hoặc giao người cho việc lặp lại.
 *   jobJson = { key?:'t:..'|'x:..', title, slot, photo, note, to:[empId], skip }
 * Việc lặp lại chỉ đổi được người làm / bỏ riêng hôm nay; tên việc sửa ở danh mục.
 */
function saveDayJob(token, yearMonth, day, jobJson) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth); day = assertJobDay_(ym, day);
  var o;
  try { o = JSON.parse(jobJson); } catch (e) { throw new Error('Nội dung việc không hợp lệ.'); }
  o = o || {};
  var key = String(o.key || '');
  return mutateJobDay_(ym, day, function (d) {
    var st;
    if (key.indexOf('t:') === 0) {
      st = jobState_(d, ym, day, key, true);
    } else if (key.indexOf('x:') === 0) {
      st = jobState_(d, ym, day, key, true);
      var b = normJobBase_(o);
      var trx = jobTranslate_(b, st, o.tr);
      st.title = b.title; st.slot = b.slot; st.photo = b.photo; st.note = b.note; st.tr = trx.tr; st.trM = trx.trM;
      if (o.items) st.items = normJobItems_(o.items, st.items);
    } else {
      if (d.x.length >= JOB_DAY_MAX) throw new Error('Ngày này đã có quá nhiều việc (tối đa ' + JOB_DAY_MAX + ').');
      var nb = normJobBase_(o);
      var trn = jobTranslate_(nb, null, o.tr);
      st = { id: 'x' + Utilities.getUuid().replace(/-/g, '').slice(0, 10), title: nb.title, slot: nb.slot, photo: nb.photo, note: nb.note,
             tr: trn.tr, trM: trn.trM, to: [], items: normJobItems_(o.items, null) };
      d.x.push(st);
    }
    if (o.to) st.to = cleanTo_(o.to);
    if (o.skip !== undefined) st.skip = !!o.skip;
  });
}

/** Giao nhanh: gán nhiều việc của một ngày trong MỘT lượt ghi. map = { key: [empId] }. */
function assignDayJobs(token, yearMonth, day, mapJson) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth); day = assertJobDay_(ym, day);
  var m;
  try { m = JSON.parse(mapJson) || {}; } catch (e) { throw new Error('Nội dung việc không hợp lệ.'); }
  return mutateJobDay_(ym, day, function (d) {
    Object.keys(m).forEach(function (key) {
      if (!/^(t|x):/.test(key) || !Array.isArray(m[key])) return;
      if (key.indexOf('x:') === 0 && !(d.x || []).some(function (x) { return x && 'x:' + x.id === key; })) return;
      if (key.indexOf('t:') === 0 && !jobTplOf_(key)) return;
      try { jobState_(d, ym, day, key, true).to = cleanTo_(m[key]); } catch (e) { /* việc không còn hôm đó: bỏ qua, các việc khác vẫn giao */ }
    });
  });
}

/** Quản lý: xoá việc riêng của ngày; việc lặp lại thì "bỏ riêng hôm nay". */
function deleteDayJob(token, yearMonth, day, key) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth); day = assertJobDay_(ym, day);
  var k = String(key || '');
  return mutateJobDay_(ym, day, function (d) {
    if (k.indexOf('x:') === 0) d.x = d.x.filter(function (x) { return x && x.id !== k.slice(2); });
    else if (k.indexOf('t:') === 0) jobState_(d, ym, day, k, true).skip = true;
  });
}

function jobTplOf_(key) {
  var k = String(key || '');
  if (k.indexOf('t:') !== 0) return null;
  return readJobTpl_().filter(function (x) { return x && x.id === k.slice(2); })[0] || null;
}
function jobItemsOf_(key, st) {
  var tp = jobTplOf_(key);
  return (tp ? tp.items : (st && st.items)) || [];
}
function empOnShift_(ym, day, empId) {
  var sc = readMonthNormalized_('schedule:' + ym, readEmployees_())[day] || {};
  var e = sc[String(empId)];
  return !!(e && !e.off && e.shifts && e.shifts.length);
}
/**
 * Nhân viên tích được việc: (a) quản lý giao tay cho mình, hoặc (b) việc theo
 * VAI TRÒ chưa ai được giao tay mà mình có ca hôm đó (máy tự chia ở trình duyệt).
 * Chỉ trong hôm nay hoặc hôm qua (giờ Nhật).
 */
function assertJobActor_(who, ym, day, st, empId, key) {
  if (who.r === 'mgr') return;
  var to = (st && st.to) || [];
  var mine = to.indexOf(String(empId)) !== -1;
  if (!mine) {
    var tp = jobTplOf_(key);
    var byRole = !to.length && tp && tp.role && tp.role !== 'none' && empOnShift_(ym, day, empId);
    // v2026.10.16: việc trong checklist bấm thẻ về, chưa gán người → người làm ca cuối tích được.
    if (!byRole && !to.length && tp) {
      var cc0 = attCfg_().closeCheck;
      byRole = !!(cc0 && cc0.on && (cc0.ids || []).indexOf(tp.id) !== -1 && ccIsLast_(ym, day, empId));
    }
    if (!byRole) throw new Error('Việc này không được giao cho bạn.');
  }
  var ymd = ymdOf_(ym, day);
  if (ymd !== jstDateStr_(0) && ymd !== jstDateStr_(-1)) throw new Error('Chỉ tích được việc của hôm nay.');
}

function setJobDone(token, yearMonth, day, key, empId, done) {
  var who = requireCanEdit_(token, empId);
  var ym = assertYearMonth_(yearMonth); day = assertJobDay_(ym, day);
  return mutateJobDay_(ym, day, function (d) {
    var st = jobState_(d, ym, day, key, true);
    assertJobActor_(who, ym, day, st, empId, key);
    if (done) {
      if (who.r !== 'mgr' && jobNeedsPhoto_(ym, key, st)) throw new Error('Việc này cần chụp ảnh khi làm xong (bấm 📷).');
      if (who.r !== 'mgr' && (st.ck || []).length < jobItemsOf_(key, st).length) throw new Error('Hãy tích hết các mục trong việc này trước.');
      st.done = { by: String(empId || 'm'), at: Date.now() };
    } else {
      if (who.r !== 'mgr' && st.done && st.done.by !== String(empId)) throw new Error('Việc này do người khác tích, bạn không bỏ được.');
      st.done = null;
    }
  });
}

/** Tích / bỏ tích một mục con. Tích đủ hết (việc không cần ảnh) → tự thành "xong". */
function setJobCheck(token, yearMonth, day, key, empId, idx, on) {
  var who = requireCanEdit_(token, empId);
  var ym = assertYearMonth_(yearMonth); day = assertJobDay_(ym, day);
  return mutateJobDay_(ym, day, function (d) {
    var st = jobState_(d, ym, day, key, true);
    assertJobActor_(who, ym, day, st, empId, key);
    var items = jobItemsOf_(key, st), i = Math.round(Number(idx));
    if (!(i >= 0 && i < items.length)) throw new Error('Mục này không còn trong danh sách (tải lại trang).');
    var ck = (st.ck || []).filter(function (x) { return x !== i && x < items.length; });
    if (on) ck.push(i);
    ck.sort(function (a, b) { return a - b; });
    st.ck = ck;
    var by = who.r === 'mgr' ? 'm' : String(empId);
    if (on && ck.length === items.length && !st.done && !jobNeedsPhoto_(ym, key, st)) st.done = { by: by, at: Date.now() };
    if (!on && st.done && !(st.ph && st.ph.length) && !st.done.np) st.done = null;
  });
}

/** Việc cần ảnh mà không chụp được (hỏng camera, hết pin…): ghi lý do, quản lý xem và duyệt. */
function jobNoPhoto(token, yearMonth, day, key, empId, reason) {
  var who = requireCanEdit_(token, empId);
  var ym = assertYearMonth_(yearMonth); day = assertJobDay_(ym, day);
  var why = String(reason || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!why) throw new Error('Hãy ghi lý do không chụp được.');
  return mutateJobDay_(ym, day, function (d) {
    var st = jobState_(d, ym, day, key, true);
    assertJobActor_(who, ym, day, st, empId, key);
    if (who.r !== 'mgr' && (st.ck || []).length < jobItemsOf_(key, st).length) throw new Error('Hãy tích hết các mục trong việc này trước.');
    st.done = { by: who.r === 'mgr' ? 'm' : String(empId), at: Date.now(), np: why };
  });
}

function jobPhotoFolder_() {
  var props = props_(), id = props.getProperty('jobPhotoFolderId');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* thư mục bị xoá: tạo lại */ } }
  var f = DriveApp.createFolder(JOB_FOLDER_PREFIX + storeLabel_());
  props.setProperty('jobPhotoFolderId', f.getId());
  return f;
}

/**
 * Nhân viên gửi ảnh chụp chỗ đã làm → lưu Drive + tích xong.
 *   base64  : JPEG đã thu nhỏ và in dấu giờ trên máy.
 *   metaJson: { ex: giờ chụp theo EXIF (ms) | null, lm: giờ sửa file (ms) | null }
 * Giờ CHUẨN là giờ máy chủ nhận ảnh. Giờ chụp lệch quá 15 phút → cờ 'old'.
 */
function uploadJobPhoto(token, yearMonth, day, key, empId, base64, metaJson) {
  var who = requireCanEdit_(token, empId);
  var ym = assertYearMonth_(yearMonth); day = assertJobDay_(ym, day);
  var b64 = String(base64 || '').replace(/^data:image\/jpeg;base64,/, '');
  if (!b64 || b64.length > JOB_PHOTO_MAX_B64) throw new Error('Ảnh quá lớn hoặc rỗng.');
  var bytes = Utilities.base64Decode(b64);
  if (!(bytes.length > 100 && (bytes[0] & 255) === 0xFF && (bytes[1] & 255) === 0xD8)) throw new Error('File gửi lên không phải ảnh JPEG.');
  var meta = {};
  try { meta = JSON.parse(metaJson || '{}') || {}; } catch (e) {}
  var now = Date.now();
  var ex = Number(meta.ex) || null, lm = Number(meta.lm) || null;
  var taken = ex || lm;
  var fl = !taken ? 'noexif' : (Math.abs(now - taken) > JOB_PHOTO_OLD_MS ? 'old' : null);
  // Kiểm quyền TRƯỚC khi ghi file lên Drive.
  var pre = readJobs_(ym)[day] || { t: {}, x: [] };
  if (!pre.t) pre.t = {};
  if (!pre.x) pre.x = [];
  var preSt = jobState_(pre, ym, day, key, true);
  if (who.r !== 'mgr') {
    assertJobActor_(who, ym, day, preSt, empId, key);
    if ((preSt.ck || []).length < jobItemsOf_(key, preSt).length) throw new Error('Hãy tích hết các mục trong việc này trước.');
  }
  var stamp = new Date(now + 9 * 3600 * 1000).toISOString().slice(0, 16).replace('T', '_').replace(':', '');
  var emp = readEmployees_().filter(function (e) { return e.id === String(empId); })[0];
  var name = stamp + '_' + (emp ? emp.name : empId) + '_' + (preSt ? jobTitle_(key, preSt) : '') + '.jpg';
  var file = jobPhotoFolder_().createFile(Utilities.newBlob(bytes, 'image/jpeg', name.replace(/[\\\/:*?"<>|]/g, '')));
  try { file.setDescription('subway-job-photo ' + ymdOf_(ym, day) + ' ' + key); } catch (e) {}
  sweepJobPhotos_(false);
  return mutateJobDay_(ym, day, function (d) {
    var st = jobState_(d, ym, day, key, true);
    if (!st.ph) st.ph = [];
    st.ph.push({ f: file.getId(), at: now, by: String(empId), ex: taken || null, fl: fl });
    if (st.ph.length > 4) st.ph = st.ph.slice(-4);
    st.done = { by: String(empId), at: now };
  });
}

/** Quản lý xem ảnh: chỉ đọc được file NẰM TRONG thư mục ảnh việc của quán. */
function getJobPhoto(token, fileId) {
  requireManager_(token);
  var folderId = props_().getProperty('jobPhotoFolderId');
  var file;
  try { file = DriveApp.getFileById(String(fileId)); } catch (e) { file = null; }
  if (!file || !folderId) throw new Error('Ảnh này đã bị xoá (ảnh chỉ giữ ' + JOB_PHOTO_DAYS + ' ngày).');
  var ok = false, it = file.getParents();
  while (it.hasNext()) if (it.next().getId() === folderId) ok = true;
  if (!ok || (file.isTrashed && file.isTrashed())) throw new Error('Ảnh này đã bị xoá (ảnh chỉ giữ ' + JOB_PHOTO_DAYS + ' ngày).');
  return { data: 'data:image/jpeg;base64,' + Utilities.base64Encode(file.getBlob().getBytes()), name: file.getName() };
}

/** Bỏ vào thùng rác ảnh cũ hơn JOB_PHOTO_DAYS ngày. force=false: tối đa 6 giờ một lần. */
function sweepJobPhotos_(force) {
  var props = props_();
  var last = Number(props.getProperty('jobSweepAt') || 0);
  if (!force && Date.now() - last < 6 * 3600 * 1000) return 0;
  if (!props.getProperty('jobPhotoFolderId')) return 0;
  props.setProperty('jobSweepAt', String(Date.now()));
  var n = 0;
  try {
    var cut = Date.now() - JOB_PHOTO_DAYS * 86400000, it = jobPhotoFolder_().getFiles();
    while (it.hasNext()) {
      var f = it.next();
      if (f.getDateCreated().getTime() < cut) { f.setTrashed(true); n++; }
    }
  } catch (e) { /* dọn ảnh hỏng thì lần sau dọn tiếp */ }
  return n;
}

/** Dữ liệu việc gửi xuống máy: nhân viên không cần mã file ảnh. */
function jobsForClient_(who, ym) {
  var all = readJobs_(ym);
  if (who.r === 'mgr') return all;
  var out = JSON.parse(JSON.stringify(all));
  Object.keys(out).forEach(function (d) {
    var strip = function (st) { (st && st.ph || []).forEach(function (p) { delete p.f; }); };
    Object.keys(out[d].t || {}).forEach(function (k) { strip(out[d].t[k]); });
    (out[d].x || []).forEach(strip);
  });
  return out;
}

// ===========================================================================
// LINE — bot trong nhóm LINE của quán
// ===========================================================================
// Tiết kiệm tin: gần như mọi thứ đi bằng TIN TRẢ LỜI (reply — LINE không tính
// vào hạn mức). Ai trong nhóm gõ "シフト" / "lịch" / "今日" / "明日"… là bot trả
// lời ngay bảng lịch. Tin CHỦ ĐỘNG (push — mỗi thành viên nhóm tính 1 tin) chỉ
// gửi khi quản lý tự bấm trong app.
//
// Script Properties (KHÔNG BAO GIỜ gửi token xuống trình duyệt):
//   LINE_TOKEN  : channel access token (長期)
//   LINE_BOT    : { id, name, basic } — lấy từ /v2/bot/info khi lưu token
//   LINE_GROUP  : { id, name, at } — nhóm đã liên kết (gõ "登録 <mã>" trong nhóm)
//   LINE_BIND   : mã 6 số để liên kết nhóm
//
// Apps Script không đọc được header nên không kiểm chữ ký X-Line-Signature.
// Bù lại: (1) chỉ trả lời nhóm đã liên kết; (2) liên kết cần mã 6 số + máy chủ
// hỏi lại LINE xem bot có thật trong nhóm đó không; (3) sự kiện giả không có
// replyToken thật nên không làm bot gửi được gì.
var LINE_API = 'https://api.line.me/v2/bot';

/**
 * CHẠY MỘT LẦN trong trình soạn thảo Apps Script (chọn hàm này → Chạy) nếu app
 * báo thiếu quyền khi dùng LINE: Google sẽ hỏi quyền "kết nối dịch vụ bên ngoài".
 */
function authorizeLine() {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/info', { muteHttpExceptions: true });
  return 'Đã cấp quyền kết nối LINE.';
}

function lineToken_() { return props_().getProperty('LINE_TOKEN') || ''; }
function lineJson_(k) { try { return JSON.parse(props_().getProperty(k) || 'null'); } catch (e) { return null; } }
function lineFetch_(method, path, body) {
  var opt = { method: method, muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + lineToken_() } };
  if (body) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(body); }
  var r = UrlFetchApp.fetch(LINE_API + path, opt), txt = r.getContentText(), js = null;
  try { js = JSON.parse(txt || '{}'); } catch (e) { js = null; }
  return { code: r.getResponseCode(), body: js, text: txt };
}
function lineBindCode_(renew) {
  var p = props_(), c = p.getProperty('LINE_BIND');
  if (!c || renew) { c = String(100000 + (parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 8), 16) % 900000)); p.setProperty('LINE_BIND', c); }   // v41: không dùng Math.random
  return c;
}

/** Quản lý dán token. Rỗng = gỡ kết nối LINE. */
function saveLineToken(token, accessToken) {
  requireManager_(token);
  var p = props_(), tk = String(accessToken || '').replace(/\s+/g, '');
  if (!tk) {
    ['LINE_TOKEN', 'LINE_BOT', 'LINE_GROUP'].forEach(function (k) { p.deleteProperty(k); });
    return getLineStatus(token);
  }
  if (tk.length < 40) throw new Error('Token quá ngắn — hãy copy nguyên "チャネルアクセストークン（長期）".');
  var old = p.getProperty('LINE_TOKEN');
  p.setProperty('LINE_TOKEN', tk);
  var r = lineFetch_('get', '/info');
  if (r.code !== 200 || !r.body || !r.body.userId) {
    if (old) p.setProperty('LINE_TOKEN', old); else p.deleteProperty('LINE_TOKEN');
    throw new Error('LINE không nhận token này (mã ' + r.code + '). Kiểm tra lại: phải là "チャネルアクセストークン（長期）" của đúng kênh.');
  }
  p.setProperty('LINE_BOT', JSON.stringify({ id: r.body.userId, name: r.body.displayName || '', basic: r.body.basicId || '' }));
  lineBindCode_(false);
  return getLineStatus(token);
}

/** Trạng thái cho màn Cài đặt. withQuota: hỏi LINE số tin còn lại + số người trong nhóm. */
function getLineStatus(token, withQuota) {
  requireManager_(token);
  var out = { hasToken: !!lineToken_(), bot: lineJson_('LINE_BOT'), group: lineJson_('LINE_GROUP'),
              code: lineBindCode_(false), webhook: '' };
  try { out.webhook = ScriptApp.getService().getUrl() || ''; } catch (e) {}
  if (withQuota && out.hasToken) {
    try {
      var q = lineFetch_('get', '/message/quota'), c = lineFetch_('get', '/message/quota/consumption');
      out.quota = (q.body && q.body.type === 'limited') ? q.body.value : null;
      out.used = c.body ? c.body.totalUsage : null;
      if (out.group) { var m = lineFetch_('get', '/group/' + out.group.id + '/members/count'); out.members = m.body ? m.body.count : null; }
    } catch (e) { out.quotaErr = String(e && e.message || e); }
  }
  return out;
}

function unlinkLineGroup(token) {
  requireManager_(token);
  props_().deleteProperty('LINE_GROUP');
  lineBindCode_(true);
  return getLineStatus(token);
}

/** Quản lý chủ động gửi 1 tin lên nhóm (TỐN hạn mức: mỗi thành viên = 1 tin). */
function linePush(token, text) {
  requireManager_(token);
  var g = lineJson_('LINE_GROUP');
  if (!lineToken_() || !g) throw new Error('Chưa kết nối LINE / chưa liên kết nhóm.');
  var msg = String(text || '').trim().slice(0, 2000);
  if (!msg) throw new Error('Tin nhắn trống.');
  var r = lineFetch_('post', '/message/push', { to: g.id, messages: [{ type: 'text', text: msg }] });
  if (r.code !== 200) throw new Error('LINE báo lỗi (' + r.code + '): ' + ((r.body && r.body.message) || r.text).slice(0, 200));
  return { ok: true };
}

/** Webhook: LINE gọi vào /exec bằng POST. Luôn trả 200 "OK". */
function doPost(e) {
  var body = null;
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) { body = null; }
  // v44: giao diện chạy trên GitHub Pages gọi máy chủ qua đây (thay cho google.script.run).
  if (body && body.rpc) return ContentService.createTextOutput(JSON.stringify(rpcHandle_(body))).setMimeType(ContentService.MimeType.JSON);
  if (body && body.xs) return ContentService.createTextOutput(JSON.stringify(xsHandle_(body))).setMimeType(ContentService.MimeType.JSON);
  if (body && body.events) { try { lineWebhook_(body); } catch (err) { console.error('LINE webhook: ' + (err && err.stack || err)); } }
  return ContentService.createTextOutput('OK');
}

// ===========================================================================
// v44: API JSON cho giao diện trên GitHub Pages
// ---------------------------------------------------------------------------
// Trang GitHub gửi POST (Content-Type text/plain → không bị CORS chặn) tới link /exec:
//   { rpc: 1, fn: 'loadMonth', args: [token, '2026-11'] }  →  { ok: 1, v: kết quả } | { ok: 0, m: 'lỗi' }
// Gọi được ĐÚNG những hàm mà google.script.run gọi được (hàm cấp cao nhất, tên không kết thúc bằng "_"),
// nên quyền hạn y như bản chạy trong Apps Script: mọi hàm vẫn tự kiểm token / quyền quản lý.
// ===========================================================================
var RPC_DENY_ = { doGet: 1, doPost: 1 };
function rpcHandle_(body) {
  var fn = String(body.fn || '');
  if (!/^[A-Za-z][A-Za-z0-9]{0,63}$/.test(fn) || RPC_DENY_[fn]) return { ok: 0, m: 'Thao tác không hợp lệ.' };
  var g = (typeof globalThis !== 'undefined' && globalThis) || (function () { return this; })() || {};
  var f = g[fn];
  if (typeof f !== 'function') return { ok: 0, m: 'Thao tác không hợp lệ.' };
  var args = Array.isArray(body.args) ? body.args.slice(0, 12) : [];
  try {
    warmSecrets_();
    var v = f.apply(null, args);
    return { ok: 1, v: v === undefined ? null : v };
  } catch (err) {
    return { ok: 0, m: String((err && err.message) || err) };
  }
}
/** Link trang GitHub của quán này (quản lý mở app từ GitHub là tự ghi). Trống = chưa dùng GitHub. */
function frontOnly_() { try { return props_().getProperty('FRONT_URL') || ''; } catch (e) { return ''; } }
/** Link người dùng mở app: trang GitHub nếu có, không thì link /exec của Apps Script. */
function frontUrl_() { return frontOnly_() || attExecUrl_() || ''; }
function joinUrl_(base, k, v) { return base ? base + (base.indexOf('?') === -1 ? '?' : '&') + k + '=' + encodeURIComponent(v) : ''; }
/** Quản lý mở app từ trang GitHub → nhớ link đó để link vào nhanh, mã QR điểm danh, link tuyển dụng, email trỏ đúng trang. */
function setFrontUrl(token, url) {
  requireManager_(token);
  var u = String(url || '').trim();
  if (u && !/^https:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}(\/[A-Za-z0-9._~\/-]*)?(\?s=[A-Za-z0-9]{1,8})?$/.test(u)) throw new Error('Link trang không hợp lệ.');
  if (u) props_().setProperty('FRONT_URL', u); else props_().deleteProperty('FRONT_URL');
  return { ok: true, url: u };
}

function lineReply_(replyToken, texts) {
  if (!replyToken || !texts || !texts.length) return null;
  return lineFetch_('post', '/message/reply', { replyToken: replyToken,
    messages: texts.slice(0, 5).map(function (t) { return { type: 'text', text: String(t).slice(0, 4990) }; }) });
}

function lineWebhook_(body) {
  if (!lineToken_()) return;
  var bot = lineJson_('LINE_BOT');
  if (bot && bot.id && body.destination !== bot.id) return;   // không phải gửi cho bot của quán này (thiếu destination cũng bỏ)
  var grp = lineJson_('LINE_GROUP');
  // Chống dò mã liên kết: mỗi lần gọi tối đa 3 lần thử; cả bot tối đa 20 lần sai / giờ.
  var cache = CacheService.getScriptCache(), bindTries = 0;
  var badN = function () { return Number(cache.get('lnbind:bad') || 0); };
  (body.events || []).slice(0, 50).forEach(function (ev) {
    var src = ev.source || {}, gid = src.groupId || src.roomId || null;
    if (ev.type === 'join') { lineReply_(ev.replyToken, [lineTxt_('join', 'ja') + '\n\n' + lineTxt_('join', 'vi')]); return; }
    if (ev.type !== 'message' || !ev.message || ev.message.type !== 'text' || !gid) return;
    var txt = String(ev.message.text || '').trim();
    var bind = /^(?:登録|とうろく|dang ?ky|đăng ?ký|link)\s*([0-9０-９]{6})$/i.exec(txt);
    if (bind) {
      // Chỉ nhận liên kết từ NHÓM (không nhận phòng chat / chat riêng), và có giới hạn số lần thử.
      if (!src.groupId || ++bindTries > 3) return;
      var sm = lineFetch_('get', '/group/' + gid + '/summary');
      if (sm.code !== 200) return;   // bot không thật sự ở trong nhóm này → bỏ qua (không tính lần sai)
      if (badN() >= 20) { lineReply_(ev.replyToken, ['⏳ 間違いが多いため1時間後にもう一度 / Sai nhiều lần, thử lại sau 1 giờ.']); return; }
      var code = bind[1].replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); });
      if (code !== lineBindCode_(false)) {
        cache.put('lnbind:bad', String(badN() + 1), 3600);
        lineReply_(ev.replyToken, ['❌ コードが違います / Sai mã.']);
        return;
      }
      props_().setProperty('LINE_GROUP', JSON.stringify({ id: gid, name: (sm.body && sm.body.groupName) || '', at: Date.now() }));
      lineBindCode_(true);
      lineReply_(ev.replyToken, [lineTxt_('bound', 'ja') + '\n\n' + lineTxt_('bound', 'vi')]);
      return;
    }
    if (!grp || grp.id !== gid) return;
    var out = lineCommand_(txt);
    if (out && out.length) lineReply_(ev.replyToken, out);
  });
}

var LINE_TXT = {
  ja: {
    join: '🤖 シフトボットです。店長はアプリ「設定 › LINE」に表示されたコードで「登録 123456」と送ってください。',
    bound: '✅ このグループを登録しました。「ヘルプ」と送ると使い方が出ます。',
    help: '🤖 使い方（返信なので無料）\n・シフト → 今月の表（前半・後半）\n・シフト前半 / シフト後半（表1 / 表2）\n・来月シフト（前半・後半も可）\n・今日 / 明日 → その日のメンバー\n・変更 → 公開後に変わったシフト',
    notPub: '📅 {m}/{d} のシフトはまだ公開されていません。', notPubHalf: '📅 {y}年{m}月 シフト{half}はまだ作成中です。公開されたらお知らせします。',
    chgTitle: '🔄 公開後のシフト変更（今日以降）', chgNone: '🔄 公開後の変更はありません。', offW: '休み', noneW: '—', pubAt: '📢 公開 {t}',
    title: '📅 {y}年{m}月 シフト {half}（{a}〜{b}日）', first: '前半', second: '後半',
    final: '［確定］', draft: '［下書き・変更あり得ます］', changed: '⚠ 公開後の変更：{list}日', none: '（シフトなし）',
    day: '📅 {m}/{d}（{dow}）のメンバー', brk: '休', foot: '※自分のシフトはアプリでも確認できます。', trunc: '…（長すぎるため省略。アプリで確認してください）'
  },
  vi: {
    join: '🤖 Bot lịch làm việc. Quản lý hãy gõ "dang ky 123456" với mã hiện trong app (Cài đặt › LINE).',
    bound: '✅ Đã liên kết nhóm này. Gõ "lenh" để xem cách dùng.',
    help: '🤖 Cách dùng (bot trả lời nên KHÔNG tốn tin)\n• lich → lịch tháng này (nửa đầu + nửa sau)\n• lich 1 / lich 2 (bảng 1 / bảng 2)\n• lich thang sau (có thể thêm 1 / 2)\n• hom nay / ngay mai → ai làm hôm đó\n• thay doi → ca đã đổi sau khi công bố',
    notPub: '📅 Lịch ngày {d}/{m} chưa được công bố.', notPubHalf: '📅 Lịch tháng {m}/{y} — {half} đang được xếp, chưa công bố.',
    chgTitle: '🔄 Ca đã đổi sau khi công bố (từ hôm nay)', chgNone: '🔄 Chưa có ca nào đổi sau khi công bố.', offW: 'nghỉ', noneW: '—', pubAt: '📢 Công bố {t}',
    title: '📅 Lịch tháng {m}/{y} — {half} (ngày {a}–{b})', first: 'bảng 1', second: 'bảng 2',
    final: '[Đã chốt]', draft: '[Bản nháp — có thể thay đổi]', changed: '⚠ Đã sửa sau khi công bố: ngày {list}', none: '(chưa xếp ai)',
    day: '📅 Ngày {d}/{m} ({dow})', brk: 'nghỉ', foot: '* Xem lịch của riêng bạn trong app.', trunc: '… (quá dài — xem đầy đủ trong app)'
  }
};
var LINE_DOW = { ja: ['日', '月', '火', '水', '木', '金', '土'], vi: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] };
function lineTxt_(k, lg, vars) {
  var s = (LINE_TXT[lg] || LINE_TXT.ja)[k] || '';
  Object.keys(vars || {}).forEach(function (v) { s = s.split('{' + v + '}').join(vars[v]); });
  return s;
}
function lineHour_(h) { var hh = Math.floor(h), mm = Math.round((h - hh) * 60); return mm ? hh + ':' + ('0' + mm).slice(-2) : String(hh); }

/** Hiểu lệnh gõ trong nhóm. Chỉ tin NGẮN mới được coi là lệnh (khỏi chen vào chuyện trò). */
function lineCommand_(raw) {
  var txt = String(raw || '').trim();
  if (!txt || txt.length > 24) return null;
  var n = txt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC').replace(/đ/g, 'd').replace(/[\s　・,、。!！?？]/g, '')
    .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); });
  var vi = /[a-z]/.test(n) && !/[぀-ヿ一-鿿]/.test(txt);
  var lg = vi ? 'vi' : 'ja';
  if (/^(ヘルプ|使い方|help|lenh|huongdan|\?)$/.test(n)) return [lineTxt_('help', lg)];
  var now = new Date(Date.now() + 9 * 3600 * 1000);
  if (/^(今日|きょう|homnay|today)$/.test(n)) return [lineDayText_(now, lg)];
  if (/^(明日|あした|ngaymai|tomorrow)$/.test(n)) return [lineDayText_(new Date(now.getTime() + 86400000), lg)];
  if (/^(変更|へんこう|シフト変更|thaydoi|doica|lichdoi|changes?)$/.test(n)) return [lineChangesText_(now, lg)];
  var m = /^(来月|今月)?(シフト表|シフト|表|lichlam|lich|bang|shift)(bang|表)?(来月|今月|thangsau|thangnay)?(前半|後半|1|2|nuadau|nuasau|dau|sau)?(来月|thangsau)?$/.exec(n);
  if (!m) return null;
  var next = /来月|thangsau/.test(n), half = null;
  if (/前半|1$|nuadau|dau$/.test(n)) half = 1;
  if (/後半|2$|nuasau/.test(n) || (/sau$/.test(n) && !/thangsau$/.test(n))) half = 2;
  var y = now.getUTCFullYear(), mo = now.getUTCMonth() + 1;
  if (next) { mo++; if (mo > 12) { mo = 1; y++; } }
  var ym = y + '-' + ('0' + mo).slice(-2);
  if (half) return [lineHalfText_(ym, half, lg)];
  return [lineHalfText_(ym, 1, lg), lineHalfText_(ym, 2, lg)];
}

function lineDayLine_(entryMap, empName, closeH) {
  var rows = [];
  Object.keys(entryMap || {}).forEach(function (id) {
    var e = entryMap[id];
    if (!e || e.off || !e.shifts || !e.shifts.length) return;
    var st = Math.min.apply(null, e.shifts.map(function (x) { return Number(x.start); }));
    var t = e.shifts.map(function (x) {
      var end = (x.endAtClose || Number(x.end) >= supCloseOr_(x, closeH) - 0.001) ? 'L' : lineHour_(Number(x.end));
      return (x.isSupport ? '✈' : '') + lineHour_(Number(x.start)) + '-' + end;
    }).join(',');
    rows.push({ st: st, s: (empName[id] || '?') + ' ' + t });
  });
  rows.sort(function (a, b) { return a.st - b.st; });
  return rows.map(function (r) { return r.s; });
}
function lineCompact_(e) {
  if (!e) return '';
  if (e.off) return 'off';
  return (e.shifts || []).map(function (x) { return x.start + '-' + x.end + (x.endAtClose ? 'L' : ''); }).join(',');
}

/** Bảng nửa tháng (1: ngày 1–15, 2: ngày 16–cuối) dạng chữ, có đánh dấu ngày sửa sau khi công bố. */
function lineHalfText_(ym, half, lg) {
  var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)), last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  var a = half === 1 ? 1 : HALF_SPLIT + 1, b = half === 1 ? HALF_SPLIT : last;
  var emps = readEmployees_(), name = {};
  emps.forEach(function (e) { name[e.id] = e.name; });
  var sched = readMonthNormalized_('schedule:' + ym, emps), close = readCloseHours_(ym);
  var defClose = Number(readSettings_().closeHour) || 21;
  var mode = readLockMode_(ym), locked = mode === 'all' || (mode === 'h1' && half === 1), off = null;
  if (!locked && readSettings_().hideDraft)
    return lineTxt_('notPubHalf', lg, { y: y, m: m, half: lineTxt_(half === 1 ? 'first' : 'second', lg) });
  if (locked) { try { off = JSON.parse(kvGet_('plan:F:' + ym) || 'null'); } catch (e) { off = null; } }
  var changed = [], lines = [];
  for (var d = a; d <= b; d++) {
    var mp = sched[d] || {}, ch = false;
    if (off) {
      var o = off[d] || {}, ids = {};
      Object.keys(mp).concat(Object.keys(o)).forEach(function (id) { ids[id] = true; });
      ch = Object.keys(ids).some(function (id) { return lineCompact_(mp[id]) !== lineCompact_(o[id]); });
      if (ch) changed.push(d);
    }
    var ch2 = close[d] != null ? Number(close[d]) : defClose;
    var ppl = lineDayLine_(mp, name, ch2);
    var dow = LINE_DOW[lg][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    lines.push((ch ? '⚠' : '') + d + '(' + dow + ') ' + (ppl.length ? ppl.join(' / ') : lineTxt_('none', lg)));
  }
  var head = [lineTxt_('title', lg, { y: y, m: m, half: lineTxt_(half === 1 ? 'first' : 'second', lg), a: a, b: b }),
              lineTxt_(locked ? 'final' : 'draft', lg)];
  var pubT = locked ? linePubAt_(ym, half) : '';
  if (pubT) head.push(lineTxt_('pubAt', lg, { t: pubT }));
  if (changed.length) head.push(lineTxt_('changed', lg, { list: changed.join(', ') }));
  var out = head.join('\n') + '\n────────\n' + lines.join('\n') + '\n────────\n' + lineTxt_('foot', lg);
  if (out.length > 4900) out = out.slice(0, 4850) + '\n' + lineTxt_('trunc', lg);
  return out;
}

/** Lần công bố gần nhất phủ nửa tháng này, dạng "9/30 18:05" (giờ Nhật). */
function linePubAt_(ym, half) {
  var list = readJsonKey_('pub:' + ym).list || [];
  for (var i = list.length - 1; i >= 0; i--) {
    var x = list[i];
    if (x.k === 'pub' && (x.sc === 'all' || half === 1)) {
      var j = new Date(Number(x.at) + 9 * 3600 * 1000);
      return (j.getUTCMonth() + 1) + '/' + j.getUTCDate() + ' ' + ('0' + j.getUTCHours()).slice(-2) + ':' + ('0' + j.getUTCMinutes()).slice(-2);
    }
  }
  return '';
}
function lineShortEntry_(e, lg) {
  if (!e) return lineTxt_('noneW', lg);
  if (e.off) return lineTxt_('offW', lg);
  var s = (e.shifts || []).map(function (x) { return lineHour_(Number(x.start)) + '-' + (x.endAtClose ? 'L' : lineHour_(Number(x.end))); }).join(',');
  return s || lineTxt_('noneW', lg);
}
/** "変更" / "thay doi": ca bị đổi sau khi công bố, từ hôm nay trở đi (tháng này + tháng sau). */
function lineChangesText_(jst, lg) {
  var y = jst.getUTCFullYear(), mo = jst.getUTCMonth() + 1, today = jst.getUTCDate();
  var name = {};
  readEmployees_().forEach(function (e) { name[e.id] = e.name; });
  var rows = [];
  [0, 1].forEach(function (k) {
    var yy = y, mm = mo + k; if (mm > 12) { mm = 1; yy++; }
    var ym = yy + '-' + ('0' + mm).slice(-2), net = {}, order = [];
    (readJsonKey_('pub:' + ym).list || []).forEach(function (x) {
      (x.ch || []).forEach(function (c) {
        if (k === 0 && Number(c.d) < today) return;
        var key = c.d + '|' + c.e;
        if (!net[key]) { net[key] = { d: Number(c.d), e: c.e, f: c.f, t: c.t }; order.push(key); }
        else net[key].t = c.t;
      });
    });
    order.forEach(function (key) {
      var c = net[key];
      if (pubSig_(c.f) === pubSig_(c.t)) return;
      var dow = LINE_DOW[lg][new Date(Date.UTC(yy, mm - 1, c.d)).getUTCDay()];
      rows.push({ o: yy * 10000 + mm * 100 + c.d,
                  s: mm + '/' + c.d + '(' + dow + ') ' + (name[c.e] || '?') + ' ' + lineShortEntry_(c.f, lg) + ' → ' + lineShortEntry_(c.t, lg) });
    });
  });
  if (!rows.length) return lineTxt_('chgNone', lg);
  rows.sort(function (a, b) { return a.o - b.o; });
  var out = lineTxt_('chgTitle', lg) + '\n────────\n' + rows.slice(0, 40).map(function (r) { return r.s; }).join('\n');
  if (rows.length > 40) out += '\n' + lineTxt_('trunc', lg);
  return out;
}

/** Ai làm trong một ngày (giờ vào–ra + giờ nghỉ). jst = Date đã cộng +9h (đọc bằng getUTC*). */
function lineDayText_(jst, lg) {
  var y = jst.getUTCFullYear(), m = jst.getUTCMonth() + 1, d = jst.getUTCDate(), ym = y + '-' + ('0' + m).slice(-2);
  var emps = readEmployees_(), name = {};
  emps.forEach(function (e) { name[e.id] = e.name; });
  var mp = staffVisibleSched_(ym, readMonthNormalized_('schedule:' + ym, emps))[d] || {}, close = readCloseHours_(ym);
  if (!Object.keys(mp).length && readSettings_().hideDraft && !dayLocked_(ym, d)) return lineTxt_('notPub', lg, { m: m, d: d });
  var ch = close[d] != null ? Number(close[d]) : (Number(readSettings_().closeHour) || 21);
  var rows = [];
  Object.keys(mp).forEach(function (id) {
    var e = mp[id];
    if (!e || e.off || !e.shifts || !e.shifts.length) return;
    var st = Math.min.apply(null, e.shifts.map(function (x) { return Number(x.start); }));
    var t = e.shifts.map(function (x) {
      var end = (x.endAtClose || Number(x.end) >= supCloseOr_(x, ch) - 0.001) ? 'L' : lineHour_(Number(x.end));
      var bk = (x.breakStart != null && x.breakEnd != null) ? '（' + lineTxt_('brk', lg) + ' ' + lineHour_(Number(x.breakStart)) + '-' + lineHour_(Number(x.breakEnd)) + '）' : '';
      return (x.isSupport ? '✈' : '') + lineHour_(Number(x.start)) + '-' + end + bk;
    }).join(', ');
    rows.push({ st: st, s: '・' + (name[id] || '?') + '  ' + t });
  });
  rows.sort(function (a, b) { return a.st - b.st; });
  var dow = LINE_DOW[lg][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  var note = '';
  try { note = (splitDayInfo_(readDayInfo_(ym)).notes || {})[d] || ''; } catch (e) {}
  return lineTxt_('day', lg, { m: m, d: d, dow: dow }) + (dayLocked_(ym, d) ? '' : ' ' + lineTxt_('draft', lg)) + '\n' +
    (rows.length ? rows.map(function (r) { return r.s; }).join('\n') : lineTxt_('none', lg)) + (note ? '\n📌 ' + note : '');
}

// ===========================================================================
// MÁY HỌC NHẸ — học từ chính cách quản lý sửa lịch nháp
// ===========================================================================
// KHÔNG phải mạng nơ-ron: chỉ ĐẾM. Mỗi lần chốt lịch, client so bản nháp máy
// xếp với bản quản lý chốt, rồi gửi lên đây các con số:
//   giữ nguyên (keep), bị bỏ ra (drop), được thêm vào (add), và giờ vào/ra
//   thật sự của từng người theo TỪNG THỨ trong tuần.
// Máy cộng dồn qua các tháng; lần xếp sau dùng để chấm điểm. Càng nhiều tháng
// càng đúng; một tháng thì gần như chưa nói lên điều gì.
//   learn:store  = { v, runs, updatedAt, emp:{ <id>: { dow:{ 0..6:{keep,drop,add,sN,sSum,eN,eSum} } } } }
//   learnbase:<YM> = bản nháp gần nhất, dạng gọn { "<ngày>": { "<id>": [vào, ra] | 0 } }

var LEARN_KEY = 'learn:store';

function readLearn_() {
  var raw = kvGet_(LEARN_KEY);
  if (!raw) return { v: 1, runs: 0, updatedAt: 0, emp: {} };
  try {
    var o = JSON.parse(raw);
    if (!o || !o.emp) return { v: 1, runs: 0, updatedAt: 0, emp: {} };
    return o;
  } catch (e) { return { v: 1, runs: 0, updatedAt: 0, emp: {} }; }
}

function getLearn(token) {
  requireManager_(token);
  return readLearn_();
}

/** Cất bản nháp vừa giữ, để lúc chốt lịch còn cái mà so. */
function saveLearnBase(token, yearMonth, baseJson) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth);
  try { JSON.parse(baseJson); } catch (e) { throw new Error('Dữ liệu bản nháp không hợp lệ.'); }
  kvSet_('learnbase:' + ym, baseJson, 'bản nháp để học', true);
  return true;
}
function getLearnBase(token, yearMonth) {
  requireManager_(token);
  var raw = kvGet_('learnbase:' + assertYearMonth_(yearMonth));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

/**
 * Cộng dồn một lần học. diff do client tính:
 *   { emp: { <id>: { dow: { <0..6>: { keep, drop, add, sN, sSum, eN, eSum } } } } }
 * Mọi số đều được chặn trên để một tháng lỗi không làm hỏng cả kho.
 */
function learnFromMonth(token, yearMonth, diffJson) {
  requireManager_(token);
  assertYearMonth_(yearMonth);
  var d;
  try { d = JSON.parse(diffJson); } catch (e) { throw new Error('Dữ liệu học không hợp lệ.'); }
  if (!d || !d.emp) throw new Error('Dữ liệu học không hợp lệ.');
  var cur = readLearn_();
  var FIELDS = ['keep', 'drop', 'add', 'sN', 'sSum', 'eN', 'eSum'];
  Object.keys(d.emp).slice(0, 200).forEach(function (id) {
    var src = d.emp[id] && d.emp[id].dow;
    if (!src) return;
    if (!cur.emp[id]) cur.emp[id] = { dow: {} };
    for (var w = 0; w < 7; w++) {
      var sw = src[w]; if (!sw) continue;
      var tw = cur.emp[id].dow[w] || (cur.emp[id].dow[w] = { keep:0, drop:0, add:0, sN:0, sSum:0, eN:0, eSum:0 });
      FIELDS.forEach(function (f) {
        var v = Number(sw[f]);
        if (!isFinite(v) || v < 0) v = 0;
        tw[f] = Math.min(100000, (Number(tw[f]) || 0) + Math.min(1000, v));
      });
    }
  });
  cur.runs = (Number(cur.runs) || 0) + 1;
  cur.updatedAt = Date.now();
  cur.v = 1;
  kvSet_(LEARN_KEY, JSON.stringify(cur), 'máy học', true);
  return cur;
}

// ---------------------------------------------------------------------------
// v2026.10.16.9 — HỌC TỪ LỊCH CŨ (ảnh / bảng các tháng trước, chưa từng xếp bằng app)
// ---------------------------------------------------------------------------
// Mỗi dòng: { d:'YYYY-MM-DD', n:'tên', s: giờ vào, e: giờ ra | 'L' }.
// Lưu thô ở 'learnhist:rows' (gộp các lần nhập, trùng ngày + tên thì lấy bản mới).
// Kết quả tính sẵn đặt vào learn:store.hist:
//   emp:{ <id>: { from, to, n, dow:{ 0..6: { w: số ngày làm, t: số ngày đó có trong lịch, sN,sSum,eN,eSum } } } }
// t chỉ đếm từ ngày ĐẦU tới ngày CUỐI người đó có ca (người mới vào không bị tính là "không thích").
function learnHistNorm_(s) { return String(s == null ? '' : s).replace(/[\s\u3000]/g, '').toLowerCase(); }
function learnHistRow_(r) {
  if (!r || typeof r !== 'object') return null;
  var d = String(r.d || '');
  if (!/^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(d)) return null;
  var n = String(r.n == null ? '' : r.n).replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 30);
  if (!n) return null;
  var st = Number(r.s);
  if (!isFinite(st) || st < 0 || st > 30) return null;
  var en = r.e === 'L' ? 'L' : Number(r.e);
  if (en !== 'L' && (!isFinite(en) || en <= st || en > 31)) return null;
  return { d: d, n: n, s: Math.round(st * 4) / 4, e: en === 'L' ? 'L' : Math.round(en * 4) / 4 };
}
function learnHistImport(token, rowsJson, mapJson) {
  requireManager_(token);
  var rows, map;
  try { rows = JSON.parse(rowsJson); map = mapJson ? JSON.parse(mapJson) : null; } catch (e) { throw new Error('Dữ liệu lịch cũ không hợp lệ.'); }
  if (!Array.isArray(rows) || rows.length > 20000) throw new Error('Dữ liệu lịch cũ không hợp lệ.');
  var emps = readEmployees_(), ids = {}, byName = {};
  emps.forEach(function (e) { ids[e.id] = true; byName[learnHistNorm_(e.name)] = e.id; });
  var cur0 = readLearn_(), oldMap = (cur0.hist && cur0.hist.map) || {};
  var M = {};
  Object.keys(oldMap).forEach(function (k) { M[k] = oldMap[k]; });
  if (map && typeof map === 'object') Object.keys(map).slice(0, 300).forEach(function (k) {
    var v = String(map[k] == null ? '' : map[k]);
    M[String(k).slice(0, 30)] = v === '' ? '' : (ids[v] ? v : undefined);
  });
  // Gộp với lần nhập trước: bản mới đè bản cũ cùng ngày + tên.
  var old = readJsonKey_('learnhist:rows'); old = Array.isArray(old) ? old : [];
  var seen = {}, all = [];
  rows.concat(old).forEach(function (x) {
    var r = learnHistRow_(x); if (!r) return;
    var k = r.d + '|' + r.n;
    if (seen[k]) return;
    seen[k] = 1; all.push(r);
  });
  if (all.length > 20000) all = all.slice(0, 20000);
  kvSet_('learnhist:rows', JSON.stringify(all), 'lịch cũ để học', true);
  var hist = learnHistBuild_(all, M, emps);
  var cur = readLearn_();
  cur.hist = hist;
  kvSet_(LEARN_KEY, JSON.stringify(cur), 'máy học: lịch cũ', true);
  return { learn: cur, unmatched: hist.unmatched };
}
function learnHistBuild_(all, M, emps) {
  var ids = {}, byName = {};
  emps.forEach(function (e) { ids[e.id] = true; byName[learnHistNorm_(e.name)] = e.id; });
  var close = Number(readSettings_().closeHour) || 21;
  var days = {};
  all.forEach(function (r) { days[r.d] = 1; });
  var dayList = Object.keys(days).sort();
  var wd = function (d) { return new Date(d + 'T00:00:00Z').getUTCDay(); };
  var per = {}, unmatched = {};
  all.forEach(function (r) {
    var id = Object.prototype.hasOwnProperty.call(M, r.n) && M[r.n] !== undefined ? M[r.n] : byName[learnHistNorm_(r.n)];
    if (id === '') return;                                  // quản lý chọn "bỏ qua" tên này
    if (!id || !ids[id]) { unmatched[r.n] = (unmatched[r.n] || 0) + 1; return; }
    var e = r.e === 'L' ? close : r.e;
    var p = per[id] || (per[id] = {});
    var x = p[r.d];
    if (!x) p[r.d] = { s: r.s, e: e };
    else { x.s = Math.min(x.s, r.s); x.e = Math.max(x.e, e); }
  });
  var out = { from: dayList[0] || '', to: dayList[dayList.length - 1] || '', days: dayList.length, rows: all.length, at: Date.now(), map: M, emp: {},
              unmatched: Object.keys(unmatched).map(function (n) { return { n: n, c: unmatched[n] }; }).sort(function (a, b) { return b.c - a.c; }) };
  Object.keys(per).forEach(function (id) {
    var ds = Object.keys(per[id]).sort(), first = ds[0], last = ds[ds.length - 1], dow = {};
    for (var w = 0; w < 7; w++) dow[w] = { w: 0, t: 0, sN: 0, sSum: 0, eN: 0, eSum: 0 };
    dayList.forEach(function (d) { if (d >= first && d <= last) dow[wd(d)].t++; });
    ds.forEach(function (d) {
      var x = per[id][d], o = dow[wd(d)];
      o.w++; o.sN++; o.sSum += x.s; o.eN++; o.eSum += x.e;
    });
    out.emp[id] = { from: first, to: last, n: ds.length, dow: dow };
  });
  return out;
}
/** Quản lý đổi cách ghép tên (hoặc thêm nhân viên mới) → tính lại từ dữ liệu đã lưu, không cần nhập lại. */
function learnHistRemap(token, mapJson) {
  requireManager_(token);
  return learnHistImport(token, '[]', mapJson || '{}');
}
function learnHistClear(token) {
  requireManager_(token);
  kvSet_('learnhist:rows', '[]', 'xoá lịch cũ', true);
  var cur = readLearn_(); delete cur.hist;
  kvSet_(LEARN_KEY, JSON.stringify(cur), 'máy học: xoá lịch cũ', true);
  return cur;
}

function resetLearn(token) {
  requireManager_(token);
  kvSet_(LEARN_KEY, JSON.stringify({ v: 1, runs: 0, updatedAt: Date.now(), emp: {} }), 'xoá máy học', true);
  return readLearn_();
}

// ===========================================================================
// ĐỌC FILE EXCEL (.xlsx) NGƯỜI DÙNG TẢI LÊN — để nhập lịch từ bảng cũ
// ===========================================================================
// Không cần bật dịch vụ nâng cao nào, không gửi file đi đâu: .xlsx vốn là một
// file .zip, Utilities.unzip mở ra được, bên trong là XML. Đọc xong trả về
// đúng phần chữ (các ô ngăn nhau bằng Tab) cho client tự hiểu như khi dán tay.
// File KHÔNG được lưu lại ở bất cứ đâu — đọc xong là thôi.

var XLSX_MAX_BYTES = 6 * 1024 * 1024;   // file lịch thật chỉ cỡ vài chục KB
var XLSX_MAX_ROWS = 4000;

function importSpreadsheetFile(token, name, base64, want) {
  requireManager_(token);
  var bytes;
  try { bytes = Utilities.base64Decode(String(base64 || '')); }
  catch (e) { throw new Error('Không đọc được nội dung file. Hãy thử lưu lại file rồi chọn lần nữa.'); }
  if (!bytes || !bytes.length) throw new Error('File rỗng.');
  if (bytes.length > XLSX_MAX_BYTES) throw new Error('File lớn quá (tối đa 6MB). Hãy xoá bớt sheet thừa rồi lưu lại.');
  // 'PK' — dấu nhận biết file zip; .xls đời cũ và .pdf đều không phải.
  if (bytes[0] !== 80 || bytes[1] !== 75) {
    throw new Error('Đây không phải file Excel .xlsx. Trong Excel chọn "Lưu dưới dạng" → Excel Workbook (.xlsx) rồi chọn lại.');
  }
  var parts;
  try {
    parts = Utilities.unzip(Utilities.newBlob(bytes, 'application/zip', String(name || 'file.xlsx')));
  } catch (e) {
    throw new Error('Không mở được file Excel này. Hãy mở trong Excel rồi lưu lại dạng .xlsx.');
  }
  var byName = {};
  parts.forEach(function (b) { byName[b.getName()] = b; });

  var sheets = Object.keys(byName).filter(function (k) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(k); })
    .sort(function (a, b) { return xlsxSheetNo_(a) - xlsxSheetNo_(b); });
  if (!sheets.length) throw new Error('File Excel này không có sheet nào đọc được.');

  var shared = byName['xl/sharedStrings.xml'] ? xlsxSharedStrings_(byName['xl/sharedStrings.xml'].getDataAsString()) : [];
  var pick = sheets[0], names = [];
  // Chọn sheet theo tên (vd. file 棚卸表 có 2 sheet: 月次PL / 棚卸表)
  try {
    var wb = byName['xl/workbook.xml'] ? byName['xl/workbook.xml'].getDataAsString() : '';
    var rels = byName['xl/_rels/workbook.xml.rels'] ? byName['xl/_rels/workbook.xml.rels'].getDataAsString() : '';
    var relMap = {}, rm, rre = /<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
    while ((rm = rre.exec(rels)) !== null) relMap[rm[1]] = 'xl/' + rm[2].replace(/^\/?xl\//, '');
    var sm, sre = /<sheet\b[^>]*name="([^"]*)"[^>]*r:id="([^"]+)"/g;
    while ((sm = sre.exec(wb)) !== null) {
      var nm = xlsxPlainText_(sm[1]); names.push(nm);
      if (want && new RegExp(String(want)).test(nm) && byName[relMap[sm[2]]]) pick = relMap[sm[2]];
    }
  } catch (e) {}
  var text = xlsxSheetToText_(byName[pick].getDataAsString(), shared);
  return { text: text.text, rows: text.rows, sheets: sheets.length, name: String(name || ''), names: names };
}

function xlsxSheetNo_(path) {
  var m = path.match(/sheet(\d+)\.xml$/);
  return m ? Number(m[1]) : 0;
}

/** Bảng chữ dùng chung của .xlsx: mỗi <si> là một chuỗi, có thể vỡ ra nhiều <t>. */
function xlsxSharedStrings_(xml) {
  var out = [], re = /<si>([\s\S]*?)<\/si>/g, m;
  while ((m = re.exec(xml)) !== null) out.push(xlsxPlainText_(m[1]));
  return out;
}
/** Bỏ thẻ, đổi ký tự thoát về chữ thường. */
function xlsxPlainText_(frag) {
  var s = String(frag).replace(/<[^>]*>/g, '');
  return s.replace(/&#(\d+);/g, function (_, d) { return String.fromCharCode(Number(d)); })
          .replace(/&#x([0-9a-fA-F]+);/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); })
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}
/** "C" → 3, "AB" → 28 */
function xlsxColNo_(ref) {
  var m = String(ref).match(/^([A-Z]+)/);
  if (!m) return 1;
  var n = 0;
  for (var i = 0; i < m[1].length; i++) n = n * 26 + (m[1].charCodeAt(i) - 64);
  return n;
}
/**
 * Một sheet → chữ, mỗi hàng một dòng, các ô ngăn nhau bằng Tab.
 * Ô giờ kiểu Excel (0,5 = 12:00) đổi về "12:00" cho dễ đọc; số nguyên giữ nguyên.
 */
function xlsxSheetToText_(xml, shared) {
  var lines = [], rows = 0;
  var rowRe = /<row[^>]*>([\s\S]*?)<\/row>|<row[^>]*\/>/g, rm;
  while ((rm = rowRe.exec(xml)) !== null) {
    if (++rows > XLSX_MAX_ROWS) break;
    var body = rm[1] || '', cells = [], maxCol = 0;
    var cRe = /<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g, cm;
    while ((cm = cRe.exec(body)) !== null) {
      var attr = cm[1] || '', inner = cm[2] || '';
      var refM = attr.match(/r="([A-Z]+\d+)"/), col = refM ? xlsxColNo_(refM[1]) : (maxCol + 1);
      var type = (attr.match(/t="([^"]+)"/) || [])[1] || 'n';
      var val = '';
      if (type === 's') {
        var idx = Number(xlsxPlainText_((inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1] || ''));
        val = (idx >= 0 && idx < shared.length) ? shared[idx] : '';
      } else if (type === 'inlineStr') {
        val = xlsxPlainText_((inner.match(/<is>([\s\S]*?)<\/is>/) || [])[1] || '');
      } else {
        val = xlsxPlainText_((inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1] || '');
        var num = Number(val);
        // Excel cất giờ thành phân số của một ngày: 0,5 = 12:00, 0,354166 = 8:30.
        if (val !== '' && isFinite(num) && num > 0 && num < 1) {
          var mins = Math.round(num * 24 * 60), hh = Math.floor(mins / 60), mi = mins % 60;
          val = hh + ':' + (mi < 10 ? '0' + mi : mi);
        }
      }
      cells[col - 1] = String(val).replace(/[\t\r\n]+/g, ' ').trim();
      if (col > maxCol) maxCol = col;
    }
    var line = [];
    for (var i = 0; i < maxCol; i++) line.push(cells[i] === undefined ? '' : cells[i]);
    lines.push(line.join('\t'));
  }
  // Bỏ các dòng trống ở đuôi cho gọn.
  while (lines.length && !lines[lines.length - 1].replace(/\t/g, '').trim()) lines.pop();
  return { text: lines.join('\n'), rows: lines.length };
}

// ===========================================================================
// KẾ HOẠCH A / B / C — ba bản LỊCH XẾP để so sánh rồi chọn
// ===========================================================================
// Chỉ đụng tới lịch xếp (schedule:<YM>). ĐĂNG KÝ của nhân viên (wish:<YM>)
// không bao giờ bị ghi đè khi đổi kế hoạch — đó là dữ liệu gốc của họ.
//   plan:<slot>:<YM>  : toàn bộ lịch xếp của kế hoạch đó
//   planmeta:<YM>     : { A:{at, name, stats}, ..., active:"B" } — nhẹ, để
//                       vẽ bảng so sánh mà không phải tải cả 3 bản lịch.

var PLAN_SLOTS = ['A', 'B', 'C'];
// Ô "F" = BẢN CHÍNH THỨC: tự ghi mỗi lần quản lý chốt & công bố lịch tháng
// (setMonthLock). Không lưu tay vào đó được, nhưng xem / dùng lại được.
var PLAN_OFFICIAL = 'F';

function assertPlanSlot_(slot, allowOfficial) {
  var s = String(slot || '').toUpperCase();
  if (allowOfficial && s === PLAN_OFFICIAL) return s;
  if (PLAN_SLOTS.indexOf(s) === -1) throw new Error('Ô kế hoạch phải là A, B hoặc C.');
  return s;
}
function assertYearMonth_(yearMonth) {
  var m = /^(20\d\d)-(0[1-9]|1[0-2])$/.exec(String(yearMonth));
  if (!m) throw new Error('Tháng không hợp lệ.');
  return String(yearMonth);
}
/** Ngày phải là số nguyên trong tháng đó (1..28/29/30/31). */
function assertDay_(yearMonth, day) {
  var ym = assertYearMonth_(yearMonth), d = Number(day);
  var n = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate();
  if (!(Math.floor(d) === d && d >= 1 && d <= n)) throw new Error('Ngày không hợp lệ.');
  return d;
}
/** Chặn dữ liệu ô lịch / đăng ký / yêu cầu sai kiểu hoặc quá to (giữ nguyên các trường hợp lệ). */
function guardEntry_(v) {
  if (v === null || v === undefined) return;
  if (typeof v !== 'object' || Array.isArray(v)) throw new Error('Dữ liệu ca không hợp lệ.');
  if (JSON.stringify(v).length > 6000) throw new Error('Dữ liệu ca quá dài.');
  if (v.shifts !== undefined && v.shifts !== null) {
    if (!Array.isArray(v.shifts) || v.shifts.length > 8) throw new Error('Dữ liệu ca không hợp lệ.');
    v.shifts.forEach(function (x) {
      if (!x || typeof x !== 'object') throw new Error('Dữ liệu ca không hợp lệ.');
      if (x.supStore !== undefined && x.supStore !== null && (typeof x.supStore !== 'string' || x.supStore.length > 40))
        throw new Error('Dữ liệu ca không hợp lệ.');
      if (x.supTo !== undefined && x.supTo !== null && (typeof x.supTo !== 'object' || typeof x.supTo.id !== 'string' || x.supTo.id.length > 100 ||
          String(x.supTo.name || '').length > 40 || String(x.supTo.code || '').length > 10))
        throw new Error('Dữ liệu ca không hợp lệ.');
      if (x.sid !== undefined && x.sid !== null && (typeof x.sid !== 'string' || x.sid.length > 16)) throw new Error('Dữ liệu ca không hợp lệ.');
      ['start', 'end', 'breakStart', 'breakEnd', 'supOpen', 'supClose'].forEach(function (k) {
        if (x[k] === undefined || x[k] === null) return;
        var n = Number(x[k]);
        if (!isFinite(n) || n < -1 || n > 36) throw new Error('Giờ không hợp lệ.');
      });
    });
  }
}
function guardEntries_(yearMonth, byDay) {
  if (!byDay || typeof byDay !== 'object' || Array.isArray(byDay)) throw new Error('Dữ liệu không hợp lệ.');
  Object.keys(byDay).forEach(function (d) { assertDay_(yearMonth, d); guardEntry_(byDay[d]); });
}

/** Ghi một bản lịch vào ô kế hoạch. meta = { name, stats } do client tính sẵn. */
function savePlan(token, yearMonth, slot, scheduleJson, metaJson) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth), sl = assertPlanSlot_(slot);
  try { JSON.parse(scheduleJson); } catch (e) { throw new Error('Dữ liệu lịch không hợp lệ.'); }
  var meta = {};
  try { meta = JSON.parse(metaJson || '{}') || {}; } catch (e) { meta = {}; }
  kvSet_('plan:' + sl + ':' + ym, scheduleJson, 'kế hoạch ' + sl, true);
  var all = readJsonKey_('planmeta:' + ym);
  all[sl] = { at: Date.now(), name: String(meta.name || '').slice(0, 40), stats: meta.stats || {} };
  kvSet_('planmeta:' + ym, JSON.stringify(all));
  return all;
}

function getPlan(token, yearMonth, slot) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth), sl = assertPlanSlot_(slot, true);
  var raw = kvGet_('plan:' + sl + ':' + ym);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

/** Đổi sang kế hoạch này: chép nó đè lên lịch xếp. Đăng ký giữ nguyên. */
function applyPlan(token, yearMonth, slot) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth), sl = assertPlanSlot_(slot, true);
  var raw = kvGet_('plan:' + sl + ':' + ym);
  if (!raw) throw new Error('Ô kế hoạch ' + sl + ' đang trống.');
  // Ghi qua schedBulkWrite_: tự giữ bản cũ để hoàn tác, và KHÔNG đè ngày đã công bố.
  var res = schedBulkWrite_(ym, raw, 'đổi sang kế hoạch ' + sl, null);
  var all = readJsonKey_('planmeta:' + ym);
  all.active = sl;
  kvSet_('planmeta:' + ym, JSON.stringify(all));
  var out = {}; for (var k in all) out[k] = all[k];
  out._kept = res.kept;                          // ngày đã công bố được giữ nguyên (không lưu vào planmeta)
  return out;
}

function deletePlan(token, yearMonth, slot) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth), sl = assertPlanSlot_(slot);
  kvSet_('plan:' + sl + ':' + ym, '', 'xoá kế hoạch ' + sl, true);
  var all = readJsonKey_('planmeta:' + ym);
  delete all[sl];
  if (all.active === sl) delete all.active;
  kvSet_('planmeta:' + ym, JSON.stringify(all));
  return all;
}

// ===========================================================================
// ĐỌC LỊCH & YÊU CẦU CỦA 1 THÁNG (kèm chuẩn hoá dữ liệu cũ)
// ===========================================================================

// ===========================================================================
// LẦN ĐĂNG NHẬP / HOẠT ĐỘNG GẦN NHẤT CỦA NHÂN VIÊN
// ===========================================================================
// Để quản lý xác nhận: đăng ký hôm đó có phải do chính nhân viên điền không,
// hay là dữ liệu cũ / người khác điền hộ. Lưu trong Script Properties (không
// nằm trong Sheet, không vào History), dạng:
//   seenMap = { empId: { login, open, wish, wishMgr } }   (mốc thời gian ms)
//     login   : lần nhập mã đăng nhập gần nhất
//     open    : lần mở app gần nhất (kể cả khi còn nhớ đăng nhập)
//     wish    : lần CHÍNH NHÂN VIÊN sửa đăng ký / yêu cầu gần nhất
//     wishMgr : lần QUẢN LÝ sửa hộ đăng ký của người đó gần nhất
// Ghi thưa (tối đa 5 phút/lần mỗi loại) để không tốn quota.
var SEEN_PROP = 'seenMap';
var SEEN_FIELDS = ['login', 'open', 'wish', 'wishMgr'];

function readSeen_() {
  try { return JSON.parse(props_().getProperty(SEEN_PROP) || '{}') || {}; } catch (e) { return {}; }
}
function markSeen_(empId, field, force) {
  var id = String(empId || '');
  if (!id || SEEN_FIELDS.indexOf(field) === -1) return;
  try {
    var cache = CacheService.getScriptCache(), ck = 'seenw:' + field + ':' + id;
    if (!force && cache.get(ck)) return;
    var m = readSeen_();
    (m[id] = m[id] || {})[field] = Date.now();
    props_().setProperty(SEEN_PROP, JSON.stringify(m));
    cache.put(ck, '1', 300);
  } catch (e) { /* chỉ là thông tin phụ, lỗi thì bỏ qua */ }
}
/**
 * Đóng dấu AI điền và LÚC NÀO lên từng ô đăng ký / yêu cầu:
 *   by: 'e' = chính nhân viên, 'm' = quản lý điền hộ, 'x' = chuyển từ dữ liệu cũ
 *   at: mốc thời gian (ms)
 * Nhờ vậy quản lý nhìn là biết ô nào nhân viên thật sự tự điền.
 */
function stamp_(who, v) {
  if (v && typeof v === 'object' && !(v instanceof Array)) {
    // Quản lý bấm "Hoàn tác" sau khi xoá nhầm: trả lại NGUYÊN dấu cũ (vẫn là
    // do nhân viên điền), không đổi thành "quản lý điền hộ".
    var keep = who.r === 'mgr' && v._keep && /^(e|m|x)$/.test(String(v.by || ''));
    delete v._keep;
    if (keep) return v;
    v.by = (who.r === 'mgr') ? 'm' : 'e';
    v.at = Date.now();
  }
  return v;
}
function markWishWriter_(who, empId) {
  markSeen_(empId, who.r === 'mgr' ? 'wishMgr' : 'wish', false);
}
function forgetSeen_(empId) {
  try {
    var m = readSeen_();
    if (m[empId]) { delete m[empId]; props_().setProperty(SEEN_PROP, JSON.stringify(m)); }
  } catch (e) {}
}

// ===========================================================================
// BÁO SAI LỊCH — nhân viên báo sau khi lịch đã chốt & công bố
// ===========================================================================
// report:<tháng> = [ { id, empId, day, text, at, status:'open'|'done', reply, doneAt } ]
// Nhân viên chỉ báo cho CHÍNH MÌNH và chỉ khi lịch đã chốt (trước đó họ vẫn tự
// sửa đăng ký được). Quản lý đánh dấu đã sửa / trả lời / xoá. Báo cáo KHÔNG tự
// sửa lịch — quản lý xem rồi tự chỉnh.
var REPORT_MAX = 200;

function readReports_(yearMonth) {
  var raw = kvGet_('report:' + yearMonth);
  if (!raw) return [];
  try { var a = JSON.parse(raw); return (a && a.length) ? a : []; } catch (e) { return []; }
}
function visibleReports_(who, list) {
  if (who.r === 'mgr') return list;
  return list.filter(function (x) { return x && String(x.empId) === String(who.e); });
}
/** Đọc – sửa – ghi trọn một lượt khoá (nhiều nhân viên có thể báo cùng lúc). */
function mutateReports_(yearMonth, fn) {
  var key = 'report:' + yearMonth;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_();
    var row = findRow_(sheet, key);
    var list = [];
    if (row !== -1) { try { list = JSON.parse(readCellValue_(sheet, row) || '[]') || []; } catch (e) { list = []; } }
    list = fn(list) || list;
    var json = JSON.stringify(list);
    if (row === -1) appendKeyValue_(sheet, key, json); else writeCellValue_(sheet, row, json);
    putCacheSafe_(key, json);
    return list;
  } finally {
    lock.releaseLock();
  }
}
function saveReport(token, yearMonth, empId, day, text) {
  var who = requireCanEdit_(token, empId);
  var ym = assertYearMonth_(yearMonth);
  assertEmployeeExists_(empId);
  var p = ym.split('-'), nDays = new Date(Number(p[0]), Number(p[1]), 0).getDate();
  var d = Math.round(Number(day));
  if (!dayLocked_(ym, d)) throw new Error('Lịch ngày này chưa chốt — bạn vẫn tự sửa đăng ký được, chưa cần báo sai.');
  if (!(d >= 1 && d <= nDays)) throw new Error('Ngày không hợp lệ.');
  var msg = String(text == null ? '' : text).trim().slice(0, 300);
  if (!msg) throw new Error('Hãy ghi ngắn gọn chỗ nào bị sai.');
  var list = mutateReports_(ym, function (l) {
    var mine = l.filter(function (x) { return x && x.empId === empId && x.status === 'open'; }).length;
    if (mine >= 20) throw new Error('Bạn đã có nhiều báo cáo đang chờ. Hãy đợi quản lý xử lý bớt.');
    if (l.length >= REPORT_MAX) throw new Error('Tháng này đã có quá nhiều báo cáo.');
    l.push({ id: Utilities.getUuid().slice(0, 12), empId: empId, day: d, text: msg,
             at: Date.now(), status: 'open', reply: '', doneAt: null });
    return l;
  });
  if (who.r === 'emp') mgrEvent_('report', empId, ym, d, msg);
  return visibleReports_(who, list);
}
/** Quản lý: đánh dấu đã sửa (done=true) hoặc mở lại, kèm lời nhắn cho nhân viên. */
function resolveReport(token, yearMonth, reportId, done, reply) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth);
  return mutateReports_(ym, function (l) {
    l.forEach(function (x) {
      if (!x || x.id !== String(reportId)) return;
      x.status = done ? 'done' : 'open';
      x.doneAt = done ? Date.now() : null;
      if (reply != null) x.reply = String(reply).trim().slice(0, 200);
    });
    return l;
  });
}
/** Quản lý xoá bất kỳ; nhân viên chỉ rút lại báo cáo CỦA MÌNH khi còn chờ. */
function deleteReport(token, yearMonth, reportId) {
  var who = auth_(token);
  var ym = assertYearMonth_(yearMonth);
  var list = mutateReports_(ym, function (l) {
    return l.filter(function (x) {
      if (!x || x.id !== String(reportId)) return true;
      if (who.r === 'mgr') return false;
      if (who.r === 'emp' && x.empId === who.e && x.status === 'open') return false;
      throw new Error('Bạn không thể xoá báo cáo này.');
    });
  });
  return visibleReports_(who, list);
}

function loadMonth(token, yearMonth) {
  yearMonth = assertYearMonth_(yearMonth);
  var who = auth_(token);
  if (who.r === 'mgr') { try { ensureEmpCodes_(); } catch (e) {} }
  // Đọc trước một lượt mọi khoá tháng này cần (1 lần gọi bộ nhớ đệm thay cho ~30 lần).
  var tdy = todayStr_().slice(0, 7);
  kvPrefetch_(['employees', 'settings', 'schedule:' + yearMonth, 'requests:' + yearMonth, 'wish:' + yearMonth, 'dayinfo:' + yearMonth,
    'close:' + yearMonth, 'lock:' + yearMonth, 'bak:schedule:' + yearMonth, 'swap:' + yearMonth, 'emplock:' + yearMonth,
    'planmeta:' + yearMonth, 'memo:' + yearMonth, 'learn:store', 'mgrev', 'mgrev:seen', 'thx:' + thxYm_(-1), 'thx:' + thxYm_(0),
    'hc:cfg', 'hc:' + tdy, 'report:' + yearMonth, 'jobtpl', 'jobs:' + yearMonth, 'pub:' + yearMonth,
    'puback:' + yearMonth, 'schedule:' + ymShift_(yearMonth, -1), 'schedule:' + ymShift_(yearMonth, 1),
    'care:' + yearMonth, 'care:' + ymShift_(yearMonth, 1)]);
  // v2026.10.16.6: gửi thư chờ + đồng bộ hub CHỈ khi quản lý mở app (nhân viên mở thì không phải chờ khoá / gửi thư).
  // Thư của nhân viên do trình kích hoạt 5 phút (mailQueueTick) gửi.
  try { if (who.r === 'mgr') { try { mgrFlushMail_(); } catch (e0) {} } return loadMonthInner_(who, yearMonth); } finally { KV_MEMO_ = null; }
}
/** Bản sao tháng { ngày: { người: mục } } bỏ ghi chú (note) của mọi người trừ `me`. */
function stripOthersNotes_(obj, me) {
  var out = {};
  Object.keys(obj || {}).forEach(function (d) {
    var m = obj[d]; if (!m || typeof m !== 'object') { out[d] = m; return; }
    var o = out[d] = {};
    Object.keys(m).forEach(function (id) {
      var v = m[id];
      if (String(id) === String(me) || !v || typeof v !== 'object' || Array.isArray(v)) { o[id] = v; return; }
      var c = {}; for (var k in v) if (k !== 'note' && k !== 'reason' && k !== 'msg') c[k] = v[k];
      if (Array.isArray(c.shifts)) c.shifts = c.shifts.map(function (x) { if (!x || typeof x !== 'object') return x; var y = {}; for (var k2 in x) if (k2 !== 'note') y[k2] = x[k2]; return y; });
      o[id] = c;
    });
  });
  return out;
}
function loadMonthInner_(who, yearMonth) {
  if (who.r === 'emp') markSeen_(who.e, 'open', false);
  if (who.r === 'mgr') { try { sweepJobPhotos_(false); } catch (e) {} try { storeCode_(); } catch (e) {} try { hubRegister_(false); } catch (e) {} hubSyncSoon_(); }
  var linked = who.r === 'mgr' ? linkedStores_().map(function (x) { return { id: x.id, name: x.name, code: x.code, open: x.open, close: x.close }; }) : [];
  if (who.r === 'mgr') hubPublish_(yearMonth, false);
  var employees = readEmployees_();
  var schedule = readMonthNormalized_('schedule:' + yearMonth, employees);
  if (who.r === 'emp') schedule = staffVisibleSched_(yearMonth, schedule);
  var requests = readMonthNormalized_('requests:' + yearMonth, employees);
  var wish = readWish_(yearMonth);
  var info = splitDayInfo_(readDayInfo_(yearMonth));
  // Tiền đi lại là chuyện riêng từng người: chỉ quản lý nhận được.
  // Giới hạn giờ, ưu tiên, giờ cố định của NGƯỜI KHÁC cũng vậy (mình vẫn thấy của chính mình).
  // v41: thêm thu nhập tối thiểu / tối đa, độ dài ca ưa thích, cấp bậc — trước đây lọt sang máy nhân viên khác.
  var PRIV_ = { travel: 1, maxWeek: 1, minMonth: 1, maxMonth: 1, priority: 1, win: 1, email: 1, mp: 1, mailAt: 1,
                minIncome: 1, maxIncome: 1, prefLen: 1, rank: 1, wage: 1, split: 1 };
  if (who.r !== 'mgr') {
    // Ghi chú trong đăng ký / báo nghỉ (lý do riêng: khám bệnh, việc nhà…) của NGƯỜI KHÁC: không gửi cho nhân viên.
    requests = stripOthersNotes_(requests, who.e);
    wish = stripOthersNotes_(wish, who.e);
    employees = employees.map(function (e) {
      var mine = String(e.id) === String(who.e);
      var c = {}; for (var k in e) if (k !== 'travel' && (mine || !PRIV_[k])) c[k] = e[k];
      return c;
    });
  }
  var settingsOut = readSettings_();
  if (who.r !== 'mgr') { settingsOut = JSON.parse(JSON.stringify(settingsOut)); delete settingsOut.budgetSa; delete settingsOut.budgetStaff; delete settingsOut.mailTo; delete settingsOut.mailOn; delete settingsOut.wage; delete settingsOut.laborPct; }
  return {
    employees: employees,
    schedule: schedule,        // LỊCH XẾP của quản lý (nháp hoặc đã chốt)
    wish: wish,                // ĐĂNG KÝ của nhân viên — máy xếp không bao giờ ghi vào đây
    requests: requests,
    closeHours: readCloseHours_(yearMonth),
    exNames: hrExNames_(),     // v2026.10.16: tên người đã thôi việc / đã gộp mã → lịch, chấm công cũ không hiện "?"
    locked: readLock_(yearMonth),
    // Chỉ chốt nửa đầu (1–15): nửa sau vẫn là nháp.
    lockHalf: readLockMode_(yearMonth) === 'h1',
    hasBackup: !!kvGet_('bak:schedule:' + yearMonth),
    settings: settingsOut,
    // Quán đã liên kết (tự đồng bộ vào danh sách quán đi chi viện: tên, mã, giờ mở/đóng cửa).
    linkedStores: linked,
    swaps: swapsForClient_(who, yearMonth),
    // Nhân viên tự khoá lịch tháng của mình: { empId: true }
    empLocks: readJsonKey_('emplock:' + yearMonth),
    notes: info.notes,
    hols: info.hols,
    // Doanh thu dự kiến chỉ ra khỏi máy chủ khi người hỏi là quản lý.
    budgets: (who.r === 'mgr') ? info.budgets : {},
    // Tóm tắt 3 ô kế hoạch A/B/C (không kèm lịch, chỉ số liệu) — việc của quản lý.
    plans: (who.r === 'mgr') ? readJsonKey_('planmeta:' + yearMonth) : {},
    // Hộp nhắc nhở: nhân viên cũng phải đọc được, nếu không thì nhắc cho ai.
    memos: readMemos_(yearMonth),
    // Máy học: chỉ quản lý cần, và cũng chỉ quản lý được xem.
    learn: (who.r === 'mgr') ? readLearn_() : null,
    // Lần đăng nhập / mở app / tự sửa đăng ký gần nhất — chỉ quản lý xem.
    seen: (who.r === 'mgr') ? readSeen_() : {},
    // 🔔 Nhân viên báo nghỉ / xin đổi ca / báo sai lịch — hiện ngay khi quản lý mở app.
    mev: (who.r === 'mgr') ? mgrEventsOut_() : null,
    // Máy đang ghi nhớ đăng nhập (để quản lý đăng xuất từ xa) — chỉ quản lý.
    devs: (who.r === 'mgr') ? devicesForClient_() : {},
    // Thẻ cảm ơn (tháng này + tháng trước, theo ngày thật — không theo tháng đang xem).
    thx: thanksForClient_(who),
    // Thẻ tem đi làm (出勤スタンプ) của tháng đang xem: nhân viên thấy tem của mình, quản lý thấy số tem từng người.
    // 発注: hôm nay có phải ngày đặt hàng không, đã chốt chưa (để nhắc trước 11:00).
    hc: hcBrief_(who),
    // Lần sửa gần nhất của lịch xếp / đăng ký tháng này — hiện ở bảng lịch tháng.
    mod: (who.r === 'mgr') ? (readMod_()[yearMonth] || {}) : {},
    // Báo sai lịch: quản lý thấy hết, nhân viên chỉ thấy của chính mình.
    reports: visibleReports_(who, readReports_(yearMonth)),
    // Giao việc: ai cũng thấy việc nào giao cho ai (hết cãi "không phải việc của tôi").
    jobTpl: readJobTpl_(),
    jobs: jobsForClient_(who, yearMonth),
    // Lịch sử công bố + các lần sửa sau công bố (nhân viên chỉ thấy thay đổi của chính mình).
    pub: pubForClient_(who, yearMonth),
    // Mép tháng: 14 ngày cuối tháng trước + 7 ngày đầu tháng sau — để đếm chuỗi ngày làm
    // liên tục QUA HAI THÁNG (cuối tháng 9 làm 8 ngày + đầu tháng 10 thêm 4 = 12 ngày liền).
    adj: (function (a) {
      if (who.r === 'emp' && a.prev) a.prev.days = staffVisibleSched_(a.prev.ym, a.prev.days);
      if (who.r === 'emp' && a.next) a.next.days = staffVisibleSched_(a.next.ym, a.next.days);
      return a;
    })(adjMonths_(yearMonth, employees)),
    // Ngày cần chú ý sức khoẻ (nhân viên tự đánh dấu, không ghi lý do): quản lý thấy hết, nhân viên chỉ thấy của mình.
    care: careForClient_(who, yearMonth)
  };
}

/** Bật "nhân viên chỉ thấy lịch đã công bố": bỏ các ngày chưa chốt khỏi lịch gửi cho nhân viên. */
function staffVisibleSched_(ym, sched) {
  if (!readSettings_().hideDraft) return sched;
  var mode = readLockMode_(ym);
  if (mode === 'all') return sched;
  var out = {};
  if (mode === 'h1') Object.keys(sched || {}).forEach(function (d) { if (Number(d) <= HALF_SPLIT) out[d] = sched[d]; });
  return out;
}

function ymShift_(ym, k) {
  var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) + k;
  while (m < 1) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  return y + '-' + ('0' + m).slice(-2);
}
function compactShiftEntry_(e) {
  if (!e) return null;
  if (e.off) return { off: true };
  // v41: giữ cả ca ✈ (đi chi viện vẫn là ngày làm / giờ làm của người đó — đếm chuỗi ngày, 28h/tuần).
  var sh = (e.shifts || []).filter(function (x) { return x; }).map(function (x) {
    var o = { start: Number(x.start), end: Number(x.end) };
    if (x.isSupport) o.isSupport = true;
    if (x.breakStart != null && x.breakEnd != null) { o.breakStart = Number(x.breakStart); o.breakEnd = Number(x.breakEnd); }
    if (x.endAtClose) o.endAtClose = true;
    return o;
  });
  return sh.length ? { off: false, shifts: sh } : null;
}
function adjMonths_(ym, employees) {
  var out = {};
  try {
    var pv = ymShift_(ym, -1), nx = ymShift_(ym, 1);
    var pn = new Date(Date.UTC(Number(pv.slice(0, 4)), Number(pv.slice(5, 7)), 0)).getUTCDate();
    var ps = readMonthNormalized_('schedule:' + pv, employees), ns = readMonthNormalized_('schedule:' + nx, employees);
    var pick = function (src, from, to) {
      var o = {};
      for (var d = from; d <= to; d++) {
        var m = src[String(d)] || {}, c = {};
        Object.keys(m).forEach(function (id) { var v = compactShiftEntry_(m[id]); if (v) c[id] = v; });
        if (Object.keys(c).length) o[d] = c;
      }
      return o;
    };
    out.prev = { ym: pv, n: pn, days: pick(ps, pn - 13, pn) };
    out.next = { ym: nx, days: pick(ns, 1, 7) };
  } catch (e) { /* thiếu thì thôi, chỉ mất phần đếm qua tháng */ }
  return out;
}

// --- Ngày cần chú ý sức khoẻ (体調配慮) -------------------------------------
// care:<YM> = { empId: [ngày,…] }. Chính nhân viên tự đánh dấu, KHÔNG có lý do —
// app không lưu chu kỳ hay bệnh gì cả (gợi ý theo chu kỳ, nếu dùng, chỉ nằm trên máy người đó).
function careForClient_(who, ym) {
  var cur = readJsonKey_('care:' + ym), nxt = readJsonKey_('care:' + ymShift_(ym, 1));
  var cut = function (o) { var r = {}; Object.keys(o).forEach(function (id) { r[id] = (o[id] || []).filter(function (d) { return d <= 3; }); }); return r; };
  if (who.r === 'mgr') return { cur: cur, next: cut(nxt) };
  var me = String(who.e), a = {}, b = {};
  if (cur[me]) a[me] = cur[me];
  if (nxt[me]) b[me] = nxt[me].filter(function (d) { return d <= 3; });
  return { cur: a, next: b };
}
function saveCareDays(token, yearMonth, empId, days) {
  var who = auth_(token);
  if (who.r !== 'emp' || String(who.e) !== String(empId)) throw new Error('Chỉ chính nhân viên mới tự đánh dấu được ngày cần chú ý sức khoẻ.');
  var ym = assertYearMonth_(yearMonth);
  var list = (Array.isArray(days) ? days : []).map(Number)
    .filter(function (d) { return d >= 1 && d <= 31 && Math.floor(d) === d; })
    .filter(function (d, i, a) { return a.indexOf(d) === i; }).sort(function (a, b) { return a - b; });
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_(), key = 'care:' + ym, obj = readMonthObject_(sheet, key);
    if (list.length) obj[String(empId)] = list; else delete obj[String(empId)];
    pubPut_(sheet, key, obj);
    return list;
  } finally {
    lock.releaseLock();
  }
}

// --- Thẻ cảm ơn (ありがとう) ------------------------------------------------
// thx:<YM> = { list: [{ id, f: người gửi (empId | 'm'), t: người nhận, s: stamp, m: lời nhắn, at, seen }] }
// Nhân viên gửi cho nhau (và quản lý gửi cho nhân viên). Mỗi người chỉ thấy thẻ mình gửi / nhận.
var THX_STAMPS = ['thx', 'great', 'saved', 'nice', 'otsu'];
function thxYm_(offset) {
  var d = new Date(Date.now() + 9 * 3600 * 1000); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + (offset || 0));
  return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2);
}
function sendThanks(token, toId, stamp, msg) {
  var who = auth_(token);
  var from = who.r === 'mgr' ? 'm' : String(who.e);
  toId = String(toId || '');
  if (!toId || toId === from) throw new Error('Hãy chọn một đồng nghiệp khác.');
  assertEmployeeExists_(toId);
  var st = THX_STAMPS.indexOf(String(stamp)) !== -1 ? String(stamp) : 'thx';
  var m = String(msg == null ? '' : msg).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 80);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_(), key = 'thx:' + thxYm_(0), obj = readMonthObject_(sheet, key);
    var list = Array.isArray(obj.list) ? obj.list : [];
    var dayAgo = Date.now() - 24 * 3600 * 1000;
    if (list.filter(function (x) { return x.f === from && x.at > dayAgo; }).length >= 20) throw new Error('Hôm nay bạn đã gửi nhiều rồi — mai gửi tiếp nhé.');
    var e = { id: Utilities.getUuid().slice(0, 8), f: from, t: toId, s: st, m: m, at: Date.now() };
    list.push(e);
    if (list.length > 600) list = list.slice(-600);
    obj.list = list;
    pubPut_(sheet, key, obj);
    return e;
  } finally { lock.releaseLock(); }
}
/** Đánh dấu đã xem các thẻ mình nhận. */
function ackThanks(token) {
  var who = auth_(token);
  if (who.r !== 'emp') return 0;
  var me = String(who.e), n = 0;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_();
    [thxYm_(0), thxYm_(-1)].forEach(function (ym) {
      var key = 'thx:' + ym, obj = readMonthObject_(sheet, key), ch = false;
      (obj.list || []).forEach(function (x) { if (x.t === me && !x.seen) { x.seen = Date.now(); ch = true; n++; } });
      if (ch) pubPut_(sheet, key, obj);
    });
  } finally { lock.releaseLock(); }
  return n;
}
// v42: 出勤スタンプカード đã bỏ (không ai xem). Dữ liệu cũ 'stamp:<tháng>' để nguyên, không còn đọc / ghi.
// ===========================================================================
// 🔔 THÔNG BÁO CHO QUẢN LÝ: nhân viên báo nghỉ / xin đổi ca / đổi giờ / báo sai lịch.
//   mgrev       = [{id, at, k, e, ym, d, t}]   (giữ 45 ngày, tối đa 200)
//   mgrev:seen  = lúc quản lý bấm "đã xem" gần nhất
// Có bật email thì gửi ngay cho địa chỉ quản lý (MailApp; lỗi / hết hạn mức thì bỏ qua, không làm hỏng thao tác).
// ===========================================================================
var MGR_EV_KIND = {
  urgent: ['🚨', 'Báo nghỉ đột xuất', '急な欠勤'], tc: ['⏰', 'Xin đổi giờ', '時間変更の申請'], swap: ['⇄', 'Xin đổi ca', 'シフト交代の申請'],
  help: ['📣', 'Nhờ quản lý tìm người', '店長に相談'], cancel: ['↩', 'Huỷ yêu cầu đổi ca', '交代申請の取り消し'],
  off: ['🛌', 'Báo không đi làm được', '出勤できない連絡'], report: ['📝', 'Báo lịch sai', 'シフトの誤り報告'],
  apply: ['📮', 'Có người ứng tuyển', '応募がありました'], health: ['🌡', 'Nhân viên báo không khoẻ', '体調不良の申告'],
  prof: ['👤', 'Nhân viên sửa hồ sơ', 'プロフィールの更新'],
  supAsk: ['🤝', 'Chi viện: cần duyệt', '応援：承認が必要'], supDone: ['✅', 'Chi viện: đã chốt', '応援：確定'],
  supOff: ['✖', 'Chi viện: từ chối / huỷ', '応援：取消・辞退']
};
// Yêu cầu đổi ca / báo nghỉ của nhân viên: CHỜ 60 giây (nhân viên còn bấm "Hoàn tác" được) rồi mới báo quản lý + gửi mail.
var MGR_EV_DELAY_MS = 63000;   // 60 giây hoàn tác trên máy + 3 giây dư cho mạng chậm
var MGR_EV_DELAY_KINDS = { swap: 1, tc: 1, urgent: 1, help: 1 };
function mgrEvent_(k, empId, ym, d, text) {
  try {
    var ev = { id: Utilities.getUuid().slice(0, 10), at: Date.now(), k: String(k), e: String(empId), ym: String(ym), d: Number(d) || 0,
               t: String(text == null ? '' : text).slice(0, 160) };
    var delayed = !!MGR_EV_DELAY_KINDS[ev.k];
    if (delayed) { ev.due = ev.at + MGR_EV_DELAY_MS; ev.mq = 1; }
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(LOCK_WAIT_MS)) return;
    try {
      var sheet = getSheet_(), list = readMonthObject_(sheet, 'mgrev');
      list = Array.isArray(list) ? list : [];
      var cut = Date.now() - 45 * 86400000;
      list = list.filter(function (x) { return x && Number(x.at) > cut; });
      // cùng người · cùng ngày · cùng loại trong 2 phút (lưu lại nhiều lần) → gộp làm một:
      // chỉ cập nhật nội dung, giữ nguyên mốc chờ / đã gửi (không báo lại, không gửi mail lần hai).
      var dup = null;
      list.forEach(function (x) { if (x.e === ev.e && x.ym === ev.ym && x.d === ev.d && x.k === ev.k && ev.at - x.at < 120000) dup = x; });
      if (dup) { dup.t = ev.t; delayed = true; }
      else list.push(ev);
      if (list.length > 200) list = list.slice(list.length - 200);
      pubPut_(sheet, 'mgrev', list);
      if (delayed) mqSetDue_(list);
    } finally { lock.releaseLock(); }
    if (!delayed) mgrMail_(ev);
  } catch (e) {}
}
/** Mốc sớm nhất còn thư chờ gửi (thuộc tính script — đọc rất nhẹ, khỏi mở bảng tính mỗi lần). */
function mqSetDue_(list) {
  var due = 0;
  list.forEach(function (x) { if (x && x.mq && x.due && (!due || x.due < due)) due = x.due; });
  try { if (due) props_().setProperty('MQ_DUE', String(due)); else props_().deleteProperty('MQ_DUE'); } catch (e) {}
}
/** Nhân viên bấm "Hoàn tác" trong 60 giây: bỏ hẳn thông báo đang chờ (không báo, không mail). Trả true nếu có bỏ. */
function mgrEventDropPending_(empId, ym, d) {
  var dropped = false;
  try {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(LOCK_WAIT_MS)) return false;
    try {
      var sheet = getSheet_(), list = readMonthObject_(sheet, 'mgrev'), now = Date.now();
      list = Array.isArray(list) ? list : [];
      var keep = list.filter(function (x) {
        var pend = x && x.e === String(empId) && x.ym === String(ym) && x.d === Number(d) && MGR_EV_DELAY_KINDS[x.k] && x.due && x.due > now;
        if (pend) dropped = true;
        return !pend;
      });
      if (dropped) { pubPut_(sheet, 'mgrev', keep); mqSetDue_(keep); }
    } finally { lock.releaseLock(); }
  } catch (e) {}
  return dropped;
}
/** Gửi các thư đã hết 60 giây chờ. Gọi khi có ai dùng app + trình kích hoạt 5 phút một lần. */
function mgrFlushMail_() {
  staffMailPendingFlush_();
  staffMailFlush_();
  var due = 0;
  try { due = Number(props_().getProperty('MQ_DUE')) || 0; } catch (e) { return 0; }
  if (!due || due > Date.now()) return 0;
  var send = [];
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) return 0;
  try {
    var sheet = getSheet_(), list = readMonthObject_(sheet, 'mgrev'), now = Date.now(), ch = false;
    list = Array.isArray(list) ? list : [];
    list.forEach(function (x) { if (x && x.mq && x.due && x.due <= now) { delete x.mq; send.push(x); ch = true; } });
    if (ch) pubPut_(sheet, 'mgrev', list);
    mqSetDue_(list);
  } finally { lock.releaseLock(); }
  send.forEach(function (x) { mgrMail_(x); });     // thư cho quản lý; nhân viên chỉ nhận thư khi được nhờ cụ thể
  if (send.length) staffMailFlush_();
  return send.length;
}
/** Nhân viên: hết đếm ngược trên máy → nhờ máy chủ gửi ngay (không cần chờ trình kích hoạt). */
function mgrFlushMail(token) { auth_(token); return mgrFlushMail_(); }
/** Trình kích hoạt theo giờ (5 phút): gửi thư còn chờ khi không ai mở app. */
function mailQueueTick() { if (!tickGate_('mail', 55)) return false; return mgrFlushMail_(); }
/** Có nhân viên nào đăng ký nhận thư không (thì phải giữ trình kích hoạt 5 phút để gửi thư cho họ). */
function staffMailInUse_() {
  try { return readEmployees_().some(function (e) { return !!e.email; }) || props_().getProperty('SMQ') === '1'; } catch (e) { return true; }
}
function ensureMailTrigger_(on) {
  try {
    var ts = ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'mailQueueTick'; });
    if (on && !ts.length) ScriptApp.newTrigger('mailQueueTick').timeBased().everyMinutes(5).create();
    if (!on) ts.forEach(function (t) { ScriptApp.deleteTrigger(t); });
  } catch (e) {}
}
function mgrEvText_(ev) {
  var kind = MGR_EV_KIND[ev.k] || ['🔔', ev.k, ev.k];
  var name = '?';
  readEmployees_().forEach(function (x) { if (x.id === ev.e) name = x.name; });
  if (ev.k === 'apply') name = ev.t || '?';
  var dd = ev.ym && ev.d ? Number(ev.ym.slice(5, 7)) + '/' + ev.d : '';
  return { kind: kind, name: name, dd: dd };
}
function mgrMail_(ev) {
  try {
    var st = readSettings_();
    if (!st.mailOn || !st.mailTo) return false;
    if (typeof MailApp === 'undefined') return false;
    try { if (MailApp.getRemainingDailyQuota() < 3) return false; } catch (e0) {}
    // v41: một nhân viên bấm báo nghỉ / đổi ca liên tục → tối đa 6 thư / giờ (vẫn hiện đủ trong 🔔 của app).
    if (ev.e && !mailRate_('mgr:' + ev.e, 6, 3600)) return false;
    var x = mgrEvText_(ev), store = storeLabel_();
    var subject = '[' + store + '] ' + x.kind[0] + ' ' + x.kind[2] + ' / ' + x.kind[1] + ' — ' + x.name + ' ' + x.dd;
    var when = Utilities.formatDate(new Date(ev.at), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
    var body = x.kind[0] + ' ' + x.kind[2] + '（' + x.kind[1] + '）\n' +
      'スタッフ / Nhân viên: ' + x.name + '\n' +
      '日付 / Ngày: ' + x.dd + '\n' +
      (ev.t ? 'メモ / Ghi chú: ' + ev.t + '\n' : '') +
      '受付 / Lúc: ' + when + '\n\n' +
      ((st.appUrl || frontOnly_()) ? 'アプリ / Mở app: ' + (st.appUrl || frontOnly_()) + '\n\n' : '') +
      '— ' + store + ' シフトアプリ（自動送信）';
    MailApp.sendEmail({ to: st.mailTo, subject: subject.slice(0, 200), body: body, name: store + ' シフト' });
    return true;
  } catch (e) { return false; }
}
function mgrEventsOut_() {
  var list = readJsonKey_('mgrev');
  list = Array.isArray(list) ? list : [];
  var cut = Date.now() - 30 * 86400000;
  var now = Date.now();
  list = list.filter(function (x) { return x && Number(x.at) > cut && !(x.due && x.due > now); })     // còn trong 60 giây "hoàn tác" thì chưa hiện
    .map(function (x) { return x.due ? Object.assign({}, x, { at: x.due }) : x; })
    .sort(function (a, b) { return b.at - a.at; }).slice(0, 60);
  var seen = Number(kvGet_('mgrev:seen')) || 0;
  return { list: list, seen: seen };
}
/** Quản lý: danh sách thông báo (cho chuông tự cập nhật). */
function mgrEvents(token) { requireManager_(token); mgrFlushMail_(); if (hubOn_()) hubNoteProcess_(); return mgrEventsOut_(); }
/** Quản lý: đã xem hết thông báo tới lúc này. */
function mgrEventsSeen(token) {
  requireManager_(token);
  var now = Date.now();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try { pubPut_(getSheet_(), 'mgrev:seen', String(now)); } finally { lock.releaseLock(); }
  return now;
}
/** Quản lý: gửi thử email thông báo tới địa chỉ đã lưu. */
function mgrMailTest(token) {
  requireManager_(token);
  var st = readSettings_();
  if (!st.mailTo) throw new Error('Chưa nhập email quản lý (hoặc email không hợp lệ).');
  if (typeof MailApp === 'undefined') throw new Error('Không gửi được email.');
  var store = storeLabel_();
  try {
    MailApp.sendEmail({ to: st.mailTo, subject: '[' + store + '] ✅ テストメール / Email thử',
      body: 'シフトアプリからのテストメールです。\nĐây là email thử từ app lịch làm — nhận được là đã cài đặt xong.\n\n— ' + store, name: store + ' シフト' });
  } catch (e) { throw new Error('Không gửi được email. Hãy mở trình soạn Apps Script, chạy hàm bất kỳ một lần để cấp quyền gửi mail.'); }
  return st.mailTo;
}
// ===========================================================================
// 発注 (ĐẶT HÀNG) — nhân viên nhập TỒN KHO, máy tính SỐ CẦN ĐẶT, lưu lại để
// quản lý kiểm toán cuối tháng (dùng bao nhiêu, hao hụt ra sao).
//   hc:items      = danh mục [{id,name,zone,unit,pack,pu,price,mode,par,yen,hide,piece}]
//                   mode: 's' theo doanh thu (rau: cứ yen ¥ thì cần 1 đơn vị, +buf%),
//                         'p' định mức (đặt cho đủ par), 'm' đặt khi cần (nhập tay)
//   hc:cfg        = {on, vegDows, genDows, cut, buf, lead, defSales[7]}
//   hc:<YYYY-MM>  = { "<ngày>": { c:{id:tồn}, z:{khu:{by,at}}, o:{id:đặt}, fin:{at,by}, pl:{at,by},
//                                 win:{from,to}, S:doanh thu dự kiến trong khoảng, nd:{id:cần} } }
//   hc:act        = { "YYYY-MM": doanh thu thực tế (quản lý nhập để kiểm toán) }
// Nhân viên chỉ thấy SỐ ĐƠN VỊ cần (không thấy doanh thu dự kiến).
// ===========================================================================
var HC_ZONES = ['veg', 'frz', 'chl', 'amb', 'pkg', 'sup', 'oth'];
var HC_SEED = [["28130009","トマト《ケース》","veg","C",1,"1C",3235,"s",0,90000,0],["28130027","カットレタス900g","veg","P",1,"1P",708,"s",0,20000,0],["28130032","オニオンスライス600G","veg","P",1,"1P",485,"s",0,50000,0],["28130012","カットピーマン400G","veg","P",1,"1P",613,"s",0,100000,0],["21010010","ハニーウィート26","frz","C",50,"50本",2143,"p",7,0,0],["27110019","ポテトTM(’26)","frz","C",10,"10袋",4916,"p",8,0,0],["21010009","イタリアンホワイト26","frz","C",50,"50本",2143,"p",6,0,0],["24510014","てり焼きチキン30個入り","frz","袋",1,"1袋",1239,"p",12,0,0],["24610005","えび(’22)","frz","袋",125,"125個",1172,"p",10,0,0],["24510011","チキンストリップス","frz","袋",1,"1袋",2041,"p",7,0,0],["24410014","サラミ風ドライソーセージ(’25)","frz","P",1,"1P",385,"p",8,0,0],["23310008","アボカド","frz","C",12,"12個",5352,"p",2,0,0],["24510015","タンドリーチキン","frz","袋",1,"1袋",2272,"p",4,0,0],["25010010","バジルソース(’26)","frz","袋",1,"1袋",312,"p",9,0,0],["24410011","ロースハム","frz","袋",1,"1袋",748,"p",4,0,0],["27110017","トマト&クラムスープ 1KG","frz","袋",1,"1袋",986,"p",3,0,0],["24110016","ローストビーフ‘26","frz","袋",1,"1袋",2565,"p",4,0,0],["25010011","シラチャーソース","frz","袋",1,"1袋",143,"p",6,0,0],["24510016","グリルチキン","frz","袋",1,"1袋",1288,"p",3,0,0],["24410010","生ハム","frz","C",12,"12袋",7338,"p",1,0,0],["24410009","ベーコン300g(×20袋)","frz","C",20,"20袋",13662,"p",1,0,0],["21210003","クッキーチョコチップ","frz","袋",75,"75個",5058,"p",1,0,0],["24110013","【フィラデルフィア用】300Gビーフスライス","frz","袋",1,"1袋",1055,"p",1,0,0],["28130035","ブロッコリー","frz","袋",1,"1袋",392,"p",1,0,0],["24510017","チキンストリプス26","frz","袋",1,"1袋",2041,"p",1,0,0],["21210004","クッキーホワイトチョコマカデミア","frz","袋",75,"75個",5058,"p",1,0,0],["25010012","ヨーグルトランチソース","frz","袋",1,"1袋",367,"p",1,0,0],["22310004","Dアイス 60NB","frz","個",1,"1個",1872,"m",0,0,1],["21210006","クッキーチョコチップ M&M","frz","袋",75,"75個",5058,"m",0,0,0],["24320004","タマゴサラダ1kg","chl","P",1,"1P",711,"p",12,0,0],["10020024","フォープロユースミルク","chl","本",1,"1本",230,"p",10,0,0],["22120012","スライスチーズ(’24)","chl","袋",1,"1袋",560,"p",4,0,0],["25020020","ハニーマスタードソース","chl","袋",1,"1袋",676,"p",3,0,0],["24620003","ツナ(オニオン入り’23)","chl","袋",1,"1袋",514,"p",6,0,0],["25020001","マスカルポーネチーズ","chl","P",1,"1P",550,"p",6,0,0],["25020004","野菜クリーミードレッシング","chl","袋",1,"1袋",662,"p",3,0,0],["22120014","クリームタイプチーズ(ブルーチーズ)","chl","袋",1,"1袋",477,"p",3,0,0],["25020013","チポトレサウスウェストソース('22)","chl","袋",1,"1袋",307,"p",3,0,0],["25020022","タルタルソース’26","chl","袋",1,"1袋",851,"p",2,0,0],["22120016","チェダーチーズソース(’25","chl","袋",1,"1袋",349,"p",1,0,0],["25020011","わさび醤油ソース","chl","本",1,"1本",510,"m",0,0,1],["25040007","マヨネーズタイプ","amb","袋",1,"1袋",450,"p",4,0,0],["25040029","VOパック23","amb","袋",50,"50個",434,"p",2,0,0],["25040022","シーザーサラダドレッシング","amb","本",1,"1本",775,"p",2,0,0],["25040010","チリソース(激辛)","amb","袋",1,"1袋",888,"p",2,0,0],["21440002","洗いごま 1kg","amb","袋",1,"1袋",692,"p",2,0,0],["25040032","ハーブソルト('24)","amb","袋",1,"1袋",474,"p",2,0,0],["10040049","オレンジ 100","amb","C",6,"6本",2100,"p",2,0,0],["25040028","てり焼きソース('23)","amb","袋",1,"1袋",301,"p",2,0,0],["21440005","ハニーオーツミックス('25)","amb","袋",1,"1袋",1469,"p",2,0,0],["29140003","ハラペーニョ(SO)","amb","缶",1,"1缶",315,"p",2,0,0],["25040033","チーズフレーバー('24)","amb","袋",1,"1袋",546,"p",2,0,0],["10040033","ポーションミルク (3ML)","amb","袋",1,"1袋",167,"p",1,0,0],["10040022","野菜果物ミックスジュース","amb","本",1,"1本",244,"p",3,0,0],["10040012","BIBアイスティー1G","amb","箱",1,"1箱",3991,"p",1,0,0],["10040048","モヒートミント","amb","本",1,"1本",1446,"p",1,0,0],["10040014","BIBジンジャエール2.5G","amb","箱",1,"1箱",7104,"p",1,0,0],["10040013","BIBウーロン茶1G","amb","箱",1,"1箱",3991,"p",1,0,0],["10040015","炭酸ガス5KG","amb","本",1,"1本",1400,"p",1,0,0],["29140005","ピクルス","amb","C",6,"6袋",4010,"p",1,0,0],["10040017","BIBペプシネックス2.5G","amb","箱",1,"1箱",6655,"p",1,0,0],["29140002","オリーブ(袋)","amb","袋",1,"1袋",854,"p",1,0,0],["10040011","BIBペプシ2.5G","amb","箱",1,"1箱",6655,"p",1,0,0],["10040016","BIBポップメロン2.5G","amb","箱",1,"1箱",7104,"p",1,0,0],["10040045","アイスコーヒー豆500G(’25)","amb","C",12,"12袋",18642,"p",1,0,0],["23240004","(袋) TFゆであずき","amb","袋",1,"1袋",188,"p",2,0,0],["25040048","BBQソース","amb","袋",1,"1袋",368,"p",1,0,1],["10040051","MONIN金木犀","amb","本",1,"1本",1476,"p",1,0,0],["29140006","ブラックペッパーグラインド","amb","袋",1,"1袋",287,"m",0,0,0],["10040039","ガムシロップ('24)","amb","C",8,"8袋",1611,"m",0,0,0],["10040043","ホットコーヒー豆200G(’25)","amb","C",24,"24袋",15346,"m",0,0,1],["25040030","精製塩","amb","袋",1,"1袋",172,"m",0,0,0],["10040050","抹茶ソース","amb","本",1,"1本",750,"m",0,0,0],["41250009","コールドカップリッド12OZS","pkg","袋",100,"100個",266,"p",4,0,0],["41250010","コールドリッド16OZ/22OZ M/L","pkg","袋",100,"100個",310,"p",3,0,0],["41150036","コールドカップ(白)M","pkg","袋",50,"50個",390,"p",3,0,0],["41150043","ポテト袋(‘25)","pkg","箱",500,"500枚",2222,"p",2,0,0],["41150040","サブラップ(’24)","pkg","包",500,"500枚",1654,"p",3,0,0],["41150035","コールドカップ(白)S","pkg","袋",100,"100個",593,"p",4,0,0],["41150037","コールドカップ(白)L","pkg","袋",50,"50個",504,"p",2,0,0],["41150034","スープカップ(白)","pkg","袋",25,"25個",332,"p",2,0,0],["41250006","パーティトレイリッド","pkg","袋",20,"20枚",1366,"p",1,0,0],["41250007","パーティトレイ","pkg","袋",20,"20枚",1763,"p",1,0,0],["41250018","スープカップリッド","pkg","袋",100,"100個",823,"p",1,0,0],["41250023","ホットカップリッド S","pkg","袋",50,"50個",297,"p",1,0,0],["41150028","チョイスマークラベル(小)","pkg","巻",1,"1巻",640,"p",1,0,0],["41250042","ストロー","pkg","C",2000,"2000本",1754,"p",1,0,0],["41150033","ホットカップ(白)S","pkg","袋",50,"50個",524,"p",1,0,0],["41250041","Tシャツバッグ(’22)","pkg","C",1500,"1500枚",4834,"p",1,0,0],["41250003","パーティトレイポリバッグ","pkg","袋",100,"100枚",1671,"m",0,0,1],["41250053","代)サラダカップ","pkg","袋",50,"50個",1827,"m",0,0,0],["41250054","代)サラダリッド","pkg","袋",50,"50個",936,"m",0,0,0],["33250025","Sラベル 白無地('23)","pkg","巻",1,"1巻",389,"m",0,0,1],["33250030","Sラベル ローストビーフ('23)","pkg","巻",1,"1巻",489,"m",0,0,1],["33250035","Sラベル チリチキン('23)","pkg","巻",1,"1巻",489,"m",0,0,1],["33260019","割りばし","pkg","袋",100,"100膳",223,"m",0,0,1],["33250037","Sラベル えびタマ('23)","pkg","巻",1,"1巻",489,"m",0,0,1],["33250033","Sラベル タマゴ('23)","pkg","巻",1,"1巻",489,"m",0,0,1],["33250027","Sラベル BLT('23)","pkg","巻",1,"1巻",489,"m",0,0,0],["33250028","Sラベル テリヤキチキン('23)","pkg","巻",1,"1巻",489,"m",0,0,0],["33250034","Sラベル ベジー('23)","pkg","巻",1,"1巻",489,"m",0,0,0],["33250036","Sラベル チーズ('23)","pkg","巻",1,"1巻",489,"m",0,0,0],["33250040","Sラベルサラダチキン('23)","pkg","巻",1,"1巻",489,"m",0,0,0],["41250024","ホットカップリッドM","pkg","袋",50,"50個",300,"m",0,0,0],["41250050","スプーン黒14cm","pkg","袋",500,"500本",2327,"m",0,0,0],["33250026","Sラベル 生ハム('23)","pkg","巻",1,"1巻",489,"m",0,0,0],["33250031","Sラベル えび('23)","pkg","巻",1,"1巻",433,"m",0,0,0],["41150015","テイクアウト紙袋4号(NB)","pkg","束",500,"500枚",1386,"m",0,0,0],["33260066","オーブンペーパー(白)","sup","箱",400,"400枚",798,"p",4,0,0],["33260081","ポリグローブ200 SS('25)","sup","袋",200,"200枚",338,"p",4,0,0],["33260080","ポリグローブ200 SSS('25)","sup","袋",200,"200枚",338,"p",2,0,0],["33260020","トイレットペーパー120m 6R","sup","袋",1,"1袋",325,"m",0,0,0],["33260037","リヴィブルー ペーパータオルミニ","sup","C",10000,"10000枚",4287,"m",0,0,0],["33260077","ブレッド保管用袋 小(’25)","sup","冊",100,"100枚",980,"m",0,0,1],["33260065","レジロールペーパーN24巻","sup","C",24,"24巻",4628,"m",0,0,1],["32160018","TシャツM-L(’25)","oth","枚",1,"1枚",702,"m",0,0,0],["32160012","ネームバッジ","oth","袋",12,"12個",757,"m",0,0,1],["32160017","TシャツS-M(’25)","oth","枚",1,"1枚",702,"m",0,0,1],["32160021","キャップ(’25)","oth","枚",1,"1枚",352,"m",0,0,1],["32160024","ハーフエプロン(’25)","oth","枚",1,"1枚",459,"m",0,0,1],["31160223","FMIコーヒーライン洗浄剤(25錠)","oth","個",1,"1個",1120,"m",0,0,1],["31160052","多目的洗剤タブレットブルー","oth","袋",10,"10個",949,"m",0,0,1],["31160225","イーエルシャイン26","oth","個",1,"1個",4687,"m",0,0,1],["31160007","アルコール除菌剤","oth","本",1,"1本",2122,"m",0,0,0],["31160001","QSRハンドソープ","oth","本",1,"1本",1917,"m",0,0,0],["31160224","FMIミルクユニット用専用剤(1L)","oth","個",1,"1個",2495,"m",0,0,0],["33160050","トマトシャーク(1本)N","oth","個",1,"1個",510,"m",0,0,0]];
function hcCfgDefault_() {
  return { on: true, vegDows: [0, 1, 3, 4, 5], genDows: [0, 1, 3, 5], cut: 11, buf: 25, lead: 1, defSales: [0, 0, 0, 0, 0, 0, 0] };
}
function hcDows_(a, def) {
  if (!Array.isArray(a)) return def.slice();
  var out = [];
  a.forEach(function (x) { var n = Math.round(Number(x)); if (n >= 0 && n <= 6 && out.indexOf(n) === -1) out.push(n); });
  return out.sort();
}
function hcNormCfg_(o) {
  var d = hcCfgDefault_(); o = o && typeof o === 'object' ? o : {};
  var num = function (v, lo, hi, def) { var n = Number(v); return isFinite(n) && n >= lo && n <= hi ? n : def; };
  var out = {
    on: o.on === undefined ? true : !!o.on,
    vegDows: hcDows_(o.vegDows, d.vegDows),
    genDows: hcDows_(o.genDows, d.genDows),
    cut: Math.round(num(o.cut, 5, 23.5, 11) * 2) / 2,
    buf: Math.round(num(o.buf, 0, 200, 25)),
    lead: Math.round(num(o.lead, 0, 3, 1)),
    defSales: d.defSales.slice()
  };
  if (Array.isArray(o.defSales)) for (var i = 0; i < 7; i++) out.defSales[i] = Math.round(num(o.defSales[i], 0, 99999999, 0));
  return out;
}
function hcCfg_() { return hcNormCfg_(readJsonKey_('hc:cfg')); }
function hcNormItem_(x) {
  if (!x || typeof x !== 'object') return null;
  var id = String(x.id == null ? '' : x.id).trim().slice(0, 20);
  var name = String(x.name == null ? '' : x.name).trim().slice(0, 60);
  if (!/^[A-Za-z0-9_-]{1,20}$/.test(id) || !name) return null;
  var num = function (v, lo, hi, def) { var n = Number(v); return isFinite(n) && n >= lo && n <= hi ? n : def; };
  var zone = HC_ZONES.indexOf(x.zone) !== -1 ? x.zone : 'oth';
  var mode = /^[spm]$/.test(String(x.mode)) ? String(x.mode) : 'm';
  var it = { id: id, name: name, zone: zone, unit: String(x.unit == null ? '' : x.unit).slice(0, 6) || '個',
             pack: Math.round(num(x.pack, 1, 100000, 1)), pu: String(x.pu == null ? '' : x.pu).slice(0, 12),
             price: Math.round(num(x.price, 0, 9999999, 0)), mode: mode,
             par: Math.round(num(x.par, 0, 9999, 0) * 4) / 4, yen: Math.round(num(x.yen, 0, 99999999, 0)),
             so: Math.round(num(x.so, 0, 99999, 0)) };     // so = thứ tự của HỆ THỐNG đặt hàng (dùng cho danh sách đặt); thứ tự kiểm kho do mảng quyết định
  if (mode === 's' && !it.yen) it.mode = 'm';
  if (x.hide) it.hide = 1;
  if (x.piece && it.pack > 1) it.piece = 1;
  // Định mức riêng cho ngày hàng tới rơi vào T7 / CN / ngày lễ (không đặt = dùng chung định mức ngày thường).
  if (x.parW !== undefined && x.parW !== null && x.parW !== '' && isFinite(Number(x.parW))) it.parW = Math.round(num(x.parW, 0, 9999, 0) * 4) / 4;          // đếm theo cái lẻ (vd. アボカド 12個/C)
  return it;
}
function hcSeedItems_() {
  return HC_SEED.map(function (r, i) {
    return hcNormItem_({ id: r[0], name: r[1], zone: r[2], unit: r[3], pack: r[4], pu: r[5], price: r[6], mode: r[7], par: r[8], yen: r[9], hide: r[10], so: i + 1 });
  }).filter(Boolean);
}
/** Danh mục: món chưa có thứ tự hệ thống (dữ liệu cũ) lấy vị trí hiện tại làm thứ tự. */
function hcFillSo_(arr) {
  var mx = 0; arr.forEach(function (it) { if (it.so > mx) mx = it.so; });
  arr.forEach(function (it, i) { if (!it.so) it.so = ++mx; });
  return arr;
}
function hcItems_() {
  var raw = kvGet_('hc:items');
  if (!raw) return hcSeedItems_();
  try { var a = JSON.parse(raw); if (Array.isArray(a)) return hcFillSo_(a.map(hcNormItem_).filter(Boolean)); } catch (e) {}
  return hcSeedItems_();
}
function hcYmd_(s) {
  s = String(s == null ? '' : s);
  if (!/^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s)) throw new Error('Ngày không hợp lệ.');
  var d = new Date(s + 'T00:00:00Z');
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw new Error('Ngày không hợp lệ.');
  return s;
}
function hcAdd_(ymd, k) { var d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + k); return d.toISOString().slice(0, 10); }
function hcDow_(ymd) { return new Date(ymd + 'T00:00:00Z').getUTCDay(); }
function hcKind_(cfg, ymd) { var w = hcDow_(ymd); return { veg: cfg.vegDows.indexOf(w) !== -1, gen: cfg.genDows.indexOf(w) !== -1 }; }
/** Ngày đặt kế tiếp (sau ymd) của nhóm; không có ngày nào thì coi như 7 ngày sau. */
function hcNextOrder_(dows, ymd) {
  for (var k = 1; k <= 7; k++) { var x = hcAdd_(ymd, k); if (dows.indexOf(hcDow_(x)) !== -1) return x; }
  return hcAdd_(ymd, 7);
}
/** Doanh thu dự kiến 1 ngày: 予算 của ngày đó (quản lý đặt) → không có thì mức mặc định theo thứ. */
function hcSalesDay_(cfg, ymd, cache) {
  var ym = ymd.slice(0, 7), d = String(Number(ymd.slice(8, 10)));
  if (!cache[ym]) cache[ym] = readDayInfo_(ym);
  var v = cache[ym][d] && cache[ym][d].b;
  if (typeof v === 'number' && v > 0) return { v: v, src: 'b' };
  var dv = cfg.defSales[hcDow_(ymd)] || 0;
  return { v: dv, src: dv ? 'd' : '' };
}
/**
 * Hàng rau đặt hôm nay (tới ngày mai) phải đủ dùng TỪ HÔM NAY tới hết ngày trước khi lô kế tiếp tới
 * (lô của ngày đặt rau kế tiếp + lead ngày). Tồn đếm sáng nay cũng nằm trong khoảng này.
 */
function hcWindow_(cfg, ymd) {
  var nxt = hcNextOrder_(cfg.vegDows, ymd), to = hcAdd_(nxt, cfg.lead - 1);   // lead 0: hàng tới ngay hôm đặt → đủ tới hôm trước
  var cache = {}, S = 0, miss = 0, days = [];
  for (var x = ymd; x <= to; x = hcAdd_(x, 1)) {
    var s = hcSalesDay_(cfg, x, cache); S += s.v; if (!s.v) miss++;
    days.push({ d: x, v: s.v, src: s.src });
    if (days.length > 10) break;
  }
  return { from: ymd, to: to, S: S, miss: miss, days: days };
}
function hcNeed_(items, cfg, win, vb) {
  var need = {}, buf = (vb !== undefined && vb !== null && isFinite(Number(vb))) ? Number(vb) : cfg.buf;
  items.forEach(function (it) {
    if (it.mode !== 's' || !it.yen) return;
    need[it.id] = Math.round(win.S * (1 + buf / 100) / it.yen * 100) / 100;
  });
  return need;
}
function hcWho_(who) { return who.r === 'mgr' ? 'm' : String(who.e); }
/** Nhân viên chỉ làm phiếu của HÔM NAY (giờ Nhật); quản lý xem/sửa được 62 ngày gần đây. */
function hcDateFor_(who, ymd) {
  var today = todayStr_();
  if (who.r !== 'mgr' || !ymd) return today;
  ymd = hcYmd_(ymd);
  if (ymd > hcAdd_(today, 7) || ymd < hcAdd_(today, -62)) throw new Error('Ngày không hợp lệ.');
  return ymd;
}
function hcSheetOut_(sh, who) {
  sh = sh || {};
  var o = {};
  ['c', 'z', 'o', 'fin', 'pl', 'win', 'sg', 'imp', 'o0', 'vb'].forEach(function (k) { if (sh[k] !== undefined) o[k] = sh[k]; });
  if (who.r === 'mgr') { if (sh.S !== undefined) o.S = sh.S; if (sh.nd !== undefined) o.nd = sh.nd; }
  return o;
}
/** Lần kiểm gần nhất TRƯỚC ngày ymd (để nhân viên so "lần trước còn bao nhiêu"). */
function hcLastBefore_(ymd) {
  var ym = ymd.slice(0, 7), months = [ym, ymShift_(ym, -1)];
  for (var m = 0; m < months.length; m++) {
    var obj = readJsonKey_('hc:' + months[m]);
    var days = Object.keys(obj).map(Number).filter(function (d) { return d > 0; }).sort(function (a, b) { return b - a; });
    for (var i = 0; i < days.length; i++) {
      var ds = months[m] + '-' + ('0' + days[i]).slice(-2);
      if (ds >= ymd) continue;
      var sh = obj[String(days[i])];
      if (sh && sh.c && Object.keys(sh.c).length) return { date: ds, c: sh.c, o: sh.fin ? (sh.o || {}) : {} };
    }
  }
  return null;
}
/** Tóm tắt cho loadMonth: hôm nay có phải ngày đặt hàng không, đã chốt chưa. */
function hcBrief_(who) {
  try {
    var cfg = hcCfg_();
    if (!cfg.on) return { on: false };
    var today = todayStr_(), kind = hcKind_(cfg, today);
    var sh = {};
    if (kind.veg || kind.gen) sh = (readJsonKey_('hc:' + today.slice(0, 7))[String(Number(today.slice(8, 10)))]) || {};
    return { on: true, today: today, kind: kind, cut: cfg.cut, vegDows: cfg.vegDows, genDows: cfg.genDows,
             fin: sh.fin || null, pl: sh.pl || null, zn: Object.keys(sh.z || {}).length };
  } catch (e) { return { on: false }; }
}
/** Trạng thái hôm nay (nhẹ) — chuông nhắc hỏi lại trước khi kêu, tránh nhắc khi người khác đã chốt. */
function hcStatus(token) { var who = auth_(token); mgrFlushMail_(); return hcBrief_(who); }
function hcLoad(token, ymd) {
  var who = auth_(token);
  var cfg = hcCfg_(), date = hcDateFor_(who, ymd);
  var items = hcItems_();
  var win = hcWindow_(cfg, date), kind = hcKind_(cfg, date);
  var obj = readJsonKey_('hc:' + date.slice(0, 7)), sh = obj[String(Number(date.slice(8, 10)))] || {};
  var need = hcNeed_(items, cfg, win, sh.vb);
  if (who.r !== 'mgr') items = items.filter(function (it) { return !it.hide; }).map(function (it) {
    var c = {}; for (var k in it) if (k !== 'yen') c[k] = it[k]; return c;          // không lộ ¥/đơn vị → không suy ra doanh thu
  });
  var cfgOut = JSON.parse(JSON.stringify(cfg));
  if (who.r !== 'mgr') { delete cfgOut.defSales; delete cfgOut.buf; }
  var out = { today: todayStr_(), date: date, kind: kind, cfg: cfgOut, items: items, sheet: hcSheetOut_(sh, who),
              need: need, win: { from: win.from, to: win.to, miss: win.miss }, last: hcLastBefore_(date) };
  if (who.r === 'mgr') { out.win.S = win.S; out.win.days = win.days; out.vb = { cur: sh.vb != null ? sh.vb : cfg.buf, def: cfg.buf, set: sh.vb != null }; }
  return out;
}
function hcMutate_(date, fn) {
  var key = 'hc:' + date.slice(0, 7), d = String(Number(date.slice(8, 10)));
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_(), obj = readMonthObject_(sheet, key);
    var sh = obj[d] && typeof obj[d] === 'object' ? obj[d] : {};
    var res = fn(sh);
    if (res === false) return sh;
    obj[d] = sh;
    pubPut_(sheet, key, obj);
    touchMod_(key);
    return sh;
  } finally { lock.releaseLock(); }
}
/** Lưu số TỒN của một khu (nhiều người kiểm nhiều khu cùng lúc: mỗi lần chỉ ghi các món gửi lên). */
function hcCount(token, ymd, zone, entriesJson) {
  var who = auth_(token), date = hcDateFor_(who, ymd);
  if (HC_ZONES.indexOf(zone) === -1) throw new Error('Khu không hợp lệ.');
  var ent; try { ent = typeof entriesJson === 'string' ? JSON.parse(entriesJson) : entriesJson; } catch (e) { ent = null; }
  if (!ent || typeof ent !== 'object' || Array.isArray(ent)) throw new Error('Dữ liệu không hợp lệ.');
  var ids = Object.keys(ent);
  if (ids.length > 300) throw new Error('Dữ liệu không hợp lệ.');
  var known = {}; hcItems_().forEach(function (it) { known[it.id] = 1; });
  var sh = hcMutate_(date, function (sh) {
    if (sh.fin && who.r !== 'mgr') throw new Error('Phiếu đặt hàng hôm nay đã chốt. Cần sửa thì nhờ quản lý mở lại.');
    sh.c = sh.c || {};
    ids.forEach(function (id) {
      if (!known[id]) return;
      var v = ent[id];
      if (v === null || v === '') { delete sh.c[id]; return; }
      var n = Number(v);
      if (!isFinite(n) || n < 0 || n > 99999) throw new Error('Số lượng không hợp lệ.');
      sh.c[id] = Math.round(n * 10000) / 10000;
    });
    sh.z = sh.z || {};
    sh.z[zone] = { by: hcWho_(who), at: Date.now() };
  });
  return hcSheetOut_(sh, who);
}
/** Chốt phiếu: lưu số đặt (máy tính + chỗ người chốt sửa tay), khoảng ngày + doanh thu dùng để tính. */
function hcFinalize(token, ymd, orderJson, sugJson, seenAt) {
  var who = auth_(token), date = hcDateFor_(who, ymd);
  var ord, sug;
  try { ord = typeof orderJson === 'string' ? JSON.parse(orderJson) : orderJson; } catch (e) { ord = null; }
  try { sug = typeof sugJson === 'string' ? JSON.parse(sugJson || '{}') : (sugJson || {}); } catch (e) { sug = {}; }
  if (!ord || typeof ord !== 'object' || Array.isArray(ord)) throw new Error('Dữ liệu không hợp lệ.');
  var known = {}; var items = hcItems_(); items.forEach(function (it) { known[it.id] = 1; });
  var clean = function (m) {
    var o = {};
    Object.keys(m || {}).slice(0, 300).forEach(function (id) {
      if (!known[id]) return;
      var n = Math.round(Number(m[id]) * 100) / 100;
      if (isFinite(n) && n > 0 && n <= 9999) o[id] = n;
    });
    return o;
  };
  var cfg = hcCfg_(), win = hcWindow_(cfg, date);
  var sh = hcMutate_(date, function (sh) {
    if (sh.fin && who.r !== 'mgr') throw new Error('Phiếu đặt hàng hôm nay đã chốt rồi.');
    var newest = 0; Object.keys(sh.z || {}).forEach(function (k) { newest = Math.max(newest, Number(sh.z[k].at) || 0); });
    if (seenAt !== undefined && seenAt !== null && newest > Number(seenAt)) throw new Error('Có người vừa nhập thêm số tồn. Xem lại rồi chốt lần nữa.');
    sh.o = clean(ord); sh.sg = clean(sug);
    sh.fin = { at: Date.now(), by: hcWho_(who) };
    sh.win = { from: win.from, to: win.to }; sh.S = win.S; sh.nd = hcNeed_(items, cfg, win, sh.vb);
  });
  return hcSheetOut_(sh, who);
}
/** Quản lý chỉnh tỉ lệ dư rau cho RIÊNG phiếu ngày đó (pct rỗng = về mức trong Cài đặt). */
function hcSetVb(token, ymd, pct) {
  var who = requireManager_(token), date = hcDateFor_(who, ymd);
  hcMutate_(date, function (sh) {
    if (sh.fin) throw new Error('Phiếu đã chốt — mở lại rồi mới đổi tỉ lệ rau.');
    if (pct === null || pct === undefined || pct === '') { delete sh.vb; return; }
    var n = Math.round(Number(pct));
    if (!isFinite(n) || n < -50 || n > 300) throw new Error('Tỉ lệ không hợp lệ.');
    sh.vb = n;
  });
  return hcLoad(token, date);
}
function hcReopen(token, ymd) {
  var who = requireManager_(token), date = hcDateFor_(who, ymd);
  var sh = hcMutate_(date, function (sh) { if (!sh.fin) return false; delete sh.fin; delete sh.pl; });
  return hcSheetOut_(sh, who);
}
/** Đánh dấu "đã nhập đơn lên hệ thống của nhà cung cấp" (オザックス). */
function hcPlaced(token, ymd, on) {
  var who = auth_(token), date = hcDateFor_(who, ymd);
  var sh = hcMutate_(date, function (sh) {
    if (!sh.fin) throw new Error('Chưa chốt phiếu đặt hàng.');
    if (on) sh.pl = { at: Date.now(), by: hcWho_(who) }; else delete sh.pl;
  });
  return hcSheetOut_(sh, who);
}
function hcSaveItems(token, itemsJson) {
  requireManager_(token);
  var a; try { a = JSON.parse(itemsJson); } catch (e) { a = null; }
  if (!Array.isArray(a) || a.length > 400) throw new Error('Dữ liệu không hợp lệ.');
  var seen = {}, out = [];
  a.forEach(function (x) { var it = hcNormItem_(x); if (it && !seen[it.id]) { seen[it.id] = 1; out.push(it); } });
  hcFillSo_(out);
  kvSet_('hc:items', JSON.stringify(out), 'danh mục đặt hàng', true);
  return out;
}
function hcSaveCfg(token, cfgJson) {
  requireManager_(token);
  var o; try { o = JSON.parse(cfgJson); } catch (e) { o = null; }
  var cfg = hcNormCfg_(o);
  kvSet_('hc:cfg', JSON.stringify(cfg), 'cài đặt đặt hàng', true);
  return cfg;
}
function hcSetActual(token, yearMonth, yen) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth);
  var v = (yen === null || yen === '' || yen === undefined) ? null : Math.round(Number(yen));
  if (v !== null && !(isFinite(v) && v >= 0 && v <= 9999999999)) throw new Error('Doanh thu không hợp lệ.');
  var obj = kvUpdate_('hc:act', function (cur) {
    cur = cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {};
    if (v === null) delete cur[ym]; else cur[ym] = v;
    return cur;
  }, 'doanh thu thực tế');
  return obj[ym] === undefined ? null : obj[ym];
}
/** Dữ liệu kiểm toán tháng (quản lý): phiếu cả tháng + lần kiểm cuối tháng trước + doanh thu từng ngày. */
function hcDash(token, yearMonth) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth), cfg = hcCfg_();
  var month = readJsonKey_('hc:' + ym), prev = readJsonKey_('hc:' + ymShift_(ym, -1));
  var pdays = Object.keys(prev).map(Number).filter(function (d) { return d > 0 && prev[String(d)] && prev[String(d)].c; }).sort(function (a, b) { return a - b; });
  var prevLast = null;
  if (pdays.length) { var pd = pdays[pdays.length - 1], pym = ymShift_(ym, -1); prevLast = { date: pym + '-' + ('0' + pd).slice(-2), sheet: prev[String(pd)] }; }
  // phiếu tháng trước có hàng giao vào đầu tháng này (đặt ngày cuối tháng, giao ngày 1)
  var prevTail = {};
  pdays.concat(Object.keys(prev).map(Number)).forEach(function (d) {
    var s = prev[String(d)]; if (s && s.fin) prevTail[ymShift_(ym, -1) + '-' + ('0' + d).slice(-2)] = { o: s.o || {}, fin: s.fin };
  });
  var n = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate(), cache = {}, sales = {};
  var endD = ym + '-' + ('0' + n).slice(-2), x0 = prevLast ? prevLast.date : ym + '-01';
  for (var x = x0; x <= endD; x = hcAdd_(x, 1)) sales[x] = hcSalesDay_(cfg, x, cache).v;
  var act = readJsonKey_('hc:act');
  return { ym: ym, cfg: cfg, items: hcItems_(), month: month, prevLast: prevLast, prevTail: prevTail, sales: sales,
           actual: act[ym] === undefined ? null : act[ym] };
}
/** Thẻ của tháng này + tháng trước: nhân viên chỉ thấy thẻ mình gửi / nhận; quản lý thấy số lượng. */
function thanksForClient_(who) {
  var all = [];
  [thxYm_(-1), thxYm_(0)].forEach(function (ym) { all = all.concat((readJsonKey_('thx:' + ym).list) || []); });
  if (who.r === 'mgr') {
    var by = {}; all.forEach(function (x) { by[x.t] = (by[x.t] || 0) + 1; });
    return { mine: all.filter(function (x) { return x.f === 'm'; }), count: by, total: all.length };
  }
  var me = String(who.e);
  return { mine: all.filter(function (x) { return x.t === me || x.f === me; }) };
}

// --- Xin đổi ca sau khi lịch đã chốt ---------------------------------------
// Lịch chốt rồi thì chỉ quản lý sửa được, nên nhân viên không tự đổi ca. Thay
// vào đó họ đánh dấu "đang tìm người đổi", app chỉ ra ai hôm đó đã báo rảnh mà
// không được xếp, hai bên tự liên hệ, rồi ghi lại người đã nhận để quản lý biết
// mà sửa. Dữ liệu: { ngày: { empId: {want:true, foundId:"..."|null} } }

function readJsonKey_(key) {
  var raw = kvGet_(key);
  if (!raw) return {};
  try { return JSON.parse(raw) || {}; } catch (e) { return {}; }
}

/** data=null nghĩa là huỷ yêu cầu đổi ca. Nhân viên chỉ ghi được cho chính
 *  mình (requireCanEdit_), quản lý ghi/xoá được cho bất kỳ ai. */
function saveSwapEntry(token, yearMonth, day, empId, data) {
  var who = requireCanEdit_(token, empId);
  var ym = assertYearMonth_(yearMonth), d = String(Number(day)), ev = null, newAsk = [];
  if (!(Number(d) >= 1 && Number(d) <= 31)) throw new Error('Ngày không hợp lệ.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_(), key = 'swap:' + ym, obj = readMonthObject_(sheet, key);
    if (!obj[d]) obj[d] = {};
    var old = obj[d][empId] || null;
    var prevAsk = old && !old.done ? swapAskIds_(old) : [];
    // Ghép với bản đang lưu: phần NGƯỜI KHÁC ghi (nhận làm thay, đồng ý/không) không bị mất
    // khi chủ yêu cầu lưu lại từ bản trên máy (có thể cũ hơn).
    var val = normSwap_(data, old, who.r === 'mgr');
    if (val) obj[d][empId] = val; else delete obj[d][empId];
    writeMonthObject_(sheet, key, obj, 'đổi ca', false);
    // Người VỪA được nhờ (chọn / ghép) → thư riêng cho họ. Không gửi cho cả tiệm.
    if (val) newAsk = swapAskIds_(val).filter(function (x) { return x !== String(empId) && prevAsk.indexOf(x) === -1; });
    // Sự kiện cho quản lý (ghi SAU khi nhả khoá — không lồng khoá)
    if (who.r === 'emp') {
      var isNew = val && (!old || (old.done && !val.done) || Number(val.at) !== Number(old.at));
      if (isNew) ev = { k: val.urgent ? 'urgent' : val.keep ? 'tc' : 'swap', t: val.reason || '' };
      else if (val && val.mgr && !(old && old.mgr)) ev = { k: 'help', t: '' };
      else if (!val && old && !old.done) ev = { k: 'cancel', t: '', drop: true };
    }
    return val;            // chỉ trả về ô của chính người này (không lộ lý do báo bận của người khác)
  } finally {
    lock.releaseLock();
    if (ev && ev.drop && mgrEventDropPending_(empId, ym, Number(d))) ev = null;     // hoàn tác trong 60 giây: như chưa từng báo
    if (ev) mgrEvent_(ev.k, empId, ym, Number(d), ev.t);
    if (newAsk.length) staffMailAsk_(ym, Number(d), empId, newAsk, val);
  }
}

/**
 * Yêu cầu đổi ca / báo bận đột xuất:
 * { want, foundId, parts:[{id,from,to}], gaps:[{from,to}], mgr, urgent, reason, at, keep:{from,to}, tc,
 *   vol:{empId:{from,to,at}}, ans:{empId:{ok,at}}, done:{at} }
 *  parts  = ghép nhiều người làm ngắn; gaps = khung còn trống (nhờ quản lý)
 *  mgr    = đã báo quản lý; urgent = báo bận đột xuất (lý do chỉ quản lý thấy)
 *  vol    = người tự nhận làm thay; ans = người được nhờ trả lời; done = quản lý đã xử lý
 */
function normSwap_(d, old, isMgr) {
  if (!d) return null;
  // Yêu cầu MỚI sau khi quản lý đã xử lý yêu cầu cũ: không mang theo người nhận / câu trả lời cũ.
  var fresh = !isMgr && old && old.done && (d.fresh || Number(d.at) > Number(old.done.at));
  if (fresh) old = null;
  var num = function (x) { var n = Number(x); return isFinite(n) ? Math.round(n * 4) / 4 : NaN; };
  var o = { want: true };
  o.foundId = d.foundId ? String(d.foundId).slice(0, 40) : null;
  var parts = (Array.isArray(d.parts) ? d.parts : []).slice(0, 4).map(function (p) {
    return { id: String((p && p.id) || '').slice(0, 40), from: num(p && p.from), to: num(p && p.to) };
  }).filter(function (p) { return p.id && p.to > p.from && p.from >= 0 && p.to <= 30; });
  if (parts.length) o.parts = parts;
  var gaps = (Array.isArray(d.gaps) ? d.gaps : []).slice(0, 4).map(function (g) {
    return { from: num(g && g.from), to: num(g && g.to) };
  }).filter(function (g) { return g.to > g.from && g.from >= 0 && g.to <= 30; });
  if (gaps.length) o.gaps = gaps;
  if (d.mgr) o.mgr = true;
  if (d.urgent) o.urgent = true;
  // Xin đổi giờ (đi trễ / về sớm / rút ngắn): keep = khung giờ VẪN làm; phần còn lại cần người thay.
  if (d.keep && !d.urgent) {
    var kf = num(d.keep.from), kt = num(d.keep.to);
    if (kt > kf && kf >= 0 && kt <= 30) { o.keep = { from: kf, to: kt }; o.tc = /^(late|early|short)$/.test(String(d.tc)) ? String(d.tc) : 'short'; }
  }
  if (d.reason) o.reason = String(d.reason).slice(0, 120);
  // Thời điểm theo ĐỒNG HỒ MÁY CHỦ khi là yêu cầu mới (đồng hồ điện thoại có thể lệch).
  o.at = (d.fresh || !old) && !isMgr ? Date.now() : (Number(d.at) || (old && old.at) || Date.now());
  var vol = (old && old.vol) || {};
  if (Object.keys(vol).length) o.vol = vol;
  var asked = {}, ans = {};
  if (o.foundId) asked[o.foundId] = 1;
  (o.parts || []).forEach(function (p) { asked[p.id] = 1; });
  Object.keys((old && old.ans) || {}).forEach(function (k) { if (asked[k]) ans[k] = old.ans[k]; });
  if (Object.keys(ans).length) o.ans = ans;
  // "Đã xử lý" chỉ quản lý đặt; chủ yêu cầu lưu lại thì giữ nguyên trạng thái đó.
  if (isMgr) { if (d.done) { o.done = { at: (old && old.done && old.done.at) || Date.now() }; if (d.done.rej) o.done.rej = true; } }
  // Nhân viên lưu lại (vd. bản trên máy cũ hơn) không được xoá mất "đã xử lý / đã từ chối" của quản lý;
  // chỉ một yêu cầu MỚI (thời điểm gửi sau lúc quản lý xử lý) mới mở lại.
  else if (old && old.done) o.done = old.done;
  return o;
}

/**
 * Nhân viên KHÁC trả lời một yêu cầu đổi ca:
 *  'vol'   tự nhận làm thay khung from–to  · 'unvol' rút lại
 *  'yes' / 'no'  người được nhờ đồng ý / không làm được
 */
function swapRespond(token, yearMonth, day, ownerId, action, from, to) {
  var who = auth_(token);
  if (who.r !== 'emp') throw new Error('Chỉ nhân viên mới trả lời được.');
  var me = String(who.e), ym = assertYearMonth_(yearMonth), d = String(Number(day));
  ownerId = String(ownerId || '');
  if (!ownerId || ownerId === me) throw new Error('Yêu cầu không hợp lệ.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_(), key = 'swap:' + ym, obj = readMonthObject_(sheet, key);
    var e = obj[d] && obj[d][ownerId];
    if (!e || !e.want) throw new Error('Yêu cầu đổi ca này không còn nữa.');
    if (e.done) throw new Error('Quản lý đã xử lý yêu cầu này rồi.');
    if (action === 'vol') {
      var f = Math.round(Number(from) * 4) / 4, t = Math.round(Number(to) * 4) / 4;
      if (!(isFinite(f) && isFinite(t) && t > f && f >= 0 && t <= 30)) throw new Error('Khung giờ không hợp lệ.');
      // Chỉ nhận trong giờ ca của người cần thay.
      // Chỉ theo lịch nhân viên được phép thấy (chưa công bố mà đang ẩn nháp thì coi như không có).
      var own = ((staffVisibleSched_(ym, readMonthObject_(sheet, 'schedule:' + ym))[d] || {})[ownerId]) || null;
      var segs = own && !own.off && own.shifts ? own.shifts.filter(function (x) { return !x.isSupport; }) : [];
      if (!segs.length) throw new Error('Người này không còn ca ngày đó.');
      var lo = Math.min.apply(null, segs.map(function (x) { return Number(x.start); })), hi = Math.max.apply(null, segs.map(function (x) { return Number(x.end); }));
      f = Math.max(f, lo); t = Math.min(t, hi);
      if (!(t > f)) throw new Error('Khung giờ nằm ngoài ca cần thay.');
      e.vol = e.vol || {};
      e.vol[me] = { from: f, to: t, at: Date.now() };
    } else if (action === 'unvol') {
      if (e.vol) delete e.vol[me];
    } else if (action === 'yes' || action === 'no') {
      var asked = String(e.foundId || '') === me || (e.parts || []).some(function (p) { return String(p.id) === me; });
      if (!asked) throw new Error('Bạn không nằm trong yêu cầu này.');
      e.ans = e.ans || {};
      e.ans[me] = { ok: action === 'yes', at: Date.now() };
    } else throw new Error('Thao tác không hợp lệ.');
    writeMonthObject_(sheet, key, obj, 'đổi ca', false);
    var out = {}; for (var k in e) if (k !== 'reason') out[k] = e[k];   // không lộ lý do báo bận
    return out;
  } finally {
    lock.releaseLock();
  }
}

/** Nhân viên thấy yêu cầu đổi ca của mọi người (để nhận làm thay) nhưng KHÔNG thấy lý do báo bận của người khác. */
function swapsForClient_(who, ym) {
  var all = readJsonKey_('swap:' + ym);
  if (who.r === 'mgr') return all;
  var me = String(who.e), out = {};
  Object.keys(all).forEach(function (d) {
    out[d] = {};
    Object.keys(all[d] || {}).forEach(function (id) {
      var e = all[d][id]; if (!e) return;
      if (String(id) === me) { out[d][id] = e; return; }
      var c = {}; for (var k in e) if (k !== 'reason') c[k] = e[k];
      out[d][id] = c;
    });
  });
  return out;
}

/**
 * Nhân viên tự KHOÁ lịch tháng của mình.
 *
 * Khoá rồi thì bộ xếp lịch nháp không đụng vào ngày nào của người này nữa —
 * kể cả chế độ "Xếp lại từ đầu". Quản lý vẫn sửa được nhưng app sẽ hỏi lại một
 * câu, để không lỡ tay đè mất lịch người ta đã chốt với gia đình, trường học.
 *
 * requireCanEdit_ nên nhân viên chỉ khoá/mở được của chính mình.
 */
function setEmployeeMonthLock(token, yearMonth, empId, on) {
  yearMonth = assertYearMonth_(yearMonth);
  requireCanEdit_(token, empId);
  // Đọc – sửa – ghi trong một lượt khoá bằng hàm cấp thấp (không gọi kvGet_/
  // kvSet_ bên trong: LockService không tái nhập được).
  var key = 'emplock:' + yearMonth;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_();
    var obj = readMonthObject_(sheet, key);
    if (on) obj[empId] = true; else delete obj[empId];
    writeMonthObject_(sheet, key, obj, 'khoá đăng ký', false);
  } finally {
    lock.releaseLock();
  }
  return true;
}

// --- Chốt lịch tháng ---------------------------------------------------------
// Sau khi quản lý bấm chốt, nhân viên KHÔNG còn sửa được ca của chính mình nữa
// (trước đây họ vẫn đổi được giờ sau khi bảng đã in ra, làm bảng trên app và
// bảng dán tường lệch nhau). Yêu cầu nghỉ vẫn gửi được bình thường.

// lock:<YM> = '1' chốt cả tháng · 'h1' chỉ chốt nửa đầu (ngày 1–HALF_SPLIT) · '0'/trống = nháp.
// Chốt nửa đầu: nửa sau vẫn là nháp — nhân viên vẫn khai đăng ký, máy xếp nháp chỉ xếp nửa sau.
function readLockMode_(yearMonth) { var v = kvGet_('lock:' + yearMonth); return v === '1' ? 'all' : (v === 'h1' ? 'h1' : ''); }
function readLock_(yearMonth) { return readLockMode_(yearMonth) === 'all'; }
/** Ngày này đã chốt chưa (chốt cả tháng, hoặc chốt nửa đầu mà ngày thuộc nửa đầu). */
function dayLocked_(yearMonth, day) {
  var m = readLockMode_(yearMonth);
  return m === 'all' || (m === 'h1' && Number(day) <= HALF_SPLIT);
}

function setMonthLock(token, yearMonth, locked, metaJson, scope) {
  yearMonth = assertYearMonth_(yearMonth);
  requireManager_(token);
  var validYm = /^\d{4}-\d{2}$/.test(String(yearMonth));
  var pubE = null;
  // Cờ khoá + lịch sử công bố ghi chung một lượt khoá (xem pubOnLock_).
  // scope khi MỞ khoá: 'h2' = chỉ mở kỳ 2 (16–cuối), kỳ 1 vẫn công bố; còn lại = mở cả tháng.
  if (validYm) pubE = pubOnLock_(String(yearMonth), locked ? (scope === 'h1' ? 'h1' : 'all')
                                                    : (scope === 'h2' && readLockMode_(String(yearMonth)) === 'all' ? 'u2' : ''));
  else kvSet_('lock:' + yearMonth, locked ? (scope === 'h1' ? 'h1' : '1') : '0');
  // Chốt & công bố = lịch này thành BẢN CHÍNH THỨC: tự chép vào ô kế hoạch "F".
  // Sau đó có sửa lung tung vẫn quay lại được đúng bản đã công bố.
  if (locked && /^\d{4}-\d{2}$/.test(String(yearMonth))) {
    try {
      var sched = kvGet_('schedule:' + yearMonth) || '{}';
      var meta = {};
      try { meta = JSON.parse(metaJson || '{}') || {}; } catch (e0) { meta = {}; }
      kvSet_('plan:' + PLAN_OFFICIAL + ':' + yearMonth, sched, 'bản chính thức (chốt lịch)', true);
      var all = readJsonKey_('planmeta:' + yearMonth);
      all[PLAN_OFFICIAL] = { at: Date.now(), name: String(meta.name || '').slice(0, 40), stats: meta.stats || {}, official: true };
      all.active = PLAN_OFFICIAL;
      kvSet_('planmeta:' + yearMonth, JSON.stringify(all));
    } catch (e) { /* chốt lịch vẫn thành công dù chép bản chính thức lỗi */ }
  }
  // Công bố → thư cho nhân viên đã đăng ký nhận (ca của chính họ).
  if (locked && validYm && pubE && pubE.k === 'pub' && pubE.newDays && pubE.newDays.length) staffMailPublish_(String(yearMonth), pubE.newDays);
  return pubE ? { ok: true, pub: pubE } : true;
}

// ===========================================================================
// LỊCH SỬ CÔNG BỐ — chống thao tác nhầm mà không thêm thao tác
// ---------------------------------------------------------------------------
// • Mỗi lần chốt & công bố = một bản có ngày giờ, giữ mãi (không ghi đè nhau).
// • Sau khi công bố, mỗi lần quản lý sửa một ca trong ngày ĐÃ công bố, máy chủ
//   tự ghi "Sửa #n": ngày nào, ai, giờ cũ → giờ mới (sửa liền tay trong 15 phút
//   gộp thành một lần). Quản lý không phải bấm "lưu phiên bản" gì cả.
// • "Quay về bản này" ở bất kỳ dòng nào; trước khi quay về, bản hiện tại được
//   cất vào bak + History, nên quay nhầm vẫn quay lại được.
// • Thao tác CẢ THÁNG (tự xếp, chép tháng trước, xoá cả tháng, đổi kế hoạch,
//   hoàn tác, khôi phục sao lưu) KHÔNG BAO GIỜ đè ngày đã công bố — máy chủ giữ
//   nguyên những ngày đó, dù trình duyệt gửi lên gì.
// • Nhân viên bị đổi ca sau công bố thấy thông báo trong app; bấm "Đã xem" thì
//   quản lý thấy ✓ bên cạnh tên người đó.
//
// pub:<YM>          {seq, list:[{n,k,at,last,sc,ch,ver,src}]}  k = pub | edit | restore | unlock
//                   ch = [{d, e, f, t}]  (ngày, nhân viên, ca trước, ca sau; null = không có ca)
// pubcur:<YM>       {ngày: {empId: ca}} — bản ĐÃ CÔNG BỐ hiện hành, chỉ các ngày đã công bố
// pubsnap:<YM>:<n>  bản chụp các ngày thuộc lần công bố n
// puback:<YM>       {empId: ms} — nhân viên đã xem thay đổi tới lúc nào
// Tất cả ghi TRONG cùng lượt khoá với lịch xếp, bằng pubPut_ (không xin khoá lần nữa).

var PUB_EDIT_MERGE_MS = 15 * 60 * 1000;
var PUB_MAX = 150;

/** Chữ ký của một ô ca: chỉ những gì nhân viên cần biết (nghỉ, giờ vào/ra, giờ nghỉ giải lao). */
function pubSig_(e) {
  if (!e) return '';
  if (e.off) return 'off';
  // Ca "tới L" (đóng cửa): so bằng chữ L, không so số giờ — đổi giờ đóng cửa của ngày không phải là đổi ca.
  return (e.shifts || []).map(function (x) {
    return [x.start, x.endAtClose ? 'L' : x.end, x.breakStart == null ? '' : x.breakStart, x.breakEnd == null ? '' : x.breakEnd].join(',');
  }).join('|');
}

function pubPut_(sheet, key, obj) {
  var json = typeof obj === 'string' ? obj : JSON.stringify(obj);
  var row = findRow_(sheet, key);
  if (row === -1) appendKeyValue_(sheet, key, json); else writeCellValue_(sheet, row, json);
  putCacheSafe_(key, json);
}

/** Chế độ chốt đọc THẲNG từ sheet (dùng khi đang giữ khoá, tránh bản cache cũ). */
function pubLockModeRaw_(sheet, ym) {
  var row = findRow_(sheet, 'lock:' + ym);
  var v = row === -1 ? '' : String(readCellValue_(sheet, row) || '');
  return v === '1' ? 'all' : (v === 'h1' ? 'h1' : '');
}

function pubInScope_(sc) {
  return function (d) { return sc === 'all' || Number(d) <= HALF_SPLIT; };
}

/** Khác nhau giữa hai bản lịch (chỉ các ngày dayOk), theo từng người. */
function pubDiff_(a, b, dayOk) {
  a = a || {}; b = b || {};
  var out = [], days = {};
  Object.keys(a).forEach(function (d) { days[d] = 1; });
  Object.keys(b).forEach(function (d) { days[d] = 1; });
  Object.keys(days).sort(function (x, y) { return Number(x) - Number(y); }).forEach(function (d) {
    if (!/^\d+$/.test(d) || !dayOk(d)) return;
    var A = a[d] || {}, B = b[d] || {}, ids = {};
    Object.keys(A).forEach(function (k) { ids[k] = 1; });
    Object.keys(B).forEach(function (k) { ids[k] = 1; });
    Object.keys(ids).forEach(function (e) {
      if (pubSig_(A[e]) !== pubSig_(B[e])) out.push({ d: Number(d), e: e, f: A[e] || null, t: B[e] || null });
    });
  });
  return out;
}

/** Thêm một dòng vào nhật ký. Sửa liên tiếp trong 15 phút gộp vào dòng "Sửa" trước đó. */
function pubRecord_(sheet, ym, e) {
  var key = 'pub:' + ym, log = readMonthObject_(sheet, key);
  var list = log.list || [], now = Date.now(), last = list[list.length - 1];
  if (e.k === 'edit' && last && last.k === 'edit' && (now - (last.last || last.at)) < PUB_EDIT_MERGE_MS &&
      (last.src || '') === (e.src || '')) {
    (e.ch || []).forEach(function (c) {
      var x = null;
      for (var i = 0; i < last.ch.length; i++) if (last.ch[i].d === c.d && String(last.ch[i].e) === String(c.e)) { x = last.ch[i]; break; }
      if (x) x.t = c.t; else last.ch.push(c);
    });
    last.ch = last.ch.filter(function (x) { return pubSig_(x.f) !== pubSig_(x.t); });
    last.last = now;
    if (!last.ch.length) list.pop();            // sửa rồi sửa lại như cũ → không còn gì để ghi
    e = last;
  } else {
    e.n = (Number(log.seq) || 0) + 1; log.seq = e.n;
    e.at = now; e.last = now;
    if (WHO_ && WHO_.r === 'mgr') e.by = 'm';
    list.push(e);
  }
  // Giới hạn độ dài: bỏ dòng sửa cũ nhất trước, bản công bố giữ lại lâu nhất.
  while (list.length > PUB_MAX) {
    var drop = -1;
    for (var j = 0; j < list.length; j++) if (list[j].k !== 'pub') { drop = j; break; }
    var gone = list.splice(drop === -1 ? 0 : drop, 1)[0];
    log.dropped = (log.dropped || []).concat([Number(gone.n)]).slice(-300);   // restorePubVersion biết mà từ chối
    if (gone.k === 'pub') {
      var sr = findRow_(sheet, 'pubsnap:' + ym + ':' + gone.n);
      if (sr !== -1) { sheet.deleteRow(sr); ROWIDX_ = {}; }
    }
  }
  log.list = list;
  pubPut_(sheet, key, log);
  return e;
}

/** Gọi TRONG lượt khoá, ngay sau khi ghi lịch xếp: ghi lại thay đổi trên ngày đã công bố. */
function pubTrack_(sheet, ym, oldObj, newObj, src) {
  try {
    var mode = pubLockModeRaw_(sheet, ym);
    if (!mode) return;
    var ch = pubDiff_(oldObj, newObj, pubInScope_(mode === 'all' ? 'all' : 'h1'));
    if (!ch.length) return;
    var cur = readMonthObject_(sheet, 'pubcur:' + ym), touched = false;
    ch.forEach(function (c) {
      var d = String(c.d);
      if (!Object.prototype.hasOwnProperty.call(cur, d)) return;   // tháng chốt trước khi có tính năng này
      if (c.t) cur[d][c.e] = c.t; else delete cur[d][c.e];
      touched = true;
    });
    if (touched) pubPut_(sheet, 'pubcur:' + ym, cur);
    pubRecord_(sheet, ym, { k: 'edit', ch: ch, src: src || '' });
    // Thư đổi lịch: chỉ cho người có ca bị sửa. Ghi vào hàng chờ 'smqp' (trong khoá này),
    // trình kích hoạt 5 phút sau gộp theo người rồi gửi (xem staffMailPendingFlush_).
    var pend = readMonthObject_(sheet, 'smqp'); pend = Array.isArray(pend) ? pend : [];
    ch.forEach(function (c) { pend.push({ ym: ym, d: c.d, e: String(c.e), f: c.f, t: c.t, at: Date.now() }); });
    pubPut_(sheet, 'smqp', pend.slice(-400));
    ensureMailTrigger_(true);
  } catch (e) { /* nhật ký lỗi thì bỏ qua, KHÔNG chặn việc lưu ca */ }
}

/**
 * Ghi đè cả tháng lịch xếp (tự xếp, chép tháng trước, xoá cả tháng, đổi kế hoạch,
 * hoàn tác, khôi phục). Ngày ĐÃ CÔNG BỐ luôn giữ nguyên bản trên máy chủ, trừ các
 * ngày quản lý chỉ định rõ (allow — vd. "xoá ca ngày đang xem"), và những ngày đó
 * được ghi vào lịch sử như một lần sửa.
 * Trả về { ok, kept:[ngày đã giữ nguyên vì đã công bố] }.
 */
function schedBulkWrite_(ym, newRaw, reason, allow) {
  var next;
  try { next = typeof newRaw === 'string' ? (JSON.parse(newRaw) || {}) : (newRaw || {}); }
  catch (e) { throw new Error('Dữ liệu lịch không hợp lệ.'); }
  if (typeof next !== 'object' || Array.isArray(next)) throw new Error('Dữ liệu lịch không hợp lệ.');
  var allowSet = {};
  (Array.isArray(allow) ? allow : []).forEach(function (d) { allowSet[String(Number(d))] = true; });
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  var kept = [];
  try {
    var sheet = getSheet_(), key = 'schedule:' + ym;
    var mode = pubLockModeRaw_(sheet, ym);            // đọc trong lượt khoá: không lệch với lần chốt đang diễn ra
    var row = findRow_(sheet, key);
    var oldRaw = row === -1 ? '' : (readCellValue_(sheet, row) || '');
    var old = {};
    try { old = oldRaw ? (JSON.parse(oldRaw) || {}) : {}; } catch (e1) { old = {}; }
    if (mode) {
      var inScope = pubInScope_(mode === 'all' ? 'all' : 'h1');
      for (var d = 1; d <= 31; d++) {
        var ds = String(d);
        if (!inScope(ds) || allowSet[ds]) continue;
        var o = {}, n = {}; o[ds] = old[ds]; n[ds] = next[ds];
        if (pubDiff_(o, n, function () { return true; }).length) kept.push(d);
        if (old[ds]) next[ds] = old[ds]; else delete next[ds];
      }
    }
    if (oldRaw) {
      pubPut_(sheet, 'bak:schedule:' + ym, oldRaw);    // hoàn tác được 1 bước
      // Nhớ những ngày đã công bố mà lần ghi này được phép đổi — để hoàn tác cũng đổi lại được đúng những ngày đó.
      pubPut_(sheet, 'bakallow:schedule:' + ym, Object.keys(allowSet).map(Number));
    }
    writeMonthObject_(sheet, key, next, reason || 'ghi cả tháng', true);
  } finally {
    lock.releaseLock();
  }
  return { ok: true, kept: kept };
}

/**
 * Chốt / mở khoá: ghi cờ khoá + dòng nhật ký + bản chụp trong CÙNG một lượt khoá,
 * để không ai lưu ca chen vào giữa lúc "đã khoá mà chưa có bản chụp".
 * Bận quá không lấy được khoá thì báo lỗi (không âm thầm chốt thiếu bản chụp).
 */
function pubOnLock_(ym, sc) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_();
    pubPut_(sheet, 'lock:' + ym, sc === 'all' ? '1' : ((sc === 'h1' || sc === 'u2') ? 'h1' : '0'));
    if (!sc) return pubRecord_(sheet, ym, { k: 'unlock' });
    if (sc === 'u2') return pubRecord_(sheet, ym, { k: 'unlock', sc: 'h2' });    // mở lại kỳ 2, kỳ 1 vẫn công bố
    var sched = readMonthObject_(sheet, 'schedule:' + ym), inScope = pubInScope_(sc);
    var snap = {};
    Object.keys(sched).forEach(function (d) { if (/^\d+$/.test(d) && inScope(d)) snap[d] = sched[d]; });
    var cur = readMonthObject_(sheet, 'pubcur:' + ym);
    // So với bản đã công bố trước đó (chỉ những ngày ĐÃ từng công bố): mở khoá,
    // sửa, rồi công bố lại thì nhân viên bị đổi ca vẫn được báo.
    var ch = pubDiff_(cur, snap, function (d) { return inScope(d) && Object.prototype.hasOwnProperty.call(cur, d); });
    // Kỳ này chưa công bố ngày nào trước đó → công bố lần đầu (mail cả tháng cho mọi người).
    // Đã công bố rồi mà sửa lại → chỉ mail người có ca bị đổi (xem setMonthLock).
    // Ngày MỚI công bố lần đầu (vd. nửa đầu rồi tới nửa sau) → thư công bố cho cả nhóm, chỉ các ngày đó.
    var newDays = Object.keys(snap).filter(function (d) { return /^\d+$/.test(d) && !Object.prototype.hasOwnProperty.call(cur, d); })
      .map(Number).sort(function (a, b) { return a - b; });
    var e = pubRecord_(sheet, ym, { k: 'pub', sc: sc, ch: ch });
    e.newDays = newDays;     // chỉ dùng trong lượt này, không lưu
    pubPut_(sheet, 'pubsnap:' + ym + ':' + e.n, snap);
    var nd = sc === 'all' ? 31 : HALF_SPLIT;
    for (var d = 1; d <= nd; d++) cur[String(d)] = snap[String(d)] || {};
    pubPut_(sheet, 'pubcur:' + ym, cur);
    return e;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Quay về đúng trạng thái sau dòng nhật ký số n (bản công bố, hoặc sau lần sửa n).
 * Chỉ các ngày thuộc phạm vi lần công bố gốc được thay; nửa sau đang nháp giữ nguyên.
 */
function restorePubVersion(token, yearMonth, n) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth);
  n = Number(n);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_();
    var log0 = readMonthObject_(sheet, 'pub:' + ym);
    var list = log0.list || [];
    var idx = -1;
    for (var i = 0; i < list.length; i++) if (Number(list[i].n) === n) { idx = i; break; }
    if (idx === -1 || list[idx].k === 'unlock') throw new Error('Không tìm thấy bản này.');
    var j = -1;
    for (var k = idx; k >= 0; k--) if (list[k].k === 'pub') { j = k; break; }
    if (j === -1) throw new Error('Bản này có từ trước khi app ghi lịch sử công bố, không dựng lại được.');
    var baseRaw = findRow_(sheet, 'pubsnap:' + ym + ':' + list[j].n);
    if (baseRaw === -1) throw new Error('Bản chụp lần công bố này không còn, không dựng lại được.');
    var state = readMonthObject_(sheet, 'pubsnap:' + ym + ':' + list[j].n);
    for (var m = j + 1; m <= idx; m++) {
      if (list[m].k !== 'edit' && list[m].k !== 'restore') continue;
      (list[m].ch || []).forEach(function (c) {
        var d = String(c.d);
        if (!state[d]) state[d] = {};
        if (c.t) state[d][c.e] = c.t; else delete state[d][c.e];
      });
    }
    // Dòng nhật ký nằm giữa đã bị cắt bớt (quá dài) → dựng lại sẽ sai, thà báo lỗi.
    var dropped = log0.dropped || [];
    for (var q = 0; q < dropped.length; q++)
      if (dropped[q] > Number(list[j].n) && dropped[q] < n) throw new Error('Lịch sử giữa hai bản này đã quá cũ và bị dọn bớt, không dựng lại chính xác được.');
    // Người đã xoá khỏi danh sách nhân viên thì không đưa trở lại.
    // (đọc thẳng, KHÔNG qua readEmployees_: hàm đó có thể gọi kvSet_ → xin khoá lần hai)
    var alive = {}, nAlive = 0;
    try {
      (JSON.parse(readCellValue_(sheet, findRow_(sheet, 'employees')) || '[]') || []).forEach(function (em) {
        if (em && em.id) { alive[String(em.id)] = true; nAlive++; }
      });
    } catch (eE) { nAlive = 0; }
    if (nAlive) Object.keys(state).forEach(function (d) {
      Object.keys(state[d] || {}).forEach(function (id) { if (!alive[String(id)]) delete state[d][id]; });
    });
    var sc = list[j].sc === 'h1' ? 'h1' : 'all', inScope = pubInScope_(sc), nd = sc === 'all' ? 31 : HALF_SPLIT;
    var sched = readMonthObject_(sheet, 'schedule:' + ym);
    var next = JSON.parse(JSON.stringify(sched));
    for (var d = 1; d <= nd; d++) {
      var ds = String(d);
      if (state[ds] && Object.keys(state[ds]).length) next[ds] = state[ds]; else delete next[ds];
    }
    var ch = pubDiff_(sched, next, inScope);
    if (!ch.length) return { ok: true, changed: 0 };
    pubPut_(sheet, 'bak:schedule:' + ym, JSON.stringify(sched));
    var al = []; for (var da = 1; da <= nd; da++) al.push(da);
    pubPut_(sheet, 'bakallow:schedule:' + ym, al);        // "Hoàn tác" quay lại được cả những ngày này
    writeMonthObject_(sheet, 'schedule:' + ym, next, 'quay về bản #' + n, true, true);
    var cur = readMonthObject_(sheet, 'pubcur:' + ym);
    for (var d2 = 1; d2 <= nd; d2++) cur[String(d2)] = state[String(d2)] || {};
    pubPut_(sheet, 'pubcur:' + ym, cur);
    var e = pubRecord_(sheet, ym, { k: 'restore', ver: n, ch: ch });
    return { ok: true, changed: ch.length, n: e.n };
  } finally {
    lock.releaseLock();
  }
}

/** Nhân viên bấm "Đã xem" các thay đổi ca của mình. */
function ackPubChanges(token, yearMonth) {
  var who = auth_(token);
  var ym = assertYearMonth_(yearMonth);
  if (who.r !== 'emp') return 0;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_(), key = 'puback:' + ym;
    var obj = readMonthObject_(sheet, key), now = Date.now();
    obj[String(who.e)] = now;
    pubPut_(sheet, key, obj);
    return now;
  } finally {
    lock.releaseLock();
  }
}

function pubForClient_(who, ym) {
  var log = readJsonKey_('pub:' + ym), acks = readJsonKey_('puback:' + ym);
  var list = log.list || [];
  if (who.r === 'mgr') return { list: list, acks: acks };
  var me = String(who.e);
  return {
    list: list.filter(function (x) { return x.k !== 'unlock'; }).map(function (x) {
      return { n: x.n, k: x.k, at: x.at, last: x.last, sc: x.sc, ver: x.ver,
               ch: (x.ch || []).filter(function (c) { return String(c.e) === me; }) };
    }),
    ack: Number(acks[me]) || 0
  };
}

// --- Giờ đóng cửa (cột "L") riêng cho từng ngày -----------------------------
// Lưu ở khoá riêng "close:YYYY-MM" dạng {"1":21, "15":20.5}. Ngày nào không có
// trong đó thì hiểu là giờ mặc định (21:00) do phía giao diện quy định.

function readCloseHours_(yearMonth) {
  var raw = kvGet_('close:' + yearMonth);
  if (!raw) return {};
  try { return JSON.parse(raw) || {}; } catch (e) { return {}; }
}

/** hour=null nghĩa là trả ngày đó về giờ đóng cửa mặc định. */
function saveCloseHour(token, yearMonth, day, hour) {
  yearMonth = assertYearMonth_(yearMonth);
  day = assertDay_(yearMonth, day);
  requireManager_(token);
  var h = (hour === null || hour === undefined || hour === '') ? null : Number(hour);
  if (h !== null && (!isFinite(h) || h < 12 || h > 26)) {
    throw new Error('Giờ đóng cửa phải nằm trong khoảng 12 đến 26.');
  }
  var key = 'close:' + yearMonth;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_();
    var obj = readMonthObject_(sheet, key);
    if (h === null) delete obj[day]; else obj[day] = h;
    writeMonthObject_(sheet, key, obj);
  } finally {
    lock.releaseLock();
  }
  return true;
}

// --- 予算 (dự toán doanh thu) & ghi chú riêng từng ngày ----------------------
// Lưu chung một khoá "dayinfo:YYYY-MM" dạng {"19": {b: 180000, n: "..."}}.
// b = 予算 tính bằng yên, n = ghi chú / dặn dò nhân viên hôm đó.
//
// ⚠️ 予算 KHÔNG gửi xuống máy nhân viên (xem loadMonth): ai có link đều mở được
// app, mà doanh thu dự kiến của quán thì không nên ra ngoài. Nó chỉ hiện với
// quản lý và in lên bảng dán trong quán. Ghi chú thì ngược lại — viết ra là để
// nhân viên đọc, nên gửi cho tất cả.

var NOTE_MAX_LEN   = 400;      // dặn dò trong ngày, cho xuống dòng
var BUDGET_MAX_YEN = 99999999;

function readDayInfo_(yearMonth) {
  var raw = kvGet_('dayinfo:' + yearMonth);
  if (!raw) return {};
  try { return JSON.parse(raw) || {}; } catch (e) { return {}; }
}

/** Tách ra 2 bản đồ phẳng cho giao diện dùng cho tiện. */
function splitDayInfo_(info) {
  var budgets = {}, notes = {}, hols = {};
  Object.keys(info).forEach(function (d) {
    var v = info[d] || {};
    if (typeof v.b === 'number') budgets[d] = v.b;
    if (v.n) notes[d] = String(v.n);
    // h = 1 quản lý đánh dấu là ngày lễ, h = 0 bỏ đánh dấu dù app tự đoán là lễ.
    if (v.h === 1 || v.h === 0) hols[d] = v.h;
  });
  return { budgets: budgets, notes: notes, hols: hols };
}

/**
 * Quản lý tự đánh dấu ngày lễ. on = true/false để ghi đè, null để trả về cho
 * app tự đoán theo lịch lễ Nhật.
 */
function setDayHoliday(token, yearMonth, day, on) {
  yearMonth = assertYearMonth_(yearMonth);
  day = assertDay_(yearMonth, day);
  requireManager_(token);
  kvUpdate_('dayinfo:' + yearMonth, function (info) {
    info = info && typeof info === 'object' && !Array.isArray(info) ? info : {};
    var cur = info[day] || {};
    if (on === null || on === undefined) delete cur.h;
    else cur.h = on ? 1 : 0;
    if (cur.h === undefined && cur.b === undefined && !cur.n) delete info[day];
    else info[day] = cur;
    return info;
  });
  return true;
}

/** budget=null và note='' thì xoá hẳn ngày đó khỏi dữ liệu. */
function saveDayInfo(token, yearMonth, day, budget, note) {
  yearMonth = assertYearMonth_(yearMonth);
  day = assertDay_(yearMonth, day);
  requireManager_(token);
  var b = (budget === null || budget === undefined || budget === '') ? null : Number(budget);
  if (b !== null) {
    if (!isFinite(b) || b < 0) throw new Error('予算 phải là số không âm.');
    if (b > BUDGET_MAX_YEN) throw new Error('予算 lớn quá mức hợp lý.');
    b = Math.round(b);
  }
  var n = (note === null || note === undefined) ? '' : String(note).trim().slice(0, NOTE_MAX_LEN);

  var key = 'dayinfo:' + yearMonth;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_();
    var obj = readMonthObject_(sheet, key);
    // Giữ các trường khác của ngày (vd. h = ngày lễ đánh dấu tay) — trước đây bị xoá mất khi lưu dự toán / ghi chú.
    var cell = obj[day] && typeof obj[day] === 'object' ? obj[day] : {};
    if (b !== null) cell.b = b; else delete cell.b;
    if (n) cell.n = n; else delete cell.n;
    if (Object.keys(cell).length) obj[day] = cell; else delete obj[day];
    writeMonthObject_(sheet, key, obj);
  } finally {
    lock.releaseLock();
  }
  return true;
}

function readMonthNormalized_(key, employees) {
  var raw = kvGet_(key);
  var obj = {};
  if (raw) { try { obj = JSON.parse(raw) || {}; } catch (e) { obj = {}; } }
  var changed = remapNameKeysToIds_(obj, employees);
  changed = migrateFlatShifts_(obj) || changed;
  // Vá dữ liệu cũ: KHÔNG chờ lock (hàm đọc này có thể được gọi từ bên trong đoạn đang giữ lock —
  // chờ là tự kẹt). Không lấy được lock thì lần đọc sau vá; dữ liệu trả về vẫn đã chuẩn hoá.
  // v41: đang giữ khoá (gọi từ trong một lần lưu) → KHÔNG ghi ở đây: lần lưu đó sẽ ghi bản đã chuẩn hoá.
  var held = false; try { held = LockService.getScriptLock().hasLock(); } catch (eH) { held = false; }
  if (changed && !held) { try { kvSet_(key, JSON.stringify(obj), undefined, undefined, true); } catch (e) {} }
  return obj;
}

/** Dữ liệu rất cũ khoá theo TÊN nhân viên; đổi sang khoá theo id. */
function remapNameKeysToIds_(map, employees) {
  var byName = {}, byId = {};
  employees.forEach(function (e) { byName[e.name] = e.id; byId[e.id] = true; });
  var changed = false;
  Object.keys(map).forEach(function (day) {
    var dayMap = map[day] || {}, out = {};
    Object.keys(dayMap).forEach(function (k) {
      var nk = (!byId[k] && byName[k]) ? (changed = true, byName[k]) : k;
      out[nk] = dayMap[k];
    });
    map[day] = out;
  });
  return changed;
}

/** Ca làm kiểu cũ {start,end,off} -> kiểu mới {off, shifts:[...]}. */
function migrateFlatShifts_(schedule) {
  var changed = false;
  Object.keys(schedule).forEach(function (day) {
    var dayMap = schedule[day] || {};
    Object.keys(dayMap).forEach(function (empId) {
      var v = dayMap[empId];
      if (v && typeof v === 'object' && !('shifts' in v) && ('start' in v || 'off' in v)) {
        dayMap[empId] = {
          off: !!v.off,
          shifts: v.off ? [] : [{ start: v.start, end: v.end, breakStart: null, breakEnd: null }]
        };
        changed = true;
      }
    });
  });
  return changed;
}

// ===========================================================================
// GHI TỪNG Ô (chống ghi đè lẫn nhau khi nhiều người cùng sửa)
// ===========================================================================
// Bản cũ để client giữ nguyên JSON cả tháng rồi ghi đè trọn cục — hai người
// sửa gần nhau là người ghi sau xoá mất thay đổi của người ghi trước. Các hàm
// dưới đây luôn đọc bản mới nhất TRỰC TIẾP TỪ SHEET bên trong LockService,
// gộp đúng 1 ô rồi mới ghi lại.

function readMonthObject_(sheet, key) {
  var row = findRow_(sheet, key);
  if (row === -1) return {};
  var raw = readCellValue_(sheet, row);
  if (!raw) return {};
  try { return JSON.parse(raw) || {}; } catch (e) { return {}; }
}

function writeMonthObject_(sheet, key, obj, reason, force, noTrack) {
  touchMod_(key);
  var row = findRow_(sheet, key);
  var oldRaw = row !== -1 ? readCellValue_(sheet, row) : null;
  var m = /^schedule:(\d{4}-\d{2})$/.exec(String(key)), old = {}, hubR = /^chi viện/.test(String(reason || ''));
  if (m) {
    try { old = oldRaw ? (JSON.parse(oldRaw) || {}) : {}; } catch (e0) { old = {}; }
    if (!hubR) { try { supKeepExt_(old, obj); } catch (e1) {} }
  }
  var json = JSON.stringify(obj);
  if (row !== -1) snapshot_(key, oldRaw, reason, force);
  if (row === -1) appendKeyValue_(sheet, key, json);
  else writeCellValue_(sheet, row, json);
  putCacheSafe_(key, json);
  // Lịch xếp: sửa vào ngày ĐÃ CÔNG BỐ thì tự ghi thành "Sửa #n" (xem LỊCH SỬ CÔNG BỐ).
  if (m && !noTrack) pubTrack_(sheet, m[1], old, obj, hubR ? 'hub' : '');
  // Quán nhà sửa ca ✈ (kéo / xoá / tick tay / cử người) → báo quán nhận. Lệnh do quán nhận gửi tới thì họ đã biết.
  if (m && String(reason || '') !== 'chi viện') { try { if (hubOn_()) supNotifyDiff_(m[1], old, obj); } catch (e2) {} }
}

function mergeCell_(key, day, empId, value) {
  var ymK = String(key).replace(/^[a-z]+:/, '');
  day = assertDay_(ymK, day);
  guardEntry_(value);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) {
    throw new Error('Hệ thống đang bận (nhiều người cùng lưu), vui lòng thử lại sau ít giây.');
  }
  try {
    var sheet = getSheet_();
    var obj = readMonthObject_(sheet, key);
    if (!obj[day]) obj[day] = {};
    if (value === null || value === undefined) delete obj[day][empId];
    else obj[day][empId] = value;
    writeMonthObject_(sheet, key, obj);
    return obj[day] || {};
  } finally {
    lock.releaseLock();
  }
}

// ===========================================================================
// ĐĂNG KÝ CỦA NHÂN VIÊN — tách hẳn khỏi LỊCH XẾP của quản lý
// ===========================================================================
// Trước đây hai thứ dùng chung một ô 'schedule:<tháng>': nhân viên kéo giờ vào
// đó, rồi quản lý / máy xếp nháp sửa luôn trên chính ô đó. Xếp xong là không
// còn biết giờ nào nhân viên thật sự đăng ký, giờ nào do xếp mà ra.
//
// Nay:
//   wish:<tháng>      = nhân viên đăng ký. Chỉ chính người đó (hoặc quản lý qua
//                       màn "xem như") ghi vào. Máy xếp nháp CHỈ ĐỌC.
//   schedule:<tháng>  = lịch xếp của quản lý. Nhân viên chỉ xem.
// Cùng một định dạng { ngày: { empId: {off, shifts:[...]} } } để chép qua lại
// được nguyên vẹn.

/**
 * Đọc đăng ký của tháng. Tháng chưa có ô 'wish' thì dựng một lần từ dữ liệu cũ:
 *   - ngày có khung giờ nhân viên đã khai (requests.win) -> ca đó; nếu ô lịch
 *     cũ trùng đúng khung giờ thì lấy luôn ô lịch (giữ ca tách đôi, giờ nghỉ);
 *   - ngày đã xin nghỉ (requests.type = unavailable) -> nghỉ.
 * KHÔNG chép ca không có lời khai: đó là ca do quản lý / máy xếp nháp đặt vào,
 * chép sang là lại lẫn lịch xếp vào đăng ký — đúng cái lỗi đang cần gỡ.
 * Luôn ghi ô 'wish' ra (kể cả rỗng) để sau này không dựng lại lần nữa.
 */
function readWish_(yearMonth) {
  var key = 'wish:' + yearMonth;
  var raw = kvGet_(key);
  if (raw !== null && raw !== '') {
    try { return JSON.parse(raw) || {}; } catch (e) { return {}; }
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) return {};   // bận thì lần sau dựng, không chặn việc mở tháng
  try {
    var sheet = getSheet_();
    var row = findRow_(sheet, key);
    if (row !== -1) {                              // người khác vừa dựng xong
      var got = readCellValue_(sheet, row) || '{}';
      putCacheSafe_(key, got);
      try { return JSON.parse(got) || {}; } catch (e2) { return {}; }
    }
    var wish = buildWishFromLegacy_(readMonthObject_(sheet, 'schedule:' + yearMonth),
                                    readMonthObject_(sheet, 'requests:' + yearMonth));
    var json = JSON.stringify(wish);
    appendKeyValue_(sheet, key, json);
    putCacheSafe_(key, json);
    return wish;
  } finally {
    lock.releaseLock();
  }
}

function envelope_(entry) {
  if (!entry || entry.off || !entry.shifts || !entry.shifts.length) return null;
  var st = null, en = null;
  entry.shifts.forEach(function (x) {
    st = (st === null) ? Number(x.start) : Math.min(st, Number(x.start));
    en = (en === null) ? Number(x.end) : Math.max(en, Number(x.end));
  });
  return (en > st) ? [st, en] : null;
}

function buildWishFromLegacy_(schedule, requests) {
  var wish = {};
  Object.keys(requests || {}).forEach(function (d) {
    var dayReq = requests[d] || {};
    Object.keys(dayReq).forEach(function (id) {
      var r = dayReq[id];
      if (!r) return;
      var out = null;
      if (r.type === 'unavailable') {
        out = { off: true, shifts: [] };
      } else if (r.win && r.win.length === 2 && Number(r.win[1]) > Number(r.win[0])) {
        var old = schedule && schedule[d] && schedule[d][id];
        var env = envelope_(old);
        if (env && env[0] === Number(r.win[0]) && env[1] === Number(r.win[1])) {
          out = { off: false, shifts: JSON.parse(JSON.stringify(old.shifts)) };
        } else {
          out = { off: false, shifts: [{ start: Number(r.win[0]), end: Number(r.win[1]),
                                         breakStart: null, breakEnd: null }] };
        }
      }
      if (out) { out.by = 'x'; (wish[d] = wish[d] || {})[id] = out; }   // x = chuyển từ dữ liệu cũ
    });
  });
  return wish;
}

function assertWishWritable_(who, yearMonth, empId, days) {
  if (who.r === 'mgr') return;
  var mode = readLockMode_(yearMonth);
  if (mode === 'all') {
    throw new Error('Lịch tháng này đã được quản lý chốt nên không sửa đăng ký được nữa. Cần đổi ca thì báo trực tiếp quản lý.');
  }
  if (mode === 'h1' && (days || []).some(function (d) { return Number(d) <= HALF_SPLIT; })) {
    throw new Error('Nửa đầu tháng (1–' + HALF_SPLIT + ') đã được quản lý chốt — chỉ sửa được đăng ký từ ngày ' + (HALF_SPLIT + 1) + '. Cần đổi ca thì báo trực tiếp quản lý.');
  }
}

/** Nhân viên lưu đăng ký của ĐÚNG 1 ngày. entry=null = bỏ đăng ký ngày đó. */
function saveWishEntry(token, yearMonth, day, empId, entry) {
  yearMonth = assertYearMonth_(yearMonth);
  day = assertDay_(yearMonth, day);
  var who = requireCanEdit_(token, empId);
  assertWishWritable_(who, yearMonth, empId, [day]);
  markWishWriter_(who, empId);
  readWish_(yearMonth);                  // bảo đảm đã dựng từ dữ liệu cũ trước khi ghi
  return mergeCell_('wish:' + yearMonth, day, empId, stamp_(who, entry));
}

/** Ghi đăng ký nhiều ngày của cùng một người trong một lượt khoá. */
function saveWishEntriesForEmployee(token, yearMonth, empId, entriesByDay) {
  yearMonth = assertYearMonth_(yearMonth);
  guardEntries_(yearMonth, entriesByDay);
  var who = requireCanEdit_(token, empId);
  assertWishWritable_(who, yearMonth, empId, Object.keys(entriesByDay || {}));
  markWishWriter_(who, empId);
  readWish_(yearMonth);
  var key = 'wish:' + yearMonth;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_();
    var obj = readMonthObject_(sheet, key);
    Object.keys(entriesByDay || {}).forEach(function (day) {
      var val = stamp_(who, entriesByDay[day]);
      if (!obj[day]) obj[day] = {};
      if (val === null || val === undefined) delete obj[day][empId];
      else obj[day][empId] = val;
    });
    writeMonthObject_(sheet, key, obj);
  } finally {
    lock.releaseLock();
  }
  return true;
}

/** LỊCH XẾP: chỉ quản lý ghi. Nhân viên ghi vào đăng ký (saveWishEntry).
 *  entryData=null = bỏ khỏi ca. */
function saveShiftEntry(token, yearMonth, day, empId, entryData) {
  yearMonth = assertYearMonth_(yearMonth);
  day = assertDay_(yearMonth, day);
  requireManager_(token);
  return mergeCell_('schedule:' + yearMonth, day, empId, entryData);
}

/**
 * Nhân viên xoá TOÀN BỘ ĐĂNG KÝ của chính mình trong một tháng để khai lại từ
 * đầu: mọi ca đăng ký, ngày nghỉ, lời khai giờ, ghi chú.
 *
 * KHÔNG đụng vào lịch xếp của quản lý — đó là hai ô riêng. Luôn chụp lại bản cũ
 * vào History (bắt buộc), nên lỡ tay thì quản lý vẫn khôi phục được.
 */
function clearMyMonth(token, yearMonth, empId) {
  yearMonth = assertYearMonth_(yearMonth);
  var who = requireCanEdit_(token, empId);
  if (who.r !== 'mgr' && readLock_(yearMonth)) {
    throw new Error('Lịch tháng này đã được quản lý chốt nên không xoá được nữa. Cần đổi thì báo trực tiếp quản lý.');
  }
  var onlySecond = who.r !== 'mgr' && readLockMode_(yearMonth) === 'h1';   // nửa đầu đã chốt: chỉ xoá nửa sau
  readWish_(yearMonth);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_();
    var wKey = 'wish:' + yearMonth, rKey = 'requests:' + yearMonth;
    var wish = readMonthObject_(sheet, wKey), req = readMonthObject_(sheet, rKey);
    var cleared = 0, reqCleared = 0;
    Object.keys(wish).forEach(function (d) {
      if (onlySecond && Number(d) <= HALF_SPLIT) return;
      if (wish[d] && Object.prototype.hasOwnProperty.call(wish[d], empId)) {
        delete wish[d][empId];
        cleared++;
      }
    });
    Object.keys(req).forEach(function (d) {
      if (onlySecond && Number(d) <= HALF_SPLIT) return;
      if (req[d] && Object.prototype.hasOwnProperty.call(req[d], empId)) {
        delete req[d][empId];
        reqCleared++;
      }
    });
    if (cleared) writeMonthObject_(sheet, wKey, wish, 'nhân viên xoá đăng ký tháng', true);
    if (reqCleared) writeMonthObject_(sheet, rKey, req, 'nhân viên xoá đăng ký tháng', true);
    return { cleared: cleared, reqCleared: reqCleared, keptPinned: 0 };
  } finally {
    lock.releaseLock();
  }
}

/** Tương tự, cho 1 ô "yêu cầu nghỉ / linh hoạt". */
function saveRequestEntry(token, yearMonth, day, empId, requestData) {
  yearMonth = assertYearMonth_(yearMonth);
  day = assertDay_(yearMonth, day);
  var who = requireCanEdit_(token, empId);
  markWishWriter_(who, empId);
  var res = mergeCell_('requests:' + yearMonth, day, empId, stamp_(who, requestData));
  if (who.r === 'emp' && requestData && requestData.type === 'unavailable')
    mgrEvent_('off', empId, yearMonth, Number(day), String(requestData.note || '').slice(0, 120));
  return res;
}

/** Ghi nhiều ngày cùng lúc cho 1 nhân viên trong 1 lần khoá duy nhất
 *  (nút "Cả tháng tôi rảnh"), thay vì gọi 30 lần rời rạc. */
function saveRequestEntriesForEmployee(token, yearMonth, empId, entriesByDay) {
  yearMonth = assertYearMonth_(yearMonth);
  guardEntries_(yearMonth, entriesByDay);
  var who = requireCanEdit_(token, empId);
  markWishWriter_(who, empId);
  var key = 'requests:' + yearMonth;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_();
    var obj = readMonthObject_(sheet, key);
    Object.keys(entriesByDay || {}).forEach(function (day) {
      var val = stamp_(who, entriesByDay[day]);
      if (!obj[day]) obj[day] = {};
      if (val === null || val === undefined) delete obj[day][empId];
      else obj[day][empId] = val;
    });
    writeMonthObject_(sheet, key, obj);
  } finally {
    lock.releaseLock();
  }
  return true;
}

/**
 * Ghi ca cho NHIỀU NGÀY của cùng một người trong một lượt gọi.
 * Nhân viên hay khai kiểu "Chủ nhật nào cũng 9h–16h, trừ ngày 11" — gửi từng
 * ngày một là mười lượt gọi và mười lần chờ; gom lại còn đúng một lượt.
 */
function saveShiftEntriesForEmployee(token, yearMonth, empId, entriesByDay) {
  yearMonth = assertYearMonth_(yearMonth);
  guardEntries_(yearMonth, entriesByDay);
  requireManager_(token);   // lịch xếp là của quản lý; nhân viên ghi vào đăng ký
  var key = 'schedule:' + yearMonth;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_();
    var obj = readMonthObject_(sheet, key);
    Object.keys(entriesByDay || {}).forEach(function (day) {
      var val = entriesByDay[day];
      if (!obj[day]) obj[day] = {};
      if (val === null || val === undefined) delete obj[day][empId];
      else obj[day][empId] = val;
    });
    writeMonthObject_(sheet, key, obj);
  } finally {
    lock.releaseLock();
  }
  return true;
}

// --- Ca hay dùng của từng nhân viên ----------------------------------------
// Mỗi người tự lưu vài khung giờ quen thuộc (9–21, 16–21, 18–L) để khỏi phải
// kéo lại từ đầu mỗi tháng. endAtClose = true nghĩa là "tới giờ đóng cửa (L)",
// giờ thật lấy theo từng ngày vì mỗi ngày có thể đóng cửa khác nhau.

var MAX_PRESETS = 8;

function normalizePresets_(v) {
  if (!v || typeof v.length !== 'number') return [];
  var out = [];
  for (var i = 0; i < v.length && out.length < MAX_PRESETS; i++) {
    var p = v[i] || {};
    var s = Number(p.start), e = Number(p.end);
    if (!isFinite(s) || s < 0 || s > 24) continue;
    var atClose = !!p.endAtClose;
    if (!atClose && (!isFinite(e) || e <= s || e > 30)) continue;
    out.push({ start: Math.round(s * 2) / 2,
               end: atClose ? null : Math.round(e * 2) / 2,
               endAtClose: atClose });
  }
  return out;
}

function getPresets(token, empId) {
  var p = auth_(token);
  var id = String(empId || (p.r === 'mgr' ? '' : p.e));
  if (!id) throw new Error('Thiếu mã nhân viên.');
  if (p.r !== 'mgr' && id !== String(p.e)) throw new Error('Bạn chỉ xem được ca hay dùng của chính mình.');
  var raw = kvGet_('presets:' + id);
  if (!raw) return [];
  try { return normalizePresets_(JSON.parse(raw)); } catch (e) { return []; }
}

function savePresets(token, empId, presetsJson) {
  requireCanEdit_(token, empId);
  assertEmployeeExists_(empId);
  var list;
  try { list = JSON.parse(presetsJson); } catch (e) { throw new Error('Dữ liệu ca hay dùng không hợp lệ.'); }
  kvSet_('presets:' + empId, JSON.stringify(normalizePresets_(list)));
  return true;
}

/** Quản lý ghi đè cả tháng (dùng cho "sao chép tháng trước" và "xoá cả tháng"). */
function saveMonthSchedule(token, yearMonth, scheduleJson, allowDays) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth);
  var allow = allowDays;
  if (typeof allow === 'string') { try { allow = JSON.parse(allow); } catch (e) { allow = null; } }
  // Chụp lại bản đang có trước khi đè — "xoá cả tháng" hay "chép tháng trước"
  // lỡ tay không còn là mất trắng nữa. Ngày đã công bố thì giữ nguyên (trừ allowDays).
  return schedBulkWrite_(ym, scheduleJson, 'ghi cả tháng', allow);
}

/** Hoàn tác lần ghi đè gần nhất. Tráo qua tráo lại được, nên bấm nhầm vẫn cứu. */
function restoreMonthSchedule(token, yearMonth) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth);
  var bak = kvGet_('bak:schedule:' + ym);
  if (!bak) throw new Error('Tháng này chưa có bản lưu nào để khôi phục.');
  // schedBulkWrite_ tự cất bản hiện tại vào bak → bấm lần nữa là tráo lại.
  // Chỉ những ngày đã công bố mà lần ghi trước được phép đổi thì hoàn tác mới đổi lại.
  var allow = null;
  try { allow = JSON.parse(kvGet_('bakallow:schedule:' + ym) || 'null'); } catch (e) { allow = null; }
  return schedBulkWrite_(ym, bak, 'hoàn tác', allow);
}

/** Quản lý xoá 1 nhân viên: dọn id đó khỏi mọi tháng lịch/yêu cầu + xoá mã PIN,
 *  tất cả trong 1 lượt khoá để không đụng độ với người đang lưu ca. */
function purgeEmployee(token, empId) {
  requireManager_(token);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    dropDevices_(empId);                 // máy đã ghi nhớ của người này hết hiệu lực ngay
    bumpEmpVer_(empId);                  // phiên đang mở cũng hết hiệu lực
    var sheet = getSheet_();
    var data = sheet.getDataRange().getValues();
    var keep = {};                       // phần dữ liệu bị gỡ, giữ 6 tháng để khôi phục (v2026.10.16)
    for (var i = 1; i < data.length; i++) {
      var key = String(data[i][0]), scope = data[i][1];
      if (scope !== 'shared') continue;
      if (key.indexOf('schedule:') !== 0 && key.indexOf('requests:') !== 0 && key.indexOf('wish:') !== 0 &&
          key.indexOf('plan:') !== 0 && key.indexOf('pubcur:') !== 0 && key.indexOf('pubsnap:') !== 0 &&
          key.indexOf('bak:schedule:') !== 0 && key.indexOf('pub:') !== 0 && key.indexOf('care:') !== 0) continue;
      // Đọc qua hàm chia ô: tháng đông người nằm trải trên nhiều ô, đọc riêng
      // cột C là chỉ được mẩu đầu, JSON hỏng rồi bỏ qua luôn tháng đó.
      var raw = readCellValue_(sheet, i + 1);
      if (!raw) continue;
      var obj;
      try { obj = JSON.parse(raw); } catch (e) { continue; }
      var changed = false;
      if (key.indexOf('care:') === 0) {
        if (Object.prototype.hasOwnProperty.call(obj, empId)) { keep[key] = obj[empId]; delete obj[empId]; changed = true; }
      } else if (key.indexOf('pub:') === 0) {
        // Nhật ký công bố: bỏ các dòng thay đổi của người này (khỏi "quay về bản" đưa họ trở lại).
        (obj.list || []).forEach(function (x) {
          var n0 = (x.ch || []).length;
          if (n0) { x.ch = x.ch.filter(function (c) { return String(c.e) !== String(empId); }); if (x.ch.length !== n0) changed = true; }
        });
      } else {
        var part = {};
        Object.keys(obj).forEach(function (day) {
          if (obj[day] && Object.prototype.hasOwnProperty.call(obj[day], empId)) {
            part[day] = obj[day][empId];
            delete obj[day][empId];
            changed = true;
          }
        });
        if (Object.keys(part).length) keep[key] = part;
      }
      if (changed) {
        snapshot_(key, raw, 'trước khi xoá nhân viên', true);
        var json = JSON.stringify(obj);
        writeCellValue_(sheet, i + 1, json);
        touchMod_(key);
        putCacheSafe_(key, json);
      }
    }
    if (Object.keys(keep).length) {
      var bkKey = 'retbak:' + empId, bkRow = findRow_(sheet, bkKey);
      var bkJson = JSON.stringify({ at: Date.now(), keep: keep });
      if (bkRow === -1) appendKeyValue_(sheet, bkKey, bkJson); else writeCellValue_(sheet, bkRow, bkJson);
      putCacheSafe_(bkKey, bkJson);
    }
    deletePin_(empId);
    forgetSeen_(empId);
    // Báo sai lịch của người đó cũng dọn luôn.
    for (var j = 1; j < data.length; j++) {
      var rk = String(data[j][0]);
      if (rk.indexOf('report:') !== 0 || data[j][1] !== 'shared') continue;
      var rraw = readCellValue_(sheet, j + 1), rl;
      try { rl = JSON.parse(rraw) || []; } catch (e3) { continue; }
      var kept = rl.filter(function (x) { return x && x.empId !== empId; });
      if (kept.length !== rl.length) { var rj = JSON.stringify(kept); writeCellValue_(sheet, j + 1, rj); putCacheSafe_(rk, rj); }
    }
    // Dọn luôn số liệu máy học của người đã nghỉ việc.
    var lr = readLearn_();
    if (lr.emp && lr.emp[empId]) { delete lr.emp[empId]; pubPut_(sheet, LEARN_KEY, JSON.stringify(lr)); }   // đang giữ khoá → ghi thẳng, không qua kvSet_
  } finally {
    lock.releaseLock();
  }
  return true;
}

// ===========================================================================
// LỊCH CÁ NHÂN .ICS — đổ ca làm vào app Lịch sẵn có của điện thoại
// ===========================================================================
//
// Mỗi nhân viên có một link riêng đã ký. Link này KHÔNG cần mã PIN vì app Lịch
// không biết đăng nhập; bản thân chữ ký trong link là chìa khoá. Vì vậy nó chỉ
// lộ ra đúng ca làm của MỘT người, và quản lý thu hồi được bằng cách tăng số
// phiên bản khoá (icsver) của người đó lên.

var ICS_MONTHS_BACK = 1, ICS_MONTHS_AHEAD = 2;

function icsVer_(empId) {
  var v = Number(kvGet_('icsver:' + empId));
  return (isFinite(v) && v > 0) ? v : 1;
}

function icsSig_(empId) {
  var raw = Utilities.computeHmacSha256Signature(
    'ics|' + empId + '|' + icsVer_(empId), getSecret_('TOKEN_SECRET'));
  return Utilities.base64EncodeWebSafe(raw).replace(/=+$/, '').slice(0, 22);
}

/** Danh sách link lịch cá nhân của mọi người, để quản lý phát cho từng người. */
function getIcsLinks(token) {
  requireManager_(token);
  var base = '';
  try { base = ScriptApp.getService().getUrl() || ''; } catch (e) { base = ''; }
  return readEmployees_().map(function (e) {
    return { id: e.id, name: e.name, url: base ? (base + '?ics=' + encodeURIComponent(e.id) + '&k=' + icsSig_(e.id)) : '' };
  });
}

/** Link lịch của chính người đang đăng nhập — để nhân viên tự đăng ký lấy,
 *  khỏi bắt quản lý gửi tay cho 20 người. Quản lý lấy được link của bất kỳ ai. */
function getMyIcsLink(token, empId) {
  var p = auth_(token);
  // Cố ý KHÔNG lặng lẽ trả link của chính mình khi nhân viên hỏi link người khác:
  // im lặng như vậy dễ làm người ta tưởng đã lấy được link của đồng nghiệp.
  var id = String(empId || (p.r === 'mgr' ? '' : p.e));
  if (!id) throw new Error('Thiếu mã nhân viên.');
  if (p.r !== 'mgr' && id !== String(p.e)) throw new Error('Bạn chỉ xem được link lịch của chính mình.');
  assertEmployeeExists_(id);
  var base = '';
  try { base = ScriptApp.getService().getUrl() || ''; } catch (e) { base = ''; }
  return base ? (base + '?ics=' + encodeURIComponent(id) + '&k=' + icsSig_(id)) : '';
}

/** Thu hồi link cũ của một người (điện thoại mất, nghỉ việc…). */
function revokeIcsKey(token, empId) {
  requireManager_(token);
  assertEmployeeExists_(empId);
  kvSet_('icsver:' + empId, String(icsVer_(empId) + 1));
  return icsSig_(empId);
}

/** Giờ JST (có thể lẻ 0.5) của một ngày -> mốc thời gian UTC dạng chuỗi iCalendar.
 *  Nhật không có giờ mùa hè nên JST luôn là UTC+9, quy đổi thẳng cho chắc, khỏi
 *  phụ thuộc múi giờ mà máy chủ Apps Script đang đặt. */
function jstStamp_(y, m, d, hourFloat) {
  var ms = Date.UTC(y, m - 1, d, 0, 0, 0) - 9 * 3600000 + Math.round(hourFloat * 3600000);
  var dt = new Date(ms);
  function p(n) { return (n < 10 ? '0' : '') + n; }
  return '' + dt.getUTCFullYear() + p(dt.getUTCMonth() + 1) + p(dt.getUTCDate()) + 'T' +
    p(dt.getUTCHours()) + p(dt.getUTCMinutes()) + '00Z';
}

function icsEscape_(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Chuẩn iCalendar bắt bẻ dòng dài quá 75 byte, phải gấp xuống dòng có 1 dấu cách. */
function icsFold_(line) {
  var bytes = Utilities.newBlob(line).getBytes();
  if (bytes.length <= 73) return line;
  var out = [], cur = '', curLen = 0;
  for (var i = 0; i < line.length; i++) {
    var ch = line.charAt(i), w = Utilities.newBlob(ch).getBytes().length;
    if (curLen + w > 73) { out.push(cur); cur = ' '; curLen = 1; }
    cur += ch; curLen += w;
  }
  out.push(cur);
  return out.join('\r\n');
}

function hhmm_(hourFloat) {
  var h = Math.floor(hourFloat), mi = Math.round((hourFloat - h) * 60);
  return (h < 10 ? '0' : '') + h + ':' + (mi < 10 ? '0' : '') + mi;
}

function serveIcs_(empId, sig) {
  var text;
  try {
    var emps = readEmployees_(), me = null;
    for (var i = 0; i < emps.length; i++) if (emps[i].id === empId) me = emps[i];
    if (!me || !sig || sig !== icsSig_(empId)) {
      return ContentService.createTextOutput(
        'Link lịch không hợp lệ hoặc đã bị thu hồi. Hãy xin quản lý cấp lại link mới.')
        .setMimeType(ContentService.MimeType.TEXT);
    }
    text = buildIcs_(me);
  } catch (err) {
    return ContentService.createTextOutput('Lỗi khi dựng lịch: ' + (err && err.message))
      .setMimeType(ContentService.MimeType.TEXT);
  }
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.ICAL);
}

function buildIcs_(emp) {
  var storeName = readSettings_().storeName || 'シフト';
  var now = new Date();
  var stamp = jstStamp_(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), 0);
  var lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//shift-app//JP//VI',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:' + icsEscape_(storeName + ' — ' + emp.name),
    'X-WR-TIMEZONE:Asia/Tokyo',
    'REFRESH-INTERVAL;VALUE=DURATION:PT4H', 'X-PUBLISHED-TTL:PT4H'
  ];

  var base = new Date(Date.now() + 9 * 3600 * 1000);        // giờ Nhật, không phụ thuộc múi giờ của dự án Apps Script
  for (var off = -ICS_MONTHS_BACK; off <= ICS_MONTHS_AHEAD; off++) {
    var cur = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + off, 1));
    var y = cur.getUTCFullYear(), m = cur.getUTCMonth() + 1;
    var ym = y + '-' + (m < 10 ? '0' : '') + m;
    var sched;
    try { sched = staffVisibleSched_(ym, readMonthNormalized_('schedule:' + ym, [emp])); } catch (e) { continue; }
    var closeMap = readCloseHours_(ym);

    Object.keys(sched).forEach(function (dayKey) {
      var entry = sched[dayKey] && sched[dayKey][emp.id];
      if (!entry || entry.off || !entry.shifts || !entry.shifts.length) return;
      var d = Number(dayKey);
      entry.shifts.forEach(function (s, idx) {
        var end = endOf_(s, closeMap, d);
        if (!(end > s.start)) return;
        var desc = [];
        // Ca đi hỗ trợ tiệm khác VẪN vào lịch điện thoại của nhân viên (họ vẫn
        // phải đi làm), chỉ ghi rõ là ヘルプ để khỏi đi nhầm quán.
        if (s.note) desc.push('[' + String(s.note).slice(0, 60) + ']');
        if (s.breakStart != null && s.breakEnd != null) {
          desc.push('休憩 ' + hhmm_(s.breakStart) + '–' + hhmm_(s.breakEnd));
        }
        desc.push('実働 ' + (Math.round(netOfShiftAt_(s, closeMap, d) * 100) / 100) + 'h');
        var title = s.isSupport ? ('ヘルプ ' + (s.note ? String(s.note).slice(0, 30) : '') + ' (' + storeName + ')')
                                : storeName;

        lines.push('BEGIN:VEVENT');
        lines.push('UID:' + emp.id + '-' + ym + '-' + d + '-' + idx + '@shift-app');
        lines.push('DTSTAMP:' + stamp);
        lines.push('DTSTART:' + jstStamp_(y, m, d, s.start));
        lines.push('DTEND:' + jstStamp_(y, m, d, end));
        lines.push(icsFold_('SUMMARY:' + icsEscape_(title)));
        lines.push(icsFold_('DESCRIPTION:' + icsEscape_(desc.join(' / '))));
        lines.push('BEGIN:VALARM', 'ACTION:DISPLAY',
          icsFold_('DESCRIPTION:' + icsEscape_(storeName)), 'TRIGGER:-PT2H', 'END:VALARM');
        lines.push('END:VEVENT');
      });
    });
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

// ===========================================================================
// XUẤT BẢNG GIỜ CÔNG RA GOOGLE SHEET
// ===========================================================================
//
// Không tải file xuống máy: app chạy trong khung iframe của Google nên trình
// duyệt hay chặn tải. Tạo thẳng một bảng tính trong Drive của quản lý rồi trả
// về link — vừa chắc chắn mở được, vừa xem được trên điện thoại.

/** Giờ kết thúc thật của một ca: ca đánh dấu "đến giờ đóng cửa (L)" lấy theo
 *  giờ đóng cửa của đúng ngày đó (mặc định 21). */
var CLOSE_DEF_ = null;   // giờ đóng cửa mặc định trong Cài đặt (đọc 1 lần mỗi lượt chạy)
function closeDefault_() {
  if (CLOSE_DEF_ === null) { var v = Number(readSettings_().closeHour); CLOSE_DEF_ = isFinite(v) && v > 0 ? v : 21; }
  return CLOSE_DEF_;
}
/** Ca ✈ chi viện ở quán khác: giờ đóng cửa (L) là của QUÁN ĐÓ (lưu trên ca: supClose). */
function supCloseOr_(s, fallback) {
  if (s && s.isSupport && s.supClose !== undefined && s.supClose !== null && s.supClose !== '') {
    var v = Number(s.supClose);
    if (isFinite(v) && v > 0) return v;
  }
  return fallback;
}
function endOf_(s, closeMap, day) {
  if (s && s.endAtClose && s.isSupport && supCloseOr_(s, null) !== null) return supCloseOr_(s, null);
  if (s && s.endAtClose) {
    var c = closeMap && closeMap[day];
    var v = (c === undefined || c === null || c === '') ? closeDefault_() : Number(c);
    if (!isFinite(v)) v = closeDefault_();
    // v41: giống máy (max(start + 0.5, close)) — ca "đến L" bắt đầu sát/ sau giờ đóng cửa không ra giờ âm.
    return Math.max(Number(s.start) + 0.5, v);
  }
  return Number(s.end);
}
function netOfShiftAt_(s, closeMap, day) {
  var gross = Math.max(0, endOf_(s, closeMap, day) - s.start);
  var br = (s.breakStart != null && s.breakEnd != null) ? Math.max(0, s.breakEnd - s.breakStart) : 0;
  return Math.max(0, gross - br);
}
function netOfEntryAt_(entry, closeMap, day) {
  if (!entry || entry.off || !entry.shifts) return 0;
  return entry.shifts.reduce(function (sum, s) { return sum + netOfShiftAt_(s, closeMap, day); }, 0);
}

function netOfShift_(s) {
  var gross = Math.max(0, s.end - s.start);
  var br = (s.breakStart != null && s.breakEnd != null) ? Math.max(0, s.breakEnd - s.breakStart) : 0;
  return Math.max(0, gross - br);
}
function netOfEntry_(entry) {
  if (!entry || entry.off || !entry.shifts) return 0;
  return entry.shifts.reduce(function (sum, s) { return sum + netOfShift_(s); }, 0);
}
/** Chia tháng thành các tuần Thứ Hai→Chủ nhật, đúng cách đếm 週 của Nhật. */
function weeksOfMonth_(y, m) {
  var n = new Date(y, m, 0).getDate(), weeks = [], cur = null;
  for (var d = 1; d <= n; d++) {
    if (!cur || new Date(y, m - 1, d).getDay() === 1) { cur = []; weeks.push(cur); }
    cur.push(d);
  }
  return weeks;
}

function exportHours(token, yearMonth) {
  yearMonth = assertYearMonth_(yearMonth);
  requireManager_(token);
  if (!/^\d{4}-\d{2}$/.test(String(yearMonth))) throw new Error('Tháng không hợp lệ.');
  var y = Number(yearMonth.slice(0, 4)), m = Number(yearMonth.slice(5, 7));
  var emps = readEmployees_();
  var sched = readMonthNormalized_('schedule:' + yearMonth, emps);
  var weeks = weeksOfMonth_(y, m);
  var DOW = ['日', '月', '火', '水', '木', '金', '土'];
  var storeName = readSettings_().storeName || 'SUBWAY';
  var closeMap = readCloseHours_(yearMonth);

  // --- bảng tổng hợp tháng ---
  var nDays = new Date(y, m, 0).getDate();
  var r2 = function (v) { return Math.round(v * 100) / 100; };
  var head = ['氏名', '区分', '出勤日数', '前半 (1–' + HALF_SPLIT + '日)',
              '後半 (' + (HALF_SPLIT + 1) + '–' + nDays + '日)', '月合計', 'うち店舗', 'うちヘルプ'];
  weeks.forEach(function (w, i) { head.push('第' + (i + 1) + '週 (' + w[0] + '–' + w[w.length - 1] + '日)'); });
  head.push('連続7日最大');             // v41: 28h 上限はどの7日間でも — 前月末6日を含めて判定
  var rows = [head];
  var pvYm = ymShift_(yearMonth, -1), pvSched = {}, pvClose = {}, pvN = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
  try { pvSched = readMonthNormalized_('schedule:' + pvYm, emps); pvClose = readCloseHours_(pvYm); } catch (eP) {}
  var tot = { all: [0, 0], sa: [0, 0], staff: [0, 0] };

  emps.forEach(function (e) {
    var days = 0, h1 = 0, h2 = 0, hs = 0;
    Object.keys(sched).forEach(function (d) {
      var en = sched[d] && sched[d][e.id];
      var h = netOfEntryAt_(en, closeMap, Number(d));
      if (h > 0) { days++; if (Number(d) <= HALF_SPLIT) h1 += h; else h2 += h; }
      if (en && !en.off && en.shifts) en.shifts.forEach(function (s) { if (s.isSupport) hs += netOfShiftAt_(s, closeMap, Number(d)); });
    });
    tot.sup = (tot.sup || 0) + hs;
    var row = [e.name, (e.type === 'staff') ? '社員' : 'SA', days, r2(h1), r2(h2), r2(h1 + h2), r2(h1 + h2 - hs), r2(hs)];
    weeks.forEach(function (w) {
      var wh = w.reduce(function (sum, d) { return sum + netOfEntryAt_(sched[d] && sched[d][e.id], closeMap, d); }, 0);
      row.push(r2(wh));
    });
    var dh = [];
    for (var pd = pvN - 5; pd <= pvN; pd++) dh.push(netOfEntryAt_(pvSched[pd] && pvSched[pd][e.id], pvClose, pd));
    for (var cd = 1; cd <= nDays; cd++) dh.push(netOfEntryAt_(sched[cd] && sched[cd][e.id], closeMap, cd));
    var rmax = 0;
    for (var ri = 0; ri + 7 <= dh.length; ri++) { var rs = 0; for (var rj = ri; rj < ri + 7; rj++) rs += dh[rj]; rmax = Math.max(rmax, rs); }
    row.push(r2(rmax));
    rows.push(row);
    var g = (e.type === 'staff') ? tot.staff : tot.sa;
    g[0] += h1; g[1] += h2; tot.all[0] += h1; tot.all[1] += h2;
  });
  function sumRow(label, t2) { return [label, '', '', r2(t2[0]), r2(t2[1]), r2(t2[0] + t2[1])]; }
  rows.push(sumRow('合計', tot.all));
  rows.push(sumRow('うち SA', tot.sa));
  rows.push(sumRow('うち 社員', tot.staff));
  // setValues của Sheet thật đòi MỌI hàng dài bằng nhau — hàng tổng ngắn hơn
  // hàng tiêu đề là cả lệnh xuất báo lỗi. Đệm ô trống cho đủ.
  rows.forEach(function (rw) { while (rw.length < head.length) rw.push(''); });

  // --- bảng chi tiết theo ngày ---
  var det = [['日', '曜日', '氏名', '区分', '開始', '終了', '休憩開始', '休憩終了', '実働時間', '備考']];
  var n = nDays;
  for (var d = 1; d <= n; d++) {
    var dayMap = sched[d] || {};
    emps.forEach(function (e) {
      var entry = dayMap[e.id];
      if (!entry || entry.off || !entry.shifts) return;
      entry.shifts.forEach(function (s) {
        det.push([d, DOW[new Date(y, m - 1, d).getDay()], e.name, (e.type === 'staff') ? '社員' : 'SA',
          hhmm_(s.start), hhmm_(endOf_(s, closeMap, d)),
          (s.breakStart != null) ? hhmm_(s.breakStart) : '',
          (s.breakEnd != null) ? hhmm_(s.breakEnd) : '',
          Math.round(netOfShiftAt_(s, closeMap, d) * 100) / 100,
          ((s.isSupport ? 'ヘルプ ' : '') + (s.note ? String(s.note) : '')).trim()]);
      });
    });
  }

  var title = storeName + ' 勤務時間 ' + yearMonth;
  var ss = SpreadsheetApp.create(title);
  var s1 = ss.getSheets()[0];
  s1.setName('月次集計');
  s1.getRange(1, 1, rows.length, head.length).setValues(rows);
  s1.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#E6EFE9');
  s1.getRange(rows.length - 2, 1, 3, head.length).setFontWeight('bold');
  s1.setFrozenRows(1);
  s1.autoResizeColumns(1, head.length);

  var s2 = ss.insertSheet('日別');
  s2.getRange(1, 1, det.length, det[0].length).setValues(det);
  s2.getRange(1, 1, 1, det[0].length).setFontWeight('bold').setBackground('#E6EFE9');
  s2.setFrozenRows(1);
  s2.autoResizeColumns(1, det[0].length);

  return { url: ss.getUrl(), name: title, rows: det.length - 1 };
}


// ===========================================================================
// XUẤT PDF NỬA THÁNG (前半 1–15 · 後半 16–cuối)
// ===========================================================================
// Dựng một trang HTML gọn (bảng tên × ngày, cột tổng giờ nửa tháng), để
// Google đổi sang PDF rồi cất vào thư mục riêng trong Drive của quản lý. Trả
// về link để mở / gửi qua LINE. Không tải thẳng xuống máy vì khung iframe của
// Apps Script chặn tải file.
//
// KHÔNG in 予算 vào PDF: file này hay được gửi cho nhân viên.

var HALF_SPLIT = 15;
var PDF_FOLDER = 'SUBWAY シフト — PDF';

var PDF_TXT = {
  vi: { title: 'Lịch làm việc', first: 'Nửa đầu', second: 'Nửa sau' },
  en: { title: 'Shift schedule', first: 'First half', second: 'Second half' },
  ja: { title: 'シフト表', first: '前半', second: '後半' }
};

function pdfFolder_() {
  var it = DriveApp.getFoldersByName(PDF_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(PDF_FOLDER);
}


/**
 * Quản lý gửi lên trang HTML lịch nửa tháng (dựng sẵn trên máy, giống hệt bản
 * in), máy chủ đổi sang PDF rồi cất vào Drive. Dựng HTML trên máy quản lý để
 * bản PDF và bản in ra giấy luôn là MỘT, không phải giữ hai mẫu song song.
 *
 * half = 'first' | 'second'; lang chỉ dùng để đặt tên file.
 */
var PDF_MAX_CHARS = 3000000;
function savePrintPdf(token, yearMonth, half, html, lang) {
  yearMonth = assertYearMonth_(yearMonth);
  requireManager_(token);
  if (!/^\d{4}-\d{2}$/.test(String(yearMonth))) throw new Error('Tháng không hợp lệ.');
  half = (half === 'second') ? 'second' : 'first';
  lang = PDF_TXT[lang] ? lang : 'vi';
  html = String(html || '');
  if (!/^\s*<!DOCTYPE html>/i.test(html) || html.length > PDF_MAX_CHARS) throw new Error('Dữ liệu bản in không hợp lệ.');
  // Chỉ cần bảng và chữ: bỏ mọi script / sự kiện / tài nguyên ngoài cho chắc.
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '')
             .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '')
             .replace(/<(link|iframe|object|embed|img)\b[^>]*>/gi, '');
  var y = Number(String(yearMonth).slice(0, 4)), m = Number(String(yearMonth).slice(5, 7));
  var nDays = new Date(y, m, 0).getDate();
  var from = half === 'second' ? HALF_SPLIT + 1 : 1, to = half === 'second' ? nDays : HALF_SPLIT;
  var T = PDF_TXT[lang];
  var name = (readSettings_().storeName || 'SUBWAY') + ' ' + T.title + ' ' + yearMonth + ' ' +
             (half === 'second' ? T.second : T.first) + ' (' + from + '-' + to + ')';
  var pdf = Utilities.newBlob(html, 'text/html', name + '.html').getAs('application/pdf').setName(name + '.pdf');
  // v.7: gửi thẳng file về máy (b64) — tải xuống ngay, KHÔNG phải mở link Drive (đỡ bị Google
  // hỏi đăng nhập / xác minh). Vẫn cất một bản vào Drive làm lưu trữ; lỗi Drive không chặn việc tải.
  // Tên file tải về chỉ dùng chữ Latin/số (vài trình duyệt điện thoại đổi tên có chữ Nhật thành "download").
  var store = String(readSettings_().storeName || '').replace(/[^A-Za-z0-9 _.-]+/g, ' ').replace(/\s+/g, '_').replace(/^_+|_+$/g, '') || 'SUBWAY';
  var out = { name: name + '.pdf', file: store + '_shift_' + yearMonth + '_' + from + '-' + to + '.pdf',
              b64: Utilities.base64Encode(pdf.getBytes()), url: '', folderUrl: '' };
  try {
    var folder = pdfFolder_();
    // Xuất lại cùng nửa tháng thì bỏ bản cũ vào thùng rác, khỏi rối thư mục.
    var it = folder.getFiles();
    while (it.hasNext()) { var f = it.next(); if (f.getName() === name + '.pdf') f.setTrashed(true); }
    var file = folder.createFile(pdf);
    out.url = file.getUrl(); out.folderUrl = folder.getUrl();
  } catch (eD) { /* chỉ mất bản lưu Drive, file vẫn tải về được */ }
  return out;
}

// ===========================================================================
// TIỆN ÍCH BẢO TRÌ (chạy tay từ trình soạn thảo Apps Script khi cần)
// ===========================================================================

/**
 * Hai hàm bảo trì bên dưới vẫn là hàm "public" theo quy ước đặt tên, nên về lý
 * thuyết google.script.run gọi tới được. Guard này chặn điều đó: khi chạy tay
 * trong trình soạn thảo, người chạy chính là chủ script (active === effective);
 * còn khi bị gọi từ trang web bởi khách ẩn danh thì active rỗng -> ném lỗi.
 */
function requireOwner_() {
  var active = Session.getActiveUser().getEmail();
  var effective = Session.getEffectiveUser().getEmail();
  if (!active || active !== effective) {
    throw new Error('Hàm này chỉ chạy được trực tiếp trong trình soạn thảo Apps Script bởi chủ sở hữu script.');
  }
}

/** Quên mật khẩu quản lý: chạy hàm này để quay về mật khẩu mặc định ở đầu file. */
function resetManagerPasswordToDefault() {
  requireOwner_();
  props_().deleteProperty('MANAGER_PWD_HASH');
  bumpMgrVer_();                                   // v41: phiên quản lý cũ hết hiệu lực
  Logger.log('Đã xoá mật khẩu quản lý. Mật khẩu hiện tại: ' + DEFAULT_MANAGER_PASSWORD);
}

/** Dọn rác từ bản cũ: sheet EmpMap và các dòng KV có scope theo email. */
function cleanUpLegacyData() {
  requireOwner_();
  var ss = activeSS_();
  var old = ss.getSheetByName('EmpMap');
  if (old) ss.deleteSheet(old);
  var sheet = getSheet_();
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    var scope = String(data[i][1]);
    if (scope !== 'shared') { sheet.deleteRow(i + 1); ROWIDX_ = {}; }
  }
  CacheService.getScriptCache().removeAll(['kv:shared:employees']);
  Logger.log('Đã dọn xong dữ liệu cũ.');
}

// ===========================================================================
// KẾT NỐI CÁC QUÁN — XIN CHI VIỆN
// ===========================================================================
// Mỗi quán là một bản app riêng (Sheet + link riêng) nhưng cùng một tài khoản
// Google, nên cả hai cùng mở được MỘT bảng tính chung trong Drive:
//   "SUBWAY シフト — Kết nối các quán (chi viện)"
// Bảng chung chỉ chứa yêu cầu chi viện, mỗi yêu cầu một dòng [id, json, lúc sửa]:
//   { id, from, fromName, date:'YYYY-MM-DD', start, end, atClose, count, note,
//     status:'open'|'cancelled', at,
//     offers:[{ oid, store, storeName, empId, empName, at,
//               homeOk, hostOk, withdrawn, applied }] }
// Quy trình: quán thiếu người đăng yêu cầu → nhân viên quán kia bấm "Tôi đi
// được" (hoặc quản lý cử) → quản lý quán NHÀ đồng ý cho đi + quản lý quán CẦN
// NGƯỜI nhận → ca tự vào lịch của quán nhà dưới dạng ✈️ hỗ trợ tiệm khác, và
// quán cần người thấy người đó trong ô ngày (tính vào số người có mặt).
// Chỉ chia sẻ TÊN nhân viên — không số điện thoại, không LINE, không tiền lương.
var HUB_NAME = 'SUBWAY シフト — Kết nối các quán (chi viện)';
var HUB_SHEET = 'requests';

function hubOn_() { return !!readSettings_().hubOn; }
function myStore_() {
  return { id: activeSS_().getId(), name: storeLabel_() };
}
function todayStr_() { return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); }  // giờ Nhật

/** Mở (hoặc tạo lần đầu) bảng tính chung. Nhiều bản trùng tên thì lấy bản tạo sớm nhất. */
function hubSheet_(create) {
  var props = props_(), id = props.getProperty('hubId'), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    var it = DriveApp.getFilesByName(HUB_NAME), best = null;
    while (it.hasNext()) {
      var f = it.next();
      try { if (f.isTrashed()) continue; } catch (e1) {}
      if (!best || f.getDateCreated().getTime() < best.getDateCreated().getTime()) best = f;
    }
    if (best) ss = SpreadsheetApp.openById(best.getId());
    else if (create) ss = SpreadsheetApp.create(HUB_NAME);
    if (ss) props.setProperty('hubId', ss.getId());
  }
  if (!ss) return null;
  var sh = ss.getSheetByName(HUB_SHEET);
  if (!sh) { sh = ss.insertSheet(HUB_SHEET); sh.appendRow(['id', 'json', 'updatedAt']); }
  return sh;
}
/**
 * Nhân viên đi chi viện: "làm cùng" là người của QUÁN ĐƯỢC CHI VIỆN hôm đó (đọc thẳng từ bảng tính của quán kia —
 * cùng tài khoản Google), kèm những người quán khác cũng tới giúp. Trả null nếu hôm đó mình không đi chi viện.
 */
function supportTeam(token, yearMonth, day) {
  var who = auth_(token);
  var ym = assertYearMonth_(yearMonth), d = String(Number(day));
  if (who.r !== 'emp') return null;
  var me = String(who.e);
  var mine = (readMonthNormalized_('schedule:' + ym, readEmployees_())[d] || {})[me];
  var sup = mine && mine.shifts ? mine.shifts.filter(function (x) { return x && x.isSupport && x.supTo && x.supTo.id; })[0] : null;
  if (!sup) return null;
  var hostId = sup.supTo.id;
  var hrow = supRows_().filter(function (x) { return x.id === hostId; })[0] || { id: hostId, name: sup.supTo.name, code: sup.supTo.code || '', emps: [] };
  var out = { store: hrow.name || sup.supTo.name || '', start: Number(sup.start), end: Number(sup.end), rows: [] };
  try {
    var hd = peerStoreData_(hubSS_(false), hrow, ym) || { emps: [], sched: {}, err: true };
    if (hd.err) out.err = true;
    var names = {};
    (hd.emps || []).forEach(function (em) { if (em && em.id) names[em.id] = em.name; });
    var dm = (hd.sched || {})[d] || {};
    // Quán kia bật "nhân viên chỉ thấy lịch đã công bố" mà ngày đó chưa chốt → không lộ bản nháp của họ.
    var hl = String(hd.lock || '');
    var hLocked = hl === '1' || (hl === 'h1' && Number(d) <= HALF_SPLIT);
    if (hd.hideDraft === true && !hLocked) { if (Object.keys(dm).length) out.hidden = true; dm = {}; }
    Object.keys(dm).forEach(function (id) {
      var x = dm[id]; if (!x || x.off || !x.shifts) return;
      var s2 = x.shifts.filter(function (y) { return y && !y.isSupport; }).map(function (y) {
        var o = { start: Number(y.start), end: Number(y.end) };
        if (y.bs != null && y.be != null) { o.breakStart = Number(y.bs); o.breakEnd = Number(y.be); }
        return o;
      });
      if (s2.length) out.rows.push({ name: names[id] || '?', shifts: s2 });
    });
  } catch (e2) { out.err = true; }
  var myStore = myStore_().id;
  ((supScan_(ym, hostId) || {})[d] || []).forEach(function (g) {
    var o = { start: g.start, end: g.end }; if (g.bs != null && g.be != null) { o.breakStart = g.bs; o.breakEnd = g.be; }
    out.rows.push({ name: g.empName, guest: g.storeName, me: g.store === myStore && String(g.empId) === me, shifts: [o] });
  });
  return out;
}

// ===========================================================================
// BÁO CÁO THÁNG (v.6): số bán từ máy POS · doanh thu ngày · công thức định lượng ·
// kiểm kê cuối tháng (棚卸) · ước tính 原価 / 人件費. CHỈ QUẢN LÝ.
//   pos:<YM>   : { at, files:[{name,from,to,at}], it:{ code:{n,c1,c2,d:{ngày:số}} } }
//   sales:<YM> : { d:{ngày:yen} }
//   rcp        : [ { id(mã hàng 発注), u, spp, r:[[nhóm, mẫu tên, lượng, tuyệt đối]], bread?, veg?, note?, est? } ]
//   inv:items  : danh mục kiểm kê (theo đúng thứ tự file 棚卸表 của công ty)
//   inv:<YM>   : { c:{ mã:[箱, 中箱/袋, バラ] }, at, by, fin }
// ===========================================================================
var RCP_SEED = [{"id":"21010010","u":"R","spp":100,"bread":"wheat","note":"ハニーウィート：ウィート＋ハニーオーツ"},{"id":"21010009","u":"R","spp":100,"bread":"white","note":"イタリアンホワイト：ホワイト＋セサミ"},{"id":"21440005","u":"R","spp":250,"bread":"oats","note":"Rｻﾝﾄﾞ250食/袋"},{"id":"21440002","u":"R","spp":250,"bread":"sesame","note":"Rｻﾝﾄﾞ250食/袋"},{"id":"28130027","u":"R","spp":42.9,"veg":"レタス","note":"900g ÷ 21g"},{"id":"28130009","u":"R","spp":84,"veg":"トマト","est":1,"note":"28個 × 6枚 ÷ 2枚 (ước tính)"},{"id":"28130012","u":"R","spp":133,"veg":"ピーマン","note":"400g ÷ 3g"},{"id":"28130032","u":"R","spp":85.7,"veg":"オニオン","note":"600g ÷ 7g"},{"id":"23310008","u":"スクープ","spp":106,"note":"約106食/箱","r":[["U","アボカドベジー|えびアボカド|アボカドチキン|アボカド[&＆]ローストビーフ",1,0],["T","アボカド×2",2,1],["T","アボカド",1,1]]},{"id":"24320004","u":"スクープ","spp":29.6,"note":"1kg ≈ たまごR 14.8食 (2スクープ)","r":[["U","キッズ(ハムたま|てりたま|たまご)",1,1],["U","たまご.*サンドセット|たまご[&＆]",1,1],["U","贅沢てりたま",2,0],["U","えびたま",1,0],["U","スパイシークラブハウス",1,0],["U","たまご",2,0],["T","たまご×2",2,1],["T","たまご",1,1]]},{"id":"24620003","u":"スクープ","spp":12.5,"est":1,"note":"420g ÷ ~32g (ước tính)","r":[["U","ツナ",2,0],["T","ツナ×2",2,1],["T","ツナ",1,1]]},{"id":"24610005","u":"尾","spp":125,"note":"125尾/袋","r":[["U","えびたま|えびアボカド|えびブロッコリー|えび・生ハム",5,0],["T","えび×2",10,1],["T","えび",5,1]]},{"id":"24510014","u":"個","spp":30,"note":"30個/袋","r":[["U","キッズてり",1,1],["U","贅沢てりたま",2,0],["U","てり焼き",2,0],["T","てり焼き",2,1]]},{"id":"24410011","u":"枚","spp":42,"note":"504g ≈ 14食×3枚","r":[["U","キッズハムたま",1,1],["U","ハム.*サンドセット|たまご[&＆]ハム",1,1],["U","アメリカンクラブハウス",3,0],["U","^#?(26W5ザクタル)?ハム|昼得ハム",3,0],["T","TPハム3枚",3,1]]},{"id":"24410010","u":"食","spp":120,"note":"約120食/箱 (4枚)","r":[["U","生ハム",1,0],["T","生ハム×2",2,1],["T","生ハム",1,1]]},{"id":"25020001","u":"食","spp":17,"note":"350g ÷ 20g","r":[["U","生ハムマスカルポーネ|えび・生ハム",1,0],["A","あんマス",0.5,1],["T","マスカルポーネ×2",2,1],["T","マスカルポーネ",1,1]]},{"id":"22120014","u":"食","spp":14.5,"note":"300g ÷ 20g","r":[["U","チーズオンチーズ",1,0],["T","クリームタイプチーズ×2",2,1],["T","クリームチーズ",1,1]]},{"id":"22120012","u":"枚","spp":18,"note":"18枚/袋","r":[["U","チーズオンチーズ",2,0],["U","チーズトースト|たまご[&＆]チーズ",1,1],["T","スライスチーズ×2",4,1],["T","^チーズ$",2,1]]},{"id":"24410014","u":"食","spp":23,"note":"240g 約23食 (3枚)","r":[["U","BLT|スパイシークラブハウス",1,0],["T","サラミ×2",2,1],["T","サラミ",1,1]]},{"id":"24410009","u":"枚","spp":400,"note":"約400食/箱 (1枚)","r":[["U","BLT|アメリカンクラブハウス|えびたまベーコン",1,0],["T","ベーコン×2",2,1],["T","^ベーコン$",1,1]]},{"id":"24510011","u":"食","spp":33,"note":"2kg ÷ 60g","r":[["U","サラダチキン|アボカドチキン|チリチキン|スパイシークラブハウス",1,0],["U","アメリカンクラブハウス",0.5,0],["T","サラダチキン|チリチキン",1,1]]},{"id":"24110016","u":"食","spp":null,"note":"35g/R","r":[["U","ローストビーフ",1,0],["T","ローストビーフ",1,1]]},{"id":"24510016","u":"食","spp":18,"note":"1kg 18食 (2個)","r":[["U","グリルチキン|グリチキ",1,0],["T","グリルチキン",1,1]]},{"id":"24510015","u":"食","spp":null,"r":[["U","タンドリー",1,0],["T","タンドリー",1,1]]},{"id":"28130035","u":"スクープ","spp":null,"note":"13g/R","r":[["U","えびブロッコリー",1,0],["A","ブロッコリー2スクープ",2,1],["A","ブロッコリー1スクープ",1,1]]},{"id":"25020022","u":"スクープ","spp":null,"r":[["U","ザクタル",2,0],["A","TPザクタル4スクープ",4,1],["A","TPザクタル2スクープ",2,1]]},{"id":"22120016","u":"食","spp":21,"note":"450g ÷ 20g","r":[["U","チーズ[&＆]ステーキ",1,0],["T","チェダーチーズソース",1,1]]},{"id":"24110013","u":"食","spp":6,"note":"300g ÷ 50g","r":[["U","チーズ[&＆]ステーキ",1,0]]},{"id":"27110019","u":"S","spp":89.6,"note":"S約89.6食/箱","r":[["P","M",1.67,1],["P","S",1,1]]},{"id":"25040033","u":"S","spp":196,"note":"S約196食 M約90食/袋","r":[["P","トリプルチーズ.*M",2.18,1],["P","トリプルチーズ",1,1]]},{"id":"25040032","u":"S","spp":196,"est":1,"r":[["P","ハーブソルト.*M",2.18,1],["P","ハーブソルト",1,1]]},{"id":"25040007","u":"食","spp":144,"note":"5g","r":[["C","マヨネーズタイプ多め",2,1],["C","マヨネーズタイプ",1,1]]},{"id":"25010010","u":"食","spp":36.8,"note":"5g","r":[["C","バジルソース多め",2,1],["C","バジルソース",1,1]]},{"id":"25040022","u":"食","spp":95,"note":"10g","r":[["C","シーザー(サラダ)?ドレッシング多め",2,1],["C","シーザー",1,1]]},{"id":"25020004","u":"食","spp":72,"note":"10g","r":[["C","野菜クリーミードレッシング多め",2,1],["C","野菜クリーミー",1,1],["U","たまご[&＆]|サンドセット",0.5,1]]},{"id":"25020013","u":"食","spp":34.5,"note":"10g","r":[["C","チポトレ.*多め",2,1],["C","^チポトレ",1,1]]},{"id":"25020020","u":"食","spp":75,"note":"10g","r":[["C","ハニーマスタード多め",2,1],["C","ハニーマスタード",1,1]]},{"id":"25040010","u":"食","spp":63,"note":"5g","r":[["C","チリソース多め",2,1],["C","^チリソース",1,1]]},{"id":"25040028","u":"食","spp":94,"note":"5g","r":[["C","てり焼き(ソース|ｿｰｽ)多め",2,1],["C","てり焼き(ソース|ｿｰｽ)",1,1]]},{"id":"25040029","u":"個","spp":50,"note":"50個/袋","r":[["C","オイル＆ビネガー",1,1]]},{"id":"29140005","u":"食","spp":1200,"note":"1,200食/箱","r":[["C","ピクルス増量",2,1],["C","^ピクルス$",1,1]]},{"id":"29140002","u":"食","spp":300,"note":"300食/袋","r":[["C","オリーブ増量",2,1],["C","^オリーブ$",1,1]]},{"id":"29140003","u":"食","spp":70,"note":"70食/缶","r":[["C","ホットペッパー増量",2,1],["C","^ホットペッパー$",1,1]]},{"id":"27110017","u":"食","spp":11,"note":"約11食/袋","r":[["A","^トマト＆クラム$",1,1]]},{"id":"21210003","u":"枚","spp":75,"r":[["A","チョコチップクッキー",1,1]]},{"id":"21210004","u":"枚","spp":75,"r":[["A","マカダミアクッキー",1,1]]},{"id":"41150040","u":"枚","spp":500,"note":"1 ổ / 1 tờ","r":[["U",".",1,1]]},{"id":"33260066","u":"枚","spp":400,"note":"1 ổ / 1 tờ","r":[["U",".",1,1]]},{"id":"41250041","u":"枚","spp":1500,"r":[["A","^レジ袋$",1,1]]},{"id":"41150043","u":"枚","spp":500,"r":[["P",".",1,1]]},{"id":"41150035","u":"個","spp":100,"r":[["D","^(?!.*(ホット|セット|ラテ)).*S[＊※]?$",1,1]]},{"id":"41250009","u":"枚","spp":100,"r":[["D","^(?!.*(ホット|セット)).*S[＊※]?$",1,1]]},{"id":"41150036","u":"個","spp":50,"r":[["D","^(?!.*(ホット|セット)).*M[＊※]?$",1,1]]},{"id":"41150037","u":"個","spp":50,"r":[["D","^(?!.*(ホット|セット)).*L[＊※]?$",1,1]]},{"id":"41250010","u":"枚","spp":100,"r":[["D","^(?!.*(ホット|セット)).*[ML][＊※]?$",1,1]]},{"id":"41150033","u":"個","spp":50,"r":[["D","ホット.*S[＊※]?$",1,1]]},{"id":"41250023","u":"枚","spp":50,"r":[["D","ホット.*S[＊※]?$",1,1]]},{"id":"41150034","u":"個","spp":25,"r":[["A","^トマト＆クラム$|コーンスープ",1,1]]},{"id":"41250018","u":"枚","spp":100,"r":[["A","^トマト＆クラム$|コーンスープ",1,1]]}];
var INV_SEED = [["21010006","イタリアンホワイト２１","food","frz",50,"本","10本×5袋/箱",1,"Rｻﾝﾄﾞ100食/箱",1996,50,10],["21010007","ハニーウィート24","food","frz",50,"本","10本×5袋/箱",1,"Rｻﾝﾄﾞ100食/箱",1984,50,10],["24410014","サラミ風ドライソーセージ(’25)","food","frz",1,"袋","240g/袋",null,"約23食/袋",385,1,1],["24410008","粗挽きソーセージ（’２２）","food","frz",10,"本","10本/袋",1,"10食/袋",718,10,10],["24410009","ベーコン 300g (x 20袋)","food","frz",20,"袋","300g×20袋/箱",1,"約400食/箱",13662,20,1],["24410010","生ハム","food","frz",12,"袋","300g×12袋/箱",1,"約120食/箱",7338,12,1],["24510014","てり焼きチキン 30個入り","food","frz",30,"個","30個/袋",1,"15食/袋",1175,30,30],["24510011","チキンストリップス","food","frz",1,"袋","2,000g/袋",1,"約33食/袋",2041,1,1],["24610005","えび (’22)","food","frz",1,"袋","500g/袋",1,"約24食以上/袋",1172,1,1],["23310008","アボカド","food","frz",12,"袋","340g x 12袋/箱",0.85,"約106食/箱",5352,12,1],["25010001","バジルソース","food","frz",1,"袋","200g/袋",0.92,"約36.8食/袋",282,1,1],["27110019","ポテトTM('26)","food","frz",10,"袋","1kg×10袋/箱",0.807,"S約89.6食/箱",4916,10,1],["22310005","バニラアイスクリーム 4L","food","frz",1,"箱","4000g/箱",1,"約50食/箱",1517,1,1],["22310004","Dアイス 60NB","food","frz",40,"個","40個/箱",1,"40食/袋",1872,40,1],["27110016","カントリーコーンスープ1kg","food","frz",1,"袋","1000g/袋",null,"約11食/袋",806,1,1],["27110017","トマト＆クラムスープ1kg","food","frz",1,"袋","1000g/袋",null,"約11食/袋",986,1,1],["24110013","新ローストビーフ","food","frz",1,"袋","300g/袋",1,"約6食/袋",1055,1,1],["24410011","ロースハム","food","frz",1,"袋","504g/袋",null,"約14食/袋",748,1,1],["24510016","グリルチキン","food","frz",1,"袋","1kg/袋",null,"18食/袋",1252,1,1],["24410017","燻製ベーコンビッツ500g","food","frz",1,"袋","500g/袋",null,"約31食/袋",969,1,1],["21210003","クッキーチョコチップ","food","frz",1,"PK","75枚/PK",null,"75食/PK",5058,1,1],["21210004","クッキーホワイトチョコマカデミア","food","frz",1,"PK","75枚/PK",null,"75食/PK",5058,1,1],["23210002","冷凍スライスレモン","food","frz",1,"PK","300g/PK",null,"約20食/袋",451,1,1],["21010008","フラットブレッド","food","frz",60,"枚","10枚(20食)×6袋/箱",null,"120食/箱",7608,60,10],["25040047","メキシカンソース","food","frz",1,"PK","400g/PK",null,"約12食/PK",451,1,1],["24110015","タコスミート","food","frz",1,"PK","1,000g/PK",null,"約19食/PK",900,1,1],["21210005","クッキーダブルチョコ","food","frz",1,"PK","75枚/PK",null,"約75食/袋",5058,1,1],["24320002","タマゴサラダ1kg","food","chl",1,"袋","1kg/袋",0.95,"約14.8食/袋（たまごR)",711,1,1],["10020024","フォープロユースミルク","food","chl",1,"本","1000ml/本",0.98,"",230,1,1],["22120014","クリームタイプチーズ (ブルーチーズ)","food","chl",1,"袋","300g/袋",0.97,"約14.5食/袋",477,1,1],["25020001","マスカルポーネチーズ","food","chl",1,"袋","350g/袋",0.97,"約17食/袋",550,1,1],["25020011","わさび醤油ソース","food","chl",1,"本","1055g/本",0.95,"約200食/本",510,1,1],["25020004","野菜クリーミードレッシング","food","chl",1,"袋","780g/袋",0.95,"約72食/袋",662,1,1],["25020013","チポトレサウスウェストソース（'22）","food","chl",1,"袋","376g/袋",0.94,"約34.5食/袋",307,1,1],["24620003","ツナ（オニオン入り23）","food","chl",1,"袋","420g/袋",0.95,"",514,1,1],["22120011","シュレッドチーズミックス（価格改定）","food","chl",1,"袋","500g /袋",0.99,"ﾋﾟｻﾞｻﾌﾞ約12食/袋",618,1,1],["22120013","チーズソース","food","chl",1,"PK","450g/PK",null,"約22食/PK",614,1,1],["22120012","スライスチーズ(‘24)　(価格改定）","food","chl",1,"袋","18枚/袋",1,"18食/袋",560,1,1],["25020020","ハニーマスタードソース","food","chl",1,"袋","800g/袋",1,"75食/袋",676,1,1],["24320005","QPのサラダ 大地のじゃがいものサラダ","food","chl",1,"PK","1,000g/袋",1,"約32食/袋",550,1,1],["22120016","チェダーチーズソース（'25）","food","chl",1,"PK","450g/PK",null,"約21食/PK",349,1,1],["28130027","カットレタス 900G","food","veg",1,"袋","900g/袋",null,"",708,1,1],["28130009","トマト《ケース》","food","veg",28,"個","28個/箱",null,"",3235,28,1],["28130012","カットピーマン 400G","food","veg",1,"袋","400g/袋",null,"",613,1,1],["28130032","オニオンスライス600g","food","veg",1,"袋","600g/袋",null,"",485,1,1],["25040022","シーザーサラダドレッシング","food","amb",1,"本","1000ml/本",0.95,"約95食/本",775,1,1],["25040007","マヨネーズタイプ","food","amb",1,"袋","1000g/袋",0.72,"約144食/袋",450,1,1],["25040012","トマトケチャップ","food","amb",40,"個","8g×40個/袋",1,"",197,40,40],["25040028","てり焼きソース（‘23）","food","amb",1,"本","500g/本",0.94,"",301,1,1],["25040029","VOパック23","food","amb",50,"個","50個/袋",1,"",434,50,50],["21440005","ハニーオーツミックス(‘25)","food","amb",1,"袋","1000g/袋",1,"Rｻﾝﾄﾞ250食/袋",1469,1,1],["29140003","ハラペーニョ (SO)","food","amb",1,"缶","固形量353g/缶",1,"約210個入　70食/缶（Rｻﾝﾄﾞ）",315,1,1],["29140005","ピクルス","food","amb",6,"袋","固形量1200g×6/箱",1,"約3,600枚入　1,200食/箱（Rｻﾝﾄﾞ）",4010,6,1],["29140002","オリーブ (袋)","food","amb",1,"袋","固形量935g/袋",1,"約900個入　300食/袋（Rｻﾝﾄﾞ）",854,1,1],["29140007","スライスオリーブ (小缶) '21","food","amb",1,"缶","固形量184g/缶",1,"約180個入　60食/缶（Rｻﾝﾄﾞ）",237,1,1],["25040030","精製塩","food","amb",1,"袋","1,000g/袋",1,"",172,1,1],["29140006","ブラックペッパーグラインド","food","amb",1,"袋","100g/袋",1,"",287,1,1],["21440002","洗いごま 1kg","food","amb",1,"袋","1000g/袋",1,"Rｻﾝﾄﾞ250食/袋",692,1,1],["25040032","ハーブソルト(‘24)","food","amb",1,"袋","200g/袋",0.98,"",474,1,1],["25040033","チーズフレーバー(‘24)","food","amb",1,"袋","200g/袋",0.98,"S約196食　M約90食/袋",546,1,1],["10040031","セイロンティー50個入り","food","amb",50,"個","50個/袋",1,"50杯/袋",522,50,50],["10040009","サントリーオレンジ 100","food","amb",6,"本","1000ml×6本/箱",0.98,"S約27杯/箱（ｵﾚﾝｼﾞｼﾞｭｰｽ）",2100,6,1],["10040016","BIBポップメロン 2.5G","food","amb",1,"箱","9460ml",1,"S約258杯/箱",7104,1,1],["10040013","BIBウーロン茶 1G","food","amb",1,"箱","3785ml",1,"S約172杯/箱",3991,1,1],["10040014","BIBジンジャエール 2.5G","food","amb",1,"箱","9460ml",1,"S約258杯/箱",7104,1,1],["10040011","BIBペプシ 2.5G","food","amb",1,"箱","9460ml",1,"S約258杯/箱",6655,1,1],["10040012","BIBアイスティー 1G","food","amb",1,"箱","3785ml",1,"S約172杯/箱",3991,1,1],["10040017","BIBペプシネックス 2.5G","food","amb",1,"箱","9460ml",1,"S約258杯/箱",6655,1,1],["10040015","炭酸ガス 5KG","food","amb",1,"本","5kg/本",0.98,"S約1100杯/箱",1400,1,1],["10040020","炭酸ガス 7KG","food","amb",1,"本","7kg/本",0.98,"S約1540杯/箱",1642,1,1],["10040038","ホットコーヒー(‘23)","food","amb",12,"袋","500g×12袋/箱",1,"S約666杯/箱（ﾎｯﾄｺｰﾋｰ）",11874,10,1],["10040028","アイスコーヒー ('20)","food","amb",12,"袋","500g×12袋/箱",1,"S約414杯/箱（ｱｲｽｺｰﾋｰ）",11163,12,1],["10040033","ポーションミルク (3ml)","food","amb",50,"個","50個/袋",1,"50個/袋",167,50,50],["10040022","野菜果実ジュース","food","amb",1,"本","1000ml/本",0.98,"S約4.5杯/本",244,1,1],["10040039","ガムシロップ(‘24)","food","amb",400,"個","50個×8袋/箱",1,"400個/箱",1611,400,50],["26140006","チーズタルトNB（終売）","food","amb",6,"個","6個/箱",1,"6食/箱",662,6,1],["26140005","チョコブラウニーNB（終売）","food","amb",6,"個","6個/箱",1,"6食/箱",647,6,1],["25040018","ピザソース 500g","food","amb",1,"袋","500g/袋",0.95,"",306,1,1],["10040036","スティックシュガー","food","amb",300,"本","300本/袋",1,"300本/袋",526,300,1],["10040032","ハーブティー　50個入り","food","amb",50,"個","50個/箱",1,"50杯/箱",533,50,50],["25040010","チリソース (激辛)","food","amb",1,"袋","1000g/袋",0.95,"約63食/袋",888,1,1],["23240004","(袋) TFゆであずき","food","amb",1,"袋","180g/袋",0.83,"6インチ約3食/袋",188,1,1],["25040021","レモンドレッシング","food","amb",1,"袋","380ml/袋",0.97,"380ml=395g 　6インチ約38.3食/袋",248,1,1],["10040045","アイスコーヒー豆　500g（’25）","food","amb",12,"袋","500g×12袋/箱",null,"約Sサイズ353杯/箱",18642,12,1],["10040043","ホットコーヒー豆 200G （’25）","food","amb",24,"袋","200g×24袋/箱",null,"約Sサイズ458杯/箱",15346,24,1],["10040046","アイスコーヒー粉　500g（’25）","food","amb",12,"袋","500g×12袋/箱",null,"約Sサイズ353杯/箱",21312,12,1],["25040045","チミチュリソース400ｇ","food","amb",1,"PK","400g/PK",null,"約37食/本",368,1,1],["25040042","具たっぷりソース トマトガーリック","food","amb",1,"本","1080g/本",null,"約51食/本",792,1,1],["25040044","クラシックBBQソース","food","amb",1,"本","590g/本",null,"約44食/本",561,1,1],["25040046","ランチソース","food","amb",1,"PK","900g/PK",null,"",1113,1,1],["10040048","モヒートミント","food","amb",1,"本","1,000ml/本",null,"約49食/本",1446,1,1],["33250028","Sラベル テリヤキチキン ('23)","pack","pkg",1,"巻","1巻/袋",null,"",422,1,1],["33250029","Sラベル ツナ ('23)","pack","pkg",1,"巻","1巻/袋",null,"",422,1,1],["33250030","Sラベル ローストビーフ ('23)","pack","pkg",1,"巻","1巻/袋",null,"",422,1,1],["33250033","Sラベル タマゴ ('23)","pack","pkg",1,"巻","1巻/袋",null,"",422,1,1],["33250027","Sラベル BLT ('23)","pack","pkg",1,"巻","1巻/袋",null,"",422,1,1],["33250034","Sラベル ベジー ('23)","pack","pkg",1,"巻","1巻/袋",null,"",422,1,1],["33250031","Sラベル えび ('23)","pack","pkg",1,"巻","1巻/袋",null,"",397,1,1],["33250032","Sラベル アボカド ('23)","pack","pkg",1,"巻","1巻/袋",null,"",422,1,1],["33250024","Sラベル キャンペーン ('23)","pack","pkg",1,"巻","1巻/袋",null,"",422,1,1],["33250026","Sラベル 生ハム ('23)","pack","pkg",1,"巻","1巻/袋",null,"",422,1,1],["33250041","Sラベル ハム (’24)","pack","pkg",1,"袋","600g/袋",null,"",422,1,1],["33250025","Sラベル 白無地 ('23)","pack","pkg",1,"巻","1巻/袋",null,"",350,1,1],["33250035","Sラベル チリチキン ('23)","pack","pkg",1,"巻","1巻/袋",null,"",422,1,1],["33250036","Sラベル チーズ ('23)","pack","pkg",1,"巻","1巻/袋",null,"",422,1,1],["33250037","Sラベル えびタマ ('23)","pack","pkg",1,"巻","1巻/袋",null,"",422,1,1],["33250040","Sラベル サラダチキン ('23)","pack","pkg",1,"巻","1巻/袋",null,"",422,1,1],["33250038","Sラベル チーズサラダチキン ('23)","pack","pkg",1,"巻","1巻/袋",null,"",397,1,1],["41150028","チョイスマークラベル 小","pack","pkg",1,"巻","1巻/袋",null,"1,000枚/巻",640,1,1],["33250023","おしぼり","pack","pkg",500,"枚","500枚/袋",null,"",770,500,100],["41150030","紙ナプキン","pack","pkg",10000,"枚","10,000枚/箱",null,"",5584,10000,750],["41150049","紙ナプキンC(切替品)","pack","pkg",20400,"枚","20,400枚/箱",null,"",6760,20400,1700],["41150014","サンドケース (KH-14) 50枚入","pack","pkg",50,"個","50個/本",null,"",531,50,50],["41150040","サブラップ(’24)","pack","pkg",500,"枚","500枚/袋",null,"",1462,500,500],["41250041","Tシャツバッグ ('22)","pack","pkg",1500,"枚","100枚×15袋",null,"",4834,1500,100],["41250040","フットロング用Tシャツバッグ","pack","pkg",100,"枚","100枚/袋",null,"",241,100,100],["41150038","4カップキャリー　300枚","pack","pkg",300,"枚","300枚/袋",null,"",3316,300,300],["33260019","割りばし","pack","pkg",100,"本","100本/袋",null,"",223,100,100],["41250042","ストロー ('23)","pack","pkg",2000,"本","500本×4袋/袋",null,"",1545,2000,500],["41250027","マドラースプ-ン","pack","pkg",1000,"本","1000本/袋",null,"",842,1000,1000],["41250012","スプーン","pack","pkg",500,"本","500本/袋",null,"",2493,500,500],["41250013","フォーク","pack","pkg",500,"本","500本/箱",null,"",1883,500,500],["41150043","ポテト袋（‘25）","pack","pkg",500,"枚","500枚/本",null,"",2222,500,500],["41250029","ロゴ入りプラリッド","pack","pkg",100,"枚","100枚/本",null,"",285,100,100],["41250034","ロゴ入りプラドームリッド","pack","pkg",100,"枚","100枚/本",null,"",396,100,100],["41150033","ホットカップ(白)S","pack","pkg",50,"個","50個/袋",null,"",472,50,50],["41250023","ホットカップリッド S","pack","pkg",50,"枚","50個/袋",null,"",234,50,50],["41250050","スプーン黒14㎝","pack","pkg",500,"本","500本/袋",null,"",2327,500,50],["41250051","フォーク黒16㎝","pack","pkg",500,"本","500本/箱",null,"",2172,500,50],["41150032","ホットカップ(白)M","pack","pkg",50,"個","50個/袋",null,"",600,50,50],["41250024","ホットカップリッド M","pack","pkg",50,"枚","50個/袋",null,"",300,50,50],["41150035","コールドカップ(白) S","pack","pkg",100,"個","100個/袋",null,"",593,100,100],["41250009","コールドカップリッド 12oz S","pack","pkg",100,"枚","100枚/袋",null,"",266,100,100],["41150036","コールドカップ(白) M","pack","pkg",50,"個","50個/袋",null,"",390,50,50],["41150037","コールドカップ(白) L","pack","pkg",50,"個","50個/袋",null,"",504,50,50],["41250010","コールドリッド 16oz/22oz M/L","pack","pkg",100,"枚","100枚/袋",null,"",310,100,100],["41150034","スープカップ(白)","pack","pkg",25,"個","25個/袋",null,"",332,25,25],["41250018","スープカップリッド","pack","pkg",100,"枚","100個/袋",null,"",823,100,100],["41250031","ミニサラダカップ","pack","pkg",100,"個","100個/袋",null,"",388,100,100],["41250030","ミニサラダカップリッド","pack","pkg",100,"枚","100枚/袋",null,"",327,100,100],["41250014","サラダボウル(終売)","pack","pkg",168,"枚","168個/箱",null,"",3303,168,168],["41250015","サラダボウルリッド(終売）","pack","pkg",168,"枚","168個/箱",null,"",3144,168,168],["41250053","代）サラダカップ","pack","pkg",50,"枚","50個/PK",null,"",983,50,50],["41250054","代）サラダリッド","pack","pkg",50,"枚","50個/PK",null,"",936,50,50],["41250033","ドレッシングカップ (サラダ用)","pack","pkg",100,"個","100個/本",null,"",320,100,100],["41250032","ドレッシングリッド (サラダ用)","pack","pkg",100,"枚","100枚/本",null,"",276,100,100],["41250007","パーティトレイ","pack","pkg",20,"枚","20枚/袋",null,"",1245,20,20],["41250006","パーティトレイリッド","pack","pkg",20,"枚","20枚/袋",null,"",975,20,20],["41250003","パーティトレイポリバッグ","pack","pkg",100,"枚","100枚/袋",null,"",1671,100,100],["41150008","テイク アウェイ ボックス","pack","pkg",150,"個","150個/箱",null,"",5147,150,150],["41150015","テイクアウト紙袋4号 (NB)","pack","pkg",500,"枚","500枚/袋",null,"",1386,500,500],["41250043","ロゴ入りプラカップ(´25)","pack","pkg",50,"個","50個/本",null,"",456,50,50],["41250004","ジャイアントサブBOX (パーティートレイBOX)","pack","pkg",5,"枚","5枚/袋",null,"(簡)14.8g/枚",1836,5,5],["41250026","スプーンストロー","pack","pkg",500,"本","500本/箱",null,"(簡)0.9g/本",446,500,500],["41250036","ピザBOX  SP-1","pack","pkg",100,"枚","100枚/箱",null,"",4016,100,100],["41150003","ランチボックス","pack","pkg",200,"枚","200枚/袋",null,"",5349,200,200],["41150029","ランチボックス N","pack","pkg",200,"枚","200枚/袋",null,"",5223,200,200],["33160129","キッズおもちゃ詰め合わせ","pack","pkg",50,"個","50個/袋",null,"",2965,50,50]];
function invNormItem_(x) {
  if (!x) return null;
  var arr = Array.isArray(x);
  var o = arr ? { code: x[0], name: x[1], g: x[2], zone: x[3], irisu: x[4], unit: x[5], pack: x[6], yld: x[7], serv: x[8], price: x[9], cs: x[10], mid: x[11] } : x;
  var name = String(o.name == null ? '' : o.name).trim().slice(0, 60); if (!name) return null;
  var num = function (v, lo, hi, def) { var n = Number(v); return isFinite(n) && n >= lo && n <= hi ? n : def; };
  var code = String(o.code == null ? '' : o.code).replace(/[^0-9A-Za-z_-]/g, '').slice(0, 20);
  return { code: code, key: code || ('n:' + name.slice(0, 30)), name: name, g: o.g === 'pack' ? 'pack' : 'food',
           zone: ['frz', 'chl', 'amb', 'veg', 'pkg'].indexOf(o.zone) !== -1 ? o.zone : 'amb',
           irisu: num(o.irisu, 1, 1000000, 1), unit: String(o.unit || '').slice(0, 6), pack: String(o.pack || '').slice(0, 40),
           yld: o.yld == null || o.yld === '' ? null : num(o.yld, 0, 1, null), serv: String(o.serv || '').slice(0, 40),
           price: Math.round(num(o.price, 0, 9999999, 0)), cs: num(o.cs, 1, 1000000, num(o.irisu, 1, 1000000, 1)),
           mid: num(o.mid, 1, 1000000, 1), hide: o.hide ? 1 : 0 };
}
function invItems_() {
  var raw = readJsonKey_('inv:items');
  var list = Array.isArray(raw) ? raw : (Array.isArray(raw.list) ? raw.list : INV_SEED);
  return list.map(invNormItem_).filter(Boolean);
}
function rcpList_() {
  var raw = readJsonKey_('rcp');
  return Array.isArray(raw.list) ? raw.list : RCP_SEED;
}
function bizNum_(v, lo, hi) { var n = Number(v); return isFinite(n) && n >= lo && n <= hi ? n : null; }
/** Mọi dữ liệu cho màn Báo cáo tháng (một lần gọi). */
function bizLoad(token, yearMonth) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth), pym = ymShift_(ym, -1);
  var hcm = readJsonKey_('hc:' + ym), buys = {};
  // Hàng đã đặt trong tháng (phiếu đã chốt / đã đặt) — tính 仕入 theo giá trong danh mục 発注.
  Object.keys(hcm).forEach(function (d) { var s = hcm[d]; if (s && s.fin && s.o) buys[d] = s.o; });
  var st = readSettings_();
  return { ym: ym, pos: readJsonKey_('pos:' + ym), posPrev: (function () { var p = readJsonKey_('pos:' + pym); return p && p.it ? { it: p.it } : null; })(),
           sales: readJsonKey_('sales:' + ym), salesPrev: readJsonKey_('sales:' + pym),
           rcp: rcpList_(), rcpSeed: RCP_SEED, invItems: invItems_(), inv: readJsonKey_('inv:' + ym), invPrev: readJsonKey_('inv:' + pym),
           hcItems: hcItems_(), hcCfg: hcCfg_(), buys: buys, wage: st.wage || 0 };
}
/** Gộp số bán từ file POS (đã đọc sẵn ở máy) vào tháng: ngày nào có trong file thì ghi đè ngày đó. */
function posImport(token, yearMonth, json) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth), inp;
  try { inp = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { inp = null; }
  if (!inp || typeof inp.it !== 'object') throw new Error('Dữ liệu file POS không hợp lệ.');
  var n = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate();
  var cur = readJsonKey_('pos:' + ym); if (!cur.it) cur = { it: {}, files: [] };
  var days = {}, rows = 0;
  Object.keys(inp.it).slice(0, 1500).forEach(function (code) {
    var x = inp.it[code]; if (!x || typeof x !== 'object') return;
    var k = String(code).replace(/[^\w\-#.]/g, '').slice(0, 24); if (!k) return;
    var o = cur.it[k] || { n: '', c1: '', c2: '', d: {} };
    o.n = String(x.n || o.n || '').slice(0, 60); o.c1 = String(x.c1 || o.c1 || '').slice(0, 20); o.c2 = String(x.c2 || o.c2 || '').slice(0, 20);
    Object.keys(x.d || {}).forEach(function (d) {
      var dd = Number(d), q = bizNum_(x.d[d], -9999, 99999);
      if (!(dd >= 1 && dd <= n) || q === null) return;
      days[dd] = 1;
      if (q) o.d[String(dd)] = Math.round(q * 100) / 100; else delete o.d[String(dd)];
    });
    cur.it[k] = o; rows++;
  });
  // Ngày có trong file mà món không còn bán → xoá số cũ của ngày đó (file mới là chuẩn)
  Object.keys(cur.it).forEach(function (k) {
    if (inp.it[k]) return;
    Object.keys(days).forEach(function (d) { delete cur.it[k].d[String(d)]; });
  });
  var dl = Object.keys(days).map(Number).sort(function (a, b) { return a - b; });
  cur.files = (cur.files || []).concat([{ name: String(inp.name || '').slice(0, 80), from: dl[0] || 0, to: dl[dl.length - 1] || 0, at: Date.now() }]).slice(-12);
  cur.at = Date.now();
  kvSet_('pos:' + ym, JSON.stringify(cur), 'POS', true);
  return { rows: rows, days: dl.length, from: dl[0] || 0, to: dl[dl.length - 1] || 0 };
}
function posClear(token, yearMonth) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth);
  kvSet_('pos:' + ym, JSON.stringify({ it: {}, files: [] }), 'POS xoá', true);
  return true;
}
function salesSave(token, yearMonth, json) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth), inp;
  try { inp = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { inp = null; }
  if (!inp || typeof inp !== 'object') throw new Error('Dữ liệu không hợp lệ.');
  var n = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate(), d = {};
  Object.keys(inp.d || {}).forEach(function (k) {
    var dd = Number(k), v = bizNum_(inp.d[k], 0, 99999999);
    if (dd >= 1 && dd <= n && v) d[String(dd)] = Math.round(v);
  });
  var cur = readJsonKey_('sales:' + ym); cur.d = d; cur.at = Date.now();
  kvSet_('sales:' + ym, JSON.stringify(cur), 'doanh thu', true);
  // Doanh thu thực của tháng → chỉ số 実績 của mục 発注 (để đối chiếu)
  var tot = 0; Object.keys(d).forEach(function (k) { tot += d[k]; });
  try { var act = readJsonKey_('hc:act'); if (tot) act[ym] = tot; else delete act[ym]; kvSet_('hc:act', JSON.stringify(act), 'doanh thu', true); } catch (e) {}
  return cur;
}
function rcpSave(token, json) {
  requireManager_(token);
  var inp; try { inp = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { inp = null; }
  if (inp === null) { kvSet_('rcp', JSON.stringify({}), 'công thức', true); return RCP_SEED; }
  if (!Array.isArray(inp)) throw new Error('Dữ liệu không hợp lệ.');
  var out = inp.slice(0, 200).map(function (x) {
    if (!x || !/^[A-Za-z0-9_-]{1,20}$/.test(String(x.id))) return null;
    var o = { id: String(x.id), u: String(x.u || '').slice(0, 8), spp: bizNum_(x.spp, 0.01, 1000000) };
    ['bread', 'veg', 'note'].forEach(function (k) { if (x[k]) o[k] = String(x[k]).slice(0, 60); });
    if (x.est) o.est = 1;
    o.r = (Array.isArray(x.r) ? x.r : []).slice(0, 30).map(function (r) {
      if (!Array.isArray(r) || ['U', 'T', 'P', 'D', 'C', 'A'].indexOf(r[0]) === -1) return null;
      var re = String(r[1] || '').slice(0, 120); try { new RegExp(re); } catch (e) { return null; }
      var a = bizNum_(r[2], 0, 1000); if (a === null) return null;
      return [r[0], re, a, r[3] ? 1 : 0];
    }).filter(Boolean);
    return o;
  }).filter(Boolean);
  kvSet_('rcp', JSON.stringify({ list: out }), 'công thức', true);
  return out;
}
function invItemsSave(token, json) {
  requireManager_(token);
  var inp; try { inp = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { inp = null; }
  if (inp === null) { kvSet_('inv:items', JSON.stringify({}), 'danh mục kiểm kê', true); return invItems_(); }
  if (!Array.isArray(inp)) throw new Error('Dữ liệu không hợp lệ.');
  var seen = {}, out = inp.slice(0, 600).map(invNormItem_).filter(function (x) { if (!x || seen[x.key]) return false; seen[x.key] = 1; return true; });
  kvSet_('inv:items', JSON.stringify({ list: out }), 'danh mục kiểm kê', true);
  return out;
}
/** Lưu số đếm kiểm kê: { mã: [箱, 中箱/袋, バラ] }. fin=true → chốt kiểm kê tháng. */
function invSave(token, yearMonth, json, fin) {
  var who = requireManager_(token);
  var ym = assertYearMonth_(yearMonth), inp;
  try { inp = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { inp = null; }
  if (!inp || typeof inp !== 'object') throw new Error('Dữ liệu không hợp lệ.');
  var c = {};
  Object.keys(inp).slice(0, 800).forEach(function (k) {
    var a = inp[k]; if (!Array.isArray(a)) return;
    var v = [0, 1, 2].map(function (i) { var n = bizNum_(a[i], 0, 999999); return n === null ? 0 : Math.round(n * 100) / 100; });
    if (v[0] || v[1] || v[2]) c[String(k).slice(0, 40)] = v;
  });
  var cur = { c: c, at: Date.now(), by: 'm' };
  if (fin) cur.fin = Date.now();
  kvSet_('inv:' + ym, JSON.stringify(cur), 'kiểm kê', true);
  return cur;
}
/** Áp gợi ý từ báo cáo: mức tồn (par) / doanh thu dự kiến theo thứ cho mục 発注. */
function bizApplyHc(token, json) {
  requireManager_(token);
  var inp; try { inp = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { inp = null; }
  if (!inp || typeof inp !== 'object') throw new Error('Dữ liệu không hợp lệ.');
  var res = {};
  if (inp.par && typeof inp.par === 'object') {
    var items = hcItems_(), ch = 0;
    items.forEach(function (it) {
      var v = bizNum_(inp.par[it.id], 0, 9999); if (v === null) return;
      it.par = Math.round(v * 4) / 4; if (it.mode === 'm' && it.par > 0) it.mode = 'p'; ch++;
    });
    if (ch) kvSet_('hc:items', JSON.stringify(items), '発注 mức tồn', true);
    res.par = ch;
  }
  if (Array.isArray(inp.defSales) && inp.defSales.length === 7) {
    var cfg = hcCfg_();
    cfg.defSales = inp.defSales.map(function (v) { var n = bizNum_(v, 0, 99999999); return n === null ? 0 : Math.round(n); });
    kvSet_('hc:cfg', JSON.stringify(cfg), '発注 doanh thu thứ', true);
    res.defSales = cfg.defSales;
  }
  return res;
}

// ===========================================================================
// BẢNG THÔNG SỐ TỪNG NHÂN VIÊN (v.6) — chỉ quản lý. 6 tháng gần nhất.
// ===========================================================================
function empDash(token, empId, yearMonth) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth), id = String(empId || ''), emps = readEmployees_();
  var me = emps.filter(function (e) { return e.id === id; })[0];
  if (!me) throw new Error('Không tìm thấy nhân viên.');
  var st = readSettings_(), open = Number(st.openHour) || 8, months = [];
  // v41: giờ từng ngày nối liền các tháng → "tuần cao nhất" = 7 ngày liên tiếp nặng nhất (28h/tuần 資格外活動
  // tính theo mọi 7 ngày, qua cả mép tháng), không còn chỉ tuần T2–CN nằm trong tháng.
  var tail = [];
  try {
    var m0 = ymShift_(ym, -6), s0 = readMonthNormalized_('schedule:' + m0, emps), c0 = readCloseHours_(m0);
    var n0 = new Date(Date.UTC(Number(m0.slice(0, 4)), Number(m0.slice(5, 7)), 0)).getUTCDate();
    for (var d0 = n0 - 5; d0 <= n0; d0++) { var e0 = (s0[String(d0)] || {})[id]; tail.push(e0 && !e0.off && e0.shifts && e0.shifts.length ? netOfEntryAt_(e0, c0, String(d0)) : 0); }
  } catch (eT) { tail = []; }
  for (var k = 5; k >= 0; k--) {
    var m = ymShift_(ym, -k), y = Number(m.slice(0, 4)), mo = Number(m.slice(5, 7));
    var n = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    var sched = readMonthNormalized_('schedule:' + m, emps), req = readMonthNormalized_('requests:' + m, emps);
    var wish = readWish_(m) || {}, swap = readJsonKey_('swap:' + m), thx = readJsonKey_('thx:' + m);
    var closeMap = readCloseHours_(m);
    var o = { ym: m, h: 0, days: 0, wkend: 0, close: 0, open: 0, sup: 0, streak: 0, offReq: 0, wishDays: 0, wishH: 0, wishOff: 0,
              met: 0, offBroken: 0, swaps: 0, urgent: 0, thxIn: 0, thxOut: 0, weekMax: 0, late: 0 };
    var run = 0, dh = tail.slice(), any = false;
    for (var d = 1; d <= n; d++) {
      var e = (sched[String(d)] || {})[id], w = (wish[String(d)] || {})[id], r = (req[String(d)] || {})[id];
      var dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
      var works = !!(e && !e.off && e.shifts && e.shifts.length);
      if (e || w || r) any = true;
      if (works) {
        var hh = netOfEntryAt_(e, closeMap, String(d));
        o.h += hh; o.days++; run++; o.streak = Math.max(o.streak, run);
        if (dow === 0 || dow === 6) o.wkend++;
        if (e.shifts.some(function (s) { return s.isSupport; })) o.sup++;
        if (e.shifts.some(function (s) { return s.endAtClose || endOf_(s, closeMap, String(d)) >= (Number(closeMap[d]) || closeDefault_()) - 0.01; })) o.close++;
        if (e.shifts.some(function (s) { return Number(s.start) <= open + 0.01; })) o.open++;
        if (e.shifts.some(function (s) { return Number(s.start) >= 17; })) o.late++;
        dh.push(hh);
      } else { run = 0; dh.push(0); }
      if (r && r.type === 'unavailable') o.offReq++;
      if (w) {
        if (w.off) { o.wishOff++; if (works) o.offBroken++; }
        else { o.wishDays++; o.wishH += netOfEntry_(w); if (works) o.met++; }
      }
      var sw = (swap[String(d)] || {})[id];
      if (sw && sw.want) { o.swaps++; if (sw.urgent) o.urgent++; }
    }
    for (var wi = 0; wi + 7 <= dh.length; wi++) { var ws = 0; for (var wj = wi; wj < wi + 7; wj++) ws += dh[wj]; o.weekMax = Math.max(o.weekMax, ws); }
    if (dh.length < 7) o.weekMax = Math.max(o.weekMax, dh.reduce(function (a, b) { return a + b; }, 0));
    tail = dh.slice(-6);
    ((thx && thx.list) || []).forEach(function (x) { if (x.t === id) o.thxIn++; if (x.f === id) o.thxOut++; });
    ['h', 'wishH', 'weekMax'].forEach(function (f) { o[f] = Math.round(o[f] * 100) / 100; });
    o.any = any;
    months.push(o);
  }
  return { id: id, name: me.name, type: me.type || 'sa', months: months };
}


// ===========================================================================
// v.8 — MÃ QUÁN · MÃ NHÂN VIÊN · KẾT NỐI BẰNG MÃ
// ---------------------------------------------------------------------------
// Trước đây các quán chỉ "thấy" nhau khi chạy cùng MỘT tài khoản Google (tìm
// bảng chung theo tên, mở thẳng bảng tính của quán kia). Quán dùng tài khoản
// khác thì tự tạo bảng chung riêng → không bao giờ nối được.
// Bây giờ:
//   - Mỗi quán có MÃ QUÁN ngắn (vd. OTA) và mỗi nhân viên có SỐ riêng → mã nhân
//     viên đầy đủ "OTA-007", không bao giờ nhầm hai người trùng tên.
//   - Nối quán bằng MÃ KẾT NỐI (= mã bảng chung). Khác tài khoản Google thì quán
//     chủ bấm "Cho phép" email của quán mới (thêm quyền sửa bảng chung).
//   - Mọi thứ quán khác cần (danh sách + lịch + đăng ký) được ĐĂNG LÊN bảng chung
//     (sheet "snap"), không phải mở bảng tính riêng của nhau → khác tài khoản vẫn chạy.
// ===========================================================================
var HUB_SNAP = 'snap';
var HUB_CHUNK = 45000, HUB_CHUNKS = 8;
var HUB_REG_COLS = ['id', 'name', 'at', 'code', 'emps', 'email', 'off', 'open', 'close', 'url', 'xkey'];

/** Chữ toàn góc → nửa góc, bỏ khoảng trắng, viết hoa (mã gõ bằng bàn phím Nhật vẫn đúng). */
function normCode_(s) {
  s = String(s == null ? '' : s);
  try { s = s.normalize('NFKC'); } catch (e) {}
  return s.toUpperCase().replace(/[\s　]+/g, '').replace(/[‐‑–—ー－]/g, '-');
}
function myEmail_() { try { return String(Session.getEffectiveUser().getEmail() || ''); } catch (e) { return ''; } }
function pad3_(n) { n = String(Number(n) || 0); while (n.length < 3) n = '0' + n; return n; }
/** Ghi đè vài mục cài đặt (giữ nguyên phần còn lại). */
function settingsPatch_(patch) {
  var cur = readSettings_();
  for (var k in patch) cur[k] = patch[k];
  var norm = normalizeSettings_(cur);
  kvSet_('settings', JSON.stringify(norm), 'cài đặt', true);
  return norm;
}

// ---------- bảng chung: các sheet phụ ----------
function hubSS_(create) {
  var sh = hubSheet_(create); if (!sh) return null;
  try { return SpreadsheetApp.openById(props_().getProperty('hubId')); } catch (e) { return null; }
}
function hubTab_(ss, name, header) {
  var st = ss.getSheetByName(name);
  if (!st) { st = ss.insertSheet(name); st.appendRow(header); }
  return st;
}
/** Danh bạ các quán trong mạng: [{ row, id, name, at, code, emps:[[id,code,name,type]], email, off }] */
function hubRowsOf_(ss) {
  var st = ss ? ss.getSheetByName(HUB_STORES) : null; if (!st) return [];
  var v = st.getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) {
    if (!v[i][0]) continue;
    var emps = [];
    try { emps = JSON.parse(v[i][4] || '[]') || []; } catch (e) { emps = []; }
    out.push({ row: i + 1, id: String(v[i][0]), name: String(v[i][1] || ''), at: Number(v[i][2]) || 0,
               code: String(v[i][3] || ''), emps: emps, email: String(v[i][5] || ''), off: !!v[i][6],
               open: Number(v[i][7]) || null, close: Number(v[i][8]) || null,
               url: String(v[i][9] || ''), xkey: String(v[i][10] || '') });
  }
  return out;
}

// ---------- MÃ QUÁN ----------
function storeCodeBase_() {
  var n = String(readSettings_().storeName || '');
  try { n = n.normalize('NFKC'); } catch (e) {}
  n = n.replace(/subway/ig, ' ').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (n.length >= 2) return n.slice(0, 3);
  return 'S' + Utilities.getUuid().replace(/[^0-9a-f]/gi, '').toUpperCase().slice(0, 3);
}
function storeCodeTaken_(code, ss) {
  var me = myStore_().id;
  return hubRowsOf_(ss || hubSS_(false)).some(function (r) { return r.code === code && r.id !== me && !r.off; });
}
/** Mã quán hiện tại; chưa có thì tự tạo (theo tên quán, không trùng quán khác trong mạng). */
function storeCode_() {
  var cur = readSettings_().storeCode;
  if (cur) return cur;
  var base = storeCodeBase_(), code = base, ss = null, i = 2;
  try { ss = hubSS_(false); } catch (e) { ss = null; }
  while (ss && storeCodeTaken_(code, ss) && i < 99) code = base.slice(0, 4) + (i++);
  settingsPatch_({ storeCode: code, storeCodeAuto: true });
  return code;
}
function storeCodeSave(token, code) {
  requireManager_(token);
  var c = normCode_(code);
  if (!/^[A-Z0-9]{2,6}$/.test(c)) throw new Error('Mã quán gồm 2–6 chữ cái in hoa hoặc số (vd. OTA, CTR1).');
  if (storeCodeTaken_(c)) throw new Error('Mã quán ' + c + ' đã có quán khác dùng trong mạng kết nối.');
  settingsPatch_({ storeCode: c, storeCodeAuto: false });
  hubRegister_(true);
  return hubInfo(token);
}

// ---------- MÃ NHÂN VIÊN ----------
/** Gán số cho người chưa có (001, 002…, không dùng lại số của người đã xoá). Trả true nếu có đổi. */
function assignEmpCodes_(list, old) {
  var props = props_(), seq = Number(props.getProperty('EMP_SEQ')) || 0, changed = false, byOld = {};
  (old || []).forEach(function (c) { if (c && c.id && c.code) byOld[c.id] = c.code; });
  Object.keys(byOld).forEach(function (id) { var n = Number(byOld[id]); if (n > seq) seq = n; });
  var used = {};
  list.forEach(function (e) {
    if (!e) return;
    var keep = byOld[e.id] || '';                 // số do máy gửi lên không được tính (chống sửa tay)
    if (keep && used[keep]) keep = '';
    if (!keep) { seq++; keep = pad3_(seq); changed = true; }
    if (e.code !== keep) { e.code = keep; changed = true; }
    used[keep] = 1;
  });
  props.setProperty('EMP_SEQ', String(seq));
  return changed;
}
/** Danh sách đã lưu mà còn người chưa có số → gán và ghi lại (quản lý mở app là tự chạy). */
function ensureEmpCodes_() {
  var list = readEmployees_();
  if (list.every(function (e) { return e && /^\d{3,4}$/.test(String(e.code || '')); })) return false;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) return false;
  try {
    var sheet = getSheet_(), row = findRow_(sheet, 'employees');
    if (row === -1) return false;
    var cur = []; try { cur = JSON.parse(readCellValue_(sheet, row) || '[]') || []; } catch (e) { return false; }
    if (!assignEmpCodes_(cur, cur.map(function (x) { return x && /^\d{3,4}$/.test(String(x.code || '')) ? { id: x.id, code: x.code } : null; }))) return false;
    var json = JSON.stringify(cur);
    writeCellValue_(sheet, row, json);
    putCacheSafe_('employees', json);
    return true;
  } finally { lock.releaseLock(); }
}

// ---------- ĐĂNG DỮ LIỆU LÊN BẢNG CHUNG ----------
function peerUnav_(req) {
  var un = {};
  Object.keys(req || {}).forEach(function (d) {
    Object.keys(req[d] || {}).forEach(function (eid) { if (req[d][eid] && req[d][eid].type === 'unavailable') (un[d] = un[d] || {})[eid] = 1; });
  });
  return un;
}
function mySnapshot_(ym) {
  var emps = readEmployees_().filter(function (e) { return e && e.id && !e.deleted; });
  var st = readSettings_(), mode = readLockMode_(ym);
  return {
    at: Date.now(), name: storeLabel_(), code: storeCode_(), open: Number(st.openHour) || 8, close: Number(st.closeHour) || 21,
    hideDraft: st.hideDraft === true, lock: mode === 'all' ? '1' : (mode === 'h1' ? 'h1' : ''),
    emps: emps.map(function (e) { return { id: e.id, code: e.code || '', name: e.name, type: e.type === 'staff' ? 'staff' : 'sa' }; }),
    sched: peerCompact_(readMonthNormalized_('schedule:' + ym, emps)),
    wish: peerCompact_(readWish_(ym) || {}),
    un: peerUnav_(readMonthNormalized_('requests:' + ym, emps))
  };
}
/** Đăng lịch tháng `ym` của quán mình lên bảng chung (chỉ khi có sửa mới, tối đa 1 lần/phút). */
function hubPublish_(ym, force) {
  try {
    if (!hubOn_()) return false;
    var props = props_(), pk = 'HUB_PUB:' + ym, last = Number(props.getProperty(pk)) || 0, now = Date.now();
    var mod = readMod_()[ym] || {}, changed = Math.max(Number(mod.s) || 0, Number(mod.w) || 0);
    if (!force) {
      if (now - last < 60000) return false;
      if (last && changed <= last && now - last < 6 * 3600000) return false;
    }
    var ss = hubSS_(false); if (!ss) return false;
    var tab = hubTab_(ss, HUB_SNAP, ['key', 'at', 'data']);
    var key = myStore_().id + '|' + ym, json = JSON.stringify(mySnapshot_(ym));
    if (json.length > HUB_CHUNK * HUB_CHUNKS) return false;
    var cells = [key, now];
    for (var i = 0; i < HUB_CHUNKS; i++) cells.push(json.slice(i * HUB_CHUNK, (i + 1) * HUB_CHUNK));
    var v = tab.getDataRange().getValues(), row = -1;
    for (var r = 1; r < v.length; r++) if (String(v[r][0]) === key) { row = r + 1; break; }
    if (row === -1) tab.appendRow(cells);
    else tab.getRange(row, 1, 1, cells.length).setValues([cells]);
    props.setProperty(pk, String(now));
    return true;
  } catch (e) { return false; }
}
function hubSnapRead_(ss, storeId, ym) {
  var tab = ss ? ss.getSheetByName(HUB_SNAP) : null; if (!tab) return null;
  var v = tab.getDataRange().getValues(), key = storeId + '|' + ym;
  for (var r = 1; r < v.length; r++) {
    if (String(v[r][0]) !== key) continue;
    var s = ''; for (var i = 2; i < v[r].length; i++) s += String(v[r][i] == null ? '' : v[r][i]);
    try { return JSON.parse(s); } catch (e) { return null; }
  }
  return null;
}
/**
 * Dữ liệu tháng `ym` của một quán khác: mở thẳng bảng tính của họ nếu được (cùng tài khoản →
 * mới nhất), không thì đọc bản họ đã đăng lên bảng chung.
 */
function peerStoreData_(ss, row, ym) {
  try {
    var sh = SpreadsheetApp.openById(row.id).getSheetByName(SHEET_NAME);
    if (sh) {
      var set = peerReadKey_(sh, 'settings') || {};
      if (!set.hubOn) return null;
      var emps = (peerReadKey_(sh, 'employees') || []).filter(function (e) { return e && e.id && !e.deleted; })
        .map(function (e) { return { id: e.id, code: e.code || '', name: e.name, type: e.type === 'staff' ? 'staff' : 'sa' }; });
      var lockRaw = String((function () { var r0 = findRow_(sh, 'lock:' + ym); return r0 === -1 ? '' : readCellValue_(sh, r0); })() || '');
      return { at: Date.now(), src: 'live', name: String(set.storeName || row.name || '').slice(0, 40), code: String(set.storeCode || row.code || ''),
               open: Number(set.openHour) || 8, close: Number(set.closeHour) || 21, hideDraft: set.hideDraft === true, lock: lockRaw,
               emps: emps, sched: peerCompact_(peerReadKey_(sh, 'schedule:' + ym)), wish: peerCompact_(peerReadKey_(sh, 'wish:' + ym)),
               un: peerUnav_(peerReadKey_(sh, 'requests:' + ym)) };
    }
  } catch (e) { /* khác tài khoản → đọc bản đã đăng */ }
  if (row.off) return null;
  var snap = hubSnapRead_(ss, row.id, ym);
  if (!snap) return null;
  snap.src = 'snap';
  return snap;
}

/** Danh bạ các quán + thông tin để kết nối (màn Cài đặt › Kết nối các quán). */
function hubInfo(token) {
  requireManager_(token);
  var st = readSettings_(), on = !!st.hubOn;
  var ss = null; try { ss = hubSS_(on); } catch (e) { ss = null; }
  if (on && ss) { hubRegister_(false); }
  var me = myStore_().id, hid = props_().getProperty('hubId') || '';
  var rows = ss ? hubRowsOf_(ss) : [];
  return {
    on: on, code: storeCode_(), email: myEmail_(), hub: on && ss ? hid : '', name: storeLabel_(),
    stores: rows.filter(function (r) { return !r.off || r.id === me; }).map(function (r) {
      return { name: r.name, code: r.code, me: r.id === me, at: r.at, n: (r.emps || []).length, email: r.id === me ? '' : r.email };
    })
  };
}
function hubIdFrom_(s) {
  s = String(s == null ? '' : s).trim();
  var m = /\/d\/([A-Za-z0-9_-]{20,})/.exec(s); if (m) return m[1];
  try { s = s.normalize('NFKC'); } catch (e) {}
  return s.replace(/[^A-Za-z0-9_-]/g, '');
}
/** Tham gia mạng của quán khác bằng mã kết nối. go=false: chỉ xem trước trong mạng có những quán nào. */
function hubJoin(token, code, go) {
  requireManager_(token);
  var id = hubIdFrom_(code);
  if (id.length < 20) throw new Error('Mã kết nối không đúng (mã dài, hãy sao chép nguyên văn từ quán kia).');
  var ss;
  try { ss = SpreadsheetApp.openById(id); } catch (e) { return { ok: false, needAccess: true, email: myEmail_() }; }
  if (!ss || !ss.getSheetByName(HUB_SHEET)) throw new Error('Mã này không phải mã kết nối của app lịch làm.');
  var me = myStore_().id;
  var stores = hubRowsOf_(ss).filter(function (r) { return !r.off; })
    .map(function (r) { return { name: r.name, code: r.code, me: r.id === me }; });
  if (!go) return { ok: true, stores: stores, same: props_().getProperty('hubId') === id };
  props_().setProperty('hubId', id);
  props_().deleteProperty('HUB_REG');
  var patch = { hubOn: true }, myCode = storeCode_();
  if (storeCodeTaken_(myCode, ss)) {
    var base = myCode.slice(0, 4), i = 2, c = base + i;
    while (storeCodeTaken_(c, ss) && i < 99) c = base + (++i);
    patch.storeCode = c; patch.storeCodeAuto = false;
  }
  settingsPatch_(patch);
  hubRegister_(true);
  ensureHubTrigger_(true);
  try { CacheService.getScriptCache().remove('hubLinked:' + myStore_().id.slice(0, 20)); } catch (e) {}
  hubPublish_(jstDateStr_(0).slice(0, 7), true);
  var res = hubInfo(token); res.ok = true; res.renamed = patch.storeCode || '';
  return res;
}
/** Cho tài khoản Google của quán khác quyền dùng bảng chung (khi hai quán khác tài khoản). */
function hubAllow(token, email) {
  requireManager_(token);
  var em = String(email == null ? '' : email).trim().toLowerCase();
  try { em = em.normalize('NFKC'); } catch (e) {}
  if (!/^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$/.test(em)) throw new Error('Email không hợp lệ.');
  if (!hubOn_()) throw new Error('Hãy bật "Kết nối các quán" trước.');
  var ss = hubSS_(true); if (!ss) throw new Error('Chưa tạo được bảng kết nối.');
  try { DriveApp.getFileById(props_().getProperty('hubId')).addEditor(em); }
  catch (e) { throw new Error('Không cấp quyền được cho ' + em + ' (chỉ tài khoản đã tạo bảng kết nối mới cấp được).'); }
  return { ok: true, email: em };
}

// ---------- TÌM NGƯỜI THEO MÃ · MƯỢN NGƯỜI · CỬ NGƯỜI ----------
function parseEmpCode_(s) {
  var c = normCode_(s), m = /^([A-Z0-9]{2,6})-(\d{1,3})$/.exec(c) || /^([A-Z0-9]{2,6}?)(\d{3})$/.exec(c);
  if (!m) throw new Error('Mã nhân viên dạng OTA-007 (mã quán - số).');
  return { store: m[1], num: pad3_(m[2]), full: m[1] + '-' + pad3_(m[2]) };
}
function findEmpByCode_(ss, codeStr) {
  var pc = parseEmpCode_(codeStr), me = myStore_().id;
  var row = hubRowsOf_(ss).filter(function (r) { return r.code === pc.store && !r.off; })[0];
  if (!row) throw new Error('Không có quán mã ' + pc.store + ' trong mạng kết nối.');
  if (row.id === me) throw new Error(pc.full + ' là nhân viên của chính quán mình.');
  var e = (row.emps || []).filter(function (x) { return x && String(x[1]) === pc.num; })[0];
  if (!e) throw new Error('Quán ' + (row.name || pc.store) + ' không có nhân viên số ' + pc.num + '.');
  return { row: row, empId: String(e[0]), empCode: pc.full, empName: String(e[2] || '?'), type: e[3] === 'staff' ? 'staff' : 'sa' };
}
/** Quản lý quán cần người gõ mã → xem đúng người chưa (tên, quán, hôm đó có ca ở quán nhà không). */
function empLookup(token, code, date) {
  requireManager_(token);
  if (!hubOn_()) throw new Error('Chưa bật "Kết nối các quán" trong Cài đặt.');
  var ss = hubSS_(false); if (!ss) throw new Error('Chưa có kết nối.');
  var f = findEmpByCode_(ss, code), busy = [];
  var dt = String(date || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(dt)) {
    try {
      var data = peerStoreData_(ss, f.row, dt.slice(0, 7));
      var e = data && data.sched && data.sched[String(Number(dt.slice(8, 10)))] && data.sched[String(Number(dt.slice(8, 10)))][f.empId];
      if (e && e.off) busy.push({ off: true });
      else if (e && e.shifts) e.shifts.forEach(function (s) { busy.push({ start: s.start, end: s.end, sup: !!s.isSupport }); });
    } catch (e2) {}
  }
  return { code: f.empCode, name: f.empName, type: f.type, store: f.row.name, storeCode: f.row.code, busy: busy };
}
/** Đếm số lần MỖI nhân viên của quán này đã đi chi viện (ca đã được hai bên xác nhận).
 *  Dùng để đưa người hay đi chi viện lên đầu danh sách khi cử người. Chỉ quản lý. */
var HUB_NOTE = 'hubnote';
var HUB_NOTE_N = 'HUBNOTE_N';     // thuộc tính: số dòng hộp thư đã xử lý
function hubHm_(h) { h = Number(h) || 0; var H = Math.floor(h); return (H < 10 ? '0' : '') + H + ':' + (h % 1 ? '30' : '00'); }
/** Hộp thư của quán này (quán khác ghi vào): thông báo → 🔔; lệnh chi viện ('cmd') → áp vào lịch quán mình. */
function hubNoteProcess_() {
  var n = 0, dl = null;
  // v41: chỉ MỘT lượt xử lý hộp thư cùng lúc (khoá tài liệu — khác khoá script mà supApply_ dùng để ghi lịch,
  // nên không tự kẹt). Trước đây đánh dấu "đã xử lý" cả loạt TRƯỚC khi làm: lệnh lỗi giữa chừng là mất luôn.
  try { dl = LockService.getDocumentLock(); } catch (e0) { dl = null; }
  if (dl && !dl.tryLock(2000)) return 0;
  try {
    var st = activeSS_().getSheetByName(HUB_NOTE); if (!st) return 0;
    var p = props_(), done = Number(p.getProperty(HUB_NOTE_N)) || 0, last = st.getLastRow();
    if (last - 1 <= done) return 0;
    var v = st.getRange(done + 2, 1, last - 1 - done, 6).getValues();
    for (var i = 0; i < v.length; i++) {
      var x = v[i];
      if (x[0]) {
        var kind = String(x[1]);
        if (kind === 'cmd') {
          var c = null; try { c = JSON.parse(String(x[5])); } catch (e) { c = null; }
          if (c) {
            try {
              var r = supApply_(String(c.op), c.p || {});
              if (r && r.conflict) supFailNote_(c, 'trùng ca ở quán nhà');
            } catch (e1) {
              var msg = String((e1 && e1.message) || e1);
              if (/bận/i.test(msg)) break;                 // quán đang bận → lần chạy sau làm tiếp từ đúng dòng này
              supFailNote_(c, msg);
            }
          }
          n++;
        } else if (kind === 'supFail') {
          supPendDrop_(String(x[2]).replace(/^sid:/, ''));
          if (x[3]) supBust_(String(x[3]));
          mgrEvent_('supOff', 'sup', String(x[3]), Number(x[4]) || 0, String(x[5])); n++;
        } else {
          if (/^sup/.test(kind) && x[3]) supBust_(String(x[3]));
          mgrEvent_(kind, String(x[2]), String(x[3]), Number(x[4]) || 0, String(x[5])); n++;
        }
      }
      p.setProperty(HUB_NOTE_N, String(done + i + 1));     // đánh dấu TỪNG dòng sau khi làm xong
    }
  } catch (e) {
  } finally { if (dl) { try { dl.releaseLock(); } catch (e2) {} } }
  return n;
}
/** Lệnh mượn người từ hộp thư không áp được → báo lại quán mượn (hộp thư của họ) để bỏ dòng "đang chờ". */
function supFailNote_(c, why) {
  try {
    var q = (c && c.p) || {}, host = q.host || {};
    if (c.op !== 'assign' || !host.id || host.id === myStore_().id) return;
    var ss = SpreadsheetApp.openById(String(host.id)), st = ss.getSheetByName(HUB_NOTE);
    if (!st) { st = ss.insertSheet(HUB_NOTE); st.appendRow(['ts', 'kind', 'e', 'ym', 'd', 'text']); }
    st.appendRow([Date.now(), 'supFail', 'sid:' + String(q.sid || ''), String(q.date || '').slice(0, 7), Number(String(q.date || '').slice(8, 10)) || 0,
      (myStore_().name + ' chưa xếp được ' + (q.empName || '') + ' ' + supWhen_(q.date, q.start, q.end, q.atClose) + ' — ' + why).slice(0, 160)]);
  } catch (e) {}
}
// v41: lượt mượn người còn nằm trong hộp thư quán nhà (chưa áp) — quán mượn vẫn thấy "⏳ đang chờ" ở mọi lần mở,
// không chỉ ngay sau khi bấm. Script Property SUP_PEND = [{ sid, ym, d, g, at }], tự bỏ sau 3 ngày.
function supPendRead_() {
  var a; try { a = JSON.parse(props_().getProperty('SUP_PEND') || '[]') || []; } catch (e) { a = []; }
  var cut = Date.now() - 3 * 86400000;
  return a.filter(function (x) { return x && x.sid && Number(x.at) > cut; });
}
function supPendWrite_(a) { try { props_().setProperty('SUP_PEND', JSON.stringify(a.slice(-40))); } catch (e) {} }
function supPendAdd_(ym, d, g) { var a = supPendRead_().filter(function (x) { return x.sid !== g.sid; }); a.push({ sid: g.sid, ym: ym, d: String(d), g: g, at: Date.now() }); supPendWrite_(a); }
function supPendDrop_(sid) { if (!sid) return; var a = supPendRead_(), b = a.filter(function (x) { return x.sid !== sid; }); if (b.length !== a.length) supPendWrite_(b); }
/** Ghép lượt đang chờ vào danh sách người tới giúp; lượt đã thấy trong lịch quán nhà thì bỏ khỏi danh sách chờ. */
function supPendMerge_(ym, guests) {
  var a = supPendRead_(), seen = {}, keep = [], changed = false;
  Object.keys(guests || {}).forEach(function (d) { (guests[d] || []).forEach(function (g) { if (g.sid) seen[g.sid] = 1; }); });
  a.forEach(function (x) {
    if (seen[x.sid]) { changed = true; return; }
    keep.push(x);
    if (x.ym !== ym) return;
    var g = JSON.parse(JSON.stringify(x.g)); g.pending = true;
    (guests[x.d] = guests[x.d] || []).push(g);
  });
  if (changed) supPendWrite_(keep);
  return guests;
}

// ===========================================================================
// CHI VIỆN v3 (2026.10.23) — MỘT bản ghi, KHÔNG duyệt, KHÔNG đồng bộ.
// Ca ✈ chỉ nằm trong LỊCH CỦA QUÁN NHÀ của nhân viên:
//   { isSupport: true, supTo: { id, name, code }, sid, supStore, supOpen, supClose, note }
// Quán nhận biết "ai tới giúp mình" bằng cách đọc thẳng lịch các quán trong mạng (cùng tài khoản Google).
// • Cử người / tick "Hỗ trợ tiệm khác" (quán nhà): sửa lịch quán mình như mọi ca khác.
// • Mượn người (quán nhận): gọi thẳng app của quán nhà (doPost, có khoá bí mật) để quán nhà TỰ ghi ca —
//   đúng khoá ghi, đúng bộ nhớ đệm. Không gọi được thì gửi lệnh vào hộp thư 'hubnote' của quán nhà.
// • Trùng ca ở quán nhà: hỏi trước, đồng ý thì cắt phần trùng → giờ không bao giờ bị cộng hai lần.
// ===========================================================================
var SUP_TTL = 60;                 // giây: danh sách người tới giúp được nhớ tạm
function supKey_() {
  var p = props_(), k = p.getProperty('xsKey');
  if (!k) { k = Utilities.getUuid().replace(/-/g, ''); p.setProperty('xsKey', k); }
  return k;
}
function supMe_() { var me = myStore_(); var c = ''; try { c = storeCode_(); } catch (e) {} return { id: me.id, name: me.name, code: c }; }
function supRows_() { try { return hubRowsOf_(hubSS_(false)); } catch (e) { return []; } }
function supRowOf_(idOrCode) {
  var k = String(idOrCode || ''), c = normCode_(k);
  return supRows_().filter(function (r) { return !r.off && (r.id === k || (c && r.code === c)); })[0] || null;
}
function supCk_(ym, hostId) { return 'supg:' + ym + ':' + String(hostId).slice(0, 30); }
function supBust_(ym) { try { CacheService.getScriptCache().remove(supCk_(ym, myStore_().id)); } catch (e) {} }
function supWhen_(date, s, e, L) { return String(date).slice(5).replace('-', '/') + ' ' + hubHm_(s) + '–' + (L ? 'L' : hubHm_(e)); }
function supBase_(q) {
  var date = String(q.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Ngày không hợp lệ.');
  assertDay_(date.slice(0, 7), Number(date.slice(8, 10)));
  var s = Math.round(Number(q.start) * 2) / 2, e = Math.round(Number(q.end) * 2) / 2;
  if (!isFinite(s) || !isFinite(e) || s < 0 || e > 30 || e - s < 0.5) throw new Error('Giờ chi viện không hợp lệ.');
  return { date: date, start: s, end: e, atClose: !!q.atClose, note: String(q.note || '').slice(0, 60) };
}
/** Phần còn lại của ca x sau khi bỏ khoảng [a, b) (mỗi mẩu ≥ 30 phút; giờ nghỉ chỉ giữ nếu nằm trọn trong mẩu). */
function supTrim_(x, a, b) {
  var out = [];
  function piece(s, e, keepClose) {
    if (e - s < 0.5) return;
    var y = JSON.parse(JSON.stringify(x)); y.start = s; y.end = e;
    if (!keepClose) delete y.endAtClose;
    if (!(y.breakStart != null && y.breakEnd != null && y.breakStart >= s && y.breakEnd <= e)) { y.breakStart = null; y.breakEnd = null; }
    if (out.length && y.sid) y.sid = Utilities.getUuid().slice(0, 8);
    out.push(y);
  }
  piece(Number(x.start), Math.min(Number(x.end), a), false);
  piece(Math.max(Number(x.start), b), Number(x.end), true);
  return out;
}
/**
 * QUÁN NHÀ ghi ca ✈ cho nhân viên của mình. p = { empId, date, start, end, atClose, note, host:{id,name,code,open,close},
 * cut, sid, ext, quiet }. Trùng ca mà chưa đồng ý cắt → trả { conflict } (không ghi gì).
 */
function supAssignLocal_(p) {
  var b = supBase_(p), ym = b.date.slice(0, 7), day = String(Number(b.date.slice(8, 10)));
  var emp = readEmployees_().filter(function (e) { return e && e.id === String(p.empId) && !e.deleted; })[0];
  if (!emp) throw new Error('Không có nhân viên này.');
  var host = p.host || {};
  if (!host.id || host.id === myStore_().id) throw new Error('Quán nhận không hợp lệ.');
  var sid = String(p.sid || Utilities.getUuid().slice(0, 8)).slice(0, 16);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Quán nhà đang bận, thử lại sau ít giây.');
  var entry;
  try {
    var sheet = getSheet_(), key = 'schedule:' + ym, obj = readMonthObject_(sheet, key);
    if (!obj[day]) obj[day] = {};
    var en = obj[day][emp.id] || null, shifts = (en && !en.off && en.shifts) ? en.shifts.slice() : [];
    // Ghi lại cùng một lượt chi viện (cùng mã) hoặc ca ✈ cũ sang ĐÚNG quán đó trùng giờ → thay, không chồng.
    shifts = shifts.filter(function (x) {
      return !(x && x.isSupport && (x.sid === sid || (x.supTo && x.supTo.id === host.id && x.start < b.end && x.end > b.start) ||
               (!x.supTo && x.start < b.end && x.end > b.start)));
    });
    var clash = shifts.filter(function (x) { return x && x.start < b.end && x.end > b.start; });
    if ((clash.length || (en && en.off)) && !p.cut) {
      return { conflict: (en && en.off ? [{ off: true }] : []).concat(clash.map(function (x) {
        return { start: x.start, end: x.end, sup: !!x.isSupport, to: x.supTo ? x.supTo.name : (x.supStore || '') };
      })), name: emp.name };
    }
    var keep = [], hit3 = [];
    shifts.forEach(function (x) {
      if (x && x.start < b.end && x.end > b.start) {
        if (x.isSupport && x.supTo && x.supTo.id && x.supTo.id !== String(host.id)) hit3.push(x);
        supTrim_(x, b.start, b.end).forEach(function (y) { keep.push(y); });
      } else keep.push(x);
    });
    var sh = { start: b.start, end: b.end, breakStart: null, breakEnd: null, isSupport: true, sid: sid,
               supTo: { id: String(host.id), name: String(host.name || '').slice(0, 40), code: String(host.code || '').slice(0, 10) },
               supStore: String(host.name || '').slice(0, 40), note: ('→ ' + (host.name || '') + (b.note ? ' · ' + b.note : '')).slice(0, 60) };
    if (b.atClose) sh.endAtClose = true;
    if (host.open != null && isFinite(Number(host.open))) sh.supOpen = Number(host.open);
    if (host.close != null && isFinite(Number(host.close))) sh.supClose = Number(host.close);
    if (p.ext) sh.ext = 1;
    keep.push(sh);
    keep.sort(function (x, y) { return x.start - y.start; });
    entry = en ? JSON.parse(JSON.stringify(en)) : {};
    entry.off = false; entry.shifts = keep;
    obj[day][emp.id] = entry;
    writeMonthObject_(sheet, key, obj, p.quiet ? 'chi viện' : 'chi viện cử', false);
  } finally { lock.releaseLock(); }
  // v41: quán thứ ba mượn chồng giờ → ca ✈ sang quán khác bị cắt; lệnh từ xa không qua supNotifyDiff_ nên báo riêng.
  if (p.quiet && hit3.length) {
    var meN = myStore_().name;
    hit3.forEach(function (x) {
      supNote_(x.supTo.id, [['supOff', ym, Number(day), meN + ': ' + emp.name + ' ' + supWhen_(b.date, x.start, x.end, x.endAtClose) +
        ' bị cắt (đi giúp ' + (host.name || '?') + ' ' + hubHm_(b.start) + '–' + hubHm_(b.end) + ')']]);
    });
  }
  return { ok: true, sid: sid, day: Number(day), empId: emp.id, empName: emp.name, entry: entry };
}
/** QUÁN NHÀ bỏ một lượt chi viện (theo mã lượt; ca cũ chưa có mã thì theo quán nhận + giờ bắt đầu). */
function supRemoveLocal_(p) {
  var date = String(p.date || ''); if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Ngày không hợp lệ.');
  var ym = date.slice(0, 7), day = String(Number(date.slice(8, 10))), empId = String(p.empId || '');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Quán nhà đang bận, thử lại sau ít giây.');
  var entry = null, removed = 0;
  try {
    var sheet = getSheet_(), key = 'schedule:' + ym, obj = readMonthObject_(sheet, key);
    var en = obj[day] && obj[day][empId];
    if (en && en.shifts) {
      var before = en.shifts.length;
      en.shifts = en.shifts.filter(function (x) {
        if (!x || !x.isSupport) return true;
        if (p.sid && x.sid === String(p.sid)) return false;
        if (!p.sid && x.supTo && x.supTo.id === String(p.host || '') && Number(x.start) === Number(p.start)) return false;
        return true;
      });
      removed = before - en.shifts.length;
      if (removed) {
        if (!en.shifts.length) delete obj[day][empId]; else entry = en;
        writeMonthObject_(sheet, key, obj, p.quiet ? 'chi viện' : 'chi viện huỷ', false);
      } else entry = en;
    }
  } finally { lock.releaseLock(); }
  return { ok: true, removed: removed, day: Number(day), empId: empId, entry: entry };
}
/** Lệnh từ quán khác (gọi thẳng hoặc qua hộp thư). Tạo thông báo 🔔 cho quán nhà. */
function supApply_(op, p) {
  var r;
  if (op === 'assign') {
    r = supAssignLocal_({ empId: p.empId, date: p.date, start: p.start, end: p.end, atClose: p.atClose, note: p.note, host: p.host,
                          cut: !!p.cut, sid: p.sid, ext: 1, quiet: true });
    var ym = String(p.date).slice(0, 7), d = Number(String(p.date).slice(8, 10)), who = (p.host && p.host.name) || '?';
    if (r.conflict) mgrEvent_('supOff', 'sup', ym, d, (who + ' muốn mượn ' + r.name + ' ' + supWhen_(p.date, p.start, p.end, p.atClose) + ' nhưng trùng ca ở quán — chưa xếp').slice(0, 160));
    else mgrEvent_('supDone', 'sup', ym, d, (who + ' mượn ' + r.empName + ' ' + supWhen_(p.date, p.start, p.end, p.atClose)).slice(0, 160));
    return r;
  }
  if (op === 'remove') {
    r = supRemoveLocal_({ empId: p.empId, date: p.date, sid: p.sid, host: p.host && p.host.id, start: p.start, quiet: true });
    if (r.removed) mgrEvent_('supOff', 'sup', String(p.date).slice(0, 7), Number(String(p.date).slice(8, 10)),
      (((p.host && p.host.name) || '?') + ' huỷ mượn ' + (p.empName || '') + ' ' + String(p.date).slice(5).replace('-', '/')).slice(0, 160));
    return r;
  }
  throw new Error('Lệnh không hợp lệ.');
}
/** doPost: lệnh chi viện từ quán khác trong mạng (phải đúng khoá bí mật của quán này). */
function xsHandle_(body) {
  if (!hubOn_() || String(body.key || '') !== supKey_()) return { xs: 1, err: 'key' };
  try { return { xs: 1, r: supApply_(String(body.op || ''), body.p || {}) }; }
  catch (e) { return { xs: 1, err: String((e && e.message) || e) }; }
}
/** Gọi app của quán khác. Trả kết quả; lỗi nghiệp vụ → ném lỗi; không gọi được → { fail: true }. */
var XS_URL_RE = /^https:\/\/script\.google\.com\/(a\/macros\/[\w.-]+|macros)\/s\/[\w-]+\/exec$/;
function xsCall_(row, op, p) {
  if (!row || !row.url || !row.xkey) return { fail: true };
  if (!XS_URL_RE.test(String(row.url))) return { fail: true };          // v41: chỉ gọi app Apps Script thật
  var txt = '';
  try {
    var res = UrlFetchApp.fetch(row.url, { method: 'post', contentType: 'application/json', muteHttpExceptions: true, followRedirects: true,
      payload: JSON.stringify({ xs: 1, key: row.xkey, op: op, p: p, from: myStore_().id }),
      // v41: chỉ gửi kèm quyền Google (OAuth) tới đúng địa chỉ app Apps Script — bảng đăng ký sửa được,
      // người lạ đổi url thành máy của họ sẽ không lấy được quyền truy cập tài khoản.
      headers: XS_URL_RE.test(String(row.url)) ? { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } : {} });
    txt = res.getContentText();
  } catch (e) { return { fail: true }; }
  var out = null; try { out = JSON.parse(txt); } catch (e2) { return { fail: true }; }
  if (!out || !out.xs) return { fail: true };
  if (out.err === 'key') return { fail: true };
  if (out.err) throw new Error(out.err);
  return out.r || {};
}
/** Không gọi thẳng được → bỏ lệnh vào hộp thư của quán kia (áp ở lần app quán đó chạy tiếp, tối đa vài phút). */
function supQueue_(row, op, p) {
  var ss = SpreadsheetApp.openById(String(row.id));
  var st = ss.getSheetByName(HUB_NOTE);
  if (!st) { st = ss.insertSheet(HUB_NOTE); st.appendRow(['ts', 'kind', 'e', 'ym', 'd', 'text']); }
  st.appendRow([Date.now(), 'cmd', 'xs:' + op, String(p.date || '').slice(0, 7), Number(String(p.date || '').slice(8, 10)) || 0, JSON.stringify({ op: op, p: p })]);
  return { queued: true };
}
/** Báo cho quán nhận (hộp thư của họ → 🔔). rows = [[kind, ym, d, text], ...] */
function supNote_(hostId, rows) {
  if (!hostId || hostId === myStore_().id || !rows.length) return;
  try {
    var ss = SpreadsheetApp.openById(String(hostId));
    var st = ss.getSheetByName(HUB_NOTE);
    if (!st) { st = ss.insertSheet(HUB_NOTE); st.appendRow(['ts', 'kind', 'e', 'ym', 'd', 'text']); }
    var now = Date.now();
    st.getRange(st.getLastRow() + 1, 1, rows.length, 6).setValues(rows.map(function (x, i) {
      return [now + i, x[0], 'sup', x[1], x[2], String(x[3]).slice(0, 160)];
    }));
  } catch (e) {}
}
/** Ca ✈ có quán nhận trong một tháng lịch: { 'ngày|người|mã': {...} }. */
function supMap_(obj) {
  var out = {};
  Object.keys(obj || {}).forEach(function (d) {
    Object.keys(obj[d] || {}).forEach(function (eid) {
      var en = obj[d][eid]; if (!en || en.off || !en.shifts) return;
      en.shifts.forEach(function (x) {
        if (x && x.isSupport && x.supTo && x.supTo.id) out[d + '|' + eid + '|' + (x.sid || x.start)] = { d: d, e: eid, h: x.supTo.id, s: x.start, t: x.end, L: !!x.endAtClose, x: x };
      });
    });
  });
  return out;
}
/** Sửa lịch ở quán nhà (kéo / xoá / tick tay) → báo quán nhận những lượt chi viện vừa thêm, đổi giờ hoặc bỏ. */
function supNotifyDiff_(ym, oldObj, newObj) {
  var A = supMap_(oldObj), B = supMap_(newObj), per = {}, names = null, me = myStore_();
  function nm(id) { if (!names) { names = {}; readEmployees_().forEach(function (e) { names[e.id] = e.name; }); } return names[id] || '?'; }
  function add(h, kind, v, txt) { (per[h] = per[h] || []).push([kind, ym, Number(v.d), txt]); }
  Object.keys(B).forEach(function (k) {
    var v = B[k], o = A[k];
    if (o && o.h === v.h && o.s === v.s && o.t === v.t && o.L === v.L) return;
    add(v.h, 'supDone', v, me.name + ' cử ' + nm(v.e) + ' sang giúp ' + supWhen_(ym + '-' + ('0' + v.d).slice(-2), v.s, v.t, v.L));
    if (o && o.h !== v.h) add(o.h, 'supOff', o, me.name + ' huỷ cử ' + nm(o.e) + ' ' + supWhen_(ym + '-' + ('0' + o.d).slice(-2), o.s, o.t, o.L));
  });
  Object.keys(A).forEach(function (k) {
    if (B[k]) return;
    var o = A[k];
    add(o.h, 'supOff', o, me.name + ' huỷ cử ' + nm(o.e) + ' ' + supWhen_(ym + '-' + ('0' + o.d).slice(-2), o.s, o.t, o.L));
  });
  Object.keys(per).forEach(function (h) { supNote_(h, per[h]); });
}
/**
 * Ca ✈ do quán khác mượn (ext) và bản lưu mới từ máy quản lý quán nhà (có thể đang cầm bản CŨ):
 * • Bản mới thiếu ca ext đang có → giữ lại, và CẮT phần ca thường trùng giờ (bản cũ chưa bị cắt / ca vừa bỏ
 *   tick "Hỗ trợ tiệm khác") — trước đây giữ lại mà không cắt nên giờ bị tính hai lần.
 * • Bản mới CÓ ca ext mà máy chủ không còn (quán nhận đã huỷ) → bỏ, không cho "sống lại".
 * • Cho nghỉ cả ngày (off) → quản lý chủ ý, bỏ ca ext (quán nhận được báo qua supNotifyDiff_).
 */
function supKeepExt_(oldObj, newObj) {
  var live = {};
  Object.keys(oldObj || {}).forEach(function (d) {
    Object.keys(oldObj[d] || {}).forEach(function (eid) {
      var oe = oldObj[d][eid]; if (!oe || !oe.shifts) return;
      oe.shifts.forEach(function (x) { if (x && x.isSupport && x.ext && x.sid) live[d + '|' + eid + '|' + x.sid] = 1; });
    });
  });
  // 1) Ca ext "sống lại" từ bản cũ trên máy → bỏ.
  Object.keys(newObj || {}).forEach(function (d) {
    Object.keys(newObj[d] || {}).forEach(function (eid) {
      var ne = newObj[d][eid]; if (!ne || !ne.shifts) return;
      var n0 = ne.shifts.length;
      ne.shifts = ne.shifts.filter(function (x) { return !(x && x.isSupport && x.ext && x.sid && !live[d + '|' + eid + '|' + x.sid]); });
      if (n0 && !ne.shifts.length && !ne.off) delete newObj[d][eid];
    });
  });
  // 2) Ca ext bản mới thiếu → giữ, cắt ca thường trùng giờ.
  Object.keys(oldObj || {}).forEach(function (d) {
    Object.keys(oldObj[d] || {}).forEach(function (eid) {
      var oe = oldObj[d][eid]; if (!oe || !oe.shifts) return;
      var ext = oe.shifts.filter(function (x) { return x && x.isSupport && x.ext && x.sid; }); if (!ext.length) return;
      if (!newObj[d]) newObj[d] = {};
      var ne = newObj[d][eid];
      if (ne && ne.off) return;
      if (!ne) ne = newObj[d][eid] = { off: false, shifts: [] };
      ne.shifts = ne.shifts || [];
      ext.forEach(function (x) {
        if (ne.shifts.some(function (y) { return y && y.sid === x.sid; })) return;
        var keep = [];
        ne.shifts.forEach(function (y) {
          if (y && !y.isSupport && y.start < x.end && y.end > x.start) supTrim_(y, Number(x.start), Number(x.end)).forEach(function (z) { keep.push(z); });
          else keep.push(y);
        });
        keep.push(x);
        ne.shifts = keep;
      });
      ne.shifts.sort(function (a, b) { return a.start - b.start; });
    });
  });
}
/** v41: quán này tắt kết nối → báo từng quán nhận về các ca ✈ sắp tới (họ sẽ không đọc được lịch quán này nữa). */
function supHubOffNotify_() {
  var today = todayStr_(), ym = today.slice(0, 7), sheet = getSheet_(), per = {}, names = {}, me = myStore_();
  readEmployees_().forEach(function (e) { names[e.id] = e.name; });
  [ym, ymShift_(ym, 1)].forEach(function (k) {
    var M = supMap_(readMonthObject_(sheet, 'schedule:' + k));
    Object.keys(M).forEach(function (key) {
      var v = M[key], date = k + '-' + ('0' + v.d).slice(-2);
      if (date < today) return;
      (per[v.h] = per[v.h] || []).push(['supOff', k, Number(v.d), (me.name + ' đã TẮT kết nối — ' + (names[v.e] || '?') + ' ' + supWhen_(date, v.s, v.t, v.L) +
        ' vẫn còn trong lịch của họ nhưng quán bạn sẽ không thấy nữa. Hãy liên lạc trực tiếp.').slice(0, 160)]);
    });
  });
  Object.keys(per).forEach(function (h) { supNote_(h, per[h].slice(0, 20)); });
}
/** Ai từ các quán khác (và quán mình) tới giúp quán hostId trong tháng ym: { ngày: [ ... ] }. Nhớ tạm 60 giây. */
function supScan_(ym, hostId) {
  var c = CacheService.getScriptCache(), ck = supCk_(ym, hostId), hit = c.get(ck);
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  var me = myStore_().id, out = {};
  supRows_().forEach(function (r) {
    if (r.off || r.id === hostId) return;
    var sched = null;
    if (r.id === me) sched = readMonthObject_(getSheet_(), 'schedule:' + ym);
    else { try { var sh = SpreadsheetApp.openById(r.id).getSheetByName(SHEET_NAME); sched = sh ? peerReadKey_(sh, 'schedule:' + ym) : null; } catch (e) { sched = null; } }
    if (!sched) return;
    var names = {}; (r.emps || []).forEach(function (e) { names[String(e[0])] = { code: e[1], name: e[2] }; });
    if (r.id === me) readEmployees_().forEach(function (e) { names[e.id] = { code: e.code || '', name: e.name }; });
    Object.keys(sched).forEach(function (d) {
      Object.keys(sched[d] || {}).forEach(function (eid) {
        var en = sched[d][eid]; if (!en || en.off || !en.shifts) return;
        en.shifts.forEach(function (x) {
          if (!x || !x.isSupport || !x.supTo || x.supTo.id !== hostId) return;
          var n = names[eid] || {};
          (out[d] = out[d] || []).push({ store: r.id, storeName: r.name, storeCode: r.code, empId: eid, empName: n.name || '?',
            empCode: n.code ? r.code + '-' + n.code : '', start: Number(x.start), end: Number(x.end), atClose: !!x.endAtClose,
            sid: x.sid || '', bs: x.breakStart != null ? Number(x.breakStart) : null, be: x.breakEnd != null ? Number(x.breakEnd) : null });
        });
      });
    });
  });
  Object.keys(out).forEach(function (d) { out[d].sort(function (a, b) { return a.start - b.start; }); });
  try { c.put(ck, JSON.stringify(out), SUP_TTL); } catch (e) {}
  return out;
}
/** Trạng thái chi viện của tháng cho quản lý: các quán trong mạng + ai tới giúp quán mình. */
function supState(token, yearMonth, force) {
  requireManager_(token);
  if (!hubOn_()) return { on: false };
  var ym = assertYearMonth_(yearMonth), me = supMe_();
  try { supMigrate_(false); } catch (e) {}
  if (force) supBust_(ym);
  var stores = linkedStores_().map(function (x) { return { id: x.id, name: x.name, code: x.code, open: x.open, close: x.close }; });
  var guests = JSON.parse(JSON.stringify(supScan_(ym, me.id)));
  try { supPendMerge_(ym, guests); } catch (eP) {}
  return { on: true, ym: ym, me: me, stores: stores, guests: guests, today: todayStr_() };
}
/** Làm mới (bỏ bộ nhớ tạm, dọn dữ liệu cũ một lần nữa). */
function supRefresh(token, yearMonth) {
  requireManager_(token);
  try { props_().deleteProperty('supV3'); supMigrate_(true); } catch (e) {}
  return supState(token, yearMonth, true);
}
function supHostInfo_(me) {
  var st = readSettings_();
  return { id: me.id, name: me.name, code: me.code, open: Number(st.openHour) || 8, close: Number(st.closeHour) || 21 };
}
/** Xem trước trùng ca ở quán nhà (đọc thẳng bảng của họ) — dùng khi không gọi thẳng được app quán đó. */
function supPeek_(row, empId, b, hostId) {
  try {
    var sh = SpreadsheetApp.openById(row.id).getSheetByName(SHEET_NAME);
    var m = sh ? peerReadKey_(sh, 'schedule:' + b.date.slice(0, 7)) : null;
    var en = m && m[String(Number(b.date.slice(8, 10)))] && m[String(Number(b.date.slice(8, 10)))][empId];
    if (!en) return [];
    if (en.off) return [{ off: true }];
    return (en.shifts || []).filter(function (x) {
      return x && x.start < b.end && x.end > b.start && !(x.isSupport && (!x.supTo || x.supTo.id === hostId));
    }).map(function (x) { return { start: x.start, end: x.end, sup: !!x.isSupport, to: x.supTo ? x.supTo.name : (x.supStore || '') }; });
  } catch (e) { return []; }
}
/** QUÁN NHẬN mượn người của quán khác: q = { code, date, start, end, atClose, note, cut }. */
function supBorrow(token, reqJson) {
  requireManager_(token);
  if (!hubOn_()) throw new Error('Chưa bật "Kết nối các quán" trong Cài đặt.');
  var q; try { q = JSON.parse(reqJson); } catch (e) { throw new Error('Yêu cầu không hợp lệ.'); }
  var b = supBase_(q), me = supMe_(), f = findEmpByCode_(hubSS_(false), q.code);
  var p = { empId: f.empId, empName: f.empName, date: b.date, start: b.start, end: b.end, atClose: b.atClose, note: b.note,
            host: supHostInfo_(me), cut: !!q.cut, sid: String(q.sid || Utilities.getUuid().slice(0, 8)).slice(0, 16) };
  var r = xsCall_(f.row, 'assign', p), how = 'ok';
  if (r.fail) {
    if (!q.cut) { var cf = supPeek_(f.row, f.empId, b, me.id); if (cf.length) return { conflict: cf, name: f.empName, store: f.row.name }; }
    supQueue_(f.row, 'assign', p); how = 'queued';
  } else if (r.conflict) return { conflict: r.conflict, name: f.empName, store: f.row.name };
  supBust_(b.date.slice(0, 7));
  if (how === 'queued') {   // chưa ghi vào lịch quán nhà: nhớ "đang chờ" ở quán mình cho tới khi quán kia áp (v41: mọi lần mở)
    supPendAdd_(b.date.slice(0, 7), Number(b.date.slice(8, 10)), { store: f.row.id, storeName: f.row.name, storeCode: f.row.code, empId: f.empId,
      empName: f.empName, empCode: f.empCode, start: b.start, end: b.end, atClose: b.atClose, sid: p.sid });
  }
  var out = supState(token, b.date.slice(0, 7));
  out.done = how;
  return out;
}
/** QUÁN NHÀ cử người sang quán khác: q = { empId, store (mã hoặc id), date, start, end, atClose, note, cut }. */
function supSend(token, reqJson) {
  requireManager_(token);
  if (!hubOn_()) throw new Error('Chưa bật "Kết nối các quán" trong Cài đặt.');
  var q; try { q = JSON.parse(reqJson); } catch (e) { throw new Error('Yêu cầu không hợp lệ.'); }
  var row = supRowOf_(q.store);
  if (!row) throw new Error('Không có quán này trong mạng kết nối.');
  if (row.id === myStore_().id) throw new Error('Không cử sang chính quán mình.');
  var r = supAssignLocal_({ empId: q.empId, date: q.date, start: q.start, end: q.end, atClose: q.atClose, note: q.note, cut: !!q.cut,
    host: { id: row.id, name: row.name, code: row.code, open: row.open, close: row.close } });
  if (r.conflict) return { conflict: r.conflict, name: r.name, store: row.name };
  return { ok: true, day: r.day, empId: r.empId, entry: r.entry, state: supState(token, String(q.date).slice(0, 7)) };
}
/** Huỷ một lượt chi viện. q = { home (id quán nhà), empId, empName, date, sid, start }. Quán nhà = mình → bỏ ca ngay; khác → gọi quán nhà. */
function supCancel(token, reqJson) {
  requireManager_(token);
  var q; try { q = JSON.parse(reqJson); } catch (e) { throw new Error('Yêu cầu không hợp lệ.'); }
  var me = supMe_(), ym = String(q.date || '').slice(0, 7), out;
  if (!q.home || q.home === me.id) {
    var r = supRemoveLocal_({ empId: q.empId, date: q.date, sid: q.sid, host: q.host, start: q.start });
    out = supState(token, ym); out.day = r.day; out.empId = r.empId; out.entry = r.entry; return out;
  }
  var row = supRowOf_(q.home); if (!row) throw new Error('Không tìm thấy quán nhà của người này.');
  var p = { empId: q.empId, empName: q.empName || '', date: q.date, sid: q.sid, start: q.start, host: supHostInfo_(me) };
  supPendDrop_(String(q.sid || ''));
  var res = xsCall_(row, 'remove', p);
  if (res.fail) supQueue_(row, 'remove', p);
  supBust_(ym);
  out = supState(token, ym); out.done = res.fail ? 'queued' : 'ok';
  if (res.fail) Object.keys(out.guests).forEach(function (d) { out.guests[d] = out.guests[d].filter(function (g) { return g.sid !== q.sid; }); });
  return out;
}
/** Người hay đi chi viện (đếm ca ✈ có quán nhận trong 3 tháng gần nhất) — đưa lên đầu danh sách chọn. */
function supportFreq(token) {
  requireManager_(token);
  var out = {}, ym = jstDateStr_(0).slice(0, 7), sheet = getSheet_();
  [ymShift_(ym, -2), ymShift_(ym, -1), ym].forEach(function (k) {
    var obj = readMonthObject_(sheet, 'schedule:' + k);
    Object.keys(supMap_(obj)).forEach(function (key) { var e = key.split('|')[1]; out[e] = (out[e] || 0) + 1; });
  });
  return out;
}
/**
 * Một lần cho mỗi quán: chuyển dữ liệu của cách cũ (yêu cầu + duyệt) sang cách mới.
 *  - Ca ✈ có supportRef → gắn quán nhận (lấy từ yêu cầu cũ) + mã lượt.
 *  - Ca ✈ tick tay chọn quán trong mạng → gắn quán nhận.
 *  - Hai ca ✈ sang cùng một quán chồng giờ (lỗi cũ) → giữ một.
 */
function supMigrate_(force) {
  var P = props_();
  if (!force && P.getProperty('supV3') === '1') return;
  var reqs = {};
  try {
    var hs = hubSheet_(false);
    if (hs) hs.getDataRange().getValues().forEach(function (v, i) {
      if (!i || !v[0]) return;
      try { var r = JSON.parse(v[1]); reqs[String(v[0])] = { id: r.from, name: r.fromName || '', code: r.fromCode || '' }; } catch (e) {}
    });
  } catch (e) {}
  var byName = {}; linkedStores_().forEach(function (x) { byName[x.name] = { id: x.id, name: x.name, code: x.code }; });
  var ym0 = jstDateStr_(0).slice(0, 7);
  [ymShift_(ym0, -1), ym0, ymShift_(ym0, 1), ymShift_(ym0, 2)].forEach(function (ym) {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('busy');
    try {
      var sheet = getSheet_(), key = 'schedule:' + ym, obj = readMonthObject_(sheet, key), changed = false;
      Object.keys(obj).forEach(function (d) {
        Object.keys(obj[d] || {}).forEach(function (eid) {
          var en = obj[d][eid]; if (!en || !en.shifts) return;
          en.shifts.forEach(function (x) {
            if (!x || !x.isSupport || x.supTo) return;
            var to = null;
            if (x.supportRef) to = reqs[String(x.supportRef).split(':')[0]] || null;
            if (!to && x.supStore && byName[x.supStore]) to = byName[x.supStore];
            if (!to || !to.id) return;
            x.supTo = { id: String(to.id), name: String(to.name || x.supStore || '').slice(0, 40), code: String(to.code || '').slice(0, 10) };
            x.sid = String(x.supportRef || Utilities.getUuid()).replace(/[^A-Za-z0-9]/g, '').slice(-8);
            if (x.supportRef) { x.hub = 1; delete x.supportRef; }
            changed = true;
          });
          // Hai ca ✈ sang cùng quán chồng giờ → giữ ca từ hệ thống cũ (hoặc ca dài hơn).
          var sup = en.shifts.filter(function (x) { return x && x.isSupport && x.supTo; }), drop = [];
          sup.forEach(function (a, i) {
            sup.forEach(function (b, j) {
              if (j <= i || drop.indexOf(a) !== -1 || drop.indexOf(b) !== -1) return;
              if (a.supTo.id !== b.supTo.id || !(a.start < b.end && a.end > b.start)) return;
              var ka = (a.hub ? 100 : 0) + (a.end - a.start), kb = (b.hub ? 100 : 0) + (b.end - b.start);
              drop.push(ka >= kb ? b : a);
            });
          });
          if (drop.length) { en.shifts = en.shifts.filter(function (x) { return drop.indexOf(x) === -1; }); changed = true; }
          en.shifts.forEach(function (x) { if (x && x.hub) { delete x.hub; changed = true; } });
        });
      });
      if (changed) writeMonthObject_(sheet, key, obj, 'chi viện', false);
    } finally { lock.releaseLock(); }
  });
  P.setProperty('supV3', '1');
}

function linkedStores_() {
  try {
    if (!hubOn_()) return [];
    var c = CacheService.getScriptCache(), ck = 'hubLinked:' + myStore_().id.slice(0, 20);
    var hit = c.get(ck); if (hit) return JSON.parse(hit);
    var me = myStore_().id, out = hubRowsOf_(hubSS_(false)).filter(function (r) { return r.id !== me && !r.off; }).map(function (r) {
      return { id: r.id, name: r.name, code: r.code, open: r.open != null ? r.open : 8, close: r.close != null ? r.close : 21 };
    });
    c.put(ck, JSON.stringify(out), 600);
    return out;
  } catch (e) { return []; }
}
/** Chữ để so tên: toàn góc → nửa góc, カタカナ → ひらがな, bỏ khoảng trắng, chữ thường. */
function nameKey_(s) {
  s = String(s == null ? '' : s);
  try { s = s.normalize('NFKC'); } catch (e) {}
  s = s.replace(/[\u30A1-\u30F6]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0x60); });
  return s.toLowerCase().replace(/[\s\u3000・.]/g, '');
}
/** Quản lý không nhớ mã → gõ TÊN: gợi ý người khớp ở các quán đã liên kết, kèm mã (trùng tên vẫn phân biệt được). */
function empSearch(token, q) {
  requireManager_(token);
  if (!hubOn_()) throw new Error('Chưa bật "Kết nối các quán" trong Cài đặt.');
  var k = nameKey_(q); if (!k) return [];
  var me = myStore_().id, out = [];
  hubRowsOf_(hubSS_(false)).forEach(function (r) {
    if (r.id === me || r.off) return;
    (r.emps || []).forEach(function (e) {
      var nm = String(e[2] || ''), full = r.code + '-' + e[1];
      if (nameKey_(nm).indexOf(k) === -1 && nameKey_(full).indexOf(k) === -1) return;
      out.push({ code: full, name: nm, store: r.name, storeCode: r.code, type: e[3] === 'staff' ? 'staff' : 'sa' });
    });
  });
  out.sort(function (a, b) { var x = nameKey_(a.name).indexOf(k), y = nameKey_(b.name).indexOf(k); return (x === 0 ? 0 : 1) - (y === 0 ? 0 : 1) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0); });
  return out.slice(0, 12);
}

// ---------- CHẠY NỀN mỗi 10 phút (khi đã bật kết nối) ----------
/** v41: hàm chạy định kỳ cũng gọi được từ ngoài (không cần đăng nhập) → tối đa 1 lần / `sec` giây. */
function tickGate_(name, sec) {
  try {
    var c = CacheService.getScriptCache(), k = 'tick:' + name;
    if (c.get(k)) return false;
    c.put(k, '1', sec);
  } catch (e) {}
  return true;
}
function hubTick() {
  try {
    if (!hubOn_()) return;
    if (!tickGate_('hub', 55)) return;
    hubNoteProcess_();
    try { supMigrate_(false); } catch (e0) {}
    hubRegister_(false);
    var ym = jstDateStr_(0).slice(0, 7);
    hubPublish_(ym, false);
    hubPublish_(ymShift_(ym, 1), false);
  } catch (e) {}
}
function ensureHubTrigger_(on) {
  try {
    var ts = ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'hubTick'; });
    ts.forEach(function (t) { ScriptApp.deleteTrigger(t); });
    if (on) ScriptApp.newTrigger('hubTick').timeBased().everyMinutes(5).create();
  } catch (e) {}
}
/** Quản lý mở app: đọc hộp thư (thông báo + lệnh chi viện từ quán khác), tối đa 1 lần / 30 giây. */
/** Nút ↻ Tải lại: đọc ngay thông báo / lệnh chi viện từ quán khác, bỏ bộ nhớ tạm "ai tới giúp" + danh bạ. */
function hubPull(token, yearMonth) {
  requireManager_(token);
  if (!hubOn_()) return { ok: true };
  try { hubNoteProcess_(); } catch (e) {}
  try { if (yearMonth) supBust_(assertYearMonth_(yearMonth)); } catch (e) {}
  try { CacheService.getScriptCache().remove('hubLinked:' + myStore_().id.slice(0, 20)); } catch (e) {}
  return { ok: true };
}
function hubSyncSoon_() {
  try {
    if (!hubOn_()) return;
    var c = CacheService.getScriptCache();
    if (c.get('hubSync')) return;
    c.put('hubSync', '1', 30);
    hubNoteProcess_();
  } catch (e) {}
}


// ===========================================================================
// v.10 — PHÂN TÍCH BÁN HÀNG NHIỀU THÁNG · NHẬP PHIẾU ĐẶT HÀNG (PDF) · KHẢO SÁT ·
//        EMAIL CHO NHÂN VIÊN
// ===========================================================================

// ---------- Phân tích bán hàng: số bán (POS) nhiều tháng ----------
/** Các tháng đã có số bán từ file POS. */
function posMonths(token) {
  requireManager_(token);
  var sheet = getSheet_();
  findRow_(sheet, '__pos_probe__');
  var idx = ROWIDX_[rowIdxKey_(sheet)] || {};
  return Object.keys(idx).filter(function (k) { return /^pos:\d{4}-\d{2}$/.test(k); })
    .map(function (k) { return k.slice(4); }).sort();
}
/** Số bán (và doanh thu ngày nếu có) của nhiều tháng một lần — tối đa 13 tháng. */
function posRange(token, ymsJson) {
  requireManager_(token);
  var yms; try { yms = typeof ymsJson === 'string' ? JSON.parse(ymsJson) : ymsJson; } catch (e) { yms = null; }
  if (!Array.isArray(yms)) throw new Error('Dữ liệu không hợp lệ.');
  var out = { months: {}, sales: {} };
  yms.slice(0, 13).forEach(function (ym) {
    if (!/^\d{4}-\d{2}$/.test(String(ym))) return;
    var p = readJsonKey_('pos:' + ym);
    if (p && p.it && Object.keys(p.it).length) out.months[ym] = { it: p.it, files: p.files || [] };
    var s = readJsonKey_('sales:' + ym);
    if (s && s.d) out.sales[ym] = s.d;
  });
  return out;
}

// ---------- Nhập phiếu đặt hàng (発注内容印刷 PDF) ----------
function hcZoneOfCat_(cat) {
  var c = String(cat || '');
  if (/冷凍/.test(c)) return 'frz';
  if (/冷蔵/.test(c)) return 'chl';
  if (/野菜|青果/.test(c)) return 'veg';
  if (/常温|飲料|ドリンク/.test(c)) return 'amb';
  if (/包材/.test(c)) return 'pkg';
  if (/消耗|備品/.test(c)) return 'sup';
  return 'oth';
}
/**
 * Nhân viên quên nhập tồn / quên chốt phiếu hôm đó → nhập phiếu đặt hàng đã gửi nhà cung cấp:
 * ghi số ĐÃ ĐẶT THẬT vào phiếu của ngày đặt (để tính 仕入, 原価, kiểm hàng). Món chưa có trong danh mục
 * thì tự thêm; giá mới thì cập nhật; phiếu đã chốt mà khác số thì giữ bản cũ (o0) để so.
 */
function hcImportOrder(token, json) {
  requireManager_(token);
  var q; try { q = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { q = null; }
  if (!q || !Array.isArray(q.items) || !q.items.length) throw new Error('Không đọc được món nào trong phiếu đặt hàng.');
  var date = String(q.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Không đọc được ngày đặt hàng trong phiếu.');
  var today = todayStr_();
  if (date > hcAdd_(today, 7) || date < hcAdd_(today, -400)) throw new Error('Ngày đặt hàng ' + date + ' nằm ngoài khoảng cho phép.');
  var items = hcItems_(), byId = {}, added = [], priceCh = [], ord = {};
  items.forEach(function (it) { byId[it.id] = it; });
  q.items.slice(0, 400).forEach(function (x) {
    var id = String(x && x.code || '').replace(/[^0-9A-Za-z]/g, '').slice(0, 20);
    var qty = Math.round(Number(x && x.qty) * 100) / 100, price = Math.round(Number(x && x.price) || 0);
    if (!/^[0-9A-Za-z]{4,20}$/.test(id) || !(qty > 0 && qty <= 9999)) return;
    var it = byId[id];
    if (!it) {
      it = hcNormItem_({ id: id, name: String(x.name || id).slice(0, 60), zone: hcZoneOfCat_(x.cat), unit: String(x.unit || '個').slice(0, 6),
                         pack: 1, price: price, mode: 'm' });
      if (!it) return;
      items.push(it); byId[id] = it; added.push({ id: id, name: it.name });
    } else if (price > 0 && price !== it.price) {
      priceCh.push({ id: id, name: it.name, from: it.price, to: price }); it.price = price;
    }
    ord[id] = Math.round(((ord[id] || 0) + qty) * 100) / 100;
  });
  if (!Object.keys(ord).length) throw new Error('Không đọc được món nào trong phiếu đặt hàng.');
  if (added.length || priceCh.length) kvSet_('hc:items', JSON.stringify(items), 'phiếu đặt hàng (PDF)', true);
  var diff = [], had = false;
  var sh = hcMutate_(date, function (sh) {
    var prev = sh.o || {};
    if (sh.fin && sh.fin.src !== 'pdf') {
      var keys = {}; Object.keys(prev).forEach(function (k) { keys[k] = 1; }); Object.keys(ord).forEach(function (k) { keys[k] = 1; });
      Object.keys(keys).forEach(function (k) {
        var a = Number(prev[k]) || 0, b = Number(ord[k]) || 0;
        if (Math.abs(a - b) > 1e-9) diff.push({ id: k, name: byId[k] ? byId[k].name : k, app: a, pdf: b });
      });
      if (!sh.o0) sh.o0 = prev;
    }
    had = !!(sh.c && Object.keys(sh.c).length);
    sh.o = ord;
    sh.fin = { at: (sh.fin && sh.fin.at) || Date.now(), by: (sh.fin && sh.fin.by) || 'm', src: 'pdf' };
    sh.pl = sh.pl || { at: Date.now(), by: 'm' };
    sh.imp = { no: String(q.no || '').slice(0, 24), at: Date.now(), total: Math.round(Number(q.total) || 0),
               n: Object.keys(ord).length, deliver: /^\d{4}-\d{2}-\d{2}$/.test(String(q.deliver || '')) ? String(q.deliver) : '' };
  });
  var yen = 0; Object.keys(ord).forEach(function (k) { yen += (byId[k] ? byId[k].price : 0) * ord[k]; });
  return { date: date, n: Object.keys(ord).length, added: added, priceCh: priceCh, diff: diff, hadCounts: had,
           yen: Math.round(yen), total: sh.imp.total, no: sh.imp.no };
}

/** v2026.10.16: nhập cả file CSV lịch sử đặt hàng (WingArc / hệ thống đặt hàng) — mỗi phần tử là đơn của một ngày. */
function hcImportOrders(token, json) {
  requireManager_(token);
  var arr; try { arr = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { arr = null; }
  if (!Array.isArray(arr) || !arr.length) throw new Error('Không đọc được đơn nào trong file.');
  return arr.slice(0, 60).map(function (q) {
    try { return hcImportOrder(token, q); }
    catch (e) { return { err: (e && e.message) || String(e), date: q && q.date, no: q && q.no }; }
  });
}

// ---------- KHẢO SÁT NHÂN VIÊN ----------
// surveys  = [{ id, title, desc, qs:[{ id, t:'one'|'multi'|'text'|'rate', q, opts:[...], req }], anon, open, at, due }]
// srv:<id> = { empId: { a:{ qid: giá trị }, at } }
function surveyNorm_(s, old) {
  if (!s || typeof s !== 'object') throw new Error('Khảo sát không hợp lệ.');
  var title = String(s.title == null ? '' : s.title).trim().slice(0, 80);
  if (!title) throw new Error('Hãy đặt tiêu đề cho khảo sát.');
  var qs = (Array.isArray(s.qs) ? s.qs : []).slice(0, 30).map(function (x, i) {
    var t = ['one', 'multi', 'text', 'rate'].indexOf(x && x.t) !== -1 ? x.t : 'one';
    var q = String(x && x.q == null ? '' : x.q).trim().slice(0, 200);
    if (!q) return null;
    var id = /^[a-z0-9]{1,10}$/.test(String(x.id || '')) ? String(x.id) : ('q' + Utilities.getUuid().replace(/-/g, '').slice(0, 6));
    var o = { id: id, t: t, q: q, req: !!x.req };
    if (t === 'one' || t === 'multi') {
      o.opts = (Array.isArray(x.opts) ? x.opts : []).map(function (v) { return String(v == null ? '' : v).trim().slice(0, 80); })
        .filter(function (v, k, a) { return v && a.indexOf(v) === k; }).slice(0, 12);
      if (o.opts.length < 2) throw new Error('Câu "' + q.slice(0, 30) + '" cần ít nhất 2 lựa chọn.');
      if (x.other) o.other = true;
    }
    return o;
  }).filter(Boolean);
  if (!qs.length) throw new Error('Khảo sát cần ít nhất 1 câu hỏi.');
  var due = String(s.due || '');
  return { id: old ? old.id : ('s' + Utilities.getUuid().replace(/-/g, '').slice(0, 9)), title: title,
           desc: String(s.desc == null ? '' : s.desc).trim().slice(0, 400), qs: qs, anon: !!s.anon,
           // v41: khảo sát ẩn danh đã có người trả lời → KHÔNG bật "xem được tên" về sau được (người ta trả lời vì tin là ẩn danh).
           reveal: !!(s.anon && s.reveal) && !(old && old.anon && !old.reveal && Object.keys(readJsonKey_('srv:' + old.id) || {}).length),
           open: s.open === undefined ? (old ? old.open : true) : !!s.open, at: old ? old.at : Date.now(),
           due: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : '', upd: Date.now() };
}
function surveys_() { var a = readJsonKey_('surveys'); return Array.isArray(a) ? a : []; }
function surveyOpenNow_(s) { return !!s.open && (!s.due || s.due >= todayStr_()); }
function surveyList(token) {
  var who = auth_(token), list = surveys_(), nEmp = readEmployees_().length;
  if (who.r === 'mgr') {
    return list.map(function (s) {
      var ans = readJsonKey_('srv:' + s.id), n = Object.keys(ans).length;
      var o = JSON.parse(JSON.stringify(s)); o.n = n; o.of = nEmp; o.live = surveyOpenNow_(s); return o;
    }).sort(function (a, b) { return b.at - a.at; });
  }
  var me = String(who.e);
  return list.filter(surveyOpenNow_).map(function (s) {
    var ans = readJsonKey_('srv:' + s.id)[me] || null;
    var o = JSON.parse(JSON.stringify(s)); o.mine = ans ? ans.a : null; o.myAt = ans ? ans.at : 0; return o;
  }).sort(function (a, b) { return b.at - a.at; });
}
function surveySave(token, json) {
  requireManager_(token);
  var s; try { s = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { s = null; }
  var list = surveys_(), old = s && s.id ? list.filter(function (x) { return x.id === s.id; })[0] : null;
  var norm = surveyNorm_(s, old);
  if (old) list = list.map(function (x) { return x.id === old.id ? norm : x; });
  else { if (list.length >= 40) throw new Error('Tối đa 40 khảo sát — hãy xoá bớt khảo sát cũ.'); list.push(norm); }
  kvSet_('surveys', JSON.stringify(list), 'khảo sát', true);
  return surveyList(token);
}
function surveyDelete(token, id) {
  requireManager_(token);
  var list = surveys_().filter(function (x) { return x.id !== String(id); });
  kvSet_('surveys', JSON.stringify(list), 'xoá khảo sát', true);
  kvSet_('srv:' + String(id).slice(0, 20), '{}', 'xoá khảo sát', true);
  return surveyList(token);
}
function surveySetOpen(token, id, open) {
  requireManager_(token);
  var list = surveys_(), hit = false;
  list.forEach(function (x) { if (x.id === String(id)) { x.open = !!open; hit = true; } });
  if (!hit) throw new Error('Không tìm thấy khảo sát.');
  kvSet_('surveys', JSON.stringify(list), 'khảo sát', true);
  return surveyList(token);
}
function surveyAnswer(token, id, json) {
  var who = auth_(token);
  if (who.r !== 'emp') throw new Error('Chỉ nhân viên trả lời khảo sát.');
  var s = surveys_().filter(function (x) { return x.id === String(id); })[0];
  if (!s || !surveyOpenNow_(s)) throw new Error('Khảo sát này đã đóng.');
  var a; try { a = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { a = null; }
  if (!a || typeof a !== 'object') throw new Error('Câu trả lời không hợp lệ.');
  var out = {};
  s.qs.forEach(function (q) {
    var v = a[q.id];
    if (q.t === 'text') { v = String(v == null ? '' : v).trim().slice(0, 600); if (v) out[q.id] = v; }
    else if (q.t === 'rate') { var n = Math.round(Number(v)); if (n >= 1 && n <= 5) out[q.id] = n; }
    else if (q.t === 'one') { v = String(v == null ? '' : v); if (q.opts.indexOf(v) !== -1 || (q.other && /^\+/.test(v) && v.length > 1)) out[q.id] = v.slice(0, 120); }
    else if (q.t === 'multi') {
      var arr = (Array.isArray(v) ? v : []).map(String).filter(function (x, k, aa) { return (q.opts.indexOf(x) !== -1 || (q.other && /^\+/.test(x) && x.length > 1)) && aa.indexOf(x) === k; });
      if (arr.length) out[q.id] = arr.slice(0, 13).map(function (x) { return x.slice(0, 120); });
    }
    if (q.req && out[q.id] === undefined) throw new Error('Hãy trả lời câu: ' + q.q.slice(0, 60));
  });
  var me = String(who.e);
  kvUpdate_('srv:' + s.id, function (cur) {
    cur = cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {};
    cur[me] = { a: out, at: Date.now() };
    return cur;
  }, 'trả lời khảo sát');
  return surveyList(token);
}
function surveyResults(token, id) {
  requireManager_(token);
  var s = surveys_().filter(function (x) { return x.id === String(id); })[0];
  if (!s) throw new Error('Không tìm thấy khảo sát.');
  var ans = readJsonKey_('srv:' + s.id), emps = readEmployees_(), name = {};
  emps.forEach(function (e) { name[e.id] = e.name; });
  var ids = Object.keys(ans).sort(function (a, b) { return (ans[a].at || 0) - (ans[b].at || 0); });
  // Ẩn danh: nhân viên luôn không thấy tên. Quản lý thấy tên khi bật "xem được tên" (reveal).
  var hideNames = !!s.anon && !s.reveal;
  var qs = s.qs.map(function (q) {
    var r = { id: q.id, t: q.t, q: q.q, n: 0 };
    if (q.t === 'one' || q.t === 'multi') { r.opts = q.opts.slice(); r.cnt = q.opts.map(function () { return 0; }); r.others = []; }
    if (q.t === 'rate') { r.cnt = [0, 0, 0, 0, 0]; r.sum = 0; }
    if (q.t === 'text') r.texts = [];
    ids.forEach(function (eid) {
      var v = (ans[eid].a || {})[q.id]; if (v === undefined) return;
      r.n++;
      var who = hideNames ? '' : (name[eid] || '?');
      var vals = q.t === 'multi' ? v : [v];
      if (q.t === 'one' || q.t === 'multi') vals.forEach(function (x) {
        var k = q.opts.indexOf(x);
        if (k !== -1) r.cnt[k]++; else r.others.push({ v: String(x).replace(/^\+/, ''), who: who });
      });
      if (q.t === 'rate') { r.cnt[v - 1]++; r.sum += v; }
      if (q.t === 'text') r.texts.push({ v: v, who: who });
    });
    if (q.t === 'rate') r.avg = r.n ? Math.round(r.sum / r.n * 10) / 10 : null;
    return r;
  });
  var done = ids.map(function (eid) { return { id: eid, name: name[eid] || '?', at: ans[eid].at }; });
  var waiting = hideNames ? [] : emps.filter(function (e) { return !ans[e.id]; }).map(function (e) { return e.name; });
  return { survey: s, of: emps.length, n: ids.length, qs: qs, done: hideNames ? [] : done, waiting: waiting };
}

// ---------- EMAIL CHO NHÂN VIÊN (tự đăng ký) ----------
// employees[].email, employees[].mp = { pub: lịch được công bố, swap: có người nhờ đổi ca }, mailAt
function saveMyEmail(token, empId, email, prefsJson) {
  var who = requireCanEdit_(token, empId);
  var em = String(email == null ? '' : email).trim();
  try { em = em.normalize('NFKC'); } catch (e) {}
  em = em.toLowerCase();
  if (em && !/^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$/.test(em)) throw new Error('Email không hợp lệ.');
  var p = {}; try { p = JSON.parse(prefsJson || '{}') || {}; } catch (e) { p = {}; }
  var mp = { pub: p.pub !== false, swap: p.swap !== false };
  if (who.r === 'emp' && !mailRate_('email:' + empId, 10, 3600)) throw new Error('Đổi email nhiều lần quá — chờ khoảng 1 giờ rồi thử lại.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_(), row = findRow_(sheet, 'employees');
    var raw = row === -1 ? null : readCellValue_(sheet, row), list = [];
    try { list = JSON.parse(raw || '[]') || []; } catch (e2) { list = []; }
    var hit = null;
    list.forEach(function (e) { if (String(e.id) === String(empId)) hit = e; });
    if (!hit) throw new Error('Không tìm thấy nhân viên này.');
    if (em) { hit.email = em; hit.mp = mp; } else { delete hit.email; delete hit.mp; }
    hit.mailAt = Date.now();
    var j = JSON.stringify(list);
    writeCellValue_(sheet, row, j);
    putCacheSafe_('employees', j);
  } finally { lock.releaseLock(); }
  if (em) ensureMailTrigger_(true);
  return { email: em, mp: em ? mp : null, by: who.r };
}
/** Hàng đợi thư cho nhân viên (gửi dần — mỗi lượt tối đa 8 thư, phần còn lại lượt sau / 5 phút). */
function staffMailQueue_(msgs) {
  if (!msgs || !msgs.length) return;
  try {
    kvUpdate_('smq', function (cur) {
      cur = Array.isArray(cur) ? cur : [];
      return cur.concat(msgs).slice(-200);
    }, 'thư nhân viên');
    props_().setProperty('SMQ', '1');
    ensureMailTrigger_(true);
  } catch (e) {}
}
function staffMailFlush_() {
  try {
    if (props_().getProperty('SMQ') !== '1') return 0;
    if (typeof MailApp === 'undefined') return 0;
    var take = [];
    kvUpdate_('smq', function (cur) {
      cur = Array.isArray(cur) ? cur : [];
      take = cur.slice(0, 8);
      return cur.slice(8);
    }, 'thư nhân viên');
    if (!take.length) { props_().deleteProperty('SMQ'); return 0; }
    var store = storeLabel_(), sent = 0;
    take.forEach(function (m) {
      try {
        if (MailApp.getRemainingDailyQuota() < 2) return;
        MailApp.sendEmail({ to: m.to, subject: String(m.s || '').slice(0, 200), body: String(m.b || ''), name: store + ' シフト' });
        sent++;
      } catch (e) {}
    });
    var left = readJsonKey_('smq');
    if (!Array.isArray(left) || !left.length) props_().deleteProperty('SMQ');
    return sent;
  } catch (e) { return 0; }
}
function staffMailTargets_(pref, exceptId) {
  return readEmployees_().filter(function (e) {
    return e && e.email && (!e.mp || e.mp[pref] !== false) && String(e.id) !== String(exceptId || '') && !e.deleted;
  });
}
/** Những người đang được nhờ trong một yêu cầu đổi ca (người chọn + người ghép). */
function swapAskIds_(sw) {
  var ids = [];
  if (!sw) return ids;
  if (sw.foundId) ids.push(String(sw.foundId));
  (sw.parts || []).forEach(function (p) { var id = String(p && p.id || ''); if (id && ids.indexOf(id) === -1) ids.push(id); });
  return ids;
}
/** Thư RIÊNG cho người vừa được nhờ đổi ca. Không gửi cho cả tiệm; người không có email hoặc tắt "đổi ca" thì bỏ qua. */
function staffMailAsk_(ym, d, ownerId, askIds, sw) {
  try {
    var targets = staffMailTargets_('swap', ownerId).filter(function (t) { return askIds.indexOf(String(t.id)) !== -1; });
    if (!targets.length) return;
    var emps = readEmployees_(), owner = emps.filter(function (e) { return String(e.id) === String(ownerId); })[0] || {};
    var name = String(owner.name || ''), st = readSettings_(), store = storeLabel_();
    var DOW = ['日', '月', '火', '水', '木', '金', '土'];
    var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7));
    var dd = m + '/' + d + '(' + DOW[new Date(y, m - 1, d).getDay()] + ')';
    var ownSh = '';
    try {
      var e0 = (readMonthNormalized_('schedule:' + ym, emps)[String(d)] || {})[String(ownerId)];
      if (e0 && e0.shifts) ownSh = e0.shifts.filter(function (s) { return !s.isSupport; }).map(function (s) { return hhmm_(s.start) + '–' + (s.endAtClose ? 'L' : hhmm_(s.end)); }).join(', ');
    } catch (e1) {}
    var subj = '[' + store + '] ⇄ ' + name + 'さんからシフトを頼まれました / ' + name + ' nhờ bạn nhận ca ' + dd;
    var msgs = targets.map(function (t) {
      var part = (sw && sw.parts || []).filter(function (p) { return String(p.id) === String(t.id); })[0];
      var when = part ? hhmm_(part.from) + '–' + hhmm_(part.to) : ownSh;
      var body = t.name + 'さん\n\n' + name + 'さんが ' + dd + (when ? '（' + when + '）' : '') + ' のシフトをお願いしています。\n' +
        name + ' nhờ bạn nhận ca ngày ' + dd + (when ? ' (' + when + ')' : '') + '.\n\n' +
        'アプリで「承諾」か「断る」を選んでください。/ Mở app bấm đồng ý hoặc từ chối.\n' +
        ((st.appUrl || frontOnly_()) ? (st.appUrl || frontOnly_()) + '\n' : '') + '\n— ' + store + ' シフトアプリ（自動送信・配信停止はアプリの「メール通知」から）';
      return { to: t.email, s: subj, b: body };
    });
    staffMailQueue_(msgs);
    staffMailFlush_();     // nhờ đổi ca là việc gấp: gửi ngay, không chờ lượt 5 phút
  } catch (e) {}
}
var PUB_MAIL_DELAY_MS = 30 * 60 * 1000;   // thư chỉnh sửa lịch: trễ 30 phút để gom các lần sửa
/** Gửi thư đổi lịch đang chờ (ngoài khoá): gộp mọi lần sửa của cùng một người + ngày, chỉ báo ca cuối cùng khác ca ban đầu. */
function staffMailPendingFlush_() {
  var items = null;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) return 0;
  try {
    var sheet = getSheet_(), arr = readMonthObject_(sheet, 'smqp');
    if (!Array.isArray(arr) || !arr.length) return 0;
    // Chỉnh sửa được gửi TRỄ 30 phút: gộp thêm các lần sửa trong 30 phút đó, phần còn lại giữ lại lượt sau.
    var cut = Date.now() - PUB_MAIL_DELAY_MS;
    items = arr.filter(function (x) { return !x || !x.at || x.at <= cut; });
    var rest = arr.filter(function (x) { return x && x.at && x.at > cut; });
    if (!items.length) return 0;
    pubPut_(sheet, 'smqp', rest);
  } catch (e) { return 0; } finally { lock.releaseLock(); }
  try {
    var byYm = {};
    items.forEach(function (x) {
      if (!x || !x.ym) return;
      var g = byYm[x.ym] = byYm[x.ym] || {}, k = x.e + '|' + x.d;
      if (!g[k]) g[k] = { d: Number(x.d), e: String(x.e), f: x.f || null, t: x.t || null };
      else g[k].t = x.t || null;                       // giữ ca đầu tiên làm "cũ", ca cuối làm "mới"
    });
    Object.keys(byYm).forEach(function (ym) {
      var ch = Object.keys(byYm[ym]).map(function (k) { return byYm[ym][k]; })
        .filter(function (c) { return pubSig_(c.f) !== pubSig_(c.t); });
      if (ch.length) staffMailChange_(ym, ch);
    });
  } catch (e2) {}
  return items.length;
}
/** Giờ làm của một ô ca, dạng ngắn cho thư (nghỉ / không có ca / 8:00–17:00 / ✈ ...). */
function pubEntryTxt_(e, closeMap, d) {
  if (!e || e.off || !e.shifts || !e.shifts.length) return 'nghỉ';
  return e.shifts.map(function (s) { return (s.isSupport ? '✈' : '') + hhmm_(s.start) + '–' + hhmm_(endOf_(s, closeMap, d)); }).join(', ');
}
/** Lịch đã công bố rồi mà sửa lại → thư CHỈ cho người có ca bị đổi, kèm đúng những ngày bị đổi. */
function staffMailChange_(ym, ch) {
  try {
    var byEmp = {};
    ch.forEach(function (c) { var k = String(c.e); (byEmp[k] = byEmp[k] || []).push(c); });
    var targets = staffMailTargets_('pub', null).filter(function (t) { return byEmp[String(t.id)]; });
    if (!targets.length) return;
    var store = storeLabel_(), st = readSettings_(), closeMap = readCloseHours_(ym);
    var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)), DOW = ['日', '月', '火', '水', '木', '金', '土'];
    var subj = '[' + store + '] 📅 ' + m + '月のシフトが変更されました / Ca làm tháng ' + m + ' của bạn có thay đổi';
    var msgs = targets.map(function (t) {
      var rows = byEmp[String(t.id)].slice().sort(function (a, b) { return a.d - b.d; }).map(function (c) {
        return m + '/' + c.d + '(' + DOW[new Date(y, m - 1, c.d).getDay()] + ')  ' +
          pubEntryTxt_(c.f, closeMap, c.d) + '  →  ' + pubEntryTxt_(c.t, closeMap, c.d);
      });
      var body = t.name + 'さん\n\nシフトが変更されました。/ Ca làm của bạn vừa được sửa:\n\n' +
        rows.join('\n') + '\n\n' + ((st.appUrl || frontOnly_()) ? (st.appUrl || frontOnly_()) + '\n' : '') +
        '\n— ' + store + ' シフトアプリ（自動送信）';
      return { to: t.email, s: subj, b: body };
    });
    staffMailQueue_(msgs);
    staffMailFlush_();
  } catch (e) {}
}
/** Công bố lịch → mỗi nhân viên đã đăng ký nhận một thư có ca của CHÍNH MÌNH. */
function staffMailPublish_(ym, days) {
  try {
    var targets = staffMailTargets_('pub', null); if (!targets.length) return;
    days = (days || []).map(Number).filter(function (d) { return d >= 1; }).sort(function (x, y) { return x - y; });
    if (!days.length) return;
    var store = storeLabel_(), st = readSettings_(), emps = readEmployees_();
    var sched = readMonthNormalized_('schedule:' + ym, emps), closeMap = readCloseHours_(ym);
    var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)), n = new Date(y, m, 0).getDate();
    var DOW = ['日', '月', '火', '水', '木', '金', '土'];
    var first = days[0], last = days[days.length - 1];
    var part = (first > HALF_SPLIT) ? ('（' + (HALF_SPLIT + 1) + '〜' + n + '日）') : (last <= HALF_SPLIT ? ('（1〜' + HALF_SPLIT + '日）') : '');
    var partVi = (first > HALF_SPLIT) ? (' (ngày ' + (HALF_SPLIT + 1) + '–' + n + ')') : (last <= HALF_SPLIT ? (' (ngày 1–' + HALF_SPLIT + ')') : '');
    var msgs = targets.map(function (t) {
      var lines = [], tot = 0;
      days.forEach(function (d) {
        var e = (sched[String(d)] || {})[t.id];
        if (!e || e.off || !e.shifts || !e.shifts.length) return;
        var txt = e.shifts.map(function (s) { return (s.isSupport ? '✈' : '') + hhmm_(s.start) + '–' + hhmm_(endOf_(s, closeMap, d)); }).join(', ');
        tot += netOfEntryAt_(e, closeMap, d);
        lines.push(m + '/' + d + '(' + DOW[new Date(y, m - 1, d).getDay()] + ') ' + txt);
      });
      var subj = '[' + store + '] 📅 ' + m + '月のシフトが公開されました / Lịch tháng ' + m + ' đã công bố' + partVi;
      var body = t.name + 'さん\n\n' + y + '年' + m + '月' + part + 'のシフトが公開されました。\n' +
        'Lịch làm tháng ' + m + partVi + ' đã công bố.\n\n' +
        (lines.length ? lines.join('\n') + '\n\n合計 / Tổng: ' + (Math.round(tot * 100) / 100) + 'h\n' : 'シフトなし / Không có ca.\n') +
        '\n' + ((st.appUrl || frontOnly_()) ? (st.appUrl || frontOnly_()) + '\n' : '') + '— ' + store + ' シフトアプリ（自動送信）';
      return { to: t.email, s: subj, b: body };
    });
    staffMailQueue_(msgs);
    staffMailFlush_();
  } catch (e) {}
}
/** v41: hãm số thư — đếm trong bộ nhớ đệm; quá `max` lần trong `sec` giây thì trả false. */
function mailRate_(key, max, sec) {
  try {
    var c = CacheService.getScriptCache(), k = 'mrate:' + key, n = Number(c.get(k)) || 0;
    if (n >= max) return false;
    c.put(k, String(n + 1), sec);
  } catch (e) {}
  return true;
}
function staffMailTest(token, empId) {
  requireCanEdit_(token, empId);
  if (!mailRate_('test:' + empId, 3, 3600)) throw new Error('Đã gửi thư thử nhiều lần — chờ khoảng 1 giờ rồi thử lại.');
  var e = readEmployees_().filter(function (x) { return String(x.id) === String(empId); })[0];
  if (!e || !e.email) throw new Error('Chưa có email.');
  if (typeof MailApp === 'undefined') throw new Error('Không gửi được email.');
  var store = storeLabel_();
  MailApp.sendEmail({ to: e.email, subject: '[' + store + '] ✅ テストメール / Email thử', name: store + ' シフト',
    body: e.name + 'さん\n\nメール通知の設定ができました。/ Đã cài nhận thông báo qua email.\n\n— ' + store + ' シフトアプリ' });
  return true;
}

// ===========================================================================
// ĐIỂM DANH BẰNG MÃ QR (v.11, thử nghiệm — quản lý bật/tắt)
// ===========================================================================
// Mỗi nhân viên có một KHOÁ BÍ MẬT riêng (KV 'attkeys' = {empId: hex32}, không bao giờ nằm trong danh sách
// nhân viên). Trong app nhân viên, mã QR được tạo lại mỗi 30 giây:
//     SBA1:<empId>:<số khung 30 giây>:<8 ký tự đầu SHA-256(khoá:empId:khung)>   (cũ — mã đổi mỗi 30 giây)
//     SBA2:<empId>:<10 ký tự đầu SHA-256(khoá:empId:card)>                       (v.2026.10.16.3 — CỐ ĐỊNH, máy quét cũ không đọc)
//     SBA1:<empId>:0:<8 ký tự đầu SHA-256(khoá:empId:card)>                      (v.2026.10.16.6 — CỐ ĐỊNH, máy quét cũ vẫn đọc được)
// SBA2 không có khung thời gian: ai có ảnh/bản in của mã này đều điểm danh được cho người đó, nên
// quản lý phải giữ bản in ở nơi an toàn, và cấp lại khoá (attResetKey) khi mất — mã cũ hết hiệu lực ngay.
// → chụp màn hình gửi bạn quét hộ cũng chỉ dùng được ~2 phút. Máy quét (màn đăng nhập, không cần đăng nhập)
// gửi mã + loại điểm danh lên attPunch; giờ ghi nhận là GIỜ MÁY CHỦ (không tin giờ của máy quét).
// Dữ liệu: 'att:YYYY-MM' = { "<ngày>": { "<empId>": [ {k:'in'|'bs'|'be'|'out', t:ms, s:'qr'|'m'} ] } }
// Ca qua nửa đêm: lần quét sau 0 giờ được gắn vào NGÀY HÔM TRƯỚC nếu hôm trước còn ca chưa điểm danh về.

var ATT_KINDS = ['in', 'bs', 'be', 'out'];
var ATT_NEXT_ = { '': ['in'], 'in': ['bs', 'out'], 'be': ['bs', 'out'], 'bs': ['be'], 'out': ['in'] };
var ATT_WIN_MS = 30000;          // mã đổi mỗi 30 giây
var ATT_WIN_BACK = 4, ATT_WIN_AHEAD = 2;   // nhận mã cũ tới ~2 phút (giờ điện thoại lệch / quét chậm)

function attCfg_() { return readSettings_().att || { on: false, grace: 5 }; }
function attJst_(t) { return new Date(t + 9 * 3600 * 1000); }
function attYmd_(t) { return attJst_(t).toISOString().slice(0, 10); }
function attHm_(t) { var d = attJst_(t); return d.getUTCHours() + ':' + ('0' + d.getUTCMinutes()).slice(-2); }
/** Mốc 0 giờ (giờ Nhật) của ngày 'YYYY-MM-DD' tính bằng ms. */
function attDayStart_(ymd) { return Date.parse(ymd + 'T00:00:00Z') - 9 * 3600 * 1000; }
function attAddDays_(ymd, n) { return new Date(Date.parse(ymd + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10); }

function attHex_(bytes, n) {
  var s = '';
  for (var i = 0; i < n; i++) s += ('0' + ((bytes[i] + 256) & 0xff).toString(16)).slice(-2);
  return s;
}
function attSig_(key, empId, win) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, key + ':' + empId + ':' + win, Utilities.Charset.UTF_8);
  return attHex_(b, 4);
}
function attQrCardSig_(key, empId) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, key + ':' + empId + ':card', Utilities.Charset.UTF_8);
  return attHex_(b, 5);
}
/** Mã cố định SBA2 → nhân viên (ném lỗi nếu sai/đã cấp lại khoá). */
function attQrCardEmp_(empId, sig) {
  var emp = readEmployees_().filter(function (e) { return e.id === empId; })[0], key = attKeys_()[empId];
  var want = key ? attQrCardSig_(key, empId) : '';
  if (!emp || !key || !sig || want.slice(0, String(sig).length) !== String(sig) || String(sig).length < 8) throw new Error('Mã QR không hợp lệ (mã của quán khác hoặc đã bị đặt lại) — mở lại mã trong app.');
  return emp;
}
function attKeys_() { var o = readJsonKey_('attkeys'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; }
function attNewKey_() { return Utilities.getUuid().replace(/-/g, '') ; }

/** Khoá của một nhân viên (chưa có thì tạo). */
function attKeyOf_(empId) {
  var k = attKeys_()[empId];
  if (k) return k;
  var out = null;
  kvUpdate_('attkeys', function (cur) {
    cur = cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {};
    if (!cur[empId]) cur[empId] = attNewKey_();
    out = cur[empId];
    return cur;
  }, 'khoá điểm danh');
  return out;
}

/** Quản lý bật/tắt điểm danh + số phút cho phép đến muộn. */
/** Kiểm tra việc trước khi bấm thẻ về (v2026.10.16): bật/tắt + chọn những việc phải xong. Chỉ nhận việc đang có trong danh mục. */
function closeCheckNorm_(v, cur) {
  var known = readJobTpl_().map(function (x) { return x && x.id; });
  var ids = Array.isArray(v.ids) ? v.ids.map(String).filter(function (id) { return known.indexOf(id) !== -1; }).slice(0, 30) : (cur.ids || []);
  return { on: v.on === undefined ? !!cur.on : !!v.on, ids: ids };
}
/** Người này có làm ca cuối ngày đó không (ca "đến L" hoặc kết thúc từ giờ đóng cửa). */
function ccIsLast_(ym, day, empId) {
  var sc = readJsonKey_('schedule:' + ym) || {}, me = (sc[String(Number(day))] || {})[String(empId)];
  var chs = readCloseHours_(ym) || {}, dk = String(Number(day));
  var ch = chs[dk] != null && isFinite(Number(chs[dk])) ? Number(chs[dk]) : (Number(readSettings_().closeHour) || 21);
  return !!(me && !me.off && (me.shifts || []).some(function (s) { return s && (s.endAtClose || Number(s.end) >= ch); }));
}
/** Những việc đã chọn mà người này được giao trong ngày (ymd) vẫn chưa xong. */
function closeCheckMissing_(cfg, empId, ymd) {
  var cc = cfg && cfg.closeCheck;
  if (!cc || !cc.on || !cc.ids || !cc.ids.length) return [];
  var ym = ymd.slice(0, 7), day = Number(ymd.slice(8, 10));
  var jd = readJsonKey_('jobs:' + ym) || {}, dd = jd[String(day)] || {}, tst = dd.t || {};
  // Việc chưa gán người → áp dụng cho người làm ca cuối (ca "đến L" hoặc kết thúc từ giờ đóng cửa).
  var isLast = ccIsLast_(ym, day, empId);
  var tpls = readJobTpl_(), out = [];
  cc.ids.forEach(function (id) {
    var tp = tpls.filter(function (x) { return x && x.id === id; })[0];
    if (!tp || !jobTplOn_(tp, ym, day)) return;
    var st = tst[id] || {}, to = st.to || [];
    var mine = to.length ? to.indexOf(String(empId)) !== -1 : isLast;
    if (mine && !st.done) out.push(tp.title || id);
  });
  return out;
}
function attConfig(token, json) {
  requireManager_(token);
  var o; try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { o = null; }
  if (!o || typeof o !== 'object') throw new Error('Dữ liệu không hợp lệ.');
  var cur = attCfg_();
  var next = { on: o.on === undefined ? cur.on : !!o.on, grace: o.grace === undefined ? cur.grace : o.grace,
               kioskUrl: o.kioskUrl === undefined ? cur.kioskUrl : String(o.kioskUrl || '').trim(),
               mode: o.mode === undefined ? cur.mode : (o.mode === 'scan' ? 'scan' : 'show'),
               methods: cur.methods, health: o.health === undefined ? cur.health !== false : !!o.health,
               auto: o.auto === undefined ? cur.auto !== false : !!o.auto };
  next.closeCheck = o.closeCheck === undefined ? (cur.closeCheck || { on: false, ids: [] }) : closeCheckNorm_(o.closeCheck, cur.closeCheck || { on: false, ids: [] });
  if (o.mode !== undefined && o.methods === undefined) next.methods = { show: o.mode !== 'scan', scan: o.mode === 'scan', nfc: !!(cur.methods && cur.methods.nfc) };
  if (o.methods && typeof o.methods === 'object') {
    var m0 = cur.methods || { show: cur.mode !== 'scan', scan: cur.mode === 'scan', nfc: false };
    next.methods = { show: o.methods.show === undefined ? !!m0.show : !!o.methods.show, scan: o.methods.scan === undefined ? !!m0.scan : !!o.methods.scan,
                     nfc: o.methods.nfc === undefined ? !!m0.nfc : !!o.methods.nfc };
    if (!next.methods.show && !next.methods.scan && !next.methods.nfc) throw new Error('Hãy bật ít nhất một cách điểm danh.');
    next.mode = next.methods.scan && !next.methods.show && !next.methods.nfc ? 'scan' : 'show';
  }
  if (next.kioskUrl && !/^https:\/\//.test(next.kioskUrl)) throw new Error('Link máy quét phải bắt đầu bằng https://');
  return settingsPatch_({ att: next }).att;
}

/** Khoá để điện thoại nhân viên tự tạo mã QR (mỗi người chỉ lấy được khoá của mình; quản lý lấy được của ai cũng được). */
function attMyKey(token, empId) {
  var who = requireCanEdit_(token, empId);
  if (who.r !== 'mgr' && !attCfg_().on) throw new Error('Điểm danh bằng QR đang tắt.');
  var emp = readEmployees_().filter(function (e) { return e.id === String(empId); })[0];
  if (!emp) throw new Error('Không tìm thấy nhân viên này.');
  return { id: emp.id, name: emp.name, k: attKeyOf_(emp.id), now: Date.now(), win: ATT_WIN_MS };
}

/** Quản lý cấp lại khoá (vd. nhân viên làm mất điện thoại) — mã cũ hết hiệu lực ngay. */
function attResetKey(token, empId) {
  requireManager_(token);
  kvUpdate_('attkeys', function (cur) {
    cur = cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {};
    delete cur[String(empId)];
    return cur;
  }, 'đặt lại khoá điểm danh');
  return true;
}

function attList_(raw, day, empId) {
  var d = raw && raw[String(day)];
  var l = d && d[empId];
  return Array.isArray(l) ? l : [];
}
function attLastKind_(list) { return list.length ? String(list[list.length - 1].k) : ''; }

/** v41: lần quét này có thuộc ca HÔM QUA (ca qua nửa đêm) không. Trước đây chỉ cần hôm qua chưa
 *  bấm 退勤 trong vòng 18 tiếng → sáng hôm sau quét cũng gắn vào hôm qua (ca 16 tiếng / không vào ca được).
 *  Nay chỉ gắn khi hôm qua còn mở VÀ (chưa tới 5 giờ sáng, hoặc ca hôm qua kết thúc sau 24h và chưa quá
 *  giờ kết thúc + 3 tiếng). Quét 出勤 thì luôn là ngày mới. */
function attOpenYest_(yl, yest, today, empId, now) {
  if (!yl || !yl.length || attLastKind_(yl) === 'out') return false;
  if (now - yl[yl.length - 1].t >= 18 * 3600000) return false;
  if (now < attDayStart_(today) + 5 * 3600000) return true;
  var sch = attSchedOf_(yest, empId);
  return !!(sch && Number(sch.end) > 24 && now < attDayStart_(yest) + (Number(sch.end) + 3) * 3600000);
}

/** Ca đã xếp trong lịch của ngày đó (để biết đến muộn / về sớm). */
function attSchedOf_(ymd, empId) {
  try {
    var ym = ymd.slice(0, 7), day = Number(ymd.slice(8, 10));
    var e = (readMonthNormalized_('schedule:' + ym, readEmployees_())[day] || {})[empId];
    if (!e || e.off || !e.shifts || !e.shifts.length) return null;
    var s0 = e.shifts.filter(function (x) { return !x.isSupport; });
    if (!s0.length) return null;
    return { start: s0[0].start, end: s0[s0.length - 1].end };
  } catch (err) { return null; }
}

/** Giờ làm thực (giờ) từ danh sách điểm danh: (về − vào) − (các đoạn nghỉ). Ca chưa về thì tính tới `until`. */
function attWorkHours_(list, until) {
  var ms = 0, inT = null, bsT = null, brk = 0;
  list.forEach(function (p) {
    if (p.k === 'in') { inT = p.t; brk = 0; bsT = null; }
    else if (p.k === 'bs' && inT != null) bsT = p.t;
    else if (p.k === 'be' && bsT != null) { brk += p.t - bsT; bsT = null; }
    else if (p.k === 'out' && inT != null) {
      if (bsT != null) { brk += p.t - bsT; bsT = null; }
      ms += p.t - inT - brk; inT = null; brk = 0;
    }
  });
  if (inT != null && until) ms += until - inT - brk - (bsT != null ? until - bsT : 0);
  // v24: tính tới từng phút (trước làm tròn 0,1 giờ = 6 phút).
  return Math.max(0, Math.round(Math.round(ms / 60000) / 60 * 10000) / 10000);
}

var ATT_KIND_JA_ = { 'in': '出勤', 'bs': '休憩開始', 'be': '休憩終了', 'out': '退勤' };

function attCheckStep_(last, kind, list) {
  if ((ATT_NEXT_[last] || []).indexOf(kind) !== -1) return;
  var lastT = list.length ? attHm_(list[list.length - 1].t) : '';
  if (kind === 'in') throw new Error('Đã điểm danh vào ca lúc ' + lastT + ' rồi.');
  if (last === '' || last === 'out') throw new Error('Chưa điểm danh vào ca — hãy quét 出勤 trước.');
  if (last === 'bs') throw new Error('Đang nghỉ giải lao — hãy quét 休憩終了 trước.');
  if (kind === 'be') throw new Error('Chưa bắt đầu nghỉ — hãy quét 休憩開始 trước.');
  throw new Error('Thao tác không hợp lệ.');
}

/** Máy quét gọi (KHÔNG cần đăng nhập — mã QR có chữ ký thay cho mật khẩu). */
function attPunch(code, kind) {
  var cfg = attCfg_();
  if (!cfg.on) throw new Error('Điểm danh bằng QR đang tắt.');
  kind = String(kind || '');
  if (ATT_KINDS.indexOf(kind) === -1) throw new Error('Thao tác không hợp lệ.');
  // Chặn gọi dồn dập (máy lạ thử mã): tối đa 60 lần quét / phút cho cả quán.
  var cache = CacheService.getScriptCache(), now = Date.now();
  var rk = 'attRate:' + Math.floor(now / 60000), rc = Number(cache.get(rk)) || 0;
  if (rc >= 60) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  cache.put(rk, String(rc + 1), 120);

  var mc = /^SBA2:(e[0-9A-Za-z_-]{3,24}):([0-9a-f]{10})$/.exec(String(code || '').trim());
  if (mc) return attRecord_(attQrCardEmp_(mc[1], mc[2]), kind, now, cfg);
  var m = /^SBA1:(e[0-9A-Za-z_-]{3,24}):(\d{1,12}):([0-9a-f]{8})$/.exec(String(code || '').trim());
  if (!m) throw new Error('Đây không phải mã QR điểm danh của app.');
  if (m[2] === '0') return attRecord_(attQrCardEmp_(m[1], m[3]), kind, now, cfg);      // mã cố định (khung 0)
  var empId = m[1], win = Number(m[2]), sig = m[3];
  var emp = readEmployees_().filter(function (e) { return e.id === empId; })[0];
  var key = attKeys_()[empId];
  if (!emp || !key || attSig_(key, empId, win) !== sig) throw new Error('Mã QR không hợp lệ (mã của quán khác hoặc đã bị đặt lại) — mở lại mã trong app.');
  var cur = Math.floor(now / ATT_WIN_MS);
  if (win < cur - ATT_WIN_BACK || win > cur + ATT_WIN_AHEAD) throw new Error('Mã QR đã hết hạn — mở lại mã trong app rồi quét lại.');
  return attRecord_(emp, kind, now, cfg);
}

/** Ghi một lần điểm danh (dùng chung cho 2 cách: máy quét mã của nhân viên / nhân viên quét mã của quán). */
function attRecord_(emp, kind, now, cfg, src) {
  var empId = emp.id;
  // Ngày làm việc: hôm qua còn ca chưa về (trong vòng 18 tiếng) → gắn vào hôm qua (ca qua nửa đêm).
  var today = attYmd_(now), yest = attAddDays_(today, -1);
  var yl = attList_(readJsonKey_('att:' + yest.slice(0, 7)), Number(yest.slice(8, 10)), empId);
  var target = (kind !== 'in' && attOpenYest_(yl, yest, today, empId, now)) ? yest : today;
  if (kind === 'out') {
    var ccMiss = closeCheckMissing_(cfg, empId, target);
    if (ccMiss.length) throw new Error('Chưa bấm thẻ về được — còn việc ca cuối chưa làm xong: ' + ccMiss.join(', ') + '. Hãy tích xong trong app trên điện thoại rồi bấm lại.');
  }
  var ym = target.slice(0, 7), dd = String(Number(target.slice(8, 10)));

  var dup = false, list = null;
  kvUpdate_('att:' + ym, function (raw) {
    raw = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    var day = raw[dd] || (raw[dd] = {});
    var l = Array.isArray(day[empId]) ? day[empId] : (day[empId] = []);
    var last = attLastKind_(l);
    // Quét lại cùng một loại trong 3 phút (bấm 2 lần, máy chậm) → coi như đã ghi, không báo lỗi.
    if (last === kind && now - l[l.length - 1].t < 180000) { dup = true; list = l.slice(); return raw; }
    attCheckStep_(last, kind, l);
    if (l.length >= 12) throw new Error('Ngày này đã có quá nhiều lần điểm danh — báo quản lý sửa giúp.');
    l.push({ k: kind, t: now, s: src === 'nfc' ? 'nfc' : 'qr' });
    list = l.slice();
    return raw;
  }, 'điểm danh');

  var p = list[list.length - 1], sch = attSchedOf_(target, empId), res = {
    name: emp.name, id: empId, kind: kind, t: p.t, hm: attHm_(p.t), day: target, dup: dup,
    list: list, sched: sch, late: 0, early: 0, work: null
  };
  if (sch) {
    var st = attDayStart_(target);
    if (kind === 'in') { var lm = Math.round((p.t - (st + sch.start * 3600000)) / 60000); if (lm > (cfg.grace || 0)) res.late = lm; }
    if (kind === 'out') { var em = Math.round((st + sch.end * 3600000 - p.t) / 60000); if (em > 0) res.early = em; }
  }
  if (kind === 'out') { res.work = attWorkHours_(list, null); res.workMin = Math.round(res.work * 60); }
  return res;
}

function attYm_(ym) { if (!/^\d{4}-\d{2}$/.test(String(ym || ''))) throw new Error('Tháng không hợp lệ.'); return String(ym); }

/** Quản lý: cả tháng. */
function attMonth(token, ym) {
  requireManager_(token);
  ym = attYm_(ym);
  var raw = readJsonKey_('att:' + ym), cfg = attCfg_();
  return { ym: ym, days: raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}, on: !!cfg.on, grace: cfg.grace, now: Date.now(), kiosk: attKioskUrl_() };
}

/** Nhân viên: điểm danh của chính mình trong tháng. */
function attMine(token, empId, ym) {
  requireCanEdit_(token, empId);
  ym = attYm_(ym);
  var raw = readJsonKey_('att:' + ym), out = {};
  Object.keys(raw || {}).forEach(function (d) { var l = raw[d] && raw[d][empId]; if (Array.isArray(l) && l.length) out[d] = l; });
  return { ym: ym, days: out, on: !!attCfg_().on, now: Date.now() };
}

/** Quản lý sửa / thêm / xoá giờ điểm danh của một người trong một ngày (quên quét, quét nhầm). */
function attEdit(token, ym, day, empId, json) {
  requireManager_(token);
  ym = attYm_(ym);
  var d = Math.round(Number(day));
  if (!(d >= 1 && d <= 31)) throw new Error('Ngày không hợp lệ.');
  empId = String(empId || '');
  if (!readEmployees_().some(function (e) { return e.id === empId; })) throw new Error('Không tìm thấy nhân viên này.');
  var arr; try { arr = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { arr = null; }
  if (!Array.isArray(arr) || arr.length > 12) throw new Error('Dữ liệu không hợp lệ.');
  var st = attDayStart_(ym + '-' + ('0' + d).slice(-2));
  var list = arr.map(function (p) {
    var k = String(p && p.k), t = Math.round(Number(p && p.t));
    if (ATT_KINDS.indexOf(k) === -1 || !isFinite(t) || t < st - 6 * 3600000 || t > st + 36 * 3600000) throw new Error('Giờ không hợp lệ.');
    return { k: k, t: t, s: p.s === 'qr' ? 'qr' : 'm' };
  }).sort(function (a, b) { return a.t - b.t; });
  var last = '';
  list.forEach(function (p, i) {
    if ((ATT_NEXT_[last] || []).indexOf(p.k) === -1) throw new Error('Thứ tự điểm danh không hợp lệ: ' + ATT_KIND_JA_[p.k] + ' (' + attHm_(p.t) + ').');
    last = p.k;
  });
  kvUpdate_('att:' + ym, function (raw) {
    raw = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    var k = String(d);
    if (!raw[k]) raw[k] = {};
    if (list.length) raw[k][empId] = list; else delete raw[k][empId];
    if (!Object.keys(raw[k]).length) delete raw[k];
    return raw;
  }, 'sửa điểm danh');
  return attMonth(token, ym);
}

// ---------------------------------------------------------------------------
// MÁY ĐIỂM DANH — TRANG RIÊNG (v.12): camera trực tiếp.
// App chính chạy trong khung (iframe) của Google → từ 2026 Google chặn camera trong khung đó.
// Nên máy quét là MỘT TRANG RIÊNG mở thẳng trên trình duyệt:
//   • ?kiosk=1  → máy chủ trả trang dạng XHTML (ContentService, không bọc khung) — không cần cài gì thêm;
//   • hoặc tải kiosk.html (attKioskFile) để tự đặt lên GitHub Pages / Netlify… rồi dán link vào ⏱ 勤怠.
// Trang đó gọi lại máy chủ qua  ?api=att&fn=info | fn=punch&code=…&kind=…  (JSON).
// KIOSK_TPL_B64 được dựng tự động từ đúng mã đọc QR trong Index.html (đừng sửa tay).
// ---------------------------------------------------------------------------
function attExecUrl_() { try { return ScriptApp.getService().getUrl() || ''; } catch (e) { return ''; } }
function attKioskUrl_() {
  var a = attCfg_();
  if (a.kioskUrl) {
    // Trang tự host (GitHub Pages …) dùng bản chung: gắn link app vào sau dấu # (không gửi lên máy chủ của trang đó).
    var ex = attExecUrl_();
    return ex && a.kioskUrl.indexOf('#u=') === -1 ? a.kioskUrl.split('#')[0] + '#u=' + encodeURIComponent(ex) : a.kioskUrl;
  }
  var u = attExecUrl_();
  return u ? u + '?kiosk=1' : '';
}
function attXml_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function attJs_(s) { return JSON.stringify(String(s == null ? '' : s)).slice(1, -1).replace(/</g, '\\u003c').replace(/>/g, '\\u003e'); }
/** Trang máy quét đã điền link máy chủ + tên quán. */
function attKioskHtml_(execUrl) {
  var tpl = Utilities.newBlob(Utilities.base64Decode(KIOSK_TPL_B64)).getDataAsString('UTF-8');
  var store = '';
  try { store = readSettings_().storeName || ''; } catch (e) { store = ''; }
  return tpl.split('%%EXEC%%').join(attJs_(execUrl)).split('%%STOREJS%%').join(attJs_(store)).split('%%STORE%%').join(attXml_(store || 'SUBWAY'));
}
/** doGet ?kiosk=1 */
function attServeKiosk_() {
  return ContentService.createTextOutput(attKioskHtml_(attExecUrl_())).setMimeType(ContentService.MimeType.XML);
}
/** doGet ?api=att — máy quét (trang riêng) gọi vào. Luôn trả JSON, lỗi cũng là JSON. */
function attServeApi_(p) {
  var out;
  try {
    if (p.fn === 'info') {
      var st = readSettings_();
      out = { ok: true, on: !!(st.att && st.att.on), store: st.storeName || '', now: Date.now(), auto: !(st.att && st.att.auto === false) };
    } else if (p.fn === 'who') {
      out = { ok: true, r: attWhoCode_(String(p.code || '')) };
    } else if (p.fn === 'punch') {
      out = { ok: true, r: attPunch(String(p.code || ''), String(p.kind || '')) };
    } else out = { ok: false, m: 'Thao tác không hợp lệ.' };
  } catch (e) { out = { ok: false, m: (e && e.message) || String(e) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
/** Quản lý tải trang máy quét để tự đặt lên chỗ khác (GitHub Pages…). */
function attKioskFile(token) {
  requireManager_(token);
  var u = attExecUrl_();
  if (!u) throw new Error('Chưa triển khai web app — không lấy được link máy chủ.');
  return { name: 'index.html', html: attKioskHtml_(u), exec: u };
}

// ---------------------------------------------------------------------------
// CÁCH 2 (v.13, mặc định): MÀN HÌNH QUÁN HIỆN QR — NHÂN VIÊN QUÉT BẰNG ĐIỆN THOẠI
// Không cần camera trong app, không cần đặt trang ở đâu khác:
//   • Máy tính bảng của quán (quản lý đăng ký 1 lần → khoá thiết bị 'attdev') mở tab ⏱ 打刻 → hiện mã QR,
//     đổi mỗi 30 giây:  <link app>?pa=<khung 30 giây>.<10 hex SHA-256(bí mật quán:pa:khung)>
//   • Nhân viên quét bằng camera THƯỜNG của điện thoại (tự nhận mã, không cần mở app trước) → mở app → chọn
//     出勤 / 休憩開始 / 休憩終了 / 退勤 → attPunchSelf. Hoặc trong app bấm "お店のQRを読み取る" (chụp ảnh).
//   • Mã chỉ nhận trong ~3 phút → chụp màn hình gửi bạn ở nhà điểm danh hộ rất khó.
// ---------------------------------------------------------------------------
var ATT_PA_MS = 30000, ATT_PA_BACK = 6, ATT_PA_AHEAD = 1;
function attPaSig_(win) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, getSecret_('ATT_STORE_K') + ':pa:' + win, Utilities.Charset.UTF_8);
  return attHex_(b, 5);
}
function attDevs_() { var o = readJsonKey_('attdev'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; }

/** Quản lý: đăng ký máy đang dùng làm "màn hình điểm danh" của quán. */
function attKioskReg(token, name) {
  requireManager_(token);
  getSecret_('ATT_STORE_K');
  var key = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  var nm = String(name == null ? '' : name).replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 30) || 'Tablet';
  kvUpdate_('attdev', function (cur) {
    cur = cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {};
    var ks = Object.keys(cur).sort(function (a, b) { return (cur[a].at || 0) - (cur[b].at || 0); });
    while (ks.length >= 10) delete cur[ks.shift()];
    cur[key] = { n: nm, at: Date.now() };
    return cur;
  }, 'đăng ký màn hình điểm danh');
  return { key: key, name: nm, list: attKioskList(token) };
}
function attKioskList(token) {
  requireManager_(token);
  var d = attDevs_(), cache = CacheService.getScriptCache();
  return Object.keys(d).map(function (k) {
    var seen = Number(cache.get('attseen:' + k.slice(0, 12))) || 0;
    return { id: k.slice(0, 12), n: d[k].n, at: d[k].at, seen: seen || null };
  }).sort(function (a, b) { return a.at - b.at; });
}
function attKioskDel(token, id) {
  requireManager_(token);
  id = String(id || '');
  kvUpdate_('attdev', function (cur) {
    cur = cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {};
    Object.keys(cur).forEach(function (k) { if (k.slice(0, 12) === id) delete cur[k]; });
    return cur;
  }, 'xoá màn hình điểm danh');
  return attKioskList(token);
}

/** Màn hình quán (chưa đăng nhập, nhưng phải có khoá thiết bị): mã QR hiện tại + điểm danh gần đây hôm nay. */
function attKioskToken(devKey) {
  var cfg = attCfg_();
  if (!cfg.on) throw new Error('Điểm danh bằng QR đang tắt.');
  devKey = String(devKey || '');
  var d = attDevs_();
  if (!devKey || !d[devKey]) throw new Error('Thiết bị này chưa được đăng ký làm màn hình điểm danh.');
  var now = Date.now(), win = Math.floor(now / ATT_PA_MS), pa = win + '.' + attPaSig_(win);
  try { CacheService.getScriptCache().put('attseen:' + devKey.slice(0, 12), String(now), 21600); } catch (e) {}
  var exec = attExecUrl_(), today = attYmd_(now), raw = readJsonKey_('att:' + today.slice(0, 7)), day = (raw && raw[String(Number(today.slice(8, 10)))]) || {};
  var name = {}; readEmployees_().forEach(function (e) { name[e.id] = e.name; });
  var recent = [];
  Object.keys(day).forEach(function (id) { (day[id] || []).forEach(function (p) { if (p.s === 'qr' || p.s === 'nfc') recent.push({ n: name[id] || '?', k: p.k, t: p.t, hm: attHm_(p.t), s: p.s }); }); });
  recent.sort(function (a, b) { return b.t - a.t; });
  var fr = frontUrl_();
  return { pa: pa, url: fr ? joinUrl_(fr, 'pa', pa) : '', now: now, next: (win + 1) * ATT_PA_MS, store: readSettings_().storeName || '', recent: recent.slice(0, 10), auto: cfg.auto !== false };
}

/** Nhân viên tự điểm danh sau khi quét QR của quán. */
function attPunchSelf(token, empId, pa, kind) {
  var who = requireCanEdit_(token, empId);
  if (who.r !== 'emp') throw new Error('Quản lý không điểm danh hộ bằng mã của quán — hãy sửa giờ trong ⏱ 勤怠.');
  var cfg = attCfg_();
  if (!cfg.on) throw new Error('Điểm danh bằng QR đang tắt.');
  kind = String(kind || '');
  if (ATT_KINDS.indexOf(kind) === -1) throw new Error('Thao tác không hợp lệ.');
  var m = /^(\d{1,12})\.([0-9a-f]{10})$/.exec(String(pa || '').trim());
  if (!m || attPaSig_(Number(m[1])) !== m[2]) throw new Error('Mã QR của quán không đúng — hãy quét mã trên màn hình điểm danh của quán.');
  var now = Date.now(), cur = Math.floor(now / ATT_PA_MS), win = Number(m[1]);
  if (win < cur - ATT_PA_BACK || win > cur + ATT_PA_AHEAD) throw new Error('Mã QR của quán đã hết hạn — quét lại mã đang hiện trên màn hình quán.');
  var emp = readEmployees_().filter(function (e) { return e.id === String(empId); })[0];
  if (!emp) throw new Error('Không tìm thấy nhân viên này.');
  return attRecord_(emp, kind, now, cfg);
}

// Trang máy quét (dựng tự động từ Index.html + v12/kiosk.js — ĐỪNG SỬA TAY)
var KIOSK_TPL_B64 = 'PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPCFET0NUWVBFIGh0bWw+CjxodG1sIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sIiBsYW5nPSJqYSI+CjxoZWFkPgo8bWV0YSBjaGFyc2V0PSJVVEYtOCIgLz4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLCBtYXhpbXVtLXNjYWxlPTEsIHVzZXItc2NhbGFibGU9bm8iIC8+CjxtZXRhIG5hbWU9Im1vYmlsZS13ZWItYXBwLWNhcGFibGUiIGNvbnRlbnQ9InllcyIgLz4KPG1ldGEgbmFtZT0iYXBwbGUtbW9iaWxlLXdlYi1hcHAtY2FwYWJsZSIgY29udGVudD0ieWVzIiAvPgo8dGl0bGU+JSVTVE9SRSUlIOKAlCBRUuaJk+WIuzwvdGl0bGU+CjxzdHlsZT4vKjwhW0NEQVRBWyovCjpyb290ey0tYmc6I0Y0RjJFQzstLWNhcmQ6I0ZGRkZGRjstLWluazojMUYyMzI4Oy0tbXV0ZWQ6IzZCNzI4MDstLWxpbmU6I0UzREZEMzstLWdyZWVuOiMxRjdBNEE7fQpAbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOmRhcmspezpyb290ey0tYmc6IzExMTQxNzstLWNhcmQ6IzFBMUUyMzstLWluazojRUNFRkYzOy0tbXV0ZWQ6IzlBQTNBRTstLWxpbmU6IzJBMzAzODt9fQoqe2JveC1zaXppbmc6Ym9yZGVyLWJveDt9Cmh0bWwsYm9keXttYXJnaW46MDtwYWRkaW5nOjA7YmFja2dyb3VuZDp2YXIoLS1iZyk7Y29sb3I6dmFyKC0taW5rKTtmb250LWZhbWlseTotYXBwbGUtc3lzdGVtLEJsaW5rTWFjU3lzdGVtRm9udCwiSGlyYWdpbm8gS2FrdSBHb3RoaWMgUHJvTiIsIkhpcmFnaW5vIFNhbnMiLCJOb3RvIFNhbnMgSlAiLCJTZWdvZSBVSSIsUm9ib3RvLEFyaWFsLHNhbnMtc2VyaWY7LXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50O2ZvbnQtdmFyaWFudC1udW1lcmljOnRhYnVsYXItbnVtczt9CiNraW9za3ttYXgtd2lkdGg6MTEwMHB4O21hcmdpbjowIGF1dG87cGFkZGluZzoxNHB4IDE2cHggMjhweDt9Ci5rLXRvcHtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2dhcDoxMHB4O30KLmstc3RvcmV7Zm9udC1zaXplOjE4cHg7fQouay1sYW5ne2Rpc3BsYXk6ZmxleDtnYXA6MnB4O2JhY2tncm91bmQ6dmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czo5OTlweDtwYWRkaW5nOjNweDt9Ci5rLWxhbmcgYnV0dG9ue2JvcmRlcjpub25lO2JhY2tncm91bmQ6dHJhbnNwYXJlbnQ7Y29sb3I6dmFyKC0tbXV0ZWQpO2ZvbnQtd2VpZ2h0OjcwMDtmb250LXNpemU6MTNweDtwYWRkaW5nOjZweCAxMXB4O2JvcmRlci1yYWRpdXM6OTk5cHg7Y3Vyc29yOnBvaW50ZXI7fQouay1sYW5nIGJ1dHRvbi5vbntiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2NvbG9yOnZhcigtLWluayk7fQouay10aW1le2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpiYXNlbGluZTtnYXA6MTJweDtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO21hcmdpbjo4cHggMCAxMnB4O30KLmstY2xvY2t7Zm9udC1zaXplOjQ0cHg7Zm9udC13ZWlnaHQ6ODAwO2xldHRlci1zcGFjaW5nOjFweDt9Ci5rLWNsb2NrIHNtYWxse2ZvbnQtc2l6ZToyMHB4O2NvbG9yOnZhcigtLW11dGVkKTt9Ci5rLWRhdGV7Zm9udC1zaXplOjE1cHg7Y29sb3I6dmFyKC0tbXV0ZWQpO2ZvbnQtd2VpZ2h0OjYwMDt9Ci5rLW1haW57ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczptaW5tYXgoMCwxLjVmcikgbWlubWF4KDAsMWZyKTtnYXA6MTZweDthbGlnbi1pdGVtczpzdGFydDt9CkBtZWRpYSAobWF4LXdpZHRoOjc2MHB4KXsuay1tYWlue2dyaWQtdGVtcGxhdGUtY29sdW1uczoxZnI7fX0KLmstc3RhZ2V7cG9zaXRpb246cmVsYXRpdmU7YXNwZWN0LXJhdGlvOjQvMztiYWNrZ3JvdW5kOiMwQjBEMTA7Ym9yZGVyLXJhZGl1czoxOHB4O292ZXJmbG93OmhpZGRlbjtib3gtc2hhZG93OjAgMnB4IDEwcHggcmdiYSgwLDAsMCwuMTgpO30KLmstc3RhZ2UgdmlkZW97cG9zaXRpb246YWJzb2x1dGU7aW5zZXQ6MDt3aWR0aDoxMDAlO2hlaWdodDoxMDAlO29iamVjdC1maXQ6Y292ZXI7ZGlzcGxheTpub25lO30KLmstc3RhZ2UubGl2ZSB2aWRlb3tkaXNwbGF5OmJsb2NrO30KLmstc3RhZ2UubWlycm9yIHZpZGVve3RyYW5zZm9ybTpzY2FsZVgoLTEpO30KLmstcGh7cG9zaXRpb246YWJzb2x1dGU7aW5zZXQ6MDtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2dhcDoxMHB4O2NvbG9yOiM5QUEzQUU7Zm9udC1zaXplOjE2cHg7dGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzoyMHB4O30KLmstcGgtaWN7Zm9udC1zaXplOjQ2cHg7b3BhY2l0eTouNzt9Ci5rLXN0YWdlLmxpdmUgLmstcGh7ZGlzcGxheTpub25lO30KLmstZnJhbWV7cG9zaXRpb246YWJzb2x1dGU7bGVmdDo1MCU7dG9wOjUwJTt3aWR0aDo1OCU7YXNwZWN0LXJhdGlvOjEvMTt0cmFuc2Zvcm06dHJhbnNsYXRlKC01MCUsLTUwJSk7ZGlzcGxheTpub25lO3BvaW50ZXItZXZlbnRzOm5vbmU7fQouay1zdGFnZS5saXZlIC5rLWZyYW1le2Rpc3BsYXk6YmxvY2s7fQouay1mcmFtZSBpe3Bvc2l0aW9uOmFic29sdXRlO3dpZHRoOjE1JTtoZWlnaHQ6MTUlO2JvcmRlcjo1cHggc29saWQgI2ZmZjtmaWx0ZXI6ZHJvcC1zaGFkb3coMCAwIDNweCByZ2JhKDAsMCwwLC41KSk7fQouay1mcmFtZSBpOm50aC1jaGlsZCgxKXtsZWZ0OjA7dG9wOjA7Ym9yZGVyLXJpZ2h0Om5vbmU7Ym9yZGVyLWJvdHRvbTpub25lO2JvcmRlci1yYWRpdXM6MTJweCAwIDAgMDt9Ci5rLWZyYW1lIGk6bnRoLWNoaWxkKDIpe3JpZ2h0OjA7dG9wOjA7Ym9yZGVyLWxlZnQ6bm9uZTtib3JkZXItYm90dG9tOm5vbmU7Ym9yZGVyLXJhZGl1czowIDEycHggMCAwO30KLmstZnJhbWUgaTpudGgtY2hpbGQoMyl7bGVmdDowO2JvdHRvbTowO2JvcmRlci1yaWdodDpub25lO2JvcmRlci10b3A6bm9uZTtib3JkZXItcmFkaXVzOjAgMCAwIDEycHg7fQouay1mcmFtZSBpOm50aC1jaGlsZCg0KXtyaWdodDowO2JvdHRvbTowO2JvcmRlci1sZWZ0Om5vbmU7Ym9yZGVyLXRvcDpub25lO2JvcmRlci1yYWRpdXM6MCAwIDEycHggMDt9Ci5rLXRhZ3twb3NpdGlvbjphYnNvbHV0ZTtsZWZ0OjEycHg7dG9wOjEycHg7Y29sb3I6I2ZmZjtmb250LXdlaWdodDo4MDA7Zm9udC1zaXplOjE4cHg7cGFkZGluZzo2cHggMTRweDtib3JkZXItcmFkaXVzOjk5OXB4O2Rpc3BsYXk6bm9uZTt9Ci5rLXN0YWdlLmxpdmUgLmstdGFne2Rpc3BsYXk6YmxvY2s7fQouay10YWc6ZW1wdHl7ZGlzcGxheTpub25lICFpbXBvcnRhbnQ7fQouay1jYW0sLmstc3RvcGJ7cG9zaXRpb246YWJzb2x1dGU7dG9wOjEycHg7Ym9yZGVyOm5vbmU7Ym9yZGVyLXJhZGl1czo5OTlweDtiYWNrZ3JvdW5kOnJnYmEoMCwwLDAsLjU1KTtjb2xvcjojZmZmO2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjcwMDtwYWRkaW5nOjhweCAxM3B4O2N1cnNvcjpwb2ludGVyO30KLmstY2Fte3JpZ2h0OjEycHg7fQouay1zdG9wYntyaWdodDoxMnB4O3RvcDphdXRvO2JvdHRvbToxMnB4O2Rpc3BsYXk6bm9uZTt9Ci5rLXN0YWdlLmxpdmUgLmstc3RvcGJ7ZGlzcGxheTpibG9jazt9Ci5rLXJlc3twb3NpdGlvbjphYnNvbHV0ZTtpbnNldDowO2Rpc3BsYXk6bm9uZTtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Z2FwOjhweDtjb2xvcjojZmZmO3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MjBweDt9Ci5rLXJlcy5zaG93e2Rpc3BsYXk6ZmxleDthbmltYXRpb246a2luIC4xNnMgZWFzZS1vdXQ7fQpAa2V5ZnJhbWVzIGtpbntmcm9te29wYWNpdHk6MDt0cmFuc2Zvcm06c2NhbGUoLjk3KTt9dG97b3BhY2l0eToxO3RyYW5zZm9ybTpub25lO319Ci5rLW9re3dpZHRoOjc2cHg7aGVpZ2h0Ojc2cHg7Ym9yZGVyLXJhZGl1czo1MCU7YmFja2dyb3VuZDpyZ2JhKDI1NSwyNTUsMjU1LC4yKTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Zm9udC1zaXplOjQ0cHg7Zm9udC13ZWlnaHQ6ODAwO30KLmstbm17Zm9udC1zaXplOjMycHg7Zm9udC13ZWlnaHQ6ODAwO30KLmsta2R7Zm9udC1zaXplOjIwcHg7Zm9udC13ZWlnaHQ6NjAwO30KLmsta2QgYntmb250LXNpemU6MzJweDttYXJnaW4tbGVmdDo2cHg7fQouay1ub3Rle2ZvbnQtc2l6ZToxNnB4O2JhY2tncm91bmQ6cmdiYSgwLDAsMCwuMik7Ym9yZGVyLXJhZGl1czoxMHB4O3BhZGRpbmc6M3B4IDEycHg7fQouay1tc2d7Zm9udC1zaXplOjE5cHg7Zm9udC13ZWlnaHQ6NzAwO21heC13aWR0aDo0NDBweDtsaW5lLWhlaWdodDoxLjU7fQouay1iYXJ7aGVpZ2h0OjZweDtib3JkZXItcmFkaXVzOjNweDtiYWNrZ3JvdW5kOnZhcigtLWxpbmUpO292ZXJmbG93OmhpZGRlbjttYXJnaW4tdG9wOjhweDt2aXNpYmlsaXR5OmhpZGRlbjt9Ci5rLWJhci5saXZle3Zpc2liaWxpdHk6dmlzaWJsZTt9Ci5rLWJhciBpe2Rpc3BsYXk6YmxvY2s7aGVpZ2h0OjEwMCU7d2lkdGg6MDtiYWNrZ3JvdW5kOnZhcigtLWdyZWVuKTt0cmFuc2l0aW9uOndpZHRoIC4yNXMgbGluZWFyO30KLmstc3RhdHVze3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtc2l6ZToxNnB4O2ZvbnQtd2VpZ2h0OjcwMDttaW4taGVpZ2h0OjI2cHg7bWFyZ2luLXRvcDo4cHg7fQouay1zdGF0dXMuYmFke2NvbG9yOiNDNTMwMzA7fQouay1raW5kc3tkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOjFmciAxZnI7Z2FwOjEycHg7fQpAbWVkaWEgKG1pbi13aWR0aDo3NjFweCl7Lmsta2luZHN7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOjFmcjt9fQouay1raW5ke2JvcmRlcjpub25lO2JvcmRlci1yYWRpdXM6MTZweDtwYWRkaW5nOjE2cHggMTJweDtiYWNrZ3JvdW5kOnZhcigtLWFrKTtjb2xvcjojZmZmO2N1cnNvcjpwb2ludGVyO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtnYXA6MTJweDtib3gtc2hhZG93OjAgMnB4IDAgcmdiYSgwLDAsMCwuMTgpO3RyYW5zaXRpb246dHJhbnNmb3JtIC4wOHMsYm94LXNoYWRvdyAuMTJzO2ZvbnQtZmFtaWx5OmluaGVyaXQ7fQouay1raW5kOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk3KTt9Ci5rLWtpbmQuc2Vse2JveC1zaGFkb3c6MCAwIDAgNHB4IHZhcigtLWJnKSwwIDAgMCA4cHggdmFyKC0tYWspO30KLmsta2luZCBpe2ZvbnQtc3R5bGU6bm9ybWFsO2ZvbnQtc2l6ZToyMnB4O3dpZHRoOjQycHg7aGVpZ2h0OjQycHg7Ym9yZGVyLXJhZGl1czo1MCU7YmFja2dyb3VuZDpyZ2JhKDI1NSwyNTUsMjU1LC4xOCk7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO30KLmsta2luZCBie2ZvbnQtc2l6ZToyMnB4O2xldHRlci1zcGFjaW5nOi41cHg7fQouay1yZWNlbnR7bWFyZ2luLXRvcDoxNnB4O30KLmstcmVjLWh7Zm9udC1zaXplOjEyLjVweDtjb2xvcjp2YXIoLS1tdXRlZCk7Zm9udC13ZWlnaHQ6NzAwO21hcmdpbi1ib3R0b206NHB4O30KLmstcmVje2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOjEwcHg7Zm9udC1zaXplOjE1cHg7cGFkZGluZzo3cHggMnB4O2JvcmRlci1ib3R0b206MXB4IGRhc2hlZCB2YXIoLS1saW5lKTt9Ci5rLXJlYyBie21heC13aWR0aDo0MCU7b3ZlcmZsb3c6aGlkZGVuO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXM7d2hpdGUtc3BhY2U6bm93cmFwO30KLmstcmVjIHNwYW57ZmxleDoxO2NvbG9yOnZhcigtLW11dGVkKTtvdmVyZmxvdzpoaWRkZW47dGV4dC1vdmVyZmxvdzplbGxpcHNpczt3aGl0ZS1zcGFjZTpub3dyYXA7fQouay1yZWMgZW17Zm9udC1zdHlsZTpub3JtYWw7Zm9udC13ZWlnaHQ6NzAwO30KLmstcmVjLmVyciBzcGFue2NvbG9yOiNDNTMwMzA7fQouay1yZWMgLmstZG90e2ZsZXg6MCAwIDEwcHg7d2lkdGg6MTBweDtoZWlnaHQ6MTBweDtib3JkZXItcmFkaXVzOjUwJTt9Ci5rLWZvb3R7Zm9udC1zaXplOjEyLjVweDtjb2xvcjp2YXIoLS1tdXRlZCk7bWFyZ2luLXRvcDoxNnB4O3RleHQtYWxpZ246Y2VudGVyO30KLmstZ297Ym9yZGVyOm5vbmU7Ym9yZGVyLXJhZGl1czo5OTlweDtiYWNrZ3JvdW5kOiMxRjdBNEE7Y29sb3I6I2ZmZjtmb250LXNpemU6MjBweDtmb250LXdlaWdodDo4MDA7cGFkZGluZzoxNHB4IDI2cHg7Y3Vyc29yOnBvaW50ZXI7Ym94LXNoYWRvdzowIDZweCAyMHB4IC04cHggcmdiYSgzMSwxMjIsNzQsLjgpO30KLmstcGgtc3Vie2ZvbnQtc2l6ZToxM3B4O2NvbG9yOiM3Qzg1OTA7fQouay1waWNre3Bvc2l0aW9uOmFic29sdXRlO2luc2V0OjA7ZGlzcGxheTpub25lO2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtnYXA6MTBweDtiYWNrZ3JvdW5kOnJnYmEoMTEsMTMsMTYsLjg4KTtjb2xvcjojZmZmO3BhZGRpbmc6MTRweDt0ZXh0LWFsaWduOmNlbnRlcjt9Ci5rLXBpY2suc2hvd3tkaXNwbGF5OmZsZXg7YW5pbWF0aW9uOmtpbiAuMTZzIGVhc2Utb3V0O30KLmstcG5te2ZvbnQtc2l6ZTozMHB4O2ZvbnQtd2VpZ2h0OjgwMDt9Ci5rLXB0b2RheXtmb250LXNpemU6MTRweDtjb2xvcjojQzlEMUQ5O30KLmstcGtpbmRze2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6MWZyIDFmcjtnYXA6MTBweDt3aWR0aDptaW4oNDYwcHgsMTAwJSk7fQouay1wa3twb3NpdGlvbjpyZWxhdGl2ZTtib3JkZXI6bm9uZTtib3JkZXItcmFkaXVzOjE0cHg7YmFja2dyb3VuZDp2YXIoLS1hayk7Y29sb3I6I2ZmZjtwYWRkaW5nOjE0cHggMTBweDtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Z2FwOjEwcHg7Y3Vyc29yOnBvaW50ZXI7Zm9udC1zaXplOjE4cHg7fQouay1wayBie2ZvbnQtc2l6ZToxOXB4O30gLmstcGsgaXtmb250LXN0eWxlOm5vcm1hbDt9Ci5rLXBrW2Rpc2FibGVkXXtvcGFjaXR5Oi4yNTtjdXJzb3I6ZGVmYXVsdDt9Ci5rLXBrLnN1Z3tib3gtc2hhZG93OjAgMCAwIDNweCAjMEIwRDEwLDAgMCAwIDZweCAjZmZmO30KLmstY2R7cG9zaXRpb246YWJzb2x1dGU7cmlnaHQ6OHB4O3RvcDo1MCU7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoLTUwJSk7d2lkdGg6MjhweDtoZWlnaHQ6MjhweDtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOmNvbmljLWdyYWRpZW50KCNmZmYgY2FsYyh2YXIoLS1wKSozNjBkZWcpLHJnYmEoMjU1LDI1NSwyNTUsLjI1KSAwKTtjb2xvcjp2YXIoLS1hayk7Zm9udC13ZWlnaHQ6ODAwO2ZvbnQtc2l6ZToxNHB4O2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjt9Ci5rLXBub3Rle2ZvbnQtc2l6ZToxNHB4O2NvbG9yOiNFNUU3RUI7fQouay1wY2FuY2Vse2JvcmRlcjoxcHggc29saWQgcmdiYSgyNTUsMjU1LDI1NSwuNCk7YmFja2dyb3VuZDp0cmFuc3BhcmVudDtjb2xvcjojZmZmO2JvcmRlci1yYWRpdXM6OTk5cHg7cGFkZGluZzo2cHggMTZweDtmb250LXNpemU6MTRweDtjdXJzb3I6cG9pbnRlcjt9Ci8qXV0+Ki88L3N0eWxlPgo8L2hlYWQ+Cjxib2R5Pgo8ZGl2IGlkPSJraW9zayI+PC9kaXY+CjxzY3JpcHQ+Ly88IVtDREFUQVsKKGZ1bmN0aW9uKCl7ICJ1c2Ugc3RyaWN0IjsKICB2YXIgUVIgPSAoZnVuY3Rpb24gKCkgewogICAgLy8gLS0tIEdGKDI1NiksIMSRYSB0aOG7qWMgbmd1ecOqbiB0aHXhu7cgMHgxMUQgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tCiAgICB2YXIgRVhQID0gbmV3IEFycmF5KDUxMiksIExPRyA9IG5ldyBBcnJheSgyNTYpOwogICAgKGZ1bmN0aW9uICgpIHsKICAgICAgZm9yICh2YXIgaSA9IDAsIHggPSAxOyBpIDwgMjU1OyBpKyspIHsKICAgICAgICBFWFBbaV0gPSB4OyBMT0dbeF0gPSBpOwogICAgICAgIHggPDw9IDE7IGlmICh4ICYgMHgxMDApIHggXj0gMHgxMUQ7CiAgICAgIH0KICAgICAgZm9yICh2YXIgaiA9IDI1NTsgaiA8IDUxMjsgaisrKSBFWFBbal0gPSBFWFBbaiAtIDI1NV07CiAgICB9KSgpOwogICAgZnVuY3Rpb24gZ211bChhLCBiKSB7IHJldHVybiAoYSA9PT0gMCB8fCBiID09PSAwKSA/IDAgOiBFWFBbTE9HW2FdICsgTE9HW2JdXTsgfQoKICAgIC8vIC0tLSBC4bqjbmcga2jhu5FpIGNobyBt4bupYyBz4butYSBs4buXaSBNIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLQogICAgLy8gW3Phu5EgbcOjIHPhu61hIGzhu5dpIG3hu5dpIGto4buRaSwgc+G7kSBraOG7kWkgbmjDs20gMSwgc+G7kSBtw6MgZOG7ryBsaeG7h3UgbmjDs20gMSwgc+G7kSBraOG7kWkgbmjDs20gMiwgc+G7kSBtw6MgZOG7ryBsaeG7h3UgbmjDs20gMl0KICAgIHZhciBFQ0IgPSB7CiAgICAgIDE6WzEwLDEsMTYsMCwwXSwgMjpbMTYsMSwyOCwwLDBdLCAzOlsyNiwxLDQ0LDAsMF0sICA0OlsxOCwyLDMyLDAsMF0sICA1OlsyNCwyLDQzLDAsMF0sCiAgICAgIDY6WzE2LDQsMjcsMCwwXSwgNzpbMTgsNCwzMSwwLDBdLCA4OlsyMiwyLDM4LDIsMzldLCA5OlsyMiwzLDM2LDIsMzddLCAxMDpbMjYsNCw0MywxLDQ0XQogICAgfTsKICAgIHZhciBBTElHTiA9IHsKICAgICAgMTpbXSwgMjpbNiwxOF0sIDM6WzYsMjJdLCA0Ols2LDI2XSwgNTpbNiwzMF0sCiAgICAgIDY6WzYsMzRdLCA3Ols2LDIyLDM4XSwgODpbNiwyNCw0Ml0sIDk6WzYsMjYsNDZdLCAxMDpbNiwyOCw1MF0KICAgIH07CgogICAgZnVuY3Rpb24gZGF0YUNvZGV3b3Jkcyh2KSB7IHZhciBlID0gRUNCW3ZdOyByZXR1cm4gZVsxXSAqIGVbMl0gKyBlWzNdICogZVs0XTsgfQogICAgZnVuY3Rpb24gYnl0ZUNhcGFjaXR5KHYpIHsgcmV0dXJuIGRhdGFDb2Rld29yZHModikgLSAodiA8IDEwID8gMiA6IDMpOyB9CgogICAgZnVuY3Rpb24gdXRmOChzdHIpIHsKICAgICAgdmFyIG91dCA9IFtdLCBzID0gZW5jb2RlVVJJQ29tcG9uZW50KHN0cik7CiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcy5sZW5ndGg7IGkrKykgewogICAgICAgIGlmIChzW2ldID09PSAnJScpIHsgb3V0LnB1c2gocGFyc2VJbnQocy5zdWJzdHIoaSArIDEsIDIpLCAxNikpOyBpICs9IDI7IH0KICAgICAgICBlbHNlIG91dC5wdXNoKHMuY2hhckNvZGVBdChpKSk7CiAgICAgIH0KICAgICAgcmV0dXJuIG91dDsKICAgIH0KCiAgICBmdW5jdGlvbiBiaXRMZW4oeCkgeyB2YXIgbiA9IDA7IHdoaWxlICh4KSB7IG4rKzsgeCA+Pj49IDE7IH0gcmV0dXJuIG47IH0KCiAgICBmdW5jdGlvbiBmb3JtYXRCaXRzKG1hc2spIHsgICAgICAgICAgLy8gbeG7qWMgTSA9IDBiMDAKICAgICAgdmFyIGRhdGEgPSAoMCA8PCAzKSB8IG1hc2ssIHJlbSA9IGRhdGEgPDwgMTA7CiAgICAgIHdoaWxlIChiaXRMZW4ocmVtKSA+PSAxMSkgcmVtIF49IDB4NTM3IDw8IChiaXRMZW4ocmVtKSAtIDExKTsKICAgICAgcmV0dXJuICgoKGRhdGEgPDwgMTApIHwgcmVtKSBeIDB4NTQxMikgJiAweDdGRkY7CiAgICB9CiAgICBmdW5jdGlvbiB2ZXJzaW9uQml0cyh2KSB7CiAgICAgIHZhciByZW0gPSB2IDw8IDEyOwogICAgICB3aGlsZSAoYml0TGVuKHJlbSkgPj0gMTMpIHJlbSBePSAweDFGMjUgPDwgKGJpdExlbihyZW0pIC0gMTMpOwogICAgICByZXR1cm4gKCh2IDw8IDEyKSB8IHJlbSkgJiAweDNGRkZGOwogICAgfQoKICAgIGZ1bmN0aW9uIHJzR2VuKG4pIHsKICAgICAgdmFyIHBvbHkgPSBbMV07CiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7CiAgICAgICAgdmFyIG5leHQgPSBuZXcgQXJyYXkocG9seS5sZW5ndGggKyAxKS5maWxsKDApOwogICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgcG9seS5sZW5ndGg7IGorKykgewogICAgICAgICAgbmV4dFtqXSBePSBwb2x5W2pdOyAgICAgICAgICAgICAgICAgICAgICAgLy8gcGjhuqduIG5ow6JuIHbhu5tpIHgKICAgICAgICAgIG5leHRbaiArIDFdIF49IGdtdWwocG9seVtqXSwgRVhQW2ldKTsgICAgIC8vIHBo4bqnbiBuaMOibiB24bubaSDOsV5pCiAgICAgICAgfQogICAgICAgIHBvbHkgPSBuZXh0OwogICAgICB9CiAgICAgIHJldHVybiBwb2x5OwogICAgfQogICAgZnVuY3Rpb24gcnNFbmNvZGUoZGF0YSwgbikgewogICAgICB2YXIgZ2VuID0gcnNHZW4obiksIHJlcyA9IG5ldyBBcnJheShuKS5maWxsKDApOwogICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHsKICAgICAgICB2YXIgZiA9IGRhdGFbaV0gXiByZXNbMF07CiAgICAgICAgcmVzLnNoaWZ0KCk7IHJlcy5wdXNoKDApOwogICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbjsgaisrKSByZXNbal0gXj0gZ211bChnZW5baiArIDFdLCBmKTsKICAgICAgfQogICAgICByZXR1cm4gcmVzOwogICAgfQoKICAgIHZhciBNQVNLUyA9IFsKICAgICAgZnVuY3Rpb24gKGksIGopIHsgcmV0dXJuIChpICsgaikgJSAyID09PSAwOyB9LAogICAgICBmdW5jdGlvbiAoaSkgeyByZXR1cm4gaSAlIDIgPT09IDA7IH0sCiAgICAgIGZ1bmN0aW9uIChpLCBqKSB7IHJldHVybiBqICUgMyA9PT0gMDsgfSwKICAgICAgZnVuY3Rpb24gKGksIGopIHsgcmV0dXJuIChpICsgaikgJSAzID09PSAwOyB9LAogICAgICBmdW5jdGlvbiAoaSwgaikgeyByZXR1cm4gKE1hdGguZmxvb3IoaSAvIDIpICsgTWF0aC5mbG9vcihqIC8gMykpICUgMiA9PT0gMDsgfSwKICAgICAgZnVuY3Rpb24gKGksIGopIHsgcmV0dXJuIChpICogaikgJSAyICsgKGkgKiBqKSAlIDMgPT09IDA7IH0sCiAgICAgIGZ1bmN0aW9uIChpLCBqKSB7IHJldHVybiAoKGkgKiBqKSAlIDIgKyAoaSAqIGopICUgMykgJSAyID09PSAwOyB9LAogICAgICBmdW5jdGlvbiAoaSwgaikgeyByZXR1cm4gKChpICsgaikgJSAyICsgKGkgKiBqKSAlIDMpICUgMiA9PT0gMDsgfQogICAgXTsKCiAgICBmdW5jdGlvbiBidWlsZCh0ZXh0KSB7CiAgICAgIHZhciBieXRlcyA9IHV0ZjgodGV4dCksIHYgPSAwOwogICAgICBmb3IgKHZhciB0ID0gMTsgdCA8PSAxMDsgdCsrKSBpZiAoYnl0ZUNhcGFjaXR5KHQpID49IGJ5dGVzLmxlbmd0aCkgeyB2ID0gdDsgYnJlYWs7IH0KICAgICAgaWYgKCF2KSB0aHJvdyBuZXcgRXJyb3IoJ07hu5lpIGR1bmcgcXXDoSBkw6BpIGNobyBtw6MgUVIgKHThu5FpIMSRYSAnICsgYnl0ZUNhcGFjaXR5KDEwKSArICcga8O9IHThu7EpLicpOwoKICAgICAgLy8gLS0tIGNodeG7l2kgYml0IGThu68gbGnhu4d1IC0tLQogICAgICB2YXIgYml0cyA9IFtdOwogICAgICBmdW5jdGlvbiBwdXQodmFsLCBsZW4pIHsgZm9yICh2YXIgayA9IGxlbiAtIDE7IGsgPj0gMDsgay0tKSBiaXRzLnB1c2goKHZhbCA+Pj4gaykgJiAxKTsgfQogICAgICBwdXQoNCwgNCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2jhur8gxJHhu5kgYnl0ZQogICAgICBwdXQoYnl0ZXMubGVuZ3RoLCB2IDwgMTAgPyA4IDogMTYpOwogICAgICBieXRlcy5mb3JFYWNoKGZ1bmN0aW9uIChiKSB7IHB1dChiLCA4KTsgfSk7CgogICAgICB2YXIgdG90YWwgPSBkYXRhQ29kZXdvcmRzKHYpICogODsKICAgICAgZm9yICh2YXIgcCA9IDA7IHAgPCA0ICYmIGJpdHMubGVuZ3RoIDwgdG90YWw7IHArKykgYml0cy5wdXNoKDApOyAgIC8vIGThuqV1IGvhur90IHRow7pjCiAgICAgIHdoaWxlIChiaXRzLmxlbmd0aCAlIDgpIGJpdHMucHVzaCgwKTsKICAgICAgdmFyIHBhZCA9IFsweEVDLCAweDExXSwgcGkgPSAwOwogICAgICB3aGlsZSAoYml0cy5sZW5ndGggPCB0b3RhbCkgeyBwdXQocGFkW3BpKysgJSAyXSwgOCk7IH0KCiAgICAgIHZhciBjdyA9IFtdOwogICAgICBmb3IgKHZhciBiMiA9IDA7IGIyIDwgYml0cy5sZW5ndGg7IGIyICs9IDgpIHsKICAgICAgICB2YXIgbiA9IDA7IGZvciAodmFyIGsyID0gMDsgazIgPCA4OyBrMisrKSBuID0gKG4gPDwgMSkgfCBiaXRzW2IyICsgazJdOwogICAgICAgIGN3LnB1c2gobik7CiAgICAgIH0KCiAgICAgIC8vIC0tLSBjaGlhIGto4buRaSwgc2luaCBtw6Mgc+G7rWEgbOG7l2ksIMSRYW4geGVuIC0tLQogICAgICB2YXIgZSA9IEVDQlt2XSwgYmxvY2tzID0gW10sIGVjcyA9IFtdLCBvZmYgPSAwOwogICAgICBmdW5jdGlvbiB0YWtlKGNvdW50LCBzaXplKSB7CiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7CiAgICAgICAgICB2YXIgZCA9IGN3LnNsaWNlKG9mZiwgb2ZmICsgc2l6ZSk7IG9mZiArPSBzaXplOwogICAgICAgICAgYmxvY2tzLnB1c2goZCk7IGVjcy5wdXNoKHJzRW5jb2RlKGQsIGVbMF0pKTsKICAgICAgICB9CiAgICAgIH0KICAgICAgdGFrZShlWzFdLCBlWzJdKTsgdGFrZShlWzNdLCBlWzRdKTsKCiAgICAgIHZhciBvdXQgPSBbXSwgbWF4RCA9IE1hdGgubWF4KGVbMl0sIGVbNF0gfHwgMCk7CiAgICAgIGZvciAodmFyIGkyID0gMDsgaTIgPCBtYXhEOyBpMisrKQogICAgICAgIGZvciAodmFyIGIzID0gMDsgYjMgPCBibG9ja3MubGVuZ3RoOyBiMysrKQogICAgICAgICAgaWYgKGkyIDwgYmxvY2tzW2IzXS5sZW5ndGgpIG91dC5wdXNoKGJsb2Nrc1tiM11baTJdKTsKICAgICAgZm9yICh2YXIgaTMgPSAwOyBpMyA8IGVbMF07IGkzKyspCiAgICAgICAgZm9yICh2YXIgYjQgPSAwOyBiNCA8IGVjcy5sZW5ndGg7IGI0KyspIG91dC5wdXNoKGVjc1tiNF1baTNdKTsKCiAgICAgIC8vIC0tLSBraHVuZyBtYSB0cuG6rW4gLS0tCiAgICAgIHZhciBzaXplID0gdiAqIDQgKyAxNzsKICAgICAgdmFyIG0gPSBbXSwgcmVzZXJ2ZWQgPSBbXTsKICAgICAgZm9yICh2YXIgciA9IDA7IHIgPCBzaXplOyByKyspIHsKICAgICAgICBtLnB1c2gobmV3IEFycmF5KHNpemUpLmZpbGwoZmFsc2UpKTsKICAgICAgICByZXNlcnZlZC5wdXNoKG5ldyBBcnJheShzaXplKS5maWxsKGZhbHNlKSk7CiAgICAgIH0KICAgICAgZnVuY3Rpb24gc2V0RihyMiwgYzIsIHZhbCkgeyBtW3IyXVtjMl0gPSB2YWw7IHJlc2VydmVkW3IyXVtjMl0gPSB0cnVlOyB9CgogICAgICBmdW5jdGlvbiBmaW5kZXIocjMsIGMzKSB7CiAgICAgICAgZm9yICh2YXIgZHIgPSAtMTsgZHIgPD0gNzsgZHIrKykgZm9yICh2YXIgZGMgPSAtMTsgZGMgPD0gNzsgZGMrKykgewogICAgICAgICAgdmFyIHJyID0gcjMgKyBkciwgY2MgPSBjMyArIGRjOwogICAgICAgICAgaWYgKHJyIDwgMCB8fCBjYyA8IDAgfHwgcnIgPj0gc2l6ZSB8fCBjYyA+PSBzaXplKSBjb250aW51ZTsKICAgICAgICAgIHZhciBpbm5lciA9IE1hdGgubWF4KE1hdGguYWJzKGRyIC0gMyksIE1hdGguYWJzKGRjIC0gMykpOwogICAgICAgICAgc2V0RihyciwgY2MsIGlubmVyICE9PSAyICYmIGlubmVyIDw9IDMpOwogICAgICAgIH0KICAgICAgfQogICAgICBmaW5kZXIoMCwgMCk7IGZpbmRlcigwLCBzaXplIC0gNyk7IGZpbmRlcihzaXplIC0gNywgMCk7CgogICAgICBmb3IgKHZhciBpNCA9IDg7IGk0IDwgc2l6ZSAtIDg7IGk0KyspIHsgICAgICAgICAgICAgICAgIC8vIHbhuqFjaCBuaOG7i3AKICAgICAgICBzZXRGKDYsIGk0LCBpNCAlIDIgPT09IDApOyBzZXRGKGk0LCA2LCBpNCAlIDIgPT09IDApOwogICAgICB9CiAgICAgIHZhciBhYyA9IEFMSUdOW3ZdOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIMO0IGPEg24gY2jhu4luaAogICAgICBhYy5mb3JFYWNoKGZ1bmN0aW9uIChhcikgewogICAgICAgIGFjLmZvckVhY2goZnVuY3Rpb24gKGFjeCkgewogICAgICAgICAgaWYgKChhciA9PT0gNiAmJiBhY3ggPT09IDYpIHx8IChhciA9PT0gNiAmJiBhY3ggPT09IHNpemUgLSA3KSB8fCAoYXIgPT09IHNpemUgLSA3ICYmIGFjeCA9PT0gNikpIHJldHVybjsKICAgICAgICAgIGZvciAodmFyIGRyMiA9IC0yOyBkcjIgPD0gMjsgZHIyKyspIGZvciAodmFyIGRjMiA9IC0yOyBkYzIgPD0gMjsgZGMyKyspCiAgICAgICAgICAgIHNldEYoYXIgKyBkcjIsIGFjeCArIGRjMiwgTWF0aC5tYXgoTWF0aC5hYnMoZHIyKSwgTWF0aC5hYnMoZGMyKSkgIT09IDEpOwogICAgICAgIH0pOwogICAgICB9KTsKICAgICAgc2V0RihzaXplIC0gOCwgOCwgdHJ1ZSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gw7QgdOG7kWkgY+G7kSDEkeG7i25oCgogICAgICBmb3IgKHZhciBpNSA9IDA7IGk1IDwgOTsgaTUrKykgeyAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjaOG7lyBkw6BuaCBjaG8gdGjDtG5nIHRpbiDEkeG7i25oIGThuqFuZwogICAgICAgIGlmIChpNSAhPT0gNikgeyByZXNlcnZlZFs4XVtpNV0gPSB0cnVlOyByZXNlcnZlZFtpNV1bOF0gPSB0cnVlOyB9CiAgICAgIH0KICAgICAgZm9yICh2YXIgaTYgPSAwOyBpNiA8IDg7IGk2KyspIHsgcmVzZXJ2ZWRbOF1bc2l6ZSAtIDEgLSBpNl0gPSB0cnVlOyByZXNlcnZlZFtzaXplIC0gMSAtIGk2XVs4XSA9IHRydWU7IH0KICAgICAgcmVzZXJ2ZWRbOF1bNl0gPSB0cnVlOyByZXNlcnZlZFs2XVs4XSA9IHRydWU7CgogICAgICBpZiAodiA+PSA3KSB7CiAgICAgICAgdmFyIHZiID0gdmVyc2lvbkJpdHModik7CiAgICAgICAgZm9yICh2YXIgaTcgPSAwOyBpNyA8IDE4OyBpNysrKSB7CiAgICAgICAgICB2YXIgYml0ID0gKCh2YiA+Pj4gaTcpICYgMSkgPT09IDE7CiAgICAgICAgICBzZXRGKE1hdGguZmxvb3IoaTcgLyAzKSwgc2l6ZSAtIDExICsgKGk3ICUgMyksIGJpdCk7CiAgICAgICAgICBzZXRGKHNpemUgLSAxMSArIChpNyAlIDMpLCBNYXRoLmZsb29yKGk3IC8gMyksIGJpdCk7CiAgICAgICAgfQogICAgICB9CgogICAgICAvLyAtLS0gcuG6o2kgZOG7ryBsaeG7h3UgdGhlbyDEkcaw4budbmcgemlnemFnIC0tLQogICAgICB2YXIgZGkgPSAwLCBkYml0ID0gMCwgdXB3YXJkID0gdHJ1ZTsKICAgICAgZm9yICh2YXIgY29sID0gc2l6ZSAtIDE7IGNvbCA+PSAwOyBjb2wgLT0gMikgewogICAgICAgIGlmIChjb2wgPT09IDYpIGNvbC0tOwogICAgICAgIGZvciAodmFyIHJvd1N0ZXAgPSAwOyByb3dTdGVwIDwgc2l6ZTsgcm93U3RlcCsrKSB7CiAgICAgICAgICB2YXIgcm93ID0gdXB3YXJkID8gc2l6ZSAtIDEgLSByb3dTdGVwIDogcm93U3RlcDsKICAgICAgICAgIGZvciAodmFyIGNPZmYgPSAwOyBjT2ZmIDwgMjsgY09mZisrKSB7CiAgICAgICAgICAgIHZhciBjNCA9IGNvbCAtIGNPZmY7CiAgICAgICAgICAgIGlmIChyZXNlcnZlZFtyb3ddW2M0XSkgY29udGludWU7CiAgICAgICAgICAgIHZhciB2YWwgPSBmYWxzZTsKICAgICAgICAgICAgaWYgKGRpIDwgb3V0Lmxlbmd0aCkgdmFsID0gKChvdXRbZGldID4+PiAoNyAtIGRiaXQpKSAmIDEpID09PSAxOwogICAgICAgICAgICBtW3Jvd11bYzRdID0gdmFsOwogICAgICAgICAgICBkYml0Kys7IGlmIChkYml0ID09PSA4KSB7IGRiaXQgPSAwOyBkaSsrOyB9CiAgICAgICAgICB9CiAgICAgICAgfQogICAgICAgIHVwd2FyZCA9ICF1cHdhcmQ7CiAgICAgIH0KCiAgICAgIC8vIC0tLSBjaOG7jW4gbeG6t3QgbuG6oSB04buRdCBuaOG6pXQgLS0tCiAgICAgIHZhciBiZXN0ID0gbnVsbCwgYmVzdFNjb3JlID0gSW5maW5pdHk7CiAgICAgIGZvciAodmFyIG1rID0gMDsgbWsgPCA4OyBtaysrKSB7CiAgICAgICAgdmFyIGNhbmQgPSBtLm1hcChmdW5jdGlvbiAocjUpIHsgcmV0dXJuIHI1LnNsaWNlKCk7IH0pOwogICAgICAgIGZvciAodmFyIHI2ID0gMDsgcjYgPCBzaXplOyByNisrKSBmb3IgKHZhciBjNSA9IDA7IGM1IDwgc2l6ZTsgYzUrKykKICAgICAgICAgIGlmICghcmVzZXJ2ZWRbcjZdW2M1XSAmJiBNQVNLU1tta10ocjYsIGM1KSkgY2FuZFtyNl1bYzVdID0gIWNhbmRbcjZdW2M1XTsKCiAgICAgICAgdmFyIGZiID0gZm9ybWF0Qml0cyhtayk7CiAgICAgICAgZm9yICh2YXIgaTggPSAwOyBpOCA8IDE1OyBpOCsrKSB7CiAgICAgICAgICB2YXIgZmJpdCA9ICgoZmIgPj4+IGk4KSAmIDEpID09PSAxOwogICAgICAgICAgLy8gQuG6o24gMTogY2jhuqF5IGThu41jIGPhu5l0IDggcuG7k2kgcXXhurd0IHNhbmcgaMOgbmcgOCBxdWFuaCDDtCDEkeG7i25oIHbhu4sgZ8OzYyB0csOqbiB0csOhaS4KICAgICAgICAgIGlmIChpOCA8IDYpIGNhbmRbaThdWzhdID0gZmJpdDsKICAgICAgICAgIGVsc2UgaWYgKGk4ID09PSA2KSBjYW5kWzddWzhdID0gZmJpdDsKICAgICAgICAgIGVsc2UgaWYgKGk4ID09PSA3KSBjYW5kWzhdWzhdID0gZmJpdDsKICAgICAgICAgIGVsc2UgaWYgKGk4ID09PSA4KSBjYW5kWzhdWzddID0gZmJpdDsKICAgICAgICAgIGVsc2UgY2FuZFs4XVsxNCAtIGk4XSA9IGZiaXQ7CiAgICAgICAgICAvLyBC4bqjbiAyOiBow6BuZyA4IHBow61hIHBo4bqjaSwgcuG7k2kgY+G7mXQgOCBwaMOtYSBkxrDhu5tpLgogICAgICAgICAgaWYgKGk4IDwgOCkgY2FuZFs4XVtzaXplIC0gMSAtIGk4XSA9IGZiaXQ7CiAgICAgICAgICBlbHNlIGNhbmRbc2l6ZSAtIDE1ICsgaThdWzhdID0gZmJpdDsKICAgICAgICB9CiAgICAgICAgY2FuZFtzaXplIC0gOF1bOF0gPSB0cnVlOwoKICAgICAgICB2YXIgc2MgPSBwZW5hbHR5KGNhbmQsIHNpemUpOwogICAgICAgIGlmIChzYyA8IGJlc3RTY29yZSkgeyBiZXN0U2NvcmUgPSBzYzsgYmVzdCA9IGNhbmQ7IH0KICAgICAgfQogICAgICByZXR1cm4gYmVzdDsKICAgIH0KCiAgICBmdW5jdGlvbiBwZW5hbHR5KG0sIHNpemUpIHsKICAgICAgdmFyIHNjb3JlID0gMCwgaSwgaiwgcnVuLCBkYXJrID0gMDsKICAgICAgZm9yIChpID0gMDsgaSA8IHNpemU7IGkrKykgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHF1eSB04bqvYyAxOiBkw6N5IGPDuW5nIG3DoHUKICAgICAgICBydW4gPSAxOwogICAgICAgIGZvciAoaiA9IDE7IGogPCBzaXplOyBqKyspIHsKICAgICAgICAgIGlmIChtW2ldW2pdID09PSBtW2ldW2ogLSAxXSkgeyBydW4rKzsgaWYgKHJ1biA9PT0gNSkgc2NvcmUgKz0gMzsgZWxzZSBpZiAocnVuID4gNSkgc2NvcmUrKzsgfQogICAgICAgICAgZWxzZSBydW4gPSAxOwogICAgICAgIH0KICAgICAgICBydW4gPSAxOwogICAgICAgIGZvciAoaiA9IDE7IGogPCBzaXplOyBqKyspIHsKICAgICAgICAgIGlmIChtW2pdW2ldID09PSBtW2ogLSAxXVtpXSkgeyBydW4rKzsgaWYgKHJ1biA9PT0gNSkgc2NvcmUgKz0gMzsgZWxzZSBpZiAocnVuID4gNSkgc2NvcmUrKzsgfQogICAgICAgICAgZWxzZSBydW4gPSAxOwogICAgICAgIH0KICAgICAgfQogICAgICBmb3IgKGkgPSAwOyBpIDwgc2l6ZSAtIDE7IGkrKykgZm9yIChqID0gMDsgaiA8IHNpemUgLSAxOyBqKyspIHsgICAvLyBxdXkgdOG6r2MgMjoga2jhu5FpIDJ4MgogICAgICAgIHZhciBhID0gbVtpXVtqXTsKICAgICAgICBpZiAoYSA9PT0gbVtpXVtqICsgMV0gJiYgYSA9PT0gbVtpICsgMV1bal0gJiYgYSA9PT0gbVtpICsgMV1baiArIDFdKSBzY29yZSArPSAzOwogICAgICB9CiAgICAgIHZhciBwYXQxID0gW3RydWUsIGZhbHNlLCB0cnVlLCB0cnVlLCB0cnVlLCBmYWxzZSwgdHJ1ZSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgZmFsc2VdOwogICAgICB2YXIgcGF0MiA9IFtmYWxzZSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgdHJ1ZSwgZmFsc2UsIHRydWUsIHRydWUsIHRydWUsIGZhbHNlLCB0cnVlXTsKICAgICAgZnVuY3Rpb24gbWF0Y2goZ2V0LCBuKSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBxdXkgdOG6r2MgMzogaMOsbmggZ2nhu5FuZyB24bqhY2ggxJHhu4tuaCB24buLCiAgICAgICAgZm9yICh2YXIgcyA9IDA7IHMgKyAxMSA8PSBuOyBzKyspIHsKICAgICAgICAgIHZhciBvazEgPSB0cnVlLCBvazIgPSB0cnVlOwogICAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCAxMTsgaysrKSB7CiAgICAgICAgICAgIGlmIChnZXQocyArIGspICE9PSBwYXQxW2tdKSBvazEgPSBmYWxzZTsKICAgICAgICAgICAgaWYgKGdldChzICsgaykgIT09IHBhdDJba10pIG9rMiA9IGZhbHNlOwogICAgICAgICAgfQogICAgICAgICAgaWYgKG9rMSkgc2NvcmUgKz0gNDA7CiAgICAgICAgICBpZiAob2syKSBzY29yZSArPSA0MDsKICAgICAgICB9CiAgICAgIH0KICAgICAgZm9yIChpID0gMDsgaSA8IHNpemU7IGkrKykgewogICAgICAgIChmdW5jdGlvbiAocikgeyBtYXRjaChmdW5jdGlvbiAoaykgeyByZXR1cm4gbVtyXVtrXTsgfSwgc2l6ZSk7IH0pKGkpOwogICAgICAgIChmdW5jdGlvbiAoYykgeyBtYXRjaChmdW5jdGlvbiAoaykgeyByZXR1cm4gbVtrXVtjXTsgfSwgc2l6ZSk7IH0pKGkpOwogICAgICB9CiAgICAgIGZvciAoaSA9IDA7IGkgPCBzaXplOyBpKyspIGZvciAoaiA9IDA7IGogPCBzaXplOyBqKyspIGlmIChtW2ldW2pdKSBkYXJrKys7CiAgICAgIHZhciBwY3QgPSBkYXJrICogMTAwIC8gKHNpemUgKiBzaXplKTsgICAgICAgICAgICAgICAgICAgICAgLy8gcXV5IHThuq9jIDQ6IHThu4kgbOG7hyDEkWVuL3Ry4bqvbmcKICAgICAgc2NvcmUgKz0gTWF0aC5mbG9vcihNYXRoLmFicyhwY3QgLSA1MCkgLyA1KSAqIDEwOwogICAgICByZXR1cm4gc2NvcmU7CiAgICB9CgogICAgLyoqIFRy4bqjIHbhu4EgY2h14buXaSBTVkcgdnXDtG5nLCBu4buBbiB0cuG6r25nLCB2aeG7gW4gdHLhuq9uZyA0IMO0IHRoZW8gY2h14bqpbi4gKi8KICAgIGZ1bmN0aW9uIHN2Zyh0ZXh0LCBweCwgb3B0cykgewogICAgICBvcHRzID0gb3B0cyB8fCB7fTsKICAgICAgdmFyIG0gPSBidWlsZCh0ZXh0KSwgbiA9IG0ubGVuZ3RoLCBxID0gKG9wdHMucXVpZXQgPT09IHVuZGVmaW5lZCkgPyA0IDogb3B0cy5xdWlldDsKICAgICAgdmFyIHRvdGFsID0gbiArIHEgKiAyLCBkID0gJyc7CiAgICAgIGZvciAodmFyIHIgPSAwOyByIDwgbjsgcisrKSB7CiAgICAgICAgdmFyIGMgPSAwOwogICAgICAgIHdoaWxlIChjIDwgbikgewogICAgICAgICAgaWYgKCFtW3JdW2NdKSB7IGMrKzsgY29udGludWU7IH0KICAgICAgICAgIHZhciBzdGFydCA9IGM7CiAgICAgICAgICB3aGlsZSAoYyA8IG4gJiYgbVtyXVtjXSkgYysrOwogICAgICAgICAgZCArPSAnTScgKyAoc3RhcnQgKyBxKSArICcgJyArIChyICsgcSkgKyAnaCcgKyAoYyAtIHN0YXJ0KSArICd2MWgtJyArIChjIC0gc3RhcnQpICsgJ3onOwogICAgICAgIH0KICAgICAgfQogICAgICByZXR1cm4gJzxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iJyArIHB4ICsgJyIgaGVpZ2h0PSInICsgcHggKwogICAgICAgICciIHZpZXdCb3g9IjAgMCAnICsgdG90YWwgKyAnICcgKyB0b3RhbCArICciIHNoYXBlLXJlbmRlcmluZz0iY3Jpc3BFZGdlcyIgcm9sZT0iaW1nIj4nICsKICAgICAgICAnPHJlY3Qgd2lkdGg9IicgKyB0b3RhbCArICciIGhlaWdodD0iJyArIHRvdGFsICsgJyIgZmlsbD0iI2ZmZiIvPicgKwogICAgICAgICc8cGF0aCBkPSInICsgZCArICciIGZpbGw9IicgKyAob3B0cy5jb2xvciB8fCAnIzAwMCcpICsgJyIvPjwvc3ZnPic7CiAgICB9CgogICAgcmV0dXJuIHsgYnVpbGQ6IGJ1aWxkLCBzdmc6IHN2ZywgY2FwYWNpdHk6IGJ5dGVDYXBhY2l0eSwKICAgICAgICAgICAgIF90OiB7IEVYUDogRVhQLCBMT0c6IExPRywgRUNCOiBFQ0IsIEFMSUdOOiBBTElHTiwgTUFTS1M6IE1BU0tTLCBmb3JtYXRCaXRzOiBmb3JtYXRCaXRzIH0gfTsgICAvLyBjaG8gYuG7mSDEkeG7jWMgUVJECiAgfSkoKTsKCiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQogIC8vIMSQ4buMQyBNw4MgUVIgVOG7qiDhuqJOSCAodi4xMSDigJQgbcOheSBxdcOpdCDEkWnhu4NtIGRhbmgpLiBU4buxIHZp4bq/dCwga2jDtG5nIGPhuqduIHRoxrAgdmnhu4duIG5nb8OgaToKICAvLyAgIOG6o25oIOKGkiB4w6FtIOKGkiBuaOG7iyBwaMOibiBob8OhIHRoZW8gdsO5bmcgKGNo4buLdSDEkcaw4bujYyBiw7NuZyAvIG3DoG4gaMOsbmggbG/DoSkg4oaSIHTDrG0gMyDDtCDEkeG7i25oIHbhu4sgKHThu4kgbOG7hyAxOjE6MzoxOjEpCiAgLy8gICDihpIgxrDhu5tjIHPhu5Egw7QgKyB0w6xtIMO0IGPEg24gY2jhu4luaCDihpIgYmnhur9uIMSR4buVaSBwaOG7kWkgY+G6o25oIOKGkiBs4bqleSBt4bqrdSBtYSB0cuG6rW4g4oaSIMSR4buNYyDEkeG7i25oIGThuqFuZyAobeG6t3QgbuG6oSkKICAvLyAgIOKGkiDEkeG7jWMgdOG7qyBtw6MgdGhlbyDEkcaw4budbmcgemlnemFnIOKGkiBz4butYSBs4buXaSBSZWVk4oCTU29sb21vbiDihpIgZ2nhuqNpIGNodeG7l2kgYnl0ZSAoVVRGLTgpLgogIC8vIEjhu5cgdHLhu6MgxJHDum5nIGxv4bqhaSBtw6MgYXBwIHThu7EgdOG6oW8gKG3hu6ljIHPhu61hIGzhu5dpIE0sIHBoacOqbiBi4bqjbiAx4oCTMTApIOKAlCDEkeG7pyBjaG8gbcOjIMSRaeG7g20gZGFuaC4KICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09CiAgdmFyIFFSRCA9IChmdW5jdGlvbiAoVCkgewogICAgdmFyIEVYUCA9IFQuRVhQLCBMT0cgPSBULkxPRywgRUNCID0gVC5FQ0IsIEFMSUdOID0gVC5BTElHTiwgTUFTS1MgPSBULk1BU0tTOwogICAgZnVuY3Rpb24gZ211bChhLCBiKSB7IHJldHVybiAoYSA9PT0gMCB8fCBiID09PSAwKSA/IDAgOiBFWFBbTE9HW2FdICsgTE9HW2JdXTsgfQogICAgZnVuY3Rpb24gZ2RpdihhLCBiKSB7IGlmIChiID09PSAwKSB0aHJvdyBuZXcgRXJyb3IoImRpdjAiKTsgcmV0dXJuIGEgPT09IDAgPyAwIDogRVhQWyhMT0dbYV0gKyAyNTUgLSBMT0dbYl0pICUgMjU1XTsgfQogICAgZnVuY3Rpb24gZ3Bvdyh4LCBwKSB7IHJldHVybiBFWFBbKCgoTE9HW3hdICogcCkgJSAyNTUpICsgMjU1KSAlIDI1NV07IH0KICAgIGZ1bmN0aW9uIGdpbnYoeCkgeyByZXR1cm4gRVhQWzI1NSAtIExPR1t4XV07IH0KCiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tIFJlZWTigJNTb2xvbW9uIChn4buRYyDOsV4wIOKApiDOsV4obuKIkjEpLCBnaeG7kW5nIGLhu5kgdOG6oW8gbcOjKSAtLS0tLS0tLS0tLS0tLS0tCiAgICBmdW5jdGlvbiBwU2NhbGUocCwgeCkgeyByZXR1cm4gcC5tYXAoZnVuY3Rpb24gKGMpIHsgcmV0dXJuIGdtdWwoYywgeCk7IH0pOyB9CiAgICBmdW5jdGlvbiBwQWRkKHAsIHEpIHsKICAgICAgdmFyIG4gPSBNYXRoLm1heChwLmxlbmd0aCwgcS5sZW5ndGgpLCByID0gbmV3IEFycmF5KG4pLmZpbGwoMCksIGk7CiAgICAgIGZvciAoaSA9IDA7IGkgPCBwLmxlbmd0aDsgaSsrKSByW2kgKyBuIC0gcC5sZW5ndGhdID0gcFtpXTsKICAgICAgZm9yIChpID0gMDsgaSA8IHEubGVuZ3RoOyBpKyspIHJbaSArIG4gLSBxLmxlbmd0aF0gXj0gcVtpXTsKICAgICAgcmV0dXJuIHI7CiAgICB9CiAgICBmdW5jdGlvbiBwTXVsKHAsIHEpIHsKICAgICAgdmFyIHIgPSBuZXcgQXJyYXkocC5sZW5ndGggKyBxLmxlbmd0aCAtIDEpLmZpbGwoMCk7CiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgcS5sZW5ndGg7IGorKykgZm9yICh2YXIgaSA9IDA7IGkgPCBwLmxlbmd0aDsgaSsrKSByW2kgKyBqXSBePSBnbXVsKHBbaV0sIHFbal0pOwogICAgICByZXR1cm4gcjsKICAgIH0KICAgIGZ1bmN0aW9uIHBFdmFsKHAsIHgpIHsgdmFyIHkgPSBwWzBdOyBmb3IgKHZhciBpID0gMTsgaSA8IHAubGVuZ3RoOyBpKyspIHkgPSBnbXVsKHksIHgpIF4gcFtpXTsgcmV0dXJuIHk7IH0KICAgIGZ1bmN0aW9uIHBEaXZSZW0oZGl2aWRlbmQsIGRpdmlzb3IpIHsKICAgICAgdmFyIG91dCA9IGRpdmlkZW5kLnNsaWNlKCk7CiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGl2aWRlbmQubGVuZ3RoIC0gKGRpdmlzb3IubGVuZ3RoIC0gMSk7IGkrKykgewogICAgICAgIHZhciBjb2VmID0gb3V0W2ldOwogICAgICAgIGlmIChjb2VmICE9PSAwKSBmb3IgKHZhciBqID0gMTsgaiA8IGRpdmlzb3IubGVuZ3RoOyBqKyspIGlmIChkaXZpc29yW2pdICE9PSAwKSBvdXRbaSArIGpdIF49IGdtdWwoZGl2aXNvcltqXSwgY29lZik7CiAgICAgIH0KICAgICAgcmV0dXJuIG91dC5zbGljZShvdXQubGVuZ3RoIC0gKGRpdmlzb3IubGVuZ3RoIC0gMSkpOwogICAgfQogICAgZnVuY3Rpb24gcnNTeW4obXNnLCBuKSB7IHZhciBzID0gWzBdOyBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykgcy5wdXNoKHBFdmFsKG1zZywgZ3BvdygyLCBpKSkpOyByZXR1cm4gczsgfQogICAgLyoqIFPhu61hIGzhu5dpIG3hu5l0IGto4buRaSAoZOG7ryBsaeG7h3UgKyBtw6Mgc+G7rWEgbOG7l2kpLiBUcuG6oyBt4bqjbmcgZOG7ryBsaeG7h3UgxJHDoyBz4butYSwgaG/hurdjIG51bGwgbuG6v3UgaOG7j25nIHF1w6Egc+G7qWMgc+G7rWEuICovCiAgICBmdW5jdGlvbiByc0NvcnJlY3QobXNnLCBuKSB7CiAgICAgIHZhciBzeW4gPSByc1N5bihtc2csIG4pLCBhbnkgPSBmYWxzZSwgaSwgajsKICAgICAgZm9yIChpID0gMTsgaSA8IHN5bi5sZW5ndGg7IGkrKykgaWYgKHN5bltpXSkgeyBhbnkgPSB0cnVlOyBicmVhazsgfQogICAgICBpZiAoIWFueSkgcmV0dXJuIG1zZy5zbGljZSgwLCBtc2cubGVuZ3RoIC0gbik7CiAgICAgIC8vIEJlcmxla2FtcOKAk01hc3NleQogICAgICB2YXIgbG9jID0gWzFdLCBvbGQgPSBbMV07CiAgICAgIGZvciAoaSA9IDA7IGkgPCBuOyBpKyspIHsKICAgICAgICB2YXIgSyA9IGkgKyAxLCBkZWx0YSA9IHN5bltLXTsKICAgICAgICBmb3IgKGogPSAxOyBqIDwgbG9jLmxlbmd0aDsgaisrKSBkZWx0YSBePSBnbXVsKGxvY1tsb2MubGVuZ3RoIC0gMSAtIGpdLCBzeW5bSyAtIGpdKTsKICAgICAgICBvbGQgPSBvbGQuY29uY2F0KFswXSk7CiAgICAgICAgaWYgKGRlbHRhICE9PSAwKSB7CiAgICAgICAgICBpZiAob2xkLmxlbmd0aCA+IGxvYy5sZW5ndGgpIHsgdmFyIG5sID0gcFNjYWxlKG9sZCwgZGVsdGEpOyBvbGQgPSBwU2NhbGUobG9jLCBnaW52KGRlbHRhKSk7IGxvYyA9IG5sOyB9CiAgICAgICAgICBsb2MgPSBwQWRkKGxvYywgcFNjYWxlKG9sZCwgZGVsdGEpKTsKICAgICAgICB9CiAgICAgIH0KICAgICAgd2hpbGUgKGxvYy5sZW5ndGggJiYgbG9jWzBdID09PSAwKSBsb2Muc2hpZnQoKTsKICAgICAgdmFyIGVycnMgPSBsb2MubGVuZ3RoIC0gMTsKICAgICAgaWYgKGVycnMgKiAyID4gbikgcmV0dXJuIG51bGw7CiAgICAgIC8vIENoaWVuCiAgICAgIHZhciByZXYgPSBsb2Muc2xpY2UoKS5yZXZlcnNlKCksIHBvcyA9IFtdOwogICAgICBmb3IgKGkgPSAwOyBpIDwgbXNnLmxlbmd0aDsgaSsrKSBpZiAocEV2YWwocmV2LCBncG93KDIsIGkpKSA9PT0gMCkgcG9zLnB1c2gobXNnLmxlbmd0aCAtIDEgLSBpKTsKICAgICAgaWYgKHBvcy5sZW5ndGggIT09IGVycnMpIHJldHVybiBudWxsOwogICAgICAvLyBGb3JuZXkKICAgICAgdmFyIGNvZWZQb3MgPSBwb3MubWFwKGZ1bmN0aW9uIChwKSB7IHJldHVybiBtc2cubGVuZ3RoIC0gMSAtIHA7IH0pOwogICAgICB2YXIgZWxvYyA9IFsxXTsKICAgICAgY29lZlBvcy5mb3JFYWNoKGZ1bmN0aW9uIChjcCkgeyBlbG9jID0gcE11bChlbG9jLCBwQWRkKFsxXSwgW2dwb3coMiwgY3ApLCAwXSkpOyB9KTsKICAgICAgdmFyIHN5blIgPSBzeW4uc2xpY2UoKS5yZXZlcnNlKCk7CiAgICAgIHZhciBldiA9IHBEaXZSZW0ocE11bChzeW5SLCBlbG9jKSwgWzFdLmNvbmNhdChuZXcgQXJyYXkoZWxvYy5sZW5ndGgpLmZpbGwoMCkpKS5yZXZlcnNlKCk7CiAgICAgIHZhciBYID0gY29lZlBvcy5tYXAoZnVuY3Rpb24gKGNwKSB7IHJldHVybiBncG93KDIsIGNwKTsgfSk7CiAgICAgIHZhciBvdXQgPSBtc2cuc2xpY2UoKTsKICAgICAgZm9yIChpID0gMDsgaSA8IFgubGVuZ3RoOyBpKyspIHsKICAgICAgICB2YXIgeGkgPSBnaW52KFhbaV0pLCBscCA9IDE7CiAgICAgICAgZm9yIChqID0gMDsgaiA8IFgubGVuZ3RoOyBqKyspIGlmIChqICE9PSBpKSBscCA9IGdtdWwobHAsIDEgXiBnbXVsKHhpLCBYW2pdKSk7CiAgICAgICAgaWYgKGxwID09PSAwKSByZXR1cm4gbnVsbDsKICAgICAgICB2YXIgeSA9IGdtdWwoWFtpXSwgcEV2YWwoZXYuc2xpY2UoKS5yZXZlcnNlKCksIHhpKSk7CiAgICAgICAgb3V0W3Bvc1tpXV0gXj0gZ2Rpdih5LCBscCk7CiAgICAgIH0KICAgICAgc3luID0gcnNTeW4ob3V0LCBuKTsKICAgICAgZm9yIChpID0gMTsgaSA8IHN5bi5sZW5ndGg7IGkrKykgaWYgKHN5bltpXSkgcmV0dXJuIG51bGw7CiAgICAgIHJldHVybiBvdXQuc2xpY2UoMCwgb3V0Lmxlbmd0aCAtIG4pOwogICAgfQoKICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0g4bqibmgg4oaSIHjDoW0g4oaSIG5o4buLIHBow6JuIC0tLS0tLS0tLS0tLS0tLS0KICAgIC8qKiBpbWc6IHtkYXRhOiBSR0JBLCB3aWR0aCwgaGVpZ2h0fSAoSW1hZ2VEYXRhKSBob+G6t2Mge2dyYXk6IFVpbnQ4QXJyYXksIHdpZHRoLCBoZWlnaHR9LiBUaHUgbmjhu48gY8OybiDiiaQgbWF4RGltLiAqLwogICAgZnVuY3Rpb24gdG9HcmF5KGltZywgbWF4RGltKSB7CiAgICAgIHZhciB3ID0gaW1nLndpZHRoLCBoID0gaW1nLmhlaWdodCwgZiA9IE1hdGgubWF4KDEsIE1hdGguY2VpbChNYXRoLm1heCh3LCBoKSAvIG1heERpbSkpOwogICAgICB2YXIgVyA9IE1hdGguZmxvb3IodyAvIGYpLCBIID0gTWF0aC5mbG9vcihoIC8gZiksIGcgPSBuZXcgVWludDhBcnJheShXICogSCksIHNyYyA9IGltZy5kYXRhLCBncyA9IGltZy5ncmF5OwogICAgICBmb3IgKHZhciB5ID0gMDsgeSA8IEg7IHkrKykgZm9yICh2YXIgeCA9IDA7IHggPCBXOyB4KyspIHsKICAgICAgICB2YXIgcyA9IDA7CiAgICAgICAgZm9yICh2YXIgZHkgPSAwOyBkeSA8IGY7IGR5KyspIGZvciAodmFyIGR4ID0gMDsgZHggPCBmOyBkeCsrKSB7CiAgICAgICAgICB2YXIgcCA9ICh5ICogZiArIGR5KSAqIHcgKyAoeCAqIGYgKyBkeCk7CiAgICAgICAgICBzICs9IGdzID8gZ3NbcF0gOiAoc3JjW3AgKiA0XSAqIDc3ICsgc3JjW3AgKiA0ICsgMV0gKiAxNTAgKyBzcmNbcCAqIDQgKyAyXSAqIDI5KSA+PiA4OwogICAgICAgIH0KICAgICAgICBnW3kgKiBXICsgeF0gPSBzIC8gKGYgKiBmKTsKICAgICAgfQogICAgICByZXR1cm4geyBnOiBnLCB3OiBXLCBoOiBIIH07CiAgICB9CiAgICAvKiogTmfGsOG7oW5nIHRoZW8gdsO5bmcgOMOXOCAoa2nhu4N1IEh5YnJpZEJpbmFyaXplcik6IGLDs25nIMSR4buVIC8gbG/DoSBt4buZdCBnw7NjIHbhuqtuIHTDoWNoIMSRxrDhu6NjIMSRZW7igJN0cuG6r25nLiAqLwogICAgZnVuY3Rpb24gYmluSHlicmlkKEcpIHsKICAgICAgdmFyIGcgPSBHLmcsIHcgPSBHLncsIGggPSBHLmgsIEIgPSA4LCBidyA9IE1hdGguY2VpbCh3IC8gQiksIGJoID0gTWF0aC5jZWlsKGggLyBCKTsKICAgICAgdmFyIGF2ZyA9IG5ldyBGbG9hdDMyQXJyYXkoYncgKiBiaCksIG91dCA9IG5ldyBVaW50OEFycmF5KHcgKiBoKSwgYngsIGJ5LCB4LCB5OwogICAgICBmb3IgKGJ5ID0gMDsgYnkgPCBiaDsgYnkrKykgZm9yIChieCA9IDA7IGJ4IDwgYnc7IGJ4KyspIHsKICAgICAgICB2YXIgbW4gPSAyNTUsIG14ID0gMCwgc3VtID0gMCwgY250ID0gMDsKICAgICAgICBmb3IgKHkgPSBieSAqIEI7IHkgPCBNYXRoLm1pbihoLCBieSAqIEIgKyBCKTsgeSsrKSBmb3IgKHggPSBieCAqIEI7IHggPCBNYXRoLm1pbih3LCBieCAqIEIgKyBCKTsgeCsrKSB7CiAgICAgICAgICB2YXIgdiA9IGdbeSAqIHcgKyB4XTsgc3VtICs9IHY7IGNudCsrOyBpZiAodiA8IG1uKSBtbiA9IHY7IGlmICh2ID4gbXgpIG14ID0gdjsKICAgICAgICB9CiAgICAgICAgdmFyIGEgPSBzdW0gLyBjbnQ7CiAgICAgICAgaWYgKG14IC0gbW4gPD0gMjQpIHsKICAgICAgICAgIGEgPSBtbiAvIDI7CiAgICAgICAgICBpZiAoYnkgPiAwICYmIGJ4ID4gMCkgewogICAgICAgICAgICB2YXIgbmIgPSAoYXZnWyhieSAtIDEpICogYncgKyBieF0gKyAyICogYXZnW2J5ICogYncgKyBieCAtIDFdICsgYXZnWyhieSAtIDEpICogYncgKyBieCAtIDFdKSAvIDQ7CiAgICAgICAgICAgIGlmIChtbiA8IG5iKSBhID0gbmI7CiAgICAgICAgICB9CiAgICAgICAgfQogICAgICAgIGF2Z1tieSAqIGJ3ICsgYnhdID0gYTsKICAgICAgfQogICAgICBmb3IgKGJ5ID0gMDsgYnkgPCBiaDsgYnkrKykgZm9yIChieCA9IDA7IGJ4IDwgYnc7IGJ4KyspIHsKICAgICAgICB2YXIgczIgPSAwLCBjMiA9IDA7CiAgICAgICAgZm9yICh2YXIgeXkgPSBNYXRoLm1heCgwLCBieSAtIDIpOyB5eSA8PSBNYXRoLm1pbihiaCAtIDEsIGJ5ICsgMik7IHl5KyspCiAgICAgICAgICBmb3IgKHZhciB4eCA9IE1hdGgubWF4KDAsIGJ4IC0gMik7IHh4IDw9IE1hdGgubWluKGJ3IC0gMSwgYnggKyAyKTsgeHgrKykgeyBzMiArPSBhdmdbeXkgKiBidyArIHh4XTsgYzIrKzsgfQogICAgICAgIHZhciB0aCA9IHMyIC8gYzI7CiAgICAgICAgZm9yICh5ID0gYnkgKiBCOyB5IDwgTWF0aC5taW4oaCwgYnkgKiBCICsgQik7IHkrKykgZm9yICh4ID0gYnggKiBCOyB4IDwgTWF0aC5taW4odywgYnggKiBCICsgQik7IHgrKykKICAgICAgICAgIG91dFt5ICogdyArIHhdID0gZ1t5ICogdyArIHhdIDw9IHRoID8gMSA6IDA7CiAgICAgIH0KICAgICAgcmV0dXJuIHsgYjogb3V0LCB3OiB3LCBoOiBoIH07CiAgICB9CiAgICAvKiogTmfGsOG7oW5nIGNodW5nIE90c3Ug4oCUIGPDoWNoIGThu7EgcGjDsm5nIGtoaSDhuqNuaCByw7UsIHTGsMahbmcgcGjhuqNuIMSR4buBdS4gKi8KICAgIGZ1bmN0aW9uIGJpbk90c3UoRykgewogICAgICB2YXIgZyA9IEcuZywgaGlzdCA9IG5ldyBBcnJheSgyNTYpLmZpbGwoMCksIGksIG4gPSBnLmxlbmd0aDsKICAgICAgZm9yIChpID0gMDsgaSA8IG47IGkrKykgaGlzdFtnW2ldXSsrOwogICAgICB2YXIgc3VtQWxsID0gMDsgZm9yIChpID0gMDsgaSA8IDI1NjsgaSsrKSBzdW1BbGwgKz0gaSAqIGhpc3RbaV07CiAgICAgIHZhciB3QiA9IDAsIHNCID0gMCwgYmVzdCA9IDAsIHRoID0gMTI4OwogICAgICBmb3IgKGkgPSAwOyBpIDwgMjU2OyBpKyspIHsKICAgICAgICB3QiArPSBoaXN0W2ldOyBpZiAoIXdCKSBjb250aW51ZTsgdmFyIHdGID0gbiAtIHdCOyBpZiAoIXdGKSBicmVhazsKICAgICAgICBzQiArPSBpICogaGlzdFtpXTsgdmFyIG1CID0gc0IgLyB3QiwgbUYgPSAoc3VtQWxsIC0gc0IpIC8gd0YsIGIgPSB3QiAqIHdGICogKG1CIC0gbUYpICogKG1CIC0gbUYpOwogICAgICAgIGlmIChiID4gYmVzdCkgeyBiZXN0ID0gYjsgdGggPSBpOyB9CiAgICAgIH0KICAgICAgdmFyIG91dCA9IG5ldyBVaW50OEFycmF5KG4pOyBmb3IgKGkgPSAwOyBpIDwgbjsgaSsrKSBvdXRbaV0gPSBnW2ldIDw9IHRoID8gMSA6IDA7CiAgICAgIHJldHVybiB7IGI6IG91dCwgdzogRy53LCBoOiBHLmggfTsKICAgIH0KCiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tIFTDrG0gMyDDtCDEkeG7i25oIHbhu4sgLS0tLS0tLS0tLS0tLS0tLQogICAgZnVuY3Rpb24gcmF0aW9PayhjKSB7CiAgICAgIHZhciB0b3QgPSBjWzBdICsgY1sxXSArIGNbMl0gKyBjWzNdICsgY1s0XTsKICAgICAgaWYgKHRvdCA8IDcpIHJldHVybiBmYWxzZTsKICAgICAgdmFyIG0gPSB0b3QgLyA3LCB2ID0gbSAvIDEuNjsKICAgICAgcmV0dXJuIE1hdGguYWJzKG0gLSBjWzBdKSA8IHYgJiYgTWF0aC5hYnMobSAtIGNbMV0pIDwgdiAmJiBNYXRoLmFicygzICogbSAtIGNbMl0pIDwgMyAqIHYgJiYgTWF0aC5hYnMobSAtIGNbM10pIDwgdiAmJiBNYXRoLmFicyhtIC0gY1s0XSkgPCB2OwogICAgfQogICAgLyoqIMSQ4bq/bSA1IMSRb+G6oW4gxJFlbi90cuG6r25nIMSRaSBxdWEgKGN4LCBjeSkgdGhlbyBoxrDhu5tuZyAoZHgsIGR5KTsgdHLhuqMge2M6IHTDom0gdGhlbyBoxrDhu5tuZyDEkcOzLCBtOiBj4buhIMO0fSBob+G6t2MgbnVsbC4gKi8KICAgIGZ1bmN0aW9uIGNyb3NzQ2hlY2soQm0sIGN4LCBjeSwgZHgsIGR5LCBtYXhDb3VudCkgewogICAgICB2YXIgYiA9IEJtLmIsIHcgPSBCbS53LCBoID0gQm0uaCwgYyA9IFswLCAwLCAwLCAwLCAwXSwgeDAgPSBNYXRoLmZsb29yKGN4KSwgeTAgPSBNYXRoLmZsb29yKGN5KTsKICAgICAgZnVuY3Rpb24gYXQoaykgeyB2YXIgeCA9IHgwICsgZHggKiBrLCB5ID0geTAgKyBkeSAqIGs7IHJldHVybiAoeCA8IDAgfHwgeSA8IDAgfHwgeCA+PSB3IHx8IHkgPj0gaCkgPyAtMSA6IGJbeSAqIHcgKyB4XTsgfQogICAgICB2YXIgayA9IDA7CiAgICAgIHdoaWxlIChhdChrKSA9PT0gMSkgeyBjWzJdKys7IGstLTsgfQogICAgICBpZiAoYXQoaykgPT09IC0xKSByZXR1cm4gbnVsbDsKICAgICAgd2hpbGUgKGF0KGspID09PSAwICYmIGNbMV0gPD0gbWF4Q291bnQpIHsgY1sxXSsrOyBrLS07IH0KICAgICAgaWYgKGF0KGspID09PSAtMSB8fCBjWzFdID4gbWF4Q291bnQpIHJldHVybiBudWxsOwogICAgICB3aGlsZSAoYXQoaykgPT09IDEgJiYgY1swXSA8PSBtYXhDb3VudCkgeyBjWzBdKys7IGstLTsgfQogICAgICBpZiAoY1swXSA+IG1heENvdW50KSByZXR1cm4gbnVsbDsKICAgICAgayA9IDE7CiAgICAgIHdoaWxlIChhdChrKSA9PT0gMSkgeyBjWzJdKys7IGsrKzsgfQogICAgICBpZiAoYXQoaykgPT09IC0xKSByZXR1cm4gbnVsbDsKICAgICAgd2hpbGUgKGF0KGspID09PSAwICYmIGNbM10gPD0gbWF4Q291bnQpIHsgY1szXSsrOyBrKys7IH0KICAgICAgaWYgKGF0KGspID09PSAtMSB8fCBjWzNdID4gbWF4Q291bnQpIHJldHVybiBudWxsOwogICAgICB3aGlsZSAoYXQoaykgPT09IDEgJiYgY1s0XSA8PSBtYXhDb3VudCkgeyBjWzRdKys7IGsrKzsgfQogICAgICBpZiAoY1s0XSA+IG1heENvdW50KSByZXR1cm4gbnVsbDsKICAgICAgaWYgKCFyYXRpb09rKGMpKSByZXR1cm4gbnVsbDsKICAgICAgdmFyIGVuZCA9IGs7ICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gw7QgxJHhuqd1IHRpw6puIHNhdSDEkW/huqFuIMSRZW4gY3Xhu5FpICh0w61uaCB04burIMO0IHh14bqldCBwaMOhdCkKICAgICAgdmFyIGNlbnRlciA9IGVuZCAtIGNbNF0gLSBjWzNdIC0gY1syXSAvIDI7CiAgICAgIC8vIHRv4bqhIMSR4buZIGxpw6puIHThu6VjICjDtCDhuqNuaCBpIHBo4bunIFtpLCBpKzEpKSB0aGVvIHRy4bulYyDEkWFuZyB4w6l0CiAgICAgIHJldHVybiB7IGM6IChkeCA/IHgwIDogeTApICsgY2VudGVyLCBtOiAoY1swXSArIGNbMV0gKyBjWzJdICsgY1szXSArIGNbNF0pIC8gNyB9OwogICAgfQogICAgZnVuY3Rpb24gZmluZEZpbmRlcnMoQm0pIHsKICAgICAgdmFyIGIgPSBCbS5iLCB3ID0gQm0udywgaCA9IEJtLmgsIGZvdW5kID0gW107CiAgICAgIHZhciBzdGVwID0gTWF0aC5tYXgoMSwgTWF0aC5mbG9vcihoIC8gMzAwKSk7CiAgICAgIGZvciAodmFyIHkgPSAwOyB5IDwgaDsgeSArPSBzdGVwKSB7CiAgICAgICAgdmFyIGMgPSBbMCwgMCwgMCwgMCwgMF0sIHN0ID0gMDsKICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8PSB3OyB4KyspIHsKICAgICAgICAgIHZhciBweCA9IHggPCB3ID8gYlt5ICogdyArIHhdIDogMDsKICAgICAgICAgIGlmIChweCA9PT0gMSkgewogICAgICAgICAgICBpZiAoc3QgJiAxKSBzdCsrOwogICAgICAgICAgICBjW3N0XSsrOwogICAgICAgICAgfSBlbHNlIHsKICAgICAgICAgICAgaWYgKCEoc3QgJiAxKSkgewogICAgICAgICAgICAgIGlmIChzdCA9PT0gNCkgewogICAgICAgICAgICAgICAgaWYgKHJhdGlvT2soYykpIHsKICAgICAgICAgICAgICAgICAgdmFyIGN4ID0geCAtIGNbNF0gLSBjWzNdIC0gY1syXSAvIDI7CiAgICAgICAgICAgICAgICAgIHZhciBtb2QgPSAoY1swXSArIGNbMV0gKyBjWzJdICsgY1szXSArIGNbNF0pIC8gNzsKICAgICAgICAgICAgICAgICAgdmFyIHYgPSBjcm9zc0NoZWNrKEJtLCBjeCwgeSwgMCwgMSwgY1syXSAqIDIpOwogICAgICAgICAgICAgICAgICBpZiAodikgewogICAgICAgICAgICAgICAgICAgIHZhciBjeSA9IHYuYzsKICAgICAgICAgICAgICAgICAgICB2YXIgaGggPSBjcm9zc0NoZWNrKEJtLCBjeCwgY3ksIDEsIDAsIGNbMl0gKiAyKTsKICAgICAgICAgICAgICAgICAgICBpZiAoaGgpIHsKICAgICAgICAgICAgICAgICAgICAgIGN4ID0gaGguYzsKICAgICAgICAgICAgICAgICAgICAgIHZhciBkZyA9IGNyb3NzQ2hlY2soQm0sIGN4LCBjeSwgMSwgMSwgY1syXSAqIDIpOwogICAgICAgICAgICAgICAgICAgICAgaWYgKGRnKSBhZGRGb3VuZChmb3VuZCwgY3gsIGN5LCAobW9kICsgdi5tICsgaGgubSkgLyAzKTsKICAgICAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgICAgICAgIH0KICAgICAgICAgICAgICAgICAgYyA9IFtjWzJdLCBjWzNdLCBjWzRdLCAxLCAwXTsgc3QgPSAzOwogICAgICAgICAgICAgICAgICBjb250aW51ZTsKICAgICAgICAgICAgICAgIH0KICAgICAgICAgICAgICAgIGMgPSBbY1syXSwgY1szXSwgY1s0XSwgMSwgMF07IHN0ID0gMzsKICAgICAgICAgICAgICB9IGVsc2UgeyBzdCsrOyBjW3N0XSsrOyB9CiAgICAgICAgICAgIH0gZWxzZSBjW3N0XSsrOwogICAgICAgICAgfQogICAgICAgIH0KICAgICAgfQogICAgICByZXR1cm4gZm91bmQ7CiAgICB9CiAgICBmdW5jdGlvbiBhZGRGb3VuZChmb3VuZCwgeCwgeSwgbSkgewogICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZvdW5kLmxlbmd0aDsgaSsrKSB7CiAgICAgICAgdmFyIGYgPSBmb3VuZFtpXTsKICAgICAgICBpZiAoTWF0aC5hYnMoZi54IC0geCkgPD0gZi5tICogMiAmJiBNYXRoLmFicyhmLnkgLSB5KSA8PSBmLm0gKiAyICYmIE1hdGguYWJzKGYubSAtIG0pIDw9IE1hdGgubWF4KDEsIGYubSAqIDAuNikpIHsKICAgICAgICAgIHZhciBuID0gZi5uICsgMTsKICAgICAgICAgIGYueCA9IChmLnggKiBmLm4gKyB4KSAvIG47IGYueSA9IChmLnkgKiBmLm4gKyB5KSAvIG47IGYubSA9IChmLm0gKiBmLm4gKyBtKSAvIG47IGYubiA9IG47CiAgICAgICAgICByZXR1cm47CiAgICAgICAgfQogICAgICB9CiAgICAgIGZvdW5kLnB1c2goeyB4OiB4LCB5OiB5LCBtOiBtLCBuOiAxIH0pOwogICAgfQogICAgZnVuY3Rpb24gZDIoYSwgYikgeyB2YXIgZHggPSBhLnggLSBiLngsIGR5ID0gYS55IC0gYi55OyByZXR1cm4gZHggKiBkeCArIGR5ICogZHk7IH0KICAgIC8qKiBDw6FjIGLhu5kgMyDDtCDEkeG7i25oIHbhu4sga2jhuqMgZMSpIChn4bqnbiB0YW0gZ2nDoWMgdnXDtG5nIGPDom4gbmjhuqV0IHRyxrDhu5tjKSwgxJHDoyB44bq/cCBbdHLDqm4tdHLDoWksIHRyw6puLXBo4bqjaSwgZMaw4bubaS10csOhaV0uICovCiAgICBmdW5jdGlvbiB0cmlwbGVzKGZvdW5kKSB7CiAgICAgIHZhciBjYW5kID0gZm91bmQuc2xpY2UoKS5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBiLm4gLSBhLm47IH0pLnNsaWNlKDAsIDE0KSwgb3V0ID0gW107CiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2FuZC5sZW5ndGg7IGkrKykgZm9yICh2YXIgaiA9IGkgKyAxOyBqIDwgY2FuZC5sZW5ndGg7IGorKykgZm9yICh2YXIgayA9IGogKyAxOyBrIDwgY2FuZC5sZW5ndGg7IGsrKykgewogICAgICAgIHZhciBwID0gW2NhbmRbaV0sIGNhbmRbal0sIGNhbmRba11dOwogICAgICAgIHZhciBtcyA9IHAubWFwKGZ1bmN0aW9uIChxKSB7IHJldHVybiBxLm07IH0pLCBtbiA9IE1hdGgubWluLmFwcGx5KG51bGwsIG1zKSwgbXggPSBNYXRoLm1heC5hcHBseShudWxsLCBtcyk7CiAgICAgICAgaWYgKG14ID4gbW4gKiAxLjgpIGNvbnRpbnVlOwogICAgICAgIHZhciBhYiA9IGQyKHBbMF0sIHBbMV0pLCBiYyA9IGQyKHBbMV0sIHBbMl0pLCBhYyA9IGQyKHBbMF0sIHBbMl0pLCBBLCBCLCBDOwogICAgICAgIGlmIChiYyA+PSBhYiAmJiBiYyA+PSBhYykgeyBCID0gcFswXTsgQSA9IHBbMV07IEMgPSBwWzJdOyB9CiAgICAgICAgZWxzZSBpZiAoYWMgPj0gYmMgJiYgYWMgPj0gYWIpIHsgQiA9IHBbMV07IEEgPSBwWzBdOyBDID0gcFsyXTsgfQogICAgICAgIGVsc2UgeyBCID0gcFsyXTsgQSA9IHBbMF07IEMgPSBwWzFdOyB9CiAgICAgICAgdmFyIHMxID0gZDIoQiwgQSksIHMyID0gZDIoQiwgQyksIGh5cCA9IGQyKEEsIEMpOwogICAgICAgIGlmIChNYXRoLm1pbihzMSwgczIpIDwgTWF0aC5wb3cobW4gKiAxNCwgMikpIGNvbnRpbnVlOyAgICAgICAgICAvLyBxdcOhIGfhuqduIG5oYXUg4oaSIGtow7RuZyBwaOG6o2kgY8O5bmcgbeG7mXQgbcOjCiAgICAgICAgdmFyIHNjb3JlID0gKE1hdGguYWJzKGh5cCAtIDIgKiBzMSkgKyBNYXRoLmFicyhoeXAgLSAyICogczIpKSAvIGh5cCArIChteCAtIG1uKSAvIG1uOwogICAgICAgIGlmIChzY29yZSA+IDEuMikgY29udGludWU7CiAgICAgICAgLy8gKEPiiJJCKcOXKEHiiJJCKSA8IDAg4oaSIMSR4buVaSBjaOG7lyDEkeG7gyBBIGzDoCBkxrDhu5tpLXRyw6FpLCBDIGzDoCB0csOqbi1waOG6o2kKICAgICAgICBpZiAoKEMueCAtIEIueCkgKiAoQS55IC0gQi55KSAtIChDLnkgLSBCLnkpICogKEEueCAtIEIueCkgPCAwKSB7IHZhciB0bXAgPSBBOyBBID0gQzsgQyA9IHRtcDsgfQogICAgICAgIG91dC5wdXNoKHsgdGw6IEIsIHRyOiBDLCBibDogQSwgc2NvcmU6IHNjb3JlIH0pOwogICAgICB9CiAgICAgIG91dC5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBhLnNjb3JlIC0gYi5zY29yZTsgfSk7CiAgICAgIHJldHVybiBvdXQuc2xpY2UoMCwgNCk7CiAgICB9CgogICAgLy8gLS0tLS0tLS0tLS0tLS0tLSBCaeG6v24gxJHhu5VpIHBo4buRaSBj4bqjbmggKDQgxJFp4buDbSDihpQgNCDEkWnhu4NtKSAtLS0tLS0tLS0tLS0tLS0tCiAgICBmdW5jdGlvbiBzcTJxdWFkKHgwLCB5MCwgeDEsIHkxLCB4MiwgeTIsIHgzLCB5MykgewogICAgICB2YXIgZHgzID0geDAgLSB4MSArIHgyIC0geDMsIGR5MyA9IHkwIC0geTEgKyB5MiAtIHkzOwogICAgICBpZiAoZHgzID09PSAwICYmIGR5MyA9PT0gMCkgcmV0dXJuIFt4MSAtIHgwLCB4MiAtIHgxLCB4MCwgeTEgLSB5MCwgeTIgLSB5MSwgeTAsIDAsIDAsIDFdOwogICAgICB2YXIgZHgxID0geDEgLSB4MiwgZHgyID0geDMgLSB4MiwgZHkxID0geTEgLSB5MiwgZHkyID0geTMgLSB5MiwgZGVuID0gZHgxICogZHkyIC0gZHgyICogZHkxOwogICAgICB2YXIgYTEzID0gKGR4MyAqIGR5MiAtIGR4MiAqIGR5MykgLyBkZW4sIGEyMyA9IChkeDEgKiBkeTMgLSBkeDMgKiBkeTEpIC8gZGVuOwogICAgICByZXR1cm4gW3gxIC0geDAgKyBhMTMgKiB4MSwgeDMgLSB4MCArIGEyMyAqIHgzLCB4MCwgeTEgLSB5MCArIGExMyAqIHkxLCB5MyAtIHkwICsgYTIzICogeTMsIHkwLCBhMTMsIGEyMywgMV07CiAgICB9CiAgICBmdW5jdGlvbiBhZGoobSkgeyAgIC8vIG1hIHRy4bqtbiBwaOG7pSBo4bujcCAobmdo4buLY2ggxJHhuqNvIGtow7RuZyBjaGlhIMSR4buLbmggdGjhu6ljIOKAlCDEkeG7pyBjaG8gcGjDqXAgY2hp4bq/dSkKICAgICAgcmV0dXJuIFttWzRdICogbVs4XSAtIG1bNV0gKiBtWzddLCBtWzJdICogbVs3XSAtIG1bMV0gKiBtWzhdLCBtWzFdICogbVs1XSAtIG1bMl0gKiBtWzRdLAogICAgICAgICAgICAgIG1bNV0gKiBtWzZdIC0gbVszXSAqIG1bOF0sIG1bMF0gKiBtWzhdIC0gbVsyXSAqIG1bNl0sIG1bMl0gKiBtWzNdIC0gbVswXSAqIG1bNV0sCiAgICAgICAgICAgICAgbVszXSAqIG1bN10gLSBtWzRdICogbVs2XSwgbVsxXSAqIG1bNl0gLSBtWzBdICogbVs3XSwgbVswXSAqIG1bNF0gLSBtWzFdICogbVszXV07CiAgICB9CiAgICBmdW5jdGlvbiBtbXVsKGEsIGIpIHsKICAgICAgdmFyIHIgPSBuZXcgQXJyYXkoOSk7CiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMzsgaSsrKSBmb3IgKHZhciBqID0gMDsgaiA8IDM7IGorKykgcltpICogMyArIGpdID0gYVtpICogM10gKiBiW2pdICsgYVtpICogMyArIDFdICogYlszICsgal0gKyBhW2kgKiAzICsgMl0gKiBiWzYgKyBqXTsKICAgICAgcmV0dXJuIHI7CiAgICB9CiAgICAvKiogTWEgdHLhuq1uIMSRxrBhIHRv4bqhIMSR4buZIMO0IChzcmMpIHNhbmcgdG/huqEgxJHhu5kg4bqjbmggKGRzdCkuIMSQaeG7g20gdGhlbyB0aOG7qSB04buxIHRyw6puLXRyw6FpLCB0csOqbi1waOG6o2ksIGTGsOG7m2ktcGjhuqNpLCBkxrDhu5tpLXRyw6FpLiAqLwogICAgZnVuY3Rpb24gcXVhZDJxdWFkKHNyYywgZHN0KSB7CiAgICAgIC8vIHNxMnF1YWQoeDAuLngzKSDDoW5oIHjhuqEgaMOsbmggdnXDtG5nIMSRxqFuIHbhu4sgKDAsMCkoMSwwKSgxLDEpKDAsMSkg4oaSIHThu6kgZ2nDoWM7IGThuqFuZyBbYTExIGEyMSBhMzE7IGExMiBhMjIgYTMyOyBhMTMgYTIzIGEzM10gdGhlbyBj4buZdAogICAgICB2YXIgUyA9IHNxMnF1YWQoc3JjWzBdLCBzcmNbMV0sIHNyY1syXSwgc3JjWzNdLCBzcmNbNF0sIHNyY1s1XSwgc3JjWzZdLCBzcmNbN10pOwogICAgICB2YXIgRCA9IHNxMnF1YWQoZHN0WzBdLCBkc3RbMV0sIGRzdFsyXSwgZHN0WzNdLCBkc3RbNF0sIGRzdFs1XSwgZHN0WzZdLCBkc3RbN10pOwogICAgICAvLyBjaHV54buDbiB24buBIGThuqFuZyBow6BuZzogW2EgYiBjOyBkIGUgZjsgZyBoIGldIHbhu5tpIHgnID0gKGEgeCArIGIgeSArIGMpLyhnIHggKyBoIHkgKyBpKQogICAgICBmdW5jdGlvbiByb3dGb3JtKE0pIHsgcmV0dXJuIFtNWzBdLCBNWzFdLCBNWzJdLCBNWzNdLCBNWzRdLCBNWzVdLCBNWzZdLCBNWzddLCBNWzhdXTsgfQogICAgICByZXR1cm4gbW11bChyb3dGb3JtKEQpLCBhZGoocm93Rm9ybShTKSkpOwogICAgfQogICAgZnVuY3Rpb24gYXBwbHkoTSwgeCwgeSkgewogICAgICB2YXIgeiA9IE1bNl0gKiB4ICsgTVs3XSAqIHkgKyBNWzhdOwogICAgICByZXR1cm4gWyhNWzBdICogeCArIE1bMV0gKiB5ICsgTVsyXSkgLyB6LCAoTVszXSAqIHggKyBNWzRdICogeSArIE1bNV0pIC8gel07CiAgICB9CgogICAgLy8gLS0tLS0tLS0tLS0tLS0tLSDDlCBjxINuIGNo4buJbmggKHBoacOqbiBi4bqjbiDiiaUgMikgLS0tLS0tLS0tLS0tLS0tLQogICAgZnVuY3Rpb24gZmluZEFsaWduKEJtLCBlc3QsIHV4LCB1eSwgbW9kKSB7CiAgICAgIHZhciBiID0gQm0uYiwgdyA9IEJtLncsIGggPSBCbS5oOwogICAgICBmdW5jdGlvbiBweCh4LCB5KSB7IHggPSBNYXRoLmZsb29yKHgpOyB5ID0gTWF0aC5mbG9vcih5KTsgcmV0dXJuICh4IDwgMCB8fCB5IDwgMCB8fCB4ID49IHcgfHwgeSA+PSBoKSA/IC0xIDogYlt5ICogdyArIHhdOyB9CiAgICAgIHZhciByaW5nMSA9IFtdLCByaW5nMiA9IFtdOwogICAgICBmb3IgKHZhciBpID0gLTE7IGkgPD0gMTsgaSsrKSBmb3IgKHZhciBqID0gLTE7IGogPD0gMTsgaisrKSBpZiAoaSB8fCBqKSByaW5nMS5wdXNoKFtpLCBqXSk7CiAgICAgIGZvciAodmFyIGkyID0gLTI7IGkyIDw9IDI7IGkyKyspIGZvciAodmFyIGoyID0gLTI7IGoyIDw9IDI7IGoyKyspIGlmIChNYXRoLm1heChNYXRoLmFicyhpMiksIE1hdGguYWJzKGoyKSkgPT09IDIpIHJpbmcyLnB1c2goW2kyLCBqMl0pOwogICAgICBmdW5jdGlvbiBzY29yZShjeCwgY3kpIHsKICAgICAgICB2YXIgcyA9IHB4KGN4LCBjeSkgPT09IDEgPyAyIDogMDsKICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IHJpbmcxLmxlbmd0aDsgaysrKSBpZiAocHgoY3ggKyByaW5nMVtrXVswXSAqIHV4WzBdICsgcmluZzFba11bMV0gKiB1eVswXSwgY3kgKyByaW5nMVtrXVswXSAqIHV4WzFdICsgcmluZzFba11bMV0gKiB1eVsxXSkgPT09IDApIHMrKzsKICAgICAgICBmb3IgKHZhciBxID0gMDsgcSA8IHJpbmcyLmxlbmd0aDsgcSsrKSBpZiAocHgoY3ggKyByaW5nMltxXVswXSAqIHV4WzBdICsgcmluZzJbcV1bMV0gKiB1eVswXSwgY3kgKyByaW5nMltxXVswXSAqIHV4WzFdICsgcmluZzJbcV1bMV0gKiB1eVsxXSkgPT09IDEpIHMrKzsKICAgICAgICByZXR1cm4gczsgICAgICAgICAgICAgICAgICAgICAgIC8vIHThu5FpIMSRYSAyICsgOCArIDE2ID0gMjYKICAgICAgfQogICAgICB2YXIgUiA9IG1vZCAqIDUsIHN0ID0gTWF0aC5tYXgoMSwgbW9kIC8gMyksIGJlc3QgPSBudWxsOwogICAgICBmb3IgKHZhciB5ID0gZXN0WzFdIC0gUjsgeSA8PSBlc3RbMV0gKyBSOyB5ICs9IHN0KSBmb3IgKHZhciB4ID0gZXN0WzBdIC0gUjsgeCA8PSBlc3RbMF0gKyBSOyB4ICs9IHN0KSB7CiAgICAgICAgdmFyIHMwID0gc2NvcmUoeCwgeSk7CiAgICAgICAgaWYgKHMwID49IDIyKSB7CiAgICAgICAgICB2YXIgZGQgPSAoeCAtIGVzdFswXSkgKiAoeCAtIGVzdFswXSkgKyAoeSAtIGVzdFsxXSkgKiAoeSAtIGVzdFsxXSk7CiAgICAgICAgICBpZiAoIWJlc3QgfHwgczAgPiBiZXN0LnMgfHwgKHMwID09PSBiZXN0LnMgJiYgZGQgPCBiZXN0LmQpKSBiZXN0ID0geyB4OiB4LCB5OiB5LCBzOiBzMCwgZDogZGQgfTsKICAgICAgICB9CiAgICAgIH0KICAgICAgaWYgKCFiZXN0KSByZXR1cm4gbnVsbDsKICAgICAgLy8gdGluaCBjaOG7iW5oOiBs4bqleSB0cnVuZyBiw6xuaCBjw6FjIMSRaeG7g20gxJFp4buDbSB04buRdCBuaOG6pXQgcXVhbmggxJHDswogICAgICB2YXIgc3ggPSAwLCBzeSA9IDAsIG4gPSAwOwogICAgICBmb3IgKHZhciB5eSA9IGJlc3QueSAtIHN0OyB5eSA8PSBiZXN0LnkgKyBzdDsgeXkgKz0gMC41KSBmb3IgKHZhciB4eCA9IGJlc3QueCAtIHN0OyB4eCA8PSBiZXN0LnggKyBzdDsgeHggKz0gMC41KQogICAgICAgIGlmIChzY29yZSh4eCwgeXkpID49IGJlc3QucykgeyBzeCArPSB4eDsgc3kgKz0geXk7IG4rKzsgfQogICAgICByZXR1cm4gbiA/IFtzeCAvIG4sIHN5IC8gbl0gOiBbYmVzdC54LCBiZXN0LnldOwogICAgfQoKICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0gTWEgdHLhuq1uIOKGkiBjaHXhu5dpIC0tLS0tLS0tLS0tLS0tLS0KICAgIGZ1bmN0aW9uIHJlc2VydmVkTWFwKHYpIHsKICAgICAgdmFyIHNpemUgPSB2ICogNCArIDE3LCBSID0gW10sIHIsIGM7CiAgICAgIGZvciAociA9IDA7IHIgPCBzaXplOyByKyspIFIucHVzaChuZXcgQXJyYXkoc2l6ZSkuZmlsbChmYWxzZSkpOwogICAgICBmdW5jdGlvbiBib3gocjAsIGMwKSB7IGZvciAodmFyIGRyID0gLTE7IGRyIDw9IDc7IGRyKyspIGZvciAodmFyIGRjID0gLTE7IGRjIDw9IDc7IGRjKyspIHsgdmFyIHJyID0gcjAgKyBkciwgY2MgPSBjMCArIGRjOyBpZiAocnIgPj0gMCAmJiBjYyA+PSAwICYmIHJyIDwgc2l6ZSAmJiBjYyA8IHNpemUpIFJbcnJdW2NjXSA9IHRydWU7IH0gfQogICAgICBib3goMCwgMCk7IGJveCgwLCBzaXplIC0gNyk7IGJveChzaXplIC0gNywgMCk7CiAgICAgIGZvciAodmFyIGkgPSA4OyBpIDwgc2l6ZSAtIDg7IGkrKykgeyBSWzZdW2ldID0gdHJ1ZTsgUltpXVs2XSA9IHRydWU7IH0KICAgICAgdmFyIGFjID0gQUxJR05bdl07CiAgICAgIGFjLmZvckVhY2goZnVuY3Rpb24gKGFyKSB7IGFjLmZvckVhY2goZnVuY3Rpb24gKGFjeCkgewogICAgICAgIGlmICgoYXIgPT09IDYgJiYgYWN4ID09PSA2KSB8fCAoYXIgPT09IDYgJiYgYWN4ID09PSBzaXplIC0gNykgfHwgKGFyID09PSBzaXplIC0gNyAmJiBhY3ggPT09IDYpKSByZXR1cm47CiAgICAgICAgZm9yICh2YXIgYSA9IC0yOyBhIDw9IDI7IGErKykgZm9yICh2YXIgYjIgPSAtMjsgYjIgPD0gMjsgYjIrKykgUlthciArIGFdW2FjeCArIGIyXSA9IHRydWU7CiAgICAgIH0pOyB9KTsKICAgICAgUltzaXplIC0gOF1bOF0gPSB0cnVlOwogICAgICBmb3IgKHZhciBpNSA9IDA7IGk1IDwgOTsgaTUrKykgaWYgKGk1ICE9PSA2KSB7IFJbOF1baTVdID0gdHJ1ZTsgUltpNV1bOF0gPSB0cnVlOyB9CiAgICAgIGZvciAodmFyIGk2ID0gMDsgaTYgPCA4OyBpNisrKSB7IFJbOF1bc2l6ZSAtIDEgLSBpNl0gPSB0cnVlOyBSW3NpemUgLSAxIC0gaTZdWzhdID0gdHJ1ZTsgfQogICAgICBSWzhdWzZdID0gdHJ1ZTsgUls2XVs4XSA9IHRydWU7CiAgICAgIGlmICh2ID49IDcpIGZvciAodmFyIGk3ID0gMDsgaTcgPCAxODsgaTcrKykgeyBSW01hdGguZmxvb3IoaTcgLyAzKV1bc2l6ZSAtIDExICsgKGk3ICUgMyldID0gdHJ1ZTsgUltzaXplIC0gMTEgKyAoaTcgJSAzKV1bTWF0aC5mbG9vcihpNyAvIDMpXSA9IHRydWU7IH0KICAgICAgcmV0dXJuIFI7CiAgICB9CiAgICAvKiogxJDhu41jIG3hurd0IG7huqEgdOG7qyAyIGLhuqNuIHRow7RuZyB0aW4gxJHhu4tuaCBk4bqhbmcgKHNvIHbhu5tpIDgga2jhuqMgbsSDbmcgY+G7p2EgbeG7qWMgTSwgY2jhuqVwIG5o4bqtbiBs4buHY2gg4omkIDMgYml0KS4gKi8KICAgIGZ1bmN0aW9uIHJlYWRNYXNrKG0sIHNpemUpIHsKICAgICAgdmFyIGJlc3QgPSAtMSwgYmVzdEQgPSA5OTsKICAgICAgZm9yICh2YXIgbWsgPSAwOyBtayA8IDg7IG1rKyspIHsKICAgICAgICB2YXIgZmIgPSBULmZvcm1hdEJpdHMobWspLCBkMSA9IDAsIGRCID0gMDsKICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDE1OyBpKyspIHsKICAgICAgICAgIHZhciBiaXQgPSAoKGZiID4+PiBpKSAmIDEpID09PSAxLCBhLCBiOwogICAgICAgICAgaWYgKGkgPCA2KSBhID0gbVtpXVs4XTsgZWxzZSBpZiAoaSA9PT0gNikgYSA9IG1bN11bOF07IGVsc2UgaWYgKGkgPT09IDcpIGEgPSBtWzhdWzhdOyBlbHNlIGlmIChpID09PSA4KSBhID0gbVs4XVs3XTsgZWxzZSBhID0gbVs4XVsxNCAtIGldOwogICAgICAgICAgaWYgKGkgPCA4KSBiID0gbVs4XVtzaXplIC0gMSAtIGldOyBlbHNlIGIgPSBtW3NpemUgLSAxNSArIGldWzhdOwogICAgICAgICAgaWYgKGEgIT09IGJpdCkgZDErKzsKICAgICAgICAgIGlmIChiICE9PSBiaXQpIGRCKys7CiAgICAgICAgfQogICAgICAgIHZhciBkID0gTWF0aC5taW4oZDEsIGRCKTsKICAgICAgICBpZiAoZCA8IGJlc3REKSB7IGJlc3REID0gZDsgYmVzdCA9IG1rOyB9CiAgICAgIH0KICAgICAgcmV0dXJuIGJlc3REIDw9IDMgPyBiZXN0IDogLTE7CiAgICB9CiAgICBmdW5jdGlvbiB1dGY4RGVjKGJ5dGVzKSB7CiAgICAgIHRyeSB7IHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoYnl0ZXMubWFwKGZ1bmN0aW9uICh4KSB7IHJldHVybiAiJSIgKyAoIjAiICsgeC50b1N0cmluZygxNikpLnNsaWNlKC0yKTsgfSkuam9pbigiIikpOyB9CiAgICAgIGNhdGNoIChlKSB7IHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsIGJ5dGVzKTsgfQogICAgfQogICAgdmFyIEFMTlVNID0gIjAxMjM0NTY3ODlBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWiAkJSorLS4vOiI7CiAgICBmdW5jdGlvbiBkZWNvZGVNYXRyaXgobSkgewogICAgICB2YXIgc2l6ZSA9IG0ubGVuZ3RoLCB2ID0gKHNpemUgLSAxNykgLyA0OwogICAgICBpZiAodiAhPT0gTWF0aC5mbG9vcih2KSB8fCAhRUNCW3ZdKSByZXR1cm4gbnVsbDsKICAgICAgdmFyIG1hc2sgPSByZWFkTWFzayhtLCBzaXplKTsgaWYgKG1hc2sgPCAwKSByZXR1cm4gbnVsbDsKICAgICAgdmFyIFIgPSByZXNlcnZlZE1hcCh2KSwgZSA9IEVDQlt2XSwgbmIgPSBlWzFdICsgZVszXTsKICAgICAgdmFyIHRvdGFsID0gZVsxXSAqIChlWzJdICsgZVswXSkgKyBlWzNdICogKGVbNF0gKyBlWzBdKTsKICAgICAgdmFyIGN3ID0gW10sIGN1ciA9IDAsIG5iaXQgPSAwLCB1cCA9IHRydWU7CiAgICAgIGZvciAodmFyIGNvbCA9IHNpemUgLSAxOyBjb2wgPj0gMDsgY29sIC09IDIpIHsKICAgICAgICBpZiAoY29sID09PSA2KSBjb2wtLTsKICAgICAgICBmb3IgKHZhciBzdCA9IDA7IHN0IDwgc2l6ZTsgc3QrKykgewogICAgICAgICAgdmFyIHJvdyA9IHVwID8gc2l6ZSAtIDEgLSBzdCA6IHN0OwogICAgICAgICAgZm9yICh2YXIgbyA9IDA7IG8gPCAyOyBvKyspIHsKICAgICAgICAgICAgdmFyIGMgPSBjb2wgLSBvOwogICAgICAgICAgICBpZiAoUltyb3ddW2NdKSBjb250aW51ZTsKICAgICAgICAgICAgdmFyIGJpdCA9IG1bcm93XVtjXSA/IDEgOiAwOwogICAgICAgICAgICBpZiAoTUFTS1NbbWFza10ocm93LCBjKSkgYml0IF49IDE7CiAgICAgICAgICAgIGN1ciA9IChjdXIgPDwgMSkgfCBiaXQ7IG5iaXQrKzsKICAgICAgICAgICAgaWYgKG5iaXQgPT09IDgpIHsgY3cucHVzaChjdXIpOyBjdXIgPSAwOyBuYml0ID0gMDsgfQogICAgICAgICAgfQogICAgICAgIH0KICAgICAgICB1cCA9ICF1cDsKICAgICAgfQogICAgICBpZiAoY3cubGVuZ3RoIDwgdG90YWwpIHJldHVybiBudWxsOwogICAgICAvLyB0w6FjaCBs4bqhaSBjw6FjIGto4buRaSAobmfGsOG7o2MgduG7m2kgY8OhY2ggxJFhbiB4ZW4ga2hpIHThuqFvIG3DoykKICAgICAgdmFyIGxlbnMgPSBbXSwgYmxvY2tzID0gW10sIGksIGI7CiAgICAgIGZvciAoaSA9IDA7IGkgPCBuYjsgaSsrKSB7IGxlbnMucHVzaChpIDwgZVsxXSA/IGVbMl0gOiBlWzRdKTsgYmxvY2tzLnB1c2goW10pOyB9CiAgICAgIHZhciBtYXhEID0gTWF0aC5tYXgoZVsyXSwgZVs0XSB8fCAwKSwgayA9IDA7CiAgICAgIGZvciAoaSA9IDA7IGkgPCBtYXhEOyBpKyspIGZvciAoYiA9IDA7IGIgPCBuYjsgYisrKSBpZiAoaSA8IGxlbnNbYl0pIGJsb2Nrc1tiXS5wdXNoKGN3W2srK10pOwogICAgICBmb3IgKGkgPSAwOyBpIDwgZVswXTsgaSsrKSBmb3IgKGIgPSAwOyBiIDwgbmI7IGIrKykgYmxvY2tzW2JdLnB1c2goY3dbaysrXSk7CiAgICAgIHZhciBkYXRhID0gW107CiAgICAgIGZvciAoYiA9IDA7IGIgPCBuYjsgYisrKSB7IHZhciBmaXhlZCA9IHJzQ29ycmVjdChibG9ja3NbYl0sIGVbMF0pOyBpZiAoIWZpeGVkKSByZXR1cm4gbnVsbDsgZGF0YSA9IGRhdGEuY29uY2F0KGZpeGVkKTsgfQogICAgICAvLyBnaeG6o2kgY8OhYyDEkW/huqFuCiAgICAgIHZhciBwb3MgPSAwLCBvdXQgPSAiIjsKICAgICAgZnVuY3Rpb24gcmQobikgeyB2YXIgeCA9IDA7IGZvciAodmFyIHEgPSAwOyBxIDwgbjsgcSsrKSB7IHZhciBieSA9IGRhdGFbKHBvcyA+PiAzKV07IGlmIChieSA9PT0gdW5kZWZpbmVkKSB0aHJvdyAwOyB4ID0gKHggPDwgMSkgfCAoKGJ5ID4+ICg3IC0gKHBvcyAmIDcpKSkgJiAxKTsgcG9zKys7IH0gcmV0dXJuIHg7IH0KICAgICAgdHJ5IHsKICAgICAgICB3aGlsZSAocG9zICsgNCA8PSBkYXRhLmxlbmd0aCAqIDgpIHsKICAgICAgICAgIHZhciBtb2RlID0gcmQoNCk7CiAgICAgICAgICBpZiAobW9kZSA9PT0gMCkgYnJlYWs7CiAgICAgICAgICBpZiAobW9kZSA9PT0gNCkgeyB2YXIgbiA9IHJkKHYgPCAxMCA/IDggOiAxNiksIGJ5dGVzID0gW107IGZvciAoaSA9IDA7IGkgPCBuOyBpKyspIGJ5dGVzLnB1c2gocmQoOCkpOyBvdXQgKz0gdXRmOERlYyhieXRlcyk7IH0KICAgICAgICAgIGVsc2UgaWYgKG1vZGUgPT09IDIpIHsgdmFyIG4yID0gcmQodiA8IDEwID8gOSA6IDExKTsgZm9yIChpID0gMDsgaSArIDEgPCBuMjsgaSArPSAyKSB7IHZhciB4MiA9IHJkKDExKTsgb3V0ICs9IEFMTlVNW01hdGguZmxvb3IoeDIgLyA0NSldICsgQUxOVU1beDIgJSA0NV07IH0gaWYgKG4yICUgMikgb3V0ICs9IEFMTlVNW3JkKDYpXTsgfQogICAgICAgICAgZWxzZSBpZiAobW9kZSA9PT0gMSkgeyB2YXIgbjMgPSByZCh2IDwgMTAgPyAxMCA6IDEyKTsgd2hpbGUgKG4zID49IDMpIHsgb3V0ICs9ICgiMDAiICsgcmQoMTApKS5zbGljZSgtMyk7IG4zIC09IDM7IH0gaWYgKG4zID09PSAyKSBvdXQgKz0gKCIwIiArIHJkKDcpKS5zbGljZSgtMik7IGVsc2UgaWYgKG4zID09PSAxKSBvdXQgKz0gU3RyaW5nKHJkKDQpKTsgfQogICAgICAgICAgZWxzZSBpZiAobW9kZSA9PT0gNykgeyByZCg4KTsgfQogICAgICAgICAgZWxzZSByZXR1cm4gbnVsbDsKICAgICAgICB9CiAgICAgIH0gY2F0Y2ggKGVyKSB7IHJldHVybiBvdXQgfHwgbnVsbDsgfQogICAgICByZXR1cm4gb3V0OwogICAgfQoKICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0gR2jDqXAgbOG6oWkgLS0tLS0tLS0tLS0tLS0tLQogICAgZnVuY3Rpb24gc2FtcGxlR3JpZChCbSwgTSwgZGltKSB7CiAgICAgIHZhciBiID0gQm0uYiwgdyA9IEJtLncsIGggPSBCbS5oLCBtID0gW10sIGJhZCA9IDA7CiAgICAgIGZvciAodmFyIHkgPSAwOyB5IDwgZGltOyB5KyspIHsKICAgICAgICB2YXIgcm93ID0gW107CiAgICAgICAgZm9yICh2YXIgeCA9IDA7IHggPCBkaW07IHgrKykgewogICAgICAgICAgdmFyIHAgPSBhcHBseShNLCB4ICsgMC41LCB5ICsgMC41KSwgcHggPSBNYXRoLmZsb29yKHBbMF0pLCBweSA9IE1hdGguZmxvb3IocFsxXSk7CiAgICAgICAgICBpZiAocHggPCAwIHx8IHB5IDwgMCB8fCBweCA+PSB3IHx8IHB5ID49IGgpIHsgYmFkKys7IHJvdy5wdXNoKGZhbHNlKTsgY29udGludWU7IH0KICAgICAgICAgIHJvdy5wdXNoKGJbcHkgKiB3ICsgcHhdID09PSAxKTsKICAgICAgICB9CiAgICAgICAgbS5wdXNoKHJvdyk7CiAgICAgIH0KICAgICAgcmV0dXJuIGJhZCA+IGRpbSA/IG51bGwgOiBtOwogICAgfQogICAgZnVuY3Rpb24gdHJhbnNwb3NlKG0pIHsgcmV0dXJuIG0ubWFwKGZ1bmN0aW9uIChyLCBpKSB7IHJldHVybiByLm1hcChmdW5jdGlvbiAoXywgaikgeyByZXR1cm4gbVtqXVtpXTsgfSk7IH0pOyB9CiAgICBmdW5jdGlvbiB0cnlUcmlwbGUoQm0sIHQpIHsKICAgICAgdmFyIHRsID0gdC50bCwgdHIgPSB0LnRyLCBibCA9IHQuYmwsIG1vZCA9ICh0bC5tICsgdHIubSArIGJsLm0pIC8gMzsKICAgICAgdmFyIGVzdCA9IE1hdGgucm91bmQoKE1hdGguc3FydChkMih0bCwgdHIpKSArIE1hdGguc3FydChkMih0bCwgYmwpKSkgLyAyIC8gbW9kKSArIDc7CiAgICAgIHZhciBkaW1zID0gW10sIGJhc2UgPSBlc3QgLSAoKGVzdCAtIDE3KSAlIDQgKyA0KSAlIDQgKyAoKChlc3QgLSAxNykgJSA0ICsgNCkgJSA0ID49IDIgPyA0IDogMCk7CiAgICAgIFswLCAtNCwgNF0uZm9yRWFjaChmdW5jdGlvbiAoZGQpIHsgdmFyIGQgPSBiYXNlICsgZGQ7IGlmIChkID49IDIxICYmIGQgPD0gNTcgJiYgZGltcy5pbmRleE9mKGQpID09PSAtMSkgZGltcy5wdXNoKGQpOyB9KTsKICAgICAgZm9yICh2YXIgZGkgPSAwOyBkaSA8IGRpbXMubGVuZ3RoOyBkaSsrKSB7CiAgICAgICAgdmFyIGRpbSA9IGRpbXNbZGldLCBuID0gZGltIC0gNzsKICAgICAgICB2YXIgdXggPSBbKHRyLnggLSB0bC54KSAvIG4sICh0ci55IC0gdGwueSkgLyBuXSwgdXkgPSBbKGJsLnggLSB0bC54KSAvIG4sIChibC55IC0gdGwueSkgLyBuXTsKICAgICAgICB2YXIgY29ybmVycyA9IFtdOwogICAgICAgIGlmIChkaW0gPiAyMSkgewogICAgICAgICAgdmFyIGNmID0gMSAtIDMgLyBuLCBicnggPSB0ci54IC0gdGwueCArIGJsLngsIGJyeSA9IHRyLnkgLSB0bC55ICsgYmwueTsKICAgICAgICAgIHZhciBhbCA9IGZpbmRBbGlnbihCbSwgW3RsLnggKyBjZiAqIChicnggLSB0bC54KSwgdGwueSArIGNmICogKGJyeSAtIHRsLnkpXSwgdXgsIHV5LCBtb2QpOwogICAgICAgICAgaWYgKGFsKSBjb3JuZXJzLnB1c2goeyBzOiBkaW0gLSA2LjUsIHA6IGFsIH0pOwogICAgICAgIH0KICAgICAgICBjb3JuZXJzLnB1c2goeyBzOiBkaW0gLSAzLjUsIHA6IFt0ci54IC0gdGwueCArIGJsLngsIHRyLnkgLSB0bC55ICsgYmwueV0gfSk7CiAgICAgICAgZm9yICh2YXIgY2kgPSAwOyBjaSA8IGNvcm5lcnMubGVuZ3RoOyBjaSsrKSB7CiAgICAgICAgICB2YXIgQyA9IGNvcm5lcnNbY2ldOwogICAgICAgICAgdmFyIE0gPSBxdWFkMnF1YWQoWzMuNSwgMy41LCBkaW0gLSAzLjUsIDMuNSwgQy5zLCBDLnMsIDMuNSwgZGltIC0gMy41XSwKICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt0bC54LCB0bC55LCB0ci54LCB0ci55LCBDLnBbMF0sIEMucFsxXSwgYmwueCwgYmwueV0pOwogICAgICAgICAgdmFyIGcgPSBzYW1wbGVHcmlkKEJtLCBNLCBkaW0pOyBpZiAoIWcpIGNvbnRpbnVlOwogICAgICAgICAgdmFyIHR4dCA9IGRlY29kZU1hdHJpeChnKTsKICAgICAgICAgIGlmICh0eHQgPT0gbnVsbCkgdHh0ID0gZGVjb2RlTWF0cml4KHRyYW5zcG9zZShnKSk7ICAgICAgICAgIC8vIOG6o25oIGzhuq10IGfGsMahbmcgKGNhbWVyYSB0csaw4bubYykKICAgICAgICAgIGlmICh0eHQgIT0gbnVsbCkgcmV0dXJuIHR4dDsKICAgICAgICB9CiAgICAgIH0KICAgICAgcmV0dXJuIG51bGw7CiAgICB9CiAgICAvKiogxJDhu41jIG3DoyBRUiB0cm9uZyDhuqNuaC4gVHLhuqMgY2h14buXaSBob+G6t2MgbnVsbC4gKi8KICAgIGZ1bmN0aW9uIGRlY29kZShpbWcpIHsKICAgICAgdmFyIGRpbXMgPSBbTWF0aC5tYXgoaW1nLndpZHRoLCBpbWcuaGVpZ2h0KSA8PSAxMTAwID8gTWF0aC5tYXgoaW1nLndpZHRoLCBpbWcuaGVpZ2h0KSA6IDEwMDAsIDE2MDAsIDY0MF07CiAgICAgIHZhciBzZWVuID0ge307CiAgICAgIGZvciAodmFyIHMgPSAwOyBzIDwgZGltcy5sZW5ndGg7IHMrKykgewogICAgICAgIHZhciBHID0gdG9HcmF5KGltZywgZGltc1tzXSk7CiAgICAgICAgaWYgKHNlZW5bRy53XSkgY29udGludWU7IHNlZW5bRy53XSA9IDE7CiAgICAgICAgdmFyIGJpbnMgPSBbYmluSHlicmlkKEcpLCBiaW5PdHN1KEcpXTsKICAgICAgICBmb3IgKHZhciBiaSA9IDA7IGJpIDwgYmlucy5sZW5ndGg7IGJpKyspIHsKICAgICAgICAgIHZhciB0cyA9IHRyaXBsZXMoZmluZEZpbmRlcnMoYmluc1tiaV0pKTsKICAgICAgICAgIGZvciAodmFyIHRpID0gMDsgdGkgPCB0cy5sZW5ndGg7IHRpKyspIHsgdmFyIHIgPSB0cnlUcmlwbGUoYmluc1tiaV0sIHRzW3RpXSk7IGlmIChyICE9IG51bGwpIHJldHVybiByOyB9CiAgICAgICAgfQogICAgICB9CiAgICAgIHJldHVybiBudWxsOwogICAgfQogICAgcmV0dXJuIHsgZGVjb2RlOiBkZWNvZGUsIF9yczogcnNDb3JyZWN0LCBfbWF0cml4OiBkZWNvZGVNYXRyaXggfTsKICB9KShRUi5fdCk7CgogIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KICAvLyBNw4FZIMSQSeG7gk0gREFOSCDigJQgVFJBTkcgUknDik5HIChjYW1lcmEgdHLhu7FjIHRp4bq/cCkKICAvLyBDaOG6oXkgTkdPw4BJIGtodW5nIEFwcHMgU2NyaXB0IChraHVuZyDEkcOzIGLhu4sgR29vZ2xlIGNo4bq3biBjYW1lcmEpLCBn4buNaSBtw6F5IGNo4bunIHF1YQogIC8vICAgRVhFQz9hcGk9YXR0JmZuPWluZm8gfCBmbj1wdW5jaCZjb2RlPeKApiZraW5kPeKApgogIC8vIFRyYW5nIG7DoHkgcGjhuqNpIGNo4bqheSDEkcaw4bujYyBj4bqjIOG7nyBk4bqhbmcgWEhUTUwgKG3DoXkgY2jhu6cgdHLhuqMgduG7gSBhcHBsaWNhdGlvbi94bWwpIGzhuqtuIEhUTUwgdGjGsOG7nW5nCiAgLy8gKHThu7EgaG9zdCkg4oaSIEtIw5RORyBkw7luZyBpbm5lckhUTUwsIG3hu41pIHBo4bqnbiB04butIHThuqFvIGLhurFuZyBjcmVhdGVFbGVtZW50TlMuCiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQogIHZhciBFWEVDID0gIiUlRVhFQyUlIiwgU1RPUkUwID0gIiUlU1RPUkVKUyUlIjsKICAoZnVuY3Rpb24oKXsgdmFyIG0gPSAvWyMmXXU9KFteJl0rKS8uZXhlYyhsb2NhdGlvbi5oYXNoIHx8ICIiKTsgaWYgKG0pIHsgdHJ5IHsgRVhFQyA9IGRlY29kZVVSSUNvbXBvbmVudChtWzFdKTsgfSBjYXRjaCAoZSkge30gfSB9KSgpOwogIGlmICgvJSVFWEVDLy50ZXN0KEVYRUMpKSBFWEVDID0gIiI7IGlmICgvJSVTVE9SRS8udGVzdChTVE9SRTApKSBTVE9SRTAgPSAiIjsKICB2YXIgTlMgPSAiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbCI7CiAgdmFyIEtJTkRTID0gWyJpbiIsICJicyIsICJiZSIsICJvdXQiXTsKICB2YXIgQ09MT1JTID0geyBpbjogIiMxRjdBNEEiLCBiczogIiNCNzc5MUYiLCBiZTogIiMyQjZDQjAiLCBvdXQ6ICIjNEE1NTY4IiB9OwogIHZhciBJQ09OUyA9IHsgaW46ICLilrYiLCBiczogIuKYlSIsIGJlOiAi4oapIiwgb3V0OiAi4pagIiB9OwogIHZhciBJRExFX01TID0gMTAwMDA7CiAgdmFyIEwgPSB7CiAgICBqYTogeyBrX2luOiAi5Ye65YukIiwga19iczogIuS8keaGqemWi+WniyIsIGtfYmU6ICLkvJHmhqnntYLkuoYiLCBrX291dDogIumAgOWLpCIsIHRpdGxlOiAiUVLmiZPliLsiLCBwaWNrOiAi5omT5Yi744Gu56iu6aGe44KS44K/44OD44OX44GZ44KL44Go44Kr44Oh44Op44GM6LW35YuV44GX44G+44GZIiwKICAgICAgaWRsZTogIuODnOOCv+ODs+OCkuaKvOOBmeOBqOOCq+ODoeODqeOBjOOBpOOBjeOBvuOBmSIsIHN0YXJ0aW5nOiAi44Kr44Oh44Op44KS6LW35YuV44GX44Gm44GE44G+44GZ4oCmIiwgYWltOiAiUVLjgrPjg7zjg4njgpLmnqDjgavlkIjjgo/jgZvjgabjgY/jgaDjgZXjgYQiLCBsZWZ0OiAi44GC44Goe3N956eS44Gn6Ieq5YuV44Kq44OVIiwKICAgICAgc2VuZGluZzogIuiomOmMsuOBl+OBpuOBhOOBvuOBmeKApiIsIG5vQ2FtOiAi44Kr44Oh44Op44KS5L2/44GI44G+44Gb44KT44CC44OW44Op44Km44K244Gu6Kit5a6a44Gn44Kr44Oh44Op44KS6Kix5Y+v44GX44Gm44GP44Gg44GV44GE44CCIiwgb2ZmOiAiUVLmiZPliLvjga/lupfplbfjgYzjgqrjg5XjgavjgZfjgabjgYTjgb7jgZnjgIIiLAogICAgICBub1NlcnZlcjogIuOCteODvOODkOODvOOBq+aOpee2muOBp+OBjeOBvuOBm+OCk+OAgumbu+azouOCkueiuuiqjeOBl+OBpuOBj+OBoOOBleOBhOOAgiIsIG5vdE91cnM6ICLmiZPliLvnlKjjga5RUuOCs+ODvOODieOBp+OBr+OBguOCiuOBvuOBm+OCkyIsIHJlY2VudDogIuacgOi/keOBruaJk+WIuyIsCiAgICAgIGxhdGU6ICLpgYXliLsge2595YiGIiwgZWFybHk6ICLml6npgIAge2595YiGIiwgd29ya2VkOiAi5a6f5YONIHtofeaZgumWkyIsIHNjaGVkOiAi5LqI5a6aIHthfeOAnHtifSIsIGR1cDogIuiomOmMsua4iOOBv++8iOS6jOmHjeiqreOBv+WPluOCiu+8iSIsCiAgICAgIGZyb250OiAi5YmN44Kr44Oh44OpIiwgYmFjazogIuW+jOOCq+ODoeODqSIsIHN0b3A6ICLlgZzmraIiLCBub1VybDogIuOBk+OBruODmuODvOOCuOOBruODquODs+OCr+OBjOato+OBl+OBj+OBguOCiuOBvuOBm+OCk+OAguOCouODl+ODquOBruOAjOKPsSDli6TmgKDjgI3jgYvjgonplovjgY3nm7TjgZfjgabjgY/jgaDjgZXjgYTjgIIiLAogICAgICBmb290OiAi44K544K/44OD44OV44Gv44Ki44OX44Oq44CM5LuK5pel44CN44K/44OWIOKGkuOAjFFS44Kz44O844OJ44KS6KGo56S644CN44CCUVLjga8zMOenkuOBlOOBqOOBq+WkieOCj+OCiuOBvuOBmeOAgiIsCiAgICAgIGF1dG9TdGFydDogIuKWtiDoh6rli5Xoqq3jgb/lj5bjgorjgpLplovlp4siLCBhdXRvT246ICLoh6rli5Xoqq3jgb/lj5bjgorkuK0g4oCUIFFS44KS44GL44GW44GZ44Gg44GR44Gn5omT5Yi744Gn44GN44G+44GZIiwgY2hvb3NlOiAi5omT5Yi744Gu56iu6aGeIiwgYXV0b0luOiAie3N956eS5b6M44Gr44CMe2t944CN44Gn6KiY6Yyy77yI5Yil44Gu56iu6aGe44Gv44K/44OD44OX77yJIiwgY2FuY2VsOiAi44KE44KB44KLIiwgcmVzdW1lOiAi4pa2IOWGjemWiyIgfSwKICAgIHZpOiB7IGtfaW46ICJWw6BvIGNhIiwga19iczogIkLhuq90IMSR4bqndSBuZ2jhu4kiLCBrX2JlOiAiSOG6v3QgZ2nhu50gbmdo4buJIiwga19vdXQ6ICJUYW4gY2EiLCB0aXRsZTogIsSQaeG7g20gZGFuaCBRUiIsIHBpY2s6ICJDaOG6oW0gbG/huqFpIMSRaeG7g20gZGFuaCDEkeG7gyBi4bqtdCBjYW1lcmEiLAogICAgICBpZGxlOiAiQuG6pW0gbsO6dCDEkeG7gyBi4bqtdCBjYW1lcmEiLCBzdGFydGluZzogIsSQYW5nIGLhuq10IGNhbWVyYeKApiIsIGFpbTogIsSQxrBhIG3DoyBRUiB2w6BvIGtodW5nIiwgbGVmdDogIlThu7EgdOG6r3Qgc2F1IHtzfSBnacOieSIsCiAgICAgIHNlbmRpbmc6ICLEkGFuZyBnaGkgbmjhuq1u4oCmIiwgbm9DYW06ICJLaMO0bmcgZMO5bmcgxJHGsOG7o2MgY2FtZXJhLiBIw6N5IGNobyBwaMOpcCBjYW1lcmEgdHJvbmcgY8OgaSDEkeG6t3QgdHLDrG5oIGR1eeG7h3QuIiwgb2ZmOiAiUXXhuqNuIGzDvSDEkWFuZyB04bqvdCDEkWnhu4NtIGRhbmggUVIuIiwKICAgICAgbm9TZXJ2ZXI6ICJLaMO0bmcga+G6v3QgbuG7kWkgxJHGsOG7o2MgbcOheSBjaOG7py4gS2nhu4NtIHRyYSBt4bqhbmcuIiwgbm90T3VyczogIktow7RuZyBwaOG6o2kgbcOjIMSRaeG7g20gZGFuaCIsIHJlY2VudDogIlbhu6thIMSRaeG7g20gZGFuaCIsCiAgICAgIGxhdGU6ICJUcuG7hSB7bn0gcGjDunQiLCBlYXJseTogIlbhu4Egc+G7m20ge259IHBow7p0Iiwgd29ya2VkOiAiTMOgbSB0aOG7sWMge2h9IGdp4budIiwgc2NoZWQ6ICJDYSB7YX3igJN7Yn0iLCBkdXA6ICLEkMOjIGdoaSBy4buTaSAocXXDqXQgMiBs4bqnbikiLAogICAgICBmcm9udDogIkNhbWVyYSB0csaw4bubYyIsIGJhY2s6ICJDYW1lcmEgc2F1Iiwgc3RvcDogIlThuq90Iiwgbm9Vcmw6ICJMaW5rIHRyYW5nIG7DoHkga2jDtG5nIMSRw7puZy4gSMOjeSBt4bufIGzhuqFpIHThu6sgYXBwIOKGkiDij7EgQ2jhuqVtIGPDtG5nLiIsCiAgICAgIGZvb3Q6ICJOaMOibiB2acOqbjogYXBwIOKGkiB0YWIgSMO0bSBuYXkg4oaSIEhp4buHbiBtw6MgUVIuIE3DoyDEkeG7lWkgbeG7l2kgMzAgZ2nDonkuIiwKICAgICAgYXV0b1N0YXJ0OiAi4pa2IELhuq10IHF1w6l0IHThu7EgxJHhu5luZyIsIGF1dG9PbjogIsSQYW5nIHF1w6l0IHThu7EgxJHhu5luZyDigJQgY2jhu4kgY+G6p24gxJHGsGEgbcOjIFFSIHbDoG8iLCBjaG9vc2U6ICJDaOG7jW4gdGhhbyB0w6FjIiwgYXV0b0luOiAiVOG7sSBnaGkgXCJ7a31cIiBzYXUge3N9IGdpw6J5IChjaOG6oW0gxJHhu4MgxJHhu5VpKSIsIGNhbmNlbDogIkh14bu3IiwgcmVzdW1lOiAi4pa2IELhuq10IGzhuqFpIiB9LAogICAgZW46IHsga19pbjogIkNsb2NrIGluIiwga19iczogIkJyZWFrIHN0YXJ0Iiwga19iZTogIkJyZWFrIGVuZCIsIGtfb3V0OiAiQ2xvY2sgb3V0IiwgdGl0bGU6ICJRUiBjbG9jay1pbiIsIHBpY2s6ICJUYXAgYW4gYWN0aW9uIHRvIHR1cm4gdGhlIGNhbWVyYSBvbiIsCiAgICAgIGlkbGU6ICJUYXAgYSBidXR0b24gdG8gc3RhcnQgdGhlIGNhbWVyYSIsIHN0YXJ0aW5nOiAiU3RhcnRpbmcgY2FtZXJh4oCmIiwgYWltOiAiSG9sZCB0aGUgUVIgY29kZSBpbnNpZGUgdGhlIGZyYW1lIiwgbGVmdDogIlR1cm5zIG9mZiBpbiB7c31zIiwKICAgICAgc2VuZGluZzogIlJlY29yZGluZ+KApiIsIG5vQ2FtOiAiQ2FtZXJhIHVuYXZhaWxhYmxlLiBBbGxvdyBjYW1lcmEgYWNjZXNzIGluIHRoZSBicm93c2VyIHNldHRpbmdzLiIsIG9mZjogIlFSIGNsb2NrLWluIGlzIHR1cm5lZCBvZmYgYnkgdGhlIG1hbmFnZXIuIiwKICAgICAgbm9TZXJ2ZXI6ICJDYW4ndCByZWFjaCB0aGUgc2VydmVyLiBDaGVjayB0aGUgY29ubmVjdGlvbi4iLCBub3RPdXJzOiAiTm90IGEgY2xvY2staW4gY29kZSIsIHJlY2VudDogIlJlY2VudCIsCiAgICAgIGxhdGU6ICJ7bn0gbWluIGxhdGUiLCBlYXJseTogIntufSBtaW4gZWFybHkiLCB3b3JrZWQ6ICJXb3JrZWQge2h9IGgiLCBzY2hlZDogIlBsYW4ge2F94oCTe2J9IiwgZHVwOiAiQWxyZWFkeSByZWNvcmRlZCIsCiAgICAgIGZyb250OiAiRnJvbnQgY2FtIiwgYmFjazogIkJhY2sgY2FtIiwgc3RvcDogIlN0b3AiLCBub1VybDogIlRoaXMgcGFnZSBsaW5rIGlzIGludmFsaWQuIFJlb3BlbiBpdCBmcm9tIHRoZSBhcHAgKOKPsSBBdHRlbmRhbmNlKS4iLAogICAgICBmb290OiAiU3RhZmY6IGFwcCDihpIgVG9kYXkg4oaSIFNob3cgUVIuIFRoZSBjb2RlIGNoYW5nZXMgZXZlcnkgMzAgcy4iLAogICAgICBhdXRvU3RhcnQ6ICLilrYgU3RhcnQgYXV0byBzY2FuIiwgYXV0b09uOiAiQXV0byBzY2FubmluZyDigJQganVzdCBzaG93IHlvdXIgUVIgY29kZSIsIGNob29zZTogIkNob29zZSBhY3Rpb24iLCBhdXRvSW46ICJSZWNvcmRpbmcgXCJ7a31cIiBpbiB7c31zICh0YXAgdG8gY2hhbmdlKSIsIGNhbmNlbDogIkNhbmNlbCIsIHJlc3VtZTogIuKWtiBSZXN1bWUiIH0KICB9OwogIC8vIEzhu5dpIGPhu6dhIG3DoXkgY2jhu6cgKHRp4bq/bmcgVmnhu4d0KSDihpIgdGnhur9uZyBOaOG6rXQgLyBBbmgKICB2YXIgRVJSID0gWwogICAgWy9exJBp4buDbSBkYW5oIGLhurFuZyBRUiDEkWFuZyB04bqvdC8sICJRUuaJk+WIu+OBr+OCquODleOBq+OBquOBo+OBpuOBhOOBvuOBmeOAgiIsICJRUiBjbG9jay1pbiBpcyB0dXJuZWQgb2ZmLiJdLAogICAgWy9exJDDonkga2jDtG5nIHBo4bqjaSBtw6MgUVIgxJFp4buDbSBkYW5oLywgIuaJk+WIu+eUqOOBrlFS44Kz44O844OJ44Gn44Gv44GC44KK44G+44Gb44KT44CCIiwgIlRoYXQgaXNuJ3QgYSBjbG9jay1pbiBRUiBjb2RlLiJdLAogICAgWy9eTcOjIFFSIGtow7RuZyBo4bujcCBs4buHLywgIlFS44Kz44O844OJ44GM54Sh5Yq544Gn44GZ44CC44Ki44OX44Oq44GnUVLjgpLplovjgY3nm7TjgZfjgabjgY/jgaDjgZXjgYTjgIIiLCAiSW52YWxpZCBRUiDigJQgcmVvcGVuIGl0IGluIHRoZSBhcHAuIl0sCiAgICBbL15Nw6MgUVIgxJHDoyBo4bq/dCBo4bqhbi8sICJRUuOCs+ODvOODieOBruacieWKueacn+mZkOWIh+OCjOOBp+OBmeOAguOCouODl+ODquOBp+mWi+OBjeebtOOBl+OBpuOBj+OBoOOBleOBhOOAgiIsICJUaGUgUVIgZXhwaXJlZCDigJQgcmVvcGVuIGl0IGluIHRoZSBhcHAuIl0sCiAgICBbL15DaMawYSDEkWnhu4NtIGRhbmggdsOgbyBjYS8sICLjgb7jgaDlh7rli6TjgZfjgabjgYTjgb7jgZvjgpPjgILlhYjjgavjgIzlh7rli6TjgI3jgafoqq3jgb/lj5bjgaPjgabjgY/jgaDjgZXjgYTjgIIiLCAiTm90IGNsb2NrZWQgaW4geWV0IOKAlCBzY2FuIENsb2NrIGluIGZpcnN0LiJdLAogICAgWy9exJBhbmcgbmdo4buJIGdp4bqjaSBsYW8vLCAi5LyR5oap5Lit44Gn44GZ44CC5YWI44Gr44CM5LyR5oap57WC5LqG44CN44Gn6Kqt44G/5Y+W44Gj44Gm44GP44Gg44GV44GE44CCIiwgIk9uIGJyZWFrIOKAlCBzY2FuIEJyZWFrIGVuZCBmaXJzdC4iXSwKICAgIFsvXkNoxrBhIGLhuq90IMSR4bqndSBuZ2jhu4kvLCAi5LyR5oap44GM5aeL44G+44Gj44Gm44GE44G+44Gb44KT44CC5YWI44Gr44CM5LyR5oap6ZaL5aeL44CN44Gn6Kqt44G/5Y+W44Gj44Gm44GP44Gg44GV44GE44CCIiwgIk5vIGJyZWFrIHN0YXJ0ZWQg4oCUIHNjYW4gQnJlYWsgc3RhcnQgZmlyc3QuIl0sCiAgICBbL17EkMOjIMSRaeG7g20gZGFuaCB2w6BvIGNhIGzDumMgKC4rKSBy4buTaS8sICIkMSDjgavjgZnjgafjgavlh7rli6TmuIjjgb/jgafjgZnjgIIiLCAiQWxyZWFkeSBjbG9ja2VkIGluIGF0ICQxLiJdLAogICAgWy9eTmfDoHkgbsOgeSDEkcOjIGPDsyBxdcOhIG5oaeG7gXUvLCAi5LuK5pel44Gu5omT5Yi744GM5aSa44GZ44GO44G+44GZ44CC5bqX6ZW344Gr5L+u5q2j44KS5L6d6aC844GX44Gm44GP44Gg44GV44GE44CCIiwgIlRvbyBtYW55IHB1bmNoZXMgdG9kYXkg4oCUIGFzayB0aGUgbWFuYWdlci4iXSwKICAgIFsvXkjhu4cgdGjhu5FuZyDEkWFuZyBi4bqtbi8sICLmt7fjgb/lkIjjgaPjgabjgYTjgb7jgZnjgILmlbDnp5LlvozjgavjgoLjgYbkuIDluqbjgIIiLCAiQnVzeSDigJQgdHJ5IGFnYWluIGluIGEgZmV3IHNlY29uZHMuIl0sCiAgICBbL15LaMO0bmcgdMOsbSB0aOG6pXkgbmjDom4gdmnDqm4vLCAi44K544K/44OD44OV44GM6KaL44Gk44GL44KK44G+44Gb44KT44CCIiwgIlN0YWZmIG1lbWJlciBub3QgZm91bmQuIl0KICBdOwogIHZhciBsYW5nID0gKGZ1bmN0aW9uKCl7IHRyeSB7IHJldHVybiBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgic2JrLmxhbmciKSB8fCAiamEiOyB9IGNhdGNoIChlKSB7IHJldHVybiAiamEiOyB9IH0pKCk7CiAgaWYgKCFMW2xhbmddKSBsYW5nID0gImphIjsKICBmdW5jdGlvbiB0KGssIHApIHsgdmFyIHMgPSAoTFtsYW5nXSAmJiBMW2xhbmddW2tdKSB8fCBMLmphW2tdIHx8IGs7IGlmIChwKSBPYmplY3Qua2V5cyhwKS5mb3JFYWNoKGZ1bmN0aW9uKHgpeyBzID0gcy5zcGxpdCgieyIgKyB4ICsgIn0iKS5qb2luKHBbeF0pOyB9KTsgcmV0dXJuIHM7IH0KICBmdW5jdGlvbiB0ckVycihtKSB7CiAgICBtID0gU3RyaW5nKG0gfHwgIiIpOwogICAgaWYgKGxhbmcgPT09ICJ2aSIpIHJldHVybiBtOwogICAgZm9yICh2YXIgaSA9IDA7IGkgPCBFUlIubGVuZ3RoOyBpKyspIHsKICAgICAgdmFyIG1tID0gRVJSW2ldWzBdLmV4ZWMobSk7CiAgICAgIGlmIChtbSkgcmV0dXJuIChsYW5nID09PSAiamEiID8gRVJSW2ldWzFdIDogRVJSW2ldWzJdKS5yZXBsYWNlKCIkMSIsIG1tWzFdIHx8ICIiKTsKICAgIH0KICAgIHJldHVybiBtOwogIH0KICBmdW5jdGlvbiBlbCh0YWcsIGF0dHJzLCBraWRzKSB7CiAgICB2YXIgZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhOUywgdGFnKTsKICAgIGlmIChhdHRycykgT2JqZWN0LmtleXMoYXR0cnMpLmZvckVhY2goZnVuY3Rpb24oayl7IGlmIChhdHRyc1trXSAhPSBudWxsICYmIGF0dHJzW2tdICE9PSBmYWxzZSkgZS5zZXRBdHRyaWJ1dGUoaywgYXR0cnNba10gPT09IHRydWUgPyBrIDogYXR0cnNba10pOyB9KTsKICAgIChraWRzIHx8IFtdKS5mb3JFYWNoKGZ1bmN0aW9uKGMpeyBpZiAoYyA9PSBudWxsKSByZXR1cm47IGUuYXBwZW5kQ2hpbGQodHlwZW9mIGMgPT09ICJzdHJpbmciID8gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoYykgOiBjKTsgfSk7CiAgICByZXR1cm4gZTsKICB9CiAgZnVuY3Rpb24gY2xlYXIoZSkgeyB3aGlsZSAoZS5maXJzdENoaWxkKSBlLnJlbW92ZUNoaWxkKGUuZmlyc3RDaGlsZCk7IH0KICBmdW5jdGlvbiBwYWQobikgeyByZXR1cm4gKG4gPCAxMCA/ICIwIiA6ICIiKSArIG47IH0KICBmdW5jdGlvbiBobShtcykgeyB2YXIgZCA9IG5ldyBEYXRlKG1zKTsgcmV0dXJuIGQuZ2V0SG91cnMoKSArICI6IiArIHBhZChkLmdldE1pbnV0ZXMoKSk7IH0KICBmdW5jdGlvbiBobChoKSB7IHZhciBoaCA9IE1hdGguZmxvb3IoaCksIG1tID0gTWF0aC5yb3VuZCgoaCAtIGhoKSAqIDYwKTsgcmV0dXJuIHBhZChoaCkgKyAiOiIgKyBwYWQobW0pOyB9CgogIHZhciBBVVRPX0lETEVfTVMgPSAzICogMzYwMDAwMDsKICB2YXIgUyA9IHsgY29vbDoge30sIGF1dG86IHRydWUsIGF1dG9PbjogZmFsc2UsIHBlbmQ6IG51bGwsIGtpbmQ6IG51bGwsIHN0cmVhbTogbnVsbCwgZmFjaW5nOiAidXNlciIsIHNjYW5uaW5nOiBmYWxzZSwgYnVzeTogZmFsc2UsIGlkbGVBdDogMCwgbGFzdENvZGU6ICIiLCBsYXN0QXQ6IDAsIG92ZXJsYXlVbnRpbDogMCwgcmVjZW50OiBbXSwgb246IHRydWUsIHN0b3JlOiBTVE9SRTAgfTsKICB0cnkgeyBTLmZhY2luZyA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCJzYmsuY2FtIikgfHwgInVzZXIiOyB9IGNhdGNoIChlKSB7fQogIHZhciBSID0ge307ICAgICAgLy8gY8OhYyBwaOG6p24gdOG7rQoKICBmdW5jdGlvbiBhcGkoZm4sIHBhcmFtcykgewogICAgdmFyIHEgPSAiP2FwaT1hdHQmZm49IiArIGVuY29kZVVSSUNvbXBvbmVudChmbikgKyAiJl89IiArIERhdGUubm93KCk7CiAgICBPYmplY3Qua2V5cyhwYXJhbXMgfHwge30pLmZvckVhY2goZnVuY3Rpb24oayl7IHEgKz0gIiYiICsgayArICI9IiArIGVuY29kZVVSSUNvbXBvbmVudChwYXJhbXNba10pOyB9KTsKICAgIHZhciBjdGwgPSB3aW5kb3cuQWJvcnRDb250cm9sbGVyID8gbmV3IEFib3J0Q29udHJvbGxlcigpIDogbnVsbCwgdG0gPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7IGlmIChjdGwpIGN0bC5hYm9ydCgpOyB9LCAxNTAwMCk7CiAgICByZXR1cm4gZmV0Y2goRVhFQyArIHEsIHsgbWV0aG9kOiAiR0VUIiwgcmVkaXJlY3Q6ICJmb2xsb3ciLCBjYWNoZTogIm5vLXN0b3JlIiwgc2lnbmFsOiBjdGwgPyBjdGwuc2lnbmFsIDogdW5kZWZpbmVkIH0pCiAgICAgIC50aGVuKGZ1bmN0aW9uKHIpeyBjbGVhclRpbWVvdXQodG0pOyByZXR1cm4gci5qc29uKCk7IH0pOwogIH0KCiAgZnVuY3Rpb24gYnVpbGQoKSB7CiAgICB2YXIgcm9vdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJraW9zayIpOyBjbGVhcihyb290KTsKICAgIFIuc3RvcmUgPSBlbCgiYiIsIHsgImNsYXNzIjogImstc3RvcmUiIH0sIFtTLnN0b3JlIHx8IHQoInRpdGxlIildKTsKICAgIHZhciBsYW5ncyA9IGVsKCJkaXYiLCB7ICJjbGFzcyI6ICJrLWxhbmciIH0sIFsiamEiLCAidmkiLCAiZW4iXS5tYXAoZnVuY3Rpb24obCl7CiAgICAgIHZhciBiID0gZWwoImJ1dHRvbiIsIHsgdHlwZTogImJ1dHRvbiIsICJjbGFzcyI6IGwgPT09IGxhbmcgPyAib24iIDogIiIgfSwgW2wgPT09ICJqYSIgPyAi5pelIiA6IGwudG9VcHBlckNhc2UoKV0pOwogICAgICBiLmFkZEV2ZW50TGlzdGVuZXIoImNsaWNrIiwgZnVuY3Rpb24oKXsgbGFuZyA9IGw7IHRyeSB7IGxvY2FsU3RvcmFnZS5zZXRJdGVtKCJzYmsubGFuZyIsIGwpOyB9IGNhdGNoIChlKSB7fSBidWlsZCgpOyB9KTsKICAgICAgcmV0dXJuIGI7CiAgICB9KSk7CiAgICBSLmNsb2NrID0gZWwoImRpdiIsIHsgImNsYXNzIjogImstY2xvY2siIH0sIFsiIl0pOwogICAgUi5kYXRlID0gZWwoImRpdiIsIHsgImNsYXNzIjogImstZGF0ZSIgfSwgWyIiXSk7CiAgICBSLnZpZGVvID0gZWwoInZpZGVvIiwgeyBwbGF5c2lubGluZTogInBsYXlzaW5saW5lIiwgbXV0ZWQ6ICJtdXRlZCIsIGF1dG9wbGF5OiAiYXV0b3BsYXkiIH0pOwogICAgUi52aWRlby5tdXRlZCA9IHRydWU7IFIudmlkZW8ucGxheXNJbmxpbmUgPSB0cnVlOwogICAgUi5nbyA9IGVsKCJidXR0b24iLCB7IHR5cGU6ICJidXR0b24iLCAiY2xhc3MiOiAiay1nbyIgfSwgW3QoImF1dG9TdGFydCIpXSk7CiAgICBSLmdvLmFkZEV2ZW50TGlzdGVuZXIoImNsaWNrIiwgZnVuY3Rpb24oKXsgc3RhcnRBdXRvKCk7IH0pOwogICAgUi5waCA9IGVsKCJkaXYiLCB7ICJjbGFzcyI6ICJrLXBoIiB9LCBbZWwoImRpdiIsIHsgImNsYXNzIjogImstcGgtaWMiIH0sIFsi8J+TtyJdKSwgUi5nbywgZWwoImRpdiIsIHsgImNsYXNzIjogImstcGgtc3ViIiB9LCBbdCgiaWRsZSIpXSldKTsKICAgIFIucGljayA9IGVsKCJkaXYiLCB7ICJjbGFzcyI6ICJrLXBpY2siIH0pOwogICAgUi5mcmFtZSA9IGVsKCJkaXYiLCB7ICJjbGFzcyI6ICJrLWZyYW1lIiB9LCBbZWwoImkiKSwgZWwoImkiKSwgZWwoImkiKSwgZWwoImkiKV0pOwogICAgUi50YWcgPSBlbCgiZGl2IiwgeyAiY2xhc3MiOiAiay10YWciIH0sIFsiIl0pOwogICAgUi5jYW0gPSBlbCgiYnV0dG9uIiwgeyB0eXBlOiAiYnV0dG9uIiwgImNsYXNzIjogImstY2FtIiB9LCBbIvCflIQgIiArIHQoUy5mYWNpbmcgPT09ICJ1c2VyIiA/ICJmcm9udCIgOiAiYmFjayIpXSk7CiAgICBSLmNhbS5hZGRFdmVudExpc3RlbmVyKCJjbGljayIsIGZ1bmN0aW9uKCl7IFMuZmFjaW5nID0gUy5mYWNpbmcgPT09ICJ1c2VyIiA/ICJlbnZpcm9ubWVudCIgOiAidXNlciI7IHRyeSB7IGxvY2FsU3RvcmFnZS5zZXRJdGVtKCJzYmsuY2FtIiwgUy5mYWNpbmcpOyB9IGNhdGNoIChlKSB7fSBSLmNhbS5sYXN0Q2hpbGQubm9kZVZhbHVlID0gIvCflIQgIiArIHQoUy5mYWNpbmcgPT09ICJ1c2VyIiA/ICJmcm9udCIgOiAiYmFjayIpOyBpZiAoUy5zdHJlYW0pIHsgc3RvcENhbSgpOyBzdGFydENhbSgpOyB9IH0pOwogICAgUi5zdG9wID0gZWwoImJ1dHRvbiIsIHsgdHlwZTogImJ1dHRvbiIsICJjbGFzcyI6ICJrLXN0b3BiIiB9LCBbIuKPuSAiICsgdCgic3RvcCIpXSk7CiAgICBSLnN0b3AuYWRkRXZlbnRMaXN0ZW5lcigiY2xpY2siLCBmdW5jdGlvbigpeyBnb0lkbGUoKTsgfSk7CiAgICBSLnJlcyA9IGVsKCJkaXYiLCB7ICJjbGFzcyI6ICJrLXJlcyIgfSk7CiAgICBSLmJhciA9IGVsKCJkaXYiLCB7ICJjbGFzcyI6ICJrLWJhciIgfSwgW2VsKCJpIildKTsKICAgIFIuc3RhdHVzID0gZWwoImRpdiIsIHsgImNsYXNzIjogImstc3RhdHVzIiB9LCBbdCgicGljayIpXSk7CiAgICBSLnN0YWdlID0gZWwoImRpdiIsIHsgImNsYXNzIjogImstc3RhZ2UiIH0sIFtSLnZpZGVvLCBSLnBoLCBSLmZyYW1lLCBSLnRhZywgUi5jYW0sIFIuc3RvcCwgUi5yZXMsIFIucGlja10pOwogICAgUi5idG5zID0ge307CiAgICB2YXIga2luZHMgPSBlbCgiZGl2IiwgeyAiY2xhc3MiOiAiay1raW5kcyIgfSwgS0lORFMubWFwKGZ1bmN0aW9uKGspewogICAgICB2YXIgYiA9IGVsKCJidXR0b24iLCB7IHR5cGU6ICJidXR0b24iLCAiY2xhc3MiOiAiay1raW5kIiwgc3R5bGU6ICItLWFrOiIgKyBDT0xPUlNba10gfSwgW2VsKCJpIiwgbnVsbCwgW0lDT05TW2tdXSksIGVsKCJiIiwgbnVsbCwgW3QoImtfIiArIGspXSldKTsKICAgICAgYi5hZGRFdmVudExpc3RlbmVyKCJjbGljayIsIGZ1bmN0aW9uKCl7IHBpY2soayk7IH0pOwogICAgICBSLmJ0bnNba10gPSBiOyByZXR1cm4gYjsKICAgIH0pKTsKICAgIFIucmVjZW50ID0gZWwoImRpdiIsIHsgImNsYXNzIjogImstcmVjZW50IiB9KTsKICAgIHJvb3QuYXBwZW5kQ2hpbGQoZWwoImRpdiIsIHsgImNsYXNzIjogImstdG9wIiB9LCBbUi5zdG9yZSwgbGFuZ3NdKSk7CiAgICByb290LmFwcGVuZENoaWxkKGVsKCJkaXYiLCB7ICJjbGFzcyI6ICJrLXRpbWUiIH0sIFtSLmNsb2NrLCBSLmRhdGVdKSk7CiAgICByb290LmFwcGVuZENoaWxkKGVsKCJkaXYiLCB7ICJjbGFzcyI6ICJrLW1haW4iIH0sIFtlbCgiZGl2IiwgeyAiY2xhc3MiOiAiay1sZWZ0IiB9LCBbUi5zdGFnZSwgUi5iYXIsIFIuc3RhdHVzXSksIGtpbmRzXSkpOwogICAgcm9vdC5hcHBlbmRDaGlsZChSLnJlY2VudCk7CiAgICByb290LmFwcGVuZENoaWxkKGVsKCJkaXYiLCB7ICJjbGFzcyI6ICJrLWZvb3QiIH0sIFt0KCJmb290IildKSk7CiAgICBwYWludFJlY2VudCgpOyB0aWNrQ2xvY2soKTsgcGFpbnRTdGF0ZSgpOwogICAgaWYgKCFFWEVDKSBzZXRTdGF0dXModCgibm9VcmwiKSwgdHJ1ZSk7CiAgICBlbHNlIGlmICghUy5vbikgc2V0U3RhdHVzKHQoIm9mZiIpLCB0cnVlKTsKICB9CiAgZnVuY3Rpb24gdGlja0Nsb2NrKCkgewogICAgdmFyIG4gPSBuZXcgRGF0ZSgpLCBXID0geyBqYTogIuaXpeaciOeBq+awtOacqOmHkeWcnyIsIHZpOiBbIkNOIiwgIlQyIiwgIlQzIiwgIlQ0IiwgIlQ1IiwgIlQ2IiwgIlQ3Il0sIGVuOiBbIlN1biIsICJNb24iLCAiVHVlIiwgIldlZCIsICJUaHUiLCAiRnJpIiwgIlNhdCJdIH1bbGFuZ107CiAgICBpZiAoUi5jbG9jaykgeyBjbGVhcihSLmNsb2NrKTsgUi5jbG9jay5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShwYWQobi5nZXRIb3VycygpKSArICI6IiArIHBhZChuLmdldE1pbnV0ZXMoKSkpKTsgUi5jbG9jay5hcHBlbmRDaGlsZChlbCgic21hbGwiLCBudWxsLCBbIjoiICsgcGFkKG4uZ2V0U2Vjb25kcygpKV0pKTsgfQogICAgaWYgKFIuZGF0ZSkgUi5kYXRlLnRleHRDb250ZW50ID0gbGFuZyA9PT0gImphIiA/IChuLmdldE1vbnRoKCkgKyAxKSArICLmnIgiICsgbi5nZXREYXRlKCkgKyAi5pel77yIIiArIFdbbi5nZXREYXkoKV0gKyAi77yJIiA6IChuLmdldE1vbnRoKCkgKyAxKSArICIvIiArIG4uZ2V0RGF0ZSgpICsgIiAoIiArIFdbbi5nZXREYXkoKV0gKyAiKSI7CiAgICAvLyDEkeG6v20gbmfGsOG7o2MgdOG7sSB04bqvdAogICAgaWYgKFMuc2Nhbm5pbmcgJiYgUy5pZGxlQXQgJiYgIVMua2luZCAmJiBTLmF1dG9PbikgewogICAgICBpZiAoIVMuYnVzeSAmJiAhUy5wZW5kICYmIERhdGUubm93KCkgPiBTLm92ZXJsYXlVbnRpbCkgc2V0U3RhdHVzKHQoImF1dG9PbiIpKTsKICAgICAgaWYgKERhdGUubm93KCkgPiBTLmlkbGVBdCAmJiAhUy5idXN5ICYmICFTLnBlbmQpIGdvSWRsZSgpOwogICAgfSBlbHNlIGlmIChTLnNjYW5uaW5nICYmIFMuaWRsZUF0KSB7CiAgICAgIHZhciBsZWZ0ID0gTWF0aC5tYXgoMCwgUy5pZGxlQXQgLSBEYXRlLm5vdygpKTsKICAgICAgdmFyIGJpID0gUi5iYXIuZmlyc3RDaGlsZDsgaWYgKGJpKSBiaS5zdHlsZS53aWR0aCA9IChsZWZ0IC8gSURMRV9NUyAqIDEwMCkgKyAiJSI7CiAgICAgIGlmICghUy5idXN5ICYmIERhdGUubm93KCkgPiBTLm92ZXJsYXlVbnRpbCkgc2V0U3RhdHVzKHQoImFpbSIpICsgIiDCtyAiICsgdCgibGVmdCIsIHsgczogTWF0aC5jZWlsKGxlZnQgLyAxMDAwKSB9KSk7CiAgICAgIGlmIChsZWZ0IDw9IDAgJiYgIVMuYnVzeSkgewogICAgICAgIGlmIChTLnByZXZBdXRvKSB7IFMucHJldkF1dG8gPSBmYWxzZTsgUy5raW5kID0gbnVsbDsgUy5hdXRvT24gPSB0cnVlOyBTLmlkbGVBdCA9IERhdGUubm93KCkgKyBBVVRPX0lETEVfTVM7IHBhaW50U3RhdGUoKTsgaWYgKGJpKSBiaS5zdHlsZS53aWR0aCA9ICIwIjsgfQogICAgICAgIGVsc2UgZ29JZGxlKCk7CiAgICAgIH0KICAgIH0KICAgIGlmIChTLnBlbmQpIHRpY2tQaWNrKCk7CiAgfQogIGZ1bmN0aW9uIHNldFN0YXR1cyhzLCBiYWQpIHsgaWYgKCFSLnN0YXR1cykgcmV0dXJuOyBSLnN0YXR1cy50ZXh0Q29udGVudCA9IHM7IFIuc3RhdHVzLnNldEF0dHJpYnV0ZSgiY2xhc3MiLCAiay1zdGF0dXMiICsgKGJhZCA/ICIgYmFkIiA6ICIiKSk7IH0KICBmdW5jdGlvbiBwYWludFN0YXRlKCkgewogICAgdmFyIGxpdmUgPSAhIVMuc3RyZWFtOwogICAgUi5zdGFnZS5zZXRBdHRyaWJ1dGUoImNsYXNzIiwgImstc3RhZ2UiICsgKGxpdmUgPyAiIGxpdmUiIDogIiIpICsgKFMuZmFjaW5nID09PSAidXNlciIgPyAiIG1pcnJvciIgOiAiIikpOwogICAgUi5iYXIuc2V0QXR0cmlidXRlKCJjbGFzcyIsICJrLWJhciIgKyAobGl2ZSA/ICIgbGl2ZSIgOiAiIikpOwogICAgS0lORFMuZm9yRWFjaChmdW5jdGlvbihrKXsgUi5idG5zW2tdLnNldEF0dHJpYnV0ZSgiY2xhc3MiLCAiay1raW5kIiArIChTLmtpbmQgPT09IGsgJiYgbGl2ZSA/ICIgc2VsIiA6ICIiKSk7IH0pOwogICAgaWYgKFMua2luZCAmJiBsaXZlKSB7IFIudGFnLnRleHRDb250ZW50ID0gSUNPTlNbUy5raW5kXSArICIgIiArIHQoImtfIiArIFMua2luZCk7IFIudGFnLnN0eWxlLmJhY2tncm91bmQgPSBDT0xPUlNbUy5raW5kXTsgfQogICAgZWxzZSBpZiAoUy5hdXRvT24gJiYgbGl2ZSkgeyBSLnRhZy50ZXh0Q29udGVudCA9ICJBVVRPIjsgUi50YWcuc3R5bGUuYmFja2dyb3VuZCA9ICIjMUY3QTRBIjsgfQogICAgZWxzZSBSLnRhZy50ZXh0Q29udGVudCA9ICIiOwogIH0KICBmdW5jdGlvbiBwYWludFJlY2VudCgpIHsKICAgIGNsZWFyKFIucmVjZW50KTsKICAgIGlmICghUy5yZWNlbnQubGVuZ3RoKSByZXR1cm47CiAgICBSLnJlY2VudC5hcHBlbmRDaGlsZChlbCgiZGl2IiwgeyAiY2xhc3MiOiAiay1yZWMtaCIgfSwgW3QoInJlY2VudCIpXSkpOwogICAgUy5yZWNlbnQuc2xpY2UoMCwgOCkuZm9yRWFjaChmdW5jdGlvbihyKXsKICAgICAgUi5yZWNlbnQuYXBwZW5kQ2hpbGQoZWwoImRpdiIsIHsgImNsYXNzIjogImstcmVjIiArIChyLmVyciA/ICIgZXJyIiA6ICIiKSB9LCBbCiAgICAgICAgZWwoInNwYW4iLCB7ICJjbGFzcyI6ICJrLWRvdCIsIHN0eWxlOiAiYmFja2dyb3VuZDoiICsgKHIuZXJyID8gIiNDNTMwMzAiIDogQ09MT1JTW3Iua2luZF0pIH0pLAogICAgICAgIGVsKCJiIiwgbnVsbCwgW3IuZXJyID8gIuKclSIgOiByLm5hbWVdKSwgZWwoInNwYW4iLCBudWxsLCBbci5lcnIgPyByLmVyciA6IHQoImtfIiArIHIua2luZCldKSwgZWwoImVtIiwgbnVsbCwgW3IuaG1dKV0pKTsKICAgIH0pOwogIH0KCiAgLy8gLS0tLSBDYW1lcmEgLS0tLQogIHZhciB3YWtlID0gbnVsbDsKICBmdW5jdGlvbiBrZWVwQXdha2UoKSB7IHRyeSB7IGlmIChuYXZpZ2F0b3Iud2FrZUxvY2sgJiYgIXdha2UpIG5hdmlnYXRvci53YWtlTG9jay5yZXF1ZXN0KCJzY3JlZW4iKS50aGVuKGZ1bmN0aW9uKHcpeyB3YWtlID0gdzsgdy5hZGRFdmVudExpc3RlbmVyKCJyZWxlYXNlIiwgZnVuY3Rpb24oKXsgd2FrZSA9IG51bGw7IH0pOyB9KS5jYXRjaChmdW5jdGlvbigpe30pOyB9IGNhdGNoIChlKSB7fSB9CiAgLyoqIENo4bq/IMSR4buZIHThu7EgxJHhu5luZzogY2FtZXJhIGLhuq10IGxpw6puIHThu6VjLCDEkcawYSBtw6MgdsOgbyBsw6Agbmjhuq1uIOKAlCBraMO0bmcgY+G6p24gY2jhu41uIHRyxrDhu5tjLiAqLwogIGZ1bmN0aW9uIHN0YXJ0QXV0bygpIHsKICAgIGlmICghRVhFQykgeyBzZXRTdGF0dXModCgibm9VcmwiKSwgdHJ1ZSk7IHJldHVybjsgfQogICAgaWYgKCFTLm9uKSB7IHNldFN0YXR1cyh0KCJvZmYiKSwgdHJ1ZSk7IHJldHVybjsgfQogICAgUy5raW5kID0gbnVsbDsgUy5hdXRvT24gPSB0cnVlOyBTLmlkbGVBdCA9IERhdGUubm93KCkgKyBBVVRPX0lETEVfTVM7CiAgICBrZWVwQXdha2UoKTsKICAgIHRyeSB7IGxvY2FsU3RvcmFnZS5zZXRJdGVtKCJzYmsuYXV0byIsICIxIik7IH0gY2F0Y2ggKGUpIHt9CiAgICBpZiAoIVMuc3RyZWFtKSBzdGFydENhbSgpOyBlbHNlIHsgcGFpbnRTdGF0ZSgpOyBzZXRTdGF0dXModCgiYXV0b09uIikpOyB9CiAgfQogIGZ1bmN0aW9uIHBpY2soaykgewogICAgaWYgKCFFWEVDKSB7IHNldFN0YXR1cyh0KCJub1VybCIpLCB0cnVlKTsgcmV0dXJuOyB9CiAgICBpZiAoIVMub24pIHsgc2V0U3RhdHVzKHQoIm9mZiIpLCB0cnVlKTsgcmV0dXJuOyB9CiAgICBpZiAoUy5wZW5kKSB7IGNob29zZShrKTsgcmV0dXJuOyB9CiAgICBTLnByZXZBdXRvID0gUy5hdXRvT24gfHwgUy5wcmV2QXV0bzsgUy5raW5kID0gazsgUy5hdXRvT24gPSBmYWxzZTsgUy5pZGxlQXQgPSBEYXRlLm5vdygpICsgSURMRV9NUzsKICAgIGtlZXBBd2FrZSgpOwogICAgaWYgKCFTLnN0cmVhbSkgc3RhcnRDYW0oKTsgZWxzZSBwYWludFN0YXRlKCk7CiAgfQogIGZ1bmN0aW9uIHN0YXJ0Q2FtKCkgewogICAgc2V0U3RhdHVzKHQoInN0YXJ0aW5nIikpOwogICAgaWYgKCFuYXZpZ2F0b3IubWVkaWFEZXZpY2VzIHx8ICFuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSkgeyBzZXRTdGF0dXModCgibm9DYW0iKSwgdHJ1ZSk7IHJldHVybjsgfQogICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoeyB2aWRlbzogeyBmYWNpbmdNb2RlOiB7IGlkZWFsOiBTLmZhY2luZyB9LCB3aWR0aDogeyBpZGVhbDogMTI4MCB9LCBoZWlnaHQ6IHsgaWRlYWw6IDcyMCB9IH0sIGF1ZGlvOiBmYWxzZSB9KS50aGVuKGZ1bmN0aW9uKHN0KXsKICAgICAgUy5zdHJlYW0gPSBzdDsgUi52aWRlby5zcmNPYmplY3QgPSBzdDsKICAgICAgdmFyIHAgPSBSLnZpZGVvLnBsYXkoKTsgaWYgKHAgJiYgcC5jYXRjaCkgcC5jYXRjaChmdW5jdGlvbigpe30pOwogICAgICBTLnNjYW5uaW5nID0gdHJ1ZTsgUy5pZGxlQXQgPSBEYXRlLm5vdygpICsgKFMuYXV0b09uICYmICFTLmtpbmQgPyBBVVRPX0lETEVfTVMgOiBJRExFX01TKTsKICAgICAgcGFpbnRTdGF0ZSgpOyBzZXRTdGF0dXMoUy5hdXRvT24gJiYgIVMua2luZCA/IHQoImF1dG9PbiIpIDogdCgiYWltIikpOyBsb29wKCk7CiAgICB9KS5jYXRjaChmdW5jdGlvbigpeyBTLnN0cmVhbSA9IG51bGw7IHBhaW50U3RhdGUoKTsgc2V0U3RhdHVzKHQoIm5vQ2FtIiksIHRydWUpOyB9KTsKICB9CiAgZnVuY3Rpb24gc3RvcENhbSgpIHsKICAgIFMuc2Nhbm5pbmcgPSBmYWxzZTsKICAgIGlmIChTLnN0cmVhbSkgeyB0cnkgeyBTLnN0cmVhbS5nZXRUcmFja3MoKS5mb3JFYWNoKGZ1bmN0aW9uKHRyKXsgdHIuc3RvcCgpOyB9KTsgfSBjYXRjaCAoZSkge30gfQogICAgUy5zdHJlYW0gPSBudWxsOyB0cnkgeyBSLnZpZGVvLnNyY09iamVjdCA9IG51bGw7IH0gY2F0Y2ggKGUpIHt9CiAgfQogIGZ1bmN0aW9uIGdvSWRsZSgpIHsgc3RvcENhbSgpOyBTLmtpbmQgPSBudWxsOyBTLmF1dG9PbiA9IGZhbHNlOyBTLnByZXZBdXRvID0gZmFsc2U7IFMucGVuZCA9IG51bGw7IFMuaWRsZUF0ID0gMDsgcGFpbnRQaWNrKCk7IHBhaW50U3RhdGUoKTsgc2V0U3RhdHVzKHQoInBpY2siKSk7IHZhciBiaSA9IFIuYmFyLmZpcnN0Q2hpbGQ7IGlmIChiaSkgYmkuc3R5bGUud2lkdGggPSAiMCI7IGlmIChSLmdvKSBSLmdvLnRleHRDb250ZW50ID0gdCgicmVzdW1lIik7IH0KCiAgdmFyIEJEID0gbnVsbDsKICB0cnkgeyBCRCA9ICgiQmFyY29kZURldGVjdG9yIiBpbiB3aW5kb3cpID8gbmV3IHdpbmRvdy5CYXJjb2RlRGV0ZWN0b3IoeyBmb3JtYXRzOiBbInFyX2NvZGUiXSB9KSA6IG51bGw7IH0gY2F0Y2ggKGUpIHsgQkQgPSBudWxsOyB9CiAgdmFyIENWID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKE5TLCAiY2FudmFzIiksIENYID0gbnVsbCwgblRyeSA9IDA7CiAgZnVuY3Rpb24gcmVhZEZyYW1lKCkgewogICAgdmFyIHYgPSBSLnZpZGVvOyBpZiAoIXYudmlkZW9XaWR0aCkgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKTsKICAgIGlmIChCRCkgcmV0dXJuIEJELmRldGVjdCh2KS50aGVuKGZ1bmN0aW9uKHIpeyByZXR1cm4gciAmJiByLmxlbmd0aCA/IHJbMF0ucmF3VmFsdWUgOiBudWxsOyB9KS5jYXRjaChmdW5jdGlvbigpeyByZXR1cm4gbnVsbDsgfSk7CiAgICBuVHJ5Kys7CiAgICB2YXIgbWF4ID0gblRyeSAlIDQgPT09IDAgPyAxMDAwIDogNjQwLCBzYyA9IE1hdGgubWluKDEsIG1heCAvIE1hdGgubWF4KHYudmlkZW9XaWR0aCwgdi52aWRlb0hlaWdodCkpOwogICAgdmFyIHcgPSBNYXRoLnJvdW5kKHYudmlkZW9XaWR0aCAqIHNjKSwgaCA9IE1hdGgucm91bmQodi52aWRlb0hlaWdodCAqIHNjKTsKICAgIGlmIChDVi53aWR0aCAhPT0gdyB8fCBDVi5oZWlnaHQgIT09IGgpIHsgQ1Yud2lkdGggPSB3OyBDVi5oZWlnaHQgPSBoOyBDWCA9IG51bGw7IH0KICAgIENYID0gQ1ggfHwgQ1YuZ2V0Q29udGV4dCgiMmQiLCB7IHdpbGxSZWFkRnJlcXVlbnRseTogdHJ1ZSB9KTsKICAgIENYLmRyYXdJbWFnZSh2LCAwLCAwLCB3LCBoKTsKICAgIHRyeSB7IHJldHVybiBQcm9taXNlLnJlc29sdmUoUVJELmRlY29kZShDWC5nZXRJbWFnZURhdGEoMCwgMCwgdywgaCkpKTsgfSBjYXRjaCAoZSkgeyByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG51bGwpOyB9CiAgfQogIGZ1bmN0aW9uIGxvb3AoKSB7CiAgICBpZiAoIVMuc2Nhbm5pbmcpIHJldHVybjsKICAgIGlmICghUy5idXN5ICYmICFTLnBlbmQgJiYgRGF0ZS5ub3coKSA+IFMub3ZlcmxheVVudGlsKSB7CiAgICAgIFMuYnVzeSA9IHRydWU7CiAgICAgIHJlYWRGcmFtZSgpLnRoZW4oZnVuY3Rpb24odHh0KXsKICAgICAgICBpZiAodHh0ICYmIFMuc2Nhbm5pbmcpIHJldHVybiBnb3QoU3RyaW5nKHR4dCkpOwogICAgICB9KS50aGVuKGZ1bmN0aW9uKCl7IFMuYnVzeSA9IGZhbHNlOyB9LCBmdW5jdGlvbigpeyBTLmJ1c3kgPSBmYWxzZTsgfSk7CiAgICB9CiAgICBzZXRUaW1lb3V0KGxvb3AsIDgwKTsKICB9CiAgZnVuY3Rpb24gZ290KHR4dCkgewogICAgaWYgKCEvXlNCQVsxMl06Ly50ZXN0KHR4dCkpIHsgaWYgKERhdGUubm93KCkgLSBTLmxhc3RBdCA+IDI1MDApIHsgUy5sYXN0QXQgPSBEYXRlLm5vdygpOyBzZXRTdGF0dXModCgibm90T3VycyIpLCB0cnVlKTsgfSByZXR1cm47IH0KICAgIGlmICh0eHQgPT09IFMubGFzdENvZGUgJiYgRGF0ZS5ub3coKSAtIFMubGFzdEF0IDwgMjUwMDApIHJldHVybjsgICAgICAgICAgLy8gduG7q2EgZ2hpIG3DoyBuw6B5IHLhu5NpCiAgICB2YXIgZW1wID0gdHh0LnNwbGl0KCI6IilbMV0gfHwgIiI7CiAgICBpZiAoIVMua2luZCAmJiBTLmNvb2xbZW1wXSAmJiBEYXRlLm5vdygpIDwgUy5jb29sW2VtcF0pIHJldHVybjsgICAgICAgICAgLy8gdOG7sSDEkeG7mW5nOiBuZ8aw4budaSB24burYSBjaOG6pW0geG9uZyDihpIgNjAgZ2nDonkga2jDtG5nIG5o4bqtbiBs4bqhaSAobcOjIMSR4buVaSBt4buXaSAzMCBnacOieSkKICAgIFMubGFzdENvZGUgPSB0eHQ7IFMubGFzdEF0ID0gRGF0ZS5ub3coKTsKICAgIGlmICghUy5raW5kKSB7CiAgICAgIHNldFN0YXR1cyh0KCJzZW5kaW5nIikpOwogICAgICByZXR1cm4gYXBpKCJ3aG8iLCB7IGNvZGU6IHR4dCB9KS50aGVuKGZ1bmN0aW9uKGopewogICAgICAgIGlmICghaiB8fCAhai5vaykgdGhyb3cgbmV3IEVycm9yKChqICYmIGoubSkgfHwgIj8iKTsKICAgICAgICBiZWVwKHRydWUpOwogICAgICAgIFMucGVuZCA9IHsgY29kZTogdHh0LCB3OiBqLnIsIHN1Zzogai5yLnN1ZywgdW50aWw6IERhdGUubm93KCkgKyAzMDAwLCBhdXRvOiBTLmF1dG8gJiYgai5yLmF1dG8gIT09IGZhbHNlLCBhdDogRGF0ZS5ub3coKSB9OwogICAgICAgIFMuaWRsZUF0ID0gRGF0ZS5ub3coKSArIEFVVE9fSURMRV9NUzsgc2V0U3RhdHVzKCIiKTsgcGFpbnRQaWNrKCk7CiAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGUpeyBmYWlsKGUsIG51bGwpOyB9KTsKICAgIH0KICAgIHJldHVybiBwdW5jaE5vdyh0eHQsIFMua2luZCk7CiAgfQogIGZ1bmN0aW9uIGNob29zZShrKSB7CiAgICB2YXIgUCA9IFMucGVuZDsgaWYgKCFQIHx8IFAuc2VuZGluZykgcmV0dXJuOwogICAgaWYgKFAudy5hbGxvd2VkLmluZGV4T2YoaykgPT09IC0xKSByZXR1cm47CiAgICBQLnNlbmRpbmcgPSB0cnVlOyBTLnBlbmQgPSBudWxsOyBwYWludFBpY2soKTsKICAgIFMuY29vbFtQLmNvZGUuc3BsaXQoIjoiKVsxXSB8fCAiIl0gPSBEYXRlLm5vdygpICsgNjAwMDA7CiAgICBwdW5jaE5vdyhQLmNvZGUsIGspOwogIH0KICBmdW5jdGlvbiBwYWludFBpY2soKSB7CiAgICBjbGVhcihSLnBpY2spOyBSLmNkID0gbnVsbDsgUi5wbm90ZSA9IG51bGw7CiAgICB2YXIgUCA9IFMucGVuZDsKICAgIGlmICghUCkgeyBSLnBpY2suc2V0QXR0cmlidXRlKCJjbGFzcyIsICJrLXBpY2siKTsgcmV0dXJuOyB9CiAgICBSLnBpY2suc2V0QXR0cmlidXRlKCJjbGFzcyIsICJrLXBpY2sgc2hvdyIpOwogICAgUi5waWNrLmFwcGVuZENoaWxkKGVsKCJkaXYiLCB7ICJjbGFzcyI6ICJrLXBubSIgfSwgW1Audy5uYW1lXSkpOwogICAgaWYgKFAudy5saXN0ICYmIFAudy5saXN0Lmxlbmd0aCkgUi5waWNrLmFwcGVuZENoaWxkKGVsKCJkaXYiLCB7ICJjbGFzcyI6ICJrLXB0b2RheSIgfSwgW1Audy5saXN0Lm1hcChmdW5jdGlvbih4KXsgcmV0dXJuIHQoImtfIiArIHguaykgKyAiICIgKyB4LmhtOyB9KS5qb2luKCIgwrcgIildKSk7CiAgICBSLnBpY2suYXBwZW5kQ2hpbGQoZWwoImRpdiIsIHsgImNsYXNzIjogImstcGtpbmRzIiB9LCBLSU5EUy5tYXAoZnVuY3Rpb24oayl7CiAgICAgIHZhciBvayA9IFAudy5hbGxvd2VkLmluZGV4T2YoaykgIT09IC0xOwogICAgICB2YXIgYiA9IGVsKCJidXR0b24iLCB7IHR5cGU6ICJidXR0b24iLCAiY2xhc3MiOiAiay1wayIgKyAoayA9PT0gUC5zdWcgPyAiIHN1ZyIgOiAiIiksIHN0eWxlOiAiLS1hazoiICsgQ09MT1JTW2tdLCBkaXNhYmxlZDogb2sgPyBudWxsIDogImRpc2FibGVkIiB9LCBbZWwoImkiLCBudWxsLCBbSUNPTlNba11dKSwgZWwoImIiLCBudWxsLCBbdCgia18iICsgayldKV0pOwogICAgICBpZiAoayA9PT0gUC5zdWcgJiYgUC5hdXRvKSB7IFIuY2QgPSBlbCgic3BhbiIsIHsgImNsYXNzIjogImstY2QiLCBzdHlsZTogIi0tcDoxIiB9LCBbIjMiXSk7IGIuYXBwZW5kQ2hpbGQoUi5jZCk7IH0KICAgICAgYi5hZGRFdmVudExpc3RlbmVyKCJjbGljayIsIGZ1bmN0aW9uKCl7IGNob29zZShrKTsgfSk7CiAgICAgIHJldHVybiBiOwogICAgfSkpKTsKICAgIGlmIChQLmF1dG8pIHsgUi5wbm90ZSA9IGVsKCJkaXYiLCB7ICJjbGFzcyI6ICJrLXBub3RlIiB9LCBbIiJdKTsgUi5waWNrLmFwcGVuZENoaWxkKFIucG5vdGUpOyB9CiAgICBlbHNlIFIucGljay5hcHBlbmRDaGlsZChlbCgiZGl2IiwgeyAiY2xhc3MiOiAiay1wbm90ZSIgfSwgW3QoImNob29zZSIpXSkpOwogICAgdmFyIGMgPSBlbCgiYnV0dG9uIiwgeyB0eXBlOiAiYnV0dG9uIiwgImNsYXNzIjogImstcGNhbmNlbCIgfSwgW3QoImNhbmNlbCIpXSk7CiAgICBjLmFkZEV2ZW50TGlzdGVuZXIoImNsaWNrIiwgZnVuY3Rpb24oKXsgaWYgKFMucGVuZCkgUy5jb29sW1MucGVuZC5jb2RlLnNwbGl0KCI6IilbMV0gfHwgIiJdID0gRGF0ZS5ub3coKSArIDUwMDA7IFMucGVuZCA9IG51bGw7IFMubGFzdENvZGUgPSAiIjsgcGFpbnRQaWNrKCk7IH0pOwogICAgUi5waWNrLmFwcGVuZENoaWxkKGMpOwogICAgdGlja1BpY2soKTsKICB9CiAgZnVuY3Rpb24gdGlja1BpY2soKSB7CiAgICB2YXIgUCA9IFMucGVuZDsgaWYgKCFQKSByZXR1cm47CiAgICBpZiAoRGF0ZS5ub3coKSAtIFAuYXQgPiAzMDAwMCkgeyBTLnBlbmQgPSBudWxsOyBTLmxhc3RDb2RlID0gIiI7IHBhaW50UGljaygpOyByZXR1cm47IH0gICAgIC8vIGtow7RuZyBhaSBjaOG7jW4g4oaSIGh14bu3CiAgICBpZiAoIVAuYXV0bykgcmV0dXJuOwogICAgdmFyIGxlZnQgPSBNYXRoLm1heCgwLCBQLnVudGlsIC0gRGF0ZS5ub3coKSk7CiAgICBpZiAobGVmdCA8PSAwKSB7IGNob29zZShQLnN1Zyk7IHJldHVybjsgfQogICAgaWYgKFIuY2QpIHsgUi5jZC50ZXh0Q29udGVudCA9IFN0cmluZyhNYXRoLmNlaWwobGVmdCAvIDEwMDApKTsgUi5jZC5zZXRBdHRyaWJ1dGUoInN0eWxlIiwgIi0tcDoiICsgKGxlZnQgLyAzMDAwKS50b0ZpeGVkKDMpKTsgfQogICAgaWYgKFIucG5vdGUpIFIucG5vdGUudGV4dENvbnRlbnQgPSB0KCJhdXRvSW4iLCB7IHM6IE1hdGguY2VpbChsZWZ0IC8gMTAwMCksIGs6IHQoImtfIiArIFAuc3VnKSB9KTsKICB9CiAgZnVuY3Rpb24gZmFpbChlLCBraW5kKSB7CiAgICBiZWVwKGZhbHNlKTsKICAgIHZhciBtc2cgPSBlICYmIGUubmFtZSA9PT0gIkFib3J0RXJyb3IiID8gdCgibm9TZXJ2ZXIiKSA6IChlICYmIGUubWVzc2FnZSAmJiBlLm1lc3NhZ2UgIT09ICJGYWlsZWQgdG8gZmV0Y2giICYmICEvTmV0d29ya0Vycm9yfExvYWQgZmFpbGVkfEpTT04vLnRlc3QoZS5tZXNzYWdlKSA/IHRyRXJyKGUubWVzc2FnZSkgOiB0KCJub1NlcnZlciIpKTsKICAgIFMucmVjZW50LnVuc2hpZnQoeyBlcnI6IG1zZywga2luZDoga2luZCB8fCAiaW4iLCBobTogaG0oRGF0ZS5ub3coKSkgfSk7IHBhaW50UmVjZW50KCk7CiAgICBTLmxhc3RDb2RlID0gIiI7CiAgICBzaG93UmVzKGZhbHNlLCAiIzlCMUMxQyIsIFtlbCgiZGl2IiwgeyAiY2xhc3MiOiAiay1vayIgfSwgWyIhIl0pLCBlbCgiZGl2IiwgeyAiY2xhc3MiOiAiay1tc2ciIH0sIFttc2ddKV0sIDMyMDApOwogIH0KICBmdW5jdGlvbiBwdW5jaE5vdyh0eHQsIGtpbmQpIHsKICAgIHNldFN0YXR1cyh0KCJzZW5kaW5nIikpOwogICAgcmV0dXJuIGFwaSgicHVuY2giLCB7IGNvZGU6IHR4dCwga2luZDoga2luZCB9KS50aGVuKGZ1bmN0aW9uKGopewogICAgICBpZiAoIWogfHwgIWoub2spIHRocm93IG5ldyBFcnJvcigoaiAmJiBqLm0pIHx8ICI/Iik7CiAgICAgIHZhciByID0gai5yOyBiZWVwKHRydWUpOwogICAgICBTLnJlY2VudC51bnNoaWZ0KHsgbmFtZTogci5uYW1lLCBraW5kOiByLmtpbmQsIGhtOiByLmhtIH0pOyBwYWludFJlY2VudCgpOwogICAgICB2YXIgbm90ZXMgPSBbXTsKICAgICAgaWYgKHIuZHVwKSBub3Rlcy5wdXNoKHQoImR1cCIpKTsKICAgICAgaWYgKHIubGF0ZSkgbm90ZXMucHVzaCgi4pqgICIgKyB0KCJsYXRlIiwgeyBuOiByLmxhdGUgfSkpOwogICAgICBpZiAoci5lYXJseSkgbm90ZXMucHVzaCh0KCJlYXJseSIsIHsgbjogci5lYXJseSB9KSk7CiAgICAgIGlmIChyLmtpbmQgPT09ICJvdXQiICYmIHIud29yayAhPSBudWxsKSBub3Rlcy5wdXNoKHQoIndvcmtlZCIsIHsgaDogci53b3JrIH0pKTsKICAgICAgaWYgKHIua2luZCA9PT0gImluIiAmJiByLnNjaGVkKSBub3Rlcy5wdXNoKHQoInNjaGVkIiwgeyBhOiBobChyLnNjaGVkLnN0YXJ0KSwgYjogaGwoci5zY2hlZC5lbmQpIH0pKTsKICAgICAgc2hvd1Jlcyh0cnVlLCBDT0xPUlNbci5raW5kXSwgW2VsKCJkaXYiLCB7ICJjbGFzcyI6ICJrLW9rIiB9LCBbIuKckyJdKSwgZWwoImRpdiIsIHsgImNsYXNzIjogImstbm0iIH0sIFtyLm5hbWVdKSwKICAgICAgICBlbCgiZGl2IiwgeyAiY2xhc3MiOiAiay1rZCIgfSwgW3QoImtfIiArIHIua2luZCkgKyAiICIsIGVsKCJiIiwgbnVsbCwgW3IuaG1dKV0pXS5jb25jYXQobm90ZXMubWFwKGZ1bmN0aW9uKG4peyByZXR1cm4gZWwoImRpdiIsIHsgImNsYXNzIjogImstbm90ZSIgfSwgW25dKTsgfSkpLCAyMzAwKTsKICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGUpeyBkZWxldGUgUy5jb29sW3R4dC5zcGxpdCgiOiIpWzFdIHx8ICIiXTsgZmFpbChlLCBraW5kKTsgfSkKICAgICAgLnRoZW4oZnVuY3Rpb24oKXsgUy5pZGxlQXQgPSBEYXRlLm5vdygpICsgKFMuYXV0b09uICYmICFTLmtpbmQgPyBBVVRPX0lETEVfTVMgOiBJRExFX01TKTsgfSk7CiAgfQogIGZ1bmN0aW9uIHNob3dSZXMob2ssIGNvbG9yLCBraWRzLCBtcykgewogICAgY2xlYXIoUi5yZXMpOyBraWRzLmZvckVhY2goZnVuY3Rpb24oayl7IFIucmVzLmFwcGVuZENoaWxkKGspOyB9KTsKICAgIFIucmVzLnN0eWxlLmJhY2tncm91bmQgPSBjb2xvcjsgUi5yZXMuc2V0QXR0cmlidXRlKCJjbGFzcyIsICJrLXJlcyBzaG93IiArIChvayA/ICIgb2siIDogIiBiYWQiKSk7CiAgICBTLm92ZXJsYXlVbnRpbCA9IERhdGUubm93KCkgKyBtczsKICAgIHNldFN0YXR1cygiIik7CiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7IGlmIChEYXRlLm5vdygpID49IFMub3ZlcmxheVVudGlsIC0gMjApIHsgUi5yZXMuc2V0QXR0cmlidXRlKCJjbGFzcyIsICJrLXJlcyIpOyBpZiAoUy5zY2FubmluZykgc2V0U3RhdHVzKHQoImFpbSIpKTsgfSB9LCBtcyk7CiAgfQogIHZhciBBQyA9IG51bGw7CiAgZnVuY3Rpb24gYmVlcChvaykgewogICAgdHJ5IHsKICAgICAgaWYgKG5hdmlnYXRvci52aWJyYXRlKSBuYXZpZ2F0b3IudmlicmF0ZShvayA/IDgwIDogWzYwLCA2MCwgNjBdKTsKICAgICAgQUMgPSBBQyB8fCBuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dCkoKTsKICAgICAgdmFyIG8gPSBBQy5jcmVhdGVPc2NpbGxhdG9yKCksIGcgPSBBQy5jcmVhdGVHYWluKCksIG5vdyA9IEFDLmN1cnJlbnRUaW1lOwogICAgICBvLmZyZXF1ZW5jeS52YWx1ZSA9IG9rID8gMTA0NiA6IDIyMDsgZy5nYWluLnNldFZhbHVlQXRUaW1lKDAuMDAwMSwgbm93KTsKICAgICAgZy5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoMC4yNSwgbm93ICsgMC4wMik7IGcuZ2Fpbi5leHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lKDAuMDAwMSwgbm93ICsgKG9rID8gMC4xOCA6IDAuNCkpOwogICAgICBvLmNvbm5lY3QoZyk7IGcuY29ubmVjdChBQy5kZXN0aW5hdGlvbik7IG8uc3RhcnQobm93KTsgby5zdG9wKG5vdyArIDAuNDUpOwogICAgfSBjYXRjaCAoZSkge30KICB9CiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigidmlzaWJpbGl0eWNoYW5nZSIsIGZ1bmN0aW9uKCl7CiAgICBpZiAoZG9jdW1lbnQuaGlkZGVuKSB7IFMud2FzQXV0byA9IFMuYXV0b09uIHx8IFMucHJldkF1dG87IGdvSWRsZSgpOyB9CiAgICBlbHNlIGlmIChTLndhc0F1dG8pIHsgUy53YXNBdXRvID0gZmFsc2U7IHN0YXJ0QXV0bygpOyB9CiAgfSk7CgogIGZ1bmN0aW9uIHN0YXJ0KCkgewogICAgYnVpbGQoKTsKICAgIHNldEludGVydmFsKHRpY2tDbG9jaywgMjUwKTsKICAgIGlmIChFWEVDKSBhcGkoImluZm8iLCB7fSkudGhlbihmdW5jdGlvbihqKXsKICAgICAgaWYgKGogJiYgai5vaykgeyBTLm9uID0gISFqLm9uOyBTLmF1dG8gPSBqLmF1dG8gIT09IGZhbHNlOyBpZiAoai5zdG9yZSkgeyBTLnN0b3JlID0gai5zdG9yZTsgUi5zdG9yZS50ZXh0Q29udGVudCA9IGouc3RvcmU7IH0gaWYgKCFTLm9uKSBzZXRTdGF0dXModCgib2ZmIiksIHRydWUpOwogICAgICAgIGVsc2UgeyB2YXIgYTAgPSBudWxsOyB0cnkgeyBhMCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCJzYmsuYXV0byIpOyB9IGNhdGNoIChlKSB7fSBpZiAoYTAgPT09ICIxIikgc3RhcnRBdXRvKCk7IH0gfQogICAgfSkuY2F0Y2goZnVuY3Rpb24oKXsgc2V0U3RhdHVzKHQoIm5vU2VydmVyIiksIHRydWUpOyB9KTsKICB9CiAgd2luZG93Ll9fa2lvc2sgPSB7IFM6IFMsIHBpY2s6IHBpY2ssIGdvdDogZ290LCBnb0lkbGU6IGdvSWRsZSwgc3RhcnRBdXRvOiBzdGFydEF1dG8sIGNob29zZTogY2hvb3NlIH07CiAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICJsb2FkaW5nIikgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigiRE9NQ29udGVudExvYWRlZCIsIHN0YXJ0KTsgZWxzZSBzdGFydCgpOwoKfSkoKTsKLy9dXT48L3NjcmlwdD4KPC9ib2R5Pgo8L2h0bWw+Cg==';

// ===========================================================================
// XEM LỊCH QUÁN KHÁC (v.6) — hai quán đã bật "Kết nối các quán". Mỗi quán tự ghi
// tên + mã bảng tính vào sheet "stores" của bảng chung; quản lý quán này đọc được
// lịch ĐANG XẾP + ĐĂNG KÝ của quán kia (chỉ tên + giờ) để biết ai rảnh mà xin người.
// ===========================================================================
var HUB_STORES = 'stores';
function hubStoresSheet_(create) {
  var sh = hubSheet_(create); if (!sh) return null;
  var ss = SpreadsheetApp.openById(props_().getProperty('hubId')), st = ss.getSheetByName(HUB_STORES);
  if (!st && create) { st = ss.insertSheet(HUB_STORES); st.appendRow(['id', 'name', 'at']); }
  return st;
}
/** Ghi tên quán mình vào danh bạ chung (tối đa 1 lần/ngày, hoặc khi đổi tên). */
function hubRegister_(force) {
  try {
    var on = hubOn_(), me = myStore_(), props = props_();
    if (!on) {
      // Tắt kết nối → đánh dấu "nghỉ" trong danh bạ để quán khác không còn thấy / mượn người.
      if (!force || !props.getProperty('hubId')) return;
      var st0 = hubStoresSheet_(false); if (!st0) return;
      var v0 = st0.getDataRange().getValues();
      for (var j = 1; j < v0.length; j++) if (String(v0[j][0]) === me.id) st0.getRange(j + 1, 7).setValue(1);
      props.deleteProperty('HUB_REG');
      return;
    }
    var code = storeCode_();
    var emps = readEmployees_().filter(function (e) { return e && e.id && !e.deleted; })
      .map(function (e) { return [e.id, e.code || '', e.name, e.type === 'staff' ? 'staff' : 'sa']; });
    var ej = JSON.stringify(emps), h = 0;
    for (var k = 0; k < ej.length; k++) h = (h * 31 + ej.charCodeAt(k)) | 0;
    var st8 = readSettings_(), op = Number(st8.openHour) || 8, cl = Number(st8.closeHour) || 21;
    var url = ''; try { url = ScriptApp.getService().getUrl() || ''; } catch (eu) {}
    var mark = todayStr_() + '|' + me.name + '|' + code + '|' + h + '|' + op + '|' + cl + '|' + url;
    if (!force && props.getProperty('HUB_REG') === mark) return;
    var st = hubStoresSheet_(true); if (!st) return;
    var v = st.getDataRange().getValues(), row = -1;
    if (v.length && v[0].length < HUB_REG_COLS.length) st.getRange(1, 1, 1, HUB_REG_COLS.length).setValues([HUB_REG_COLS]);
    for (var i = 1; i < v.length; i++) if (String(v[i][0]) === me.id) { row = i + 1; break; }
    var cells = [me.id, me.name, Date.now(), code, ej, myEmail_(), '', op, cl, url, supKey_()];
    if (row === -1) st.appendRow(cells);
    else st.getRange(row, 1, 1, cells.length).setValues([cells]);
    props.setProperty('HUB_REG', mark);
  } catch (e) {}
}
function peerReadKey_(sheet, key) {
  var r = findRow_(sheet, key); if (r === -1) return null;
  try { return JSON.parse(readCellValue_(sheet, r) || 'null'); } catch (e) { return null; }
}
function peerCompact_(map) {
  // { ngày: { người: entry } } → chỉ giữ giờ (không ghi chú, không lý do)
  var out = {};
  Object.keys(map || {}).forEach(function (d) {
    var m = map[d] || {}, o = {};
    Object.keys(m).forEach(function (id) {
      var e = m[id]; if (!e) return;
      if (e.off) { o[id] = { off: true }; return; }
      var sh = (e.shifts || []).filter(function (s) { return s && isFinite(Number(s.start)) && isFinite(Number(s.end)); })
        .map(function (s) {
          var x = { start: Number(s.start), end: Number(s.end) }; if (s.endAtClose) x.endAtClose = true; if (s.isSupport) x.isSupport = true;
          if (s.breakStart != null && s.breakEnd != null && isFinite(Number(s.breakStart))) { x.bs = Number(s.breakStart); x.be = Number(s.breakEnd); }
          return x;
        });
      if (sh.length) o[id] = { shifts: sh };
    });
    if (Object.keys(o).length) out[d] = o;
  });
  return out;
}
/** Lịch + đăng ký tháng `ym` của các quán khác đã kết nối. */
function peerMonth(token, yearMonth) {
  requireManager_(token);
  var ym = assertYearMonth_(yearMonth);
  if (!hubOn_()) throw new Error('Chưa bật "Kết nối các quán" trong Cài đặt.');
  hubRegister_(false);
  var cache = CacheService.getScriptCache(), ck = 'peer:' + myStore_().id.slice(0, 20) + ':' + ym;
  try { var hit = cache.get(ck); if (hit) return JSON.parse(hit); } catch (e) {}
  hubPublish_(ym, false);
  var ss = hubSS_(false), me = myStore_().id, out = { at: Date.now(), stores: [] };
  hubRowsOf_(ss).forEach(function (row) {
    if (!row.id || row.id === me || row.off || out.stores.length >= 4) return;
    try {
      var d = peerStoreData_(ss, row, ym); if (!d) return;
      out.stores.push({ id: row.id.slice(0, 8), name: String(d.name || row.name || '').slice(0, 40), code: d.code || row.code || '',
        open: Number(d.open) || 8, close: Number(d.close) || 21, emps: d.emps || [], sched: d.sched || {}, wish: d.wish || {}, un: d.un || {},
        src: d.src, at: d.at || 0 });
    } catch (e) {}
  });
  try { var s = JSON.stringify(out); if (s.length < 90000) cache.put(ck, s, 180); } catch (e) {}
  return out;
}

// ===========================================================================
// 👤 NHÂN SỰ (v.14): hồ sơ nhân viên chuẩn Nhật · ứng tuyển · thôi việc · giấy tờ
//   prof:<empId>   = hồ sơ (CHỈ quản lý và chính người đó đọc được — không bao giờ nằm trong danh sách nhân viên)
//   photo:<empId>  = ảnh 3×4 (data:image/jpeg;base64,…)
//   hrco           = thông tin công ty / điều kiện làm việc chung (in lên giấy tờ)
//   retired        = [{ e: <bản ghi nhân viên>, at, retire }] người đã thôi việc (đã lưu trữ)
//   apl / apl:<id> / aplph:<id> / aplcfg = ứng viên (mục lục, bản đầy đủ, ảnh, cấu hình link)
// Mọi trường đều được chuẩn hoá ở máy chủ theo HR_SPEC_ (độ dài, kiểu, ai được sửa).
// ===========================================================================
var HR_EDU_ = { t: 'hist', n: 14 }, HR_WORK_ = { t: 'hist', n: 20 };
var HR_SPEC_ = {
  kana: { t: 's', n: 60 }, roma: { t: 's', n: 60 }, birth: { t: 'd' }, gender: { t: 'e', v: ['m', 'f', 'x'] }, nat: { t: 's', n: 30 },
  tel: { t: 's', n: 20, self: 1 }, email: { t: 's', n: 120, self: 1 },
  zip: { t: 's', n: 10, self: 1 }, addr1: { t: 's', n: 120, self: 1 }, addr2: { t: 's', n: 80, self: 1 }, addrKana: { t: 's', n: 160, self: 1 },
  emName: { t: 's', n: 40, self: 1 }, emRel: { t: 's', n: 20, self: 1 }, emTel: { t: 's', n: 20, self: 1 }, emAddr: { t: 's', n: 120, self: 1 },
  cm: { t: 'e', v: ['train', 'bus', 'car', 'bike', 'bicycle', 'walk', 'other'], self: 1 }, cmRoute: { t: 's', n: 140, self: 1 },
  cmSta: { t: 's', n: 40, self: 1 }, cmMin: { t: 'n', lo: 0, hi: 300, self: 1 }, cmKm: { t: 'n', lo: 0, hi: 300, self: 1 },
  cmFee: { t: 'n', lo: 0, hi: 200000, self: 1 }, cmFeeUnit: { t: 'e', v: ['day', 'month'], self: 1 },
  hire: { t: 'd' }, etype: { t: 'e', v: ['baito', 'part', 'shain', 'keiyaku'] }, job: { t: 's', n: 80 }, place: { t: 's', n: 80 },
  wage: { t: 'n', lo: 0, hi: 100000 }, wageNote: { t: 's', n: 100 }, trialEnd: { t: 'd' },
  term: { t: 'e', v: ['none', 'fixed'] }, termFrom: { t: 'd' }, termTo: { t: 'd' }, renew: { t: 'e', v: ['auto', 'maybe', 'no'] }, renewMax: { t: 's', n: 60 },
  insEmp: { t: 'b' }, insHealth: { t: 'b' }, empNo: { t: 's', n: 20 }, uniform: { t: 's', n: 40 }, keyHolder: { t: 'b' }, lent: { t: 'list', n: 15, m: 40 },
  student: { t: 'b', self: 1 }, school: { t: 's', n: 60, self: 1 }, gradYM: { t: 'ym', self: 1 },
  visa: { t: 's', n: 40 }, visaExp: { t: 'd', self: 1 }, permit: { t: 'b' }, cardNo: { t: 's', n: 20 },
  bank: { t: 's', n: 40, self: 1 }, branch: { t: 's', n: 40, self: 1 }, acctType: { t: 'e', v: ['futsu', 'toza'], self: 1 },
  acctNo: { t: 's', n: 12, self: 1 }, acctName: { t: 's', n: 60, self: 1 },
  kou: { t: 'e', v: ['kou', 'otsu'], self: 1 }, spouse: { t: 'spouse', self: 1 }, deps: { t: 'deps', self: 1 },
  selfDis: { t: 'e', v: ['g', 't'], self: 1 }, widow: { t: 'e', v: ['kafu', 'hitori'], self: 1 }, kinro: { t: 'b', self: 1 }, yeOk: { t: 'n', lo: 0, hi: 2100, self: 1 },
  edu: HR_EDU_, work: HR_WORK_, lic: { t: 'hist', n: 10 }, motive: { t: 's', n: 800, ml: 1 }, hobby: { t: 's', n: 200, ml: 1 },
  wish: { t: 'wish' }, note: { t: 's', n: 1500, ml: 1 },
  // v.15: nguyện vọng phỏng vấn / liên lạc / cách làm việc (form ứng tuyển)
  ivPref: { t: 'ivp' }, ivNote: { t: 's', n: 200 }, ctHow: { t: 'elist', v: ['tel', 'sms', 'mail', 'line'] }, ctWhen: { t: 'elist', v: ['am', 'pm', 'eve', 'wkend'] },
  ctNote: { t: 's', n: 200 }, wkStyle: { t: 'e', v: ['long', 'short', 'term'] }, wkNote: { t: 's', n: 200, ml: 1 }
};
var HR_RET_REASON_ = ['self', 'end', 'co', 'other'];

function hrStr_(v, n, ml) {
  var s = String(v == null ? '' : v).replace(ml ? /[\u0000-\u0009\u000b\u000c\u000e-\u001f<>]/g : /[\u0000-\u001f<>]/g, '');
  return s.trim().slice(0, n);
}
function hrDate_(v) {
  var s = String(v == null ? '' : v).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  var d = new Date(s + 'T00:00:00Z');
  return isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s || s < '1900-01-01' || s > '2100-12-31' ? '' : s;
}
function hrYmv_(v) { var s = String(v == null ? '' : v).trim(); return /^\d{4}-(0[1-9]|1[0-2])$/.test(s) ? s : ''; }
function hrNum_(v, lo, hi) {
  if (v === '' || v == null) return null;
  var n = Number(String(v).replace(/[,，円¥\s]/g, ''));
  return isFinite(n) && n >= lo && n <= hi ? Math.round(n * 10) / 10 : null;
}
function hrHm_(v) { var s = String(v == null ? '' : v).trim(); return /^([01]?\d|2[0-9]):[0-5]\d$/.test(s) ? s : ''; }
function hrVal_(sp, v) {
  switch (sp.t) {
    case 's': return hrStr_(v, sp.n, sp.ml);
    case 'd': return hrDate_(v);
    case 'ym': return hrYmv_(v);
    case 'n': return hrNum_(v, sp.lo, sp.hi);
    case 'b': return v === true || v === 'true' || v === 1;
    case 'e': return sp.v.indexOf(String(v)) !== -1 ? String(v) : '';
    case 'list': return (Array.isArray(v) ? v : []).map(function (x) { return hrStr_(x, sp.m); }).filter(Boolean).slice(0, sp.n);
    case 'hist':
      return (Array.isArray(v) ? v : []).map(function (x) {
        x = x || {};
        var ym = String(x.ym == null ? '' : x.ym).trim();
        return { ym: /^\d{4}(-(0[1-9]|1[0-2]))?$/.test(ym) ? ym : '', txt: hrStr_(x.txt, 120) };
      }).filter(function (x) { return x.txt; }).slice(0, sp.n);
    case 'spouse':
      v = v || {};
      return { has: v.has === true, name: hrStr_(v.name, 40), kana: hrStr_(v.kana, 60), birth: hrDate_(v.birth),
               inc: hrNum_(v.inc, 0, 100000000), live: v.live !== false, dis: ['g', 't'].indexOf(v.dis) !== -1 ? v.dis : '', nonres: v.nonres === true };
    case 'deps':
      return (Array.isArray(v) ? v : []).map(function (x) {
        x = x || {};
        return { name: hrStr_(x.name, 40), kana: hrStr_(x.kana, 60), rel: hrStr_(x.rel, 20), birth: hrDate_(x.birth),
                 inc: hrNum_(x.inc, 0, 100000000), live: x.live !== false, dis: ['g', 't'].indexOf(x.dis) !== -1 ? x.dis : '', nonres: x.nonres === true };
      }).filter(function (x) { return x.name; }).slice(0, 10);
    case 'elist':
      var seen = {};
      return (Array.isArray(v) ? v : []).map(String).filter(function (x) { if (sp.v.indexOf(x) === -1 || seen[x]) return false; seen[x] = 1; return true; });
    case 'ivp':
      return (Array.isArray(v) ? v : []).map(function (x) { x = x || {}; return { d: hrDate_(x.d), a: hrHm_(x.a), b: hrHm_(x.b) }; })
        .filter(function (x) { return x.d; }).slice(0, 4);
    case 'wish':
      v = v || {};
      var w = Array.isArray(v.w) ? v.w : [];
      var out = { w: [], note: hrStr_(v.note, 300, true), days: hrNum_(v.days, 0, 7), hours: hrNum_(v.hours, 0, 60), start: hrDate_(v.start) };
      for (var i = 0; i < 7; i++) {
        var x = w[i] || {}, a = hrHm_(x.a), b = hrHm_(x.b);
        out.w.push({ ok: x.ok === true && !!a && !!b, a: a, b: b });
      }
      return out;
  }
  return null;
}
/** Gộp dữ liệu gửi lên vào hồ sơ cũ. self = nhân viên tự sửa → chỉ các trường self:1. Trả { p, chg:[tên trường đổi] }. */
function hrNorm_(o, prev, self) {
  prev = prev && typeof prev === 'object' ? prev : {};
  o = o && typeof o === 'object' ? o : {};
  var out = JSON.parse(JSON.stringify(prev)), chg = [];
  Object.keys(HR_SPEC_).forEach(function (k) {
    if (!Object.prototype.hasOwnProperty.call(o, k)) return;
    var sp = HR_SPEC_[k];
    if (self && !sp.self) return;
    var v = hrVal_(sp, o[k]), was = prev[k] === undefined ? hrVal_(sp, undefined) : prev[k];
    if (JSON.stringify(v) !== JSON.stringify(was)) chg.push(k);
    out[k] = v;
  });
  return { p: out, chg: chg };
}
function hrGet_(empId) { var p = readJsonKey_('prof:' + empId); return p && typeof p === 'object' && !Array.isArray(p) ? p : {}; }
function hrPut_(empId, p, reason) { kvSet_('prof:' + empId, JSON.stringify(p), reason || 'hồ sơ'); }
/** v41: đọc-sửa-ghi hồ sơ TRONG khoá (quản lý và nhân viên cùng sửa không còn đè mất của nhau). */
function hrMut_(empId, fn, reason) {
  return kvUpdate_('prof:' + empId, function (cur) { return fn(cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {}); }, reason || 'hồ sơ');
}
function hrRetired_() { var a = readJsonKey_('retired'); return Array.isArray(a) ? a : []; }
/** Nhân viên đang làm, hoặc (chỉ quản lý) người đã lưu trữ. */
function hrEmp_(empId, allowRetired) {
  empId = String(empId || '');
  var e = readEmployees_().filter(function (x) { return x.id === empId; })[0];
  if (e) return { id: e.id, name: e.name, type: e.type || 'sa', email: e.email || '', code: e.code || '', retired: false };
  if (!allowRetired) return null;
  var r = hrRetired_().filter(function (x) { return x && x.e && x.e.id === empId; })[0];
  return r ? { id: r.e.id, name: r.e.name, type: r.e.type || 'sa', email: '', code: r.e.code || '', retired: true, at: r.at } : null;
}
function hrAge_(birth, ymd) {
  if (!birth) return null;
  var a = Number(ymd.slice(0, 4)) - Number(birth.slice(0, 4));
  if (ymd.slice(5) < birth.slice(5)) a--;
  return a >= 0 && a < 130 ? a : null;
}
function hrDays_(from, to) { return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000); }

// ---- Thông tin công ty (in lên hợp đồng, giấy tờ) ----
var HR_CO_KEYS_ = { corp: 80, rep: 40, repTitle: 30, zip: 10, addr: 120, tel: 20, store: 60, storeAddr: 120, storeTel: 20, mgrName: 40,
  closeDay: 30, payDay: 40, payWay: 40, holiday: 120, breakRule: 160, raise: 80, bonus: 80, retireRule: 160, place2: 80, job2: 80,
  contact: 80, trial: 60, overtime: 80, insNote: 120, retirePay: 60 };
function hrCo_() {
  var c = readJsonKey_('hrco'); c = c && typeof c === 'object' && !Array.isArray(c) ? c : {};
  if (!c.store) { try { c.store = readSettings_().storeName || ''; } catch (e) {} }
  return c;
}
function hrCoSave(token, json) {
  requireManager_(token);
  var o; try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { o = null; }
  if (!o || typeof o !== 'object') throw new Error('Dữ liệu không hợp lệ.');
  var cur = readJsonKey_('hrco'); cur = cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {};
  Object.keys(HR_CO_KEYS_).forEach(function (k) { if (Object.prototype.hasOwnProperty.call(o, k)) cur[k] = hrStr_(o[k], HR_CO_KEYS_[k]); });
  if (o.yeAsk !== undefined) { var y = Math.round(Number(o.yeAsk)); cur.yeAsk = y >= 2020 && y <= 2100 ? y : 0; }
  kvSet_('hrco', JSON.stringify(cur), 'thông tin công ty');
  return hrCo_();
}

// ---- Hồ sơ ----
function hrProfile(token, empId) {
  var who = requireCanEdit_(token, empId);
  var emp = hrEmp_(empId, who.r === 'mgr');
  if (!emp) throw new Error('Không tìm thấy nhân viên này.');
  var p = hrGet_(emp.id);
  if (who.r !== 'mgr') delete p.note;
  return { emp: emp, p: p, photo: kvGet_('photo:' + emp.id) || '', self: who.r !== 'mgr', co: hrCo_() };
}
function hrProfileSave(token, empId, json) {
  var who = requireCanEdit_(token, empId);
  var emp = hrEmp_(empId, who.r === 'mgr');
  if (!emp) throw new Error('Không tìm thấy nhân viên này.');
  var o; try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { o = null; }
  if (!o || typeof o !== 'object') throw new Error('Dữ liệu không hợp lệ.');
  var self = who.r !== 'mgr', now = Date.now(), r = null;
  hrMut_(emp.id, function (prev) {
    r = hrNorm_(o, prev, self);
    r.p.upd = now; r.p.updBy = self ? 'self' : 'mgr';
    if (self && r.chg.length) {
      r.p.chg = r.p.chg && typeof r.p.chg === 'object' ? r.p.chg : {};
      r.chg.forEach(function (k) { if (k !== 'yeOk') r.p.chg[k] = now; });
    }
    return r.p;
  });
  if (self && r.chg.filter(function (k) { return k !== 'yeOk'; }).length) {
    var ym = attYmd_(now).slice(0, 7);
    mgrEvent_('prof', emp.id, ym, 0, r.chg.join(','));
  }
  if (self) delete r.p.note;
  return { p: r.p, chg: r.chg };
}
/** Quản lý đã xem các thay đổi nhân viên tự sửa. */
function hrAck(token, empId) {
  requireManager_(token);
  if (hrGet_(String(empId || '')).chg) hrMut_(String(empId), function (p) { delete p.chg; return p; }, 'đã xem thay đổi');
  return true;
}
function hrPhotoOk_(v) {
  v = String(v == null ? '' : v);
  if (!v) return '';
  if (v.length > 240000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/]+=*$/.test(v)) throw new Error('Ảnh không hợp lệ hoặc quá lớn.');
  return v;
}
function hrPhotoSave(token, empId, dataUrl) {
  var who = requireCanEdit_(token, empId);
  var emp = hrEmp_(empId, who.r === 'mgr');
  if (!emp) throw new Error('Không tìm thấy nhân viên này.');
  var v = hrPhotoOk_(dataUrl);
  kvSet_('photo:' + emp.id, v, 'ảnh');
  if (!!hrGet_(emp.id).ph !== !!v) hrMut_(emp.id, function (p) { p.ph = !!v; return p; }, 'ảnh');
  return { ok: true, ph: !!v };
}
function hrRow_(e, p, today, ret) {
  var al = [], age = hrAge_(p.birth || '', today);
  if (p.visaExp) {
    var dl = hrDays_(today, p.visaExp);
    if (dl < 0) al.push({ k: 'visaOver', n: -dl }); else if (dl <= 60) al.push({ k: 'visa', n: dl });
  }
  if (p.retire && !ret) { if (p.retire.date && p.retire.date < today) al.push({ k: 'retDue' }); else al.push({ k: 'retSoon' }); }
  if (p.chg && Object.keys(p.chg).length) al.push({ k: 'chg', n: Object.keys(p.chg).length });
  if (age !== null && age < 18) al.push({ k: 'minor' });
  var need = ['kana', 'birth', 'tel', 'zip', 'addr1', 'hire', 'emTel', 'bank', 'acctNo'], got = need.filter(function (k) { return !!p[k]; }).length;
  return { id: e.id, name: e.name, type: e.type || 'sa', code: e.code || '', kana: p.kana || '', birth: p.birth || '', age: age, hire: p.hire || '',
           etype: p.etype || '', wage: p.wage == null ? null : p.wage, visa: p.visa || '', visaExp: p.visaExp || '', student: !!p.student,
           ph: !!p.ph, keyHolder: !!p.keyHolder, retire: p.retire || null, fill: Math.round(got / need.length * 100), al: al,
           yeOk: p.yeOk || 0, at: ret ? ret.at : null, retired: !!ret };
}
function hrList(token) {
  requireManager_(token);
  try { hrPurgeExpired_(); } catch (e0) { Logger.log('purge ' + e0); }
  var emps = readEmployees_(), ret = hrRetired_(), today = attYmd_(Date.now());
  kvPrefetch_(emps.map(function (e) { return 'prof:' + e.id; }).concat(ret.map(function (r) { return 'prof:' + r.e.id; })));
  var rows = emps.map(function (e) { return hrRow_(e, hrGet_(e.id), today, null); });
  var rrows = ret.filter(function (r) { return r && r.e; }).map(function (r) { var x = hrRow_(r.e, hrGet_(r.e.id), today, r); x.retire = r.retire || x.retire; return x; });
  var idx = aplIndex_();
  return { rows: rows, retired: rrows, aplNew: idx.filter(function (a) { return a.st === 'new'; }).length, aplN: idx.length, co: hrCo_(), today: today };
}
/** Tóm tắt nhẹ cho hộp "việc cần làm" của quản lý. */
/** Dự kiến thu nhập tháng hiện tại = số giờ đã xếp × lương giờ (hồ sơ nhân sự); so với sàn/trần đã đặt. */
function incomeWarn_(emps, ym) {
  var out = [], target = emps.filter(function (e) { return e.minIncome > 0 || e.maxIncome > 0; });
  if (!target.length) return out;
  var sched = readMonthNormalized_('schedule:' + ym, emps) || {}, hours = {};
  Object.keys(sched).forEach(function (day) {
    var dm = sched[day] || {};
    Object.keys(dm).forEach(function (id) {
      var en = dm[id];
      if (!en || en.off || !en.shifts) return;
      en.shifts.forEach(function (s) {
        var h = Number(endOf_(s, null, day)) - Number(s.start);
        if (s.breakStart != null && s.breakEnd != null) h -= Number(s.breakEnd) - Number(s.breakStart);
        if (isFinite(h) && h > 0) hours[id] = (hours[id] || 0) + h;
      });
    });
  });
  target.forEach(function (e) {
    var w = Number((hrGet_(e.id) || {}).wage) || 0;
    if (!w) return;
    var inc = Math.round((hours[e.id] || 0) * w);
    if (e.maxIncome > 0 && inc > e.maxIncome) out.push({ id: e.id, name: e.name, k: 'over', inc: inc });
    else if (e.minIncome > 0 && inc < e.minIncome) out.push({ id: e.id, name: e.name, k: 'under', inc: inc });
  });
  return out;
}

function hrBrief(token) {
  var L = hrList(token), out = { aplNew: L.aplNew, al: [], hlBad: [], ye: (L.co.yeAsk || 0), inc: [] };
  try { out.inc = incomeWarn_(readEmployees_(), attYmd_(Date.now()).slice(0, 7)); } catch (e0) {}
  L.rows.forEach(function (r) { r.al.forEach(function (a) { if (a.k !== 'minor') out.al.push({ id: r.id, name: r.name, k: a.k, n: a.n || 0, d: r.retire ? r.retire.date : '' }); }); });
  try {
    var t = attYmd_(Date.now()), raw = readJsonKey_('hl:' + t.slice(0, 7)), day = raw[String(Number(t.slice(8, 10)))] || {};
    Object.keys(day).forEach(function (id) { if (hlBad_(day[id])) out.hlBad.push({ id: id }); });
  } catch (e) {}
  return out;
}

// ---- Thôi việc ----
function hrRetire(token, empId, json) {
  requireManager_(token);
  var emp = hrEmp_(empId, false);
  if (!emp) throw new Error('Không tìm thấy nhân viên này.');
  var o; try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { o = null; }
  o = o || {};
  var date = hrDate_(o.date);
  if (!date) throw new Error('Hãy chọn ngày thôi việc.');
  var last = hrDate_(o.last) || date;
  if (last > date) throw new Error('Ngày làm cuối không được sau ngày thôi việc.');
  var p = hrGet_(emp.id), prevChk = p.retire && p.retire.chk ? p.retire.chk : {}, prevDate = p.retire ? p.retire.date : '';
  p.retire = { date: date, last: last, reason: HR_RET_REASON_.indexOf(o.reason) !== -1 ? o.reason : 'self', note: hrStr_(o.note, 300, true),
               cert: o.cert === true, at: (p.retire && p.retire.at) || Date.now(), chk: prevChk };
  hrPut_(emp.id, p, 'thôi việc');
  if (prevDate && prevDate !== last) hrBlockAfter_(emp.id, prevDate, false);
  var n = hrBlockAfter_(emp.id, last, true);
  return { p: p, blocked: n };
}
function hrRetireCancel(token, empId) {
  requireManager_(token);
  var p = hrGet_(String(empId || ''));
  if (!p.retire) return { p: p };
  var last = p.retire.last || p.retire.date;
  delete p.retire;
  hrPut_(String(empId), p, 'huỷ thôi việc');
  hrBlockAfter_(String(empId), last, false);
  return { p: p };
}
function hrRetireChk(token, empId, key, on) {
  requireManager_(token);
  key = String(key || '');
  if (!/^[a-z0-9_]{2,24}$/.test(key)) throw new Error('Dữ liệu không hợp lệ.');
  var p = hrGet_(String(empId || ''));
  if (!p.retire) throw new Error('Nhân viên này chưa được cho thôi việc.');
  p.retire.chk = p.retire.chk || {};
  if (on) p.retire.chk[key] = Date.now(); else delete p.retire.chk[key];
  hrPut_(String(empId), p, 'thủ tục thôi việc');
  return { p: p };
}
/** Đánh dấu "không đi làm được" (退職) cho các ngày SAU ngày làm cuối, 3 tháng tới → bộ tự xếp lịch bỏ qua người này. */
function hrBlockAfter_(empId, last, on) {
  var n = 0, ym0 = last.slice(0, 7);
  for (var k = 0; k < 3; k++) {
    var ym = ymShift_(ym0, k);
    try {
      kvUpdate_('requests:' + ym, function (raw) {
        raw = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
        var nd = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate();
        for (var d = 1; d <= nd; d++) {
          var ymd = ym + '-' + ('0' + d).slice(-2), dk = String(d), day = raw[dk];
          if (on) {
            if (ymd <= last) continue;
            day = raw[dk] = day || {};
            if (!day[empId]) { day[empId] = { type: 'unavailable', note: '退職' }; n++; }
          } else if (day && day[empId] && day[empId].note === '退職' && day[empId].type === 'unavailable') { delete day[empId]; n++; }
        }
        return raw;
      }, 'thôi việc');
    } catch (e) {}
  }
  return n;
}
/** Hoàn tất: chuyển người này vào danh sách đã thôi việc (hồ sơ, ảnh, chấm công, 年末調整 vẫn giữ). */
function hrArchive(token, empId) {
  requireManager_(token);
  empId = String(empId || '');
  var list = readEmployees_(), e = list.filter(function (x) { return x.id === empId; })[0];
  if (!e) throw new Error('Không tìm thấy nhân viên này.');
  var p = hrGet_(empId);
  if (!p.retire) throw new Error('Nhân viên này chưa được cho thôi việc.');
  kvUpdate_('retired', function (cur) {
    cur = Array.isArray(cur) ? cur.filter(function (r) { return r && r.e && r.e.id !== empId; }) : [];
    cur.push({ e: JSON.parse(JSON.stringify(e)), at: Date.now(), retire: p.retire });
    return cur;
  }, 'lưu trữ người thôi việc');
  saveEmployees(token, JSON.stringify(list.filter(function (x) { return x.id !== empId; })));
  purgeEmployee(token, empId);
  try { attCardsDrop_(empId); } catch (e2) {}
  p.retire.done = Date.now();
  hrPut_(empId, p, 'lưu trữ');
  return hrList(token);
}
/** Giữ dữ liệu người đã thôi việc 6 tháng (HR_KEEP_DAYS): khôi phục khi nhận lại; quá hạn thì xoá hẳn. */
var HR_KEEP_DAYS = 183;
function hrRestoreData_(empId) {
  // v41: ghi đè cả loạt tháng lịch → phải giữ khoá (trước đây không khoá: ai đó lưu ca cùng lúc là mất).
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try { return hrRestoreDataLocked_(empId); } finally { lock.releaseLock(); }
}
function hrRestoreDataLocked_(empId) {
  var sheet = getSheet_(), bkKey = 'retbak:' + empId, bkRow = findRow_(sheet, bkKey);
  if (bkRow === -1) return false;
  var bk; try { bk = JSON.parse(readCellValue_(sheet, bkRow) || 'null'); } catch (e) { bk = null; }
  if (!bk || !bk.keep) return false;
  Object.keys(bk.keep).forEach(function (key) {
    var row = findRow_(sheet, key), raw = row === -1 ? '' : readCellValue_(sheet, row), obj = {};
    if (raw) { try { obj = JSON.parse(raw); } catch (e) { return; } }
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
    var part = bk.keep[key];
    if (key.indexOf('care:') === 0) { if (obj[empId] === undefined) obj[empId] = part; }
    else Object.keys(part).forEach(function (day) {
      obj[day] = obj[day] || {};
      if (obj[day][empId] === undefined) obj[day][empId] = part[day];
    });
    var json = JSON.stringify(obj);
    if (row === -1) appendKeyValue_(sheet, key, json);
    else { snapshot_(key, raw, 'khôi phục nhân viên', true); writeCellValue_(sheet, row, json); }
    touchMod_(key);
    putCacheSafe_(key, json);
  });
  var doneJson = JSON.stringify({ restored: Date.now() });   // đã khôi phục: không khôi phục lần nữa
  writeCellValue_(sheet, bkRow, doneJson);
  putCacheSafe_(bkKey, doneJson);
  return true;
}
/** Quá 6 tháng kể từ ngày thôi việc: xoá hẳn hồ sơ và dữ liệu giữ lại. */
function hrPurgeExpired_() {
  var ret = hrRetired_(), now = Date.now(), keepList = [], expired = [];
  ret.forEach(function (r) {
    if (r && r.e && r.at && !r.keep && now - Number(r.at) > HR_KEEP_DAYS * 86400000) expired.push(r.e.id); else keepList.push(r);
  });
  if (!expired.length) return 0;
  kvUpdate_('retired', function () { return keepList; }, 'xoá hẳn sau 6 tháng');
  var sheet = getSheet_(), gone = {};
  expired.forEach(function (id) {
    gone[String(id)] = 1;
    // v41: xoá cả ảnh hồ sơ (trước đây còn nằm lại vĩnh viễn).
    [ 'retbak:' + id, 'prof:' + id, 'photo:' + id ].forEach(function (k) {
      var row = findRow_(sheet, k);
      if (row !== -1) { writeCellValue_(sheet, row, ''); putCacheSafe_(k, ''); }
    });
  });
  // Mật khẩu phiếu lương, khoá mã QR điểm danh, mã đăng ký của người đã xoá hẳn.
  // (Hồ sơ 年末調整 'ye:năm' KHÔNG xoá ở đây: sổ sách thuế phải giữ 7 năm.)
  ['paypw', 'attkeys'].forEach(function (k) {
    try {
      var cur = readJsonKey_(k), hit = false;
      Object.keys(gone).forEach(function (id) { if (cur && Object.prototype.hasOwnProperty.call(cur, id)) hit = true; });
      if (hit) kvUpdate_(k, function (m) { m = (m && typeof m === 'object' && !Array.isArray(m)) ? m : {}; Object.keys(gone).forEach(function (id) { delete m[id]; }); return m; }, 'xoá hẳn sau 6 tháng');
    } catch (e1) {}
  });
  try { Object.keys(gone).forEach(function (id) { dropClaimCode_(id); }); } catch (e2) {}
  // Bản chụp lịch sử của hồ sơ (sheet History) cũng phải mất — không thì "khôi phục" lại được.
  try {
    var hs = getHistorySheet_(), last = hs.getLastRow();
    if (last >= 2) {
      var ks = hs.getRange(2, 2, last - 1, 1).getValues();
      for (var i = ks.length - 1; i >= 0; i--) {
        var mk = /^(prof|photo|retbak):(.+)$/.exec(String(ks[i][0]));
        if (mk && gone[mk[2]]) hs.deleteRow(i + 2);
      }
    }
  } catch (e3) {}
  return expired.length;
}
/** Gỡ ca / đăng ký của người này từ hôm nay trở đi (cất vào retbak để khôi phục được). Ngày đã qua giữ nguyên. */
function hrDetachFuture_(empId, today) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_(), data = sheet.getDataRange().getValues(), keep = {};
    var ymNow = today.slice(0, 7), dNow = Number(today.slice(8, 10));
    for (var i = 1; i < data.length; i++) {
      var key = String(data[i][0]);
      if (data[i][1] !== 'shared') continue;
      var m = /^(schedule|requests|wish|plan):(\d{4}-\d{2})/.exec(key);
      if (!m || m[2] < ymNow) continue;
      var raw = readCellValue_(sheet, i + 1);
      if (!raw) continue;
      var obj; try { obj = JSON.parse(raw); } catch (e) { continue; }
      if (!obj || typeof obj !== 'object') continue;
      var part = {}, changed = false;
      Object.keys(obj).forEach(function (day) {
        if (m[2] === ymNow && Number(day) < dNow) return;
        if (obj[day] && typeof obj[day] === 'object' && Object.prototype.hasOwnProperty.call(obj[day], empId)) {
          part[day] = obj[day][empId]; delete obj[day][empId]; changed = true;
        }
      });
      if (!changed) continue;
      keep[key] = part;
      snapshot_(key, raw, 'gộp mã nhân viên', true);
      var json = JSON.stringify(obj);
      writeCellValue_(sheet, i + 1, json); touchMod_(key); putCacheSafe_(key, json);
    }
    if (Object.keys(keep).length) {
      var bkKey = 'retbak:' + empId, bkRow = findRow_(sheet, bkKey), bkJson = JSON.stringify({ at: Date.now(), keep: keep });
      if (bkRow === -1) appendKeyValue_(sheet, bkKey, bkJson); else writeCellValue_(sheet, bkRow, bkJson);
      putCacheSafe_(bkKey, bkJson);
    }
    return keep;
  } finally { lock.releaseLock(); }
}
/** v2026.10.16: GỘP MÃ — người này đã có mã chính ở quán khác (vd. Otagawa), sang đây làm qua chi viện.
 *  Mã ở quán này vào "Đã thôi việc" và GIỮ VĨNH VIỄN: ca, chấm công, lương, 年末調整 của những ngày đã qua giữ nguyên.
 *  Ca từ hôm nay trở đi được gỡ (cất lại, nhận lại là trả về). */
function hrMergeAway(token, empId, json) {
  requireManager_(token);
  empId = String(empId || '');
  var o; try { o = JSON.parse(json || '{}') || {}; } catch (e) { o = {}; }
  var list = readEmployees_(), e = list.filter(function (x) { return x.id === empId; })[0];
  if (!e) throw new Error('Không tìm thấy nhân viên này.');
  var to = String(o.to || '').replace(/[<>"]/g, '').trim().slice(0, 40), today = todayStr_();
  hrDetachFuture_(empId, today);
  var p = hrGet_(empId);
  if (p.retire) p.retireHist = (p.retireHist || []).concat([p.retire]).slice(-5);
  p.retire = { date: today, last: today, reason: 'merge', note: to ? '→ ' + to : '', done: Date.now(), merged: to };
  hrPut_(empId, p, 'gộp mã');
  kvUpdate_('retired', function (cur) {
    cur = Array.isArray(cur) ? cur.filter(function (r) { return r && r.e && r.e.id !== empId; }) : [];
    cur.push({ e: JSON.parse(JSON.stringify(e)), at: Date.now(), retire: p.retire, keep: true, mergedTo: to });
    return cur;
  }, 'gộp mã nhân viên');
  saveEmployees(token, JSON.stringify(list.filter(function (x) { return x.id !== empId; })));
  try { dropDevices_(empId); bumpEmpVer_(empId); deletePin_(empId); } catch (e1) {}
  try { attCardsDrop_(empId); } catch (e2) {}
  return hrList(token);
}
/** Tên của người đã thôi việc / đã gộp mã (chỉ tên) — để các tháng cũ vẫn hiện đúng tên. */
function hrExNames_() {
  var out = {};
  try { hrRetired_().forEach(function (r) { if (r && r.e && r.e.id) out[r.e.id] = String(r.e.name || ''); }); } catch (e) {}
  return out;
}
/** Nhận lại người đã thôi việc. */
function hrRehire(token, empId) {
  requireManager_(token);
  empId = String(empId || '');
  var r = hrRetired_().filter(function (x) { return x && x.e && x.e.id === empId; })[0];
  if (!r) throw new Error('Không tìm thấy nhân viên này.');
  var list = readEmployees_();
  if (list.some(function (x) { return x.name === r.e.name; })) throw new Error('Tên này đã có trong danh sách nhân viên.');
  list.push(r.e);
  saveEmployees(token, JSON.stringify(list));
  try { hrRestoreData_(empId); } catch (e) { Logger.log('restore ' + e); }
  kvUpdate_('retired', function (cur) { return Array.isArray(cur) ? cur.filter(function (x) { return x && x.e && x.e.id !== empId; }) : []; }, 'nhận lại');
  var p = hrGet_(empId);
  if (p.retire) { p.retireHist = (p.retireHist || []).concat([p.retire]).slice(-5); delete p.retire; hrPut_(empId, p, 'nhận lại'); }
  return hrList(token);
}
/** Nhập hồ sơ từ file 履歴書 (Excel) — mode 'fill' chỉ điền ô trống, 'over' ghi đè. */
function hrImport(token, json) {
  requireManager_(token);
  var o; try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { o = null; }
  var items = o && Array.isArray(o.items) ? o.items.slice(0, 80) : null;
  if (!items) throw new Error('Dữ liệu không hợp lệ.');
  var emps = {}; readEmployees_().forEach(function (e) { emps[e.id] = e; });
  var done = 0;
  items.forEach(function (it) {
    if (!it || !emps[it.empId] || !it.p) return;
    var prev = hrGet_(it.empId), src = it.p;
    if (it.mode !== 'over') {
      src = {};
      Object.keys(it.p).forEach(function (k) {
        var cur = prev[k];
        var empty = cur == null || cur === '' || (Array.isArray(cur) && !cur.length) || (k === 'wish' && !(cur.w || []).some(function (x) { return x.ok; }));
        if (empty) src[k] = it.p[k];
      });
    }
    var r = hrNorm_(src, prev, false);
    r.p.upd = Date.now(); r.p.updBy = 'mgr';
    hrPut_(it.empId, r.p, 'nhập hồ sơ');
    if (it.photo) { try { var v = hrPhotoOk_(it.photo); kvSet_('photo:' + it.empId, v, 'ảnh'); r.p.ph = true; hrPut_(it.empId, r.p, 'ảnh'); } catch (e) {} }
    done++;
  });
  return { done: done };
}

// ---- Mẫu giấy tờ do quán sửa ----
function docTplGet(token) { requireManager_(token); var o = readJsonKey_('doctpl'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; }
function docTplSave(token, key, json) {
  requireManager_(token);
  key = String(key || '');
  if (!/^[a-z0-9_]{2,24}$/.test(key)) throw new Error('Dữ liệu không hợp lệ.');
  var o = null;
  if (json) { try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { o = null; } }
  var out = null;
  kvUpdate_('doctpl', function (cur) {
    cur = cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {};
    if (o && typeof o === 'object') cur[key] = { title: hrStr_(o.title, 60), body: hrStr_(o.body, 6000, true), at: Date.now() };
    else delete cur[key];
    out = cur;
    return cur;
  }, 'mẫu giấy tờ');
  return out;
}

// ===========================================================================
// 📮 ỨNG TUYỂN: link công khai ?apply=<khoá> → ứng viên tự điền form + ảnh 3×4.
// Không cần đăng nhập, nên: khoá đổi được bất kỳ lúc nào, giới hạn 30 lần nộp / giờ cho cả quán,
// trùng tên + số điện thoại trong 10 phút → coi như nộp lại (không tạo bản mới).
// ===========================================================================
var APL_ST_ = ['new', 'contact', 'iv', 'pass', 'fail', 'cancel', 'hired', 'train'];
function aplCfg_() { var c = readJsonKey_('aplcfg'); return c && typeof c === 'object' && !Array.isArray(c) ? c : {}; }
function aplIndex_() { var a = readJsonKey_('apl'); return Array.isArray(a) ? a : []; }
// Nhóm mục trên form ứng tuyển → các trường trong hồ sơ. 'off' = không hỏi · 'opt' = hỏi, không bắt buộc · 'req' = bắt buộc.
var APL_GROUPS_ = {
  birth: ['birth'], gender: ['gender'], nat: ['nat'], tel: ['tel'], email: ['email'], zip: ['zip'], addr1: ['addr1'], addr2: ['addr2'], addrKana: ['addrKana'],
  em: ['emName', 'emRel', 'emTel', 'emAddr'], cm: ['cm', 'cmSta', 'cmRoute', 'cmMin', 'cmKm'], student: ['student', 'school', 'gradYM'], visa: ['visa', 'visaExp', 'permit'],
  wish: ['wish'], wkStyle: ['wkStyle', 'wkNote'], ivPref: ['ivPref', 'ivNote'], contact: ['ctHow', 'ctWhen', 'ctNote'],
  edu: ['edu'], work: ['work'], lic: ['lic'], motive: ['motive'], hobby: ['hobby'], photo: []
};
var APL_FDEF_ = { birth: 'req', gender: 'opt', nat: 'opt', tel: 'req', email: 'opt', zip: 'opt', addr1: 'req', addr2: 'opt', addrKana: 'opt', em: 'opt', cm: 'opt',
  student: 'opt', visa: 'opt', wish: 'opt', wkStyle: 'opt', ivPref: 'opt', contact: 'opt', edu: 'opt', work: 'opt', lic: 'opt', motive: 'opt', hobby: 'opt', photo: 'opt' };
var APL_COLORS_ = ['green', 'yellow', 'navy', 'red', 'black'];
function aplFields_(c) {
  var f = (c && c.fields && typeof c.fields === 'object') ? c.fields : {}, out = {};
  Object.keys(APL_FDEF_).forEach(function (k) { out[k] = ['off', 'opt', 'req'].indexOf(f[k]) !== -1 ? f[k] : APL_FDEF_[k]; });
  return out;
}
function aplPoster_(c) {
  var p = (c && c.poster && typeof c.poster === 'object') ? c.poster : {};
  return { h: p.h == null ? 'STAFF\n募集' : hrStr_(p.h, 40, true), sub: p.sub == null ? '一緒に働く仲間を募集しています' : hrStr_(p.sub, 80), msg: hrStr_(p.msg, 300, true),
           pts: (Array.isArray(p.pts) ? p.pts : ['QRコードを読み取る', 'プロフィール・希望シフトを入力', '店舗からご連絡します']).map(function (x) { return hrStr_(x, 60); }).filter(Boolean).slice(0, 6),
           foot: hrStr_(p.foot, 160), scan: p.scan == null ? 'スマホで読み取って、そのまま応募できます' : hrStr_(p.scan, 80),
           color: APL_COLORS_.indexOf(p.color) !== -1 ? p.color : 'green', qr: p.qr !== false, store: p.store !== false,
           // v24: khung giờ đang tuyển (mỗi dòng một khung) + bật / tắt trên poster
           hrs: (Array.isArray(p.hrs) ? p.hrs : []).map(function (x) { return hrStr_(x, 60); }).filter(Boolean).slice(0, 6), hrsOn: p.hrsOn !== false };
}
function aplCfgOut_() {
  var c = aplCfg_(), u = frontUrl_();
  return { on: !!c.on, key: c.key || '', url: c.key && u ? joinUrl_(u, 'apply', c.key) : '', msg: c.msg || '', at: c.at || 0,
           title: c.title || '', store: c.store || '', fields: aplFields_(c), poster: aplPoster_(c), slots: Array.isArray(c.slots) ? c.slots : [],
           ev: Array.isArray(c.ev) && c.ev.length ? c.ev : [], agree: c.agree || '', done: c.done || '' };
}
function aplCfgGet(token) { requireManager_(token); return aplCfgOut_(); }
function aplCfgSave(token, json) {
  requireManager_(token);
  var o; try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { o = null; }
  o = o || {};
  var c = aplCfg_();
  if (o.on !== undefined) c.on = !!o.on;
  if (o.msg !== undefined) c.msg = hrStr_(o.msg, 400, true);
  if (o.title !== undefined) c.title = hrStr_(o.title, 60);
  if (o.store !== undefined) c.store = hrStr_(o.store, 60);
  if (o.agree !== undefined) c.agree = hrStr_(o.agree, 800, true);
  if (o.done !== undefined) c.done = hrStr_(o.done, 300, true);
  if (o.fields && typeof o.fields === 'object') c.fields = aplFields_({ fields: Object.assign({}, aplFields_(c), o.fields) });   // gửi một phần → giữ phần còn lại
  if (o.poster && typeof o.poster === 'object') c.poster = aplPoster_({ poster: o.poster });
  if (Array.isArray(o.slots)) c.slots = o.slots.map(function (x) { x = x || {}; return { d: hrDate_(x.d), a: hrHm_(x.a), b: hrHm_(x.b) }; })
    .filter(function (x) { return x.d && x.a; }).sort(function (a, b) { return (a.d + a.a) < (b.d + b.a) ? -1 : 1; }).slice(0, 20);
  if (Array.isArray(o.ev)) c.ev = o.ev.map(function (x) { return hrStr_(x, 30); }).filter(Boolean).slice(0, 10);
  if (!c.key || o.rotate) { c.key = Utilities.getUuid().replace(/-/g, '').slice(0, 20); c.at = Date.now(); }
  kvSet_('aplcfg', JSON.stringify(c), 'link ứng tuyển');
  return aplCfgOut_();
}
function aplKeyOk_(key) {
  var c = aplCfg_();
  if (!c.on || !c.key || String(key || '') !== c.key) throw new Error('Link ứng tuyển này không còn hiệu lực. Hãy hỏi quán link mới.');
  return c;
}
/** Trang ứng tuyển (công khai) lấy thông tin quán. */
function aplForm(key) {
  var c = aplKeyOk_(key), st = readSettings_(), co = hrCo_(), today = attYmd_(Date.now());
  return { ok: true, store: c.store || st.storeName || co.store || 'SUBWAY', title: c.title || '', msg: c.msg || '', open: st.openHour || 8, close: st.closeHour || 21,
           addr: co.storeAddr || '', corp: co.corp || '', fields: aplFields_(c), agree: c.agree || '', done: c.done || '',
           slots: (Array.isArray(c.slots) ? c.slots : []).filter(function (x) { return x.d >= today; }) };
}
function aplClean_(o) {
  var r = hrNorm_(o, {}, false).p;
  delete r.note; delete r.wage; delete r.hire; delete r.empNo; delete r.keyHolder; delete r.lent; delete r.insEmp; delete r.insHealth;
  r.name = hrStr_(o.name, 40);
  return r;
}
function aplSubmit(key, json, photo) {
  aplKeyOk_(key);
  var cache = CacheService.getScriptCache(), now = Date.now();
  var rk = 'aplRate:' + Math.floor(now / 3600000), rc = Number(cache.get(rk)) || 0;
  if (rc >= 30) throw new Error('Hệ thống đang bận, vui lòng thử lại sau.');
  var o; try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { o = null; }
  if (!o || typeof o !== 'object') throw new Error('Dữ liệu không hợp lệ.');
  if (o.hp) return { ok: true, no: '000000' };              // ô bẫy máy spam (người thật không thấy ô này)
  var c = aplCfg_(), F = aplFields_(c);
  var a = aplClean_(o);
  // Mục quán TẮT thì không lưu (dù máy gửi lên) — thông tin nhạy cảm chỉ hỏi khi phỏng vấn.
  Object.keys(APL_GROUPS_).forEach(function (g) { if (F[g] === 'off') APL_GROUPS_[g].forEach(function (k) { delete a[k]; }); });
  if (!a.name || !a.kana) throw new Error('Hãy điền họ tên và furigana.');
  if (F.birth === 'req' && !a.birth) throw new Error('Hãy điền ngày sinh.');
  if (F.tel === 'req' && String(a.tel || '').replace(/\D/g, '').length < 10) throw new Error('Số điện thoại chưa đúng.');
  if (F.tel !== 'req' && !a.tel && !a.email) throw new Error('Hãy điền số điện thoại hoặc email để quán liên lạc.');
  if (o.agree !== true) throw new Error('Hãy đồng ý với cách quán sử dụng thông tin cá nhân.');
  var miss = Object.keys(F).filter(function (g) {
    if (F[g] !== 'req' || g === 'birth' || g === 'tel' || g === 'photo') return false;
    var k = APL_GROUPS_[g][0], v = a[k];
    if (g === 'wish') return !(v && v.w && v.w.some(function (x) { return x.ok; }));
    if (g === 'student') return false;
    return v == null || v === '' || (Array.isArray(v) && !v.length);
  });
  if (miss.length) throw new Error('Còn mục bắt buộc chưa điền.');
  var ph = F.photo === 'off' ? '' : hrPhotoOk_(photo);
  if (F.photo === 'req' && !ph) throw new Error('Hãy gửi kèm ảnh chân dung.');
  var dupKey = 'aplDup:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, a.name + '|' + String(a.tel || a.email || '').replace(/\s/g, ''), Utilities.Charset.UTF_8)).slice(0, 20);
  var id = cache.get(dupKey) || ('a' + Utilities.getUuid().replace(/-/g, '').slice(0, 11));
  cache.put(rk, String(rc + 1), 7200);
  cache.put(dupKey, id, 600);
  var prev = readJsonKey_('apl:' + id), fresh = !prev || !prev.id;
  a.id = id; a.at = fresh ? now : (prev.at || now); a.upd = now; a.st = fresh ? 'new' : (prev.st || 'new'); a.src = 'form'; a.ph = !!ph || (!fresh && !!prev.ph);
  a.iv = fresh ? '' : (prev.iv || ''); a.memo = fresh ? '' : (prev.memo || '');
  kvSet_('apl:' + id, JSON.stringify(a), 'ứng tuyển');
  if (ph) kvSet_('aplph:' + id, ph, 'ảnh ứng viên');
  aplIndexPut_(a);
  if (fresh) mgrEvent_('apply', '', attYmd_(now).slice(0, 7), 0, a.name);
  return { ok: true, no: id.slice(-6).toUpperCase() };
}
function aplIndexPut_(a, drop) {
  kvUpdate_('apl', function (cur) {
    cur = Array.isArray(cur) ? cur.filter(function (x) { return x && x.id !== a.id; }) : [];
    if (!drop) cur.push({ id: a.id, nm: a.name, kn: a.kana || '', at: a.at, st: a.st, iv: a.iv || '', ph: !!a.ph, emp: a.empId || '', age: hrAge_(a.birth || '', attYmd_(Date.now())), tel: a.tel || '' });
    cur.sort(function (x, y) { return (y.at || 0) - (x.at || 0); });
    if (cur.length > 400) cur = cur.slice(0, 400);
    return cur;
  }, 'ứng tuyển');
}
function aplList(token) { requireManager_(token); return { list: aplIndex_(), cfg: aplCfgOut_() }; }
function aplGet(token, id) {
  requireManager_(token);
  var a = readJsonKey_('apl:' + String(id || ''));
  if (!a || !a.id) throw new Error('Không tìm thấy ứng viên này.');
  return { a: a, photo: a.ph ? (kvGet_('aplph:' + a.id) || '') : '' };
}
function aplUpdate(token, id, json) {
  requireManager_(token);
  var a = readJsonKey_('apl:' + String(id || ''));
  if (!a || !a.id) throw new Error('Không tìm thấy ứng viên này.');
  var o; try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { o = null; }
  o = o || {};
  if (o.st !== undefined) { if (APL_ST_.indexOf(o.st) === -1) throw new Error('Dữ liệu không hợp lệ.'); a.st = o.st; }
  if (o.iv !== undefined) { var iv = String(o.iv || ''); a.iv = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(iv) ? iv : ''; }
  if (o.memo !== undefined) a.memo = hrStr_(o.memo, 1500, true);
  if (o.score !== undefined) { var sc = Math.round(Number(o.score)); a.score = sc >= 1 && sc <= 5 ? sc : 0; }
  if (o.eval !== undefined && o.eval && typeof o.eval === 'object') {
    a.eval = {};
    Object.keys(o.eval).slice(0, 12).forEach(function (k) { if (/^[a-z0-9_]{1,16}$/.test(k)) { var v = Math.round(Number(o.eval[k])); if (v >= 1 && v <= 5) a.eval[k] = v; } });
  }
  if (o.p && typeof o.p === 'object') {
    var keep = { id: a.id, at: a.at, st: a.st, iv: a.iv, memo: a.memo, score: a.score, eval: a.eval, src: a.src, ph: a.ph, empId: a.empId };
    var np = aplClean_(Object.assign({}, a, o.p));
    a = Object.assign(np, keep);
    if (!a.name) throw new Error('Hãy điền họ tên và furigana.');
  }
  a.upd = Date.now();
  kvSet_('apl:' + a.id, JSON.stringify(a), 'ứng viên');
  aplIndexPut_(a);
  return { a: a };
}
function aplDelete(token, id) {
  requireManager_(token);
  var a = readJsonKey_('apl:' + String(id || ''));
  if (!a || !a.id) throw new Error('Không tìm thấy ứng viên này.');
  kvSet_('apl:' + a.id, '', 'xoá ứng viên');
  if (a.ph) kvSet_('aplph:' + a.id, '', 'xoá ảnh ứng viên');
  aplIndexPut_(a, true);
  return { list: aplIndex_() };
}
/** Quản lý thêm ứng viên bằng tay (phỏng vấn trực tiếp, nhập từ Excel). */
function aplAdd(token, json, photo) {
  requireManager_(token);
  var o; try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { o = null; }
  if (!o || typeof o !== 'object') throw new Error('Dữ liệu không hợp lệ.');
  var a = aplClean_(o);
  if (!a.name) throw new Error('Hãy điền họ tên và furigana.');
  var ph = hrPhotoOk_(photo), now = Date.now();
  a.id = 'a' + Utilities.getUuid().replace(/-/g, '').slice(0, 11); a.at = now; a.upd = now; a.st = APL_ST_.indexOf(o.st) !== -1 ? o.st : 'new';
  a.src = 'mgr'; a.ph = !!ph; a.iv = ''; a.memo = hrStr_(o.memo, 1500, true);
  kvSet_('apl:' + a.id, JSON.stringify(a), 'ứng viên');
  if (ph) kvSet_('aplph:' + a.id, ph, 'ảnh ứng viên');
  aplIndexPut_(a);
  return { a: a };
}
/** Tuyển: tạo nhân viên mới + chép toàn bộ hồ sơ, ảnh, ca mong muốn. */
function aplHire(token, id, json) {
  requireManager_(token);
  var a = readJsonKey_('apl:' + String(id || ''));
  if (!a || !a.id) throw new Error('Không tìm thấy ứng viên này.');
  if (a.empId && hrEmp_(a.empId, false)) throw new Error('Ứng viên này đã được tuyển.');
  var o; try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { o = null; }
  o = o || {};
  var name = hrStr_(o.name || a.name, 40).replace(/\s+/g, ' ');
  if (!name) throw new Error('Hãy điền họ tên và furigana.');
  var list = readEmployees_();
  if (list.some(function (e) { return e.name === name; })) throw new Error('Tên này đã có trong danh sách nhân viên.');
  var empId = genId_();
  list.push({ id: empId, name: name, type: o.type === 'staff' ? 'staff' : 'sa', maxWeek: null });
  saveEmployees(token, JSON.stringify(list));
  var src = {};
  Object.keys(HR_SPEC_).forEach(function (k) { if (a[k] !== undefined) src[k] = a[k]; });
  src.hire = hrDate_(o.hire) || attYmd_(Date.now());
  if (o.wage !== undefined) src.wage = o.wage;
  if (o.etype) src.etype = o.etype;
  var p = hrNorm_(src, {}, false).p;
  p.aplId = a.id; p.upd = Date.now(); p.updBy = 'mgr';
  if (a.ph) { var ph = kvGet_('aplph:' + a.id) || ''; if (ph) { kvSet_('photo:' + empId, ph, 'ảnh'); p.ph = true; } }
  hrPut_(empId, p, 'tuyển');
  a.st = 'hired'; a.empId = empId; a.upd = Date.now();
  kvSet_('apl:' + a.id, JSON.stringify(a), 'tuyển');
  aplIndexPut_(a);
  return { empId: empId, name: name, employees: readEmployees_().map(function (e) { return { id: e.id, name: e.name, type: e.type, code: e.code }; }) };
}

// ===========================================================================
// 🌡 体調チェック: nhân viên tự khai khi vào ca (hoặc trên màn hình quán sau khi chạm thẻ),
// quản lý xem bảng tháng — tên người đi làm tự điền theo lịch — và in theo mẫu giấy.
//   hl:YYYY-MM = { "<ngày>": { "<empId>": { t, tmp, f:{hand,fever,diar,vomit}, n, by } } }
//   hlcfg      = { on: hiện cho nhân viên, punch: hỏi ngay sau 出勤, tmp: ghi nhiệt độ }
// ===========================================================================
var HL_KEYS_ = ['hand', 'fever', 'diar', 'vomit'];
function hlCfg_() {
  var c = readJsonKey_('hlcfg'); c = c && typeof c === 'object' && !Array.isArray(c) ? c : {};
  return { on: c.on === true, punch: c.punch !== false, tmp: c.tmp !== false, label: c.label || '' };
}
function hlConfig(token, json) {
  requireManager_(token);
  var o; try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { o = null; }
  o = o || {};
  var c = hlCfg_();
  ['on', 'punch', 'tmp'].forEach(function (k) { if (o[k] !== undefined) c[k] = !!o[k]; });
  if (o.label !== undefined) c.label = hrStr_(o.label, 40);
  kvSet_('hlcfg', JSON.stringify(c), 'cài đặt 体調チェック');
  return c;
}
function hlBad_(r) {
  if (!r) return false;
  return HL_KEYS_.some(function (k) { return r.f && r.f[k]; }) || (r.tmp != null && r.tmp >= 37.5);
}
function hlNorm_(o) {
  o = o || {};
  var f = {}, tmp = hrNum_(o.tmp, 34, 42.5);
  HL_KEYS_.forEach(function (k) { f[k] = !!(o.f && o.f[k]); });
  return { tmp: tmp, f: f, n: hrStr_(o.n, 120) };
}
function hlRecord_(empId, ymd, o, by) {
  var rec = hlNorm_(o), now = Date.now(), ym = ymd.slice(0, 7), dd = String(Number(ymd.slice(8, 10)));
  rec.t = now; rec.by = by;
  kvUpdate_('hl:' + ym, function (raw) {
    raw = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    (raw[dd] = raw[dd] || {})[empId] = rec;
    return raw;
  }, '体調チェック');
  var bad = hlBad_(rec);
  if (bad && by !== 'mgr') {
    var parts = HL_KEYS_.filter(function (k) { return rec.f[k]; }).map(function (k) { return { hand: '手指の傷', fever: '発熱', diar: '下痢', vomit: '嘔吐' }[k]; });
    if (rec.tmp != null) parts.push(rec.tmp + '℃');
    mgrEvent_('health', empId, ym, Number(dd), parts.join('・'));
  }
  return { rec: rec, bad: bad, ymd: ymd };
}
/** Nhân viên tự khai (chỉ hôm nay) — quản lý sửa được ngày bất kỳ. */
function hlSave(token, empId, json) {
  var who = requireCanEdit_(token, empId);
  var emp = hrEmp_(empId, false);
  if (!emp) throw new Error('Không tìm thấy nhân viên này.');
  var o; try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { o = null; }
  o = o || {};
  var ymd = attYmd_(Date.now());
  if (who.r === 'mgr' && o.d) { ymd = hrDate_(o.d); if (!ymd) throw new Error('Ngày không hợp lệ.'); }
  if (who.r === 'mgr' && o.del) {
    kvUpdate_('hl:' + ymd.slice(0, 7), function (raw) {
      raw = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
      var day = raw[String(Number(ymd.slice(8, 10)))]; if (day) delete day[emp.id];
      return raw;
    }, '体調チェック');
    return { ok: true, del: true };
  }
  return hlRecord_(emp.id, ymd, o, who.r === 'mgr' ? 'mgr' : 'self');
}
function hlToday(token, empId) {
  requireCanEdit_(token, empId);
  var ymd = attYmd_(Date.now()), raw = readJsonKey_('hl:' + ymd.slice(0, 7));
  var r = (raw[String(Number(ymd.slice(8, 10)))] || {})[String(empId)] || null;
  return { ymd: ymd, rec: r, cfg: hlCfg_() };
}
/** Màn hình quán: khai sức khoẻ ngay sau khi chạm thẻ 出勤 (vé hl chỉ dùng được 10 phút, cho đúng người vừa chạm). */
function hlTicket_(empId, now) {
  var win = Math.floor(now / 60000);
  return empId + '.' + win + '.' + attHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, getSecret_('ATT_STORE_K') + ':hl:' + empId + ':' + win, Utilities.Charset.UTF_8), 6);
}
function hlSaveDev(devKey, ticket, json) {
  attDevCheck_(devKey);
  var m = /^(e[0-9A-Za-z_-]{3,24})\.(\d{1,10})\.([0-9a-f]{12})$/.exec(String(ticket || ''));
  var now = Date.now();
  if (!m) throw new Error('Phiên khai sức khoẻ đã hết hạn — chạm thẻ lại.');
  var win = Number(m[2]), ok = hlTicket_(m[1], win * 60000) === ticket;
  if (!ok || win < Math.floor(now / 60000) - 10) throw new Error('Phiên khai sức khoẻ đã hết hạn — chạm thẻ lại.');
  var o; try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { o = null; }
  return hlRecord_(m[1], attYmd_(now), o || {}, 'dev');
}
/** Quản lý: cả tháng + ai có ca từng ngày (để điền sẵn tên). */
function hlMonth(token, ym) {
  requireManager_(token);
  ym = attYm_(ym);
  var emps = readEmployees_(), name = {}, order = {};
  emps.forEach(function (e, i) { name[e.id] = e.name; order[e.id] = i; });
  hrRetired_().forEach(function (r) { if (r && r.e && !name[r.e.id]) name[r.e.id] = r.e.name; });
  var sch = readMonthNormalized_('schedule:' + ym, emps), work = {};
  Object.keys(sch).forEach(function (d) {
    var dm = sch[d] || {}, ids = [];
    Object.keys(dm).forEach(function (id) {
      var e = dm[id];
      if (!e || e.off || !e.shifts || !e.shifts.length || !name[id]) return;
      var own = e.shifts.filter(function (x) { return !x.isSupport; });
      if (!own.length) return;
      ids.push({ id: id, s: own[0].start, e: own[own.length - 1].end });
    });
    ids.sort(function (a, b) { return a.s - b.s || a.e - b.e || (order[a.id] || 0) - (order[b.id] || 0); });
    if (ids.length) work[d] = ids;
  });
  var raw = readJsonKey_('hl:' + ym), att = readJsonKey_('att:' + ym);
  // Người có điểm danh mà không có ca trong lịch (đi thay ca) cũng có tên.
  Object.keys(att || {}).forEach(function (d) {
    Object.keys(att[d] || {}).forEach(function (id) {
      if (!name[id] || !(att[d][id] || []).length) return;
      var l = work[d] || (work[d] = []);
      if (!l.some(function (x) { return x.id === id; })) l.push({ id: id, s: 99, e: 99 });
    });
  });
  return { ym: ym, recs: raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}, work: work, names: name, cfg: hlCfg_(), store: readSettings_().storeName || '' };
}

// ===========================================================================
// 💳 CHẤM CÔNG BẰNG THẺ IC (NFC — Sony PaSoRi): máy đọc gõ số thẻ vào màn hình quán.
//   attcards = { <băm số thẻ>: { e: empId, at, tail: 4 ký tự cuối } }   — không lưu số thẻ gốc.
//   Chỉ máy đã đăng ký làm màn hình quán ('attdev') mới gửi được số thẻ.
// ===========================================================================
function attCardNorm_(s) {
  var v = String(s == null ? '' : s).replace(/[\uFF10-\uFF19\uFF21-\uFF26\uFF41-\uFF46]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
    .toUpperCase().replace(/[\s:\-]/g, '');
  if (!/^[0-9A-F]{6,32}$/.test(v)) throw new Error('Không đọc được số thẻ — hãy chạm thẻ lại.');
  return v;
}
function attCardHash_(n) {
  return attHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, getSecret_('ATT_CARD_K') + ':card:' + n, Utilities.Charset.UTF_8), 12);
}
function attCards_() { var o = readJsonKey_('attcards'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; }
function attCardsDrop_(empId) {
  kvUpdate_('attcards', function (cur) {
    cur = cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {};
    Object.keys(cur).forEach(function (h) { if (cur[h] && cur[h].e === empId) delete cur[h]; });
    return cur;
  }, 'xoá thẻ');
}
function attCardList(token) {
  requireManager_(token);
  var c = attCards_(), name = {};
  readEmployees_().forEach(function (e) { name[e.id] = e.name; });
  return Object.keys(c).filter(function (h) { return c[h] && name[c[h].e]; })
    .map(function (h) { return { h: h.slice(0, 10), e: c[h].e, name: name[c[h].e], tail: c[h].tail || '', at: c[h].at || 0 }; })
    .sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
}
function attCardReg(token, empId, card) {
  requireManager_(token);
  var emp = hrEmp_(empId, false);
  if (!emp) throw new Error('Không tìm thấy nhân viên này.');
  var n = attCardNorm_(card), h = attCardHash_(n);
  getSecret_('ATT_STORE_K');
  kvUpdate_('attcards', function (cur) {
    cur = cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {};
    if (cur[h] && cur[h].e !== emp.id && hrEmp_(cur[h].e, false)) throw new Error('Thẻ này đã được đăng ký cho người khác.');
    var mine = Object.keys(cur).filter(function (k) { return cur[k] && cur[k].e === emp.id && k !== h; })
      .sort(function (a, b) { return (cur[a].at || 0) - (cur[b].at || 0); });
    while (mine.length >= 3) delete cur[mine.shift()];
    cur[h] = { e: emp.id, at: Date.now(), tail: n.slice(-4) };
    return cur;
  }, 'đăng ký thẻ');
  return attCardList(token);
}
function attCardDel(token, empId, h) {
  requireManager_(token);
  empId = String(empId || ''); h = String(h || '');
  kvUpdate_('attcards', function (cur) {
    cur = cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {};
    Object.keys(cur).forEach(function (k) { if (cur[k] && cur[k].e === empId && (!h || k.slice(0, 10) === h)) delete cur[k]; });
    return cur;
  }, 'xoá thẻ');
  return attCardList(token);
}
function attDevCheck_(devKey) {
  devKey = String(devKey || '');
  var d = attDevs_();
  if (!devKey || !d[devKey]) throw new Error('Thiết bị này chưa được đăng ký làm màn hình điểm danh.');
  try { CacheService.getScriptCache().put('attseen:' + devKey.slice(0, 12), String(Date.now()), 21600); } catch (e) {}
  return devKey;
}
function attRateCheck_() {
  var cache = CacheService.getScriptCache(), now = Date.now();
  var rk = 'attRate:' + Math.floor(now / 60000), rc = Number(cache.get(rk)) || 0;
  if (rc >= 60) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  cache.put(rk, String(rc + 1), 120);
}
function attCardEmp_(devKey, card) {
  var cfg = attCfg_();
  if (!cfg.on) throw new Error('Điểm danh bằng QR đang tắt.');
  if (!(cfg.methods && cfg.methods.nfc)) throw new Error('Quán chưa bật chấm công bằng thẻ IC.');
  attDevCheck_(devKey);
  attRateCheck_();
  var n = attCardNorm_(card), c = attCards_()[attCardHash_(n)];
  var emp = c ? readEmployees_().filter(function (e) { return e.id === c.e; })[0] : null;
  if (!emp) { var er = new Error('Thẻ chưa được đăng ký — nhờ quản lý đăng ký thẻ trong ⏱ 勤怠.'); throw er; }
  return { emp: emp, cfg: cfg, tail: n.slice(-4) };
}
/** Thao tác nên làm tiếp theo: chưa vào → 出勤 · đang nghỉ → 休憩終了 · đang làm: gần giờ tan (≤45') hoặc đã nghỉ rồi → 退勤, chưa nghỉ → 休憩開始. */
function attSuggest_(list, sched, now, ymd) {
  var last = attLastKind_(list);
  if (!last || last === 'out') return 'in';
  if (last === 'bs') return 'be';
  var hadBreak = list.some(function (p) { return p.k === 'bs'; });
  if (sched && now >= attDayStart_(ymd) + sched.end * 3600000 - 45 * 60000) return 'out';
  if (hadBreak) return 'out';
  if (sched) return 'bs';
  var inT = 0; list.forEach(function (p) { if (p.k === 'in') inT = p.t; });
  return now - inT >= 4 * 3600000 ? 'bs' : 'out';
}
/** Máy quét (trang riêng) đọc mã nhân viên → biết là ai + nên bấm gì (chưa ghi). */
function attWhoCode_(code) {
  var cfg = attCfg_();
  if (!cfg.on) throw new Error('Điểm danh bằng QR đang tắt.');
  attRateCheck_();
  var now = Date.now();
  var mc = /^SBA2:(e[0-9A-Za-z_-]{3,24}):([0-9a-f]{10})$/.exec(String(code || '').trim());
  if (mc) return attWhoOf_(attQrCardEmp_(mc[1], mc[2]), now, cfg);
  var m = /^SBA1:(e[0-9A-Za-z_-]{3,24}):(\d{1,12}):([0-9a-f]{8})$/.exec(String(code || '').trim());
  if (!m) throw new Error('Đây không phải mã QR điểm danh của app.');
  if (m[2] === '0') return attWhoOf_(attQrCardEmp_(m[1], m[3]), now, cfg);              // mã cố định (khung 0)
  var empId = m[1], win = Number(m[2]);
  var emp = readEmployees_().filter(function (e) { return e.id === empId; })[0], key = attKeys_()[empId];
  if (!emp || !key || attSig_(key, empId, win) !== m[3]) throw new Error('Mã QR không hợp lệ (mã của quán khác hoặc đã bị đặt lại) — mở lại mã trong app.');
  var cur = Math.floor(now / ATT_WIN_MS);
  if (win < cur - ATT_WIN_BACK || win > cur + ATT_WIN_AHEAD) throw new Error('Mã QR đã hết hạn — mở lại mã trong app rồi quét lại.');
  return attWhoOf_(emp, now, cfg);
}
function attWhoOf_(emp, now, cfg) {
  var today = attYmd_(now), yest = attAddDays_(today, -1);
  var yl = attList_(readJsonKey_('att:' + yest.slice(0, 7)), Number(yest.slice(8, 10)), emp.id);
  var target = attOpenYest_(yl, yest, today, emp.id, now) ? yest : today;
  var list = target === yest ? yl : attList_(readJsonKey_('att:' + today.slice(0, 7)), Number(today.slice(8, 10)), emp.id);
  var last = attLastKind_(list), sch = attSchedOf_(target, emp.id);
  return { id: emp.id, name: emp.name, list: list.map(function (p) { return { k: p.k, hm: attHm_(p.t) }; }), last: last,
           allowed: ATT_NEXT_[last] || ['in'], sug: attSuggest_(list, sch, now, target), sched: sch, now: now, auto: cfg.auto !== false };
}
/** Màn hình quán: chạm thẻ → biết là ai + hôm nay đã điểm danh gì + nút nên bấm. */
function attNfc(devKey, card) {
  var x = attCardEmp_(devKey, card), r = attWhoOf_(x.emp, Date.now(), x.cfg);
  r.hl = !!x.cfg.health && hlCfg_().on;
  return r;
}
function attPunchCard(devKey, card, kind) {
  kind = String(kind || '');
  if (ATT_KINDS.indexOf(kind) === -1) throw new Error('Thao tác không hợp lệ.');
  var x = attCardEmp_(devKey, card), now = Date.now();
  var r = attRecord_(x.emp, kind, now, x.cfg, 'nfc');
  if (kind === 'in' && x.cfg.health && hlCfg_().on) {
    var t = attYmd_(now), raw = readJsonKey_('hl:' + t.slice(0, 7));
    if (!((raw[String(Number(t.slice(8, 10)))] || {})[x.emp.id])) { r.hl = hlTicket_(x.emp.id, now); r.hlTmp = hlCfg_().tmp; }
  }
  return r;
}

// ===========================================================================
// 🧾 年末調整: số liệu lương từng tháng (nhập từ bảng lương / ước tính từ chấm công) + các khoản khấu trừ.
//   ye:<năm> = { <empId>: { m:[12 × {g,si,tx}], bn:[{g,si,tx,d}], prev:{g,si,tx}, ins:{…}, kou, done, memo, upd } }
// Cách tính nằm ở máy (Index.html, yeCalc) để thấy kết quả ngay khi gõ; máy chủ chỉ lưu.
// ===========================================================================
var YE_INS_KEYS_ = ['lifeNew', 'lifeOld', 'care', 'penNew', 'penOld', 'eq', 'eqOld', 'small', 'house', 'siOther'];
function yeYear_(y) { y = Math.round(Number(y)); if (!(y >= 2020 && y <= 2100)) throw new Error('Dữ liệu không hợp lệ.'); return y; }
function yeMoney_(v) { var n = hrNum_(v, 0, 100000000); return n == null ? 0 : Math.round(n); }
function yeNorm_(o) {
  o = o || {};
  var m = [], mm = Array.isArray(o.m) ? o.m : [];
  for (var i = 0; i < 12; i++) { var x = mm[i] || {}; m.push({ g: yeMoney_(x.g), si: yeMoney_(x.si), tx: yeMoney_(x.tx), est: x.est === true }); }
  var bn = (Array.isArray(o.bn) ? o.bn : []).slice(0, 3).map(function (x) { x = x || {}; return { g: yeMoney_(x.g), si: yeMoney_(x.si), tx: yeMoney_(x.tx), d: hrDate_(x.d) }; })
    .filter(function (x) { return x.g || x.si || x.tx; });
  var pv = o.prev || {}, ins = {};
  YE_INS_KEYS_.forEach(function (k) { ins[k] = yeMoney_((o.ins || {})[k]); });
  ins.young = !!(o.ins && o.ins.young);
  return { m: m, bn: bn, prev: { g: yeMoney_(pv.g), si: yeMoney_(pv.si), tx: yeMoney_(pv.tx), name: hrStr_(pv.name, 60) }, ins: ins,
           kou: o.kou === 'otsu' ? 'otsu' : 'kou', done: !!o.done, memo: hrStr_(o.memo, 400, true), upd: Date.now() };
}
function yeGet(token, year) {
  requireManager_(token);
  year = yeYear_(year);
  var data = readJsonKey_('ye:' + year), emps = readEmployees_(), ret = hrRetired_();
  var people = emps.map(function (e) { return { e: e, retired: false }; })
    .concat(ret.filter(function (r) { return r && r.e && r.retire && String(r.retire.date || '').slice(0, 4) >= String(year); }).map(function (r) { return { e: r.e, retired: true }; }));
  kvPrefetch_(people.map(function (x) { return 'prof:' + x.e.id; }));
  // Giờ làm thực theo chấm công từng tháng (để ước tính lương khi chưa có bảng lương).
  var hrs = {};
  for (var mo = 1; mo <= 12; mo++) {
    var ym = year + '-' + ('0' + mo).slice(-2), raw = readJsonKey_('att:' + ym);
    Object.keys(raw || {}).forEach(function (d) {
      Object.keys(raw[d] || {}).forEach(function (id) {
        var l = raw[d][id]; if (!Array.isArray(l) || !l.length) return;
        var a = hrs[id] || (hrs[id] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        a[mo - 1] += attWorkHours_(l, null);          // v41: cộng số lẻ thật, làm tròn MỘT lần ở cuối (tránh lệch tích luỹ)
      });
    });
  }
  Object.keys(hrs).forEach(function (id) { hrs[id] = hrs[id].map(function (v) { return Math.round(v * 10) / 10; }); });
  var rows = people.map(function (x) {
    var p = hrGet_(x.e.id);
    return { id: x.e.id, name: x.e.name, retired: x.retired, travel: Number(x.e.travel) || 0,
             p: { kana: p.kana || '', birth: p.birth || '', zip: p.zip || '', addr1: p.addr1 || '', addr2: p.addr2 || '', hire: p.hire || '', wage: p.wage == null ? null : p.wage,
                  retire: p.retire || null, spouse: p.spouse || null, deps: p.deps || [], selfDis: p.selfDis || '', widow: p.widow || '', kinro: !!p.kinro,
                  kou: p.kou || '', student: !!p.student, yeOk: p.yeOk || 0 },
             d: data[x.e.id] || null, hrs: hrs[x.e.id] || null };
  });
  return { year: year, rows: rows, co: hrCo_() };
}
function yeSave(token, year, empId, json) {
  requireManager_(token);
  year = yeYear_(year);
  empId = String(empId || '');
  if (!hrEmp_(empId, true)) throw new Error('Không tìm thấy nhân viên này.');
  var o; try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { o = null; }
  if (!o || typeof o !== 'object') throw new Error('Dữ liệu không hợp lệ.');
  var rec = yeNorm_(o);
  kvUpdate_('ye:' + year, function (cur) {
    cur = cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {};
    cur[empId] = rec;
    return cur;
  }, '年末調整');
  return rec;
}

/** Thông số HR gửi kèm bootstrap (nhẹ): nhân viên có hiện thẻ 体調 / có được nhờ khai 年末調整 không. */
function hrBoot_() {
  try { var c = hlCfg_(); return { hl: c, yeAsk: hrCo_().yeAsk || 0 }; } catch (e) { return { hl: { on: false }, yeAsk: 0 }; }
}

/** Nhân viên vừa quét mã của quán: biết nên bấm gì (cùng luật với thẻ IC / máy quét). */
function attSelfWho(token, empId) {
  requireCanEdit_(token, empId);
  var emp = readEmployees_().filter(function (e) { return e.id === String(empId); })[0];
  if (!emp) throw new Error('Không tìm thấy nhân viên này.');
  return attWhoOf_(emp, Date.now(), attCfg_());
}
