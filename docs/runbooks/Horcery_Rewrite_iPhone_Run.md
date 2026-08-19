# Running the Expo 57 rewrite on Inakshi's iPhone

Verified on 2026-08-19: the Expo 57 Horcery rewrite was built, installed and
launched successfully on Inakshi's physical iPhone. Inakshi confirmed that the
app works.

For a normal future session, do not rebuild the native app:

```bash
cd "/Users/inakshi/AI Projects/Horcery/horcery-app-rewrite"
npx expo start --dev-client --port 8082
```

Then open **Horcery Rewrite** on the iPhone. A native rebuild is only needed if
the installed app is removed, its signing profile expires, or native
dependencies change.
