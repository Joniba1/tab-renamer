# Tab Renamer

Give any browser tab a name of your own, and keep it.

**[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/ajkmcnoahifgjijpfjghaopbgbfkbijj)**

## Features

- **Rename any tab** from the toolbar or with `Ctrl+Shift+E`.
- **One page or a whole section:** a single page, or every page under a path like `github.com/your-org/your-repo/*`.
- **Names that stick** through reloads, restarts and sites that keep changing their title.
- **Manage all renames** in one place: add, search, remove, and back up or restore as JSON.
- **Private:** everything stays in your browser.

## How to use

Click the toolbar icon or press `Ctrl+Shift+E`, type a name and press **Enter**. To undo, click
**Reset to original** or save an empty name. **Manage all renames** in the popup lists every rename.
Shortcuts can be changed at `chrome://extensions/shortcuts`.

Under **Apply to**, choose:
- **This page only:** that exact address. Everything except the `#` part must match.
- **All pages under:** every page below a path, on whole path segments. If several renames match,
  the exact one wins, then the longest path.

Chrome doesn't let extensions rename its own pages (`chrome://`), the Chrome Web Store, or local files
unless **Allow access to file URLs** is on in the extension's details.

## Privacy

Renames are stored only in your browser. Nothing is synced, collected or sent anywhere. Chrome's
"read and change all your data" warning is because the title is applied as each page loads; the
extension only reads the page's address and changes its title. See the [privacy policy](PRIVACY.md).

## Support

[Open an issue](https://github.com/Joniba1/tab-renamer/issues) for bugs or ideas.

---

## Development

Built with [WXT](https://wxt.dev), TypeScript, SCSS and [Preact](https://preactjs.com). Chrome 127+.

```sh
npm install
npm run dev          # Chrome with the extension, reloading on change
npm run build        # → .output/chrome-mv3 (Load unpacked)
npm run typecheck
npm run format
```

| File | Role |
|---|---|
| [`lib/core.ts`](lib/core.ts) | URL normalization, restricted pages, shared constants. Dependency-free, as it's bundled into the content script. |
| [`lib/storage.ts`](lib/storage.ts) | Storage, import and export. Keys: `t:<url>` for exact renames, `p:<host/path>` for prefix rules. |
| [`entrypoints/title-guard.content.ts`](entrypoints/title-guard.content.ts) | Looks up the rename at `document_start` and owns the title: its own first `<title>`, guarded by a `MutationObserver`. |
| [`entrypoints/title-main.content.ts`](entrypoints/title-main.content.ts) | Blocks the page's `document.title` writes while a rename is active, and replays the last one on reset. |
| [`entrypoints/background.ts`](entrypoints/background.ts) | Shortcuts, SPA navigation fallback, injecting into tabs open before install. |
| [`entrypoints/popup`](entrypoints/popup), [`entrypoints/options`](entrypoints/options) | The popup and the manage page. |

**Releasing:** publishing a GitHub release builds that
version and submits it to the Chrome Web Store via
[`publish-extension.yml`](.github/workflows/publish-extension.yml). The tag is the version and must
be higher than the store's. Sign-in is
keyless (Workload Identity Federation, set up in [`infra/`](infra/)).

## License

[MIT](LICENSE)
