# Change Log

All notable changes to the **Lottie Studio** VS Code extension will be documented in this file.

---

## [0.0.5] - 2025-07-20
### 🛠 Changed
- Refactored folder structure for cleaner packaging.
- Updated `.vscodeignore` to exclude `src/`, test files, configs, and keep only runtime assets.
- Improved content security policy (CSP) handling in webview HTML.

### 🐛 Fixed
- Extension not activating properly after install from Marketplace.
- Bug loading JSON from `.lottie` zip files.
- Fixed localResourceRoots and webview asset URIs.

### ➕ Added
- Better error handling and logging for debugging.
- Improved consistency between `.js` and `.ts` builds.

---

## [0.0.2] - 2025-07-21
### 📦 Added
- Extension icon, preview GIF, and screenshots for Marketplace.
- LICENSE.txt.

### 🛠 Improved
- Packaging and publishing workflow.

### 🐛 Fixed
- Minor code cleanup and deployment fixes.

---

## [0.0.1] - Initial Release
🎉 First release of **Lottie Studio**:
- View & preview `.lottie` and `.json` animations.
- Play / pause / restart controls.
- Loop toggle.
- Speed slider.
- Zoom in/out & fit.
- Background color & theme toggle.
- FPS counter.
- Scrub timeline & drag to seek.
- Export as `.json` and `.lottie` zip.
- Frame preview thumbnails on hover.
