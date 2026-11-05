// Kiểm thử đợt cập nhật lịch ca (phần máy chủ): chạy Code.gs thật qua gas-mock.
// Dùng: node tests/v32batch.js   (cần Code.gs và Index.html ở thư mục cha)
'use strict';
const path = require('path');
const root = path.join(__dirname, '..');
const api = require('./gas-mock')({ code: path.join(root, 'Code.gs'), html: path.join(root, 'Index.html') });

let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c) { pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + x : '')); } };
const run = (name, fn) => { try { fn(); } catch (e) { fail++; console.log('  ❌ ' + name + ' — lỗi: ' + (e && e.message)); } };

// Đăng nhập quản lý (đổi mật khẩu mặc định trước, như app làm lần đầu)
let tok = api.loginManager('subway1111').token;
try { api.changeManagerPassword(tok, 'subway1111', 'Otagawa2026x'); } catch (e) {}
tok = api.loginManager('Otagawa2026x').token;

console.log('— Người mới 🔰 và thẻ "người mới" luôn khớp nhau —');
run('bật 🔰 → tự có thẻ new và ngày đánh dấu', () => {
  api.saveEmployees(tok, JSON.stringify([{ id: 'e1', name: 'テスト', type: 'sa', newbie: true, tags: [] }]));
  const e = api.readEmployees_()[0];
  ok('có thẻ "new"', e.tags.indexOf('new') !== -1, JSON.stringify(e.tags));
  ok('newSince là ngày hôm nay (yyyy-mm-dd)', /^\d{4}-\d{2}-\d{2}$/.test(e.newSince), e.newSince);
});
run('tắt 🔰 → bỏ thẻ new và xoá ngày đánh dấu', () => {
  api.saveEmployees(tok, JSON.stringify([{ id: 'e1', name: 'テスト', type: 'sa', newbie: false, tags: ['new'] }]));
  const e = api.readEmployees_()[0];
  ok('không còn thẻ "new"', e.tags.indexOf('new') === -1, JSON.stringify(e.tags));
  ok('newSince trống', e.newSince === '', e.newSince);
});
run('gửi thẻ new nhưng newbie=false → không còn "new" (một nguồn sự thật)', () => {
  api.saveEmployees(tok, JSON.stringify([{ id: 'e1', name: 'テスト', type: 'sa', newbie: false, tags: ['new', 'open'] }]));
  const e = api.readEmployees_()[0];
  ok('thẻ open giữ nguyên, new bị bỏ', e.tags.indexOf('open') !== -1 && e.tags.indexOf('new') === -1, JSON.stringify(e.tags));
});

console.log('— Sàn / trần thu nhập tháng —');
run('lưu sàn/trần; số âm bị đưa về 0', () => {
  api.saveEmployees(tok, JSON.stringify([{ id: 'e1', name: 'テスト', type: 'sa', minIncome: 100000, maxIncome: -5, tags: [] }]));
  const e = api.readEmployees_()[0];
  ok('minIncome = 100000', e.minIncome === 100000, e.minIncome);
  ok('maxIncome âm → 0', e.maxIncome === 0, e.maxIncome);
});
run('cảnh báo vượt trần theo giờ đã xếp × lương giờ', () => {
  api.saveEmployees(tok, JSON.stringify([{ id: 'e1', name: 'テスト', type: 'sa', minIncome: 0, maxIncome: 50000, tags: [] }]));
  const ym = api.attYmd_(Date.now()).slice(0, 7);
  api.kvSet_('prof:e1', JSON.stringify({ wage: 1100 }), 'test', true);
  // 10 giờ × 1100 = 11.000 (dưới trần 50.000) → không cảnh báo
  const sched = {}; sched['5'] = { e1: { off: false, shifts: [{ start: 10, end: 20, breakStart: null, breakEnd: null }] } };
  api.writeMonthObject_(api.getSheet_(), 'schedule:' + ym, sched);
  let inc = api.incomeWarn_(api.readEmployees_(), ym);
  ok('10 giờ × 1100 không vượt trần 50.000', inc.length === 0, JSON.stringify(inc));
  // thêm 40 giờ nữa → 50 giờ × 1100 = 55.000 > 50.000 → báo vượt trần
  sched['6'] = { e1: { off: false, shifts: [{ start: 9, end: 21, breakStart: 13, breakEnd: 14 }, { start: 9, end: 21, breakStart: 13, breakEnd: 14 }, { start: 9, end: 21, breakStart: 13, breakEnd: 14 }, { start: 9, end: 21, breakStart: 13, breakEnd: 14 }] } };
  api.writeMonthObject_(api.getSheet_(), 'schedule:' + ym, sched);
  inc = api.incomeWarn_(api.readEmployees_(), ym);
  ok('vượt trần được báo', inc.length === 1 && inc[0].k === 'over', JSON.stringify(inc));
});
run('không có lương giờ trong hồ sơ → không báo (tránh báo sai)', () => {
  api.kvSet_('prof:e1', JSON.stringify({}), 'test', true);
  const ym = api.attYmd_(Date.now()).slice(0, 7);
  ok('không báo', api.incomeWarn_(api.readEmployees_(), ym).length === 0);
});

console.log('— Bản in: ngôn ngữ mặc định tiếng Nhật —');
run('printLang lạ → ja; vi/en giữ nguyên', () => {
  api.saveSettings(tok, JSON.stringify({ printLang: 'xx' }));
  ok('xx → ja', api.readSettings_().printLang === 'ja', api.readSettings_().printLang);
  api.saveSettings(tok, JSON.stringify({ printLang: 'vi' }));
  ok('vi giữ nguyên', api.readSettings_().printLang === 'vi', api.readSettings_().printLang);
});

// (Ca ✈ giữ đúng khung giờ / cờ L: chuyển sang tests/v37sup.js — chi viện v3.)

console.log('— Đếm đi chi viện —');
run('supportFreq khi chưa bật kết nối quán → rỗng, không lỗi', () => {
  const f = api.supportFreq(tok);
  ok('trả về object rỗng', f && typeof f === 'object' && Object.keys(f).length === 0, JSON.stringify(f));
});

console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail);
process.exit(fail ? 1 : 0);
