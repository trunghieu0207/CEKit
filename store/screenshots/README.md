# Store screenshots

1280×800 PNG, the size the Chrome Web Store expects.

`s1.html` and `s2.html` are the sources. They embed the real popup build and
the real GitHub button code, so re-rendering after a UI change keeps the
listing honest:

```sh
pnpm build
"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" --headless \
  --disable-gpu --allow-file-access-from-files --virtual-time-budget=6000 \
  --window-size=1280,800 --screenshot=01-font.png s1.html
```

The GitHub frame is a mock page header, not a capture of a real repository —
the Copy button in it is inserted by the extension's own code.
