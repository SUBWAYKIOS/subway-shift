// v2026.10.22 — đợt cập nhật lịch ca (giao diện quản lý): 🖨 In tài liệu, bộ đếm lượt dùng, ngôn ngữ bản in, người hay chi viện.
// Chạy: node tests/v32ui.js [Index.html] [Code.gs]
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
const api = require('./gas-mock')({ code: CODE, html: HTML });
const PORT = 9052;
const html = fs.readFileSync(HTML, 'utf8');
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const W = (p, ms) => p.waitForTimeout(ms);

(async () => {
  await new Promise(r => server.listen(PORT, r));
  let tok = api.loginManager('subway1111').token;
  const ch = api.changeManagerPassword(tok, 'subway1111', 'Otagawa2026x');
  tok = (ch && ch.token) || api.loginManager('Otagawa2026x').token;
  api.saveEmployees(tok, JSON.stringify([{ id: 'e1aaaa', name: 'ヒエウ' }, { id: 'e2bbbb', name: 'ラム' }]));
  const JST = api.jstDateStr_(0), YM = JST.slice(0, 7);
  api.setMonthLock(tok, YM, true, '{}', 'all');

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Asia/Tokyo', locale: 'ja-JP' });
  const p = await ctx.newPage(); p.jsErr = []; p.on('pageerror', e => p.jsErr.push(e.message));
  await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(api[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
  await ctx.addInitScript(() => {
    function mkRun(){ let s = () => {}, f = () => {};
      const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; };
        if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
    window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: {}, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
    window.print = () => { window.__printed = (window.__printed || 0) + 1; };
  });
  await p.goto('http://127.0.0.1:' + PORT + '/'); await W(p, 1200);
  await p.click('[data-ltab="manager"]'); await W(p, 200);
  await p.fill('#mgrPwd', 'Otagawa2026x'); await p.click('#mgrLoginBtn');
  await p.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 }); await W(p, 900);
  for (let i = 0; i < 4 && await p.locator('.modal-back').count(); i++){ await p.keyboard.press('Escape'); await W(p, 250); }

  console.log('— 🖨 In tài liệu (mẫu có sẵn) —');
  // Mở qua ô tìm nhanh 🔍 (mục mới "In tài liệu")
  await p.click('#qsBtn'); await W(p, 300);
  await p.fill('#qsInput', 'in tai lieu'); await W(p, 200);
  await p.keyboard.press('Enter'); await W(p, 500);
  const dlg = await p.locator('.modal-back').last().innerText().catch(() => '');
  ok('hộp In tài liệu liệt kê 4 mẫu mặc định', /シフト表/.test(dlg) && /閉店チェックリスト/.test(dlg) && /発注シート/.test(dlg) && /スキル一覧/.test(dlg), dlg.slice(0, 200));
  ok('quản lý thấy nút ＋ thêm mẫu', /追加|Thêm mẫu|様式を追加|Add template/.test(dlg) || (await p.locator('[data-docadd]').count()) === 1);
  await p.locator('[data-docprint="1"]').first().click(); await W(p, 400);
  const sheet = await p.locator('#docSheet').innerText().catch(() => '');
  ok('bấm 🖨 mẫu Checklist → tạo trang in có ô tick ☐', /☐ レジ締め/.test(sheet) && /閉店チェックリスト/.test(sheet), sheet.slice(0, 160));
  await p.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await W(p, 200);
  await p.locator('[data-docprint="0"]').first().click().catch(() => {}); await W(p, 400);
  const days = await p.locator('#docSheet tbody tr').count().catch(() => 0);
  const nd = new Date(+YM.slice(0, 4), +YM.slice(5, 7), 0).getDate();
  ok('mẫu lịch tháng có đủ ' + nd + ' dòng ngày', days === nd, days);
  ok('gọi lệnh in của trình duyệt', (await p.evaluate(() => window.__printed || 0)) >= 1);
  await p.evaluate(() => window.dispatchEvent(new Event('afterprint'))); await W(p, 200);
  await p.keyboard.press('Escape'); await W(p, 200); await p.keyboard.press('Escape'); await W(p, 200);

  console.log('— Bộ đếm lượt dùng ẩn —');
  const use = await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('sbw.use') || '{}'); } catch (e){ return {}; } });
  ok('đã đếm lượt mở "In tài liệu"', (use['act:docs'] || 0) >= 1, JSON.stringify(use));
  await p.click('#qsBtn'); await W(p, 300);
  const firstTwo = await p.locator('.qs-it').first().innerText().catch(() => '');
  ok('mục dùng nhiều xếp lên đầu danh sách tìm nhanh', /In tài liệu|資料の印刷|Print documents|🖨/.test(firstTwo), firstTwo.slice(0, 80));
  await p.fill('#qsInput', 'thong ke usage'); await W(p, 150);
  await p.keyboard.press('Enter'); await W(p, 400);
  const usageTxt = await p.locator('.modal-back').last().innerText().catch(() => '');
  ok('"📊 Số lần dùng" hiện số đếm', /In tài liệu|資料の印刷|Print documents/.test(usageTxt), usageTxt.slice(0, 160));
  for (let i = 0; i < 3; i++) { await p.keyboard.press('Escape'); await W(p, 200); }

  console.log('— Lỗi JavaScript —');
  ok('không lỗi JS khi mở các hộp mới', p.jsErr.length === 0, p.jsErr.join(' | '));

  await browser.close(); server.close();
  console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('TEST LỖI:', e); process.exit(2); });
