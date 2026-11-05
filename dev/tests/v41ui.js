// v2026.10.23.5 — giao diện: ô mã đăng ký khi tạo mã lần đầu, hộp "Cấp mã đăng ký", cột "Cao nhất 7 ngày", khoá tick ✈ ca ext.
// Chạy: node tests/v41ui.js [Index.html] [Code.gs]   → ảnh ở tests/sh/v41-*.png
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
const api = require('./gas-mock')({ code: CODE, html: HTML });
const PORT = 9071;
let html = fs.readFileSync(HTML, 'utf8');
html = html.replace('function uiDialog(o', 'window.__T={s:function(){return state},week:weekTotalsHTML,claim:showClaimCode,load:loadMonthData,ym:function(){return yearMonthStr(state.year,state.month)}};function uiDialog(o');
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const W = (p, ms) => p.waitForTimeout(ms);
fs.mkdirSync(path.join(DIR, 'sh'), { recursive: true });

(async () => {
  await new Promise(r => server.listen(PORT, r));
  let tok = api.loginManager('subway1111').token;
  tok = api.changeManagerPassword(tok, 'subway1111', 'Otagawa2026x').token;
  const E1 = 'e1aaaa', E2 = 'e2bbbb';
  api.saveEmployees(tok, JSON.stringify([{ id: E1, name: 'ヒエウ', maxWeek: 28 }, { id: E2, name: 'ラム', win: [null, null, null, [10, 18], null, null, null, null] }]));
  const JST = api.jstDateStr_(0), YM = JST.slice(0, 7);
  const PY = api.ymShift_(YM, -1), pn = new Date(Date.UTC(+PY.slice(0, 4), +PY.slice(5, 7), 0)).getUTCDate();
  for (let d = pn - 3; d <= pn; d++) api.saveShiftEntry(tok, PY, d, E1, { off: false, shifts: [{ start: 10, end: 15 }] });
  for (let d = 1; d <= 3; d++) api.saveShiftEntry(tok, YM, d, E1, { off: false, shifts: [{ start: 10, end: 15 }] });

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  async function open(w, h, slow){
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, timezoneId: 'America/Los_Angeles', locale: 'vi-VN' });
    const p = await ctx.newPage(); p.jsErr = []; p.on('pageerror', e => p.jsErr.push(e.message));
    await ctx.exposeFunction('__callServer', async (fn, a) => {
      if (slow && fn === 'loadMonth' && slow[a[1]]) await new Promise(r => setTimeout(r, slow[a[1]]));
      try { return { ok: true, v: JSON.parse(JSON.stringify(api[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
    await ctx.addInitScript(() => {
      function mkRun(){ let s = () => {}, f = () => {};
        const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; };
          if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
      window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: { lang: 'vi' }, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
    });
    await p.goto('http://127.0.0.1:' + PORT + '/'); await W(p, 1300);
    return p;
  }

  console.log('— Màn đăng nhập: tạo mã lần đầu cần mã đăng ký —');
  const s = await open(390, 844);
  ok('?lang=vi qua google.script.url → tiếng Việt', await s.evaluate(() => window.__T.s().lang) === 'vi');
  await s.click('[data-ltab="staff"]').catch(() => {}); await W(s, 200);
  await s.click('[data-who="' + E2 + '"]'); await W(s, 400);
  ok('ô "Mã đăng ký" hiện', await s.locator('#pin0').isVisible());
  await s.click('#authOk'); await W(s, 300);
  ok('bỏ trống → nhắc nhập mã đăng ký', /mã đăng ký/i.test(await s.locator('#loginErr').innerText()));
  await s.screenshot({ path: path.join(DIR, 'sh', 'v41-claim-login.png') });
  const code = api.issueClaimCode(tok, E2).code;
  await s.fill('#pin0', code); await s.fill('#pin1', '284619'); await s.fill('#pin2', '284619');
  await s.click('#authOk');
  await s.waitForFunction(() => !!document.querySelector('[data-stab]'), null, { timeout: 20000 }).catch(() => {});
  ok('nhập đúng mã đăng ký → vào app nhân viên', await s.locator('[data-stab]').count() > 0);

  console.log('— Quản lý: hộp mã đăng ký · cột 7 ngày · tháng tải muộn không đè —');
  const slow = {};
  const m = await open(1280, 900, slow);
  await m.click('[data-ltab="manager"]'); await W(m, 200);
  await m.fill('#mgrPwd', 'Otagawa2026x'); await m.click('#mgrLoginBtn');
  await m.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 }); await W(m, 900);
  await m.evaluate(() => { window.__T.claim('e1aaaa', { code: '482913', until: Date.now() + 14 * 86400000 }); });
  await W(m, 400);
  const dlg = await m.locator('.modal-box').last().innerText();
  ok('hộp hiện mã to "482 913"', /482 913/.test(dlg), dlg);
  await m.locator('.modal-box').last().screenshot({ path: path.join(DIR, 'sh', 'v41-claim-dialog.png') });
  await m.keyboard.press('Escape'); await W(m, 300);

  const wk = await m.evaluate(() => { const d = document.createElement('div'); d.id = 'wkShot'; d.className = 'ticket'; d.style.cssText = 'position:fixed;left:10px;top:10px;z-index:99999;background:#fff;max-width:900px'; d.innerHTML = window.__T.week(); document.body.appendChild(d); return d.innerText; });
  ok('bảng tuần có cột "Cao nhất 7 ngày"', /Cao nhất 7 ngày/.test(wk), wk.slice(0, 200));
  const over = await m.evaluate(() => { const r = [...document.querySelectorAll('#wkShot tr')].find(x => /ヒエウ/.test(x.innerText)); const c = r && r.querySelectorAll('td.wk-cap')[0]; return c ? { t: c.innerText, over: c.classList.contains('wk-over') } : null; });
  ok('ヒエウ: 7 ngày qua mép tháng = 35h, tô đỏ (trần 28h)', over && over.t === '35' && over.over, JSON.stringify(over));
  await m.locator('#wkShot').screenshot({ path: path.join(DIR, 'sh', 'v41-week-roll.png') });
  await m.evaluate(() => document.getElementById('wkShot').remove());

  // Tháng tải muộn: hỏi tháng A (chậm 1,5s) rồi chuyển sang tháng B → trả lời của A không được đè B.
  const ymA = await m.evaluate(() => window.__T.ym());
  const NX = api.ymShift_(ymA, 1);
  api.saveShiftEntry(tok, NX, 5, E2, { off: false, shifts: [{ start: 9, end: 12 }] });
  slow[ymA] = 1500;
  await m.evaluate(() => { window.__T.load(); });
  await W(m, 100);
  await m.evaluate(() => { const s = window.__T.s(); if (s.month === 12){ s.month = 1; s.year++; } else s.month++; return window.__T.load(); });
  await W(m, 2000);
  const after = await m.evaluate(() => { const s = window.__T.s(); return { ym: window.__T.ym(), d5: !!(s.schedule[5] && s.schedule[5]['e2bbbb']) }; });
  ok('đang xem tháng sau và giữ đúng dữ liệu tháng sau', after.ym === NX && after.d5, JSON.stringify(after));
  const vw = await m.evaluate(() => { const st = window.__T.s(), n = new Date(st.year, st.month, 0).getDate(); for (let d = 1; d <= n; d++){ if (new Date(st.year, st.month - 1, d).getDay() === 3){ const w = st.wish[d] && st.wish[d]['e2bbbb']; return w ? { a: w.shifts[0].start, b: w.shifts[0].end, auto: w.auto } : null; } } return null; });
  ok('quản lý thấy giờ cố định của ラム (thứ Tư 10–18) như đăng ký', vw && vw.a === 10 && vw.b === 18 && vw.auto === 1, JSON.stringify(vw));
  ok('không lỗi JS', !s.jsErr.length && !m.jsErr.length, s.jsErr.concat(m.jsErr).join(' | '));

  await browser.close(); server.close();
  console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('HARNESS', e); process.exit(2); });
