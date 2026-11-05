  // ---------- cảnh văn phòng: nhân vật đi lại theo trạng thái ca, camera, chạm chọn ----------
  var OFC = { d: null, at: 0, busy: false, timer: 0, sc: null, err: "", say: 0, th: null, thc: {}, seenChat: 0, edit: null };
  var OFC_FACE = [Math.PI, 0, Math.PI / 2, -Math.PI / 2];
  var OFC_SPEED = 120;                          // px (cm) / giây
  var OFC_AVS = 1.3;                            // nhân vật trong phòng to hơn 30% (đầu ló trên quầy)

  function ofcScene(){
    if (OFC.sc && OFC.sc.R) return OFC.sc;
    var cv = document.createElement("canvas"); cv.className = "ofc-cv";
    var R = R3(cv);
    var sc = { canvas: cv, R: R, ents: {}, cam: null, t0: performance.now(), last: performance.now(), raf: 0, ptr: {}, w: 0, h: 0, lay: "", walls: [], tagEls: [] };
    if (R){ R.bg = [0, 0, 0, 0]; }
    cv.addEventListener("webglcontextlost", function(ev){ ev.preventDefault(); sc.lost = true; });
    OFC.sc = sc;
    if (R) ofcWireInput(sc);
    return sc;
  }
  function ofcCamDefault(sc){
    var L = sc.L, phone = window.innerWidth < 640;
    // điện thoại (màn dọc): nhìn dọc theo chiều dài quán để thấy trọn quầy; máy tính: nhìn từ phía cửa vào
    var pt = phone ? 0.85 : 0.62, yw = phone ? -0.7 : -0.3;
    sc.cam = { tx: lx(L, L.W * (phone ? 0.5 : 0.52)), tz: lz(L, L.H * (phone ? 0.55 : 0.56)), yaw: yw, pitch: pt, dist: phone ? 16 : 13, k: null };
    sc.camT = { tx: sc.cam.tx, tz: sc.cam.tz, yaw: yw, pitch: pt, dist: sc.cam.dist };
  }
  function ofcSetLayout(sc, key, store){
    if (sc.lay === key && sc.store === store) return;
    var same = sc.lay === key;
    sc.lay = key; sc.store = store; sc.L = JSON.parse(JSON.stringify(OFC_LAYOUTS[key]));
    sc.world = ofcBuildWorld(sc.L, { store: store }); sc.nav = navBuild(sc.L);
    sc.tagEls.forEach(function(o){ o.el.remove(); }); sc.tagEls = [];
    if (same) return;
    Object.keys(sc.ents).forEach(function(id){ delete sc.ents[id]; });
    ofcCamDefault(sc);
    sc.fresh = true;
  }
  function ofcEye(c){
    var cp = Math.cos(c.pitch);
    return [c.tx - Math.sin(c.yaw) * cp * c.dist, Math.sin(c.pitch) * c.dist, c.tz - Math.cos(c.yaw) * cp * c.dist];
  }
  /** Người cần có mặt trong phòng lúc này + chỗ của họ. */
  function ofcWanted(d){
    var out = [], on = d.on || {};
    (d.people || []).concat(d.guests || []).forEach(function(p){
      var k = p.st === "in" ? "work" : (p.st === "brk" ? "brk" : (p.st === "soon" ? "lobby" : ""));
      // v55.1: ai đang mở app (ngoài ca) cũng ghé quán — ngồi bàn khách / đứng sảnh → càng đông người mở càng vui
      if (!k && (p.id === d.me || on[p.id])) k = "visit";
      if (k) out.push({ id: p.id, name: p.name, av: p.av || null, kind: k, guest: !!p.guest, st: p.st, store: p.store || "", lv: p.lv || 1, rk: p.rk || 0, kd: p.kd || [] });
    });
    if (d.me === "m" || on.m) out.push({ id: "m", name: "", av: d.mav || null, kind: "visit", st: "", lv: 0, mgr: 1 });
    return out;
  }
  function ofcRankName(d, r){ var v = (d.ranks || [])[r - 1]; return (v && String(v).trim()) || ot("rank" + r); }
  function ofcModeOf(e){ return e.free ? "idle" : (e.kind === "work" ? "work" : ((e.kind === "brk" || (e.spot && e.spot.seat)) ? "brk" : "idle")); }
  function ofcSync(sc, d){
    var L = sc.L, want = ofcWanted(d), seen = {}, taken = { work: {}, brk: {}, lobby: {}, visit: {} };
    var first = sc.fresh; sc.fresh = false;
    Object.keys(sc.ents).forEach(function(id){ var e = sc.ents[id]; if (!e.leaving && e.spot) taken[e.kind][e.spot.i] = id; });
    function spotsOf(k){
      if (k === "work") return L.work.map(function(s, i){ return { i: i, x: s[0], y: s[1], yaw: OFC_FACE[s[2] || 0] }; });
      if (k === "brk") return (L._seats || []).map(function(s, i){ return { i: i, x: s[0], y: s[1], yaw: s[2], seat: 1 }; });
      if (k === "visit") return (L.visit || []).map(function(s, i){ return { i: "v" + i, x: s[0], y: s[1], yaw: Math.PI }; })
        .concat((L._cseats || []).map(function(s, i){ return { i: "c" + i, x: s[0], y: s[1], yaw: s[2], seat: 1 }; }));
      return L.lobby.map(function(s, i){ return { i: i, x: s[0], y: s[1], yaw: Math.PI }; });
    }
    function pick(k, id){
      var S = spotsOf(k);
      for (var i = 0; i < S.length; i++) if (!taken[k][S[i].i] || taken[k][S[i].i] === id){ taken[k][S[i].i] = id; return S[i]; }
      var n = Object.keys(taken[k]).length, base = S[n % S.length], q = sc.nav.nearest(base.x + 45 * (1 + (n / S.length | 0)), base.y + 25);
      var sp = { i: "x" + n, x: q[0], y: q[1], yaw: base.yaw }; taken[k][sp.i] = id; return sp;
    }
    want.forEach(function(w){
      seen[w.id] = 1;
      var e = sc.ents[w.id], uni = w.kind === "work" || w.kind === "brk" || w.st === "soon";
      var ef = w.mgr ? (w.av && w.av.ef != null ? avFxOf(w.av, 0) : 0) : avFxOf(w.av, w.lv);
      var key = JSON.stringify(w.av) + "|" + (uni ? 1 : 0) + "|" + ef;
      if (!e){
        var sp0 = pick(w.kind, w.id);
        e = sc.ents[w.id] = { id: w.id, kind: w.kind, spot: sp0, seed: Math.random() * 6, mode: "idle", path: [], yaw: sp0.yaw, x: 0, y: 0 };
        if (first || w.id === d.me){ e.x = sp0.x; e.y = sp0.y; e.mode = ofcModeOf(e); }
        else { e.x = L.door[0]; e.y = L.door[1]; e.path = sc.nav.path(e.x, e.y, sp0.x, sp0.y); e.mode = "walk"; }
      } else if (e.kind !== w.kind || e.leaving){
        var wasLeaving = e.leaving; e.leaving = false;
        if (e.spot && taken[e.kind][e.spot.i] === w.id) delete taken[e.kind][e.spot.i];
        e.kind = w.kind; e.spot = pick(w.kind, w.id);
        var keepFree = e.free && ((e.live && e.live.m) || (e.self && !wasLeaving));
        if (!keepFree){ e.free = false; e.path = sc.nav.path(e.x, e.y, e.spot.x, e.spot.y); e.mode = "walk"; }
      }
      e.name = w.name; e.guest = w.guest; e.st = w.st; e.lv = w.lv; e.self = w.id === d.me; e.store = w.store; e.ef = ef;
      e.rkName = w.rk ? ofcRankName(d, w.rk) : (w.mgr ? ot("mgrName") : ""); e.kudo = w.kd && w.kd.length ? w.kd[w.kd.length - 1] : null;
      e.gift = !!(d.draw && (d.draw.list || []).some(function(x){ return x.id === w.id; }));
      if (e.key !== key){ e.key = key; e.P = avBuild(w.av, w.id, { uniform: uni }); avFxBuild(e.P, ef); e.P.root.p = [lx(L, e.x), 0, lz(L, e.y)]; e.P.root.s = [OFC_AVS, OFC_AVS, OFC_AVS]; if (e.P.pet) e.P.pet.s = [1.2, 1.2, 1.2]; }
    });
    Object.keys(sc.ents).forEach(function(id){
      var e = sc.ents[id];
      if (seen[id] || e.leaving) return;
      e.leaving = true; e.path = sc.nav.path(e.x, e.y, L.door[0], L.door[1]); e.mode = "walk";
    });
  }

  /** Mỗi khung hình: đi theo đường, xoay mặt, chọn động tác. */
  function ofcStep(sc, dt, t){
    var L = sc.L, gone = [];
    Object.keys(sc.ents).forEach(function(id){
      var e = sc.ents[id];
      if (e.path && e.path.length){
        var tg = e.path[0], dx = tg[0] - e.x, dy = tg[1] - e.y, dd = Math.hypot(dx, dy), stp = OFC_SPEED * dt;
        if (dd <= stp){ e.x = tg[0]; e.y = tg[1]; e.path.shift(); }
        else { e.x += dx / dd * stp; e.y += dy / dd * stp; }
        if (dd > 1) e.ty = Math.atan2(dx, dy);
        e.mode = "walk";
        if (!e.path.length){
          if (e.leaving){ gone.push(id); return; }
          e.mode = ofcModeOf(e);
          if (!e.free) e.ty = e.spot.yaw;
          if (e.self && e.free) e.ty = Math.PI;
          if (e.free && e.endYaw != null && !e.self){ e.ty = e.endYaw; e.endYaw = null; }
          if (e.pendAct === "sit"){                                  // v57: tới ghế → ngồi đúng chỗ, quay đúng hướng ghế
            var stS = ofcSeatNear(L, e.goal ? e.goal[0] : e.x, e.goal ? e.goal[1] : e.y, 60);
            if (stS){ e.x = stS[0]; e.y = stS[1]; e.ty = stS[2]; e.endYaw = null; }
          }
          if (e.pendAct != null){ ofcSetAct(e, e.pendAct, t); e.pendAct = null; }
        }
      }
      if (e.self && e.actEnd && t > e.actEnd){ e.actEnd = 0; ofcSetAct(e, "", t); document.querySelectorAll("[data-ofcact].is-on").forEach(function(b){ b.classList.remove("is-on"); }); }
      ofcAmbient(sc, e, t);
      if (e.ty != null){
        var df = e.ty - e.yaw; while (df > Math.PI) df -= Math.PI * 2; while (df < -Math.PI) df += Math.PI * 2;
        e.yaw += df * Math.min(1, dt * 8);
      }
      var P = e.P; if (!P) return;
      P.root.p[0] = lx(L, e.x); P.root.p[2] = lz(L, e.y); P.root.r[1] = e.yaw;
      var md = e.mode, act = md === "walk" ? "" : (e.act || "");
      if (act === "sit") md = "brk";
      var ex = { seed: e.seed, look: md === "walk" ? 0 : -0.16, seatH: (e.spot && e.spot.seat && !e.free) || e.kind === "brk" && !e.free ? 0.33 : (act === "sit" ? (ofcSeatNear(L, e.x, e.y, 12) ? 0.33 : 0.07) : 0.33) };
      if (e.wave && t < e.wave && !act) ex.wave = 1;
      if (e.jumpAt && t - e.jumpAt < 0.7) ex.jump = (t - e.jumpAt) / 0.7;
      avAnimate(P, md, t, ex);
      avAct(P, act === "sit" ? "" : act, t, ex);
      if (P.fxUpd) P.fxUpd(t);
      if (act && OFC_ACT_BUB[act] && (!e.say || Date.now() > e.say.until) && t - (e.actBubT || 0) > 3.4){
        e.actBubT = t; e.say = { id: "a" + t, text: OFC_ACT_BUB[act], emo: true, until: Date.now() + 1600 };
      }
      if (sc.eye && e.mode !== "walk"){       // liếc nhìn về phía người xem
        var ang = Math.atan2(sc.eye[0] - P.root.p[0], sc.eye[2] - P.root.p[2]) - e.yaw;
        while (ang > Math.PI) ang -= Math.PI * 2; while (ang < -Math.PI) ang += Math.PI * 2;
        P.head.r[1] = Math.max(-0.75, Math.min(0.75, ang)) * 0.75 + P.head.r[1] * 0.3;
      }
      if (md === "brk" && P.shadow) P.shadow.v = false; else if (P.shadow) P.shadow.v = true;
      if (P.pet){
        var px = e.x + Math.cos(e.yaw) * 32 - Math.sin(e.yaw) * 10, py = e.y - Math.sin(e.yaw) * 32 - Math.cos(e.yaw) * 10;
        if (md === "brk"){ px = e.x + 30; py = e.y + 22; }
        e.pp = e.pp || [px, py];
        var pdx = px - e.pp[0], pdy = py - e.pp[1], pd = Math.hypot(pdx, pdy);
        if (pd > 3){ e.pp[0] += pdx * Math.min(1, dt * 3); e.pp[1] += pdy * Math.min(1, dt * 3); e.pyaw = Math.atan2(pdx, pdy); }
        P.pet.p = [lx(L, e.pp[0]), Math.abs(Math.sin(t * 9)) * (pd > 6 ? 0.04 : 0), lz(L, e.pp[1])];
        P.pet.r[1] = e.pyaw != null ? e.pyaw : e.yaw;
        if (P.pet.tail) P.pet.tail.r[1] = Math.sin(t * 6) * 0.5;
      }
    });
    gone.forEach(function(id){ delete sc.ents[id]; });
  }

  function ofcFrame(){
    var sc = OFC.sc; if (!sc || !sc.R) return;
    sc.raf = 0;
    if (!document.body.contains(sc.canvas) || document.hidden || sc.lost) return;
    if (!sc.L || !sc.cam){ sc.raf = requestAnimationFrame(ofcFrame); return; }
    var now = performance.now(), dt = Math.min(0.1, (now - sc.last) / 1000), t = (now - sc.t0) / 1000; sc.last = now;
    var host = sc.canvas.parentNode, w = host.clientWidth, h = host.clientHeight;
    if (w < 10 || h < 10){ sc.raf = requestAnimationFrame(ofcFrame); return; }
    var dpr = Math.min(window.devicePixelRatio || 1, w * h > 500000 ? 1.5 : 2);
    sc.R.size(w, h, dpr); sc.w = w; sc.h = h;
    // camera mượt
    var c = sc.cam, T = sc.camT, k = Math.min(1, dt * 7);
    ["tx", "tz", "pitch", "dist"].forEach(function(q){ c[q] += (T[q] - c[q]) * k; });
    var dy = T.yaw - c.yaw; c.yaw += dy * k;
    ofcStep(sc, dt, t);
    var eye = ofcEye(c), roots = sc.world.nodes.slice(); sc.eye = eye;
    sc.world.walls.forEach(function(wl){
      var hide = wl.out && ((eye[0] - wl.mx) * wl.nx + (eye[2] - wl.mz) * wl.nz) > 0;
      roots.push(hide ? wl.stub : wl.full);
    });
    Object.keys(sc.ents).forEach(function(id){ var e = sc.ents[id]; if (e.P){ roots.push(e.P.root); if (e.P.pet) roots.push(e.P.pet); } });
    if (sc.world.glass) roots.push(sc.world.glass);
    sc.R.camera(eye, [c.tx, 0.55, c.tz], 0.62, 0.3, 60);
    sc.R.render(roots);
    if (window.__ofcProbe === 1){          // dùng cho kiểm thử tự động: đếm điểm ảnh đã vẽ
      var gl = sc.R.gl, n = 0, b = new Uint8Array(4);
      for (var i = 1; i < 10; i++) for (var j = 1; j < 10; j++){ gl.readPixels(Math.round(sc.canvas.width * i / 10), Math.round(sc.canvas.height * j / 10), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, b); if (b[3] > 0) n++; }
      window.__ofcProbe = n;
    }
    ofcOverlay(sc, t);
    sc.raf = requestAnimationFrame(ofcFrame);
  }
  window.__ofcSc = function(){ return OFC.sc; };
  function ofcLoop(){ var sc = OFC.sc; if (sc && sc.R && !sc.raf){ sc.last = performance.now(); sc.raf = requestAnimationFrame(ofcFrame); } }

  /** Thẻ tên + bong bóng chat (HTML nổi trên khung 3D: chữ sắc nét, đúng font của app). */
  function ofcOverlay(sc, t){
    var ov = document.getElementById("ofcOv"); if (!ov) return;
    var R = sc.R, W = sc.w, H = sc.h, now = Date.now();
    Object.keys(sc.ents).forEach(function(id){
      var e = sc.ents[id];
      if (!e.tag){
        e.tag = document.createElement("div"); e.tag.className = "ofc-tag"; ov.appendChild(e.tag);
        e.bub = document.createElement("div"); e.bub.className = "ofc-bub"; ov.appendChild(e.bub);
        e.rib = document.createElement("div"); e.rib.className = "ofc-hon"; ov.appendChild(e.rib);
      }
      var lbl = (e.guest ? "✈ " : "") + e.name + (e.st === "brk" ? " ☕" : "") + (e.st === "soon" ? " ⏰" : "") + (e.gift ? " 🎁" : "");
      if (e._lbl !== lbl || e._ef !== e.ef || e._rk !== e.rkName){
        e._lbl = lbl; e._ef = e.ef; e._rk = e.rkName; e.tag.textContent = "";
        if (e.rkName){ var ri = document.createElement("i"); ri.className = "ofc-rk"; ri.textContent = e.rkName; e.tag.appendChild(ri); }
        e.tag.appendChild(document.createTextNode(lbl));
        e.tag.className = "ofc-tag" + (e.self ? " is-me" : "") + (e.kind === "visit" ? " is-visit" : "") + (e.ef ? " fx-" + e.ef : "");
      }
      var hy = e.mode === "brk" ? 1.18 : 1.42;
      if (e._kind !== e.kind){ e._kind = e.kind; e.tag.classList.toggle("is-visit", e.kind === "visit"); }
      var p = R.project(lx(sc.L, e.x), hy * (e.P ? e.P.hk : 1) * OFC_AVS * 0.86, lz(sc.L, e.y), W, H);
      var pf = R.project(lx(sc.L, e.x), -0.02, lz(sc.L, e.y), W, H);
      if (!p || !pf || p[0] < -60 || p[0] > W + 60 || p[1] < -60 || p[1] > H + 60){ e.tag.style.display = "none"; e.bub.style.display = "none"; e.rib.style.display = "none"; return; }
      var hon = e.kudo ? (OFC_KUDO_ICON[e.kudo.k] || "🏅") + " " + ot("kd_" + e.kudo.k) : "";
      if (e.rib._t !== hon){ e.rib._t = hon; e.rib.textContent = hon; }
      e.rib.style.display = hon ? "" : "none";
      if (hon){ e.rib.style.transform = "translate(" + Math.round(p[0]) + "px," + Math.round(p[1] - 4) + "px) translate(-50%,-100%)"; e.rib.style.zIndex = String(1500 - Math.round(p[2] * 10)); }
      e.tag.style.display = ""; e.tag.style.transform = "translate(" + Math.round(pf[0]) + "px," + Math.round(pf[1] + 4) + "px) translateX(-50%)";
      e.tag.style.zIndex = String(1000 - Math.round(pf[2] * 10));
      var b = e.say && now < e.say.until;
      e.bub.style.display = b ? "" : "none";
      if (b){
        if (e.bub._id !== e.say.id){ e.bub._id = e.say.id; e.bub.textContent = e.say.text; e.bub.classList.toggle("is-emo", !!e.say.emo); e.bub.classList.remove("pop"); void e.bub.offsetWidth; e.bub.classList.add("pop"); }
        e.bub.style.transform = "translate(" + Math.round(p[0]) + "px," + Math.round(p[1] - (hon ? 30 : 6)) + "px) translate(-50%,-100%)";
        e.bub.style.zIndex = String(2000 - Math.round(p[2] * 10));
      }
    });
    Array.prototype.slice.call(ov.querySelectorAll(".ofc-tag,.ofc-bub,.ofc-hon")).forEach(function(el){
      var alive = Object.keys(sc.ents).some(function(id){ var q = sc.ents[id]; return q.tag === el || q.bub === el || q.rib === el; });
      if (!alive) el.remove();
    });
    // nhãn tủ (A, B…) + 納品口: chỉ khi nhìn gần
    if (!sc.tagEls.length) sc.world.tags.forEach(function(tg){ var el = document.createElement("div"); el.className = "ofc-utag k-" + tg.k; el.textContent = tg.t; ov.appendChild(el); sc.tagEls.push({ el: el, tg: tg }); });
    var near = sc.cam.dist < 10.5;
    sc.tagEls.forEach(function(o){
      if (!o.el.isConnected) ov.appendChild(o.el);
      var p2 = near ? R.project(o.tg.x, o.tg.y, o.tg.z, W, H) : null;
      o.el.style.display = p2 ? "" : "none";
      if (p2) o.el.style.transform = "translate(" + Math.round(p2[0]) + "px," + Math.round(p2[1]) + "px) translate(-50%,-50%)";
    });
  }

  /** Chạm (không kéo) → chọn người / bảng tin / chỗ trống để nhân vật của mình đi tới. */
  function ofcTap(sc, cx, cy){
    var R = sc.R, best = null, bd = 1e9;
    Object.keys(sc.ents).forEach(function(id){
      var e = sc.ents[id];
      [0.75, 1.15].forEach(function(hh){
        var p = R.project(lx(sc.L, e.x), hh * OFC_AVS * (e.mode === "brk" ? 0.8 : 1), lz(sc.L, e.y), sc.w, sc.h); if (!p) return;
        var r = 520 / p[2], dd = Math.hypot(p[0] - cx, p[1] - cy);
        if (dd < Math.max(26, r) && dd < bd){ bd = dd; best = e; }
      });
    });
    if (best){ ofcPersonCard(best.id); return; }
    var bp = R.project(sc.world.board.x, sc.world.board.y, sc.world.board.z, sc.w, sc.h);
    if (bp && Math.hypot(bp[0] - cx, bp[1] - cy) < Math.max(30, 700 / bp[2])){ ofcBoardDialog(); return; }
    // sàn: tia từ camera cắt mặt sàn
    var c = sc.cam, eye = ofcEye(c), at = [c.tx, 0.55, c.tz];
    var f = [at[0] - eye[0], at[1] - eye[1], at[2] - eye[2]], fl = Math.hypot(f[0], f[1], f[2]); f = [f[0] / fl, f[1] / fl, f[2] / fl];
    var rt = [f[1] * 0 - f[2] * 1, f[2] * 0 - f[0] * 0, f[0] * 1 - f[1] * 0], rl = Math.hypot(rt[0], rt[1], rt[2]); rt = [rt[0] / rl, rt[1] / rl, rt[2] / rl];
    var up = [rt[1] * f[2] - rt[2] * f[1], rt[2] * f[0] - rt[0] * f[2], rt[0] * f[1] - rt[1] * f[0]];
    var th = Math.tan(0.31), asp = sc.w / sc.h, nx = (cx / sc.w) * 2 - 1, ny = 1 - (cy / sc.h) * 2;
    var dir = [f[0] + rt[0] * nx * th * asp + up[0] * ny * th, f[1] + rt[1] * nx * th * asp + up[1] * ny * th, f[2] + rt[2] * nx * th * asp + up[2] * ny * th];
    if (dir[1] >= -0.01) return;
    var tt = -eye[1] / dir[1], wx = eye[0] + dir[0] * tt, wz = eye[2] + dir[2] * tt;
    var mx = wx * 100 + sc.L.W / 2, my = wz * 100 + sc.L.H / 2;
    var me = OFC.d && sc.ents[OFC.d.me];
    if (!me || mx < 0 || my < 0 || mx > sc.L.W || my > sc.L.H) return;
    var q = sc.nav.nearest(mx, my);
    me.path = sc.nav.path(me.x, me.y, q[0], q[1]); me.free = true; me.mode = "walk"; me.goal = [q[0], q[1]];
    ofcSetAct(me, "", (performance.now() - sc.t0) / 1000); me.pendAct = null;
    document.querySelectorAll("[data-ofcact].is-on").forEach(function(b){ b.classList.remove("is-on"); });
    OFC_LV.last = ""; setTimeout(ofcLiveTick, 30);
    ofcPing(sc, wx, wz);
  }
  function ofcPing(sc, wx, wz){
    var ov = document.getElementById("ofcOv"), p = sc.R.project(wx, 0, wz, sc.w, sc.h); if (!ov || !p) return;
    var el = document.createElement("div"); el.className = "ofc-ping"; el.style.transform = "translate(" + Math.round(p[0]) + "px," + Math.round(p[1]) + "px)";
    ov.appendChild(el); setTimeout(function(){ el.remove(); }, 700);
  }

  function ofcWireInput(sc){
    var cv = sc.canvas, P = sc.ptr, g = null;
    function clampT(){
      var T = sc.camT, L = sc.L; if (!L) return;
      T.tx = Math.max(lx(L, 0), Math.min(lx(L, L.W), T.tx)); T.tz = Math.max(lz(L, 0), Math.min(lz(L, L.H), T.tz));
      T.dist = Math.max(4.5, Math.min(20, T.dist)); T.pitch = Math.max(0.32, Math.min(1.35, T.pitch));
    }
    function pan(dx, dy){
      var T = sc.camT, s = T.dist * 0.0021 * (700 / Math.max(300, sc.h));
      var fx = Math.sin(T.yaw), fz = Math.cos(T.yaw), rx = -Math.cos(T.yaw), rz = Math.sin(T.yaw);
      T.tx -= rx * dx * s; T.tz -= rz * dx * s;
      T.tx += fx * dy * s / Math.max(0.45, Math.sin(T.pitch)); T.tz += fz * dy * s / Math.max(0.45, Math.sin(T.pitch));
      clampT();
    }
    cv.addEventListener("pointerdown", function(ev){
      if (!sc.cam) return;
      try { cv.setPointerCapture(ev.pointerId); } catch (e){}
      P[ev.pointerId] = { x: ev.clientX, y: ev.clientY, x0: ev.clientX, y0: ev.clientY, t0: Date.now(), b: ev.button, sh: ev.shiftKey };
      g = null; ev.preventDefault();
    });
    cv.addEventListener("pointermove", function(ev){
      var p = P[ev.pointerId]; if (!p || !sc.cam) return;
      var ids = Object.keys(P), T = sc.camT;
      if (ids.length >= 2){
        var a = P[ids[0]], b = P[ids[1]];
        var d0 = Math.hypot(a.x - b.x, a.y - b.y), an0 = Math.atan2(b.y - a.y, b.x - a.x), m0 = [(a.x + b.x) / 2, (a.y + b.y) / 2];
        p.x = ev.clientX; p.y = ev.clientY; p.mv = 1;
        var d1 = Math.hypot(a.x - b.x, a.y - b.y), an1 = Math.atan2(b.y - a.y, b.x - a.x), m1 = [(a.x + b.x) / 2, (a.y + b.y) / 2];
        if (d0 > 10 && d1 > 10) T.dist *= d0 / d1;
        var da = an1 - an0; if (da > Math.PI) da -= Math.PI * 2; if (da < -Math.PI) da += Math.PI * 2;
        T.yaw -= da; pan(m1[0] - m0[0], m1[1] - m0[1]); clampT(); return;
      }
      var dx = ev.clientX - p.x, dy = ev.clientY - p.y; p.x = ev.clientX; p.y = ev.clientY;
      if (Math.hypot(p.x - p.x0, p.y - p.y0) > 7) p.mv = 1;
      if (!p.mv) return;
      if (p.b === 2 || p.sh || ev.shiftKey){ T.yaw -= dx * 0.008; T.pitch += dy * 0.006; clampT(); }
      else pan(dx, dy);
    });
    function up(ev){
      var p = P[ev.pointerId]; delete P[ev.pointerId];
      if (!p || !sc.cam) return;
      if (!p.mv && Date.now() - p.t0 < 450 && !Object.keys(P).length){
        var r = cv.getBoundingClientRect(); ofcTap(sc, ev.clientX - r.left, ev.clientY - r.top);
      }
    }
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", function(ev){ delete P[ev.pointerId]; });
    cv.addEventListener("contextmenu", function(ev){ ev.preventDefault(); });
    cv.addEventListener("wheel", function(ev){ if (!sc.cam) return; ev.preventDefault(); sc.camT.dist *= Math.exp(ev.deltaY * 0.0012); clampT(); }, { passive: false });
    sc.ctl = function(k){
      if (!sc.cam) return; var T = sc.camT;
      if (k === "l") T.yaw += Math.PI / 4; else if (k === "r") T.yaw -= Math.PI / 4;
      else if (k === "+") T.dist *= 0.8; else if (k === "-") T.dist *= 1.25;
      else if (k === "0"){ var keep = T.yaw; ofcCamDefault(sc); sc.cam.yaw = keep; sc.camT.yaw = Math.round(keep / (Math.PI * 2)) * Math.PI * 2; }
      clampT();
    };
  }
