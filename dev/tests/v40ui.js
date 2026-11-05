// v2026.10.23.4 — kỹ năng gập gọn, đặt hàng (định mức cuối tuần, tỉ lệ rau từng phiếu), nút ↻ tải lại, mở link = tiếng Nhật.
// Chạy: node tests/v40ui.js [Index.html] [Code.gs]
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
const api = require('./gas-mock')({ code: CODE, html: HTML });
const PORT = 9063;
const html = fs.readFileSync(HTML, 'utf8');
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const W = (p, ms) => p.waitForTimeout(ms);

(async () => {
  await new Promise(r => server.listen(PORT, r));
  let tok = api.loginManager('subway1111').token;
  api.changeManagerPassword(tok, 'subway1111', 'Otagawa2026x');
  tok = api.loginManager('Otagawa2026x').token;
  api.saveEmployees(tok, JSON.stringify([{ id: 'e1aaaa', name: 'ヒエウ', tags: ['open', 'close', 'reg', 'sand'] }, { id: 'e2bbbb', name: 'ラム' }]));
  const JST = api.jstDateStr_(0), YM = JST.slice(0, 7), TD = Number(JST.slice(8, 10));
  api.saveShiftEntry(tok, YM, TD, 'e1aaaa', { off: false, shifts: [{ start: 9, end: 17 }] });

  console.log('— Đặt hàng (máy chủ): định mức T7·CN·lễ + tỉ lệ dư rau của từng phiếu —');
  const items = api.hcItems_();
  const par = items.find(x => x.mode === 'p'); par.parW = 9;
  api.hcSaveItems(tok, JSON.stringify(items));
  ok('lưu được định mức cuối tuần', api.hcItems_().find(x => x.id === par.id).parW === 9);
  const st0 = JSON.parse(JSON.stringify(api.readSettings_())); st0.budgetSa = null;
  api.saveDayInfo(tok, YM, TD, 300000, '');
  const L0 = api.hcLoad(tok, JST), veg = items.find(x => x.mode === 's');
  ok('phiếu có tỉ lệ dư rau (mặc định = Cài đặt)', L0.vb && L0.vb.set === false && L0.vb.cur === L0.vb.def, JSON.stringify(L0.vb));
  const L1 = api.hcSetVb(tok, JST, L0.vb.def + 25);
  ok('chỉnh +25% → số rau cần tăng', L1.vb.set && L1.need[veg.id] > L0.need[veg.id], L0.need[veg.id] + ' → ' + L1.need[veg.id]);
  const L2 = api.hcSetVb(tok, JST, '');
  ok('về mặc định', !L2.vb.set && Math.abs(L2.need[veg.id] - L0.need[veg.id]) < 1e-9);

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  async function open(pre){
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Asia/Tokyo', locale: 'vi-VN' });
    const p = await ctx.newPage(); p.jsErr = []; p.on('pageerror', e => p.jsErr.push(e.message));
    await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(api[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
    await ctx.addInitScript((pre) => {
      if (pre) try { localStorage.setItem('lang', pre); } catch (e) {}
      function mkRun(){ let s = () => {}, f = () => {};
        const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; };
          if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
      window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: {}, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
    }, pre || null);
    await p.goto('http://127.0.0.1:' + PORT + '/'); await W(p, 1200);
    return p;
  }
  console.log('— Mở link luôn là tiếng Nhật —');
  const p0 = await open('vi');
  const lt = await p0.locator('[data-ltab="manager"]').innerText();
  ok('máy từng dùng tiếng Việt → mở lại vẫn hiện tiếng Nhật', /管理|店長/.test(lt), lt);
  await p0.context().close();

  const p = await open(null);
  await p.click('[data-ltab="manager"]'); await W(p, 200);
  await p.fill('#mgrPwd', 'Otagawa2026x'); await p.click('#mgrLoginBtn');
  await p.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 }); await W(p, 900);
  for (let i = 0; i < 4 && await p.locator('.modal-back').count(); i++){ await p.keyboard.press('Escape'); await W(p, 250); }

  console.log('— Bảng chi tiết: kỹ năng gập gọn —');
  await p.locator('[data-rowmenu]').first().click(); await W(p, 600);
  const fold = p.locator('.lane-row.is-open .sk-fold');
  ok('kỹ năng gập lại mặc định', await fold.count() === 1 && !(await fold.evaluate(el => el.open)));
  const sum = await fold.locator('.sk-sum').innerText();
  ok('dòng tóm tắt hiện kỹ năng đang có (+ số còn lại)', /\+1/.test(sum) && sum.split('\n').length >= 3, sum);
  ok('nút kỹ năng ẩn khi gập', !(await fold.locator('.sk-tg').first().isVisible()));
  await fold.locator('summary').click(); await W(p, 300);
  ok('bấm → mở lưới nút', await fold.locator('.sk-tg').first().isVisible());
  await fold.locator('.sk-tg:not(.on)').first().click(); await W(p, 600);
  ok('bật thêm kỹ năng → tóm tắt cập nhật (+2)', /\+2/.test(await fold.locator('.sk-sum').innerText()), await fold.locator('.sk-sum').innerText());
  await p.screenshot({ path: '/home/claude/work/shot-skfold.png' });
  await p.keyboard.press('Escape'); await W(p, 300);

  console.log('— Nút ↻ tải lại —');
  ok('có nút ↻ trên thanh trên cùng', await p.locator('#reloadBtn').count() === 1);
  api.saveShiftEntry(tok, YM, TD, 'e2bbbb', { off: false, shifts: [{ start: 12, end: 20 }] });     // máy khác vừa sửa
  await p.click('#reloadBtn'); await W(p, 1500);
  ok('bấm ↻ → thấy ngay ca máy khác vừa thêm', /ラム/.test(await p.locator('#empRows').innerText()), await p.locator('#empRows').innerText());
  ok('không lỗi JS', p.jsErr.length === 0, JSON.stringify(p.jsErr));
  console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail);
  await browser.close(); server.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
