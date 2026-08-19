# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# First principles

Read `PRINCIPLES.md` before making any design or engineering decision in this
repo, and hold every change against it. Tie-break: smooth over showy.

# Charts

Before proposing, changing or implementing any chart or chart-like score, read
`docs/architecture/CHART_ENGINEERING_STANDARD.md` and complete
`docs/architecture/CHART_SPECIFICATION_TEMPLATE.md`, then update
`docs/architecture/CHART_AND_QUERY_REGISTER.md`. Feature screens never import
Victory, author PromQL or interpret raw Prometheus responses. Unknown meaning,
units, thresholds or ownership blocks implementation; do not guess.
