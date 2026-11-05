// v2026.11.05.3 — 🏪 quán sống động: 2 máy thấy nhau gần tức thì, động tác, khen thưởng, Tenchou, trò chơi, quay thưởng.
// Chạy: node tests/v55ui.js [Index.html] [Code.gs]   (ảnh chụp lưu ở tests/shots-v55/)
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
const SHOT = path.join(DIR, 'shots-v56'); fs.mkdirSync(SHOT, { recursive: true });
const makeApi = require('./gas-mock');
const A = makeApi({ code: CODE, html: HTML, registry: {}, web: {}, ssId: 'ssOtagawa', url: 'https://script.google.com/macros/s/otagawa/exec' });
const PORT = 9156, html = fs.readFileSync(HTML, 'utf8');
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

  A.saveEmployees(t, JSON.stringify(E.map(e => Object.assign({}, e, e.id === 'e1aaaa' ? { rank: 4 } : (e.id === 'e3aaaa' ? { rank: 2 } : {})))));
  console.log('— Hai máy nhân viên cùng mở tab Quán —');
  const pA = await open({ width: 390, height: 844 }, true, 'vi');
  const pB = await open({ width: 390, height: 844 }, true, 'vi', st2.dk);
  await pA.click('[data-stab="office"]'); await pB.click('[data-stab="office"]'); await W(pA, 3500);
  const tagsA = await pA.evaluate(() => [...document.querySelectorAll('.ofc-tag')].map(e => e.textContent));
  ok('chức vụ hiện trên tên (店長 ヒエウ)', tagsA.some(x => /Cửa hàng trưởng|店長/.test(x) && /ヒエウ/.test(x)), JSON.stringify(tagsA));
  ok('thanh động tác có 20 nút', await pA.locator('[data-ofcact]').count() === 20);
  // A: lau sàn → B thấy
  await pA.click('[data-ofcact="mop"]'); await W(pA, 300);
  const t0 = Date.now();
  let seen = false;
  for (let i = 0; i < 12 && !seen; i++){ await W(pB, 500); seen = await pB.evaluate(() => { const e = window.__ofcSc().ents.e1aaaa; return !!(e && e.act === 'mop'); }); }
  ok('máy B thấy ヒエウ lau sàn sau ' + ((Date.now() - t0) / 1000).toFixed(1) + ' giây', seen);
  // A: chạm sàn → di chuyển → B thấy đi tới
  const goal = await pA.evaluate(() => { const sc = window.__ofcSc(), me = sc.ents.e1aaaa; const r = sc.canvas.getBoundingClientRect();
    const p = sc.R.project((800 - sc.L.W / 2) / 100, 0, (230 - sc.L.H / 2) / 100, sc.w, sc.h); return p ? [p[0] + r.left, p[1] + r.top] : null; }).catch(() => null);
  if (goal){ await pA.mouse.click(goal[0], goal[1]); }
  let moved = false; const t1 = Date.now();
  for (let i = 0; i < 14 && !moved; i++){ await W(pB, 500); moved = await pB.evaluate(() => { const e = window.__ofcSc().ents.e1aaaa; return !!(e && e.goal && e.free); }); }
  ok('máy B thấy ヒエウ tự đi tới chỗ mới sau ' + ((Date.now() - t1) / 1000).toFixed(1) + ' giây', moved);
  // chat thời gian thực
  await pA.fill('#ofcTxt', 'みんなおつかれ！'); await pA.click('.ofc-send');
  let bub = false; const t2 = Date.now();
  for (let i = 0; i < 12 && !bub; i++){ await W(pB, 500); bub = await pB.evaluate(() => [...document.querySelectorAll('.ofc-bub')].some(e => e.style.display !== 'none' && /みんなおつかれ/.test(e.textContent))); }
  ok('tin nhắn hiện trên đầu ヒエウ ở máy B sau ' + ((Date.now() - t2) / 1000).toFixed(1) + ' giây', bub);
  await pB.click('[data-ofcact="dance"]'); await W(pB, 2600);
  await pA.screenshot({ path: path.join(SHOT, 'phone-A.png') }); await pB.screenshot({ path: path.join(SHOT, 'phone-B.png') });
  // trò chơi
  await pB.click('[data-ofctool="games"]'); await W(pB, 700);
  ok('mở danh sách trò chơi (3 trò)', await pB.locator('[data-gplay]').count() === 3);
  await pB.click('[data-gplay="bake"]'); await W(pB, 600);
  for (let k = 0; k < 8; k++){
    const want = await pB.evaluate(() => { const c = document.querySelector('.gb-ord span.cur'); return c ? c.firstChild.textContent : null; });
    if (!want) break;
    await pB.evaluate(w => { const b = [...document.querySelectorAll('[data-gi]')].find(x => x.querySelector('span').textContent === w); b && b.click(); }, want); await W(pB, 330);
  }
  ok('chơi "Làm bánh nhanh" có điểm', /Điểm (\d+)/.test(await pB.evaluate(() => document.getElementById('gHud').textContent)) && +(await pB.evaluate(() => document.getElementById('gHud').textContent)).match(/Điểm (\d+)/)[1] > 0);
  await pB.screenshot({ path: path.join(SHOT, 'phone-game.png') });
  await pB.click('.ofc-gx'); await W(pB, 300);
  ok('đóng trò chơi', await pB.locator('.ofc-game').count() === 0);
  // Tenchou: ヒエウ (店長) vào chế độ quản lý
  ok('nút 🔑 Chế độ quản lý cho 店長', await pA.locator('[data-ofctool="tc"]').count() === 1);
  ok('ラム không có nút Tenchou', await pB.locator('[data-ofctool="tc"]').count() === 0);
  ok('không lỗi JS (A, B)', !pA.errs.length && !pB.errs.length, pA.errs.concat(pB.errs).join(' | '));

  console.log('— Quản lý: khen thưởng + quay thưởng —');
  const m = await open({ width: 1360, height: 900 }, false, 'vi');
  await m.click('[data-mtab="office"]'); await W(m, 3000);
  await m.evaluate(() => { const b = [...document.querySelectorAll('[data-ofcwho]')].find(x => x.getAttribute('data-ofcwho') === 'e3aaaa'); b.click(); }); await W(m, 700);
  await m.click('[data-ofcact="grant"]'); await W(m, 900);
  ok('mở hộp khen thưởng', await m.locator('.ofc-grant').count() === 1);
  await m.click('[data-gk="guest"]'); await m.fill('#gNote', 'お客様が笑顔で帰られました');
  await m.screenshot({ path: path.join(SHOT, 'pc-grant.png') });
  await m.click('#mOk'); await W(m, 1500);
  const gr = A.officeState(t).people.find(p => p.id === 'e3aaaa');
  ok('まい nhận danh hiệu "Được khách khen"', gr.kd.length === 1 && gr.kd[0].k === 'guest', JSON.stringify(gr.kd));
  let rib = false; for (let i = 0; i < 10 && !rib; i++){ await W(pA, 500); rib = await pA.evaluate(() => [...document.querySelectorAll('.ofc-rib')].some(e => /まい/.test(e.textContent))); }
  ok('máy nhân viên hiện băng rôn vinh danh', rib);
  await W(pA, 2200);
  ok('ruy băng vinh danh trên đầu まい', await pA.evaluate(() => [...document.querySelectorAll('.ofc-hon')].some(e => e.style.display !== 'none' && /khách khen/.test(e.textContent))));
  await pA.screenshot({ path: path.join(SHOT, 'phone-honor.png') });
  await m.click('[data-ofctool="gift"]'); await W(m, 900);
  ok('mở vòng quay quà', await m.locator('#drCv').count() === 1 && await m.locator('[data-drw]').count() >= 5);
  await m.click('#drSpin'); await W(m, 12000);
  const dr = A.officeState(t).draw;
  ok('quay xong: 3 người nhận quà', dr && dr.list.length === 3, JSON.stringify(dr));
  ok('danh sách người nhận hiện trong hộp', await m.locator('.dr-w').count() === 3);
  await m.screenshot({ path: path.join(SHOT, 'pc-draw.png') });
  await m.keyboard.press('Escape'); await W(m, 500);
  ok('không lỗi JS (quản lý)', !m.errs.length, m.errs.join(' | '));

  console.log('— Tenchou xếp lịch từ máy nhân viên —');
  await pA.click('[data-ofctool="tc"]'); await W(pA, 3000);
  ok('vào màn quản lý (tab Ngày / Tháng)', await pA.locator('[data-mtab="day"]').count() === 1);
  ok('băng "Đang dùng quyền Tenchou"', /Tenchou/.test(await pA.evaluate(() => (document.getElementById('ofcTcBar') || {}).textContent || '')));
  await pA.screenshot({ path: path.join(SHOT, 'phone-tenchou.png') });
  await pA.click('#ofcTcBar button'); await W(pA, 2500);
  ok('thoát → về lại máy nhân viên', await pA.locator('[data-stab]').count() > 0);
  ok('không lỗi JS (Tenchou)', !pA.errs.length, pA.errs.join(' | '));

  await browser.close(); server.close();
  console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('HARNESS', e); process.exit(2); });
