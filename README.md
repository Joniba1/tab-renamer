# Tab Renamer

A Chrome extension (Manifest V3) that persistently renames browser tabs by **exact URL**.
Custom titles survive reloads, closing and reopening a tab (`Ctrl+Shift+T`), session restore and full
browser restarts. They also hold up against single-page apps that keep rewriting `document.title`.

Built with [WXT](https://wxt.dev) and TypeScript. It has no runtime dependencies.

## Install (unpacked)

```sh
npm install
npm run build          # → .output/chrome-mv3
```

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select `.output/chrome-mv3`.
3. *(Optional)* To rename local `file://` pages, open the extension's **Details** and turn on **Allow access to file URLs**.

Chrome 127 or newer is required.

## Usage

There are three ways to rename a tab. Chrome doesn't let extensions add items to the tab strip's own
right-click menu, so none of them live there.

| Entry point | How |
|---|---|
| Toolbar popup | Click the extension icon. Edit the title and press **Enter** to save, or click **Reset to original**. |
| Keyboard | `Ctrl+Shift+E` (**Rename the current tab**) opens the popup with the title selected: type the new name and press **Enter** to save, or **Esc** to cancel. **Reset tab title** has no default key; you can assign one. Change both at `chrome://extensions/shortcuts`. |
| Page context menu | Right-click the page and choose **Rename this tab…** or **Reset tab title**. |

Saving an empty title resets the tab. **Options → Manage all renames** lists every rename. From there
you can **add a rename** without visiting the page (an exact URL, or a prefix pattern such as
`github.com/user/repo/*`), search, remove single entries, **Clear all**, and **Export/Import JSON** for
backups. In the add form, a URL without a scheme is treated as `https://`.

### How matching works

A rename belongs to a URL, not to a tab. When a tab navigates somewhere else, that page shows its own
title, or its own rename if it has one. In the popup, under **Apply to**, choose one of two kinds of rename:

**This page only (exact).** The key is the URL with the `#fragment` removed:
- the scheme and host are case-normalized and default ports are dropped;
- the path and query string are kept **exactly**;
- `?a=1` and `?a=2` are different pages, and so are `/docs` and `/docs/`;
- `#top` and `#bottom` share a title.

**All pages under a prefix.** A pattern like `github.com/joniba1/repo1/*` matches:
- `…/repo1` itself;
- everything below it (`…/repo1/pulls/5?tab=files`);
- over both http and https.

It matches on whole path segments, so `…/repo1-other` is **not** included. `*` is only allowed at the
end. `github.com/*` covers a whole site; `www.github.com` and `github.com` are different hosts.
Prefix rules apply to http(s) pages only.

When several renames match, the **exact** one wins; otherwise the **longest** prefix wins. A broad
`github.com/*` can therefore coexist with a specific `github.com/joniba1/repo1/*` and with exact renames
of single pages. Resetting a tab removes whichever rename was in effect, which may reveal the next one.

Renames apply at once to every open tab they match. They also follow in-app navigation
(`pushState`/back/forward): the title changes when the app moves to a URL with a different rename,
or with none.

The lookup stays a single storage read, however many rules exist. For `github.com/a/b`, the content
script computes every candidate key itself (`t:<exact url>`, `p:github.com/a/b`, `p:github.com/a`,
`p:github.com`) and fetches them together.

## How it works

| File | Role |
|---|---|
| [`lib/core.ts`](lib/core.ts) | URL normalization, restricted-page detection, shared constants. Has no dependencies, because it is bundled into the document_start script. |
| [`lib/mappings.ts`](lib/mappings.ts) | `chrome.storage.local` CRUD and import/export. One key per rename: `"t:<url>" → { url, title, updatedAt }` for exact renames, `"p:<host/path>" → { prefix, title, updatedAt }` for prefix rules. |
| [`entrypoints/title-guard.content.ts`](entrypoints/title-guard.content.ts) | ISOLATED world, `document_start`. Issues the storage lookup first, then takes ownership of the title (details below). |
| [`entrypoints/title-main.content.ts`](entrypoints/title-main.content.ts) | MAIN world, `document_start`. Wraps the `document.title` setter. While locked, page writes are dropped and the last one is remembered, then replayed on reset so the page's current native title comes back. |
| [`entrypoints/background.ts`](entrypoints/background.ts) | Context menus, the reset shortcut, SPA URL-change fallback, and injecting into tabs that were open before install or update. |
| [`entrypoints/popup`](entrypoints/popup), [`entrypoints/options`](entrypoints/options) | The UI. |

How `title-guard.content.ts` owns the title:
- It inserts its own `<title data-tab-renamer>` as the **first** `<title>` in the document. `document.title` and Chrome's tab strip both read the first one, so the site's `<title>` has no effect.
- A `MutationObserver` repairs any removal, edit, or competing `<title>` inserted in front of ours. Its callbacks run before paint.
- A sequence counter discards stale async lookups, which avoids races with storage changes and SPA navigation.

Nothing is keyed by `tabId`. Every page load simply looks up its own URL.

### Restricted pages

Chrome doesn't run extension scripts on:
- browser pages (`chrome://`, `about:`, `edge://`, `view-source:`, …);
- other extensions;
- the Chrome Web Store;
- `file://` pages, unless file access is enabled.

On those pages the popup, whether opened by click or by the rename shortcut, explains why renaming
isn't available. The context menu doesn't appear, and the reset shortcut does nothing. Before saving, the popup checks that the page is reachable, so it never stores
a rename that couldn't be shown (for example, Chrome's PDF viewer).

