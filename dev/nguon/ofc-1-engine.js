  // =========================================================================
  // 🏢 VĂN PHÒNG ẢO (v55) — bộ dựng 3D tí hon tự viết (WebGL 1, không tải thư viện ngoài):
  // toán ma trận · hình khối (cầu, trụ, tiện, cung) · đổ bóng kiểu hoạt hình (toon) + viền.
  // =========================================================================
  var M4 = {
    id: function(o){ o = o || new Float32Array(16); o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o; },
    mul: function(o, a, b){
      var t = M4._t || (M4._t = new Float32Array(16));
      for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++)
        t[c*4+r] = a[r]*b[c*4] + a[4+r]*b[c*4+1] + a[8+r]*b[c*4+2] + a[12+r]*b[c*4+3];
      o.set(t); return o;
    },
    persp: function(o, fov, asp, n, f){
      var t = 1 / Math.tan(fov / 2); o.fill(0);
      o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o;
    },
    lookAt: function(o, e, c, up){
      var zx = e[0]-c[0], zy = e[1]-c[1], zz = e[2]-c[2], zl = Math.hypot(zx, zy, zz) || 1; zx /= zl; zy /= zl; zz /= zl;
      var xx = up[1]*zz - up[2]*zy, xy = up[2]*zx - up[0]*zz, xz = up[0]*zy - up[1]*zx, xl = Math.hypot(xx, xy, xz) || 1; xx /= xl; xy /= xl; xz /= xl;
      var yx = zy*xz - zz*xy, yy = zz*xx - zx*xz, yz = zx*xy - zy*xx;
      o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0; o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0; o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
      o[12] = -(xx*e[0] + xy*e[1] + xz*e[2]); o[13] = -(yx*e[0] + yy*e[1] + yz*e[2]); o[14] = -(zx*e[0] + zy*e[1] + zz*e[2]); o[15] = 1; return o;
    },
    /** T · Ry · Rx · Rz · S */
    trs: function(o, p, r, s){
      var cx = Math.cos(r[0]), sx = Math.sin(r[0]), cy = Math.cos(r[1]), sy = Math.sin(r[1]), cz = Math.cos(r[2]), sz = Math.sin(r[2]);
      o[0] = (cy*cz + sy*sx*sz) * s[0]; o[1] = (cx*sz) * s[0]; o[2] = (-sy*cz + cy*sx*sz) * s[0]; o[3] = 0;
      o[4] = (-cy*sz + sy*sx*cz) * s[1]; o[5] = (cx*cz) * s[1]; o[6] = (sy*sz + cy*sx*cz) * s[1]; o[7] = 0;
      o[8] = (sy*cx) * s[2]; o[9] = (-sx) * s[2]; o[10] = (cy*cx) * s[2]; o[11] = 0;
      o[12] = p[0]; o[13] = p[1]; o[14] = p[2]; o[15] = 1; return o;
    },
    /** Ma trận pháp tuyến (nghịch đảo chuyển vị của 3×3 trên-trái). */
    nrm: function(o, m){
      var a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
      var A = e*i - f*h, B = -(d*i - f*g), C = d*h - e*g, det = a*A + b*B + c*C; det = det ? 1 / det : 0;
      o[0] = A*det; o[1] = B*det; o[2] = C*det;
      o[3] = -(b*i - c*h)*det; o[4] = (a*i - c*g)*det; o[5] = -(a*h - b*g)*det;
      o[6] = (b*f - c*e)*det; o[7] = -(a*f - c*d)*det; o[8] = (a*e - b*d)*det; return o;
    },
    xf: function(m, x, y, z){ return [m[0]*x + m[4]*y + m[8]*z + m[12], m[1]*x + m[5]*y + m[9]*z + m[13], m[2]*x + m[6]*y + m[10]*z + m[14]]; }
  };

  // ---------- hình khối: { p:[], n:[], i:[], c?:[] } ----------
  var GEO = {
    _c: {},
    get: function(key, fn){ return GEO._c[key] || (GEO._c[key] = fn()); },
    /** Cầu (hoặc chỏm cầu): th0..th0+thL tính từ đỉnh (+Y). */
    sphere: function(r, ws, hs, th0, thL){
      th0 = th0 || 0; thL = thL == null ? Math.PI : thL;
      var p = [], n = [], ix = [];
      for (var y = 0; y <= hs; y++){
        var th = th0 + y / hs * thL, st = Math.sin(th), ct = Math.cos(th);
        for (var x = 0; x <= ws; x++){
          var ph = x / ws * Math.PI * 2, nx = -Math.cos(ph) * st, nz = Math.sin(ph) * st;
          n.push(nx, ct, nz); p.push(nx * r, ct * r, nz * r);
        }
      }
      for (var yy = 0; yy < hs; yy++) for (var xx = 0; xx < ws; xx++){
        var a = yy * (ws + 1) + xx, b = a + ws + 1;
        ix.push(a, b, a + 1, b, b + 1, a + 1);
      }
      return { p: p, n: n, i: ix };
    },
    /** Tiện (lathe) theo biên dạng [[bán kính, y]] từ trên xuống dưới. */
    lathe: function(pr, seg){
      var p = [], n = [], ix = [], L = pr.length;
      for (var k = 0; k < L; k++){
        var a = pr[Math.max(0, k - 1)], b = pr[Math.min(L - 1, k + 1)];
        var dr = b[0] - a[0], dy = b[1] - a[1], nl = Math.hypot(dy, dr) || 1, nr = -dy / nl, ny = dr / nl;
        for (var s = 0; s <= seg; s++){
          var ph = s / seg * Math.PI * 2, c = Math.cos(ph), si = Math.sin(ph);
          p.push(pr[k][0] * c, pr[k][1], pr[k][0] * si); n.push(nr * c, ny, nr * si);
        }
      }
      for (var k2 = 0; k2 < L - 1; k2++) for (var s2 = 0; s2 < seg; s2++){
        var q = k2 * (seg + 1) + s2, w = q + seg + 1;
        ix.push(q, q + 1, w, w, q + 1, w + 1);
      }
      return { p: p, n: n, i: ix };
    },
    /** Viên nhộng treo từ y=0 xuống y=−len (tay, chân). */
    capsule: function(r, len, seg){
      seg = seg || 12; var pr = [], q = 6, k;
      for (k = 0; k <= q; k++){ var a = k / q * Math.PI / 2; pr.push([Math.sin(a) * r, -r + Math.cos(a) * r]); }
      for (k = 0; k <= q; k++){ var b = k / q * Math.PI / 2; pr.push([Math.cos(b) * r, -(len - r) - Math.sin(b) * r]); }
      return GEO.lathe(pr, seg);
    },
    /** Trụ (có nắp) từ y=0 lên y=h. */
    cyl: function(rt, rb, h, seg){
      seg = seg || 16;
      return GEO.lathe([[0, h], [rt * 0.999, h], [rt, h], [rb, 0], [rb * 0.999, 0], [0, 0]], seg);
    },
    /** Hộp từ y=0 lên y=h, tâm x/z ở 0 (pháp tuyến phẳng). */
    box: function(w, h, d){
      var x = w / 2, z = d / 2, p = [], n = [], ix = [];
      var F = [[[ x,0, z],[ x,0,-z],[ x,h,-z],[ x,h, z],[1,0,0]], [[-x,0,-z],[-x,0, z],[-x,h, z],[-x,h,-z],[-1,0,0]],
               [[-x,h, z],[ x,h, z],[ x,h,-z],[-x,h,-z],[0,1,0]], [[-x,0,-z],[ x,0,-z],[ x,0, z],[-x,0, z],[0,-1,0]],
               [[-x,0, z],[ x,0, z],[ x,h, z],[-x,h, z],[0,0,1]], [[ x,0,-z],[-x,0,-z],[-x,h,-z],[ x,h,-z],[0,0,-1]]];
      F.forEach(function(f, k){
        for (var v = 0; v < 4; v++){ p.push(f[v][0], f[v][1], f[v][2]); n.push(f[4][0], f[4][1], f[4][2]); }
        ix.push(k*4, k*4+1, k*4+2, k*4, k*4+2, k*4+3);
      });
      return { p: p, n: n, i: ix };
    },
    /** Cung ống (miệng cười, lông mày…): cung tròn bán kính R trong mặt XY, đáy cung ở −Y. */
    arc: function(R, r, arc, sa, st){
      sa = sa || 10; st = st || 6; var p = [], n = [], ix = [];
      for (var i = 0; i <= sa; i++){
        var a = -Math.PI / 2 - arc / 2 + arc * i / sa, cx = Math.cos(a) * R, cy = Math.sin(a) * R + R;
        for (var j = 0; j <= st; j++){
          var b = j / st * Math.PI * 2, nx = Math.cos(a) * Math.cos(b), ny = Math.sin(a) * Math.cos(b), nz = Math.sin(b);
          p.push(cx + nx * r, cy + ny * r, nz * r); n.push(nx, ny, nz);
        }
      }
      for (var i2 = 0; i2 < sa; i2++) for (var j2 = 0; j2 < st; j2++){
        var q = i2 * (st + 1) + j2, w = q + st + 1;
        ix.push(q, w, q + 1, w, w + 1, q + 1);
      }
      return { p: p, n: n, i: ix };
    },
    /** Vòng xuyến tâm ở gốc, nằm trong mặt XY; arc < 2π = cung phía trên (+Y). */
    torus: function(R, r, arc, sa, st){
      sa = sa || 24; st = st || 8; var p = [], n = [], ix = [];
      for (var i = 0; i <= sa; i++){
        var a = Math.PI / 2 - arc / 2 + arc * i / sa, ca = Math.cos(a), sn = Math.sin(a);
        for (var j = 0; j <= st; j++){
          var b = j / st * Math.PI * 2, nx = ca * Math.cos(b), ny = sn * Math.cos(b), nz = Math.sin(b);
          p.push(ca * R + nx * r, sn * R + ny * r, nz * r); n.push(nx, ny, nz);
        }
      }
      for (var i2 = 0; i2 < sa; i2++) for (var j2 = 0; j2 < st; j2++){
        var q = i2 * (st + 1) + j2, w = q + st + 1;
        ix.push(q, w, q + 1, w, w + 1, q + 1);
      }
      return { p: p, n: n, i: ix };
    },
    /** Mặt phẳng đứng (biển hiệu) w×h, nhìn về +Z, có toạ độ ảnh. */
    plane: function(w, h){
      var x = w / 2, y = h / 2;
      return { p: [-x, -y, 0, x, -y, 0, x, y, 0, -x, y, 0], n: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], t: [0, 0, 1, 0, 1, 1, 0, 1], i: [0, 1, 2, 0, 2, 3] };
    },
    /** Ngôi sao n cánh (đùn dày d), nằm trong mặt XY. */
    star: function(n, ro, ri, d){
      var p = [], nn = [], ix = [], pts = [], k;
      for (k = 0; k < n * 2; k++){ var a = Math.PI / 2 + k * Math.PI / n, r = k % 2 ? ri : ro; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
      [1, -1].forEach(function(sd){
        var base = p.length / 3; p.push(0, 0, sd * d / 2); nn.push(0, 0, sd);
        pts.forEach(function(q){ p.push(q[0], q[1], sd * d / 3); nn.push(q[0] * 0.3, q[1] * 0.3, sd); });
        for (var j = 0; j < pts.length; j++){ var a1 = base + 1 + j, b1 = base + 1 + (j + 1) % pts.length; if (sd > 0) ix.push(base, a1, b1); else ix.push(base, b1, a1); }
      });
      for (k = 0; k < pts.length; k++){
        var q0 = pts[k], q1 = pts[(k + 1) % pts.length], ex = q1[0] - q0[0], ey = q1[1] - q0[1], l = Math.hypot(ex, ey) || 1, nx = ey / l, ny = -ex / l, b0 = p.length / 3;
        p.push(q0[0], q0[1], d / 3, q1[0], q1[1], d / 3, q1[0], q1[1], -d / 3, q0[0], q0[1], -d / 3);
        for (var m = 0; m < 4; m++) nn.push(nx, ny, 0);
        ix.push(b0, b0 + 2, b0 + 1, b0, b0 + 3, b0 + 2);
      }
      return { p: p, n: nn, i: ix };
    },
    /** Đĩa phẳng nằm ngang (bóng đổ). */
    disc: function(r, seg){
      var p = [0, 0, 0], n = [0, 1, 0], ix = [];
      for (var k = 0; k <= seg; k++){ var a = k / seg * Math.PI * 2; p.push(Math.cos(a) * r, 0, Math.sin(a) * r); n.push(0, 1, 0); }
      for (var k2 = 1; k2 <= seg; k2++) ix.push(0, k2 + 1, k2);
      return { p: p, n: n, i: ix };
    },
    /** Gộp nhiều khối tĩnh (đã đặt vị trí + màu) thành MỘT khối — cả căn phòng chỉ vài lần vẽ. */
    merge: function(list){
      var p = [], n = [], c = [], ix = [], nm = new Float32Array(9);
      list.forEach(function(it){
        var g = it.g, m = it.m, base = p.length / 3, col = it.c;
        M4.nrm(nm, m);
        for (var v = 0; v < g.p.length; v += 3){
          var x = g.p[v], y = g.p[v+1], z = g.p[v+2];
          p.push(m[0]*x + m[4]*y + m[8]*z + m[12], m[1]*x + m[5]*y + m[9]*z + m[13], m[2]*x + m[6]*y + m[10]*z + m[14]);
          var a = g.n[v], b = g.n[v+1], d = g.n[v+2];
          var nx = nm[0]*a + nm[3]*b + nm[6]*d, ny = nm[1]*a + nm[4]*b + nm[7]*d, nz = nm[2]*a + nm[5]*b + nm[8]*d, l = Math.hypot(nx, ny, nz) || 1;
          n.push(nx / l, ny / l, nz / l);
          c.push(col[0], col[1], col[2], col[3] == null ? 1 : col[3]);
        }
        for (var k = 0; k < g.i.length; k++) ix.push(g.i[k] + base);
      });
      return { p: p, n: n, c: c, i: ix };
    }
  };
  function hexRGB(h, a){
    h = String(h).replace("#", "");
    return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255, a == null ? 1 : a];
  }
  function shade(c, k){ return [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k), c[3]]; }

  // ---------- nút cảnh (scene node) ----------
  function N3(g, col, o){
    o = o || {};
    return { g: g, c: col ? (typeof col === "string" ? hexRGB(col) : col) : null, p: o.p || [0, 0, 0], r: o.r || [0, 0, 0], s: o.s || [1, 1, 1],
      k: [], v: true, ol: o.ol || 0, ds: !!o.ds, tr: !!o.tr, em: o.em || 0, tex: o.tex || null, lc: o.lc || null, m: new Float32Array(16), nm: new Float32Array(9) };
  }
  function addK(par, ch){ par.k.push(ch); return ch; }
  function upd3(node, pm){
    M4.trs(node.m, node.p, node.r, node.s);
    if (pm) M4.mul(node.m, pm, node.m);
    for (var i = 0; i < node.k.length; i++) upd3(node.k[i], node.m);
  }
  function collect3(node, op, tr){
    if (!node.v) return;
    if (node.g){ (node.tr ? tr : op).push(node); }
    for (var i = 0; i < node.k.length; i++) collect3(node.k[i], op, tr);
  }

  // ---------- trình vẽ ----------
  var R3_VS = "attribute vec3 aP;attribute vec3 aN;attribute vec4 aC;attribute vec2 aT;uniform mat4 uVP;uniform mat4 uM;uniform mat3 uNM;uniform float uOut;" +
    "varying vec3 vN;varying vec4 vC;varying vec3 vW;varying vec2 vT;" +
    "void main(){vec4 w=uM*vec4(aP,1.0);vN=normalize(uNM*aN);w.xyz+=vN*uOut;vW=w.xyz;vC=aC;vT=aT;gl_Position=uVP*w;}";
  var R3_FS = "precision mediump float;uniform vec4 uCol;uniform vec3 uSun;uniform vec3 uEye;uniform float uLine;uniform vec3 uLineC;uniform float uEm;uniform sampler2D uTex;uniform float uUseTex;" +
    "varying vec3 vN;varying vec4 vC;varying vec3 vW;varying vec2 vT;" +
    "void main(){if(uLine>0.5){gl_FragColor=vec4(uLineC,1.0);return;}" +
    "vec4 tc=vec4(1.0);if(uUseTex>0.5){tc=texture2D(uTex,vT);if(tc.a<0.4)discard;}" +
    "vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 base=vC.rgb*uCol.rgb*tc.rgb;float d=dot(n,uSun);" +
    "float lit=smoothstep(0.0,0.14,d);float hi=smoothstep(0.62,0.7,d)*0.10;" +
    "vec3 amb=mix(vec3(0.70,0.68,0.78),vec3(1.0,0.98,0.95),n.y*0.5+0.5);" +
    "vec3 col=base*(amb*0.60+vec3(1.0,0.95,0.86)*lit*0.50+hi);" +
    "vec3 v=normalize(uEye-vW);float rim=pow(1.0-max(dot(n,v),0.0),3.0);col+=rim*0.10;" +
    "col=mix(col,base,uEm);gl_FragColor=vec4(col,vC.a*uCol.a);}";
  function R3(canvas, opts){
    opts = opts || {};
    var gl = null;
    try { gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: !!opts.keep, powerPreference: "low-power" }) ||
                canvas.getContext("experimental-webgl"); } catch (e){ gl = null; }
    if (!gl) return null;
    function sh(type, src){ var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    var pg = gl.createProgram();
    gl.attachShader(pg, sh(gl.VERTEX_SHADER, R3_VS)); gl.attachShader(pg, sh(gl.FRAGMENT_SHADER, R3_FS));
    gl.bindAttribLocation(pg, 0, "aP"); gl.bindAttribLocation(pg, 1, "aN"); gl.bindAttribLocation(pg, 2, "aC"); gl.bindAttribLocation(pg, 3, "aT");
    gl.linkProgram(pg); gl.useProgram(pg);
    var U = {}; ["uVP", "uM", "uNM", "uOut", "uCol", "uSun", "uEye", "uLine", "uLineC", "uEm", "uTex", "uUseTex"].forEach(function(k){ U[k] = gl.getUniformLocation(pg, k); });
    var big = !!gl.getExtension("OES_element_index_uint");
    var bufs = (typeof WeakMap !== "undefined") ? new WeakMap() : null, VP = new Float32Array(16), V = new Float32Array(16), P = new Float32Array(16);
    function buf(g){
      var b = bufs.get(g); if (b) return b;
      var n = g.p.length / 3, wide = n > 65535;
      if (wide && !big) return null;
      b = { pb: gl.createBuffer(), nb: gl.createBuffer(), cb: null, ib: gl.createBuffer(), cnt: g.i.length, t: wide ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT };
      gl.bindBuffer(gl.ARRAY_BUFFER, b.pb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.p), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.nb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.n), gl.STATIC_DRAW);
      if (g.c){ b.cb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b.cb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.c), gl.STATIC_DRAW); }
      if (g.t){ b.tb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b.tb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.t), gl.STATIC_DRAW); }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, wide ? new Uint32Array(g.i) : new Uint16Array(g.i), gl.STATIC_DRAW);
      bufs.set(g, b); return b;
    }
    var texs = (typeof WeakMap !== "undefined") ? new WeakMap() : null;
    /** Ảnh vẽ bằng canvas 2D (biển hiệu…) → texture; cạnh là luỹ thừa của 2 để có mipmap (chữ nét khi nhìn xa). */
    function texOf(cv){
      var tx = texs.get(cv); if (tx) return tx;
      tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      texs.set(cv, tx); return tx;
    }
    var cur = null;
    function bind(b){
      if (cur === b) return; cur = b;
      gl.bindBuffer(gl.ARRAY_BUFFER, b.pb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.nb); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
      if (b.cb){ gl.bindBuffer(gl.ARRAY_BUFFER, b.cb); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0); }
      else { gl.disableVertexAttribArray(2); gl.vertexAttrib4f(2, 1, 1, 1, 1); }
      if (b.tb){ gl.bindBuffer(gl.ARRAY_BUFFER, b.tb); gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, 0); }
      else { gl.disableVertexAttribArray(3); gl.vertexAttrib2f(3, 0, 0); }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.ib);
    }
    var W1 = [1, 1, 1, 1];
    function drawNode(nd, line, lw){
      var b = buf(nd.g); if (!b) return;
      bind(b);
      gl.uniformMatrix4fv(U.uM, false, nd.m);
      M4.nrm(nd.nm, nd.m); gl.uniformMatrix3fv(U.uNM, false, nd.nm);
      gl.uniform4fv(U.uCol, nd.c || W1); gl.uniform1f(U.uEm, nd.em || 0);
      if (line) gl.uniform3fv(U.uLineC, nd.lc || R.lineC);
      if (nd.tex && !line){ var tx = texOf(nd.tex); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tx); gl.uniform1i(U.uTex, 0); gl.uniform1f(U.uUseTex, 1); }
      else gl.uniform1f(U.uUseTex, 0);
      gl.uniform1f(U.uOut, line ? lw : 0);
      gl.drawElements(gl.TRIANGLES, b.cnt, b.t, 0);
    }
    var R = {
      gl: gl, canvas: canvas, view: V, proj: P, vp: VP, eye: [0, 5, 10],
      sun: (function(){ var s = [-0.45, 1, 0.55], l = Math.hypot(s[0], s[1], s[2]); return [s[0]/l, s[1]/l, s[2]/l]; })(),
      bg: null, lineC: [0.22, 0.17, 0.16], lineW: 0.011,
      size: function(w, h, dpr){
        var cw = Math.max(1, Math.round(w * dpr)), ch = Math.max(1, Math.round(h * dpr));
        if (canvas.width !== cw || canvas.height !== ch){ canvas.width = cw; canvas.height = ch; }
      },
      camera: function(eye, at, fov, near, far){
        R.eye = eye; M4.lookAt(V, eye, at, [0, 1, 0]);
        M4.persp(P, fov, canvas.width / Math.max(1, canvas.height), near || 0.1, far || 80); M4.mul(VP, P, V);
      },
      /** Toạ độ màn hình (px CSS) của một điểm 3D; null nếu ở sau camera. */
      project: function(x, y, z, cssW, cssH){
        var m = VP, cx = m[0]*x + m[4]*y + m[8]*z + m[12], cy = m[1]*x + m[5]*y + m[9]*z + m[13], cw = m[3]*x + m[7]*y + m[11]*z + m[15];
        if (cw <= 0.01) return null;
        return [(cx / cw * 0.5 + 0.5) * cssW, (1 - (cy / cw * 0.5 + 0.5)) * cssH, cw];
      },
      render: function(roots){
        var op = [], tr = [];
        roots.forEach(function(r){ upd3(r, null); collect3(r, op, tr); });
        gl.viewport(0, 0, canvas.width, canvas.height);
        var bg = R.bg || [0, 0, 0, 0];
        gl.clearColor(bg[0], bg[1], bg[2], bg[3]); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.BLEND); gl.depthMask(true);
        gl.useProgram(pg); cur = null;
        gl.uniformMatrix4fv(U.uVP, false, VP); gl.uniform3fv(U.uSun, R.sun); gl.uniform3fv(U.uEye, R.eye);
        gl.uniform3fv(U.uLineC, R.lineC); gl.uniform1f(U.uLine, 0);
        op.sort(function(a, b){ return (a.ds ? 1 : 0) - (b.ds ? 1 : 0); });
        gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
        var cullOn = true;
        op.forEach(function(nd){
          if (nd.ds && cullOn){ gl.disable(gl.CULL_FACE); cullOn = false; }
          drawNode(nd, false);
        });
        // viền: vẽ mặt sau phồng ra một chút, màu nâu đậm
        gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT); gl.uniform1f(U.uLine, 1);
        op.forEach(function(nd){ if (nd.ol) drawNode(nd, true, R.lineW * (nd.ol === 2 ? 0.6 : 1)); });
        gl.uniform1f(U.uLine, 0); gl.cullFace(gl.BACK); gl.uniform3fv(U.uLineC, R.lineC);
        if (tr.length){
          gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.disable(gl.CULL_FACE);
          tr.forEach(function(nd){ drawNode(nd, false); });
          gl.depthMask(true); gl.disable(gl.BLEND);
        }
      },
      lose: function(){ try { var x = gl.getExtension("WEBGL_lose_context"); if (x) x.loseContext(); } catch (e){} }
    };
    return R;
  }
