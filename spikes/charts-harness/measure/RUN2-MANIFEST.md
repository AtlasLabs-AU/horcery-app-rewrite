# Run 2 evidence manifest

Raw evidence is deliberately outside git under
`/Users/inakshi/AI Projects/Horcery/spike-evidence/run2/`. The initial build
items below were captured from the content committed at `acbd0a7`; later
sections name their own corrected builds and provenance. These are build and
smoke artefacts, **not** the seven-repetition decision matrix.

## Isolated release builds

| Finalist | Artefact | Bytes | SHA-256 | What it proves / does not prove |
|---|---|---:|---|---|
| ECharts · Skia | `builds/echarts-skia/android-release.apk` | 125,651,811 | `8c6f170110df76adc0ff0f5f14e361ab6c1210b11071c843cff83ab0f6826bd3` | Android Release APK built and installed. Not a performance run. |
| ECharts · Skia | `builds/echarts-skia/ios-simulator-release.zip` | 27,876,515 | `8e2822fc6f252780ac3aa55e6b42048d31fb58b58e647189098acf35e3fc4691` | iOS Simulator Release archive built and launched. Not physical-iPhone evidence. |
| Victory · Skia | `builds/victory/android-release.apk` | 124,549,851 | `3e78aa479d3eb05345c5af2894376e205a16447ab6d584c021d7b17fe957131d` | Android Release APK built and installed. Not a performance run. |
| Victory · Skia | `builds/victory/ios-simulator-release.zip` | 27,108,558 | `897f1922a11085ea24288f8ad7f40e47702ea1e0fd91cc1c0f8786313bf9f4a5` | iOS Simulator Release archive built and launched. Not physical-iPhone evidence. |

The ECharts APK is 1,101,960 bytes larger; its zipped simulator build is
767,957 bytes larger. This is implementation-cost evidence only and does not
select a renderer.

## Isolated JavaScript graphs

| Finalist | Source map | SHA-256 | Audit result |
|---|---|---|---|
| ECharts · Skia | `bundle-audits/echarts-skia/android.hbc.map` | `ce0c1956f4827c6fd311b74b220a46a7c7101000993dc98e2833d861785083fe` | 15 Wuba, 488 ECharts and 82 zrender source entries; **0 Victory and 0 React Native SVG**. |
| Victory · Skia | `bundle-audits/victory/android.hbc.map` | `4cbb28bb2cdce86c3c6f8235b03cfff9e760000d7fac302f54d6d9f523ae9202` | 113 Victory source entries; **0 Wuba, ECharts, zrender and React Native SVG**. |

Both exports emitted the same `tslib/tslib.js` exports-fallback warning. That is
recorded as build friction, not hidden. Native autolinking was separately
inspected after clean prebuild: both finalist binaries share Skia, Gesture
Handler, Reanimated and Worklets; neither links the dev-client family or React
Native SVG.

## Direct-launch visual smoke evidence

| Device / finalist | Artefact | SHA-256 | What it proves / limitation |
|---|---|---|---|
| iPhone 17 Pro simulator / ECharts | `builds/echarts-skia/ios-direct-launch-clean.png` | `9e73f74c898a6d08c1e2048365fa10164ad93d7beb4635ef060d28de197aff57` | Isolated Release launches without Metro and renders normal week. Simulator only. |
| iPhone 17 Pro simulator / Victory | `builds/victory/ios-direct-launch-clean.png` | `516a488a2b1cd679ff5f9e549c550a795ce6b7f70fa54bd2e48c0ad9cf6f5d55` | Isolated Release launches without Metro and renders normal week. Simulator only. |
| Pixel API 36 emulator / ECharts | `android-emulator/echarts-skia/normal/direct-launch.png` | `bc7f9e9f921884d93ddf7718bb3525d8c4ad87f946a36eec234279d9ce7be87e` | Isolated Release launches without Metro and renders normal week. Emulator only. |
| Pixel API 36 emulator / Victory | `android-emulator/victory/normal/direct-launch-clean.png` | `6111d16ffa2cd0c32b5387c6900ff7b0d5c50f651984748e1f2bc7bcfb6507ba` | Isolated Release launches without Metro and renders normal week. Emulator only. |
| iPad mini (A17 Pro) simulator / ECharts | `ipad-mini-simulator/echarts-skia/normal/direct-launch.png` | `0fce97858c77657c5a0f957c1bdfa3a7221f526a30cf9385e1bd93e14c582bed` | Isolated Release renders seven rows at tablet width. The ending 12 AM label is absent, so axis parity is not passed. |
| iPad mini (A17 Pro) simulator / Victory | `ipad-mini-simulator/victory/normal/direct-launch.png` | `839c4b9e828563f377433379f569b47e39461eda4a69f1129f9b95d64ef89332` | Isolated Release renders seven rows and both endpoint labels at tablet width. Interaction and physical-tablet gates remain. |

