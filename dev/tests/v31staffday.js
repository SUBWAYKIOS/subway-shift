// v2026.10.16.14 — tab 今日 của nhân viên: hôm nay nghỉ vẫn xem được ai ở tiệm; lùi về ngày cũ; chọn ngày bất kỳ.
// + lỗi đợt 3: hộp thoại bắt buộc không có ‹ Quay lại, Esc của tìm nhanh, Hoàn tác sau khi đã chốt.
// Chạy: node tests/v31staffday.js [Index.html] [Code.gs]   (SHOT=1 → chụp ảnh vào tests/sh/)
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
const TAG = process.env.TAG || 'after', SHOT = !!process.env.SHOT, OLD = !!process.env.OLD;
const api = require('./gas-mock')({ code: CODE, html: HTML });
let html = fs.readFileSync(HTML, 'utf8');
if (!OLD) html = html.replace('function uiDialog(o', 'window.__T={s:function(){return state},uiDialog:uiDialog,undoDelete:undoDelete,showToast:showToast,qsOpen:qsOpen,renderManager:renderManager};function uiDialog(o');
const PORT = 9041;
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const W = (p, ms) => p.waitForTimeout(ms);
fs.mkdirSync(path.join(DIR, 'sh'), { recursive: true });

(async () => {
  await new Promise(r => server.listen(PORT, r));
  let tok = api.loginManager('subway1111').token;
  const ch = api.changeManagerPassword(tok, 'subway1111', 'Otagawa2026x');
  tok = (ch && ch.token) || api.loginManager('Otagawa2026x').token;
  const E1 = 'e1aaaa', E2 = 'e2bbbb', E3 = 'e3cccc';
  api.saveEmployees(tok, JSON.stringify([{ id: E1, name: 'ヒエウ' }, { id: E2, name: 'ラム' }, { id: E3, name: 'まい' }]));
  const JST = api.jstDateStr_(0), YM = JST.slice(0, 7), D = +JST.slice(8, 10);
  const nDays = new Date(+YM.slice(0, 4), +YM.slice(5, 7), 0).getDate();
  const PD = D > 1 ? D - 1 : null, NX = D + 2 <= nDays ? D + 2 : null;
  api.saveShiftEntry(tok, YM, D, E1, { off: false, shifts: [{ start: 9, end: 15 }] });
  api.saveShiftEntry(tok, YM, D, E3, { off: false, shifts: [{ start: 12, end: 18 }] });
  if (PD){ api.saveShiftEntry(tok, YM, PD, E2, { off: false, shifts: [{ start: 10, end: 14 }] }); api.saveShiftEntry(tok, YM, PD, E1, { off: false, shifts: [{ start: 12, end: 18 }] }); }
  if (NX){ api.saveShiftEntry(tok, YM, NX, E2, { off: false, shifts: [{ start: 11, end: 16 }] }); api.saveShiftEntry(tok, YM, NX, E3, { off: false, shifts: [{ start: 9, end: 13 }] }); }
  api.setMonthLock(tok, YM, true, '{}', 'all');

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  async function mk(w, h){
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, timezoneId: 'Asia/Tokyo', locale: 'ja-JP', deviceScaleFactor: 1 });
    const p = await ctx.newPage(); p.jsErr = []; p.on('pageerror', e => p.jsErr.push(e.message));
    await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(api[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
    await ctx.addInitScript(() => {
      function mkRun(){ let s = () => {}, f = () => {};
        const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; };
          if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
      window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: {}, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
    });
    await p.goto('http://127.0.0.1:' + PORT + '/'); await W(p, 1200);
    return p;
  }
  async function staffLogin(p, id, pin){
    await p.click('[data-ltab="staff"]').catch(() => {}); await W(p, 200);
    await p.click('[data-who="' + id + '"]'); await W(p, 300);
    if (await p.locator('#pin0').isVisible().catch(() => false)) await p.fill('#pin0', api.issueClaimCode(tok, id).code);   // v41: mã đăng ký
    await p.fill('#pin1', pin); if (await p.locator('#pin2').isVisible()) await p.fill('#pin2', pin);
    await p.click('#authOk');
    await p.waitForFunction(() => !!document.querySelector('[data-stab]'), null, { timeout: 20000 }); await W(p, 900);
    for (let i = 0; i < 4 && await p.locator('.modal-back').count(); i++){ await p.keyboard.press('Escape'); await W(p, 250); }
    await p.click('[data-stab="today"]'); await W(p, 700);
  }
  const card = p => p.locator('.st-card.next-shift').first().innerText().catch(() => '');
  const team = p => p.locator('.st-seg-card').first().innerText().catch(() => '');

  console.log('— Tab 今日 của nhân viên (hôm nay ラム nghỉ) —');
  const m = await mk(390, 844);
  await staffLogin(m, E2, '284619');
  if (SHOT) await m.screenshot({ path: path.join(DIR, 'sh', 'v31-' + TAG + '-today.png'), fullPage: false });
  const c0 = await card(m), t0 = await team(m);
  if (OLD){ console.log('   [bản cũ] thẻ: ' + c0.replace(/\s+/g, ' ').slice(0, 120)); console.log('   [bản cũ] khung: ' + t0.replace(/\s+/g, ' ').slice(0, 160)); }
  else {
    ok('thẻ nói về HÔM NAY: "今日はシフトがありません"', /今日/.test(c0) && /シフトがありません/.test(c0), c0);
    if (NX) ok('dòng "次のシフト" của ngày ' + NX + ' (11:00–16:00)', /次のシフト/.test(c0) && /11:00/.test(c0), c0);
    ok('khung người = hôm nay: お店 + ヒエウ + まい', /お店/.test(t0) && /ヒエウ/.test(t0) && /まい/.test(t0), t0);
    if (PD){
      await m.click('[data-stoff="-1"]'); await W(m, 700);
      const c1 = await card(m), t1 = await team(m);
      ok('‹ → HÔM QUA (ngày ' + PD + '), ca 10:00–14:00', /昨日/.test(c1) && /10:00/.test(c1), c1);
      ok('hôm qua mình có làm → "メンバー" gồm ヒエウ', /メンバー/.test(t1) && /ヒエウ/.test(t1), t1);
    }
    // chọn ngày bất kỳ bằng ô ngày
    const target = PD && PD > 1 ? 1 : (NX || D);
    await m.evaluate(v => { const i = document.getElementById('stDatePick'); i.value = v; i.dispatchEvent(new Event('change', { bubbles: true })); }, YM + '-' + String(target).padStart(2, '0'));
    await W(m, 800);
    const c2 = await card(m);
    ok('chọn ngày ' + target + ' bằng ô lịch → thẻ hiện đúng ngày', new RegExp('(^|\\D)' + (+YM.slice(5, 7)) + '/' + target + '\\D').test(c2), c2);
    // lùi sang tháng trước (xem ngày cũ của tháng trước)
    const prevYm = (() => { const y = +YM.slice(0, 4), mo = +YM.slice(5, 7); return mo === 1 ? (y - 1) + '-12' : y + '-' + String(mo - 1).padStart(2, '0'); })();
    await m.evaluate(v => { const i = document.getElementById('stDatePick'); i.value = v; i.dispatchEvent(new Event('change', { bubbles: true })); }, prevYm + '-15');
    await W(m, 1500);
    const c3 = await card(m);
    ok('chọn ngày 15 tháng trước → mở được ngày cũ', new RegExp((+prevYm.slice(5, 7)) + '/15').test(c3), c3);
    await m.click('.sdn-today'); await W(m, 1200);
    ok('bấm 今日 → về lại hôm nay', /今日/.test(await card(m)) && await m.evaluate(() => !__T.s().stOff));
    if (NX){ await m.click('.st-nextline'); await W(m, 700); ok('bấm dòng ca tiếp theo → nhảy tới ngày ' + NX, /11:00/.test(await card(m)) && /16:00/.test(await card(m)), await card(m)); }
    if (SHOT){ await m.click('.sdn-today').catch(() => {}); await W(m, 700); }
    ok('không lỗi JS (nhân viên)', m.jsErr.length === 0, m.jsErr.join(' | '));
  }

  if (!OLD){
    console.log('— Lỗi đợt 3 —');
    const g = await mk(1280, 900);
    await g.click('[data-ltab="manager"]'); await W(g, 200);
    await g.fill('#mgrPwd', 'Otagawa2026x'); await g.click('#mgrLoginBtn');
    await g.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 }); await W(g, 900);
    for (let i = 0; i < 4 && await g.locator('.modal-back').count(); i++){ await g.keyboard.press('Escape'); await W(g, 250); }
    // B1: hộp bắt buộc mở chồng lên hộp khác → không có ‹ Quay lại
    await g.evaluate(() => { __T.uiDialog({ title: 'A', html: '<p id="pa">A</p>' }); }); await W(g, 300);
    await g.evaluate(() => { __T.uiDialog({ title: 'PIN', html: '<p>bắt buộc</p>', noDismiss: true }); }); await W(g, 300);
    ok('hộp bắt buộc (noDismiss) không có nút ‹ Quay lại', await g.locator('.modal-back:visible .m-back').count() === 0);
    await g.keyboard.press('Escape'); await W(g, 300);
    ok('Esc không đóng được hộp bắt buộc', await g.locator('.modal-back:visible').count() === 1);
    await g.click('.modal-back:visible #mOk'); await W(g, 400);
    ok('đóng hộp con → hộp A hiện lại, con trỏ ở trong hộp A', await g.locator('#pa').count() === 1 && await g.evaluate(() => !!document.activeElement.closest('.modal-back')));
    await g.keyboard.press('Escape'); await W(g, 300);
    // B4: đang mở app, Esc trong tìm nhanh chỉ đóng tìm nhanh
    await g.click('[data-mtab="month"]'); await W(g, 800);
    await g.evaluate(() => { const s = __T.s(); s.openApp = 'month:peopleBox'; s.combo = s.combo || {}; s.combo.peopleBox = 'list'; __T.renderManager(); }); await W(g, 700);
    const appOpen = () => g.evaluate(() => __T.s().openApp);
    await g.evaluate(() => __T.qsOpen()); await W(g, 300);
    await g.keyboard.press('Escape'); await W(g, 300);
    ok('Esc đóng tìm nhanh nhưng app 👥 vẫn mở', await g.locator('.qs-ov').count() === 0 && (await appOpen()) === 'month:peopleBox', await appOpen());
    await g.keyboard.press('Escape'); await W(g, 300);
    // B3: Hoàn tác sau khi lệnh xoá đã được gửi (rời app) → báo rõ
    await g.evaluate(() => { window.__c = 0; __T.undoDelete({ msg: 'x', apply(){}, revert(){ window.__r = 1; }, commit(){ window.__c++; } }); });
    await g.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await W(g, 200);
    await g.locator('#toast button').last().click().catch(() => {}); await W(g, 300);
    const tt = await g.locator('#toast').innerText().catch(() => '');
    ok('rời app → lệnh xoá gửi ngay; bấm 元に戻す → báo "保存済み"', (await g.evaluate(() => window.__c)) === 1 && /保存済み/.test(tt), tt);
    ok('không lỗi JS (quản lý)', g.jsErr.length === 0, g.jsErr.join(' | '));
  }
  await browser.close(); server.close();
  console.log('ĐẠT: ' + pass + '   ·   LỖI: ' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('HARNESS ' + e.stack); process.exit(2); });
