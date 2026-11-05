#!/bin/bash
# Bấm đúp: hẹn bot WingArc tự chạy mỗi tối 22:00 (FOR đóng 21:00 + 1 tiếng), rồi chạy thử 1 lần ngay.
#  • Mỗi tối: báo cáo NGÀY (売上客数ユニット数, 商品販売数, インアウト売上客数)
#  • Ngày đầu tháng (hoặc lần chạy đầu tiên sau đó): thêm báo cáo THÁNG trước (時間帯別…)
cd "$(dirname "$0")" || exit 1
T="$HOME/.subway-tools"; APP="$T/SUBWAY WingArc Bot.app"; PL="$HOME/Library/LaunchAgents/com.subway.wingarc-bot.plist"
clear; echo "=== Hẹn giờ bot WingArc: 22:00 mỗi tối ==="
pgrep -f "wa-bot.mjs hoc" >/dev/null && { echo "⚠️ Chrome chế độ HỌC còn mở — đóng cửa sổ Chrome đó trước rồi bấm đúp lại."; read -n1 -rsp "Bấm phím bất kỳ…"; exit 1; }
rm -rf "$APP"; mkdir -p "$T"
osacompile -o "$APP" -e 'do shell script "/bin/bash " & quoted form of (POSIX path of (path to home folder) & "Documents/SUBWAY-WingArc/WingArc-Bot.command") & " chay >/dev/null 2>&1"' || { echo "Không tạo được app."; exit 1; }
/usr/libexec/PlistBuddy -c "Add :LSUIElement bool true" "$APP/Contents/Info.plist" 2>/dev/null
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.subway.wingarc-bot" "$APP/Contents/Info.plist" 2>/dev/null
codesign --force --deep -s - "$APP" >/dev/null 2>&1
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PL" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.subway.wingarc-bot</string>
  <key>ProgramArguments</key><array><string>$APP/Contents/MacOS/applet</string></array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>22</integer><key>Minute</key><integer>0</integer></dict>
</dict></plist>
PLIST
launchctl bootout "gui/$(id -u)" "$PL" 2>/dev/null; launchctl bootstrap "gui/$(id -u)" "$PL" && echo "✓ Đã hẹn 22:00 mỗi tối (Mac mini cần đang bật)."
echo; echo "Chạy thử ngay 1 lần (khoảng 2–4 phút, Chrome chạy ẩn)…"
echo "Nếu Mac hỏi \"SUBWAY WingArc Bot muốn truy cập thư mục Tài liệu\" → bấm CHO PHÉP."
open -W "$APP"
echo; echo "----- nhat-ky.txt -----"; tail -25 nhat-ky.txt
echo; read -n1 -rsp "Bấm phím bất kỳ để đóng…"; echo
