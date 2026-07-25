# NPC Portrait Switcher

> **Vibe coding disclaimer:** This fork was built with a lot of vibe coding.

A SillyTavern extension for narrator, DM, and multi-NPC chats. When a user-defined NPC keyword appears in the latest conversation messages, the extension displays that NPC's portrait beside the chat and can automatically select a matching expression.

## Fork-specific Features

- **Multiple NPCs in a scene:** Every NPC mentioned in the current scene gets an entry in the portrait tray. Select an NPC from the tray to make it the active portrait.
- **Expression overrides:** Add expressions to an NPC with their own keywords and images. When both the NPC and an expression keyword are detected, the first matching expression is shown. (I don't use expressions, so this feature just keeps the original's)
- **Per-character settings:** NPC entries are saved separately for each SillyTavern character. Your NPC list can therefore differ between chats or character setups instead of sharing one global list.
- **Automatic scanning:** After an assistant message is rendered, the latest user/assistant exchange is scanned automatically.
- **Manual scan button:** Use **Scan latest messages** in the extension settings, or use the **NPC Portraits** action in SillyTavern's Extensions menu wand, to rescan the latest user and assistant messages.
- **Desktop and mobile layouts:** Desktop uses a right-side portrait panel with an NPC avatar tray. Mobile uses a small floating portrait button so the portrait does not automatically cover the chat.
- **Draggable mobile button:** Drag the mobile button to a more convenient location. Its position is saved and restored across viewport changes and reloads.
- **Portrait modal:** On mobile, tap the floating button to open the portrait in a centered modal. Tap the backdrop or the close button to dismiss it. On desktop, the portrait opens in the right-side panel.
- **Zoom and pan:** Use the `−` and `+` controls, mouse-wheel zoom, or touch pinch zoom. Drag a zoomed portrait to pan it. Zoom ranges from 1× to 3× and resets when changing portraits.
- **Portrait navigation:** Use the previous/next controls to cycle through expressions for one NPC, or through the NPCs currently in the scene when multiple NPCs are active.
- **Keyword matching:** Matching is case-insensitive by default, uses whole-word boundaries, and supports multiple comma-separated keywords.

## Setup

1. Open the **Extensions** panel and find **NPC Portrait Switcher**.
2. Click **+ Add NPC** for each NPC you want to track.
3. Enter one or more comma-separated keywords, such as `Vexis, Vex, the drow`.
4. Optionally enter a display label.
5. Upload a default portrait. SillyTavern opens a crop dialog automatically; images are cropped to a 2:3 portrait ratio.
6. Expand **Expressions** and add expression keywords, labels, and images as needed.
7. Set **Mentions needed per message** if an NPC should only trigger after its keyword appears multiple times in one message.
8. Choose the scanning and scene behavior in the settings:
   - **Enabled** turns the extension on or off.
   - **Auto-close** removes NPCs after they stop matching. When disabled, the scene remains until a new match causes non-mentioned NPCs to be removed.
   - **Sticky replies** keeps an NPC in the scene for the selected number of messages after its last mention. `0` clears it immediately.
   - **Case-sensitive matching** changes keyword matching from the default case-insensitive behavior.

## How scanning works

- The forked extension scans latest user message and the latest assistant message automatically after they are rendered.
- A scan considers the the latest assistant message and the latest user message before it. If no preceding user message exists, it scans the latest assistant message alone.
- Each NPC entry is checked independently, so more than one NPC can be active in the same message.
- NPC keywords are checked first. Expression keywords are then checked within each matching NPC; expressions are evaluated in the order they appear in the settings, and the first match wins.
- The **Mentions needed per message** value counts whole-word occurrences of an NPC keyword in one message. Expression keywords only need one match.
- The active portrait follows the first NPC matched in the message unless you have manually selected an NPC from the tray. A manual selection stays pinned while that NPC remains in the scene.
- Changing chats clears the active scene and closes the portrait. The saved NPC entries for each character remain available when you return.

## Mobile use

On screens 768px wide or narrower, automatic scans update the active NPC without opening the large portrait automatically. This keeps the chat readable while still indicating that an NPC is active.

Tap the floating image button to open the current portrait. The button can be dragged, and its position is saved. Once the modal is open, its close, navigation, and zoom controls remain available without hover.

## Tips and notes

- Upload reasonably sized images. Portraits are stored as base64 data in SillyTavern's extension settings, so very large images can make the settings file unnecessarily large.
- Default portraits and expression images are cropped to a 2:3 ratio during upload.
- Expression order matters: if several expression keywords match, the first configured expression wins.
- The extension is designed around SillyTavern's current UI and may conflict with other extensions that position elements on the right side of the chat.
