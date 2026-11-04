// v52 — mở app nhanh (gửi bootstrap sớm), chủ đề Liquid Glass, Cài đặt dạng danh sách.
// Chạy: node tools/build.mjs && node test/v52.js
const fs = require('fs'), path = require('path'), http = require('http');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const ROOT = path.resolve(__dirname, '..'), SITE = path.join(ROOT, '_site');
const mk = require('./gas-mock');
const FOR = mk({ code: path.join(ROOT, 'apps-script/Code.gs'), html: path.join(ROOT, 'src/Index.html') });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const W = (p, ms) => p.waitForTimeout(ms);
const SITE_PORT = 9141, API_PORT = 9142;
let log = [];
const api = http.createServer((q, r) => { let b = ''; q.on('data', c => b += c); q.on('end', () => {
  r.setHeader('Access-Control-Allow-Origin', '*');
  if (q.method !== 'POST'){ r.writeHead(404); return r.end(); }
  try { const o = JSON.parse(b); log.push({ fn: o.fn, args: o.args, at: Date.now() }); } catch (e){}
  const out = FOR.doPost({ postData: { contents: b } }).getContent();
  setTimeout(() => { r.writeHead(200, { 'Content-Type': 'application/json' }); r.end(out); }, 150);
}); });
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const site = http.createServer((q, r) => {
  const u = new URL(q.url, 'http://x'); const f = path.join(SITE, decodeURIComponent(u.pathname));
  if (u.pathname === '/config.js'){ r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(`window.SBW_STORES=[{code:"FOR",name:"SUBWAY 太田川",url:"http://127.0.0.1:${API_PORT}/for/exec"}];`); }
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()){ r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
(async () => {
  await new Promise(r => api.listen(API_PORT, r)); await new Promise(r => site.listen(SITE_PORT, r));
  let t = FOR.loginManager('subway1111').token; t = FOR.changeManagerPassword(t, 'subway1111', 'Otagawa2026x').token;
  FOR.saveEmployees(t, JSON.stringify([{ id: 'e1aaaa', name: 'ヒエウ' }, { id: 'e2bbbb', name: 'ラム' }]));
  const cc = FOR.issueClaimCode(t, 'e1aaaa'); const st = FOR.claimEmployee('e1aaaa', '284619', true, 'iPhone', cc.code);
  const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', browser = await pw.chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
  const B = 'http://127.0.0.1:' + SITE_PORT + '/app.html?s=FOR&lang=vi';
  async function open(init){
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tokyo', locale: 'vi-VN' });
    await ctx.addInitScript(init.fn, init.arg);
    const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', e => p.__errs.push(e.message));
    log = []; const t0 = Date.now(); await p.goto(B); p.__t0 = t0; return p;
  }

  console.log('— Gửi bootstrap sớm (nhân viên đã ghi nhớ) —');
  const s = await open({ fn: dk => { try { localStorage.setItem('q:FOR:sbw.dk', dk); } catch (e){} }, arg: st.dk });
  await s.waitForFunction(() => !!document.querySelector('[data-stab]'), null, { timeout: 20000 }); await W(s, 800);
  const boots = log.filter(x => x.fn === 'bootstrap');
  ok('chỉ gọi bootstrap MỘT lần (dùng lại kết quả gửi sớm)', boots.length === 1, JSON.stringify(log.map(x => x.fn)));
  ok('bootstrap mang khoá máy + tháng hiện tại', boots[0] && boots[0].args[0] === st.dk && /^\d{4}-\d{2}$/.test(boots[0].args[1] || ''), JSON.stringify(boots[0] && boots[0].args));
  ok('bootstrap là lệnh gọi ĐẦU TIÊN', log[0] && log[0].fn === 'bootstrap');
  ok('vào thẳng màn nhân viên', await s.locator('[data-stab]').count() > 0);
  ok('getPresets không gọi trùng', log.filter(x => x.fn === 'getPresets').length <= 1, JSON.stringify(log.map(x => x.fn)));
  ok('không lỗi trang', !s.__errs.length, s.__errs.join(' | '));

  console.log('— Máy chưa đăng nhập —');
  const l = await open({ fn: () => {}, arg: null });
  await l.waitForFunction(() => !!document.querySelector('[data-ltab]'), null, { timeout: 20000 }); await W(l, 500);
  ok('màn đăng nhập hiện, bootstrap gọi một lần', log.filter(x => x.fn === 'bootstrap').length === 1, JSON.stringify(log.map(x => x.fn)));
  ok('bootstrap không khoá (null,null,null)', JSON.stringify(log[0] && log[0].args) === '[null,null,null]', JSON.stringify(log[0] && log[0].args));

  console.log('— Chủ đề Liquid Glass —');
  const g = await open({ fn: () => { try { localStorage.setItem('q:FOR:sbw.skin', 'glass'); } catch (e){} window.__LAUNCHER_ON = 1; }, arg: null });
  await g.waitForFunction(() => !!document.querySelector('[data-ltab]'), null, { timeout: 20000 }); await W(g, 400);
  ok('html[data-skin=glass]', await g.evaluate(() => document.documentElement.getAttribute('data-skin')) === 'glass');
  ok('nền loang màu', /radial-gradient/.test(await g.evaluate(() => getComputedStyle(document.body).backgroundImage)));
  await g.click('[data-ltab="manager"]'); await W(g, 200);
  await g.fill('#mgrPwd', 'Otagawa2026x'); await g.click('#mgrLoginBtn');
  await g.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 }); await W(g, 800);
  const tb = await g.evaluate(() => { const e = document.querySelector('.tab-bar'); const c = getComputedStyle(e); return { bf: c.backdropFilter || c.webkitBackdropFilter, r: c.borderTopLeftRadius, pos: c.position }; });
  ok('thanh tab là viên kính nổi (blur + bo tròn)', /blur/.test(tb.bf) && parseFloat(tb.r) >= 24, JSON.stringify(tb));
  const tk = await g.evaluate(() => { const e = document.querySelector('.ticket'); return getComputedStyle(e).backgroundColor + ' ' + getComputedStyle(e).backgroundImage; });
  ok('thẻ trong mờ', /rgba\(255, 255, 255, 0\.\d+\)/.test(tk) || /linear-gradient/.test(tk), tk);
  await g.evaluate(() => document.getElementById('goSettingsBtn').click()); await W(g, 700);
  const rows = await g.evaluate(() => [...document.querySelectorAll('.set-list .app-ic')].map(b => ({ t: (b.querySelector('.sl-t b') || {}).textContent, s: (b.querySelector('.sl-t small') || {}).textContent })));
  ok('Cài đặt dạng danh sách: 4 hàng', rows.length === 4, JSON.stringify(rows));
  ok('mỗi hàng có tên + mô tả', rows.every(r => r.t && r.s), JSON.stringify(rows));
  await g.click('.set-list .app-ic >> nth=2'); await W(g, 600);
  ok('bấm hàng → mở app con', await g.evaluate(() => document.documentElement.classList.contains('app-open') || !!document.querySelector('.app-ov')));
  ok('không lỗi trang', !g.__errs.length, g.__errs.join(' | '));

  console.log('— Máy chủ nhận chủ đề glass —');
  const cur = JSON.parse(JSON.stringify(FOR.readSettings_()));
  cur.skin = 'glass'; FOR.saveSettings(t, JSON.stringify(cur));
  ok('readSettings_ giữ skin=glass', FOR.readSettings_().skin === 'glass');
  cur.skin = 'xyz'; FOR.saveSettings(t, JSON.stringify(cur));
  ok('skin lạ → modern', FOR.readSettings_().skin === 'modern');

  await browser.close(); api.close(); site.close();
  console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(2); });
