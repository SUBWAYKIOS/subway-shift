// v2026.11.06.2 — 🌤 thời tiết (気象庁) + 💴 chi phí / lãi lỗ / dự báo / hòa vốn + 📈 từ lúc mở tiệm.
// Chạy: node tests/v58.js [Index.html] [Code.gs]   (ảnh: tests/shots-v58/)  — số liệu thời tiết giả lập, không gọi mạng.
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
const SHOT = path.join(DIR, 'shots-v58'); fs.mkdirSync(SHOT, { recursive: true });
const makeApi = require('./gas-mock');
const A = makeApi({ code: CODE, html: HTML, registry: {}, web: {}, ssId: 'ssOtagawa', url: 'https://script.google.com/macros/s/otagawa/exec' });
const PORT = 9171, html = fs.readFileSync(HTML, 'utf8');
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const W = (p, ms) => p.waitForTimeout(ms);

// ---- thời tiết giả lập (đúng cấu trúc JSON của 気象庁) ----
const jst = (dd, hh) => { const t = new Date(Date.now() + 9 * 3600000 + dd * 86400000); return t.toISOString().slice(0, 10) + 'T' + String(hh).padStart(2, '0') + ':00:00+09:00'; };
const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10), hNow = new Date(Date.now() + 9 * 3600000).getUTCHours(), h0 = Math.floor(hNow / 3) * 3;
const slots = []; for (let i = 0; i < 10; i++){ const hh = h0 + i * 3; slots.push(jst(Math.floor(hh / 24), hh % 24)); }
const RAIN = process.env.WX_KIND || 'r';
const FIX = {
  VPFD: { firstAreaCode: '230010', publishingOffice: '名古屋地方気象台', areaTimeSeries: { timeDefines: slots.map(t => ({ dateTime: t, duration: 'PT3H' })), area: { name: '西部', code: '230010' },
    weather: slots.map((t, i) => RAIN === 's' ? '晴れ' : (i < 2 ? 'くもり' : i < 5 ? '雨' : '晴れ')) },
    pointTimeSeries: { timeDefines: slots.map(t => ({ dateTime: t })), pointNameJP: '名古屋', temperature: slots.map((t, i) => 16 - (i % 4)) } },
  FC: [{ timeSeries: [
      { timeDefines: [jst(0, 5), jst(1, 0)], areas: [{ area: { name: '西部', code: '230010' }, weatherCodes: [RAIN === 's' ? '100' : '313', '101'], weathers: ['くもり　後　雨', '晴れ'] }] },
      { timeDefines: [jst(0, 6), jst(0, 12), jst(0, 18), jst(1, 0)], areas: [{ area: { name: '西部', code: '230010' }, pops: ['20', '70', '60', '10'] }] },
      { timeDefines: [jst(0, 9), jst(0, 0), jst(1, 0), jst(1, 9)], areas: [{ area: { name: '名古屋', code: '51106' }, temps: ['19', '19', '11', '18'] }] }] },
    { timeSeries: [
      { timeDefines: [0, 1, 2, 3, 4, 5, 6].map(i => jst(i, 0)), areas: [{ area: { name: '愛知県', code: '230000' }, weatherCodes: ['313', '101', '200', '300', '100', '100', '201'], pops: ['', '10', '30', '80', '0', '10', '20'] }] },
      { timeDefines: [0, 1, 2, 3, 4, 5, 6].map(i => jst(i, 0)), areas: [{ area: { name: '名古屋', code: '51106' }, tempsMin: ['', '11', '12', '13', '10', '9', '11'], tempsMax: ['', '18', '17', '15', '19', '20', '18'] }] }] }],
  TABLE: { '51106': { type: 'A', elems: '11111111', lat: [35, 10.0], lon: [136, 57.9], kjName: '名古屋' }, '51216': { type: 'C', elems: '11110000', lat: [35, 1.0], lon: [136, 54.0], kjName: '東海' }, '51999': { type: 'D', elems: '01000000', lat: [35, 1.2], lon: [136, 53.8], kjName: '雨量だけ' } },
  LATEST: today + 'T17:40:00+09:00',
  MAP: { '51216': { temp: [15.2, 0], precipitation1h: [RAIN === 's' ? 0 : 2.5, 0], humidity: [88, 0], wind: [3.1, 0] }, '51106': { temp: [16.0, 0] } }
};
let httpCalls = 0;
A.wxHttp_ = urls => urls.map(u => { httpCalls++;
  if (/VPFD/.test(u)) return JSON.stringify(FIX.VPFD); if (/forecast\/230000/.test(u)) return JSON.stringify(FIX.FC);
  if (/amedastable/.test(u)) return JSON.stringify(FIX.TABLE); if (/latest_time/.test(u)) return FIX.LATEST; if (/amedas\/data\/map\//.test(u)) return JSON.stringify(FIX.MAP); return null; });

(async () => {
  await new Promise(r => server.listen(PORT, r));
  let t = A.loginManager('subway1111').token; A.changeManagerPassword(t, 'subway1111', 'Otagawa2026x'); t = A.loginManager('Otagawa2026x').token;
  A.saveSettings(t, JSON.stringify({ storeName: 'SUBWAY フォレストモール東海太田川店', wage: 1150 }));
  const E = [['e1', 'ヒエウ'], ['e2', 'ラム'], ['e3', 'まい'], ['e4', 'ともみ'], ['e5', 'たろう']].map(x => ({ id: x[0] + 'aaaa', name: x[1] }));
  A.saveEmployees(t, JSON.stringify(E));
  const YM = A.todayStr_().slice(0, 7), D = +A.todayStr_().slice(8), ND = new Date(+YM.slice(0, 4), +YM.slice(5, 7), 0).getDate();
  // lịch cả tháng + doanh thu 3 tháng (2 tháng trước + tháng này tới hôm qua)
  for (let d = 1; d <= ND; d++) E.forEach((e, i) => { if ((d + i) % 3 === 0) return; A.saveShiftEntry(t, YM, d, e.id, { off: false, shifts: [{ start: 9 + (i % 3) * 2, end: 15 + (i % 3) * 3 }] }); });
  const k = A.waBotKey(t, true).key, mk = (ym, upto) => { const n = new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate(), d0 = {}; for (let d = 1; d <= Math.min(n, upto); d++){ const w = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1, d).getDay(); d0[d] = { rev: 150000 + (w === 0 || w === 6 ? 90000 : 0) + (d % 5) * 4000, cust: 110 + d, eat: 40000, take: 100000, deli: 12000, h: { 12: 40000, 13: 25000 } }; } return d0; };
  const M2 = A.ymShift_(YM, -2), M1 = A.ymShift_(YM, -1);
  A.saveShiftEntry(t, YM, D, 'e1aaaa', { off: false, shifts: [{ start: 10, end: 18, breakStart: 13, breakEnd: 14 }] });   // thẻ ca xanh (có ca hôm nay)
  const tomorrowYmd = new Date(Date.now() + 33 * 3600000).toISOString().slice(0, 10);
  A.waBotImport(k, JSON.stringify({ months: { [M2]: { d: mk(M2, 31) } } })); A.waBotImport(k, JSON.stringify({ months: { [M1]: { d: mk(M1, 31) } } }));
  A.waBotImport(k, JSON.stringify({ months: { [YM]: { d: mk(YM, Math.max(1, D - 1)) } } }));
  // nhật ký thời tiết vài ngày trước (để có bảng "thời tiết và doanh thu")
  A.kvSet_('wx:' + YM, JSON.stringify({ d: Object.fromEntries([...Array(Math.max(1, D - 1)).keys()].map(i => [String(i + 1), { k: (i % 4 === 1) ? 'r' : (i % 3 ? 's' : 'c'), hi: 18, lo: 10 }])) }), 't', true);

  console.log('— Máy chủ: thời tiết —');
  const cc = A.issueClaimCode(t, 'e1aaaa'); const st = A.claimEmployee('e1aaaa', '284619', true, 'iPhone', cc.code), sTok = A.bootstrap(st.dk).session.token;
  const w = A.wxGet(sTok);
  ok('nhân viên đọc được thời tiết', !!w && w.src === '気象庁');
  ok('3 giờ: 10 mốc, có nhiệt độ + loại', w.h3.length === 10 && w.h3[0].c === 16 && /[scrn]/.test(w.h3[0].k), JSON.stringify(w.h3[0]));
  ok('7 ngày + khả năng mưa', w.days.length === 7 && w.days[3].k === 'r' && w.days[3].pop === 80, JSON.stringify(w.days[3]));
  ok('trạm アメダス gần quán nhất (có đo nhiệt) = 東海', w.obs && w.obs.st === '東海' && w.obs.temp === 15.2, JSON.stringify(w.obs));
  const calls1 = httpCalls; A.wxGet(sTok);
  ok('nhớ tạm 30 phút: lần 2 không gọi mạng', httpCalls === calls1);
  ok('ghi nhật ký thời tiết hôm nay', (() => { const L = A.readJsonKey_('wx:' + YM).d[String(D)]; return L && L.hi === 15.2 && (RAIN === 's' || L.k === 'r'); })(), JSON.stringify(A.readJsonKey_('wx:' + YM).d[String(D)]));
  let bad = null; try { A.wxGet('xx'); } catch (e){ bad = e.message; } ok('chưa đăng nhập → không xem được', !!bad);

  console.log('— Máy chủ: chi phí + lịch sử —');
  const cs = A.costSave(t, JSON.stringify({ open: M2, items: { rent: 380000, common: 40000, royalty: 8, adfund: 2, util: 90000, net: 8000, card: 2.5, deli: 35, social: 15, commute: 30000, supplies: 25000, bogus: 9 }, extra: [{ n: '<b>清掃</b>', t: 'fix', v: 12000 }], target: 300000 }));
  ok('lưu chi phí (bỏ khoá lạ, lọc ký tự < >)', cs.items.rent === 380000 && !cs.items.bogus && cs.extra[0].n === 'b清掃/b' && cs.open === M2, JSON.stringify(cs));
  bad = null; try { A.costSave(t, JSON.stringify({ open: '2099-01' })); } catch (e){ bad = e.message; } ok('tháng mở tiệm tương lai bị từ chối', !!bad);
  ok('Tenchou không sửa được chi phí', A.TENCHOU_DENY_.test('costSave') && A.TENCHOU_DENY_.test('costGet'));
  bad = null; try { A.costGet(sTok); } catch (e){ bad = e.message; } ok('nhân viên không xem được chi phí', !!bad);
  const H = A.ownerHistory(t);
  ok('lịch sử từ tháng mở tiệm: 3 tháng', H.months.length === 3 && H.months[0].ym === M2 && H.months[0].rev > 0 && H.months[2].h > 0, JSON.stringify(H.months.map(x => [x.ym, x.rev, x.h])));
  ok('tháng đã qua: cache chỉ giữ giờ công, không giữ doanh thu', A.readJsonKey_('osum:' + M2).rev === undefined);
  { // bot lấy lùi tháng cũ (M2 − 1) → lịch sử tự mở rộng khi chưa đặt tháng mở tiệm; tháng đã cache vẫn thấy doanh thu mới
    const M0 = A.ymShift_(M2, -1), bk = k;
    A.waBotImport(bk, JSON.stringify({ months: { [M0]: { d: { 1: { rev: 111000, cust: 120 }, 2: { rev: 99000, cust: 101 } } } } }));
    A.waBotImport(bk, JSON.stringify({ months: { [M2]: { d: { 28: { rev: 77000, cust: 80 } } } } }));
    const before = H.months[0].rev;
    A.costSave(t, JSON.stringify(Object.assign({}, A.costGet(t), { open: M0 })));
    const H2 = A.ownerHistory(t);
    ok('bot lấy lùi tháng cũ → trang lịch sử có ngay (không chờ cache)', H2.months.length === 4 && H2.months[0].ym === M0 && H2.months[0].rev === 210000, JSON.stringify(H2.months.map(x => [x.ym, x.rev])));
    ok('tháng đã nhớ giờ công vẫn cập nhật doanh thu mới', H2.months[1].rev !== before && H2.months[1].h === H.months[0].h, before + ' → ' + H2.months[1].rev);
    A.costSave(t, JSON.stringify(Object.assign({}, A.costGet(t), { open: M2 })));
  }
  const L1 = A.ownerLink(t, 'new'), V = A.ownerView(L1.key, YM);
  ok('link chủ quán có lịch sử + chi phí + thời tiết', V.hist.length === 3 && V.r.costs.items.rent === 380000 && Object.keys(V.r.wx).length > 0);

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  async function open(vp, opt){
    opt = opt || {};
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: vp.width < 600 ? 2 : 1, timezoneId: 'Asia/Tokyo', locale: 'ja-JP', hasTouch: vp.width < 600, reducedMotion: opt.rm ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(A[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
    await ctx.addInitScript(([dk, lg, prm]) => {
      if (dk) try { localStorage.setItem('sbw.dk', dk); } catch (e){}
      try { localStorage.setItem('sbw.lang', lg); } catch (e){}
      function mkRun(){ let s = () => {}, f = () => {}; const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; }; if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
      window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: Object.assign({ lang: lg }, prm || {}), hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
    }, [opt.staff ? st.dk : null, opt.lang || 'vi', opt.prm || null]);
    await p.goto('http://127.0.0.1:' + PORT + '/'); await W(p, 1200);
    if (opt.owner) return p;
    if (!opt.staff){
      await p.click('[data-ltab="manager"]'); await W(p, 200); await p.fill('#mgrPwd', 'Otagawa2026x'); await p.click('#mgrLoginBtn');
      await p.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 });
    } else await p.waitForFunction(() => !!document.querySelector('[data-stab]'), null, { timeout: 20000 });
    await W(p, 1800);
    for (let i = 0; i < 4 && await p.locator('.modal-back').count(); i++){ await p.keyboard.press('Escape'); await W(p, 250); }
    return p;
  }
  const noOverflow = async (p, sel) => p.evaluate(s => { const b = document.querySelector(s); if (!b) return 'none'; const r = b.getBoundingClientRect(), bad = [];
    b.querySelectorAll('*').forEach(x => { const q = x.getBoundingClientRect(); if (q.width && (q.right > r.right + 1 || q.left < r.left - 1) && !x.closest('.wx-hrs')) bad.push(x.tagName + '.' + x.className); });
    scrollTo(200, scrollY); const sx = scrollX; scrollTo(0, scrollY); if (sx) bad.push('trang tràn ngang'); return bad.slice(0, 5).join(' | '); }, sel);

  for (const [nm, vp] of [['phone', { width: 390, height: 844 }], ['pc', { width: 1360, height: 900 }]]){
    console.log('— Nhân viên ' + nm + ' —');
    const s = await open(vp, { staff: true, lang: 'vi' });
    await s.evaluate(() => { const b = document.querySelector('[data-stab="today"]'); if (b) b.click(); }); await W(s, 1800);
    ok(nm + ': không còn thẻ thời tiết to trên trang', await s.locator('.app .wx-strip, #wxStrip').count() === 0 && await s.locator('.wx-strip:not(.in-dlg)').count() === 0);
    ok(nm + ': ô thời tiết nhỏ nằm trong thẻ ca', await s.locator('.st-card.next-shift .st-top-r .wx-mini').count() === 1, await s.evaluate(() => (document.querySelector('.st-card.next-shift') || {}).outerHTML?.slice(0, 300) || 'không có thẻ ca'));
    const geo = await s.evaluate(() => { const c = document.querySelector('.st-card.next-shift'), w = c.querySelector('.wx-mini'), r = w.getBoundingClientRect(), cr = c.getBoundingClientRect();
      const hit = [...c.querySelectorAll('.sdn-btn,.sdn-pick,.st-time,.ns-time,.st-sub')].filter(x => { const q = x.getBoundingClientRect(); return q.width && !(q.right <= r.left || q.left >= r.right || q.bottom <= r.top || q.top >= r.bottom); }).map(x => x.className);
      return { inCard: r.right <= cr.right + 0.5 && r.left >= cr.left && r.top >= cr.top, hit, h: Math.round(r.height), w: Math.round(r.width) }; });
    ok(nm + ': ô nhỏ gọn, nằm góc phải, không đè chữ / nút', geo.inCard && !geo.hit.length && geo.h <= 48 && geo.w <= 130, JSON.stringify(geo));
    await s.screenshot({ path: path.join(SHOT, nm + '-staff-today.png') });
    await s.locator('.st-card.next-shift').screenshot({ path: path.join(SHOT, nm + '-card.png') });
    ok(nm + ': lớp hiệu ứng nền (sau nội dung, không bắt chạm)', await s.evaluate(() => { const f = document.getElementById('wxFx'); if (!f) return false; const cs = getComputedStyle(f); return cs.pointerEvents === 'none' && Number(cs.zIndex) < 0; }));
    // bấm ô nhỏ → bảng chi tiết
    await s.click('.wx-mini'); await W(s, 600);
    ok(nm + ': bấm ô → bảng chi tiết (bây giờ · 3 giờ · 7 ngày)', await s.locator('.modal-back .wx-now').count() === 1 && await s.locator('.modal-back .wx-h').count() >= 4 && await s.locator('.modal-back .wx-d').count() === 7);
    ok(nm + ': lời khuyên khi có mưa (trong bảng chi tiết)', RAIN === 's' || /mưa/i.test(await s.locator('.modal-back .wx-ad').innerText().catch(() => '')));
    ok(nm + ': bảng chi tiết không tràn', !(await noOverflow(s, '.modal-back .wx-strip')), await noOverflow(s, '.modal-back .wx-strip'));
    await s.locator('.modal-back .modal-box').screenshot({ path: path.join(SHOT, nm + '-strip.png') });
    await s.click('.modal-back [data-wxfx]'); await W(s, 300);
    ok(nm + ': tắt hiệu ứng được', !(await s.locator('#wxFx').count()));
    await s.click('.modal-back [data-wxfx]'); await W(s, 300);
    await s.click('#mOk'); await W(s, 500);
    // ngày mai: ô nhỏ hiện dự báo của ngày đang xem
    await s.click('.st-navtop [data-stoff="1"]'); await W(s, 900);
    ok(nm + ': xem ngày mai → ô hiện dự báo ngày mai', await s.evaluate(() => { const b = document.querySelector('.st-card.next-shift .wx-mini'); return b ? b.getAttribute('data-wxmini') : null; }) === tomorrowYmd);
    await s.click('.st-navtop [data-stoff="0"]').catch(() => {}); await W(s, 700);
    // lịch tháng của nhân viên: biểu tượng thời tiết
    await s.evaluate(() => { const b = document.querySelector('[data-stab="shift"], [data-stab="month"], [data-stab="wish"]'); if (b) b.click(); }); await W(s, 1500);
    ok(nm + ': biểu tượng thời tiết trên lịch', await s.locator('.sg-cell .wx-ci').count() >= 1, await s.evaluate(() => document.querySelectorAll('.sg-cell').length));
    // tab Quán: bầu trời theo thời tiết
    await s.evaluate(() => { const b = document.querySelector('[data-stab="office"]'); if (b) b.click(); }); await W(s, 3500);
    ok(nm + ': tab Quán đổi bầu trời theo thời tiết', await s.evaluate(() => { const st = document.getElementById('ofcStage'); return !!st && /wx-[scrn]/.test(st.className) && /tod-/.test(st.className); }), await s.evaluate(() => (document.getElementById('ofcStage') || {}).className));
    await s.screenshot({ path: path.join(SHOT, nm + '-office.png') });
    ok(nm + ': không lỗi JS (nhân viên)', !s.errs.length, s.errs.join(' | '));
    await s.close();

    console.log('— Quản lý ' + nm + ' —');
    const m = await open(vp, { lang: 'vi' });
    await m.evaluate(() => { const b = document.querySelector('[data-mtab="day"]'); if (b) b.click(); }); await W(m, 1800);
    ok(nm + ': ô thời tiết nhỏ ở hàng chip của ngày (quản lý)', await m.locator('.day-head .wx-mini.is-pill').count() === 1 && await m.locator('.wx-strip').count() === 0);
    const mg = await m.evaluate(() => { const b = document.querySelector('.day-head .wx-mini').getBoundingClientRect(); const wide = [...document.querySelectorAll('body *')].filter(x => { const r = x.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && !x.closest('.alerts-row,.dstrip,.day-strip,[class*=strip]'); }).slice(0, 4).map(x => x.tagName + '.' + String(x.className).slice(0, 40));
      return { inView: b.right <= innerWidth && b.left >= 0, h: Math.round(b.height), wide }; });
    ok(nm + ': ô quản lý gọn, nằm trong màn hình', mg.inView && mg.h <= 36, JSON.stringify(mg));
    if (nm === 'pc') ok(nm + ': biểu tượng thời tiết trên lịch tháng (quản lý)', await m.locator('.dc-cell .wx-ci').count() >= 1);
    await m.screenshot({ path: path.join(SHOT, nm + '-mgr-day.png') });
    await m.evaluate(() => document.querySelector('[data-mtab="month"]').click()); await W(m, 1200);
    await m.evaluate(() => { const g = document.querySelector('[data-grp="sales"]'); if (g) g.click(); }); await W(m, 600);
    await m.evaluate(() => { const b = document.getElementById('orBox'); if (b) b.scrollIntoView({ block: 'center' }); }); await W(m, 300);
    ok(nm + ': ô báo cáo có nút Chi phí, không tràn', await m.locator('[data-orep="cost"]').count() === 1 && !(await noOverflow(m, '#orBox')), await noOverflow(m, '#orBox'));
    await m.locator('#orBox').screenshot({ path: path.join(SHOT, nm + '-ticket.png') });
    await m.click('[data-orep="cost"]'); await W(m, 1200);
    ok(nm + ': hộp chi phí hiện số đã lưu', await m.inputValue('[data-ck="rent"]') === '380000' && await m.inputValue('#cstOpen') === M2);
    ok(nm + ': hộp chi phí không tràn', !(await noOverflow(m, '.modal-back .cst')), await noOverflow(m, '.modal-back .cst'));
    await m.screenshot({ path: path.join(SHOT, nm + '-cost.png') });
    await m.fill('[data-ck="repair"]', '15000'); await m.click('#mOk'); await W(m, 1200);
    ok(nm + ': lưu chi phí từ hộp', A.costGet(t).items.repair === 15000);
    await m.click('[data-orep="open"]'); await W(m, 4000);
    const pages = await m.locator('.doc-prev .or-a4').count();
    ok(nm + ': báo cáo 5 trang (thêm lãi lỗ + từ lúc mở tiệm)', pages === 5, pages);
    const txt = await m.evaluate(() => document.querySelector('.doc-prev').innerText);
    ok(nm + ': có lãi lỗ, hòa vốn, dự báo cuối tháng', /Lãi lỗ|損益/.test(txt) && /hòa vốn|損益分岐点/.test(txt) && /(Dự báo cuối tháng|月末予測)/.test(txt), txt.slice(0, 200));
    ok(nm + ': có thời tiết và doanh thu', /(天気と売上|Thời tiết và doanh thu)/.test(txt));
    ok(nm + ': có trang từ lúc mở tiệm', /(開店からの推移|Từ lúc mở tiệm)/.test(txt));
    const lay = await m.evaluate(() => [...document.querySelectorAll('.doc-prev .or-a4')].map(pg => ({ sh: pg.scrollHeight, ch: pg.clientHeight })));
    ok(nm + ': từng trang không tràn A4', lay.every(x => x.sh <= x.ch + 2), JSON.stringify(lay));
    if (nm === 'pc'){                                   // chụp từng trang A4 ở trang riêng (ảnh trong hộp xem trước bị thu nhỏ / cắt)
      const inner = await m.evaluate(() => document.querySelector('.doc-prev').innerHTML), css = await m.evaluate(() => [...document.querySelectorAll('style')].map(x => x.textContent).join('\n'));
      const pv = await browser.newPage({ viewport: { width: 860, height: 1200 } }); await pv.setContent('<style>' + css + '</style><div style="background:#ddd;padding:20px">' + inner + '</div>'); await W(pv, 400);
      const pg = await pv.$$('.or-a4'); for (let i = 0; i < pg.length; i++) await pg[i].screenshot({ path: path.join(SHOT, 'report-p' + (i + 1) + '.png') }); await pv.close(); }
    ok(nm + ': không lỗi JS (quản lý)', !m.errs.length, m.errs.join(' | '));
    await m.close();
  }
  console.log('— Trang chủ quán —');
  const o = await open({ width: 390, height: 844 }, { owner: true, lang: 'ja', prm: { or: A.ownerLink(t, '').key } }); await W(o, 3000);
  ok('chủ quán thấy 5 trang', await o.locator('.or-view .or-a4').count() === 5, await o.locator('.or-view .or-a4').count());
  ok('trang chủ quán không có hiệu ứng thời tiết', !(await o.locator('#wxFx').count()));
  await o.screenshot({ path: path.join(SHOT, 'owner-phone.png') });
  ok('chủ quán: không lỗi JS', !o.errs.length, o.errs.join(' | '));
  const rm = await open({ width: 390, height: 844 }, { staff: true, rm: true });
  await rm.evaluate(() => { const b = document.querySelector('[data-stab="today"]'); if (b) b.click(); }); await W(rm, 1500);
  ok('giảm chuyển động: hiệu ứng đứng yên', await rm.evaluate(() => { const i = document.querySelector('#wxFx i:not(.wf-sky)'); return !i || getComputedStyle(i).animationName === 'none'; }));
  await browser.close(); server.close();
  console.log('\nv58 ĐẠT: ' + pass + '   ·   LỖI: ' + fail); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('HARNESS', e); process.exit(2); });
