# Privacy Policy — CyKit Extension

_Last updated: 2026-08-13_

**CyKit does not collect, transmit, or sell any data.** It has no analytics, no
telemetry, no accounts, and no server of its own.

## What the extension can access

CyKit runs only on the sites listed in its manifest:

- `*.cybozu.com`, `*.kintone.com`, `*.cybozu.cn`, `*.kintone.cn`,
  `*.cybozu-dev.com`
- `github.com`

It does not run anywhere else, and it does not request access to all websites.

## What it does with that access

**Font feature.** Reads the computed font size and weight of elements on
kintone and Garoon pages in order to rescale them, and injects a stylesheet.
This happens entirely in the page; nothing is read for any other purpose and
nothing leaves your browser.

**GitHub feature.** On a pull request or issue page, reads the page title and
URL so that it can place them on your clipboard. This happens **only when you
click the Copy button**, and the text goes only to your clipboard.

## What is stored

Your feature settings — chosen font, size, weight, and which products each
feature applies to — are stored with `chrome.storage.sync`. That is Chrome's
own settings storage. If you have Chrome Sync enabled, Chrome synchronises it
through your Google Account so your settings follow you between devices; this
is done by Chrome, not by CyKit, and the authors never receive it. No page
content, browsing history, or personal data is stored.

You can erase everything by removing the extension.

## Network

The extension makes no network requests. Fonts are bundled inside the extension
package and loaded from `chrome-extension://` URLs, so no request is made to
Google Fonts or any other host while you browse.

## Permissions

| Permission | Why |
| --- | --- |
| `storage` | Save your feature settings |
| Host access to the Cybozu domains | Apply the font changes to those pages |
| Host access to `github.com` | Add the Copy button to pull request and issue pages |

## Third-party content

The bundled fonts are redistributed under the SIL Open Font License 1.1. Their
licences ship with the extension in `fonts/licenses/`.

## Contact

Please open an issue on the project's repository.
