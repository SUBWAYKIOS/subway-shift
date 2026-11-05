
// ===========================================================================
// 🗄 KHOÁ SỔ CHẤM CÔNG + LƯU 7 NĂM (v47)
// ---------------------------------------------------------------------------
// Luật: 出勤簿・タイムカード giữ 5 năm (労基法109条, tạm thời 3 năm); dùng làm chứng từ thuế thì 7 năm.
// App giữ 7 năm cho chắc. Cuối tháng quản lý sửa giờ thiếu → bấm "Khoá sổ" (chỉ tháng đã kết thúc):
//   • xuất PDF (in nộp khi 労基署 kiểm tra) + CSV (Excel) vào Drive: "SUBWAY 勤怠記録（7年保存）/<quán>/<năm>/"
//   • lưu mã SHA-256 của từng file → mở lại kiểm được file có bị sửa không
//   • tháng đã khoá: không sửa được giờ điểm danh. Cần sửa → "Mở khoá" + lý do → sửa → khoá lại = BẢN 2
//     (bản 1 vẫn giữ nguyên), mọi lần sửa / mở khoá được ghi nhật ký (cũng in vào PDF).
// Khoá: 'attlock:YYYY-MM' = { v, open, at, until, files:[...], unlocks:[...] } · 'attlock:index' = [YYYY-MM…]
//       'attlog:YYYY-MM'  = [{ at, k:'edit'|'punch'|'close'|'reopen', d, e, n, from, to, r, v }]
// ===========================================================================
var ATTARCH_ROOT = 'SUBWAY 勤怠記録（7年保存）', ATTARCH_YEARS = 7;
function attLockGet_(ym) { var o = readJsonKey_('attlock:' + ym); return (o && typeof o === 'object' && !Array.isArray(o) && o.v) ? o : null; }
function attLocked_(ym) { var o = attLockGet_(ym); return !!(o && !o.open); }
function attCurYm_() { return attYmd_(Date.now()).slice(0, 7); }
/** Ghi khoá theo kiểu đọc–sửa–ghi trong khoá script (đang giữ khoá sẵn thì không lồng). */
function attKv_(key, fn) {
  var lock = LockService.getScriptLock(), mine = false;
  try { mine = lock.hasLock(); } catch (e0) {}
  if (!mine && !lock.tryLock(LOCK_WAIT_MS)) throw new Error('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try {
    var sheet = getSheet_(), cur = readMonthObject_(sheet, key), r = fn(cur);
    pubPut_(sheet, key, r);
    return r;
  } finally { if (!mine) lock.releaseLock(); }
}
function attLog_(ym, entry) {
  try {
    entry.at = entry.at || Date.now();
    attKv_('attlog:' + ym, function (cur) { cur = Array.isArray(cur) ? cur : []; cur.push(entry); return cur.slice(-3000); });
  } catch (e) { console.warn('attLog_: ' + e); }
}
function attEmpMap_() {
  var m = {}, sc = '';
  try { sc = storeCode_(); } catch (e) {}
  readEmployees_().forEach(function (e) { m[e.id] = { name: e.name, code: e.code ? (sc ? sc + '-' : '') + e.code : '', del: !!e.deleted }; });
  return m;
}
function attHmS_(t) { var d = attJst_(t); return ('0' + d.getUTCHours()).slice(-2) + ':' + ('0' + d.getUTCMinutes()).slice(-2); }
/** Bảng dữ liệu tháng: mỗi người · mỗi ngày một dòng (vào đầu, về cuối, tổng nghỉ, thực làm, chi tiết, có sửa tay không). */
function attMonthRows_(ym) {
  var raw = readJsonKey_('att:' + ym) || {}, em = attEmpMap_(), by = {};
  Object.keys(raw).forEach(function (d) {
    Object.keys(raw[d] || {}).forEach(function (id) {
      var l = (raw[d][id] || []).slice().sort(function (a, b) { return a.t - b.t; });
      if (!l.length) return;
      var brk = 0, bs = null, ins = l.filter(function (p) { return p.k === 'in'; }), outs = l.filter(function (p) { return p.k === 'out'; });
      l.forEach(function (p) { if (p.k === 'bs') bs = p.t; else if ((p.k === 'be' || p.k === 'out') && bs != null) { brk += p.t - bs; bs = null; } });
      var work = attWorkHours_(l, null), y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)), dd = Number(d);
      (by[id] = by[id] || []).push({
        d: dd, dow: '日月火水木金土'.charAt(new Date(Date.UTC(y, m - 1, dd)).getUTCDay()),
        inT: ins.length ? attHmS_(ins[0].t) : '', outT: outs.length ? attHmS_(outs[outs.length - 1].t) : '',
        brk: Math.round(brk / 60000), work: work, open: l[l.length - 1].k !== 'out',
        man: l.some(function (p) { return p.s === 'm'; }),
        det: l.map(function (p) { return ATT_KIND_JA_[p.k] + ' ' + attHmS_(p.t) + (p.s === 'm' ? '*' : ''); }).join(' / ')
      });
    });
  });
  var out = Object.keys(by).map(function (id) {
    var rows = by[id].sort(function (a, b) { return a.d - b.d; }), tot = 0;
    rows.forEach(function (r) { tot += r.work; });
    var e = em[id] || { name: id, code: '' };
    return { id: id, name: e.name, code: e.code, rows: rows, days: rows.length, hours: Math.round(tot * 100) / 100 };
  });
  out.sort(function (a, b) { return String(a.code || 'zz' + a.name).localeCompare(String(b.code || 'zz' + b.name)); });
  return out;
}
function attHmDur_(h) { var mi = Math.round((Number(h) || 0) * 60); return Math.floor(mi / 60) + ':' + ('0' + (mi % 60)).slice(-2); }
function attCsv_(ym, emps) {
  var esc = function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  var lines = [['年月', '日', '曜日', '社員コード', '氏名', '出勤', '退勤', '休憩(分)', '実働(時:分)', '実働(時間)', '手修正', '打刻明細'].join(',')];
  emps.forEach(function (E) {
    E.rows.forEach(function (r) {
      lines.push([ym, r.d, r.dow, E.code, E.name, r.inT, r.outT, r.brk, attHmDur_(r.work), r.work, r.man ? '有' : '', r.det].map(esc).join(','));
    });
  });
  return '﻿' + lines.join('\r\n') + '\r\n';
}
function attPdfHtml_(ym, emps, info, logs) {
  var h = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)), store = storeLabel_();
  var css = '@page{size:A4 portrait;margin:12mm}body{font-family:"Noto Sans JP","Hiragino Sans",Arial,sans-serif;font-size:9pt;color:#111}' +
    'h1{font-size:14pt;margin:0 0 2mm}.meta{font-size:8pt;color:#444;margin-bottom:4mm}.emp{page-break-inside:avoid;margin:0 0 5mm}' +
    'h2{font-size:10.5pt;margin:0 0 1.5mm;border-bottom:0.3mm solid #111;padding-bottom:1mm}h2 small{font-weight:400;color:#444}' +
    'table{width:100%;border-collapse:collapse}th,td{border:0.2mm solid #888;padding:0.8mm 1.2mm;text-align:center}th{background:#EEE}' +
    'td.det{text-align:left;font-size:7.5pt;color:#333}tr.tot td{font-weight:700;background:#F4F4F4}.man{color:#B00}.foot{margin-top:4mm;font-size:7.5pt;color:#444}' +
    '.log{page-break-before:always}.log td{text-align:left;font-size:8pt}';
  var out = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + h('勤怠記録 ' + ym) + '</title><style>' + css + '</style></head><body>' +
    '<h1>勤怠記録（出勤簿） ' + y + '年' + m + '月</h1><div class="meta">' + h(store) + ' · 第' + info.v + '版 · 確定 ' + h(info.atTxt) +
    ' · 対象 ' + emps.length + '名 · 保存期限 ' + h(info.untilTxt) + '</div>';
  if (!emps.length) out += '<p>この月の打刻記録はありません。</p>';
  emps.forEach(function (E) {
    out += '<div class="emp"><h2>' + h(E.name) + (E.code ? ' <small>' + h(E.code) + '</small>' : '') + ' <small>· ' + E.days + '日 · 実働 ' + attHmDur_(E.hours) + '</small></h2>' +
      '<table><tr><th style="width:11mm">日</th><th style="width:8mm">曜</th><th style="width:15mm">出勤</th><th style="width:15mm">退勤</th><th style="width:15mm">休憩</th><th style="width:16mm">実働</th><th>打刻明細（*＝手修正）</th></tr>' +
      E.rows.map(function (r) {
        return '<tr><td>' + r.d + '</td><td>' + r.dow + '</td><td>' + h(r.inT) + '</td><td>' + h(r.outT || (r.open ? '未退勤' : '')) + '</td><td>' + (r.brk ? r.brk + '分' : '') + '</td><td>' + attHmDur_(r.work) +
          '</td><td class="det' + (r.man ? ' man' : '') + '">' + h(r.det) + '</td></tr>';
      }).join('') + '<tr class="tot"><td colspan="5">合計</td><td>' + attHmDur_(E.hours) + '</td><td class="det">' + E.days + '日</td></tr></table></div>';
  });
  if (logs.length) {
    out += '<div class="log"><h2>修正・確定の履歴</h2><table><tr><th style="width:30mm">日時</th><th style="width:22mm">区分</th><th>内容</th></tr>' +
      logs.map(function (L) {
        var when = Utilities.formatDate(new Date(L.at), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
        var kind = { edit: '手修正', punch: '確定後の打刻', close: '確定', reopen: '確定解除' }[L.k] || L.k;
        var txt = L.k === 'edit' || L.k === 'punch'
          ? (L.n || L.e || '') + ' ' + m + '/' + L.d + '：' + attLogList_(L.from) + ' → ' + attLogList_(L.to) + (L.r ? '（理由：' + L.r + '）' : '')
          : (L.k === 'close' ? '第' + L.v + '版を確定' : '理由：' + (L.r || '')) + (L.k === 'close' && L.r ? '（' + L.r + '）' : '');
        return '<tr><td>' + h(when) + '</td><td>' + h(kind) + '</td><td>' + h(txt) + '</td></tr>';
      }).join('') + '</table></div>';
  }
  out += '<div class="foot">この記録はシフトアプリの打刻データから自動作成されました。CSV版と同じ内容です。改ざん確認用ハッシュ（SHA-256）はアプリの「勤怠の保存」で確認できます。</div></body></html>';
  return out;
}
function attLogList_(l) { return (l && l.length) ? l.map(function (p) { return ATT_KIND_JA_[p.k] + attHmS_(p.t); }).join('・') : '（なし）'; }
function attSha_(bytes) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes).map(function (b) { b = b < 0 ? b + 256 : b; return (b < 16 ? '0' : '') + b.toString(16); }).join('');
}
function attArchFolder_(year) {
  var p = props_(), id = p.getProperty('ATTARCH_FOLDER'), store = null;
  if (id) { try { store = DriveApp.getFolderById(id); if (store.isTrashed && store.isTrashed()) store = null; } catch (e) { store = null; } }
  if (!store) {
    var it = DriveApp.getFoldersByName(ATTARCH_ROOT), root = it.hasNext() ? it.next() : DriveApp.createFolder(ATTARCH_ROOT);
    var nm = storeLabel_(), it2 = root.getFoldersByName(nm);
    store = it2.hasNext() ? it2.next() : root.createFolder(nm);
    p.setProperty('ATTARCH_FOLDER', store.getId());
  }
  var it3 = store.getFoldersByName(String(year));
  return { store: store, year: it3.hasNext() ? it3.next() : store.createFolder(String(year)) };
}

