// Đo tốc độ mở app bản GitHub như trên điện thoại: CPU chậm 4× (máy tầm trung), mạng 4G, máy chủ Apps Script trả lời sau ~1,2 giây.
// Chạy: node tools/build.mjs && node test/perf.js   (PERF_CPU=6 PERF_API_MS=2000 để thử máy yếu / mạng chậm)
const fs = require('fs'), path = require('path'), http = require('http'), zlib = require('zlib');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const ROOT = path.resolve(__dirname, '..'), SITE = path.join(ROOT, '_site');
const mk = require('./gas-mock');
const FOR = mk({ code: path.join(ROOT, 'apps-script/Code.gs'), html: path.join(ROOT, 'src/Index.html') });
const CPU = Number(process.env.PERF_CPU || 4), API_MS = Number(process.env.PERF_API_MS || 1200), RUNS = Number(process.env.PERF_RUNS || 3);
const SITE_PORT = 9131, API_PORT = 9132;
const api = http.createServer((q, r) => { let b = ''; q.on('data', c => b += c); q.on('end', () => {
  r.setHeader('Access-Control-Allow-Origin', '*');
  if (q.method !== 'POST'){ r.writeHead(404); return r.end(); }
  const out = FOR.doPost({ postData: { contents: b } }).getContent();
  setTimeout(() => { r.writeHead(200, { 'Content-Type': 'application/json' }); r.end(out); }, API_MS);
}); });
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const gzCache = {};
const site = http.createServer((q, r) => {
  const u = new URL(q.url, 'http://x'); let f = path.join(SITE, decodeURIComponent(u.pathname));
  if (u.pathname === '/config.js'){ r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(`window.SBW_STORES=[{code:"FOR",name:"SUBWAY 太田川",url:"http://127.0.0.1:${API_PORT}/for/exec"}];`); }
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()){ r.writeHead(404); return r.end(); }
  const body = gzCache[f] || (gzCache[f] = zlib.gzipSync(fs.readFileSync(f), { level: 9 }));       // GitHub Pages gửi gzip
  r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Content-Encoding': 'gzip', 'Cache-Control': 'max-age=600' }); r.end(body);
});
const med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
(async () => {
  await new Promise(r => api.listen(API_PORT, r)); await new Promise(r => site.listen(SITE_PORT, r));
  let t = FOR.loginManager('subway1111').token; t = FOR.changeManagerPassword(t, 'subway1111', 'Otagawa2026x').token;
  const names = 'ヒエウ ラム まい タン ゆき ヴィ タオ フォン アチニ 角野 恵都 愛深 わきた 渡辺'.split(' ');
  FOR.saveEmployees(t, JSON.stringify(names.map((n, i) => ({ id: 'e' + i + 'aaaa', name: n }))));
  const YM = FOR.jstDateStr_(0).slice(0, 7), N = new Date(+YM.slice(0, 4), +YM.slice(5, 7), 0).getDate();
  for (let d = 1; d <= N; d++) names.forEach((n, i) => { if ((d + i) % 3) FOR.saveShiftEntry(t, YM, d, 'e' + i + 'aaaa', { off: false, shifts: [{ start: 8 + (i % 6), end: 14 + (i % 6) }] }); });
  const cc = FOR.issueClaimCode(t, 'e1aaaa'); const st = FOR.claimEmployee('e1aaaa', '284619', true, 'iPhone', cc.code);
  const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', browser = await pw.chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
  const B = 'http://127.0.0.1:' + SITE_PORT + '/app.html?s=FOR&lang=vi';
  async function run(label, setup, ready, warm){
    const res = [];
    for (let i = 0; i < RUNS; i++){
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, timezoneId: 'Asia/Tokyo' });
      const p = await ctx.newPage(), cdp = await ctx.newCDPSession(p);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 60, downloadThroughput: 9 * 1024 * 1024 / 8, uploadThroughput: 3 * 1024 * 1024 / 8 });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
      if (setup) await ctx.addInitScript(setup.fn, setup.arg);
      if (warm){ await p.goto(B); await p.waitForSelector(ready, { timeout: 60000 }); await p.waitForTimeout(1500); }
      const t0 = Date.now();
      await p.goto(B, { waitUntil: 'commit' });
      await p.waitForSelector(ready, { timeout: 60000 });
      const visible = Date.now() - t0;
      // "Dùng được" = đã có dữ liệu mới từ máy chủ (hết lớp xem trước), không còn thanh tải.
      await p.waitForFunction(() => !document.body.classList.contains('boot-preview') && !document.querySelector('.boot-loading,.app-loading'), null, { timeout: 60000 }).catch(() => {});
      const fresh = Date.now() - t0;
      const nav = await p.evaluate(() => { const n = performance.getEntriesByType('navigation')[0], f = performance.getEntriesByName('first-contentful-paint')[0]; return { html: Math.round(n.responseEnd), dcl: Math.round(n.domContentLoadedEventEnd), fcp: f ? Math.round(f.startTime) : 0, kb: Math.round((n.transferSize || 0) / 1024) }; });
      const m = await cdp.send('Performance.getMetrics').catch(() => ({ metrics: [] }));
      res.push({ visible, fresh, ...nav });
      await ctx.close();
    }
    const pick = k => med(res.map(r => r[k]));
    console.log(label.padEnd(44) + ' HTML ' + pick('html') + 'ms (' + pick('kb') + 'KB) · vẽ chữ đầu ' + pick('fcp') + 'ms · DOM xong ' + pick('dcl') + 'ms · thấy màn ' + pick('visible') + 'ms · có số liệu mới ' + pick('fresh') + 'ms');
    return { visible: pick('visible'), fresh: pick('fresh') };
  }
  console.log('Điện thoại giả lập: CPU chậm ' + CPU + '× · 4G (60ms, 9 Mbps) · máy chủ trả lời sau ' + API_MS + 'ms · trung vị ' + RUNS + ' lần\n');
  const out = {};
  out.login = await run('Lần đầu mở (chưa đăng nhập) → màn đăng nhập', null, '[data-ltab]', false);
  const dk = { fn: dk => { try { localStorage.setItem('q:FOR:sbw.dk', dk); } catch (e){} }, arg: st.dk };
  out.staffCold = await run('Nhân viên đã ghi nhớ, mở lần đầu → tab Hôm nay', dk, '[data-stab]', false);
  out.staffWarm = await run('Nhân viên mở lại (đã có bản lưu) → tab Hôm nay', dk, '[data-stab]', true);
  fs.writeFileSync(path.join(__dirname, 'perf-result.json'), JSON.stringify({ at: new Date().toISOString(), CPU, API_MS, ...out }, null, 1));
  await browser.close(); api.close(); site.close();
})().catch(e => { console.log('HARNESS', e); process.exit(2); });
