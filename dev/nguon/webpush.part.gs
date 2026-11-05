// ===========================================================================
// 🔔 WEB PUSH (v45) — thông báo đẩy lên điện thoại như app thật, KHÔNG cần Firebase.
// ---------------------------------------------------------------------------
// Chuẩn Web Push (RFC 8030 / 8291 / 8292). Apps Script không có sẵn mật mã đường cong elip
// nên phần dưới tự làm: P-256 (ký ECDSA cho VAPID, trao khoá ECDH), HKDF-SHA256, AES-128-GCM.
// Số lớn dùng BigInt (có trong Apps Script V8). KHÔNG dùng cú pháp 0n / 1n — luôn gọi BigInt(...)
// cho chắc trình đọc mã của Apps Script.
// Ngẫu nhiên: Utilities.getUuid() (Java SecureRandom) trộn qua SHA-256.
// Chỉ chạy được với trang GitHub (trang Apps Script nằm trong khung googleusercontent — không
// đăng ký được service worker nên không nhận được thông báo đẩy).
// ===========================================================================
var WP_ = null;
function wp_() {
  if (WP_) return WP_;
  var B = BigInt;
  var P = B('0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff');
  var N = B('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551');
  var CB = B('0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b');
  var G = [B('0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296'),
           B('0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5')];
  var Z = B(0), ONE = B(1), TWO = B(2), THREE = B(3), EIGHT = B(8);
  function md(a, m) { var r = a % m; return r < Z ? r + m : r; }
  function inv(a, m) {                     // nghịch đảo modulo (Euclid mở rộng)
    var r0 = md(a, m), r1 = m, s0 = ONE, s1 = Z;
    while (r1 !== Z) { var q = r0 / r1, t = r0 - q * r1; r0 = r1; r1 = t; t = s0 - q * s1; s0 = s1; s1 = t; }
    return md(s0, m);
  }
  // Toạ độ Jacobian [X, Y, Z]; điểm vô cực = Z === 0.
  function dbl(p) {
    if (p[2] === Z || p[1] === Z) return [ONE, ONE, Z];
    var X = p[0], Y = p[1], Zp = p[2];
    var d = md(Zp * Zp, P), a = md(THREE * (X - d) * (X + d), P);     // a = -3
    var y2 = md(Y * Y, P), s = md(B(4) * X * y2, P);
    var X3 = md(a * a - TWO * s, P);
    var Y3 = md(a * (s - X3) - EIGHT * y2 * y2, P);
    var Z3 = md(TWO * Y * Zp, P);
    return [X3, Y3, Z3];
  }
  function add(p, q) {                     // q dạng affine [x, y]
    if (p[2] === Z) return [q[0], q[1], ONE];
    var z2 = md(p[2] * p[2], P);
    var u2 = md(q[0] * z2, P), s2 = md(q[1] * z2 * p[2], P);
    var h = md(u2 - p[0], P), r = md(s2 - p[1], P);
    if (h === Z) return r === Z ? dbl(p) : [ONE, ONE, Z];
    var h2 = md(h * h, P), h3 = md(h2 * h, P), v = md(p[0] * h2, P);
    var X3 = md(r * r - h3 - TWO * v, P);
    var Y3 = md(r * (v - X3) - p[1] * h3, P);
    var Z3 = md(p[2] * h, P);
    return [X3, Y3, Z3];
  }
  function aff(p) {
    if (p[2] === Z) return null;
    var zi = inv(p[2], P), zi2 = md(zi * zi, P);
    return [md(p[0] * zi2, P), md(p[1] * zi2 * zi, P)];
  }
  function mul(k, q) {
    var r = [ONE, ONE, Z], bits = k.toString(2);
    for (var i = 0; i < bits.length; i++) { r = dbl(r); if (bits.charAt(i) === '1') r = add(r, q); }
    return aff(r);
  }
  function onCurve(q) {
    if (!q || q[0] < Z || q[0] >= P || q[1] < Z || q[1] >= P) return false;
    return md(q[1] * q[1] - (q[0] * q[0] * q[0] - THREE * q[0] + CB), P) === Z;
  }
  // ---- byte (mảng số 0..255) ----
  function u8(a) { return Array.prototype.map.call(a, function (b) { return b & 255; }); }
  function s8(a) { return a.map(function (b) { return b > 127 ? b - 256 : b; }); }
  function str(s) { return u8(Utilities.newBlob(String(s)).getBytes()); }
  function hex(a) { return a.map(function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join(''); }
  function toInt(a) { return a.length ? B('0x' + hex(a)) : Z; }
  function toBytes(x, len) { var h = x.toString(16); while (h.length < len * 2) h = '0' + h; var o = []; for (var i = 0; i < len; i++) o.push(parseInt(h.substr(i * 2, 2), 16)); return o; }
  function sha(a) { return u8(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s8(a))); }
  function hmac(key, data) { return u8(Utilities.computeHmacSha256Signature(s8(data), s8(key))); }
  var CNT = 0;
  function rnd(n) {
    var out = [];
    while (out.length < n) out = out.concat(sha(str(Utilities.getUuid() + '|' + Utilities.getUuid() + '|' + Date.now() + '|' + (CNT++))));
    return out.slice(0, n);
  }
  function b64u(a) { return Utilities.base64EncodeWebSafe(s8(a)).replace(/=+$/, ''); }
  function unb64u(s) { s = String(s || '').replace(/\s+/g, ''); while (s.length % 4) s += '='; return u8(Utilities.base64DecodeWebSafe(s)); }
  function pubBytes(q) { return [4].concat(toBytes(q[0], 32), toBytes(q[1], 32)); }
  function pubPoint(a) { if (!a || a.length !== 65 || a[0] !== 4) return null; var q = [toInt(a.slice(1, 33)), toInt(a.slice(33))]; return onCurve(q) ? q : null; }
  function newKey() {
    var d;
    do { d = toInt(rnd(32)); } while (d === Z || d >= N);
    return { d: d, q: mul(d, G) };
  }
  // ---- ECDSA P-256 / SHA-256, chữ ký dạng r||s (64 byte) như JWT ES256 ----
  function sign(d, msg) {
    var hb = sha(msg), e = md(toInt(hb), N), db = toBytes(d, 32), ctr = 0;
    while (true) {
      // k = HMAC(d, băm ‖ ngẫu nhiên ‖ đếm) — vừa theo khoá vừa có ngẫu nhiên, không bao giờ lặp k.
      var k = toInt(hmac(db, hb.concat(rnd(32), [ctr++ & 255])));
      if (k === Z || k >= N) continue;
      var R = mul(k, G), r = md(R[0], N);
      if (r === Z) continue;
      var s = md(inv(k, N) * (e + r * d), N);
      if (s === Z) continue;
      return toBytes(r, 32).concat(toBytes(s, 32));
    }
  }
  // ---- AES-128 (chỉ chiều mã hoá — GCM chỉ cần vậy) ----
  var SBOX = null, RCON = [1, 2, 4, 8, 16, 32, 64, 128, 27, 54];
  function sbox() {
    if (SBOX) return SBOX;
    SBOX = new Array(256);
    var p = 1, q = 1;
    do {
      p = p ^ ((p << 1) & 255) ^ (p & 128 ? 27 : 0);
      q ^= q << 1; q ^= q << 2; q ^= q << 4; q &= 255; if (q & 128) q ^= 9;
      var x = q ^ ((q << 1) | (q >> 7)) ^ ((q << 2) | (q >> 6)) ^ ((q << 3) | (q >> 5)) ^ ((q << 4) | (q >> 4));
      SBOX[p] = (x ^ 99) & 255;
    } while (p !== 1);
    SBOX[0] = 99;
    return SBOX;
  }
  function expand(key) {
    var S = sbox(), w = key.slice();
    for (var i = 16, r = 0; i < 176; i += 4) {
      var t = w.slice(i - 4, i);
      if (i % 16 === 0) { t = [S[t[1]] ^ RCON[r++], S[t[2]], S[t[3]], S[t[0]]]; }
      for (var j = 0; j < 4; j++) w.push(w[i - 16 + j] ^ t[j]);
    }
    return w;
  }
  function xt(b) { return ((b << 1) ^ (b & 128 ? 27 : 0)) & 255; }
  function aesBlock(w, inp) {
    var S = sbox(), s = inp.slice(), r, c, i;
    for (i = 0; i < 16; i++) s[i] ^= w[i];
    for (r = 1; r <= 10; r++) {
      for (i = 0; i < 16; i++) s[i] = S[s[i]];
      var t = s.slice();                                    // ShiftRows (cột chính)
      for (c = 0; c < 4; c++) for (var row = 1; row < 4; row++) s[c * 4 + row] = t[((c + row) % 4) * 4 + row];
      if (r < 10) for (c = 0; c < 4; c++) {                 // MixColumns
        var a0 = s[c * 4], a1 = s[c * 4 + 1], a2 = s[c * 4 + 2], a3 = s[c * 4 + 3], x = a0 ^ a1 ^ a2 ^ a3;
        s[c * 4] ^= x ^ xt(a0 ^ a1); s[c * 4 + 1] ^= x ^ xt(a1 ^ a2); s[c * 4 + 2] ^= x ^ xt(a2 ^ a3); s[c * 4 + 3] ^= x ^ xt(a3 ^ a0);
      }
      for (i = 0; i < 16; i++) s[i] ^= w[r * 16 + i];
    }
    return s;
  }
  var RP = B('0xe1') << B(120), M128 = (ONE << B(128)) - ONE;
  function gmul(x, y) {                     // nhân trong GF(2^128) theo quy ước GCM
    var z = Z, v = y;
    for (var i = 127; i >= 0; i--) {
      if ((x >> B(i)) & ONE) z ^= v;
      v = (v & ONE) ? ((v >> ONE) ^ RP) : (v >> ONE);
    }
    return z & M128;
  }
  function gcm(key, iv, pt) {
    var w = expand(key), H = toInt(aesBlock(w, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    var j0 = iv.concat([0, 0, 0, 1]), ct = [], ctr = 1;
    for (var i = 0; i < pt.length; i += 16) {
      ctr++;
      var ks = aesBlock(w, iv.concat(toBytes(B(ctr), 4)));
      for (var j = i; j < Math.min(i + 16, pt.length); j++) ct.push(pt[j] ^ ks[j - i]);
    }
    var y = Z;
    for (var k = 0; k < ct.length; k += 16) {
      var blk = ct.slice(k, k + 16); while (blk.length < 16) blk.push(0);
      y = gmul(y ^ toInt(blk), H);
    }
    y = gmul(y ^ B(ct.length * 8), H);            // độ dài: AAD = 0 (64 bit cao), bản mã (64 bit thấp)
    var tag = toBytes(y ^ toInt(aesBlock(w, j0)), 16);
    return ct.concat(tag);
  }
  // ---- RFC 8291: mã hoá nội dung cho một máy nhận ----
  function encrypt(uaPubB64, authB64, text, asKey) {
    var uaPub = unb64u(uaPubB64), auth = unb64u(authB64), Q = pubPoint(uaPub);
    if (!Q || auth.length !== 16) throw new Error('khoá máy nhận không hợp lệ');
    var as = asKey || newKey(), asPub = pubBytes(as.q);
    var ecdh = toBytes(mul(as.d, Q)[0], 32);
    var prkKey = hmac(auth, ecdh);
    var ikm = hmac(prkKey, str('WebPush: info').concat([0], uaPub, asPub, [1]));
    var salt = rnd(16), prk = hmac(salt, ikm);
    var cek = hmac(prk, str('Content-Encoding: aes128gcm').concat([0, 1])).slice(0, 16);
    var nonce = hmac(prk, str('Content-Encoding: nonce').concat([0, 1])).slice(0, 12);
    var body = gcm(cek, nonce, str(text).concat([2]));
    return salt.concat([0, 0, 16, 0], [65], asPub, body);    // rs = 4096
  }
  // ---- RFC 8292: JWT VAPID ----
  function jwt(dB64, aud, sub, exp) {
    var h = b64u(str(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
    var c = b64u(str(JSON.stringify({ aud: aud, exp: exp, sub: sub })));
    return h + '.' + c + '.' + b64u(sign(toInt(unb64u(dB64)), str(h + '.' + c)));
  }
  WP_ = { newKey: newKey, pubBytes: pubBytes, pubPoint: pubPoint, b64u: b64u, unb64u: unb64u, toBytes: toBytes,
          encrypt: encrypt, jwt: jwt, sign: sign, mul: mul, G: G, gcm: gcm, s8: s8 };
  return WP_;
}

// ---------------------------------------------------------------------------
// Lưu trữ: khoá 'push' trong sheet = { subs: [...], pref: { empId: { tm: 0|1 } }, cfg: { reg: ngày hạn đăng ký } }
//   sub = { id, w: 'm' (quản lý) | empId, ep: endpoint, k: p256dh, a: auth, l: ngôn ngữ, ua, at, ok: lần gửi được gần nhất }
// Khoá VAPID: Script Properties VAPID_D (khoá bí mật) / VAPID_Q (khoá công khai) — không nằm trong sheet.
// ---------------------------------------------------------------------------
var PUSH_MAX_SUBS = 80, PUSH_MAX_PER_WHO = 4;
var PUSH_HOST_RE = /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.notify\.windows\.com|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com)\/[\w\-.~%\/:+=]{8,700}$/;
var PUSH_REG_DAY = 20;            // mặc định: hạn đăng ký lịch tháng sau là ngày 20
function pushKeys_() {
  var p = props_(), d = p.getProperty('VAPID_D'), q = p.getProperty('VAPID_Q');
  if (d && q) return { d: d, q: q };
  var W = wp_(), k = W.newKey();
  d = W.b64u(W.toBytes(k.d, 32)); q = W.b64u(W.pubBytes(k.q));
  p.setProperty('VAPID_D', d); p.setProperty('VAPID_Q', q);
  return { d: d, q: q };
}
function pushRead_() {
  var o = readJsonKey_('push');
  if (!o || typeof o !== 'object' || Array.isArray(o)) o = {};
  if (!Array.isArray(o.subs)) o.subs = [];
  if (!o.pref || typeof o.pref !== 'object') o.pref = {};
  if (!o.cfg || typeof o.cfg !== 'object') o.cfg = {};
  return o;
}
/** Sửa khoá 'push' trong khoá script. Đang giữ khoá sẵn (hasLock) thì sửa luôn, không lồng khoá. */
function pushEdit_(fn) {
  var lock = LockService.getScriptLock(), mine = false;
  try { mine = lock.hasLock(); } catch (e0) {}
  if (!mine && !lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_(), o = readMonthObject_(sheet, 'push');
    if (!o || typeof o !== 'object' || Array.isArray(o)) o = {};
    if (!Array.isArray(o.subs)) o.subs = [];
    if (!o.pref || typeof o.pref !== 'object') o.pref = {};
    if (!o.cfg || typeof o.cfg !== 'object') o.cfg = {};
    var r = fn(o);
    pubPut_(sheet, 'push', o);
    return r;
  } finally { if (!mine) lock.releaseLock(); }
}
function pushWho_(p) { return p.r === 'mgr' ? 'm' : String(p.e); }
function pushInUse_() { try { return pushRead_().subs.length > 0; } catch (e) { return false; } }
function pushLang_(l) { return l === 'ja' || l === 'en' ? l : 'vi'; }

/** Thông tin cho màn Cài đặt thông báo. */
function pushInfo(token) {
  var p = auth_(token), o = pushRead_(), w = pushWho_(p);
  var out = { pub: pushKeys_().q, mine: o.subs.filter(function (s) { return s.w === w; }).map(function (s) { return { ua: s.ua || '', at: s.at || 0, ok: s.ok || 0, ep: s.ep.slice(-24), host: s.ep.split('/')[2] || '', last: s.last || null }; }),
              tm: p.r === 'emp' ? !(o.pref[w] && o.pref[w].tm === 0) : null, front: !!frontOnly_() };
  if (p.r === 'mgr') {
    var reg = o.cfg.reg === undefined ? PUSH_REG_DAY : Number(o.cfg.reg) || 0;
    var cnt = {}; o.subs.forEach(function (s) { if (s.w !== 'm') cnt[s.w] = 1; });
    out.reg = reg; out.staffOn = Object.keys(cnt).length; out.mgrOn = o.subs.filter(function (s) { return s.w === 'm'; }).length;
  }
  return out;
}
/** Máy này đăng ký nhận thông báo (dữ liệu PushSubscription.toJSON() từ trình duyệt). */
function pushSubscribe(token, subJson, ua, lang) {
  var p = auth_(token), s;
  try { s = typeof subJson === 'string' ? JSON.parse(subJson) : subJson; } catch (e) { s = null; }
  var ep = String(s && s.endpoint || ''), k = String(s && s.keys && s.keys.p256dh || ''), a = String(s && s.keys && s.keys.auth || '');
  if (!PUSH_HOST_RE.test(ep)) throw new Error('Trình duyệt này không hỗ trợ thông báo đẩy.');
  var W = wp_();
  try { if (!W.pubPoint(W.unb64u(k)) || W.unb64u(a).length !== 16) throw 0; } catch (e2) { throw new Error('Đăng ký thông báo không hợp lệ — thử tắt rồi bật lại.'); }
  if (!mailRate_('pushsub:' + pushWho_(p), 20, 3600)) throw new Error('Thử lại sau ít phút.');
  pushKeys_();
  var w = pushWho_(p);
  var n = pushEdit_(function (o) {
    o.subs = o.subs.filter(function (x) { return x.ep !== ep; });          // máy này trước đó của người khác → chuyển sang người đang đăng nhập
    var mine = o.subs.filter(function (x) { return x.w === w; }).sort(function (x, y) { return (x.at || 0) - (y.at || 0); });
    while (mine.length >= PUSH_MAX_PER_WHO) { var old = mine.shift(); o.subs = o.subs.filter(function (x) { return x !== old; }); }
    o.subs.push({ id: Utilities.getUuid().slice(0, 8), w: w, ep: ep, k: k, a: a, l: pushLang_(lang), ua: uaLabel_(ua), at: Date.now(), ok: 0 });
    while (o.subs.length > PUSH_MAX_SUBS) o.subs.shift();
    return o.subs.filter(function (x) { return x.w === w; }).length;
  });
  ensurePushTrigger_(true);
  ensureMailTrigger_(true);
  return { ok: true, n: n };
}
/** Máy này thôi nhận (tắt trong Cài đặt / đăng xuất). */
function pushUnsubscribe(token, endpoint) {
  var p = auth_(token), w = pushWho_(p), ep = String(endpoint || '');
  var n = pushEdit_(function (o) {
    var before = o.subs.length;
    o.subs = o.subs.filter(function (x) { return !(x.ep === ep && (x.w === w || p.r === 'mgr')); });
    return before - o.subs.length;
  });
  return { ok: true, removed: n };
}
/** Nhân viên bật/tắt "nhắc ca ngày mai". Quản lý đặt ngày hạn đăng ký (0 = không nhắc). */
function pushPrefs(token, prefJson) {
  var p = auth_(token), x = {};
  try { x = JSON.parse(prefJson || '{}') || {}; } catch (e) { x = {}; }
  return pushEdit_(function (o) {
    if (p.r === 'emp' && x.tm !== undefined) { var w = String(p.e); o.pref[w] = o.pref[w] || {}; o.pref[w].tm = x.tm ? 1 : 0; }
    if (p.r === 'mgr' && x.reg !== undefined) { var r = Math.round(Number(x.reg)); o.cfg.reg = (r >= 1 && r <= 28) ? r : 0; }
    return { ok: true };
  });
}
/** Gửi thử tới các máy của chính người bấm. */
function pushTest(token) {
  var p = auth_(token), w = pushWho_(p);
  if (!mailRate_('pushtest:' + w, 6, 3600)) throw new Error('Đã gửi thử nhiều lần — chờ một lúc rồi thử lại.');
  var r = pushSend_([{ w: w, tx: { vi: ['✅ Thông báo đã bật', 'Máy này sẽ nhận thông báo của ' + storeLabel_() + '.'],
                                  ja: ['✅ 通知がオンになりました', 'この端末に ' + storeLabel_() + ' の通知が届きます。'],
                                  en: ['✅ Notifications are on', 'This device will get ' + storeLabel_() + ' notifications.'] }, tag: 'test' }]);
  if (!r.sent && !r.fail && !r.err) throw new Error('Máy chủ chưa có đăng ký của máy này — bấm Tắt rồi Bật lại.');
  return r;                 // v46.1: trả chi tiết từng máy (mã trả lời của Apple / Google) để hộp thoại hiện cho dễ dò
}

/**
 * Gửi thông báo. items = [{ w: 'm' | empId | '*staff', tx: { vi: [tiêu đề, nội dung], ja: [...], en: [...] }, tag, url }]
 * Mỗi máy nhận đúng ngôn ngữ nó chọn lúc bật. Máy hỏng (404/410) tự bị xoá. Lỗi gì cũng không làm hỏng thao tác chính.
 */
function pushSend_(items) {
  var res = { sent: 0, fail: 0, code: 0 };
  try {
    if (!items || !items.length) return res;
    var o = pushRead_();
    if (!o.subs.length) return res;
    var keys = pushKeys_(), W = wp_(), as = W.newKey(), front = frontOnly_() || '';
    // VAPID "sub": Apple bắt buộc mailto: hoặc https: hợp lệ → trang GitHub, không có thì link /exec của quán.
    var ex = attExecUrl_(), sub = /^https:\/\//.test(front) ? front.replace(/\?.*$/, '') : (/^https:\/\//.test(ex) ? ex : 'mailto:noreply@example.com');
    var now = Math.floor(Date.now() / 1000), cache = CacheService.getScriptCache();
    var reqs = [], meta = [];
    items.forEach(function (it) {
      o.subs.forEach(function (s) {
        if (!(s.w === it.w || (it.w === '*staff' && s.w !== 'm'))) return;
        var lg = pushLang_(s.l), t = (it.tx && (it.tx[lg] || it.tx.vi)) || ['', ''];
        var payload = JSON.stringify({ t: String(t[0] || '').slice(0, 120), b: String(t[1] || '').slice(0, 600), tag: String(it.tag || '').slice(0, 60),
                                       u: it.url || front || '', s: storeLabel_() });
        try {
          var aud = s.ep.split('/').slice(0, 3).join('/'), ck = 'wpjwt:' + aud.slice(8, 60), jwt = cache.get(ck);
          if (!jwt) { jwt = W.jwt(keys.d, aud, sub, now + 12 * 3600); try { cache.put(ck, jwt, 11 * 3600); } catch (e1) {} }
          var body = W.encrypt(s.k, s.a, payload, as);
          // Gửi dạng Blob (byte thô) — mảng số trần có thể bị UrlFetchApp hiểu nhầm thành dữ liệu biểu mẫu.
          reqs.push({ url: s.ep, method: 'post', contentType: 'application/octet-stream', payload: Utilities.newBlob(W.s8(body), 'application/octet-stream'), muteHttpExceptions: true, followRedirects: false,
                      headers: { 'TTL': '86400', 'Urgency': it.urgent ? 'high' : 'normal', 'Content-Encoding': 'aes128gcm',
                                 'Authorization': 'vapid t=' + jwt + ', k=' + keys.q } });
          meta.push(s);
        } catch (e2) { res.fail++; }
      });
    });
    if (!reqs.length) return res;
    var dead = [], okIds = [], last = {};
    res.list = [];
    for (var i = 0; i < reqs.length; i += 25) {
      var part = reqs.slice(i, i + 25), out = [];
      try { out = UrlFetchApp.fetchAll(part); } catch (e3) { out = []; res.err = String((e3 && e3.message) || e3).slice(0, 200); }
      part.forEach(function (rq, j) {
        var r = out[j], c = 0, txt = '';
        try { c = r ? r.getResponseCode() : 0; } catch (e4) { c = 0; }
        try { txt = r ? String(r.getContentText() || '').replace(/\s+/g, ' ').slice(0, 160) : 'no-response'; } catch (e6) { txt = ''; }
        var s = meta[i + j];
        last[s.id] = { c: c, e: c >= 200 && c < 300 ? '' : txt, at: Date.now() };
        res.list.push({ ua: s.ua || '', host: s.ep.split('/')[2] || '', c: c, e: last[s.id].e });
        if (c >= 200 && c < 300) { res.sent++; okIds.push(s.id); }
        else { res.fail++; res.code = c; if (c === 404 || c === 410) dead.push(s.id); }     // 404/410: máy đã gỡ / hết hạn đăng ký
      });
    }
    try {
      pushEdit_(function (x) {
        x.subs = x.subs.filter(function (s) { return dead.indexOf(s.id) === -1; });
        var t = Date.now();
        x.subs.forEach(function (s) { if (okIds.indexOf(s.id) !== -1) s.ok = t; if (last[s.id]) s.last = last[s.id]; });   // v46.1: kết quả lần gửi gần nhất (chẩn đoán)
      });
    } catch (e5) {}
  } catch (e) { console.warn('pushSend_: ' + (e && e.stack || e)); }
  return res;
}

// ---------------------------------------------------------------------------
// Các loại thông báo
// ---------------------------------------------------------------------------
var PUSH_DOW_ = { vi: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'], ja: ['日', '月', '火', '水', '木', '金', '土'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };
function pushDd_(ym, d, lg) {
  var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7));
  return m + '/' + d + '(' + PUSH_DOW_[lg][new Date(y, m - 1, d).getDay()] + ')';
}
function pushTx_(fn) { return { vi: fn('vi'), ja: fn('ja'), en: fn('en') }; }
/** v46: link mở đúng màn trong app (?go=bell | shifts | wish | today, &ym=YYYY-MM). */
function pushUrl_(q) { var f = frontOnly_(); return f ? f + (f.indexOf('?') === -1 ? '?' : '&') + q : ''; }
/** Những người (empId) đang có máy nhận thông báo. */
function pushStaffIds_() {
  var o = pushRead_(), ids = {};
  o.subs.forEach(function (s) { if (s.w !== 'm') ids[s.w] = 1; });
  return ids;
}
function pushShiftTxt_(e, closeMap, d, lg) {
  if (!e || e.off || !e.shifts || !e.shifts.length) return lg === 'ja' ? '休み' : lg === 'en' ? 'off' : 'nghỉ';
  return e.shifts.map(function (s) { return (s.isSupport ? '✈' : '') + hhmm_(s.start) + '–' + hhmm_(endOf_(s, closeMap, d)); }).join(', ');
}

/** 🔔 Quản lý: báo nghỉ, xin đổi ca, chi viện… (gọi cùng chỗ gửi thư cho quản lý). */
function pushMgrEv_(ev) {
  try {
    if (!pushInUse_()) return;
    if (ev.e && !mailRate_('pmgr:' + ev.e, 10, 3600)) return;
    var x = mgrEvText_(ev), urgent = ev.k === 'urgent' || ev.k === 'health' || ev.k === 'off';
    var note = ev.t ? ' — ' + String(ev.t).slice(0, 120) : '';
    pushSend_([{ w: 'm', urgent: urgent, tag: 'mgr-' + ev.id, url: pushUrl_('go=bell'), tx: {
      vi: [x.kind[0] + ' ' + x.kind[1], x.name + (x.dd ? ' · ' + x.dd : '') + note],
      ja: [x.kind[0] + ' ' + x.kind[2], x.name + (x.dd ? ' · ' + x.dd : '') + note],
      en: [x.kind[0] + ' ' + x.kind[1], x.name + (x.dd ? ' · ' + x.dd : '') + note] } }]);
  } catch (e) {}
}
/** 📅 Nhân viên: lịch vừa công bố — mỗi người nhận ca của chính mình. */
function pushPublish_(ym, days) {
  try {
    var ids = pushStaffIds_(); if (!Object.keys(ids).length) return;
    days = (days || []).map(Number).filter(function (d) { return d >= 1; }).sort(function (a, b) { return a - b; });
    if (!days.length) return;
    var emps = readEmployees_(), sched = readMonthNormalized_('schedule:' + ym, emps), closeMap = readCloseHours_(ym);
    var m = Number(ym.slice(5, 7)), items = [];
    emps.forEach(function (e) {
      if (!e || e.deleted || !ids[String(e.id)]) return;
      var rows = [], tot = 0;
      days.forEach(function (d) {
        var en = (sched[String(d)] || {})[e.id];
        if (!en || en.off || !en.shifts || !en.shifts.length) return;
        tot += netOfEntryAt_(en, closeMap, d);
        rows.push(d);
      });
      var h = Math.round(tot * 10) / 10;
      items.push({ w: String(e.id), tag: 'pub-' + ym, url: pushUrl_('go=shifts&ym=' + ym), tx: pushTx_(function (lg) {
        var first = rows.slice(0, 2).map(function (d) { return pushDd_(ym, d, lg) + ' ' + pushShiftTxt_((sched[String(d)] || {})[e.id], closeMap, d, lg); }).join(' · ');
        if (lg === 'ja') return ['📅 ' + m + '月のシフトが公開されました', rows.length ? rows.length + '日 · 合計' + h + 'h。' + first + (rows.length > 2 ? ' …' : '') : 'シフトはありません。'];
        if (lg === 'en') return ['📅 Schedule for month ' + m + ' is out', rows.length ? rows.length + ' days · ' + h + 'h. ' + first + (rows.length > 2 ? ' …' : '') : 'No shifts for you.'];
        return ['📅 Lịch tháng ' + m + ' đã công bố', rows.length ? rows.length + ' ngày · tổng ' + h + 'h. ' + first + (rows.length > 2 ? ' …' : '') : 'Bạn không có ca nào.'];
      }) });
    });
    pushSend_(items);
  } catch (e) {}
}
/** 📅 Nhân viên: ca đã công bố bị sửa (gộp sau 30 phút như thư). ch = [{ d, e, f: ca cũ, t: ca mới }] */
function pushChange_(ym, ch) {
  try {
    var ids = pushStaffIds_(); if (!Object.keys(ids).length) return;
    var byEmp = {}, closeMap = readCloseHours_(ym), m = Number(ym.slice(5, 7));
    ch.forEach(function (c) { var k = String(c.e); if (ids[k]) (byEmp[k] = byEmp[k] || []).push(c); });
    var items = Object.keys(byEmp).map(function (eid) {
      var rows = byEmp[eid].slice().sort(function (a, b) { return a.d - b.d; });
      return { w: eid, tag: 'chg-' + ym, urgent: true, url: pushUrl_('go=shifts&ym=' + ym), tx: pushTx_(function (lg) {
        var lines = rows.slice(0, 3).map(function (c) { return pushDd_(ym, c.d, lg) + ' ' + pushShiftTxt_(c.f, closeMap, c.d, lg) + ' → ' + pushShiftTxt_(c.t, closeMap, c.d, lg); });
        var more = rows.length > 3 ? '\n…+' + (rows.length - 3) : '';
        if (lg === 'ja') return ['📅 シフトが変更されました', lines.join('\n') + more];
        if (lg === 'en') return ['📅 Your shift changed', lines.join('\n') + more];
        return ['📅 Ca của bạn vừa thay đổi', lines.join('\n') + more];
      }) };
    });
    pushSend_(items);
  } catch (e) {}
}
/** ⇄ Nhân viên: có người nhờ mình nhận ca. */
function pushAsk_(ym, d, ownerId, askIds) {
  try {
    var ids = pushStaffIds_(), to = askIds.filter(function (x) { return ids[String(x)]; });
    if (!to.length) return;
    var owner = readEmployees_().filter(function (e) { return String(e.id) === String(ownerId); })[0] || {}, name = String(owner.name || '?');
    pushSend_(to.map(function (eid) {
      return { w: String(eid), tag: 'ask-' + ym + '-' + d + '-' + ownerId, urgent: true, url: pushUrl_('go=today&ym=' + ym), tx: pushTx_(function (lg) {
        if (lg === 'ja') return ['⇄ シフト交代のお願い', name + 'さんが ' + pushDd_(ym, d, lg) + ' のシフトをお願いしています。'];
        if (lg === 'en') return ['⇄ Shift swap request', name + ' asks you to take ' + pushDd_(ym, d, lg) + '.'];
        return ['⇄ Có người nhờ nhận ca', name + ' nhờ bạn nhận ca ' + pushDd_(ym, d, lg) + '.'];
      }) };
    }));
  } catch (e) {}
}

// ---------------------------------------------------------------------------
// Nhắc hằng ngày (trình kích hoạt 19:00–20:00 giờ Nhật): ca ngày mai · hạn đăng ký lịch tháng sau
// ---------------------------------------------------------------------------
function ensurePushTrigger_(on) {
  try {
    var ts = ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'pushDailyTick'; });
    if (on && !ts.length) ScriptApp.newTrigger('pushDailyTick').timeBased().atHour(19).everyDays(1).inTimezone('Asia/Tokyo').create();
    if (!on) ts.forEach(function (t) { ScriptApp.deleteTrigger(t); });
  } catch (e) {}
}
/** Ngày mai có nằm trong lịch chính thức không. Quán có dùng "Chốt & công bố" (tháng này hoặc tháng trước
 *  đã từng chốt) thì chỉ nhắc ngày đã công bố — không nhắc theo bản nháp. */
