#!/bin/bash
# Bấm đúp MỘT LẦN: cài bot WingArc (Node + trình điều khiển Chrome), lưu tài khoản WingArc + khoá bot vào Keychain,
# chọn quán, (tuỳ chọn) hẹn giờ chạy mỗi sáng, rồi mở chế độ HỌC để bot ghi lại đường bấm tải CSV.
cd "$(dirname "$0")" || exit 1
HERE="$PWD"; T="$HERE/.tools"; mkdir -p "$T"
clear; echo "=== Cài bot WingArc cho app SUBWAY ==="
pause(){ echo; read -n1 -rsp "Bấm phím bất kỳ để đóng…"; echo; }
# 1) Node.js: dùng lại bản trong SUBWAY-day-len nếu có, không thì tải bản riêng
NODE=""
for c in "$(command -v node)" "$HERE/../SUBWAY-day-len/.tools/node/bin/node" "$T/node/bin/node"; do
  if [ -x "$c" ] && [ "$("$c" -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)" -ge 18 ]; then NODE="$c"; break; fi
done
if [ -z "$NODE" ]; then
  ARCH=$([ "$(uname -m)" = "arm64" ] && echo arm64 || echo x64); V=v20.18.0
  echo "• Tải Node.js $V…"
  curl -fsSL "https://nodejs.org/dist/$V/node-$V-darwin-$ARCH.tar.gz" -o "$T/node.tgz" || { echo "Không tải được Node.js — kiểm tra mạng."; pause; exit 1; }
  mkdir -p "$T/node" && tar -xzf "$T/node.tgz" -C "$T/node" --strip-components 1 && rm -f "$T/node.tgz"; NODE="$T/node/bin/node"
fi
export PATH="$(dirname "$NODE"):$PATH"; echo "• Node.js $("$NODE" -v)"
if [ ! -d "$T/node_modules/playwright-core" ]; then
  echo "• Cài bộ điều khiển trình duyệt (playwright-core)…"
  (cd "$T" && npm i --no-audit --no-fund --silent playwright-core@1.56.1 >/dev/null 2>&1) || { echo "Cài lỗi — kiểm tra mạng rồi chạy lại."; pause; exit 1; }
fi
if [ ! -d "/Applications/Google Chrome.app" ]; then
  echo "• Không thấy Google Chrome → tải Chromium riêng cho bot (~150MB)…"
  (cd "$T" && PLAYWRIGHT_BROWSERS_PATH="$T/browsers" npx --yes playwright@1.56.1 install chromium) || echo "  (tải Chromium lỗi — có thể cài Google Chrome rồi chạy lại)"
fi
# 2) Chọn quán → link máy chủ (đọc từ config.js trên trang GitHub)
echo; echo "BƯỚC 1: Chọn quán gửi dữ liệu"
CFG=$(curl -fsSL "https://subwaykios.github.io/subway-shift/config.js" 2>/dev/null || curl -fsSL "https://raw.githubusercontent.com/SubwayKIOS/subway-shift/main/config.js" 2>/dev/null)
"$NODE" -e '
const src = process.argv[1] || ""; const L = []; const re = /code:\s*"([A-Z0-9]+)"[^}]*?name:\s*"([^"]*)"[^}]*?url:\s*"([^"]+)"/g; let m;
while ((m = re.exec(src))) L.push({ code: m[1], name: m[2], url: m[3] });
require("fs").writeFileSync("'"$T"'/stores.json", JSON.stringify(L));
L.forEach((s, i) => console.log("  " + (i + 1) + ") " + s.code + " — " + s.name));' "$CFG"
read -rp "  Số thứ tự quán (Enter = 1): " PICK; PICK=${PICK:-1}
"$NODE" -e 'const L = require("'"$T"'/stores.json"), i = Number(process.argv[1]) - 1; const s = L[i] || L[0];
if (!s) { console.log("  ⚠️ Không đọc được danh sách quán — dán link /exec của quán vào cau-hinh.json"); process.exit(0); }
require("fs").writeFileSync("'"$HERE"'/cau-hinh.json", JSON.stringify({ store: s.code, name: s.name, url: s.url }, null, 1)); console.log("  ✓ " + s.code + " — " + s.name);' "$PICK"
# 3) Tài khoản WingArc + khoá bot → Keychain (không ghi ra file)
echo; echo "BƯỚC 2: Tài khoản WingArc (lưu vào Keychain của máy này)"
read -rp "  User ID: " WU
read -rsp "  Password (chữ không hiện ra — bình thường): " WP; echo
[ -n "$WU" ] && security add-generic-password -U -a "$USER" -s "subway-wingarc-user" -w "$WU"
[ -n "$WP" ] && security add-generic-password -U -a "$USER" -s "subway-wingarc-pass" -w "$WP"
unset WP
echo; echo "BƯỚC 3: Khoá bot — trong app: tab Tháng › 📊 Báo cáo cho chủ quán › 🤖 Bot WingArc › Tạo khoá → Chép khoá"
read -rsp "  Dán khoá bot rồi Enter: " WK; echo
[ -n "$WK" ] && security add-generic-password -U -a "$USER" -s "subway-wabot" -w "$WK" && echo "  ✓ Đã lưu khoá"
unset WK
# 4) Hẹn giờ mỗi sáng (tuỳ chọn)
echo; read -rp "BƯỚC 4: Cho bot tự chạy MỖI SÁNG lúc 7:30? (c/k) " SCH
PL="$HOME/Library/LaunchAgents/com.subway.wingarc-bot.plist"
if [ "$SCH" = "c" ] || [ "$SCH" = "C" ]; then
  mkdir -p "$HOME/Library/LaunchAgents"
  cat > "$PL" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.subway.wingarc-bot</string>
  <key>ProgramArguments</key><array><string>$NODE</string><string>$HERE/wa-bot.mjs</string><string>chay</string></array>
  <key>EnvironmentVariables</key><dict><key>PLAYWRIGHT_BROWSERS_PATH</key><string>$T/browsers</string><key>WA_TOOLS</key><string>$T</string></dict>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>7</integer><key>Minute</key><integer>30</integer></dict>
  <key>StandardOutPath</key><string>$HERE/nhat-ky-lich.txt</string><key>StandardErrorPath</key><string>$HERE/nhat-ky-lich.txt</string>
</dict></plist>
PLIST
  launchctl unload "$PL" 2>/dev/null; launchctl load "$PL" && echo "  ✓ Đã hẹn 7:30 mỗi sáng (máy Mac cần đang bật)"
else
  [ -f "$PL" ] && launchctl unload "$PL" 2>/dev/null && rm -f "$PL" && echo "  (đã bỏ hẹn giờ cũ)"
fi
# 5) Học đường bấm
echo; echo "BƯỚC 5: Chrome sẽ mở — đăng nhập WingArc rồi tải từng file CSV như mọi khi (doanh thu ngày, theo giờ, số bán từng món…)."
echo "         Nên chọn kỳ 'Tháng này / 当月' để lần sau bot tự lấy đúng tháng. Xong thì ĐÓNG cửa sổ Chrome."
read -rp "  Bấm Enter để bắt đầu (hoặc gõ k để bỏ qua)… " GO
if [ "$GO" != "k" ] && [ "$GO" != "K" ]; then PLAYWRIGHT_BROWSERS_PATH="$T/browsers" WA_TOOLS="$T" "$NODE" "$HERE/wa-bot.mjs" hoc; fi
echo; echo "✅ Cài xong. Lần sau chỉ cần bấm đúp WingArc-Bot.command (hoặc để bot tự chạy mỗi sáng)."
pause
