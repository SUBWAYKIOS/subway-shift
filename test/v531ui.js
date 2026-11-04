// v2026.10.31.1 — tab Tháng trên điện thoại: kỳ 1·2 một hàng · in + ↶ một hàng · 3 nút nhóm app. Chạy: node tests/v531ui.js
const fs = require('fs'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), APP = path.resolve(__dirname, '..'), OUT = path.join(__dirname, 'sh');
fs.mkdirSync(OUT, { recursive: true });
const api = require(APP + '/tests/gas-mock')({ code: APP + '/Code.gs', html: APP + '/Index.html' });
const html = fs.readFileSync(APP + '/Index.html', 'utf8'), PORT = 9086;
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
(async () => {
  await new Promise(r => server.listen(PORT, r));
  let tok = api.loginManager('subway1111').token; tok = api.changeManagerPassword(tok, 'subway1111', 'Otagawa2026x').token;
  const S = api.readSettings_(); S.storeName = 'SubwayForestMall Tokai Ootagawa'; S.wage = 1200; S.laborPct = 22; api.saveSettings(tok, JSON.stringify(S));
  const names = ['ヒエウ', 'ラム', '平野', '愛深', 'まい', 'タン'];
  api.saveEmployees(tok, JSON.stringify(names.map((n, i) => ({ id: 'e' + i + 'aaaa', name: n }))));
  const TODAY = api.jstDateStr_(0), YM = TODAY.slice(0, 7), N = new Date(+YM.slice(0, 4), +YM.slice(5, 7), 0).getDate();
  for (let d = 1; d <= N; d++){ api.saveDayInfo(tok, YM, d, 110000, ''); names.forEach((n, i) => { if ((d + i) % 3) api.saveShiftEntry(tok, YM, d, 'e' + i + 'aaaa', { off: false, shifts: [{ start: 8 + i * 2, end: 14 + i * 2 }] }); }); }
  api.setMonthLock(tok, YM, true, '{}', 'all');
  [0, 1].forEach(i => api.saveShiftEntry(tok, YM, Math.min(N, +TODAY.slice(8) + 1), 'e' + i + 'aaaa', { off: false, shifts: [{ start: 9, end: 15 }] }));
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const W = 402, H = 874;
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: W < 700, hasTouch: W < 700, timezoneId: 'Asia/Tokyo', locale: 'ja-JP' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(api[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
  await ctx.addInitScript(sk => {
    function mkRun(){ let s = () => {}, f = () => {}; const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; }; if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
    window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: { lang: 'ja' }, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
    window.__LAUNCHER_ON = 1; try { if (sk) localStorage.setItem('sbw.skin', sk); } catch (e){}
  }, 'glass');
  await p.goto('http://127.0.0.1:' + PORT + '/'); await p.waitForTimeout(1500);
  await p.click('[data-ltab="manager"]'); await p.fill('#mgrPwd', 'Otagawa2026x'); await p.click('#mgrLoginBtn');
  await p.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 }); await p.waitForTimeout(1200);
  for (let i = 0; i < 4 && await p.locator('.modal-back').count(); i++){ await p.keyboard.press('Escape'); await p.waitForTimeout(250); }
  await p.evaluate(() => document.querySelector('[data-mtab="month"]').click()); await p.waitForTimeout(1500);
  const L = await p.evaluate(() => { const r = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; }; const c = [...document.querySelectorAll('.per-compact .per-card')].map(x => Math.round(x.getBoundingClientRect().top));
    return { mq: document.querySelectorAll('.month-nav .mq-btn').length, grpHidden: !document.querySelector('.app-groups') || getComputedStyle(document.querySelector('.app-groups')).display === 'none',
      print: !!document.querySelector('.mg-bar .mq-row #hpFirstBtn') && !!document.querySelector('.mg-bar .mq-row #hpSecondBtn') && getComputedStyle(document.querySelector('#pubLine')).display === 'none', cards: c, navH: Math.round(r('.month-nav').height) }; });
  ok('điện thoại: 3 nút nhóm app ở thanh tháng, khối app lớn ẩn', L.mq === 3 && L.grpHidden, JSON.stringify(L));
  ok('kỳ 1 · kỳ 2 cùng một hàng', L.cards.length === 2 && L.cards[0] === L.cards[1], JSON.stringify(L));
  ok('in 1〜15 · 16〜31 nằm bên phải hàng Cả tháng | 1〜15 | 16〜31 (bỏ một hàng)', L.print, JSON.stringify(L));
  const pu = await p.evaluate(() => { const b = document.querySelector('.mg-bar [data-pubunseen]'); return b ? Math.round(b.querySelector('.pu-s').getBoundingClientRect().height) : 0; });
  ok('nút 👀 nằm hàng Xin/Xếp, cao ≥ 32px', pu >= 32, pu);
  await p.click('.mg-bar [data-pubunseen]'); await p.waitForTimeout(500);
  ok('bấm 👀 → danh sách người chưa xem', await p.locator('.modal-back:not(.closing) .pu-item').count() >= 1);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  ok('thanh tháng vẫn một dòng', L.navH <= 44, JSON.stringify(L));
  await p.screenshot({ path: OUT + '/v531-month.png' });
  await p.click('.mq-btn[data-mqgrp="labor"]'); await p.waitForTimeout(600);
  const sh = await p.evaluate(() => [...document.querySelectorAll('.mq-ov .app-ic')].map(b => b.getAttribute('data-app')));
  ok('bấm 👥 → bảng trượt các app Nhân công', sh.length >= 3, JSON.stringify(sh));
  await p.screenshot({ path: OUT + '/v531-sheet.png' });
  await p.click('.mq-ov .app-ic >> nth=0'); await p.waitForTimeout(1200);
  ok('bấm app trong bảng → mở app', await p.evaluate(() => document.documentElement.classList.contains('app-open') || !!document.querySelector('.app-ov')) && !(await p.locator('.mq-ov').count()));
  await p.evaluate(() => document.querySelector('[data-mtab="day"]').click()); await p.waitForTimeout(1000);
  const DY = await p.evaluate(() => ({ lock: !!document.querySelector('.month-nav .dq-btn'), lk: !!document.querySelector('.month-nav .dq-lk'), bar: (() => { const e = document.querySelector('.lock-bar.per-one'); return !e || !e.offsetParent; })(), inbox: !!document.querySelector('.alerts-row [data-inbox]') }));
  ok('tab Ngày (điện thoại): kỳ + khoá gộp thành nút 🔒 trên thanh tháng, chip 📱 lên thanh tháng, bỏ chip 🔔 trùng', DY.lock && DY.lk && DY.bar && !DY.inbox, JSON.stringify(DY));
  await p.click('.month-nav .dq-btn'); await p.waitForTimeout(500);
  ok('bấm 🔒 → bảng có nút mở khoá / sửa ngày', await p.locator('.mq-ov #pubEditOn, .mq-ov #unlockP2, .mq-ov #lockBtn').count() >= 1);
  await p.screenshot({ path: OUT + '/v531-day-sheet.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  ok('đóng bảng → nút vẫn còn trong trang (ẩn) để bấm lần sau', await p.locator('.dq-hold #unlockP2, .dq-hold #pubEditOn, .dq-hold #lockBtn').count() >= 1);
  await p.setViewportSize({ width: 1280, height: 900 }); await p.evaluate(() => document.querySelector('[data-mtab="day"]').click()); await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelector('[data-mtab="month"]').click()); await p.waitForTimeout(1200);
  ok('máy tính: giữ bố cục cũ (không có 3 nút, khối app hiện)', await p.locator('.mq-btn').count() === 0 && await p.locator('.app-groups').isVisible());
  ok('không lỗi JS', !errs.length, errs.join(' | '));
  await browser.close(); server.close();
  console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(2); });
