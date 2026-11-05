// v2026.10.23.1 — CHI VIỆN v3: một bản ghi (ca ✈ trong lịch quán nhà), không duyệt, gọi thẳng app quán kia.
// Chạy: node tests/v37sup.js [Index.html] [Code.gs]
'use strict';
const path = require('path');
const root = path.join(__dirname, '..');
const CODE = process.argv[3] ? path.resolve(process.argv[3]) : path.join(root, 'Code.gs');
const HTML = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'Index.html');
const makeApi = require('./gas-mock');
const registry = {}, web = {};
const A = makeApi({ code: CODE, html: HTML, registry, web, ssId: 'ssCentrair', url: 'https://script.google.com/macros/s/centrair/exec' });
const B = makeApi({ code: CODE, html: HTML, registry, web, ssId: 'ssOtagawa', url: 'https://script.google.com/macros/s/otagawa/exec' });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c) { pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const step = (name, fn) => { try { fn(); } catch (e) { fail++; console.log('  ❌ ' + name + ' — lỗi: ' + (e && e.stack || e)); } };
const YM = '2026-11', D = n => YM + '-' + String(n).padStart(2, '0');

let tA = A.loginManager('subway1111').token; A.changeManagerPassword(tA, 'subway1111', 'Otagawa2026x'); tA = A.loginManager('Otagawa2026x').token;
let tB = B.loginManager('subway1111').token; B.changeManagerPassword(tB, 'subway1111', 'Otagawa2026x'); tB = B.loginManager('Otagawa2026x').token;
A.storeCodeSave(tA, 'CEN'); B.storeCodeSave(tB, 'OTA');
A.saveSettings(tA, JSON.stringify({ hubOn: true, storeName: 'Centrair', openHour: 7, closeHour: 22 }));
B.__props.hubId = A.__props.hubId;
B.saveSettings(tB, JSON.stringify({ hubOn: true, storeName: 'Otagawa' }));
A.saveEmployees(tA, JSON.stringify([{ id: 'hie', name: 'ヒエウ', type: 'sa' }]));
B.saveEmployees(tB, JSON.stringify([{ id: 'ram', name: 'ラム', type: 'sa' }]));
A.hubRegister_(true); B.hubRegister_(true);
const RAM = 'OTA-' + B.readEmployees_().filter(e => e.id === 'ram')[0].code;
const AID = A.myStore_().id, BID = B.myStore_().id;
const sh = (api, day, emp) => ((((api.readMonthObject_(api.getSheet_(), 'schedule:' + YM) || {})[String(day)] || {})[emp] || {}).shifts) || [];
const sup = (api, day, emp) => sh(api, day, emp).filter(x => x.isSupport);
const net = list => list.reduce((a, x) => a + (x.end - x.start) - ((x.breakStart != null && x.breakEnd != null) ? x.breakEnd - x.breakStart : 0), 0);
const evs = (api, k) => api.mgrEventsOut_().list.filter(x => x.k === k);

console.log('— 1. Mượn người: bấm một lần là ca ✈ vào lịch quán nhà ngay (không chờ duyệt) —');
step('mượn ラム 17–22 ngày 6 (ở quán nhà làm 10–16, không trùng)', () => {
  B.saveShiftEntry(tB, YM, 6, 'ram', { off: false, shifts: [{ start: 10, end: 16 }] });
  const r = A.supBorrow(tA, JSON.stringify({ code: RAM, date: D(6), start: 17, end: 22 }));
  ok('kết quả: xong ngay (không xếp hàng)', r.done === 'ok', JSON.stringify(r).slice(0, 200));
  const s = sup(B, 6, 'ram');
  ok('lịch quán nhà có đúng 1 ca ✈ 17–22 gắn quán nhận', s.length === 1 && s[0].start === 17 && s[0].end === 22 && s[0].supTo.id === AID, JSON.stringify(s));
  ok('ca ở quán nhà 10–16 giữ nguyên', sh(B, 6, 'ram').some(x => !x.isSupport && x.start === 10 && x.end === 16));
  ok('quán nhận thấy ラム trong danh sách tới giúp ngày 6', (r.guests['6'] || []).some(g => g.empName === 'ラム' && g.start === 17), JSON.stringify(r.guests));
  ok('quán nhà có thông báo 🔔 "mượn"', evs(B, 'supDone').some(x => /mượn ラム/.test(x.t)), JSON.stringify(B.mgrEventsOut_().list).slice(0, 200));
});

console.log('— 2. Trùng ca ở quán nhà: hỏi trước, đồng ý thì cắt phần trùng (không cộng giờ hai lần) —');
step('mượn 15–22 ngày 7 khi quán nhà xếp 10–16', () => {
  B.saveShiftEntry(tB, YM, 7, 'ram', { off: false, shifts: [{ start: 10, end: 16, breakStart: 12, breakEnd: 13 }] });
  const r1 = A.supBorrow(tA, JSON.stringify({ code: RAM, date: D(7), start: 15, end: 22 }));
  ok('lần đầu: báo trùng, chưa ghi gì', r1.conflict && r1.conflict.length === 1 && sup(B, 7, 'ram').length === 0, JSON.stringify(r1));
  const r2 = A.supBorrow(tA, JSON.stringify({ code: RAM, date: D(7), start: 15, end: 22, cut: true }));
  const all = sh(B, 7, 'ram');
  ok('đồng ý cắt: quán nhà còn 10–15 (giữ nghỉ 12–13) + ✈ 15–22', all.length === 2 && all[0].end === 15 && all[0].breakStart === 12 && all[1].isSupport && all[1].start === 15, JSON.stringify(all));
  ok('tổng giờ = 4 + 7 = 11h (không chồng)', net(all) === 11, net(all));
  ok('xong ngay', r2.done === 'ok');
});

console.log('— 3. Cử người từ quán nhà —');
step('quán nhà cử ラム sang Centrair ngày 8, 9–15', () => {
  const r = B.supSend(tB, JSON.stringify({ empId: 'ram', store: 'CEN', date: D(8), start: 9, end: 15 }));
  ok('ghi ✈ trong lịch quán nhà', r.ok && sup(B, 8, 'ram').length === 1 && r.entry.shifts.length === 1, JSON.stringify(r).slice(0, 200));
  A.hubNoteProcess_();
  ok('quán nhận có 🔔 "cử … sang giúp"', evs(A, 'supDone').some(x => /cử ラム sang giúp/.test(x.t)), JSON.stringify(A.mgrEventsOut_().list).slice(0, 300));
  const st = A.supState(tA, YM);
  ok('quán nhận thấy ラム ngày 8', (st.guests['8'] || []).some(g => g.empName === 'ラム' && g.start === 9), JSON.stringify(st.guests['8']));
});

console.log('— 4. Máy quản lý quán nhà cầm bản cũ lưu đè → ca ✈ do quán kia mượn không mất —');
step('lưu lại ngày 6 bằng bản thiếu ca ✈', () => {
  B.saveShiftEntry(tB, YM, 6, 'ram', { off: false, shifts: [{ start: 10, end: 15.5 }] });
  const all = sh(B, 6, 'ram');
  ok('ca quán nhà đổi thành 10–15:30, ca ✈ 17–22 vẫn còn', all.length === 2 && all.some(x => x.isSupport && x.start === 17) && all.some(x => !x.isSupport && x.end === 15.5), JSON.stringify(all));
});

console.log('— 5. Huỷ —');
step('quán nhận huỷ lượt mượn ngày 6', () => {
  const g = (A.supState(tA, YM, true).guests['6'] || [])[0];
  const r = A.supCancel(tA, JSON.stringify({ home: g.store, empId: g.empId, empName: g.empName, date: D(6), sid: g.sid, start: g.start }));
  ok('lịch quán nhà hết ca ✈ ngày 6', sup(B, 6, 'ram').length === 0, JSON.stringify(sh(B, 6, 'ram')));
  ok('danh sách tới giúp ngày 6 trống', !(r.guests['6'] || []).length, JSON.stringify(r.guests['6']));
  ok('quán nhà có 🔔 "huỷ mượn"', evs(B, 'supOff').some(x => /huỷ mượn/.test(x.t)));
});
step('quán nhà huỷ lượt cử ngày 8', () => {
  const s = sup(B, 8, 'ram')[0];
  B.supCancel(tB, JSON.stringify({ home: BID, empId: 'ram', date: D(8), sid: s.sid }));
  ok('lịch quán nhà hết ca ✈ ngày 8', sup(B, 8, 'ram').length === 0);
  A.hubNoteProcess_();
  ok('quán nhận có 🔔 "huỷ cử"', evs(A, 'supOff').some(x => /huỷ cử ラム/.test(x.t)), JSON.stringify(A.mgrEventsOut_().list).slice(0, 300));
  ok('quán nhận không còn thấy ngày 8', !((A.supState(tA, YM).guests['8']) || []).length);
});

console.log('— 6. Không gọi thẳng được app quán nhà → gửi vào hộp thư, quán nhà áp khi chạy —');
step('mạng tới Otagawa lỗi, mượn ngày 9', () => {
  const keep = web['https://script.google.com/macros/s/otagawa/exec']; delete web['https://script.google.com/macros/s/otagawa/exec'];
  const r = A.supBorrow(tA, JSON.stringify({ code: RAM, date: D(9), start: 12, end: 18 }));
  ok('kết quả "đã gửi, chờ quán kia"', r.done === 'queued', r.done);
  ok('quán nhận hiện tạm người đang chờ', (r.guests['9'] || []).some(g => g.pending), JSON.stringify(r.guests['9']));
  ok('lịch quán nhà chưa đổi', sup(B, 9, 'ram').length === 0);
  web['https://script.google.com/macros/s/otagawa/exec'] = keep;
  B.hubNoteProcess_();
  ok('quán nhà chạy → ca ✈ vào lịch', sup(B, 9, 'ram').length === 1 && sup(B, 9, 'ram')[0].supTo.id === AID, JSON.stringify(sh(B, 9, 'ram')));
});

console.log('— 7. Tick tay "Hỗ trợ tiệm khác" chọn quán trong mạng = cùng một cơ chế —');
step('quản lý quán nhà lưu ca ✈ có quán nhận', () => {
  B.saveShiftEntry(tB, YM, 10, 'ram', { off: false, shifts: [{ start: 11, end: 20, isSupport: true, supTo: { id: AID, name: 'Centrair', code: 'CEN' }, sid: 'm10', supStore: 'Centrair' }] });
  A.hubNoteProcess_();
  ok('quán nhận có 🔔', evs(A, 'supDone').some(x => /11:00–20:00/.test(x.t)), JSON.stringify(A.mgrEventsOut_().list.slice(-2)));
  ok('quán nhận thấy ngày 10', (A.supState(tA, YM).guests['10'] || []).some(g => g.sid === 'm10'));
});

console.log('— 8. Dữ liệu cũ: ca ✈ từ hệ thống duyệt cũ + ca tick tay chồng lên → gộp còn một —');
step('chuyển dữ liệu cũ', () => {
  const hs = A.hubSheet_(false);
  hs.appendRow(['oldreq1', JSON.stringify({ id: 'oldreq1', from: AID, fromName: 'Centrair', fromCode: 'CEN', date: D(11), start: 11, end: 22 }), Date.now()]);
  const obj = B.readMonthObject_(B.getSheet_(), 'schedule:' + YM);
  obj['11'] = { ram: { off: false, shifts: [
    { start: 11, end: 17.5, isSupport: true, supStore: 'Centrair' },
    { start: 11, end: 22, isSupport: true, supportRef: 'oldreq1:abcd1234', supStore: 'Centrair' }] } };
  B.writeMonthObject_(B.getSheet_(), 'schedule:' + YM, obj, 'chi viện');
  B.supRefresh(tB, YM);
  const s = sup(B, 11, 'ram');
  ok('còn đúng 1 ca ✈ 11–22 gắn quán nhận', s.length === 1 && s[0].end === 22 && s[0].supTo && s[0].supTo.id === AID && !s[0].supportRef, JSON.stringify(s));
});

console.log('— 9b. Giữ đúng khung giờ; chỉ có cờ L khi xin đến giờ đóng cửa —');
step('mượn 10–15 và 17–L', () => {
  A.supBorrow(tA, JSON.stringify({ code: RAM, date: D(12), start: 10, end: 15 }));
  const a = sup(B, 12, 'ram')[0];
  ok('ca 10–15, không cờ L', a && a.start === 10 && a.end === 15 && !a.endAtClose, JSON.stringify(a));
  A.supBorrow(tA, JSON.stringify({ code: RAM, date: D(13), start: 17, end: 22, atClose: true }));
  const b = sup(B, 13, 'ram')[0];
  ok('ca 17–L, giờ đóng cửa theo quán nhận (22)', b && b.endAtClose === true && b.supClose === 22, JSON.stringify(b));
});

console.log('— 9. Nhân viên đi chi viện thấy người làm cùng —');
step('ngày 7: Centrair có ヒエウ 9–17', () => {
  A.saveShiftEntry(tA, YM, 7, 'hie', { off: false, shifts: [{ start: 9, end: 17 }] });
  const tRam = B.signToken_({ r: 'emp', e: 'ram', v: B.empVer_('ram'), x: Date.now() + 1e7 });
  const tm = B.supportTeam(tRam, YM, 7);
  const names = (tm && tm.rows || []).map(r => r.name);
  ok('có ヒエウ và chính mình', names.indexOf('ヒエウ') !== -1 && (tm.rows || []).some(r => r.me), JSON.stringify(tm));
  ok('tên quán đúng', tm.store === 'Centrair', tm.store);
});

console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail);
process.exit(fail ? 1 : 0);
