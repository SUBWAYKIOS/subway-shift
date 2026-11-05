// v2026.10.23.5 — sửa lỗi tồn đọng (3 đợt). Chạy: node tests/v41fix.js [Index.html] [Code.gs]
const path = require('path');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
const mk = require('./gas-mock');
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const err = f => { try { f(); return ''; } catch (e) { return e.message || String(e); } };

const api = mk({ code: CODE, html: HTML });
let tok = api.loginManager('subway1111').token;
const ch = api.changeManagerPassword(tok, 'subway1111', 'Otagawa2026x');
const E1 = 'e1aaaa', E2 = 'e2bbbb', E3 = 'e3cccc';

console.log('— Mật khẩu quản lý: đổi mật khẩu → phiên cũ hết hiệu lực (MGR_VER) —');
ok('phiên cũ bị từ chối', !!err(() => api.loadMonth(tok, '2026-10')));
tok = ch.token;
ok('phiên mới (trả về khi đổi) dùng được', !err(() => api.loadMonth(tok, '2026-10')));

console.log('— Mật khẩu: máy chủ tự dựng cách đọc, không nhận danh sách đoán từ máy —');
ok('gõ bằng telex "Otagăa2026x" vẫn vào', !!api.loginManager('Otagăa2026x').token);
ok('toàn góc "Ｏｔａｇａｗａ２０２６ｘ" vẫn vào', !!api.loginManager('Ｏｔａｇａｗａ２０２６ｘ').token);
ok('danh sách "alts" gửi kèm bị bỏ qua', !!err(() => api.loginManager('sai-mat-khau', JSON.stringify(['Otagawa2026x']))));
ok('số cách đọc tối đa 12', api.pwCands_('ăâêôơưđăâêôơư').length <= 12, api.pwCands_('ăâêôơưđăâêôơư').length);
api.__cache && Object.keys(api.__cache).forEach(k => { if (/^fail:/.test(k)) delete api.__cache[k]; });
api.CacheService.getScriptCache().remove('fail:mgr');
tok = api.loginManager('Otagawa2026x').token;

api.saveEmployees(tok, JSON.stringify([{ id: E1, name: 'ヒエウ' }, { id: E2, name: 'ラム', minIncome: 50000, rank: 3 }, { id: E3, name: 'まい' }]));

console.log('— Mã đăng ký: không còn ai cũng "Tạo mã mới" cho tên chưa có mã —');
ok('không có mã đăng ký → từ chối', /mã đăng ký/i.test(err(() => api.claimEmployee(E1, '284619', false, 'x'))));
const cc = api.issueClaimCode(tok, E1);
ok('quản lý cấp được mã 6 số', /^\d{6}$/.test(cc.code), JSON.stringify(cc));
const wrong = cc.code === '000000' ? '111111' : '000000';
ok('sai mã đăng ký → từ chối', /không đúng/.test(err(() => api.claimEmployee(E1, '284619', false, 'x', wrong))));
const ses = api.claimEmployee(E1, '284619', false, 'x', cc.code);
ok('đúng mã → tạo được mã đăng nhập', !!(ses && ses.token));
ok('mã dùng một lần (tên đã có mã)', !!err(() => api.claimEmployee(E1, '111222', false, 'x', cc.code)));
const rp = api.resetPin(tok, E1);
ok('Reset mã trả về mã đăng ký mới', rp && /^\d{6}$/.test(rp.code), JSON.stringify(rp));
ok('nhân viên dùng mã mới tạo lại được', !!api.claimEmployee(E1, '５５５６６６', false, 'x', rp.code).token);
ok('mã toàn góc được đổi về nửa góc', !!api.loginEmployee(E1, '555666', false, 'x').token);
api.CacheService.getScriptCache().remove('fail:emp:' + E2);
const c2 = api.issueClaimCode(tok, E2); api.claimEmployee(E2, '284619', false, 'x', c2.code);
const sTok = api.loginEmployee(E2, '284619', false, 'x').token;

