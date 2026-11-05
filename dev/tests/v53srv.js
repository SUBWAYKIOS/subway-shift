// v2026.10.29.5 — tốc độ chi viện: dữ liệu quán khác nhớ tạm DÙNG CHUNG cho peerMonth / supState / supportTeam. Chạy: node tests/v53srv.js
'use strict';
const path = require('path');
const root = path.join(__dirname, '..');
const CODE = process.argv[3] ? path.resolve(process.argv[3]) : path.join(root, 'Code.gs');
const HTML = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'Index.html');
const makeApi = require('./gas-mock');
const hits = {}, store = {};
const registry = new Proxy(store, { get(t, k){ if (typeof k === 'string' && /^ss[A-Z]/.test(k)) hits[k] = (hits[k] || 0) + 1; return t[k]; } });
const web = {};
const A = makeApi({ code: CODE, html: HTML, registry, web, ssId: 'ssCentrair', url: 'https://script.google.com/macros/s/centrair/exec' });
const B = makeApi({ code: CODE, html: HTML, registry, web, ssId: 'ssOtagawa', url: 'https://script.google.com/macros/s/otagawa/exec' });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c) { pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const YM = A.jstDateStr_(0).slice(0, 7), D = n => YM + '-' + String(n).padStart(2, '0');
const login = api => { let t = api.loginManager('subway1111').token; api.changeManagerPassword(t, 'subway1111', 'Otagawa2026x'); return api.loginManager('Otagawa2026x').token; };
const tA = login(A), tB = login(B);
A.storeCodeSave(tA, 'CEN'); B.storeCodeSave(tB, 'OTA');
A.saveSettings(tA, JSON.stringify({ hubOn: true, storeName: 'Centrair' }));
B.__props.hubId = A.__props.hubId;
B.saveEmployees(tB, JSON.stringify([{ id: 'ram', name: 'ラム', type: 'sa' }]));
A.saveEmployees(tA, JSON.stringify([{ id: 'hieu', name: 'ヒエウ', type: 'sa' }]));
B.saveSettings(tB, JSON.stringify({ hubOn: true, storeName: 'Otagawa' }));
A.hubRegister_(true); B.hubRegister_(true);
const AID = A.myStore_().id;

console.log('— Lịch gọn có ghi quán nhận —');
const s1 = B.supSend(tB, JSON.stringify({ empId: 'ram', store: 'CEN', date: D(7), start: 10, end: 16 }));
ok('Otagawa cử ラム sang Centrair ngày 7', s1 && s1.ok, JSON.stringify(s1).slice(0, 200));
const cmp = B.peerCompact_(B.readMonthObject_(B.getSheet_(), 'schedule:' + YM));
const x7 = ((cmp['7'] || {}).ram || {}).shifts || [];
ok('bản gọn (peerCompact_) giữ mã quán nhận + mã lượt', x7.length === 1 && x7[0].sup === AID && !!x7[0].sid, JSON.stringify(x7));

console.log('— Nhớ tạm dùng chung —');
const h0 = hits.ssOtagawa || 0;
const st1 = A.supState(tA, YM);
const h1 = hits.ssOtagawa || 0;
ok('supState thấy ラム tới giúp ngày 7', ((st1.guests || {})['7'] || []).some(g => g.empName === 'ラム' && g.start === 10 && g.end === 16), JSON.stringify(st1.guests));
ok('lần đầu có mở bảng của Otagawa', h1 > h0);
const pm = A.peerMonth(tA, YM);
const h2 = hits.ssOtagawa || 0;
ok('peerMonth ngay sau đó KHÔNG mở lại bảng Otagawa (dùng chung bản nhớ tạm)', h2 === h1 && pm.stores.length === 1, h2 - h1);
A.supState(tA, YM);
ok('supState lần 2 không mở lại', (hits.ssOtagawa || 0) === h2);
const tE = A.signToken_({ r: 'emp', e: 'hieu', v: A.empVer_('hieu'), x: Date.now() + 1e7 });
const tR = B.signToken_({ r: 'emp', e: 'ram', v: B.empVer_('ram'), x: Date.now() + 1e7 });
const team = B.supportTeam(tR, YM, 7);
ok('nhân viên đi chi viện xem "làm cùng" ở quán kia được', team && team.store && Array.isArray(team.rows), JSON.stringify(team).slice(0, 200));

console.log('— Có thay đổi thì bỏ bản nhớ tạm —');
B.supSend(tB, JSON.stringify({ empId: 'ram', store: 'CEN', date: D(8), start: 12, end: 18 }));
A.hubNoteProcess_();                          // Centrair nhận thư báo "cử người" → bỏ bản nhớ tạm
const st2 = A.supState(tA, YM);
ok('cử thêm ngày 8 → Centrair thấy ngay sau khi nhận thư báo', ((st2.guests || {})['8'] || []).some(g => g.empName === 'ラム'), JSON.stringify(st2.guests));
console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail);
process.exit(fail ? 1 : 0);
