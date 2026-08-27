#!/usr/bin/env bash
set -euo pipefail

MODE="${1:---ios}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
METRO_PORT="${HORCERY_METRO_PORT:-8083}"
IOS_UDID="${HORCERY_IOS_SIMULATOR_UDID:-53E8803D-9969-4B67-9130-38E560DD8622}"
IOS_BUNDLE_ID="com.atlaslabs.horcery.app"
DEV_CLIENT_URL="exp+horcery-app-rewrite://expo-development-client/?url=http%3A%2F%2Flocalhost%3A${METRO_PORT}"

cd "$ROOT_DIR"

show_usage() {
  cat <<'USAGE'
usage: ./script/build_and_run.sh [mode]

Modes:
  --ios, ios              Boot the assigned Pro Max and run the dev client
  --dev-client, dev-client
                          Start Metro only, on the Horcery rewrite port
  --check, check          Check local env, simulator, app and QA secret setup
  --help, help            Show this help

Environment overrides:
  HORCERY_METRO_PORT
  HORCERY_IOS_SIMULATOR_UDID
USAGE
}

resolve_expo_cmd() {
  if [[ -f package-lock.json ]]; then
    EXPO_CMD=(npx expo)
  elif [[ -f pnpm-lock.yaml ]] && command -v pnpm >/dev/null 2>&1; then
    EXPO_CMD=(pnpm exec expo)
  elif [[ -f yarn.lock ]] && command -v yarn >/dev/null 2>&1; then
    EXPO_CMD=(yarn expo)
  elif { [[ -f bun.lock ]] || [[ -f bun.lockb ]]; } && command -v bun >/dev/null 2>&1; then
    EXPO_CMD=(bunx expo)
  else
    EXPO_CMD=(npx expo)
  fi
}

load_local_env() {
  if [[ ! -f .env.local ]]; then
    printf 'Missing .env.local. Copy .env.example and fill the local values.\n' >&2
    exit 2
  fi

  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a

  local required=(
    EXPO_PUBLIC_BASE_SERVICE_URL
    EXPO_PUBLIC_ACCOUNT_MANAGEMENT_URL
    EXPO_PUBLIC_FEDERATED_PROMETHEUS_BASE_URL
    EXPO_PUBLIC_FIREBASE_API_KEY
    EXPO_PUBLIC_FIREBASE_BUNDLE_ID
  )
  local name
  for name in "${required[@]}"; do
    if [[ -z "${!name:-}" ]]; then
      printf 'Missing required local setting: %s\n' "$name" >&2
      exit 2
    fi
  done
}

qa_secret_file() {
  local project_secret="$ROOT_DIR/.argent/secrets.env"
  local user_home_dir
  user_home_dir="$(cd && pwd)"
  local user_secret="$user_home_dir/.argent/secrets.env"

  if [[ -f "$project_secret" ]] && grep -q '^ARGENT_SECRET_HORCERY_QA_PASSWORD=' "$project_secret"; then
    printf '%s\n' "$project_secret"
    return 0
  fi
  if [[ -f "$user_secret" ]] && grep -q '^ARGENT_SECRET_HORCERY_QA_PASSWORD=' "$user_secret"; then
    printf '%s\n' "$user_secret"
    return 0
  fi
  return 1
}

simulator_exists() {
  xcrun simctl list devices available | grep "$IOS_UDID" >/dev/null
}

simulator_is_booted() {
  xcrun simctl list devices | grep "$IOS_UDID" | grep '(Booted)' >/dev/null
}

boot_assigned_simulator() {
  if ! simulator_exists; then
    printf 'Assigned iPhone simulator is unavailable: %s\n' "$IOS_UDID" >&2
    exit 3
  fi

  if ! simulator_is_booted; then
    xcrun simctl boot "$IOS_UDID"
    xcrun simctl bootstatus "$IOS_UDID" -b
  fi

  open -a Simulator --args -CurrentDeviceUDID "$IOS_UDID"
}

metro_is_running() {
  lsof -nP -iTCP:"$METRO_PORT" -sTCP:LISTEN >/dev/null 2>&1
}

open_existing_dev_client() {
  xcrun simctl openurl "$IOS_UDID" "$DEV_CLIENT_URL"
  printf 'Opened Horcery Rewrite on %s using Metro port %s.\n' "$IOS_UDID" "$METRO_PORT"
}

check_setup() {
  load_local_env

  printf 'Expo app root: %s\n' "$ROOT_DIR"
  printf 'Git branch: %s\n' "$(git branch --show-current 2>/dev/null || printf 'not-a-git-checkout')"
  printf 'Metro port: %s\n' "$METRO_PORT"
  printf 'Preview mode: %s\n' "${EXPO_PUBLIC_ENABLE_PREVIEWS:-false}"

  if simulator_exists; then
    printf 'Assigned simulator: available (%s)\n' "$IOS_UDID"
  else
    printf 'Assigned simulator: MISSING (%s)\n' "$IOS_UDID"
    return 1
  fi

  if simulator_is_booted; then
    if xcrun simctl listapps "$IOS_UDID" | grep "\"$IOS_BUNDLE_ID\"" >/dev/null; then
      printf 'Horcery Rewrite dev client: installed\n'
    else
      printf 'Horcery Rewrite dev client: NOT INSTALLED\n'
      return 1
    fi
  else
    printf 'Horcery Rewrite dev client: check skipped (simulator is shut down)\n'
  fi

  if qa_secret_file >/dev/null; then
    printf 'Argent QA password secret: available\n'
  else
    printf 'Argent QA password secret: MISSING\n'
    return 1
  fi
}

resolve_expo_cmd

case "$MODE" in
  --ios|ios)
    load_local_env
    boot_assigned_simulator
    if metro_is_running; then
      open_existing_dev_client
      exit 0
    fi
    # A fresh iOS run clears Metro so changes to EXPO_PUBLIC_* flags cannot
    # silently reuse the previous session's transformed bundle.
    exec node "$ROOT_DIR/script/run_ios_dev_client.mjs" "$METRO_PORT" "$IOS_UDID" "$DEV_CLIENT_URL"
    ;;
  --dev-client|dev-client|start|run)
    load_local_env
    exec "${EXPO_CMD[@]}" start --dev-client --port "$METRO_PORT"
    ;;
  --check|check)
    check_setup
    ;;
  --help|help)
    show_usage
    ;;
  *)
    show_usage >&2
    exit 2
    ;;
esac
