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
    pr.mop = grp(hand);
    addK(pr.mop, N3(CY, "#C8A06A", { p: [0, -0.62, 0.0], s: [0.012, 0.95, 0.012], r: [0, 0, 0] }));
    addK(pr.mop, N3(BX, "#3B82C4", { p: [0, -0.66, 0], s: [0.26, 0.04, 0.08], ol: 2 }));
    addK(pr.mop, N3(BX, "#F2F2F2", { p: [0, -0.7, 0], s: [0.3, 0.05, 0.12] }));
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
    pr.guitar = grp(P.torso);
    addK(pr.guitar, N3(G.dot, "#C2410C", { p: [0.02, P.T * 0.35, 0.16], s: [0.13, 0.15, 0.04], r: [0, 0, 0.6], ol: 2 }));
    addK(pr.guitar, N3(G.dot, "#2B1D14", { p: [0.02, P.T * 0.35, 0.2], s: [0.035, 0.035, 0.01], r: [0, 0, 0.6] }));
    addK(pr.guitar, N3(BX, "#7C4A1E", { p: [-0.18, P.T * 0.6, 0.17], s: [0.035, 0.3, 0.025], r: [0, 0, 0.95], ol: 2 }));
    P.props = pr; return pr;
  }
  var OFC_ACT_PROP = { wipe: "cloth", mop: "mop", vac: "vac", bake: "bread", phone: "phone", coffee: "cup", eat: "sand", guitar: "guitar" };

  /** Đè động tác lên tư thế cơ bản (gọi sau avAnimate). */
  function avAct(P, act, t, ex){
    if (P.props || OFC_ACT_PROP[act]){ var pr = avProps(P); Object.keys(pr).forEach(function(k){ pr[k].v = OFC_ACT_PROP[act] === k; }); }
    if (!act) return;
    var b = P.body, s = Math.sin, sd = (ex && ex.seed) || 0;
    if (act === "wipe"){
      P.torso.r = [0.35, 0, 0]; P.armR.r = [-1.25 + s(t * 7) * 0.12, 0, 0.35 + Math.cos(t * 7) * 0.35]; P.armL.r = [-0.5, 0, -0.2]; P.head.r[0] += 0.25;
    } else if (act === "mop"){
      P.torso.r = [0.2, s(t * 3) * 0.35, 0]; P.armR.r = [-0.65, 0, 0.55 + s(t * 3) * 0.2]; P.armL.r = [-0.8, 0, -0.1 + s(t * 3) * 0.15];
      if (P.props) P.props.mop.r = [0.35, 0, -0.35 + s(t * 3) * 0.25];
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
      P.armR.r = [-0.7 + s(t * 10) * 0.18, 0.4, 0.3]; P.armL.r = [-1.2, -0.5, -0.9]; P.head.r[2] = s(t * 2) * 0.12; b.p[1] += Math.abs(s(t * 4)) * 0.02;
    } else if (act === "bow"){
      var bw = Math.max(0, s(t * 1.2)); P.torso.r = [bw * 0.75, 0, 0]; P.armR.r = [0.1, 0, 0.05]; P.armL.r = [0.1, 0, -0.05];
    } else if (act === "wave"){
      P.armR.r = [-0.2, 0, 2.6 + s(t * 14) * 0.35];
    } else if (act === "cheer"){
      b.p[1] += Math.abs(s(t * 7)) * 0.15; P.armR.r = [0, 0, 2.7]; P.armL.r = [0, 0, -2.7];
    } else if (act === "clap"){
      var c = Math.abs(s(t * 10)) * 0.3; P.armR.r = [-1.3, 0, 0.25 + c]; P.armL.r = [-1.3, 0, -0.25 - c];
    } else if (act === "heart"){
      P.armR.r = [-0.4, 0, 2.55]; P.armL.r = [-0.4, 0, -2.55]; P.head.r[2] = s(t * 2) * 0.1;
    } else if (act === "thumb"){
      P.armR.r = [-1.5, 0, 0.3]; P.head.r[2] = 0.12;
    } else if (act === "phone"){
      P.armR.r = [-1.55, 0, 0.45]; P.armL.r = [-0.3, 0, -0.1]; P.head.r[0] += 0.35;
    } else if (act === "coffee" || act === "eat"){
      var sp = (s(t * 0.9 + sd) + 1) / 2, up = sp > 0.7 ? (sp - 0.7) * 3.3 : 0;
      P.armR.r = [-0.7 - up * 1.3, 0, 0.35 + up * 0.3]; if (up > 0.5) P.head.r[0] -= 0.15;
    } else if (act === "think"){
      P.armR.r = [-2.3, 0, 0.7]; P.armL.r = [-0.9, 0, -0.6]; P.head.r[2] = 0.18; P.head.r[0] -= 0.1;
    } else if (act === "stretch"){
      var st = (s(t * 1.2) + 1) / 2; P.armR.r = [0, 0, 2.9]; P.armL.r = [0, 0, -2.9]; P.torso.s[1] = 1 + st * 0.05; P.torso.r = [0, 0, s(t * 0.6) * 0.15];
    } else if (act === "sleep"){
      P.head.r[0] = 0.55; P.head.r[2] = 0.25; P.torso.r = [0.2, 0, 0.05]; P.armR.r = [-0.2, 0, 0.05]; P.armL.r = [-0.2, 0, -0.05];
    }
  }
