// v2026.11.06.1 — chụp từng động tác của nhân vật (cận cảnh, 3 khoảnh khắc) → tests/shots-v57/acts.png để soát tư thế.
// Chạy: node tests/v57act.js [Index.html] [Code.gs]
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
const SHOT = path.join(DIR, 'shots-v57'); fs.mkdirSync(SHOT, { recursive: true });
const ONLY = process.env.ACTS ? process.env.ACTS.split(',') : null;
const makeApi = require('./gas-mock');
const A = makeApi({ code: CODE, html: HTML, registry: {}, web: {}, ssId: 'ssOtagawa', url: 'https://script.google.com/macros/s/otagawa/exec' });
const PORT = 9163, html = fs.readFileSync(HTML, 'utf8');
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
(async () => {
  await new Promise(r => server.listen(PORT, r));
  let t = A.loginManager('subway1111').token; A.changeManagerPassword(t, 'subway1111', 'Otagawa2026x'); t = A.loginManager('Otagawa2026x').token;
  A.saveSettings(t, JSON.stringify({ storeName: 'SUBWAY フォレストモール東海太田川店' }));
  A.saveEmployees(t, JSON.stringify([{ id: 'e1aaaa', name: 'ヒエウ' }]));
  A.saveAvatar(t, JSON.stringify({ hs: 8, hc: 4, ac: 0, of: 1, oc: 2 }));
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 1, timezoneId: 'Asia/Tokyo', locale: 'ja-JP' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(A[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('sbw.lang', 'vi'); } catch (e){}
    function mkRun(){ let s = () => {}, f = () => {}; const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; }; if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
    window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: { lang: 'vi' }, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
  });
  await p.goto('http://127.0.0.1:' + PORT + '/'); await p.waitForTimeout(1200);
  await p.click('[data-ltab="manager"]'); await p.fill('#mgrPwd', 'Otagawa2026x'); await p.click('#mgrLoginBtn');
  await p.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 }); await p.waitForTimeout(1200);
  for (let i = 0; i < 4 && await p.locator('.modal-back').count(); i++){ await p.keyboard.press('Escape'); await p.waitForTimeout(250); }
  await p.evaluate(() => document.querySelector('[data-mtab="office"]').click());
  await p.waitForFunction(() => window.__ofcSc && window.__ofcSc() && window.__ofcSc().ents && Object.keys(window.__ofcSc().ents).length, null, { timeout: 30000 });
  await p.waitForTimeout(2500);
  const acts = await p.evaluate(() => { const b = [...document.querySelectorAll('[data-ofcact]')].map(x => x.getAttribute('data-ofcact')); return b; });
  const list = ONLY || acts;
  const tiles = [];
  for (const a of list){
    for (const [k, dt] of [[0, 0.35], [1, 1.1], [2, 2.0]]){
      const box = await p.evaluate(([a, dt]) => {
        const sc = window.__ofcSc(), me = Object.values(sc.ents).find(e => e.self) || Object.values(sc.ents)[0], L = sc.L;
        const sp = L.visit[1]; me.x = sp[0]; me.y = sp[1]; me.yaw = me.ty = Math.PI - 0.6; me.spot = { i: 'tst', x: sp[0], y: sp[1], yaw: Math.PI - 0.6 }; me.goal = null;
        const X = (me.x - L.W / 2) / 100, Z = (me.y - L.H / 2) / 100;
        document.querySelectorAll('.ofc-utag').forEach(x => x.style.visibility = 'hidden');
        me.path = []; me.mode = me.mode === 'walk' ? 'stand' : me.mode; me.free = false; me.leaving = false;
        const t = (performance.now() - sc.t0) / 1000;
        if (me.act !== a){ me.act = a; me.actT = t - dt; } me.actEnd = 0; me.pendAct = null;
        sc.camT.tx = X; sc.camT.tz = Z; sc.camT.dist = 5.2; sc.camT.pitch = 0.3; sc.camT.yaw = 0;
        sc.cam.tx = X; sc.cam.tz = Z; sc.cam.dist = 5.2; sc.cam.pitch = 0.3; sc.cam.yaw = sc.camT.yaw;
        return { me: me.id, mode: me.mode };
      }, [a, dt]);
      await p.waitForTimeout(k === 0 ? 900 : 450);
      const clip = await p.evaluate(() => { const sc = window.__ofcSc(), me = Object.values(sc.ents).find(e => e.self) || Object.values(sc.ents)[0], L = sc.L, cv = sc.canvas.getBoundingClientRect();
        const pt = sc.R.project((me.x - L.W / 2) / 100, 0.75, (me.y - L.H / 2) / 100, cv.width, cv.height); document.querySelectorAll('.ofc-tag,.ofc-bub').forEach(x => x.style.visibility = 'hidden'); return pt ? { x: cv.left + pt[0], y: cv.top + pt[1] } : null; });
      if (!clip) continue;
      const f = path.join(SHOT, 'act-' + a + '-' + k + '.png');
      await p.screenshot({ path: f, clip: { x: Math.max(0, clip.x - 110), y: Math.max(0, clip.y - 170), width: 220, height: 260 } });
      tiles.push({ a, k, f });
    }
  }
  // ngồi: tự đi tới ghế trống
  let sitOk = null;
  if (!ONLY){
    await p.evaluate(() => { const sc = window.__ofcSc(), me = Object.values(sc.ents).find(e => e.self); me.act = ''; me.x = sc.L.visit[0][0]; me.y = sc.L.visit[0][1]; });
    await p.click('[data-ofcact="sit"]');
    for (let i = 0; i < 40 && !sitOk; i++){ await p.waitForTimeout(500);
      sitOk = await p.evaluate(() => { const sc = window.__ofcSc(), me = Object.values(sc.ents).find(e => e.self), L = sc.L; const all = (L._seats || []).concat(L._cseats || []);
        return me.act === 'sit' && all.some(s => Math.hypot(s[0] - me.x, s[1] - me.y) < 2) ? { x: me.x, y: me.y } : null; }); }
    if (sitOk){ await p.evaluate(() => { const sc = window.__ofcSc(), me = Object.values(sc.ents).find(e => e.self), L = sc.L; const X = (me.x - L.W / 2) / 100, Z = (me.y - L.H / 2) / 100;
      Object.assign(sc.camT, { tx: X, tz: Z, dist: 5, pitch: 0.45, yaw: me.yaw + Math.PI + 0.5 }); Object.assign(sc.cam, { tx: X, tz: Z, dist: 5, pitch: 0.45, yaw: me.yaw + Math.PI + 0.5 }); });
      await p.waitForTimeout(1200); await p.screenshot({ path: path.join(SHOT, 'sit-seat.png') }); }
    console.log(sitOk ? '  ✅ ngồi: tự đi tới ghế ' + JSON.stringify(sitOk) : '  ❌ ngồi: không tới được ghế');
  }
  // ghép thành một tấm
  const cols = 6, sheet = await ctx.newPage(); await sheet.setViewportSize({ width: cols * 222, height: 200 });
  const imgs = tiles.map(x => '<figure><img src="data:image/png;base64,' + fs.readFileSync(x.f).toString('base64') + '"><figcaption>' + x.a + ' · ' + x.k + '</figcaption></figure>').join('');
  await sheet.setContent('<style>body{margin:0;display:flex;flex-wrap:wrap;width:' + (cols * 222) + 'px;font:12px sans-serif;background:#fff}figure{margin:1px;width:220px}img{display:block}figcaption{text-align:center}</style>' + imgs);
  await sheet.screenshot({ path: path.join(SHOT, 'acts.png'), fullPage: true });
  tiles.forEach(x => fs.unlinkSync(x.f));
  console.log('acts:', list.length, 'ảnh:', tiles.length, 'lỗi JS:', errs.length ? errs.join(' | ') : 0);
  await browser.close(); server.close(); process.exit(errs.length || (!ONLY && !sitOk) ? 1 : 0);
})().catch(e => { console.log('HARNESS', e); process.exit(2); });
