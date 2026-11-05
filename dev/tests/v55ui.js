// v2026.11.05.1 — 🏢 văn phòng ảo: tab mới (nhân viên + quản lý), cảnh 3D, chat, thành tích, tạo nhân vật.
// Chạy: node tests/v55ui.js [Index.html] [Code.gs]   (ảnh chụp lưu ở tests/shots-v55/)
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
const SHOT = path.join(DIR, 'shots-v55'); fs.mkdirSync(SHOT, { recursive: true });
const makeApi = require('./gas-mock');
const A = makeApi({ code: CODE, html: HTML, registry: {}, web: {}, ssId: 'ssOtagawa', url: 'https://script.google.com/macros/s/otagawa/exec' });
const PORT = 9155, html = fs.readFileSync(HTML, 'utf8');
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
  async function open(vp, staff, lang){
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: vp.width < 600 ? 2 : 1, timezoneId: 'Asia/Tokyo', locale: 'ja-JP', hasTouch: vp.width < 600 });
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(A[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
    await ctx.addInitScript(([dk, lg]) => {
      if (dk) try { localStorage.setItem('sbw.dk', dk); } catch (e){}
      try { localStorage.setItem('sbw.lang', lg); } catch (e){}
      function mkRun(){ let s = () => {}, f = () => {}; const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; }; if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
      window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: { lang: lg }, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
    }, [staff ? st.dk : null, lang]);
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

  console.log('— Nhân viên · điện thoại —');
  const p = await open({ width: 390, height: 844 }, true, 'vi');
  const tabs = await p.evaluate(() => [...document.querySelectorAll('[data-stab]')].map(b => b.getAttribute('data-stab')));
  ok('thanh tab có 🏪 Quán', tabs.includes('office') && /Quán/.test(await p.evaluate(() => document.querySelector('[data-stab="office"]').textContent)), JSON.stringify(tabs));
  await p.click('[data-stab="office"]'); await W(p, 2500);
  ok('có khung 3D (tháng đã chốt vẫn vào được)', await p.locator('.ofc-stage canvas').count() === 1 && await p.locator('.st-locked-card').count() === 0);
  const filled = await p.evaluate(() => { const c = document.querySelector('.ofc-cv'); return c.width > 100 && c.height > 100; });
  ok('canvas có kích thước', filled);
  const tags = await p.evaluate(() => [...document.querySelectorAll('.ofc-tag')].filter(e => e.style.display !== 'none').map(e => e.textContent));
  ok('nhân vật trong ca có thẻ tên (≥ 4)', tags.length >= 4, JSON.stringify(tags));
  ok('ゆき (không có ca, đang mở app) ghé quán', tags.some(x => /ゆき/.test(x)), JSON.stringify(tags));
  ok('thẻ tên khách ghé có chấm xanh', await p.evaluate(() => [...document.querySelectorAll('.ofc-tag.is-visit')].some(e => /ゆき/.test(e.textContent))));
  const sum = await p.evaluate(() => document.getElementById('ofcSum').textContent);
  ok('dòng tóm tắt: đang làm / nghỉ / đang ghé', /đang làm/.test(sum) && /nghỉ/.test(sum) && /đang ghé/.test(sum), sum);
  const list = await p.evaluate(() => [...document.querySelectorAll('.ofc-row')].map(r => r.innerText.replace(/\s+/g, ' ')));
  ok('danh sách hôm nay có người + giờ ca', list.length >= 5 && list.some(x => /ヒエウ.*\(bạn\)/.test(x)), JSON.stringify(list));
  ok('ảnh nhỏ nhân vật (data:image/png)', await p.evaluate(() => /^data:image\/png/.test((document.querySelector('.ofc-row img') || {}).src || '')));
  const bub = await p.evaluate(() => [...document.querySelectorAll('.ofc-bub')].filter(e => e.style.display !== 'none').map(e => e.textContent));
  ok('tin vừa gửi hiện thành bong bóng trên đầu ラム', bub.some(x => /おつかれさま/.test(x)), JSON.stringify(bub));
  await p.screenshot({ path: path.join(SHOT, 'phone-staff.png') });
  // gửi tin
  await p.fill('#ofcTxt', 'がんばりましょう！'); await p.click('.ofc-send'); await W(p, 1200);
  const chat = A.officeState(sTok).chat.map(c => c.m);
  ok('gửi tin → máy chủ có tin', chat.includes('がんばりましょう！'), JSON.stringify(chat));
  // tạo nhân vật
  await p.click('#ofcMeBtn'); await W(p, 1200);
  ok('mở trình tạo nhân vật', await p.locator('.ave').count() === 1);
  await p.click('[data-avtab="1"]'); await W(p, 700);
  ok('ảnh tuỳ chọn được vẽ', await p.evaluate(() => [...document.querySelectorAll('[data-avth]')].filter(i => /^data:image/.test(i.src)).length) >= 3);
  await p.click('[data-avtab="2"]'); await W(p, 600);
  await p.click('[data-avf="hs"][data-avv="9"]'); await W(p, 300);
  await p.click('[data-avf="hc"][data-avv="4"]'); await W(p, 500);
  const locked = await p.evaluate(() => document.querySelectorAll('.ave-o.is-lock').length);
  ok('kiểu tóc cấp cao bị khoá', locked >= 1, locked);
  await p.screenshot({ path: path.join(SHOT, 'phone-editor.png') });
  await p.click('[data-avtab="6"]'); await W(p, 500);
  ok('tab Hiệu ứng: cấp cao bị khoá', await p.evaluate(() => document.querySelectorAll('[data-avf="ef"].is-lock').length) === 4);
  await p.click('#mOk'); await W(p, 1500);
  ok('lưu nhân vật lên máy chủ', A.officeState(sTok).av.hs === 9 && A.officeState(sTok).av.hc === 4, JSON.stringify(A.officeState(sTok).av));
  // thành tích
  await p.click('#ofcLvBtn'); await W(p, 1000);
  ok('mở bảng thành tích', await p.locator('.ofc-ach').count() === 1 && await p.locator('.ofc-badge').count() === 7);
  await p.screenshot({ path: path.join(SHOT, 'phone-ach.png') });
  await p.keyboard.press('Escape'); await W(p, 400);
  await p.click('#ofcBoardBtn'); await W(p, 900);
  ok('mở bảng tin', await p.locator('.ofc-bd').count() === 1);
  await p.keyboard.press('Escape'); await W(p, 400);
  ok('không lỗi JS (nhân viên)', !p.errs.length, p.errs.join(' | '));

  console.log('— Quản lý · máy tính —');
  const m = await open({ width: 1360, height: 900 }, false, 'ja');
  ok('thanh tab quản lý có オフィス', await m.locator('[data-mtab="office"]').count() === 1);
  await m.click('[data-mtab="office"]'); await W(m, 2800);
  const px = await glOk(m);
  ok('3D vẽ ra điểm ảnh', typeof px === 'number' && px >= 5, px);
  const mtags = await m.evaluate(() => [...document.querySelectorAll('.ofc-tag')].filter(e => e.style.display !== 'none').map(e => e.textContent));
  ok('quản lý thấy cả nhân vật 店長', mtags.some(x => /店長/.test(x)), JSON.stringify(mtags));
  ok('người đang nghỉ giải lao có ☕ (ngồi phòng nghỉ)', mtags.some(x => /たろう ☕/.test(x)), JSON.stringify(mtags));
  await m.screenshot({ path: path.join(SHOT, 'pc-manager.png') });
  // chạm vào một nhân vật → thẻ người
  const hit = await m.evaluate(() => { const sc = window.__ofcDbg && window.__ofcDbg(); return sc; });
  await m.click('.ofc-row >> nth=0'); await W(m, 800);
  ok('bấm dòng danh sách → thẻ người', await m.locator('.ofc-card').count() === 1);
  await m.keyboard.press('Escape'); await W(m, 300);
  // quay camera + phóng to
  await m.click('[data-ofcctl="l"]'); await m.click('[data-ofcctl="+"]'); await W(m, 900);
  await m.screenshot({ path: path.join(SHOT, 'pc-rotated.png') });
  // về tab khác rồi quay lại: không dựng lại cảnh, vòng vẽ chạy lại
  await m.click('[data-mtab="day"]'); await W(m, 800);
  ok('rời tab: không còn khung 3D trong trang', await m.locator('.ofc-cv').count() === 0);
  await m.click('[data-mtab="office"]'); await W(m, 1500);
  ok('quay lại: vẽ tiếp', (await glOk(m)) >= 5);
  ok('không lỗi JS (quản lý)', !m.errs.length, m.errs.join(' | '));

  console.log('— Tiếng Anh · điện thoại tối —');
  const e = await open({ width: 390, height: 844 }, true, 'en');
  await e.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await e.click('[data-stab="office"]'); await W(e, 2200);
  ok('tab Office (en)', /working|Nobody/.test(await e.evaluate(() => document.getElementById('ofcSum').textContent)));
  await e.screenshot({ path: path.join(SHOT, 'phone-dark-en.png') });
  ok('không lỗi JS (en)', !e.errs.length, e.errs.join(' | '));

  await browser.close(); server.close();
  console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('HARNESS', e); process.exit(2); });
