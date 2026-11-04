// v2026.10.28.1 — máy chủ: khoá sổ chấm công + lưu 7 năm · checklist đào tạo nhân viên mới. Chạy: node tests/v47srv.js
const path = require('path');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const err = f => { try { f(); return ''; } catch (e) { return e.message || String(e); } };
const api = require('./gas-mock')({ code: CODE, html: HTML });
const D = api.DriveApp.__D;
const txt = b => Buffer.from(b.map(x => x < 0 ? x + 256 : x)).toString('utf8');

let tok = api.loginManager('subway1111').token; tok = api.changeManagerPassword(tok, 'subway1111', 'Otagawa2026x').token;
api.saveEmployees(tok, JSON.stringify([{ id: 'e1aaaa', name: 'ヒエウ' }, { id: 'e2bbbb', name: 'ラム' }]));
const c2 = api.issueClaimCode(tok, 'e2bbbb'); const sTok = api.claimEmployee('e2bbbb', '284619', false, 'x', c2.code).token;
const CUR = api.attCurYm_(), PREV = api.ymShift_(CUR, -1);
const ds = d => api.attDayStart_(PREV + '-' + String(d).padStart(2, '0'));
const H = 3600000, M = 60000;
// điểm danh tháng trước: ラム ngày 3 (9:00–17:00, nghỉ 12:00–12:45), ヒエウ ngày 3 + ngày 4 (quên về)
api.kvSet_('att:' + PREV, JSON.stringify({
  '3': { e2bbbb: [{ k: 'in', t: ds(3) + 9 * H, s: 'qr' }, { k: 'bs', t: ds(3) + 12 * H, s: 'qr' }, { k: 'be', t: ds(3) + 12 * H + 45 * M, s: 'qr' }, { k: 'out', t: ds(3) + 17 * H, s: 'qr' }],
         e1aaaa: [{ k: 'in', t: ds(3) + 10 * H, s: 'qr' }, { k: 'out', t: ds(3) + 15 * H, s: 'qr' }] },
  '4': { e1aaaa: [{ k: 'in', t: ds(4) + 10 * H, s: 'qr' }] } }));

console.log('— Sửa giờ cuối tháng (có nhật ký) —');
api.attEdit(tok, PREV, 4, 'e1aaaa', JSON.stringify([{ k: 'in', t: ds(4) + 10 * H }, { k: 'out', t: ds(4) + 14 * H + 30 * M }]), 'quên bấm về');
let log = api.attLogGet(tok, PREV);
ok('sửa giờ → nhật ký ghi người, ngày, giờ cũ → mới, lý do', log.length === 1 && log[0].k === 'edit' && log[0].n === 'ヒエウ' && log[0].d === 4 && log[0].to.length === 2 && log[0].r === 'quên bấm về', JSON.stringify(log[0]));
ok('lưu lại y hệt → không ghi nhật ký thừa', (api.attEdit(tok, PREV, 4, 'e1aaaa', JSON.stringify([{ k: 'in', t: ds(4) + 10 * H }, { k: 'out', t: ds(4) + 14 * H + 30 * M }])), api.attLogGet(tok, PREV).length === 1));

