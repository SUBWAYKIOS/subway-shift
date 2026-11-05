  // ---------- v56: động tác + đạo cụ (lau bàn, lau sàn, hút bụi, làm bánh, ngồi, nhảy…) ----------
  var OFC_ACTS = [
    ["wipe", "🧽"], ["mop", "🧹"], ["vac", "🌀"], ["bake", "🥖"], ["sit", "🪑"], ["dance", "💃"], ["dance2", "🕺"], ["guitar", "🎸"],
    ["bow", "🙇"], ["wave", "👋"], ["cheer", "🙌"], ["clap", "👏"], ["heart", "🫶"], ["thumb", "👍"], ["coffee", "☕"], ["eat", "🥪"],
    ["phone", "📱"], ["think", "🤔"], ["stretch", "🙆"], ["sleep", "😴"]
  ];
  var OFC_ACT_BUB = { heart: "💕", sleep: "💤", think: "💭", thumb: "👍", clap: "👏", cheer: "🎉", guitar: "🎵", dance: "🎶", dance2: "✨" };

  /** Đạo cụ cầm tay / đặt dưới sàn — dựng một lần, bật / tắt theo động tác. */
  function avProps(P){
    if (P.props) return P.props;
    var BX = GEO.get("u-box", function(){ return GEO.box(1, 1, 1); }), CY = GEO.get("u-cyl", function(){ return GEO.cyl(1, 1, 1, 14); });
    var SP = GEO.get("u-sph", function(){ return GEO.sphere(1, 12, 8); }), G = avGeo();
    var hand = addK(P.armR, N3(null, null, { p: [0, -0.29, 0.02] })), pr = {};
    function grp(par){ var g = addK(par, N3(null)); g.v = false; return g; }
    pr.cloth = grp(hand); addK(pr.cloth, N3(BX, "#5EC4E8", { p: [0, -0.02, 0.02], s: [0.1, 0.02, 0.08], ol: 2 }));
    // v57: cây lau sàn đặt theo thân (đầu lau CHẠM SÀN, cán lên tới hai tay) — trước đây treo ở tay nên lơ lửng
    pr.mop = grp(P.root);
    var hy = P.L + P.T - 0.2, mz = 0.4, dy = hy - 0.04, dz = 0.2 - mz, ml = Math.hypot(dy, dz);
    addK(pr.mop, N3(BX, "#F2F2F2", { p: [0, 0.0, mz], s: [0.3, 0.04, 0.12], ol: 2 }));
    addK(pr.mop, N3(BX, "#3B82C4", { p: [0, 0.035, mz], s: [0.24, 0.03, 0.07] }));
    addK(pr.mop, N3(CY, "#C8A06A", { p: [0, 0.05, mz], s: [0.013, ml + 0.06, 0.013], r: [Math.atan2(dz, dy), 0, 0] }));
    pr.vac = grp(P.root);
    addK(pr.vac, N3(BX, "#E35D5B", { p: [0.16, 0, 0.32], s: [0.2, 0.16, 0.26], ol: 2 }));
    addK(pr.vac, N3(SP, "#2B2F36", { p: [0.16, 0.16, 0.32], s: [0.06, 0.03, 0.06] }));
    addK(pr.vac, N3(CY, "#5A5F66", { p: [0.16, 0.12, 0.2], s: [0.012, 0.42, 0.012], r: [0.9, 0, 0] }));
    pr.bread = grp(hand);
    addK(pr.bread, N3(G.dot, "#E9B067", { p: [0, -0.03, 0.06], s: [0.05, 0.035, 0.13], r: [0.2, 0, 0], ol: 2 }));
    addK(pr.bread, N3(G.dot, "#7BC043", { p: [0, -0.005, 0.06], s: [0.052, 0.012, 0.12], r: [0.2, 0, 0] }));
    pr.phone = grp(hand); addK(pr.phone, N3(BX, "#1F2937", { p: [0, -0.02, 0.03], s: [0.05, 0.09, 0.012], r: [-0.4, 0, 0], ol: 2 }));
    addK(pr.phone, N3(BX, "#7DD3FC", { p: [0, -0.02, 0.038], s: [0.042, 0.075, 0.004], r: [-0.4, 0, 0], em: 0.7 }));
    pr.cup = grp(hand); addK(pr.cup, N3(CY, "#FFFFFF", { p: [0, -0.06, 0.03], s: [0.035, 0.08, 0.035], ol: 2 }));
    addK(pr.cup, N3(CY, "#6B4226", { p: [0, 0.015, 0.03], s: [0.03, 0.006, 0.03] }));
    pr.sand = grp(hand);
    addK(pr.sand, N3(G.dot, "#E9B067", { p: [0, -0.02, 0.05], s: [0.045, 0.04, 0.1], ol: 2 }));
    addK(pr.sand, N3(G.dot, "#E8463B", { p: [0, -0.01, 0.05], s: [0.047, 0.01, 0.09] }));
    // v57: đàn ôm trước bụng — thân đàn bên phải, cần đàn chéo lên sang trái (tay trái giữ cần, tay phải gảy)
    pr.guitar = grp(P.torso);
    addK(pr.guitar, N3(G.dot, "#C2410C", { p: [0.05, P.T * 0.28, 0.15], s: [0.12, 0.14, 0.045], r: [0, 0, 0.45], ol: 2 }));
    addK(pr.guitar, N3(G.dot, "#2B1D14", { p: [0.045, P.T * 0.3, 0.197], s: [0.035, 0.035, 0.006], r: [0, 0, 0.45] }));
    addK(pr.guitar, N3(BX, "#7C4A1E", { p: [0.0, P.T * 0.36, 0.17], s: [0.03, 0.34, 0.022], r: [0, 0, 1.08], ol: 2 }));
    addK(pr.guitar, N3(BX, "#3B2414", { p: [-0.3, P.T * 0.36 + 0.16, 0.17], s: [0.05, 0.07, 0.024], r: [0, 0, 1.08] }));
    P.props = pr; return pr;
  }
  var OFC_ACT_PROP = { wipe: "cloth", mop: "mop", vac: "vac", bake: "bread", phone: "phone", coffee: "cup", eat: "sand", guitar: "guitar" };

  /** Đè động tác lên tư thế cơ bản (gọi sau avAnimate). */
  function avAct(P, act, t, ex){
    if (P.props || OFC_ACT_PROP[act]){ var pr = avProps(P); Object.keys(pr).forEach(function(k){ pr[k].v = OFC_ACT_PROP[act] === k; }); }
    if (!act) return;
    var b = P.body, s = Math.sin, sd = (ex && ex.seed) || 0;
    if (act === "wipe"){
      P.torso.r = [0.35, 0, 0]; P.armR.r = [-1.2 + s(t * 7) * 0.1, 0, -0.1 + Math.cos(t * 7) * 0.3]; P.armL.r = [-0.85, 0, 0.25]; P.head.r[0] += 0.25;   // lau vòng tròn trên mặt bàn, tay kia chống bàn
    } else if (act === "mop"){
      var mw = s(t * 3);                                         // hai tay cùng cầm cán, đẩy lau qua lại
      P.torso.r = [0.12, mw * 0.18, 0]; P.armR.r = [-0.85, 0, -0.28 + mw * 0.06]; P.armL.r = [-0.95, 0, 0.32 + mw * 0.06]; P.head.r[0] += 0.18;
      if (P.props){ P.props.mop.p = [mw * 0.1, 0, 0]; P.props.mop.r = [0, mw * 0.22, 0]; }
    } else if (act === "vac"){
      var f = s(t * 2.5); P.torso.r = [0.25 + f * 0.05, 0, 0]; P.armR.r = [-0.9 - f * 0.25, 0, 0.2]; P.armL.r = [-0.6, 0, -0.2];
      if (P.props) P.props.vac.p = [0, 0, f * 0.12];
    } else if (act === "bake"){
      P.torso.r = [0.15, 0, 0]; P.armR.r = [-1.1 + s(t * 6) * 0.25, 0, 0.3]; P.armL.r = [-1.1 + s(t * 6 + Math.PI) * 0.25, 0, -0.3]; P.head.r[0] += 0.2;
    } else if (act === "dance"){
      b.p[1] += Math.abs(s(t * 6)) * 0.08; P.torso.r = [0, s(t * 3) * 0.45, s(t * 6) * 0.08];
      P.armR.r = [0, 0, 2.2 + s(t * 6) * 0.5]; P.armL.r = [0, 0, -2.2 + s(t * 6 + 1) * 0.5]; P.head.r[2] = s(t * 6) * 0.15;
      P.legL.r[0] = s(t * 6) * 0.3; P.legR.r[0] = -s(t * 6) * 0.3;
    } else if (act === "dance2"){
      var q = Math.floor(t * 2.5) % 4;
      b.p[1] += Math.abs(s(t * 5)) * 0.05; P.torso.r = [0, 0, s(t * 2.5) * 0.18];
      P.armR.r = q < 2 ? [0, 0, 2.6] : [-1.4, 0, 0.6]; P.armL.r = q % 2 ? [0, 0, -0.4] : [-0.6, 0, -1.2];
      P.legL.r[2] = -s(t * 5) * 0.15; P.legR.r[2] = s(t * 5) * 0.15;
    } else if (act === "guitar"){
      P.armR.r = [-0.75 + s(t * 10) * 0.12, 0, -0.42]; P.armL.r = [-1.15, 0, -0.55]; P.head.r[2] = s(t * 2) * 0.12; P.head.r[0] += 0.12; b.p[1] += Math.abs(s(t * 4)) * 0.02;
    } else if (act === "bow"){
      var bw = Math.max(0, s(t * 1.2)); P.torso.r = [bw * 0.75, 0, 0]; P.armR.r = [0.1, 0, 0.05]; P.armL.r = [0.1, 0, -0.05];
    } else if (act === "wave"){
      P.armR.r = [-0.2, 0, 2.6 + s(t * 14) * 0.35];
    } else if (act === "cheer"){
      b.p[1] += Math.abs(s(t * 7)) * 0.15; P.armR.r = [0, 0, 2.7]; P.armL.r = [0, 0, -2.7];
    } else if (act === "clap"){
      var c = Math.abs(s(t * 9)) * 0.32; P.armR.r = [-1.35, 0, -0.62 + c]; P.armL.r = [-1.35, 0, 0.62 - c];      // hai bàn tay gặp nhau trước ngực
    } else if (act === "heart"){
      var hb = s(t * 3) * 0.04; P.armR.r = [-1.45 + hb, 0, -0.6]; P.armL.r = [-1.45 + hb, 0, 0.6]; P.head.r[2] = s(t * 2) * 0.1;   // hai tay chụm trước ngực thành hình trái tim
    } else if (act === "thumb"){
      P.armR.r = [-1.5, 0, 0.3]; P.head.r[2] = 0.12;
    } else if (act === "phone"){
      P.armR.r = [-1.55, 0, 0.45]; P.armL.r = [-0.3, 0, -0.1]; P.head.r[0] += 0.35;
    } else if (act === "coffee" || act === "eat"){
      var sp = (s(t * 0.9 + sd) + 1) / 2, up = sp > 0.7 ? (sp - 0.7) * 3.3 : 0;
      P.armR.r = [-0.7 - up * 1.3, 0, 0.35 + up * 0.3]; if (up > 0.5) P.head.r[0] -= 0.15;
    } else if (act === "think"){
      P.armR.r = [-2.3, 0, -0.4]; P.armL.r = [-1.05, 0, 0.55]; P.head.r[2] = 0.18; P.head.r[0] -= 0.1;   // tay phải chống cằm, tay trái đỡ khuỷu
    } else if (act === "stretch"){
      var st = (s(t * 1.2) + 1) / 2; P.armR.r = [0, 0, 2.9]; P.armL.r = [0, 0, -2.9]; P.torso.s[1] = 1 + st * 0.05; P.torso.r = [0, 0, s(t * 0.6) * 0.15];
    } else if (act === "sleep"){
      P.head.r[0] = 0.55; P.head.r[2] = 0.25; P.torso.r = [0.2, 0, 0.05]; P.armR.r = [-0.2, 0, 0.05]; P.armL.r = [-0.2, 0, -0.05];
    }
  }
