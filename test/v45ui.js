// v2026.10.25.1 — giao diện: ghi nhớ đăng nhập quản lý · hộp 🔔 thông báo (giả lập bản GitHub + dịch vụ push).
// Chạy: node tests/v45ui.js [Index.html] [Code.gs]   → ảnh ở tests/sh/v45-*.png
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const DIR = __dirname, HTML = path.resolve(process.argv[2] || path.join(DIR, '../Index.html')), CODE = path.resolve(process.argv[3] || path.join(DIR, '../Code.gs'));
let pushCode = () => 201;
const api = require('./gas-mock')({ code: CODE, html: HTML, push: rq => pushCode(rq) });
const PORT = 9075;
const html = fs.readFileSync(HTML, 'utf8');
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
let pass = 0, fail = 0;
const ok = (l, c, x) => { if (c){ pass++; console.log('  ✅ ' + l); } else { fail++; console.log('  ❌ ' + l + (x !== undefined ? '  → ' + String(x).slice(0, 300) : '')); } };
const W = (p, ms) => p.waitForTimeout(ms);
const SH = n => path.join(DIR, 'sh', 'v45-' + n + '.png');
fs.mkdirSync(path.join(DIR, 'sh'), { recursive: true });

// máy nhận giả (khoá thật) để giải mã thông báo máy chủ gửi
const dev = crypto.createECDH('prime256v1'); dev.generateKeys();
const auth = crypto.randomBytes(16), EP = 'https://fcm.googleapis.com/fcm/send/fake' + crypto.randomBytes(8).toString('hex');
const SUBJ = { endpoint: EP, expirationTime: null, keys: { p256dh: dev.getPublicKey().toString('base64url'), auth: auth.toString('base64url') } };
function openPush(rq){
  const pl = rq.payload && rq.payload.getBytes ? rq.payload.getBytes() : rq.payload; const body = Buffer.from(pl.map(b => b < 0 ? b + 256 : b));
  const salt = body.slice(0, 16), idl = body[20], asPub = body.slice(21, 21 + idl), ct = body.slice(21 + idl);
  const prkKey = crypto.createHmac('sha256', auth).update(dev.computeSecret(asPub)).digest();
  const ikm = crypto.createHmac('sha256', prkKey).update(Buffer.concat([Buffer.from('WebPush: info\0'), dev.getPublicKey(), asPub, Buffer.from([1])])).digest();
  const prk = crypto.createHmac('sha256', salt).update(ikm).digest();
  const cek = crypto.createHmac('sha256', prk).update(Buffer.from('Content-Encoding: aes128gcm\0\x01')).digest().slice(0, 16);
  const nonce = crypto.createHmac('sha256', prk).update(Buffer.from('Content-Encoding: nonce\0\x01')).digest().slice(0, 12);
  const d = crypto.createDecipheriv('aes-128-gcm', cek, nonce); d.setAuthTag(ct.slice(-16));
  const pt = Buffer.concat([d.update(ct.slice(0, -16)), d.final()]);
  return JSON.parse(pt.slice(0, pt.lastIndexOf(2)).toString('utf8'));
}