console.log('— Khoá sổ —');
ok('tháng hiện tại chưa kết thúc → không khoá được', /chưa kết thúc/.test(err(() => api.attClose(tok, CUR))));
ok('nhân viên không khoá được', /quản lý/.test(err(() => api.attClose(sTok, PREV))));
const L1 = api.attClose(tok, PREV, 'đã kiểm tra');
ok('khoá sổ tháng trước → bản 1, đã khoá', L1.v === 1 && L1.locked && L1.files.length === 1, JSON.stringify(L1).slice(0, 200));
const f1 = L1.files[0];
ok('hạn lưu = 7 năm sau', Math.abs(new Date(f1.until).getFullYear() - new Date().getFullYear() - 7) === 0);
const folders = Object.values(D.folders).map(f => f.name);
ok('thư mục Drive: SUBWAY 勤怠記録（7年保存）/ quán / năm', folders.includes('SUBWAY 勤怠記録（7年保存）') && folders.includes(PREV.slice(0, 4)), folders.join(' | '));
const files = Object.values(D.files);
const csvF = files.find(f => /\.csv$/.test(f.name)), pdfF = files.find(f => /\.pdf$/.test(f.name));
ok('tạo đủ PDF + CSV, tên có tháng + bản', csvF && pdfF && new RegExp('勤怠_' + PREV + '_.*_第1版_').test(csvF.name), files.map(f => f.name).join(' | '));
const csv = txt(csvF.bytes);
ok('CSV: tiêu đề tiếng Nhật, mỗi người mỗi ngày một dòng (3 dòng)', /^﻿年月,日,曜日,社員コード,氏名,出勤,退勤,休憩\(分\),実働/.test(csv) && csv.trim().split('\r\n').length === 4, csv.slice(0, 160));
ok('CSV: ラム 9:00–17:00, nghỉ 45 phút, thực làm 7:15', /ラム,09:00,17:00,45,7:15,7\.25/.test(csv), csv);
ok('CSV: dòng sửa tay được đánh dấu 有', /ヒエウ,10:00,14:30,0,4:30,4\.5,有/.test(csv), csv);
const pdfHtml = txt(pdfF.bytes);
ok('PDF: tiêu đề 勤怠記録, bản 1, có lịch sử sửa (lý do)', /勤怠記録（出勤簿）/.test(pdfHtml) && /第1版/.test(pdfHtml) && /修正・確定の履歴/.test(pdfHtml) && /quên bấm về/.test(pdfHtml));
ok('mô tả file Drive có mã SHA-256 + hạn lưu', /SHA-256 [0-9a-f]{64}/.test(csvF.desc) && /保存期限/.test(csvF.desc), csvF.desc);
ok('tháng đã khoá → không sửa giờ được', /khoá sổ/.test(err(() => api.attEdit(tok, PREV, 3, 'e1aaaa', '[]'))));
ok('khoá lần hai khi đang khoá → báo đã khoá', /đã khoá sổ/.test(err(() => api.attClose(tok, PREV))));
ok('attMonth trả trạng thái khoá', api.attMonth(tok, PREV).lock.locked === true);

console.log('— Mở khoá có lý do → bản 2 —');
ok('mở khoá không ghi lý do → từ chối', /lý do/.test(err(() => api.attReopen(tok, PREV, ''))));
const R = api.attReopen(tok, PREV, 'thiếu giờ ngày 3 của ヒエウ');
ok('mở khoá → đang mở để sửa', R.open && !R.locked);
api.attEdit(tok, PREV, 3, 'e1aaaa', JSON.stringify([{ k: 'in', t: ds(3) + 10 * H }, { k: 'out', t: ds(3) + 16 * H }]));
log = api.attLogGet(tok, PREV);
ok('sửa sau khi mở khoá → nhật ký tự gắn lý do mở khoá', log[0].k === 'edit' && /thiếu giờ ngày 3/.test(log[0].r) && log.some(x => x.k === 'reopen'), JSON.stringify(log[0]));
const L2 = api.attClose(tok, PREV);
ok('khoá lại → bản 2, giữ cả bản 1', L2.v === 2 && L2.files.length === 2 && L2.files[0].v === 1);
ok('file bản 1 trong Drive giữ nguyên (không bị ghi đè)', D.files[csvF.id] && txt(D.files[csvF.id].bytes) === csv && Object.values(D.files).filter(f => /\.csv$/.test(f.name)).length === 2);
const g1 = api.attArchiveGet(tok, PREV, 1, 'csv');
ok('tải lại bản 1: đúng nội dung, mã SHA-256 khớp (✓ nguyên vẹn)', g1.ok && Buffer.from(g1.b64, 'base64').toString('utf8') === csv);
D.files[csvF.id].bytes = D.files[csvF.id].bytes.slice(0, -3).concat([49, 13, 10]);
ok('file trong Drive bị sửa → báo KHÔNG khớp', api.attArchiveGet(tok, PREV, 1, 'csv').ok === false);
const AR = api.attArchive(tok);
ok('danh sách kho lưu: có tháng, 2 bản, link thư mục, chưa hết hạn', AR.list.length === 1 && AR.list[0].ym === PREV && AR.list[0].files.length === 2 && !AR.list[0].expired && /drive/.test(AR.folder), JSON.stringify(AR).slice(0, 200));
ok('các khoá lưu trữ không bị dọn dữ liệu cũ', (api.pruneOldData_(), !!api.readJsonKey_('attlock:' + PREV).v && api.readJsonKey_('attlog:' + PREV).length >= 4));

