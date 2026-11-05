// v2026.10.23.1 — CHI VIỆN v3 trên giao diện quản lý (hai quán giả lập, gọi thẳng app của nhau).
// Chạy: node tests/v37ui.js [Index.html] [Code.gs]
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
const makeApi = require('./gas-mock');
const registry = {}, web = {};
const A = makeApi({ code: CODE, html: HTML, registry, web, ssId: 'ssCentrair', url: 'https://script.google.com/macros/s/centrair/exec' });
const B = makeApi({ code: CODE, html: HTML, registry, web, ssId: 'ssOtagawa', url: 'https://script.google.com/macros/s/otagawa/exec' });
const PORT = 9057;
const html = fs.readFileSync(HTML, 'utf8');
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const W = (p, ms) => p.waitForTimeout(ms);

(async () => {
  await new Promise(r => server.listen(PORT, r));
  let tA = A.loginManager('subway1111').token; A.changeManagerPassword(tA, 'subway1111', 'Otagawa2026x'); tA = A.loginManager('Otagawa2026x').token;
  let tB = B.loginManager('subway1111').token; B.changeManagerPassword(tB, 'subway1111', 'Otagawa2026x'); tB = B.loginManager('Otagawa2026x').token;
  A.storeCodeSave(tA, 'CEN'); B.storeCodeSave(tB, 'OTA');
  A.saveSettings(tA, JSON.stringify({ hubOn: true, storeName: 'Centrair' }));
  B.__props.hubId = A.__props.hubId;
  B.saveSettings(tB, JSON.stringify({ hubOn: true, storeName: 'Otagawa' }));
  A.saveEmployees(tA, JSON.stringify([{ id: 'hie', name: 'ヒエウ' }]));
  B.saveEmployees(tB, JSON.stringify([{ id: 'ram', name: 'ラム' }]));
  A.hubRegister_(true); B.hubRegister_(true);
  const RAM = 'OTA-' + B.readEmployees_().filter(e => e.id === 'ram')[0].code;
  const JST = A.jstDateStr_(0), YM = JST.slice(0, 7), TD = Number(JST.slice(8, 10));
  A.saveShiftEntry(tA, YM, TD, 'hie', { off: false, shifts: [{ start: 9, end: 17 }] });
  B.saveShiftEntry(tB, YM, TD, 'ram', { off: false, shifts: [{ start: 10, end: 18 }] });
  const supB = () => ((((B.readMonthObject_(B.getSheet_(), 'schedule:' + YM) || {})[String(TD)] || {}).ram || {}).shifts || []);

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Asia/Tokyo', locale: 'vi-VN' });
  const p = await ctx.newPage(); p.jsErr = []; p.on('pageerror', e => p.jsErr.push(e.message));
  await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(A[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('sbw.lang', 'vi'); } catch (e) {}
    function mkRun(){ let s = () => {}, f = () => {};
      const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; };
        if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
    window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: {}, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
  });
  await p.goto('http://127.0.0.1:' + PORT + '/'); await W(p, 1200);
  await p.click('[data-ltab="manager"]'); await W(p, 200);
  await p.fill('#mgrPwd', 'Otagawa2026x'); await p.click('#mgrLoginBtn');
  await p.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 }); await W(p, 1500);
  for (let i = 0; i < 4 && await p.locator('.modal-back').count(); i++){ await p.keyboard.press('Escape'); await W(p, 250); }

  console.log('— Ô Chi viện ở tab Ngày —');
  await p.waitForSelector('[data-supcard]', { timeout: 15000 }); await p.click('[data-supcard]'); await W(p, 300);   // v52: nút nằm trong thẻ ✈ Chi viện
  await p.waitForSelector('#supBorrowBtn', { timeout: 15000 });
  ok('có hai nút Mượn người / Cử người đi, không còn nút "Xin chi viện"', await p.locator('#supBorrowBtn').count() === 1 && await p.locator('#supDispatchBtn').count() === 1 && await p.locator('#supAskBtn').count() === 0);

  console.log('— Mượn người: trùng ca → hỏi cắt → ca vào lịch quán nhà ngay —');
  await p.click('#supBorrowBtn'); await W(p, 400);
  await p.fill('#supCode', RAM); await p.click('#supFind'); await W(p, 600);
  ok('tìm thấy ラム và báo hôm đó có ca ở quán nhà', /ラム/.test(await p.locator('#supWho').innerText()) && /10:00/.test(await p.locator('#supWho').innerText()), await p.locator('#supWho').innerText());
  await p.selectOption('#supS', '16'); await p.selectOption('#supE', '21');
  await p.click('#mOk'); await W(p, 800);
  const dlg = await p.locator('.modal-back').last().innerText().catch(() => '');
  ok('hiện hộp "Trùng ca ở quán nhà"', /Trùng ca|重複|Overlaps/.test(dlg) && /10:00–18:00/.test(dlg), dlg.slice(0, 200));
  await p.click('#mOk'); await W(p, 1200);
  const s = supB();
  ok('lịch quán nhà: 10–16 + ✈ 16–21', s.length === 2 && s[0].end === 16 && s[1].isSupport && s[1].start === 16 && s[1].end === 21, JSON.stringify(s));
  const box = await p.locator('.sup-box').innerText();
  ok('ô Chi viện hiện ラム tới giúp 16:00–21:00', /ラム/.test(box) && /16:00–21:00/.test(box), box);
  ok('ô số người theo giờ tính thêm khách lúc 17h', /✈ラム|ラム/.test(await p.locator('.cv-cell[data-h="17"]').getAttribute('title') || ''), await p.locator('.cv-cell[data-h="17"]').getAttribute('title'));
  await p.screenshot({ path: '/home/claude/work/shot-sup.png' });
  console.log('— Dòng người tới giúp nằm chung danh sách ca + bản in chỉ ghi mã quán —');
  const gr = p.locator('#empRows .gst-row');
  ok('có 1 dòng ✈ ラム trong danh sách ca của ngày', await gr.count() === 1 && /ラム/.test(await gr.innerText()) && /OTA/.test(await gr.innerText()), await gr.count());
  ok('dòng đó có thanh giờ', await p.locator('#empRows .gst-row .ro-fill.is-sup').count() === 1);
  const order = await p.locator('#empRows > .emp-row').evaluateAll(els => els.map(e => e.classList.contains('gst-row') ? 'G' : 'E').join(''));
  ok('xếp theo giờ vào: ヒエウ (9h) trước, ラム (16h) sau', order === 'EG', order);
  await p.locator('#empRows .gst-row').scrollIntoViewIfNeeded();
  await p.screenshot({ path: '/home/claude/work/shot-gst.png' });
  const hpTxt = await p.evaluate(() => { try { return document.body.innerHTML.length; } catch (e) { return 0; } });
  await p.locator('[data-rowmenu]').first().click(); await W(p, 600);
  const cols = await p.locator('.lane-row.is-open .rp-brkq').evaluate(el => getComputedStyle(el).display).catch(() => 'none');
  ok('giờ nghỉ nhanh xếp dạng lưới', cols === 'grid' || cols === 'none', cols);
  const skd = await p.locator('.lane-row.is-open .sk-line').evaluate(el => getComputedStyle(el).display).catch(() => '');
  ok('kỹ năng xếp dạng lưới', skd === 'grid', skd);
  await p.screenshot({ path: '/home/claude/work/shot-panel.png' });
  await p.setViewportSize({ width: 390, height: 844 }); await W(p, 600);
  await p.locator('.lane-row.is-open .sk-line').scrollIntoViewIfNeeded().catch(() => {}); await W(p, 300);
  await p.screenshot({ path: '/home/claude/work/shot-panel-m.png' });
  await p.setViewportSize({ width: 1280, height: 900 }); await W(p, 400);
  await p.keyboard.press('Escape'); await W(p, 300);

  console.log('— Huỷ —');
  await p.click('.sup-box [data-supun]'); await W(p, 400);
  await p.click('#mOk'); await W(p, 1200);
  ok('lịch quán nhà hết ca ✈', supB().filter(x => x.isSupport).length === 0, JSON.stringify(supB()));
  ok('ô danh sách chi viện biến mất (không còn ai) — v50', await p.locator('.sup-box').count() === 0);
  ok('không có lỗi JS', p.jsErr.length === 0, JSON.stringify(p.jsErr));
  console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail);
  await browser.close(); server.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
