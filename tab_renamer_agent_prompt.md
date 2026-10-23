# Agent Task Specification: Persistent Tab Renamer Chrome Extension

You are an expert browser extension developer. Your task is to design and implement a production-ready Chrome Extension (Manifest V3) that enables users to persistently rename browser tabs on an exact URL basis.

Below is the complete set of functional requirements, execution constraints, and technical edge cases you must resolve.

---

## Core Requirements & Persistence
1. **Exact URL Scope:** Custom tab titles must map strictly to specific URLs (including exact paths and query parameters) rather than triggering domain-wide replacements across an entire website.
2. **Session & Restoration Survival:** Custom titles must persist across page reloads, tab closures, restored browser sessions (e.g., `Ctrl+Shift+T`), and complete browser restarts. The extension must **not** rely on ephemeral runtime identifiers like `tabId`, which change whenever tabs are closed or reopened.
3. **Resetting Mappings:** Users must have a clean, instant mechanism to clear custom title mappings and restore the webpage's original, native title.

---

## Technical Edge Cases & Page Mechanics
4. **SPA & Client-Side Overrides:** Modern Single-Page Applications (SPAs) frequently overwrite `document.title` asynchronously during state updates, tab switching, or incoming notifications. The solution must block or override client-side attempts to replace user-defined custom titles.
5. **Zero-Flicker Injection:** Custom titles must take effect as early as possible in the document lifecycle. You must prevent visual flickering where the site's default title briefly renders before being replaced by the custom title.
6. **Restricted Browser Pages:** The extension must handle restricted Chrome pages gracefully (e.g., `chrome://`, `about:blank`, Chrome Web Store) where content scripts cannot execute and extensions lack permissions.
7. **Asynchronous Race Conditions:** Because Manifest V3 storage APIs (`chrome.storage.local`) operate asynchronously, title retrieval and locking logic must run without causing execution delays or race conditions during early DOM initialization.

---

## UX & Input Triggers
8. **Native Tab Bar Context Menu Constraints:** Chrome's extension API strictly forbids third-party extensions from injecting custom items into the native top tab bar right-click menu. You must provide alternative entry points for triggering tab renames, including:
   - A right-click context menu item inside the page content area.
   - An extension popup interface.
   - A configurable global keyboard shortcut.