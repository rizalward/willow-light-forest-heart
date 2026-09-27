/** Shared src for the outer tile and the inner AppTile. Closed face, then open face. */
export const ICON_BODY = "/shell/icon-closed.jpg|/shell/icon-open.jpg";

export const STORM_ICON_BODY = "/shell/icon-open.jpg";

export const LAW_BODY = [
  "REQ-0  Folder is the app.",
  "Click starts the TypeScript host.",
  "Hash inventory walks inside, then parent, then magnet_roots.",
  "Complete unfolds. Missing magnetizes: copy, then re-hash.",
  "Still missing is PLAN only.",
  "Only the host runs. No execute-incoming. No mint. No integrated without you.",
  "",
  "REQ-1  One click, two faces, one window, .RZL everywhere.",
  "Outside: only the logo. Inside: that same logo is the primary control.",
  "MENU comes after unfold.",
  "Closed face is the clay orb. Open face is the stone mouth and one stormling.",
  "The package name is NAME.RZL. The OS does not run .RZL bytecode.",
  "Not Qwen. Not OpenCV.",
  "",
].join("\n");

export const CONTRACT_BODY =
  JSON.stringify(
    {
      entry: "host",
      runs: "host-only",
      executeIncoming: false,
      mint: false,
      faces: { closed: "clay-orb", open: "stone-mouth+stormling" },
      menu: "after-unfold",
    },
    null,
    2,
  ) + "\n";

export const README_BODY = [
  "YABAT.RZL",
  "",
  "User-facing package name on macOS, iOS, Android, Windows, and Linux.",
  "The operating system does not run .RZL bytecode.",
  "A TypeScript host wraps the folder (.app, TWA, or this shell).",
  "Only the host runs. No execute-incoming. No mint.",
  "",
  "icon.png is the only click. The outer tile and the inner AppTile share it.",
  "manifest.json is REQ-0 + REQ-1.",
  "",
  "Not Qwen. Not OpenCV.",
  "",
].join("\n");