The earlier `ios-direct-launch.png` images contain Expo open prompts and
Victory's earlier `direct-launch.png` contains an Android System UI ANR dialog.
They are retained as failed-attempt evidence and are not cited for parity. The
Android system process became unstable during concurrent native builds; the
clean relaunch remained alive, so this is not classified as a renderer crash.

## Accessibility and one-off diagnostics

| Finalist | Artefact | SHA-256 | What it proves / limitation |
|---|---|---|---|
| ECharts · Skia | `android-emulator/echarts-skia/normal/accessibility-tree.xml` | `e4659b915fc84ee657953c7561ed9ac3e2f7ad00874da25331b0f2b233307695` | Summary plus exactly 20 interval nodes on page 1, with series/date/time/count labels. Tree semantics only; not spoken TalkBack. |
| ECharts · Skia | `android-emulator/echarts-skia/normal/direct-launch-framestats.txt` | `4b8b5ed0dfafb1a5bd433ac55391fafd5da474caf275fe62a29ff8a48b44ddda` | One post-launch frame-history dump. Not a protocol measurement. |
| ECharts · Skia | `android-emulator/echarts-skia/normal/direct-launch-meminfo.txt` | `5751590a93a1fad0e64c4d1ff9c68395b5f9fda21f38d1352f5c14c2d8cd8ab4` | One post-launch memory snapshot. Not a leak test. |
| Victory · Skia | `android-emulator/victory/normal/accessibility-tree.xml` | `7bd8e31c3038da9e9d0e135615eb5749f73dc847d24d5a319eccb907e2f33db4` | **Invalid for accessibility:** captures the Android System UI ANR dialog, not the app. Retained to prevent accidental use. |
| Victory · Skia | `android-emulator/victory/normal/direct-launch-framestats.txt` | `fdd15eed746367f9ade7b591ece501fae742a59f357a6ef68c58695bf06b571e` | One post-launch frame-history dump. Not a protocol measurement. |
| Victory · Skia | `android-emulator/victory/normal/direct-launch-meminfo.txt` | `e4a5480583294024fa68590d60b9136e52fb78175844e323efaed95cc46893c5` | One post-launch memory snapshot. Not a leak test. |

Argent's clean live Android inspection subsequently showed Victory's same
summary and 20 labelled interval nodes, but no raw clean tree was retained;
therefore the Victory accessibility rows remain pending in `PARITY.md`.

## Missing decision evidence

- The randomized seven-repetition matrix for each significant variant and
  normal/dense/ceiling load has not been captured.
- The observed-heavy anonymised QA response has not been supplied.
- A physical mid-range Redmi Note 12 is now available and has a bounded
  catalogue correction pass below, but not the randomized interaction matrix.
  A modern Android, real iPhone and physical tablet remain unavailable. The
  iPad mini simulator evidence is layout support only.
- VoiceOver and spoken TalkBack behavior have not been recorded and are
  explicitly deferred from this renderer decision by product scope.

No score or renderer recommendation may be derived from this manifest alone.