console.log('— Máy đã ghi nhớ: không vượt giới hạn ~9KB của một Script Property —');
for (let i = 0; i < 120; i++) api.newDevice_('e' + String(i).padStart(6, '0'), 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', true);
const devLen = (api.__props.SESS_DEV || '').length;
ok('SESS_DEV ≤ 8000 ký tự (' + devLen + ')', devLen > 0 && devLen <= 8000);
ok('máy mới nhất vẫn còn', Object.values(JSON.parse(api.__props.SESS_DEV)).some(x => x.e === 'e000119'));

console.log('— Điểm danh: quên 退勤 hôm qua, sáng nay quét không bị gắn vào hôm qua —');
const day0 = Date.UTC(2026, 9, 20) - 9 * 3600000;           // 0:00 JST 20/10
api.kvSet_('att:2026-10', JSON.stringify({ '20': { [E3]: [{ k: 'in', t: day0 + 17 * 3600000, s: 'qr' }] } }));
const cfg = api.attCfg_(), emp3 = { id: E3, name: 'まい' };
const r1 = api.attRecord_(emp3, 'in', day0 + 24 * 3600000 + 9 * 3600000, cfg);
ok('出勤 9:00 hôm sau → ngày 21 (ngày mới)', r1.day === '2026-10-21', r1.day);
api.kvSet_('att:2026-10', JSON.stringify({ '20': { [E3]: [{ k: 'in', t: day0 + 17 * 3600000, s: 'qr' }] } }));
const r2 = api.attRecord_(emp3, 'out', day0 + 24 * 3600000 + 1 * 3600000, cfg);
ok('退勤 1:00 đêm → vẫn của ngày 20 (ca qua nửa đêm)', r2.day === '2026-10-20', r2.day);
api.kvSet_('att:2026-10', JSON.stringify({ '20': { [E3]: [{ k: 'in', t: day0 + 17 * 3600000, s: 'qr' }] } }));
const r3 = err(() => api.attRecord_(emp3, 'out', day0 + 24 * 3600000 + 9 * 3600000, cfg));
ok('退勤 9:00 sáng hôm sau → KHÔNG đóng ca 16 tiếng hôm qua', /Chưa điểm danh vào ca/.test(r3), r3);

console.log('— Chi viện: ca ext không "sống lại", giữ ca ext thì cắt ca thường trùng giờ —');
const ext = { start: 12, end: 15, isSupport: true, ext: 1, sid: 'abc12345', supTo: { id: 'ssX', name: 'X', code: 'X' } };
let oldO = { '5': { [E1]: { off: false, shifts: [{ start: 10, end: 12 }, ext] } } };
let newO = { '5': { [E1]: { off: false, shifts: [{ start: 10, end: 15 }] } } };     // máy cầm bản cũ chưa cắt
api.supKeepExt_(oldO, newO);
let sh = newO['5'][E1].shifts;
ok('giữ ca ✈ ext', sh.some(x => x.sid === 'abc12345'));
ok('ca thường bị cắt còn 10–12 (không tính giờ hai lần)', sh.filter(x => !x.isSupport).map(x => x.start + '-' + x.end).join(',') === '10-12', JSON.stringify(sh));
oldO = { '5': { [E1]: { off: false, shifts: [{ start: 10, end: 12 }] } } };          // quán kia đã huỷ
newO = { '5': { [E1]: { off: false, shifts: [{ start: 10, end: 12 }, ext] } } };     // máy cầm bản cũ còn ca ✈
api.supKeepExt_(oldO, newO);
ok('ca ext đã huỷ không sống lại', !newO['5'][E1].shifts.some(x => x.sid === 'abc12345'));
oldO = { '6': { [E1]: { off: false, shifts: [ext] } } }; newO = { '6': {} };
api.supKeepExt_(oldO, newO);
ok('ô bị xoá (máy cũ) → ca ext vẫn còn', !!(newO['6'][E1] && newO['6'][E1].shifts.some(x => x.sid === 'abc12345')));
ok('xsCall_ chỉ gọi địa chỉ Apps Script', api.xsCall_({ url: 'https://evil.example/exec', xkey: 'k' }, 'assign', {}).fail === true);
ok('tháng bên cạnh giữ ca ✈ (đếm chuỗi ngày / 28h)', !!api.compactShiftEntry_({ off: false, shifts: [{ start: 9, end: 13, isSupport: true }] }));

console.log('— 28h/tuần: 7 ngày liên tiếp nặng nhất, qua cả mép tháng —');
for (let d = 26; d <= 30; d++) api.saveShiftEntry(tok, '2026-09', d, E3, { off: false, shifts: [{ start: 10, end: 15 }] });      // 5h × 5
for (let d = 1; d <= 2; d++) api.saveShiftEntry(tok, '2026-10', d, E3, { off: false, shifts: [{ start: 10, end: 15 }] });        // 5h × 2
const dash = api.empDash(tok, E3, '2026-10'), oct = dash.months[dash.months.length - 1];
ok('tuần cao nhất tháng 10 = 35h (26/9–2/10)', Math.abs(oct.weekMax - 35) < 0.01, oct.weekMax);

console.log('— Riêng tư: nhân viên không thấy thu nhập / cấp bậc / ghi chú của người khác —');
api.saveRequestEntry(tok, '2026-10', 12, E3, { type: 'unavailable', note: 'đi khám bệnh' });
const lm = api.loadMonth(sTok, '2026-10');
const other = lm.employees.find(e => e.id === E1), me2 = lm.employees.find(e => e.id === E2);
ok('không có minIncome / rank của chính mình bị mất', me2.minIncome === 50000 && me2.rank === 3, JSON.stringify(me2));
ok('ghi chú báo nghỉ của người khác bị ẩn', lm.requests['12'] && lm.requests['12'][E3] && !lm.requests['12'][E3].note, JSON.stringify(lm.requests['12']));
api.saveEmployees(tok, JSON.stringify([{ id: E1, name: 'ヒエウ', minIncome: 70000, rank: 2 }, { id: E2, name: 'ラム', minIncome: 50000, rank: 3 }, { id: E3, name: 'まい' }]));
const lm2 = api.loadMonth(sTok, '2026-10'), o2 = lm2.employees.find(e => e.id === E1);
ok('minIncome / rank của người khác bị ẩn', o2.minIncome === undefined && o2.rank === undefined, JSON.stringify(o2));

console.log('— Thư: hãm số lần gửi —');
api.saveMyEmail(sTok, E2, 'lam@example.com', '{}');
let mailErr = '';
for (let i = 0; i < 4; i++) mailErr = err(() => api.staffMailTest(sTok, E2));
ok('thư thử thứ 4 trong 1 giờ bị chặn', /nhiều lần/.test(mailErr), mailErr);

console.log('— Danh sách nhân viên rỗng không tự sinh 20 người mẫu —');
api.kvSet_('employees', '[]');
ok('đọc ra đúng 0 người', api.readEmployees_().length === 0);
api.kvSet_('employees', '{hỏng');
ok('dữ liệu hỏng → báo lỗi, không ghi đè', /lỗi dữ liệu/.test(err(() => api.readEmployees_())) && api.kvGet_('employees') === '{hỏng');
ok('màn đăng nhập vẫn mở được (bootstrap)', !err(() => api.bootstrap('', '')));

console.log('— Lặt vặt —');
ok('ca "đến L" bắt đầu sau giờ đóng cửa không ra giờ âm', api.endOf_({ start: 21.5, endAtClose: true }, { 3: 21 }, 3) === 22);
ok('tick định kỳ gọi dồn bị hãm', (api.tickGate_('t', 55) && !api.tickGate_('t', 55)));

console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail);
process.exit(fail ? 1 : 0);
