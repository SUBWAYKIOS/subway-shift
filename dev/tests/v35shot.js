// v2026.10.22 — đợt cập nhật lịch ca (giao diện quản lý): 🖨 In tài liệu, bộ đếm lượt dùng, ngôn ngữ bản in, người hay chi viện.
// Chạy: node tests/v32ui.js [Index.html] [Code.gs]
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
const api = require('./gas-mock')({ code: CODE, html: HTML });
const PORT = 9052;
const html = fs.readFileSync(HTML, 'utf8');
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const W = (p, ms) => p.waitForTimeout(ms);

(async () => {
  await new Promise(r => server.listen(PORT, r));
  let tok = api.loginManager('subway1111').token;
  const ch = api.changeManagerPassword(tok, 'subway1111', 'Otagawa2026x');
  tok = (ch && ch.token) || api.loginManager('Otagawa2026x').token;
  api.saveEmployees(tok, JSON.stringify([{ id: 'e1aaaa', name: 'ヒエウ' }, { id: 'e2bbbb', name: 'ラム' }]));
  const JST = api.jstDateStr_(0), YM = JST.slice(0, 7);
  api.setMonthLock(tok, YM, true, '{}', 'all');

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Asia/Tokyo', locale: 'ja-JP' });
  const p = await ctx.newPage(); p.jsErr = []; p.on('pageerror', e => p.jsErr.push(e.message));
  await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(api[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
  await ctx.addInitScript(() => {
    function mkRun(){ let s = () => {}, f = () => {};
      const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; };
        if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
    window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: {}, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
    window.print = () => { window.__printed = (window.__printed || 0) + 1; };
  });
  await p.goto('http://127.0.0.1:' + PORT + '/'); await W(p, 1200);
  await p.click('[data-ltab="manager"]'); await W(p, 200);
  await p.fill('#mgrPwd', 'Otagawa2026x'); await p.click('#mgrLoginBtn');
  await p.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 }); await W(p, 900);
  for (let i = 0; i < 4 && await p.locator('.modal-back').count(); i++){ await p.keyboard.press('Escape'); await W(p, 250); }
  api.saveSettings(tok, JSON.stringify({ wage: 1100, laborPct: 22 }));
  const e1 = api.loginManager ? null : null;
  for (let d = 1; d <= 10; d++) api.saveDayInfo(tok, YM, d, 180000, '');
  const TD = Number(api.jstDateStr_(0).slice(8, 10));
  for (const d of [1,2,3,4,5,6,7,8,9,10,TD]) api.saveShiftEntry(tok, YM, d, 'e1aaaa', { off: false, shifts: [{ start: 10, end: 17, breakStart: 13, breakEnd: 14 }] });
  for (let d = 1; d <= 5; d++) api.saveWishEntry(tok, YM, d, 'e1aaaa', { off: false, shifts: [{ start: 9, end: 15 }] });
  await p.reload(); await W(p, 1200);
  await p.click('[data-ltab="manager"]'); await W(p, 200);
  await p.fill('#mgrPwd', 'Otagawa2026x'); await p.click('#mgrLoginBtn');
  await p.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 }); await W(p, 900);
  for (let i = 0; i < 4 && await p.locator('.modal-back').count(); i++){ await p.keyboard.press('Escape'); await W(p, 250); }
  console.log('seed check', (await p.evaluate(()=>document.querySelectorAll('.lane-row').length)));
  await p.waitForSelector('.cv-cell[data-h]', { timeout: 15000 }); await W(p, 500);
  await p.locator('.cv-cell').nth(4).click(); await W(p, 400);
  console.log('cov popover', await p.locator('.ns-pop.is-cov').count(), (await p.locator('.ns-pop.is-cov').innerText().catch(()=>'')).slice(0,200));
  await p.screenshot({ path: '/home/claude/work/shot-cov.png' });
  await p.keyboard.press('Escape'); await W(p, 200);
  await p.locator('[data-nmstats]').first().click(); await W(p, 700);
  console.log('row open', await p.locator('.lane-row.is-open').count(), 'overview', await p.locator('.rp-overview .nsp-sub').count());
  await p.screenshot({ path: '/home/claude/work/shot-row.png' });
  console.log('jsErr', JSON.stringify(p.jsErr));
  await browser.close(); server.close(); process.exit(0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