## Corrected iOS axis and Victory interaction evidence

These artefacts were captured after the shared axis correction and the
Victory cumulative-pinch correction. The Victory drift images are deliberately
retained: they prove the defect existed and prevent the later fixed images from
being mistaken for the first attempt. Source is the changes committed with
this manifest on top of `4ed06cf`.

| Finalist | Artefact | Bytes | SHA-256 | What it proves / limitation |
|---|---|---:|---|---|
| ECharts · Skia | `corrected/echarts-skia/ios/ios-simulator-release.zip` | 27,877,494 | `f19d04f2189862a72f9da96ee7ad912cb65311684788722e9cdaff9327c26e11` | Corrected isolated iOS Simulator Release build. Not physical-device evidence. |
| ECharts · Skia | `corrected/echarts-skia/ios/normal-100-percent.png` | 662,656 | `ba47f2c3a071bc46c0ec46b6213ea732b961e79470d6bbaeee8fabd85fc2f8a1` | Both required `12 AM` endpoints are visible at full day. |
| ECharts · Skia | `corrected/echarts-skia/ios/normal-max-zoom.png` | 620,142 | `9504cad9c9600252f6137efcd9f9b3a2770cfa8feccf06ededeca6fabec40b0a` | Readable regenerated labels at the zoom floor; no interaction recording yet. |
| Victory · Skia | `corrected/victory/ios/ios-simulator-release.zip` | 27,109,143 | `5313125782d787b88abf720f75657ad0eec41b0478aaa26bffe869adeb306882` | First corrected-axis build; it still contains the cumulative-pinch defect. Retained as failed evidence. |
| Victory · Skia | `corrected/victory/ios/normal-100-percent.png` | 656,068 | `4a79a7da894e116cb49803056b3c603fd1d16474266d4140cbaafc094d7302e7` | Both required `12 AM` endpoints are visible at full day. |
| Victory · Skia | `corrected/victory/ios/normal-one-pinch.png` | 610,144 | `ba7b62ae9e5924dedf190625a0d76399127fe1f9a1845731d062481da487f4a8` | The first centred pinch behaved correctly before the cumulative defect appeared. |
| Victory · Skia | `corrected/victory/ios/normal-max-zoom-relayout-drift.png` | 608,510 | `80ebc27cced082ed8f532f1bc01201f69b4494ff1e8bee383c5640b08cb3edb8` | Failed relayout evidence: repeated pinch drifted to the end of day. |
| Victory · Skia | `corrected/victory/ios/normal-max-zoom-matrix-drift.png` | 596,473 | `eddd9a077ccc5563faff88088559a321eac9da8fab08afc9a60a01b8ba76afe6` | Failed matrix evidence: same repeated-pinch drift. |
| Victory · Skia | `corrected/victory/ios/ios-simulator-release-interaction-fix.zip` | 27,110,728 | `026d33e4b19b774369640e26d021d8d7d033873df82de95bd89d754268a321f7` | Fresh isolated Release containing the custom cumulative gesture correction. |
| Victory · Skia | `corrected/victory/ios/normal-max-zoom-relayout-fixed.png` | 607,587 | `a1a6a7d1de9f462fe94432c80a1096e7f0a625bfef81e8d4bed2a86baa005aa2` | Relayout stays around the repeated gesture centre at maximum zoom. |
| Victory · Skia | `corrected/victory/ios/normal-max-zoom-matrix-fixed.png` | 609,822 | `4888effddae2d4df2b1f513a6c88251e4f0371a62eb81ae73f6d51fe0e4c7f3c` | Matrix stays around the repeated gesture centre at maximum zoom. |
| Victory · Skia | `corrected/victory/ios/normal-repeated-pinch-relayout-fixed.mov` | 2,941,497 | `f766f13ae3bdaf810e6aab7ec545d2c4e5d6d3037465d695e8157afb562e937a` | Four repeated centred pinches remain centred and clamp for relayout. Simulator only. |
| Victory · Skia | `corrected/victory/ios/normal-repeated-pinch-matrix-fixed.mov` | 3,184,908 | `910fce003a433b65602b17353e93647ad5f839d19471d2967e3262304bbf1989` | Same four-pinch proof for matrix. Simulator only. |

