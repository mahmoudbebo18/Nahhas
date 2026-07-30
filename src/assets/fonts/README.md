# Fonts

Drop the licensed Arabic face here as:

```
src/assets/fonts/avenir-arabic-light.otf
```

`.otf` / `.ttf` / `.woff2` / `.woff` are all accepted. The file is **gitignored**
on purpose — it is licensed and must not be committed.

It is registered at runtime by [`src/lib/fonts.js`](../../lib/fonts.js), which
globs for it and only injects the `@font-face` when it is actually present. If
it is missing the app still builds and runs; Arabic text just falls back to
Tahoma / the system Arabic face.

Latin text always uses **Inter**, which comes from the `@fontsource/inter` npm
package and is bundled into the build — no network font request at runtime.
