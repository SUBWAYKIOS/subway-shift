## v2026.11.05.3 — 🏪 Quán sống động · khen thưởng · Tenchou · trò chơi · quay thưởng · 📊 báo cáo chủ quán + bot WingArc
- **Gần thời gian thực**: khi mở tab Quán, máy hỏi máy chủ ~2 giây/lần (dữ liệu nhớ tạm, không ghi bảng tính) → tin nhắn hiện trên đầu nhân vật ở máy khác sau ~1 giây, đi lại / động tác thấy sau ~1–2 giây.
- **20 động tác** (thanh dưới khung quán): lau bàn, lau sàn (cây lau), hút bụi (máy hút), làm bánh (ổ bánh), ngồi, nhảy, disco, đàn hát, chào khách (いらっしゃいませ!), vẫy tay, cổ vũ, vỗ tay, thả tim, tuyệt vời, cà phê, ăn bánh, điện thoại, suy nghĩ, vươn vai, ngủ gật — có đạo cụ + biểu cảm bay lên. Người không điều khiển tự làm việc (làm bánh, lau quầy, chào khách, thỉnh thoảng đi lau sàn / hút bụi rồi về chỗ; giờ nghỉ uống cà phê, xem điện thoại…).
- **Chức vụ trên tên** (Trainer · Trưởng ca · Phó cửa hàng · Cửa hàng trưởng / tên tự đặt ở Cài đặt).
- **Tenchou**: Cửa hàng trưởng (chức vụ 4) + người quản lý chọn (📋 Bảng tin › Quyền Tenchou) có nút "🔑 Chế độ quản lý" ngay trong máy nhân viên → xếp ca, chốt lịch, bản in, chi viện, khen thưởng. KHÔNG xem được lương, hồ sơ, mật khẩu, sao lưu, cài đặt quán, danh sách nhân viên, doanh thu. Chỉ dùng được trên link GitHub; thoát bằng băng vàng trên cùng.
- **Khen thưởng** (quản lý / Tenchou, chạm nhân vật › 🏅): 8 danh hiệu (được khách khen, giỏi làm bánh, dọn dẹp giỏi, nhanh nhẹn, đồng đội tốt, nụ cười thân thiện, hay giúp đỡ, nhân viên của tháng) + cộng / trừ điểm + tặng đồ mở khoá dù chưa đủ cấp → ruy băng vàng trên đầu 3 ngày + băng rôn + pháo giấy ở mọi máy.
- **🎮 Trò chơi**: Làm bánh nhanh (theo phiếu order, 60 giây), Hứng nguyên liệu (kéo khay, tránh rác), Lật thẻ nhớ — bảng xếp hạng tháng; điểm trò chơi đổi ra kinh nghiệm có trần (≤ 15 / trò / tháng).
- **🎁 Quay thưởng cuối tháng**: quản lý nhập quà (trà sữa, bánh kẹo…), chọn người tham gia, mỗi người 1 phiếu hoặc theo điểm tháng → máy chủ bốc thăm (công bằng) → vòng quay + pháo giấy, 🎁 hiện trên tên người trúng, mọi người thấy kết quả.
- **📊 Báo cáo cho chủ quán** (tab Tháng › nhóm Doanh thu): bản A4 3 trang (日本語 / Tiếng Việt / English) — doanh thu + so tháng trước, khách, chi tiêu/khách, 人件費率, 人時売上, 原価率 / FL, biểu đồ ngày, theo thứ, theo giờ, kênh bán, món bán chạy, giờ công từng người (xếp ca vs thực tế), nguyên liệu đã dùng, nhập hàng, tồn kho, nhận xét tự động. In / lưu PDF.
- **Nhập CSV WingArc**: chọn nhiều file một lúc, app tự nhận loại (doanh thu + khách theo ngày, theo giờ, kênh bán, số bán từng món).
- **🤖 Bot WingArc trên Mac** (Documents/SUBWAY-WingArc): học đường bấm một lần → mỗi lần chạy tự đăng nhập (tài khoản trong Keychain), tải CSV, gửi vào app bằng khoá bot (chỉ ghi được doanh thu). Hẹn giờ 7:30 mỗi sáng (tuỳ chọn).
- Máy chủ: `ofcLive`, `tenchouSession`, `officeGrant`, `officeGameScore`, `luckyDraw`, `waImport`, `waBotKey`, `waBotStatus`, `waBotImport`, `ownerReport`; `posImport` tách `posMerge_`; phiên Tenchou bị chặn danh sách hàm nhạy cảm (TENCHOU_DENY_).
- Kiểm thử: `tests/v56srv.js` (39/39), `tests/v56ui.js` (23/23 — hai máy cùng mở), `tests/v56rep.js` (10/10), bot WingArc thử với trang giả lập (học + chạy lại + gửi).

## v2026.11.05.2 — 🏪 "Văn phòng" đổi thành "Quán" · ai mở app cũng ghé quán · biển hiệu · hiệu ứng theo cấp
- **Sửa lỗi**: tháng đã chốt thì bấm tab bị hiện thẻ "Lịch tháng … đã chốt" thay vì quán 3D — nay luôn vào được.
- **Đổi tên** tab Văn phòng → **Quán** (vi) / Store (en) / お店 (ja), biểu tượng mặt tiền quán có mái hiên.
- **Ai đang mở app cũng ghé quán**: nhân viên ngoài ca mà đang mở app (bất kỳ tab nào) hiện thành khách ghé — đứng trước quầy / ngồi bàn khách, thẻ tên có chấm xanh; càng nhiều người mở cùng lúc càng đông. App gửi nhịp "đang mở" mỗi phút (máy chủ chỉ nhớ tạm 5 phút, không ghi bảng tính). Danh sách "Hôm nay ở quán" + bảng tóm tắt có "n người đang ghé".
- **Biển hiệu quán** treo trên quầy + huy hiệu nhỏ ở mặt quầy: biểu tượng TỰ VẼ (bánh mì kẹp trong vòng tròn xanh–vàng, không chép logo thương hiệu) + tên quán lấy từ Cài đặt.
- **Hiệu ứng theo cấp** (tự bật theo cấp, chọn lại / tắt ở ✨ Hiệu ứng trong trình tạo nhân vật): Lv3 ✨ lấp lánh · Lv5 ⭐ vòng sao bay quanh · Lv7 👑 hào quang vàng (vầng sáng dưới chân, cột sáng, viền vàng) · Lv9 🌈 cầu vồng (sao + vầng sáng đổi màu). Thẻ tên cũng sang hơn theo cấp (viền bạc / vàng / cầu vồng chạy).
- Máy chủ: thêm `officeHere`, trường `ef` (hiệu ứng) trong nhân vật, `on` (ai đang mở app) trong `officeState`.

## v2026.11.05.1 — 🏢 Văn phòng ảo 3D (Code.gs + Index.html)
- **Tab mới "Văn phòng"** (nhân viên + quản lý): quán dựng 3D kiểu hoạt hình, tự vẽ bằng WebGL ngay trong app (không tải thư viện ngoài, mở được cả khi mạng yếu). Quán Otagawa dựng đúng theo "Sơ đồ giao hàng 納品場所マップ" (quầy, 作業台, tủ A–F, phòng 部屋, 納品口); quán khác dùng mẫu chung — quản lý đổi ở 📋 Bảng tin › Bố cục phòng.
- **Ai đang trong ca**: theo điểm danh QR (nếu bật) hoặc theo lịch — đang làm thì đứng ở quầy / 作業台, giờ nghỉ thì ngồi phòng nghỉ, sắp vào ca (≤ 60 phút) đứng chờ ở cửa, hết ca thì đi ra cửa. Người quán khác tới chi viện hiện kèm ✈. Nhân vật tự đi vòng quầy / tủ (tìm đường), liếc nhìn người xem, chớp mắt.
- **Nhân vật chibi tự tạo**: chiều cao, vóc dáng, màu da, khuôn mặt, 8 kiểu mắt + màu mắt, lông mày, miệng, má hồng / tàn nhang, 12 kiểu tóc + 12 màu, 6 kiểu áo + màu áo / quần, 12 phụ kiện, thú cưng (mèo / cún / gà con) đi theo. Vào ca tự mặc đồng phục (tắt được). Ai chưa tạo vẫn có nhân vật riêng tự sinh từ mã.
- **Trò chuyện**: nhắn ≤ 60 ký tự hoặc thả biểu cảm → hiện thành bong bóng trên đầu nhân vật; chạm nhân vật → 👋 vẫy tay / 💌 cảm ơn; 💬 xem tin 2 ngày gần nhất.
- **Thành tích**: điểm TỰ TÍNH từ dữ liệu sẵn có (đi làm ×10, đúng giờ ×5, checklist ×2, được cảm ơn ×8, gửi cảm ơn ×3, tin nhắn ×1, chi viện ×15) → cấp Lv 1–10, 7 huy hiệu tháng, mở khoá phụ kiện / kiểu tóc / thú cưng theo cấp (máy chủ kiểm lại, không tự cộng được).
- **📋 Bảng tin**: đang ở quán, sắp vào ca, đi / tới chi viện, dặn dò hôm nay, 🎂 sinh nhật (chỉ tên, không lộ tuổi); quản lý thấy thêm "tới giờ mà chưa bấm thẻ".
- Máy chủ: `officeState`, `saveAvatar`, `officeSay`, `officeConfig` (khoá dữ liệu ofav / ofchat / ofxp / ofcfg).
- Kiểm thử: `tests/v55srv.js` (34/34), `tests/v55ui.js` (26/26), bộ kiểm tỉ lệ thêm màn "office".

## v2026.11.04.1 — chi viện trên bản in · người chi viện kèm giờ đăng ký · phương án mở cửa (Code.gs + Index.html)
- **Bản in nửa tháng**: người đi chi viện quán khác KHÔNG còn nằm trong bảng ngày của quán nhà (họ có trong bản in của quán được giúp, ghi "H"); dòng tổng của quán được giúp thêm "ヘルプ x giờ". Bảng tổng cuối bản in của quán nhà giữ nguyên: giờ công tháng vẫn ở quán nhà, phần chi viện nằm ở cột ✈ヘルプ.
- **Thẻ ✈ Chi viện**: người quán khác đi được hiện như nhân viên bình thường — tên + giờ đã đăng ký (vd. タン 11:00–17:00) + mã quán nhỏ ✈ OTA.
- **Phương án mở cửa** (Cài đặt › Cửa hàng, dưới bảng định mức): theo thứ / ngày lễ, "từ 8:00 cần 1 người" HOẶC "từ 9:00 cần 2 người". Máy xếp nháp / ⚡ Xếp nhanh chọn cách đủ người mà ít giờ công nhất theo người đã đăng ký; biểu đồ thiếu người và bản in "募集" tính theo cách lịch đang dùng.
- Máy chủ 2026.11.04.1 (lưu phương án mở cửa) — cần đưa Code.gs lên cùng Index.html.
- Kiểm tra: v54ui (6), v54oa (6) mới; bộ kiểm tỉ lệ 40 màn: 0 lỗi; các bộ cũ đạt.

## v2026.10.31.2 — bộ kiểm tỉ lệ giao diện · tab Ngày/Tháng điện thoại gọn theo hình vẽ (Index.html + công cụ kiểm)
- **Bộ kiểm tỉ lệ giao diện** (`test/ui-audit.js`): mở app ở 4 mẫu (Hiện đại · Liquid Glass · Xanh dương · Tối giản) × điện thoại 402px + máy tính 1280px × 5 màn (đăng nhập · Ngày · Tháng · Cài đặt · nhân viên) và đo: chữ tràn / bị cắt khỏi thẻ, trang tràn ngang, nút cùng loại cạnh nhau khác cỡ hoặc lệch hàng, nút đè nhau, nút quá nhỏ để bấm, khoảng cách giữa các khối lệch nhịp, tương phản chữ/nền (tính cả nền trong mờ Liquid Glass). Ra report.html có ảnh khoanh đỏ từng chỗ. `FULL=1` thêm chế độ tối + iPhone 375px. Thử trên bản 10.31.1: bắt đúng lỗi "16〜31E" tràn khỏi thẻ.
- **Tự chạy trên GitHub** mỗi lần Index.html đổi (Actions → "Kiểm tỉ lệ giao diện", file báo cáo "bao-cao-ti-le"); không chặn việc đưa app lên.
- **Tab Ngày (điện thoại)**: thẻ kỳ + dải "đã công bố (khoá)" gộp thành một nút 🔒 / ✎ trên thanh tháng — bấm ra bảng có Sửa ngày này · Mở khoá kỳ / tháng · Công bố; chip 📱 link lên thanh tháng; bỏ chip 🔔 trùng với chuông trên cùng.
- **Tab Tháng (điện thoại)**: bỏ hàng riêng — 🖨 1〜15 · 16〜31 nằm bên phải hàng [Cả tháng | 1〜15 | 16〜31]; 👀 n · ↶ · ⋯ nằm bên phải hàng [Xin · Xếp · Quán khác]. Nút 👀 to hơn, bấm ra danh sách người chưa xem thay đổi (máy tính cũng bấm được).
- Sửa theo bộ kiểm: chữ "Có thể trao đổi" đậm hơn, nút ngôn ngữ / chế độ / Hôm nay / mở khoá cao ≥ 28px trên điện thoại.

## v2026.10.31.1 — điện thoại gọn hơn · thẻ ứng viên thẳng hàng (chỉ Index.html)
- **Tab Tháng trên điện thoại**: Kỳ 1 · Kỳ 2 thành hai thẻ nhỏ cạnh nhau; nút in 1〜15 · 16〜31 chung một hàng với ↶ hoàn tác · ⋯ (người chưa xem thay đổi thành chip 👀 n); nhóm app Xếp ca · Nhân công · Doanh thu thành 3 nút nhỏ ở thanh tháng (cạnh "Hôm nay") — bấm là bảng trượt từ dưới lên, khối app lớn phía dưới ẩn. Máy tính giữ bố cục cũ.
- **Tên quán trên iPhone (Safari)** không còn nằm trong vùng mờ dưới thanh trạng thái; tên dài tối đa 2 dòng, chữ nhỏ lại.
- **Thêm vào ca hôm nay**: các hàng cách đều 8px, thẻ nhãn cùng bề rộng (thẳng cột); người "Có thể trao đổi" nằm hàng cam (trước bị lẫn vào "Không thể đi làm" nếu đã khai nghỉ), có ghi chú ngắn; bỏ chip trùng phía trên.
- Kiểm tra: v531ui (8) mới, v53ui thêm 3; các bộ cũ đạt.

## v2026.10.29.5 — chi viện tải nhanh · Dự toán giờ có vòng % màu · thẻ ứng viên · checklist tự lưu · Xếp nhanh thông minh hơn (Code.gs + Index.html)
- **Chi viện tải nhanh**: máy chủ nhớ tạm danh bạ mạng + lịch tháng của từng quán khác (2,5 phút) và DÙNG CHUNG cho xem lịch quán khác / ai tới giúp mình / nhân viên xem "làm cùng" ở quán kia — trước đây mỗi lệnh mở lại bảng tính từng quán (mỗi lần 1–3 giây). Có cử / mượn / huỷ là bỏ bản nhớ tạm ngay. Trên máy: bản lần trước (≤ 3 ngày) hiện NGAY, máy chủ trả lời thì cập nhật. Đăng xuất là xoá.
- **Dự toán giờ (tab Tháng)**: vòng % nằm ngay ngoài thẻ — xanh < 80% · **vàng ≥ 80%** · **đỏ > 95%**; thanh ở tab Ngày cùng màu. Trong Chi tiết bỏ vòng % và thanh "Đã xếp" trùng lặp. Màn 1180–1499px: thẻ Dự toán và nhóm app Xếp ca / Nhân công / Doanh thu nằm sát nhau (trước bị cách rất xa).
- **Thêm vào ca hôm nay**: nhãn nhóm thành thẻ đặc màu cùng cỡ — Đã đăng ký (xanh lá) · Xếp linh động (xanh dương) · **✈ Chi viện (tím)**: có người quán khác đi được thì hiện từng người, không có thì "Không có người chi viện được"; bấm thẻ → Mượn người · Cử người đi · Người đi được.
- **Checklist theo giờ — sửa mẫu tự lưu**: xuống dòng tạo việc / rời ô / ngừng gõ 1,2 giây là lưu; bấm ra ngoài hay đóng hộp vẫn lưu nốt chữ đang viết dở.
- **⚡ Xếp nhanh**: (1) người chỉ đăng ký khung ngắn hơn ca tối thiểu (vd. 17–20) được dùng để vá chỗ thiếu (≥ 2 tiếng); (2) sau khi đủ ca, giờ nghỉ được chọn lại để khỏi tạo lỗ thiếu người, rồi vá lần cuối; (3) xếp một ngày mà vẫn thiếu → được xếp người ĐÃ ĐĂNG KÝ dù làm nhiều ngày liền / chưa có ngày nghỉ trong tuần, kèm hộp ⚠️ báo tên. Ca thử: 8 nửa tiếng thiếu → 1 (nửa tiếng còn lại do luật giờ nghỉ, không ai thay được).
- Kiểm tra: v53ui (15), v53srv (8) mới; sửa v37ui, v50ui theo thẻ Chi viện; toàn bộ bộ cũ đạt.

## v2026.10.29.4 — chủ đề Liquid Glass · Cài đặt dạng danh sách · mở app nhanh hơn · đầu tab Ngày gọn (Code.gs + Index.html)
- **Chủ đề Liquid Glass** (🎨 Giao diện & màu → "Liquid Glass"; quản lý đặt được làm mặc định của quán): nền màu loang, thẻ trong mờ có viền sáng và vệt bóng, bo góc lớn, nút dạng viên thuốc, nhóm chọn có viên kính trắng trượt, thanh tab dưới đáy là viên kính nổi, hộp thoại làm mờ nền phía sau. Có bản tối (kính khói). Chỉ lớp nổi (thanh tab, hộp thoại, menu, thẻ dính) mới làm mờ thật nên cuộn vẫn mượt trên điện thoại; máy bật "giảm trong suốt" thì thẻ đặc lại. Máy chủ nhận `skin: 'glass'`.
- **⚙ Cài đặt kiểu iPhone**: 4 ô biểu tượng → danh sách 4 hàng (biểu tượng · tên · mô tả ngắn các mục bên trong · ›).
- **Mở app nhanh hơn (bản GitHub)**: gửi `bootstrap` ngay khi trang bắt đầu tải (không đợi 2 MB mã chạy xong), app dùng lại đúng kết quả đó; bắt tay sẵn với máy chủ Google (`preconnect`); `getPresets` không gọi trùng. Đo trên điện thoại giả lập (CPU chậm 4×, 4G, máy chủ trả lời 1,2 giây): lần đầu mở 2,77 → 1,69 giây; nhân viên đã ghi nhớ 2,57 → 1,72 giây; mở lại có bản lưu vẫn hiện ngay 0,6 giây, số liệu mới 1,83 → 1,54 giây. Chạy lại: `node tools/build.mjs && node test/perf.js`.
- **Đầu tab Ngày trên điện thoại gọn hơn ~70px**: ô dặn dò + nút nhắc nhở (🔔+) chung một hàng, chỗ gợi ý ngắn lại; dải chip cảnh báo một hàng vuốt ngang.
- **Cảm giác chạm**: rung nhẹ khi đổi tab / tick (Android; iPhone iOS 18+ qua công tắc hệ thống). Tắt riêng máy: `localStorage sbw.haptic = off`.
- Kiểm tra: test/v52.js (18) mới; toàn bộ bộ cũ + e2e GitHub đạt.

## v2026.10.29.3 — tự đánh giá kiểu "khách khó tính" và đánh bóng giao diện (chỉ Index.html)

- **Màn đăng nhập:**
  - Có phần chào: ô chữ cái của quán, tên quán to, một câu dẫn.
  - Tên nhân viên thành lưới nút lớn, dễ chạm.
  - Bỏ tên quán lặp ở góc trên.
- **Thanh trên cùng:**
  - Đã đăng nhập thì chỉ còn tên quán + vai trò (bỏ dòng "Xếp ca làm · lịch phân ca theo giờ").
  - Thứ tự ngôn ngữ thống nhất **日 · VI · EN** ở mọi màn.
- **Chip cảnh báo tab Ngày** (発注 · việc cần xử lý · link mới):
  - Cùng một kiểu: cùng chiều cao, bo tròn.
  - Trên điện thoại dùng chữ ngắn, vd. "発注 11:00 · quá giờ", "2 việc", "Link 0/4 · 🔔 0/4".
  - 発注 quá giờ màu vàng thay vì đỏ; đỏ chỉ dành cho việc gấp.
- **Thẻ 発注 của nhân viên điềm tĩnh hơn:** nền trắng, vạch màu bên trái, bỏ nhấp nháy. Tiêu đề không còn gãy dòng; nút xuống hàng đủ rộng trên điện thoại.
- **Checklist theo giờ:** dòng chia 3 hàng (tên + số + công tắc · thanh tiến độ · khung đang tới giờ + Mở / In), hết bị cắt chữ "Checklist th…".
- **Tab Tháng màn 1180–1499px:** lịch tháng được ưu tiên rộng (thấy 18 ngày thay vì 12). Dự toán + app dồn về cột phải; từ 1500px mới chia 3 cột.
- **Chi tiết nhỏ:**
  - Ô dặn dò bỏ emoji 📌 trong chữ gợi ý.
  - Nút "+ Nhắc nhở" (lặp chữ) thành "+ Thêm".
  - "In tài liệu" ở Cài đặt nhân viên không còn hai icon máy in.
  - Thẻ gợi ý "Ngày 29" ở máy tính gọn, viền đứt.
- Kiểm thử: mọi bộ đạt (v50ui 27/27 · v50srv · v49 · v48 · v47 · v463 · v45 · v41–v31; GitHub e2e 20/20 · v46 49/49). Đã xem lại cả giao diện tối.

## v2026.10.29.2 — sửa gấp: chi viện thành mục phụ · công tắc checklist theo giờ · chip theo dõi link mới · đồng bộ icon (Code.gs + Index.html)

- **Chi viện là mục phụ** trong khung **"Thêm vào ca hôm nay"** (bỏ khối lớn):
  - Nhóm mới **Có thể chi viện** đứng cùng *Đã đăng ký giờ · Xếp linh động · Không thể đi làm*. Nhóm này gồm người của quán khác đã được đánh dấu "đi chi viện được".
  - Bấm người **rảnh** → chọn giờ → ca ✈ vào lịch hai quán.
  - Bấm người **đã có lịch nháp ở quán chính** (chip viền đứt, ghi "nháp") → báo *tạm thời không mượn được*, kèm 2 nút: **Yêu cầu chi viện** (mở Mượn người, hỏi có cắt ca nháp ở quán chính không, quán chính nhận thông báo) và **Huỷ thêm ca**.
  - Cuối khung có một dòng nhỏ: ✈ Chi viện · Mượn người · Cử người đi · Người đi được (n), kèm danh sách gọn ai đang tới giúp / đang được cử đi.
- **⏰ Checklist theo giờ có công tắc bật / tắt** (ngay trên dòng checklist ở thẻ Việc hôm nay). Tắt: nhân viên không thấy, máy chủ không nhận tick, quản lý chỉ còn dòng "Đang tắt". Mặc định bật.
- **📱 Chip "Link mới x/n · Thông báo y/n"** ở tab Ngày, cạnh 発注 và việc cần xử lý. Bấm vào xem từng người. **Mọi người đã chuyển sang link mới thì chip và tab "Link & thông báo" tự ẩn.**
- **Đồng bộ icon:** thêm icon nét cho ⬅ ➡ ⬇ 📤 💳 🪪 🌡 🖌 📺 ⛔ ✉ 📮 📭 🔁 📞 ☎ ➕ 🛏 📁 📉 🖼 🔌 ⏳ ⛶… (trước còn hiện emoji màu, vd. nút Mượn người / Cử người đi).
- Kiểm thử: `tests/v50ui.js` 26/26, `tests/v50srv.js` 7/7; các bộ cũ vẫn đạt.

## v2026.10.29.1 — sắp xếp lại giao diện quản lý + chi viện "nhặt về" (Code.gs + Index.html)

- **Thanh trên cùng:**
  - Chỉ còn 2 tab **Ngày · Tháng**. **Cài đặt** nằm trong **⋯ Thêm** (mở ra có nút ‹ Quay lại).
  - Nút ngôn ngữ **日 / VI / EN** đặt ngay cạnh Quản lý / Nhân viên.
- **Tab Tháng:**
  - Màn rộng chia 3 cột: **Dự toán giờ tháng** bên trái · lịch tháng ở giữa · các app **Xếp ca / Nhân công / Doanh thu** xếp dọc bên phải.
  - **⋯ Thêm** đứng chỗ nút "Lịch sử công bố" cũ, gộp *Lịch sử công bố* + *Xuất giờ công ra bảng tính*.
  - Bỏ "Sao chép lịch tháng trước" (đã có xếp nháp thông minh).
  - "Hoàn tác lần ghi đè gần nhất" thành nút nhỏ **↶** ngay cạnh ⋯ Thêm, chỉ hiện khi có bản để hoàn tác.
  - Sửa lỗi thanh "Xếp lịch nháp" bị cắt mất nút ⚡16〜31.
- **Tab Ngày:**
  - **Xếp nhanh · Xoá ca** chuyển lên góc phải khung giờ, ngay trên 12h · SA · Chính thức.
  - Thẻ kỳ chỉ còn một dòng (kỳ của ngày đang xem). 発注 và "việc cần xử lý" chung một hàng.
  - Ô Đóng cửa / 予算 / Dự toán ngày nằm cột trái; bỏ dòng thống kê bị lặp ở cột phải.
  - Checklist theo giờ thu thành một dòng (tiến độ, khung đang tới giờ, số khung trễ màu vàng) + nút Mở / In. Chi tiết và Sửa mẫu nằm trong hộp.
- **✈️ Chi viện** (khối dưới các thanh ca của nhân viên):
  - **Xin chi viện · Mượn người · Cử người đi** gom một chỗ, kèm danh sách ai đang tới giúp / ai đang được cử đi hôm nay.
  - Tab **Người rảnh quán khác**: người mà quán kia đánh dấu "đi chi viện được" và hôm đó chưa có ca ở quán nhà → bấm **Nhặt về**, chọn giờ.
  - Tab **Người đi được của quán mình**: quản lý chọn ai đi chi viện được (**Chọn người đi chi viện được**) và xem trạng thái: rảnh — quán khác đang thấy · có ca ở quán · đã được quán X nhặt.
  - **Chống tranh giành:** quán nhà ghi ca ✈ trong khoá của nó. Ai bấm trước được trước; quán bấm sau nhận "đã có ca", không ghi đè, không xếp hàng chờ. Quán nhà không phản hồi thì báo thử lại.
- Kiểm thử:
  - `tests/v50srv.js` 7/7 (3 quán tranh một người), `tests/v50ui.js` 19/19.
  - Các bộ cũ vẫn đạt (đã sửa v37ui, v45ui, v48ui theo bố cục mới).

## v2026.10.28.4 — gọn giao diện + tự cập nhật Apps Script (Code.gs + Index.html)

- **Tab Hôm nay của nhân viên gọn lại:** "Link mới", "Checklist theo giờ", "Checklist đào tạo" trước là 3 thẻ riêng, nay thành các dòng trong khung **Thông báo**. Mỗi dòng có thanh tiến độ và nút Mở ›. Checklist theo giờ báo luôn số khung bị trễ.
- Biểu tượng đồng bộ với bộ icon của app (📱 điện thoại, kho lưu, bảng việc). Bỏ icon lẻ trong tên tab Nhân viên và trong nhãn thông báo của bảng theo dõi link.
- **Tự cập nhật Apps Script cho hai quán** (Code.gs có thêm `deployInfo`): bấm đúp `Cai-tu-cap-nhat.command` một lần. Bước tự cập nhật trên GitHub tự tìm đúng file máy chủ (Code / コード / Mã…) và nhắc khi gần chạm giới hạn 200 phiên bản.
- Kiểm thử: mọi bộ đạt (v49, v48, v47, v463, v45, v41–v31); GitHub e2e + v46.

### ⭐ Cải tiến quan trọng cần làm (phần nâng cao — làm khi có thời gian)
1. Máy Mac tự tải dữ liệu WingArc (POS) + hoá đơn Ozax + dữ liệu app → báo cáo hằng ngày + tổng kết tuần (dashboard + thông báo).
2. Tự tổng hợp tin SUBWAY hằng tuần từ Email và LINE / LINE WORKS (cần kết nối Gmail hoặc Outlook).
3. Báo cáo tháng: giờ công, chi phí lương so với doanh thu (PDF).
4. Checklist theo giờ: nhắc người đang ca khi tới khung giờ, báo quản lý khi trễ, nhập nhiệt độ °C (hồ sơ HACCP).
5. Nhắc khoá sổ chấm công ngày 1–3 hằng tháng.
6. Sao lưu Google Sheet hằng tuần vào Drive.
7. Đo tốc độ mở app trên điện thoại thật; tách tải phần nặng.
8. Đóng link cũ khi bảng theo dõi cho thấy mọi người đã chuyển.
9. Đào tạo: ảnh / video hướng dẫn cho từng mục.
10. Công thức đặt hàng từ CSV WingArc.
11. Xếp lịch nháp thông minh từ ảnh lịch cũ.
12. Tự kiểm thử trên GitHub mỗi lần đẩy.
13. Chọn máy đọc thẻ khi dùng 2 máy cùng lúc.

## v2026.10.28.3 — theo dõi link mới / thông báo · công cụ bấm đúp để đẩy lên GitHub (Code.gs + Index.html)

- **📲 Link & thông báo** (Tháng › Nhân viên):
  - 4 ô tổng: dùng link mới, còn link cũ, chưa mở app, đã bật thông báo.
  - Danh sách từng người: link đang dùng + lần mở gần nhất; thông báo bật trên mấy máy, có tắt "nhắc ca ngày mai" không. Người còn link cũ xếp lên đầu.
  - Nút **Chép tin nhắn nhắc (LINE)**: tin song ngữ Nhật–Việt, gồm link mới, cách thêm vào màn hình chính, bật thông báo, và tên những người chưa xong.
  - Đếm từ lúc cập nhật bản này. Ai chưa mở app từ lúc đó hiện "Chưa mở".
- **Nhân viên còn mở bằng link cũ** thấy thẻ "App lịch làm đã có link mới" ở tab Hôm nay.
  - Bấm → mở app mới và vào thẳng tài khoản, không cần nhập lại mã.
  - Kèm 3 bước: thêm vào màn hình chính, bật thông báo.
- **Đẩy lên GitHub bằng một lần bấm đúp:** thư mục `Documents/SUBWAY-day-len` trên máy Mac.
  - Claude chép file mới vào `thay-doi/`. Anh bấm đúp `Day-len-GitHub.command` để đẩy lên.
  - Lần đầu dán token, có thể lưu vào Keychain của máy để lần sau khỏi dán.
  - Chỉ thay đúng các file trong `thay-doi/`. config.js và các file khác trên GitHub giữ nguyên.
- Kiểm thử:
  - `tests/v49.js` 15/15.
  - Mọi bộ cũ vẫn đạt (v48, v47, v463, v45, v41–v31).
  - GitHub: e2e 20/20, v46 49/49.

## v2026.10.28.2 — checklist theo khung giờ · việc tuần / tháng trên bản in · chia trang A4 (Code.gs + Index.html)

- **⏰ Checklist theo giờ của quán** (nằm trong thẻ 📋 Việc hôm nay ở tab Ngày):
  - Mẫu soạn sẵn theo SUBWAY: 5 khung, 28 việc, đủ 3 thứ tiếng — 07:30 trước mở cửa, 11:00 trước cao điểm trưa, 14:00 sau trưa, 17:00 trước cao điểm tối, 20:00 đóng cửa.
  - Mỗi quán **sửa mẫu riêng**: giờ, tên khung, thêm / bớt việc, thêm / xoá khung (nút ✎ Sửa mẫu, hoặc ở Cài đặt › Việc lặp lại). Việc cũ giữ nguyên lịch sử tick.
  - Khung tô màu: xanh dương = đang tới giờ, đỏ = đã qua giờ mà chưa xong, xanh lá = xong.
  - **Nhân viên** có ca hôm nay thấy thẻ ⏰ ở tab Hôm nay → tick việc đã làm. App ghi giờ + tên. Chỉ bỏ được tick của mình. Hôm qua vẫn tick được (đóng cửa qua nửa đêm).
  - **Quản lý** tick hộ (ghi tên người kiểm tra), bỏ tick, xem mọi ngày.
  - **In / PDF** cả ngày: việc · ✓ · giờ · người làm, ô 店長確認. Có **in mẫu trống** để dán tick tay.
- **Việc tuần / tháng có tên người làm:**
  - Việc lặp lại có thêm **Người phụ trách cố định**. Người đó tick xong được việc của mình.
  - **Khung xem trước bản in lịch nửa tháng:**
    - Có mục "Việc tuần / tháng" với nút **＋ Thêm việc tuần / tháng**, danh sách việc kèm ✎ để sửa hoặc gắn tên.
    - Tick "In dưới từng ngày" → mỗi ngày có dòng **作業 Lau tủ đông（ラム）**.
  - **🗒 In bảng việc tuần / tháng** (A4 riêng): mỗi việc + các ngày cần làm + người làm + ô □ tick, ô xác nhận.
- **Chia trang A4 tự động** cho bảng dài (checklist đào tạo, checklist theo giờ, bảng việc). Tờ sau lặp lại tiêu đề bảng, tên nhóm không bị lẻ cuối trang, có số trang. Sửa lỗi bản in đào tạo 39 mục ở bản trước bị cắt mất phần cuối trang 1.
- Xem trước bản in lịch luôn vẽ lại khi lịch / việc thay đổi.
- Kiểm thử:
  - `tests/v48srv.js` 20/20 và `tests/v48ui.js` 24/24.
  - Các bộ cũ vẫn đạt: v47srv, v47ui, v463, v45, v41–v31.
  - GitHub: e2e 20/20, v46 49/49.

## v2026.10.28.1 — khoá sổ chấm công lưu 7 năm · checklist đào tạo nhân viên mới (Code.gs + Index.html)

- **Khoá sổ chấm công cuối tháng** (Tháng › ⏱ Chấm công, xem tháng đã qua):
  - Thanh "Tháng X đã kết thúc — chưa khoá sổ". Sửa giờ còn thiếu xong thì bấm **🔒 Khoá sổ & lưu 7 năm**.
  - App tạo **PDF** (mẫu 出勤簿 để in khi 労基署 kiểm tra) và **CSV** (mở bằng Excel). Hai file cất vào Google Drive, thư mục `SUBWAY 勤怠記録（7年保存）/ quán / năm`.
  - Mỗi file có mã SHA-256. Khi tải lại, app kiểm tra file còn nguyên vẹn hay đã bị sửa trong Drive.
  - Đã khoá thì không sửa giờ được. Muốn sửa: **🔓 Mở khoá** (bắt buộc ghi lý do) → sửa → khoá lại thành **bản 2**. Bản 1 vẫn giữ.
  - **🗄 Kho lưu chấm công** liệt kê mọi tháng và mọi bản, có nút tải PDF / CSV và hạn lưu.
  - **Lịch sử sửa:** ai, ngày nào, giờ cũ → giờ mới, lý do. Lịch sử này cũng được in vào trang cuối của PDF.
  - Điểm danh rơi vào tháng đã khoá vẫn được nhận, nhưng có ghi vào lịch sử.
- **📋 Đào tạo nhân viên mới** (Tháng › Nhân viên › 📋 Đào tạo):
  - Mẫu soạn sẵn theo quy trình SUBWAY: 7 nhóm, 39 việc, đủ 3 thứ tiếng. Nhóm gồm cơ bản & vệ sinh, bánh mì, chuẩn bị nguyên liệu, làm sandwich, thu ngân & tiếp khách, dọn dẹp & đóng cửa, an toàn & khẩn cấp.
  - Quản lý **mở checklist** cho từng người. Nhân viên thấy thẻ ở tab Hôm nay và nhận thông báo đẩy.
  - Nhân viên **tự tick** việc đã làm được. Quản lý / người đào tạo **xác nhận** kèm tên (tên được nhớ trên máy). Có nút "Xác nhận mọi mục NV đã tick".
  - Quản lý **tick hộ** được. Bản in ghi rõ "quản lý tick hộ".
  - Mục đã xác nhận thì nhân viên không bỏ tick được.
  - Nhân viên tick đủ hết thì quản lý nhận thông báo vào xác nhận.
  - **In / PDF** khổ A4: bảng 本人 / 確認 có ngày và người xác nhận, ô ký tên nhân viên và quản lý. Có thêm **in mẫu trống** để điền tay.
  - **Sửa mẫu:** thêm / bớt nhóm, mỗi dòng một việc. Mục cũ giữ nguyên tiến độ.
  - Đóng checklist thì ẩn với nhân viên, tiến độ vẫn giữ.
- **Cập nhật Code.gs lần này cần cấp quyền Google Drive một lần:** trong trình soạn Apps Script chọn hàm `capQuyenDrive` → ▶ Chạy → Cho phép, rồi Triển khai › Quản lý › bản mới.
- Kiểm thử:
  - `tests/v47srv.js` 41/41 và `tests/v47ui.js` 34/34.
  - Các bộ cũ vẫn đạt: v463, v45push, v45ui, v41fix, v42staff, v43lazy, v37sup, v32batch, v41ui, v40ui, v39ime, v37ui, v36ui, v32ui, v31staffday.
  - GitHub: e2e 20/20, v46 49/49.

## v2026.10.26.4 — thanh tab nhân viên hết nhảy · chạm ngày xem thanh giờ cả nhóm (chỉ Index.html)

- **Thanh tab dưới đáy (今日 / シフト / 希望 / 設定) hết nhảy:**
  - Hiệu ứng chuyển tab từng dịch cả khung trang (transform), làm thanh `position:fixed` bám theo khung trang thay vì màn hình. Kết quả là thanh nhảy lên giữa màn hình (đo được lệch tới ~700px) rồi mới về chỗ.
  - Hiệu ứng giờ chỉ mờ dần. Bỏ luôn khe 10px dưới thanh của nhân viên.
- **"Lịch của tôi" — chạm một ngày (dạng Tháng hoặc Tuần):** bảng trượt lên ngay, gồm:
  - Ca của mình.
  - Việc được giao.
  - Thanh giờ của mọi người làm hôm đó (mình tô nổi, có trục giờ).
  - ‹ › đổi ngày; ✕ / Esc / nút Quay lại để đóng.
  - Ngày đã chốt có nút "Đổi ca / báo lịch sai ›" dẫn xuống khung ngày bên dưới.
- Kiểm thử: `tests/v463.js` (7/7; đo vị trí thanh tab 56 lần trong lúc chuyển tab + cuộn — bản cũ lệch tới −690px, bản mới 0); các bộ cũ + GitHub (e2e 20/20, v46 49/49) vẫn đạt.

## v2026.10.26.3 — trả lại trang máy quét QR cũ · máy đọc thẻ trên Windows (chỉ Index.html)

- **Điểm danh QR:** bản GitHub mở lại đúng trang máy quét riêng như trước (tự nhận ra nhân viên, tự đề xuất đúng 出勤 / 休憩 / 退勤). Bỏ cách "chọn thao tác rồi mới quét" của v46.
- **Máy Windows:** không hiện nút "Kết nối máy đọc thẻ USB" nữa.
  - Driver của Sony luôn giữ PaSoRi nên trình duyệt không mở được, tắt King of Time cũng vậy.
  - Máy Windows vẫn đọc thẻ bằng công cụ đọc thẻ (cửa sổ đen gõ số thẻ vào app) như trước.
  - Nút USB chỉ còn trên Mac / Chromebook / Android.
- **Công cụ đọc thẻ Windows:** lần đầu chạy sẽ hỏi "tự mở khi bật máy?" (10 giây không bấm = Có) → tự chép vào thư mục Startup của Windows. Bản đã cài được cập nhật mỗi lần chạy file mới tải về.
- Kiểm thử: `subway-shift/test/v46.js` (49/49), e2e (20/20); các bộ cũ vẫn đạt.

## v2026.10.26.2 — sửa: đã cho phép thông báo nhưng không hiện

- **Nguyên nhân hay gặp nhất:** bật thông báo khi GitHub còn `sw.js` cũ (chưa có phần nhận thông báo). Đăng ký thông báo của quán không bao giờ "mở trang" nên điện thoại không tự lấy `sw.js` mới → nhận được mà không hiện gì. Giờ mỗi lần mở app đều hỏi bản mới.
- **Code.gs:**
  - Nội dung thông báo gửi dạng Blob (byte thô).
  - Địa chỉ `sub` của VAPID luôn hợp lệ (trang GitHub, không có thì link /exec) — Apple bắt buộc.
  - Lưu kết quả lần gửi gần nhất của từng máy (mã + lý do của Apple / Google).
- **Hộp 🔔:**
  - "Gửi thử" hiện kết quả từng máy (vd. "Apple: đã nhận (201)" hoặc "từ chối (403) — BadJwtToken").
  - Mục "🩺 Kiểm tra vì sao không nhận được": quyền, mở bằng màn hình chính hay trình duyệt, bộ nhận thông báo, đăng ký trên máy, máy chủ có máy này không, lần gửi gần nhất.
  - Nút "Hiện thử 1 thông báo trên máy này" (không qua máy chủ) để tách lỗi do máy với lỗi do app.
- `web/sw.js`: bỏ một tuỳ chọn rỗng khi hiện thông báo.
- Kiểm thử: `tests/v45ui.js` (30/30), `v45push` (43/43), `subway-shift` e2e (20/20) + v46 (45/45); các bộ cũ vẫn đạt.

## v2026.10.26.1 — tận dụng bản GitHub: in nhanh, nút Quay lại, chia sẻ LINE, mất mạng vẫn xem, máy điểm danh, PaSoRi, camera

- **In nhanh hơn:**
  - Đổi tuỳ chọn trong khung xem trước: ~1,6 giây → ~0,6 giây. Chỉ thay phần tờ in, không dựng lại cả trang.
  - Bấm In → hộp in hiện ra: ~0,6 giây → dưới 0,05 giây. In qua khung riêng chỉ chứa tờ in, dùng lại tờ đã dựng ở khung xem trước, đóng khung xem trước sau khi in.
  - Bỏ cách thử mọi tổ hợp khi chia ngày thành cột (chậm nhất ở 8 cột). Kết quả chia y hệt cũ, đã so 4.000 trường hợp ngẫu nhiên.
  - (Đo với CPU chậm 4 lần như điện thoại, 20 nhân viên, cả tháng.) iPhone/iPad vẫn in theo cách cũ vì Safari có thể in cả trang cha.
- **Nút Quay lại của điện thoại:** bấm Quay lại (Android) hoặc vuốt lùi sẽ đóng hộp thoại / bảng / camera đang mở, không thoát app. Đóng bằng nút trong app thì không để lại bước thừa.
- **Số trên biểu tượng app:** quản lý thấy số thông báo chưa xem; nhân viên thấy số việc đang chờ mình trả lời (nhờ đổi ca, chi viện…). Có thông báo mới mà chưa mở app thì hiện chấm.
- **Bấm thông báo → mở đúng màn:**
  - Báo nghỉ / đổi ca → hộp 🔔 của quản lý.
  - Lịch công bố / ca bị đổi → "Lịch của tôi" đúng tháng.
  - Nhắc đăng ký → tab Đăng ký tháng sau.
  - Nhắc ca ngày mai / nhờ nhận ca → tab Hôm nay.
  - App đang mở thì chuyển màn luôn.
  - Nhấn giữ biểu tượng app (Android / máy tính): lối tắt Lịch · Đăng ký · Thông báo.
- **Chia sẻ qua LINE:**
  - Khung xem trước bản in có "Chia sẻ: 🖼 Ảnh / 📄 PDF" (mỗi trang một ảnh, hoặc một file PDF), tạo ngay trên máy.
  - Nhân viên có "📤 Chia sẻ lịch của tôi" (ảnh gọn: ngày, giờ, tổng giờ).
  - Máy không có nút Chia sẻ thì tải file về.
- **Mở app tức thì + mất mạng:**
  - Quản lý đã ghi nhớ máy cũng hiện ngay bản lưu lần trước, máy chủ trả lời thì cập nhật (trước đây chỉ nhân viên có).
  - Mất mạng: vẫn mở và xem được lịch tháng này, chuyển tab được, có băng "Đang mất mạng" + Thử lại.
  - Thao tác cần máy chủ thì báo ngay thay vì treo.
  - Có mạng lại là tự cập nhật.
- **Máy điểm danh đặt ở quán:**
  - Màn hình luôn sáng; khoá sáng được lấy lại khi quay lại trang.
  - Nút Toàn màn hình.
  - 3 giờ sáng tự tải lại để nhận bản mới (chỉ khi không ai đang thao tác).
  - Bản GitHub quét mã nhân viên ngay trong app, không mở trang máy quét riêng của Apps Script nữa.
- **💳 Driver PaSoRi trong app (WebUSB):**
  - RC-S380 và RC-S300 đọc thẻ FeliCa (manaca, Suica, thẻ nhân viên…) ngay trong Chrome / Edge, không cần công cụ Windows.
  - Bấm "Kết nối máy đọc thẻ USB" một lần, lần sau tự nối, rút ra cắm lại cũng tự nối.
  - Số thẻ giống hệt công cụ cũ (IDm HEX) nên thẻ đã đăng ký vẫn dùng được. Hộp "Đăng ký thẻ" cũng nhận thẻ từ máy đọc USB.
  - Dùng được trên Mac / Chromebook / máy tính bảng Android (cáp OTG).
  - Windows: driver của Sony giữ máy đọc nên vẫn dùng công cụ Windows cũ (hoặc đổi sang WinUSB bằng Zadig). iPhone/iPad không có WebUSB.
- **Camera quét nhạy hơn:**
  - Nhân viên bấm "Đọc mã của quán" là mở camera trực tiếp trong app (trước đây phải chụp ảnh).
  - Quét theo từng khung hình, nhanh gấp 2–3 lần vòng cũ.
  - Máy có bộ nhận QR sẵn dùng độ phân giải cao hơn; máy không có (iPhone) thì đọc vùng giữa khung xen kẽ cả khung.
  - Lấy nét / phơi sáng liên tục; nút 🔍 2× và 🔦 đèn nếu camera hỗ trợ; rung nhẹ khi đọc được.
- **Code.gs:** link trong thông báo mang theo màn cần mở (`?go=…&ym=…`). Phần còn lại không đổi.
- **Repo GitHub:** cập nhật `web/sw.js` (chấm trên biểu tượng, báo app đang mở chuyển màn), `web/manifest.webmanifest` (lối tắt), `web/index.html` (trang chọn quán giữ tham số khi chuyển).
- Kiểm thử: `subway-shift/test/v46.js` (45/45; máy đọc RC-S380 / RC-S300 giả lập đúng giao thức, camera giả, chia sẻ / huy hiệu / khoá sáng giả lập), `test/e2e.js` (20/20); các bộ cũ vẫn đạt hết.

## v2026.10.25.1 — thông báo đẩy như app + ghi nhớ đăng nhập quản lý

- **🔔 Thông báo trên điện thoại (Web Push, miễn phí, không cần Firebase):** chỉ chạy trên bản GitHub. Android dùng được ngay. iPhone cần iOS 16.4 trở lên và phải mở app từ biểu tượng trên màn hình chính.
  - **Quản lý nhận:** mọi việc đang báo trong 🔔 của app — báo nghỉ đột xuất, không khoẻ, xin đổi ca / đổi giờ, nhờ tìm người, chi viện cần duyệt / đã chốt / bị huỷ, người ứng tuyển, sửa hồ sơ. Việc gấp gửi với độ ưu tiên cao. Vẫn giữ 60 giây "Hoàn tác" như email.
  - **Nhân viên nhận:** lịch tháng vừa công bố (kèm số ngày, tổng giờ, ca đầu), ca đã công bố bị sửa (giờ cũ → mới, gộp sau 30 phút), có người nhờ nhận ca, nhắc ca ngày mai (19–20h tối hôm trước, mỗi người tự bật/tắt), nhắc đăng ký lịch tháng sau.
  - **Nhắc đăng ký:** gửi trước hạn 3 ngày và 1 ngày, chỉ cho người chưa khai ngày nào và không có giờ cố định. Quản lý đặt hạn chót trong Cài đặt (mặc định ngày 20, 0 = tắt).
  - Mỗi máy nhận đúng ngôn ngữ đã chọn lúc bật (Việt / Nhật / Anh). Bấm vào thông báo là mở đúng quán.
  - Lần đầu mở app trên bản GitHub: hỏi một lần "Bật thông báo?". Bật / tắt / gửi thử nằm ở ⚙ Cài đặt › Thông báo (nhân viên) và Cài đặt › Cửa hàng (quản lý). Đăng xuất là máy đó thôi nhận.
  - **Bảo mật:** nội dung mã hoá đầu-cuối (RFC 8291), có chữ ký VAPID. Khoá bí mật nằm trong Script Properties, không nằm trong sheet. Chỉ nhận địa chỉ của dịch vụ push thật (Google, Apple, Mozilla, Microsoft). Máy đã gỡ app tự bị xoá.
- **Ghi nhớ đăng nhập quản lý:** có ô "Ghi nhớ đăng nhập trên máy này" (mặc định chọn). Lần sau mở app vào thẳng chế độ quản lý; phiên 12 giờ hết hạn thì tự gia hạn. Khoá máy hết hạn sau 60 ngày không mở.
  - Đổi mật khẩu → mọi máy khác bị đăng xuất, máy đang dùng vẫn được nhớ.
  - Cài đặt › Bảo mật có nút "Máy quản lý đã ghi nhớ": xem danh sách, đăng xuất mọi máy khác.
- **Repo GitHub:** `web/sw.js` thêm phần nhận và hiện thông báo — phải cập nhật file này lên GitHub.
- Kiểm thử: `tests/v45push.js` (43/43, giải mã thông báo bằng Node crypto, kiểm chữ ký ES256), `tests/v45ui.js` (26/26), `subway-shift/test/e2e.js` (20/20); các bộ cũ vẫn đạt hết.

## v2026.10.24.5 — bánh xe chọn giờ, gộp bảng khai, giờ cố định hiện thành đăng ký (chỉ giao diện)

- **Giờ cố định → đăng ký:** ngày còn trống của nhân viên đã đặt "Giờ cố định" cho thứ đó tự hiện thành đăng ký (viền nét đứt, ghi "giờ cố định") → quản lý thấy giờ, máy xếp nháp xếp theo, không còn lẫn với người chưa đăng ký. Khai riêng ngày nào (kể cả Nghỉ) thì ô đó thắng. Không lưu thêm gì lên máy chủ — đổi giờ cố định là lịch đổi theo ngay.
- **Bỏ khung "Đăng ký của tôi — ngày …" dưới lịch:** mọi thứ gộp vào bảng khai khi chạm ngày — mẫu giờ, **bánh xe cuộn chọn Vào / Ra** (mốc 30 phút, cuối danh sách là L = tới giờ đóng cửa), **＋ Ca 2** (thêm cặp bánh xe cho khung giờ cách xa), **📝 Ghi chú**, **↻ Mọi thứ … sau đó cũng vậy**, Xoá, ca được xếp (ngày đã chốt).
- Ô ngày đang chọn trên lịch đăng ký: chữ số không còn trắng trên nền xanh nhạt (khó đọc).
- **Phiên bản:** giao diện chỉ còn cảnh báo khi Code.gs CŨ HƠN bản tối thiểu nó cần (hiện là 2026.10.24.4) — cập nhật riêng giao diện trên GitHub không bắt dán lại Code.gs.
- Kiểm thử: `tests/v43lazy.js` (15/15), `tests/v41ui.js` (10/10), `subway-shift/test/e2e.js` (20/20); các bộ cũ vẫn đạt hết.

## v2026.10.24.4 — chạy được trên GitHub Pages (máy chủ Apps Script giữ nguyên)

- **Code.gs:** thêm API JSON trong `doPost` (`{ rpc, fn, args }`) để trang GitHub gọi máy chủ — gọi được đúng những hàm mà google.script.run vốn gọi được, quyền hạn y như cũ. Thêm `setFrontUrl` (quản lý mở app từ GitHub là máy chủ nhớ link trang) → link vào nhanh của nhân viên, mã QR điểm danh (?pa=), link tuyển dụng, link trong email, `getAppUrl` đều trỏ về trang GitHub. Link lịch (.ics) và kết nối giữa các quán vẫn dùng link /exec.
- **Index.html:** khối giả lập `google.script.run / url / history` bằng fetch — chỉ bật khi trang được dựng cho GitHub (có `config.js`), trong Apps Script không làm gì. Bộ nhớ máy tách theo quán (hai quán chung một trang). Màn đăng nhập có nút "Đổi quán". Băng nhắc phiên bản trên GitHub nói rõ quán nào chưa dán Code.gs mới.
- **Repo `subway-shift`:** trang chọn quán, `app.html?s=FOR|CTR`, manifest + icon (cài lên màn hình chính), service worker (mạng trước, mất mạng dùng bản đã lưu), GitHub Actions tự dựng + đưa lên Pages; (tuỳ chọn) Actions tự dán Code.gs vào Apps Script cả hai quán bằng clasp.
- Kiểm thử: `subway-shift/test/e2e.js` (20/20, máy chủ giả lập khác nguồn gốc có CORS như Google); các bộ cũ vẫn đạt hết.

## v2026.10.24.3 — bỏ thanh kéo ở màn nhân viên

- Bảng khai "Đăng ký của tôi" của nhân viên **không còn thanh kéo giờ**. Mỗi ca là một dòng **Vào / Ra −/＋ 30 phút** (nút **L** = tới giờ đóng cửa), giờ nghỉ tự tính theo độ dài ca. Ghi chú ca và ca phụ vẫn ở "Tuỳ chỉnh thêm". Cách khai chính: 🖌 Tô nhanh và chạm ngày → bảng nhỏ.
- Màn quản lý giữ nguyên thanh kéo.
- Kiểm thử: `tests/v43lazy.js` (12/12); các bộ cũ vẫn đạt hết.

## v2026.10.24.2 — khai đăng ký nhanh ("nhân viên lười")

- **Chạm một ngày → bảng nhỏ bật lên ngay** (không phải cuộn xuống bảng khai): nút to Nghỉ / Cả ngày / các mẫu giờ, hoặc chỉnh **Vào / Ra ± 30 phút** (nút **L** = tới giờ đóng cửa). Lưu xong **tự sang ngày sau** (tắt được). Giờ gợi ý sẵn: giờ đã khai hôm đó → cùng thứ đã khai trong tháng → giờ tự đặt lần trước. Có ‹ › đổi ngày, "Xoá ngày này", "Chi tiết (ghi chú, 2 ca…)" để mở bảng khai đầy đủ.
- **🖌 Tô nhanh** (thay nút "Nhiều ngày"): chọn một mẫu (Nghỉ / Cả ngày / 10–16 / 17–L / ＋ Giờ khác / ⌫ Xoá) rồi **chạm hoặc vuốt** qua các ngày trên lịch là xong; chạm lại ngày đang đúng mẫu = bỏ. Chạm tên thứ (T2…CN) = tô mọi ngày thứ đó. Ngày đã chốt tự bỏ qua. Mọi ngày vừa tô gửi lên máy chủ trong MỘT lần.
- Giờ tự đặt gần nhất được nhớ thành một mẫu (cả trong bảng nhỏ và thanh tô).
- Kiểm thử: `tests/v43lazy.js` (10/10); các bộ cũ vẫn đạt hết.

## v2026.10.24.1 — gọn giao diện nhân viên, bỏ thẻ tem

- **Bỏ 🎫 Thẻ tem đi làm** (không ai xem): hết nút "Thẻ tem 1/21", hết dòng thông báo "ĐÃ ĐẾN — Tem thứ…" mỗi lần mở app; máy chủ không đọc / ghi tem nữa (dữ liệu cũ để nguyên). Bảng thông số nhân viên của quản lý bỏ ô "Tem đi làm".
- **💌 Cảm ơn** thành MỘT dòng mảnh cuối tab Hôm nay ("Cảm ơn · Gửi / xem lời cảm ơn ›"), có nhãn "n mới" khi nhận được lời cảm ơn.
- **Tab Đăng ký tự mở đúng tháng:** tháng này đã chốt hết thì bấm "Đăng ký" là mở thẳng tháng sau (tháng đang thu đăng ký). Quay lại tháng đã chốt chỉ còn MỘT thẻ ngắn "Lịch tháng … đã chốt" với 2 nút "📅 Lịch của tôi" / "✎ Đăng ký tháng sau ›" — không lặp lại đổi ca, báo sai, danh sách như trước.
- **Bớt dòng thừa:** bỏ dòng "Xin chào, …" (thanh trên cùng đã ghi tên). Tháng nháp chưa được xếp: ẩn ô "Ca được xếp: Chưa được xếp" và cột "Xếp: Chưa được xếp" lặp ở mọi dòng danh sách (chỉ còn cột "Xin").
- Kiểm thử: `tests/v42staff.js` (8/8); các bộ cũ vẫn đạt hết.

## v2026.10.23.5 — sửa lỗi tồn đọng từ đầu (3 đợt cùng lúc)

**Đợt 1 — nghiêm trọng**
- **Mã đăng ký (bảo mật):** trước đây ai mở link cũng "Tạo mã mới" được cho tên chưa có mã (nhân viên mới, người vừa reset) → chiếm tên, xem lịch / phiếu lương. Nay quản lý cấp **mã đăng ký 6 số** (danh sách nhân viên → ⋯ → 🎫 Cấp mã đăng ký; Reset mã cũng tự cấp mã mới), dùng 1 lần, hết hạn 14 ngày. Nhân viên nhập mã đó rồi mới tự đặt mã đăng nhập.
- **Đổi mật khẩu quản lý** → mọi phiên quản lý cũ (máy khác từng biết mật khẩu cũ) hết hiệu lực ngay; máy đang đổi nhận phiên mới.
- **Mật khẩu & bộ gõ:** máy không gửi lên danh sách "cách đọc" nữa (trước đây cho phép đoán 81 mật khẩu / 1 lần thử). Máy chủ tự dựng tối đa 12 cách đọc từ chuỗi đã gõ (telex, VNI, toàn góc, kana) — vẫn gõ bằng bộ gõ tiếng Việt / Nhật được.
- **Máy đã ghi nhớ:** danh sách máy vượt ~9KB làm hỏng đăng nhập cả quán → nay tự bỏ máy lâu không mở nhất.
- **Chuyển tháng nhanh:** dữ liệu tháng cũ trả về muộn không còn đè lên tháng đang xem.
- **Điểm danh:** quên 退勤 hôm qua thì sáng nay quét 出勤 không còn bị gắn vào hôm qua (ca 16 tiếng / không vào ca được). Chỉ gắn vào hôm qua khi chưa tới 5h sáng, hoặc ca hôm qua kết thúc sau 24h và chưa quá giờ kết thúc + 3 tiếng.
- **Chi viện:** ca ✈ quán khác mượn mà máy quản lý đang cầm bản cũ → giữ lại VÀ cắt ca thường trùng giờ (hết tính giờ hai lần); ca quán kia đã huỷ không "sống lại"; tick "Hỗ trợ tiệm khác" của ca do quán kia mượn bị khoá (bỏ bằng ✕). Chép lịch tháng trước không chép ca ✈. Quyền Google chỉ gửi tới đúng địa chỉ app Apps Script.
- **28h/tuần:** tính theo **mọi 7 ngày liên tiếp** (qua cả mép tháng, kể cả ca ✈). Bảng giờ tuần có cột "Cao nhất 7 ngày"; máy xếp nháp, thông số nhân viên và file xuất giờ (cột 連続7日最大) đều theo cách này.

**Đợt 2 — trung bình**
- Màn chấm công của quản lý luôn theo giờ Nhật (máy để múi giờ khác không lệch nữa).
- Nhân viên không còn nhận thu nhập tối thiểu/tối đa, độ dài ca ưa thích, cấp bậc của người khác, và ghi chú báo nghỉ / đăng ký của người khác.
- Hãm thư: thư thử 3 lần/giờ, đổi email 10 lần/giờ, thư báo quản lý tối đa 6/giờ cho mỗi nhân viên (🔔 trong app vẫn đủ).
- Danh sách nhân viên rỗng không còn tự sinh 20 người mẫu; dữ liệu hỏng thì báo lỗi, không ghi đè (màn đăng nhập quản lý vẫn mở được để khôi phục).
- Lưu lỗi khi đã sang tháng khác: không ghi giá trị cũ vào tháng đang xem (ghi chú ngày, đổi ca, giờ đóng cửa, ngày lễ, khoá lịch).
- Hộp thư chi viện: xử lý từng dòng, lỗi giữa chừng không mất lệnh; quán đang bận thì làm tiếp lần sau; không áp được thì báo lại quán mượn. Lượt mượn đang chờ hiện "⏳" ở mọi lần mở. Quán thứ ba mượn chồng giờ làm cắt ca ✈ sang quán khác → quán đó được báo.
- Nhắc thiếu giờ nghỉ tính theo cả ngày (ca nối liền / cách dưới 1 tiếng gộp lại, kể cả ca ✈).
- Xoá hẳn sau 6 tháng: xoá cả ảnh hồ sơ, mật khẩu phiếu lương, khoá QR, bản chụp lịch sử hồ sơ (hồ sơ 年末調整 giữ lại vì sổ thuế phải giữ 7 năm).
- Hồ sơ nhân sự lưu trong khoá (quản lý và nhân viên cùng sửa không đè nhau); khôi phục người cũ cũng trong khoá.

**Đợt 3 — nhỏ**
- `?lang=vi|en|ja` trên link nay có tác dụng thật (đọc qua google.script.url).
- Người quán khác tới giúp đang nghỉ giải lao không bị đếm là có mặt; giờ chi viện tính đúng giờ nghỉ của họ.
- Bật kỹ năng cần cho khung giờ ở ngày lễ chỉ áp cho ngày lễ (không lan sang mọi thứ đó).
- Tắt "Kết nối các quán" khi còn ca ✈ sắp tới → hỏi trước và báo các quán kia.
- Bản in: tổng SA / 社員 / tổng ngày không gộp giờ ✈ (khớp màn hình), giờ ✈ ghi riêng.
- 年末調整: giờ làm từng tháng cộng số lẻ thật rồi làm tròn một lần. Ca "đến L" bắt đầu sau giờ đóng cửa không ra giờ âm (máy chủ = máy).
- App mở qua đêm: "hôm nay" tự đổi sau 0h. Đóng/mở nhanh phiếu đặt hàng không nhân đôi bộ đếm giờ.
- Hàm định kỳ (đồng bộ, gửi thư, sao lưu) gọi dồn từ ngoài bị hãm. Ghi dữ liệu dài tự thêm cột. Mã LINE không dùng số ngẫu nhiên yếu. Giờ đổi mã PIN ghi theo giờ Nhật. Khảo sát ẩn danh đã có người trả lời thì không bật "xem tên" về sau được.
- Kiểm thử: `tests/v41fix.js` (35/35), `tests/v41ui.js` (9/9); các bộ cũ vẫn đạt hết.

## v2026.10.23.4 — kỹ năng gập gọn, đặt hàng cuối tuần / tỉ lệ rau, nút tải lại, mở link = tiếng Nhật

- **Bảng chi tiết nhân viên:** kỹ năng gập thành MỘT dòng tóm tắt (3 kỹ năng đang có + "+n"); bấm mới mở lưới nút bật/tắt. Tóm tắt cập nhật ngay khi bật/tắt. Mở/gập được nhớ khi màn hình vẽ lại.
- **Đặt hàng — mặt hàng định mức:** thêm ô định mức "T7·CN·lễ" bên cạnh định mức ngày thường (Cài đặt → 📦). Phiếu nào có hàng tới (ngày đặt + số ngày hàng về) rơi vào T7 / CN / ngày lễ Nhật thì dùng định mức cuối tuần; để trống = dùng chung định mức ngày thường. Dòng hàng ghi rõ "chuẩn n · T7·CN·lễ".
- **Đặt hàng — rau:** khu 🥬 có ô "Tỉ lệ dư rau (phiếu này)" −/+ 5% cho RIÊNG phiếu ngày đó (quản lý; mở được phiếu tới 7 ngày sau để đặt trước). "Về mặc định" quay lại mức trong Cài đặt. Phiếu đã chốt thì phải mở lại mới đổi được.
- **Nút ↻ Tải lại** (thanh trên cùng, quản lý và nhân viên): đọc lại lịch tháng từ máy chủ; quản lý còn đọc ngay thông báo / lệnh chi viện của quán liên kết và bỏ bộ nhớ tạm "ai tới giúp".
- **Ngôn ngữ:** mở link luôn hiện tiếng Nhật, không nhớ ngôn ngữ lần trước. Đổi ngôn ngữ trong lúc dùng chỉ giữ tới khi đóng trang. Link có `?lang=vi` / `?lang=en` thì mở bằng ngôn ngữ đó. Nhân viên tự đặt "ngôn ngữ mặc định" ở tab ⚙ của mình thì vẫn theo lựa chọn đó sau khi đăng nhập.
- Kiểm thử: `tests/v40ui.js` (13/13).

## v2026.10.23.3 — bộ gõ (IME): đăng nhập không cần đổi bàn phím, đổi bộ gõ giữa chừng không treo

- **Ô mật khẩu / mã không sửa chữ trong lúc gõ nữa.** Trước đây app bỏ dấu ngay khi gõ → Unikey / bộ gõ Mac / bàn phím Nhật bị rối (đổi bộ gõ giữa chừng là lỗi), và bỏ dấu kiểu "ă → a" làm sai mật khẩu ("Otagăa" → "Otagaa" chứ không phải "Otagawa").
- **Lúc bấm đăng nhập app tự đổi về ABC**: chữ toàn góc → nửa góc; chữ có dấu do telex / VNI → dựng lại đúng phím đã bấm (ă → aw, ấ → aas…, thử cả kiểu bỏ dấu cuối từ); kana → romaji (Hepburn / kunrei). Máy chủ thử lần lượt các cách đọc (tối đa 80), sai cả thì chỉ tính MỘT lần sai. Dòng nhắc "bộ gõ đang bật — không cần tắt" chỉ để biết, không chặn.
- **Mã nhân viên, mật khẩu phiếu lương**: chữ số toàn góc tự đổi về nửa góc khi gửi.
- **Đặt mật khẩu mới**: máy chủ chỉ nhận chữ ABC / số / ký hiệu. Bộ gõ đang bật → app hỏi "sẽ lưu là «…» — đúng chưa?" trước khi lưu.
- **Ô dặn dò (và mọi ô chữ)**: đang gõ dở bằng bộ gõ (chữ gạch chân) thì app KHÔNG vẽ lại màn hình (trước đây vẽ lại giữa lúc gõ → mất chữ, bộ gõ treo); gõ xong mới vẽ lại. Vẽ lại lúc đang ở trong ô thì giữ nguyên chữ chưa lưu + vị trí con trỏ. Đổi bộ gõ mà trình duyệt không báo "gõ xong" → rời ô là coi như xong.
- Kiểm thử: `tests/v39ime.js` (15/15) + kiểm cách đọc mật khẩu (telex, VNI, toàn góc, kana).

## v2026.10.23.2 — gọn bảng chi tiết, người chi viện nằm chung danh sách ca, bản in ghi mã quán

- **Bảng chi tiết nhân viên:** chip kỹ năng và giờ nghỉ nhanh xếp thành lưới cột đều (thẳng hàng, thẳng lối), không còn chip dài ngắn lộn xộn.
- **Người quán khác tới giúp** hiện thành một dòng ✈ trong danh sách ca của ngày (xếp đúng thứ tự giờ vào, thanh giờ màu cam, ghi mã quán) — giống bảng in. Dòng chỉ xem; sửa / huỷ ở ô ✈️ Chi viện.
- **Bản in:** người tới giúp chỉ ghi mã quán (vd. "H ラム FOR"); người quán mình đi giúp ghi "→ MÃ QUÁN" thay cho tên quán dài → không tràn dòng.

## v2026.10.23.1 — CHI VIỆN làm lại từ đầu (v3): một bản ghi, không duyệt, không đồng bộ

- **Vì sao làm lại:** cách cũ có HAI cơ chế cùng ghi một việc (tick "Hỗ trợ tiệm khác" ghi tay + yêu cầu/duyệt qua bảng chung rồi đồng bộ ca ✈), lại phải chờ quán kia duyệt và chờ chu kỳ đồng bộ 5 phút → chậm, chồng ca (11:00–17:30 + 11:00–22:00 = 16,5h), thiếu thông báo.
- **Cách mới — chỉ MỘT bản ghi:** ca ✈ chỉ nằm trong lịch của QUÁN NHÀ nhân viên, có gắn quán nhận (`supTo`) và mã lượt (`sid`). Quán nhận biết "ai tới giúp mình" bằng cách đọc thẳng lịch các quán trong mạng (cùng tài khoản Google; nhớ tạm 60 giây).
- **Ba thao tác của quản lý, đều có hiệu lực ngay, không duyệt:**
  - **⬅ Mượn người** (quán nhận): gõ tên/mã → chọn giờ → "Mượn ngay". App gọi thẳng app của quán nhà để quán nhà tự ghi ca (đúng khoá ghi, đúng bộ nhớ đệm), quán nhà nhận 🔔. Không gọi được thì lệnh vào hộp thư quán nhà và áp khi app quán đó chạy (vài phút); trong lúc chờ quán nhận vẫn thấy người đó, kèm nhãn "chờ quán kia".
  - **➡ Cử người đi** (quán nhà): chọn người + quán + giờ → ca ✈ vào lịch ngay, quán nhận nhận 🔔.
  - **Tick "Hỗ trợ tiệm khác"** trong ca + chọn một quán trong mạng = cùng cơ chế (gắn quán nhận). Chọn quán ngoài mạng thì chỉ là ghi chú ✈ ở quán mình.
- **Trùng ca ở quán nhà:** app hỏi "Cắt phần trùng ở quán nhà?"; đồng ý thì cắt ca ở quán nhà phần trùng (giữ giờ nghỉ nếu còn nằm trong ca) → không bao giờ cộng giờ hai lần.
- **Huỷ:** nút × trên từng dòng của ô "✈️ Chi viện" (tab Ngày): "⬅ Tới giúp quán mình" và "➡ Người quán mình đi giúp". Quán kia nhận 🔔.
- **Quán nhà sửa / xoá / kéo ca ✈** như ca thường → quán nhận tự được báo. Ca do quán khác mượn không bị mất khi máy quản lý quán nhà đang cầm bản cũ rồi lưu đè.
- **🔔 hỏi mỗi 60 giây** (trước 2 phút); có thông báo chi viện thì app tự đọc lại lịch.
- **Đã bỏ:** "Xin chi viện" để nhân viên quán khác tự bấm "Tôi đi được", bước duyệt hai phía, bảng yêu cầu/sự kiện, chu kỳ đồng bộ. Yêu cầu đang chờ duyệt của cách cũ không còn hiệu lực.
- **Chuyển dữ liệu cũ (tự động, một lần mỗi quán):** ca ✈ của cách cũ được gắn quán nhận; ca ✈ tick tay chọn quán trong mạng cũng vậy; hai ca ✈ sang cùng quán chồng giờ → giữ một. Cài đặt → Kết nối → "🔄 Làm mới chi viện" để chạy lại.
- **Khi cập nhật:** cập nhật Code.gs + Index.html ở CẢ HAI quán (cùng phiên bản triển khai cũ), rồi mở app bằng tài khoản quản lý ở mỗi quán một lần để danh bạ ghi đường dẫn app + khoá bí mật của quán.
- Kiểm thử: `tests/v37sup.js` (30/30, hai quán gọi thẳng nhau), `tests/v37ui.js` (9/9). Bỏ `tests/v33hub.js`, `tests/v36support.js` (thuộc cách cũ).

## v2026.10.22.5 — ô giờ chỉnh định mức + kỹ năng; một cơ chế chi viện; người làm cùng khi đi chi viện

- **Bấm ô số người theo giờ** (tab Ngày): popup chỉnh **số người cần** (−/+) và **bật/tắt kỹ năng cần** cho đúng khung giờ đó. Lưu ngay vào Cài đặt (định mức theo thứ; yêu cầu kỹ năng cho đúng thứ đó). Chip kỹ năng hiện số có/cần, đỏ khi thiếu. "Tuỳ chỉnh thêm…" mở hộp chi tiết cũ (số người, nhiều giờ). Popup không còn liệt kê kỹ năng từng nhân viên (đã có ở bảng chi tiết).
- **Một cơ chế chi viện:** trước đây tick "Hỗ trợ tiệm khác" (ghi tay ở quán mình) và Chi viện qua kết nối (ca ✈ đồng bộ) cùng ghi một người cùng ngày → hai ca chồng nhau, giờ bị cộng hai lần (ví dụ 11:00–17:30 + 11:00–22:00 = 16,5h). Nay:
  - Khi ca ✈ đồng bộ được áp, ca ✈ tick tay trùng giờ của người đó bị thay thế (ca ở quán không bị đụng tới).
  - Tick "Hỗ trợ tiệm khác" và chọn một quán trong mạng kết nối → app hỏi gửi luôn yêu cầu cử người, để hai quán cùng thấy và cùng đồng bộ.
  - Dữ liệu đã lỡ chồng (từ hôm nay trở đi) được dọn tự động một lần ở lần chạy nền kế tiếp; bấm "🔄 Đối chiếu ca chi viện" để dọn ngay.
  - Dòng nào còn hai ca chồng giờ có cờ "⚠ Trùng giờ".
- **Người làm cùng khi đi chi viện:** nếu chưa thấy ai của quán được chi viện, app nói rõ lý do: quán đó chưa công bố lịch ngày đó (đang ẩn bản nháp), chưa đọc được lịch, hoặc chưa xếp ai.
- Kiểm thử mới: `tests/v36support.js` (7/7), `tests/v36ui.js` (8/8).

## v2026.10.22.4 — bảng ngày gọn hơn, xem nhanh ai đang làm khung giờ

- **Bấm một ô giờ** trên hàng "Số người đang làm theo giờ" (tab Ngày): hiện ai đang làm khung đó, giờ vào–ra, ☕ nếu đang nghỉ, kỹ năng từng người, người đến chi viện (✈), cảnh báo thiếu kỹ năng nếu có. Bấm **✏️ Chỉnh** để mở đúng dòng của người đó. Giữ 0,5 giây (hoặc chuột phải) vẫn là đặt yêu cầu kỹ năng cho khung giờ như cũ.
- **Chip 🔥/💤 cạnh tên** (mục quản lý) giờ mở thẳng bảng chi tiết của người đó thay vì popover riêng. Tổng quát tháng (giờ theo nửa tháng, biểu đồ từng ngày, làm liền/nghỉ liền) được chuyển lên đầu bảng chi tiết của mỗi người.
- **Thẻ Dự toán giờ hôm nay**: thêm dòng "Cả tháng" với thanh % giờ đã xếp / dự toán tháng, đặt ngoài (không nằm trong Chi tiết). Chuyển đỏ khi vượt.
- **Gọn hoá** dòng kỹ năng (chữ và nút nhỏ hơn) và dòng giờ nghỉ nhanh (một hàng, cuộn ngang nếu dài).

## v2026.10.22.3 — sửa nhỏ sau đợt mượn/cử người

- **Nút ☕ nghỉ giải lao không bị dính:** kéo ☕ rồi có lúc màn hình bị vẽ lại giữa chừng thì biểu tượng nổi vẫn còn. Nay lắng nghe thao tác trên toàn trang và tự dọn biểu tượng nổi còn sót.
- **Giờ chi viện nhận vào tách riêng:** ở ⚖️ Dự toán giờ và ngân sách giờ, giờ người quán khác đến chi viện không còn cộng vào giờ SA của quán. Hiển thị dòng riêng "✈ Chi viện nhận (không tính trần)". Trần giờ SA chỉ so với giờ của nhân viên quán. Tổng chi phí nhân công vẫn tính đủ cả giờ chi viện.
- **Vòng tròn tỉ lệ ở ⚖️ Dự toán giờ:** hiện ở đầu khung, % = giờ đã xếp ÷ dự toán giờ cả tháng; chuyển đỏ khi vượt.
- **Tổng giờ đăng ký (希望/kibo) ở tab Tháng:** mỗi người có dòng "Đăng ký Xh" dưới tên; dòng tổng cuối bảng cũng có tổng cả nhóm.

## v2026.10.22.2 — Sửa đồng bộ mượn/cử người giữa hai quán

- **Nguyên nhân:** mọi thao tác ghi đè cả dòng yêu cầu bằng bản đọc cũ, nên hai quán thao tác gần nhau thì mất thay đổi của nhau. Ca ✈ quán nhà chỉ cập nhật theo chu kỳ, còn quán được mượn thấy số người theo thời gian thực. Không có thông báo cho mượn/cử/duyệt.
- **Sửa (bảng sự kiện chỉ-thêm):** mỗi thao tác là MỘT dòng mới ở sheet `events` của bảng chung; không ghi đè. Quyền ghi theo bên: quán nhà duyệt (`home`), quán nhận (`host`), người đăng ký (`offer`), người huỷ (`cancel`), quán nhà đánh dấu đã áp ca (`applied`). Trạng thái suy ra khi đọc. Dòng yêu cầu cũ vẫn đọc được.
- **Thông báo hai chiều:** hai quán dùng chung tài khoản Google nên quán gửi ghi thẳng thông báo vào sheet `hubnote` của quán nhận. Quán nhận đưa vào 🔔 khi quét (mở app, nhận mail/thông báo mỗi 2 phút, hoặc chu kỳ nền). Có loại mới: 🤝 cần duyệt, ✅ đã chốt, ✖ từ chối/rút/huỷ.
- **Ca ✈ áp ngay:** khi quán nhà quyết định, ca được áp ngay; khi quán kia quyết định và đã chốt, quán nhà áp khi nhận thông báo. Chu kỳ nền đổi từ 10 phút xuống 5 phút (áp khi bật kết nối lại).
- **Nút "🔄 Đối chiếu ca chi viện"** (Cài đặt → Kết nối): tính lại ca ✈ của tháng này và tháng sau từ trạng thái chung; gỡ ca thừa, thêm ca còn thiếu.
- **Kiểm thử:** `tests/v33hub.js` chạy HAI quán trên cùng một bảng chung: 12/12 (mượn → duyệt → ca ✈ có ngay; huỷ không hồi sinh ca dù bản đọc cũ; nhận và rút không mất nhau; thông báo hai chiều; đối chiếu khôi phục ca). `tests/v30race.js` đã được thay thế bởi v33hub.js. `tests/v32batch.js` 16/16, `tests/v32ui.js` 9/9, `tests/v31staffday.js` 16/16.
- **Lưu ý:** bảng `events` sẽ lớn dần theo năm; cần dọn định kỳ sau khi yêu cầu đã qua ngày (chưa làm). Các yêu cầu đang mở trước bản này vẫn đọc được bình thường.

## v2026.10.22.1 — Đợt cập nhật lịch ca (app lịch làm)

- **Ca ✈ chi viện bị kéo đến giờ đóng cửa (sửa):** ô "→ L" trong hộp xin/cử chi viện trước đây được tick sẵn nên khung 15:00 bị bỏ qua. Nay mặc định KHÔNG tick; chỉ tick khi xin đến giờ đóng cửa. Phía quán nhà cũng giữ đúng cờ L (trước đây không đồng bộ cờ này). Ca đã tạo trước đây cần xếp lại / đề nghị lại để cập nhật.
- **Người hay đi chi viện lên đầu** khi cử người: danh sách chia hai nhóm "Hay đi chi viện ×số lần" (đếm các ca hai bên đã xác nhận) và "Những người khác".
- **🔰 người mới và thẻ kỹ năng "người mới" là một:** bật 🔰 thì tự có thẻ "new" và ngược lại. Máy chủ giữ hai bên khớp nhau.
- **Nhắc sau 3 tháng:** khi người mới đã đánh dấu đủ 3 tháng (tính từ ngày đánh dấu) thì xuất hiện trong 🔔 (mức thấp, không tính vào số đếm) để quản lý xem xét bỏ dấu.
- **Bộ đếm lượt dùng ẩn:** mỗi lần mở một mục trong 🔍 tìm nhanh được đếm (chỉ trên máy đó). Mục dùng nhiều xếp lên đầu danh sách. Xem số đếm ở mục "📊 Số lần dùng" trong 🔍.
- **Ngôn ngữ bản in tách khỏi giao diện:** mặc định tiếng Nhật; chọn ở hộp xem trước in (日本語 / Tiếng Việt / English) và được ghi nhớ. Giao diện vẫn theo ngôn ngữ đang chọn.
- **Thu nhập tối thiểu / tối đa mỗi tháng:** đặt trong hộp "Giới hạn" của nhân viên (¥). Dự kiến = số giờ đã xếp trong tháng × lương giờ trong hồ sơ nhân sự. Vượt trần → 🔔 mức cao; chưa đạt sàn → 🔔 mức thấp. Không có lương giờ thì không báo.
- **🖨 In tài liệu:** 4 mẫu mặc định (bằng tiếng Nhật): lịch ngày trong tháng (tự điền ngày, thứ), checklist đóng cửa, phiếu đặt hàng (tự điền ngày), bảng kỹ năng nhân viên (tự điền từ thẻ kỹ năng). Nhân viên chỉ in; quản lý thêm/sửa mẫu ở nút ✎ / ＋. Trong nội dung mẫu: {{thang}} = tháng hiện tại, {{ngay}} = hôm nay; dòng bắt đầu bằng "-" thành ô tick.
- **Chưa làm / đang chờ:**
  - Xuất giờ làm sang KING OF TIME: chờ file CSV mẫu đang nhập vào KING OF TIME.
  - Gộp / đưa chức năng ra ngoài theo danh sách cụ thể: chờ Lâm chỉ những nút muốn đưa ra ngoài. Hiện mới có danh sách "hay dùng" theo bộ đếm.
  - Bảng kỹ năng trên màn hình: hiện có dạng in (mẫu "スキル一覧").
- **Kiểm thử:** `tests/v32batch.js` (máy chủ: 16/16 — gồm đồng bộ ca ✈ có/không có L, 🔰↔thẻ, sàn/trần thu nhập, ngôn ngữ bản in); `tests/v32ui.js` (quản lý: 9/9 — In tài liệu, bộ đếm, không lỗi JS); `tests/v31staffday.js` 16/16 (không hồi quy). `tests/v30race.js` vẫn 2 đạt / 3 lỗi — lỗi đồng bộ mượn người giữa hai quán chưa sửa, đang chờ duyệt hướng sửa.

## v2026.10.16.14 — Tab 今日 của nhân viên + sửa lỗi đợt 3

- **Tab 今日 (nhân viên):** hôm nay mình nghỉ / không có ca → thẻ vẫn là của HÔM NAY ("今日はシフトがありません" / "今日はお休みです"), khung người đổi tên "お店" (Trên tiệm) và hiện ai đang làm hôm nay. Ca tiếp theo chỉ còn là một dòng bấm được (bấm → nhảy tới ngày đó). Trước đây cả thẻ lẫn "メンバー" nhảy sang ngày có ca tiếp theo nên không xem được tiệm hôm nay.
- **‹ ›** luôn tính từ ngày đang xem (mặc định hôm nay): ‹ = hôm qua. Trước đây ‹ lùi từ ngày ca tiếp theo nên không về được ngày cũ.
- **Chọn ngày bất kỳ:** chạm vào ngày ở giữa thẻ (có biểu tượng 📅) → lịch chọn ngày (lùi tới ~13 tháng, tới trước ~4 tháng), qua tháng khác tự tải.
- Ngày mình không làm: tiêu đề "{d}日のお店のメンバー"; chưa ai trong lịch → ghi rõ (hoặc "chưa công bố" nếu quán ẩn bản nháp).
- **Sửa lỗi đợt 3** (rà soát 22/10): hộp thoại bắt buộc (đổi PIN yếu, đổi mật khẩu mặc định…) không còn nút ‹ Quay lại; đóng hộp con → con trỏ về đúng hộp cha; Hoàn tác: lệnh xoá đang chờ được gửi trước khi tải lại / đổi tháng (mục đã xoá không hiện lại, không đắp dữ liệu tháng cũ sang tháng mới), bấm Hoàn tác khi đã gửi → báo "đã lưu, không hoàn tác được"; Esc trong tìm nhanh không đóng luôn app đang mở; chọn việc không dùng được lúc này (đã công bố / khoá) → báo; số trên 🔔 và chip "N việc" đếm giống nhau.
- **Bộ test dựng lại** (bản cũ mất khi máy làm việc được làm mới): `tests/gas-mock.js` (giả lập Apps Script), `tests/v31staffday.js` 16/16, `tests/v30race.js` (tái hiện lỗi chi viện — CHƯA sửa, đang chờ duyệt hướng sửa). `tools/minify.js` dựng lại. Test và công cụ nay lưu cùng Code.gs.

## v2026.10.16.13 — Giao diện đợt 3 (điểm 7, 16, 20, 24)

- (7) Tìm nhanh: nút 🔍 trên thanh trên của quản lý (trên máy tính thêm phím / hoặc Ctrl+K). Gõ tên mục, việc hoặc tên nhân viên, không cần dấu (vd. "sao luu", "kiem ke", "PIN", "ラム") → Enter là mở đúng app/thẻ con. Bấm ☆ để ghim (tối đa 6) → hàng nút ghim nằm ở đầu tab Tháng và tab Ngày. Ghim lưu trên từng máy.
- (16) Tab Ngày: 3 băng riêng (đổi ca chờ duyệt / báo sai chưa xử lý / chi viện) gom thành 1 chip "🔔 N việc cần xử lý · 🚨 gấp" mở hộp 🔔. Băng màu chỉ còn cho việc gấp thật (hạn đặt hàng). Quán khác xin chi viện → thành 1 dòng trong hộp 🔔 (bấm là nhảy tới ngày đó).
- (20) Xoá thống nhất kiểu "Đã xoá · Hoàn tác": ghi chú, báo sai, phương án A/B/C, khảo sát, lịch cũ của máy học, nhân viên. Mục biến mất ngay; 7 giây sau mới gửi lệnh xoá lên máy chủ; bấm Hoàn tác trong 7 giây = như chưa xoá. Rời app thì lệnh đang chờ được gửi luôn. Xoá nhân viên vẫn hỏi lại trước (vì xoá cả dữ liệu), sau đó vẫn có 7 giây hoàn tác.
- (24) Không còn hộp thoại chồng hộp thoại: mở hộp mới khi đang có hộp → hộp cũ tạm ẩn, hộp mới có nút "‹ Quay lại" ở đầu; đóng/quay lại là hộp cũ hiện lại đúng như trước (Esc chỉ đóng hộp đang thấy).
- Test mới đợt 3: 25/25 (tìm nhanh, ghim, quay lại, hoàn tác ghi chú + nhân viên, chip thông báo). Chạy lại: 🔰 9, v29 12, phiếu lương 38, đặt hàng 25, chấm công, kiosk 31, API (hc 9, att 11, ord 4, learn 13, mail 20, v25 13).

## v2026.10.16.12 — Giao diện đợt 2 (điểm 1, 3, 5, 8, 12, 13, 14, 21, 23, 25, 28)

- (1) Tab Tháng: bảng lịch tháng ngay dưới thanh tháng + hàng nút xếp/in; thẻ Dự toán giờ và các app xuống dưới.
- (3) Bảng tháng: dòng "Xin" tắt mặc định (bấm ○ Xin để bật, máy nhớ); ô vàng của 社員 chưa có ca không còn chip "🛏 Ngh…" — trên máy tính rê chuột mới hiện nút nghỉ, trên điện thoại chỉ còn biểu tượng 🛏 mờ.
- (5) Chữ hướng dẫn dài hơn 2 dòng (khi hiện ra) trong các khối → 1 dòng + ⓘ, chạm để đọc hết. Hộp thoại không thu gọn.
- (8) Chú thích bảng tháng chỉ còn 2 màu trạng thái (đỏ: xếp khác đăng ký · vàng: chính thức chưa có ca); màu thẻ mới dùng chung 3 mức ok / cần xem / sai.
- (12) Ngày theo ngôn ngữ: tiếng Việt 16/10, tiếng Anh/Nhật 10/16 (ngày đặt hàng, "lần cuối thấy", giờ công bố, nghỉ nhanh, máy học).
- (13) Bổ sung bản dịch 3 câu báo lỗi còn thiếu (mật khẩu phiếu lương, lịch cũ) — rà 193 câu lỗi + 26 câu có số, nay đều có tiếng Anh/Nhật.
- (14) Thông số nhân viên: tháng chưa có ca → khung hướng dẫn thay cho dãy "—".
- (21) Nút "⋯ Thêm" ở hàng công cụ tháng hiện chữ cả trên điện thoại; nút ⋯ thanh trên có chữ "Thêm" trên máy tính.
- (23) 👥 Nhân viên › Danh sách: ô tìm tên/mã + lọc Tất cả / SA / Chính thức / Hôm nay có ca.
- (25) Màn Hôm nay của nhân viên: ngay dưới thẻ ca là "việc cần làm" (đăng ký tháng, đổi ca, thẻ cảm ơn mới); thẻ tem/cảm ơn xuống cuối.
- (28) Rà chế độ tối: tháng, nhân viên, máy học, ngày, màn nhân viên — không thấy chỗ hỏng; thêm màu trạng thái riêng cho nền tối.
- Test: tìm/lọc nhân viên + bật/tắt dòng Xin 7/7, 🔰 9, v29 12, phiếu lương 38, đặt hàng 25, chấm công 38/39, kiosk 31, gộp app 6/6.

## v2026.10.16.11 — Giao diện đợt 1 (sửa nhanh: điểm 2, 4, 6, 9, 10, 15, 17, 18, 19, 27 trong bảng chọn)

- (2) Thanh trên của quản lý: chỉ còn chuông + Quản lý/Nhân viên + nút ⋯ (ngôn ngữ, thêm vào màn hình chính, giao diện & màu, sáng/tối, đăng xuất).
- (4) Biểu tượng Máy học đổi sang nét mảnh như các app khác; nhãn tiếng Nhật kèm nghĩa ngắn: 体調 (tự khai), 年末調整 (thuế).
- (6) Trên điện thoại: nút ▲▼, chip kỹ năng, nút ⋯ thẻ tên, mục menu, thẻ con to hơn (≥ 30–44px).
- (9) Dòng đo tốc độ ở ⚙ nhân viên ẩn đi; chạm dòng "Phiên bản" mới hiện.
- (10) Một tên cho một khái niệm: "Dự toán giờ" (thẻ ngày/tháng + app), "Trần giờ" (thay "Ngân sách giờ").
- (15) Nút vừa bấm mà đang gọi máy chủ → khoá + vòng xoay tới khi xong (chống bấm 2 lần) — áp dụng chung cho mọi nút.
- (17) Thông báo nhanh: chữ dài thì hiện lâu hơn (tối đa 8 giây), chạm để tắt.
- (18) Hộp công bố ghi rõ "Sẽ gửi mail báo lịch cho N người đã đăng ký email" (hoặc "không gửi mail").
- (19) Mục xoá nhân viên trong menu ⋯: tách xuống cuối, chữ đỏ, vẫn hỏi lại.
- (27) Chữ phụ đậm hơn (xám đậm hơn ở 2 giao diện sáng); tiêu đề ngày bảng tháng 10px → 11,5px.
- Sửa lỗi phát hiện khi làm: hộp "Giao diện & màu" hiện nhầm tiêu đề/ghi chú/thông báo của mục Kỹ năng (trùng khoá chữ) — đã tách khoá riêng. App ngắn mở menu ⋯ thẻ tên bị cắt — app luôn đủ cao.
- Test: 🔰 9, v29 12, phiếu lương 38, đặt hàng 25, chấm công 38/39, gộp app 6/6; chụp trước–sau trên điện thoại.

## v2026.10.16.10 — Gọn tab Tháng và tab Cài đặt (gộp app trùng, việc hay dùng ra trước)

- **Cài đặt: 11 → 4 app.** 🏪 Cửa hàng · 🏷 Kỹ năng · việc lặp lại (2 thẻ) · 🔗 Kết nối & chia sẻ (Link·QR, Lịch điện thoại, LINE, Kết nối quán) · 🔒 Bảo mật & sao lưu (Sao lưu, Mật khẩu & thao tác nguy hiểm).
- **Tab Tháng:**
  - Xếp ca: 📋 Kiểm tra lịch (Sức khoẻ 14 ngày, Giờ theo tuần, Báo sai lịch, Việc đã làm, Hoạt động NV) · Phương án · Máy học.
  - Nhân công (hay dùng đứng trước): 👥 Nhân viên (Danh sách & thẻ tên — chuyển từ Cài đặt, Hồ sơ nhân sự, Thông số) · Chấm công · ⚖️ Dự toán giờ · 体調 · Khảo sát · 年末調整.
  - Doanh thu: Báo cáo tháng · Phân tích bán · 📦 Đặt hàng · kho (Kiểm toán tháng, Kiểm kê 棚卸, Danh mục & định mức — chuyển từ Cài đặt).
- **Trần giờ SA / chính thức tháng** chuyển từ Cửa hàng vào ⚖️ Dự toán giờ (cùng chỗ với tỷ lệ, lương giờ và thanh "đã dùng bao nhiêu"). Khối "Ngân sách giờ tháng" riêng bỏ đi.
- Băng cảnh báo mật khẩu mặc định có nút "Đổi mật khẩu ›" mở thẳng đúng chỗ.
- App gộp nhớ thẻ con đang mở; link cũ trỏ tới khối con (vd. nhắc việc 🔔 mở hồ sơ nhân sự) tự mở đúng app + thẻ.
- Sửa lỗi nhãn: "Việc lặp lại" bị hiện thành "Giờ/tuần".
- Test: mở từng app ở cả 2 tab, bấm từng thẻ con (đều có nội dung, không lỗi JS); băng mật khẩu, "Chi tiết ›", lưu trần giờ không mất khi lưu Cửa hàng (6/6); chạy lại 🔰 9, v29 12, phiếu lương 38, đặt hàng 25, chấm công 38/39, kiosk 31, v24api 44, v26pay 19, v29learn 13.

## v2026.10.16.9 — Học từ lịch cũ · thẻ giờ công dự tính (tab Ngày + Tháng) · bật/tắt kỹ năng ngay ở tab Ngày

- **Học từ lịch cũ:** 40 ảnh lịch Otagawa (1/5 – 15/10/2026, có ảnh trùng dùng để đối chiếu) được chép thành file `lich-cu-otagawa-2026-05-01_10-15.csv` (1.172 ca, 168 ngày, 29 tên). Bỏ dòng 募集中 và dòng "H ラム" (đi chi viện).
  - Tab Tháng → nhóm Xếp ca → 🧠 **Máy học**: nhập CSV (ngày, tên, giờ vào, giờ ra), tên không trùng thì hiện hộp ghép tên (chọn người hoặc "Bỏ qua" cho người đã nghỉ). Nhập nhiều lần được (gộp, trùng ngày + tên lấy bản mới). Có nút ghép lại tên, xoá lịch cũ.
  - Bảng thói quen: mỗi người 7 ô thứ (đậm = hay làm), giờ hay vào–ra, số ca.
  - Máy xếp nháp: cộng điểm cho người hay làm thứ đó (tỷ lệ ngày làm từ ngày đầu tới ngày cuối người đó có ca) và giờ gần giờ quen; dữ liệu từ các lần chốt lịch vẫn ưu tiên cho giờ vào/ra.
- **Thẻ "⚖️ Giờ công dự tính":** tab Tháng (trên bảng tháng) và tab Ngày (dưới ô 予算). Mục tiêu = 予算 × tỷ lệ ÷ lương giờ bình quân (cùng số với ⚖️ Dự toán nhân công), so với giờ đã xếp, báo còn/vượt. "Chi tiết ›" mở bảng dự toán đầy đủ.
- **Kỹ năng ngay ở tab Ngày:** bấm ▾ ở tên → hàng nút kỹ năng, bấm là bật/tắt và lưu.
- Test: v29learn 13, giao diện v29 12 (thẻ ngày/tháng, kỹ năng, nhập CSV thật 1.172 dòng, chạy xếp nháp, không lỗi JS); chạy lại v20api 77, v22api 33, v24api 44, v25api 13, v25cc 11, v26pay 19, v26mail 20, v27att 11, v27hc 9, v27ord 4, v26ui_pay 38, hcui 25, 🔰 9, v16ui 38/39 (chỉ còn mục đếm ngược QR đã bỏ có chủ đích).

## v2026.10.16.8 — Dùng hình 🔰 (初心者マーク) thay chữ 初

- Màn hình: thẻ tên, bảng tháng, dòng trong ngày hiện hình 初心者マーク (vàng trái, xanh phải), không có chữ.
- Bản in: 🔰 trước tên (trước là "初 "). Tuỳ chọn bản in đổi thành "Gắn 🔰 cho nhân viên mới".
- Test giao diện 9/9.

## v2026.10.16.7 — Dấu 初 dễ tìm và hiện cả trên màn hình

- Trước đây chỉ bật được trong ⋯ → ⏱ (giới hạn giờ) và chỉ thấy khi in → khó tìm.
- **Menu ⋯ của thẻ tên có mục riêng "🔰 Nhân viên mới (初)"** — bấm là bật/tắt ngay.
- **Dấu 初 (nền xanh, viền vàng) hiện trên màn hình:** thẻ tên nhân viên, cột tên bảng tháng, dòng tên trong ngày. Bản in vẫn có "初" trước tên (tắt được trong tuỳ chọn bản in).
- Test giao diện mới: 9/9 (bật → thẻ tên + bảng tháng + bản in có 初, tắt → mất, không lỗi JS).

## v2026.10.16.6 — Sửa QR cố định không dùng được · bớt việc khi nhân viên mở app

- **QR cố định đổi sang dạng `SBA1:<mã NV>:0:<chữ ký>`.** Bản .3 dùng `SBA2:` nên trang máy quét cũ (GitHub/Netlify chưa tải lại) đọc được mã nhưng báo "không phải mã của app". Dạng mới được mọi bản máy quét chấp nhận; máy chủ coi khung 0 là mã cố định. Mã `SBA2` đã in vẫn được máy chủ nhận nếu máy quét là bản mới.
- **Nhân viên mở app không còn phải chờ:** gửi thư đang chờ (có giữ khoá + gửi tối đa 8 thư) và đồng bộ lịch sang hub giữa các quán. Hai việc này giờ chỉ chạy khi quản lý mở app hoặc trình kích hoạt 5 phút.
- **Giữ trình kích hoạt 5 phút** khi có nhân viên đăng ký nhận thư (trước đây tắt thư quản lý là xoá luôn trình kích hoạt → thư nhân viên chỉ đi khi có người mở app).
- **Mở bằng link riêng:** không đọc sheet mã PIN (chỉ màn đăng nhập cần).
- **Đo tốc độ:** ⚙ của nhân viên hiện "Lần mở gần nhất: trang · chờ máy chủ (xử lý) · tổng" để biết chậm ở đâu.
- Test: v27att 11 (thêm mã SBA1 khung 0), v17ui 31 với trang máy quét bản CŨ + mã mới, v16ui 38/39 (chỉ còn kiểm tra "đếm ngược 30 giây" — đã bỏ vì mã cố định), v20api 77, v22api 33, v24api 44, v25api 13, v25cc 11, v26pay 19, v26mail 20, v27hc 9, v27ord 4, v26ui_pay 38, hcui 25.

## v2026.10.16.5 — Tốc độ mở link nhân viên (bước 1, tiếp)

- **Đọc dữ liệu tháng nhanh hơn khi bộ nhớ đệm chưa có:** quét cột khoá một lần, mỗi khoá đúng một lượt đọc ô. Trong bộ giả lập, lượt đọc bảng khi mở một tháng giảm từ 62 xuống 14.
- Số đo bạn báo: khoảng 4 giây tới màn hình chào, khoảng 10 giây tới khi lịch hiện. Phần 6 giây sau chào là lượt đọc bảng của máy chủ; bản này giảm phần đó nhưng chưa đo được trên Apps Script thật.
- Phần 4 giây đầu (trang HTML 1,9 MB và khởi động máy chủ) chưa xử lý.

## v2026.10.16.4 — Tốc độ mở link nhân viên (bước 1)

- **Giảm số lần tra cứu bảng tính trong mỗi lượt gọi.** Trước đây mỗi lần mở tháng gọi lại `getActiveSpreadsheet()` khoảng 33 lần; nay chỉ gọi một lần cho cả lượt chạy. Đo trong bộ giả lập: 33 → 1 lần mỗi lần mở tháng. Chưa đo được thời gian thật trên Apps Script.
- **Chưa xử lý (nguyên nhân chính còn lại):** trang HTML nặng khoảng 1,9 MB (1,4 MB mã JS, 0,33 MB CSS), gồm cả phần của quản lý mà nhân viên không dùng. Đây là lý do màn hình trắng khoảng 4 giây trong video.
- Test: v20api 77, v22api 33, v24api 44, v25api 13, v26pay 19, v26mail 20, v27att 8, v27hc 9, v27ord 4 — đều đạt.

## v2026.10.16.3 — QR điểm danh cố định · thứ tự kiểm kho · dự tính doanh thu rau

- **QR điểm danh cá nhân cố định theo mã nhân viên** (SBA2). Mã không còn đổi mỗi 30 giây nên in ra dán được. Mã cũ SBA1 vẫn đọc được trong thời gian chuyển đổi.
  - Đánh đổi: ai có ảnh hoặc bản in của mã đều điểm danh được cho người đó. Giữ bản in ở nơi an toàn; mất thì quản lý bấm cấp lại khoá (mã cũ hết hiệu lực ngay).
- **Bật "QR quét" (máy quán đọc mã nhân viên) thì điện thoại nhân viên hiện mã cá nhân**, không còn hiện mã của quán. Trước đây khi cả hai cách cùng bật, điện thoại vẫn bị đưa sang bước "quét QR của quán".
- **Thứ tự kiểm kho tách khỏi thứ tự danh sách đặt hàng.** Trong ⚙ Cài đặt → Đặt hàng, bấm ▲▼ để đổi chỗ món trong cùng khu (theo vị trí tủ lạnh). Danh sách đặt hàng và bản chép để gửi nhà cung cấp luôn theo thứ tự của hệ thống đặt hàng.
- **Món theo doanh thu không còn tự gán 5 man (¥50.000/đơn vị).** Món mới chuyển sang "Doanh thu" mà chưa nhập ¥ thì để ô trống và báo nhập; nếu lưu vẫn để 0 thì món thành nhập tay. Món đã lưu sẵn 50.000 vẫn giữ nguyên, cần kiểm tra lại từng món.
- **Dự tính doanh thu hiển thị từng ngày** (chỉ quản lý thấy): mỗi ngày trong khoảng dự tính ghi rõ dùng 予算 hay mặc định theo thứ. Ví dụ đặt rau thứ Sáu → Fri + Sat + Sun. Nếu T7 và CN chưa nhập 予算 thì mỗi ngày lấy mặc định theo thứ (ô "Doanh thu dự kiến (mặc định theo thứ)"), nên 55 man × 2 = 110 man.
- Test mới: v27hc (9), v27att (8), v27ord (4). Đã chạy lại: v20api 77, v22api 33, v24api 44, v25api 13, v25cc 11, v25po 3, v26mail 20, v26pay 19, v26ui_pay 38, hcui 25, v17ui 31 (kiosk camera).
- Không chạy lại được v24ui (phiếu lương): kịch bản cũ chưa có bước đặt mật khẩu lần đầu, đã có bản v26ui_pay thay thế.

## v2026.10.16.2 — Thư đổi ca / đổi lịch theo người · icon 初 · mật khẩu phiếu lương

- **Thư nhờ đổi ca chỉ đến người được nhờ** (người được chọn hoặc được ghép). Không còn gửi cho cả tiệm khi bấm "Tìm người đổi ca". Nhờ đổi ca gửi NGAY, không chờ lượt 5 phút.
- **Thư đổi lịch chỉ đến người có ca bị sửa**, ghi rõ ngày: ca cũ → ca mới. Sửa nhiều lần trong 30 phút được gộp; thư gửi trễ 30 phút.
- **Công bố lần đầu của từng nửa tháng** (1–15, 16–cuối) gửi cho cả nhóm, chỉ các ngày mới công bố. Công bố lại không đổi gì thì không gửi thư.
- **Icon 初 cho nhân viên mới:** bấm ⋯ → ⏱ (hộp sức chứa) → tick "Nhân viên mới". Trong bản in lịch, tên được gắn 初 trước; bật/tắt ở tuỳ chọn xem trước bản in ("Đánh dấu 初 cho nhân viên mới").
- **Mật khẩu phiếu lương:** lần đầu mở phiếu lương, nhân viên tự đặt mật khẩu 4–8 chữ số kèm lời giải thích bảo mật. Mở lại phải nhập đúng; sai nhiều lần thì bị khoá tạm. Khoá tự hết sau 10 phút không dùng. Quản lý có nút 🔐 đặt lại khi nhân viên quên.
  - Giới hạn: quản lý xem được phiếu lương mà không cần mật khẩu (để đối chiếu lương); chủ tài khoản Google vẫn đọc được dữ liệu trong bảng tính.
- Test mới: v26mail (20), v26pay (19). Đã cập nhật v24api (mật khẩu phiếu lương) và v24ui (hộp đặt mật khẩu lần đầu).

# App xếp ca SUBWAY — tóm tắt yêu cầu

> Dán nguyên file này vào đầu cuộc trò chuyện mới để khỏi giải thích lại từ đầu.

## Bối cảnh

Quán SUBWAY ở Tokoname, Aichi. Khoảng 20 nhân viên, gồm cả nhân viên chính thức
(ăn lương tháng) và baito/SA, trong đó có du học sinh bị giới hạn 28 giờ/tuần.
Ngôn ngữ làm việc: tiếng Việt. Giao diện app có 3 thứ tiếng: Việt / Anh / Nhật.

**Nhân viên KHÔNG có tài khoản Google, chỉ quản lý có.** Đây là gốc rễ của toàn
bộ kiến trúc: app buộc phải deploy ở chế độ ẩn danh, nên không dùng được email
Google để nhận diện người dùng.

## Kỹ thuật

- Google Apps Script Web App, đúng 2 file: `Code.gs` và file HTML tên `Index`.
- Deploy: **Execute as Me** + **Who has access: Anyone** (bắt buộc).
- Sửa code thì vào **Triển khai → Quản lý bản triển khai → bút chì → Phiên bản:
  Mới**. Tuyệt đối không bấm "Bản triển khai mới" — link sẽ đổi và mọi mã QR,
  biểu tượng màn hình chính, link lịch .ics đã phát đều hỏng.
- Dữ liệu nằm trong Google Sheet: sheet `KV` (khoá | phạm vi | giá trị) và sheet
  `Pins`. Mật khẩu quản lý mặc định `subway1111` (chỉ dùng khi chưa từng đổi), đổi trong app.

### Bẫy đã dính, đừng lặp lại

- **Luật CSS theo mẫu giao diện viết dạng `html:not([data-skin="classic"]) .x`** (khối v.5 đã được bọc
  tự động). Bộ sinh chế độ tối gắn `[data-theme="dark"]` thẳng vào `html` cho các luật bắt đầu bằng
  `html…` — đừng viết `:root` trong khối mẫu (biến tối sẽ bị biến sáng đè vì cùng độ ưu tiên); biến tối
  của mẫu hiện đại nằm ở khối `html[data-theme="dark"]:not([data-skin="classic"])`.
- **Mẫu "Cổ điển" (classic) không đổi emoji** — bộ đổi emoji tự bỏ qua khi `data-skin="classic"`.
- **Không đặt `opacity` / `transform` / `filter` lên cả DÒNG nhân viên (`.emp-row`).** Nó tạo lớp
  xếp chồng riêng, nên bảng sửa của dòng (`.row-panel`, `position:fixed`) bị nền mờ `#sheetBack`
  (điện thoại) hoặc thẻ bên phải (máy tính) che mất: bảng trông mờ như trong suốt và bấm vào không
  ăn — người dùng thấy "bấm tên là treo" (lỗi `.emp-row.is-locked{opacity:.92}`, sửa ở v.4).
  Muốn làm mờ thì làm mờ các con, trừ `.row-panel`.
- **Emoji không viết thẳng vào giao diện nữa cũng được**: một bộ đổi tự động (MutationObserver ở
  đầu `<body>`) thay mọi emoji trong chữ bằng biểu tượng nét đơn SVG (`window.UI_IC`). Emoji mới
  chưa có trong bảng `MAP` thì vẫn hiện emoji — thêm vào `MAP` + `P`. Emoji vẫn còn trong
  `textContent` (thẻ `<desc>`), nên các phép kiểm tra theo chữ vẫn chạy.

- **Biến nhớ trong một lượt chạy (vd. `CLOSE_DEF_`, `EMPVER_`, `DEV_`) phải được làm mới khi chính
  lượt đó ghi** — Apps Script mỗi lần gọi là một lượt mới, nhưng bộ giả lập chạy liên tục.
- **Ngày "hôm nay" phía máy khách phải theo giờ Nhật và tự làm mới** (`jstNow`, `refreshToday`).
- **Viên nền `.seg-ind` phải gắn ở CUỐI nhóm nút** (appendChild): gắn đầu làm lệch
  `button:nth-child(n)`. Và đừng viết chú thích `//` giữa dòng code đã nối — từng làm vỡ cả
  trang (lỗi cú pháp) ở v.6 trước khi giao.
- **Không bao giờ `focus()` lại một `<select>` sau khi vẽ lại** — trên iPhone focus là bật
  bảng chọn, người dùng đang lướt sẽ chọn nhầm (lỗi "tên nhảy liên tục", 10/2026).
- **Bộ nhớ trình duyệt (localStorage) trên iPhone mất mỗi lần đóng app** vì trang Apps Script
  chạy trong iframe bên thứ ba (Safari: bộ nhớ bên thứ ba là tạm thời). Cái gì cần nhớ lâu trên
  iPhone phải nằm trên địa chỉ trang (`google.script.history`) hoặc trên máy chủ.
- **Google Sheets tối đa 50.000 ký tự MỘT Ô.** Cả tháng lịch của quán 20 người
  khai kín đã 60–67 nghìn ký tự, có tăng ca hơn 100 nghìn. Ghi vào một ô là
  Google từ chối, lưu thất bại, thay đổi mất luôn (đo được 101/620 lần thất bại
  khi tháng đầy). Nay mọi giá trị dài được chia qua `writeCellValue_` /
  `readCellValue_` thành nhiều ô liền nhau từ cột C, mỗi mẩu có dấu `~` đầu để
  Sheets không hiểu nhầm thành công thức hay số. **Tuyệt đối không đọc/ghi thẳng
  `getRange(row, 3).setValue()` ở sheet KV nữa**, phải đi qua hai hàm đó.
- **CacheService tối đa 100KB một giá trị.** `kvGet_` từng gọi thẳng
  `cache.put`, nên tháng nào to quá thì chỉ việc MỞ ra cũng ném lỗi
  "Argument too large". Luôn đi qua `putCacheSafe_`.
- Bộ giả lập trong `harness.js` nay chặn đúng cả hai giới hạn trên. Thêm dịch vụ
  Apps Script mới thì phải giả lập đúng giới hạn thật của nó, không thì lỗi
  chỉ lộ ra khi đã chạy thật.

- `HtmlOutput.addMetaTag()` **chỉ nhận 4 tên**: `viewport`,
  `apple-mobile-web-app-capable`, `mobile-web-app-capable`,
  `google-site-verification`. Tên khác là `doGet` ném lỗi và cả app không mở được.
- `LockService` không tái nhập được — gọi `waitLock` bên trong đoạn đã giữ lock
  là kẹt cứng. `kvGet_`/`kvSet_` đã tự giữ lock rồi, nên hàm nào dùng chúng thì
  TUYỆT ĐỐI không tự giữ lock thêm ở ngoài (đã dính một lần ở `saveMyWindow`).
- **Đăng ký của nhân viên và lịch xếp của quản lý từng dùng chung một ô**
  (`schedule:<tháng>`). Xếp nháp xong là không còn biết giờ nào nhân viên đăng
  ký, giờ nào do xếp mà ra. Vá tạm bằng `requests.win` vẫn chưa đủ. **Nay tách
  hẳn hai ô:** `wish:<tháng>` = đăng ký (nhân viên ghi, máy xếp CHỈ ĐỌC),
  `schedule:<tháng>` = lịch xếp (CHỈ QUẢN LÝ ghi — `saveShiftEntry`,
  `saveShiftEntriesForEmployee` giờ đòi quyền quản lý). Cùng định dạng nên chép
  qua lại nguyên vẹn. Đụng vào phần này thì phải chạy lại `decl.js`.
- Chuyển dữ liệu cũ sang ô đăng ký: tháng chưa có `wish` thì dựng MỘT lần từ
  `requests.win` (khớp giờ thì lấy nguyên ca cũ, giữ ca tách đôi) và
  `requests.type = unavailable` (thành nghỉ). KHÔNG lấy ca không có lời khai
  (đó là ca máy/quản lý đặt) và ca đã ghim. Luôn ghi ô `wish` ra kể cả rỗng —
  nếu không, tháng mới tinh mà quản lý xếp trước thì lần mở sau sẽ kéo ca của
  quản lý sang làm đăng ký. `requests.win` giờ chỉ còn là dữ liệu cũ để đọc.
- Nút **Lưu cài đặt quán** từng dựng một object settings MỚI TOANH rồi gửi đi,
  nên mỗi lần lưu là xoá sạch giờ cao điểm, giờ vắng khách, ca chuẩn, nghỉ giữa
  ca, ngày nghỉ tuần. Nay nó chép từ `state.settings` rồi chỉ ghi đè mấy ô trên
  form. Thêm trường settings mới thì phải nhớ chuyện này.
- Định nghĩa "người chuyên trách" = **có nhãn này mà không có nhãn kia** là SAI:
  nó phạt đúng người giỏi nhất (ai làm được cả mở lẫn đóng bị coi là không
  chuyên), ca rơi vào tay người chỉ biết một việc và người đó ôm 174 giờ trong
  khi người khác 76 giờ. Cách đúng: đếm số lần đã làm việc đó trong tháng.
- **Đã thử và BỎ: vòng cắt tỉa giờ thừa.** Ý tưởng là co bớt hai đầu những ca
  chạy trong khung đã dư người. Đo lần đầu thấy tiết kiệm 73 giờ/tháng, nhưng
  hoá ra nó tiết kiệm bằng cách phá chính những thứ vừa đặt ra: ca chuẩn tụt từ
  108 xuống 70, baito 6 tiếng từ 81% xuống 18%, giờ nghỉ bật khỏi khung vắng
  khách. Chặn đủ để không phá nữa thì nó tiết kiệm đúng 0 giờ. Đừng làm lại —
  muốn giảm giờ công thì hạ ĐỊNH MỨC NGƯỜI ở tab Cài đặt, đó mới là đúng chỗ.
- `.modal-box` phải có `max-height` + `overflow-y:auto`, nếu không hộp thoại dài
  hơn màn hình là bị cắt mất phần dưới mà nền phía sau cũng không cuộn được.
- `HOUR_MIN` / `HOUR_MAX` giờ đổi THEO NGÀY ĐANG XEM (nới theo ca ✈). Mã không thuộc bàn xếp ca
  (in, đếm thiếu người, máy xếp lịch…) phải dùng `OPEN_HOUR` / `closeHourFor(d)`, đừng đọc `HOUR_MIN`.
- Khung app (màn biểu tượng) nằm ngoài `#app`: mọi lần vẽ lại phải dọn khung + lớp `app-open` +
  phím Esc (`teardownApp`), nếu không trang bị khoá cuộn hoặc Esc bị nuốt.
- Bộ giả lập trong `harness.js` có DANH SÁCH HÀM riêng ở cuối file. Thêm hàm mới
  vào `Code.gs` mà quên đăng ký vào đó thì phép kiểm tra "chặn được người lạ" sẽ
  đỗ oan — nó chặn vì hàm không tồn tại, chứ không phải vì kiểm tra quyền.
- `CacheService` giới hạn 100KB mỗi giá trị.
- Khung iframe của HtmlService chặn `alert`/`confirm`/`prompt` và chặn tải file.
- Link dạng `/a/macros/fz.subway.jp/...` gắn với tài khoản Workspace; dạng dùng
  chung cho mọi người là `script.google.com/macros/s/<ID>/exec`.
- Phép kiểm tra "ổn định là chính" cho ca MỞ cửa từng đạt nhờ chính cái lỗi
  dùng chung ô: xếp lại từ đầu lấy lịch nháp lần trước làm "lời khai", nên kết
  quả tự lặp lại. Tách ô xong thì lộ ra mức 2 gần như không có tác dụng với ca
  mở (40% so với 37%). Đã sửa thật: ở mức 2, nấc đầu của vòng chốt mở/đóng cửa
  nới lên 1.3 lần phần của mình (trước là 1.0) → 50% so với 37%.

## Ràng buộc bất di bất dịch

1. **Không lưu 時給 / lương vào Sheet.**
2. **予算 không gửi xuống máy nhân viên** — server chỉ trả cho quản lý. Nó vẫn
   in lên bảng dán trong quán.
3. **Danh sách người đổi ca chỉ hiện tên + khả năng nhận ca**, không có số điện
   thoại, LINE ID hay bất kỳ thông tin liên hệ nào.
4. Mật khẩu quản lý và PIN nhân viên đều băm SHA-256 kèm salt riêng; hash mật
   khẩu nằm trong Script Properties, **không nằm trong Sheet**.
5. **Ai có link đều mở được app và xem được danh sách tên + lịch.** PIN chỉ bảo
   vệ quyền GHI. Đây là đánh đổi bắt buộc và đã được chấp nhận.
6. Tuân thủ 労働基準法: điều 34 (luật: quá 6 tiếng nghỉ 45 phút, quá 8 tiếng nghỉ
   1 tiếng; CHUẨN QUÁN: quá 6 tiếng nghỉ tròn 1 tiếng — vẫn đúng luật, khớp bước 30
   phút, không còn khung 45 phút lẻ. Bấm thêm nghỉ trên ca ngắn thì 30 phút.),
   điều 35 (mỗi tuần ít nhất 1 ngày nghỉ). Trần 28 giờ/tuần cho du
   học sinh.

## Tính năng đã có

**Đăng nhập** — quản lý dùng mật khẩu, nhân viên dùng PIN tự đặt lần đầu. Token
ký HMAC, hạn 12 giờ.

**Xếp ca** — 3 tab (Ngày / Tháng / Cài đặt). Thanh kéo giờ, giờ nghỉ giải lao,
biểu đồ số người theo khung giờ so với định mức, chấm trạng thái trên dải ngày,
chốt lịch tháng, hoàn tác, sao chép tháng trước.

**Tự xếp lịch nháp** — chạy trên máy quản lý, xem thử trước rồi mới lưu. Đọc
đăng ký, chỉ viết ra lịch xếp. Ba chế độ: *Chỉ điền chỗ trống*, *Xếp lại từ
đầu theo đăng ký* (giữ ca ghim), *Chép nguyên đăng ký* (lịch xếp = đúng y đăng
ký, bỏ ca lạc, giữ ca ghim; chạy xong có thể "Chỉ điền" để lấp chỗ thiếu). Cả
ba đều theo phạm vi cả tháng / nửa đầu / nửa sau. Nút khoá của nhân viên nay
nghĩa là "xếp tôi đúng y đăng ký" — máy không thêm không bớt.

Cách làm giống hệt lúc xếp tay: chốt người đóng cửa cho cả tháng trước (việc
khó nhất, ít người làm được), rồi người mở cửa, rồi mới lấp dần khung giờ còn
thiếu, cuối cùng rà lại vá chỗ nào còn hở. Ai đóng cửa là ràng buộc CỨNG, xếp
bằng vòng riêng chứ không bằng điểm thưởng cao — điểm thưởng vẫn bị bộ lọc
phía trước loại mất.

Ràng buộc bắt buộc: định mức người theo khung giờ, khung giờ nhân viên đã khai,
**khung giờ cố định theo thứ của từng người**, sàn/trần giờ tháng từng người,
trần giờ tuần, nghỉ giữa hai ca (mặc định 11 tiếng), mỗi tuần một ngày nghỉ,
tối đa ngày làm liên tiếp (đếm cả hai phía), giờ nghỉ đúng luật, người mới
không bao giờ đứng ca thiếu người kèm.

Luật chia giờ: chưa ai đủ phần của mình thì chưa ai được lấy thêm — nếu không,
vài người làm được việc khó sẽ vơ hết ca dài của cả tháng (đo được 174 giờ
trong khi người khác 54 giờ). Vòng vá cuối cùng được phép phá luật này, vì
thiếu người trong quán còn tệ hơn.

**Định mức người theo TỪNG THỨ + ngày lễ** — bảng ở tab Cài đặt có 8 dòng:
T2 · T3 · T4 · T5 · T6 · T7 · CN · Ngày lễ, mỗi dòng 13 khung giờ. Mỗi dòng có
ô "chép từ…" để lấy nguyên dòng thứ khác sang, khỏi gõ lại 13 ô.

App **tự biết ngày lễ Nhật** (国民の祝日に関する法律, đúng 2000–2099): 16 ngày lễ
cố định và theo thứ, hai ngày 春分/秋分 tính bằng công thức thiên văn, cộng
振替休日 (lễ rơi Chủ nhật thì hôm sau nghỉ bù) và 国民の休日 (ngày thường kẹp giữa
hai ngày lễ). Ở tab Ngày có nút 🎌 để tự đánh dấu thêm ngày đặc biệt của quán,
hoặc bỏ đánh dấu nếu hôm đó quán chạy như ngày thường; bỏ ghi đè thì quay về
cho app tự đoán.

Dữ liệu cũ 3 dòng (ngày thường / T7 / CN) tự chuyển sang: T2–T6 lấy "ngày
thường", T7 lấy T7, CN lấy CN, Ngày lễ lấy theo CN.

**Xếp theo nửa tháng** — hộp thoại có 3 lựa chọn phạm vi: cả tháng · nửa đầu
(1–15) · nửa sau (16–cuối), hợp với kiểu nhận đăng ký 前半/後半. Xếp nửa nào thì
chỉ đụng nửa đó, nửa kia giữ nguyên từng ca. Mức giờ hợp lý của mỗi người được
tính theo nhu cầu của nửa đang xếp, sàn giờ tháng chia theo tỉ lệ số ngày — nếu
không thì nửa đầu vét sạch 150 giờ của cả tháng. Nghỉ 11 tiếng vẫn được tôn
trọng khi vắt qua ranh giới ngày 15 sang 16.

Tuỳ chọn trong "Tinh chỉnh nâng cao": xếp ngày khó trước, giờ cao điểm (hai
khung tự đặt, lưu vào Cài đặt của quán), mức ưu tiên giờ cao điểm, cao điểm
ưu tiên người cứng tay, chuộng ca tròn giờ, tránh để lại khoảng trống lẻ, mức
chia đều giờ, giờ vắng khách, **ca chuẩn của quán**, **chuộng độ dài ca mỗi
người thích**, **giữ ổn định người mở/đóng cửa (3 mức, mặc định tắt)**.

**Khoá và ghim** — nhân viên có nút khoá lịch tháng của mình: máy xếp nháp
không thêm, bớt hay đổi ca nào của họ kể cả chế độ xếp lại từ đầu; quản lý vẫn
sửa được nhưng bị hỏi lại một câu. Quản lý có nút 📌 ghim từng ca: ca đã ghim
máy không đụng tới.

**Ca chuẩn** — khai danh sách khung giờ quán hay dùng (tối đa 8). Có khai thì
bộ xếp lịch CHỈ thử những khung đó, ai không khung nào vừa mới quay về thử tự
do. Thưởng điểm thôi không ăn thua: ca 8 tiếng luôn phủ nhiều giờ hơn nên lúc
nào cũng thắng ca chuẩn 6 tiếng (đo được 1/153 ca trúng khung chuẩn).

**Khung giờ riêng theo thứ** — mỗi người đặt được từng thứ trong tuần chỉ làm
được từ mấy giờ đến mấy giờ, ví dụ du học sinh Hai–Sáu chỉ làm sau 17:00 vì có
lớp, Bảy/CN cả ngày. Có nút "áp cho cả tuần" để đỡ điền. Đây là ràng buộc CỨNG,
không liên quan tới nút "khung giờ đã khai" — tắt nút kia cũng không cho phép
xếp ra ngoài khung này.

Hai đường vào, chung một hộp thoại: quản lý bấm nút 🕐 trên thẻ tên ở tab Cài
đặt, nhân viên bấm nút "Giờ cố định" trên màn hình của mình. Ba nút tắt của nhân
viên (Rảnh cả tháng · Nhiều ngày · Giờ cố định) nằm cùng một hàng, nhãn ngắn;
khung giờ đã khai in ở dòng riêng ngay dưới. Nhân viên
lưu qua `saveMyWindow` — server chỉ cho sửa của chính mình, và hàm đó chỉ động
vào đúng trường khung giờ nên nhân viên không đổi được trần giờ hay xoá tên ai.

**Giờ nghỉ giải lao** — không bao giờ rơi vào giờ cao điểm (phạt nặng gấp trăm
lần mọi khoản khác, chỉ khi cả ca nằm gọn trong cao điểm mới đành chọn chỗ chạm
ít nhất). Ưu tiên khung **giờ vắng khách** khai ở Tinh chỉnh nâng cao, sau đó
mới tới lúc dư người, cuối cùng mới tới gần giữa ca. Bộ xếp nháp và bảng khai
nhiều ngày dùng chung một luật nên ra kết quả giống nhau.

**Hai ô riêng: ĐĂNG KÝ và CA ĐƯỢC XẾP.** Màn nhân viên có ô "✏️ Đăng ký của
tôi" (sửa được) và ngay dưới là ô "📋 Ca được xếp hôm nay" (chỉ xem, ghi "nháp —
còn đổi" hoặc "đã chốt", báo khi khác giờ đăng ký). Cuối trang hai danh sách
tháng riêng, dòng tổng giờ ghi cả hai ("đăng ký 25h · được xếp 18h"). Ca kế
tiếp lấy theo lịch xếp. Màn quản lý: mỗi dòng có "Đăng ký: 09:00–14:00" (✓ nếu
trùng), vạch nền xanh nhạt trên thanh giờ là giờ đăng ký thật; bảng ứng viên có
nhóm đầu "Đã đăng ký giờ", bấm là vào ca đúng giờ đã đăng ký.

**Nhân viên đăng ký** — thanh kéo giờ cho từng ngày, một ô ghi chú tự do,
và bảng **khai nhiều ngày một lúc** với hai chế độ. Tất cả ghi vào ô đăng ký.

Ba chip rảnh/trao đổi/nghỉ từng nằm trong dòng ca đã BỎ vì trùng với hàng nút
tắt. Ô ghi chú thì giữ — đó là chỗ duy nhất nhân viên nhắn được những câu kiểu
"14時以降なら大丈夫です". Xoá trắng ghi chú thì dòng yêu cầu rỗng cũng được dọn
theo, không để rác lại trong Sheet.

Hai chế độ của bảng khai nhiều ngày:
*Khai giờ làm* — bấm tên thứ chọn hết ngày thuộc thứ đó rồi bấm từng ngày để bỏ
ngoại lệ, có **ca hay dùng** lưu sẵn và tuỳ chọn "đến giờ đóng cửa (L)" bám theo
giờ đóng cửa của từng ngày.
*Báo nghỉ* — chọn ngày rồi báo nghỉ hàng loạt, giờ đăng ký cũ trong những ngày đó bị thay bằng nghỉ.
Khỏi phải bấm ra bấm vào từng ngày.

**Xoá cả tháng để khai lại** — nút chữ đỏ cuối khối "Đăng ký của tôi". Hỏi lại kèm
số ngày sẽ xoá; xoá hết giờ đăng ký, ngày nghỉ, ghi chú của người đó trong
tháng (`clearMyMonth`, một lượt khoá). KHÔNG đụng lịch quản lý đã xếp. Có thanh
"Hoàn tác" lấy lại ngay; ngoài ra luôn chụp vào History nên quản lý vẫn khôi
phục được. Bị chặn khi quản lý đã chốt tháng hoặc nhân viên đang tự khoá tháng.

**Đổi ca sau khi chốt** — nhân viên thấy ai đã báo rảnh mà chưa được xếp, tự
liên hệ, chốt xong thì quản lý thấy cờ.

**In lịch** — giống bảng giấy đang dùng. 予算 ở góc phải đầu mỗi ngày (đơn vị
万, ví dụ 21万), ghi chú/dặn dò ở góc trái hàng dưới cùng, bên phải là SA時間 /
オーナー・社員時間 / số người lúc 12 giờ. Giờ đóng cửa "L" chỉnh được từng ngày.

**Phát cho nhân viên** — mã QR tự dựng trong app (không gọi dịch vụ ngoài), tờ
A4 in dán phòng nghỉ, hướng dẫn thêm vào màn hình chính, và link lịch cá nhân
.ics đổ ca làm vào app Lịch sẵn có của điện thoại (thu hồi được).

**Sao lưu — ba lớp độc lập** (tab Cài đặt → Sao lưu & khôi phục):
1. *Lịch sử phiên bản* — trước khi đè lịch, đăng ký, danh sách nhân viên, cài
   đặt, 予算/ghi chú, khoá tháng, đổi ca: bản cũ được chụp vào sheet `History`
   trong cùng file. Mỗi loại giữ 40 bản. Sửa liên tục thì 10 phút mới chụp một
   bản; thao tác lớn (ghi cả tháng, sửa danh sách, xoá nhân viên, khôi phục)
   thì luôn chụp. Mỗi bản có mã riêng (mốc thời gian + đuôi ngẫu nhiên) — chỉ
   dùng mốc thời gian thì hai bản cùng mili giây trùng mã, khôi phục lấy nhầm.
   Khôi phục luôn chụp bản hiện tại TRƯỚC, nên khôi phục nhầm vẫn quay lại được.
   Không bao giờ chụp thứ liên quan mật khẩu/PIN.
2. *Bản sao nguyên file* — mỗi ngày 3 giờ sáng sao cả file sang thư mục
   "SUBWAY シフト — sao lưu" trong Drive, giữ 30 bản. Sống sót kể cả khi file
   chính bị xoá hay sửa tay hỏng. `runDailyBackup` không có dấu `_` nên ai
   cũng gọi được qua google.script.run — tự giới hạn 20 giờ một lần.
3. *Bấm tay* "Sao lưu ngay" (chặn bấm liên tục: 5 phút một lần).

Sao lưu hỏng thì KHÔNG được làm hỏng việc lưu chính — mọi bước đều bọc
try/catch. Cần chạy `authorizeBackup` một lần trong trình soạn thảo Apps Script
để Google cấp quyền Drive và quyền đặt lịch chạy.

**Xuất giờ công** — tạo Google Sheet trong Drive của quản lý, 2 trang: 月次集計
(theo người, tách SA/社員, giờ từng tuần) và 日別 (từng ca một dòng).

**Tốc độ** — lưu ngầm ở nền nên bấm là thấy ngay, hỏng thì tự hoàn tác và báo;
đổi tháng không xoá trắng màn hình, có nhớ tạm và nạp sẵn tháng trước/sau; font
không chặn lúc vẽ trang; chỉnh riêng cho điện thoại (ô nhập 16px để iPhone
không tự phóng to, kéo thanh giờ không cướp thao tác cuộn).

**Gộp từ bản rút gọn (T9/2026)** — Có một bản Index.html bị rút gọn còn 1/4
(mất xếp nháp, khai nhiều ngày, cài đặt, sao lưu…, màn Ngày treo vì thiếu hàm,
nhãn tiếng Việt viết cứng nên sang tiếng Nhật bị loạn ngữ). KHÔNG dùng bản đó;
các ý mới trong nó được gộp vào bản đầy đủ:
- *Ca hỗ trợ tiệm khác (✈️ ヘルプ)* — tick trên từng ca. Vẫn tính giờ công,
  xuất bảng giờ công ghi 備考「ヘルプ + nơi đến」, vẫn vào lịch điện thoại của
  người đó (tiêu đề ヘルプ), in bảng có dấu ✈. KHÔNG đếm vào số người có mặt ở
  quán (biểu đồ, số người 12h, máy xếp nháp, người đóng/mở cửa).
- *Ghi chú từng ca* (tối đa 60 ký tự) — hiện trên dòng tóm tắt, bảng in, .ics.
- *Đến giờ đóng cửa (L) cho từng ca* — lưu cờ `endAtClose`. Giờ ra luôn bám
  giờ đóng cửa ngày đó: đổi giờ đóng cửa là ca tự đổi và lưu lại; kéo/nhập tay
  giờ ra thì bỏ cờ. Server (xuất giờ công, .ics) tự tính lại theo giờ đóng cửa.
- *Khung giờ cố định có ô NGÀY LỄ* (ô thứ 8, `win[7]`). Ngày lễ mà có ô này thì
  dùng nó, không thì theo thứ.
- *Chống đè giờ cố định* — `saveMyWindow` và `saveEmployees` đọc–sửa–ghi trọn
  trong một lượt khoá, đọc thẳng Sheet. Mỗi lần nhân viên sửa giờ cố định có
  `winAt`; quản lý lưu danh sách mà bản trong máy cũ hơn thì giữ giờ của nhân viên.
- *Danh sách đối chiếu một bảng* ở màn nhân viên: mỗi ngày một dòng Đăng ký |
  Được xếp, ✓ khớp / ≠ khác (tô cam) / chưa xếp. Mọi nhãn qua i18n.
- *Thẻ nhân viên gọn*: tên + loại + vài dấu nhỏ, mọi thao tác trong menu ⋯.
- *Nút ⚡ Xếp lịch nháp nổi* ở góc phải tab Tháng. Thông báo "đang lưu" ở góc
  dưới trái, toast đẩy lên trên để không đè nhau.
- *Bàn phím số thập phân* (`inputmode="decimal"`) cho mọi ô số.
- *Xếp nháp*: hai lượt lấp — lượt đầu chỉ nhân viên nòng cốt (社員 / chưa đủ sàn
  giờ), lượt sau mới tới baito; xếp NỬA ĐẦU thì trần giờ tháng chỉ dùng 60%.
- **ĐÃ ĐO, KHÔNG làm theo: phạt dư người -2.5/nửa tiếng.** bench.js: -0.35 và
  -0.5 → thừa 42h/tháng; -1 → thừa 39h nhưng thiếu 2 khung cao điểm; -1.5 và
  -2.5 → thừa 93h (phạt nặng quá thì vòng lấp bỏ cuộc, việc dồn sang vòng chốt
  mở/đóng cửa và vòng vá). Giữ -0.5. Vòng vá giờ cũng chọn ca dư người ít nhất.
- Kiểm tra `merge.js` soát loạn ngữ: bật tiếng Nhật và tiếng Anh, quét toàn bộ
  màn nhân viên, 3 tab quản lý và hộp thoại xếp nháp — không được còn chữ có dấu
  tiếng Việt nào (trừ dữ liệu người dùng tự gõ).

**Màn nhân viên chọn giờ trong vài giây** — ngay dưới dải ngày là hàng nút
bấm-là-lưu: *Nghỉ* · *Cả ngày* (giờ mở → L) · các **ca chuẩn của quán** (tab Cài
đặt → Ca chuẩn) · **ca hay dùng** của chính người đó · ✕ bỏ. Ca dài tự có nghỉ
1 tiếng. Thanh kéo vẫn ở đó cho giờ lẻ. Phần ít dùng (ghi chú ngày, giờ nghỉ,
ghi chú ca, (L), nhập số, ca phụ, bỏ đăng ký) gập vào "⚙ Tuỳ chỉnh thêm" — tự
mở nếu ngày đó đã có ghi chú hoặc ca phụ. Nhân viên KHÔNG có ô ✈️ hỗ trợ tiệm
khác (việc của quản lý). Nút khoá theo đăng ký dời xuống cuối, cạnh danh sách.
Danh sách tháng ghi **Xin | Xếp**: khớp ✓ xanh, lệch thì giờ xếp chữ đỏ.

**Bóng đăng ký (ghost bar)** trên thanh kéo của quản lý: viền nét đứt đúng
từng khúc giờ nhân viên đăng ký, nằm trên thanh nhưng không chặn kéo. Phần kéo
ra ngoài đăng ký tô đỏ. Người chưa đăng ký thì không có bóng, không chú thích,
không tô đỏ oan (bản cũ lấy "lần đầu nhìn thấy ca" làm mốc — sai, đã bỏ).

**Lỗi từ máy chủ theo ngôn ngữ** — server luôn báo lỗi tiếng Việt; client dịch
~20 lỗi hay gặp (sai PIN, sai mật khẩu, bận, đã chốt, hết phiên…) sang tiếng
Nhật/Anh. Lỗi lạ thì ghi "エラー: / Error:" + câu gốc. Nhận diện hết phiên dùng
câu gốc (`err.raw`), không dùng câu đã dịch.

**Từ điển** — 3 ngôn ngữ đủ cùng một bộ khoá (kiểm bằng script: không ngôn ngữ
nào thiếu khoá, không có t("…") nào gọi khoá không tồn tại, kể cả khoá ghép
dotHint_/tag_/autoRange_). Mặc định tiếng Việt, nhớ lựa chọn trên từng máy.

**Tổng giờ theo nửa tháng** — khối "Tổng giờ làm trong tháng" (tab Tháng) là
bảng 4 cột: Tên · 1–15 · 16–cuối · Cả tháng (kèm thanh), xếp giảm dần theo cả
tháng; cuối bảng có Tổng SA, Tổng chính thức, TỔNG CỘNG cho từng nửa. Ca hỗ
trợ tiệm khác vẫn tính giờ. Bảng giờ công xuất ra Sheet cũng có cột 前半 / 後半
/ 月合計.

**In / PDF lịch nửa tháng — gom thành 2 nút** ở tab Tháng: "🖨 In / PDF lịch nửa
đầu (1–15)" và "nửa sau (16–cuối)". Bấm là một hộp thoại: [✓] kèm bảng tổng ở
trang đầu, [✓] in kèm 予算 (đều bật sẵn, nhớ lựa chọn trong phiên), nút "🖨 In
ngay" và "📄 Tạo file PDF". Nút in cả tháng / công khai / PDF rời cũ đã bỏ.
- CÙNG MỘT đoạn HTML (`halfSheetHTML`) cho cả in lẫn PDF: in thì chèn vào trang
  rồi `window.print()`; PDF thì máy quản lý gửi trang HTML hoàn chỉnh lên
  `savePrintPdf`, máy chủ lọc bỏ script/sự kiện/ảnh ngoài, `getAs('application/pdf')`,
  cất vào Drive "SUBWAY シフト — PDF" (xuất lại cùng nửa thì bỏ bản cũ vào thùng
  rác). Không giữ hai mẫu song song nữa.
- Chỉ dùng bảng, màu nền đặc (`bgcolor` + style), kích thước mm/pt — không flex,
  không gradient — vì bộ đổi PDF của Google hiểu CSS hạn chế. Mỗi giờ chia 2 ô
  30 phút; trục giờ 8:00 → giờ đóng cửa muộn nhất trong nửa tháng.
- **Gói trong đúng 2 trang A4 ngang** (in 2 mặt = 1 tờ): các ngày chia vào 4
  cột (2 cột/trang), giữ thứ tự, chọn điểm chia để cột cao nhất thấp nhất; chiều
  cao dòng và cỡ chữ tự co (4.4mm → tối thiểu 2.2mm) cho vừa. Đã thử 12–14
  người/ngày, 15–16 ngày: vừa 2 trang. Có bảng tổng thì thêm đúng 1 trang đầu.
- Bảng tổng: tên × ngày ("9-17", "12-L", H = hỗ trợ tô vàng nhạt, 休/Nghỉ),
  cột giờ nửa tháng, hàng tổng giờ từng ngày, tổng SA / chính thức / tổng cộng,
  ghi chú các ngày. Hiện mọi 社員 và mọi người có ca/nghỉ trong nửa đó.
- **Ô vàng cho 社員**: nhân viên chính thức hôm đó không có ca mà cũng KHÔNG xin
  nghỉ (không đăng ký nghỉ, không có dòng yêu cầu "không thể đi làm") → ô tô
  vàng, chú thích kèm số ô. Quản lý tự đặt "nghỉ" mà người đó không xin cũng tô
  (để xem lại). Baito không bao giờ tô. Lưới tháng trong app tô cùng luật.
- Giao diện mẫu in (theo góp ý): **予算 ở góc trên bên trái** mỗi ngày, trong ô
  riêng thẳng cột tên (ngày không có 予算 vẫn giữ chỗ để các ngày thẳng hàng);
  ô tiêu đề cuối là 合計 — **số người 12h chỉ còn 1 chỗ** ở hàng dưới cùng (trước
  bị lặp ở cả tiêu đề); **ô tổng giờ căn giữa**; lưới giờ vẫn tô theo 30 phút
  nhưng **không kẻ đường giữa hai nửa giờ** — nhìn như 1 ô = 1 tiếng.
- Khi in, mọi thứ trên trang trừ `#pubSheet` đều ẩn (kể cả thông báo đang lưu).
  CSS mẫu in cũ theo px đã xoá hẳn — nó từng lọt vào bản in mới làm dòng cao ra,
  3 trang thành 5.

**Lỗi đã có từ trước, đã sửa:** `exportHours` ghi hàng tổng ngắn hơn hàng tiêu
đề — Sheet thật từ chối (`The number of columns in the data does not match`),
nên nút "Xuất giờ công" trên app thật luôn báo lỗi. Bộ giả lập giờ bắt lỗi này
(setValues đòi mọi hàng đủ cột, như Sheet thật).

**Lưới "Toàn bộ lịch tháng" 2 hàng/người** (tab Tháng) — hàng trên "Xin" = đăng
ký của nhân viên (`state.wish`, màu nhạt cùng tông người đó; Nghỉ đỏ, ◯ rảnh cả
ngày, △ trao đổi), BẤT BIẾN: xếp nháp, xếp lại, công khai đều không đụng. Hàng
dưới "Xếp" = lịch xếp (màu đậm), đổi theo khi sửa tay; đang xem thử nháp thì
hàng dưới là bản nháp, bỏ nháp là về như cũ. Ô xếp khác đăng ký có viền đỏ; ô
vàng = 社員 chưa có ca mà không xin nghỉ. Tên gộp 2 hàng, cột nhãn Xin/Xếp dính
bên trái khi cuộn ngang. Có chú thích dưới lưới. Bấm ô nào cũng mở ngày đó.

**Thuật toán xếp lịch nháp — bản 2 (theo 7 điều kiện của anh Lâm).** Thứ tự
máy xếp, bước trên chọn người trước:
1. Người có **giờ cố định**, theo mức ⭐ (0–3, đặt ở ⋯ → ⭐ Ưu tiên & đi lại):
   xếp đúng khung 🕐 hoặc giờ đăng ký. ⭐ cao trước; người xếp sau chỉ vào nếu
   ca còn lấp được chỗ thiếu (⭐2 ≥ 40% ca, ⭐1 ≥ 60%, ⭐3 cứ thiếu là vào).
2. **Người ít đi làm** (đăng ký ≤ N ngày/tháng, mặc định 6, tỉ lệ theo phạm vi
   xếp): xếp TRỌN ca đã xin, không bao giờ cắt/kéo. Chỗ nào vì vậy dư người thì
   cắt ca dài (> 6h) của người khác — kể cả người ⭐ — về 6h.
3. Người mở / đóng cửa (như cũ).
4. **Nhân viên chính thức đủ giờ**: lượt riêng cho chính thức, rồi bù (kéo dài
   ca / thêm ngày) cho tới sàn giờ; chưa đặt sàn thì lấy "giờ chuẩn chính thức"
   trong hộp thoại (mặc định 160h, không vượt trần tháng). Cuối cùng còn thiếu
   thì bù tiếp, chấp nhận dư tối đa 1 người trong giờ quán cần người.
5. Baito lấp phần còn lại (chia đều như cũ).
6. Vá chỗ thiếu: **ưu tiên kéo dài ca người đang làm** (trong giờ họ đăng ký)
   hơn là gọi thêm người làm ca vụn. Kéo dài chỉ khi phần thêm chủ yếu là giờ
   đang thiếu (không kéo ca 4h lên 8h để lấp 1h).
Sau cùng: cắt phần dư người ở đầu/cuối ca dài do máy xếp (không cắt ca ghim,
ca người khoá lịch, vai trò mở/đóng cửa, chính thức đang thiếu giờ, và chỉ cắt
người ⭐ vào ngày có người ít đi làm). Không bao giờ cắt về 6,5–7h.
- **Điểm ca đã trừ giờ nghỉ**: trước đây ca 7h được tính phủ đủ 7h nên máy
  chuộng ca lẻ; giờ chấm điểm trừ luôn 1h nghỉ (đặt vào chỗ ít thiệt nhất, tránh
  cao điểm).
- **Ca 6 tiếng** (chọn 3 mức): Không / Vừa (mặc định) / Mạnh. ĐÃ ĐO trên quán
  12 người: điểm cộng ca 6h = 2 → dư 0h, thiếu 0h (bản cũ dư 42h); = 2,5 → dư
  15h; = 3 (mức Mạnh) → dư 75h nhưng gấp 3 lần số ca 6h. Mọi mức trừ "Không"
  đều phạt nặng ca 6,5–7,49h.
- **Tiền đi lại** (円/ngày, ⋯ → ⭐): điểm trừ = tiền/1000 × 2 × mức (0/1/2) cho
  mỗi ca mới; kéo dài ca không tốn thêm tiền đi lại. Băng lịch nháp ghi tổng
  ước tính = số ngày đi làm × tiền/ngày. **Chỉ quản lý thấy**: `loadMonth` bỏ
  trường `travel` khỏi danh sách nhân viên gửi cho nhân viên. Lưu trong Sheet
  (không phải tiền lương).
- **Tách ca** (✂, chỉ chính thức, máy chủ tự bỏ cờ nếu là SA): thêm ca thứ hai
  cách ca đầu ≥ 2h, mỗi ca thêm ≤ 6h (không nghỉ), cả ngày ≤ 8h công, vẫn giữ
  nghỉ 11h giữa hai ngày. Chỉ tách khi thật sự lấp được chỗ thiếu.
- Hộp thoại chia 3 nhóm: ① Luật bắt buộc ② Thứ tự ưu tiên 1→6 (bật/tắt từng
  bước) ③ Cách chọn giờ; mỗi mục có một dòng giải thích. Băng lịch nháp liệt kê
  số ca giờ cố định / ca trọn / kéo dài / cắt bớt / tách ca / tiền đi lại.
- Trường nhân viên mới (Code.gs `saveEmployees`): `priority` 0–3, `travel`
  0–100000, `splitOk` (chỉ khi `type === 'staff'`).
- **Đánh đổi đã biết:** giữ đúng giờ cố định tốn người — kịch bản thử có người
  ⭐3 cố định 9–14 trong khi quán mở 8h: dư 116h/tháng so với 20h khi tắt bước 1
  (giờ 8–9 phải gọi thêm một ca 4h). Muốn bớt dư thì hạ mức ⭐ hoặc nới khung.

**Kế hoạch A / B / C + nhập lịch từ bảng cũ.** Ba ô lưu lịch xếp song song cho
mỗi tháng, để so sánh rồi chọn.
- Server: `plan:<A|B|C>:<YM>` giữ toàn bộ bản lịch, `planmeta:<YM>` giữ
  `{A:{at,name,stats}, …, active:"B"}` — nhẹ, `loadMonth` chỉ gửi phần meta và
  **chỉ gửi cho quản lý**. Hàm: `savePlan`, `getPlan`, `applyPlan`,
  `deletePlan`, tất cả `requireManager_`. `purgeEmployee` dọn cả `plan:`.
- Đổi kế hoạch = chép bản đó đè lên `schedule:<YM>`, có chụp `bak:` nên vẫn
  hoàn tác được một bước. **Không bao giờ đụng vào `wish:<YM>`** — yêu cầu của
  anh Lâm: "xin ca là bất biến". Bộ kiểm tra so chuỗi JSON của toàn bộ đăng ký
  trước/sau mỗi lần nhập, lưu, đổi, xoá kế hoạch.
- Lưu được cả bản NHÁP chưa chốt vào một ô (xếp thử → lưu thành A → xếp thử
  kiểu khác → lưu thành C → so sánh → chọn).
- Bảng so sánh: tổng giờ công, giờ thiếu, giờ dư, số người chưa đủ sàn giờ,
  tiền đi lại, số lượt đi làm, số ca 6 tiếng, ngày không ai đóng cửa được, giờ
  社員 / SA. Ô tốt nhất tô xanh, tệ nhất tô đỏ; bấm "Dùng A/B/C" ngay trong bảng.
- **Nhập từ bảng cũ** (nút 📥 trong tab Tháng): dán chữ copy từ Excel hoặc từ
  file PDF. `parseOldTable` hiểu hai dạng: khối theo ngày (氏名/出勤/退勤/休憩,
  có cả dòng "4 日 ラム休み" → ngày nghỉ) và mỗi dòng một ca
  (`ngày, tên, vào, ra, nghỉ`). Chấp nhận `L` = đến giờ đóng cửa, `9:30`, `9.5`,
  số full-width. Cột thứ ba sau giờ ra được đoán: bằng độ dài ca → không nghỉ;
  bằng độ dài ca − 1 → có nghỉ 1 tiếng, app tự đặt vào giờ vắng khách; nằm
  trong ca → chính là giờ bắt đầu nghỉ. Ca dài > 6 tiếng mà bảng cũ không ghi
  nghỉ thì nhập ĐÚNG như bảng cũ, app tự gắn cảnh báo thiếu giờ nghỉ.
- Ghép tên tự động (bỏ khoảng trắng, さん, hiragana↔katakana); tên nào không
  khớp thì chọn tay hoặc bỏ qua. Chọn nơi lưu: kế hoạch A/B/C (mặc định B) hoặc
  lịch đang dùng. Bảng ghi tháng khác tháng đang mở thì cảnh báo trước.
- Đã thử bằng chính file `シフト1-15` tháng 10 của quán: 83 ca, 15 người, 15
  ngày, mọi tên tự khớp, không phải sửa tay dòng nào.

**Nút import tự động (chọn thẳng file, không phải copy).**
- **.xlsx**: client đọc file thành base64 → `importSpreadsheetFile` trên máy chủ.
  Không cần bật dịch vụ nâng cao nào và KHÔNG lưu file ở đâu: .xlsx vốn là zip,
  `Utilities.unzip` mở ra, đọc `xl/worksheets/sheet1.xml` + `xl/sharedStrings.xml`
  bằng regex (XmlService dính namespace rất phiền), trả về chữ ngăn bằng Tab cho
  client hiểu y như khi dán tay. Ô giờ kiểu Excel (0,5 = 12:00) đổi về "12:00".
  Chặn: chỉ quản lý, file phải bắt đầu bằng "PK", tối đa 6MB và 4000 hàng; .xls
  đời cũ báo rõ là hãy lưu lại thành .xlsx.
- **.csv/.txt**: đọc ngay trong trình duyệt, thử UTF-8 rồi tới **Shift-JIS**
  (Excel tiếng Nhật hay lưu kiểu này — đã có bài kiểm tra bằng file Shift-JIS thật).
- **.pdf**: tải `pdf.js` từ cdnjs lúc cần, gom chữ theo toạ độ dòng rồi xếp trái
  → phải. Máy nào không tải được thư viện (mạng quán chặn) thì báo bằng tiếng
  người và vẫn dán tay được — đường dự phòng này có bài kiểm tra; đường chính
  KHÔNG thử được trong môi trường phát triển vì cdnjs bị chặn.
- Chọn file xong app tự sang thẳng bước ghép tên; kéo thả file vào hộp thoại
  cũng được. Bộ giả lập nay có `Utilities.unzip` thật (đọc bảng thư mục trung
  tâm của zip + inflateRaw) để bắt lỗi đọc .xlsx ngay trong lúc phát triển.

**Màn Ngày kiểu GỌN (bản 3).** Mỗi nhân viên đúng MỘT dòng ngang:
`[● tên ▾] [thanh kéo giờ] [08:00–16:00 · 7h]`, cao ~51px (có cảnh báo thì ~64px);
5 người gói trong 281px, trước đây phải cuộn.
- Mọi nút chức năng (nghỉ cả ngày, ghim, ghi chú ca, bỏ khỏi ngày, thêm giải
  lao, ✈️ hỗ trợ tiệm khác, đến L, nhập giờ bằng số, thêm ca phụ, sửa yêu cầu)
  nằm trong bảng gập, **bấm TÊN để mở**. `captureUI/restoreUI` nhớ dòng nào
  đang mở nên lưu xong trang không tụt.
- Vẫn thấy khi đóng: dòng `Đăng ký: …` của từng người, tóm tắt giờ bên phải
  (giờ nghỉ và ghi chú chuyển vào tooltip cho gọn), cảnh báo đỏ.
- **Một thước giờ dùng chung** (`.day-ruler`) đặt trên danh sách, các thanh kéo
  cùng lưới nên thẳng cột — trước mỗi dòng có thước riêng, rất tốn chỗ.
- **Dòng người nghỉ nằm trên cùng** (`offLineHTML`): gộp cả ba loại — đã đặt
  nghỉ trong lịch xếp (bấm mở được bảng thao tác), tự đăng ký nghỉ (希望休), và
  báo không đi làm được. Chip "không đi làm được" bỏ khỏi khối yêu cầu để không
  lặp hai chỗ.
- **Ca đi hỗ trợ tiệm khác**: thanh giờ đổi màu tím (`--sup`) và **ghi chú in
  thẳng lên thanh** (`.shift-tag`). Bấm vào nhãn là mở ô sửa ghi chú ngay, có
  sẵn nút bấm một phát cho 8 câu hay dùng (`settings.noteTpl`, chuẩn hoá ở
  `normalizeSettings_`).
- **Nút ⚡ Xếp nhanh ngày này** (tab Ngày): chạy đúng thuật toán với các tuỳ
  chọn đang cài nhưng chỉ cho MỘT ngày (`autoSchedule({onlyDay:d})`); ngày đó
  bỏ luật "đã đủ phần giờ tháng" vì việc cần làm là lấp cho xong ngày đó. Các
  ngày khác không đụng tới, đăng ký không đụng tới, vẫn hoàn tác được một bước.

**Đăng nhập.** Ô mật khẩu và ô PIN **tự bỏ dấu khi gõ** (telex gõ `as` ra `á`
làm sai mật khẩu hoài) — `deAccent` + bỏ khoảng trắng, kèm **nút 👁 xem lại**.
Hộp thoại đổi mật khẩu cũng bỏ dấu y như vậy, nếu không thì đặt mật khẩu có dấu
xong lần sau không vào lại được.

**Tab Tháng.** Bảng "giờ theo tuần" **mặc định gập**, nhớ trạng thái trong
`localStorage`. Bảng "tổng giờ làm trong tháng" riêng đã **bỏ hẳn**: giờ đã xếp
của từng người nằm ngay trong ô tên của lưới tháng (`1–15 | 16–cuối | tổng`),
và dưới lưới có một dòng tổng SA / chính thức / tất cả.

**Xoá nhanh ca làm (3 mức).** Dấu **×** hiện sẵn ở cuối mỗi dòng nhân viên —
bấm một phát là bỏ khỏi ngày, và thông báo kèm nút **Hoàn tác** (giữ lại bản
ghi trong bộ nhớ, bấm là trả về y như cũ). Nút **🧹 Xoá hết ca ngày này** cạnh
nút ⚡ (hỏi lại trước). Trong bảng thao tác của dòng có **Bỏ khỏi cả tháng**
cho người nghỉ việc / nghỉ dài. Cả ba đều không đụng vào đăng ký của nhân
viên, và hai cái sau vẫn hoàn tác được một bước (ghi qua `saveMonthSchedule`
nên có bản `bak:`).

**発注 / 納品 theo thứ.** Cài ở tab Cài đặt: bật/tắt cả mục, tích các thứ
(mặc định 発注 T2·T4·T5·T6·CN, 納品 T2·T3·T5·T6·T7). Hiện **ngay cạnh 予算**
trong ô ngày và **trên bảng lịch in/PDF** (ô `hd-bud`, nền xanh dương cho
発注, xanh lá cho 納品). Trùng ngày thì hiện cả hai. Bấm chip trong app là
**tắt riêng ngày đó** (ngày lễ không đặt hàng) — chip vẫn hiện nhưng mờ và
gạch ngang để còn bấm bật lại; danh sách ngày tắt nằm trong
`settings.orderOff / deliverOff` dạng `YYYY-MM-D`.

**Hộp nhắc nhở.** Khoá `memo:<YM>`, tối đa 60 mục/tháng, mỗi mục có loại
(予約 / món mới / đợt bán hàng / đào tạo / khác), tiêu đề, chi tiết và khoảng
ngày từ–đến. Quản lý thêm/sửa/xoá trong tab Ngày; **nhân viên cũng nhận được**
(loadMonth trả `memos` cho mọi người) và thấy các nhắc nhở của hôm đó cùng 7
ngày tới ngay đầu màn hình. `saveMemo/deleteMemo` là `requireManager_`.

**Máy học nhẹ — học từ chính cách quản lý sửa lịch.** Không phải mạng nơ-ron,
chỉ ĐẾM:
- Giữ lịch nháp → client cất bản nháp rút gọn (`saveLearnBase`, dạng
  `{ngày: {id: [vào, ra] | 0}}`).
- Bấm **Chốt lịch tháng** → so bản nháp với bản đã chốt, đếm theo TỪNG THỨ cho
  từng người: `keep` (giữ nguyên), `drop` (bị bỏ ra), `add` (được thêm vào),
  cùng tổng giờ vào/ra thật để tính trung bình → `learnFromMonth` cộng dồn vào
  `learn:store` (chặn trên mọi con số để một tháng lỗi không hỏng cả kho).
- Lần xếp sau: điểm cộng/trừ cho từng ca (`learnBonus`, cần ≥ 2 lần dữ liệu
  cho thứ đó) **và** nới/siết phần giờ tháng của người đó (`learnRate`,
  ±12,5% mỗi mức). Mức chỉnh trong hộp thoại: Không / Vừa / Mạnh.
- ĐÃ ĐO (6 người, định mức 1 người/khung, một người luôn bị bỏ ra và một người
  luôn được thêm vào): tắt → 63h/63h; Vừa → 75h/54h; Mạnh → 81h/48h. Không ai
  bị gạt hẳn khỏi lịch.
- Nút **Xem / xoá những gì máy đã học** liệt kê theo người × thứ (thói quen và
  giờ hay dùng) và xoá sạch được bất cứ lúc nào. Xoá nhân viên thì dữ liệu học
  của người đó cũng bị dọn.
- Nói thẳng với anh Lâm: một tháng dữ liệu gần như chưa nói lên gì, cần vài
  tháng; và máy chỉ học những chỗ anh SỬA, không học được lý do.

**Đầu mỗi ngày trên bảng in / PDF (bản 2).** Theo yêu cầu mới của anh Lâm
(thay cho quy tắc cũ "予算 ở góc trên bên trái"):
- BÊN TRÁI: **số ngày + thứ chữ to, đậm** (số ngày 1,7 lần, thứ 1,2 lần cỡ chữ
  dòng đầu; CN/lễ đỏ, T7 xanh), sau đó tên người nghỉ và L= nếu có.
- BÊN PHẢI: **納品 · 発注 · 予算** theo đúng thứ tự đó, mép phải thẳng mép bảng.
  Mỗi cái là một ô riêng trong một bảng lồng (`table.hd-tagbox`), ngăn nhau bằng
  ô trống rộng 1,6mm. KHÔNG dùng khối inline: bộ đổi PDF của Google dính các
  khối inline vào nhau và cắt chữ — bản trước in ra thành "発注1 (木)".
- Chữ ngày to hơn làm dòng đầu cao thêm, nên mỗi ngày được tính thêm nửa dòng
  khi chia cột (`size = số người + 3.5`). Đã kiểm lại: nửa đầu vẫn đúng 3 trang
  (1 bảng tổng + 2 lịch), nửa sau 13–14 người/ngày vẫn gọn 2 trang.

**Bộ đếm cạnh tên (tab Ngày của quản lý + lời chào ở màn nhân viên).** Ngay sau
tên mỗi người: **giờ đã xếp cả tháng** (vd `24h`), **số ngày làm liền**
(`làm 4` / `4連勤`) và **số ngày nghỉ liền** (`nghỉ 2` / `2連休`). Chỉ tính
trong tháng đang mở (tháng trước chưa tải về máy):
- Hôm đó có ca: làm liền = cả chuỗi ngày làm chứa hôm đó (tính lùi lẫn tới);
  nghỉ liền = số ngày nghỉ ngay trước chuỗi đó.
- Hôm đó không có ca: nghỉ liền = số ngày nghỉ tính lùi tới hôm đó (không đếm
  tới trước vì các ngày sau có thể chỉ là chưa xếp).
- Chuỗi làm bằng giới hạn "số ngày làm liền tối đa" của máy xếp thì tô cam, vượt
  thì tô đỏ. Kéo giờ xong là số cập nhật ngay (`refreshNameStats`).

**Xoá nhanh ĐĂNG KÝ của một ngày (có Hoàn tác).** Chỉ xoá ô `wish`, ca đã xếp
giữ nguyên.
- Quản lý: dấu × ở cuối dòng "Đăng ký: …" của từng người, và × trên chip 希望休
  ở dòng nghỉ phía trên.
- Nhân viên: nút "× Xoá đăng ký ngày này" hiện sẵn cạnh tiêu đề ngày, và × ở
  từng ngày trong danh sách cả tháng (bấm × không nhảy sang ngày đó). Lịch đã
  chốt thì nút ẩn (máy chủ vẫn chặn như cũ). Nhân viên không xoá được đăng ký
  của người khác (`requireCanEdit_`).

**Dặn dò hôm nay + nhắc nhở của quán nằm BÊN PHẢI "Tháng / năm".** Thanh tháng
thành `.nav-row`: bên trái ‹ Tháng 10 / 2026 › Hôm nay, bên phải ô `.nav-side`.
- Quản lý: ô gõ dặn dò của ngày đang xem (Enter là lưu), nút "+ Nhắc nhở",
  "Xem tất cả", rồi các nhắc nhở của ngày đó mỗi cái một dòng gọn (✎ sửa, × xoá).
  Ô dặn dò và hộp nhắc nhở cũ ở giữa trang đã bỏ, không lặp lại.
- Nhân viên: đọc dặn dò + nhắc nhở của hôm đó và 7 ngày tới ở cùng chỗ.
- Điện thoại: ô này tự rớt xuống dưới thanh tháng, không tràn ngang.

**Giờ nghỉ giải lao nhìn là biết :00 hay :30.**
- Khúc nghỉ màu cam ghi giờ ngay trên nó (rộng thì "12:30–13:30", hẹp thì
  "12:30"); cột bên phải dòng quản lý có thêm dòng nhỏ "☕ 12:30–13:30".
- Thanh giờ có vạch nửa giờ mờ, ngắn hơn vạch giờ tròn.
- Bấm vào thanh: giờ nghỉ bắt đầu ĐÚNG ô nửa giờ vừa bấm (ô 12:00–12:30 →
  12:00, ô 12:30–13:00 → 12:30). Trước đây lấy chỗ bấm làm giữa rồi làm tròn
  nên không đoán được.
- Rê chuột (máy tính) hiện trước khúc nghỉ sọc cam kèm "Bấm để nghỉ 12:30–13:30".
- Kéo khúc nghỉ sang trái/phải để dời, mỗi nấc 30 phút, chữ giờ chạy theo;
  không ra ngoài ca, không đổi giờ ca. Phím ←/→ dời 30 phút, Delete để bỏ.
- Sửa kèm: từ khi bọc tên trong `.nm-line`, cảnh báo "thiếu phút nghỉ" không
  tự mất sau khi đặt giờ nghỉ (refreshHeader chỉ xoá badge con trực tiếp).
  Nay xoá badge ở mọi cấp trong `.emp-head`.

**"Rảnh cả ngày" gom thành một dòng.** Bỏ các thanh xanh dài từng người; thay
bằng một dòng `.flex-line` "Rảnh cả ngày N: [tên] [tên]…" (ghi chú hiện nhỏ cạnh
tên, rê chuột thấy ai điền lúc nào).

**Ai điền, lúc nào (để xác nhận đăng ký đúng là nhân viên tự điền).**
- Mỗi ô ĐĂNG KÝ và YÊU CẦU được máy chủ đóng dấu `by` + `at`:
  `e` = chính nhân viên, `m` = quản lý điền hộ, `x` = chuyển tự động từ dữ liệu
  cũ (readWish_ dựng từ lịch/yêu cầu kiểu cũ). Không có `by` = dữ liệu trước khi
  có ghi nhận. Lịch xếp (schedule) KHÔNG đóng dấu.
- Dòng "Đăng ký: …" gắn nhãn tím "QL điền" / cam "dữ liệu cũ" khi không phải
  nhân viên tự điền; rê chuột thấy "Chính nhân viên điền lúc 24/09 13:45".
- Hoàn tác sau khi xoá nhầm giữ NGUYÊN dấu cũ (`_keep`, chỉ quản lý dùng được).
- Lần hoạt động gần nhất: Script Properties `seenMap` = {empId: {login, open,
  wish, wishMgr}} — không nằm trong Sheet, không vào History, ghi thưa 5 phút/lần.
  Chỉ quản lý nhận (`loadMonth.seen`); nhân viên nhận `{}`. Xoá nhân viên thì dọn.
- Hiện ở: tooltip tên + dòng trong bảng thao tác ("🕒 Mở app: … · Tự sửa đăng
  ký: …"), và bảng gập "🕒 Hoạt động của nhân viên" ở tab Tháng (ai quá 14 ngày
  chưa mở app / chưa từng mở thì tô đỏ; đếm số ô "QL điền" / "dữ liệu cũ").

**Bảng lịch tháng: thứ + nút 👁.** Tiêu đề cột có thêm thứ (T2…CN, CN/lễ đỏ,
T7 xanh). Nút 👁 trước mỗi tên để ẩn người đó — còn một hàng mỏng "Đang ẩn",
bấm 🙈 để hiện lại, có nút "Hiện tất cả". Nhớ trên máy này (localStorage
`sbw.mghide`), không ảnh hưởng người khác hay bản in.

**Báo sai lịch (sau khi chốt).** Khoá `report:<YM>` = [{id, empId, day, text,
at, status open|done, reply, doneAt}].
- Nhân viên: chỉ khi lịch đã chốt mới có nút "⚠️ Báo lịch ngày này bị sai"
  (dưới ô "Ca được xếp hôm nay"), chọn nhanh lý do hoặc tự ghi; thấy danh sách
  báo cáo của mình (Đang chờ / Đã sửa + lời nhắn quản lý), rút lại được khi còn chờ.
- Máy chủ: chỉ báo cho chính mình (`requireCanEdit_`), chỉ khi đã chốt, tối đa
  20 cái đang chờ/người, 200/tháng. Nhân viên chỉ đọc được của mình. Chỉ quản lý
  đánh dấu đã sửa / mở lại / xoá. Báo cáo KHÔNG tự sửa lịch.
- Quản lý: băng cam "⚠️ N báo sai lịch chưa xử lý" ở tab Ngày (bấm chip tới đúng
  ngày), thẻ báo cáo ngay trong ô ngày đó, danh sách đầy đủ ở tab Tháng.

**Nút "Xếp lịch nháp" không còn nổi.** Trước đây nút nổi ở góc dưới màn hình
(`fab-auto`, position:fixed), trên điện thoại dễ bấm nhầm khi cuộn. Nay đứng yên
trong `.auto-bar` ngay dưới thanh chốt lịch ở tab Tháng, kèm dòng nhắc "bấm sẽ
mở bảng tuỳ chọn trước". Lịch đã chốt thì không hiện. Không còn nút nổi nào.

**Thời gian sửa đổi gần nhất trên bảng lịch tháng.** Dòng ngay trên bảng:
"🕘 Lịch xếp sửa lần cuối: 24/09 14:11 (vừa xong) · ✍ Đăng ký thay đổi lần
cuối: … — tên người đổi".
- Máy chủ: Script Properties `modMap` = {'YYYY-MM': {s, sBy, w, wBy}}, giữ 24
  tháng. Ghi trong các hàm ghi cấp thấp (`writeMonthObject_`, `kvSet_`, xoá nhân
  viên) nên mọi đường sửa đều bắt được: kéo giờ, xếp nháp, dán kế hoạch, hoàn
  tác, khôi phục lịch sử. Ai sửa lấy từ `WHO_` (đặt trong `auth_`). Yêu cầu
  (requests) tính chung với đăng ký. Chỉ quản lý nhận (`loadMonth.mod`).
- Máy khách: lưu thành công là cập nhật ngay (`noteMod` trong `call()`), khỏi
  tải lại tháng. Ô đăng ký trong bảng: rê chuột thấy thêm ai điền lúc nào.

**Giờ mở / đóng cửa chỉnh tự do trong Cài đặt (mỗi quán một bản app).** Anh Lâm
dùng app cho nhiều quán, mỗi quán một bản riêng (Sheet + link riêng), giờ mở cửa
khác nhau; mọi ngày giống nhau.
- Cài đặt → Cấu hình quán: "Giờ mở cửa" (4:00–14:00) và "Giờ đóng cửa (L)"
  (12:00–26:00), bước 30 phút. Đóng phải sau mở ít nhất 4 tiếng (máy khách báo
  lỗi, máy chủ tự chặn). Mặc định 8:00 / 21:00 = y như trước.
- `settings.openHour`, `settings.closeHour`, `settings.staffBase`. Máy khách:
  `OPEN_HOUR` (giờ thật, có thể 6:30), `HOUR_MIN = floor(OPEN_HOUR)` (mốc thanh
  kéo / biểu đồ), `CLOSE_DEFAULT = closeHour`; `applyStoreHours()` chạy mỗi khi
  nhận cài đặt.
- Bảng định mức: ô thứ i = giờ `staffBase + i` (dữ liệu cũ 8..20, staffBase 8).
  Đổi giờ mở/đóng là bảng dựng lại NGAY theo khung mới, giữ số đã gõ ở các giờ
  còn lại; lưu thì ghi lại với staffBase = giờ mở tròn xuống.
- Theo giờ quán: thanh kéo giờ, biểu đồ số người, máy xếp nháp (không xếp trước
  giờ mở, khung trước giờ mở thật tính là 0 người), nút "Cả ngày" của nhân viên,
  ca mặc định, khung giờ cố định, trục giờ bản in, chữ "bỏ trống = 23:00" ở ô
  Đóng cửa (L). Ô "Đóng cửa (L)" từng ngày vẫn ghi đè giờ đóng như cũ.

**Nhập bảng cũ kèm 予算 và sự kiện (備考).** Trong mỗi khối ngày của file nhập,
thêm được hai loại dòng:
- `予算 30万円` (cũng nhận 予想 / 予想売上 / 売上; số ≥ 10000 hiểu là yên).
- `備考 【Eスポーツ】 9:00〜21:45 · 来場 2,568名` (cũng nhận イベント / メモ).
Bước ghép tên có mục "Nhập kèm" với hai ô tích (mặc định bật): 予算 ghi đè 予算
đang có của các ngày đó; mỗi sự kiện thành một nhắc nhở loại "Khác" đúng ngày
(nhập lại không sinh trùng). Hai thứ này không thuộc kế hoạch A/B/C nên ghi
thẳng vào tháng đang xem; ghi lần lượt từng lệnh để không tranh khoá máy chủ.
File mẫu: `centrair-thang10-1-15.txt` (中部国際空港店 1–15/10/2026: 81 ca, 予算
15 ngày tổng 478万円, 3 sự kiện ngày 1–3).

**Dặn dò trong ngày: chữ đỏ, nhiều dòng, nút Lưu.** Ô dặn dò (bên phải thanh
tháng) là ô nhiều dòng tự cao lên, chữ đỏ đậm; Enter = xuống dòng, Ctrl/⌘+Enter
= lưu; nút "💾 Lưu" sáng lên khi có chữ chưa lưu, kèm trạng thái "Chưa lưu" /
"✓ Đã lưu"; rời khỏi ô vẫn tự lưu cho khỏi mất chữ. Tối đa 400 ký tự
(`NOTE_MAX_LEN`). Bản in: dặn dò thành dòng riêng dưới bảng ngày, chữ đỏ, tự
xuống hàng (tính thêm dòng khi chia cột ~56 chữ/dòng); bảng tổng cũng tô đỏ.

**Danh sách "Lịch của tôi" của nhân viên.** Cột CA ĐƯỢC XẾP đứng trước (chữ to),
cột ĐĂNG KÝ lùi sang phải (chữ nhỏ, xám). Hai nút "1–15" / "16–cuối" thay cho
cuộn dài; mặc định mở nửa chứa ngày đang xem.

**Màu bản in (v4).** Bản "nhạt" trước (#93C8EA…) trông như phủ lớp xám mờ →
bỏ. Nay = MÀU GỐC giảm độ bão hoà 20% (theo HSV: nhạt đi mà vẫn trong): ô giờ
#52B3E0 (gốc #2FA8E0), giờ nghỉ #FFF533 (#FFF200), ca hỗ trợ #F5B64D (#F5A623),
ô 社員 chưa có ca #FFEB99 (#FFE680); các nền phụ / chữ đỏ / chữ xanh thứ Bảy cũng
giảm 20%. Mực đen giảm 10%: chữ và đường kẻ #1A1A1A (thay đen tuyền), vạch nửa
giờ như bản gốc (không kẻ giữa 2 ô nửa giờ, kẻ ở ô :30).
**Bảng tổng nằm TRANG CUỐI (trang 3).** In 2 mặt thì trang 1–2 (lịch làm việc)
nằm chung một tờ; bảng tổng ở tờ riêng.

**Last order (LO).** Cài đặt → "Last order (LO)" + "Sau LO chỉ cần … người ở lại
dọn" (mặc định 2). Tác dụng:
- Định mức người sau LO tự giảm còn số người ở lại (`requiredFor` giới hạn).
- Máy xếp nháp: bước cuối `loCutPlan` — quá LO chỉ giữ N người (ưu tiên ca
  ghim / tự khoá, nhãn đóng cửa, người vào muộn), người khác về lúc LO
  (`cutShiftEnd` sửa lại giờ nghỉ). Không cắt ca đi hỗ trợ, ca cắt xong < 2 tiếng.
- Tab Ngày: nút "✂ Cắt về LO" (có Hoàn tác); mỗi dòng có "⏱ Về lúc LO"; thanh
  giờ có vạch đỏ nét đứt ở LO, thước giờ có nhãn "LO".

**Sao lưu gọn MỘT thư mục, tên = ngày + tên quán.** Thư mục chung "SUBWAY シフト
— sao lưu". File: "2026-09-25 03:00 · SUBWAY Ootagawa · sao lưu tự động", mô tả
file ghi `subway-shift-backup store=<id bảng tính> store-name=<tên>|`. Mỗi quán
chỉ giữ 30 bản mới nhất CỦA MÌNH (không xoá của quán kia). `tidyBackups_`: dời
bản sao lưu nằm lung tung vào thư mục, đổi tên bản kiểu cũ "SUBWAY シフト
yyyy-MM-dd HH:mm (lý do)" (mở ra đọc tên quán), tối đa 6 file/lần sao lưu; nút
"🗂 Sắp xếp bản sao lưu cũ" chạy ngay (25 file/lần).

**Chi viện giữa các quán.** Hai quán = hai bản app, CÙNG một tài khoản Google.
- Bảng tính chung trong Drive "SUBWAY シフト — Kết nối các quán (chi viện)", tự
  tạo lần đầu; id nhớ ở Script Properties `hubId`; trùng tên thì lấy bản cũ nhất.
  Mỗi yêu cầu một dòng [id, json, lúc sửa].
- Bật ở Cài đặt ("Kết nối với quán khác") ở CẢ HAI quán. `settings.hubOn`.
- Quy trình: quản lý quán thiếu người "✈️ Xin chi viện ngày này" (giờ, đến L,
  số người, ghi chú) → nhân viên quán kia thấy ô "✈️ Quán khác đang cần người",
  bấm "🙋 Tôi đi được" (hoặc quản lý quán kia "Cử người" = đã đồng ý sẵn) →
  quản lý quán NHÀ "✓ Cho đi" → quản lý quán CẦN NGƯỜI "✓ Nhận" → ca ✈️ hỗ trợ
  tự vào lịch quán nhà (`supportRef`, ghi chú "→ tên quán"); quán cần người
  thấy người đó trong ô ngày, được tính vào biểu đồ số người có mặt và in ra
  bảng (dòng "H tên"). Huỷ yêu cầu / rút lại → ca hỗ trợ tự gỡ.
- Đồng bộ ca vào lịch quán nhà chạy khi quản lý quán nhà mở danh sách chi viện
  (`listSupport`) hoặc duyệt.
- Riêng tư: chỉ chia sẻ TÊN nhân viên + tên quán. Nhân viên chỉ thấy đề nghị của
  chính mình, không thấy yêu cầu của quán mình; quán cần người không nhận mã
  nhân viên của quán kia. Chỉ quản lý đăng / huỷ / duyệt.
- Kiểm thử: bộ giả lập có `__switchStore` (mỗi quán một bảng tính + Script
  Properties + cache riêng; Drive dùng chung).

**Giao diện v2 (gọn, chia nhóm, ưu tiên điện thoại).** Một lớp CSS phủ ở cuối
`<style>` ("GIAO DIỆN v2") + vài chỗ đổi bố cục; ID/class cũ giữ nguyên.
- Chung: thẻ bo 14px + bóng nhẹ (bỏ viền răng cưa), tiêu đề nhỏ lại; màn ≥1100px
  khung app rộng 1080px để nhìn lịch tổng thể.
- Điện thoại (≤600px):
  - 3 tab 日/月/設定 thành thanh DƯỚI ĐÁY màn hình (có biểu tượng), toast nhích
    lên trên nó; thanh trên gọn 2 dòng.
  - Nút bấm cao 30–36px (trước 42px), ô chữ vẫn 16px để iOS không tự phóng to.
  - Dải ngày, biểu đồ số người (cao 40px), ô 予算 / L gọn; chữ "空欄=21:00" ẩn.
  - Dòng nhân viên: tên + bộ đếm + đăng ký + giờ ở trên, thanh kéo giờ RỘNG HẾT
    bề ngang ở dưới (thước giờ khớp theo).
- Tab Ngày: 3 nút ⚡ tự điền / ✂ cắt LO / 🧹 xoá ngày gom thành hàng nút nhỏ
  `.roster-tools` dưới tiêu đề.
- Tab Tháng: thanh công cụ `.month-tools` (vẫn có class `auto-bar`) ngay dưới
  thanh chốt: [⚡ Xếp nháp] [🖨 1–15 | 🖨 16–cuối] [⋯ Thêm ▾: chép tháng trước ·
  hoàn tác · xuất bảng tính]; menu tự đóng khi bấm ra ngoài. Bỏ hàng link cuối trang.
- Kế hoạch A/B/C: 3 ô nhỏ luôn cùng một hàng; số liệu + lúc lưu gộp 1 dòng; nút
  ✓ Dùng / 💾 Lưu / 🗑 (điện thoại chỉ còn biểu tượng); "📊 So sánh" và "📥 Nhập
  bảng cũ" lên góc tiêu đề. Ô đang dùng không hiện nút "Dùng".
- Cài đặt: giờ mở / đóng / LO / người ở lại xếp lưới 4 cột (điện thoại 2 cột);
  "Kết nối với quán khác" thành khối riêng cuối trang.

**Buồng xếp ca (tab Ngày) — bản v3.** Khung "時間帯別の勤務人数" (số người theo
giờ) là khung CHỦ ĐẠO `#cockpit` (class `ticket sticky-cov cockpit`), luôn DÍNH
trên đầu màn hình ở mọi khổ. Dải ngày nằm NGAY TRÊN nó nhưng KHÔNG dính (cuộn đi
cho đỡ chỗ); vì vậy đầu khung ghi "3 (木) 時間帯別の勤務人数 · シフト 5 人".
- Chỉ còn MỘT thước giờ: thước của khung số người (không còn thước riêng phía
  trên các dòng nhân viên). Cột giờ THẲNG HÀNG với thanh kéo giờ (lệch ≤ 3px ở
  390px và 1280px).
- Biểu đồ dạng LÀN (Gantt, bản v5): mỗi người một làn cố định trong ngày (chia
  làn tham lam: vào sớm trước, lấy làn thấp nhất đang trống; hai người không
  trùng giờ có thể dùng chung một làn). Ai làm liền mạch thì là MỘT thanh liền
  xuyên các cột giờ, không nhảy chỗ; ô chia 2 nửa 30 phút (vào 10:30 chỉ tô
  nửa phải cột 10). Tên viết một lần ở đầu mỗi đoạn, chữ trải theo cả đoạn
  (`.cv-lbl`), nên điện thoại vẫn đọc đủ tên. Giờ nghỉ giải lao: ô sọc cam,
  viền đứt, tên vẫn hiện "☕ Tên" (không tính vào số người); sau giờ nghỉ là
  đoạn mới, viết lại tên. Người quán khác tới hỗ trợ → thanh tím ✈. KHÔNG giới
  hạn chiều cao (bao nhiêu làn cũng hiện). Thiếu so với định mức → ô trống
  viền đỏ nét đứt nằm trên các làn. Mỗi ô có `data-name` + tooltip giờ làm.
  Trên đầu cột vẫn là "số người/định mức" (`.n`), cột thiếu có class `is-short`.
- Máy tính: cột trái = chú thích (ô trống / ☕), cột phải = 3 chip 12時 / SA /
  社員. Điện thoại: chip nằm một hàng trên biểu đồ, nhãn LO ẩn (đã có vạch đỏ
  trên thanh kéo).

**Khung số người = BÀN XẾP CA (v6).** Không còn khối danh sách riêng: khung
"時間帯別の勤務人数" dính trên đầu gồm ô lịch ngày + tiêu đề + chip kỹ năng /
12時 / SA / 社員, hàng SỐ NGƯỜI theo giờ (ô "n/định mức": xanh đủ, đỏ thiếu,
xanh dương dư; ☕n = số người đang nghỉ; vạch đỏ + ⚠ = thiếu kỹ năng; tooltip
ghi tên), thước giờ, và hàng tiêu đề cột 氏名 · 出勤 · 退勤 · 休憩 · 計 như bảng in.
Ngay dưới (liền khối) là các dòng ca — mỗi người một dòng (`.lane-row`):
- Trái: ▾ tên (bấm mở bảng thao tác chi tiết như cũ) + bộ đếm + cảnh báo +
  đăng ký; rồi ô 出勤 / 退勤 / 休憩 kiểu bảng in (`laneTimesHTML`: "8", "15",
  "L", "12:30", ca hỗ trợ có ✈; nhiều ca thì nhiều dòng).
- Giữa: thanh giờ mang MÀU RIÊNG từng người (`--pc/--pcbg/--pcink`), tên nằm
  ngay đầu thanh (`.bar-name`; có ghi chú thì nhãn "tên · ghi chú"). Kéo 2 đầu
  = đổi giờ vào/ra; kéo THÂN thanh = dời cả ca (giờ nghỉ đi theo), bước 30'.
  Bấm lên thanh KHÔNG còn đặt giờ nghỉ (tránh bấm nhầm; màn nhân viên vẫn bấm).
- Phải: số giờ công + ×.
- Giờ nghỉ: kéo biểu tượng ☕ ở ô 休憩 thả vào thanh → đặt giờ nghỉ, canh GIỜ
  CHẴN (thả ở 12:45 → 12:00–13:00; có bóng xem trước + nhãn nổi "☕ 12–13").
  Độ dài mặc định: giữ độ dài đang có; không thì theo luật làm tròn lên 1 tiếng
  (>6h), ca ngắn 30' (`wholeBreakLen`). Khúc nghỉ trên thanh chỉ ghi "☕12–13";
  kéo để dời theo giờ chẵn, phím ←/→ dời 30'. NHẤN GIỮ ~0,5s (hoặc nhấp đúp,
  hoặc chạm ☕ ở ô 休憩) → hộp chỉnh: giờ bắt đầu (bước 30', giờ chẵn in đậm),
  độ dài 30/45/60/90', nút "Bỏ giờ nghỉ" (`openBreakDialog`).
- Nút công cụ ngày (⚡ / ✂ LO / 🧹 / ✈️) thành thanh riêng phía trên khung; dòng
  "nghỉ cả ngày", 終日OK, thêm người… nằm dưới các dòng ca.
- Điện thoại: dòng = [▾ tên | 出勤 退勤 休憩 | giờ ×] rồi thanh giờ rộng hết
  bề ngang; hàng số người thẳng cột với thanh (đo lệch 0px ở 390 và 1280px).

**Bàn xếp ca gọn kiểu Gantt (v7 — rà soát lại theo chuẩn chuyên môn).**
- Mỗi dòng MỘT hàng cố định (~40px): ▾ tên + dấu ⚠n (rê chuột xem các cảnh
  báo; bấm ▾ mới hiện cảnh báo chi tiết + dòng "Đăng ký: … ×"). Cờ đổi ca vẫn
  hiện vì bấm được. Bộ đếm tháng (210h · 30連勤 · 2連休) dời sang cột 計, dưới
  số giờ của ngày (điện thoại ẩn bộ đếm cho gọn).
- Dòng XẾP THEO GIỜ VÀO (rồi giờ ra) → nhìn thành bậc thang như bảng in; chỉ
  sắp lại khi vẽ lại trang, không nhảy dòng lúc đang kéo.
- Thanh giờ: nền trong suốt + lưới giờ mảnh như giấy kẻ; thanh màu người (viền
  đậm cùng tông); phần xếp VƯỢT giờ đăng ký = sọc chéo đỏ; giờ đăng ký = vạch
  nét đứt xanh mảnh ngay dưới thanh (bỏ mảng xanh nhạt + khung nét đứt to).
- Nút kéo 2 đầu thành thanh dọc mảnh; máy tính chỉ hiện khi rê chuột vào dòng.
- Ca tách đôi (8–12 + 17–20): hai khúc nằm CHUNG một làn (khúc 2 phủ lên cùng
  hàng, chỉ phần thanh/nút nhận chuột); bấm ▾ thì tách ra để sửa chi tiết.
- Màu người: chia đều vòng màu theo thứ tự nhân viên (góc vàng 137,5°,
  `empHue`) — 10–15 người vẫn khác màu rõ; trước đây băm theo mã nên hay trùng
  tông vàng cam. Dùng chung cho chấm màu, bảng tháng, thanh giờ.
- Đã thử với 10 người / ngày đông (có ca tách đôi, ca :30, vượt giờ đăng ký) ở
  1280px và 390px, sáng và tối.

**Màn NHÂN VIÊN kiểu B (bản vẽ S1–S3 đã chốt).** 3 tab (điện thoại: thanh dưới
đáy; máy tính: trên cùng) — `state.staffTab`; mặc định: tháng đang xem đã chốt
→ 今日, chưa chốt (đang thu đăng ký) → 希望. Tab 今日 có số đỏ khi có việc chờ
(quán khác cần người chưa trả lời, người nhờ đổi ca) — `staffPendingCount`.
- **今日**: thẻ xanh chữ to ca hôm nay (hoặc ca gần nhất sắp tới): giờ vào–ra,
  giờ nghỉ, số giờ, trạng thái "còn … nữa là vào ca / đang trong ca · còn … /
  xong ca", dặn dò của ngày. Bảng mini "làm cùng hôm nay" (dòng "Bạn" tô đậm,
  vạch cam = giờ nghỉ). Thông báo: tiến độ đăng ký tháng (bấm → tab 希望) hoặc
  "lịch đã chốt & công bố", người nhờ đổi ca (bấm → ngày đó). Khối chi viện
  "行けます" + dặn dò/nhắc nhở của quán.
- **シフト**: băng chốt/nháp, 3 ô tổng (giờ được xếp · ngày làm · ngày nghỉ),
  nút Tháng | Tuần. Tháng = lưới 7 cột (thứ Hai đầu tuần), mỗi ô ghi ca được xếp
  ("10-18", "休", ca chi viện tím "✈11-15"). Tuần = danh sách 7 ngày. Bấm ngày
  → chi tiết: ca được xếp, bảng mini ai làm cùng, (đã chốt) nút tìm người đổi
  ca (`wireSwapBox` dùng chung), báo sai lịch; nút thêm vào lịch điện thoại.
- **希望**: tiến độ "x/n ngày", 3 nút cả tháng (rảnh cả tháng · nhiều ngày · giờ cố
  định), lưới tháng ghi ĐĂNG KÝ ("9-17", "終日OK", "休"; ô là `.day-tab` trong
  `#dayStrip` nên mọi thao tác chọn ngày cũ vẫn chạy), bảng khai giờ của ngày
  (y như cũ: nút nhanh, thanh kéo, tuỳ chỉnh thêm) + 3 nút "‹ Ngày trước ·
  Mọi thứ X sau đó cũng vậy · Ngày kế ›" (`applySameDowLater` chép đăng ký +
  ghi chú sang các ngày cùng thứ phía sau). Kéo giờ là ô trên lưới đổi theo
  ngay. Dưới cùng: danh sách đối chiếu Xin/Xếp, tự khoá, xoá cả tháng.
- Hiệu ứng: nút lún nhẹ khi bấm, bảng khai giờ trượt lên khi đổi ngày, thẻ hôm
  nay hiện mượt; tắt hết khi máy bật "giảm chuyển động". Không dùng rung: app
  chạy trong khung của Google nên Chrome chặn rung, iPhone không hỗ trợ.

**Màn QUẢN LÝ kiểu C — một bàn làm việc (bản vẽ C1/C2 đã chốt).** Tab Ngày bọc
trong `.day-desk` = [trái `.dd-left`: lịch tháng nhỏ `miniCalHTML` + thẻ ngày |
giữa `.dd-main`: dải ngày, công cụ, khung số người/Gantt, các dòng ca | phải
`#deskSide`: `deskSideHTML` (tóm tắt ngày, hướng dẫn)]. `body.mgr-day` khi đang
ở tab Ngày.
- Lịch nhỏ: ô `#dayCal .dc-cell[data-cday]` có chấm OK / cần xem / chưa xếp; bấm
  → đổi ngày. Màn ≥ 1100px ẩn dải ngày (lịch nhỏ thay thế), app rộng tới 1500px.
- Bấm ▾ cạnh tên = mở BẢNG CHI TIẾT `.row-panel` của người đó: đầu bảng (chấm
  màu, tên, tổng giờ tháng, nút ×), chi tiết, hàng nút giải lao nhanh
  (`paintBrkQuick`: các mốc giờ chẵn · なし · 細かく…), giờ. `prepLanePanel` DỜI
  `.row-detail` và `.sb-more` vào bảng (vẫn nằm trong dòng nên mọi sự kiện cũ
  giữ nguyên). **Chỉ mở 1 bảng một lúc** (`closeLanePanels`); Esc / × / bấm nền
  mờ là đóng; vẽ lại trang thì mở lại đúng người cuối cùng.
- Cách hiện bảng theo bề rộng: ≥ 1100px nằm cố định đè lên cột phải
  (`placeSidePanel`, bám theo khi cuộn/đổi cỡ); 600–1100px mở ngay dưới dòng;
  ≤ 600px bảng trượt từ dưới lên (tối đa 66% màn, có vạch kéo) + nền mờ
  `.sheet-back` (`body.lane-sheet-open`). Khi bảng mở, vạch giờ/chú thích của
  dòng đó ẩn cho gọn.

**Hàng nút đối xứng (v3).** Nút cùng nhóm rộng bằng nhau, xếp lưới:
- Công cụ ngày `.roster-tools`: máy tính 1 hàng chia đều; điện thoại lưới 2 cột,
  số nút lẻ thì nút cuối trải hết hàng. Có thêm nút ✈️ Xin chi viện (luôn hiện).
- Thẻ thông tin ngày `.di-grid`: máy tính 4 cột bằng nhau (L · 予算 · 発注/納品 ·
  ngày lễ); điện thoại hàng 1 = L | 予算, hàng 2 = 発注 納品 | ngày lễ.
- Thanh công cụ tháng: máy tính 3 cột bằng nhau; điện thoại ⚡ trải hết hàng 1,
  hàng 2 = 🖨 1–15 | 🖨 16–cuối | ⋯.
- Thanh trên điện thoại: hàng 1 = tên quán | 📱 🌙 Đăng xuất; hàng 2 = ngôn ngữ |
  Quản lý/Nhân viên, hai nửa rộng bằng nhau.

**Nút ✈️ Xin chi viện luôn có** ở công cụ ngày. Đã bật kết nối → mở thẳng hộp
xin chi viện ngày đó; chưa bật → hộp thoại chỉ cách bật (tích ở CẢ HAI quán,
cùng tài khoản Google, cả hai đã dán Code.gs mới) + nút "Mở Cài đặt" nhảy tới ô
"Kết nối với quán khác".

**Giao diện tối.** Nút 🌙/☀️ trên thanh trên (cả màn đăng nhập), nhớ theo máy
(`localStorage` "sbw.theme", bọc try/catch), mặc định sáng. Cách làm: biến màu
ghi đè trong `html[data-theme="dark"]`; màu viết cứng trong CSS được JS chuyển
TỰ ĐỘNG (`buildDarkCss_`: đọc lại mọi luật CSS, nền sáng → nền tối cùng tông,
chữ tối → chữ sáng, viền sáng → viền tối; chép nguyên cách viết gộp như
`border-top:none` để không làm sống lại viền đã bỏ; bộ chọn bọc
`:where(html[data-theme="dark"])` nên không tăng độ ưu tiên). Bảng tối nằm
trong `@media screen` — bản in luôn nền trắng. Màu tên người trên nền nhạt dùng
`colorInk` (tối thì sáng lên), `colorTint` tối thì nền đậm. Sửa CSS về sau
không cần viết thêm luật tối.

**Kỹ năng tự thêm + yêu cầu kỹ năng theo giờ (v4).** Cài đặt → khối "🏷 Kỹ
năng & yêu cầu theo giờ" (`#skillBox`):
- 6 nhãn có sẵn + kỹ năng quán tự thêm (`settings.customTags` = [{k:"c…", n}],
  tối đa 12, khoá `^c[0-9a-z]{1,10}$`); nút "+ Thêm kỹ năng", ✎ đổi tên, × xoá
  (xoá luôn các yêu cầu dùng nó). Bảng nhãn của từng nhân viên cũng có ô "Kỹ
  năng mới… + Thêm" (Enter được) — thêm xong là tích sẵn cho người đó.
- Yêu cầu theo khung giờ (`settings.skillReq` = [{tag, from, to, n, dows}],
  tối đa 20; dows 0..6 = CN..T7, 7 = ngày lễ, rỗng = mọi ngày). Mỗi dòng: kỹ
  năng · từ–đến (bước 30') · cần ít nhất n người · chọn thứ · 🗑; nút "Lưu".
  Giờ kết thúc ≤ giờ bắt đầu → dòng đỏ, không lưu. Máy chủ lọc lại hết.
- Kiểm tra: `skillMissFor(day)` đếm người CÓ MẶT (tính cả đang nghỉ giải lao)
  có kỹ năng ở từng mốc 30' trong khung (cắt tại giờ đóng cửa). Tab Ngày: đầu
  khung số người có chip đỏ "⚠ Mở cửa được 8–10: 0/1" hoặc xanh "🏷 Đủ kỹ năng
  (n)"; cột giờ thiếu có vạch đỏ trên đầu + ⚠, tooltip ghi kỹ năng thiếu; chấm
  của ngày trên dải ngày chuyển "cần xem lại".
- Máy xếp nháp: bước 3b (sau mở/đóng cửa) đặt trước người có kỹ năng phủ TRỌN
  chỗ thiếu (`placeSkill`); khi lấp ngày, ca mới phủ vào chỗ thiếu kỹ năng mà
  người đó có được cộng điểm (`skillBonus`); bước cắt ca dài không được cắt
  mất người có kỹ năng mà khung đang cần (`skillLoss`). Băng nháp báo "n ngày
  còn thiếu người có kỹ năng theo giờ". Đã đo: yêu cầu "Pha cà phê 11–14" với 2
  người có kỹ năng → phủ ≥ 80% số ngày.

**Công bố lịch → tự lưu BẢN CHÍNH THỨC (v4).** `setMonthLock(token, ym, true,
metaJson)` chép `schedule:<YM>` sang ô kế hoạch "F" (`plan:F:<YM>`, planmeta
F = {at, name, stats, official:true}, active = "F"). Ô F không lưu tay được
(savePlan chỉ A/B/C), nhưng getPlan/applyPlan dùng được. Tab Tháng: dòng xanh
"📌 Bản chính thức · công bố <lúc> · số liệu · [✓ Dùng]" trên 3 ô A/B/C; bảng so
sánh có cột bản chính thức. Mỗi lần chốt lại là ghi đè bản chính thức mới.

**Tab Ngày — ngày dạng tờ lịch (v4).** Ngày trước "時間帯別の勤務人数" là ô
đóng khung kiểu tờ lịch: dải trên tô màu có thứ (CN/lễ đỏ, T7 xanh), số ngày
to ở dưới (`.cp-day.cal`). Ô tên trong biểu đồ có màu tươi vừa phải theo từng
người (`chipBg`/`chipInk`: nền hsl(h,62%,82%), chữ hsl(h,60%,22%); tối: nền
hsl(h,38%,30%)) thay cho nền gần trắng.

**Kiểm tra phiên bản.** `APP_VERSION` có ở CẢ Code.gs lẫn Index.html (hiện
"2026.10.07.1"); `bootstrap` trả `version`. Lệch nhau (hoặc Code.gs cũ chưa có số)
→ băng cảnh báo vàng ngay dưới thanh trên (cả màn đăng nhập): "dán lại cả hai
file rồi Deploy → Manage deployments → ✏️ → New version". Cuối tab Cài đặt ghi
"Phiên bản: … · Code.gs: …". **Mỗi lần sửa app phải tăng số ở cả hai file.**
- Thông tin ngày (L, 予算, 発注/納品, ngày lễ) thành thẻ nhỏ `.day-info` phía
  trên, không dính. Thứ tự trong thẻ danh sách: công cụ → dòng nghỉ → các dòng
  ca → (báo sai lịch, chi viện, 終日OK / yêu cầu, bảng thêm người) ở dưới.

**GIAO VIỆC (作業) — v2026.09.28.** Chống "nạnh việc": việc có tên người làm,
xong thì tích (giờ máy chủ), việc quan trọng phải chụp ảnh.
- Dữ liệu (Code.gs): `jobtpl` = danh mục việc lặp lại {id, title, freq d/w/m,
  dows, mdays (31 = cuối tháng), slot any/open/mid/close, photo, note, from,
  until, tr, trM}; `jobs:<YM>` = { ngày: { t: {tplId: STATE}, x: [việc riêng] } },
  STATE = {to:[empId], skip, done:{by,at}, ph:[{f, at, by, ex, fl}]}. Xoá việc
  lặp lại = đặt `until` = hôm nay (ngày cũ giữ lịch sử); việc tạo hôm nay thì
  xoá hẳn. `from` của việc tạo từ một ngày = ngày đó (không muộn hơn hôm nay).
- API: saveJobTemplate / deleteJobTemplate / saveDayJob / deleteDayJob (quản
  lý); setJobDone / uploadJobPhoto (nhân viên: chỉ việc GIAO CHO MÌNH, chỉ hôm
  nay hoặc hôm qua giờ Nhật; việc cần ảnh không tích tay được); getJobPhoto
  (chỉ quản lý, chỉ file nằm trong thư mục ảnh của quán — chặn đọc file Drive
  khác). loadMonth trả `jobTpl`, `jobs` (nhân viên không nhận mã file ảnh).
- Ảnh: máy nhân viên thu nhỏ còn cạnh dài 1280px, in dải chữ ở đáy (giờ chụp ·
  tên · quán · tên việc gốc), gửi JPEG ~200KB. Lưu thư mục Drive
  "SUBWAY 作業写真 — <quán>" (id trong Script Properties `jobPhotoFolderId`).
  Giờ chuẩn = giờ máy chủ nhận. Giờ chụp (EXIF, không có thì giờ sửa file)
  lệch > 15 phút → cờ `old` "⚠ ảnh chụp lúc …"; không rõ giờ → `noexif`.
  Ảnh > 7 ngày tự vào thùng rác (`sweepJobPhotos_`: khi quản lý mở tháng, tối
  đa 6 giờ/lần, và trong lịch sao lưu 3 giờ sáng). Dấu ✓ giữ mãi.
- **Tự dịch**: lưu việc là dịch tên + ghi chú sang vi/ja/en bằng `LanguageApp`
  (Google Dịch có sẵn, không cần quyền mới), cất vào `tr`. Quản lý sửa tay bản
  dịch nào thì giữ (`trM`); đổi tên gốc thì dịch lại. Hết lượt dịch → hiện tên gốc.
- Quản lý, tab Ngày: thẻ "📋 Việc hôm nay" (`jobCardHTML`) — máy tính ≥1100px ở
  cột phải dưới ô ngày, màn nhỏ ngay trên khung số người và gập sẵn
  (`placeJobCard` dời khi đổi cỡ). Dòng đỏ = chưa giao; "+ Giao" mở danh sách
  người có ca hôm đó (khớp khung giờ lên trước, ít việc trong tháng lên trước)
  + "Người khác". ⋯ = sửa / đánh dấu xong / bỏ riêng ngày này (↺ làm lại) / xoá.
  "+ Thêm việc": tên, lặp lại (chỉ ngày này · hằng ngày · hằng tuần thứ này ·
  hằng tháng ngày này), khung giờ, cần ảnh, ghi chú, giao cho, bản dịch.
  Lịch nhỏ + dải ngày: chấm đỏ ở ngày còn việc chưa giao.
- Tab Cài đặt: "📋 Việc lặp lại" (thêm / sửa / xoá). Tab Tháng: bảng "Thực hiện
  việc" (được giao · xong · bỏ sót · %) — chỉ quản lý.
- Nhân viên, tab 今日: thẻ "Việc của bạn hôm nay": nút "Xong ✓" hoặc
  "📷 Chụp ảnh & xong" (mở thẳng camera), hoàn tác được dấu của chính mình,
  dòng "Ngày mai: …", danh sách việc của mọi người (thấy ai làm gì). Việc chưa
  xong cộng vào số đỏ trên tab 今日. Tab シフト: dòng "Việc: …" của ngày đang xem.

**GIAO VIỆC THEO VAI TRÒ + MỤC CON + BỘ 12 GÓI — v2026.09.28.2.**
- Việc lặp lại có thêm: `role` ('none' giao tay · 'open' người mở cửa · 'close'
  người đóng cửa · 'win' người có ca trong khung `wf`–`wt`, wt 99 = tới L),
  `mins` (phút ước tính), `items` [{t, tr}] (mục con, tối đa 20). Việc riêng
  của ngày cũng có `items`. Trạng thái ngày thêm `ck` (các mục đã tích) và
  `done.np` (lý do "không chụp được").
- **Tự chia (`jobAutoMap`, chỉ ở trình duyệt):** gom việc có vai trò theo nhóm
  (mở cửa → các khung giờ theo giờ bắt đầu → đóng cửa); trong nhóm, việc nhiều
  phút chia trước cho người đang ít phút nhất (tính cả phút đã nhận ở nhóm
  trước); thứ tự người xoay theo ngày. Người mở cửa = vào sớm nhất (≤ giờ mở);
  người đóng cửa = ca tới L / ra muộn nhất; khung giờ = chỉ người phủ gần trọn
  khung (lệch ≤ 30 phút so với người phủ nhiều nhất). Giao tay (st.to) thắng
  tự chia; "↺ Trả về tự động" = to rỗng. Chip người tự chia viền nét đứt +
  chữ "tự động".
- **Quyền tích (máy chủ):** giao tay cho mình, HOẶC việc theo vai trò chưa ai
  giao tay mà mình có ca ngày đó (máy chủ không tự chia lại — chỉ kiểm có ca).
  Việc có mục con: phải tích đủ mới được "xong" / gửi ảnh / "không chụp được";
  việc không cần ảnh tích đủ mục là tự xong; bỏ tích một mục thì hết xong.
  API: `setJobCheck`, `jobNoPhoto`, `importJobTemplates` (bỏ qua tên trùng).
- **Cảnh báo:** người được giao TAY mà hôm đó không có ca → chip viền đỏ ⚠,
  nhãn ⚠n trên thẻ, chấm đỏ trên lịch.
- **Nhân viên:** mỗi gói là một dòng, chỉ MỞ danh sách mục của một gói (gói
  đang làm / gói đầu chưa xong), bấm tên gói để mở gói khác; ô tích to 44px.
  Gói cần ảnh: nút 📷 khoá tới khi tích đủ mục, kèm "Không chụp được ảnh?" (ghi
  lý do). Bấm tab 今日 khi đang xem tháng khác → tự về tháng hiện tại.
- **Bộ 12 gói hằng ngày** (`JOB_PRESET_DAILY`, nút "📥 Nhập bộ việc hằng ngày
  chuẩn" trong Cài đặt; soạn từ クレンリネスチェックシート + クレンリネスマニュアル,
  tên + mục con có sẵn ja/vi/en nên không gọi Google Dịch): 3 người phụ trách
  khung giờ (8–12, 12–17, 17–L: thay ダスター + đo nồng độ mỗi giờ, SNAP30,
  mốc 11/14/17h), ① mở cửa, ②③ giờ vắng 14–17, ④–⑨ đóng cửa (chia đều cho số
  người đóng cửa thực tế). Chụp ảnh: ⑥ ユニット, ⑧ lò & khu rửa, ⑨ rác/sàn/WC.
  Mục có ngoặc (トイレ) tuỳ quán — sửa trong danh mục.

**BỘ VIỆC TUẦN / THÁNG — v2026.09.28.3.** Nút nhập trong Cài đặt giờ là hộp
chọn 3 bộ (ngày 12 · tuần 7 · tháng 6; bộ đã có thì khoá). Tuần (T2–T5, tránh
T7/CN): ① văn phòng/kệ/thay ダスター 7 ngày (T2 14–17) · ② trong tủ lạnh/đông
(T3) · ③ phin lọc & khu nước (T4) · ④ グリストラップ + máy đá (T4 đóng cửa, 📷)
· ⑤ khu khách/tường/kính (T5) · ⑥ tẩy thớt + khay khoai qua đêm (T5 đóng cửa →
sáng mai, gói ① mở cửa đã có mục kiểm tra) · ⑦ tổng vệ sinh ユニット (T2 đóng
cửa, 📷). Tháng: ① kiểm tra côn trùng (ngày 1, giao tay) · ② phin điều hoà (5)
· ③ mặt bàn (10) · ④ cửa gió + tường sau (15) · ⑤ ống hút lò (20, đóng cửa, 📷)
· ⑥ biển hiệu/bảng đèn (25).

**LINE BOT — v2026.09.28.3.** Mỗi quán 1 LINE公式アカウント + Messaging API.
- Script Properties: LINE_TOKEN (không bao giờ xuống trình duyệt), LINE_BOT
  {id,name,basic}, LINE_GROUP {id,name,at}, LINE_BIND (mã 6 số). API quản lý:
  saveLineToken (kiểm bằng /v2/bot/info; rỗng = gỡ), getLineStatus(token,
  withQuota) (quota/consumption/members count), unlinkLineGroup, linePush
  (tốn hạn mức). `authorizeLine()` chạy tay 1 lần nếu thiếu quyền UrlFetch.
- `doPost` = webhook (URL = /exec, Deploy phải "Anyone"), luôn trả "OK". Không
  đọc được header nên không kiểm chữ ký — bù: destination phải là bot của quán,
  chỉ trả lời nhóm đã liên kết, liên kết cần mã 6 số + /group/{id}/summary phải
  200 (bot thật trong nhóm), mã đổi sau khi liên kết. Bot vào nhóm (join) → tự
  chào + hướng dẫn liên kết.
- Lệnh (chỉ tin ≤ 24 ký tự, bỏ dấu tiếng Việt, số toàn góc được): シフト / lich
  → 2 tin bảng 1 (1–15) + bảng 2 (16–cuối); シフト前半/後半, 表1/表2, lich 1/2,
  lich bang 1, lich nua sau; 来月シフト / lich thang sau (+1/2); 今日/明日/hom
  nay/ngay mai (giờ + giờ nghỉ + dặn dò); ヘルプ/lenh. Tiếng Việt nếu lệnh gõ chữ
  Latin. Bảng: mỗi ngày 1 dòng, người xếp theo giờ vào, ca tới L ghi "L", ✈ chi
  viện; đã chốt → ［確定］, ngày sửa sau khi chốt (so với bản F) có ⚠ + dòng tóm
  tắt. Tất cả là tin TRẢ LỜI (miễn phí). Push chỉ khi quản lý bấm 📣.
- Cài đặt › "💬 LINE": hướng dẫn 7 bước (tự gập khi xong), ① token, ② webhook
  URL + Copy, ③ dòng "登録 <mã>" để gõ trong nhóm + ↻ kiểm tra, 📊 số tin còn
  lại, 📣 gửi thông báo (mẫu 2 thứ tiếng), danh sách lệnh cho nhân viên.

**v2026.09.30 — chốt nửa tháng · hàng chờ lưu · bảng trượt iPhone.**
- **Chốt nửa đầu (1–15):** `lock:<YM>` = '1' cả tháng · 'h1' nửa đầu · '0' nháp
  (`readLockMode_`, `dayLocked_`; `readLock_` vẫn = cả tháng). `setMonthLock(…,
  scope)` scope 'h1' | 'all' (vẫn lưu bản F). loadMonth trả `lockHalf`. Nhân
  viên: `assertWishWritable_(…, days)` chặn ngày ≤ 15 khi 'h1'; clearMyMonth chỉ
  xoá nửa sau; báo sai lịch theo ngày đã chốt. Client: `dayFinal(d)`,
  `canEditShifts(day)` (mặc định ngày đang chọn), `canEditAnyDay()` cho nút cả
  tháng; bulk/rảnh cả tháng bỏ qua ngày đã chốt; máy xếp nháp bỏ ngày ≤ 15
  (`inRange`). Thanh chốt: nháp = [Chốt nửa đầu (1–15)] [Chốt lịch tháng này];
  nửa đầu = [Mở khoá] [Chốt cả tháng]. Nhân viên: băng xanh "1–15 đã chốt",
  tab mặc định 今日, thẻ/ô "đã chốt" theo từng ngày. LINE: bảng 1 ［確定］ khi 'h1'.
- **Hàng chờ lưu (bgSave mới):** cùng ô sửa liên tục → gộp, chỉ gửi bản mới
  nhất; lỗi "bận / mạng / quá tải" (`saveRetriable`) → giữ trên máy, tự thử lại
  1,5s→3s→…→30s tới khi được, huy hiệu vàng "đang xếp hàng chờ lưu"; lỗi thật
  (quyền, đã chốt…) mới hoàn tác. Đăng ký / ca / yêu cầu chưa lưu xong được cất
  ở localStorage (`subwayShiftOutbox`), mở lại app → `outboxReplay` đắp lại và
  gửi tiếp; cảnh báo khi đóng app lúc còn đang lưu. Máy chủ: LOCK_WAIT_MS 28s.
- **Bảng trượt điện thoại (quản lý):** iPhone không phát "click" cho div → nền
  mờ nghe thêm pointerup/touchend (+ cursor:pointer); đầu bảng có nút × dính
  trên cùng; vuốt xuống ở đầu bảng để đóng; đóng bảng của người nghỉ thì bỏ
  luôn `expandedOff` để vẽ lại không tự mở ra.
- Sửa lỗi: danh sách đổi ca treo màn nhân viên khi người rảnh chỉ khai giờ ở
  Đăng ký (không có yêu cầu) — nay hiện giờ đã khai.

**v2026.09.30.2 — lịch sử công bố · chống thao tác nhầm.**
- **Nhật ký công bố** (máy chủ tự ghi, quản lý không bấm gì thêm):
  `pub:<YM>` = {seq, list:[{n,k,at,last,sc,ch,ver,src}]}, k = pub | edit |
  restore | unlock; ch = [{d,e,f,t}] (ngày, nhân viên, ca trước, ca sau).
  `pubsnap:<YM>:<n>` bản chụp mỗi lần công bố (chỉ ngày thuộc phạm vi);
  `pubcur:<YM>` bản đã công bố hiện hành; `puback:<YM>` {empId: ms} đã xem.
  Chốt/mở khoá: `pubOnLock_` ghi cờ `lock:` + dòng nhật ký + bản chụp trong CÙNG
  một lượt khoá (bận → báo lỗi, không chốt thiếu). Công bố lại sau khi mở khoá
  → dòng "Công bố" kèm các ca khác bản trước.
- **Tự ghi "Sửa #n":** `writeMonthObject_` (mọi lối ghi từng ô: kéo thanh giờ,
  lưu nhiều ngày của 1 người, chi viện ✈️) gọi `pubTrack_` → so cũ/mới trên
  ngày đã chốt; sửa liền tay trong 15 phút gộp 1 dòng, sửa lại như cũ thì tự
  biến mất. So ca bằng `pubSig_` (nghỉ, giờ vào/ra, giờ nghỉ; ca "tới L" so bằng
  chữ L nên đổi giờ đóng cửa không bị tính là đổi ca). Tối đa 150 dòng/tháng
  (bỏ dòng sửa cũ nhất; `dropped` để quay về không dựng sai).
- **Thao tác cả tháng không bao giờ đè ngày đã công bố:** `schedBulkWrite_`
  cho saveMonthSchedule / restoreMonthSchedule / applyPlan / restoreHistory
  (khoá schedule:) — giữ bản trên máy chủ cho ngày đã chốt, trả {ok, kept}.
  Ngoại lệ chỉ định rõ `allowDays`: "Xoá hết ca ngày này", "Xếp nhanh ngày này",
  "Bỏ người này khỏi cả tháng" (được ghi vào lịch sử, nhân viên được báo).
  Lưu `bak:schedule:` + `bakallow:schedule:` → Hoàn tác đổi lại đúng các ngày đó.
- **Quay về bản:** `restorePubVersion(ym, n)` = bản chụp công bố gần nhất ≤ n
  + các lần sửa sau nó tới n; chỉ thay ngày thuộc phạm vi công bố gốc (nửa sau
  đang nháp giữ nguyên); người đã xoá không đưa trở lại; ghi dòng "Quay về #n".
- **Giao diện quản lý:** dưới thanh chốt có dòng "📢 Công bố … lúc … · ✏️ đã
  sửa n lần · 👀 n người chưa xem" + nút 📜 Lịch sử công bố (dòng thời gian,
  từng thay đổi ngày/tên/giờ cũ → mới, ✓ đã xem / chưa xem, "↩ Quay về bản
  này"). Ngày đã công bố có dòng nhắc nhẹ "vẫn sửa được, app tự ghi & báo".
  Mọi thao tác lớn → thông báo có "↶ Hoàn tác" 10 giây + thanh đếm ngược
  (`bulkDoneToast`, `undoAction`, `saveWholeMonth`), kèm "giữ nguyên n ngày đã
  công bố".
- **Nhân viên:** thẻ vàng "🔄 Ca của bạn đã thay đổi" (ngày · giờ cũ gạch →
  giờ mới, chỉ ngày từ hôm nay) ở tab 今日 và Lịch của tôi; ô lịch có ✏️; băng
  trên ghi giờ công bố; bấm "✓ Đã xem" (`ackPubChanges`) → quản lý thấy ✓.
- **LINE:** lệnh "変更 / thay doi / doi ca" → ca đổi sau công bố từ hôm nay
  (tháng này + tháng sau), miễn phí; bảng 1/2 ghi "📢 公開 m/d hh:mm".
- Sửa kèm: xoá nhân viên dọn cả `pub:`, `pubcur:`, `pubsnap:`, `bak:schedule:`;
  ghi số liệu máy học khi xoá nhân viên không còn xin khoá lồng nhau.
- **Hàng chờ lưu — vá sau khi rà soát:** đăng xuất / hết phiên → `dropSaveQueue`
  dừng hàng chờ nhưng GIỮ bản cất trên máy (không gửi nhầm dưới token người
  khác, đúng người đăng nhập lại thì gửi tiếp). Hoàn tác về đúng GIÁ TRỊ MÁY
  CHỦ (`serverBase` + `confirmedVals`, `cellSave`/`cellRollback`) thay cho bản
  "trước khi sửa" (bản này bị sửa tại chỗ khi kéo thanh giờ nên hoàn tác không
  có tác dụng); chỉ hoàn tác khi vẫn đang xem đúng tháng; bản cũ hỏng mà đã có
  bản mới chờ gửi thì không hoàn tác đè. Thao tác cả tháng của một người (đăng
  ký hàng loạt, nghỉ hàng loạt, xoá tháng, hoàn tác xoá) xếp hàng THEO THỨ TỰ
  trong làn `batch|<YM>|<emp>` (không gộp); ô lẻ của người đó khi làn đang bận
  xếp sau. Thử lại tối đa 20 lần (~8 phút) rồi giữ trên máy ("saveLater").
  Bản đắp lại bị máy chủ từ chối → ô về giá trị máy chủ. Xoá tháng khi nửa đầu
  đã chốt chỉ xoá nửa sau (cả màn hình). Nút × trong danh sách theo đúng ngày
  của dòng. Vuốt xuống đóng bảng chỉ khi vuốt từ đầu bảng (`.rp-head`).

**v2026.10.01 — tab Hôm nay theo ngày · báo bận đột xuất · đổi ca ghép người · sức khoẻ · nháp vào kế hoạch.**
- **Tab 今日 chuyển ngày:** thanh ‹ ngày › (vuốt ngang thẻ ca cũng được), nút "Hôm
  nay"; `state.stOff` = số ngày lệch, qua tháng thì tự tải tháng đó. Ngày khác hôm
  nay: thẻ ca của ngày đó (`dayShiftCardHTML`), việc của ngày đó chỉ xem
  (`jobsDayCardHTML`), người làm cùng, sức khoẻ.
- **Đổi ca / báo bận đột xuất** (chung dữ liệu `swap:<YM>`): {want, foundId,
  parts:[{id,from,to}], gaps, mgr, urgent, reason, at, vol:{emp:{from,to}},
  ans:{emp:{ok}}, done}. `saveSwapEntry` chuẩn hoá (`normSwap_`) và GIỮ phần người
  khác ghi (vol/ans); `swapRespond` cho người khác: vol / unvol / yes / no; nhân
  viên không thấy lý do của người khác (`swapsForClient_`). Gợi ý người thay
  (`swapPool`/`swapPlan`): tự nhận 🙋 > đã đăng ký giờ / rảnh cả ngày > thương lượng
  > đang có ca khác (làm thêm) > chưa đăng ký (chỉ gợi ý hỏi). Không ai làm cả ca →
  ghép nhiều người, mỗi phần ≥ 2 tiếng; khung còn trống → nút "Báo quản lý".
  Thẻ ca có 2 nút: ⇄ Tìm người đổi ca · 🤒 Báo bận đột xuất (chọn lý do, ghi chú).
  Người được nhờ thấy giờ cụ thể + Đồng ý / Không được; người rảnh thấy "cần người
  làm thay" + 🙋 chọn khung giờ. Quản lý: băng đỏ "ca cần người thay" → hộp xử lý
  (lý do, người tự nhận, phương án có tích chọn, bỏ ca người báo bận / bỏ phần đã có
  người) → Áp dụng vào lịch (ghi vào lịch sử công bố, người bị đổi được báo) · Chỉ
  đánh dấu đã xử lý · 📣 Nhờ nhóm LINE (tốn tin, hỏi trước).
- **Thu gọn:** mọi khung có tiêu đề h3 bấm để gập/mở, nhớ theo máy
  (`enhanceCollapsibles`, localStorage `sbw.col.*`).
- **Bấm giữ ô giờ** trên biểu đồ số người (máy tính: chuột phải) → hộp đặt nhanh
  yêu cầu kỹ năng cho khung đó: ai đang làm + kỹ năng, yêu cầu đang áp dụng (tích
  để xoá), thêm nhanh (kỹ năng, ≥ n người, giờ, mọi ngày / chỉ thứ này / cuối tuần).
- **Chuỗi ngày làm qua hai tháng:** loadMonth trả `adj` (14 ngày cuối tháng trước
  + 7 ngày đầu tháng sau). `entryAnyDay`/`workedAny`; `streakInfo`, máy xếp nháp
  (`consecRunOk`, `consecBefore`, nghỉ giữa ca ngày 1) đều tính qua mép tháng.
- **Sức khoẻ 0–100** (`healthScore`): trừ khi làm liền ≥ 6 ngày (kể cả qua tháng),
  > 40h / 7 ngày, nghỉ giữa ca < 11 tiếng, < 3 ngày nghỉ / 14 ngày, ngày cần chú ý
  sức khoẻ (hôm đó / sắp tới, ca > 6h). Quản lý: chip ♥ cạnh tên, khung "Sức khoẻ
  nhân viên — 14 ngày tới" ở tab Tháng. Nhân viên: vòng điểm + lý do ở tab 今日.
- **Ngày cần chú ý sức khoẻ** `care:<YM>` {emp: [ngày]}: CHỈ chính nhân viên tự
  đánh dấu (`saveCareDays`), không có lý do; quản lý thấy hết, nhân viên chỉ thấy
  của mình. Gợi ý theo chu kỳ (tuỳ chọn) chỉ lưu localStorage trên máy người đó,
  không gửi lên máy chủ. Có dòng nhắc 労働基準法 第68条 (生理休暇).
- **Bản nháp tự động → kế hoạch A/B/C:** thanh nháp có "💾 Lưu thành kế hoạch"
  (chọn ô; lịch đang xếp giữ nguyên), vẫn còn "Giữ lịch này" (dùng luôn, có Hoàn tác,
  không đè ngày đã công bố).
- **Tab 今日 gọn (theo yêu cầu "đừng tràn, đủ thông tin"):** điều hướng ‹ ngày ›,
  nút "Hôm nay" và điểm ♥ nằm NGAY trong hàng đầu thẻ ca (`stTopHTML`); bấm ♥ → hộp
  sức khoẻ (lý do + nút ngày cần chú ý). Việc · Làm cùng · Dặn dò gộp vào MỘT khung
  có tab (`stSegCardHTML`; chỉ một mục thì hiện tiêu đề nhỏ). Thông báo chỉ còn việc
  CẦN LÀM (bỏ dòng "đã công bố"); không có gì thì không hiện khung.
- **Chi viện:** ngày mình đi chi viện, "Làm cùng" = người của quán được chi viện
  (`supportTeam` đọc thẳng bảng tính quán kia qua hub + người quán khác cùng tới;
  tôn trọng hideDraft của quán kia). Giờ đi chi viện KHÔNG cộng vào giờ của quán nhà
  (`storeHoursOfEntry`: tổng tháng, nửa tháng, ngân sách, SA/社員 trong ngày); quán
  được chi viện cộng giờ người tới vào SA. Cạnh tên hiện "+Xh✈"; nhân viên vẫn thấy
  tổng giờ của mình (kèm ✈). Bảng xuất giờ công (`exportHours`) vẫn tính đủ cho người đó.
- **Việc hôm nay: ⚡ Giao nhanh** (`jobQuickPlan` + `assignDayJobs`): việc chưa có
  người / giao cho người không có ca → chia cho người có ca (đúng khung giờ, ít việc
  trước), giữ người đã giao còn có ca; xác nhận danh sách rồi ghi một lượt.
- Chuỗi ngày / ngày nghỉ không đếm sang tháng bên cạnh khi tháng đó chưa xếp gì (`adjKnown`).
- **Nhân viên chỉ thấy lịch đã công bố** (Cài đặt, `hideDraft`). v2026.10.01.2: đổi
  sang mặc định TẮT — bản .01 bật sẵn làm nhân viên mở app thấy trống các ngày chưa chốt
  (tưởng mất dữ liệu; dữ liệu không mất). Bật thì thanh chốt của quản lý ghi rõ "nhân viên
  CHƯA thấy lịch tháng này", thẻ ca nhân viên ghi "Lịch tháng này chưa công bố".
  Trước đây (bản .01): ngày
  chưa chốt không gửi ca cho nhân viên (loadMonth, `adj`, lịch .ics, bot LINE trả
  "chưa công bố"). `staffVisibleSched_`.

**v2026.10.01.3 — hai kỳ trong tháng rõ ràng, chống sửa nhầm lịch đã công bố.**
- Thanh chốt thay bằng 2 thẻ **Kỳ 1 (1–15)** · **Kỳ 2 (16–cuối)** (`perCardHTML`): mỗi thẻ
  một trạng thái (🔒 Đã công bố + giờ công bố / ✏️ Bản nháp + "đã khai x/y người") và đúng
  nút của nó: Công bố kỳ 1 · Công bố kỳ 2 (hoặc Công bố cả tháng khi kỳ 1 còn nháp) · Mở khoá
  kỳ 1 · **Mở khoá kỳ 2** (chỉ mở 16–cuối, kỳ 1 vẫn công bố — server `setMonthLock(…, false,
  …, 'h2')` → lock 'h1', ghi {k:'unlock', sc:'h2'}) · Mở khoá cả tháng. Giữ id cũ
  (lockHalfBtn, lockBtn, lockAllBtn, unlockBtn2) + mới unlockP2.
- Hộp xác nhận nói rõ: ngày nào được công bố, số ca / số người, số ngày còn thiếu người, và
  ngày nào VẪN MỞ cho nhân viên khai.
- **Ngày đã công bố khoá chống sửa nhầm** (quản lý): dải xanh "ĐÃ CÔNG BỐ" + các dòng ca chỉ
  xem; bấm "✏️ Mở sửa ngày này" → dải đỏ "đang sửa ngày đã công bố" (mọi thay đổi ghi lịch sử
  + báo nhân viên), "Xong, khoá lại". Ngày nháp có dải vàng. `canEditShifts` + `state.pubEdit`.
  Dải ngày / lưới có viền xanh cho ngày đã công bố.
- **Nhân viên:** tab Đăng ký có băng 2 kỳ (Kỳ 1 đã chốt — chỉ xem · Kỳ 2 đang nhận đăng ký),
  tự nhảy tới ngày mở đầu tiên (ngày 16) — trước đây đứng ở ngày đã chốt nên tưởng không
  khai được; tiến độ đăng ký chỉ đếm ngày còn mở.

**v2026.10.01.4 — chạy ổn trên Google thật, quản lý gọn, hướng dẫn mới.**
- **Tốc độ:** `findRow_` chỉ đọc cột A:B (trước đọc cả trang kèm các ô JSON lớn, nhiều lần
  mỗi lần lưu) + bảng chỉ mục trong một lần chạy (`ROWIDX_`), luôn kiểm lại trước khi dùng,
  không nhớ kết quả "không có"; xoá dòng thì xoá chỉ mục.
- **Dữ liệu không phình:** `pruneOldData_()` chạy mỗi đêm cùng sao lưu: xoá bak:schedule /
  bakallow cũ hơn 2 tháng, pubsnap cũ hơn 12 tháng (xoá luôn cache — nếu không kvGet_ còn
  trả khoá đã xoá), dòng History của tháng cũ hơn 6 tháng.
- **🩺 Kiểm tra hệ thống** (thẻ Sao lưu, chỉ quản lý — `selfCheck`): phiên bản, thời gian
  mở tháng, số dòng, 6 khoá nặng nhất, tổng KB, số dòng lịch sử, sao lưu gần nhất, cảnh báo;
  nút "🧹 Dọn dữ liệu cũ" chạy dọn ngay.
- **Quản lý gọn:** 2 thẻ kỳ gộp vào một hàng (tên · trạng thái ngắn · nút; chữ dài để ở
  tooltip) + dòng công bố mini (số sửa / chưa xem / 🕘 lịch sử). Tab Ngày: một khối
  `day-head` = dải trạng thái ngày + các chip cảnh báo (đổi ca / báo lịch sai / chi viện).
  Ô Sức khoẻ nhân viên rút gọn ("n người cần chú ý").
- **Nhân viên:** nhảy tới ngày mở theo từng tháng (đổi tháng cũng nhảy); thông báo "nhờ làm
  thay" không còn dấu "·" thừa khi không có giờ.
- **Hướng dẫn mới (PDF điện thoại + A4, video; Nhật + Việt):** ‹ › và ♥ ở tab Hôm nay,
  thẻ Việc / Làm cùng / Dặn dò, 2 kỳ đăng ký, ca bị đổi → "Đã xem", tìm người đổi ca + gợi ý
  ghép người + Đồng ý / Không được + 🙋 Tôi làm được + Báo quản lý, báo bận đột xuất,
  sức khoẻ & ngày cần chú ý (riêng tư, 生理休暇), lệnh LINE "thay doi / 変更".

**v2026.10.01.5 — màn chào, ghi nhớ đăng nhập, sức khoẻ chỉ quản lý thấy, sửa lỗi tên nhảy.**
- **Màn chào** (`#splash`, HTML + script nhỏ ngay đầu `<body>`, hiện trước khi tải xong phần
  chính; từ v.6 luôn tiếng Nhật): lời chào theo giờ + tên (nhớ ở `sbw.who`) + tên quán + ngày + câu nhắn đổi mỗi 1,8s.
  Biết tên quán / tên người là cập nhật ngay (`splashUpdate`); tắt bằng `hideSplash()` (tối
  thiểu ~0,7s, mờ dần). Không thêm thời gian chờ — chỉ lấp khoảng chờ máy chủ.
- **Ghi nhớ đăng nhập 30 ngày** (ô tích sẵn ở màn nhập mã; máy dùng chung thì bỏ tích):
  - Máy chủ: Script Property `SESS_DEV` = { devId: {e, c, t, ua} }. Khoá máy `dk` = token ký
    HMAC {r:'dev', e, d} không tự hết hạn; hạn nằm ở `t` (30 ngày kể từ lần mở gần nhất, gia
    hạn mỗi lần mở, ghi tối đa 1 lần/giờ). Tối đa 5 máy/người.
  - `bootstrap(dk)` trả `session` (vào thẳng, không thêm lượt gọi) hoặc `sessionErr`
    ('expired' | 'revoked' | 'bad'). Phiên mở từ máy có `d` → `verifyToken_` kiểm máy còn sống,
    nên đăng xuất từ xa có hiệu lực NGAY cả với phiên đang mở.
  - Thu hồi máy: `revokeDevices(token, empId | '*')` (quản lý), `forgetDevice(token)` (nhân viên
    bấm Đăng xuất), tự động khi quản lý xoá / đặt mã hoặc xoá nhân viên; bootstrap kiểm nhân
    viên còn trong danh sách. `loadMonth` trả `devs` (chỉ quản lý, không lộ khoá).
  - Máy khách: `sbw.dk` trong localStorage; **iPhone/Safari** xoá bộ nhớ của iframe Apps Script
    mỗi lần đóng (bộ nhớ bên thứ ba "ephemeral") → khoá còn được ghi lên địa chỉ trang
    (`google.script.history.replace(null, {dk})`, đọc bằng `google.script.url.getLocation`),
    nên icon màn hình chính / tab mở lại vẫn nhớ. Phiên 12 giờ hết hạn giữa chừng → `call()`
    lặng lẽ gọi `bootstrap(dk)` rồi làm lại đúng một lần.
  - Quản lý: thẻ tên có 📱n + mục "📵 Đăng xuất khỏi mọi máy"; nút "Đăng xuất tất cả nhân viên".
  - Rủi ro đã biết: trên iPhone khoá nằm trong địa chỉ trang — nhân viên copy link từ thanh địa
    chỉ gửi người khác thì người đó vào được tài khoản của họ (chỉ quyền nhân viên). Cách xử lý:
    dùng link chia sẻ của quản lý; nghi lộ thì đăng xuất từ xa.
  - Harness: bộ kiểm tra cũ mặc định KHÔNG ghi nhớ (`globalThis.__REMEMBER_ON` để bật).
- **Sức khoẻ chỉ quản lý thấy:** bỏ ♥ ở tab Hôm nay của nhân viên. Nhân viên vẫn tự đánh dấu
  ngày cần chú ý sức khoẻ ở tab Đăng ký (nút 🌸 trong thanh tiến độ). Quản lý: ♥ nằm NGAY CẠNH
  số giờ của ca (`.er-top` = giờ ca + ♥), không còn nằm ở dòng thống kê (bị ẩn trên điện thoại,
  tràn / bị che ở khổ vừa); điện thoại cũng thấy.
- **Sửa lỗi tên nhảy liên tục** (video iPhone, chế độ "xem như nhân viên"): sau khi đổi người,
  vẽ lại trang rồi `restoreUI` focus lại `<select id="viewAsSel">` → iPhone tự bật lại bảng
  chọn, ngón tay đang lướt là chọn nhầm người khác. Nay không bao giờ focus lại `<select>`, và
  `blur()` ngay khi đổi.
- Hướng dẫn PDF + video cập nhật: ghi nhớ đăng nhập, bỏ ♥ phía nhân viên, ngày cần chú ý ở tab
  Đăng ký.

**v2026.10.01.6 — màn chào tiếng Nhật sinh động, chờ tải vui hơn, chuyển động kiểu iPhone.**
- **Màn chào luôn tiếng Nhật** (đa số nhân viên người Nhật), bất kể ngôn ngữ đã chọn: あいさつ
  theo giờ + 「〇〇さん」 + 「10月2日（金）」 + câu nhắn đổi mỗi 1,7s (thêm câu cuối tuần).
  Hình động: sandwich 6 lớp rơi xuống xếp chồng có độ nảy, nhún khi đủ lớp + ✨, nguyên liệu
  (🥬🍅🧀🥒…) bay lơ lửng nền, 3 chấm màu nhảy. Tắt bằng mờ + phóng nhẹ. Tôn trọng
  "giảm chuyển động" của máy.
- **Chờ tải trong trang** (`setBusy`): viên nổi trên đầu "🥪 + câu ngẫu nhiên + 3 chấm", chỉ hiện
  khi chờ > 0,25s (không nháy), câu theo ngôn ngữ (`busyMsgs`, ngăn bằng |). Trang mờ .62.
- **Chuyển động kiểu iPhone:**
  - Bấm nút: co .94 nhanh, thả ra bật lại lò xo `cubic-bezier(.34,1.56,.64,1)` (danh sách nút trong
    CSS `:is(.btn, .tab-bar button, …)`).
  - Nhóm nút chọn (`.mode-switch, .lang-switch, .login-tabs, .tab-bar, .st-segtabs`): viên nền
    `.seg-ind` TRƯỢT + co giãn tới nút mới (`segGlide`). Trang vẽ lại bằng innerHTML nên nhớ vị
    trí cũ theo khoá nhóm (`segKey` = class + thuộc tính data- của nút) rồi trượt từ đó;
    MutationObserver chỉ phản ứng khi có nhóm nút mới được thêm hoặc class của nút trong nhóm
    đổi (không ảnh hưởng lúc kéo ca). Nút đang chọn thành trong suốt (`.has-ind`). Không đổi
    `position` nếu nhóm đã fixed/absolute (thanh tab dưới đáy của nhân viên).
  - Nội dung đổi tab: hiện dần + phóng .992→1; hộp thoại bật ra kiểu lò xo (`modalPop`).

**v2026.10.03.1 — xin đổi giờ, おみくじ, ありがとう, nhấn nút mượt hơn.**
- **Xin đổi giờ (đi trễ / về sớm / rút ngắn ca), quản lý duyệt:** nút "⏰ 時間変更" trên thẻ ca
  (cạnh 交代を探す · 急な欠勤 — nhãn rút gọn để 3 nút vừa một hàng). Hộp chọn loại + giờ mới
  (bước 30') + lý do (riêng quản lý thấy). Lưu chung vào yêu cầu đổi ca `swap:<YM>` với
  `keep:{from,to}` (khung VẪN làm) + `tc: late|early|short` + `mgr:true` — nên mọi thứ của đổi
  ca dùng lại được: `swapTargets()` trả về phần giờ BỎ RA (ca − keep, khi chưa done và không
  urgent), đồng nghiệp rảnh thấy "⏰ 代わりを募集中" và 🙋 nhận làm, gợi ý ghép người…
  Quản lý: chip ⏰ trên băng; hộp duyệt "時間変更の申請": ca cũ → giờ mới + lý do, cảnh báo giờ
  nào THIẾU NGƯỜI nếu không ai thay (`tcShortHours`, theo định mức) hoặc "✓ vẫn đủ người";
  người tự nhận / đã đồng ý được tích sẵn, gợi ý của máy chỉ tích khi thiếu người; "✓ 承認" =
  cắt ca người xin còn đúng keep (giờ nghỉ giữ nếu còn nằm trong, không thì tính lại) + thêm
  người thay; "✕ 却下" = `done:{rej:true}` (chỉ quản lý đặt được), ca giữ nguyên, nhân viên
  thấy "承認されませんでした". Báo bận đột xuất luôn bỏ keep.
- **🎴 今日のおみくじ** (tab Hôm nay, nhân viên): mỗi người mỗi ngày một quẻ CỐ ĐỊNH (băm
  empId + ngày, không cần máy chủ): 大吉15 / 中吉25 / 小吉25 / 吉25 / 末吉10 (không có 凶) +
  sandwich / topping / màu may mắn + câu cổ vũ (ja/vi/en). Lần đầu trong ngày có hiệu ứng lắc
  rồi lật thẻ; sau đó nút hiện luôn kết quả. Nút chưa rút lắc nhẹ mỗi 3s để gợi tò mò.
- **💌 ありがとう:** `thx:<YM>` = {list:[{id,f,t,s,m,at,seen}]}; `sendThanks(token, toId, stamp,
  msg)` (5 stamp 🙏👏🦸🌟🍀, lời nhắn ≤80 ký tự, ≤20 thẻ/ngày/người, quản lý gửi được với tên
  "店長"), `ackThanks(token)`; `loadMonth.thx` theo THÁNG THẬT (này + trước): nhân viên chỉ thấy
  thẻ mình gửi/nhận, quản lý chỉ thấy SỐ LƯỢNG theo người. Nhân viên: nút 💌 có số chưa đọc,
  thông báo ở お知らせ, hộp xem (số thẻ tháng này) + gửi (đồng nghiệp làm cùng hôm nay lên đầu,
  câu mẫu). Đổi ca xong có nút "💌 〇〇さんにありがとう" (chọn sẵn người + 🦸). Dọn sau 6 tháng.
- **Nhấn nút mượt hơn:** iPhone không bật `:active` nếu trang không có touchstart → thêm
  touchstart rỗng + lớp `.prs` gắn bằng pointerdown (co .95 ngay khi chạm, thả ra bật lò xo),
  bỏ qua thanh kéo giờ. Hộp thoại đóng có hiệu ứng (mờ + thu nhỏ .17s; id của hộp cũ bị gỡ
  ngay để hộp mở tiếp theo không trùng #mOk). Bộ theo dõi nhóm nút bỏ qua thay đổi chỉ do
  `.prs`/`.seg-pop` (không đo lại layout mỗi lần chạm).

**v2026.10.07.1 — đợt rà lỗi toàn diện (4 người rà song song: máy chủ / đổi ca / phiên & giao diện / ngày tháng & dịch).**
Máy chủ:
- LINE: không còn dò được mã liên kết — chỉ nhận liên kết từ NHÓM (không phòng chat), bắt buộc
  `destination` đúng bot, `/group/{id}/summary` phải 200, mỗi lần gọi tối đa 3 lần thử, cả bot
  tối đa 20 lần sai / giờ (CacheService `lnbind:bad`), xử lý tối đa 50 sự kiện / lần.
- Phiên nhân viên có số "đời" `v` (Script Property `EMP_VER`); quản lý đặt / xoá mã hoặc xoá nhân
  viên → `bumpEmpVer_` → mọi token cũ chết ngay (trước chỉ phiên "máy đã ghi nhớ" mới bị thu hồi).
- `throttle_`: tăng bộ đếm trong lock (gửi song song không đếm hụt); quản lý 15 lần, nhân viên 8.
- `runDailyBackup` (gọi được không cần đăng nhập): mọi việc nằm sau giới hạn 20 giờ.
- Cache: `putCacheSafe_` (người ghi) đặt dấu `w:<key>` 30s; `kvGet_` (người đọc không lock) dùng
  `putCacheFromRead_` — thấy dấu thì không cất bản vừa đọc (tránh bản cũ đè bản mới trong cache).
- Kiểm dữ liệu vào: `assertYearMonth_` (20xx-01..12) cho mọi hàm nhận tháng (trước `loadMonth('rác')`
  tạo dòng mới mỗi lần); `assertDay_` (số nguyên trong tháng); `guardEntry_` (kiểu, ≤ 6.000 ký tự,
  ≤ 8 khúc ca, giờ là số −1..36) cho ô lịch / đăng ký / yêu cầu, cả bản lưu nhiều ngày.
- `readMonthNormalized_` vá dữ liệu cũ bằng `kvSet_(…, noWait)` (không chờ lock — tránh tự kẹt khi
  được gọi từ trong đoạn đang giữ lock, vd. tích việc theo vai trò).
- `saveDayInfo` giữ dấu ngày lễ `h` (trước lưu dự toán / ghi chú là mất).
- `endOf_` (xuất giờ công, lịch điện thoại ICS): ca tới "L" lấy giờ đóng cửa trong Cài đặt, không
  cứng 21:00. ICS tính tháng theo giờ Nhật.
- `normSwap_`: nhân viên lưu lại không xoá được "đã xử lý / đã từ chối"; yêu cầu MỚI (at sau lúc xử
  lý) mở lại và bỏ người nhận / câu trả lời cũ.
- Nhân viên không còn nhận ngân sách giờ và giới hạn giờ / ưu tiên / giờ cố định của người khác;
  `swapRespond('vol')` theo lịch nhân viên được phép thấy (không lộ giờ nháp đang ẩn).
Máy khách — đổi ca / đổi giờ:
- Chọn người thay sau khi xin đổi giờ không còn biến thành đổi CẢ ca (giữ `keep`/`tc`).
- Hộp xử lý của quản lý (`swapMgrParts` viết lại): người được nhờ mà "không được" không tính là đã có
  người; người tự nhận được thêm vào; bỏ người đã bị xoá; chỉ tích sẵn người ĐÃ ĐỒNG Ý / tự nhận.
- Người thay: khúc mới nối liền MỌI khúc chạm nhau (kể cả nối hai ca), tính lại giờ nghỉ, ca tới giờ
  đóng cửa giữ "L". Người xin còn lại > 6 tiếng thì tính lại giờ nghỉ.
- Xin đổi giờ: số giờ bị cắt và kiểm tra tính theo giờ làm THẬT (ca tách đôi); khung không có giờ
  làm nào bị chặn. Báo bận sau khi xin đổi giờ: tiêu đề + khung trống theo CẢ ca.
- Cảnh báo thiếu người tính theo từng nửa tiếng (giữ tới 19:30 thì báo từ 19:30).
Máy khách — phiên, ngày tháng, dịch:
- Khoá máy chỉ có trên địa chỉ trang (link bị sao chép) chỉ được tin trên iPhone/Safari và phải hỏi
  "おかえりなさい、〇〇さん — はい / 別の人です"; khoá trong bộ nhớ của chính máy luôn ưu tiên.
  "別の人です" chỉ dọn trên máy này, không đăng xuất máy của chủ.
- `init` bọc try/finally (màn chào luôn tắt) + màn chào tự tắt sau 20s; lỗi khi mở có nút 再読み込み.
- `call()`: mạng lỗi lúc tự mở lại phiên không xoá máy đã ghi nhớ; trả lời "hết hạn" muộn của phiên
  cũ không đá phiên mới (so `tok0`).
- Hộp thoại: Esc = Huỷ, trả focus về chỗ cũ.
- "Hôm nay" theo GIỜ NHẬT (`jstNow()`, kể cả điện thoại đặt giờ Việt Nam) và tự sang ngày mới khi
  app vẫn mở (`refreshToday`: visibilitychange / focus / mỗi phút; sang tháng thì tải tháng mới).
- Cuối tháng: thẻ 今日 hiện ca đầu tháng sau (từ `state.adj.next`). Ô "休み" chỉ đếm ngày đã công bố.
- Mọi thông báo lỗi của máy chủ (113 câu + 13 câu có số) có bản dịch Nhật / Anh (`SRV_MSG`,
  `SRV_MSG_RE`) — trước nhiều lỗi hiện tiếng Việt trên màn tiếng Nhật.
- Tháng (vi, ≤ 375px): ô kế hoạch không còn tràn ngang.
Vòng kiểm tra lại (người rà chạy lại kịch bản của mình + cố phá bản sửa), sửa thêm:
- Hộp xử lý: người được nhờ CHƯA trả lời chỉ được tích sẵn ĐÚNG phần chưa ai chắc chắn (tách dòng,
  không xếp trùng giờ); người tự nhận thứ hai hiện thành dòng để trống ô tích (`alt`); cảnh báo thiếu
  người tính cả người quán khác tới chi viện (`guestsFor`).
- `refreshToday`: không vẽ lại khi đang kéo (pointer đang giữ), đang mở dòng / bảng, còn thay đổi
  đang lưu (`savePending`), đang gõ hoặc mở hộp thoại; lần bị hoãn sẽ vẽ ở lần kiểm sau (`drawnDay`).
- Hộp "おかえりなさい": chỉ nút 別の人です mới xoá khoá (bấm ra ngoài / Esc không tính — `noDismiss`);
  Esc khi đang gõ IME tiếng Nhật không đóng hộp; màn chào hết 20s mà chưa có gì thì hiện "読み込み中… ↻".
- Máy chủ: `kvUpdate_` (đọc–sửa–ghi trong MỘT lock) cho `setDayHoliday`, `saveMemo`, `deleteMemo`;
  `throttle_` giữ chỗ một lần thử TRƯỚC khi so mã (song song cũng không quá giới hạn); LINE kiểm bot có
  trong nhóm TRƯỚC khi tính lần sai, bị chặn thì trả lời "thử lại sau 1 giờ"; yêu cầu đổi ca MỚI gửi cờ
  `fresh` — máy chủ tự đóng dấu giờ (không so đồng hồ hai điện thoại), `done.at` cũng do máy chủ đặt.
- Còn để ngỏ: kế hoạch A/B/C, việc lặp lại, máy học vẫn đọc–ghi ngoài lock (chỉ quản lý, hai máy
  quản lý cùng sửa một lúc mới có thể đè nhau); Tab trong hộp thoại chưa bị giữ trong hộp (máy tính).
- Còn để ngỏ: thay đổi lịch THÁNG SAU sau khi công bố chưa hiện trên thẻ "ca đã đổi" (LINE 「変更」
  đã có); xuất giờ công tính cả giờ chi viện quán khác (✈) — chờ quản lý quyết định.

### v2026.10.07.2 — bảng tháng nửa tháng, xếp nhanh nửa tháng, chi viện theo giờ quán khác, tem đi làm, màn biểu tượng
Bảng tổng tháng (tab Tháng):
- Nút 全体 / 1〜15 / 16〜cuối và bật/tắt hàng 希望 / 確定 (nhớ trên máy: `sbw.mgv`). Không tắt được
  hàng cuối cùng còn hiện.
- Nhóm nút xếp nháp: [⚡ シフト自動作成] [⚡1〜15] [⚡16〜cuối]. Nút nhanh dùng ĐÚNG tuỳ chọn lần trước,
  chỉ đổi phạm vi, không hỏi gì, ra bản nháp như thường (`runAuto(quick)`). Nửa đầu đã công bố thì ẩn ⚡1〜15.
Bàn xếp ca (tab Ngày):
- Cột phải mỗi dòng chỉ còn giờ ca + ♥ (quản lý). Chip gọn 🔥n (làm liền) / 💤n (nghỉ liền) nằm NGAY CẠNH
  TÊN ở bàn xếp ca (quản lý muốn vậy; màn nhân viên KHÔNG hiện chip này). Rê chuột /
  chạm chip → bảng tổng quát tháng của người đó: tổng giờ, 1〜15 / 16〜cuối, cột giờ từng ngày (ngày
  đang xem có viền, ✈ màu cam, 休), chuỗi làm/nghỉ so giới hạn. Quản lý bấm cột ngày → mở ngày đó.
  Hết tràn đè thanh giờ ở 390 / 600 / 820px.
- Khúc nghỉ có 2 mép kéo như thanh giờ (nới / thu, nấc 30 phút, ngắn nhất 30 phút, trong ca);
  Shift + ←/→ = kéo mép cuối. Khúc quá hẹp (< 30px) thì ẩn mép để chạm giữa vẫn là dời.
- Người chỉ đi chi viện hôm đó (mọi khúc ✈) xếp CUỐI bảng.
- Dòng "nghỉ" chỉ ghi 正社員; SA đang nghỉ vẫn gọi lại được ở ô ứng viên.
- Nút ▾ đứng TRƯỚC tên (cùng một cột mọi dòng, không chạy theo độ dài tên). Cột phải cố định bề
  rộng ở điện thoại → ô giờ vào/ra thẳng hàng mọi dòng. Số dùng `tabular-nums` (không nhảy bề rộng).
- Ngày đã chốt (chỉ xem): vẫn vẽ thanh giờ + khúc nghỉ (trước để trống).
- Điện thoại: ô dặn dò + nút 保存 không còn bị bóp thành chữ dọc; thẻ 第1期 / 第2期 cùng một khuôn
  (tên · trạng thái · nút cố định bên phải).
Chi viện (ヘルプ):
- Cài đặt › 店舗設定: danh sách "quán đi chi viện" (tên + giờ mở / đóng cửa, tối đa 8) → `settings.supStores`.
- Ca ✈: ô chọn quán. Chọn quán thì ca lưu `supStore`, `supOpen`, `supClose`, ghi chú tự điền "→ tên quán".
  Ca ✈ "đến L" = giờ đóng cửa CỦA QUÁN ĐÓ (máy khách `closeForShift`, máy chủ `supCloseOr_` trong
  `endOf_` → xuất giờ công, ICS, LINE). Trước: mọi ca "L" bị kéo về giờ đóng cửa quán mình → sai giờ công.
- Trục giờ của ngày nới ra theo ca ✈ hôm đó (vd. 7–22); ca thường vẫn chỉ kéo trong giờ quán mình
  (`homeLim`), ca ✈ kéo trong giờ quán kia. Ca từ "kết nối các quán" tự gắn `supStore` (và giờ nếu tên khớp).
In / PDF nửa tháng:
- Ngày thiếu người so với định mức: thêm hàng đỏ "⚠ 募集（n名不足）", tô đỏ đúng các ô nửa tiếng thiếu,
  để trống tên / giờ cho ai làm được tự điền. Dòng "休み" chỉ ghi 正社員. Trục giờ tính cả ca ✈.
Đổi ca:
- Hiện "người xin ⇄ người thay" (người thay BÊN PHẢI): chip của quản lý, hộp xử lý, ô đổi ca của
  nhân viên ("あなた ⇄ みゆ"). Người thay = đã đồng ý → tự nhận → đang được nhờ (`swapReplIds`).
出勤スタンプカード (thay おみくじ — đã xoá hẳn):
- Ngày có ca, nhân viên mở app (tab nào cũng được) → tự đóng tem hôm nay, hiệu ứng "ポン!" + rung nhẹ.
  Máy chủ `stampToday`: chỉ nhân viên, chỉ HÔM NAY (giờ Nhật), chỉ khi hôm nay có ca nhân viên thấy được;
  không đóng hộ, không đóng bù. Lưu `stamp:<YYYY-MM>` = {empId:{ngày: lúc}}. loadMonth trả `stamps`
  (nhân viên: tem của mình; quản lý: số tem từng người).
- Thẻ: lưới các ngày có ca (tem = biểu tượng món ăn, nghiêng ngẫu nhiên), thanh tiến độ, huy hiệu
  🥉3 · 🥈7 · 🥇12 · 🏆皆勤, câu động viên ("皆勤ペース" khi chưa sót ngày nào).
Màn biểu tượng kiểu iPhone (tab Tháng / Cài đặt):
- Các khối phụ gom thành biểu tượng có nhãn ngắn + số đỏ (vd. ❤️ 健康 có người thấp điểm). Chạm → khối
  phóng to từ đúng biểu tượng thành khung nổi (máy tính: giữa màn hình; điện thoại: toàn màn hình);
  ✕ / Esc / chạm nền → thu nhỏ về biểu tượng. Bảng tổng tháng vẫn trải sẵn.
- Khối là phần tử cũ được CHUYỂN vào khung (giữ id + sự kiện); vẽ lại trang (vd. lưu cài đặt) thì
  khung tự mở lại đúng chỗ cuộn (`state.openApp`). Nút trên tiêu đề khối (比べる / 取り込む) được đưa lên
  thanh tiêu đề khung. Đổi tab / nhảy sang ngày khác → `teardownApp()` dọn khung + mở lại cuộn trang.
- Trình duyệt do máy điều khiển (`navigator.webdriver`, bộ kiểm thử) giữ các khối trải phẳng, trừ khi
  đặt `window.__LAUNCHER_ON = true` (v9.js).

### v2026.10.07.3 — 発注 (đặt hàng + kiểm toán tồn kho), hộp việc của quản lý + email, dọn mục thừa
Dọn mục không cần nữa (nhân viên đã tự khai 希望):
- Bỏ yêu cầu "rảnh cả ngày" (nút ở hộp yêu cầu, nút "🟢 cả tháng tôi rảnh", dòng "rảnh cả ngày" trên bàn xếp ca).
  Người KHÔNG xin ca cụ thể, KHÔNG xin nghỉ và chưa được xếp → nhóm "フリー（調整可）/ xếp linh động" ở ô ứng viên
  (dữ liệu "rảnh cả ngày" cũ cũng vào nhóm này). Nút "終日OK" của 希望 (đăng ký cả ngày) vẫn giữ.
- Bỏ "khoá xếp đúng y đăng ký" (`empLocked()` luôn false, bỏ nút; máy chủ không còn chặn xoá vì khoá cũ).
発注 (đặt hàng) — Code.gs `hc*`, máy khách `hc*`:
- Danh mục lấy từ file lịch sử đặt hàng オザックス (8/2–10/5, 127 món, 7 khu: 🥬野菜 🧊冷凍 ❄️冷蔵 📦常温 🥤包材
  🧻消耗品 🧽その他). Món lâu không đặt (trước 9/1) mặc định ẩn. Định mức gợi ý = dùng trung bình/ngày × 4 (quản lý sửa).
- 3 kiểu: theo doanh thu (rau: レタス 1袋/2万 · ピーマン 1/10万 · オニオン 1/5万 · トマト 1C/9万), định mức (đặt = chuẩn −
  tồn), khi cần (nhập tay). Rau: cần = doanh thu dự kiến (予算 ngày, không có thì mặc định theo thứ) từ HÔM NAY tới hết
  ngày trước khi lô rau kế tiếp tới × (1 + 25%) ÷ ¥/đơn vị; đặt = làm tròn LÊN (cần − tồn).
- Ngày đặt: rau 月水木金日, hàng khác 月水金日, chốt 11:00, giao hôm sau (quản lý đổi được). Ngày chỉ đặt rau → chỉ khu rau.
- Nhân viên: màn toàn màn hình, tab theo khu, ô tồn [− số +] (Enter → món kế), cột "đặt" tự tính (sửa tay → cam), tự lưu
  sau 0,9s; nhiều người chia khu cùng lúc (máy chủ gộp theo món; màn tự cập nhật 20s). Chốt: tải lại số mới nhất của mọi
  người, cảnh báo món chưa nhập, máy chủ từ chối nếu có người vừa nhập sau (`seenAt`). Sau chốt: danh sách mã + tên + số để
  nhập lên hệ thống オザックス, nút chép, nút "đã đặt". Quản lý mở lại được.
- Nhắc: mở app ngày đặt hàng (có ca) → hộp "📦 今日は発注日" + đếm ngược + dặn dò / sự kiện hôm nay (ngày không đặt hàng mà
  có dặn dò → hộp dặn dò 1 lần/ngày); trước giờ chốt 60/30/10 phút: thông báo + rung (hỏi máy chủ `hcStatus` trước, người
  khác chốt rồi thì không kêu). Thẻ 発注 ở tab 今日 (nhân viên) và chip ở tab Ngày (quản lý).
- Nhân viên KHÔNG nhận doanh thu, ¥/đơn vị, % cộng thêm (không suy ra được doanh thu). Nhân viên chỉ làm phiếu HÔM NAY.
- Kiểm toán (tab Tháng › 在庫チェック): doanh thu (thực tế nhập tay / dự kiến), tiền đặt tháng, hàng đã dùng (= tồn đầu + nhập −
  tồn cuối giữa lần kiểm đầu và cuối, tính từ lần kiểm cuối tháng trước), tồn cuối, hao hụt rau (dùng > lý thuyết), tuân thủ
  (ngày đặt đã chốt / chốt trễ / chưa chốt, tính từ ngày bắt đầu dùng), chi phí theo khu, bảng từng món (chênh > +15% đỏ).
- Cài đặt › 発注設定: ngày đặt rau / hàng khác, giờ chốt, % rau, số ngày giao, doanh thu mặc định theo thứ; danh mục theo khu:
  👁 ẩn (ngừng bán theo mùa), sửa tên, kiểu, ¥/đơn vị hoặc định mức, đếm lẻ (アボカド theo quả); thêm món mới.
- Dữ liệu: `hc:items`, `hc:cfg`, `hc:<YYYY-MM>` {ngày:{c,z,o,sg,fin,pl,win,S,nd}}, `hc:act`.
🔔 Hộp việc của quản lý + email:
- Nhân viên báo nghỉ đột xuất / xin đổi giờ / xin đổi ca / nhờ quản lý / huỷ / báo "không đi làm được" / báo lịch sai →
  sự kiện `mgrev` (45 ngày, gộp lần lưu lặp trong 2 phút). Mở app quản lý có thông báo mới → hộp "お知らせ・やること" hiện ngay.
- Hộp gồm "やること" (tính trên máy): yêu cầu đổi ca chờ xử lý, người báo nghỉ vẫn đang có ca, báo sai chưa xử lý, ngày thiếu
  người 7 ngày tới, 発注 chưa chốt / chưa đặt, việc hôm nay / hôm qua chưa xong, kỳ đang chạy chưa công bố, chi viện chờ
  duyệt, sức khoẻ thấp. Bấm → tới đúng ngày trên bàn xếp ca (đổi ca: mở luôn hộp xử lý). Chuông 🔔 trên thanh trên có số;
  app đang mở thì 2 phút hỏi lại, có thông báo mới → toast + rung.
- Rê chuột lên nút đổi ca (trên dòng / chip trên đầu) → thẻ chi tiết: loại, ca, khung vẫn làm, khung cần người, lý do, đang
  nhờ ai (trả lời), ai tự nhận, khung chưa có ai. Bấm nút đổi ca trên dòng → mở hộp xử lý (trước: xoá cờ).
- Email: Cài đặt › 店舗設定 › 📧 (tối đa 3 địa chỉ, bật/tắt, gửi thử). Gửi ngay bằng MailApp khi có sự kiện; hết hạn mức /
  chưa cấp quyền thì bỏ qua (thao tác của nhân viên không hỏng). LẦN ĐẦU phải mở trình soạn Apps Script chạy 1 hàm để cấp
  quyền gửi mail. Nhân viên không nhận địa chỉ email.
- Bộ kiểm thử tự động (navigator.webdriver) không bật hộp nhắc khi mở app, trừ khi `window.__NOTICE_ON = true`.

### v2026.10.07.4 — đếm ngược trước khi báo quản lý, giao diện phẳng + biểu tượng nét đơn, sửa "bấm tên bị treo"

- **Báo đổi ca / báo nghỉ đột xuất / xin đổi giờ / nhờ quản lý tìm người:** nhân viên bấm xong thì
  hiện thanh đếm ngược 60 giây "… giây nữa sẽ báo quản lý" + nút **Hoàn tác**. Hoàn tác trong 60 giây
  = như chưa từng báo (không thông báo, không email, kể cả thông báo "huỷ"). Hết giờ mới báo.
  Máy chủ tự chờ 63 giây (`MGR_EV_DELAY_MS`, dư 3 giây cho mạng chậm): sự kiện có `due`, chưa tới
  giờ thì quản lý không thấy; thư được gửi bởi `mgrFlushMail_` khi có người dùng app, khi máy nhân
  viên hết đếm ngược (gọi `mgrFlushMail`), hoặc trình kích hoạt 5 phút `mailQueueTick` (tự tạo khi
  lưu Cài đặt có bật email). Báo "không đi làm được" và "báo lịch sai" vẫn gửi ngay.
  Lưu lại cùng yêu cầu trong 2 phút chỉ cập nhật nội dung, không báo/gửi lần hai.
- **Giao diện:** bỏ hết nền trong suốt/mờ kính (thanh tab dưới đáy, nền sau hộp thoại), thẻ bo góc
  đều không còn mép răng cưa kiểu vé, bỏ viền nét đứt trên thẻ/nút/ô lịch, bỏ gradient (ô màn biểu
  tượng, tem đi làm, thanh tiến độ). Mọi emoji → biểu tượng nét đơn cùng màu chữ (kể cả màn chào:
  bỏ đồ ăn bay, bỏ emoji trong lời chào). Tem đi làm: dấu ✓ xanh thay cho đồ ăn.
- **Sửa lỗi "bấm tên trong khung xếp ca bị treo":** dòng của tháng đã chốt bị làm mờ bằng
  `opacity` → bảng sửa bị nền mờ / thẻ bên phải che, bấm không được. Đã sửa.
- **Mở app nhanh hơn:** máy đã nhớ đăng nhập chỉ còn 1 lần gọi máy chủ (`bootstrap` trả luôn dữ liệu
  tháng); `loadMonth` đọc ~30 khoá bộ nhớ đệm bằng 1 lần `getAll` thay vì 30 lần.
- **Kéo thanh giờ:** chỉ kéo mép khi bấm sát mép (≤14px), có vùng chết trước khi bắt đầu kéo, kéo dọc
  là cuộn trang chứ không kéo ca; mép giờ nghỉ chỉ hiện khi rê chuột/chọn giờ nghỉ.

### v2026.10.07.5 — màu và nút chuyên nghiệp

- Bảng kiểu "GIAO DIỆN CHUYÊN NGHIỆP (v.5)" đặt CUỐI `<style>` đầu trang (thắng luật cũ; chế độ tối
  tự sinh từ đó, riêng các biến `--tag-*`, `--ctl-line` có khối tối viết tay vì bộ sinh tối không đổi biến).
- Nền trang xám trung tính `#F4F5F7` (bỏ tông kem), chữ `#1D2125`, 1 màu chủ đạo xanh `#146C43`.
- Nút: chính = xanh đặc; phụ = nền trắng viền xám `#D0D5DD`; tất cả bo 8px (bỏ kiểu viên thuốc 999px),
  chữ đậm vừa (600). Nhấn nút chỉ lún nhẹ (0.97), viên trượt của nhóm nút không nảy.
- Nhóm nút chọn (ngôn ngữ, chế độ, tab, 全体/1〜15/16〜31): nền xám, nút đang chọn màu trắng.
- Nhãn trạng thái (下書き / 公開済み / 12時 / SA / 社員 / ♥…): chữ nhật bo 6px, nền nhạt theo nghĩa
  (xanh = ổn, vàng = nháp/chú ý, đỏ = lỗi, xám = trung tính).
- Thẻ kỳ công bố, dặn dò, tiến độ đăng ký, ca hôm nay: nền trắng + vạch màu 4px bên trái thay cho nền
  kem/hồng/tím. Emoji trong CSS (`::before`) cũng đổi sang biểu tượng nét đơn (mask SVG).
- Đóng tem đi làm: chỉ báo bằng dòng thông báo nhỏ (bỏ con dấu "ポン" to giữa màn hình). Khi in: nền trắng.

### v2026.10.08.1 — mẫu giao diện, xem trước bản in, báo cáo tháng (POS · 原価 · 人時売上), kiểm kê 棚卸, thông số nhân viên, lịch quán khác

- **Mẫu giao diện** (nút bảng màu cạnh nút sáng/tối): Hiện đại (mặc định) · Xanh dương · Tối giản ·
  Cổ điển (y như kiểu cũ, có emoji). Màu chủ đạo tuỳ chọn. Mỗi máy tự chọn (localStorage `sbw.skin`,
  `sbw.accent`); quản lý tick "mặc định cho cả quán" → `settings.skin / accent`. Màu chữ dặn dò 📌
  (`settings.noteColor`, biến CSS `--note-ink`) áp dụng cả quán + bản in.
- **Xem trước bản in**: bấm 🖨 nửa tháng → khung xem trước từng trang A4 (iframe). Chọn: chỉ lịch /
  + bảng tổng nửa tháng / + bảng tổng CẢ tháng (`halfRange("month")`), kèm 予算. Màu bản in (giờ làm,
  nghỉ, hỗ trợ, thiếu người, 社員 chưa có ca, chữ dặn dò) → `settings.prc`, `prSum`, `prBudget`.
- **Căn thẳng hàng bàn xếp ca**: `.nm-line` là lưới cố định (tên | chuỗi làm liên tục | cảnh báo);
  giờ + điểm sức khoẻ bên phải cùng bề rộng; cột tên rộng 172px. Số dùng chữ không chân (mẫu hiện đại).
- **Báo cáo tháng** (màn biểu tượng tab Tháng, `#bizBox`, chỉ quản lý):
  - Tải file POS `時間帯別商品販売数` (CSV Shift-JIS hoặc .xlsx; hàng = món, cột = ngày) → `pos:<YM>`;
    tải nhiều lần được, ngày trùng lấy số mới. Doanh thu từng ngày gõ tay → `sales:<YM>` (tổng tháng
    ghi luôn vào `hc:act`). Lương giờ bình quân → `settings.wage` (nhân viên không nhận).
  - Định lượng (`rcp`, mặc định `RCP_SEED` trong Code.gs) lấy từ サンドイッチ早見表 W5, マニュアル
    (rau R: レタス21g · トマト2枚 · ピーマン3g · オニオン7g; L ×2; 増量 ×1,5) và cột 取高 của 棚卸表.
    Bánh mì chia theo lựa chọn khách (カスタマイズ: ウィート/ハニーオーツ → ハニーウィート; ホワイト/セサミ
    → イタリアンホワイト). Quy tắc: `[nhóm U/T/P/D/C/A, mẫu tên món, lượng, 1 = tuyệt đối | 0 = ×suất R]`.
    Ước tính (トマト 6 lát/quả, ツナ ~32g/スクープ, ハーブソルト) đánh dấu `est`.
  - Ra: doanh thu, số ổ, giờ công (chỉ ngày có doanh thu), 人時売上, 人件費 ước tính, 原価 thực
    (棚卸 đầu + 仕入 từ phiếu 発注 đã chốt − 棚卸 cuối) / 原価 lý thuyết (định lượng), FL比率, theo thứ
    (→ nút đưa vào doanh thu dự kiến của 発注), nguyên liệu dùng + "thực dùng" từ kiểm hàng 発注 +
    gợi ý mức tồn (dùng/ngày × (khoảng giao xa nhất + lead) × (1+buf)) → `bizApplyHc`.
- **Kiểm kê 棚卸** (`#invBox`): danh mục 158 món từ file 2026年5月度期末棚卸表 (`INV_SEED`, đúng thứ tự
  file công ty), nhập 箱 / 中箱・袋 / バラ → 合計 = 箱×CS + 袋×入数中箱 + バラ, 金額 = 合計 × 価格/入数
  (khớp ô mẫu: 3·2·5 → 175本 · ¥6,986). Lưu `inv:<YM>`, chốt, sao chép 3 cột để dán vào file công ty,
  tải CSV, cập nhật danh mục từ file 棚卸表 .xlsx (không mật khẩu; đọc sheet tên "棚卸"), báo món có giá
  khác giá 発注 mới nhất.
- **Thông số nhân viên** (`#empDashBox`, `empDash`): giờ tháng, ngày làm, làm liền dài nhất, tuần nhiều
  nhất (so trần 28h), đáp ứng đăng ký, giữ ngày xin nghỉ, cuối tuần/mở/đóng/tối/hỗ trợ, xin đổi ca/báo
  gấp, tem, cảm ơn, xu hướng 6 tháng.
- **Lịch quán khác** (bảng tháng → nút 🏪他店, cần bật Kết nối các quán): mỗi quán tự ghi vào sheet
  `stores` của bảng chung (`hubRegister_`, 1 lần/ngày khi quản lý mở app); `peerMonth` đọc lịch đang xếp +
  đăng ký của quán kia (chỉ tên + giờ, nhớ đệm 3 phút), hiện ngay dưới bảng của mình, cuộn ngang cùng
  nhau; hàng "ヘルプ候補" = số người đăng ký rảnh mà chưa có ca.

### v2026.10.08.2 — thứ tự nhân viên & chức vụ

- **Chức vụ** (`employees[].rank`, 0–4: 1 トレーナー · 2 シフトリーダー · 3 副店長 · 4 店長; quán đổi tên được
  qua `settings.rankNames[4]`). Điểm so = chức vụ×2 + (社員 ? 1 : 0) → 社員 không chức vụ vẫn trên SA.
- **Thứ tự quán** = thứ tự mảng `employees` (kéo ⠿ / ▲▼ / sắp nhanh theo chức vụ · giờ vào thường ngày ·
  tên). Áp cho danh sách nhân viên, bảng tháng, bảng tổng.
- **Cách xếp** `settings.ord = {print, day, supLast}`, mỗi cái `time` (vào sớm trên; cùng giờ → chức vụ cao →
  về sớm → thứ tự quán) | `rank` (chức vụ → giờ vào → thứ tự quán) | `list`. `supLast` = ca chi viện (H)
  xuống cuối (màn ngày luôn để người chỉ đi chi viện ở cuối).
- Hộp `showOrderDialog` (nút "↕ 並び順・役職" trong Danh sách nhân viên + trong khung xem trước in). Khung xem
  trước có radio `pvOrd` + `#pvSupLast` để thử nhanh; bấm In/PDF thì quản lý lưu luôn cho cả quán.
- Bảng tổng (tên × ngày) không có giờ vào → `time`/`rank` xếp theo chức vụ rồi thứ tự quán; `list` đúng thứ tự quán.
- Bẫy: Esc trong khung xem trước phải nhường hộp thoại đang mở phía trên (`.modal-back`).
- **PDF tải thẳng về máy**: `savePrintPdf` trả thêm `b64` + `file` (tên Latin, vd. SUBWAY_Ootagawa_shift_2026-10_1-15.pdf);
  máy khách tạo Blob rồi tự tải + nút "⬇ Tải PDF về máy" (blob). Không mở link Drive → không bị Google hỏi
  đăng nhập/xác minh. Bản lưu Drive vẫn cất (lỗi Drive không chặn tải). Tên file có chữ Nhật bị Chromium đổi
  thành "download" → luôn dùng tên Latin.
- Theo yêu cầu của Lâm: **không xuất hướng dẫn nhân viên (PDF) nữa**.

### v2026.10.08.3 — mã quán · mã nhân viên · kết nối bằng mã (khác tài khoản Google), bản in có khung ngày + bản rút gọn, ô mật khẩu chống bàn phím Nhật

- **Lỗi gốc**: bảng chung tìm theo TÊN trong Drive và đọc thẳng bảng tính của quán kia → chỉ chạy khi mọi
  quán cùng MỘT tài khoản Google. Quán khác tài khoản tự tạo bảng chung riêng → không bao giờ nối được.
- **Mã quán** `settings.storeCode` (2–6 chữ in hoa/số; máy tự đặt theo tên quán, `storeCodeAuto` → đổi tên quán
  thì đặt lại; đổi tay qua `storeCodeSave`, không trùng quán khác trong mạng). `saveSettings` KHÔNG nhận
  storeCode từ máy (luôn giữ bản trên máy chủ).
- **Mã nhân viên** `employees[].code` = "001"… do máy chủ cấp (`assignEmpCodes_` trong saveEmployees,
  `ensureEmpCodes_` khi quản lý mở app); số gửi từ máy bị bỏ qua; số người đã xoá không dùng lại (`EMP_SEQ`).
  Mã đầy đủ = mã quán + "-" + số (vd. OTA-007) — hiện ở thẻ tên, hộp thứ tự, lời chào nhân viên ("ID OTA-007").
- **Kết nối bằng mã** (Cài đặt › 🔗 Kết nối các quán, `hubInfo/hubJoin/hubAllow`): mã kết nối = mã bảng
  chung. Quán mới dán mã → Kiểm tra (xem trước các quán) → Tham gia. Khác tài khoản: màn báo email của
  quán mới → quán chủ dán email bấm Cho phép (`addEditor`). Mã quán trùng khi tham gia → tự đổi (CEN → CEN2).
- **Danh bạ** sheet `stores` của bảng chung: [id, name, at, code, emps(json [id,code,name,type]), email, off].
  Tắt kết nối → off=1 (quán khác không thấy, không mượn được).
- **Đăng dữ liệu lên bảng chung** sheet `snap` ([storeId|ym, at, 8 ô × 45.000 ký tự]): danh sách + lịch +
  đăng ký + ngày không đi được + hideDraft/lock. `hubPublish_` khi mở app (chỉ khi có sửa, tối đa 1 lần/phút),
  hẹn giờ `hubTick` mỗi 10 phút (đăng tháng này + tháng sau, áp ca chi viện đã chốt). `peerMonth` và
  `supportTeam` mở thẳng bảng tính quán kia nếu được (cùng tài khoản, mới nhất), không thì đọc bản đăng.
- **Mượn theo mã** (`empLookup`, `borrowByCode`, origin 'borrow', hostOk sẵn) và **cử người** (`dispatchSupport`,
  origin 'dispatch', homeOk sẵn). Một bên từ chối / rút → yêu cầu tự đóng (`closeIfDead_`). Nhân viên không
  thấy yêu cầu đích danh như lời mời chung. Mọi đề nghị mang `empCode` + `storeCode`.
- **Bản in**: mỗi ngày một khung viền đậm + dải tiêu đề nền (thứ 7 xanh, CN đỏ nhạt); chiều cao dòng trừ phần
  khung (`DAY_GAP_MM`). **Bản rút gọn** (`opts.style = 'compact'`, `settings.prStyle`): bỏ thanh giờ, giữ
  出勤/退勤/休憩/合計, 4 cột/trang → nửa tháng 1 trang (chật quá thì 2 trang); hàng 募集 ghi khung giờ thiếu.
- **Ô mật khẩu / mã**: `inputmode="email"` (bàn phím ABC), `ime-mode:disabled`; chữ toàn góc → NFKC nửa góc;
  chữ Nhật bị bỏ + nhắc "chuyển sang 英数"; bấm 👁 vẫn giữ bàn phím ABC.

### v2026.10.09.1 — thanh chia ngày, bản rút gọn sửa chồng chữ + cột 備考, điều kiện thay thế (ベテラン), mượn theo tên, quán liên kết tự đồng bộ, tách giờ quán / giờ chi viện

- **Bản in chuẩn**: bỏ khung viền quanh từng ngày (v.8), quay về kiểu cũ + **thanh chia màu** giữa hai ngày
  (`table.pub-bar`, màu `HP_COLOR.bar` mặc định #3D4F63, đổi ở khung xem trước — `prc.bar`).
- **Bản rút gọn** viết lại riêng (`dayBlockCompact`): mọi chữ được CẮT SẴN theo bề rộng cột (`clipW`, ước
  bề rộng chữ đậm, chừa chỗ "…") — không trông vào CSS overflow vì bộ đổi PDF của Google bỏ qua → chữ đè
  ô bên cạnh. Tiêu đề ngày 2 dòng (ngày + 納品/発注/予算 | nghỉ · L=). Cột mới **備考** (ghi chú ca + chỗ
  viết tay). Hàng thiếu người: "⚠ 2名不足 · khung giờ".
- **Điều kiện thay thế** `settings.altRules = [{n, m}]` ("cần n người — có m người ベテラン là đủ"), nhãn mới
  `master` (ベテラン, server ALLOWED_TAGS). Áp vào: biểu đồ số người (ô ⭐ "is-alt"), chấm ngày
  (`shortHoursForDay`), hàng 募集 trên bản in + xin đổi ca (`tcShortHours`), thống kê tháng. Bộ tự xếp lịch
  KHÔNG đổi (vẫn xếp đủ định mức). Hàm `coverAt` (đừng đặt tên `presentAt` — đã có hàm cùng tên!).
- **Mượn theo tên**: `empSearch(token, q)` — so tên đã chuẩn hoá (toàn góc → nửa góc, カタカナ → ひらがな),
  gợi ý tối đa 12 người ở các quán đã liên kết kèm mã; bấm gợi ý → `empLookup`.
- **Quán liên kết tự đồng bộ**: danh bạ thêm cột open/close; `linkedStores_()` (nhớ đệm 10 phút) → loadMonth
  (quản lý) trả `linkedStores`; `supStores()` = quán liên kết (🔗 mã · tên · giờ) + quán khai tay
  (`supStoresManual`, chỉ phần này lưu vào cài đặt). Ca ✈ đồng bộ tự lấy giờ mở/đóng của quán liên kết.
- **Tắt tô đỏ giờ thiếu người** trên bản in: ô "人手不足の時間を赤で表示" (`opts.need`, `settings.prNeed`, mặc định bật).
- **Giờ quán / giờ chi viện**: `halfTotals()` trả [nửa đầu, nửa sau, ✈]; bảng tháng (ô tên) tổng = ở quán + chi
  viện, kèm "✈x" và rê chuột thấy tách; giờ theo tuần ghi ✈; bảng tổng in thêm cột 店舗 / ✈ヘルプ khi có;
  xuất Excel thêm cột うち店舗 / うちヘルプ; màn nhân viên ghi "(ở quán + ✈)".

### v2026.10.09.2 — phân tích bán hàng (POS) + dự báo, nhập phiếu đặt hàng PDF, khảo sát nhân viên, email nhân viên tự đăng ký, bản in không mất chữ + tuỳ chỉnh

- **📊 販売分析 (salesBox)**: nhập CSV POS (1 file nhiều tháng, nhiều file cùng lúc) → `bizParsePosAll` tách
  theo tháng → `posImport` từng tháng. Đọc nhiều tháng: `posMonths` / `posRange` (tối đa 13 tháng). Bảng
  điều khiển: khoảng 7 ngày / 4 tuần / tháng gần nhất / 3 tháng / tất cả (so với kỳ trước), phạm vi
  商品 (^ユニット) / chỉ ユニット / tất cả; thẻ KPI; cột chồng theo nhóm 中分類 (>120 ngày → theo tuần) + đường
  TB 7 ngày + rê chuột; TB theo thứ; tỷ trọng nhóm; bảng món (tìm, sắp xếp, sparkline, ±so kỳ trước);
  chi tiết món (biểu đồ ngày, TB theo thứ, dự báo 7 ngày); xem bằng bảng; tải CSV. **Phân tích tự động**
  (`saInsights`): tăng/giảm mạnh (4 tuần vs 4 tuần trước), ngừng bán, món mới, thứ đông/vắng, ngày bất
  thường (z≥2 so cùng thứ), tỷ lệ mua kèm (drink/potato trên 1 sandwich), tỷ lệ size L, dự báo 7 ngày (TB
  cùng thứ 4 tuần). Màu nhóm cố định theo hạng tổng (5 màu + "その他"), đã chạy validate palette.
- **📄 Nhập phiếu 発注内容印刷 (PDF)** ở mục 発注・在庫: đọc ngay trên trình duyệt (`parseOrderPdf`: RC4 40-bit
  mật khẩu rỗng, Flate, chữ UCS-2) → `hcImportOrder` ghi số đặt vào phiếu ngày đó (`sh.o`, `fin.src='pdf'`,
  `imp`), tự thêm món mới, cập nhật đơn giá; phiếu đã chốt tay → giữ bản cũ `sh.o0` + báo khác biệt. Dùng khi
  nhân viên quên nhập tồn kho/đặt hàng.
- **📝 Khảo sát** (`surveys`, `srv:<id>`): câu một lựa chọn / nhiều lựa chọn / chấm sao / tự do, bắt buộc,
  "khác (ghi)", ẩn danh, hạn chót, mẫu nhanh; nhân viên trả lời ở tab hôm nay (huy hiệu chưa trả lời); kết
  quả cột %, TB sao, danh sách chưa trả lời (không ẩn danh), tải CSV.
- **📧 Email nhân viên tự đăng ký** (`saveMyEmail`): chọn nhận thư công bố lịch (gửi lịch cá nhân) và/hoặc
  nhờ đổi ca/chi viện. Hàng đợi `smq` gửi 8 thư/lần (trigger 5 phút), kiểm tra hạn mức MailApp. Email ẩn với
  nhân viên khác (PRIV_). saveEmployees của quản lý không ghi đè email mới hơn.
- **Bản in**: tên / hàng giờ SA·社員·12時 / ghi chú **không bao giờ bị cắt** — thu nhỏ tới 62% rồi xuống dòng
  (`hpFit`, `hpFitTd`); bản rút gọn bỏ `clipW` (kể cả hàng 募集), dùng thu nhỏ + xuống dòng. Ô xuống 2–3 dòng
  được ước trước (`layoutRows` chạy lại với chiều cao cộng thêm) → in thật vẫn 1 trang, không tràn tờ. **Tuỳ chỉnh** (`settings.prOpt`, ⚙ 詳細設定 ở
  khung xem trước): cỡ chữ 小/中/大, bật tắt hàng giờ, 納品・発注, tên người nghỉ, liên lạc, mã nhân viên cạnh
  tên, ★ cho 社員, ô xác nhận 店長・作成者, ngày giờ in, tiêu đề tuỳ ý.

### v2026.10.09.3 — điểm danh bằng mã QR (thử nghiệm), bản in: giờ lẻ không xuống dòng + hàng SA cách ô tổng

- **Bản in**: ô 出勤/退勤/休憩 dùng `hpTimeTd` — KHÔNG BAO GIỜ xuống dòng (`white-space:nowrap` + `<nobr>`),
  chữ tự thu nhỏ cho lọt cột với dư ~18% (bộ đổi PDF của Google dùng phông rộng hơn trình duyệt). Kỳ có giờ lẻ
  (18:30) thì cột giờ bản chuẩn rộng 6,6% (thường 5,5%); bản rút gọn cột 29/12,5/12,5/12,5/10,5/23%.
  Hàng "SA時間 / 社員時間 / 12時" có `padding-right` 3mm (rút gọn 2,2mm) → cách ô tổng giờ.
- **Điểm danh QR** (`settings.att = {on, grace}`, mặc định TẮT; chỉ đổi qua `attConfig` — saveSettings giữ bản
  của máy chủ). Khoá bí mật mỗi người ở KV `attkeys` (không nằm trong danh sách nhân viên). Mã QR trên điện
  thoại nhân viên: `SBA1:<empId>:<khung 30 giây>:<8 hex đầu SHA-256(khoá:empId:khung)>`, đổi mỗi 30 giây,
  máy chủ nhận lệch −4…+2 khung (~2 phút) → ảnh chụp màn hình gửi người khác không dùng được lâu. Điện thoại
  bù giờ theo giờ máy chủ (`attMyKey` trả `now`), nhớ khoá trên máy (mất mạng vẫn hiện mã; đăng xuất thì xoá).
- **Máy quét** = tab "⏱ 打刻" ở màn đăng nhập (`bootstrap.attOn`), 4 nút 出勤/休憩開始/休憩終了/退勤 →
  `attPunch(code, kind)` (không cần đăng nhập, chữ ký thay mật khẩu, tối đa 60 lần/phút). Camera trực tiếp
  (`getUserMedia`) — khung Apps Script từ 2026 thường bị chặn → tự chuyển sang **chụp ảnh** (`input capture`)
  và nhớ lại (`localStorage sbw.attcam`). Đọc mã: `BarcodeDetector` nếu máy có, không thì **bộ đọc QR tự viết
  `QRD`** (nhị phân hoá theo vùng, tìm ô định vị, ô căn chỉnh, biến đổi phối cảnh, Reed–Solomon; mức M, phiên
  bản 1–10, ảnh lật gương). Thử 240 ảnh giả lập (nghiêng, mờ, nhiễu, loá, JPEG): đọc được 239 (OpenCV: 205).
- Dữ liệu `att:YYYY-MM` = `{ngày: {empId: [{k, t, s:'qr'|'m'}]}}`; thứ tự hợp lệ in → (bs → be)* → out → in…;
  quét trùng loại trong 3 phút = đã ghi (không báo lỗi); ca qua nửa đêm gắn vào hôm trước (còn ca mở ≤ 18 giờ).
  Kết quả trả về: tên, giờ, trễ (so ca đã xếp, trừ `grace` phút), về sớm, giờ làm thực khi 退勤.
- **Quản lý** (ứng dụng ⏱ 勤怠, tab Tháng): công tắc bật/tắt + phút cho phép trễ; bảng theo ngày (ca xếp, vào,
  nghỉ, ra, làm thực/ca, nhãn 遅刻/早退/打刻なし/未出勤/退勤漏れ/手修正); bấm dòng → sửa/thêm/xoá giờ, "điền theo
  ca", đặt lại mã QR (`attResetKey`); tổng tháng (ngày, làm thực, theo lịch, chênh, trễ, thiếu) + CSV.
- **Nhân viên** (tab 今日): thẻ ⏱ 打刻 (trạng thái, giờ hôm nay, tổng tháng) + nút "QRコードを表示" (đếm ngược,
  giữ màn hình sáng bằng Wake Lock nếu có). `attMine` chỉ trả điểm danh của chính mình.

### v2026.10.09.4 — máy điểm danh camera trực tiếp (trang riêng), camera trước, tự quét, tự tắt sau 10 giây

- Thực tế đã thử: camera trực tiếp KHÔNG chạy trong app (khung iframe của Apps Script bị Google chặn camera).
  → Máy quét là **trang riêng**: `doGet ?kiosk=1` trả trang **XHTML** qua ContentService (`MimeType.XML`, không bọc
  khung) — dựng từ `KIOSK_TPL_B64` (base64, tự sinh từ đúng mã QR/QRD trong Index.html + `v12/kiosk.js`; ĐỪNG sửa
  tay, chạy `v12/rebuild.py`). Trang gọi lại máy chủ bằng `?api=att&fn=info|punch` (JSON, `attServeApi_`).
  Trang viết kiểu "polyglot": chạy được cả XHTML lẫn HTML thường → KHÔNG dùng innerHTML, tạo phần tử bằng
  `createElementNS`; tên quán thay vào 2 chỗ (`%%STORE%%` escape XML, `%%STOREJS%%` escape JS).
- Dự phòng: quản lý tải `index.html` (`attKioskFile`) đặt lên GitHub Pages / Netlify rồi dán link (`att.kioskUrl`,
  chỉ nhận https). Màn đăng nhập (`bootstrap.attKiosk`) và ⏱ 勤怠 mở link đó.
- Trang máy quét: camera CHỈ bật khi bấm 1 trong 4 nút; mặc định **camera trước** (`facingMode user`, hình lật
  gương), nút đổi 前/後 (nhớ `sbk.cam`); khung xem trực tiếp + khung ngắm; tự đọc mã mỗi ~80 ms (BarcodeDetector
  nếu có, không thì QRD 640px, cứ 4 lần thử 1 lần 1000px); ghi xong hiện thẻ kết quả 2,3 giây rồi quét tiếp người
  sau; cùng một mã không gửi lại trong 25 giây; **không quét nữa 10 giây → tự tắt camera** (thanh đếm ngược);
  nút 停止; ẩn tab → tắt; 3 ngôn ngữ; giữ màn hình sáng (Wake Lock).
- Trong app (tab 打刻): thẻ lớn "ライブカメラ打刻を開く" + chụp ảnh dự phòng, chọn camera trước/sau (`sbw.attface`).

### v2026.10.09.5 — cách điểm danh mới (mặc định): màn hình quán HIỆN QR, nhân viên quét bằng camera điện thoại

- Lý do: camera trực tiếp trong app bị Google chặn; quản lý không tự đặt được trang lên GitHub/Netlify.
  → Đảo chiều: máy tính bảng của quán chỉ HIỆN mã (không cần camera), nhân viên dùng **camera thường của điện
  thoại** (tự nhận QR) → mở app → chọn loại. Không cần cài thêm gì.
- `settings.att.mode`: `'show'` (mặc định, cách mới) | `'scan'` (cách cũ: máy quét mã của nhân viên + trang camera).
  Chỉ đổi qua `attConfig` (saveSettings giữ bản máy chủ).
- **Màn hình quán**: quản lý đăng nhập trên chính máy tính bảng → ⏱ 勤怠 → "この端末を打刻画面にする"
  (`attKioskReg` → khoá thiết bị lưu `localStorage sbw.attdev`, KV `attdev`, tối đa 10 máy, gỡ được `attKioskDel`) →
  đăng xuất → màn đăng nhập tự mở tab ⏱ 打刻 và hiện QR = `<link app>?pa=<khung 30s>.<10 hex SHA-256(bí mật
  ATT_STORE_K:pa:khung)>` (`attKioskToken(khoá thiết bị)`, đổi mỗi 30 giây, kèm 10 lần điểm danh gần nhất hôm nay,
  hỏi lại máy chủ mỗi 10 giây). Không có khoá thiết bị thì không lấy được mã (người ở nhà không tự lấy mã được).
- **Nhân viên**: mở link → app đọc `?pa=` (`google.script.url.getLocation`, trong `readDk`) → đăng nhập (nếu máy chưa
  nhớ) → hộp chọn 出勤/休憩開始/休憩終了/退勤 (nút sai thứ tự bị khoá, gợi ý bước tiếp theo) → `attPunchSelf`
  (chỉ nhân viên, mã quán còn hạn −6…+1 khung ≈ 3 phút) → ✓ rồi tự đóng, chuyển sang tab 今日. Bỏ `?pa=` khỏi địa
  chỉ. Trong app còn nút "お店のQRを読み取る" (chụp ảnh mã trên màn hình quán, đọc bằng QRD).
- Ghi chung một hàm `attRecord_` cho cả hai cách (cùng luật thứ tự / trùng / qua nửa đêm / trễ / về sớm).

## Cách làm việc

- Mỗi thay đổi đều kèm bộ kiểm tra tự động, chạy bằng Node + Playwright với bộ
  giả lập các dịch vụ Apps Script. Hiện có **2.942 phép kiểm tra** (lock.js đã bỏ khỏi bộ chạy vì tính năng khoá đăng ký đã bỏ). Bộ giả lập
  được làm cho giống hành vi thật của Apps Script (ví dụ chặn thẻ meta sai tên)
  để bắt lỗi ngay trong lúc phát triển.
- Giao **file hoàn chỉnh để dán đè**, không giao bản vá từng dòng.
- Nói rõ file nào cần dán lại, file nào giữ nguyên.
- Báo thẳng khi phát hiện lỗi của chính mình và khi một yêu cầu có đánh đổi.

## v2026.10.11.1
- Khảo sát ẩn danh: thêm tùy chọn "Quản lý vẫn xem được tên người trả lời (nhân viên không thấy)". Bật tùy chọn này thì danh sách người đã/chưa trả lời và tên trong kết quả hiện với quản lý; nhân viên vẫn không thấy tên.
- Đã kiểm tra: cú pháp Code.gs và Index.html hợp lệ; v8 (dịch thuật 28/28) và v15api (khảo sát/PDF/email 36/36) đạt.
- Chưa làm trong bản này: chấm công NFC/QR bật tắt theo quán, hồ sơ ứng tuyển + ảnh 3x4, 年末調整, in nhanh giấy tờ, quy trình thôi việc, check nhiệt độ 体調チェック có tên nhân viên.

## v2026.10.11.2 — Nhân sự · ứng tuyển · thôi việc · 体調チェック · thẻ IC · 年末調整
- **👤 人事 (app mới ở tab Tháng)**: 4 mục Hồ sơ / Ứng viên / Giấy tờ / Công ty.
  - Hồ sơ chuẩn Nhật lưu riêng từng người (`prof:<id>`, ảnh 3×4 ở `photo:<id>`), chỉ quản lý + chính người đó đọc được. Trường chuẩn hoá ở máy chủ theo `HR_SPEC_` (độ dài, kiểu, ai được sửa). Gồm: ふりがな, ngày sinh, liên lạc, địa chỉ, khẩn cấp, đi làm, điều kiện làm việc (hình thức, 時給, hợp đồng, bảo hiểm), 在留資格/期限, học sinh, tài khoản lương, 扶養/年末調整, 学歴/職歴/資格, ca mong muốn, đồ cho mượn + chìa khoá, ghi chú quản lý (nhân viên không thấy).
  - Cảnh báo: thẻ cư trú ≤60 ngày / hết hạn, qua ngày thôi việc, nhân viên tự sửa (quản lý bấm "đã xem"), dưới 18 tuổi; thanh % đã điền.
  - Nhân viên: nút 👤 プロフィール ở lời chào → xem + tự sửa phần được phép (liên lạc, địa chỉ, tài khoản, người phụ thuộc, hạn thẻ cư trú) → quản lý nhận thông báo.
  - Nhập 履歴書 từ Excel (đọc .xlsx ngay trên máy, tìm theo nhãn): khớp tên với nhân viên → điền ô trống; người chưa có → thành ứng viên. Thử với file thật: 23 sheet → 17 người.
- **📮 Ứng tuyển**: link công khai `?apply=<khoá>` + QR + poster A4; form 5 bước trên điện thoại (cơ bản · địa chỉ/đi làm · ca mong muốn · học vấn/kinh nghiệm · ảnh 3×4 + đồng ý 個人情報), lưu nháp trên máy, ô bẫy spam, 30 lần/giờ, gửi lại trong 10 phút không tạo bản mới. Quản lý: trạng thái (新着/連絡中/面接予定/合格/研修中/採用済み/不採用/辞退), giờ phỏng vấn, đánh giá 6 mục ★, ghi chú, in 履歴書/面接評価シート, **Tuyển** → tạo nhân viên + chép toàn bộ hồ sơ, ảnh, ca mong muốn (bằng chứng khi đăng ký sai/trốn ca).
- **🖨 Giấy tờ (tiếng Nhật, A4, tự điền)**: 労働条件通知書兼雇用契約書 (đủ mục 2024: phạm vi thay đổi nơi/việc), 誓約書, 個人情報同意書, 給与振込口座届, 通勤手当申請書, 身上届兼緊急連絡先, 労働者名簿, 履歴書, 年末調整確認書, 退職届, 退職証明書 (chỉ mục được yêu cầu), 貸与品返却確認書, 秘密保持誓約書, 面接評価シート; "bộ giấy tờ vào làm" in một lần; mẫu chữ dài quán sửa được (`doctpl`). Thông tin công ty / điều kiện chung ở mục Công ty (`hrco`).
- **🚪 Thôi việc**: chỉ sau khi quản lý bấm "Cho thôi việc" mới hiện bảng thủ tục (退職届, trả đồ, chìa khoá, lương cuối, 源泉徴収票 trong 1 tháng, 雇用保険/社会保険 nếu có, 住民税, 退職証明書…) + giấy tờ thôi việc. Ngày sau ngày làm cuối tự đánh dấu "không đi làm được (退職)" 3 tháng → bộ xếp lịch bỏ qua; huỷ thì gỡ. Hoàn tất → rời danh sách (gỡ đăng nhập, thẻ IC), hồ sơ/chấm công/年末調整 vẫn giữ ở "Đã thôi việc", nhận lại được.
- **🌡 体調チェック (app mới)**: nhân viên khai trong tab 今日 (✓ 異常なし + nhiệt độ, hoặc triệu chứng), hỏi ngay sau khi 出勤 (QR và thẻ IC); không khoẻ → thông báo quản lý + nhắc không chạm thực phẩm. Bảng tháng điền sẵn tên người có ca (và người có chấm công). In 体調チェック表 A4 ngang theo mẫu quán (○/×, 体温, 責任者確認), tự sang trang khi đông người. Cài đặt `hlcfg`.
- **⏱ Điểm danh nhiều cách**: `settings.att.methods = { show, scan, nfc }` bật riêng từng cách theo quán + `health`. Màn hình quán hiện QR và ô "ICカードをタッチ" cạnh nhau.
  - **💳 Thẻ IC (Sony PaSoRi)**: quản lý đăng ký thẻ cho từng người (chỉ lưu băm SHA-256 + 4 số cuối, `attcards`), màn hình quán nhận số thẻ qua ô ẩn kiểu mật khẩu (bộ gõ tiếng Nhật không đổi chữ) → chọn 出勤/休憩/退勤 → 体調チェック. Chỉ máy đã đăng ký mới gửi được số thẻ. Công cụ Windows tải trong app (`IC-card-reader.cmd`: PowerShell + winscard PC/SC, lệnh FF CA 00 00 00 đọc IDm/UID, gõ số + Enter vào cửa sổ app).
- **🧾 年末調整 (app mới)**: lương từng tháng (nhập tay hoặc ước tính từ chấm công × 時給), thưởng, 前職分, các khoản bảo hiểm; tính theo 令和8年分 (給与所得控除 min 74万, 基礎控除 104万/67万/62万…, 扶養 62万, 特定親族特別控除, 配偶者(特別)控除, 生命保険 6万 khi có người phụ thuộc <23 tuổi, ×102.1%). Không 年調 với 乙欄 / thôi việc giữa năm / >2,000万. In 源泉徴収票 (受給者交付用 + 控, không in マイナンバー), bảng tính, CSV cho 給与支払報告書 theo 市区町村. Nhờ nhân viên xác nhận thông tin trong app (`hrco.yeAsk`, `prof.yeOk`). Kết quả là bản đối chiếu — kế toán xác nhận trước khi nộp.
- Thông báo mới cho quản lý: 📮 có ứng tuyển, 🌡 không khoẻ, 👤 sửa hồ sơ; hộp "việc cần làm" thêm thẻ cư trú, thôi việc, ứng viên mới.
- Không lưu マイナンバー (luật yêu cầu biện pháp bảo vệ riêng) — giấy tờ để trống ô đó.
- Kiểm tra: v20api (76), v21ui (62), cập nhật v16ui/v19ui cho giao diện mới; toàn bộ 2.858 phép kiểm tra đạt.

## v2026.10.12.1 — Tốc độ · tích việc không nhảy · form ứng tuyển tuỳ chỉnh · 体調チェック mẫu công ty · thẻ IC RC-S300 · máy quét tự động
- **⚡ Tốc độ**
  - Thân các app nặng (👤人事 · 🌡体調 · 🧾年末調整 · ⏱勤怠) chỉ dựng + gọi máy chủ khi **mở app** (`appLazy(id)`, `appFill(key)` trong `appOpen`). Trước đây mỗi lần vẽ tab Tháng gọi hrList + hlMonth + yeGet (đọc 12 tháng chấm công) + danh sách thẻ/máy cùng lúc với dữ liệu lịch → tranh lượt máy chủ, mở app chậm, bấm bị giật.
  - `hrBrief` (việc cần làm của 人事) chờ 6 giây sau khi vào app mới tải.
  - Index.html giao cho quán là **bản thu gọn** (esbuild: bỏ chú thích + khoảng trắng, KHÔNG đổi tên biến): 2,29 MB → 1,82 MB, nén gzip 650 KB → 536 KB. **Bản nguồn đọc được** nằm ở `nguon/Index.nguon.html` (sửa trên bản này rồi thu gọn lại; đừng sửa thẳng bản thu gọn).
- **✅ Tích việc (チェック)**: bấm nhiều ô liên tiếp khi chưa lưu xong → các ô sáng ngay, lưu lần lượt (hàng đợi `JMQ`), chỉ vẽ lại 1 lần khi lượt cuối xong → hết nhảy. Chạm 2 lần quá nhanh (<0,6 giây) vào cùng ô = 1 lần. Cũng áp dụng cho bảng thủ tục thôi việc (`HRQ`) và nút 体調チェック của nhân viên (khoá khi đang gửi).
- **📮 Form ứng tuyển tuỳ chỉnh** (`aplcfg`): nút ⚙ フォームの設定
  - Chữ: tiêu đề form, tên quán hiện trên form/poster (không còn cố định theo tên quán), lời nhắn, đoạn 個人情報 (trống = mặc định), lời nhắn sau khi gửi.
  - 23 mục hỏi, mỗi mục **なし / 任意 / 必須** (`fields`): ngày sinh, giới tính, quốc tịch, SĐT, email, mã bưu điện, địa chỉ, toà nhà, furigana địa chỉ, người liên hệ khẩn, đi làm, học sinh, 在留資格, ca mong muốn, **thời gian muốn làm (長期/短期/期間限定)**, **giờ phỏng vấn mong muốn**, **cách + giờ liên lạc (電話/SMS/メール/LINE · 午前/午後/夜/土日)**, học vấn, kinh nghiệm, bằng cấp, lý do, sở thích, ảnh. Mẫu nhanh: 面接前（最小限）/ 標準 / 履歴書と同じ. Mục 🔒 nhạy cảm có thể tắt — **mục tắt không được lưu dù máy gửi lên**. Họ tên + furigana luôn bắt buộc; tắt SĐT thì phải có email.
  - Giờ phỏng vấn quán mở (`slots`, tối đa 20): có → ứng viên chọn nút; không → ứng viên tự ghi tối đa 3 lựa chọn (`ivPref`). Mục đánh giá phỏng vấn tự đặt (`ev`, khoá c0…c9).
  - Trang ứng tuyển: bước nào bị tắt hết mục thì bỏ qua; kiểm tra bắt buộc theo cài đặt (máy + máy chủ); chi tiết ứng viên + 面接評価シート hiện 面接希望 / 連絡方法 / 勤務期間.
  - **Poster sửa được hết**: tiêu đề lớn, dòng phụ, lời nhắn, các bước, chữ dưới QR, dòng cuối, 5 màu, bật/tắt QR và tên quán; xem trước ngay bên cạnh khi gõ.
- **🌡 体調チェック**: mặc định **TẮT khai trong app** (chỉ dùng giấy); bật lại được, công tắc phụ (hỏi khi 出勤 / nhiệt độ) chỉ hiện khi bật. In **đúng mẫu 体調チェック表 của công ty** (file Excel gốc, vùng in A1:AP39, A4 ngang 90%): 42 cột = 日付 (A:B) + 8 nhóm × [氏名・手指傷・発熱・下痢・嘔吐], 31 dòng ngày, ô chéo チェック項目/日付, 2 dòng ghi chú ※ — độ rộng cột / chiều cao dòng lấy theo file. App chỉ điền: năm/tháng, tên quán (ô AF1, trước chữ 店, nhớ ở `hlcfg.label`), tên người đi làm từng ngày (theo giờ vào ca, tối đa 8/ngày/tờ — đông hơn in thêm tờ). Tên dài tự thu nhỏ / xuống 2 dòng. Tuỳ chọn: mẫu trống, hoặc điền ○/× đã khai (khi bật khai trong app).
- **💳 Thẻ IC (Sony RC-S300)**: công cụ Windows viết lại: tìm cửa sổ app theo tên quán / "SUBWAY" / trình duyệt đang mở (không còn bắt buộc khớp đúng tiêu đề), đưa cửa sổ lên trước rồi gõ số + Enter; in rõ lỗi PC/SC (mã 0x8010000B = phần mềm khác như KING OF TIME đang giữ máy đọc; 0x80100069 = rút thẻ quá nhanh…), thử kết nối lại 3 lần. Màn hình quán hiện "đã nhận thẻ ••••1234 · giờ" / "nhận được chữ không phải số thẻ" để biết máy đọc có gõ vào hay không. Hướng dẫn dò lỗi ngay dưới nút tải công cụ.
- **⏱ Tự ghi theo gợi ý (3 giây)** — `settings.att.auto` (mặc định bật, tắt trong ⏱): máy chủ gợi ý thao tác (`attSuggest_`: chưa vào → 出勤; đang nghỉ → 休憩終了; gần giờ hết ca / đã nghỉ → 退勤; có ca / đã làm ≥4 tiếng chưa nghỉ → 休憩開始). Thẻ IC, điện thoại nhân viên (`attSelfWho`) và máy quét đều hiện thanh đếm ngược; bấm nút khác để đổi, chạm thanh để dừng.
- **📷 Máy quét tự động** (trang `?kiosk=1`, mở ngoài khung Apps Script nên dùng được camera trực tiếp): nút "自動読み取りを開始" → camera bật liên tục, đưa mã QR là nhận (API `who`), hiện tên + 4 nút + đếm ngược 3 giây rồi tự ghi (API `punch`). Người vừa chấm 60 giây không bị nhận lại (mã đổi mỗi 30 giây). Tải lại trang tự bật lại; không ai quét 3 tiếng mới tắt. Màn đăng nhập › 打刻 (chế độ máy quét): thẻ lớn mở trang này là cách chính, chụp ảnh thu gọn thành dự phòng.
- Kiểm tra: v22api (33), v22ui (47) + cập nhật v16ui/v17ui/v19ui/v20api/v21ui; toàn bộ 2.942 phép kiểm tra đạt (chạy trên bản Index.html đã thu gọn).

## v2026.10.14.1 — Tab Tháng chia 3 nhóm · 人件費計画 · nút "Nghỉ" nhanh cho nhân viên chính thức · 💾 Lưu PDF
- **🗂 Tab Tháng chia 3 nhóm** (màn biểu tượng): **Xếp ca** (sức khoẻ, シフト案, giờ theo tuần, báo sai, việc, hoạt động) · **Nhân công** (人件費計画, ngân sách giờ, 勤怠, thông số nhân viên, 人事, 体調, khảo sát, 年末調整) · **Doanh thu** (予算 tháng, báo cáo tháng/P&L, phân tích POS, kiểm kho, 棚卸). Mỗi khối mang `data-grp`; `launcherInit` vẽ một khung, mỗi nhóm một hàng tiêu đề + lưới biểu tượng cùng tông màu. Lịch tháng và thanh công cụ ⚡/🖨 vẫn nằm ngoài như cũ. Khi không có màn biểu tượng (máy kiểm thử) thì hiện 3 tiêu đề `.mgrp-h`.
- **⚖️ 人件費計画 (dự toán nhân công)** — nhóm Nhân công: giờ mục tiêu = 予算 × tỷ lệ ÷ lương giờ bình quân. Chỉ dùng số quản lý tự nhập: 予算 từng ngày (tab Ngày), tỷ lệ mục tiêu (`settings.laborPct`, mặc định 22%, cho phép 10–50%) và lương giờ (`settings.wage`, dùng chung với báo cáo tháng). Chỉ cộng những ngày đã nhập 予算, giờ đã xếp cũng chỉ cộng những ngày đó. Hiện: 予算 · quỹ lương mục tiêu · giờ mục tiêu · giờ đã xếp (SA / chính thức) · 人件費 theo lịch và % doanh thu · vượt/còn bao nhiêu giờ (≈ yên) · bảng theo ngày. Chưa gồm bảo hiểm xã hội, đi lại, phụ cấp ca đêm. Nhân viên không nhận được `laborPct` / `wage`.
- **休 Nghỉ nhanh cho nhân viên chính thức**: (1) ô "Thêm vào ca hôm nay" ở tab Ngày — nút **Nghỉ** liền bên tên; (2) ô vàng (社員 không có ca, không xin nghỉ) của lưới tháng — nút **休** nhỏ trong ô, bấm không nhảy sang tab Ngày. Một chạm ghi nghỉ ngày đó, có nút Hoàn tác. Không hiện cho SA, ngày đã chốt, hay ô đã có ca.
- **💾 Lưu PDF cho mọi tờ in**: hộp xem trước (giấy tờ 人事, poster tuyển dụng, 体調チェック表, 源泉徴収票, bảng tính…) có nút **💾 Lưu PDF**; tờ hướng dẫn dán phòng nghỉ có nút **💾 PDF** riêng. Mỗi tờ A4 được chụp bằng html2canvas 1.4.1 (cdnjs, tải lúc cần) rồi ghép thành PDF ngay trên máy, không qua máy chủ, tự tải về, tên file chỉ chữ Latin. Mạng chặn thư viện → báo "In → Lưu dưới dạng PDF" kèm nút In. Lịch nửa tháng vẫn dùng PDF của máy chủ như trước.
- Đã kiểm tra: giờ nghỉ **không** cộng vào số người theo giờ (`coverageCounts` bỏ khung nghỉ).
- Kiểm tra: v23ui (49) mới; sửa v3ui (chuỗi ngày làm chỉ nhận 10–19, sai khi chạy sau ngày 12 → nhận ≥ 10). Toàn bộ 2.991 phép kiểm tra đạt.

## v2026.10.15.1 — Nhóm A (bảo mật · bản in · giờ công · form ứng tuyển) · Nhóm B (vào app nhanh) · tab ⚙ Cài đặt của nhân viên
- **⚙ Tab Cài đặt riêng cho nhân viên** (tab thứ 4, chỉ nhân viên — quản lý xem thay không có): thẻ nút gọn chia 4 nhóm
  - Tài khoản: 🙍 Hồ sơ của tôi · 💴 Phiếu lương · 🔑 Đổi mã PIN · mã nhân viên (ID).
  - Thông báo: 📧 Nhận email (đăng ký / đổi / tắt) · 📅 Đưa ca vào lịch điện thoại.
  - Hiển thị: 🌐 Ngôn ngữ mặc định (VI / EN / 日 — lưu theo NGƯỜI `employees[].lang`, máy nào đăng nhập cũng theo; quản lý lưu danh sách nhân viên không đè mất) · 🌙 Giao diện tối · 🎨 Kiểu & màu.
  - Vào app nhanh: 🔗 Đường dẫn vào nhanh · 📱 Thêm vào màn hình chính · 🚪 Đăng xuất.
  - Đã dời khỏi chỗ cũ (gọn màn hình): thanh trên của nhân viên chỉ còn tên quán + chuông (bỏ ngôn ngữ, giao diện, màn hình chính, đăng xuất); lời chào bỏ nút hồ sơ + ID; tab シフト / 希望 bỏ nút lịch điện thoại + email.
- **💴 Phiếu lương (給与明細)**: lấy tiền từ bảng 年末調整 quản lý nhập (総支給 · 社会保険 · 源泉税 từng tháng) + giờ làm thực / số ngày từ chấm công + 時給 trong hồ sơ. Nhân viên chỉ thấy tháng có số thật (tháng chỉ là ước tính ≈ thì ẩn), chỉ của chính mình (`myPayslip`). Bấm tháng → tờ A4 給与明細書 (song ngữ nhãn) → In / 💾 Lưu PDF. Có ghi chú "phiếu chính thức là của công ty".
- **🔗 Đường dẫn vào nhanh** (`empQuickLink`): mỗi nhân viên một "máy" tên `Link` → link `…/exec?dk=…`, QR để quét từ máy tính, nút chép, hướng dẫn thêm vào màn hình chính (iPhone: mở bằng Safari), cảnh báo không gửi cho người khác, nút **Tạo link mới** (link cũ hết hiệu lực ngay). Quản lý thấy máy `Link` trong danh sách máy và đăng xuất từ xa được. Link dùng được trên mọi máy (vẫn hỏi "có phải bạn?" nếu không mở từ màn hình chính).
- **Máy ghi nhớ 90 ngày** (trước 30), gia hạn mỗi lần mở.
- **Chào đúng tên ngay khi tải trang**: mở bằng link có khoá máy → `doGet` kiểm khoá (`peekDevice_`, không ghi gì) rồi chèn sẵn `window.__SBW_WHO` (tên, quán, ngôn ngữ) vào trang → màn chào hiện "おはようございます、ラムさん" trước cả khi app tải xong, kể cả máy mới chưa từng mở. Lời chào theo ngôn ngữ mặc định của người đó (chưa đặt → tiếng Nhật như cũ).
- **Mở app từ bộ nhớ (nhanh hơn)**: lần mở trước được lưu trên máy (`sbw.snap`: dữ liệu tháng này, tối đa 14 ngày) → mở lại là hiện ngay lịch, không chờ máy chủ; máy chủ trả lời thì thay bằng bản mới. Trong lúc chờ: thanh tiến trình mảnh, chưa bấm được, mọi lượt gọi xếp hàng (`PREV`). Đăng xuất / khoá hết hạn → xoá bản lưu.
- **Mã PIN ≥ 6 chữ số** (mã mới, quản lý đặt mã); **sai 5 lần → khoá 15 phút**. Mã cũ ngắn hơn vẫn đăng nhập được nhưng **bắt đổi ngay** (hộp không đóng được; vừa gõ mã thì không hỏi lại mã cũ; mở bằng máy đã nhớ thì hỏi mã cũ). Nhân viên tự đổi mã trong ⚙ (`changeMyPin`). Bàn phím số khi đặt mã mới.
- **Mật khẩu quản lý mặc định → bắt đổi trước khi dùng**: đăng nhập bằng mật khẩu mặc định chỉ nhận phiên tạm (`pc:1`) — máy chủ chặn mọi việc khác — app hiện hộp đặt mật khẩu mới (≥ 6 ký tự, khác mặc định) rồi mới vào. `changeManagerPassword` trả phiên mới.
- **Bản in lịch nửa tháng**: nhân viên chính thức có ca trong kỳ mà ngày nào không có ca → tự ghi "休み" (không phải bấm nghỉ từng ngày). Người cả kỳ không làm thì không ghi mỗi ngày.
- **Giờ công tính tới từng phút**: máy chủ không làm tròn 0,1 giờ nữa (7 giờ 29 phút = 7.4833); bảng chấm công hiện `giờ:phút`; CSV thêm cột `work_min`; thông báo 退勤 "Làm thực: 7 giờ 29 phút". Đi trễ / về sớm vẫn hiện riêng như trước.
- **Form ứng tuyển**: thêm / xoá dòng (học vấn, kinh nghiệm…) không còn nhảy về đầu trang — giữ đúng vị trí theo nút vừa bấm và đặt con trỏ vào dòng mới; máy cảm ứng mọi cỡ (kể cả iPad) ô chữ ≥ 16px để iOS không tự phóng to.
- **Poster tuyển dụng**: thêm ô **khung giờ đang tuyển** (mỗi dòng một khung, tối đa 6) + công tắc bật / tắt; xem trước đổi ngay.
- Kiểm tra: v24api (44), v24ui (35), v24apl (11) mới; toàn bộ 3.081 phép kiểm tra đạt. Bộ kiểm tra cũ: harness giữ luật cũ (mã 4 số, không bắt đổi mật khẩu) trừ khi bật `__PIN6_ON` / `__PWD_FORCE_ON`; sửa các bài theo giao diện mới (đăng xuất / lịch / email / ID trong ⚙, 4 tab, giờ `8:30`, giờ làm 7.8833, máy nhớ 90 ngày, đặt mã 6 số).

## v2026.10.16.1 — Giữ dữ liệu 6 tháng · checklist bấm thẻ về · nhập CSV đặt hàng · giao diện

- **Giữ dữ liệu nhân viên đã thôi việc 6 tháng:** khi hoàn tất thôi việc, phần ca / đăng ký / nguyện vọng / care của người đó được cất vào `retbak:<id>` trước khi gỡ khỏi lịch. Nhận lại (hrRehire) → trả về đúng chỗ cũ (không đè ngày đã có dữ liệu mới). Quá 183 ngày kể từ ngày thôi việc → xoá hẳn hồ sơ + bản cất (chạy khi quản lý mở danh sách nhân sự). Chấm công (`att:`) vốn không bị gỡ.
- **Checklist trước khi bấm thẻ về** (⏱ 勤怠 → thẻ "Kiểm tra việc trước khi bấm thẻ về"): công tắc bật/tắt + chọn việc trong danh mục Việc. Máy chủ chặn 退勤 khi người bấm còn việc đã chọn chưa xong. Việc đã gán người → áp dụng cho người được gán; việc chưa gán → áp dụng cho người làm ca cuối (ca "đến L" hoặc kết thúc từ giờ đóng cửa ngày đó), và người đó tự tích được trong app. Tắt công tắc vẫn giữ danh sách việc đã chọn.
- **Nhập CSV lịch sử đặt hàng:** nút "Nhập phiếu đặt hàng (PDF / CSV)" nhận file CSV xuất từ hệ thống đặt hàng (Shift_JIS hoặc UTF-8). Gộp theo ngày đặt (nhiều số đơn cùng ngày gộp lại), bỏ dòng 取消/キャンセル, ghi số đã đặt vào phiếu 発注 của từng ngày, món mới tự thêm vào danh mục. Thử với file thật 02/08–12/10: 48 ngày, không lỗi.
- **Trang máy quét tự host:** link tự host được gắn `#u=<link app>` tự động → dùng chung một trang (GitHub Pages) cho mọi quán. Gói `subway-kiosk-github.zip` + hướng dẫn.
- **Tự động deploy hai quán:** gói `subway-tu-dong-deploy.zip` (GitHub Actions + clasp 2.4.2) — cập nhật `src/` là đẩy lên Otagawa + Centrair và cập nhật bản triển khai (giữ link /exec). Cần 5 secret.
- **Giao diện:** icon 年末調整 đổi sang icon đường nét cùng bộ; nút "Nghỉ" nhanh dạng viên gọn có icon; phiếu lương dạng thẻ, số thực nhận nổi bật.
- Test mới: v25api (giữ dữ liệu), v25cc (checklist), v25po (CSV đặt hàng).
- **Gộp mã vào quán chính** (人事 → hồ sơ → "🔗 Gộp vào mã quán chính", `hrMergeAway`): dùng khi một người đã có mã chính ở quán khác (vd. Ramu: mã chính ở Otagawa) và sang quán này làm qua chi viện. Mã ở quán này vào "Đã thôi việc" với cờ `keep` → **không bao giờ bị xoá tự động**; ca, chấm công, lương, 年末調整 của ngày đã qua giữ nguyên chỗ cũ; ca từ hôm nay trở đi được gỡ và cất vào `retbak` (nhận lại là trả về). Ghi kèm mã nhân viên ở quán chính (không bắt buộc).
- **Tên người đã thôi việc / đã gộp mã** gửi kèm dữ liệu tháng (`exNames`) → lịch và chấm công các tháng cũ vẫn hiện đúng tên thay cho "?".
- Test giao diện mới: v25ui (thẻ checklist trong 勤怠, nút gộp mã trong 人事).
- **Sửa lỗi bấm 2 lần:** các nút trong tab ⚙ Cài đặt của nhân viên (phiếu lương, hồ sơ, đổi PIN, link vào nhanh, lịch điện thoại) có khoá chống mở trùng; mọi hộp thoại bỏ qua cú chạm vào nền mờ trong 0,45 giây đầu (chạm thứ hai của cú bấm đúp không còn đóng / mở thêm hộp).
- **Mở bằng link riêng nhanh hơn:** link vào nhanh (máy 'Link') vào thẳng app, không hỏi "có phải bạn?" mỗi lần; doGet nhớ lời chào theo người 1 giờ (vẫn kiểm khoá máy còn hiệu lực, đổi tên / ngôn ngữ thì nhớ lại); bootstrap đọc cài đặt một lần; màn chào tối thiểu 0,35 giây (trước 0,7 giây).
- Thông báo lỗi mới có bản dịch Nhật / Anh (CSV đặt hàng, chặn bấm thẻ về).
