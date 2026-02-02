#!/bin/bash
# MoltGram Dev Server Watchdog
# - Monitors dev server health every 30 seconds
# - Auto-restarts with .next cleanup on 500 errors or crashes
# - Runs as launchd service (com.moltgram.dev-watchdog)

PROJECT_DIR="/Users/ibkim/Projects/MoltGram"
PORT=3002
LOG_FILE="/tmp/moltgram-dev.log"
WATCHDOG_LOG="/tmp/moltgram-watchdog.log"
HEALTH_CHECK_INTERVAL=30
STARTUP_WAIT=20
MAX_CONSECUTIVE_FAILURES=2

# Ensure node/npm are in PATH (nvm)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
export PATH="/Users/ibkim/.nvm/versions/node/v24.13.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

cd "$PROJECT_DIR" || exit 1

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$WATCHDOG_LOG"
}

# Truncate watchdog log if too large (>1MB)
if [ -f "$WATCHDOG_LOG" ]; then
  local_size=$(wc -c < "$WATCHDOG_LOG" 2>/dev/null || echo "0")
  if [ "$local_size" -gt 1048576 ] 2>/dev/null; then
    tail -100 "$WATCHDOG_LOG" > "${WATCHDOG_LOG}.tmp" && mv "${WATCHDOG_LOG}.tmp" "$WATCHDOG_LOG"
  fi
fi

get_server_pid() {
  /usr/sbin/lsof -i ":$PORT" -sTCP:LISTEN -t 2>/dev/null | head -1
}

kill_server() {
  local pid
  pid=$(get_server_pid)
  if [ -n "$pid" ]; then
    log "Killing server (pid $pid)"
    kill "$pid" 2>/dev/null || true
    sleep 2
    # Force kill if still alive
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
      sleep 1
    fi
  fi
  # Also kill any orphan next dev processes
  pkill -f "next dev.*-p $PORT" 2>/dev/null || true
  sleep 1
}

start_server() {
  log "Starting dev server (rm -rf .next && next dev -p $PORT)"
  rm -rf "$PROJECT_DIR/.next"
  cd "$PROJECT_DIR" || return 1
  nohup npm run dev -- -p "$PORT" > "$LOG_FILE" 2>&1 &
  
  # Wait for startup
  local waited=0
  while [ $waited -lt $STARTUP_WAIT ]; do
    sleep 3
    waited=$((waited + 3))
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://localhost:$PORT" 2>/dev/null || echo "000")
    if [ "$status" = "200" ] || [ "$status" = "304" ]; then
      log "Server started successfully (HTTP $status) after ${waited}s"
      return 0
    fi
  done
  
  log "Server may still be compiling, giving extra time..."
  sleep 15
  local final_status
  final_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://localhost:$PORT" 2>/dev/null || echo "000")
  if [ "$final_status" = "200" ] || [ "$final_status" = "304" ]; then
    log "Server started (HTTP $final_status) after extended wait"
    return 0
  fi
  
  log "Server failed to start properly (HTTP $final_status)"
  return 1
}

restart_server() {
  log "--- Restart triggered ---"
  kill_server
  start_server
}

health_check() {
  local pid
  pid=$(get_server_pid)
  
  # Check if process exists
  if [ -z "$pid" ]; then
    log "FAIL: Server process not found on port $PORT"
    return 1
  fi
  
  # Check HTTP response
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:$PORT" 2>/dev/null || echo "000")
  
  case "$status" in
    200|304)
      return 0
      ;;
    500)
      log "FAIL: HTTP 500 (webpack cache likely corrupted)"
      return 1
      ;;
    000)
      log "FAIL: No response (timeout/connection refused)"
      return 1
      ;;
    *)
      # 3xx, 4xx etc — server is alive
      return 0
      ;;
  esac
}

# === Main ===

log "=== Watchdog started (PID $$) ==="

# Initial check — only start if not already healthy
if health_check; then
  log "Server already healthy, entering monitor loop"
else
  restart_server
fi

consecutive_failures=0

while true; do
  sleep "$HEALTH_CHECK_INTERVAL"
  
  if health_check; then
    consecutive_failures=0
  else
    consecutive_failures=$((consecutive_failures + 1))
    log "Health check failed ($consecutive_failures/$MAX_CONSECUTIVE_FAILURES)"
    
    if [ "$consecutive_failures" -ge "$MAX_CONSECUTIVE_FAILURES" ]; then
      restart_server
      consecutive_failures=0
    fi
  fi
done