console.log('— Checklist đào tạo nhân viên mới —');
ok('chưa mở yêu cầu → nhân viên không thấy, không tick được', api.trainState(sTok, 'e2bbbb').open === false && /chưa mở/.test(err(() => api.trainTick(sTok, 'e2bbbb', 'g11', true))));
ok('nhân viên không xem được của người khác', !!err(() => api.trainState(sTok, 'e1aaaa')));
const TS = api.trainOpen(tok, 'e2bbbb', true);
const nItems = TS.tpl.groups.reduce((a, g) => a + g.items.length, 0);
ok('mẫu SUBWAY sẵn: 7 nhóm, ' + nItems + ' mục, có 3 thứ tiếng', TS.tpl.groups.length === 7 && nItems >= 35 && TS.tpl.groups[0].t.ja === '基本・衛生' && !!TS.tpl.groups[0].t.vi);
ok('mở yêu cầu → nhân viên thấy checklist', api.trainState(sTok, 'e2bbbb').open === true);
let r = api.trainTick(sTok, 'e2bbbb', 'g11', true);
ok('nhân viên tự tick → đã làm 1, xác nhận 0', r.sum.s === 1 && r.sum.c === 0);
r = api.trainTick(tok, 'e2bbbb', 'g11', true, 'c', '店長 Lâm');
ok('quản lý xác nhận (kèm tên + ngày)', r.sum.c === 1 && r.rec.items.g11.cb === '店長 Lâm' && r.rec.items.g11.c > 0);
ok('nhân viên không bỏ tick mục đã xác nhận', /đã xác nhận/.test(err(() => api.trainTick(sTok, 'e2bbbb', 'g11', false))));
r = api.trainTick(tok, 'e2bbbb', 'g12', true, 'c', '店長 Lâm');
ok('quản lý xác nhận luôn mục NV chưa tick (khai hộ)', r.rec.items.g12.s > 0 && r.rec.items.g12.c > 0);
r = api.trainTick(tok, 'e2bbbb', 'g13', true, 's');
ok('quản lý tick hộ phần nhân viên', r.rec.items.g13.s > 0 && r.rec.items.g13.sm === 1 && !r.rec.items.g13.c);
const ids = TS.tpl.groups.flatMap(g => g.items.map(i => i.id));
ids.forEach(id => api.trainTick(sTok, 'e2bbbb', id, true));
const ev = (api.readJsonKey_('mgrev') || []).filter(x => x.k === 'train');
ok('nhân viên tick đủ → quản lý nhận thông báo "chờ xác nhận"', ev.length === 1 && ev[0].e === 'e2bbbb');
const TL = api.trainList(tok).list[0];
ok('danh sách tiến độ: ラム ' + TL.sum.s + '/' + TL.sum.n + ' đã làm, ' + TL.sum.c + ' xác nhận', TL.name === 'ラム' && TL.sum.s === nItems && TL.sum.c === 2 && TL.open);
ids.forEach(id => api.trainTick(tok, 'e2bbbb', id, true, 'c', 'Lâm'));
ok('xác nhận đủ → ghi ngày hoàn thành', api.trainList(tok).list[0].done > 0);
// sửa mẫu: bỏ nhóm 7, thêm 1 mục vào nhóm 1
const tpl = JSON.parse(JSON.stringify(TS.tpl)); tpl.groups.pop(); tpl.groups[0].items.push({ t: { ja: 'POSの日次締め', vi: 'Chốt máy POS cuối ngày' } });
const T2 = api.trainTplSave(tok, JSON.stringify(tpl)).tpl;
const n2 = T2.groups.reduce((a, g) => a + g.items.length, 0);
ok('sửa mẫu: bỏ 1 nhóm, thêm 1 mục (mục mới có mã riêng)', T2.groups.length === 6 && T2.groups[0].items.slice(-1)[0].id && T2.groups[0].items.slice(-1)[0].t.vi === 'Chốt máy POS cuối ngày');
const after = api.trainList(tok).list[0];
ok('tiến độ tính theo mẫu mới (mục mới chưa làm → chưa hoàn thành)', after.sum.n === n2 && after.sum.c === n2 - 1, JSON.stringify(after.sum));
ok('nhân viên không sửa được mẫu', !!err(() => api.trainTplSave(sTok, JSON.stringify(tpl))));
api.trainOpen(tok, 'e2bbbb', false);
ok('đóng yêu cầu → nhân viên không thấy nữa, tiến độ vẫn giữ', api.trainState(sTok, 'e2bbbb').open === false && api.trainList(tok).list[0].sum.c === n2 - 1);

console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail);
process.exit(fail ? 1 : 0);
