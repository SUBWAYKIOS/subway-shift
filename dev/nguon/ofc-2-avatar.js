  // ---------- nhân vật chibi ----------
  var AVP = {
    skin: ["#FFE3CF", "#F8D2B4", "#EDBE98", "#DDA57A", "#C0875C", "#966240", "#6E472C", "#FBDCD2"],
    hair: ["#2B2421", "#4A3428", "#75492D", "#9C5B32", "#E2BE6C", "#EFE4C8", "#B5432B", "#F29BBA", "#4C7ED6", "#8A63C8", "#4EA36D", "#A9A9B0"],
    eye: ["#2E201A", "#3F2C1F", "#1F2D52", "#26462E", "#5B3B1C", "#1C1C1C"],
    cloth: ["#E8EEF2", "#2E3440", "#E35D5B", "#F2A541", "#F4D35E", "#7BC67E", "#3FA7A3", "#4D7FD6", "#7A63C8", "#E58FB4", "#9C6B4E", "#5E6B7A"],
    pants: ["#2F3A4F", "#1F1F24", "#6B5444", "#8B9AAE", "#C9B79C", "#3E5E46"],
    uni: "#1F7A3D", uniTrim: "#F2C200", apron: "#2A2A2E"
  };
  /** Nhân vật mặc định suy ra từ id (ai chưa tự tạo cũng có một nhân vật riêng, không trùng nhau). */
  function avDefault(id){
    var h = 2166136261; String(id || "x").split("").forEach(function(c){ h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; });
    function r(n){ h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return h % (n + 1); }
    return { h: r(2), b: r(2), sk: r(4), fs: r(2), ey: [0, 1, 4, 7][r(3)], ec: r(5), br: 1 + r(2), mo: [0, 0, 1, 2, 5][r(4)], fx: r(1),
             hs: r(9), hc: r(5), of: 1 + r(3), oc: r(11), pc: r(5), ac: 0, pet: 0, uw: 1 };
  }
  function avFix(a, id){ var d = avDefault(id); a = a || {}; var o = {}; Object.keys(d).forEach(function(k){ o[k] = a[k] == null ? d[k] : Number(a[k]) || 0; }); if (a.ef != null) o.ef = Number(a.ef) || 0; return o; }

  var AV_HEAD_R = 0.27;
  function avGeo(){
    var R = AV_HEAD_R;
    return GEO.get("av", function(){
      return {
        head: GEO.sphere(R, 26, 18), ear: GEO.sphere(0.055, 10, 8), eye: GEO.sphere(1, 12, 10), dot: GEO.sphere(1, 8, 6),
        neck: GEO.cyl(0.05, 0.055, 0.08, 10),
        arm: GEO.capsule(0.045, 0.27, 10), sleeveS: GEO.capsule(0.06, 0.13, 10), sleeveL: GEO.capsule(0.056, 0.25, 10),
        hand: GEO.sphere(0.052, 10, 8), leg: GEO.capsule(0.062, 0.27, 10), shoe: GEO.sphere(1, 12, 8),
        smile: GEO.arc(0.05, 0.011, 2.2), grin: GEO.arc(0.06, 0.013, 2.6), flat: GEO.arc(0.3, 0.01, 0.32), happy: GEO.arc(0.035, 0.011, 2.3),
        brow: GEO.arc(0.09, 0.011, 1.0), browS: GEO.capsule(0.012, 0.075, 6),
        cone: GEO.lathe([[0, 1], [0.35, 0.5], [0.5, 0], [0, 0]], 12), box: GEO.box(1, 1, 1), disc: GEO.disc(1, 24),
        ring: GEO.torus(1, 0.12, Math.PI * 2, 24, 8), band: GEO.torus(1, 0.06, Math.PI * 1.1, 18, 6), cylU: GEO.cyl(1, 1, 1, 18)
      };
    });
  }
  function torsoGeo(bw, T){
    return GEO.get("torso" + bw + "_" + T, function(){
      var w = 0.155 * bw, pr = [[0, T + 0.02], [0.07, T + 0.015], [w * 0.92, T - 0.03], [w, T - 0.09], [w * 0.95, T * 0.5], [w * 1.02, 0.07], [w * 0.9, 0.0], [0.06, -0.035], [0, -0.04]];
      return GEO.lathe(pr, 18);
    });
  }
  function hairCap(R, thL, key){ return GEO.get("cap" + key, function(){ return GEO.sphere(R, 26, 14, 0, thL); }); }

  /** Dựng nhân vật → { root, parts } — mọi kích thước tính theo mét (người chibi cao ~1,35). */
  function avBuild(a0, id, opt){
    opt = opt || {};
    var a = avFix(a0, id), G = avGeo(), R = AV_HEAD_R;
    var hk = [0.86, 1, 1.13][a.h], bw = [0.86, 1, 1.2][a.b], L = 0.24 * hk, T = 0.34 * hk;
    var skin = hexRGB(AVP.skin[a.sk]), hair = hexRGB(AVP.hair[a.hc]), eyeC = hexRGB(AVP.eye[a.ec]);
    var uni = opt.uniform && a.uw;
    var shirt = uni ? hexRGB(AVP.uni) : hexRGB(AVP.cloth[a.oc]), pants = hexRGB(uni ? "#26262B" : AVP.pants[a.pc]);
    var root = N3(null), body = addK(root, N3(null, null, { p: [0, L + 0.06, 0] }));
    var P = { root: root, body: body, L: L, T: T, hk: hk };
    // chân + giày
    [-1, 1].forEach(function(sd){
      var leg = addK(body, N3(G.leg, pants, { p: [sd * 0.075 * bw, 0.02, 0], ol: 1 }));
      addK(leg, N3(G.shoe, "#3A3030", { p: [0, -L + 0.0, 0.03], s: [0.075, 0.05, 0.105], ol: 1 }));
      P[sd < 0 ? "legL" : "legR"] = leg;
    });
    // thân
    var torso = addK(body, N3(null)); P.torso = torso;
    var tg = torsoGeo(bw, T);
    addK(torso, N3(tg, shirt, { s: [1, 1, 0.82], ol: 1 }));
    if (uni){
      addK(torso, N3(G.box, AVP.apron, { p: [0, -0.03, 0.118 * bw], s: [0.22 * bw, T * 0.5, 0.02], r: [-0.05, 0, 0] }));
      addK(torso, N3(G.box, AVP.apron, { p: [0, T * 0.45, 0.1 * bw], s: [0.12 * bw, T * 0.32, 0.02], r: [0.12, 0, 0] }));
      addK(torso, N3(G.ring, AVP.uniTrim, { p: [0, T - 0.005, 0], s: [0.08, 0.08, 0.07], r: [Math.PI / 2, 0, 0] }));
    } else if (a.of === 2){            // áo hoodie: mũ trùm sau gáy + túi
      addK(torso, N3(G.ring, shade(shirt, 0.9), { p: [0, T - 0.01, -0.02], s: [0.11, 0.11, 0.09], r: [Math.PI / 2 + 0.3, 0, 0], ol: 2 }));
      addK(torso, N3(G.box, shade(shirt, 0.88), { p: [0, T * 0.15, 0.115 * bw], s: [0.16 * bw, 0.08, 0.02] }));
    } else if (a.of === 3){            // sơ mi + cà vạt
      addK(torso, N3(G.ring, "#FFFFFF", { p: [0, T - 0.005, 0], s: [0.085, 0.085, 0.075], r: [Math.PI / 2, 0, 0] }));
      addK(torso, N3(G.box, "#C0392B", { p: [0, T * 0.45, 0.118 * bw], s: [0.035, T * 0.45, 0.02] }));
    } else if (a.of === 4){            // áo len sọc
      [0.3, 0.55].forEach(function(f){ addK(torso, N3(G.ring, "#FFFFFF", { p: [0, T * f, 0], s: [0.152 * bw, 0.152 * bw, 0.128 * bw], r: [Math.PI / 2, 0, 0] })); });
    } else if (a.of === 5){            // áo khoác lễ phục: nút vàng
      [0.25, 0.45, 0.65].forEach(function(f){ addK(torso, N3(G.dot, "#E8C25A", { p: [0, T * f, 0.128 * bw], s: [0.017, 0.017, 0.01] })); });
      addK(torso, N3(G.ring, "#F5F5F5", { p: [0, T - 0.005, 0], s: [0.085, 0.085, 0.075], r: [Math.PI / 2, 0, 0] }));
    }
    // tay
    [-1, 1].forEach(function(sd){
      var sh = addK(torso, N3(null, null, { p: [sd * (0.155 * bw + 0.035), T - 0.07, 0], r: [0, 0, sd * 0.1] }));
      addK(sh, N3(G.arm, skin, { ol: 1 }));
      var longS = uni ? false : (a.of === 2 || a.of === 3 || a.of === 4 || a.of === 5);
      addK(sh, N3(longS ? G.sleeveL : G.sleeveS, shirt, { p: [0, 0.01, 0], ol: 1 }));
      addK(sh, N3(G.hand, skin, { p: [0, -0.27, 0], ol: 2 }));
      P[sd < 0 ? "armL" : "armR"] = sh;
    });
    // đầu
    var neck = addK(torso, N3(G.neck, skin, { p: [0, T - 0.02, 0] }));
    var fsS = [[1, 1, 1], [0.94, 1.06, 0.96], [1.07, 0.95, 1.02]][a.fs];
    var head = addK(torso, N3(null, null, { p: [0, T + R * 0.9, 0] })); P.head = head;
    var hs = addK(head, N3(null, null, { s: fsS }));
    addK(hs, N3(G.head, skin, { ol: 1 }));
    [-1, 1].forEach(function(sd){ addK(hs, N3(G.ear, skin, { p: [sd * R * 0.97, -0.01, 0], s: [0.55, 1, 0.8] })); });
    function onF(az, el, d){ var rr = R + (d || 0); return [Math.sin(az) * Math.cos(el) * rr, Math.sin(el) * rr, Math.cos(az) * Math.cos(el) * rr]; }
    // mắt
    var eyes = addK(hs, N3(null)); P.eyes = [];
    [-1, 1].forEach(function(sd){
      var g = addK(eyes, N3(null, null, { p: onF(sd * 0.36, -0.06, -0.005), r: [0.06, sd * 0.36, 0] }));
      P.eyes.push(g);
      var st = a.ey === 6 && sd > 0 ? 3 : a.ey;
      if (st === 2){ addK(g, N3(G.flat, eyeC, { p: [0, -0.03, 0.006], s: [0.12, 1, 1], r: [0, 0, Math.PI] })); return; }
      if (st === 3){ addK(g, N3(G.happy, eyeC, { p: [0, 0.005, 0.006], r: [0, 0, Math.PI] })); return; }
      var ew = [0.038, 0.046, 0, 0, 0.044, 0.04, 0.038, 0.026][st], eh = [0.05, 0.062, 0, 0, 0.03, 0.046, 0.05, 0.026][st];
      var tilt = st === 5 ? -sd * 0.35 : (st === 4 ? -sd * 0.12 : 0);
      addK(g, N3(G.eye, eyeC, { s: [ew, eh, 0.016], r: [0, 0, tilt] }));
      addK(g, N3(G.dot, "#FFFFFF", { p: [ew * 0.35, eh * 0.38, 0.013], s: [ew * 0.36, ew * 0.36, 0.006], em: 1 }));
      if (st === 1) addK(g, N3(G.dot, "#FFFFFF", { p: [-ew * 0.32, -eh * 0.35, 0.013], s: [ew * 0.2, ew * 0.2, 0.005], em: 1 }));
    });
    // lông mày
    if (a.br){
      [-1, 1].forEach(function(sd){
        var pos = onF(sd * 0.37, 0.24, 0.0), rot = [0.25, sd * 0.37, 0];
        if (a.br === 1) addK(hs, N3(G.browS, hair, { p: pos, r: [rot[0], rot[1], Math.PI / 2 + sd * 0.0], s: [1, 1, 0.6] }));
        else if (a.br === 2) addK(hs, N3(G.brow, hair, { p: [pos[0], pos[1] - 0.012, pos[2]], r: [rot[0], rot[1], Math.PI] , s: [0.75, 1, 0.6] }));
        else if (a.br === 3) addK(hs, N3(G.browS, hair, { p: pos, r: [rot[0], rot[1], Math.PI / 2], s: [1.8, 1.05, 0.7] }));
        else addK(hs, N3(G.browS, hair, { p: pos, r: [rot[0], rot[1], Math.PI / 2 - sd * 0.32], s: [1.2, 1, 0.6] }));
      });
    }
    // miệng
    var mp = onF(0, -0.36, 0.002), mr = [0.36, 0, 0], dark = "#7A2E2E";
    if (a.mo === 0) addK(hs, N3(G.smile, dark, { p: [mp[0], mp[1] - 0.008, mp[2]], r: mr }));
    else if (a.mo === 1){ addK(hs, N3(G.dot, dark, { p: mp, r: mr, s: [0.042, 0.03, 0.012] })); addK(hs, N3(G.dot, "#F08A8A", { p: [mp[0], mp[1] - 0.012, mp[2] + 0.004], r: mr, s: [0.024, 0.012, 0.006] })); }
    else if (a.mo === 2) addK(hs, N3(G.dot, dark, { p: mp, r: mr, s: [0.016, 0.019, 0.008] }));
    else if (a.mo === 3){ [-1, 1].forEach(function(sd){ addK(hs, N3(G.happy, dark, { p: [mp[0] + sd * 0.016, mp[1] + 0.004, mp[2]], r: mr, s: [0.5, 0.5, 0.6] })); }); }
    else if (a.mo === 4){ addK(hs, N3(G.grin, dark, { p: [mp[0], mp[1] - 0.012, mp[2]], r: mr })); addK(hs, N3(G.box, "#FFFFFF", { p: [mp[0], mp[1] - 0.004, mp[2] - 0.004], r: mr, s: [0.06, 0.014, 0.012] })); }
    else if (a.mo === 5) addK(hs, N3(G.flat, dark, { p: [mp[0], mp[1] - 0.05, mp[2]], r: mr, s: [0.12, 1, 1] }));
    else { addK(hs, N3(G.smile, dark, { p: [mp[0], mp[1] - 0.008, mp[2]], r: mr })); addK(hs, N3(G.dot, "#EF7C8E", { p: [mp[0] + 0.012, mp[1] - 0.03, mp[2] + 0.004], r: mr, s: [0.016, 0.02, 0.008] })); }
    // má hồng / tàn nhang
    if (a.fx === 1 || a.fx === 3) [-1, 1].forEach(function(sd){ addK(hs, N3(G.dot, "#F4A3A3", { p: onF(sd * 0.62, -0.24, -0.008), r: [0.24, sd * 0.62, 0], s: [0.04, 0.022, 0.012] })); });
    if (a.fx >= 2) [-1, 1].forEach(function(sd){ [[0.52, -0.15], [0.6, -0.12], [0.56, -0.2]].forEach(function(q){
      addK(hs, N3(G.dot, "#B57A55", { p: onF(sd * q[0], q[1], -0.002), r: [0, sd * q[0], 0], s: [0.006, 0.006, 0.004] })); }); });
    // tóc
    avHair(hs, a.hs, hair, G, R);
    // phụ kiện
    avAcc(hs, a.ac, G, R, a);
    // bóng đổ dưới chân
    if (!opt.noShadow) P.shadow = addK(root, N3(G.disc, [0.12, 0.09, 0.1, 0.22], { p: [0, 0.005, 0], s: [0.26 * bw, 1, 0.21 * bw], tr: true }));
    if (a.pet && !opt.noPet) P.pet = avPet(a.pet, G);
    return P;
  }

  function avHair(hs, st, col, G, R){
    var dk = shade(col, 0.88);
    function cap(thL, tilt, rs, key){ return addK(hs, N3(hairCap(R * (rs || 1.08), thL, key + "_" + (rs || 1.08)), col, { r: [tilt, 0, 0], ol: 1, ds: true })); }
    function blob(p, s, r, c){ return addK(hs, N3(G.dot, c || col, { p: p, s: s, r: r || [0, 0, 0], ol: 1 })); }
    function bangs(){ blob([0, R * 0.74, R * 0.5], [R * 0.82, R * 0.3, R * 0.5], [0.55, 0, 0]); }
    if (st === 0){ cap(1.55, -0.55, 1.08, "s"); bangs(); [-1, 1].forEach(function(sd){ blob([sd * R * 0.86, R * 0.2, -R * 0.05], [R * 0.25, R * 0.42, R * 0.45]); }); }
    else if (st === 1){ cap(1.5, -0.5, 1.035, "b"); }
    else if (st === 2){ cap(1.55, -0.55, 1.08, "s"); blob([-R * 0.2, R * 0.72, R * 0.52], [R * 0.9, R * 0.28, R * 0.48], [0.55, 0, -0.3]); }
    else if (st === 3){ cap(1.45, -0.5, 1.07, "sp"); [[0, 1.12, 0.1], [0.42, 1.0, 0.05], [-0.42, 1.0, 0.05], [0.25, 0.95, 0.5], [-0.25, 0.95, 0.5], [0, 0.9, -0.5]].forEach(function(q){
      var sp = addK(hs, N3(G.cone, col, { p: [q[0] * R, q[1] * R - 0.02, q[2] * R], s: [0.12, 0.16, 0.12], r: [q[2] * 0.9, 0, -q[0] * 0.9], ol: 2 })); return sp; }); bangs(); }
    else if (st === 4){ cap(1.92, -0.66, 1.1, "bob"); bangs(); }
    else if (st === 5){ cap(1.6, -0.5, 1.08, "s"); bangs(); blob([0, -R * 0.35, -R * 0.55], [R * 0.95, R * 1.05, R * 0.45]);
      [-1, 1].forEach(function(sd){ blob([sd * R * 0.85, -R * 0.35, -R * 0.05], [R * 0.25, R * 0.85, R * 0.4]); }); }
    else if (st === 6){ cap(1.6, -0.5, 1.08, "s"); bangs(); blob([0, R * 0.25, -R * 1.02], [R * 0.2, R * 0.2, R * 0.2], null, dk);
      addK(hs, N3(G.leg, col, { p: [0, R * 0.25, -R * 1.12], r: [0.35, 0, 0], s: [1.05, 1.25, 0.95], ol: 1 })); }
    else if (st === 7){ cap(1.6, -0.5, 1.08, "s"); bangs(); [-1, 1].forEach(function(sd){
      addK(hs, N3(G.leg, col, { p: [sd * R * 0.95, R * 0.25, -R * 0.15], r: [0.2, 0, sd * 0.45], s: [0.95, 1.15, 0.9], ol: 1 })); }); }
    else if (st === 8){ cap(1.6, -0.5, 1.08, "s"); bangs(); blob([0, R * 1.1, -R * 0.25], [R * 0.42, R * 0.38, R * 0.42]); }
    else if (st === 9){ cap(1.6, -0.45, 1.06, "c"); [[0, 1.02, 0.15], [0.5, 0.85, 0.3], [-0.5, 0.85, 0.3], [0.8, 0.4, 0], [-0.8, 0.4, 0], [0.55, 0.75, -0.55], [-0.55, 0.75, -0.55], [0, 0.85, -0.6], [0, 0.4, -0.95], [0.6, 0.2, -0.7], [-0.6, 0.2, -0.7], [0.3, 0.95, 0.55], [-0.3, 0.95, 0.55]].forEach(function(q){
      blob([q[0] * R, q[1] * R, q[2] * R], [R * 0.36, R * 0.36, R * 0.36]); }); }
    else if (st === 10){ cap(1.5, -0.5, 1.03, "mh"); [0.9, 0.55, 0.1, -0.35, -0.75].forEach(function(z, i){ blob([0, (1.08 - Math.abs(z) * 0.25) * R, z * R], [R * 0.16, R * 0.32, R * 0.26], [z, 0, 0], i % 2 ? dk : col); }); }
    else if (st === 11){ cap(1.7, -0.45, 1.1, "pr"); bangs(); blob([0, -R * 0.45, -R * 0.6], [R * 1.08, R * 1.25, R * 0.5]);
      [-1, 1].forEach(function(sd){ blob([sd * R * 0.9, -R * 0.55, R * 0.05], [R * 0.32, R * 1.0, R * 0.45]); blob([sd * R * 0.95, -R * 1.35, R * 0.15], [R * 0.3, R * 0.3, R * 0.3]); });
      blob([R * 0.62, R * 0.8, R * 0.25], [R * 0.13, R * 0.13, R * 0.1], null, "#F7A8C4"); }
  }

  function avAcc(hs, ac, G, R, a){
    function n(g, c, o){ o.ol = o.ol == null ? 2 : o.ol; return addK(hs, N3(g, c, o)); }
    if (ac === 1){ var vg = addK(hs, N3(null, null, { r: [-0.32, 0, 0] }));
      addK(vg, N3(G.ring, "#1F1F24", { p: [0, R * 0.42, 0], s: [R * 0.97, R * 0.97, R * 0.97], r: [Math.PI / 2, 0, 0], ol: 2 }));
      addK(vg, N3(G.dot, "#1F1F24", { p: [0, R * 0.4, R * 0.95], s: [R * 0.72, 0.014, R * 0.5], ol: 2 })); }
    else if (ac === 2){ var bc = hexRGB(AVP.cloth[(a.oc + 3) % 12]), bg = addK(hs, N3(null, null, { r: [-0.5, 0, 0] }));
      addK(bg, N3(hairCap(R * 1.13, 1.42, "bn"), bc, { ol: 2, ds: true }));
      addK(bg, N3(G.ring, shade(bc, 0.82), { p: [0, Math.cos(1.42) * R * 1.13, 0], s: [Math.sin(1.42) * R * 1.13, Math.sin(1.42) * R * 1.13, R * 0.6], r: [Math.PI / 2, 0, 0], ol: 2 }));
      addK(bg, N3(G.dot, "#FFFFFF", { p: [0, R * 1.16, 0], s: [0.065, 0.065, 0.065], ol: 2 })); }
    else if (ac === 3 || ac === 4 || ac === 5){
      var fc = ac === 5 ? "#111111" : "#3B2F2A";
      [-1, 1].forEach(function(sd){
        var p = [Math.sin(sd * 0.36) * R * 1.03, -R * 0.06, Math.cos(0.36) * R * 1.03];
        if (ac === 4) n(G.ring, fc, { p: p, s: [0.055, 0.055, 0.05], r: [0, sd * 0.36, 0], ol: 0 });
        else n(G.box, fc, { p: [p[0], p[1] - 0.035, p[2]], s: [0.1, 0.07, 0.012], r: [0, sd * 0.36, 0], ol: 0 });
        if (ac === 5) n(G.box, "#2A3E5C", { p: [p[0], p[1] - 0.03, p[2] + 0.004], s: [0.088, 0.058, 0.01], r: [0, sd * 0.36, 0], ol: 0 });
      });
      n(G.box, fc, { p: [0, -R * 0.03, R * 1.05], s: [0.05, 0.012, 0.012], ol: 0 });
    }
    else if (ac === 6){ n(G.band, "#2E2E33", { p: [0, 0.0, -0.02], s: [R * 1.1, R * 1.12, R * 1.1] });
      [-1, 1].forEach(function(sd){ n(G.cylU, "#2E2E33", { p: [sd * R * 1.02, -0.03, 0], s: [0.06, 0.03, 0.06], r: [0, 0, sd * Math.PI / 2] }); });
      n(G.capsuleMic || G.browS, "#2E2E33", { p: [R * 1.02, -0.06, 0.04], r: [1.3, 0, 0.2], s: [0.9, 1.8, 0.9] }); }
    else if (ac === 7){ var fp = [R * 0.55, R * 0.72, R * 0.55];
      [0, 1, 2, 3, 4].forEach(function(i){ var an = i / 5 * Math.PI * 2; n(G.dot, "#F7A8C4", { p: [fp[0] + Math.cos(an) * 0.03, fp[1] + Math.sin(an) * 0.03, fp[2]], s: [0.024, 0.024, 0.016], ol: 0 }); });
      n(G.dot, "#F4D35E", { p: [fp[0], fp[1], fp[2] + 0.01], s: [0.018, 0.018, 0.012], ol: 0 }); }
    else if (ac === 8 || ac === 9){
      var ec = ac === 8 ? hexRGB(AVP.hair[a.hc]) : [1, 1, 1, 1];
      [-1, 1].forEach(function(sd){
        if (ac === 8){ n(G.cone, ec, { p: [sd * R * 0.55, R * 0.8, -0.02], s: [0.14, 0.16, 0.08], r: [0, 0, -sd * 0.35] });
          n(G.cone, "#F7B7C8", { p: [sd * R * 0.55, R * 0.83, 0.012], s: [0.08, 0.1, 0.05], r: [0, 0, -sd * 0.35], ol: 0 }); }
        else { n(G.leg, ec, { p: [sd * R * 0.35, R * 0.85, -0.03], s: [0.75, 0.95, 0.45], r: [Math.PI, 0, sd * 0.15] });
          n(G.leg, "#F7B7C8", { p: [sd * R * 0.35, R * 0.86, -0.012], s: [0.45, 0.8, 0.3], r: [Math.PI, 0, sd * 0.15], ol: 0 }); }
      });
    }
    else if (ac === 10){ n(G.cylU, "#FFFFFF", { p: [0, R * 0.62, 0], s: [R * 0.9, 0.16, R * 0.9] });
      [[0, 0.13, 0], [0.11, 0.1, 0], [-0.11, 0.1, 0], [0, 0.1, 0.1], [0, 0.1, -0.1]].forEach(function(q){ n(G.dot, "#FFFFFF", { p: [q[0], R * 0.62 + 0.16 + q[1] * 0.5, q[2]], s: [0.11, 0.08, 0.11] }); }); }
    else if (ac === 11){ n(G.cylU, "#E8C25A", { p: [0, R * 0.86, 0], s: [R * 0.6, 0.07, R * 0.6], ol: 2 });
      [0, 1, 2, 3, 4].forEach(function(i){ var an = i / 5 * Math.PI * 2; n(G.cone, "#E8C25A", { p: [Math.sin(an) * R * 0.55, R * 0.86 + 0.06, Math.cos(an) * R * 0.55], s: [0.05, 0.08, 0.05] }); });
      n(G.dot, "#E35D5B", { p: [0, R * 0.86 + 0.035, R * 0.6], s: [0.022, 0.022, 0.012], ol: 0 }); }
    else if (ac === 12){ var h = n(G.ring, "#FFE58A", { p: [0, R * 1.35, 0], s: [R * 0.65, R * 0.65, R * 0.65], r: [Math.PI / 2, 0, 0], ol: 0 }); h.em = 0.85; }
  }

  function avPet(k, G){
    var root = N3(null), c = k === 1 ? "#E9A15A" : (k === 2 ? "#C89B6D" : "#FFD54A");
    if (k === 3){
      addK(root, N3(G.dot, c, { p: [0, 0.12, 0], s: [0.11, 0.1, 0.11], ol: 1 }));
      addK(root, N3(G.dot, c, { p: [0, 0.24, 0.02], s: [0.075, 0.075, 0.075], ol: 1 }));
      addK(root, N3(G.cone, "#F29B38", { p: [0, 0.235, 0.09], s: [0.03, 0.04, 0.03], r: [Math.PI / 2, 0, 0], ol: 0 }));
      [-1, 1].forEach(function(sd){ addK(root, N3(G.dot, "#2B2421", { p: [sd * 0.03, 0.255, 0.07], s: [0.01, 0.012, 0.006], ol: 0 }));
        addK(root, N3(G.dot, shade(hexRGB(c), 0.9), { p: [sd * 0.1, 0.13, 0], s: [0.03, 0.06, 0.06], ol: 0 })); });
    } else {
      addK(root, N3(G.dot, c, { p: [0, 0.12, -0.02], s: [0.09, 0.08, 0.14], ol: 1 }));
      var hd = addK(root, N3(G.dot, c, { p: [0, 0.22, 0.11], s: [0.085, 0.078, 0.08], ol: 1 }));
      [-1, 1].forEach(function(sd){
        addK(root, N3(G.dot, "#2B2421", { p: [sd * 0.032, 0.235, 0.183], s: [0.012, 0.015, 0.006], ol: 0 }));
        if (k === 1) addK(root, N3(G.cone, c, { p: [sd * 0.045, 0.27, 0.1], s: [0.045, 0.06, 0.035], r: [0, 0, -sd * 0.3], ol: 2 }));
        else addK(root, N3(G.dot, shade(hexRGB(c), 0.75), { p: [sd * 0.08, 0.21, 0.1], s: [0.025, 0.06, 0.035], r: [0, 0, sd * 0.3], ol: 0 }));
        [-1, 1].forEach(function(fb){ addK(root, N3(G.dot, c, { p: [sd * 0.05, 0.04, fb * 0.07], s: [0.025, 0.045, 0.025], ol: 0 })); });
      });
      addK(root, N3(G.dot, k === 1 ? "#F7B7C8" : "#2B2421", { p: [0, 0.205, 0.188], s: [0.012, 0.009, 0.006], ol: 0 }));
      root.tail = addK(root, N3(G.leg, c, { p: [0, 0.14, -0.14], r: [k === 1 ? -0.6 : -1.0, 0, 0], s: [0.35, 0.5, 0.35], ol: 2 }));
      root.headN = hd;
    }
    root.shadow = addK(root, N3(G.disc, [0.12, 0.09, 0.1, 0.2], { p: [0, 0.004, 0], s: [0.12, 1, 0.14], tr: true }));
    return root;
  }

  // ---------- hiệu ứng theo cấp (Lv): ✨ lấp lánh · ⭐ vòng sao · 👑 hào quang vàng · 🌈 cầu vồng ----------
  var OFC_FX_LV = [0, 3, 5, 7, 9];
  function avFxAuto(lv){ var e = 0; for (var i = 1; i < OFC_FX_LV.length; i++) if (lv >= OFC_FX_LV[i]) e = i; return e; }
  function avFxOf(av, lv){ return av && av.ef != null ? Math.max(0, Math.min(4, Number(av.ef) || 0)) : avFxAuto(lv || 0); }
  function hsl3(h, s, l){
    var a = s * Math.min(l, 1 - l), f = function(n){ var k = (n + h * 12) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return [f(0), f(8), f(4), 1];
  }
  function avFxBuild(P, ef){
    if (!ef) return;
    var G = avGeo(), S5 = GEO.get("star5", function(){ return GEO.star(5, 1, 0.45, 0.35); }), S4 = GEO.get("star4", function(){ return GEO.star(4, 1, 0.28, 0.2); });
    var CY = GEO.get("u-cyl", function(){ return GEO.cyl(1, 1, 1, 18); });
    var g = addK(P.root, N3(null)), sp = [], ring = [], gold = [1, 0.82, 0.3, 1];
    for (var i = 0; i < (ef >= 4 ? 9 : 6); i++){
      var a = i / 6 * Math.PI * 2 + i * 0.7, rr = 0.26 + (i % 3) * 0.07;
      sp.push({ n: addK(g, N3(S4, i % 2 ? [1, 1, 1, 1] : gold, { p: [Math.cos(a) * rr, 0.25 + (i * 0.37 % 1) * 1.0, Math.sin(a) * rr], s: [0, 0, 0], em: 1 })), ph: i * 1.3, a: a, rr: rr });
    }
    if (ef >= 2) for (var k = 0; k < 5; k++) ring.push(addK(g, N3(S5, gold, { s: [0.05, 0.05, 0.05], em: 0.85, ol: 2, lc: [0.55, 0.38, 0.05] })));
    var glow = null, pill = null;
    if (ef >= 3){
      glow = addK(g, N3(G.disc, [1, 0.85, 0.35, 0.35], { p: [0, 0.008, 0], s: [0.38, 1, 0.38], tr: true, em: 1 }));
      pill = addK(g, N3(CY, [1, 0.9, 0.5, 0.1], { p: [0, 0, 0], s: [0.3, 1.5, 0.3], tr: true, em: 1 }));
      var lc = [0.72, 0.52, 0.08];
      (function walk(nd){ if (nd.ol === 1) nd.lc = lc; nd.k.forEach(walk); })(P.body);
    }
    P.fxUpd = function(t){
      sp.forEach(function(q){
        var v = Math.max(0, Math.sin(t * 2.2 + q.ph)); v = v * v * v;
        var s = v * (ef >= 4 ? 0.055 : 0.045); q.n.s = [s, s, s * 0.6]; q.n.r[2] = t * 2 + q.ph;
        q.n.p[1] = 0.2 + ((t * 0.18 + q.ph * 0.31) % 1) * 1.05;
        if (ef >= 4) q.n.c = hsl3((t * 0.15 + q.ph * 0.13) % 1, 0.9, 0.62);
      });
      ring.forEach(function(n, k){
        var a = t * 1.3 + k / 5 * Math.PI * 2;
        n.p = [Math.cos(a) * 0.42, 0.1 + Math.sin(t * 3 + k) * 0.03, Math.sin(a) * 0.42]; n.r = [0, -a, t * 2];
        if (ef >= 4) n.c = hsl3((k / 5 + t * 0.1) % 1, 0.85, 0.6);
      });
      if (glow){ var pz = 0.36 + Math.sin(t * 2.4) * 0.05; glow.s = [pz, 1, pz]; glow.c[3] = 0.28 + Math.sin(t * 2.4) * 0.08;
        if (ef >= 4){ var hc = hsl3((t * 0.12) % 1, 0.9, 0.62); glow.c = [hc[0], hc[1], hc[2], glow.c[3]]; pill.c = [hc[0], hc[1], hc[2], 0.09]; } }
    };
  }

  /** Chuyển động theo trạng thái: work · brk (ngồi) · idle · walk · wave · jump. t = giây. */
  function avAnimate(P, mode, t, ex){
    ex = ex || {};
    var b = P.body, br = Math.sin(t * 2.1) * 0.012;
    P.torso.s[1] = 1 + br; P.torso.p[1] = 0; b.p[1] = P.L + 0.06; b.r[0] = 0;
    P.legL.r = [0, 0, 0]; P.legR.r = [0, 0, 0]; P.head.r = [0, 0, 0];
    P.armL.r = [0, 0, -0.1]; P.armR.r = [0, 0, 0.1];
    if (mode === "walk"){
      var ph = t * 9, sw = Math.sin(ph);
      P.legL.r[0] = sw * 0.55; P.legR.r[0] = -sw * 0.55; P.armL.r[0] = -sw * 0.5; P.armR.r[0] = sw * 0.5;
      b.p[1] += Math.abs(Math.cos(ph)) * 0.03; P.head.r[0] = -0.05;
    } else if (mode === "work"){
      var w = t * 5.5 + (ex.seed || 0);
      P.armR.r[0] = -1.05 + Math.sin(w) * 0.22; P.armL.r[0] = -0.85 + Math.sin(w + 1.7) * 0.18;
      P.armR.r[2] = 0.25; P.armL.r[2] = -0.25;
      P.head.r[0] = 0.04 + Math.sin(t * 0.7 + (ex.seed || 0)) * 0.05; P.head.r[1] = Math.sin(t * 0.37 + (ex.seed || 0) * 2) * 0.3;
      P.torso.r = [0.05, Math.sin(t * 0.5 + (ex.seed || 0)) * 0.08, 0];
    } else if (mode === "brk"){
      var seatH = ex.seatH || 0.42;
      b.p[1] = seatH; P.legL.r[0] = -1.45; P.legR.r[0] = -1.45;
      var sip = (Math.sin(t * 0.6 + (ex.seed || 0)) + 1) / 2;
      P.armR.r[0] = -0.4 - (sip > 0.8 ? (sip - 0.8) * 9 : 0); P.armL.r[0] = -0.35;
      P.head.r[1] = Math.sin(t * 0.3 + (ex.seed || 0)) * 0.35; P.head.r[0] = sip > 0.8 ? -0.12 : 0.05;
    } else {
      P.head.r[1] = Math.sin(t * 0.45 + (ex.seed || 0)) * 0.4; P.head.r[0] = Math.sin(t * 0.3) * 0.05;
      P.armL.r[0] = Math.sin(t * 1.3) * 0.05; P.armR.r[0] = -Math.sin(t * 1.3) * 0.05;
    }
    if (P.torso.r && mode !== "work") P.torso.r = [0, 0, 0];
    if (ex.look) P.head.r[0] += ex.look;
    if (ex.wave){ P.armR.r = [-0.2, 0, 2.6 + Math.sin(t * 14) * 0.35]; }
    if (ex.jump) b.p[1] += Math.abs(Math.sin(ex.jump * Math.PI * 3)) * 0.18;
    // chớp mắt
    var bl = ((t + (ex.seed || 0) * 1.7) % 4.2) < 0.12 ? 0.12 : 1;
    P.eyes.forEach(function(e){ e.s[1] = bl; });
  }