### Overshoot correction and cross-platform proof

The four-pinch iOS sequence above did not strongly overshoot the zoom floor.
Android did, and exposed two additional adapter errors. The two drift captures
below are failed evidence, not finalist results. The final proof uses ten
aggressive fixed-focal pinches, enough to cross the 10% floor repeatedly.

| Platform | Artefact | Bytes | SHA-256 | What it proves / limitation |
|---|---|---:|---|---|
| Android | `corrected/victory/android/android-release-interaction-fix.apk` | 124,554,175 | `a5eaa44bbf8a3adaf42a68be84a3d4de6654c2b03b0d048a2f77063caaac6ab2` | First cumulative-pinch build; lacks overshoot rebasing. Retained as failed build evidence. |
| Android | `corrected/victory/android/normal-max-zoom-relayout-overshoot-drift.png` | 444,093 | `99d37ef1f4812ee9a07888850506263f82e304c02b0940a02fbb1f94508b1176` | Failed attempt 1: raw overshoot translation snapped the reduced scale to the end of day. |
| Android | `corrected/victory/android/normal-max-zoom-relayout-origin-begin-drift.png` | 445,778 | `7ac9fe5edf1a29885a3e5fbb2569bb09b9847d7d899fc5a637107fa5358ed235` | Failed attempt 2: `onBegin` focal was not reliable on Android. |
| Android | `corrected/victory/android/normal-max-zoom-relayout-origin-begin-drift.mp4` | 737,146 | `792ae978f664593c7a81de87853902334f02c9a2dc995d31d4798c68db736a8e` | Recording of failed attempt 2. |
| Android | `corrected/victory/android/android-release-overshoot-fix.apk` | 124,554,495 | `84c7c07d31389169ad14502d622bb36e2625a024be8b39eb881552bfe54d908a` | Final isolated Android Release build with active-focal overshoot rebasing. Emulator only. |
| Android | `corrected/victory/android/normal-100-percent.png` | 485,267 | `afc3b51902fd5e1e5c35ac7c33d6447271ba87da338b4f4460b8445e4080c120` | Correct full-day axis with both `12 AM` endpoints. Captured before the JS-only overshoot correction. |
| Android | `corrected/victory/android/normal-max-zoom-relayout-fixed.png` | 445,799 | `1c8b50000b146b0f9a579749ea49df9591fca1aa25d7b63ecf5b08c96e32062f` | Final relayout remains under the fixed focal at the 10% floor. |
| Android | `corrected/victory/android/normal-max-zoom-relayout-fixed.mp4` | 615,272 | `470d40380a911fcb82ba25fe95c1b9a5078cedeaf32e30418f5d7080e5a6fef5` | Ten-pinch relayout proof. Emulator only. |
| Android | `corrected/victory/android/normal-max-zoom-matrix-fixed.png` | 448,658 | `367243e2837fa6b0e79be96708ee173d60cabb35687943a2a7e36df691444f6d` | Final matrix remains under the fixed focal at the 10% floor. |
| Android | `corrected/victory/android/normal-max-zoom-matrix-fixed.mp4` | 758,015 | `4c33b8fe5f822eb3e3eca8f487f6f3e6ca3ac0dc260f01c316e3ac97b25fa988` | Ten-pinch matrix proof. Emulator only. |
| Android | `corrected/victory/android/accessibility-tree.xml` | 41,420 | `fb7ba5c4eadf0e8130ee7b67c6157b7a2cfe99908773d32deeca18dc12f2df87` | Clean app tree with summary and bounded interval semantics. Spoken testing is deferred. |
| iOS | `corrected/victory/ios/ios-simulator-release-overshoot-fix.zip` | 27,110,930 | `7a53a2b0aa3c521fac9f5297a6f079e7cc7f539b259525fcdcef9a6d07ae80ab` | Final isolated iOS Simulator Release from the same source. |
| iOS | `corrected/victory/ios/normal-max-zoom-relayout-overshoot-fixed.png` | 598,135 | `fb03ff196348a8e20a9b6b471a930f574781adc9498dc84a05f6881b1ed5a696` | Final relayout at the 10% floor after ten aggressive pinches. |
| iOS | `corrected/victory/ios/normal-max-zoom-relayout-overshoot-fixed.mov` | 6,148,732 | `f1efbbdeb06139ec35364e4e657643c853b80324f1f8ce1105e8d02a15837935` | Ten-pinch relayout proof. Simulator only. |
| iOS | `corrected/victory/ios/normal-max-zoom-matrix-overshoot-fixed.png` | 599,577 | `476d24f7b15ecafb4931909bd6cc008d2727fcb3a844cea8ebda7fe70ece8992` | Final matrix at the 10% floor. |
| iOS | `corrected/victory/ios/normal-max-zoom-matrix-overshoot-fixed.mov` | 6,190,975 | `8c6c1fcecae50e10b50b59de6e16f980d3ae51bdd40cf6029fd64cf1b335ce43` | Ten-pinch matrix proof. Simulator only. |

