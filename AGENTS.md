# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# First principles

Read `PRINCIPLES.md` before making any design or engineering decision in this
repo, and hold every change against it. Tie-break: smooth over showy.

# Skills and engineering judgement

Repository skills are optional aids, not mandatory operating modes. Use a skill
when its specialised procedure would materially improve the task. Do not invoke
one merely because it exists, and do not let a skill override the user's request,
verified repository evidence or better engineering judgement. If a skill is
outdated, too narrow or conflicts with the task, explain that and use the better
approach.

# Charts

Consider `$horcery-chart-engineering` from
`.agents/skills/horcery-chart-engineering/SKILL.md` when its controlled workflow
would help to propose, implement, change, fix, investigate or review a chart or
chart-like score. It supports engineering judgement; it does not replace it.

Before proposing, changing or implementing any chart or chart-like score, read
`docs/architecture/CHART_ENGINEERING_STANDARD.md` and complete
`docs/architecture/CHART_SPECIFICATION_TEMPLATE.md`, then update
`docs/architecture/CHART_AND_QUERY_REGISTER.md`. Feature screens never import
Victory, author PromQL or interpret raw Prometheus responses. Unknown meaning,
units, thresholds or ownership blocks implementation; do not guess.

For every chart review, work through
`docs/architecture/CHART_REVIEW_CHECKLIST.md`. It is the short reusable gate for
the accuracy, state, architecture, layout and device failures already found in
the rebuild.

# Check before you record ignorance

Before writing **"pending"**, **"unknown"**, **"no owner"**, **"not approved"**,
**"blocked"** or **"does not exist"** — in a document, a commit message, or a
message to Inakshi — and before asking another team for something, search the
sources below. Each has already held an answer that was recorded as unknown.

- **`../84-horcery-app-react-native`** — the shipping app, read-only reference.
  Grep it before claiming the product does not already do something, or that a
  threshold, query, default or feature does not exist. It had the deviation
  threshold, the 6 AM barn-day default, and a built-but-disabled verdict pill.
- **`../automation/digest.md`** — dated team-meeting decisions, owners, blockers.
  Search it for the feature name before assigning ownership, declaring a question
  unanswered, or proposing something to another team. It had the named query
  owner, the agreed build order, and an offer from the data team to return
  computed levels rather than have the app threshold them.
- **Google Drive** — the "Mobile Queries" sheet and the alert testing sheets.
- **This repo's `docs/`** — requirements, the register, existing specifications.

The costs are wildly asymmetric: a two-minute search, against a false entry in a
controlled register or a question put to another team that they already answered.

**A subagent's summary is evidence, not fact.** Before a claim from one goes into
a document or a decision, confirm it in the source. "The app defaults to
midnight" was an inference in a subagent report, was repeated as fact, and was
wrong.

Recorded 2026-08-19 by Inakshi, after five such errors in a single day.

# Check the metadata, and change one thing at a time

Two failures on 2026-08-23, both while confidently "settling" open questions:

- **Prometheus publishes its own documentation.** `/api/v1/metadata` on each
  monitor carries a HELP string for every metric. It documented the
  `horse_behaviour_per_id` code table, and that these metrics are FRACTIONS of
  the scrape window rather than booleans, while the register recorded the codes
  as unknowable. Read the metadata before inferring a metric's meaning from its
  values.
- **A comparison that changes two things measures neither.** "The value depends
  on the request step" came from comparing a 3-day window at one step against a
  1-hour window at another. Same window, different steps, returns identical
  values. Hold everything fixed but the variable under test.

Both errors pointed the same way: the checks were rigorous on the questions
already marked uncertain, and absent on the answers that felt settled. Confidence
is the signal to check, not the reason to skip.
