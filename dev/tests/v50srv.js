// v2026.10.29.1 — chi viện "nhặt về" từ danh sách người rảnh: chống tranh giành giữa nhiều quán. Chạy: node tests/v50srv.js
'use strict';
const path = require('path');
const root = path.join(__dirname, '..');
const CODE = process.argv[3] ? path.resolve(process.argv[3]) : path.join(root, 'Code.gs');
const HTML = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'Index.html');
const makeApi = require('./gas-mock');
const registry = {}, web = {};
const A = makeApi({ code: CODE, html: HTML, registry, web, ssId: 'ssCentrair', url: 'https://script.google.com/macros/s/centrair/exec' });
const B = makeApi({ code: CODE, html: HTML, registry, web, ssId: 'ssOtagawa', url: 'https://script.google.com/macros/s/otagawa/exec' });
const C = makeApi({ code: CODE, html: HTML, registry, web, ssId: 'ssForest', url: 'https://script.google.com/macros/s/forest/exec' });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c) { pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const err = f => { try { f(); return ''; } catch (e) { return e.message || String(e); } };
const YM = '2026-11', D = n => YM + '-' + String(n).padStart(2, '0');
const login = api => { let t = api.loginManager('subway1111').token; api.changeManagerPassword(t, 'subway1111', 'Otagawa2026x'); return api.loginManager('Otagawa2026x').token; };
const tA = login(A), tB = login(B), tC = login(C);
A.storeCodeSave(tA, 'CEN'); B.storeCodeSave(tB, 'OTA'); C.storeCodeSave(tC, 'FOR');
A.saveSettings(tA, JSON.stringify({ hubOn: true, storeName: 'Centrair' }));
B.__props.hubId = A.__props.hubId; C.__props.hubId = A.__props.hubId;
B.saveEmployees(tB, JSON.stringify([{ id: 'ram', name: 'ラム', type: 'sa' }, { id: 'mai', name: 'まい', type: 'sa' }]));
B.saveSettings(tB, JSON.stringify({ hubOn: true, storeName: 'Otagawa', supPool: ['ram', 'zz bad', 'ram'] }));
C.saveSettings(tC, JSON.stringify({ hubOn: true, storeName: 'Forest' }));
A.hubRegister_(true); B.hubRegister_(true); C.hubRegister_(true);
const RAM = 'OTA-' + B.readEmployees_().filter(e => e.id === 'ram')[0].code;
const sup = (api, day, emp) => ((((api.readMonthObject_(api.getSheet_(), 'schedule:' + YM) || {})[String(day)] || {})[emp] || {}).shifts || []).filter(x => x.isSupport);

console.log('— Danh sách người đi chi viện được —');
ok('cài đặt lưu danh sách (bỏ mã sai, bỏ trùng)', JSON.stringify(B.readSettings_().supPool) === '["ram"]', JSON.stringify(B.readSettings_().supPool));
const snap = B.mySnapshot_(YM);
ok('bản đăng lên bảng chung có danh sách người đi được', JSON.stringify(snap.pool) === '["ram"]');

console.log('— Nhặt về: ai bấm trước được trước —');
const r1 = A.supBorrow(tA, JSON.stringify({ code: RAM, date: D(7), start: 10, end: 16, pool: 1 }));
ok('Centrair nhặt ラム ngày 7 (10–16) → ghi ngay vào lịch quán nhà', r1.done === 'ok' && sup(B, 7, 'ram').length === 1, JSON.stringify(r1).slice(0, 200));
const r2 = C.supBorrow(tC, JSON.stringify({ code: RAM, date: D(7), start: 12, end: 18, pool: 1 }));
ok('Forest bấm sau (12–18, trùng giờ) → báo đã có ca, KHÔNG ghi đè', r2.conflict && r2.conflict.length && sup(B, 7, 'ram').length === 1 && sup(B, 7, 'ram')[0].supTo.name !== 'Forest', JSON.stringify(r2).slice(0, 200));
const r2b = C.supBorrow(tC, JSON.stringify({ code: RAM, date: D(7), start: 12, end: 18, pool: 1, cut: true }));
ok('nhặt về không cho "cắt ca" người khác (cut bị bỏ qua)', r2b.conflict && sup(B, 7, 'ram').length === 1);
const r3 = C.supBorrow(tC, JSON.stringify({ code: RAM, date: D(8), start: 12, end: 18, pool: 1 }));
ok('ngày khác (8) Forest vẫn nhặt được', r3.done === 'ok' && sup(B, 8, 'ram').length === 1);

console.log('— Quán nhà không phản hồi —');
const saved = web['https://script.google.com/macros/s/otagawa/exec']; delete web['https://script.google.com/macros/s/otagawa/exec'];
const e4 = err(() => A.supBorrow(tA, JSON.stringify({ code: RAM, date: D(9), start: 10, end: 16, pool: 1 })));
ok('nhặt về khi quán nhà không phản hồi → báo thử lại, KHÔNG xếp hàng chờ', /chưa phản hồi/.test(e4) && !(A.readJsonKey_('suppend:' + YM) || {})['9'], e4);
web['https://script.google.com/macros/s/otagawa/exec'] = saved;
console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail); process.exit(fail ? 1 : 0);
