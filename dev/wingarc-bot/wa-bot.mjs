// 🤖 Bot WingArc (Dr.Sum EA Datalizer) cho app SUBWAY — chạy trên máy Mac của quán.
// Không có API → bot "học" đường bấm của anh một lần, sau đó tự làm lại mỗi lần chạy:
//   node wa-bot.mjs hoc      → mở Chrome, anh đăng nhập + bấm tải từng file CSV như mọi khi; bot ghi lại các bước bấm
//   node wa-bot.mjs chay     → tự đăng nhập (tài khoản trong Keychain), bấm lại các bước, tải CSV, gửi vào app
//   node wa-bot.mjs gui      → chỉ gửi các CSV đang nằm trong thư mục "tha-csv" (anh tự tải tay rồi thả vào)
// Mật khẩu WingArc + khoá bot nằm trong Keychain của máy Mac (bot không ghi ra file). Mọi việc ghi vào nhat-ky.txt.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const TOOLS = process.env.WA_TOOLS || path.join(HERE, '.tools');
const require = createRequire(path.join(TOOLS, 'node_modules', 'x.js'));
const { waParse } = createRequire(import.meta.url)('./wa-parse.cjs');
const CFG_F = path.join(HERE, 'cau-hinh.json'), REC_F = path.join(HERE, 'cac-buoc.json'), LOG_F = path.join(HERE, 'nhat-ky.txt');
const DROP = path.join(HERE, 'tha-csv'), SENT = path.join(HERE, 'da-gui'), PROFILE = path.join(TOOLS, 'chrome-wingarc');
const LOGIN_URL = process.env.WA_URL || 'https://subway-datalizer.com/datalizer/Tpage.rse';
for (const d of [DROP, SENT]) fs.mkdirSync(d, { recursive: true });

function log(s){ const line = new Date().toLocaleString('ja-JP') + '  ' + s; console.log(s); fs.appendFileSync(LOG_F, line + '\n'); }
function kc(svc){ const tv = process.env['WA_TEST_' + svc.replace(/\W/g, '_').toUpperCase()]; if (tv) return tv; try { return execFileSync('security', ['find-generic-password', '-a', os.userInfo().username, '-s', svc, '-w'], { encoding: 'utf8' }).trim(); } catch (e){ return ''; } }
function cfg(){ try { return JSON.parse(fs.readFileSync(CFG_F, 'utf8')); } catch (e){ return {}; } }
function decode(buf){
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, ''); }
  catch (e){ return new TextDecoder('shift_jis').decode(buf); }
}

// ---------- gửi vào app (Apps Script /exec, giống trang GitHub gọi) ----------
async function send(months){
  const c = cfg(), key = kc('subway-wabot');
  if (!c.url) throw new Error('Chưa có link máy chủ của quán — chạy lại Cai-bot-WingArc.command');
  if (!key) throw new Error('Chưa có khoá bot trong Keychain — chạy lại Cai-bot-WingArc.command');
  const r = await fetch(c.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ rpc: 1, fn: 'waBotImport', args: [key, JSON.stringify({ months })] }), redirect: 'follow' });
  const j = JSON.parse(await r.text());
  if (!j.ok) throw new Error(j.m || 'Máy chủ từ chối');
  return j.v;
}
/** Đọc một loạt file CSV → gộp theo tháng → gửi một lần. */
async function sendFiles(files){
  const months = {};
  for (const f of files){
    try {
      const p = waParse(decode(fs.readFileSync(f)), path.basename(f));
      if (p.kind === 'pos'){ (months[p.ym] = months[p.ym] || {}).pos = { it: p.it }; log('  🧾 ' + path.basename(f) + ' → số bán ' + p.ym + ' (' + p.n + ' món)'); }
      else for (const ym of Object.keys(p.months)){
        const M = months[ym] = months[ym] || {}; M.d = M.d || {};
        for (const [d, x] of Object.entries(p.months[ym].d)){ const o = M.d[d] = M.d[d] || {}; Object.assign(o, x, { h: Object.assign(o.h || {}, x.h || {}) }); }
        log('  📈 ' + path.basename(f) + ' → ' + ym + ' (' + Object.keys(p.months[ym].d).length + ' ngày)');
      }
    } catch (e){ log('  ⚠️ ' + path.basename(f) + ': ' + e.message); }
  }
  if (!Object.keys(months).length){ log('Không có dữ liệu để gửi.'); return false; }
  const v = await send(months);
  log('✅ Đã gửi vào app: ' + Object.keys(v.months || {}).join(', '));
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  for (const f of files){ try { fs.renameSync(f, path.join(SENT, stamp + '_' + path.basename(f))); } catch (e){} }
  return true;
}

