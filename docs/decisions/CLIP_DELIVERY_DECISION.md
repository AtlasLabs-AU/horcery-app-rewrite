# Where clip delivery happens — open decision

**Date raised:** 2026-09-02
**Status:** **OPEN — parked for discussion.** Nothing is being built against
this until Inakshi decides. Raised during a code assessment of clip download in
the shipping app; the bugs found in the same pass are filed separately in
`dev-tickets/Horcery_Clip_Download_Dev_Tickets.md` and can be fixed without
this decision.
**Blocks:** porting clip download to the rewrite. The rewrite has
`src/stores/utils/clip-detail-slice.ts` but no download slice, so nothing is
committed yet — this is a decision made *before* the port, not a migration.

Authority: principles 2 (performance) and 5 (user-friendly), plus the general
rule that the app is a viewer.

---

## 1. The decision in plain English

When someone taps "save" on a clip, who does the work — the phone, or our
server?

Today the phone does it. The app asks the server for a download link, then
pulls the whole video down itself and hands it to the photo gallery. That
choice is why the feature is fragile.

## 2. Why this is open

Horcery's phone app is a window, not a workshop. The stall monitors do the
sensing, the server does the recording, event detection, clip generation and
metrics. The app shows people what happened. Downloading a video is the one
place in the whole app where the phone does heavy, slow work — and it is the
one place with this class of bug.

Three things follow from that:

- **It fails in exactly the conditions our customers are in.** A barn, rural
  signal, a phone that goes in a pocket. Put the phone away mid-download and
  iOS suspends the app; the download stalls and then fails.
- **We already own most of the alternative.** Clips already carry access
  tokens, an expiry, a permissions model, an invitees widget and a cloud
  bucket. The sharing machinery exists server-side and is not being used for
  this.
- **The app's own sharing function is switched off.** `shareClip` in
  `packages/stores/src/utils/download-clip-slice.ts` is commented out with
  "This function has been disabled." Nobody recorded why.

## 3. The question that actually decides it

**What is the save button for?**

- If people tap it to **send a clip to someone** — a vet, an owner, an
  insurer — the server should deliver it and the phone should get out of the
  way. Option B below.
- If people tap it to **keep the video on their phone** — offline, theirs,
  permanently — then a link does not replace that, and we need a real
  background download. Option C below.

This is a customer question, not an engineering one. It needs ten minutes with
whoever talks to customers, not a spike.

## 4. Options

### Option A — Stop over-promising, change nothing else

Remove the "Download will continue in the background" message and say "keep
the app open while this saves."

- **Cost:** minutes.
- **Gets us:** an honest product. The download is still fragile.
- **Use it:** as an immediate patch regardless of what we choose, because the
  message is false today. Filed as a P1 ticket.

### Option B — The server delivers the clip *(recommended, if the need is sharing)*

The app calls an endpoint; the server sends a link by email or text, or
returns a share URL the phone opens in the browser. The operating system
handles the transfer, not us.

- **Cost:** backend work, most of which exists. The app *loses* code — the
  whole download slice goes.
- **Gets us:** works on bad signal, survives the phone being pocketed, nothing
  to maintain in the app, no new dependency.
- **Against it:** does not put a file in the customer's camera roll.

### Option C — Make the phone download properly

Adopt a real background transfer (a background `NSURLSession` on iOS,
WorkManager on Android) so the download survives backgrounding.

- **Cost:** a native dependency, a new dev build, and QA on physical devices —
  this cannot be tested in a simulator, which principle 16 already tells us is
  where these things go wrong.
- **Gets us:** the file genuinely lands in the gallery, offline afterwards.
- **Against it:** the phone is still doing the server's job, and we carry the
  dependency forever.

**Not recommended:** `react-native-continued-task`, which was evaluated on
2026-09-02 and rejected. It is built for on-device processing — exports,
transcodes — not file transfer, so it is the wrong tool even for Option C. It
also requires iOS 26 or newer, does not run in the simulator at all, and is a
single-author library with under 150 users. Revisit only if we ever add real
on-device processing.

## 5. Recommendation

Do Option A now — it is a false message and costs nothing to remove.

Then answer the question in §3 before choosing between B and C. Expect B: the
need is almost certainly sharing, and B is the only option that makes the app
smaller.

## 6. What happens if we do nothing

The shipping app keeps telling customers a download will continue in the
background when it will not, and the rewrite eventually ports the same design
because it is what the old code does.
