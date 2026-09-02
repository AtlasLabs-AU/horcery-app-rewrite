# Clip download — bug tickets for the dev team (shipping app)

Found 2026-09-02 during a code assessment of clip download in
`84-horcery-app-react-native`. Each is reproducible from the code alone; file
and line references are to `development` as of that date. Independent of the
rewrite — the rewrite has not ported this feature yet.

Suggested owner: Vikum / mobile.

**Related:** whether the phone should be downloading clips at all is parked in
`decisions/CLIP_DELIVERY_DECISION.md`. These tickets are worth fixing either
way, except HC84-XXXX-1, which that decision may resolve differently.

---

## HC84-XXXX-1 · P1 · The app promises a background download it cannot do

**Where:** `packages/widgets/src/clip-information-card/index.tsx:163`, and the
download it starts in `packages/stores/src/utils/download-clip-slice.ts:56-64`

**What happens:** Immediately before the download starts, the app shows
"Download will continue in the background." It will not. The download is a
plain `downloadAsync()` running on the JavaScript thread, which iOS suspends
as soon as the app leaves the foreground.

So a customer taps save, reads a message telling them they can put the phone
away, walks off, and comes back to "Failed to save clip. Please try again
later." In a barn on rural signal — which is every customer — this is the
normal case, not the edge case.

**Fix:** change the message to "Keep the app open while this saves." One
string. Do this now regardless of the wider decision, because the current
message is simply untrue.

---

## HC84-XXXX-2 · P1 · Clip titles go into a file path without being cleaned

**Where:** `packages/stores/src/utils/download-clip-slice.ts:53-54`; caller
passes `clipName: title` at `packages/widgets/src/clip-information-card/index.tsx:166`

**What happens:** The clip's user-entered title is used directly as a
filename: the path is built as `${tempDir}${fileName}.mp4`. Anything a
customer can type into a clip name is now part of a file path. A clip called
"Bay mare 3/4 turn" produces a path inside a directory that does not exist,
the download fails, and the customer gets the generic "Failed to save clip"
message with no way to work out why. Renaming the clip would fix it, but
nothing tells them that.

**Fix:** sanitise the name before it becomes a filename — strip or replace
path separators and anything else illegal, collapse whitespace, cap the
length, and fall back to the clip id if nothing usable is left. Add a test
with a slash, an empty string and an emoji in the title.

**Worth checking first:** query the real clip names in production. If any
contain a slash, customers are hitting this today.

---

## HC84-XXXX-3 · P2 · The duplicate-download guard does not stop a repeat tap

**Where:** `packages/stores/src/utils/download-clip-slice.ts:36-40`, with the
shared handle declared at line 29

**What happens:** The guard only bails out if a *different* clip is already
downloading. Tap the same clip twice and both downloads run. They share one
`downloadResumable` variable, so the first is orphaned and the cleanup step
runs twice — the second delete can remove a file the first is still writing.

Not currently reachable from the UI, because the download button is disabled
while `isDownloading` is true. It is latent, not live. But the store is not
safe on its own, and the rewrite will call it from somewhere new.

**Fix:** bail out whenever `isDownloading` is true, whatever the clip id. Hold
the download handle per call rather than in the shared closure.

---

## HC84-XXXX-4 · P3 · Fallback filename gets two `.mp4` extensions

**Where:** `packages/stores/src/utils/download-clip-slice.ts:53-54`

**What happens:** The fallback name already ends in `.mp4`, and `.mp4` is
appended again on the next line, giving `<id>-<timestamp>.mp4.mp4`. Only fires
when no title is passed, which the one current caller always does — so it is
invisible today.

**Fix:** put the extension in one place. Fold into the fix for
HC84-XXXX-2, which touches the same two lines.

---

## HC84-XXXX-5 · P3 · The error callback throws from inside a catch block

**Where:** `packages/stores/src/utils/download-clip-slice.ts:74-76` and
`packages/widgets/src/clip-information-card/index.tsx:170-172`

**What happens:** The store catches a download failure and calls the caller's
`onError`. That callback then throws. So an exception is raised from inside
the catch block that was handling the first one. It happens to work — the
throw escapes and the caller's outer `try` catches it, showing the error
message — but by accident rather than design, and it makes the failure path
very hard to follow.

**Fix:** have `onError` handle the error (show the message) instead of
throwing, or have `downloadClip` return a result the caller checks. Not
urgent; do it whenever this file is next opened.

---

# Unrelated bug found in the same pass

## HC84-XXXX-6 · P2 · Background task failures crash their own error handler

**Where:** `packages/config/src/background-task-manager/index.ts:144` and
`:160`, against the import at `:4`

**What happens:** `executeTask` takes a parameter named `error`, which hides
the `error` logger imported at the top of the file. The catch block then calls
`error(...)` expecting the logger, and gets the parameter instead — a
`TaskManagerError`, or `null`. Calling it throws `TypeError: error is not a
function`.

So every time a background task fails, the code meant to record the failure
fails too, and throws a second, more confusing error on top of the first. The
one path designed to tell us something went wrong is the path that breaks.

**Fix:** rename the parameter (`taskError`). One word. Then check whether
anything was relying on background task failures being reported, because they
have not been.
