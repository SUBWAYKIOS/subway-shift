// v2026.11.06.1 — báo cáo chủ quán: giao diện điện thoại/PC, giờ người chi viện, link chỉ xem cho chủ quán.
// Chạy: node tests/v57rep.js [Index.html] [Code.gs]   (ảnh: tests/shots-v57/)
// Số liệu: nếu có tests/local/*.csv (file WingArc thật — KHÔNG đưa lên GitHub) thì dùng, không thì dùng tests/fixtures.
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
const SHOT = path.join(DIR, 'shots-v57'); fs.mkdirSync(SHOT, { recursive: true });
const makeApi = require('./gas-mock');
const A = makeApi({ code: CODE, html: HTML, registry: {}, web: {}, ssId: 'ssOtagawa', url: 'https://script.google.com/macros/s/otagawa/exec' });
const PORT = 9161, html = fs.readFileSync(HTML, 'utf8');
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const W = (p, ms) => p.waitForTimeout(ms);
(async () => {
  await new Promise(r => server.listen(PORT, r));
  let t = A.loginManager('subway1111').token; A.changeManagerPassword(t, 'subway1111', 'Otagawa2026x'); t = A.loginManager('Otagawa2026x').token;
  A.saveSettings(t, JSON.stringify({ storeName: 'SUBWAY フォレストモール東海太田川店', wage: 1150 }));
  const E = [['e1', 'ヒエウ'], ['e2', 'ラム'], ['e3', 'まい'], ['e4', 'ともみ'], ['e5', 'たろう'], ['e6', 'ゆき'], ['e7', 'はると'], ['e8', 'さくら']].map(x => ({ id: x[0] + 'aaaa', name: x[1] }));
  A.saveEmployees(t, JSON.stringify(E));
  const YM = A.ymShift_(A.todayStr_().slice(0, 7), -1), Y = +YM.slice(0, 4), M = +YM.slice(5, 7), ND = new Date(Y, M, 0).getDate();
  // lịch cả tháng: mỗi ngày 4–5 người
  for (let d = 1; d <= ND; d++) E.forEach((e, i) => { if ((d + i) % 3 === 0) return; A.saveShiftEntry(t, YM, d, e.id, { off: false, shifts: [{ start: 9 + (i % 3) * 2, end: 15 + (i % 3) * 3, breakStart: 12.5 + (i % 2), breakEnd: 13 + (i % 2) }] }); });
  // ラム đi chi viện quán khác ngày 5 (không tính vào quán này)
  A.saveShiftEntry(t, YM, 5, 'e2aaaa', { off: false, shifts: [{ start: 10, end: 16, isSupport: true, supTo: { id: 'ssCentrair', name: 'セントレア' } }] });
  // người quán khác tới chi viện (giả lập mạng các quán)
  A.hubOn_ = () => true; A.supMe_ = () => ({ id: 'ssOtagawa', name: 'FOR', code: 'FOR' });
  A.supScan_ = (ym) => ym !== YM ? {} : { '3': [{ store: 'ssCentrair', storeName: 'SUBWAY セントレア', empId: 'c1', empName: 'ミン', start: 10, end: 18, bs: 13, be: 14 }],
    '10': [{ store: 'ssCentrair', storeName: 'SUBWAY セントレア', empId: 'c1', empName: 'ミン', start: 11, end: 17 }, { store: 'ssTokoname', storeName: 'SUBWAY 常滑', empId: 'k9', empName: 'たかし', start: 17, end: 21 }] };
  // số liệu WingArc (file thật nếu có)
  const LOC = path.join(DIR, 'local'), real = fs.existsSync(path.join(LOC, 'oct-hourly.csv'));
  const dec = f => { const b = fs.readFileSync(f); try { return new TextDecoder('utf-8', { fatal: true }).decode(b); } catch (e){ return new TextDecoder('shift_jis').decode(b); } };
  if (real){
    const { botParse } = require(path.join(LOC, 'bp.cjs'));
    const h = botParse(dec(path.join(LOC, 'oct-hourly.csv')), 'x.csv'), src = h.months['2026-10'];
    const d = {}; Object.keys(src.d).forEach(k => { d[k] = Object.assign({}, src.d[k], { cust: Math.round(src.d[k].rev / 1350), eat: Math.round(src.d[k].rev * 0.27), take: Math.round(src.d[k].rev * 0.66), deli: Math.round(src.d[k].rev * 0.07) }); });
    const k = A.waBotKey(t, true).key;
    A.waBotImport(k, JSON.stringify({ months: { [YM]: { d } } }));
    const { waParse } = require('/mnt/user-data/outputs/wingarc-bot/wa-parse.cjs');
    const it = waParse(dec(path.join(LOC, 'oct-items.csv')), 'x.csv');
    A.posImport(t, YM, JSON.stringify({ it: it.it }));
    console.log('  (dùng file WingArc thật tháng 10 cho tháng ' + YM + ')');
  } else {
    const k = A.waBotKey(t, true).key, d = {};
    for (let i = 1; i <= ND; i++) d[i] = { rev: 150000 + (i % 7) * 20000, cust: 110 + i, h: { 11: 20000, 12: 40000, 13: 25000 }, eat: 40000, take: 100000, deli: 10000 };
    A.waBotImport(k, JSON.stringify({ months: { [YM]: { d } } }));
  }

  console.log('— Máy chủ: giờ chi viện + link chủ quán —');
  const R = A.ownerReport(t, YM);
  ok('người quán khác tới chi viện được cộng (ミン 2 ngày, たかし 1 ngày)', R.guests.length === 2 && R.guests.find(g => g.name === 'ミン').days === 2 && Math.abs(R.guests.find(g => g.name === 'ミン').h - 13) < 0.01, JSON.stringify(R.guests));
  ok('giờ chi viện theo ngày', Math.abs((R.guestDay['10'] || 0) - 10) < 0.01, JSON.stringify(R.guestDay));
  ok('ca ラム đi chi viện không tính vào quán, ghi riêng', R.supOut.e2aaaa === 6 && !(R.sched.e2aaaa > 200), JSON.stringify(R.supOut));
  let L0 = A.ownerLink(t, '');
  ok('link chủ quán mặc định tắt', !L0.on);
  const L1 = A.ownerLink(t, 'new');
  ok('tạo link chủ quán', L1.on && L1.key.length > 30);
  const V = A.ownerView(L1.key, YM);
  ok('chủ quán xem được bằng link (không đăng nhập)', V.ok && V.r.ym === YM && V.d && V.months.includes(YM));
  let bad = null; try { A.ownerView(L1.key.slice(0, -1) + 'x', YM); } catch (e){ bad = e.message; }
  ok('link sai bị từ chối', /không còn hiệu lực/.test(bad || ''));
  const V2 = A.ownerView(L1.key, '2099-01');
  ok('tháng tương lai → về tháng hiện tại', V2.ym === A.todayStr_().slice(0, 7));
  ok('mở link không chọn tháng → tháng có số liệu gần nhất', A.ownerView(L1.key, '').ym === YM);
  const L2 = A.ownerLink(t, 'new'); bad = null; try { A.ownerView(L1.key, YM); } catch (e){ bad = e.message; }
  ok('đổi link → link cũ hết hiệu lực', !!bad && L2.key !== L1.key);
  // Tenchou không được tạo link / sửa giờ chấm công
  ok('Tenchou bị chặn ownerLink / attEdit / hlMonth', ['ownerLink', 'attEdit', 'hlMonth', 'surveyResults', 'selfCheck'].every(f => A.TENCHOU_DENY_.test(f)));
  let noTok = null; try { A.ownerLink('', 'new'); } catch (e){ noTok = e.message; }
  ok('ownerLink cần đăng nhập quản lý', !!noTok);

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  async function open(vp, opt){
    opt = opt || {};
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: vp.width < 600 ? 2 : 1, timezoneId: 'Asia/Tokyo', locale: 'ja-JP', hasTouch: vp.width < 600 });
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(A[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
    await ctx.addInitScript(([lg, prm]) => {
      try { localStorage.setItem('sbw.lang', lg); } catch (e){}
      function mkRun(){ let s = () => {}, f = () => {}; const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; }; if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
      window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: Object.assign({ lang: lg }, prm || {}), hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
    }, [opt.lang || 'vi', opt.prm || null]);
    await p.goto('http://127.0.0.1:' + PORT + '/'); await W(p, 1200);
    if (opt.owner) return p;
    await p.click('[data-ltab="manager"]'); await W(p, 200); await p.fill('#mgrPwd', 'Otagawa2026x'); await p.click('#mgrLoginBtn');
    await p.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 });
    await W(p, 1500);
    for (let i = 0; i < 4 && await p.locator('.modal-back').count(); i++){ await p.keyboard.press('Escape'); await W(p, 250); }
    // về tháng trước (tháng có số liệu)
    await p.evaluate(() => document.querySelector('[data-mtab="month"]').click()); await W(p, 1200);
    await p.evaluate(() => { const b = document.querySelector('[data-mnav="-1"], #prevMonth, .month-nav .prev, [data-act="prevMonth"]'); if (b) b.click(); }); await W(p, 1800);
    return p;
  }
  async function toOwnerBox(p){
    await p.evaluate(() => { const g = document.querySelector('[data-grp="sales"]'); if (g) g.click(); }); await W(p, 700);
    await p.evaluate(() => { const b = document.getElementById('orBox'); if (b) b.scrollIntoView({ block: 'center' }); }); await W(p, 400);
  }
  for (const [nm, vp] of [['phone', { width: 390, height: 844 }], ['pc', { width: 1360, height: 900 }]]){
    console.log('— ' + nm + ' —');
    const m = await open(vp);
    await toOwnerBox(m);
    ok(nm + ': có ô báo cáo chủ quán', await m.locator('#orBox').count() === 1);
    const ov = await m.evaluate(() => { const b = document.getElementById('orBox'); if (!b) return 'none'; const r = b.getBoundingClientRect(), bad = [];
      b.querySelectorAll('button,label,.or-lang').forEach(x => { const q = x.getBoundingClientRect(); if (q.right > r.right + 1 || q.left < r.left - 1) bad.push(x.textContent.trim().slice(0, 20)); if (x.scrollWidth > x.clientWidth + 2) bad.push('cắt chữ: ' + x.textContent.trim().slice(0, 20)); });
      return bad.join(' | '); });
    ok(nm + ': nút trong ô không tràn / không cắt chữ', !ov, ov);
    await m.locator('#orBox').screenshot({ path: path.join(SHOT, nm + '-ticket.png') });
    await m.click('[data-orep="open"]'); await W(m, 3500);
    ok(nm + ': mở báo cáo 3 trang', await m.locator('.doc-prev .or-a4').count() === 3);
    const lay = await m.evaluate(() => { const mo = document.querySelector('.doc-modal .modal, .doc-modal [role=dialog], .doc-modal > div'); const r = (mo || document.body).getBoundingClientRect();
      const pages = [...document.querySelectorAll('.doc-prev .or-a4')].map(pg => ({ sh: pg.scrollHeight, ch: pg.clientHeight, w: pg.scrollWidth, cw: pg.clientWidth }));
      scrollTo(200, scrollY); const sx = scrollX; scrollTo(0, scrollY); return { left: r.left, right: r.right, vw: innerWidth, docW: sx ? document.documentElement.scrollWidth : innerWidth, pages }; });
    ok(nm + ': hộp xem trước nằm gọn trong màn hình', lay.left >= -1 && lay.right <= lay.vw + 1 && lay.docW <= lay.vw + 1, JSON.stringify(lay));
    ok(nm + ': nội dung từng trang không tràn khổ A4', lay.pages.every(x => x.sh <= x.ch + 2 && x.w <= x.cw + 2), JSON.stringify(lay.pages));
    const txt = await m.evaluate(() => document.querySelector('.doc-prev').innerText);
    ok(nm + ': có dòng người chi viện (ミン · セントレア)', /ミン/.test(txt) && /セントレア/.test(txt), txt.slice(-500));
    await m.screenshot({ path: path.join(SHOT, nm + '-report.png') });
    if (nm === 'pc'){ const pg = await m.$$('.doc-prev .or-a4'); for (let i = 0; i < pg.length; i++) await pg[i].screenshot({ path: path.join(SHOT, 'report-p' + (i + 1) + '.png') }); }
    await m.keyboard.press('Escape'); await W(m, 500);
    // hộp link chủ quán
    await m.click('[data-orep="link"]'); await W(m, 1500);
    const lk = await m.evaluate(() => { const i = document.querySelector('#orLinkUrl'); return i ? i.value : ''; });
    ok(nm + ': hộp link chủ quán hiện link', /[?&]or=o[0-9a-f]{40}/.test(lk), lk);
    await m.screenshot({ path: path.join(SHOT, nm + '-link.png') });
    ok(nm + ': không lỗi JS', !m.errs.length, m.errs.join(' | '));
    await m.close();
  }
  console.log('— Trang chủ quán (mở link) —');
  const key = A.ownerLink(t, '').key;
  for (const [nm, vp] of [['phone', { width: 390, height: 844 }], ['pc', { width: 1360, height: 900 }]]){
    const o = await open(vp, { owner: true, lang: 'ja', prm: { or: key } }); await W(o, 2500);
    ok(nm + ': trang chủ quán hiện báo cáo (không cần đăng nhập)', await o.locator('.or-view .or-a4').count() === 3, await o.evaluate(() => document.body.innerText.slice(0, 200)));
    ok(nm + ': không hiện màn đăng nhập', !(await o.locator('#mgrPwd').count()));
    const sel = await o.locator('#orvMonth option').count();
    ok(nm + ': chọn được tháng', sel >= 2);
    const lay = await o.evaluate(() => ({ docW: document.documentElement.scrollWidth, vw: innerWidth }));
    ok(nm + ': trang chủ quán không tràn ngang', lay.docW <= lay.vw + 1, JSON.stringify(lay));
    await o.screenshot({ path: path.join(SHOT, nm + '-owner.png') });
    if (nm === 'phone'){ await o.screenshot({ path: path.join(SHOT, nm + '-owner-full.png'), fullPage: true }); }
    ok(nm + ': trang chủ quán không lỗi JS', !o.errs.length, o.errs.join(' | '));
    await o.close();
  }
  const ob = await open({ width: 390, height: 844 }, { owner: true, lang: 'ja', prm: { or: 'o' + 'f'.repeat(key.length - 1) } }); await W(ob, 2000);
  ok('link sai: báo không còn hiệu lực', /無効|hiệu lực|no longer/i.test(await ob.evaluate(() => document.body.innerText)), await ob.evaluate(() => document.body.innerText.slice(0, 200)));
  await ob.screenshot({ path: path.join(SHOT, 'phone-owner-bad.png') });

  await browser.close(); server.close();
  console.log('\nv57rep ĐẠT: ' + pass + '   ·   LỖI: ' + fail); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('HARNESS', e); process.exit(2); });
