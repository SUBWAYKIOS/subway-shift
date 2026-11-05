// v57 — Dò mặt trùng nhau (z-fighting) trong thế giới 3D: mặt cùng hướng, cùng mặt phẳng, chồng diện tích.
const fs = require('fs'), vm = require('vm');
const src = ['ofc-1-engine.js', 'ofc-2-avatar.js', 'ofc-3-world.js'].map(f => fs.readFileSync(require('path').join(__dirname, '../nguon/', f), 'utf8')).join('\n');
const ctx = { console, Math, Float32Array, Uint8Array, Uint16Array, Uint32Array, Array, Object, JSON, Number, String, Infinity, isFinite, parseFloat, Date };
vm.createContext(ctx);
vm.runInContext(src + '\n;this.GEO=GEO;this.ofcBuildWorld=typeof ofcBuildWorld!=="undefined"?ofcBuildWorld:null;this.OFC_LAYOUTS=OFC_LAYOUTS;this.navBuild=navBuild;', ctx);
const cap = []; let BAD = 0;
const om = ctx.GEO.merge; let G = 0; ctx.GEO.merge = function(list){ G++; list.forEach(it => { it._g = G; cap.push(it); }); return om.call(this, list); };
const names = Object.keys(ctx).filter(k => /World|world/.test(k)); 
const fn = ctx.ofcBuildWorld; if (!fn){ console.log('no builder', names); process.exit(1); }
for (const lay of ['otagawa', 'basic']){
  cap.length = 0;
  const L = JSON.parse(JSON.stringify(ctx.OFC_LAYOUTS[lay]));
  try { fn(L, { store: 'x' }); } catch (e){ console.log('build err', e.message); }
  const boxes = [];
  cap.forEach((it, i) => {
    const p = it.g.p, m = it.m; let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    if (Math.abs(m[2]) > 1e-6 || Math.abs(m[8]) > 1e-6) return;               // xoay: bỏ qua
    for (let k = 0; k < p.length; k += 3){ const x = m[0]*p[k] + m[4]*p[k+1] + m[8]*p[k+2] + m[12], y = m[1]*p[k] + m[5]*p[k+1] + m[9]*p[k+2] + m[13], z = m[2]*p[k] + m[6]*p[k+1] + m[10]*p[k+2] + m[14];
      mn = [Math.min(mn[0], x), Math.min(mn[1], y), Math.min(mn[2], z)]; mx = [Math.max(mx[0], x), Math.max(mx[1], y), Math.max(mx[2], z)]; }
    if (p.length / 3 > 40) return;                                             // chỉ hộp
    boxes.push({ i, g: it._g, mn, mx, c: Array.from(it.c || []).map(v => Math.round(v * 255)).join(',') });
  });
  const E = 2e-3, out = [];
  const ov = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0) > 0.01;
  for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++){
    const A = boxes[a], B = boxes[b]; if (A.g !== B.g) continue;   // khác lô (tường đầy / tường hạ) không cùng hiện
    for (const ax of [0, 1, 2]){
      const o = [0, 1, 2].filter(q => q !== ax);
      for (const side of ['mn', 'mx']){
        if (Math.abs(A[side][ax] - B[side][ax]) < E && ov(A.mn[o[0]], A.mx[o[0]], B.mn[o[0]], B.mx[o[0]]) && ov(A.mn[o[1]], A.mx[o[1]], B.mn[o[1]], B.mx[o[1]])){
          if (ax === 1 && side === 'mn') continue;    // mặt đáy (nhìn từ trên không thấy)
          out.push(['g' + A.g + '/' + B.g, 'xyz'[ax] + side, A[side][ax].toFixed(3), A.c, B.c, A.mn.map(v => v.toFixed(2)).join('/'), B.mn.map(v => v.toFixed(2)).join('/')].join('  '));
        }
      }
    }
  }
  console.log('== ' + lay + ': ' + boxes.length + ' hộp, ' + out.length + ' cặp mặt trùng');
  console.log(out.slice(0, 40).join('\n'));
  BAD += out.length;
}
console.log(BAD ? 'zfight LỖI: ' + BAD : 'zfight ĐẠT: không còn mặt trùng'); process.exit(BAD ? 1 : 0);
