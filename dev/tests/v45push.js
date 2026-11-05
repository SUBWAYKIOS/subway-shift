// v2026.10.25.1 — thông báo đẩy (Web Push) + ghi nhớ đăng nhập quản lý. Chạy: node tests/v45push.js [Index.html] [Code.gs]
const path = require('path'), crypto = require('crypto');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const err = f => { try { f(); return ''; } catch (e) { return e.message || String(e); } };
let pushCode = () => 201;
const api = require('./gas-mock')({ code: CODE, html: HTML, push: rq => pushCode(rq) });

// máy nhận giả: khoá ECDH thật để giải mã đúng như trình duyệt
function device(){
  const e = crypto.createECDH('prime256v1'); e.generateKeys();
  const auth = crypto.randomBytes(16), id = crypto.randomBytes(12).toString('hex');
  return { e, auth, ep: 'https://fcm.googleapis.com/fcm/send/' + id + ':APA91b' + id,
    json(){ return JSON.stringify({ endpoint: this.ep, keys: { p256dh: e.getPublicKey().toString('base64url'), auth: auth.toString('base64url') } }); },
    open(rq){
      const pl = rq.payload && rq.payload.getBytes ? rq.payload.getBytes() : rq.payload; const body = Buffer.from(pl.map(b => b < 0 ? b + 256 : b));
      const salt = body.slice(0, 16), idl = body[20], asPub = body.slice(21, 21 + idl), ct = body.slice(21 + idl);
      const prkKey = crypto.createHmac('sha256', auth).update(e.computeSecret(asPub)).digest();
      const ikm = crypto.createHmac('sha256', prkKey).update(Buffer.concat([Buffer.from('WebPush: info\0'), e.getPublicKey(), asPub, Buffer.from([1])])).digest();
      const prk = crypto.createHmac('sha256', salt).update(ikm).digest();
      const cek = crypto.createHmac('sha256', prk).update(Buffer.from('Content-Encoding: aes128gcm\0\x01')).digest().slice(0, 16);
      const nonce = crypto.createHmac('sha256', prk).update(Buffer.from('Content-Encoding: nonce\0\x01')).digest().slice(0, 12);
      const d = crypto.createDecipheriv('aes-128-gcm', cek, nonce); d.setAuthTag(ct.slice(-16));
      const pt = Buffer.concat([d.update(ct.slice(0, -16)), d.final()]);
      return JSON.parse(pt.slice(0, pt.lastIndexOf(2)).toString('utf8'));
    } };
}
const sent = ep => api.__pushes.filter(r => r.url === ep);
const last = dev => { const a = sent(dev.ep); return a.length ? dev.open(a[a.length - 1]) : null; };

console.log('— Ghi nhớ đăng nhập quản lý —');
let tok = api.loginManager('subway1111').token;
tok = api.changeManagerPassword(tok, 'subway1111', 'Otagawa2026x').token;
const L1 = api.loginManager('Otagawa2026x', null, true, 'iPhone');
ok('chọn ghi nhớ → có khoá máy (mdk)', !!L1.mdk);
const L0 = api.loginManager('Otagawa2026x');
ok('không chọn → không có khoá', !L0.mdk);
const ym = api.jstDateStr_(0).slice(0, 7);
let B = api.bootstrap(null, ym, L1.mdk);
ok('mở app bằng khoá → vào thẳng quản lý', !!(B.mgrSession && B.mgrSession.token));
ok('kèm sẵn dữ liệu tháng (đỡ một lượt gọi)', !!B.month);
ok('phiên từ khoá dùng được', !err(() => api.loadMonth(B.mgrSession.token, ym)));
ok('khoá giả → không vào', !api.bootstrap(null, ym, L1.mdk.slice(0, -3) + 'abc').mgrSession);
const L2 = api.loginManager('Otagawa2026x', null, true, 'Mac');
ok('danh sách máy ghi nhớ có 2 máy', api.mgrDevices(L2.token).length === 2);
const sess1 = B.mgrSession.token;
api.forgetMgrDevice(B.mgrSession.token);
B = api.bootstrap(null, ym, L1.mdk);
ok('đăng xuất máy iPhone → khoá iPhone hết hiệu lực', !B.mgrSession && B.mgrErr === 'revoked', JSON.stringify([B.mgrErr]));
ok('… và phiên đang mở từ khoá đó cũng chết', /hết hạn/.test(err(() => api.loadMonth(sess1, ym))));
const s2 = api.bootstrap(null, ym, L2.mdk).mgrSession;
const ch = api.changeManagerPassword(s2.token, 'Otagawa2026x', 'Otagawa2027y');
ok('đổi mật khẩu trên máy đã ghi nhớ → máy này nhận khoá mới', !!ch.mdk);
ok('khoá cũ của máy này hết hiệu lực', !api.bootstrap(null, ym, L2.mdk).mgrSession);
ok('khoá mới vào được', !!api.bootstrap(null, ym, ch.mdk).mgrSession);
api.CacheService.getScriptCache().remove('fail:mgr');
tok = api.loginManager('Otagawa2027y').token;

