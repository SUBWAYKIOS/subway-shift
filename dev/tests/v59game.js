// v2026.11.07 — chơi thử tab Quán + 3 trò chơi trên điện thoại / máy tính, ghi lỗi JS + ảnh.
// Chạy: node tests/v59game.js [Index.html] [Code.gs]
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
const SHOT = path.join(DIR, 'shots-v59'); fs.mkdirSync(SHOT, { recursive: true });
const makeApi = require('./gas-mock');
const A = makeApi({ code: CODE, html: HTML, registry: {}, web: {}, ssId: 'ssOtagawa', url: 'https://script.google.com/macros/s/otagawa/exec' });
A.wxHttp_ = () => [null, null, null, null];
const PORT = 9171, html = fs.readFileSync(HTML, 'utf8');
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
let pass = 0, fail = 0; const ok = (n, c, x) => { if (c){ pass++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x ? '  → ' + x : '')); } };
const W = (p, ms) => p.waitForTimeout(ms);
(async () => {
  await new Promise(r => server.listen(PORT, r));
  let t = A.loginManager('subway1111').token; A.changeManagerPassword(t, 'subway1111', 'Otagawa2026x'); t = A.loginManager('Otagawa2026x').token;
  A.saveSettings(t, JSON.stringify({ storeName: 'SUBWAY フォレストモール東海太田川店' }));
  A.saveEmployees(t, JSON.stringify([{ id: 'e1aaaa', name: 'ヒエウ' }, { id: 'e2aaaa', name: 'ラム' }]));
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const [nm, vp] of [['phone', { width: 390, height: 844 }], ['pc', { width: 1280, height: 860 }]]){
    console.log('— ' + nm + ' —');
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, timezoneId: 'Asia/Tokyo', locale: 'ja-JP', hasTouch: vp.width < 600, isMobile: vp.width < 600 });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
    await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(A[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
    await ctx.addInitScript(() => {
      try { localStorage.setItem('sbw.lang', 'vi'); } catch (e){}
      function mkRun(){ let s = () => {}, f = () => {}; const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; }; if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
      window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: { lang: 'vi' }, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
    });
    await p.goto('http://127.0.0.1:' + PORT + '/'); await W(p, 1200);
    await p.click('[data-ltab="manager"]'); await p.fill('#mgrPwd', 'Otagawa2026x'); await p.click('#mgrLoginBtn');
    await p.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 }); await W(p, 1000);
    for (let i = 0; i < 4 && await p.locator('.modal-back').count(); i++){ await p.keyboard.press('Escape'); await W(p, 250); }
    await p.evaluate(() => document.querySelector('[data-mtab="office"]').click());
    await p.waitForFunction(() => window.__ofcSc && window.__ofcSc() && window.__ofcSc().ents && Object.keys(window.__ofcSc().ents).length, null, { timeout: 30000 }).catch(() => {});
    await W(p, 3000);
    ok(nm + ': tab Quán dựng được cảnh 3D', await p.evaluate(() => !!(window.__ofcSc && window.__ofcSc() && window.__ofcSc().ents)));
    await p.screenshot({ path: path.join(SHOT, nm + '-quan.png') });
    // mở hộp trò chơi
    const tool = await p.locator('[data-ofctool="games"]').first();
    ok(nm + ': có nút Trò chơi', await tool.count() === 1);
    for (const g of ['bake', 'catch', 'memo']){
      const before = errs.length;
      await p.evaluate(() => document.querySelector('[data-ofctool="games"]').click()); await W(p, 900);
      await p.screenshot({ path: path.join(SHOT, nm + '-games.png') });
      if (g === 'catch') await p.evaluate(() => { const raf = window.requestAnimationFrame.bind(window); window.__rafOrig = raf; window.requestAnimationFrame = f => setTimeout(() => raf(f), 34); });
      await p.click('[data-gplay="' + g + '"]'); await W(p, 900);
      ok(nm + ' ' + g + ': mở được khung chơi', await p.locator('.ofc-game').count() === 1);
      if (g === 'bake'){
        for (let i = 0; i < 12; i++){ const k = await p.evaluate(() => { const c = document.querySelector('.gb-ord span.cur'); if (!c) return null; const txt = c.textContent; const b = [...document.querySelectorAll('.gb-pal button')].find(x => txt.indexOf(x.querySelector('span').textContent) === 0); return b ? b.getAttribute('data-gi') : null; }); if (!k) break; await p.click('[data-gi="' + k + '"]'); await W(p, 120); }
        ok(nm + ' bake: bấm đúng thứ tự → có điểm', /\d+/.test(await p.textContent('#gHud')) && !/ 0 ·/.test(await p.textContent('#gHud')), await p.textContent('#gHud'));
      }
      if (g === 'catch'){
        const box = await p.locator('.gc-cv').boundingBox();
        ok(nm + ' catch: khung vẽ có kích thước', box && box.width > 200 && box.height > 200, JSON.stringify(box));
        ok(nm + ' catch: quán 3D phía sau tạm dừng vẽ', await p.evaluate(() => { const sc = window.__ofcSc(); return !!sc && !sc.raf; }));
        // người chơi giả: khay đuổi theo món ngon thấp nhất, máy CHẬM (khung hình 20/giây) — phải hứng được, không xuyên khay
        await p.evaluate(() => { window.__gc = {}; const cv = document.querySelector('.gc-cv');
          window.__bot = setInterval(() => { const g = window.__gc; if (!g || !g.items) return; const r = cv.getBoundingClientRect();
            const good = g.items.filter(it => !it.bad && it.y < g.TY + 4).sort((a, b) => b.y - a.y)[0]; if (!good) return;
            cv.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + good.x, clientY: r.top + g.TY, bubbles: true, pointerId: 1 })); }, 16); });
        for (let i = 0; i < 60; i++){ await W(p, 500); if (await p.evaluate(() => (window.__gc.t || 0) >= 9)) break; }   // chơi đủ 9 giây (tính theo giờ trong trò chơi)
        const g = await p.evaluate(() => ({ score: window.__gc.score, lives: window.__gc.lives, TY: window.__gc.TY, H: document.querySelector('.gc-cv').clientHeight }));
        ok(nm + ' catch: hứng được nguyên liệu (có điểm)', g.score >= 40, JSON.stringify(g));
        ok(nm + ' catch: khay cách đáy ≥ 72px (không đụng vạch Home iPhone)', g.H - g.TY >= 72, JSON.stringify(g));
        await p.evaluate(() => clearInterval(window.__bot));
      }
      if (g === 'memo'){
        const n = await p.locator('.gm button').count(); ok(nm + ' memo: 16 thẻ', n === 16, n);
        const fit = await p.evaluate(() => { const g = document.querySelector('.gm').getBoundingClientRect(); return g.bottom <= innerHeight + 1 && g.right <= innerWidth + 1; });
        ok(nm + ' memo: 16 thẻ nằm gọn trong màn hình', fit);
        // giải hết
        const keys = await p.evaluate(() => [...document.querySelectorAll('.gm button')].map(b => b.querySelector('span').textContent));
        const seen = {}; for (let i = 0; i < keys.length; i++){ if (seen[keys[i]] != null) continue; const j = keys.indexOf(keys[i], i + 1); seen[keys[i]] = 1; await p.click('[data-gm="' + i + '"]'); await W(p, 60); await p.click('[data-gm="' + j + '"]'); await W(p, 120); }
        await W(p, 1200);
        ok(nm + ' memo: xong ván → hiện điểm + bảng xếp hạng', await p.locator('.ofc-gend').count() === 1 && await p.locator('#gRank .ofc-top, #gRank .ofc-bn').count() >= 1, await p.evaluate(() => (document.querySelector('#gBody') || {}).innerText));
      }
      await W(p, 600);
      await p.screenshot({ path: path.join(SHOT, nm + '-' + g + '.png') });
      ok(nm + ' ' + g + ': không lỗi JS', errs.length === before, errs.slice(before).join(' | '));
      await p.click('.ofc-gx').catch(() => {}); await W(p, 400);
      if (g === 'catch'){ await p.evaluate(() => { window.requestAnimationFrame = window.__rafOrig; }); await W(p, 800); ok(nm + ': đóng trò chơi → quán 3D vẽ lại', await p.evaluate(() => { const sc = window.__ofcSc(); return !!sc && !!sc.raf; })); }
      for (let i = 0; i < 3 && await p.locator('.modal-back').count(); i++){ await p.keyboard.press('Escape'); await W(p, 250); }
    }
    ok(nm + ': không lỗi JS', !errs.length, errs.join(' | '));
    await ctx.close();
  }
  console.log('\nv59 game ĐẠT: ' + pass + '   ·   LỖI: ' + fail);
  await browser.close(); server.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('HARNESS', e); process.exit(2); });