## Corrected ECharts Android axis and behavior evidence

These artefacts come from isolated ECharts Android Release builds after the
shared endpoint correction. Four Release readbacks rejected inaccurate or
incomplete axis strategies before the accepted zoom-aware interval build.
Every failed APK and screenshot remains indexed deliberately. Only
`android-release-final-zoom-aware-axis.apk` may be used for subsequent runs.

| Artefact | Bytes | SHA-256 | What it proves / limitation |
|---|---:|---|---|
| `corrected/echarts-skia/android/android-release-pre-axis.apk` | 125,652,807 | `e84324287ca33dfbe47a786024f8d66ca517ed57772f752172ce6938f8aff4d8` | Failed-label Release retained for provenance; do not measure. |
| `corrected/echarts-skia/android/normal-max-zoom-rounded-label-defect.png` | 451,112 | `2d91c19608af4fa2d1a8b1a0a497115d65694903d4a6cc81a18aa0cb96208306` | Failed evidence: fractional ticks were rounded into duplicate false-hour labels. |
| `corrected/echarts-skia/android/android-release-failed-wide-span-overlap.apk` | 125,652,827 | `9408cc8e795c9eecbe7dca72809123332b693b5dfa5523fd42f782e8029f3abc` | Failed build: truthful close-zoom labels but no wide-span density control. Do not measure. |
| `corrected/echarts-skia/android/daylight-saving-all-hour-label-overlap-defect.png` | 575,328 | `46a4a17dadc82b964f0f7a2792d8030dabae1ee03026240a184723389f799704` | Failed evidence: all 25 hourly labels overlap at full day. |
| `corrected/echarts-skia/android/android-release-failed-intermediate-labels.apk` | 125,653,767 | `3c0598e9fc5633e7dabfbc11ac87d5cd3708a375b9df43e0080078d03093fe27` | Failed build: selected whole-hour labels disappear when ECharts offsets ticks after dataZoom. Do not measure. |
| `corrected/echarts-skia/android/intermediate-zoom-all-labels-missing-defect.png` | 278,694 | `af93f8c5d2b51c0659318917399dc7b62f8436b307211b58a3691799dc4a1840` | Failed evidence: the chart zoomed, but the intermediate view has no x-axis labels. |
| `corrected/echarts-skia/android/native-hide-overlap-endpoints-missing-defect.png` | 255,543 | `e926f6377edcc8ec1a55607f3d475f66d4fe448085b140086943f3f29b257119` | Failed native-overlap attempt: a readable full day that omits both required midnight endpoints. |
| `corrected/echarts-skia/android/android-release-final-zoom-aware-axis.apk` | 125,653,103 | `79c8d2fb4b9be57add0d7b452a7ab933b92bc9249b0b010f1bf57003d1effac3` | Accepted isolated Android Release: zoom-aware tick interval and truthful formatter. Emulator only. |
| `corrected/echarts-skia/android/normal-full-day-final-zoom-aware.png` | 255,498 | `ac1b7d3639b2a27cce102ebd8256649b441352cf78e7e9d5fdb6e3e65db2fb3f` | Accepted build: readable full day with both midnight endpoints. |
| `corrected/echarts-skia/android/normal-intermediate-zoom-final.png` | 259,348 | `e790c449657cedeb4864878147668e5aecc27cd1a3124efadde9279fe67dc81e` | Accepted build: readable truthful labels at intermediate zoom. |
| `corrected/echarts-skia/android/normal-max-zoom-final-zoom-aware.png` | 240,473 | `e2ead8a29047c9220eb3c5254f1856caa7c209dce5ce7eeb982934f56efd97dd` | Accepted build: truthful labels at the 10% floor. |
| `corrected/echarts-skia/android/normal-max-zoom-pan-final.png` | 234,697 | `aaa7236676767a58eed06e4d2729d5b246416e07444bc7461db066374360f1f8` | Accepted build: truthful labels remain after horizontal pan. |
| `corrected/echarts-skia/android/normal-tooltip.png` | 128,739 | `2fee577096195deefbe74ba4dedec98b2e0892dca2fd2e3fcc17615914be6610` | Exact legacy date/time/count tooltip text. |
| `corrected/echarts-skia/android/tooltip-two-second-dismiss.mp4` | 236,723 | `827fc81229eb4b233e78e5dcbc12600d9713bccb9320ea40fad51459e97aec90` | Tooltip appears on item tap and dismisses after the configured two seconds. |
| `corrected/echarts-skia/android/state-transitions.mp4` | 639,976 | `b07bf51742ffa69d2d2940dd3ce4d9214edb9206d8534d41d60875908b5889b3` | Normal → no-data → loading → error → normal clears stale chart content. |
| `corrected/echarts-skia/android/quiet-week.png` | 481,232 | `5542c973c6463a80389b973191a75749bf696edfddb1222956fd615239569f28` | Valid all-zero response keeps seven rows and legend rather than showing no-data. |
| `corrected/echarts-skia/android/overnight-right-edge-tooltip.png` | 131,690 | `ee04617f51471848f187cc8085cb4d52170973cb2796f26fd360dd71ae571def` | Aug 13 interval is selectable through 12:00 AM. |
| `corrected/echarts-skia/android/overnight-left-edge-tooltip.png` | 129,716 | `60e570989e2688b53c7a1707f465a946baf98178636adf228c173f4b2d87aae2` | Aug 14 continuation begins at 12:00 AM and ends at 12:40 AM. |
| `corrected/echarts-skia/android/daylight-saving-spring-forward-final-zoom-aware.png` | 285,784 | `0ed6778eb52f8ea093633588c203c91738bf7c4f83e43286cdbafd2bc0b2fa7b` | Accepted build keeps spring-forward rows aligned with readable labels. |
| `corrected/echarts-skia/android/daylight-saving-fall-back-final-zoom-aware.png` | 298,879 | `70402a4389d0747eef49276143e2efac94eaa62284d81fe4a156a312e2e6cfdd` | Accepted build retains the fall-back data; repeated-hour wording remains a product decision. |
| `corrected/echarts-skia/android/parent-scroll-pinch-pan-final.png` | 252,646 | `b5fe1e4426aaae1583d7b2550da3854077cdb4ce4d428f6154d883919b496ee0` | Live pinch and pan changed the chart while inside the parent ScrollView. Still evidence is weaker than the required recording. |
| `corrected/echarts-skia/android/lifecycle-background-final.png` | 204,845 | `1e0e8e1122dc9e9a1851fb4e95e5c477e84621338ff1118a20796078c75af716` | Chart component visibly unmounted in harness lifecycle state. No memory claim. |
| `corrected/echarts-skia/android/lifecycle-foreground-remount-final.png` | 256,115 | `5f2bbb3cca16d849a625478f34a3b469ba6a37f8a4fbf47102395bbeaae074d3` | Chart visibly remounted cleanly. Memory return remains unmeasured. |