console.log('— Đăng ký nhận thông báo —');
api.saveEmployees(tok, JSON.stringify([{ id: 'e1aaaa', name: 'ヒエウ', lang: 'ja' }, { id: 'e2bbbb', name: 'ラム' }, { id: 'e3cccc', name: 'まい', win: [null, [10, 15], null, null, null, null, null, null] }]));
const c1 = api.issueClaimCode(tok, 'e1aaaa'); const t1 = api.claimEmployee('e1aaaa', '284619', false, 'x', c1.code).token;
const c2 = api.issueClaimCode(tok, 'e2bbbb'); const t2 = api.claimEmployee('e2bbbb', '284619', false, 'x', c2.code).token;
const c3 = api.issueClaimCode(tok, 'e3cccc'); const t3 = api.claimEmployee('e3cccc', '284619', false, 'x', c3.code).token;
const M = device(), D1 = device(), D2 = device(), D3 = device();
ok('endpoint lạ (không phải dịch vụ push) bị từ chối', /không hỗ trợ/.test(err(() => api.pushSubscribe(tok, JSON.stringify({ endpoint: 'https://evil.example/x/yyyyyyyyyy', keys: JSON.parse(M.json()).keys }), 'Mac', 'vi'))));
ok('khoá máy nhận hỏng bị từ chối', /không hợp lệ/.test(err(() => api.pushSubscribe(tok, JSON.stringify({ endpoint: M.ep, keys: { p256dh: 'AAAA', auth: 'BBBB' } }), 'Mac', 'vi'))));
ok('quản lý bật được', api.pushSubscribe(tok, M.json(), 'iPhone', 'vi').ok);
api.pushSubscribe(t1, D1.json(), 'iPhone', 'ja');
api.pushSubscribe(t2, D2.json(), 'Android', 'vi');
api.pushSubscribe(t3, D3.json(), 'Android', 'vi');
const info = api.pushInfo(tok);
ok('pushInfo: có khoá công khai VAPID 65 byte', Buffer.from(info.pub, 'base64url').length === 65 && info.mgrOn === 1 && info.staffOn === 3, JSON.stringify(info).slice(0, 200));
ok('tạo trình kích hoạt nhắc hằng ngày', api.__triggers.some(t => t.fn === 'pushDailyTick'));
ok('khoá bí mật VAPID không nằm trong sheet', !JSON.stringify(api.readJsonKey_('push')).includes(api.__props.VAPID_D));