// ---------- trình duyệt ----------
async function browser(headless){
  let pw;
  try { pw = require('playwright-core'); } catch (e){ throw new Error('Thiếu playwright-core — chạy lại Cai-bot-WingArc.command'); }
  const opts = { headless, acceptDownloads: true, viewport: { width: 1360, height: 900 }, locale: 'ja-JP' };
  try { return await pw.chromium.launchPersistentContext(PROFILE, Object.assign({ channel: 'chrome' }, opts)); }
  catch (e){ return await pw.chromium.launchPersistentContext(PROFILE, opts); }        // không có Google Chrome → Chromium riêng
}
/** Đăng nhập tự động bằng tài khoản trong Keychain (trang Lon.rse: ô User ID + Password + nút Login). */
async function login(page){
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const pw = page.locator('input[type=password]').first();
  if (!(await pw.count())) return true;                       // phiên cũ còn sống
  const user = kc('subway-wingarc-user'), pass = kc('subway-wingarc-pass');
  if (!user || !pass) throw new Error('Chưa lưu tài khoản WingArc trong Keychain — chạy lại Cai-bot-WingArc.command');
  // Trang đăng nhập Datalizer: #login_id + #userpwd_v + ảnh login.gif (gọi submitFunc()). Còn lại: đoán theo kiểu ô.
  const id = page.locator('#login_id, input[name=userid], input[type=text], input:not([type])').first();
  await id.fill(user); await page.locator('#userpwd_v, input[type=password]').first().fill(pass);
  const btn = page.locator('input[type=image][src*="login" i], input[type=image][alt*="ogin" i], button:has-text("Login"), input[type=submit], img[alt*="ogin" i], a:has-text("Login")').first();
  if (await btn.count()) await btn.click(); else await pw.press('Enter');
  await page.waitForTimeout(4000);
  return !(await page.locator('input[type=password]').count());
}