The near-tap hint failed live verification: tapping empty row space within one
hour of a bar produced no “Zoom to click” message. It is not implemented in
either adapter, so the behavioral parity gate remains open.

## Corrected Victory Android behavioral evidence

These checks use `android-release-overshoot-fix.apk`. They establish behavioral
readback only; they are not cells in the randomized performance matrix.

| Artefact | Bytes | SHA-256 | What it proves / limitation |
|---|---:|---|---|
| `corrected/victory/android/normal-tooltip.png` | 127,248 | `35e0a536feb51dc2f2a602d88003ed37528f26b6b03f29b6fe1a3ce917690519` | Exact legacy tooltip text on a selected interval. |
| `corrected/victory/android/tooltip-two-second-dismiss.mp4` | 272,488 | `5f14c13a3d41f476de54dcaf30733421d456995cf8676f412f8d8dcb01d79252` | Tooltip dismisses after the configured two seconds. |
| `corrected/victory/android/state-transitions.mp4` | 617,289 | `4062877085b8abf731373fecb632cdfd504d767e77aea1e3ae3da5f6d0f6c6cb` | Normal, no-data, loading and error states replace stale chart content. |
| `corrected/victory/android/quiet-week.png` | 471,418 | `38d522359b97a567448704bb7355f15e859b425c8ea2180b128141b158ea0cbb` | Valid all-zero response keeps seven rows and legend. |
| `corrected/victory/android/overnight-right-edge-tooltip.png` | 527,699 | `b8067eb5aa9f284dc3a6eb904c0633e519ae64fb7387cb903487a9b7e96fe6bc` | Right midnight half remains selectable. |
| `corrected/victory/android/overnight-left-edge-tooltip.png` | 130,159 | `5704e16c68f48062f9e9bcde099ab1d50225ff2086a65aa2148333fa9e50ed72` | Left midnight continuation remains selectable. |
| `corrected/victory/android/relayout-pan-boundaries.mp4` | 1,905,357 | `158067e1a95e928aad47c2cd7e8a5895c74a0a63bb72f8205c0b893a6563294a` | Relayout pan clamps at both day bounds. Emulator only. |
| `corrected/victory/android/matrix-pan-boundaries.mp4` | 2,094,000 | `07600a3e23c015d2ba2d6b6a1c8355367c423533b098dc6000eedcd1ed30aa61` | Matrix pan clamps at both day bounds. Emulator only. |
| `corrected/victory/android/parent-scroll-pinch-pan.mp4` | 767,147 | `3d33627774b9bc6168e6c0f6104e7f72887488a74e8fd865974921f5fd84156c` | Chart owns pinch and pan while nested in the parent ScrollView. |
| `corrected/victory/android/lifecycle-background-foreground.mp4` | 343,771 | `f4da83c48ea86de33e360a4f05c11e066f1fcd7752caa57e6c6f604999b86b68` | Visual unmount/remount transition succeeds. No memory-return claim. |
| `corrected/victory/android/daylight-saving-spring-forward.png` | 543,986 | `d24859c7c3fce94a57f2b4913e443edb9aa45ae417a8ff3b1533cd095248768b` | Spring-forward fixture retains aligned clock semantics. |
| `corrected/victory/android/daylight-saving-fall-back.png` | 571,071 | `ea1b14d3a484b21b787e6de22ce6e663ba61168d7b075ac5971f8882fca3f63b` | Fall-back data is retained; repeated-hour bars overlap and the product decision remains open. |

