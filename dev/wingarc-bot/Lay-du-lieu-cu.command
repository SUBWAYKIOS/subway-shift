#!/bin/bash
# Bấm đúp: bot lấy lùi báo cáo THÁNG (時間帯別…) từ tháng mở tiệm tới tháng trước, gửi từng tháng vào app.
# Tháng nào đã lấy đủ sẽ tự bỏ qua → chạy lại bao nhiêu lần cũng được.
cd "$(dirname "$0")" || exit 1
HERE="$PWD"; T="$HOME/.subway-tools"
NODE=""; for c in "$(command -v node)" "$T/node/bin/node"; do [ -n "$c" ] && [ -x "$c" ] && NODE="$c" && break; done
if [ -z "$NODE" ] || [ ! -d "$T/node_modules/playwright-core" ]; then echo "Chưa cài — bấm đúp Cai-bot-WingArc.command trước."; read -n1 -rsp "Bấm phím bất kỳ…"; exit 1; fi
clear; echo "=== Lấy dữ liệu tháng cũ từ WingArc ==="
echo "Nhập THÁNG MỞ TIỆM (vd 2023-04), rồi Enter:"
read -r FROM
FROM="$(echo "$FROM" | tr -d ' ' | tr '/.' '--')"
if ! echo "$FROM" | grep -Eq '^[0-9]{4}-[0-9]{1,2}$'; then echo "Sai dạng — cần kiểu 2023-04"; read -n1 -rsp "Bấm phím bất kỳ…"; exit 1; fi
echo "Đang chạy… (mỗi tháng ~1–2 phút; có thể để máy chạy, đừng tắt nắp)"
caffeinate -i env PLAYWRIGHT_BROWSERS_PATH="$T/browsers" WA_TOOLS="$T" "$NODE" "$HERE/wa-bot.mjs" lui "$FROM"
echo; echo "Xem chi tiết trong nhat-ky.txt"; read -n1 -rsp "Bấm phím bất kỳ để đóng…"; echo
exit 0
