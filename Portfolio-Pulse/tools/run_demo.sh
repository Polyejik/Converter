#!/usr/bin/env bash
# Локальный демонстрационный контур Portfolio Pulse.
#
# Поднимает два процесса:
#   1) Cloudflare Worker с локальной базой D1 (режим разработки, вход без Cloudflare Access);
#   2) статический сервер с приложением.
#
# Использование:
#   ./tools/run_demo.sh            # поднять контур
#   ./tools/run_demo.sh --reset    # снести локальную базу, применить миграции и наполнение заново
#
# Требования: Node 24+ (в PATH), зависимости проекта установлены (npm ci в папке Portfolio-Pulse).

set -euo pipefail
cd "$(dirname "$0")/.."

API_PORT="${API_PORT:-8787}"
APP_PORT="${APP_PORT:-8099}"
WRANGLER="npx wrangler"
D1_FLAGS=(d1 --local --config api/wrangler.jsonc)

echo "══ Portfolio Pulse · локальный контур ══"
node --version

if [[ "${1:-}" == "--reset" ]]; then
  echo "→ сношу локальную базу и применяю миграции заново"
  rm -rf api/.wrangler
  $WRANGLER d1 migrations apply portfolio-pulse "${D1_FLAGS[@]}" >/dev/null
  $WRANGLER d1 execute portfolio-pulse "${D1_FLAGS[@]}" --file=api/seed/0001_demo.sql >/dev/null
  if [[ -f api/seed/0002_finance.sql ]]; then
    $WRANGLER d1 execute portfolio-pulse "${D1_FLAGS[@]}" --file=api/seed/0002_finance.sql >/dev/null
  fi
  echo "  база собрана заново"
fi

echo "→ проверяю наполнение базы"
$WRANGLER d1 execute portfolio-pulse "${D1_FLAGS[@]}" --json \
  --command "SELECT (SELECT COUNT(*) FROM projects) AS projects, (SELECT COUNT(*) FROM users) AS users;" \
  | python3 -c "import sys,json; r=json.load(sys.stdin)[0]['results'][0]; print(f\"  проектов: {r['projects']}, пользователей: {r['users']}\")" \
  || echo "  база ещё не наполнена — запустите с ключом --reset"

echo "→ поднимаю API на http://127.0.0.1:${API_PORT}"
DEV_AUTH=1 $WRANGLER dev --local --port "${API_PORT}" --config api/wrangler.jsonc > /tmp/pulse-api.log 2>&1 &
API_PID=$!

echo "→ поднимаю приложение на http://127.0.0.1:${APP_PORT}/index.html"
python3 -m http.server "${APP_PORT}" --bind 127.0.0.1 > /tmp/pulse-app.log 2>&1 &
APP_PID=$!

cleanup() {
  echo
  echo "→ останавливаю контур"
  kill "${API_PID}" "${APP_PID}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "→ жду готовности API"
for _ in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${API_PORT}/api/session" || true)
  [[ "${code}" != "000" ]] && break
  sleep 2
done

echo
echo "───────────────────────────────────────────────"
echo "  Приложение:  http://127.0.0.1:${APP_PORT}/index.html"
echo "  API:         http://127.0.0.1:${API_PORT}/api/session"
echo "  Логи:        /tmp/pulse-api.log, /tmp/pulse-app.log"
echo "  Остановить:  Ctrl+C"
echo "───────────────────────────────────────────────"
echo
wait
