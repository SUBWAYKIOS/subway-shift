#!/bin/bash
# Bấm đúp: bot đăng nhập WingArc, tải các CSV đã học, gửi vào app (kết quả cuối trong nhat-ky.txt).
cd "$(dirname "$0")" || exit 1
HERE="$PWD"; T="$HOME/.subway-tools"
NODE=""; for c in "$(command -v node)" "$T/node/bin/node"; do [ -n "$c" ] && [ -x "$c" ] && NODE="$c" && break; done
if [ -z "$NODE" ] || [ ! -d "$T/node_modules/playwright-core" ]; then echo "Chưa cài — bấm đúp Cai-bot-WingArc.command trước."; read -n1 -rsp "Bấm phím bất kỳ…"; exit 1; fi
[ -t 1 ] && clear; echo "=== Bot WingArc ($(date '+%d/%m %H:%M')) ==="
PLAYWRIGHT_BROWSERS_PATH="$T/browsers" WA_TOOLS="$T" "$NODE" "$HERE/wa-bot.mjs" "${1:-chay}"
[ -t 0 ] && { echo; read -n1 -rsp "Bấm phím bất kỳ để đóng…"; echo; }
exit 0
