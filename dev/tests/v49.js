// v2026.10.28.3 — theo dõi link mới / link cũ / thông báo + thẻ mời chuyển link cho nhân viên. Chạy: node tests/v49.js
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
const api = require('./gas-mock')({ code: CODE, html: HTML });
const PORT = 9079, html = fs.readFileSync(HTML, 'utf8');
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const W = (p, ms) => p.waitForTimeout(ms), SH = n => path.join(DIR, 'sh', 'v49-' + n + '.png');
(async () => {
  let tok = api.loginManager('subway1111').token; tok = api.changeManagerPassword(tok, 'subway1111', 'Otagawa2026x').token;
  api.saveEmployees(tok, JSON.stringify([{ id: 'e1aaaa', name: 'ヒエウ' }, { id: 'e2bbbb', name: 'ラム' }, { id: 'e3cccc', name: 'まい' }, { id: 'e4dddd', name: 'タン' }]));
  const YM = api.jstDateStr_(0).slice(0, 7);
  const tk = {};
  [['e1aaaa', '284611'], ['e2bbbb', '284612'], ['e3cccc', '284613']].forEach(([id, pin]) => { const c = api.issueClaimCode(tok, id); tk[id] = api.claimEmployee(id, pin, true, 'iPhone', c.code); });
  console.log('— Máy chủ —');
  // ヒエウ mở bằng link mới (gọi qua rpcHandle_ như trang GitHub), ラム bằng link cũ, まい cả hai (gần nhất: link cũ)
  const viaGh = (t) => { const r = api.rpcHandle_({ fn: 'loadMonth', args: [t, YM] }); api.CALL_VIA_ = 'gas'; return r; };
  ok('mở qua trang GitHub (rpc) chạy bình thường', viaGh(tk.e1aaaa.token).ok === 1);
  api.loadMonth(tk.e2bbbb.token, YM);
  viaGh(tk.e3cccc.token);
  const P = api.PropertiesService.getScriptProperties(), sm = JSON.parse(P.getProperty('seenMap'));
  sm.e3cccc.gas = Date.now() + 1000; P.setProperty('seenMap', JSON.stringify(sm));
  api.kvSet_('push', JSON.stringify({ subs: [{ w: 'e1aaaa', ep: 'https://fcm.googleapis.com/x1', at: Date.now(), ua: 'iPhone' }, { w: 'm', ep: 'https://fcm.googleapis.com/m1', at: 1 }], pref: { e1aaaa: { tm: 0 } }, cfg: {} }));
  P.setProperty('FRONT_URL', 'https://subwaykios.github.io/subway-shift/app.html?s=FOR');
  const L = api.linkStatus(tok), by = Object.fromEntries(L.list.map(x => [x.id, x]));
  ok('ヒエウ: link mới, 1 máy bật thông báo, tắt nhắc ca mai', by.e1aaaa.gh > 0 && !by.e1aaaa.gas && by.e1aaaa.push === 1 && by.e1aaaa.tm === false, JSON.stringify(by.e1aaaa));
  ok('ラム: link cũ, chưa bật thông báo', by.e2bbbb.gas > 0 && !by.e2bbbb.gh && by.e2bbbb.push === 0);
  ok('まい: dùng cả hai, gần nhất là link cũ', by.e3cccc.gh > 0 && by.e3cccc.gas > by.e3cccc.gh);
  ok('タン: chưa mở app', !by.e4dddd.gh && !by.e4dddd.gas);
  ok('trả link GitHub của quán + mốc bắt đầu theo dõi + số máy quản lý', /github\.io/.test(L.front) && L.since > 0 && L.mgrPush === 1);
  ok('nhân viên không xem được', /quản lý/i.test((() => { try { api.linkStatus(tk.e1aaaa.token); return ''; } catch (e) { return e.message; } })()));
  ok('dữ liệu tháng có link GitHub (để mời chuyển)', /github\.io/.test(api.loadMonth(tk.e2bbbb.token, YM).front));

  console.log('— Giao diện —');
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  async function open(w, h, dk){
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, timezoneId: 'Asia/Tokyo', locale: 'vi-VN' });
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await ctx.exposeFunction('__callServer', async (fn, a) => { try { const v = api[fn](...a); api.CALL_VIA_ = 'gas'; return { ok: true, v: JSON.parse(JSON.stringify(v ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
    await ctx.addInitScript(dk => {
      function mkRun(){ let s = () => {}, f = () => {};
        const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; };
          if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
      window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: { lang: 'vi' }, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
      try { if (dk) localStorage.setItem('sbw.dk', dk); } catch (e){}
    }, dk || '');
    await p.goto('http://127.0.0.1:' + PORT + '/'); await W(p, 1500);
    return p;
  }
  const esc = async p => { for (let i = 0; i < 4 && await p.locator('.modal-back').count(); i++){ await p.keyboard.press('Escape'); await W(p, 250); } };
  const m = await open(1100, 900);
  await m.click('[data-ltab="manager"]'); await W(m, 250);
  await m.fill('#mgrPwd', 'Otagawa2026x'); await m.click('#mgrLoginBtn');
  await m.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 }); await W(m, 1200); await esc(m);
  await m.click('[data-mtab="month"]'); await W(m, 1200); await esc(m);
  await m.evaluate(() => document.querySelector('[data-combo="peopleBox"][data-cp="link"]').click()); await W(m, 1200);
  const st = await m.locator('#lkBox .lk-stat').allInnerTexts();
  ok('4 ô tổng: link mới 1/4 · link cũ 2/4 · chưa mở 1/4 · thông báo 1/4', st.length === 4 && /^1\/4/.test(st[0].replace(/\s/g, '')) && /^2\/4/.test(st[1].replace(/\s/g, '')) && /^1\/4/.test(st[2].replace(/\s/g, '')) && /^1\/4/.test(st[3].replace(/\s/g, '')), JSON.stringify(st));
  const rows = await m.locator('#lkBox .lk-row').allInnerTexts();
  ok('người còn link cũ xếp lên đầu', /Link cũ/.test(rows[0]) && /Link cũ/.test(rows[1]) && /Link mới/.test(rows[3]), JSON.stringify(rows));
  await m.locator('#lkBox').screenshot({ path: SH('tracker') });
  await m.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await m.click('#lkBox [data-lkmsg]'); await W(m, 400);
  const clip = await m.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  ok('chép tin nhắn LINE: có link GitHub + tên người chưa xong', /github\.io/.test(clip) && /ラム/.test(clip) && /タン/.test(clip) && !/ヒエウ/.test(clip), clip);
  ok('quản lý: không lỗi JS', !m.errs.length, m.errs.join(' | '));
  const s = await open(390, 844, tk.e2bbbb.dk); await esc(s);
  await s.evaluate(() => { const b = document.querySelector('[data-stab="today"]'); if (b) b.click(); }); await W(s, 1000);
  ok('nhân viên mở bằng link cũ → thẻ "App lịch làm đã có link mới"', await s.locator('[data-lkmove]').count() === 1);
  await s.screenshot({ path: SH('staff-card') });
  await s.click('[data-lkmove]'); await W(s, 800);
  const href = await s.locator('.modal-back .lk-go').getAttribute('href').catch(() => '');
  ok('bấm → nút "Mở app mới" là link GitHub có sẵn khoá đăng nhập (dk=)', /github\.io.*[?&]dk=/.test(href), href);
  await s.locator('.modal-back .modal-box').last().screenshot({ path: SH('staff-move') });
  ok('nhân viên: không lỗi JS', !s.errs.length, s.errs.join(' | '));
  await browser.close(); server.close();
  console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('HARNESS', e); process.exit(2); });
