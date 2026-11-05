#!/bin/bash
# Bấm đúp: bot đăng nhập WingArc, tải các CSV đã học, gửi vào app (kết quả cuối trong nhat-ky.txt).
cd "$(dirname "$0")" || exit 1
HERE="$PWD"; T="$HERE/.tools"
NODE=""; for c in "$(command -v node)" "$HERE/../SUBWAY-day-len/.tools/node/bin/node" "$T/node/bin/node"; do [ -x "$c" ] && NODE="$c" && break; done
[ -z "$NODE" ] && { echo "Chưa cài — bấm đúp Cai-bot-WingArc.command trước."; read -n1 -rsp "Bấm phím bất kỳ…"; exit 1; }
clear; echo "=== Bot WingArc ==="
PLAYWRIGHT_BROWSERS_PATH="$T/browsers" WA_TOOLS="$T" "$NODE" "$HERE/wa-bot.mjs" "${1:-chay}"
echo; read -n1 -rsp "Bấm phím bất kỳ để đóng…"; echo
