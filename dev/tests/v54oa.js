// v2026.11.04.1 — phương án mở cửa: "từ 8:00 cần 1 người" HOẶC "từ 9:00 cần 2 người". Chạy: node tests/v54oa.js
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
const api = require('./gas-mock')({ code: CODE, html: HTML });
const PORT = 9089, html = fs.readFileSync(HTML, 'utf8');
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const W = (p, ms) => p.waitForTimeout(ms);
(async () => {
  await new Promise(r => server.listen(PORT, r));
  let tok = api.loginManager('subway1111').token; tok = api.changeManagerPassword(tok, 'subway1111', 'Otagawa2026x').token;
  const TODAY = api.jstDateStr_(0), YM = TODAY.slice(0, 7), D = +TODAY.slice(8);
  const S = api.readSettings_(), row = [1,2,2,2,2,2,2,2,2,2,2,2,2];
  ['d0','d1','d2','d3','d4','d5','d6','hol'].forEach(k => S.staffing[k] = row.slice());
  Object.assign(S, { staffBase: 8, openHour: 8, closeHour: 21 });
  S.openAlt = [{ dows: ['d0','d1','d2','d3','d4','d5','d6','hol'], opts: [{ at: 9, n: 2 }, { at: 8, n: 1 }, { at: 8, n: 3 }] }, { dows: ['zz'], opts: [{ at: 8, n: 1 }, { at: 9, n: 2 }] }];
  api.saveSettings(tok, JSON.stringify(S));
  const oa = api.readSettings_().openAlt;
  ok('máy chủ lưu phương án (sắp theo giờ, bỏ giờ trùng, bỏ thứ sai)', JSON.stringify(oa) === JSON.stringify([{ dows: ['d0','d1','d2','d3','d4','d5','d6','hol'], opts: [{ at: 8, n: 1 }, { at: 9, n: 2 }] }]), JSON.stringify(oa));
  const WI = { A: [9, 15], B: [9, 15], C: [14, 21], Dd: [14, 21] };
  const id = k => 'e' + k.toLowerCase() + 'xxxx';
  api.saveEmployees(tok, JSON.stringify(Object.keys(WI).map(k => ({ id: id(k), name: k }))));
  Object.keys(WI).forEach(k => api.saveWishEntry(tok, YM, D, id(k), { off: false, shifts: [{ start: WI[k][0], end: WI[k][1] }] }));
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, timezoneId: 'Asia/Tokyo', locale: 'vi-VN' });
  const m = await ctx.newPage(); m.errs = []; m.on('pageerror', e => m.errs.push(e.message));
  await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(api[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
  await ctx.addInitScript(() => {
    function mkRun(){ let s = () => {}, f = () => {}; const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; }; if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
    window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: { lang: 'vi' }, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
    window.__LAUNCHER_ON = 1;
  });
  await m.goto('http://127.0.0.1:' + PORT + '/'); await W(m, 1300);
  await m.click('[data-ltab="manager"]'); await W(m, 200); await m.fill('#mgrPwd', 'Otagawa2026x'); await m.click('#mgrLoginBtn');
  await m.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 }); await W(m, 1300);
  for (let i = 0; i < 4 && await m.locator('.modal-back').count(); i++){ await m.keyboard.press('Escape'); await W(m, 250); }
  console.log('— Không ai rảnh lúc 8:00 → chọn "từ 9:00 cần 2 người" —');
  await m.click('#quickDayBtn'); await W(m, 2500);
  for (let i = 0; i < 4 && await m.locator('.modal-back').count(); i++){ await m.keyboard.press('Escape'); await W(m, 250); }
  const sc = (api.readMonthObject_(api.getSheet_(), 'schedule:' + YM) || {})[String(D)] || {};
  const starts = Object.values(sc).flatMap(e => (e.shifts || []).map(x => x.start));
  ok('xếp nhanh: hai người vào lúc 9:00', starts.filter(s => s === 9).length >= 2, JSON.stringify(sc));
  const short8 = await m.evaluate(() => (document.querySelector('#coverageBox .cov-bar[data-h="8"]') || {}).className || '');
  ok('8:00 không bị báo thiếu người (theo phương án đang dùng)', /is-zero|is-ok/.test(short8), short8);
  console.log('— Cài đặt —');
  await m.evaluate(() => { const b = document.getElementById('goSettingsBtn'); if (b) b.click(); }); await W(m, 900);
  await m.evaluate(() => { const b = document.querySelector('[data-app*="storeBox"]'); if (b) b.click(); }); await W(m, 900);
  ok('Cài đặt quán có mục 🕗 Phương án mở cửa với 1 dòng đã lưu', await m.locator('#oaList [data-oarow]').count() === 1);
  await m.click('#oaAdd'); await W(m, 200);
  const r2 = m.locator('#oaList [data-oarow]').nth(1);
  await r2.locator('.oa-day input[value="d6"]').check({ force: true }); await r2.locator('.oa-day input[value="d0"]').check({ force: true });
  await r2.locator('.oa-day input[value="d1"]').uncheck({ force: true });
  await r2.locator('.oa-n').nth(1).fill('3');
  await m.locator('.modal-back:not(.closing) #saveSettingsBtn, #saveSettingsBtn').first().click(); await W(m, 1200);
  const oa2 = api.readSettings_().openAlt;
  ok('thêm phương án thứ 2 → lưu (T7 + CN … từ 9:00 cần 3 người)', oa2.length === 2 && oa2[1].dows.indexOf('d6') !== -1 && oa2[1].dows.indexOf('d1') === -1 && oa2[1].opts[1].n === 3, JSON.stringify(oa2));
  await m.locator('#oaList').screenshot({ path: path.join(DIR, 'sh', 'v54-openalt.png') }).catch(() => {});
  ok('không lỗi JS', !m.errs.length, m.errs.join(' | '));
  await browser.close(); server.close();
  console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('HARNESS', e); process.exit(2); });
