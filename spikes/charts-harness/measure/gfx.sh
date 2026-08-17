#!/bin/bash
# Android UI-thread frame statistics for the harness, from the platform itself.
#
#   measure/gfx.sh reset            # clear counters before a gesture set
#   measure/gfx.sh report <label>   # print one summary line since reset
#   measure/gfx.sh framestats <file> # retain raw per-frame timestamps
#   measure/gfx.sh meminfo <file>    # retain the raw memory snapshot
#
# `dumpsys gfxinfo` reports frames the app actually submitted: total, how many
# missed their deadline ("janky"), and frame-duration percentiles. It observes
# UI-thread/RenderThread work, but not JavaScript stalls that produce no frame.
# Treat it as one platform signal, not a complete smoothness measurement.
set -euo pipefail
PKG="${HORCERY_PACKAGE:-au.com.atlaslabs.horcery.chartsharness}"
ADB="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"

case "${1:-}" in
  reset)  "$ADB" shell dumpsys gfxinfo "$PKG" reset > /dev/null ;;
  report)
    label="${2:-?}"
    out=$("$ADB" shell dumpsys gfxinfo "$PKG")
    total=$(echo "$out" | awk -F': ' '/Total frames rendered/ {print $2; exit}')
    janky=$(echo "$out" | awk -F': ' '/Janky frames/ {print $2; exit}' | sed 's/ (.*//')
    jankyPct=$(echo "$out" | awk -F'[()]' '/Janky frames/ {print $2; exit}')
    p50=$(echo "$out" | awk -F': ' '/50th percentile/ {print $2; exit}')
    p90=$(echo "$out" | awk -F': ' '/90th percentile/ {print $2; exit}')
    p95=$(echo "$out" | awk -F': ' '/95th percentile/ {print $2; exit}')
    p99=$(echo "$out" | awk -F': ' '/99th percentile/ {print $2; exit}')
    slowUi=$(echo "$out" | awk -F': ' '/Number Slow UI thread/ {print $2; exit}')
    echo "$label,total=$total,janky=$janky ($jankyPct),p50=$p50,p90=$p90,p95=$p95,p99=$p99,slowUiThread=$slowUi"
    ;;
  mem)
    label="${2:-?}"
    pss=$("$ADB" shell dumpsys meminfo "$PKG" | awk '/TOTAL PSS:/ {print $3; exit}')
    echo "$label,pss_kb=$pss"
    ;;
  framestats)
    file="${2:?output file required}"
    mkdir -p "$(dirname "$file")"
    "$ADB" shell dumpsys gfxinfo "$PKG" framestats > "$file"
    shasum -a 256 "$file"
    ;;
  meminfo)
    file="${2:?output file required}"
    mkdir -p "$(dirname "$file")"
    "$ADB" shell dumpsys meminfo "$PKG" > "$file"
    shasum -a 256 "$file"
    ;;
  *) echo "usage: gfx.sh reset | report <label> | mem <label> | framestats <file> | meminfo <file>"; exit 2 ;;
esac