// ---------- chế độ HỌC: ghi lại các bước bấm cho tới mỗi lần tải file ----------
const REC_JS = `(() => {
  if (window.__waRecOn) return; window.__waRecOn = 1;
  function sel(el){
    if (!el || el.nodeType !== 1) return null;
    const t = (el.innerText || el.value || el.getAttribute('title') || el.getAttribute('alt') || '').trim().replace(/\\s+/g, ' ').slice(0, 60);
    const path = []; let x = el;
    while (x && x.nodeType === 1 && path.length < 6){
      let s = x.tagName.toLowerCase();
      if (x.id && !/\\d{4,}/.test(x.id)){ s += '#' + CSS.escape(x.id); path.unshift(s); break; }
      const sib = x.parentElement ? [...x.parentElement.children].filter(c => c.tagName === x.tagName) : [];
      if (sib.length > 1) s += ':nth-of-type(' + (sib.indexOf(x) + 1) + ')';
      path.unshift(s); x = x.parentElement;
    }
    return { css: path.join(' > '), text: t, tag: el.tagName.toLowerCase(), lg: !!document.querySelector('input[type=password]') };
  }
  document.addEventListener('click', e => { const t = e.target.closest('a,button,input,img,td,span,div,li') || e.target; const s = sel(t); if (s) window.__waRec && window.__waRec(Object.assign({ k: 'click' }, s)); }, true);
  document.addEventListener('change', e => { const t = e.target; if (!/INPUT|SELECT|TEXTAREA/.test(t.tagName) || t.type === 'password') return; const s = sel(t); if (s) window.__waRec && window.__waRec(Object.assign({ k: 'fill', v: t.value }, s)); }, true);
})();`;
async function learn(){
  const ctx = await browser(!!process.env.WA_HEADLESS);
  const steps = [], recipes = [];
  await ctx.exposeBinding('__waRec', (src, s) => {
    if (s.lg) return;                                    // bước trên trang đăng nhập: bot tự đăng nhập, không ghi
    s.frame = src.frame && src.frame.url ? src.frame.url().replace(/[?#].*$/, '') : '';
    steps.push(s); console.log('   • ' + (s.k === 'fill' ? 'nhập ' + s.text : 'bấm ' + (s.text || s.css)));
  });
  await ctx.addInitScript(REC_JS);
  const page = ctx.pages()[0] || await ctx.newPage();
  ctx.on('page', p => p.on('download', onDl));
  page.on('download', onDl);
  async function onDl(dl){
    const name = dl.suggestedFilename(), to = path.join(DROP, name);
    await dl.saveAs(to);
    recipes.push({ name, steps: steps.splice(0) });
    fs.writeFileSync(REC_F, JSON.stringify({ at: Date.now(), recipes }, null, 1));
    log('📥 Đã học file thứ ' + recipes.length + ': ' + name + ' (' + recipes[recipes.length - 1].steps.length + ' bước)');
  }
  log('🎓 CHẾ ĐỘ HỌC: hãy đăng nhập WingArc rồi mở + tải (エクスポート / CSV) từng báo cáo như mọi khi. Xong thì ĐÓNG cửa sổ Chrome.');
  await page.goto(LOGIN_URL);
  if (process.env.WA_SIM){ const sim = await import(process.env.WA_SIM); await sim.default(page); await page.waitForTimeout(800); await ctx.close(); }   // chỉ dùng khi kiểm thử
  else await new Promise(r => ctx.on('close', r));
  log(recipes.length ? '✅ Đã học ' + recipes.length + ' file. Lần sau bấm đúp WingArc-Bot.command là bot tự làm.' : '⚠️ Chưa tải file nào nên bot chưa học được gì.');
  const f = fs.readdirSync(DROP).filter(n => /\.(csv|txt|tsv)$/i.test(n)).map(n => path.join(DROP, n));
  if (f.length) await sendFiles(f);
}

// ---------- chế độ CHẠY: đăng nhập + bấm lại + tải + gửi ----------
/** Tìm khung (frame) đã ghi — ở trang chính hoặc cửa sổ bật lên (WingArc hay mở báo cáo trong cửa sổ mới). */
async function frameFor(page, url){
  const ctx = page.context();
  for (let i = 0; i < 20; i++){
    const pages = ctx.pages().slice().reverse();
    for (const pg of pages){ const f = pg.frames().find(fr => fr.url().replace(/[?#].*$/, '') === url); if (f) return f; }
    if (!url) return page.mainFrame();
    await page.waitForTimeout(500);
  }
  return (ctx.pages().slice(-1)[0] || page).mainFrame();
}
/** Chờ file tải về ở BẤT KỲ cửa sổ nào của phiên. */
function waitDownload(ctx, ms){
  return new Promise((ok, no) => {
    const tm = setTimeout(() => no(new Error('Không thấy file tải về sau ' + Math.round(ms / 1000) + ' giây')), ms);
    const hook = pg => pg.once('download', d => { clearTimeout(tm); ok(d); });
    ctx.pages().forEach(hook); ctx.on('page', hook);
  });
}
async function replay(page, step){
  const fr = await frameFor(page, step.frame);
  let loc = fr.locator(step.css).first();
  if (!(await loc.count()) && step.text) loc = fr.getByText(step.text, { exact: true }).first();
  if (!(await loc.count())) throw new Error('Không thấy nút "' + (step.text || step.css) + '" — giao diện WingArc đổi? chạy lại chế độ học');
  if (step.k === 'fill'){ const tg = await loc.evaluate(e => e.tagName); if (tg === 'SELECT') await loc.selectOption(step.v); else await loc.fill(step.v); }
  else await loc.click();
  await page.waitForTimeout(900);
}
async function run(){
  let rec; try { rec = JSON.parse(fs.readFileSync(REC_F, 'utf8')); } catch (e){ rec = null; }
  const got = [];
  if (rec && rec.recipes && rec.recipes.length){
    const ctx = await browser(true), page = ctx.pages()[0] || await ctx.newPage();
    try {
      if (!(await login(page))) throw new Error('Đăng nhập WingArc không được (sai mật khẩu?)');
      log('🔐 Đã đăng nhập WingArc');
      for (const r of rec.recipes){
        try {
          for (const extra of ctx.pages().slice(1)) await extra.close().catch(() => {});
          await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500);
          const last = r.steps.length - 1;
          for (let i = 0; i < last; i++) await replay(page, r.steps[i]);
          const [dl] = await Promise.all([waitDownload(ctx, 90000), replay(page, r.steps[last])]);
          const to = path.join(DROP, dl.suggestedFilename() || r.name); await dl.saveAs(to); got.push(to);
          log('📥 ' + path.basename(to));
        } catch (e){ log('⚠️ ' + r.name + ': ' + e.message); }
      }
    } catch (e){ log('⚠️ ' + e.message); }
    await ctx.close();
  } else log('ℹ️ Bot chưa học đường bấm — chỉ gửi các file đang có trong thư mục tha-csv.');
  const all = fs.readdirSync(DROP).filter(n => /\.(csv|txt|tsv)$/i.test(n)).map(n => path.join(DROP, n));
  if (all.length) await sendFiles(all); else log('Không có file CSV nào để gửi.');
}

const mode = process.argv[2] || 'chay';
(mode === 'hoc' ? learn() : (mode === 'gui' ? sendFiles(fs.readdirSync(DROP).filter(n => /\.(csv|txt|tsv)$/i.test(n)).map(n => path.join(DROP, n))) : run()))
  .then(() => process.exit(0), e => { log('❌ ' + (e && e.message || e)); process.exit(1); });
