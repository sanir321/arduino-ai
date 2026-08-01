<img src="https://content.arduino.cc/website/Arduino_logo_teal.svg" height="100" align="right" />

# Arduino AI IDE (Custom Edition)

[![License](https://img.shields.io/badge/license-AGPLv3-blue.svg)](LICENSE.txt)
[![Custom Build](https://img.shields.io/badge/build-custom--ai--edition-008184.svg)](https://github.com/sanir321/arduino-ai)

An AI-enhanced, modern Arduino IDE 2.x built on [Theia IDE](https://theia-ide.org/) and [Electron](https://www.electronjs.org/). This modified custom edition features a fully redesigned **Arduino AI Assistant** powered by Kilo AI and custom agent skills, offering natural language conversation, live sketch compilation, library management, board selection, and automatic error debugging.

---

## 🌟 Custom Modifications & Enhancements

This personalized edition includes the following custom features and UI/UX refinements:

### 🎨 Modern AI Chat UI/UX Card
- **Floating Input Card Container**: Rounded 20px pill-shaped card (`#1A1D23`) with a 1px subtle border (`rgba(255,255,255,0.08)`) and an Arduino teal accent glow (`#14B8A6`) on focus.
- **Minimal Arrow Icon Send Button**: Clean, minimal send icon button with `#14B8A6` teal accent, smooth hover scale transitions (`scale(1.15)`), active press feedback (`scale(0.92)`), and muted disabled states when the input is empty.
- **Synchronized Stop/Cancel Button**: Automatic progress tracking that instantly switches the send icon to an active red Stop button (`codicon-stop-circle`) during AI streaming or tool execution.
- **Sticky Positioning & Backdrop Blur**: Sticky bottom placement (`position: sticky; bottom: 0;`) with floating side margins (`calc(100% - 16px)`) and backdrop-blur styling (`backdrop-filter: blur(12px)`).
- **Quick Suggestion Pills**: Interactive example pills (`Blink LED`, `WiFi Scanner`, `Temp Sensor`, `Install Library`) for 1-click prompt execution.

### ⌨️ Global Capture-Phase Keybinding Interceptor
- **DOM Capture Listener**: Intercepts `Ctrl+Shift+I`, `Ctrl+Alt+I`, `Cmd+Shift+I`, and `Cmd+Alt+I` at the global window capture phase (`useCapture: true`), preventing Monaco text insertion and instantly toggling the 420px left sidebar AI Assistant panel.
- **Shortcut Unbinding**: Resolved shortcut conflicts by re-binding Library Manager to `Ctrl+Shift+L` and unbinding colliding Outline View shortcuts.

### 🧠 Agent & Custom Skill Integration
- **Claude Skills Support**: Registered and configured 250+ specialized tools and workflows via `.agents/skills.json` directly from the user environment.
- **CORS Bypass & Provider Fallback**: Native Node.js HTTPS request proxying in `KiloLanguageModelProvider` for robust streaming without browser CORS restrictions.

---

## 🛠️ Features

### AI Assistant
- **Natural language coding** -- Describe hardware intent and the AI writes complete sketches
- **Board management** -- "List my boards", "Select Arduino Uno", "Install SAMD boards"
- **Library management** -- "Find the WiFi library", "Install Servo", "Remove LiquidCrystal"
- **Sketch operations** -- "Create a new sketch", "Read current sketch", "Edit line 15"
- **Compile & Upload** -- "Verify sketch", "Upload to board"
- **Code editing** -- Precise insert, replace, and append edits via AI tool calls
- **Context-aware** -- Full awareness of selected board, serial ports (`COM3`, `COM4`), and active sketch

### Core IDE Features
- Sketch editor with syntax highlighting (`.ino` files)
- Board Manager -- browse, install, and select Arduino platforms
- Library Manager -- search, install, update, and remove libraries (`Ctrl+Shift+L`)
- Serial Monitor & Plotter -- real-time serial data communication and plotting
- Dark/Light theme support with curated dark mode palette

---

## ⌨️ Keybindings

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+I` / `Ctrl+Alt+I` | Toggle AI Assistant panel (Left Sidebar) |
| `Ctrl+Shift+L` | Open Library Manager |
| `Ctrl+Shift+B` | Open Boards Manager |
| `Ctrl+Shift+M` | Open Serial Monitor |
| `Ctrl+R` / `Ctrl+Shift+R` | Verify / Clean Verify |
| `Ctrl+U` / `Ctrl+Shift+U` | Upload / Upload Using Programmer |
| `Ctrl+N` | New Sketch |
| `Ctrl+O` | Open Sketch |
| `Ctrl+S` / `Ctrl+Shift+S` | Save / Save As |

---

## 🚀 Quick Start

### Latest Release

Ready-made installers are published on the [GitHub Releases](https://github.com/sanir321/arduino-ai/releases) page (`v2.3.11` and newer).

### Run in Dev Mode

```bash
# Install dependencies
yarn install

# Build extension TypeScript
yarn --cwd arduino-ide-extension build

# Build Electron app bundle
yarn --cwd electron-app build:dev

# Launch the IDE in dev mode
yarn start
```

If `yarn start` opens no window, launch the Electron dev target directly (reliable fallback):

```powershell
cd electron-app
..\node_modules\electron\dist\electron.exe . --enable-logging --remote-debugging-port=9222
```

> On Windows you can double-click the **`Arduino AI IDE (DEV).bat`** shortcut on your Desktop — it launches the same dev-mode Electron target in one click.

### Verify Toolchain (optional)

Dev mode needs the bundled Arduino CLI to be functional:

```bash
arduino-ide-extension\lib\node\resources\arduino-cli.exe version
arduino-ide-extension\lib\node\resources\arduino-cli.exe core list   # e.g. arduino:avr
arduino-ide-extension\lib\node\resources\arduino-cli.exe board list  # detects connected boards (COM3, COM4, ...)
```

---

## 📄 License

AGPL-3.0. See [LICENSE.txt](LICENSE.txt).