(async () => {
  await new Promise(r => server.listen(PORT, r));
  let tok = api.loginManager('subway1111').token;
  tok = api.changeManagerPassword(tok, 'subway1111', 'Otagawa2026x').token;
  api.saveEmployees(tok, JSON.stringify([{ id: 'e1aaaa', name: 'ヒエウ' }, { id: 'e2bbbb', name: 'ラム', lang: 'vi' }]));
  const cc = api.issueClaimCode(tok, 'e2bbbb');
  const st = api.claimEmployee('e2bbbb', '284619', true, 'iPhone', cc.code);

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  async function open(w, h, opt){
    opt = opt || {};
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, timezoneId: 'Asia/Tokyo', locale: 'vi-VN', deviceScaleFactor: 2 });
    const p = await ctx.newPage(); p.jsErr = []; p.on('pageerror', e => p.jsErr.push(e.message));
    await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(api[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
    await ctx.addInitScript(({ gh, sub, dk, perm }) => {
      function mkRun(){ let s = () => {}, f = () => {};
        const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; };
          if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
      window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: { lang: 'vi' }, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
      try { localStorage.setItem('sbw.lang', 'vi'); if (dk) localStorage.setItem('sbw.dk', dk); } catch (e){}
      if (!gh) return;
      // Giả lập trang GitHub + dịch vụ push của trình duyệt (headless không có FCM).
      window.SBW_GH = { code: 'FOR', name: 'Otagawa', url: 'x', stores: [{ code: 'FOR' }], front: 'https://subwaykios.github.io/subway-shift/app.html?s=FOR' };
      let cur = null, P = perm;
      window.__pushCalls = [];
      const pm = { getSubscription: async () => cur, subscribe: async (o) => { window.__pushCalls.push(o.applicationServerKey && o.applicationServerKey.length);
        cur = { endpoint: sub.endpoint, options: { applicationServerKey: o.applicationServerKey.buffer }, toJSON: () => sub, unsubscribe: async () => { cur = null; return true; } }; return cur; } };
      window.__shown = []; const reg = { scope: new URL('./p/FOR/', location.href).href, active: {}, pushManager: pm, update: async () => reg, showNotification: async (t, o) => { window.__shown.push(t); } };
      Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register: async () => reg, getRegistration: async () => reg, ready: Promise.resolve(reg), addEventListener(){} } });
      window.PushManager = function(){};
      window.Notification = function(){}; Object.defineProperty(window.Notification, 'permission', { get: () => P });
      window.Notification.requestPermission = async () => { P = 'granted'; return P; };
    }, { gh: !!opt.gh, sub: SUBJ, dk: opt.dk || '', perm: opt.perm || 'default' });
    await p.goto('http://127.0.0.1:' + PORT + '/'); await W(p, 1400);
    return p;
  }

  console.log('— Quản lý: ghi nhớ đăng nhập —');
  const m = await open(390, 844);
  await m.click('[data-ltab="manager"]'); await W(m, 250);
  ok('ô "Ghi nhớ đăng nhập trên máy này" có sẵn, mặc định chọn', await m.locator('#mgrRemember').isChecked());
  await m.screenshot({ path: SH('mgr-login') });
  await m.fill('#mgrPwd', 'Otagawa2026x'); await m.click('#mgrLoginBtn');
  await m.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 }); await W(m, 800);
  for (let i = 0; i < 4 && await m.locator('.modal-back').count(); i++){ await m.keyboard.press('Escape'); await W(m, 250); }
  ok('đã lưu khoá máy quản lý', !!(await m.evaluate(() => localStorage.getItem('sbw.mdk'))));
  await m.reload(); await W(m, 2200);
  ok('mở lại app → vào thẳng chế độ quản lý, không hỏi mật khẩu', await m.locator('[data-mtab]').count() > 0 && !(await m.locator('#mgrPwd').count()));
  for (let i = 0; i < 4 && await m.locator('.modal-back').count(); i++){ await m.keyboard.press('Escape'); await W(m, 250); }
  // phiên 12 giờ hết hạn giữa chừng → tự mở phiên mới bằng khoá máy
  await m.evaluate(() => { window.__T_exp = 1; });
  const sv = await m.evaluate(async () => {
    const st = window.__state || null; return !!st;
  });
  // tới Cài đặt → nút máy đã ghi nhớ
  await m.evaluate(() => { const b = document.getElementById('goSettingsBtn'); if (b) b.click(); }); await W(m, 900);   // v50: Cài đặt nằm trong ⋯ Thêm
  const devBtn = m.locator('#mgrDevBtn');
  ok('Cài đặt có nút "Máy quản lý đã ghi nhớ"', await devBtn.count() > 0);
  ok('Cài đặt có khối 🔔 thông báo trên điện thoại', await m.locator('.push-set [data-sspush]').count() > 0);
  await m.evaluate(() => { const b = document.querySelector('[data-combo="safeBox"][data-cp="pwd"]'); if (b) b.click(); }); await W(m, 500);
  if (await devBtn.count()){
    await devBtn.scrollIntoViewIfNeeded(); await devBtn.click(); await W(m, 700);
    const t = await m.locator('.modal-box').last().innerText();
    ok('danh sách có máy này (đánh dấu "máy này")', /máy này/.test(t), t);
    await m.locator('.modal-box').last().screenshot({ path: SH('mgr-devices') });
    await m.keyboard.press('Escape'); await W(m, 300);
  }
  const pbtn = m.locator('.push-set');
  if (await pbtn.count() && await pbtn.isVisible()){ await pbtn.scrollIntoViewIfNeeded(); await pbtn.screenshot({ path: SH('mgr-push-block') }); }
  await m.evaluate(() => { const b = document.querySelector('.push-set [data-sspush]'); if (b) b.click(); }); await W(m, 900);
  ok('quản lý: hộp thông báo có ô hạn đăng ký = 20', await m.locator('#puReg').inputValue().catch(() => '') === '20');
  if (await m.locator('#puReg').count()){
    await m.fill('#puReg', '18'); await m.locator('#puReg').dispatchEvent('change'); await W(m, 700);
    ok('đổi hạn đăng ký → máy chủ lưu 18', api.readJsonKey_('push').cfg.reg === 18);
    await m.locator('.modal-box').last().screenshot({ path: SH('mgr-dialog') });
    await m.keyboard.press('Escape'); await W(m, 300);
  }
  ok('không lỗi JS (quản lý)', !m.jsErr.length, m.jsErr.join(' | '));

  console.log('— Quản lý: đăng xuất → quên máy —');
  const devsBefore = Object.keys(JSON.parse(api.__props.MGR_DEV || '{}')).length;
  await m.evaluate(() => { const b = document.getElementById('logoutBtn') || document.querySelector('[data-logout]'); if (b) b.click(); });
  await W(m, 1200);
  const devsAfter = Object.keys(JSON.parse(api.__props.MGR_DEV || '{}')).length;
  ok('đăng xuất → máy chủ gỡ máy này + xoá khoá trên máy', devsAfter === devsBefore - 1 && !(await m.evaluate(() => localStorage.getItem('sbw.mdk'))), devsBefore + '→' + devsAfter);
  await m.reload(); await W(m, 1500);
  ok('mở lại → phải đăng nhập', await m.locator('[data-ltab="manager"]').count() > 0);

  console.log('— Nhân viên (bản GitHub): bật thông báo —');
  const s = await open(390, 844, { gh: true, dk: st.dk, perm: 'default' });
  await s.waitForFunction(() => !!document.querySelector('[data-stab]'), null, { timeout: 20000 }); await W(s, 2200);
  const inv = await s.locator('.modal-box').last().innerText().catch(() => '');
  ok('lần đầu mở → mời bật thông báo', /Bật thông báo\?/.test(inv), inv);
  if (/Bật thông báo\?/.test(inv)){
    await s.locator('.modal-box').last().screenshot({ path: SH('invite') });
    await s.click('#mCancel'); await W(s, 300);           // "Để sau"
  }
  await s.evaluate(() => { const b = document.querySelector('[data-stab="settings"]'); if (b) b.click(); }); await W(s, 700);
  const row = s.locator('[data-sspush]');
  ok('tab Cài đặt có dòng 🔔 Thông báo trên điện thoại', await row.count() > 0);
  await s.locator('.sx-grp').nth(1).screenshot({ path: SH('staff-row-off') });
  await row.first().click(); await W(s, 900);
  let dt = await s.locator('.modal-box').last().innerText();
  ok('hộp thông báo: "Chưa bật trên máy này" + nút Bật + nhắc ca ngày mai', /Chưa bật/.test(dt) && await s.locator('#puOn').count() === 1 && await s.locator('#puTm').isChecked(), dt);
  await s.locator('.modal-box').last().screenshot({ path: SH('dialog-off') });
  await s.click('#puOn'); await W(s, 1500);
  const subs = api.readJsonKey_('push').subs || [];
  ok('bấm Bật → máy chủ lưu đăng ký của ラム (tiếng Việt)', subs.some(x => x.ep === EP && x.w === 'e2bbbb' && x.l === 'vi'), JSON.stringify(subs).slice(0, 200));
  ok('đăng ký với khoá VAPID 65 byte của quán', (await s.evaluate(() => window.__pushCalls))[0] === 65);
  dt = await s.locator('.modal-box').last().innerText();
  ok('hộp chuyển sang "Đang bật" + Gửi thử / Tắt', /Đang bật/.test(dt) && await s.locator('#puTest').count() === 1, dt);
  await s.locator('.modal-box').last().screenshot({ path: SH('dialog-on') });
  const n0 = api.__pushes.length;
  await s.click('#puTest'); await W(s, 900);
  const got = api.__pushes.slice(n0).filter(r => r.url === EP).map(openPush);
  ok('Gửi thử → thông báo tới đúng máy, giải mã ra "Thông báo đã bật"', got.length === 1 && /Thông báo đã bật/.test(got[0].t), JSON.stringify(got));
  const rs = await s.locator('#puRes').innerText().catch(() => '');
  ok('Gửi thử → hiện kết quả từng máy: Google (FCM) đã nhận (201)', /Google \(FCM\).*đã nhận \(201\)/.test(rs), rs);
  pushCode = rq => ({ c: 403, t: '{"reason":"BadJwtToken"}' });
  api.CacheService.getScriptCache().remove('mrate:pushtest:e2bbbb');
  await s.click('#puTest'); await W(s, 900);
  const rs2 = await s.locator('#puRes').innerText().catch(() => '');
  ok('dịch vụ từ chối → hiện rõ mã + lý do (403 BadJwtToken)', /từ chối \(403\).*BadJwtToken/.test(rs2), rs2);
  pushCode = () => 201;
  await s.click('.pu-diag summary'); await W(s, 900);
  const dgt = await s.locator('#puDiag').innerText();
  ok('mục Kiểm tra: quyền, bộ nhận, đăng ký, máy chủ, lần gửi gần nhất 403', /đã cho phép/.test(dgt) && /đang chạy/.test(dgt) && /Google/.test(dgt) && /đã lưu máy này/.test(dgt) && /403/.test(dgt), dgt);
  await s.locator('.modal-box').last().screenshot({ path: SH('diag') });
  await s.click('#puLocal'); await W(s, 500);
  ok('"Hiện thử trên máy này" → máy được yêu cầu hiện thông báo (không qua máy chủ)', (await s.evaluate(() => window.__shown)).length === 1);
  await s.click('#puTm'); await W(s, 700);
  ok('bỏ chọn "Nhắc ca ngày mai" → máy chủ lưu tắt', api.pushInfo(st.token || api.loginEmployee('e2bbbb', '284619', false, 'x').token).tm === false);
  await s.keyboard.press('Escape'); await W(s, 400);
  ok('dòng trong Cài đặt hiện "Bật"', /Bật/.test(await row.first().innerText()));
  await s.locator('.sx-grp').nth(1).screenshot({ path: SH('staff-row-on') });
  // sự kiện thật: quản lý công bố lịch → ラム nhận
  const YM = api.jstDateStr_(0).slice(0, 7);
  api.saveShiftEntry(tok, YM, 9, 'e2bbbb', { off: false, shifts: [{ start: 10, end: 15 }] });
  const n1 = api.__pushes.length;
  api.staffMailPublish_(YM, [9]);
  const pub = api.__pushes.slice(n1).filter(r => r.url === EP).map(openPush)[0];
  ok('công bố lịch → ラム nhận "Lịch tháng … đã công bố" kèm ca 10:00–15:00', pub && /đã công bố/.test(pub.t) && /10:00–15:00/.test(pub.b), JSON.stringify(pub));
  // tắt
  await row.first().click(); await W(s, 800);
  await s.click('#puOff'); await W(s, 1000);
  ok('Tắt trên máy này → máy chủ gỡ đăng ký', !(api.readJsonKey_('push').subs || []).some(x => x.ep === EP));
  await s.keyboard.press('Escape'); await W(s, 300);
  ok('không lỗi JS (nhân viên)', !s.jsErr.length, s.jsErr.join(' | '));

  console.log('— Bản Apps Script: giải thích chỉ có trên GitHub —');
  const a = await open(390, 844, { dk: st.dk });
  await a.waitForFunction(() => !!document.querySelector('[data-stab]'), null, { timeout: 20000 }); await W(a, 1500);
  ok('bản Apps Script không mời bật', !(await a.locator('.modal-box').count()) || !/Bật thông báo\?/.test(await a.locator('.modal-box').last().innerText()));
  await a.evaluate(() => { const b = document.querySelector('[data-stab="settings"]'); if (b) b.click(); }); await W(a, 600);
  await a.locator('[data-sspush]').first().click(); await W(a, 800);
  const at = await a.locator('.modal-box').last().innerText();
  ok('hộp báo "chỉ có khi mở app từ link GitHub" (không hiện tuỳ chọn vô dụng)', /link GitHub/.test(at) && await a.locator('#puTm').count() === 0, at);
  await a.locator('.modal-box').last().screenshot({ path: SH('dialog-nogh') });
  ok('không lỗi JS (Apps Script)', !a.jsErr.length, a.jsErr.join(' | '));

  await browser.close(); server.close();
  console.log('\nĐẠT: ' + pass + '   ·   LỖI: ' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('HARNESS', e); process.exit(2); });