console.log('— Gửi thử + kiểm mã hoá / chữ ký —');
api.pushTest(tok);
const rq = sent(M.ep).slice(-1)[0];
const msg = M.open(rq);
ok('quản lý nhận đúng thư thử (giải mã được)', /Thông báo đã bật/.test(msg.t), JSON.stringify(msg));
ok('header chuẩn: aes128gcm + TTL', rq.headers['Content-Encoding'] === 'aes128gcm' && rq.headers.TTL === '86400');
const m = /^vapid t=([^,]+), k=(.+)$/.exec(rq.headers.Authorization);
const [h, c, sg] = m[1].split('.'), q = Buffer.from(m[2], 'base64url');
const pk = crypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: q.slice(1, 33).toString('base64url'), y: q.slice(33).toString('base64url') }, format: 'jwk' });
ok('chữ ký VAPID (ES256) hợp lệ', crypto.verify('sha256', Buffer.from(h + '.' + c), { key: pk, dsaEncoding: 'ieee-p1363' }, Buffer.from(sg, 'base64url')));
const cl = JSON.parse(Buffer.from(c, 'base64url').toString());
ok('aud = gốc dịch vụ push, hết hạn ≤ 24h', cl.aud === 'https://fcm.googleapis.com' && cl.exp - Date.now() / 1000 <= 86400);

console.log('— Sự kiện cho quản lý —');
const n0 = sent(M.ep).length;
api.mgrEvent_('off', 'e1aaaa', ym, 12, 'sốt');
const mm = last(M);
ok('nhân viên báo không đi làm được → quản lý nhận ngay', sent(M.ep).length === n0 + 1 && /không đi làm/i.test(mm.t) && /ヒエウ/.test(mm.b) && /sốt/.test(mm.b), JSON.stringify(mm));
ok('thông báo gấp: Urgency high', sent(M.ep).slice(-1)[0].headers.Urgency === 'high');
ok('nhân viên không nhận sự kiện của quản lý', !sent(D1.ep).some(r => /không đi làm/.test(JSON.stringify(D1.open(r)))));

console.log('— Công bố lịch / sửa ca / nhờ đổi ca —');
const ND = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate();
api.saveShiftEntry(tok, ym, 3, 'e1aaaa', { off: false, shifts: [{ start: 10, end: 15 }] });
api.saveShiftEntry(tok, ym, 4, 'e1aaaa', { off: false, shifts: [{ start: 9, end: 13 }] });
api.staffMailPublish_(ym, Array.from({ length: ND }, (_, i) => i + 1));
const p1 = last(D1), p2 = last(D2);
ok('ヒエウ (tiếng Nhật) nhận "シフトが公開" kèm ca của mình', /公開/.test(p1.t) && /2日/.test(p1.b) && /10:00–15:00/.test(p1.b), JSON.stringify(p1));
ok('ラム (tiếng Việt) nhận "Lịch tháng … đã công bố"', /đã công bố/.test(p2.t) && /không có ca/.test(p2.b), JSON.stringify(p2));
api.staffMailChange_(ym, [{ d: 3, e: 'e1aaaa', f: { off: false, shifts: [{ start: 10, end: 15 }] }, t: { off: false, shifts: [{ start: 12, end: 17 }] } }]);
const p3 = last(D1);
ok('ca bị sửa → chỉ người đó nhận, có giờ cũ → mới', /変更/.test(p3.t) && /10:00–15:00 → 12:00–17:00/.test(p3.b), JSON.stringify(p3));
api.staffMailAsk_(ym, 5, 'e1aaaa', ['e2bbbb'], { foundId: 'e2bbbb' });
const p4 = last(D2);
ok('được nhờ đổi ca → người được nhờ nhận', /nhờ/.test(p4.t) && /ヒエウ/.test(p4.b), JSON.stringify(p4));

