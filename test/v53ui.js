// v2026.10.29.5 — thẻ Dự toán giờ (vòng % ngoài, vàng ≥80% · đỏ >95%) · thẻ ứng viên (linh động xanh đặc, ✈ Chi viện tím) ·
// checklist theo giờ tự lưu · Xếp nhanh dùng cả người đăng ký khung ngắn + dời giờ nghỉ. Chạy: node tests/v53ui.js
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
const api = require('./gas-mock')({ code: CODE, html: HTML });
const PORT = 9083, html = fs.readFileSync(HTML, 'utf8');
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const W = (p, ms) => p.waitForTimeout(ms), SH = n => path.join(DIR, 'sh', 'v53-' + n + '.png');
(async () => {
  await new Promise(r => server.listen(PORT, r));
  let tok = api.loginManager('subway1111').token; tok = api.changeManagerPassword(tok, 'subway1111', 'Otagawa2026x').token;
  const TODAY = api.jstDateStr_(0), YM = TODAY.slice(0, 7), D = +TODAY.slice(8), N = new Date(+YM.slice(0, 4), +YM.slice(5, 7), 0).getDate();
  const S = api.readSettings_(), row = [2,2,2,3,3,2,2,2,2,3,3,2,2];
  ['d0','d1','d2','d3','d4','d5','d6','hol'].forEach(k => S.staffing[k] = row.slice());
  Object.assign(S, { staffBase: 8, openHour: 8, closeHour: 21, wage: 1200, laborPct: 22 });
  api.saveSettings(tok, JSON.stringify(S));
  const WI = { A:[8,14], B:[8,13], C:[10,15], Dd:[11,14], E:[13,21], F:[14,21], G:[17,20] };
  const id = k => 'e' + k.toLowerCase() + 'xxxx';
  api.saveEmployees(tok, JSON.stringify(Object.keys(WI).map(k => ({ id: id(k), name: k })).concat([{ id: 'ezzzzz', name: 'Z' }, { id: 'enegoxx', name: 'N' }, { id: 'eunavxx', name: 'U' }])));
  api.saveWishEntry(tok, YM, D, 'enegoxx', { off: true, shifts: [] }); api.saveRequestEntry(tok, YM, D, 'enegoxx', { type: 'negotiable', note: 'chiều được' });
  api.saveWishEntry(tok, YM, D, 'eunavxx', { off: true, shifts: [] });
  Object.keys(WI).forEach(k => api.saveWishEntry(tok, YM, D, id(k), { off: false, shifts: [{ start: WI[k][0], end: WI[k][1] }] }));
  // các ngày khác: lịch đã có → dự toán ~88% (vàng)
  for (let d = 1; d <= N; d++){ api.saveDayInfo(tok, YM, d, 100000, ''); if (d !== D) ['A', 'E', 'F'].forEach((k, i) => api.saveShiftEntry(tok, YM, d, id(k), { off: false, shifts: [{ start: 8 + i * 4, end: 14 + i * 4 }] })); }
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, timezoneId: 'Asia/Tokyo', locale: 'vi-VN' });
  const m = await ctx.newPage(); m.errs = []; m.on('pageerror', e => m.errs.push(e.message));
  await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(api[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
  await ctx.addInitScript(() => {
    function mkRun(){ let s = () => {}, f = () => {}; const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; }; if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
    window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: { lang: 'vi' }, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
    window.__LAUNCHER_ON = 1;
  });
  await m.goto('http://127.0.0.1:' + PORT + '/'); await W(m, 1500);
  await m.click('[data-ltab="manager"]'); await W(m, 250);
  await m.fill('#mgrPwd', 'Otagawa2026x'); await m.click('#mgrLoginBtn');
  await m.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 }); await W(m, 1500);
  for (let i = 0; i < 4 && await m.locator('.modal-back').count(); i++){ await m.keyboard.press('Escape'); await W(m, 250); }

  console.log('— Xếp nhanh —');
  await m.click('#quickDayBtn'); await W(m, 2500);
  const relaxTxt = await m.locator('.modal-back:not(.closing)').last().innerText().catch(() => '');
  ok('đã xếp cả người làm nhiều ngày liền (có đăng ký) → hộp ⚠️ báo tên', /vượt ngày nghỉ/.test(relaxTxt) && /E|F|A/.test(relaxTxt), relaxTxt.slice(0, 200));
  for (let i = 0; i < 4 && await m.locator('.modal-back').count(); i++){ await m.keyboard.press('Escape'); await W(m, 250); }
  const sc = (api.readMonthObject_(api.getSheet_(), 'schedule:' + YM) || {})[String(D)] || {};
  let holes = 0;
  for (let h = 8; h < 21; h += 0.5){ const need = row[Math.floor(h) - 8]; let hv = 0; Object.values(sc).forEach(e => (e.shifts || []).forEach(x => { if (h >= x.start && h < x.end && !(x.breakStart != null && h >= x.breakStart && h < x.breakEnd)) hv++; })); if (hv < need) holes++; }
  const g = ((sc[id('G')] || {}).shifts || [])[0];
  ok('người chỉ đăng ký 3 tiếng (G 17–20) được xếp vào chỗ thiếu', g && g.start === 17 && g.end === 20, JSON.stringify(sc[id('G')]));
  ok('chỗ thiếu người còn ≤ 1 nửa tiếng (trước: 8)', holes <= 1, holes);

  console.log('— Thẻ ứng viên —');
  const cand = await m.evaluate(() => { const b = document.querySelector('.cand-box'); if (!b) return null; const f = b.querySelector('.cand-label.c-free'), s = b.querySelector('.cand-label.c-sup'); return { free: f && getComputedStyle(f).backgroundColor, freeH: f && f.getBoundingClientRect().height, sup: s && getComputedStyle(s).backgroundColor, supH: s && s.getBoundingClientRect().height, txt: b.innerText }; });
  ok('Xếp linh động: thẻ xanh dương đặc, cùng cỡ thẻ ✈ Chi viện', cand && cand.free === 'rgb(36, 99, 209)' && Math.abs(cand.freeH - cand.supH) < 1, JSON.stringify(cand));
  ok('✈ Chi viện tím, chưa có ai → "Không có người chi viện được"', cand && cand.sup === 'rgb(122, 63, 214)' && /Không có người chi viện được/.test(cand.txt), JSON.stringify(cand));
  ok('nút Xin chi viện ẩn tới khi bấm thẻ', !(await m.locator('#supQuickBtn').isVisible()));
  await m.click('[data-supcard]'); await W(m, 300);
  ok('bấm thẻ Chi viện → hiện nút', await m.locator('#supQuickBtn').isVisible());
  const cb2 = await m.evaluate(() => { const b = document.querySelector('.cand-box'); const rows = [...b.querySelectorAll('.cand-row')]; const rowOf = n => { const r = rows.find(x => [...x.querySelectorAll('.cand-chip')].some(c => c.textContent.indexOf(n) !== -1)); return r ? (r.querySelector('.cand-label') || {}).className : ''; };
    const gaps = rows.slice(1).map((r, i) => Math.round(r.getBoundingClientRect().top - rows[i].getBoundingClientRect().bottom));
    const ws = [...b.querySelectorAll('.cand-label')].map(l => Math.round(l.getBoundingClientRect().width));
    return { n: rowOf('N'), u: rowOf('U'), gaps, ws, reqChipN: [...document.querySelectorAll('.req-chip')].some(c => /^N:/.test(c.textContent)), note: /chiều được/.test(b.innerText) }; });
  ok('"Có thể trao đổi" (N, dù đã khai nghỉ) nằm hàng cam, không lẫn vào "Không thể đi làm"', /c-maybe/.test(cb2.n) && /c-no/.test(cb2.u) && cb2.note, JSON.stringify(cb2));
  ok('không còn chip "N: Có thể trao đổi" lặp lại phía trên', !cb2.reqChipN);
  ok('các hàng cách nhau ≥ 6px, thẻ nhãn cùng bề rộng', cb2.gaps.every(g => g >= 6) && new Set(cb2.ws).size === 1, JSON.stringify(cb2));
  await m.locator('.cand-box').screenshot({ path: SH('cand') });

  console.log('— Checklist theo giờ: tự lưu —');
  await m.click('[data-hkopen]'); await W(m, 900);
  await m.click('.modal-back:not(.closing) [data-hktpl]'); await W(m, 900);
  const ta = m.locator('.modal-back:not(.closing) .tt-items').first();
  await ta.click(); await m.keyboard.press('End'); await m.keyboard.press('Control+End');
  await m.keyboard.type('\nKiểm tra tủ đá v53'); await m.keyboard.press('Enter'); await W(m, 1200);
  const tpl1 = JSON.stringify((api.readJsonKey_ ? null : null) || api.hkState(tok, TODAY).tpl);
  ok('xuống dòng → đã tự lưu lên máy chủ', /Kiểm tra tủ đá v53/.test(tpl1), tpl1.slice(0, 200));
  ok('dòng trạng thái "Đã tự lưu"', /Đã tự lưu/.test(await m.locator('.modal-back:not(.closing) #hkAuto').innerText()));
  await m.keyboard.type('Lau khay v53 viết dở');
  await m.mouse.click(5, 5); await W(m, 300);                // bấm ra ngoài
  for (let i = 0; i < 3 && await m.locator('.modal-back:not(.closing)').count(); i++){ await m.keyboard.press('Escape'); await W(m, 300); }
  await W(m, 1200);
  const tpl2 = JSON.stringify(api.hkState(tok, TODAY).tpl);
  ok('đang viết dở rồi bấm ra ngoài / đóng → chữ vẫn được lưu', /Lau khay v53 viết dở/.test(tpl2), tpl2.slice(0, 300));
  const ids = JSON.parse(tpl2).slots.flatMap(s => s.items.map(x => x.id));
  ok('không sinh trùng việc khi lưu nhiều lần', JSON.parse(tpl2).slots.flatMap(s => s.items).filter(x => /tủ đá v53/.test(JSON.stringify(x.t))).length === 1 && new Set(ids).size === ids.length);

  console.log('— Dự toán giờ —');
  await m.click('[data-mtab="month"]'); await W(m, 1500);
  const lb = await m.evaluate(() => { const r = document.querySelector('#lbmMonth .lbm-ring'); const L = document.querySelector('.mon-desk .md-left'), R = document.querySelector('.mon-desk .md-right'); return { cls: r && r.className, pct: r && r.innerText, gap: L && R ? Math.round(R.getBoundingClientRect().top - L.getBoundingClientRect().bottom) : null }; });
  const pct = parseInt(lb.pct, 10), want = pct > 95 ? 't-bad' : pct >= 80 ? 't-warn' : 't-ok';
  ok('vòng % nằm ngoài thẻ Dự toán, màu đúng mức (' + pct + '% → ' + want + ')', lb.cls && lb.cls.indexOf(want) !== -1, JSON.stringify(lb));
  ok('thẻ Dự toán và nhóm app (Xếp ca · Nhân công) sát nhau (khoảng cách ≤ 14px)', lb.gap !== null && lb.gap <= 14 && lb.gap >= 0, JSON.stringify(lb));
  await m.screenshot({ path: SH('month') });
  await m.click('#lbmMonth [data-lbmore]'); await W(m, 1200);
  ok('Chi tiết: không còn vòng % trùng lặp', await m.locator('.lb-ring-row').count() === 0);
  ok('không lỗi JS', !m.errs.length, m.errs.join(' | '));
  await browser.close(); server.close();
  console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('HARNESS', e); process.exit(2); });
