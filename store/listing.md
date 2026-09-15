# Chrome Web Store listing — CEKit

Copy/paste source for the Developer Dashboard. Keep the single-purpose framing:
lead with the purpose, then the features that serve it. Do not open with a list
of the three sites — that reads as a multi-purpose extension.

---

## Name

```
Cybozu Extension Kit (CEKit)
```

## Short description (132 char limit — currently 130)

```
Read and share work items faster: a cleaner, larger font on kintone and Garoon, plus one-click copy of GitHub PR titles and links.
```

## Category

Workflow & Planning

---

## Detailed description

```
CEKit removes the small, everyday friction in reading and sharing work items
across the tools an engineering team uses all day.

Two things slow that down. Interface text that is too small or too thin to read
comfortably for hours. And re-typing a ticket title and link every time you
need to quote a pull request somewhere else.

CEKit fixes both.

READABLE TEXT ON KINTONE AND GAROON

• Nine bundled fonts, including Be Vietnam Pro for Vietnamese and Noto Sans
  for a look close to the original.
• Scale every text size proportionally, from 100% to 130%. Headings stay
  larger than body text — nothing is flattened to one size.
• Set a minimum size so small labels stop straining your eyes.
• Add weight for thin text, without turning already-bold headings into a
  smudge.
• Icons, images, and column widths are left exactly as they are. Only text
  changes.
• Choose per product whether it applies: kintone, Garoon, or neither.

ONE-CLICK COPY ON GITHUB

• Adds a Copy button to pull request and issue pages.
• Copies the title on one line and the canonical link on the next, ready to
  paste into a ticket, a report, or chat.
• The link is normalised, so copying from the Files or Commits tab still gives
  the plain pull request URL.

BUILT TO STAY OUT OF THE WAY

• No accounts, no analytics, no telemetry, no network requests at all.
• Fonts are bundled in the extension, so nothing is fetched while you browse.
• Runs only on the sites listed below — never on all websites.
• Every feature has its own on/off switch. Turn one off and the page goes
  straight back to normal.

CEKit is an independent, unofficial project. It is not affiliated with,
endorsed by, or sponsored by Cybozu, Inc. or GitHub, Inc. "Cybozu", "kintone",
and "Garoon" are trademarks of Cybozu, Inc.
```

---

## Single purpose statement

```
CEKit has one purpose: to reduce the friction of reading and quoting work items
in a team's daily engineering tools. The font feature serves the reading half
on kintone and Garoon; the copy button serves the quoting half on GitHub, by
producing the title and link that get pasted back into those same work items.
Both features are limited to a short, explicit list of hosts.
```

---

## Permission justifications

### `storage`

```
Stores the user's own settings: which font is selected, the text size and
weight steps, and which products each feature applies to. Nothing else is
stored, and the data never leaves the browser.
```

### Host access — `*.cybozu.com`, `*.kintone.com`, `*.cybozu.cn`, `*.kintone.cn`, `*.cybozu-dev.com`

```
These are the domains that serve kintone and Garoon. The extension injects a
stylesheet and rescales declared font sizes and weights on those pages. It
reads only computed font metrics in order to rescale them proportionally, and
sends nothing anywhere. A single host pattern cannot distinguish kintone from
Garoon because one host serves both, so the product is determined from the URL
path at runtime and the user can switch each one off.
```

### Host access — `github.com`

```
Adds a Copy button to pull request and issue pages. When the user clicks it,
the extension reads the page title and builds the canonical URL, then writes
both to the clipboard. It reads no other page content, runs on no other part
of GitHub, and makes no network requests.
```

### Remote code

```
None. All code and all fonts are bundled in the package. The extension makes no
network requests and does not use eval or any dynamic code execution.
```

---

## Privacy tab answers

| Question | Answer |
| --- | --- |
| Does this item collect or use personally identifiable information? | No |
| Health information? | No |
| Financial and payment information? | No |
| Authentication information? | No |
| Personal communications? | No |
| Location? | No |
| Web history? | No |
| User activity (clicks, mouse position, keystrokes)? | No |
| Website content (text, images, sound, files)? | No |
| Privacy policy URL | `https://github.com/trunghieu0207/CEKit/blob/main/PRIVACY.md` |

Then tick all three certifications: no selling to third parties, no use
unrelated to the single purpose, no use to determine creditworthiness.

---

## Before submitting

- [x] Privacy policy URL — the repository is public, so this is live:
      `https://github.com/trunghieu0207/CEKit/blob/main/PRIVACY.md`
      Keep the repository public for as long as the item is listed; if it goes
      private the URL 404s and the listing is taken down.
- [ ] Upload the screenshots in `store/screenshots/` (1280×800).
- [ ] Publish from a developer account that is allowed to use the Cybozu name.
      The listing's remaining risk is the name itself — "Cybozu" in the title
      reads as official regardless of the disclaimer in the description. The
      icon is an original mark and is not part of this.
- [ ] Bump `version` in `public/manifest.json` for every upload; the store
      rejects a re-used version.
