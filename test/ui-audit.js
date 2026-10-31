// BỘ KIỂM TỈ LỆ GIAO DIỆN (v2026.10.31.2) — chạy mỗi lần đổi giao diện.
// Mở app như máy thật (nhiều mẫu giao diện × sáng/tối × điện thoại/máy tính × các màn chính) rồi đo:
//   1. CHỮ TRÀN / BỊ CẮT     — chữ vượt khỏi thẻ, hoặc thẻ bị khung cha cắt mất (vd. "16〜31E")
//   2. TRÀN NGANG TRANG      — trang rộng hơn màn hình (phải kéo ngang)
//   3. CÙNG LOẠI KHÁC CỠ     — các nút / thẻ cùng loại nằm cạnh nhau phải cao bằng nhau, thẳng hàng
//   4. CHỒNG LÊN NHAU        — hai nút đè lên nhau
//   5. NÚT QUÁ NHỎ ĐỂ BẤM    — trên điện thoại (< 28px)
//   6. KHOẢNG CÁCH LỆCH NHỊP — khoảng cách giữa các khối trong cùng cột lệch hẳn so với phần còn lại
//   7. TƯƠNG PHẢN MÀU        — chữ quá nhạt so với nền (tính cả nền trong mờ của mẫu Liquid Glass)
// Kết quả: tests/ui-audit/report.html (ảnh có khoanh đỏ từng lỗi) + report.json. Thoát mã 1 nếu có LỖI.
// Chạy:  node tests/ui-audit.js            (bộ nhanh: 4 mẫu × điện thoại + máy tính, ~3 phút)
//        FULL=1 node tests/ui-audit.js     (thêm chế độ tối + iPhone nhỏ 375px)
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const ROOT = path.resolve(__dirname, '..');
const HTML = process.env.AUDIT_HTML || [path.join(ROOT, 'Index.html'), path.join(ROOT, 'src/Index.html')].find(f => fs.existsSync(f));
const CODE = [path.join(ROOT, 'Code.gs'), path.join(ROOT, 'apps-script/Code.gs')].find(f => fs.existsSync(f));
const OUT = path.join(__dirname, 'ui-audit'); fs.mkdirSync(OUT, { recursive: true });
const FULL = !!process.env.FULL, PORT = 9097;
const api = require('./gas-mock')({ code: CODE, html: HTML });
const html = fs.readFileSync(HTML, 'utf8');
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });

// ---------- dữ liệu quán giống thật ----------
let tok = api.loginManager('subway1111').token; tok = api.changeManagerPassword(tok, 'subway1111', 'Otagawa2026x').token;
const S0 = api.readSettings_(); Object.assign(S0, { storeName: 'SubwayForestMall Tokai Ootagawa', wage: 1200, laborPct: 22 });
['d0','d1','d2','d3','d4','d5','d6','hol'].forEach(k => S0.staffing[k] = [2,2,2,3,3,2,2,2,2,3,3,2,2]);
api.saveSettings(tok, JSON.stringify(S0));
const NAMES = ['ヒエウ', 'ラム', '平野', '愛深', 'まい', 'タン', 'もか', 'ほった'];
api.saveEmployees(tok, JSON.stringify(NAMES.map((n, i) => ({ id: 'e' + i + 'aaaa', name: n }))));
const TODAY = api.jstDateStr_(0), YM = TODAY.slice(0, 7), D = +TODAY.slice(8), N = new Date(+YM.slice(0, 4), +YM.slice(5, 7), 0).getDate();
for (let d = 1; d <= N; d++){
  api.saveDayInfo(tok, YM, d, 110000, '');
  NAMES.slice(0, 6).forEach((n, i) => { if ((d + i) % 3) api.saveShiftEntry(tok, YM, d, 'e' + i + 'aaaa', { off: false, shifts: [{ start: 8 + i * 2, end: 14 + i * 2 }] }); });
}
api.saveWishEntry(tok, YM, D, 'e6aaaa', { off: false, shifts: [{ start: 10, end: 14 }] });
api.saveWishEntry(tok, YM, D, 'e3aaaa', { off: true, shifts: [] }); api.saveRequestEntry(tok, YM, D, 'e3aaaa', { type: 'negotiable', note: 'chiều được' });
api.saveJobTemplate(tok, JSON.stringify({ title: 'Lau tủ đông', freq: 'w', dows: [0,1,2,3,4,5,6], role: 'none', who: ['e1aaaa'] }));
const cc = api.issueClaimCode(tok, 'e1aaaa'), ST = api.claimEmployee('e1aaaa', '284619', true, 'iPhone', cc.code);
if (process.env.LOCK !== '0'){
  api.setMonthLock(tok, YM, true, '{}', 'all');
  // sửa sau công bố → có người "chưa xem thay đổi" (👀 n) + có bản để ↶ hoàn tác — đủ nút như máy thật
  [0, 1, 2].forEach(i => api.saveShiftEntry(tok, YM, Math.min(N, D + 1), 'e' + i + 'aaaa', { off: false, shifts: [{ start: 9, end: 15 }] }));
  try { api.kvSet_('bak:schedule:' + YM, JSON.stringify(api.readMonthObject_(api.getSheet_(), 'schedule:' + YM) || {})); } catch (e){}
}

