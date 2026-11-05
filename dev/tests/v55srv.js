// v2026.11.05.1 — 🏢 văn phòng ảo: máy chủ (nhân vật, trò chuyện, điểm thành tích, trạng thái ca). Chạy: node tests/v55srv.js
'use strict';
const path = require('path');
const root = path.join(__dirname, '..');
const CODE = process.argv[3] ? path.resolve(process.argv[3]) : path.join(root, 'Code.gs');
const HTML = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'Index.html');
const makeApi = require('./gas-mock');
const A = makeApi({ code: CODE, html: HTML, registry: {}, web: {}, ssId: 'ssOtagawa', url: 'https://script.google.com/macros/s/otagawa/exec' });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c) { pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const throws = (f) => { try { f(); return null; } catch (e) { return e.message; } };
let t = A.loginManager('subway1111').token; A.changeManagerPassword(t, 'subway1111', 'Otagawa2026x'); t = A.loginManager('Otagawa2026x').token;
A.saveEmployees(t, JSON.stringify([{ id: 'e1aaaa', name: 'ヒエウ' }, { id: 'e2bbbb', name: 'ラム' }, { id: 'e3cccc', name: 'まい' }]));
function staffTok(id){ const cc = A.issueClaimCode(t, id); const st = A.claimEmployee(id, '284619', true, 'iPhone', cc.code); return A.bootstrap(st.dk).session.token; }
const s1 = staffTok('e1aaaa'), s2 = staffTok('e2bbbb');
const TODAY = A.todayStr_(), YM = TODAY.slice(0, 7), D = +TODAY.slice(8);
const hNow = (() => { const d = new Date(Date.now() + 9 * 3600000); return d.getUTCHours() + d.getUTCMinutes() / 60; })();
// ヒエウ: đang trong ca (bắt đầu 1 giờ trước) · ラム: còn 30 phút nữa vào · まい: nghỉ
const st0 = Math.max(0, Math.floor(hNow) - 1), en0 = Math.min(26, Math.ceil(hNow) + 3);
A.saveShiftEntry(t, YM, D, 'e1aaaa', { off: false, shifts: [{ start: st0, end: en0 }] });
const soon = Math.round((hNow + 0.5) * 2) / 2 + 0.5;
if (soon < 26) A.saveShiftEntry(t, YM, D, 'e2bbbb', { off: false, shifts: [{ start: soon, end: Math.min(26, soon + 4) }] });
A.saveShiftEntry(t, YM, D, 'e3cccc', { off: true, shifts: [] });

console.log('— Trạng thái văn phòng —');
let o = A.officeState(s1);
ok('trả về người + chat + điểm', o && Array.isArray(o.people) && o.people.length === 3 && Array.isArray(o.chat) && o.mine, JSON.stringify(o).slice(0, 200));
const P = id => o.people.filter(p => p.id === id)[0];
ok('ヒエウ đang làm (theo lịch, không dùng QR)', P('e1aaaa').st === 'in', P('e1aaaa').st);
if (soon < 26) ok('ラム sắp vào ca (≤ 60 phút)', P('e2bbbb').st === 'soon' || P('e2bbbb').st === 'later', P('e2bbbb').st);
ok('まい nghỉ → không có trạng thái', P('e3cccc').st === '' && P('e3cccc').off, JSON.stringify(P('e3cccc')));
ok('me = ヒエウ', o.me === 'e1aaaa');
ok('bảng khoá đồ + biểu cảm', o.lock && o.lock.ac && o.emoji && o.emoji.length >= 8);
ok('chưa có nhân vật → av null', o.av === null);
const om = A.officeState(t);
ok('quản lý: me = m', om.me === 'm' && om.mgr === true);

console.log('— Nhân vật —');
const a1 = A.saveAvatar(s1, JSON.stringify({ h: 2, b: 1, sk: 3, hs: 5, hc: 9, ey: 1, mo: 4, ac: 3, of: 2, oc: 7, pet: 0, xx: 5 }));
ok('lưu được, bỏ trường lạ', a1.hs === 5 && a1.ac === 3 && a1.xx === undefined, JSON.stringify(a1));
const a2 = A.saveAvatar(s1, JSON.stringify({ hs: 99, sk: -3, ey: 'abc' }));
ok('giá trị ngoài khoảng → mặc định', a2.hs === 0 && a2.sk === 0 && a2.ey === 0, JSON.stringify(a2));
const a3 = A.saveAvatar(s1, JSON.stringify({ ac: 12, pet: 2, hs: 11 }));
ok('đồ chưa mở khoá (Lv thấp) → bỏ', a3.ac === 0 && a3.pet === 0 && a3.hs === 0, JSON.stringify(a3));
const a4 = A.saveAvatar(t, JSON.stringify({ ac: 12, pet: 3 }));
ok('quản lý dùng được mọi món', a4.ac === 12 && a4.pet === 3, JSON.stringify(a4));
A.saveAvatar(s1, JSON.stringify({ hs: 4, hc: 2 }));
o = A.officeState(s2);
ok('người khác thấy nhân vật của ヒエウ', P('e1aaaa').av && P('e1aaaa').av.hs === 4);
ok('nhân vật quản lý (mav)', o.mav && o.mav.ac === 12);

console.log('— Trò chuyện —');
const m1 = A.officeSay(s1, '  おはよう！\nがんばろう  ', '');
ok('lưu tin, gọn khoảng trắng', m1.m === 'おはよう！ がんばろう' && m1.f === 'e1aaaa', JSON.stringify(m1));
ok('gửi dồn dập bị chặn', /Chậm lại/.test(throws(() => A.officeSay(s1, 'x', ''))));
const m2 = A.officeSay(s2, '', '👋', 'e1aaaa');
ok('biểu cảm gửi cho một người', m2.e === '👋' && m2.to === 'e1aaaa' && m2.m === '', JSON.stringify(m2));
ok('biểu cảm lạ → bỏ, không có chữ → lỗi', /nhập lời nhắn/.test(throws(() => A.officeSay(t, '', '💀'))));
const m3 = A.officeSay(t, 'x'.repeat(200), '');
ok('tin dài cắt còn 60 ký tự; quản lý gửi là m', m3.m.length === 60 && m3.f === 'm');
o = A.officeState(s2);
ok('chat có 3 tin', o.chat.length === 3, o.chat.length);

console.log('— Điểm thành tích —');
A.sendThanks(s2, 'e1aaaa', 'thx', 'ありがとう');
A.ofcXpBust_();
o = A.officeState(s1);
ok('điểm tháng này: được cảm ơn + nhắn tin', o.mine.n.tr === 1 && o.mine.n.ch === 1 && o.mine.mx >= 9, JSON.stringify(o.mine));
ok('huy hiệu có tiến độ', o.mine.badges.length === 7 && o.mine.badges.filter(b => b.k === 'loved')[0].n === 1);
ok('Lv tính từ điểm', o.mine.lv === A.ofcLevel_(o.mine.xp) && o.mine.lvs.length === 10);
ok('ofcLevel_: 0→1, 40→2, 1200→10', A.ofcLevel_(0) === 1 && A.ofcLevel_(40) === 2 && A.ofcLevel_(1200) === 10);
// tháng trước được cộng dồn (lưu sẵn) — chỉ một lần
const st = A.readJsonKey_('ofxp');
ok('đã chốt tháng trước vào tổng', st.fin && st.fin < YM, JSON.stringify(st));

console.log('— Trạng thái theo điểm danh —');
const S = A.ofcStatus_;
const ds = Date.now() - 10 * 3600000;
ok('bấm vào → in', S([{ start: 9, end: 17 }], [{ k: 'in', t: 1 }], true, Date.now(), ds) === 'in');
ok('đang nghỉ → brk', S([{ start: 9, end: 17 }], [{ k: 'in', t: 1 }, { k: 'bs', t: 2 }], true, Date.now(), ds) === 'brk');
ok('đã về → out', S([{ start: 9, end: 17 }], [{ k: 'in', t: 1 }, { k: 'out', t: 2 }], true, Date.now(), ds) === 'out');
ok('dùng QR mà chưa bấm khi tới giờ → late', S([{ start: 9, end: 17 }], [], true, Date.now(), ds) === 'late');
ok('giờ nghỉ theo lịch → brk', S([{ start: 9, end: 17, breakStart: 9.5, breakEnd: 10.5 }], [], false, Date.now(), ds) === 'brk');
ok('đi chi viện → sup', S([{ start: 9, end: 17, isSupport: true }], [], false, Date.now(), ds) === 'sup');

console.log('— v55.1: ai đang mở app · hiệu ứng theo cấp —');
const s3 = staffTok('e3cccc');
o = A.officeState(s1);
ok('người gọi officeState được đánh dấu đang mở app', o.on && o.on.e1aaaa > 0, JSON.stringify(o.on));
ok('まい chưa mở app → không có', !o.on.e3cccc);
ok('officeHere đánh dấu まい', A.officeHere(s3) === 1 && A.officeState(s1).on.e3cccc > 0);
ok('quản lý mở → m', A.officeState(t) && A.officeState(s1).on.m > 0);
const f1 = A.saveAvatar(s1, JSON.stringify({ hs: 2 }));
ok('không chọn hiệu ứng → để trống (tự động theo cấp)', f1.ef === undefined, JSON.stringify(f1));
const f2 = A.saveAvatar(s1, JSON.stringify({ hs: 2, ef: 0 }));
ok('chọn "không hiệu ứng" → ef 0', f2.ef === 0);
const f3 = A.saveAvatar(s1, JSON.stringify({ hs: 2, ef: 4 }));
ok('hiệu ứng cầu vồng (Lv9) khi Lv thấp → bỏ', f3.ef === 0, JSON.stringify(f3));
ok('quản lý chọn được cầu vồng', A.saveAvatar(t, JSON.stringify({ ef: 4 })).ef === 4);
ok('bảng khoá có hiệu ứng', JSON.stringify(A.officeState(s1).lock.ef) === '{"1":3,"2":5,"3":7,"4":9}');

console.log('— Bố cục —');
ok('nhân viên không đổi được bố cục', /quản lý/.test(throws(() => A.officeConfig(s1, '{"layout":"basic"}'))));
ok('quản lý đổi bố cục', A.officeConfig(t, '{"layout":"basic"}').layout === 'basic' && A.officeState(s1).layout === 'basic');
ok('bố cục lạ → auto', A.officeConfig(t, '{"layout":"zzz"}').layout === 'auto');

console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail);
process.exit(fail ? 1 : 0);