function pushDayFinal_(ym, d) {
  var mode = readLockMode_(ym);
  if (mode) return mode === 'all' || d <= HALF_SPLIT;
  var prev = ymShift_(ym, -1);
  return !readLockMode_(prev);
}
function pushDailyTick() {
  var today = todayStr_();
  try { if (props_().getProperty('PUSH_DAY') === today) return 'done'; props_().setProperty('PUSH_DAY', today); } catch (e0) { return 'err'; }
  var o = pushRead_(), ids = pushStaffIds_();
  if (!Object.keys(ids).length) return 'none';
  var emps = readEmployees_().filter(function (e) { return e && !e.deleted && ids[String(e.id)]; });
  var items = [];
  // 1) ca ngày mai
  try {
    var tmr = jstDateStr_(1), ym = tmr.slice(0, 7), d = Number(tmr.slice(8, 10));
    if (pushDayFinal_(ym, d)) {
      var sched = readMonthNormalized_('schedule:' + ym, readEmployees_()), closeMap = readCloseHours_(ym);
      emps.forEach(function (e) {
        if (o.pref[String(e.id)] && o.pref[String(e.id)].tm === 0) return;
        var en = (sched[String(d)] || {})[e.id];
        if (!en || en.off || !en.shifts || !en.shifts.length) return;
        items.push({ w: String(e.id), tag: 'tmr-' + tmr, url: pushUrl_('go=today&ym=' + ym), tx: pushTx_(function (lg) {
          var tx = pushDd_(ym, d, lg) + ' ' + pushShiftTxt_(en, closeMap, d, lg);
          if (lg === 'ja') return ['⏰ 明日のシフト', tx];
          if (lg === 'en') return ['⏰ Tomorrow\'s shift', tx];
          return ['⏰ Ca ngày mai', tx];
        }) });
      });
    }
  } catch (e1) {}
  // 2) nhắc đăng ký lịch tháng sau: 3 ngày và 1 ngày trước hạn, chỉ người chưa khai ngày nào
  try {
    var reg = o.cfg.reg === undefined ? PUSH_REG_DAY : Number(o.cfg.reg) || 0, dom = Number(today.slice(8, 10));
    if (reg && (dom === reg - 3 || dom === reg - 1)) {
      var nx = ymShift_(today.slice(0, 7), 1), nm = Number(nx.slice(5, 7)), left = reg - dom;
      var has = {};
      [readJsonKey_('wish:' + nx), readJsonKey_('requests:' + nx)].forEach(function (mo) {
        Object.keys(mo || {}).forEach(function (dd) { Object.keys(mo[dd] || {}).forEach(function (id) { has[id] = 1; }); });
      });
      emps.forEach(function (e) {
        if (has[String(e.id)]) return;
        if (Array.isArray(e.win) && e.win.some(function (x) { return !!x; })) return;      // có giờ cố định = đã tự đăng ký
        items.push({ w: String(e.id), tag: 'reg-' + nx, url: pushUrl_('go=wish&ym=' + nx), tx: pushTx_(function (lg) {
          if (lg === 'ja') return ['📝 ' + nm + '月のシフト希望を出してください', '締切は' + reg + '日（あと' + left + '日）。まだ1日も入力されていません。'];
          if (lg === 'en') return ['📝 Please submit your month ' + nm + ' availability', 'Deadline: day ' + reg + ' (' + left + ' day' + (left > 1 ? 's' : '') + ' left).'];
          return ['📝 Nhắc đăng ký lịch tháng ' + nm, 'Hạn chót ngày ' + reg + ' (còn ' + left + ' ngày). Bạn chưa đăng ký ngày nào.'];
        }) });
      });
    }
  } catch (e2) {}
  var r = pushSend_(items);
  return 'sent ' + r.sent;
}