// ---------- các đo đạc chạy TRONG trang ----------
function measure(opt){
  const out = [], vw = innerWidth, phone = vw < 700;
  const vis = el => { const r = el.getBoundingClientRect(), c = getComputedStyle(el); if (!(r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none' && +c.opacity > 0.05) || el.closest('[hidden],.modal-back.closing,.app-store')) return false;
    const dt = el.closest('details:not([open])'); if (dt && !el.closest('summary')) return false;           // nằm trong menu ⋯ đang đóng
    return true; };
  // vùng chữ của thẻ — bỏ phần con nằm tuyệt đối (huy hiệu số, chấm đỏ… cố ý nằm lệch ra ngoài)
  const textBox = el => { let L = Infinity, R = -Infinity; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let t;
    while ((t = w.nextNode())){ if (!t.textContent.trim()) continue; let abs = false; for (let q = t.parentElement; q && q !== el; q = q.parentElement){ const ps = getComputedStyle(q).position; if (ps === 'absolute' || ps === 'fixed' || getComputedStyle(q).display === 'none'){ abs = true; break; } } if (abs) continue;
      const rg = document.createRange(); rg.selectNodeContents(t); const b = rg.getBoundingClientRect(); if (!b.width) continue; L = Math.min(L, b.left); R = Math.max(R, b.right); }
    return R > L ? { left: L, right: R, width: R - L } : null; };
  const rect = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
  const name = el => { const t = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 28); return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + String(el.className || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.') + (t ? ' “' + t + '”' : ''); };
  const add = (sev, kind, el, msg) => { if (out.length < 400) out.push({ sev, kind, el: name(el), msg, r: rect(el) }); };
  const scrollable = el => { const c = getComputedStyle(el); return /(auto|scroll)/.test(c.overflowX + c.overflowY) && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1); };
  const clipper = el => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement){ const c = getComputedStyle(p); if (c.overflowX !== 'visible' || c.overflowY !== 'visible') return scrollable(p) ? null : p; } return null; };
  const INTER = 'button, a[href], [role=button], summary, .chip, .cand-chip, .cand-label, .per-chip, .hc-chip, .inbox-chip, .pill-btn, .tool-btn, .mq-btn, .dq-btn, .app-ic, input[type=text], textarea, select';
  const els = [...document.querySelectorAll(INTER)].filter(vis).filter(el => !el.closest('.mini-grid,.tm-track,.cov-cells,.track,.shift-blocks,.tb-pop[hidden]'));
  // 2. tràn ngang trang
  if (document.documentElement.scrollWidth > vw + 1) out.push({ sev: 'fail', kind: 'tràn ngang', el: 'trang', msg: 'Trang rộng ' + document.documentElement.scrollWidth + 'px > màn hình ' + vw + 'px', r: { x: 0, y: 0, w: vw, h: 4 } });
  els.forEach(el => {
    const r = el.getBoundingClientRect(), c = getComputedStyle(el);
    // 1a. chữ tràn khỏi thẻ
    if (/^(BUTTON|A|SUMMARY|SPAN|LABEL|B)$/.test(el.tagName) && el.innerText && el.innerText.trim()){
      const t = textBox(el) || { width: 0 };
      const pad = 1.5;
      if (t.width && (t.right > r.right + pad || t.left < r.left - pad) && c.overflow === 'visible') add('fail', 'chữ tràn', el, 'chữ rộng ' + Math.round(t.width) + 'px vượt thẻ ' + Math.round(r.width) + 'px');
      else if (el.scrollWidth > el.clientWidth + 2 && c.overflowX !== 'visible' && c.textOverflow !== 'ellipsis' && !scrollable(el)) add('fail', 'chữ bị cắt', el, 'nội dung ' + el.scrollWidth + 'px trong khung ' + el.clientWidth + 'px (bị cắt, không có …)');
    }
    // 1b. thẻ bị khung cha cắt
    const cp = clipper(el);
    if (cp){ const p = cp.getBoundingClientRect(); const cut = Math.max(0, r.right - p.right, p.left - r.left, r.bottom - p.bottom, p.top - r.top);
      const inside = Math.min(r.right, p.right) > Math.max(r.left, p.left) + 1 && Math.min(r.bottom, p.bottom) > Math.max(r.top, p.top) + 1;   // nằm hẳn ngoài = đang thu gọn, không phải lỗi
      if (cut > 2 && inside && !cp.matches('.mini-grid-wrap,.dc-grid,.day-strip,.ds-strip,.alerts-row,.app-sheet,.tt-wrap')) add('fail', 'bị cắt', el, 'bị khung cha (' + name(cp).slice(0, 40) + ') cắt mất ' + Math.round(cut) + 'px'); }
    // 5. nút nhỏ trên điện thoại
    if (phone && /^(BUTTON|SUMMARY)$/.test(el.tagName) && !el.closest('.per-link,.sup-x,.oc-x,.mm-btn,.hk-ck,.mg-eye') && (r.height < 27.5 || r.width < 27.5) && !/per-link|switch-link|chip-x|mm-btn|sup-x|oc-x|mg-eye|tr-ck|seg-ind/.test(el.className))
      add('warn', 'nút nhỏ', el, 'cỡ bấm ' + Math.round(r.width) + '×' + Math.round(r.height) + 'px (nên ≥ 28px)');
  });
  // 3. cùng loại khác cỡ / lệch hàng — nhóm theo cha + lớp
  const groups = new Map();
  els.forEach(el => { if (!el.parentElement) return; const k = el.parentElement; const sig = el.tagName + '|' + String(el.className || '').split(/\s+/).filter(x => x && !/^(active|is-on|is-new|on|prs|seg-pop|is-busy|is-hot|is-draft|is-c|is-pub)$/.test(x)).sort().join('.'); if (!groups.has(k)) groups.set(k, new Map()); const g = groups.get(k); if (!g.has(sig)) g.set(sig, []); g.get(sig).push(el); });
  groups.forEach(m => m.forEach(list => {
    if (list.length < 2) return;
    const rows = {};
    list.forEach(el => { const r = el.getBoundingClientRect(); const key = Math.round((r.top + r.height / 2) / 6); (rows[key] = rows[key] || []).push({ el, r }); });
    Object.values(rows).forEach(row => {
      if (row.length < 2) return;
      const hs = row.map(x => Math.round(x.r.height)), mn = Math.min(...hs), mx = Math.max(...hs);
      if (mx - mn > 2) add('fail', 'khác cỡ', row[hs.indexOf(mx)].el, 'các nút cùng loại cùng hàng cao ' + [...new Set(hs)].join(' / ') + 'px');
      const tops = row.map(x => Math.round(x.r.top)); if (Math.max(...tops) - Math.min(...tops) > 3 && mx - mn <= 2) add('warn', 'lệch hàng', row[0].el, 'cùng hàng mà lệch ' + (Math.max(...tops) - Math.min(...tops)) + 'px');
    });
  }));
  // 4. chồng lên nhau
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++){
    const a = els[i], b = els[j]; if (a.contains(b) || b.contains(a)) continue;
    const A = a.getBoundingClientRect(), B = b.getBoundingClientRect();
    const w = Math.min(A.right, B.right) - Math.max(A.left, B.left), h = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
    if (w > 3 && h > 3 && w * h > 0.2 * Math.min(A.width * A.height, B.width * B.height)){
      const fa = getComputedStyle(a).position, fb = getComputedStyle(b).position;
      if (/fixed|sticky/.test(fa + fb) || a.closest('.tab-bar') || b.closest('.tab-bar')) continue;     // thanh nổi cố ý đè nội dung khi cuộn
      add('fail', 'chồng nhau', a, 'đè lên ' + name(b).slice(0, 50));
    }
  }
  // 6. nhịp khoảng cách giữa các khối trong cùng cột
  const cols = [...document.querySelectorAll('#app, .md-main, .md-left, .md-right, .dd-main, .dd-left, .dd-right, .st-main')].filter(vis);
  cols.forEach(col => {
    const kids = [...col.children].filter(vis).filter(k => getComputedStyle(k).position === 'static' || getComputedStyle(k).position === 'relative').map(k => ({ k, r: k.getBoundingClientRect() })).filter(x => x.r.height > 20);
    const gaps = []; for (let i = 1; i < kids.length; i++){ const g = Math.round(kids[i].r.top - kids[i - 1].r.bottom); if (Math.abs(kids[i].r.left - kids[i - 1].r.left) < 4) gaps.push({ g, el: kids[i].k }); }
    if (gaps.length < 3) return;
    const s = gaps.map(x => x.g).sort((a, b) => a - b), med = s[Math.floor(s.length / 2)];
    gaps.forEach(x => { if (x.g < -1) add('fail', 'khối đè nhau', x.el, 'đè lên khối phía trên ' + (-x.g) + 'px'); else if (Math.abs(x.g - med) > Math.max(10, med)) add('warn', 'lệch nhịp', x.el, 'cách khối trên ' + x.g + 'px, các khối khác ~' + med + 'px'); });
  });
  // 7. tương phản (WCAG) — nền tính chồng lớp trong mờ tới nền trang
  const parse = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const pageBg = parse(getComputedStyle(document.body).backgroundColor) || [255, 255, 255, 1];
  const bgOf = el => { const layers = []; for (let p = el; p; p = p.parentElement){ const c = parse(getComputedStyle(p).backgroundColor); if (c && c[3] > 0){ layers.push(c); if (c[3] >= 0.999) break; } } let b = layers.length && layers[layers.length - 1][3] >= 0.999 ? layers.pop().slice(0, 3) : pageBg.slice(0, 3); for (let i = layers.length - 1; i >= 0; i--){ const c = layers[i]; b = [0, 1, 2].map(k => c[k] * c[3] + b[k] * (1 - c[3])); } return b; };
  const seen = new Set(), tw = document.createTreeWalker(document.getElementById('app') || document.body, NodeFilter.SHOW_TEXT);
  let n; while ((n = tw.nextNode())){
    const el = n.parentElement; if (!el || seen.has(el) || !n.textContent.trim() || !vis(el) || el.closest('svg,.mini-grid td.filled,.tm-bar,.emp-dot,[disabled],textarea,input,.ei,s,.z') || /^[|·・\/\-–—\s]+$/.test(n.textContent)) continue; seen.add(el);
    const c = getComputedStyle(el), fg = parse(c.color); if (!fg) continue;
    let op = 1; for (let p = el; p; p = p.parentElement) op *= +getComputedStyle(p).opacity; if (op < 0.6) continue;
    const bg = bgOf(el), f = [0, 1, 2].map(k => fg[k] * fg[3] + bg[k] * (1 - fg[3]));
    const L1 = lum(f), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const big = parseFloat(c.fontSize) >= 18 || (parseFloat(c.fontSize) >= 14 && +c.fontWeight >= 700);
    if (ratio < (big ? 2.4 : 3)) add('fail', 'tương phản', el, 'chữ/nền ' + ratio.toFixed(2) + ':1 (tối thiểu ' + (big ? '3' : '4.5') + ':1)');
    else if (ratio < (big ? 3 : 4.5) && !el.closest('.hint,small,.muted,.per-info,.mg-mod,.lbm-sub')) add('warn', 'tương phản', el, 'chữ/nền ' + ratio.toFixed(2) + ':1 (khuyên ≥ ' + (big ? '3' : '4.5') + ':1)');
  }
  // gộp lỗi giống nhau (cùng loại + cùng thẻ) để báo cáo gọn
  const uniq = new Map(); out.forEach(x => { const k = x.sev + x.kind + x.el; if (!uniq.has(k)) uniq.set(k, x); });
  return [...uniq.values()];
}

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', browser = await pw.chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
  const SKINS = ['modern', 'glass', 'blue', 'mono'];
  const VIEWS = [{ k: 'phone', w: 402, h: 874 }, { k: 'pc', w: 1280, h: 900 }].concat(FULL ? [{ k: 'se', w: 375, h: 667 }] : []);
  const THEMES = FULL ? ['light', 'dark'] : ['light'];
  const SCREENS = ['login', 'day', 'month', 'settings', 'staff'];
  const results = [];
  for (const sk of SKINS) for (const th of THEMES) for (const v of VIEWS){
    const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: 1, isMobile: v.w < 700, hasTouch: v.w < 700, timezoneId: 'Asia/Tokyo', locale: 'ja-JP' });
    await ctx.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(api[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
    await ctx.addInitScript(o => {
      function mkRun(){ let s = () => {}, f = () => {}; const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; }; if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
      window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: { lang: 'ja' }, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
      window.__LAUNCHER_ON = 1;
      try { localStorage.setItem('sbw.skin', o.sk); localStorage.setItem('sbw.theme', o.th); if (o.dk) localStorage.setItem('sbw.dk', o.dk); } catch (e){}
    }, { sk, th, dk: '' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const URL = 'http://127.0.0.1:' + PORT + '/';
    const esc = async () => { for (let i = 0; i < 4 && await p.locator('.modal-back').count(); i++){ await p.keyboard.press('Escape'); await p.waitForTimeout(220); } };
    const shot = async (scr) => {
      await p.waitForTimeout(500); await esc();
      const issues = await p.evaluate(measure, {});
      // khoanh đỏ (lỗi) / cam (lưu ý) rồi chụp
      await p.evaluate(list => { document.querySelectorAll('.__ua').forEach(x => x.remove()); list.forEach((x, i) => { const d = document.createElement('div'); d.className = '__ua'; d.style.cssText = 'position:absolute;z-index:99999;pointer-events:none;border:2px solid ' + (x.sev === 'fail' ? '#E11D48' : '#F59E0B') + ';left:' + (x.r.x - 2) + 'px;top:' + (x.r.y - 2) + 'px;width:' + (x.r.w + 4) + 'px;height:' + (x.r.h + 4) + 'px;border-radius:4px'; const t = document.createElement('b'); t.textContent = String(i + 1); t.style.cssText = 'position:absolute;left:-2px;top:-14px;font:700 10px/12px system-ui;background:' + (x.sev === 'fail' ? '#E11D48' : '#F59E0B') + ';color:#fff;padding:0 3px;border-radius:3px'; d.appendChild(t); document.body.appendChild(d); }); }, issues);
      const file = [sk, th, v.k, scr].join('-') + '.png';
      await p.screenshot({ path: path.join(OUT, file), fullPage: true });
      await p.evaluate(() => document.querySelectorAll('.__ua').forEach(x => x.remove()));
      results.push({ skin: sk, theme: th, view: v.k, screen: scr, file, issues, errs: errs.splice(0) });
    };
    await p.goto(URL); await p.waitForTimeout(1300); await esc();
    await shot('login');
    await p.click('[data-ltab="manager"]'); await p.waitForTimeout(200); await p.fill('#mgrPwd', 'Otagawa2026x'); await p.click('#mgrLoginBtn');
    await p.waitForFunction(() => !!document.querySelector('[data-mtab]'), null, { timeout: 20000 }); await p.waitForTimeout(1000);
    await shot('day');
    await p.evaluate(() => document.querySelector('[data-mtab="month"]').click()); await p.waitForTimeout(1200); await shot('month');
    await p.evaluate(() => { const b = document.getElementById('goSettingsBtn'); if (b) b.click(); }); await p.waitForTimeout(900); await shot('settings');
    await ctx.close();
    // nhân viên (máy đã ghi nhớ)
    const c2 = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: 1, isMobile: v.w < 700, hasTouch: v.w < 700, timezoneId: 'Asia/Tokyo', locale: 'ja-JP' });
    await c2.exposeFunction('__callServer', async (fn, a) => { try { return { ok: true, v: JSON.parse(JSON.stringify(api[fn](...a) ?? null)) }; } catch (e){ return { ok: false, m: e.message }; } });
    await c2.addInitScript(o => {
      function mkRun(){ let s = () => {}, f = () => {}; const r = new Proxy({}, { get(_, k){ if (k === 'withSuccessHandler') return x => { s = x; return r; }; if (k === 'withFailureHandler') return x => { f = x; return r; }; if (typeof k !== 'string') return undefined; return (...a) => { window.__callServer(k, a).then(v => v.ok ? s(v.v) : f({ message: v.m })); }; } }); return r; }
      window.google = { script: { get run(){ return mkRun(); }, url: { getLocation(cb){ setTimeout(() => cb({ parameter: { lang: 'ja' }, hash: '' }), 20); } }, history: { replace(){}, push(){} } } };
      try { localStorage.setItem('sbw.skin', o.sk); localStorage.setItem('sbw.theme', o.th); localStorage.setItem('sbw.dk', o.dk); } catch (e){}
    }, { sk, th, dk: ST.dk });
    const p2 = await c2.newPage(); p2.on('pageerror', e => errs.push(e.message));
    const pRef = p; // giữ tên biến cho shot()
    await p2.goto(URL); await p2.waitForTimeout(1800);
    for (let i = 0; i < 4 && await p2.locator('.modal-back').count(); i++){ await p2.keyboard.press('Escape'); await p2.waitForTimeout(220); }
    const issues = await p2.evaluate(measure, {});
    await p2.evaluate(list => { list.forEach((x, i) => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;z-index:99999;pointer-events:none;border:2px solid ' + (x.sev === 'fail' ? '#E11D48' : '#F59E0B') + ';left:' + (x.r.x - 2) + 'px;top:' + (x.r.y - 2) + 'px;width:' + (x.r.w + 4) + 'px;height:' + (x.r.h + 4) + 'px;border-radius:4px'; const t = document.createElement('b'); t.textContent = String(i + 1); t.style.cssText = 'position:absolute;left:-2px;top:-14px;font:700 10px/12px system-ui;background:' + (x.sev === 'fail' ? '#E11D48' : '#F59E0B') + ';color:#fff;padding:0 3px;border-radius:3px'; d.appendChild(t); document.body.appendChild(d); }); }, issues);
    const f2 = [sk, th, v.k, 'staff'].join('-') + '.png';
    await p2.screenshot({ path: path.join(OUT, f2), fullPage: true });
    results.push({ skin: sk, theme: th, view: v.k, screen: 'staff', file: f2, issues, errs: errs.splice(0) });
    await c2.close();
    process.stdout.write('.');
  }
  await browser.close(); server.close();
  // ---------- báo cáo ----------
  const fails = results.reduce((a, r) => a + r.issues.filter(x => x.sev === 'fail').length + r.errs.length, 0);
  const warns = results.reduce((a, r) => a + r.issues.filter(x => x.sev === 'warn').length, 0);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ at: new Date().toISOString(), fails, warns, results }, null, 1));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rows = results.map(r => {
    const f = r.issues.filter(x => x.sev === 'fail').length + r.errs.length, w = r.issues.filter(x => x.sev === 'warn').length;
    return '<section class="' + (f ? 'bad' : w ? 'warn' : 'ok') + '"><h2>' + esc([r.skin, r.theme, r.view, r.screen].join(' · ')) + ' <span>' + (f ? f + ' lỗi' : 'đạt') + (w ? ' · ' + w + ' lưu ý' : '') + '</span></h2>' +
      (r.issues.length || r.errs.length ? '<ol>' + r.errs.map(e => '<li class="fail"><b>Lỗi JS</b> ' + esc(e) + '</li>').join('') + r.issues.map(x => '<li class="' + x.sev + '"><b>' + esc(x.kind) + '</b> ' + esc(x.msg) + ' <code>' + esc(x.el) + '</code></li>').join('') + '</ol>' : '') +
      '<a href="' + r.file + '" target="_blank"><img loading="lazy" src="' + r.file + '" alt=""></a></section>';
  }).join('');
  fs.writeFileSync(path.join(OUT, 'report.html'), '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kiểm tỉ lệ giao diện</title><style>body{font:14px/1.5 system-ui,sans-serif;margin:0;padding:16px;background:#F4F5F7;color:#1D2125}h1{font-size:20px}section{background:#fff;border:1px solid #E1E4E8;border-left:4px solid #12B76A;border-radius:12px;padding:12px 14px;margin:0 0 12px}section.bad{border-left-color:#E11D48}section.warn{border-left-color:#F59E0B}h2{font-size:15px;margin:0 0 6px}h2 span{font-weight:600;color:#535D6E;font-size:13px}li.fail b{color:#E11D48}li.warn b{color:#B45309}code{font-size:11.5px;color:#535D6E}img{max-width:100%;max-height:520px;border:1px solid #E1E4E8;border-radius:8px;margin-top:6px}</style>' +
    '<h1>Kiểm tỉ lệ giao diện — ' + esc(new Date().toLocaleString('ja-JP')) + '</h1><p><b>' + fails + '</b> lỗi · <b>' + warns + '</b> lưu ý · ' + results.length + ' màn</p>' + rows);
  console.log('\nKIỂM TỈ LỆ: ' + results.length + ' màn · LỖI: ' + fails + ' · lưu ý: ' + warns + ' → ' + path.relative(process.cwd(), path.join(OUT, 'report.html')));
  const by = {}; results.forEach(r => r.issues.filter(x => x.sev === 'fail').forEach(x => { const k = x.kind + ' | ' + x.el; (by[k] = by[k] || []).push(r.skin + '/' + r.view + '/' + r.screen); }));
  Object.keys(by).slice(0, 60).forEach(k => console.log('  ❌ ' + k + '  ← ' + by[k].slice(0, 4).join(', ') + (by[k].length > 4 ? ' …+' + (by[k].length - 4) : '')));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('HARNESS', e); process.exit(2); });