/** Khoá sổ một tháng đã kết thúc: xuất PDF + CSV, lưu mã SHA-256, chặn sửa. note: ghi chú (tuỳ chọn). */
function attClose(token, ym, note) {
  requireManager_(token);
  ym = attYm_(ym);
  if (ym >= attCurYm_()) throw new Error('Tháng ' + ym + ' chưa kết thúc — chỉ khoá sổ được từ ngày 1 tháng sau.');
  var cur = attLockGet_(ym);
  if (cur && !cur.open) throw new Error('Tháng ' + ym + ' đã khoá sổ (bản ' + cur.v + ').');
  var v = cur ? cur.v + 1 : 1, now = Date.now(), until = new Date(now); until.setFullYear(until.getFullYear() + ATTARCH_YEARS);
  var emps = attMonthRows_(ym), logs = (readJsonKey_('attlog:' + ym) || []);
  logs = Array.isArray(logs) ? logs.slice() : [];
  logs.push({ at: now, k: 'close', v: v, r: String(note || '').slice(0, 200) });
  var info = { v: v, atTxt: Utilities.formatDate(new Date(now), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'), untilTxt: Utilities.formatDate(until, 'Asia/Tokyo', 'yyyy/MM/dd') };
  var stamp = Utilities.formatDate(new Date(now), 'Asia/Tokyo', 'yyyyMMdd-HHmm'), slug = String(storeLabel_()).replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'SUBWAY';
  var base = '勤怠_' + ym + '_' + slug + '_第' + v + '版_' + stamp;
  var csvBlob = Utilities.newBlob(attCsv_(ym, emps), 'text/csv', base + '.csv');
  var pdfBlob = Utilities.newBlob(attPdfHtml_(ym, emps, info, logs), 'text/html', base + '.html').getAs('application/pdf').setName(base + '.pdf');
  var hCsv = attSha_(csvBlob.getBytes()), hPdf = attSha_(pdfBlob.getBytes());
  var F = attArchFolder_(ym.slice(0, 4));
  var fCsv = F.year.createFile(csvBlob), fPdf = F.year.createFile(pdfBlob);
  var desc = '勤怠記録 ' + ym + ' 第' + v + '版 · 保存期限 ' + info.untilTxt + ' · SHA-256 ';
  try { fCsv.setDescription(desc + hCsv); fPdf.setDescription(desc + hPdf); } catch (eD) {}
  var tot = 0; emps.forEach(function (E) { tot += E.hours; });
  var fileRec = { v: v, at: now, until: until.getTime(), csv: { id: fCsv.getId(), name: fCsv.getName(), sha: hCsv }, pdf: { id: fPdf.getId(), name: fPdf.getName(), sha: hPdf },
                  n: emps.length, rows: emps.reduce(function (a, E) { return a + E.rows.length; }, 0), hours: Math.round(tot * 100) / 100, note: String(note || '').slice(0, 200) };
  var res = attKv_('attlock:' + ym, function (o) {
    o = (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
    o.files = Array.isArray(o.files) ? o.files : []; o.unlocks = Array.isArray(o.unlocks) ? o.unlocks : [];
    o.files.push(fileRec); o.v = v; o.open = false; o.at = now; o.until = until.getTime();
    return o;
  });
  attKv_('attlock:index', function (a) { a = Array.isArray(a) ? a : []; if (a.indexOf(ym) === -1) a.push(ym); return a.sort(); });
  attLog_(ym, { at: now, k: 'close', v: v, r: fileRec.note });
  try { props_().setProperty('ATTARCH_URL', F.store.getUrl()); } catch (eU) {}
  return attLockOut_(ym, res);
}
/** Mở khoá để sửa tiếp (bắt buộc ghi lý do). Bản đã lưu giữ nguyên; khoá lại sẽ thành bản mới. */
function attReopen(token, ym, reason) {
  requireManager_(token);
  ym = attYm_(ym);
  var r = String(reason == null ? '' : reason).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 200);
  if (r.length < 4) throw new Error('Hãy ghi lý do mở khoá (ít nhất 4 ký tự) — lý do được lưu vào sổ.');
  var cur = attLockGet_(ym);
  if (!cur || cur.open) throw new Error('Tháng này chưa khoá sổ.');
  var res = attKv_('attlock:' + ym, function (o) { o.open = true; o.unlocks = Array.isArray(o.unlocks) ? o.unlocks : []; o.unlocks.push({ at: Date.now(), r: r, v: o.v }); return o; });
  attLog_(ym, { k: 'reopen', v: cur.v, r: r });
  return attLockOut_(ym, res);
}
function attLockOut_(ym, o) {
  o = o || attLockGet_(ym);
  if (!o) return { ym: ym, v: 0, open: false, locked: false, files: [] };
  return { ym: ym, v: o.v, open: !!o.open, locked: !o.open, at: o.at, until: o.until, unlocks: o.unlocks || [],
           files: (o.files || []).map(function (f) { return { v: f.v, at: f.at, until: f.until, n: f.n, rows: f.rows, hours: f.hours, note: f.note || '', pdf: f.pdf.name, csv: f.csv.name, shaPdf: f.pdf.sha, shaCsv: f.csv.sha }; }) };
}
/** Danh sách tháng đã lưu (mới nhất trước) + link thư mục Drive. */
function attArchive(token) {
  requireManager_(token);
  var idx = readJsonKey_('attlock:index'), now = Date.now();
  idx = Array.isArray(idx) ? idx.slice().sort().reverse() : [];
  return { folder: props_().getProperty('ATTARCH_URL') || '', years: ATTARCH_YEARS, cur: attCurYm_(),
           list: idx.map(function (ym) { var o = attLockOut_(ym); o.expired = !!(o.until && o.until < now); return o; }) };
}
/** Tải một file đã lưu (b64) + kiểm mã SHA-256 xem file trong Drive còn nguyên vẹn không. */
function attArchiveGet(token, ym, v, kind) {
  requireManager_(token);
  ym = attYm_(ym);
  var o = attLockGet_(ym); if (!o) throw new Error('Tháng này chưa khoá sổ.');
  var f = (o.files || []).filter(function (x) { return x.v === Number(v); })[0]; if (!f) throw new Error('Không có bản này.');
  var rec = kind === 'csv' ? f.csv : f.pdf, file;
  try { file = DriveApp.getFileById(rec.id); } catch (e) { throw new Error('Không mở được file trong Drive (đã bị xoá hoặc chuyển quyền?): ' + rec.name); }
  var bytes = file.getBlob().getBytes(), sha = attSha_(bytes);
  return { name: rec.name, b64: Utilities.base64Encode(bytes), type: kind === 'csv' ? 'text/csv' : 'application/pdf', ok: sha === rec.sha, sha: sha, want: rec.sha, url: file.getUrl() };
}
/** Nhật ký sửa / khoá / mở khoá của một tháng. */
function attLogGet(token, ym) {
  requireManager_(token);
  ym = attYm_(ym);
  var l = readJsonKey_('attlog:' + ym), em = attEmpMap_();
  l = Array.isArray(l) ? l : [];
  return l.slice(-500).reverse().map(function (x) { var c = JSON.parse(JSON.stringify(x)); if (c.e && !c.n) c.n = (em[c.e] || {}).name || c.e; return c; });
}
