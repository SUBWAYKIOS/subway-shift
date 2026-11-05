// v2026.10.24.1/2 — giao diện nhân viên: bỏ thẻ tem, 💌 một dòng, bỏ "Xin chào", tab Đăng ký mở tháng đang thu đăng ký.
// Chạy: node tests/v42staff.js   → ảnh ở tests/sh/v42-*.png
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(__dirname, 'sh');
fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const HTML = process.env.HTML || path.join(ROOT, 'Index.html');
const api = require(ROOT + '/tests/gas-mock')({ code: path.join(ROOT, 'Code.gs'), html: HTML });
let html = fs.readFileSync(HTML, 'utf8');
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
const W = (p, ms) => p.waitForTimeout(ms);
(async () => {
  await new Promise(r => server.listen(9093, r));
  let tok = api.loginManager('subway1111').token; tok = api.changeManagerPassword(tok, 'subway1111', 'Otagawa2026x').token;
  const E = [['e1aaaa','ヒエウ'],['e2bbbb','ラム'],['e3cccc','まい'],['e4dddd','タン'],['e5eeee','ゆうき']];
  // ラム có giờ cố định thứ Tư 10–18 (để thử: giờ cố định hiện thành đăng ký)
  api.saveEmployees(tok, JSON.stringify(E.map(x => x[0] === 'e2bbbb' ? { id: x[0], name: x[1], win: [null, null, null, [10, 18], null, null, null, null] } : { id: x[0], name: x[1] })));
  api.saveSettings(tok, JSON.stringify(Object.assign({}, api.readSettings_(), { storeName: 'SUBWAY 太田川' })));
  const JST = api.jstDateStr_(0), YM = JST.slice(0, 7), D = +JST.slice(8, 10), n = new Date(+YM.slice(0,4), +YM.slice(5,7), 0).getDate();
  for (let d = 1; d <= n; d++) E.forEach((e, i) => { if ((d + i) % 3 === 0) return; api.saveShiftEntry(tok, YM, d, e[0], { off: false, shifts: [{ start: 9 + i, end: 15 + i, breakStart: i % 2 ? 12 + i : null, breakEnd: i % 2 ? 13 + i : null }] }); });
  api.saveShiftEntry(tok, YM, D, 'e2bbbb', { off: false, shifts: [{ start: 10, end: 17, breakStart: 13, breakEnd: 14 }] });
  api.saveDayInfo(tok, YM, D, 250000, '本日は棚卸し。ドレッシング補充お願いします');
  api.setMonthLock(tok, YM, true, '{}', 'all');
  const NY = api.ymShift_(YM, 1);
  for (let d = 1; d <= 10; d++) api.saveWishEntry(tok, NY, d, 'e2bbbb', d % 4 ? { off: false, shifts: [{ start: 10, end: 16 }] } : { off: true });
  const cc = api.issueClaimCode(tok, 'e2bbbb'); api.claimEmployee('e2bbbb', '284619', false, 'x', cc.code);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Tokyo', locale: 'vi-VN', deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(api[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
  await ctx.addInitScript(() => {
    function mkRun(){ let s = () => {}, f = () => {};
      const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; };
        if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
    window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: { lang: 'vi' }, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
  });
  await p.goto('http://127.0.0.1:9093/'); await W(p, 1300);
  await p.click('[data-ltab="staff"]').catch(() => {}); await W(p, 200);
  await p.click('[data-who="e2bbbb"]'); await W(p, 300);
  await p.fill('#pin1', '284619'); await p.click('#authOk');
  await p.waitForFunction(() => !!document.querySelector('[data-stab]'), null, { timeout: 20000 }); await W(p, 1500);
  for (let i = 0; i < 4 && await p.locator('.modal-back').count(); i++){ await p.keyboard.press('Escape'); await W(p, 300); }
  const shot = async (name) => { await p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false }); };
  const NYM = api.ymShift_(YM, 1);
  await p.click('[data-stab="wish"]'); await W(p, 1500);
  // ---- chạm 1 ngày → bảng nhỏ ----
  await p.click('#dayStrip .sg-cell[data-day="12"]'); await W(p, 500);
  ok('chạm ngày → bảng nhỏ bật lên', await p.locator('.lz-sheet').isVisible());
  await shot('v43-lazy-sheet');
  await p.locator('.lz-sheet [data-lzpick="off"]').click(); await W(p, 500);
  ok('chọn "Nghỉ" → tự sang ngày 13', /13\//.test(await p.locator('.lz-day b').innerText()));
  // cuộn bánh xe "Vào" tới 11:00
  const wheelTo = async (key, label) => {
    await p.evaluate(([k, lb]) => { const el = document.querySelector('.lz-sheet [data-wh="' + k + '"] .wh-list'); const its = [...el.querySelectorAll('.wh-it')]; const i = its.findIndex(x => x.textContent.trim() === lb); el.scrollTop = i * 40; el.dispatchEvent(new Event('scroll')); }, [key, label]);
    await W(p, 400);
  };
  await wheelTo('s1a', '11:00');
  const aTxt = await p.locator('.lz-sheet [data-wh="s1a"] .wh-it.is-on').innerText();
  ok('bánh xe "Vào" chọn được 11:00', aTxt === '11:00', aTxt);
  await p.locator('.lz-sheet [data-lzsave]').click(); await W(p, 400);
  ok('lưu giờ chỉnh → sang ngày 14', /14\//.test(await p.locator('.lz-day b').innerText()));
  await p.locator('.lz-sheet [data-lzclose]').click(); await W(p, 1500);
  const w12 = api.readWish_(NYM)['12'] && api.readWish_(NYM)['12'].e2bbbb, w13 = api.readWish_(NYM)['13'] && api.readWish_(NYM)['13'].e2bbbb;
  ok('máy chủ: 12 = nghỉ, 13 = giờ vào ' + aTxt, w12 && w12.off && w13 && w13.shifts && Math.abs(w13.shifts[0].start - (Number(aTxt.slice(0,2)) + Number(aTxt.slice(3,5))/60)) < 0.01, JSON.stringify([w12, w13]));
  // ---- ca 2 + ghi chú trong cùng bảng ----
  await p.click('#dayStrip .sg-cell[data-day="14"]'); await W(p, 500);
  await p.locator('.lz-sheet [data-lztwo="1"]').click(); await W(p, 400);
  ok('bật "Ca 2" → thêm cặp bánh xe', await p.locator('.lz-sheet [data-wh="s2a"]').count() === 1);
  await wheelTo('s1a', '09:00'); await wheelTo('s1b', '12:00'); await wheelTo('s2a', '17:00');
  await p.locator('.lz-sheet [data-lznote="1"]').click(); await W(p, 300);
  await p.fill('#lzNote', 'đi học buổi chiều');
  await shot('v45-wheel-two');
  await p.locator('.lz-sheet [data-lzsave]').click(); await W(p, 400);
  await p.locator('.lz-sheet [data-lzclose]').click(); await W(p, 1500);
  const w14 = api.readWish_(NYM)['14'] && api.readWish_(NYM)['14'].e2bbbb, r14 = api.readMonthNormalized_('requests:' + NYM, api.readEmployees_())['14'];
  ok('máy chủ: 14 = 2 ca 9–12 và 17–L + ghi chú', w14 && w14.shifts.length === 2 && w14.shifts[0].start === 9 && w14.shifts[0].end === 12 && w14.shifts[1].start === 17 && w14.shifts[1].endAtClose && r14 && r14.e2bbbb && r14.e2bbbb.note === 'đi học buổi chiều', JSON.stringify([w14, r14 && r14.e2bbbb]));
  ok('không còn khung "Đăng ký của tôi" bên dưới lịch', await p.locator('.st-sheet').count() === 0);
  // ---- giờ cố định (thứ Tư 10–18) hiện thành đăng ký ----
  const weds = []; for (let d = 11; d <= 30; d++) if (new Date(Date.UTC(+NYM.slice(0,4), +NYM.slice(5,7)-1, d)).getUTCDay() === 3) weds.push(d);
  const wc = await p.locator('#dayStrip .sg-cell[data-day="' + weds[1] + '"]').innerText();
  ok('thứ Tư ' + weds[1] + ' chưa khai → hiện "10-18" (giờ cố định)', /10-18/.test(wc) && await p.locator('#dayStrip .sg-cell[data-day="' + weds[1] + '"].is-auto').count() === 1, wc);
  // ---- 🖌 Tô nhanh: vuốt qua 16 → 19 ----
  await p.click('#paintBtn'); await W(p, 600);
  ok('thanh Tô nhanh hiện', await p.locator('.paint-bar').isVisible());
  const code = await p.locator('.paint-bar .qp-chip.is-on').getAttribute('data-pb');
  const box = async d => { const bb = await p.locator('#dayStrip .sg-cell[data-day="' + d + '"]').boundingBox(); return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 }; };
  const b16 = await box(16), b19 = await box(19);
  await p.mouse.move(b16.x, b16.y); await p.mouse.down();
  for (let i = 1; i <= 12; i++) await p.mouse.move(b16.x + (b19.x - b16.x) * i / 12, b16.y + (b19.y - b16.y) * i / 12);
  await p.mouse.up(); await W(p, 300);
  await shot('v43-paint');
  await W(p, 1500);
  const W2 = api.readWish_(NYM);
  const painted = [16, 17, 18, 19].filter(d => W2[d] && W2[d].e2bbbb && !W2[d].e2bbbb.off).length;
  ok('vuốt 16→19 → 4 ngày được tô (mẫu ' + code + '), gửi một lần', painted === 4, JSON.stringify([16,17,18,19].map(d => W2[d] && W2[d].e2bbbb)));
  await p.click('#dayStrip .sg-cell[data-day="17"]'); await W(p, 1300);
  ok('chạm lại ngày đúng mẫu → bỏ', !(api.readWish_(NYM)[17] && api.readWish_(NYM)[17].e2bbbb));
  await p.locator('.paint-bar [data-pb="off"]').click();
  await p.locator('.sg-head [data-sgdow="0"]').click(); await W(p, 1500);
  const W3 = api.readWish_(NYM), suns = []; for (let d = 1; d <= 30; d++) if (new Date(Date.UTC(+NYM.slice(0,4), +NYM.slice(5,7)-1, d)).getUTCDay() === 0) suns.push(d);
  ok('chạm "CN" → mọi Chủ nhật = nghỉ', suns.every(d => W3[d] && W3[d].e2bbbb && W3[d].e2bbbb.off), JSON.stringify(suns));
  await p.click('#paintDone'); await W(p, 600);
  ok('Xong → về bình thường', await p.locator('.paint-bar').count() === 0 && await p.locator('#paintBtn').count() === 1);
  ok('không lỗi JS', !errs.length, errs.join(' | '));
  await browser.close(); server.close();
  console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });
