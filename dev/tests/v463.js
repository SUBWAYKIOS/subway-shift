// v2026.10.26.4 — thanh tab nhân viên không nhảy · chạm ngày ở "Lịch của tôi" → bảng thanh giờ cả nhóm.
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
const api = require('./gas-mock')({ code: CODE, html: HTML });
const PORT = 9076, html = fs.readFileSync(HTML, 'utf8');
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const W = (p, ms) => p.waitForTimeout(ms);
(async () => {
  await new Promise(r => server.listen(PORT, r));
  let tok = api.loginManager('subway1111').token; tok = api.changeManagerPassword(tok, 'subway1111', 'Otagawa2026x').token;
  const names = 'ヒエウ ラム まい タン ゆき'.split(' ');
  api.saveEmployees(tok, JSON.stringify(names.map((n, i) => ({ id: 'e' + i + 'aaaa', name: n }))));
  const YM = api.jstDateStr_(0).slice(0, 7), N = new Date(+YM.slice(0, 4), +YM.slice(5, 7), 0).getDate();
  for (let d = 1; d <= N; d++) names.forEach((n, i) => { if ((d + i) % 2) api.saveShiftEntry(tok, YM, d, 'e' + i + 'aaaa', { off: false, shifts: [{ start: 8 + i, end: 14 + i }] }); });
  for (let d = 1; d <= N; d++) api.saveShiftEntry(tok, YM, d, 'e1aaaa', { off: false, shifts: [{ start: 10, end: 16 }] });
  const cc = api.issueClaimCode(tok, 'e1aaaa'); const st = api.claimEmployee('e1aaaa', '284619', true, 'iPhone', cc.code);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Asia/Tokyo', locale: 'vi-VN' });
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(api[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
  await ctx.addInitScript(dk => {
    function mkRun(){ let s = () => {}, f = () => {};
      const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; };
        if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
    window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: { lang: 'vi' }, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
    try { localStorage.setItem('sbw.dk', dk); } catch (e){}
  }, st.dk);
  await p.goto('http://127.0.0.1:' + PORT + '/'); await W(p, 2500);
  for (let i = 0; i < 4 && await p.locator('.modal-back').count(); i++){ await p.keyboard.press('Escape'); await W(p, 250); }
  // đo vị trí thanh tab NGAY TRONG lúc chuyển tab (hiệu ứng vào trang) và khi đang cuộn
  const samples = await p.evaluate(async () => {
    const out = [], vh = window.innerHeight;
    const take = () => { const b = document.querySelector('.tab-bar'); if (b){ const r = b.getBoundingClientRect(); out.push(Math.round(vh - r.bottom)); } };
    for (const tab of ['shifts', 'wish', 'today', 'shifts']){
      document.querySelector('[data-stab="' + tab + '"]').click();
      for (let i = 0; i < 12; i++){ take(); await new Promise(r => requestAnimationFrame(r)); }
      window.scrollTo(0, 400); take(); await new Promise(r => setTimeout(r, 30)); take(); window.scrollTo(0, 0);
    }
    return out;
  });
  ok('thanh tab luôn dính đáy màn hình khi chuyển tab + cuộn (' + samples.length + ' lần đo)', samples.every(x => Math.abs(x) <= 1), JSON.stringify([...new Set(samples)]));
  // chạm ngày
  await p.evaluate(() => document.querySelector('[data-stab="shifts"]').click()); await W(p, 600);
  const cell = p.locator('[data-sday="5"]');
  await cell.click(); await W(p, 500);
  const sh = await p.evaluate(() => { const s = document.querySelector('.sd-sheet'); return s ? { t: s.innerText, rows: s.querySelectorAll('.tm-row:not(.tm-axis)').length, me: !!s.querySelector('.tm-row.is-me') } : null; });
  ok('chạm ngày 5 → bảng trượt lên: tiêu đề ngày 5, thanh giờ cả nhóm, mình tô nổi', sh && /Ngày 5/.test(sh.t) && sh.rows >= 3 && sh.me, JSON.stringify(sh));
  await p.screenshot({ path: path.join(DIR, 'sh', 'v463-day-sheet.png') });
  await p.click('[data-sdnav="1"]'); await W(p, 300);
  ok('› sang ngày 6', /Ngày 6/.test(await p.locator('.sd-sheet').innerText()));
  await p.click('[data-sdclose]'); await W(p, 500);
  ok('✕ đóng bảng, khung ngày bên dưới theo ngày 6', !(await p.locator('.sd-back').count()) && /Ngày 6/.test(await p.locator('.st-day h3').innerText()));
  await p.evaluate(() => { state && 0; }).catch(() => {});
  await p.evaluate(() => document.querySelector('[data-szoom="week"]').click()); await W(p, 500);
  await p.locator('.sw-row[data-sday]').first().click(); await W(p, 400);
  ok('dạng Tuần: chạm một dòng → cũng hiện bảng ngày', await p.locator('.sd-sheet').count() === 1);
  await p.keyboard.press('Escape'); await W(p, 300);
  ok('Esc đóng bảng', !(await p.locator('.sd-back').count()));
  ok('không lỗi JS', !p.errs.length, p.errs.join(' | '));
  await browser.close(); server.close();
  console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('HARNESS', e); process.exit(2); });
