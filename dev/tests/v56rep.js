// v2026.11.05.3 — 🏪 quán sống động: 2 máy thấy nhau gần tức thì, động tác, khen thưởng, Tenchou, trò chơi, quay thưởng.
// Chạy: node tests/v55ui.js [Index.html] [Code.gs]   (ảnh chụp lưu ở tests/shots-v55/)
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
const SHOT = path.join(DIR, 'shots-v56r'); fs.mkdirSync(SHOT, { recursive: true });
const makeApi = require('./gas-mock');
const A = makeApi({ code: CODE, html: HTML, registry: {}, web: {}, ssId: 'ssOtagawa', url: 'https://script.google.com/macros/s/otagawa/exec' });
const PORT = 9157, html = fs.readFileSync(HTML, 'utf8');
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const W = (p, ms) => p.waitForTimeout(ms);
(async () => {
  await new Promise(r => server.listen(PORT, r));
  let t = A.loginManager('subway1111').token; A.changeManagerPassword(t, 'subway1111', 'Otagawa2026x'); t = A.loginManager('Otagawa2026x').token;
  A.saveSettings(t, JSON.stringify({ storeName: 'SUBWAY フォレストモール東海太田川店' }));
  const E = [['e1', 'ヒエウ'], ['e2', 'ラム'], ['e3', 'まい'], ['e4', 'ともみ'], ['e5', 'たろう'], ['e6', 'ゆき']].map(x => ({ id: x[0] + 'aaaa', name: x[1] }));
  A.saveEmployees(t, JSON.stringify(E));
  const TODAY = A.todayStr_(), YM = TODAY.slice(0, 7), D = +TODAY.slice(8);
  const hN = (() => { const d = new Date(Date.now() + 9 * 3600000); return d.getUTCHours() + d.getUTCMinutes() / 60; })();
  const s0 = Math.max(0, Math.floor(hN) - 2), e0 = Math.min(26, Math.ceil(hN) + 3);
  ['e1aaaa', 'e2aaaa', 'e3aaaa', 'e4aaaa'].forEach((id, i) => A.saveShiftEntry(t, YM, D, id, { off: false, shifts: [{ start: s0, end: e0 }] }));
  A.saveShiftEntry(t, YM, D, 'e5aaaa', { off: false, shifts: [{ start: s0, end: e0, breakStart: Math.floor(hN * 2) / 2, breakEnd: Math.floor(hN * 2) / 2 + 1 }] });
  const cc = A.issueClaimCode(t, 'e1aaaa'); const st = A.claimEmployee('e1aaaa', '284619', true, 'iPhone', cc.code);
  const sTok = A.bootstrap(st.dk).session.token;
  A.saveAvatar(sTok, JSON.stringify({ hs: 6, hc: 7, ey: 1, mo: 0, fx: 1, of: 2, oc: 5, ac: 1 }));
  const c2 = A.issueClaimCode(t, 'e2aaaa'); const st2 = A.claimEmployee('e2aaaa', '111222', true, 'Android', c2.code);
  A.officeSay(A.bootstrap(st2.dk).session.token, 'おつかれさまです！', '');
  A.kvSet_('ofxp', JSON.stringify({ fin: A.ofcYm_(-1), tot: { e2aaaa: 1300, e3aaaa: 600, e4aaaa: 300, e5aaaa: 120 } })); A.ofcXpBust_();   // cấp cao → hiệu ứng
  A.saveAvatar(t, JSON.stringify({ hs: 8, hc: 4, ac: 11, of: 5, oc: 9, ef: 4 }));
  A.setMonthLock(t, YM, true);                       // v55.1: tháng đã chốt — tab Quán vẫn phải mở được
  A.officeHere(A.bootstrap(st2.dk).session.token);   // ラム đang mở app
  const c3 = A.issueClaimCode(t, 'e6aaaa'); const st3 = A.claimEmployee('e6aaaa', '333444', true, 'iPhone', c3.code);
  A.officeHere(A.bootstrap(st3.dk).session.token);   // ゆき (không có ca) đang mở app → ghé quán
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  async function open(vp, staff, lang, dk){
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: vp.width < 600 ? 2 : 1, timezoneId: 'Asia/Tokyo', locale: 'ja-JP', hasTouch: vp.width < 600 });
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(A[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
    await ctx.addInitScript(([dk, lg]) => {
      if (dk) try { localStorage.setItem('sbw.dk', dk); } catch (e){}
      try { localStorage.setItem('sbw.lang', lg); } catch (e){}
      function mkRun(){ let s = () => {}, f = () => {}; const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; }; if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
      window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: { lang: lg }, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
    }, [staff ? (dk || st.dk) : null, lang]);
    await p.goto('http://127.0.0.1:' + PORT + '/'); await W(p, 1200);
    if (!staff){
      await p.click('[data-ltab="manager"]'); await W(p, 200); await p.fill('#mgrPwd', 'Otagawa2026x'); await p.click('#mgrLoginBtn');
      await p.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 });
    } else await p.waitForFunction(() => !!document.querySelector('[data-stab]'), null, { timeout: 20000 });
    await W(p, 1500);
    for (let i = 0; i < 4 && await p.locator('.modal-back').count(); i++){ await p.keyboard.press('Escape'); await W(p, 250); }
    return p;
  }
  const glOk = async p => { await p.evaluate(() => { window.__ofcProbe = 1; }); await W(p, 1500); return p.evaluate(() => window.__ofcProbe); };

  console.log('— Bot WingArc (máy chủ) —');
  const k = A.waBotKey(t, true).key;
  const bi = A.waBotImport(k, JSON.stringify({ months: { [YM]: { d: { '1': { rev: 300000, cust: 200, h: { '12': 50000 } } } } } }));
  ok('bot gửi doanh thu bằng khoá', bi.ok && bi.months[YM].wa.days === 1);
  let bad = null; try { A.waBotImport('wa_sai', '{}'); } catch (e){ bad = e.message; }
  ok('khoá sai bị từ chối', /không đúng/.test(bad || ''));
  ok('doanh thu bot vào sales chung', +(A.readJsonKey_('sales:' + YM).d || {})['1'] === 300000);
  console.log('— Quản lý: nhập CSV WingArc + báo cáo chủ quán —');
  const m = await open({ width: 1360, height: 900 }, false, 'vi');
  await m.evaluate(() => document.querySelector('[data-mtab="month"]').click()); await W(m, 1500);
  await m.evaluate(() => { const g = document.querySelector('[data-grp="sales"], .app-ic[data-app="sales"]'); if (g) g.click(); }); await W(m, 600);
  const has = await m.locator('#orBox').count();
  if (!has){ await m.evaluate(() => { [...document.querySelectorAll('button,.app-ic')].filter(b => /Doanh thu|売上/.test(b.textContent)).slice(0, 1).forEach(b => b.click()); }); await W(m, 800); }
  ok('ô "Báo cáo cho chủ quán" trong tab Tháng', await m.locator('#orBox').count() === 1);
  const fx = f => path.join(DIR, 'fixtures', f);
  await m.setInputFiles('#orBox input[type=file]', [fx('wa-daily.csv'), fx('wa-hourly.csv'), fx('wa-items.csv')]); await W(m, 3500);
  const wa = A.readJsonKey_('wa:2026-11');
  ok('nhập CSV ngày (doanh thu + khách + kênh)', wa.d && wa.d['1'] && wa.d['1'].rev === 331700 && wa.d['1'].cust === 228 && wa.d['1'].eat === 172484, JSON.stringify(wa.d && wa.d['1']));
  ok('nhập CSV theo giờ', wa.d['1'].h && wa.d['1'].h['12'] > 0, JSON.stringify(wa.d['1'].h));
  ok('nhập CSV số bán từng món (POS)', Object.keys(A.readJsonKey_('pos:2026-11').it || {}).length === 8);
  await m.click('[data-orep="open"]'); await W(m, 3500);
  ok('mở bản báo cáo 3 trang A4', await m.locator('.doc-prev .or-a4').count() === 3);
  const txt = await m.evaluate(() => document.querySelector('.doc-prev').innerText);
  ok('có doanh thu, khách, giờ cao điểm, món bán chạy', /¥/.test(txt) && /ローストチキン|BLT/.test(txt) && /\d+時台/.test(txt), txt.slice(0, 300));
  await m.screenshot({ path: path.join(SHOT, 'pc-report.png') });
  const pg = await m.$$('.doc-prev .or-a4');
  for (let i = 0; i < pg.length; i++) await pg[i].screenshot({ path: path.join(SHOT, 'report-p' + (i + 1) + '.png') });
  ok('không lỗi JS', !m.errs.length, m.errs.join(' | '));

  await browser.close(); server.close();
  console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('HARNESS', e); process.exit(2); });
