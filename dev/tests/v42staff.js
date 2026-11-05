// v2026.10.24.1 — giao diện nhân viên: bỏ thẻ tem, 💌 một dòng, bỏ "Xin chào", tab Đăng ký mở tháng đang thu đăng ký.
// Chạy: node tests/v42staff.js   → ảnh ở tests/sh/v42-*.png
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(__dirname, 'sh');
fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const HTML = process.env.HTML || path.join(ROOT, 'Index.html');
const api = require(ROOT + '/tests/gas-mock')({ code: path.join(ROOT, 'Code.gs'), html: HTML });
let html = fs.readFileSync(HTML, 'utf8');
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
const W = (p, ms) => p.waitForTimeout(ms);
(async () => {
  await new Promise(r => server.listen(9092, r));
  let tok = api.loginManager('subway1111').token; tok = api.changeManagerPassword(tok, 'subway1111', 'Otagawa2026x').token;
  const E = [['e1aaaa','ヒエウ'],['e2bbbb','ラム'],['e3cccc','まい'],['e4dddd','タン'],['e5eeee','ゆうき']];
  api.saveEmployees(tok, JSON.stringify(E.map(x => ({ id: x[0], name: x[1] }))));
  api.saveSettings(tok, JSON.stringify(Object.assign({}, api.readSettings_(), { storeName: 'SUBWAY 太田川' })));
  const JST = api.jstDateStr_(0), YM = JST.slice(0, 7), D = +JST.slice(8, 10), n = new Date(+YM.slice(0,4), +YM.slice(5,7), 0).getDate();
  for (let d = 1; d <= n; d++) E.forEach((e, i) => { if ((d + i) % 3 === 0) return; api.saveShiftEntry(tok, YM, d, e[0], { off: false, shifts: [{ start: 9 + i, end: 15 + i, breakStart: i % 2 ? 12 + i : null, breakEnd: i % 2 ? 13 + i : null }] }); });
  api.saveShiftEntry(tok, YM, D, 'e2bbbb', { off: false, shifts: [{ start: 10, end: 17, breakStart: 13, breakEnd: 14 }] });
  api.saveDayInfo(tok, YM, D, 250000, '本日は棚卸し。ドレッシング補充お願いします');
  api.setMonthLock(tok, YM, true, '{}', 'all');
  const NY = api.ymShift_(YM, 1);
  for (let d = 1; d <= 10; d++) api.saveWishEntry(tok, NY, d, 'e2bbbb', d % 4 ? { off: false, shifts: [{ start: 10, end: 16 }] } : { off: true });
  const cc = api.issueClaimCode(tok, 'e2bbbb'); api.claimEmployee('e2bbbb', '284619', false, 'x', cc.code);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tokyo', locale: 'vi-VN', deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(api[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
  await ctx.addInitScript(() => {
    function mkRun(){ let s = () => {}, f = () => {};
      const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; };
        if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
    window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: { lang: 'vi' }, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
  });
  await p.goto('http://127.0.0.1:9092/'); await W(p, 1300);
  await p.click('[data-ltab="staff"]').catch(() => {}); await W(p, 200);
  await p.click('[data-who="e2bbbb"]'); await W(p, 300);
  await p.fill('#pin1', '284619'); await p.click('#authOk');
  await p.waitForFunction(() => !!document.querySelector('[data-stab]'), null, { timeout: 20000 }); await W(p, 1500);
  for (let i = 0; i < 4 && await p.locator('.modal-back').count(); i++){ await p.keyboard.press('Escape'); await W(p, 300); }
  const shot = async (name) => { for (let i = 0; i < 3 && await p.locator('.modal-back').count(); i++){ await p.keyboard.press('Escape'); await W(p, 300); }
    await p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }); };
  await shot('v42-today');
  ok('không còn Thẻ tem', await p.locator('#stpBtn').count() === 0 && !/Tem thứ/.test(await p.evaluate(() => document.body.innerText)));
  ok('💌 Cảm ơn thành một dòng', await p.locator('#thxBtn.is-row').count() === 1);
  ok('bỏ dòng "Xin chào" của nhân viên', await p.locator('.st-hello').count() === 0);
  await p.click('[data-stab="shifts"]'); await W(p, 900); await shot('v42-shifts');
  await p.click('[data-stab="wish"]'); await W(p, 1500);
  const NYM = api.ymShift_(YM, 1);
  ok('tháng này đã chốt → tab Đăng ký mở tháng sau', /Tháng (\d+)/.exec(await p.evaluate(() => document.querySelector('.month-nav .label').innerText))[1] == +NYM.slice(5, 7));
  ok('tháng nháp chưa xếp: không có cột "Xếp"', await p.locator('#myList .ul-shift').count() === 0 && await p.locator('#myList .ul-row').count() > 0);
  await shot('v42-wish-next');
  await p.click('#prevMonth'); await W(p, 1500);
  ok('quay lại tháng đã chốt → chỉ 1 thẻ ngắn', await p.locator('.st-locked-card').count() === 1 && await p.locator('#myList').count() === 0);
  await shot('v42-wish-locked');
  await p.click('#stGoNextReg'); await W(p, 1500);
  ok('nút "Đăng ký tháng sau" chuyển tháng', /Tháng (\d+)/.exec(await p.evaluate(() => document.querySelector('.month-nav .label').innerText))[1] == +NYM.slice(5, 7));
  ok('không lỗi JS', !errs.length, errs.join(' | '));
  await browser.close(); server.close();
  console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });
