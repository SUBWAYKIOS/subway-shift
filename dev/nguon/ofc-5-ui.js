  // ---------- giao diện tab Văn phòng ----------
  var OFC_TX = {
    vi: { tab: "Quán", loading: "Đang dựng quán…", noGl: "Máy này không hiển thị được 3D — vẫn xem được danh sách bên dưới.",
      sum: "{a} đang làm · {b} nghỉ giải lao", sumSoon: " · {c} sắp vào", nobody: "Chưa ai trong ca lúc này", me: "Nhân vật", meNew: "Tạo nhân vật",
      lv: "Lv {n}", board: "Bảng tin", chatPh: "Nhắn cho cả quán…", send: "Gửi", log: "Tin nhắn", logEmpty: "Chưa có tin nhắn trong 2 ngày qua.",
      hint: "Kéo để di chuyển · 2 ngón để xoay / phóng to · chạm chỗ trống để nhân vật của bạn đi tới",
      hintPc: "Kéo để di chuyển · chuột phải (hoặc Shift + kéo) để xoay · lăn chuột để phóng to · bấm chỗ trống để đi tới",
      today: "Hôm nay ở quán", stIn: "Đang làm", stBrk: "Nghỉ giải lao", stSoon: "Sắp vào ca", stLater: "Vào ca sau", stOut: "Đã về", stLate: "Chưa bấm thẻ", stSup: "Đi chi viện",
      guest: "chi viện từ {s}", mgrName: "Quản lý", you: "bạn",
      wave: "👋 Vẫy tay", thanks: "💌 Cảm ơn", edit: "✏️ Sửa nhân vật", close: "Đóng", save: "Lưu", random: "🎲 Ngẫu nhiên", saved: "Đã lưu nhân vật ✨",
      tBody: "Dáng", tFace: "Mặt", tHair: "Tóc", tWear: "Trang phục", tAcc: "Phụ kiện", tPet: "Thú cưng",
      gH: "Chiều cao", gB: "Vóc dáng", gSk: "Màu da", gFs: "Khuôn mặt", gEy: "Mắt", gEc: "Màu mắt", gBr: "Lông mày", gMo: "Miệng", gFx: "Má", gHs: "Kiểu tóc", gHc: "Màu tóc",
      gOf: "Kiểu áo", gOc: "Màu áo", gPc: "Màu quần", gUw: "Tự mặc đồng phục khi vào ca", gAc: "Phụ kiện", gPet: "Thú cưng đi theo",
      h0: "Thấp", h1: "Vừa", h2: "Cao", b0: "Mảnh", b1: "Vừa", b2: "Đầy đặn", fs0: "Tròn", fs1: "Thon", fs2: "Bầu",
      fx0: "Không", fx1: "Má hồng", fx2: "Tàn nhang", fx3: "Cả hai", uw1: "Có", uw0: "Không", locked: "🔒 Lv {n}",
      achT: "Thành tích", xpOf: "{x} điểm · còn {n} điểm nữa lên Lv {l}", xpMax: "{x} điểm · cấp cao nhất!", month: "Tháng này",
      pIn: "Đi làm", pOn: "Vào ca đúng giờ", pHk: "Checklist đã tick", pTr: "Được cảm ơn", pTs: "Gửi lời cảm ơn", pCh: "Tin nhắn trong quán", pSup: "Đi chi viện",
      badges: "Huy hiệu tháng này", bEarly: "Đúng giờ", bHard: "Chăm chỉ", bLoved: "Được yêu mến", bTeam: "Đồng đội", bTidy: "Gọn gàng", bChat: "Hoà đồng", bHelp: "Chi viện",
      unlocks: "Mở khoá theo cấp", howPts: "Điểm tự tính từ điểm danh, checklist, lời cảm ơn và tin nhắn — không ai tự cộng được.",
      bdT: "Bảng tin hôm nay", bdNow: "Đang ở quán", bdSoon: "Sắp / sẽ vào ca", bdSup: "Đi chi viện quán khác", bdGuest: "Chi viện tới", bdLate: "Tới giờ nhưng chưa bấm thẻ", bdMemo: "Dặn dò",
      bdBday: "🎂 Sinh nhật hôm nay", bdNone: "Không có", layout: "Bố cục phòng", layAuto: "Tự chọn theo tên quán", layOta: "Theo sơ đồ Otagawa", layBasic: "Mẫu chung",
      waved: "Đã vẫy tay với {n}", err: "Không tải được quán", retry: "Thử lại", upd: "Cập nhật {t}", petN0: "Không", petN1: "Mèo", petN2: "Cún", petN3: "Gà con", online: "Đang mở app", sumOn: " · {n} người đang ghé", tFx: "Hiệu ứng", gEf: "Hiệu ứng nhân vật (mở theo cấp)", ef0: "Không", ef1: "✨ Lấp lánh", ef2: "⭐ Vòng sao", ef3: "👑 Hào quang vàng", ef4: "🌈 Cầu vồng", efAuto: "Tự động theo cấp",
      orTitle: "Báo cáo cho chủ quán", orSub: "doanh thu · khách · giờ công · nguyên liệu — in / PDF", orOpen: "Báo cáo tháng {m}", orHint: "Kéo thả hoặc chọn các file CSV xuất từ WingArc (doanh thu ngày, theo giờ, số bán từng món…) — app tự nhận loại file. Hoặc để bot trên máy Mac tự tải mỗi tối (22:00).", waImport: "Nhập CSV WingArc", waBot: "Bot WingArc", waDone: "Đã nhập {n} file", waBad: "Không nhận ra file WingArc này (cần cột ngày + doanh thu / khách / giờ).", botHow: "Bot chạy trên máy Mac của anh: mở WingArc bằng tài khoản lưu trong Keychain, tải CSV rồi gửi vào app bằng khoá dưới đây. Khoá chỉ dùng để GỬI doanh thu / số bán, không đọc được dữ liệu nào.", botLast: "Bot gửi gần nhất: {t}", botRenew: "Tạo khoá mới (khoá cũ hết hiệu lực)", botMake: "Tạo khoá cho bot", botOff: "Tắt bot", botKeyOnce: "Khoá chỉ hiện MỘT lần — dán vào công cụ cài bot trên Mac (nó lưu vào Keychain).", botCopy: "Chép khoá", botOffDone: "Đã tắt bot", orLink: "Link cho chủ quán", orCost: "Chi phí & mục tiêu", cuFix: "¥/tháng", cuPct: "% doanh thu", cuPctD: "% doanh thu giao hàng", cuPctL: "% lương", cstHow: "Nhập chi phí của quán để báo cáo tính lãi lỗ, điểm hòa vốn và lợi nhuận dự kiến. Không biết thì để trống — báo cáo sẽ ghi \"chưa nhập\".", cstOpen: "Tháng mở tiệm", cstFix: "Chi phí cố định (mỗi tháng)", cstVar: "Chi phí theo doanh thu / lương", cstExtra: "Chi phí khác (tự đặt tên)", cstExName: "Tên chi phí", cstTarget: "Mục tiêu", cstTargetL: "Lợi nhuận mục tiêu / tháng", cstWage: "Lương giờ trung bình lấy từ Cài đặt quán; giờ làm lấy từ lịch xếp ca (gồm người chi viện).", cstSaved: "Đã lưu chi phí", ck_rent: "Tiền thuê", ck_common: "Phí chung · quản lý", ck_royalty: "Phí nhượng quyền", ck_adfund: "Phí quảng cáo chung", ck_util: "Điện nước gas", ck_net: "Mạng · điện thoại", ck_card: "Phí thẻ / QR", ck_deli: "Phí app giao hàng", ck_social: "BHXH phía công ty", ck_commute: "Tiền đi lại", ck_supplies: "Vật tư tiêu hao", ck_repair: "Sửa chữa", ck_insure: "Bảo hiểm", ck_deprec: "Khấu hao", ck_other: "Khác", orLang: "Ngôn ngữ báo cáo", orLinkHow: "Một đường link cố định để chủ quán xem báo cáo bất cứ lúc nào (tự chọn tháng, in / lưu PDF). Chỉ xem được — không sửa được gì, không thấy lương từng người hay mật khẩu.", orLinkMake: "Tạo link", orLinkCopy: "Chép", orLinkCopied: "Đã chép link", orLinkShare: "Gửi…", orLinkOpen: "Mở thử", orLinkNew: "Đổi link mới", orLinkNewQ: "Đổi link mới? Link đang gửi chủ quán sẽ không mở được nữa.", orLinkOff: "Tắt link", orLinkOffQ: "Tắt link? Chủ quán sẽ không xem được nữa (bật lại sẽ là link mới).", orLinkOffDone: "Đã tắt link chủ quán", orLinkSafe: "Ai có link đều xem được báo cáo — chỉ gửi cho chủ quán.", orLinkSeen: "chủ quán mở gần nhất: {t}", orLinkNoFront: "Hãy mở app một lần bằng link GitHub của quán để app biết địa chỉ trang, rồi mở lại hộp này.",
      actT: "Động tác", act_wipe: "Lau bàn", act_mop: "Lau sàn", act_vac: "Hút bụi", act_bake: "Làm bánh", act_sit: "Ngồi", act_dance: "Nhảy", act_dance2: "Disco", act_guitar: "Đàn hát", act_bow: "Chào khách", act_wave: "Vẫy tay", act_cheer: "Cổ vũ", act_clap: "Vỗ tay", act_heart: "Thả tim", act_thumb: "Tuyệt vời", act_coffee: "Uống cà phê", act_eat: "Ăn bánh", act_phone: "Điện thoại", act_think: "Suy nghĩ", act_stretch: "Vươn vai", act_sleep: "Ngủ gật",
      kd_guest: "Được khách khen", kd_bake: "Giỏi làm bánh", kd_clean: "Dọn dẹp giỏi", kd_fast: "Nhanh nhẹn", kd_team: "Đồng đội tốt", kd_smile: "Nụ cười thân thiện", kd_help: "Hay giúp đỡ", kd_star: "Nhân viên của tháng", kd_xp: "Được thưởng điểm", kd_unlock: "Được tặng đồ",
      rank1: "Trainer", rank2: "Trưởng ca", rank3: "Phó cửa hàng", rank4: "Cửa hàng trưởng",
      grant: "🏅 Khen thưởng", grantT: "Khen thưởng {n}", grantKudo: "Danh hiệu (hiện ruy băng 3 ngày + báo cả quán)", grantXp: "Cộng / trừ điểm", grantNote: "Lời nhắn (tuỳ chọn)", grantNotePh: "vd. khách khen bánh ngon", grantItems: "Tặng đồ (mở khoá dù chưa đủ cấp)", grantOk: "Gửi khen thưởng", granted: "Đã khen thưởng {n} ✨", kudoList: "Danh hiệu đã nhận",
      tcBtn: "🔑 Chế độ quản lý", tcOn: "🔑 Đang dùng quyền Tenchou ({n}) — xếp lịch, chốt lịch, quán", tcExit: "Thoát", tcErr: "Không mở được chế độ quản lý", tcAssign: "🔑 Quyền Tenchou (xếp lịch từ máy nhân viên)", tcHint: "Cửa hàng trưởng (chức vụ cao nhất) tự có quyền. Tenchou không xem được lương, hồ sơ, mật khẩu, sao lưu.", tcSaved: "Đã lưu quyền Tenchou",
      games: "🎮 Trò chơi", gift: "🎁 Quà tháng", gBake: "Làm bánh nhanh", gBakeD: "Xếp đúng nguyên liệu theo phiếu order — 60 giây", gCatch: "Hứng nguyên liệu", gCatchD: "Kéo khay hứng nguyên liệu, tránh rác — 3 mạng", gMemo: "Lật thẻ nhớ", gMemoD: "Lật tìm cặp nguyên liệu giống nhau",
      play: "Chơi", again: "Chơi lại", score: "Điểm", best: "Kỷ lục tháng của bạn: {n}", top: "Bảng xếp hạng tháng", time: "Thời gian", lives: "Mạng", order: "Phiếu order", next: "Món tiếp", wrong: "Sai rồi!", done: "Xong!", gameOver: "Hết giờ!", gameXp: "Điểm trò chơi đổi ra kinh nghiệm (tối đa 15/trò/tháng)",
      ing_bread: "Bánh mì", ing_ham: "Giăm bông", ing_chick: "Gà", ing_tuna: "Cá ngừ", ing_lett: "Xà lách", ing_tom: "Cà chua", ing_cuc: "Dưa leo", ing_oni: "Hành", ing_ol: "Ô liu", ing_pep: "Ớt chuông", ing_chz: "Phô mai", ing_sauce: "Sốt",
      drawT: "🎁 Quay thưởng cuối tháng", drawHint: "Máy chủ bốc thăm ngẫu nhiên (công bằng) — kết quả hiện cho cả quán.", prizes: "Phần quà", prizeAdd: "+ Thêm quà", who: "Người tham gia", whoAll: "Ai đi làm tháng này", mode: "Cách bốc", modeEq: "Mỗi người 1 phiếu", modeXp: "Theo điểm tháng (nhiều điểm hơn → nhiều phiếu)", spin: "🎡 Quay!", redo: "Quay lại", drawDone: "Kết quả quay thưởng", drawNone: "Tháng này chưa quay thưởng.", winners: "Người nhận quà",
      sysGift: "🎁 Quà tháng này" },
    en: { tab: "Store", loading: "Building the store…", noGl: "This device can't show 3D — the list below still works.",
      sum: "{a} working · {b} on break", sumSoon: " · {c} coming soon", nobody: "Nobody on shift right now", me: "Avatar", meNew: "Create avatar",
      lv: "Lv {n}", board: "Board", chatPh: "Message the whole store…", send: "Send", log: "Messages", logEmpty: "No messages in the last 2 days.",
      hint: "Drag to move · two fingers to rotate / zoom · tap an empty spot to walk there",
      hintPc: "Drag to move · right-drag (or Shift + drag) to rotate · scroll to zoom · click an empty spot to walk there",
      today: "In the store today", stIn: "Working", stBrk: "On break", stSoon: "Starting soon", stLater: "Later today", stOut: "Finished", stLate: "Not clocked in", stSup: "Helping another store",
      guest: "helping from {s}", mgrName: "Manager", you: "you",
      wave: "👋 Wave", thanks: "💌 Thank", edit: "✏️ Edit avatar", close: "Close", save: "Save", random: "🎲 Random", saved: "Avatar saved ✨",
      tBody: "Body", tFace: "Face", tHair: "Hair", tWear: "Outfit", tAcc: "Accessory", tPet: "Pet",
      gH: "Height", gB: "Build", gSk: "Skin", gFs: "Face shape", gEy: "Eyes", gEc: "Eye colour", gBr: "Brows", gMo: "Mouth", gFx: "Cheeks", gHs: "Hairstyle", gHc: "Hair colour",
      gOf: "Top", gOc: "Top colour", gPc: "Trousers", gUw: "Wear the uniform on shift", gAc: "Accessory", gPet: "Pet companion",
      h0: "Short", h1: "Medium", h2: "Tall", b0: "Slim", b1: "Medium", b2: "Sturdy", fs0: "Round", fs1: "Oval", fs2: "Wide",
      fx0: "None", fx1: "Blush", fx2: "Freckles", fx3: "Both", uw1: "Yes", uw0: "No", locked: "🔒 Lv {n}",
      achT: "Achievements", xpOf: "{x} pts · {n} more to Lv {l}", xpMax: "{x} pts · max level!", month: "This month",
      pIn: "Shifts worked", pOn: "On time", pHk: "Checklist ticks", pTr: "Thanks received", pTs: "Thanks sent", pCh: "Store messages", pSup: "Helped other stores",
      badges: "This month's badges", bEarly: "Punctual", bHard: "Hard worker", bLoved: "Loved", bTeam: "Team player", bTidy: "Tidy", bChat: "Social", bHelp: "Helper",
      unlocks: "Unlocks by level", howPts: "Points come from attendance, checklists, thanks and messages — nobody can add their own.",
      bdT: "Today's board", bdNow: "In the store", bdSoon: "Starting soon / later", bdSup: "Helping another store", bdGuest: "Helpers visiting", bdLate: "Shift started, not clocked in", bdMemo: "Notes",
      bdBday: "🎂 Birthday today", bdNone: "None", layout: "Room layout", layAuto: "Auto (by store name)", layOta: "Otagawa floor plan", layBasic: "Generic",
      waved: "Waved at {n}", err: "Couldn't load the store", retry: "Retry", upd: "Updated {t}", petN0: "None", petN1: "Cat", petN2: "Puppy", petN3: "Chick", online: "Using the app", sumOn: " · {n} dropping by", tFx: "Effects", gEf: "Avatar effect (unlocks by level)", ef0: "None", ef1: "✨ Sparkle", ef2: "⭐ Star ring", ef3: "👑 Golden aura", ef4: "🌈 Rainbow", efAuto: "Auto by level",
      orTitle: "Owner report", orSub: "sales · guests · labor · ingredients — print / PDF", orOpen: "Report for month {m}", orHint: "Drop or pick the CSV files exported from WingArc (daily sales, hourly, item sales…) — the app detects each file type. Or let the Mac bot fetch them every night (22:00).", waImport: "Import WingArc CSV", waBot: "WingArc bot", waDone: "Imported {n} files", waBad: "Couldn't read this WingArc file (needs a date column + sales / guests / hours).", botHow: "The bot runs on your Mac: it opens WingArc with the account saved in Keychain, downloads the CSVs and sends them to the app with the key below. The key can only SEND sales data; it can't read anything.", botLast: "Last bot upload: {t}", botRenew: "New key (old key stops working)", botMake: "Create bot key", botOff: "Turn bot off", botKeyOnce: "The key is shown ONCE — paste it into the bot setup tool on the Mac (it saves it in Keychain).", botCopy: "Copy key", botOffDone: "Bot turned off", orLink: "Owner link", orCost: "Costs & target", cuFix: "¥/month", cuPct: "% of sales", cuPctD: "% of delivery sales", cuPctL: "% of wages", cstHow: "Enter the store's costs so the report can show profit, break-even and the month-end forecast. Leave blank if unknown — the report marks it \"not entered\".", cstOpen: "Opening month", cstFix: "Fixed costs (per month)", cstVar: "Costs by sales / wages", cstExtra: "Other costs (your own names)", cstExName: "Cost name", cstTarget: "Target", cstTargetL: "Target profit / month", cstWage: "Average hourly wage comes from store settings; hours from the schedule (including support staff).", cstSaved: "Costs saved", ck_rent: "Rent", ck_common: "Common / mgmt fee", ck_royalty: "Royalty", ck_adfund: "Ad fund", ck_util: "Utilities", ck_net: "Internet · phone", ck_card: "Card / QR fees", ck_deli: "Delivery app fees", ck_social: "Social insurance (employer)", ck_commute: "Commuting", ck_supplies: "Supplies", ck_repair: "Repairs", ck_insure: "Insurance", ck_deprec: "Depreciation", ck_other: "Other", orLang: "Report language", orLinkHow: "One fixed link the owner can open any time to see the report (pick a month, print / save PDF). View only — nothing can be changed, no individual pay or passwords.", orLinkMake: "Create link", orLinkCopy: "Copy", orLinkCopied: "Link copied", orLinkShare: "Send…", orLinkOpen: "Open", orLinkNew: "New link", orLinkNewQ: "Create a new link? The link you sent the owner will stop working.", orLinkOff: "Turn off", orLinkOffQ: "Turn the link off? The owner won't be able to view it (turning on again makes a new link).", orLinkOffDone: "Owner link turned off", orLinkSafe: "Anyone with the link can view the report — send it to the owner only.", orLinkSeen: "owner last opened: {t}", orLinkNoFront: "Open the app once from the store's GitHub link so it knows the page address, then reopen this box.",
      actT: "Actions", act_wipe: "Wipe", act_mop: "Mop", act_vac: "Vacuum", act_bake: "Make bread", act_sit: "Sit", act_dance: "Dance", act_dance2: "Disco", act_guitar: "Guitar", act_bow: "Greet", act_wave: "Wave", act_cheer: "Cheer", act_clap: "Clap", act_heart: "Heart", act_thumb: "Great", act_coffee: "Coffee", act_eat: "Snack", act_phone: "Phone", act_think: "Think", act_stretch: "Stretch", act_sleep: "Nap",
      kd_guest: "Praised by a guest", kd_bake: "Great baker", kd_clean: "Super tidy", kd_fast: "Quick hands", kd_team: "Team player", kd_smile: "Warm smile", kd_help: "Always helping", kd_star: "Employee of the month", kd_xp: "Bonus points", kd_unlock: "Got a gift",
      rank1: "Trainer", rank2: "Shift leader", rank3: "Asst. manager", rank4: "Store manager",
      grant: "🏅 Reward", grantT: "Reward {n}", grantKudo: "Title (3-day ribbon + store-wide shout-out)", grantXp: "Add / remove points", grantNote: "Message (optional)", grantNotePh: "e.g. a guest loved the sandwich", grantItems: "Gift items (unlock regardless of level)", grantOk: "Send reward", granted: "Rewarded {n} ✨", kudoList: "Titles received",
      tcBtn: "🔑 Manager mode", tcOn: "🔑 Using Tenchou rights ({n}) — schedule, lock, store", tcExit: "Exit", tcErr: "Couldn't open manager mode", tcAssign: "🔑 Tenchou rights (schedule from a staff phone)", tcHint: "The store manager rank has it automatically. Tenchou can't see pay, profiles, passwords or backups.", tcSaved: "Tenchou rights saved",
      games: "🎮 Games", gift: "🎁 Monthly gifts", gBake: "Speed sandwich", gBakeD: "Stack the ingredients on the order ticket — 60 seconds", gCatch: "Catch the toppings", gCatchD: "Drag the tray to catch toppings, dodge trash — 3 lives", gMemo: "Memory flip", gMemoD: "Flip cards to find matching pairs",
      play: "Play", again: "Play again", score: "Score", best: "Your best this month: {n}", top: "This month's leaderboard", time: "Time", lives: "Lives", order: "Order ticket", next: "Next", wrong: "Oops!", done: "Done!", gameOver: "Time's up!", gameXp: "Game scores turn into XP (max 15 per game per month)",
      ing_bread: "Bread", ing_ham: "Ham", ing_chick: "Chicken", ing_tuna: "Tuna", ing_lett: "Lettuce", ing_tom: "Tomato", ing_cuc: "Cucumber", ing_oni: "Onion", ing_ol: "Olive", ing_pep: "Pepper", ing_chz: "Cheese", ing_sauce: "Sauce",
      drawT: "🎁 Monthly gift draw", drawHint: "The server draws at random (fair) — everyone sees the result.", prizes: "Gifts", prizeAdd: "+ Add gift", who: "Participants", whoAll: "Everyone who worked this month", mode: "Draw mode", modeEq: "One ticket each", modeXp: "By monthly points (more points → more tickets)", spin: "🎡 Spin!", redo: "Spin again", drawDone: "Draw results", drawNone: "No draw yet this month.", winners: "Winners",
      sysGift: "🎁 This month's gifts" },
    ja: { tab: "お店", loading: "お店を準備中…", noGl: "この端末は3D表示に対応していません（下の一覧は使えます）。",
      sum: "勤務中 {a}人 · 休憩 {b}人", sumSoon: " · まもなく {c}人", nobody: "いま勤務中の人はいません", me: "アバター", meNew: "アバターを作る",
      lv: "Lv {n}", board: "掲示板", chatPh: "お店のみんなにひとこと…", send: "送信", log: "メッセージ", logEmpty: "この2日間のメッセージはありません。",
      hint: "ドラッグで移動 · 2本指で回転/拡大 · 空いている場所をタップするとアバターが歩きます",
      hintPc: "ドラッグで移動 · 右ドラッグ(Shift+ドラッグ)で回転 · ホイールで拡大 · 空いている場所をクリックで移動",
      today: "今日のお店", stIn: "勤務中", stBrk: "休憩中", stSoon: "まもなく出勤", stLater: "このあと出勤", stOut: "退勤", stLate: "未打刻", stSup: "ヘルプ中",
      guest: "{s}からヘルプ", mgrName: "店長", you: "あなた",
      wave: "👋 手をふる", thanks: "💌 ありがとう", edit: "✏️ アバター編集", close: "閉じる", save: "保存", random: "🎲 おまかせ", saved: "アバターを保存しました ✨",
      tBody: "体型", tFace: "顔", tHair: "髪", tWear: "服", tAcc: "小物", tPet: "ペット",
      gH: "身長", gB: "体格", gSk: "肌の色", gFs: "輪郭", gEy: "目", gEc: "目の色", gBr: "眉", gMo: "口", gFx: "ほっぺ", gHs: "髪型", gHc: "髪の色",
      gOf: "トップス", gOc: "服の色", gPc: "ズボンの色", gUw: "勤務中は制服を着る", gAc: "アクセサリー", gPet: "連れて歩くペット",
      h0: "低め", h1: "ふつう", h2: "高め", b0: "細め", b1: "ふつう", b2: "がっしり", fs0: "まる", fs1: "たまご", fs2: "ほっぺ",
      fx0: "なし", fx1: "チーク", fx2: "そばかす", fx3: "両方", uw1: "着る", uw0: "着ない", locked: "🔒 Lv {n}",
      achT: "実績", xpOf: "{x}pt · Lv {l}まであと{n}pt", xpMax: "{x}pt · 最高レベル！", month: "今月",
      pIn: "出勤", pOn: "時間どおり出勤", pHk: "チェックリスト", pTr: "もらったありがとう", pTs: "送ったありがとう", pCh: "お店のメッセージ", pSup: "ヘルプ出勤",
      badges: "今月のバッジ", bEarly: "時間どおり", bHard: "がんばり屋", bLoved: "人気者", bTeam: "チームワーク", bTidy: "きっちり", bChat: "おしゃべり", bHelp: "ヘルプ",
      unlocks: "レベルで解放", howPts: "ポイントは打刻・チェックリスト・ありがとう・メッセージから自動計算（自分では増やせません）。",
      bdT: "今日の掲示板", bdNow: "お店にいる人", bdSoon: "このあと出勤", bdSup: "他店へヘルプ", bdGuest: "他店からヘルプ", bdLate: "出勤時刻を過ぎて未打刻", bdMemo: "連絡",
      bdBday: "🎂 今日が誕生日", bdNone: "なし", layout: "部屋のレイアウト", layAuto: "店名で自動", layOta: "太田川店の図面", layBasic: "標準",
      waved: "{n}さんに手をふりました", err: "お店を読み込めません", retry: "再試行", upd: "{t} 更新", petN0: "なし", petN1: "ねこ", petN2: "いぬ", petN3: "ひよこ", online: "アプリを見ています", sumOn: " · {n}人が来店中", tFx: "エフェクト", gEf: "アバターのエフェクト（レベルで解放）", ef0: "なし", ef1: "✨ きらきら", ef2: "⭐ スターリング", ef3: "👑 ゴールドオーラ", ef4: "🌈 レインボー", efAuto: "レベルで自動",
      orTitle: "オーナー向けレポート", orSub: "売上・客数・人件費・原材料 — 印刷／PDF", orOpen: "{m}月のレポート", orHint: "WingArcから出力したCSV（日別売上・時間帯別・商品別販売数など）をドラッグ／選択すると種類を自動判別して取り込みます。Macのボットで毎晩（22:00）自動取得もできます。", waImport: "WingArc CSV取込", waBot: "WingArcボット", waDone: "{n}件のファイルを取り込みました", waBad: "このWingArcファイルを読み取れません（日付列＋売上・客数・時間帯が必要）。", botHow: "ボットはMac上で動きます。キーチェーンに保存したアカウントでWingArcを開き、CSVをダウンロードして下のキーでアプリへ送信します。キーは売上データの送信専用で、データを読むことはできません。", botLast: "最終送信: {t}", botRenew: "新しいキーを発行（古いキーは無効）", botMake: "ボット用キーを発行", botOff: "ボットを停止", botKeyOnce: "キーは一度だけ表示されます — Macのボット設定ツールに貼り付けてください（キーチェーンに保存されます）。", botCopy: "キーをコピー", botOffDone: "ボットを停止しました", orLink: "オーナー用リンク", orCost: "経費・目標", cuFix: "円/月", cuPct: "売上の%", cuPctD: "デリバリー売上の%", cuPctL: "給与の%", cstHow: "経費を入力すると、レポートに損益・損益分岐点・月末の利益予測が出ます。分からない項目は空欄でOK（「未入力」と表示されます）。", cstOpen: "開店月", cstFix: "固定費（毎月）", cstVar: "売上・給与に比例する経費", cstExtra: "その他の経費（名前を自由に）", cstExName: "経費名", cstTarget: "目標", cstTargetL: "目標利益／月", cstWage: "平均時給は店舗設定、勤務時間はシフト（応援スタッフ含む）から計算します。", cstSaved: "経費を保存しました", ck_rent: "家賃", ck_common: "共益費・管理費", ck_royalty: "ロイヤリティ", ck_adfund: "広告分担金", ck_util: "水道光熱費", ck_net: "通信費", ck_card: "決済手数料", ck_deli: "デリバリー手数料", ck_social: "社会保険（会社負担）", ck_commute: "交通費", ck_supplies: "消耗品", ck_repair: "修繕費", ck_insure: "保険料", ck_deprec: "減価償却費", ck_other: "その他", orLang: "レポートの言語", orLinkHow: "オーナー様がいつでもレポートを見られる固定リンクです（月の選択・印刷／PDF保存）。閲覧のみで、変更はできません。個人の給与やパスワードは表示されません。", orLinkMake: "リンクを作成", orLinkCopy: "コピー", orLinkCopied: "リンクをコピーしました", orLinkShare: "送る…", orLinkOpen: "開いて確認", orLinkNew: "リンクを再発行", orLinkNewQ: "リンクを再発行しますか？オーナー様に送ったリンクは使えなくなります。", orLinkOff: "リンクを停止", orLinkOffQ: "リンクを停止しますか？オーナー様は閲覧できなくなります（再開すると新しいリンクになります）。", orLinkOffDone: "オーナー用リンクを停止しました", orLinkSafe: "リンクを知っている人は誰でも閲覧できます。オーナー様だけに送ってください。", orLinkSeen: "オーナー様の最終閲覧: {t}", orLinkNoFront: "一度お店のGitHubリンクからアプリを開いてページのアドレスを登録してから、もう一度開いてください。",
      actT: "アクション", act_wipe: "テーブル拭き", act_mop: "床モップ", act_vac: "掃除機", act_bake: "パン作り", act_sit: "座る", act_dance: "ダンス", act_dance2: "ディスコ", act_guitar: "ギター", act_bow: "あいさつ", act_wave: "手をふる", act_cheer: "応援", act_clap: "拍手", act_heart: "ハート", act_thumb: "いいね", act_coffee: "コーヒー", act_eat: "おやつ", act_phone: "スマホ", act_think: "考え中", act_stretch: "のび", act_sleep: "うとうと",
      kd_guest: "お客様からお褒め", kd_bake: "パン作り名人", kd_clean: "清掃名人", kd_fast: "てきぱき", kd_team: "チームワーク", kd_smile: "笑顔がすてき", kd_help: "助け上手", kd_star: "今月のMVP", kd_xp: "ポイント付与", kd_unlock: "プレゼント",
      rank1: "トレーナー", rank2: "シフトリーダー", rank3: "副店長", rank4: "店長",
      grant: "🏅 表彰", grantT: "{n}さんを表彰", grantKudo: "称号（3日間リボン表示＋お店全体にお知らせ）", grantXp: "ポイント加算／減算", grantNote: "メッセージ（任意）", grantNotePh: "例：お客様がサンドを褒めてくれた", grantItems: "アイテムをプレゼント（レベル不足でも解放）", grantOk: "表彰する", granted: "{n}さんを表彰しました ✨", kudoList: "もらった称号",
      tcBtn: "🔑 管理モード", tcOn: "🔑 店長権限で操作中（{n}）— シフト作成・確定・お店", tcExit: "終了", tcErr: "管理モードを開けません", tcAssign: "🔑 店長権限（スタッフの端末からシフト作成）", tcHint: "最上位の役職（店長）は自動で付与。給与・個人情報・パスワード・バックアップは見られません。", tcSaved: "店長権限を保存しました",
      games: "🎮 ゲーム", gift: "🎁 今月のプレゼント", gBake: "スピードサンド", gBakeD: "オーダー票どおりに具材を重ねよう — 60秒", gCatch: "具材キャッチ", gCatchD: "トレーを動かして具材をキャッチ、ゴミはよけて — ライフ3", gMemo: "神経衰弱", gMemoD: "同じ具材のペアを見つけよう",
      play: "あそぶ", again: "もう一回", score: "スコア", best: "今月のベスト: {n}", top: "今月のランキング", time: "時間", lives: "ライフ", order: "オーダー票", next: "次へ", wrong: "ちがうよ！", done: "完成！", gameOver: "タイムアップ！", gameXp: "ゲームのスコアは経験値に（1ゲーム月15ptまで）",
      ing_bread: "パン", ing_ham: "ハム", ing_chick: "チキン", ing_tuna: "ツナ", ing_lett: "レタス", ing_tom: "トマト", ing_cuc: "きゅうり", ing_oni: "オニオン", ing_ol: "オリーブ", ing_pep: "ピーマン", ing_chz: "チーズ", ing_sauce: "ソース",
      drawT: "🎁 月末プレゼント抽選", drawHint: "サーバーが公平に抽選します。結果はお店のみんなに表示されます。", prizes: "プレゼント", prizeAdd: "＋ 追加", who: "参加者", whoAll: "今月出勤した人", mode: "抽選方法", modeEq: "1人1口", modeXp: "今月のポイント順（多いほど当たりやすい）", spin: "🎡 回す！", redo: "やり直す", drawDone: "抽選結果", drawNone: "今月はまだ抽選していません。", winners: "当選者",
      sysGift: "🎁 今月のプレゼント" }
  };
  function ot(k, v){
    var D = OFC_TX[state.lang] || OFC_TX.vi, s = D[k] != null ? D[k] : (OFC_TX.vi[k] != null ? OFC_TX.vi[k] : k);
    if (v) s = String(s).replace(/\{(\w+)\}/g, function(m, x){ return v[x] != null ? v[x] : m; });
    return s;
  }
  var OFC_ICON = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v10h16V10"/><path d="M3 4h18l-1.2 4.2a2.3 2.3 0 0 1-4.4 0 2.3 2.3 0 0 1-4.4 0 2.3 2.3 0 0 1-4.4 0 2.3 2.3 0 0 1-4.4 0Z"/><path d="M9.5 20v-5h5v5"/></svg>';

  function ofcHmL(h){ var m = Math.round(h * 60), hh = Math.floor(m / 60), mm = m % 60; return hh + ":" + (mm < 10 ? "0" : "") + mm; }
  function ofcShTxt(p){ return (p.sh || []).map(function(s){ return (s.sup ? "✈" : "") + ofcHmL(s.s) + "–" + (s.L ? "L" : ofcHmL(s.e)); }).join(" / "); }
  function ofcStLbl(st){ return ot({ "in": "stIn", brk: "stBrk", soon: "stSoon", later: "stLater", out: "stOut", late: "stLate", sup: "stSup" }[st] || "stOut"); }

  function officeHTML(){
    var d = OFC.d, lv = d && d.mine ? d.mine.lv : 1, hasAv = d && d.av;
    return '<div class="ofc" id="ofcRoot">' +
      '<div class="ofc-head">' +
        '<div class="ofc-ttl"><b>🏪 ' + escapeHTML(ot("tab")) + '</b><small id="ofcSum">' + escapeHTML(d ? ofcSumTxt(d) : ot("loading")) + '</small></div>' +
        '<button type="button" class="ofc-chip' + (d && !hasAv ? ' is-new' : '') + '" id="ofcMeBtn"><span class="ofc-me-th" id="ofcMeTh"></span><span>' + escapeHTML(d && !hasAv ? ot("meNew") : ot("me")) + '</span></button>' +
        '<button type="button" class="ofc-chip ofc-lv" id="ofcLvBtn">🏆 <span>' + escapeHTML(ot("lv", { n: lv })) + '</span></button>' +
      '</div>' +
      '<div class="ofc-stage" id="ofcStage">' +
        '<div class="ofc-ov no-ei" id="ofcOv"></div>' +
        '<div class="ofc-msg" id="ofcMsg">' + escapeHTML(ot("loading")) + '</div>' +
        '<div class="ofc-ctl" role="group">' +
          '<button type="button" data-ofcctl="l" aria-label="⟲">⟲</button><button type="button" data-ofcctl="r" aria-label="⟳">⟳</button>' +
          '<button type="button" data-ofcctl="+" aria-label="+">＋</button><button type="button" data-ofcctl="-" aria-label="−">－</button>' +
          '<button type="button" data-ofcctl="0" aria-label="⌖">⌖</button></div>' +
        '<button type="button" class="ofc-board" id="ofcBoardBtn">📋 <span>' + escapeHTML(ot("board")) + '</span></button>' +
      '</div>' +
      ofcActBarHTML() +
      '<div class="ofc-tools" id="ofcTools">' + ofcToolsHTML(d) + '</div>' +
      '<div class="ofc-hint">' + escapeHTML(window.matchMedia && matchMedia("(pointer:coarse)").matches ? ot("hint") : ot("hintPc")) + '</div>' +
      '<div class="ofc-chat">' +
        '<div class="ofc-emo no-ei">' + ((d && d.emoji) || ["👍", "🎉", "💪", "😂", "🙏", "❤️", "👋", "☕"]).slice(0, 8).map(function(e){ return '<button type="button" data-ofcemo="' + e + '">' + e + '</button>'; }).join("") + '</div>' +
        '<form class="ofc-say" id="ofcSay"><input type="text" id="ofcTxt" maxlength="60" autocomplete="off" placeholder="' + escapeHTML(ot("chatPh")) + '">' +
          '<button type="submit" class="ofc-send">' + escapeHTML(ot("send")) + '</button>' +
          '<button type="button" class="ofc-log" id="ofcLogBtn" aria-label="' + escapeHTML(ot("log")) + '">💬</button></form>' +
      '</div>' +
      '<div class="ofc-list" id="ofcList">' + (d ? ofcListHTML(d) : '') + '</div>' +
    '</div>';
  }
  function ofcToolsHTML(d){
    return '<button type="button" class="ofc-tool" data-ofctool="games">' + escapeHTML(ot("games")) + '</button>' +
      '<button type="button" class="ofc-tool" data-ofctool="gift">' + escapeHTML(ot("gift")) + (d && d.draw ? ' <b class="ofc-dot"></b>' : '') + '</button>' +
      (d && d.tc ? '<button type="button" class="ofc-tool is-tc" data-ofctool="tc">' + escapeHTML(ot("tcBtn")) + '</button>' : '');
  }
  function ofcSumTxt(d){
    var a = 0, b = 0, c = 0, v = 0, on = d.on || {};
    (d.people || []).concat(d.guests || []).forEach(function(p){ if (p.st === "in") a++; else if (p.st === "brk") b++; else { if (p.st === "soon") c++; if (on[p.id] || p.id === d.me) v++; } });
    var tail = (c ? ot("sumSoon", { c: c }) : "") + (v ? ot("sumOn", { n: v }) : "");
    if (!a && !b) return ot("nobody") + tail;
    return ot("sum", { a: a, b: b }) + tail;
  }
  function ofcListHTML(d){
    var order = { "in": 0, brk: 1, soon: 2, later: 3, late: 4, sup: 5, out: 6 };
    var on = d.on || {};
    var rows = (d.people || []).concat(d.guests || []).filter(function(p){ return (p.st && (p.st !== "late" || d.mgr)) || on[p.id]; });
    function ord(p){ return p.st === "in" || p.st === "brk" ? order[p.st] : (on[p.id] ? 1.5 : (order[p.st] != null ? order[p.st] : 7)); }
    rows.sort(function(a, b){ return (ord(a) - ord(b)) || (((a.sh || [])[0] || {}).s || 0) - (((b.sh || [])[0] || {}).s || 0); });
    if (!rows.length) return '';
    return '<div class="ofc-lt">' + escapeHTML(ot("today")) + '</div>' + rows.map(function(p){
      var onl = !!on[p.id] && p.st !== "in" && p.st !== "brk";
      return '<button type="button" class="ofc-row st-' + (p.st || "none") + (on[p.id] ? ' is-online' : '') + '" data-ofcwho="' + escapeHTML(p.id) + '">' +
        '<span class="ofc-thw"><img class="ofc-th" alt="" src="' + ofcThumb(p.av, p.id, "head", p.st === "in" || p.st === "brk") + '"></span>' +
        '<span class="ofc-rn"><b>' + escapeHTML(p.name) + (p.id === d.me ? ' <small>(' + escapeHTML(ot("you")) + ')</small>' : '') + (p.bd ? ' 🎂' : '') + '</b>' +
        '<small>' + escapeHTML(p.guest ? ot("guest", { s: p.store }) + " · " : "") + escapeHTML(ofcShTxt(p)) + '</small></span>' +
        '<span class="ofc-st' + (onl ? ' st-on' : '') + '">' + escapeHTML(onl ? ot("online") : ofcStLbl(p.st)) + '</span></button>';
    }).join("");
  }

  var OFC_HB = 0;
  function ofcBeat(){
    if (!state.token || document.hidden || document.getElementById("ofcRoot")) return;
    if (Date.now() - OFC_HB < 55000) return;
    OFC_HB = Date.now();
    try { callInner_("officeHere").catch(function(){}); } catch (e){}
  }
  setInterval(ofcBeat, 15000);
  document.addEventListener("visibilitychange", function(){ if (!document.hidden) setTimeout(ofcBeat, 1500); });

  /** Gọi sau mỗi lần dựng màn (renderStaff / renderManager). */
  function officeAfterRender(on){
    document.body.classList.toggle("ofc-on", !!on);
    ofcTcBanner();
    if (!on){ clearInterval(OFC.timer); OFC.timer = 0; ofcLiveStop(); return; }
    var stage = document.getElementById("ofcStage"); if (!stage) return;
    var who = state.role + ":" + (state.role === "mgr" ? "m" : state.myEmpId);
    if (OFC.who !== who){                 // đổi người dùng trên cùng máy → bỏ dữ liệu cũ
      OFC.who = who; OFC.d = null; OFC.at = 0; OFC.seenChat = 0;
      if (OFC.sc) Object.keys(OFC.sc.ents).forEach(function(id){ delete OFC.sc.ents[id]; });
    }
    var sc = ofcScene();
    stage.insertBefore(sc.canvas, stage.firstChild);
    sc.tagEls.forEach(function(o){ o.el.remove(); }); sc.tagEls = [];
    Object.keys(sc.ents).forEach(function(id){ sc.ents[id].tag = null; sc.ents[id].bub = null; });
    var msg = document.getElementById("ofcMsg");
    if (!sc.R){ if (msg) msg.textContent = ot("noGl"); stage.classList.add("no-gl"); }
    else if (OFC.d && msg) msg.style.display = "none";
    ofcWireUI();
    if (OFC.d){ ofcApply(OFC.d); }
    if (!OFC.d || Date.now() - OFC.at > 15000) ofcLoad();
    clearInterval(OFC.timer);
    OFC.timer = setInterval(function(){ if (!document.hidden && document.getElementById("ofcRoot")) ofcLoad(); }, 30000);
    ofcLoop(); ofcLiveStart();
  }
  function ofcLoad(){
    if (OFC.busy) return; OFC.busy = true;
    return call("officeState").then(function(d){
      OFC.busy = false; OFC.err = ""; OFC.at = Date.now();
      ofcApply(d);
    }, function(e){
      OFC.busy = false; OFC.err = (e && e.message) || ot("err");
      var msg = document.getElementById("ofcMsg");
      if (msg && !OFC.d){ msg.style.display = ""; msg.innerHTML = escapeHTML(ot("err")) + '<br><small>' + escapeHTML(OFC.err) + '</small><br><button type="button" class="btn ghost" id="ofcRetry">' + escapeHTML(ot("retry")) + '</button>';
        var rb = document.getElementById("ofcRetry"); if (rb) rb.addEventListener("click", function(){ msg.textContent = ot("loading"); ofcLoad(); }); }
    });
  }
  function ofcApply(d){
    var prev = OFC.d; OFC.d = d;
    var sc = OFC.sc, msg = document.getElementById("ofcMsg");
    if (sc && sc.R){
      ofcSetLayout(sc, ofcPickLayout(d.layout, d.store), d.store);
      ofcSync(sc, d);
      if (msg) msg.style.display = "none";
      ofcLoop();
      // bong bóng cho tin mới (lần đầu: chỉ tin trong 90 giây gần nhất)
      if (!OFC.seenChat) OFC.seenChat = Date.now() - 90000;
      ofcChatIn(d.chat || []);
    } else (d.chat || []).forEach(function(c){ if (c.at > OFC.seenChat) OFC.seenChat = c.at; });
    var tl = document.getElementById("ofcTools"); if (tl){ tl.innerHTML = ofcToolsHTML(d); ofcWireTools(); }
    var sum = document.getElementById("ofcSum"); if (sum) sum.textContent = ofcSumTxt(d);
    var lst = document.getElementById("ofcList"); if (lst){ lst.innerHTML = ofcListHTML(d); ofcWireList(); }
    var lvb = document.querySelector("#ofcLvBtn span"); if (lvb) lvb.textContent = ot("lv", { n: d.mine.lv });
    var meb = document.getElementById("ofcMeBtn");
    if (meb){ meb.classList.toggle("is-new", !d.av); meb.lastChild.textContent = d.av ? ot("me") : ot("meNew"); }
    var th = document.getElementById("ofcMeTh"); if (th) th.style.backgroundImage = "url(" + ofcThumb(d.av, d.me, "head", false) + ")";
    if (!prev || JSON.stringify(prev.emoji) !== JSON.stringify(d.emoji)) {}
  }
  function ofcWireList(){
    document.querySelectorAll("[data-ofcwho]").forEach(function(b){ b.addEventListener("click", function(){ ofcPersonCard(b.getAttribute("data-ofcwho")); }); });
  }
  function ofcWireUI(){
    var root = document.getElementById("ofcRoot"); if (!root) return;
    root.querySelectorAll("[data-ofcctl]").forEach(function(b){ b.addEventListener("click", function(){ if (OFC.sc && OFC.sc.ctl) OFC.sc.ctl(b.getAttribute("data-ofcctl")); }); });
    root.querySelectorAll("[data-ofcemo]").forEach(function(b){ b.addEventListener("click", function(){ ofcSay("", b.getAttribute("data-ofcemo")); }); });
    var f = document.getElementById("ofcSay");
    if (f) f.addEventListener("submit", function(ev){ ev.preventDefault(); var i = document.getElementById("ofcTxt"); var v = (i.value || "").trim(); if (!v) return; ofcSay(v, ""); i.value = ""; });
    var on = function(id, fn){ var el = document.getElementById(id); if (el) el.addEventListener("click", fn); };
    on("ofcBoardBtn", ofcBoardDialog); on("ofcLogBtn", ofcLogDialog); on("ofcLvBtn", ofcAchDialog); on("ofcMeBtn", ofcEditDialog);
    root.querySelectorAll("[data-ofcact]").forEach(function(b){ b.addEventListener("click", function(){ ofcDoAct(b.getAttribute("data-ofcact")); }); });
    ofcWireList(); ofcWireTools();
  }
  function ofcWireTools(){
    document.querySelectorAll("[data-ofctool]").forEach(function(b){
      if (b._w) return; b._w = 1;
      b.addEventListener("click", function(){ var k = b.getAttribute("data-ofctool");
        if (k === "games") ofcGamesDialog(); else if (k === "gift") ofcDrawDialog(); else if (k === "tc") ofcTenchouEnter(); });
    });
  }
  function ofcSay(text, emo, to){
    if (Date.now() - OFC.say < 2500){ showToast("🙂 …", false); return Promise.resolve(); }
    OFC.say = Date.now();
    // hiện ngay trên đầu nhân vật của mình (không chờ máy chủ)
    var sc = OFC.sc, me = OFC.d && sc && sc.ents[OFC.d.me];
    if (me){ me.say = { id: "local" + Date.now(), text: text || emo, emo: !text, until: Date.now() + (text ? 7000 : 3500), local: 1, at: Date.now() }; me.wave = (performance.now() - sc.t0) / 1000 + 1.6; }
    if (to && sc && sc.ents[to]) sc.ents[to].jumpAt = (performance.now() - sc.t0) / 1000 + 0.4;
    return call("officeSay", text || "", emo || "", to || "").then(function(m){
      if (m && m.at > OFC.seenChat) OFC.seenChat = m.at;
      if (m && OFC.d && OFC.d.chat) OFC.d.chat.push(m);
    }, function(e){ showToast((e && e.message) || t("saveErrorToast"), true); });
  }

  // ---------- ảnh nhỏ nhân vật (dùng chung một bộ vẽ ẩn) ----------
  function ofcThR(){
    if (OFC.th !== null && OFC.th !== undefined) return OFC.th;
    var cv = document.createElement("canvas"); cv.width = 240; cv.height = 240;
    var R = R3(cv); OFC.th = R || false;
    if (R){ R.bg = [0, 0, 0, 0]; R.lineW = 0.012; }
    return OFC.th;
  }
  function ofcRenderAv(R, av, id, mode, uni, yaw, t, ef){
    var P = avBuild(av, id, { uniform: uni, noShadow: mode !== "body", noPet: mode !== "pet" && mode !== "body" });
    P.root.r[1] = yaw || 0;
    avAnimate(P, "idle", t == null ? 0.6 : t, { seed: 0 });
    if (ef){ avFxBuild(P, ef); P.fxUpd(t || 0); }
    var roots = [P.root], hy = P.L + 0.06 + P.T + AV_HEAD_R * 0.9;
    if (mode === "head") R.camera([0, hy + 0.12, 1.25], [0, hy - 0.04, 0], 0.5, 0.1, 10);
    else if (mode === "pet"){ if (P.pet){ P.pet.p = [0, 0, 0]; P.pet.r[1] = 0.5; roots = [P.pet]; } R.camera([0, 0.35, 0.9], [0, 0.15, 0], 0.5, 0.05, 10); }
    else R.camera([0, 0.95, 2.55], [0, 0.66, 0], 0.62, 0.1, 10);
    R.render(roots);
  }
  function ofcThumb(av, id, mode, uni){
    var key = JSON.stringify(avFix(av, id)) + mode + (uni ? 1 : 0);
    if (OFC.thc[key]) return OFC.thc[key];
    var R = ofcThR();
    if (!R) return "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
    ofcRenderAv(R, av, id, mode, uni);
    var c2 = document.createElement("canvas"); c2.width = 96; c2.height = 96;
    c2.getContext("2d").drawImage(R.canvas, 0, 0, 96, 96);
    var url = c2.toDataURL("image/png");
    var ks = Object.keys(OFC.thc); if (ks.length > 240) ks.slice(0, 80).forEach(function(k){ delete OFC.thc[k]; });
    OFC.thc[key] = url; return url;
  }

  // ---------- hộp thoại ----------
  function ofcFind(id){
    var d = OFC.d; if (!d) return null;
    if (id === "m") return { id: "m", name: ot("mgrName"), av: d.mav, st: "", sh: [], lv: 0 };
    return (d.people || []).concat(d.guests || []).filter(function(p){ return p.id === id; })[0] || null;
  }
  async function ofcPersonCard(id){
    var d = OFC.d, p = ofcFind(id); if (!p || !d) return;
    var self = id === d.me, emp = !p.guest && id !== "m";
    var html = '<div class="ofc-card"><img class="ofc-cimg" alt="" src="' + ofcThumb(p.av, p.id, "body", p.st === "in" || p.st === "brk") + '">' +
      '<div class="ofc-cinfo"><b>' + escapeHTML(p.name) + (p.bd ? ' 🎂' : '') + '</b>' +
      (p.st && !((d.on || {})[id] && p.st !== "in" && p.st !== "brk") ? '<span class="ofc-st st-' + p.st + '">' + escapeHTML(ofcStLbl(p.st)) + '</span>' :
        ((d.on || {})[id] || self ? '<span class="ofc-st st-on">' + escapeHTML(ot("online")) + '</span>' : '')) +
      (p.sh && p.sh.length ? '<small>' + escapeHTML(ofcShTxt(p)) + '</small>' : '') +
      (p.guest ? '<small>' + escapeHTML(ot("guest", { s: p.store })) + '</small>' : '') +
      (p.lv ? '<span class="ofc-lvp">🏆 ' + escapeHTML(ot("lv", { n: p.lv })) + (p.rk ? ' · ' + escapeHTML(ofcRankName(d, p.rk)) : '') + '</span>' : '') + '</div></div>' +
      ((p.kd || []).length ? '<div class="ofc-kds no-ei">' + p.kd.slice().reverse().map(function(k){ return '<span class="ofc-kd">' + (OFC_KUDO_ICON[k.k] || "🏅") + ' ' + escapeHTML(ot("kd_" + k.k)) + (k.n ? ' <small>' + escapeHTML(k.n) + '</small>' : '') + '</span>'; }).join("") + '</div>' : '') +
      '<div class="ofc-cacts">' + (self ? '<button type="button" class="btn" data-ofcact="edit">' + escapeHTML(ot("edit")) + '</button>' :
        '<button type="button" class="btn" data-ofcact="wave">' + escapeHTML(ot("wave")) + '</button>' +
        (emp ? '<button type="button" class="btn ghost" data-ofcact="thx">' + escapeHTML(ot("thanks")) + '</button>' : '') +
        (emp && d.mgr ? '<button type="button" class="btn ghost ofc-grant-btn" data-ofcact="grant">' + escapeHTML(ot("grant")) + '</button>' : '')) + '</div>';
    var act = "";
    await uiDialog({ title: p.name, html: html, hideCancel: true, okText: ot("close"),
      onOpen: function(back){ back.querySelectorAll("[data-ofcact]").forEach(function(b){ b.addEventListener("click", function(){ act = b.getAttribute("data-ofcact"); var ok = back.querySelector("#mOk"); if (ok) ok.click(); }); }); } });
    if (act === "edit") ofcEditDialog();
    else if (act === "wave"){ ofcSay("", "👋", id); showToast(ot("waved", { n: p.name })); }
    else if (act === "thx" && typeof showThanksSend === "function") showThanksSend(state.role === "mgr" ? "m" : activeEmpId(), id, function(){});
    else if (act === "grant") ofcGrantDialog(id);
  }
  async function ofcLogDialog(){
    var d = OFC.d; if (!d) return;
    var L = (d.chat || []).slice().reverse();
    function nm(f){ var p = ofcFind(f); return p ? p.name : "?"; }
    var html = L.length ? '<div class="ofc-logl no-ei">' + L.map(function(c){
      var p = ofcFind(c.f) || { av: null, id: c.f }, dt = new Date(c.at);
      return '<div class="ofc-lr' + (c.f === d.me ? ' is-me' : '') + '"><img class="ofc-th" alt="" src="' + ofcThumb(p.av, p.id, "head", false) + '">' +
        '<div><b>' + escapeHTML(nm(c.f)) + (c.to ? ' → ' + escapeHTML(nm(c.to)) : '') + ' <small>' + (dt.getMonth() + 1) + '/' + dt.getDate() + ' ' + dt.getHours() + ':' + pad(dt.getMinutes()) + '</small></b>' +
        '<p>' + escapeHTML(c.m || "") + (c.e ? ' <span class="ofc-le">' + c.e + '</span>' : '') + '</p></div></div>';
    }).join("") + '</div>' : '<div class="hint">' + escapeHTML(ot("logEmpty")) + '</div>';
    await uiDialog({ title: "💬 " + ot("log"), html: html, hideCancel: true, okText: ot("close") });
  }
  async function ofcBoardDialog(){
    var d = OFC.d; if (!d) return;
    var all = (d.people || []).concat(d.guests || []);
    function sec(title, list){ return '<div class="ofc-bs"><h5>' + escapeHTML(title) + '</h5>' + (list.length ? list.map(function(p){
      return '<div class="ofc-bl"><img class="ofc-th" alt="" src="' + ofcThumb(p.av, p.id, "head", false) + '"><b>' + escapeHTML(p.name) + '</b><small>' + escapeHTML(ofcShTxt(p) || "") + '</small></div>'; }).join("") :
      '<div class="ofc-bn">' + escapeHTML(ot("bdNone")) + '</div>') + '</div>'; }
    var html = '<div class="ofc-bd">';
    var bd = (d.people || []).filter(function(p){ return p.bd; });
    if (bd.length) html += '<div class="ofc-bday">' + escapeHTML(ot("bdBday")) + ': <b>' + bd.map(function(p){ return escapeHTML(p.name); }).join(", ") + '</b></div>';
    if ((d.memos || []).length) html += '<div class="ofc-bs"><h5>📌 ' + escapeHTML(ot("bdMemo")) + '</h5>' + d.memos.map(function(m){
      return '<div class="ofc-memo"><b>' + escapeHTML(m.t) + '</b>' + (m.x ? '<span>' + escapeHTML(m.x) + '</span>' : '') + '</div>'; }).join("") + '</div>';
    html += sec(ot("bdNow"), all.filter(function(p){ return (p.st === "in" || p.st === "brk") && !p.guest; }));
    html += sec(ot("bdSoon"), all.filter(function(p){ return (p.st === "soon" || p.st === "later") && !p.guest; }));
    var gs = all.filter(function(p){ return p.guest; }); if (gs.length) html += sec(ot("bdGuest"), gs);
    var sp = all.filter(function(p){ return p.st === "sup"; }); if (sp.length) html += sec(ot("bdSup"), sp);
    if (d.mgr){ var lt = all.filter(function(p){ return p.st === "late"; }); if (lt.length) html += sec("⚠ " + ot("bdLate"), lt); }
    if (d.draw) html += '<div class="ofc-bs"><h5>' + escapeHTML(ot("sysGift")) + '</h5>' + d.draw.list.map(function(x){ return '<div class="ofc-bl">🎁 <b>' + escapeHTML(x.name) + '</b><small>' + escapeHTML(x.p) + '</small></div>'; }).join("") + '</div>';
    if (d.mgr && !d.dl) html += '<div class="ofc-bs"><h5>' + escapeHTML(ot("tcAssign")) + '</h5><p class="hint">' + escapeHTML(ot("tcHint")) + '</p><div class="ofc-seg" id="ofcTc">' +
      (d.people || []).map(function(p){ var auto = p.rk === 4; return '<button type="button" data-ofctc="' + escapeHTML(p.id) + '" class="' + ((d.tcIds || []).indexOf(p.id) !== -1 ? 'is-on' : '') + '"' + (auto ? ' disabled' : '') + '>' + escapeHTML(p.name) + (auto ? ' ✓' : '') + '</button>'; }).join("") + '</div></div>';
    if (d.mgr && !d.dl) html += '<div class="ofc-bs"><h5>' + escapeHTML(ot("layout")) + '</h5><div class="ofc-seg" id="ofcLay">' + [["auto", "layAuto"], ["otagawa", "layOta"], ["basic", "layBasic"]].map(function(q){
      return '<button type="button" data-ofclay="' + q[0] + '" class="' + ((d.layout || "auto") === q[0] ? "is-on" : "") + '">' + escapeHTML(ot(q[1])) + '</button>'; }).join("") + '</div></div>';
    html += '</div>';
    await uiDialog({ title: "📋 " + ot("bdT"), html: html, hideCancel: true, okText: ot("close"), wide: true,
      onOpen: function(back){
        back.querySelectorAll("[data-ofctc]").forEach(function(b){ b.addEventListener("click", function(){
          b.classList.toggle("is-on");
          var ids = Array.prototype.slice.call(back.querySelectorAll("[data-ofctc].is-on:not([disabled])")).map(function(x){ return x.getAttribute("data-ofctc"); });
          call("officeConfig", JSON.stringify({ tc: ids })).then(function(r){ d.tcIds = (r.tc || []).concat((d.people || []).filter(function(p){ return p.rk === 4; }).map(function(p){ return p.id; })); showToast(ot("tcSaved")); },
            function(e){ b.classList.toggle("is-on"); showToast((e && e.message) || t("saveErrorToast"), true); });
        }); });
        back.querySelectorAll("[data-ofclay]").forEach(function(b){ b.addEventListener("click", function(){
        var v = b.getAttribute("data-ofclay");
        call("officeConfig", JSON.stringify({ layout: v })).then(function(r){ d.layout = r.layout; back.querySelectorAll("[data-ofclay]").forEach(function(x){ x.classList.toggle("is-on", x === b); }); ofcApply(d); },
          function(e){ showToast((e && e.message) || t("saveErrorToast"), true); });
      }); }); } });
  }
  async function ofcAchDialog(){
    var d = OFC.d; if (!d) return;
    var M = d.mine, lv = M.lv, L = M.lvs, cur = L[lv - 1] || 0, nxt = L[lv], pct = nxt ? Math.round((M.xp - cur) / (nxt - cur) * 100) : 100;
    var n = M.n || {};
    var rows = [["pIn", n["in"], 10], ["pOn", n.on, 5], ["pHk", n.hk, 2], ["pTr", n.tr, 8], ["pTs", n.ts, 3], ["pCh", n.ch, 1], ["pSup", n.sup, 15]];
    var bn = { early: "bEarly", hard: "bHard", loved: "bLoved", team: "bTeam", tidy: "bTidy", chat: "bChat", help: "bHelp" };
    var lockL = {};
    Object.keys(d.lock || {}).forEach(function(f){ Object.keys(d.lock[f]).forEach(function(i){ var l = d.lock[f][i]; (lockL[l] = lockL[l] || []).push([f, Number(i)]); }); });
    var html = '<div class="ofc-ach">' +
      '<div class="ofc-lvbig"><span class="ofc-lvn">' + lv + '</span><div><b>' + escapeHTML(ot("lv", { n: lv })) + '</b>' +
        '<div class="ofc-xpbar"><i style="width:' + pct + '%"></i></div><small>' + escapeHTML(nxt ? ot("xpOf", { x: M.xp, n: nxt - M.xp, l: lv + 1 }) : ot("xpMax", { x: M.xp })) + '</small></div></div>' +
      '<h5>' + escapeHTML(ot("badges")) + '</h5><div class="ofc-badges">' + (M.badges || []).map(function(b){
        var done = b.n >= b.goal;
        return '<div class="ofc-badge' + (done ? ' is-done' : '') + '"><span class="ofc-bi" style="--p:' + Math.round(b.n / b.goal * 100) + '"><span>' + b.i + '</span></span><b>' + escapeHTML(ot(bn[b.k])) + '</b><small>' + b.n + '/' + b.goal + '</small></div>'; }).join("") + '</div>' +
      '<h5>' + escapeHTML(ot("month")) + ' · +' + M.mx + '</h5><div class="ofc-pts">' + rows.map(function(r){
        return '<div><span>' + escapeHTML(ot(r[0])) + '</span><small>' + (r[1] || 0) + ' × ' + r[2] + '</small><b>+' + ((r[1] || 0) * r[2]) + '</b></div>'; }).join("") + '</div>' +
      '<h5>' + escapeHTML(ot("unlocks")) + '</h5><div class="ofc-unl">' + Object.keys(lockL).sort(function(a, b){ return a - b; }).map(function(l){
        return '<div class="' + (lv >= Number(l) ? 'is-on' : '') + '"><b>' + escapeHTML(ot("lv", { n: l })) + '</b>' + lockL[l].map(function(q){
          var pm = q[0] === "pet" ? "pet" : (q[0] === "of" ? "body" : "head");
          return '<img class="ofc-th" alt="" src="' + ofcThumb(Object.assign({}, d.av || avDefault(d.me), (function(){ var o = {}; o[q[0]] = q[1]; return o; })()), d.me, pm, false) + '">'; }).join("") + (lv >= Number(l) ? ' ✓' : ' 🔒') + '</div>'; }).join("") + '</div>' +
      '<p class="hint">' + escapeHTML(ot("howPts")) + '</p></div>';
    await uiDialog({ title: "🏆 " + ot("achT"), html: html, hideCancel: true, okText: ot("close"), wide: true });
  }

  // ---------- tạo / sửa nhân vật ----------
  var OFC_EDIT_TABS = [
    ["tBody", [["h", 3, "txt", "h"], ["b", 3, "txt", "b"], ["sk", 8, "sw", AVP.skin]]],
    ["tFace", [["fs", 3, "txt", "fs"], ["ey", 8, "head"], ["ec", 6, "sw", AVP.eye], ["br", 5, "head"], ["mo", 7, "head"], ["fx", 4, "txt", "fx"]]],
    ["tHair", [["hs", 12, "head"], ["hc", 12, "sw", AVP.hair]]],
    ["tWear", [["of", 6, "body"], ["oc", 12, "sw", AVP.cloth], ["pc", 6, "sw", AVP.pants], ["uw", 2, "txt", "uw"]]],
    ["tAcc", [["ac", 13, "head"]]],
    ["tPet", [["pet", 4, "pet"]]],
    ["tFx", [["ef", 5, "txt", "ef"]]]
  ];
  var OFC_GNAME = { h: "gH", b: "gB", sk: "gSk", fs: "gFs", ey: "gEy", ec: "gEc", br: "gBr", mo: "gMo", fx: "gFx", hs: "gHs", hc: "gHc", of: "gOf", oc: "gOc", pc: "gPc", uw: "gUw", ac: "gAc", pet: "gPet", ef: "gEf" };
  async function ofcEditDialog(){
    var d = OFC.d; if (!d) return;
    var me = d.me, A = avFix(d.av, me), tab = 0, myLv = d.mgr ? 99 : d.mine.lv, rot = 0.35, raf = 0, drag = null, dirty = false;
    function locked(f, i){ var l = ((d.lock || {})[f] || {})[i]; return l && myLv < l ? l : 0; }
    function optHTML(g){
      var f = g[0], n = g[1], kind = g[2], out = '<div class="ave-g"><div class="ave-gt">' + escapeHTML(ot(OFC_GNAME[f])) + '</div><div class="ave-opts k-' + kind + '">';
      for (var i = 0; i < n; i++){
        var v = f === "uw" ? 1 - i : i, lk = locked(f, v), on = f === "ef" ? avFxOf(A, myLv) === v : A[f] === v;
        var inner = kind === "sw" ? '<i style="background:' + g[3][v] + '"></i>' :
          (kind === "txt" ? escapeHTML(ot(g[3] + v)) : '<img alt="" data-avth="' + f + ':' + v + '">');
        if (f === "pet" && kind === "pet" && v === 0) inner = '<span class="ave-none">∅</span>';
        if (f === "ac" && v === 0) inner = '<span class="ave-none">∅</span>';
        out += '<button type="button" class="ave-o' + (on ? ' is-on' : '') + (lk ? ' is-lock' : '') + '" data-avf="' + f + '" data-avv="' + v + '"' + (lk ? ' disabled' : '') + ' title="' + (f === "pet" ? escapeHTML(ot("petN" + v)) : '') + '">' + inner +
          (lk ? '<small class="ave-lk">' + escapeHTML(ot("locked", { n: lk })) + '</small>' : '') + '</button>';
      }
      return out + '</div></div>';
    }
    function bodyHTML(){ return OFC_EDIT_TABS[tab][1].map(optHTML).join(""); }
    var html = '<div class="ave">' +
      '<div class="ave-pv"><canvas id="avePv" width="300" height="300"></canvas><button type="button" class="btn ghost ave-rand" id="aveRand">' + escapeHTML(ot("random")) + '</button></div>' +
      '<div class="ave-side"><div class="ave-tabs" role="tablist">' + OFC_EDIT_TABS.map(function(tb, i){ return '<button type="button" data-avtab="' + i + '" class="' + (i === tab ? 'is-on' : '') + '">' + escapeHTML(ot(tb[0])) + '</button>'; }).join("") + '</div>' +
      '<div class="ave-body" id="aveBody">' + bodyHTML() + '</div></div></div>';
    var thT = 0;
    function fillThumbs(back){
      clearTimeout(thT);
      thT = setTimeout(function(){
        back.querySelectorAll("[data-avth]").forEach(function(img){
          var q = img.getAttribute("data-avth").split(":"), a2 = Object.assign({}, A); a2[q[0]] = Number(q[1]);
          if (q[0] === "of") a2.uw = 0;
          if (q[0] === "hs" || q[0] === "hc") a2.ac = 0;
          var mode = q[0] === "of" ? "body" : (q[0] === "pet" ? "pet" : "head");
          img.src = ofcThumb(a2, me, mode, false);
        });
      }, 30);
    }
    function paint(back){
      var cv = back.querySelector("#avePv"), R = ofcThR(); if (!cv || !R) return;
      ofcRenderAv(R, A, me, "body", false, rot, (performance.now() / 1000), avFxOf(A, myLv));
      var x = cv.getContext("2d"); x.clearRect(0, 0, 300, 300); x.drawImage(R.canvas, 0, 0, 300, 300);
    }
    var res = await uiDialog({ title: "✨ " + (d.av ? ot("edit") : ot("meNew")), html: html, okText: ot("save"), wide: true,
      onOpen: function(back){
        back.classList.add("ave-modal");
        function loop(){ if (!back.isConnected){ return; } if (!drag) rot += 0.006; paint(back); raf = requestAnimationFrame(loop); }
        raf = requestAnimationFrame(loop);
        fillThumbs(back);
        var cv = back.querySelector("#avePv");
        cv.addEventListener("pointerdown", function(ev){ drag = { x: ev.clientX }; try { cv.setPointerCapture(ev.pointerId); } catch (e){} });
        cv.addEventListener("pointermove", function(ev){ if (drag){ rot += (ev.clientX - drag.x) * 0.02; drag.x = ev.clientX; } });
        cv.addEventListener("pointerup", function(){ drag = null; });
        back.addEventListener("click", function(ev){
          var tb = ev.target.closest("[data-avtab]");
          if (tb){ tab = Number(tb.getAttribute("data-avtab")); back.querySelectorAll("[data-avtab]").forEach(function(x){ x.classList.toggle("is-on", x === tb); });
            back.querySelector("#aveBody").innerHTML = bodyHTML(); fillThumbs(back); return; }
          var o = ev.target.closest("[data-avf]");
          if (o && !o.disabled){
            var f = o.getAttribute("data-avf"); A[f] = Number(o.getAttribute("data-avv")); dirty = true;
            back.querySelectorAll('[data-avf="' + f + '"]').forEach(function(x){ x.classList.toggle("is-on", x === o); });
            fillThumbs(back); return;
          }
          if (ev.target.closest("#aveRand")){
            var r = avDefault(me + ":" + Date.now() + Math.random());
            Object.keys(r).forEach(function(k){ if (k !== "uw" && !locked(k, r[k])) A[k] = r[k]; });
            A.ac = [0, 0, 1, 3, 4, 6][Math.floor(Math.random() * 6)]; dirty = true;
            back.querySelector("#aveBody").innerHTML = bodyHTML(); fillThumbs(back);
          }
        });
      },
      collect: function(){ return { a: A }; } });
    cancelAnimationFrame(raf);
    if (!res) return;
    try {
      var saved = await call("saveAvatar", JSON.stringify(res.a));
      d.av = saved;
      if (d.me === "m") d.mav = saved;
      (d.people || []).forEach(function(p){ if (p.id === d.me) p.av = saved; });
      showToast(ot("saved"));
      ofcApply(d);
    } catch (e){ showToast((e && e.message) || t("saveErrorToast"), true); }
  }

  // ---------- v56: khen thưởng ----------
  async function ofcGrantDialog(id){
    var d = OFC.d, p = ofcFind(id); if (!d || !p) return;
    var kd = "", xp = 0, items = [];
    var K = ["guest", "bake", "clean", "fast", "team", "smile", "help", "star"];
    var lockItems = []; Object.keys(d.lock || {}).forEach(function(f){ Object.keys(d.lock[f]).forEach(function(v){ lockItems.push([f, Number(v)]); }); });
    var html = '<div class="ofc-grant"><div class="set-sub">' + escapeHTML(ot("grantKudo")) + '</div><div class="ofc-kgrid no-ei">' + K.map(function(k){
        return '<button type="button" data-gk="' + k + '"><span>' + OFC_KUDO_ICON[k] + '</span><small>' + escapeHTML(ot("kd_" + k)) + '</small></button>'; }).join("") + '</div>' +
      '<div class="set-sub">' + escapeHTML(ot("grantXp")) + '</div><div class="ofc-seg">' + [-50, 10, 20, 50, 100].map(function(v){ return '<button type="button" data-gx="' + v + '">' + (v > 0 ? "+" : "") + v + '</button>'; }).join("") + '</div>' +
      '<div class="set-sub">' + escapeHTML(ot("grantItems")) + '</div><div class="ofc-gitems">' + lockItems.map(function(q){
        var a2 = Object.assign({}, p.av || avDefault(p.id)); a2[q[0]] = q[1];
        var img = q[0] === "ef" ? '<span class="ofc-efi">' + escapeHTML(ot("ef" + q[1]).split(" ")[0]) + '</span>' : '<img alt="" src="' + ofcThumb(a2, p.id, q[0] === "pet" ? "pet" : (q[0] === "of" ? "body" : "head"), false) + '">';
        return '<button type="button" data-gi="' + q[0] + ':' + q[1] + '">' + img + '<small>Lv ' + d.lock[q[0]][q[1]] + '</small></button>'; }).join("") + '</div>' +
      '<label class="set-sub" for="gNote">' + escapeHTML(ot("grantNote")) + '</label><input type="text" id="gNote" maxlength="60" placeholder="' + escapeHTML(ot("grantNotePh")) + '"></div>';
    var res = await uiDialog({ title: ot("grantT", { n: p.name }), html: html, okText: ot("grantOk"), wide: true,
      onOpen: function(back){
        back.addEventListener("click", function(ev){
          var b = ev.target.closest("[data-gk],[data-gx],[data-gi]"); if (!b) return;
          if (b.hasAttribute("data-gk")){ var k = b.getAttribute("data-gk"); kd = kd === k ? "" : k; back.querySelectorAll("[data-gk]").forEach(function(x){ x.classList.toggle("is-on", x.getAttribute("data-gk") === kd); }); }
          else if (b.hasAttribute("data-gx")){ var v = Number(b.getAttribute("data-gx")); xp = xp === v ? 0 : v; back.querySelectorAll("[data-gx]").forEach(function(x){ x.classList.toggle("is-on", Number(x.getAttribute("data-gx")) === xp); }); }
          else { var q = b.getAttribute("data-gi"), i = items.indexOf(q); if (i === -1) items.push(q); else items.splice(i, 1); b.classList.toggle("is-on", i === -1); }
        });
      },
      collect: function(back){ return { note: back.querySelector("#gNote").value.trim() }; },
      validate: function(){ return kd || xp || items.length ? "" : ot("grantKudo"); } });
    if (!res) return;
    try {
      await call("officeGrant", JSON.stringify({ to: id, kudo: kd, xp: xp, note: res.note, items: items.map(function(q){ var a = q.split(":"); return [a[0], Number(a[1])]; }) }));
      showToast(ot("granted", { n: p.name })); OFC.at = 0; ofcLoad();
    } catch (e){ showToast((e && e.message) || t("saveErrorToast"), true); }
  }

  // ---------- v56: chế độ Tenchou (nhân viên được giao quyền xếp lịch) ----------
  async function ofcTenchouEnter(){
    try {
      var r = await call("tenchouSession");
      state.tcBack = { token: state.token, myEmpId: state.myEmpId, name: r.name, tab: state.staffTab };
      state.token = r.token; state.role = "mgr"; state.myEmpId = null; state.view = "manager"; state.mgrTab = "day";
      OFC.who = ""; await afterLogin();
    } catch (e){ showToast((e && e.message) || ot("tcErr"), true); }
  }
  async function ofcTenchouExit(){
    var b = state.tcBack; if (!b) return;
    state.tcBack = null; state.token = b.token; state.role = "emp"; state.myEmpId = b.myEmpId; state.view = "staff"; state.staffTab = "office";
    OFC.who = ""; await afterLogin();
  }
  function ofcTcBanner(){
    var old = document.getElementById("ofcTcBar");
    if (!state.tcBack || state.role !== "mgr"){ if (old) old.remove(); return; }
    if (old && old.isConnected && document.getElementById("app").contains(old)) return;
    var el = document.createElement("div"); el.id = "ofcTcBar"; el.className = "ofc-tcbar";
    el.innerHTML = '<span>' + escapeHTML(ot("tcOn", { n: state.tcBack.name })) + '</span><button type="button" class="btn ghost">' + escapeHTML(ot("tcExit")) + '</button>';
    el.querySelector("button").addEventListener("click", ofcTenchouExit);
    var app0 = document.getElementById("app"); if (app0) app0.insertBefore(el, app0.firstChild);
  }