console.log('— Nhắc hằng ngày —');
const tmr = api.jstDateStr_(1), tym = tmr.slice(0, 7), td = +tmr.slice(8, 10);
api.saveShiftEntry(tok, tym, td, 'e2bbbb', { off: false, shifts: [{ start: 17, end: 21 }] });
api.saveShiftEntry(tok, tym, td, 'e1aaaa', { off: false, shifts: [{ start: 8, end: 12 }] });
api.pushPrefs(t1, JSON.stringify({ tm: false }));
ok('nhân viên tắt "nhắc ca ngày mai" → lưu', api.pushInfo(t1).tm === false && api.pushInfo(t2).tm === true);
const before1 = sent(D1.ep).length;
const realToday = api.todayStr_;
api.todayStr_ = () => tmr.slice(0, 8) + '05';           // ngày 5 — không trùng nhắc đăng ký
api.__props.PUSH_DAY = '';
api.pushDailyTick();
const tm2 = last(D2);
ok('ラム nhận "Ca ngày mai 17:00–21:00"', /Ca ngày mai/.test(tm2.t) && /17:00–21:00/.test(tm2.b), JSON.stringify(tm2));
ok('ヒエウ đã tắt → không nhận', sent(D1.ep).length === before1);
ok('chạy lại trong cùng ngày → không gửi lần hai', api.pushDailyTick() === 'done');
// nhắc đăng ký: hạn ngày 20 → nhắc ngày 17 và 19, chỉ người chưa khai ngày nào và không có giờ cố định
const nx = api.ymShift_(tmr.slice(0, 7), 1);
api.saveWishEntry && api.saveWishEntry(t2, nx, 3, 'e2bbbb', { off: false, shifts: [{ start: 10, end: 15 }] });
api.todayStr_ = () => tmr.slice(0, 8) + '17'; api.__props.PUSH_DAY = '';
const b1 = sent(D1.ep).length, b2 = sent(D2.ep).length, b3 = sent(D3.ep).length;
api.pushDailyTick();
const r1 = sent(D1.ep).length > b1 ? last(D1) : null;
ok('ngày 17: ヒエウ chưa đăng ký → nhận nhắc (tiếng Nhật, còn 3 ngày)', r1 && /希望/.test(r1.t) && /あと3日/.test(r1.b), JSON.stringify(r1));
ok('ラム đã đăng ký 1 ngày → không bị nhắc', !api.saveWishEntry || sent(D2.ep).slice(b2).every(r => !/đăng ký/.test(D2.open(r).t)));
ok('まい có giờ cố định → không bị nhắc', sent(D3.ep).slice(b3).every(r => !/đăng ký/.test(D3.open(r).t)));
api.pushPrefs(tok, JSON.stringify({ reg: 0 }));
api.todayStr_ = () => tmr.slice(0, 8) + '19'; api.__props.PUSH_DAY = '';
const b1b = sent(D1.ep).length; api.pushDailyTick();
ok('quản lý tắt nhắc đăng ký (0) → không nhắc nữa', sent(D1.ep).slice(b1b).every(r => !/希望/.test(D1.open(r).t)));
api.todayStr_ = realToday;

console.log('— Máy hỏng tự gỡ / tắt thông báo / quyền —');
pushCode = rq => (rq.url === D3.ep ? 410 : 201);
api.pushSend_([{ w: '*staff', tx: { vi: ['x', 'y'] } }]);
ok('dịch vụ báo 410 → máy đó bị gỡ', !api.readJsonKey_('push').subs.some(s => s.ep === D3.ep));
pushCode = () => 201;
api.pushUnsubscribe(t2, D1.ep);
ok('nhân viên không gỡ được máy của người khác', api.readJsonKey_('push').subs.some(s => s.ep === D1.ep));
api.pushUnsubscribe(t2, D2.ep);
ok('tự tắt máy của mình được', !api.readJsonKey_('push').subs.some(s => s.ep === D2.ep));
api.pushSubscribe(t2, D1.json(), 'iPhone', 'vi');
ok('máy đổi người dùng → chuyển sang người đang đăng nhập (không trùng)', api.readJsonKey_('push').subs.filter(s => s.ep === D1.ep).map(s => s.w).join() === 'e2bbbb');
ok('pushDailyTick không gọi được từ trang (RPC)', api.rpcHandle_({ fn: 'pushDailyTick', args: [] }).ok === 0);
ok('trình kích hoạt 5 phút vẫn giữ khi có người dùng thông báo (không email)', api.staffMailInUse_() === true);

console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail);
process.exit(fail ? 1 : 0);