## Development

```sh
npm run dev          # launches Chrome with the extension and reloads on change
npm run typecheck
npm run zip          # .output/tab-renamer-<version>-chrome.zip
node scripts/generate-icons.ts   # regenerate public/icon/*.png
```

The automated tests (Vitest unit tests and Playwright end-to-end tests) live on the local `tests` branch.

## Known limitations

- **Exact URLs can be fragile.** Sites that add changing query parameters (`utm_*`, timestamps, session
  ids) produce a new URL, so an exact rename won't match. Use a prefix rule for such pages.
- **Prefix paths are case-sensitive**, as URL paths are. On sites that treat paths case-insensitively,
  such as GitHub, `…/Repo1` and `…/repo1` need separate rules.
- **Flicker is sub-frame, not literally zero.** MV3 has no synchronous storage, and the browser parses
  the site's `<title>` before the lookup returns. Measured locally:
  - the native title exists in the DOM for about 2–9 ms;
  - that is less than one 60 Hz frame, and painted-frame sampling only ever sees the custom title;
  - under heavy load, such as restoring many tabs at startup, the gap could be longer.

  Closing it completely would need a synchronous data source. The candidates are a per-site
  `localStorage` cache, which the site itself could read, or the `userScripts` API, which needs a user
  toggle and is restricted by Web Store policy.
- **The bridge events can be spoofed by the page.** The ISOLATED and MAIN scripts talk through
  `CustomEvent`s that the page can also dispatch. The worst a page can do this way is change its own title,
  which it can already do.
- Only the top-level document is handled. Iframes don't affect the tab title.

## Privacy

Renamed URLs and titles are stored only in `chrome.storage.local` on this computer. Nothing is synced,
collected or transmitted. Note that query strings sometimes contain tokens: they are stored as-is,
locally.

## Chrome Web Store checklist (for later)

Things that must not be forgotten when publishing:

- [ ] **Developer account**: one-time US$5 registration at the Chrome Web Store Developer Dashboard.
- [ ] **Version**: bump `version` in `package.json` (WXT copies it into the manifest), then run `npm run zip`.
      Every upload needs a higher version.
- [ ] **Single purpose** statement, for example "Lets users give browser tabs custom, persistent titles".
- [ ] **Permission justifications**, entered in the dashboard:
  - `storage`: saves the user's custom titles locally.
  - `contextMenus`: the "Rename this tab…" and "Reset tab title" page menu items.
  - `scripting`: injects the title script into tabs that were open before install or update, and runs the prompt fallback.
  - **Host permission `<all_urls>`**: this triggers the *"Read and change all your data on all
    websites"* warning and an **in-depth review**, which is slower. The justification: the title must
    be applied at `document_start` on any page the user chooses, before the site's own title shows.
    That requires statically declared content scripts. Optional or runtime host permissions would bring
    back flicker and break restores after a restart.
- [ ] **Data-use disclosure** (Privacy tab): the extension handles **web history** (URLs of renamed pages).
      State that the data is stored locally only, not sold or transferred, and not used for unrelated purposes.
- [ ] **Privacy policy URL** is required because URLs are handled. A short hosted page saying the above is enough.
- [ ] **No remote code**: the extension is already compliant, since everything is bundled.
- [ ] **Store assets**: a 128×128 icon (`public/icon/128.png`), at least one 1280×800 (or 640×400)
      screenshot, and a 440×280 small promo tile. Also a description, a category (Productivity) and a language.
- [ ] **Don't add the `userScripts` permission** for flicker reduction. Store policy reserves it for
      user-script managers.
- [ ] Test the zipped build on a **clean Chrome profile**, including:
  - tabs that were already open at install time;
  - `chrome://` pages;
  - the Web Store itself;
  - `file://` with file access both on and off.
- [ ] Check that `minimum_chrome_version` (127) still matches the APIs in use.
- [ ] *(Optional)* Set up `wxt submit` for automated uploads (it needs Web Store API credentials).
