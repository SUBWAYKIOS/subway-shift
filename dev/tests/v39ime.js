// v2026.10.23.3 — BỘ GÕ: đăng nhập khi bộ gõ tiếng Việt / tiếng Nhật đang bật; vẽ lại không làm mất chữ đang gõ.
// Chạy: node tests/v39ime.js [Index.html] [Code.gs]
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
const api = require('./gas-mock')({ code: CODE, html: HTML });
const PORT = 9061;
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
  api.saveEmployees(tok, JSON.stringify([{ id: 'e1aaaa', name: 'ヒエウ' }]));
  console.log('— Máy chủ —');
  let bad = ''; try { api.changeManagerPassword(tok, 'Otagawa2026x', 'Otagăa2026x'); } catch (e) { bad = e.message; }
  ok('không cho đặt mật khẩu mới có dấu', /chữ ABC/.test(bad), bad);
  ok('đăng nhập bằng cách đọc thứ hai vẫn được', !!api.loginManager('Otagăa2026x', JSON.stringify(['Otagaa2026x', 'Otagawa2026x'])).token);

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  async function page(){
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Asia/Tokyo', locale: 'ja-JP' });
    const p = await ctx.newPage(); p.jsErr = []; p.on('pageerror', e => p.jsErr.push(e.message));
    await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(api[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
    await ctx.addInitScript(() => {
      function mkRun(){ let s = () => {}, f = () => {};
        const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; };
          if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
      window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: {}, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
    });
    await p.goto('http://127.0.0.1:' + PORT + '/'); await W(p, 1200);
    await p.click('[data-ltab="manager"]'); await W(p, 200);
    return p;
  }
  async function tryLogin(p, typed){
    await p.fill('#mgrPwd', typed); await W(p, 150);
    const kept = await p.locator('#mgrPwd').inputValue();
    const warn = await p.locator('[data-ime="mgrPwd"]').isVisible().catch(() => false);
    await p.click('#mgrLoginBtn');
    const okIn = await p.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 8000 }).then(() => true).catch(() => false);
    return { kept, warn, okIn };
  }
  console.log('— Đăng nhập khi bộ gõ đang bật —');
  for (const [lbl, typed] of [['telex (Otagăa2026x)', 'Otagăa2026x'], ['bàn phím Nhật toàn góc', 'Ｏｔａｇａｗａ２０２６ｘ'], ['bàn phím Nhật kana', 'Oたがわ２０２６ｘ']]){
    const p = await page();
    const r = await tryLogin(p, typed);
    ok(lbl + ': ô KHÔNG bị sửa chữ trong lúc gõ', r.kept === typed, r.kept);
    if (lbl.indexOf('toàn góc') === -1) ok(lbl + ': có dòng nhắc bộ gõ (không chặn)', r.warn === true);
    ok(lbl + ': vào được', r.okIn === true);
    if (lbl.indexOf('kana') === -1) await p.context().close();
    else {
      console.log('— Ô dặn dò: đang gõ dở bằng bộ gõ thì không vẽ lại; vẽ lại không mất chữ —');
      for (let i = 0; i < 4 && await p.locator('.modal-back').count(); i++){ await p.keyboard.press('Escape'); await W(p, 250); }
      await p.waitForSelector('#dayNote', { timeout: 10000 });
      await p.click('#dayNote'); await p.keyboard.type('あした 9時 集合');
      await p.evaluate(() => { document.getElementById('dayNote').__mark = 1; document.getElementById('dayNote').dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); });
      await p.evaluate(() => window.__sbwRender()); await W(p, 200);
      ok('đang gõ dở → chưa vẽ lại (vẫn đúng ô đó)', await p.evaluate(() => document.getElementById('dayNote').__mark === 1));
      await p.evaluate(() => document.getElementById('dayNote').dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '' })));
      await W(p, 500);
      ok('gõ xong → đã vẽ lại', await p.evaluate(() => document.getElementById('dayNote').__mark !== 1));
      ok('chữ đang gõ (chưa lưu) vẫn còn sau khi vẽ lại', (await p.locator('#dayNote').inputValue()) === 'あした 9時 集合', await p.locator('#dayNote').inputValue());
      ok('vẫn đang ở trong ô dặn dò', await p.evaluate(() => document.activeElement && document.activeElement.id === 'dayNote'));
      ok('không lỗi JS', p.jsErr.length === 0, JSON.stringify(p.jsErr));
    }
  }
  console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail);
  await browser.close(); server.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