## Physical Redmi Note 12 catalogue correction pass — 2026-08-17

Device: Redmi Note 12 (`23021RAAEG`), Android 15 / API 35, arm64,
1080 × 2400, approximately 8 GB RAM. These are bounded physical smoke checks,
not the randomized seven-repetition performance matrix.

The first Victory 20,000-point attempt froze the harness visually on the prior
mixed chart. Before force-stop, Android reported approximately 2,017 MB PSS and
2,159 MB RSS. The retained screen, logcat and gfx dumps are under
`physical-redmi-note-12/catalogue/victory-skia/freeze/`. Inspection traced the
growth to the Horcery adapter: it gave `CartesianChart` one `yKey` for each of
934 independently sampled segments across roughly 20,000 timestamps, creating
an effectively multiplicative table. This is an adapter failure discovered by
the spike, not evidence that the Victory library alone cannot render the case.

The bounded correction keeps an O(n) scale table (`x`, `domainValue`) and draws
the exact independently timestamped, gap-preserving segments as Skia paths
through Victory's supplied scales and clipping. Pure tests pin independent
timestamps, real gaps and linear table shape. The corrected domain preparation
handled 20,000 input points as 19,070 scale rows and 934 segments in 9.57 ms
with approximately 5 MB heap growth on the development machine.

