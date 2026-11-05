// v2026.11.04.1 — chi viện: người đi giúp KHÔNG in ở quán nhà, có trong bản in quán được giúp (+ giờ ヘルプ);
// thẻ ✈ Chi viện hiện người khả dụng kèm giờ đã đăng ký. Chạy: node tests/v54ui.js
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
const makeApi = require('./gas-mock'), registry = {}, web = {};
const A = makeApi({ code: CODE, html: HTML, registry, web, ssId: 'ssCentrair', url: 'https://script.google.com/macros/s/centrair/exec' });
const B = makeApi({ code: CODE, html: HTML, registry, web, ssId: 'ssOtagawa', url: 'https://script.google.com/macros/s/otagawa/exec' });
const PORT = 9088, html = fs.readFileSync(HTML, 'utf8');
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const W = (p, ms) => p.waitForTimeout(ms);
(async () => {
  await new Promise(r => server.listen(PORT, r));
  const login = a => { let t = a.loginManager('subway1111').token; a.changeManagerPassword(t, 'subway1111', 'Otagawa2026x'); return a.loginManager('Otagawa2026x').token; };
  const tA = login(A), tB = login(B);
  A.storeCodeSave(tA, 'CEN'); B.storeCodeSave(tB, 'OTA');
  A.saveSettings(tA, JSON.stringify({ hubOn: true, storeName: 'Centrair' }));
  B.__props.hubId = A.__props.hubId;
  B.saveEmployees(tB, JSON.stringify([{ id: 'ram', name: 'ラム', type: 'sa' }, { id: 'tan', name: 'タン', type: 'sa' }, { id: 'mai', name: 'まい', type: 'sa' }]));
  B.saveSettings(tB, JSON.stringify({ hubOn: true, storeName: 'Otagawa', supPool: ['tan'] }));
  A.saveEmployees(tA, JSON.stringify([{ id: 'hie', name: 'ヒエウ', type: 'sa' }]));
  A.hubRegister_(true); B.hubRegister_(true);
  const TODAY = A.jstDateStr_(0), YM = TODAY.slice(0, 7), D = +TODAY.slice(8);
  A.saveShiftEntry(tA, YM, D, 'hie', { off: false, shifts: [{ start: 9, end: 15 }] });
  B.saveShiftEntry(tB, YM, D, 'mai', { off: false, shifts: [{ start: 9, end: 15 }] });
  const s1 = B.supSend(tB, JSON.stringify({ empId: 'ram', store: 'CEN', date: TODAY, start: 10, end: 16 }));
  B.saveWishEntry(tB, YM, D, 'tan', { off: false, shifts: [{ start: 11, end: 17 }] });
  B.hubPublish_(YM, true);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  async function open(api){
    const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1, timezoneId: 'Asia/Tokyo', locale: 'ja-JP' });
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(api[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
    await ctx.addInitScript(() => {
      function mkRun(){ let s = () => {}, f = () => {}; const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; }; if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
      window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: { lang: 'ja' }, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
    });
    await p.goto('http://127.0.0.1:' + PORT + '/'); await W(p, 1300);
    await p.click('[data-ltab="manager"]'); await W(p, 200); await p.fill('#mgrPwd', 'Otagawa2026x'); await p.click('#mgrLoginBtn');
    await p.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 }); await W(p, 2500);
    for (let i = 0; i < 4 && await p.locator('.modal-back').count(); i++){ await p.keyboard.press('Escape'); await W(p, 250); }
    return p;
  }
  async function printDay(p){
    await p.evaluate(() => document.querySelector('[data-mtab="month"]').click()); await W(p, 1200);
    await p.click(D <= 15 ? '#hpFirstBtn' : '#hpSecondBtn'); await W(p, 1500);
    const r = await p.evaluate(d => { const f = document.querySelector('.pv-frame'); const doc = f && f.contentDocument; if (!doc) return null;
      const blk = [...doc.querySelectorAll('.pub-day')].find(x => { const b = x.querySelector('.hd-date b'); return b && +b.textContent === d; });
      return { day: blk ? blk.innerText : '', all: doc.body.innerText }; }, D);
    await p.keyboard.press('Escape'); await W(p, 400);
    return r || { day: '', all: '' };
  }
  console.log('— Quán nhà (Otagawa) —');
  ok('cử ラム sang Centrair hôm nay', s1 && s1.ok, JSON.stringify(s1).slice(0, 200));
  const pB = await open(B);
  const prB = await printDay(pB);
  ok('bản in ngày ' + D + ' của quán nhà KHÔNG có ラム (đang đi giúp)', /まい/.test(prB.day) && !/ラム/.test(prB.day), prB.day.slice(0, 300));
  ok('bảng tổng (cuối bản in) vẫn có ラム ở cột ✈ヘルプ — giờ công tháng ở quán nhà', /ラム/.test(prB.all) && /✈/.test(prB.all));
  console.log('— Quán được giúp (Centrair) —');
  const pA = await open(A);
  const cand = await pA.evaluate(() => (document.querySelector('#candSup') || {}).innerText || '');
  ok('thẻ ✈ Chi viện: タン hiện kèm giờ đã đăng ký 11:00–17:00 + mã quán', /タン/.test(cand) && /11:00[–-]17:00/.test(cand) && /OTA/.test(cand), cand);
  const prA = await printDay(pA);
  ok('bản in ngày ' + D + ' của quán được giúp CÓ ラム (H) và giờ ヘルプ', /ラム/.test(prA.day) && /ヘルプ/.test(prA.day), prA.day.slice(0, 400));
  ok('không lỗi JS', !pA.errs.length && !pB.errs.length, pA.errs.concat(pB.errs).join(' | '));
  await browser.close(); server.close();
  console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('HARNESS', e); process.exit(2); });
