// v2026.10.29.2 — giao diện gọn: ngôn ngữ cạnh QL/NV · Cài đặt trong ⋯ · tab Tháng 3 cột · ⋯ Thêm ở dòng kỳ + nút ↶ ·
// nút Xếp nhanh / Xoá ca ở khung giờ · khối ✈️ Chi viện (nhặt người rảnh quán khác). Chạy: node tests/v50ui.js
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
const makeApi = require('./gas-mock'), registry = {}, web = {};
const api = makeApi({ code: CODE, html: HTML, registry, web, ssId: 'ssCentrair', url: 'https://script.google.com/macros/s/centrair/exec' });
const B = makeApi({ code: CODE, html: HTML, registry, web, ssId: 'ssOtagawa', url: 'https://script.google.com/macros/s/otagawa/exec' });
const PORT = 9080, html = fs.readFileSync(HTML, 'utf8');
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const W = (p, ms) => p.waitForTimeout(ms), SH = n => path.join(DIR, 'sh', 'v50-' + n + '.png');
(async () => {
  await new Promise(r => server.listen(PORT, r));
  const login = a => { let t = a.loginManager('subway1111').token; a.changeManagerPassword(t, 'subway1111', 'Otagawa2026x'); return a.loginManager('Otagawa2026x').token; };
  const tok = login(api), tB = login(B);
  api.storeCodeSave(tok, 'CEN'); B.storeCodeSave(tB, 'OTA');
  api.saveSettings(tok, JSON.stringify({ hubOn: true, storeName: 'Centrair' }));
  B.__props.hubId = api.__props.hubId;
  B.saveEmployees(tB, JSON.stringify([{ id: 'ram', name: 'ラム', type: 'sa' }, { id: 'tan', name: 'タン', type: 'sa' }]));
  B.saveSettings(tB, JSON.stringify({ hubOn: true, storeName: 'Otagawa', supPool: ['ram', 'tan'] }));
  api.saveEmployees(tok, JSON.stringify([{ id: 'e1aaaa', name: 'ヒエウ' }, { id: 'e2bbbb', name: 'まい' }]));
  api.hubRegister_(true); B.hubRegister_(true);
  const TODAY = api.jstDateStr_(0), YM = TODAY.slice(0, 7), D = +TODAY.slice(8);
  api.saveShiftEntry(tok, YM, D, 'e1aaaa', { off: false, shifts: [{ start: 9, end: 15 }] });
  B.saveShiftEntry(tB, YM, D, 'tan', { off: false, shifts: [{ start: 10, end: 16 }] });     // タン: đã có ca NHÁP ở quán chính
  B.hubPublish_(YM, true);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1, timezoneId: 'Asia/Tokyo', locale: 'vi-VN' });
  const m = await ctx.newPage(); m.errs = []; m.on('pageerror', e => m.errs.push(e.message));
  await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(api[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
  await ctx.addInitScript(() => {
    function mkRun(){ let s = () => {}, f = () => {}; const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; }; if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
    window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: { lang: 'vi' }, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
    window.__LAUNCHER_ON = 1;            // như máy thật: tab Tháng là các ô app
  });
  await m.goto('http://127.0.0.1:' + PORT + '/'); await W(m, 1500);
  await m.click('[data-ltab="manager"]'); await W(m, 250);
  await m.fill('#mgrPwd', 'Otagawa2026x'); await m.click('#mgrLoginBtn');
  await m.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 }); await W(m, 1500);
  for (let i = 0; i < 4 && await m.locator('.modal-back').count(); i++){ await m.keyboard.press('Escape'); await W(m, 250); }
  console.log('— Thanh trên cùng · tab —');
  ok('chỉ còn 2 tab: Ngày · Tháng', JSON.stringify(await m.$$eval('[data-mtab]', b => b.filter(x => x.closest('.tab-bar')).map(x => x.dataset.mtab))) === '["day","month"]');
  ok('ngôn ngữ 日 / VI / EN đứng cạnh Quản lý / Nhân viên', await m.locator('.topbar .tb-lang [data-lang]').count() === 3);
  await m.click('.topbar .tb-lang [data-lang="ja"]'); await W(m, 600);
  ok('bấm 日 → giao diện tiếng Nhật', /日|月/.test(await m.locator('.tab-bar').innerText()));
  await m.click('.topbar .tb-lang [data-lang="vi"]'); await W(m, 600);
  await m.click('#tbMore'); await W(m, 200);
  ok('⋯ Thêm có mục Cài đặt', await m.locator('#tbPop #goSettingsBtn').isVisible());
  await m.click('#goSettingsBtn'); await W(m, 800);
  ok('mở Cài đặt (có nút ‹ Quay lại)', await m.locator('.set-head .set-back').count() === 1);
  await m.screenshot({ path: SH('settings') });
  await m.click('.set-head .set-back'); await W(m, 700);
  console.log('— Tab Ngày —');
  const hd = await m.evaluate(() => { const r = document.querySelector('.cp-rcol'); return r ? { acts: r.querySelectorAll('#quickDayBtn,#clearDayBtn').length, stats: !!r.querySelector('#cpStats') } : null; });
  ok('Xếp nhanh / Xoá ca nằm bên phải khung giờ, cùng cột với 12h · SA · Chính thức', hd && hd.acts === 2 && hd.stats, JSON.stringify(hd));
  ok('hàng nút cũ (Xếp nhanh / Xoá hết / Xin chi viện) phía trên đã bỏ', await m.locator('.roster-tools #quickDayBtn').count() === 0);
  const cb = m.locator('.cand-box');
  ok('khối chi viện lớn đã bỏ — chi viện là mục phụ trong "Thêm vào ca hôm nay"', await m.locator('#poolBox').count() === 0 && await cb.locator('#candSup #supBorrowBtn').count() === 1 && await cb.locator('#candSup #supDispatchBtn').count() === 1);
  await W(m, 1500);
  const supRow = await cb.locator('#candSup').innerText().catch(() => '');
  ok('thẻ tím ✈ Chi viện: ラム (OTA, rảnh) + タン (OTA, nháp)', /Chi viện/.test(supRow) && /ラム/.test(supRow) && /タン/.test(supRow) && /nháp/.test(supRow), supRow);
  await cb.locator('#candSup').screenshot({ path: SH('cand-sup') }).catch(() => {});
  // người đã có lịch nháp ở quán chính
  await m.locator('#candSup .cand-chip.is-draft').first().click(); await W(m, 600);
  const dlg = m.locator('.modal-back:not(.closing)').last();
  const dt = await dlg.innerText();
  ok('bấm người có lịch nháp → báo tạm thời không mượn được + nút Yêu cầu chi viện + Huỷ thêm ca', /lịch nháp/.test(dt) && /Yêu cầu chi viện/.test(dt) && /Huỷ thêm ca/.test(dt), dt);
  await dlg.locator('.modal-box').screenshot({ path: SH('draft-dialog') });
  await dlg.locator('#mCancel').click(); await W(m, 500);
  ok('Huỷ thêm ca → đóng, không đổi lịch quán nhà', !(await m.locator('.modal-back:not(.closing)').count()) && !((((B.readMonthObject_(B.getSheet_(), 'schedule:' + YM) || {})[String(D)] || {}).tan || {}).shifts || []).some(x => x.isSupport));
  // người rảnh → nhặt về
  await m.locator('#candSup .cand-chip:not(.is-draft)').first().click(); await W(m, 600);
  await m.locator('.modal-back:not(.closing) #mOk').last().click(); await W(m, 1500);
  const s7 = ((((B.readMonthObject_(B.getSheet_(), 'schedule:' + YM) || {})[String(D)] || {}).ram || {}).shifts || []).filter(x => x.isSupport);
  ok('bấm người rảnh → chọn giờ → ca ✈ vào lịch quán nhà Otagawa', s7.length === 1 && s7[0].supTo && /Centrair/.test(s7[0].supTo.name), JSON.stringify(s7));
  await W(m, 1200);
  ok('ラム đã nhặt → không còn trong nhóm "Có thể chi viện", hiện ở dòng "Tới giúp quán mình"', !/ラム/.test(await m.locator('#candSup').innerText().catch(() => '')) && /ラム/.test(await m.locator('.cand-sup').innerText()));
  ok('nút Mượn / Cử người ẩn tới khi bấm thẻ Chi viện', !(await m.locator('#supBorrowBtn').isVisible()));
  await m.click('[data-supcard]'); await W(m, 300);
  ok('bấm thẻ Chi viện → hiện Mượn người · Cử người đi', await m.locator('#supBorrowBtn').isVisible() && await m.locator('#supDispatchBtn').isVisible());
  await m.click('#poolManageBtn'); await W(m, 500);
  await m.locator('.modal-back:not(.closing) .pl-pick input[value="e2bbbb"]').check();
  await m.locator('.modal-back:not(.closing) #mOk').last().click(); await W(m, 1000);
  ok('Người đi được (n): chọn まい → lưu vào cài đặt', JSON.stringify(api.readSettings_().supPool) === '["e2bbbb"]' && /\(1\)/.test(await m.locator('#poolManageBtn').innerText()));
  await m.locator('.cand-box').screenshot({ path: SH('cand-box') });
  // checklist theo giờ: công tắc
  ok('dòng ⏰ Checklist theo giờ có công tắc bật / tắt', await m.locator('.hk-sec [data-hkon]').count() === 1);
  await m.locator('.hk-sec .hk-sw').click(); await W(m, 900);
  ok('tắt → lưu hkOn = false, dòng hiện "Đang tắt"', api.readSettings_().hkOn === false && /Đang tắt/.test(await m.locator('.hk-sec').innerText()));
  await m.locator('.hk-sec .hk-sw').click(); await W(m, 900);
  ok('bật lại → hkOn = true', api.readSettings_().hkOn === true);
  // theo dõi link mới
  const chip = m.locator('.alerts-row [data-lkopen]');
  ok('tab Ngày có chip 📱 Link mới x/n · Thông báo y/n', await chip.count() === 1 && /Link mới 0\/2/.test(await chip.innerText()), await m.locator('.alerts-row').innerText().catch(() => ''));
  await chip.click(); await W(m, 1200);
  ok('bấm chip → bảng theo dõi từng người', await m.locator('.modal-back:not(.closing) .lk-row').count() === 2);
  await m.locator('.modal-back:not(.closing) .modal-box').screenshot({ path: SH('lk-dialog') });
  await m.keyboard.press('Escape'); await W(m, 500);
  // biểu tượng: không còn emoji màu ⬅ ➡ trong chữ hiển thị
  const emo = await m.evaluate(() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const bad = []; let n; while ((n = w.nextNode())){ if (n.parentNode && n.parentNode.closest && n.parentNode.closest('desc,svg,script,style')) continue; if (/[\u2B05\u27A1\u2B07\u{1F4E4}\u{1F4B3}\u{1F321}\u{1F4C1}]/u.test(n.textContent)) bad.push(n.textContent.trim().slice(0, 30)); } return bad; });
  ok('không còn emoji màu (⬅ ➡ ⬇ 📤 💳 🌡 📁) trong chữ — đã thay bằng icon nét', !emo.length, JSON.stringify(emo));
  await m.screenshot({ path: SH('day') });
  console.log('— Tab Tháng —');
  await m.click('[data-mtab="month"]'); await W(m, 1500);
  const lay13 = await m.evaluate(() => { const g = document.querySelector('.mon-desk'); const r = s => g.querySelector(s).getBoundingClientRect(); return { main: Math.round(r('.md-main').width), lx: Math.round(r('.md-left').left), rx: Math.round(r('.md-right').left) }; });
  ok('màn 1360px: lịch tháng rộng (≥ 900px), Dự toán + app dồn cột phải', lay13.main >= 900 && lay13.lx === lay13.rx, JSON.stringify(lay13));
  await m.setViewportSize({ width: 1600, height: 900 }); await W(m, 800);
  const lay = await m.evaluate(() => { const g = document.querySelector('.mon-desk'); if (!g) return null; const r = s => { const e = g.querySelector(s); return e ? Math.round(e.getBoundingClientRect().left) : -1; }; return { grid: getComputedStyle(g).display, l: r('.md-left'), c: r('.md-main'), rr: r('.md-right'), budget: !!g.querySelector('.md-left .lbm, .md-left [id*="budget" i], .md-left'), apps: g.querySelector('.md-right') ? g.querySelector('.md-right').innerText.slice(0, 80) : '' }; });
  ok('màn ≥1500px: 3 cột — Dự toán bên trái · lịch giữa · app Xếp ca / Nhân công / Doanh thu bên phải', lay && lay.grid === 'grid' && lay.l < lay.c && lay.c < lay.rr && /Xếp ca/.test(lay.apps), JSON.stringify(lay));
  ok('⋯ Thêm nằm ở dòng kỳ (chỗ Lịch sử công bố)', await m.locator('.pub-line .pub-more').count() === 1);
  await m.click('.pub-line .pub-more > summary'); await W(m, 300);
  const menu = await m.locator('.pub-line .pub-more .tool-menu').innerText();
  ok('menu ⋯ Thêm: Lịch sử công bố + Xuất giờ công, KHÔNG còn "Sao chép lịch tháng trước"', /Lịch sử công bố/.test(menu) && /Xuất/.test(menu) && !/Sao chép/.test(menu), menu);
  ok('thanh công cụ tháng không bị cắt (đủ 3 nút xếp nháp)', await m.evaluate(() => { const g = document.querySelector('.month-tools .auto-grp'); return !!g && [...g.children].every(b => b.getBoundingClientRect().right <= g.getBoundingClientRect().right + 1); }));
  await m.screenshot({ path: SH('month') });
  ok('không lỗi JS', !m.errs.length, m.errs.join(' | '));
  // điện thoại
  await m.setViewportSize({ width: 390, height: 844 }); await W(m, 800);
  await m.screenshot({ path: SH('month-phone') });
  await m.click('[data-mtab="day"]'); await W(m, 1200);
  await m.screenshot({ path: SH('day-phone') });
  ok('điện thoại: không lỗi JS', !m.errs.length, m.errs.join(' | '));
  await browser.close(); server.close();
  console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('HARNESS', e); process.exit(2); });