| Artefact | Bytes | SHA-256 | What it proves / limitation |
|---|---:|---|---|
| `physical-redmi-note-12/catalogue/victory-skia/victory-catalogue-arm64-release-linear-memory.apk` | 42,673,616 | `bfe3f4312bac42b75da5e959387bcbf57dd74a4ce96bccef7f53aec15783d10d` | Isolated arm64 Release containing the linear-memory adapter correction. Identity was checked as the Victory package. |
| `physical-redmi-note-12/catalogue/victory-skia/linear-memory-20k/screen.png` | 135,177 | `f1f0777433508fd3bd18edf2daa5ca180f47f66f158cc49fd2a711083bca68f9` | Corrected chart remains responsive and reports all 20,000 items. At overview scale sub-pixel gaps cannot be judged visually; gap semantics are covered by pure tests. |
| `physical-redmi-note-12/catalogue/victory-skia/linear-memory-recovery/screen.png` | 175,154 | `4aa44d779e3c09b6049715651997eae3ecd41fe5213c27b252351384c0d770eb` | App returned interactively to the 144-point case and reported a 24 ms Victory layout signal. The signal is diagnostic only. |
| `physical-redmi-note-12/catalogue/victory-skia/compact-summary.png` | 158,596 | `7a91e22fabd2ce20a791c4a43f38cf84628b904fa04790d97c5697e1a45c08bb` | Exact 68.2% value, matching radial proportion and unclipped label on the physical phone. |
| `physical-redmi-note-12/catalogue/victory-skia/compact-no-data.png` | 126,191 | `ae56112c1db783876c8d0faad354164d966e6882fcb88f82bb753ece6d3de4ef` | No-data is visibly distinct from 0%; no radial value remains. |
| `physical-redmi-note-12/catalogue/victory-skia/mixed-tooltip.png` | 169,959 | `a11b194729beb81efadb8c7f2e3f83f8d9d4271a6a9b9ef74affadab27222331` | April tap shows the exact joined Consumed, Remaining, Target and Refill values. |

Corrected 20k memory settled at approximately 220 MB PSS / 354 MB RSS over
ten samples in 20 seconds, roughly 1.8 GB less PSS than the failed adapter.
After returning to 144 points it settled near 221 MB PSS / 356 MB RSS. That is
about 29 MB above the fresh-launch baseline (193 MB PSS), so this pass does not
claim substantial memory return or absence of a leak. Native/graphics allocators
may retain reusable high-water storage; repeated 20k → 144 cycles in the frozen
protocol must determine whether the retained plateau grows.

The Victory physical tooltip passed. The equivalent ECharts physical catalogue
tap did not display a tooltip after a bounded switch to the documented rich-text
renderer, so ECharts records an interaction failure and maintenance risk for
this harness. Neither fact is yet an overall renderer recommendation.
