// Chạy bản GitHub (_site) trong Chromium, máy chủ Apps Script giả lập ở cổng khác (khác nguồn gốc, có CORS như Google).
// Chạy: node tools/build.mjs && node test/e2e.js
const fs = require('fs'), path = require('path'), http = require('http');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const ROOT = path.resolve(__dirname, '..'), SITE = path.join(ROOT, '_site');
const mk = require('./gas-mock');
const FOR = mk({ code: path.join(ROOT, 'apps-script/Code.gs'), html: path.join(ROOT, 'src/Index.html') });
const CTR = mk({ code: path.join(ROOT, 'apps-script/Code.gs'), html: path.join(ROOT, 'src/Index.html') });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const W = (p, ms) => p.waitForTimeout(ms);
const SITE_PORT = 9111, API_PORT = 9112;
let calls = 0;
const api = http.createServer((q, r) => {
  let b = ''; q.on('data', c => b += c); q.on('end', () => {
    const which = q.url.startsWith('/for/') ? FOR : q.url.startsWith('/ctr/') ? CTR : null;
    r.setHeader('Access-Control-Allow-Origin', '*');
    if (!which || q.method !== 'POST'){ r.writeHead(404); return r.end(); }
    calls++;
    const out = which.doPost({ postData: { contents: b } });
    r.writeHead(200, { 'Content-Type': 'application/json' }); r.end(out.getContent());
  });
});
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const site = http.createServer((q, r) => {
  const u = new URL(q.url, 'http://x'); let f = path.join(SITE, decodeURIComponent(u.pathname));
  if (u.pathname === '/') f = path.join(SITE, 'index.html');
  if (u.pathname === '/config.js'){ r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(
    `window.SBW_STORES=[{code:"FOR",name:"SUBWAY 太田川",url:"http://127.0.0.1:${API_PORT}/for/exec"},{code:"CTR",name:"SUBWAY セントレア",url:"http://127.0.0.1:${API_PORT}/ctr/exec"}];`); }
  if (!fs.existsSync(f)){ r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
(async () => {
  await new Promise(r => api.listen(API_PORT, r)); await new Promise(r => site.listen(SITE_PORT, r));
  for (const A of [FOR, CTR]){ let t = A.loginManager('subway1111').token; t = A.changeManagerPassword(t, 'subway1111', 'Otagawa2026x').token;
    A.saveEmployees(t, JSON.stringify([{ id: 'e1aaaa', name: A === FOR ? 'ヒエウ' : 'タン' }, { id: 'e2bbbb', name: 'ラム' }])); A.__tok = t; }
  const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', browser = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tokyo', locale: 'ja-JP' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const B = 'http://127.0.0.1:' + SITE_PORT + '/';

  console.log('— Trang chọn quán —');
  await p.goto(B + 'index.html'); await W(p, 400);
  ok('lần đầu: hiện danh sách 2 quán', await p.locator('a.st').count() === 2);
  await p.screenshot({ path: path.join(__dirname, 'gh-pick.png') });
  await p.click('a.st >> text=FOR'); await p.waitForURL(/app\.html\?s=FOR/); await W(p, 1500);
  ok('vào app.html?s=FOR, màn đăng nhập hiện', await p.locator('[data-ltab]').count() > 0);
  ok('có link "đổi quán"', await p.locator('.gh-store a').count() === 1);
  ok('không lỗi phiên bản (cùng bản)', await p.locator('.ver-banner').count() === 0);

  console.log('— Quản lý FOR đăng nhập qua API —');
  await p.click('[data-ltab="manager"]'); await W(p, 200);
  await p.fill('#mgrPwd', 'Otagawa2026x'); await p.click('#mgrLoginBtn');
  await p.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 }); await W(p, 1500);
  ok('vào màn quản lý', await p.locator('[data-mtab]').count() > 0);
  ok('trang thử chạy http → máy chủ không nhận (chỉ nhận https)', !FOR.__props.FRONT_URL);
  FOR.setFrontUrl(FOR.__tok, 'https://lamdo.github.io/subway-shift/app.html?s=FOR');
  ok('link https của GitHub Pages được nhận', FOR.__props.FRONT_URL === 'https://lamdo.github.io/subway-shift/app.html?s=FOR');
  const ql = FOR.empQuickLink(FOR.signToken_({ r: 'emp', e: 'e2bbbb', v: FOR.empVer_('e2bbbb'), x: Date.now() + 1e7 }), false);
  ok('link vào nhanh của nhân viên trỏ về trang GitHub', /^https:\/\/lamdo\.github\.io\/subway-shift\/app\.html\?s=FOR&dk=/.test(ql.url), ql.url);
  ok('link tuyển dụng / QR điểm danh dùng cùng gốc', FOR.joinUrl_(FOR.frontUrl_(), 'pa', '1.a') === 'https://lamdo.github.io/subway-shift/app.html?s=FOR&pa=1.a');
  ok('máy chủ CTR không bị đụng', !CTR.__props.FRONT_URL);
  await p.screenshot({ path: path.join(__dirname, 'gh-mgr.png') });

  console.log('— Bộ nhớ máy tách theo quán —');
  const ls = await p.evaluate(() => { const o = {}; const real = Object.getOwnPropertyDescriptor(Storage.prototype, 'getItem'); for (let i = 0; i < window.localStorage.length; i++) o[window.localStorage.key(i)] = 1; return { keys: Object.keys(o), last: (function(){ try { return Storage.prototype.getItem.call(Object.getPrototypeOf(window).constructor === Window ? window.__proto__ : null, 'x'); } catch (e) { return 'n/a'; } })() }; });
  ok('localStorage trong app chỉ thấy khoá của FOR', ls.keys.every(k => !/^q:/.test(k)), JSON.stringify(ls.keys));

  console.log('— Nhân viên quán CTR: mã đăng ký + ghi nhớ máy —');
  const cc = CTR.issueClaimCode(CTR.__tok, 'e2bbbb').code;
  await p.goto(B + 'app.html?s=CTR'); await W(p, 1500);
  await p.click('[data-ltab="staff"]').catch(() => {}); await W(p, 200);
  ok('quán CTR hiện đúng nhân viên CTR (タン)', await p.locator('[data-who="e1aaaa"]').innerText() === 'タン');
  await p.click('[data-who="e2bbbb"]'); await W(p, 300);
  await p.fill('#pin0', cc); await p.fill('#pin1', '284619'); await p.fill('#pin2', '284619'); await p.click('#authOk');
  await p.waitForFunction(() => !!document.querySelector('[data-stab]'), null, { timeout: 20000 }); await W(p, 1200);
  ok('nhân viên CTR vào app', await p.locator('[data-stab]').count() > 0);
  const raw = await p.evaluate(() => { const r = []; const s = Object.getPrototypeOf(window.localStorage) === Object.prototype; return s; });
  await p.goto(B + 'app.html?s=CTR'); await W(p, 2500);
  ok('mở lại CTR → vào thẳng (máy đã ghi nhớ)', await p.locator('[data-stab]').count() > 0);
  await p.goto(B + 'app.html?s=FOR'); await W(p, 2000);
  ok('mở FOR → KHÔNG dính phiên của CTR (về màn đăng nhập)', await p.locator('[data-ltab]').count() > 0 && await p.locator('[data-stab]').count() === 0);
  await p.goto(B + 'index.html'); await W(p, 1500);
  ok('trang chọn quán nhớ quán vừa dùng → vào thẳng FOR', /app\.html\?s=FOR/.test(p.url()), p.url());

  console.log('— Tham số trên link —');
  await p.goto(B + 'app.html?s=FOR&lang=vi'); await W(p, 1800);
  ok('?lang=vi → tiếng Việt', /Đăng nhập|nhân viên/i.test(await p.evaluate(() => document.body.innerText)));
  ok('địa chỉ trang vẫn giữ ?s=FOR', /s=FOR/.test(p.url()));
  ok('không lỗi JS', !errs.length, errs.join(' | '));
  ok('mọi lệnh đi qua API (' + calls + ' lần gọi)', calls > 5);
  await browser.close(); api.close(); site.close();
  console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('HARNESS', e); process.exit(2); });
