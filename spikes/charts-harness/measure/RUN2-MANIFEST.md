# Run 2 evidence manifest

Raw evidence is deliberately outside git under
`/Users/inakshi/AI Projects/Horcery/spike-evidence/run2/`. Every item below was
captured from the content now committed at `acbd0a7`; the native archives were
built immediately before that commit from an identical worktree. These are
build and smoke artefacts, **not** the seven-repetition decision matrix.

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
- The physical mid-range Android, modern Android, iPhone and tablet have not
  been supplied. The iPad mini simulator evidence is layout support only.
- VoiceOver and spoken TalkBack behavior have not been recorded.

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
