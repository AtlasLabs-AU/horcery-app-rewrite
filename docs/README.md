# Rewrite documents

Moved into the repo on 2026-08-17 so the documents that describe this code are
versioned with it. Before that they lived in Inakshi's plain `Horcery/` working
folder with no history. **This is the canonical copy.** The `Horcery/` folder
stays the working area for everything that is *not* the rewrite (finance, BOM,
transcripts, shipping-app bug reports).

Filenames are unchanged so existing references and greps keep working.

## Read first

- [`requirements/Horcery_App_Rewrite_Requirements.md`](requirements/Horcery_App_Rewrite_Requirements.md)
  — the authoritative requirements document. Every architectural decision
  traces back to it. Section 9 is the corrections log.
- [`requirements/Horcery_App_UI_Design_Requirements.md`](requirements/Horcery_App_UI_Design_Requirements.md)
  — the design brief (R-numbered rules) behind `src/constants/tokens.ts`.
- [`../PRINCIPLES.md`](../PRINCIPLES.md) — first principles; tie-break "smooth
  over showy". Already lived in the repo.

## architecture/ — mandatory implementation standards

| File | Purpose |
|---|---|
| `CHART_ENGINEERING_STANDARD.md` | Canonical rules for whether and how every chart is designed, supplied with data, implemented, tested and approved |
| `CHART_SPECIFICATION_TEMPLATE.md` | Required per-chart specification completed before implementation |
| `CHART_AND_QUERY_REGISTER.md` | Controlled fleet-wide inventory of chart meaning, query/API status, units, evidence, approvals and linked specifications |

The renderer choice and its evidence remain in
`decisions/CHART_RENDERER_DECISION.md`; these architecture documents govern the
work that follows that decision.

## scope/ — what a page is, decided against the shipping app

| File | Page |
|---|---|
| `Horcery_For_You_Rebuild_Notes.md` | For You |
| `Horcery_Review_History_Scope.md` | Review History |
| `Horcery_Horses_Parity_Gaps.md` | Horses list — parity gaps A–F, decisions and priorities |
| `Horcery_Horse_Details_Scope.md` | Horse Details — full scope, four slices, seven open decisions |
| `Horcery_Alerts_Architecture.md` | Alerts (Manage + create/edit) — frontend architecture v2: domain layer, descriptors, barn-time windows + drift, route-level permissions, slices A0–A5 |
| `Horcery_Localization_Agentic_Implementation_Plan.md` | i18n (requirements §4b, hardening H2) |
| `Horcery_Parity_and_QA_Audit_2026-08-18.md` | **Whole-app** parity audit (old app vs rewrite, every feature area) + device QA pass + code-review bug list + decisions needed. Full per-capability sweep tables in `appendix/parity-sweeps-2026-08-18/`. |

## handovers/ — instructions written for Codex, and reviews of what came back

| File | What |
|---|---|
| `Horses_Page_Handover_to_Codex.md` | The Horses list build |
| `Horses_Gaps_Rework_Instructions_for_Codex.md` | Review of the first Horses parity pass; the "report only what is in the diff" rule |
| `Charts_Spike_Run2_Handover_to_Codex.md` | Renderer spike, run 2 |
| `Charts_Spike_Decision_Day_Brief.md` | Decision-day brief v2 |
| `Charts_Spike_Scorecard_and_Cost_Ledger.md` | Scorecard shell and cost ledger |
| `Charts_Spike_Review_2026-08-17_physical_pass.md` | Independent review of the physical-phone pass |
| `Horcery_Android_Emulator_Handoff.md` | Android emulator setup |
| `Alerts_Implementation_Plan_for_Codex.md` | Alerts — slice-by-slice technical plan (A0 ground truth → A1 domain → A2 read-only list → A3 create/edit gated); A4 waits on D1 |

Spike evidence (screenshots, raw logs — 1.7 GB) is **not** in git. It stays at
`Horcery/spike-evidence/` on Inakshi's Mac; the review documents reference it
by that path.

## dev-tickets/ — findings in the SHIPPING app, for the dev team

| File | Page |
|---|---|
| `Horcery_Horses_Dev_Tickets.md` | Horses list |
| `Horcery_Review_History_Dev_Tickets.md` | Review History |
| `Horcery_Manage_Alerts_Review.md` | Manage Alerts + create/edit alert flow — full review, rated 5/10, 8 tickets |

Written while reviewing the old app for parity. These describe
`84-horcery-app-react-native`, not this repo. They live here because they were
produced by the rewrite work; when one needs to reach the dev team it goes to
Jira/Confluence as its own item, in their language.

## runbooks/

`Horcery_App_Agent_Runbook.md` — how an agent runs the *shipping* app locally
for comparison (EAS cloud build, argent, QA login). Credentials are **not** in
this file; it says where they live.

## Where the dev team is

The rewrite repo is Inakshi, Claude and Codex. The dev team works on the
shipping app in Bitbucket, Jira and Confluence and does not read this repo. So
"is GitHub updated" only says whether *we* have a record. Reaching the dev team
is a separate, occasional act — one item, in their tools, when it needs their
hands (see GitHub issue #1 for the first likely case).
