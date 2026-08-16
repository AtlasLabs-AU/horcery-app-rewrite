#!/bin/bash
# Android UI-thread frame statistics for the harness, from the platform itself.
#
#   measure/gfx.sh reset            # clear counters before a gesture set
#   measure/gfx.sh report <label>   # print one CSV line for what happened since
#
# `dumpsys gfxinfo` reports frames the RenderThread actually produced: total,
# how many missed their deadline ("janky"), and 50/90/95/99th-percentile frame
# times in ms. It counts UI-thread and RenderThread work — the JS thread is
# invisible to it, which is exactly why it is the honest smoothness measure:
# JS can be idle while the UI stutters, and vice versa.
set -euo pipefail
PKG=au.com.atlaslabs.horcery.chartsharness
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
  *) echo "usage: gfx.sh reset | report <label> | mem <label>"; exit 2 ;;
esac
