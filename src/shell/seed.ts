import { CONTRACT_BODY, ICON_BODY, LAW_BODY, STORM_ICON_BODY } from "@/shell/bodies";
import { sha256 } from "@/shell/sha256";
import type { Fs, Manifest, Settings } from "@/shell/types";

export const defaultSettings: Settings = {
  title: "ヒロ",
  operator: "R",
  placeholder: "Message {{title}}",
  greeting:
    "Hi — I'm {{title}}. Offline shell ready. Try {{cmd:ping}}, {{cmd:help}}, {{cmd:adapt}}, {{cmd:evolve}}, or open {{cmd:menu}}.",
  hello: "Hey — I'm {{title}}. Tile click or {{cmd:open}} for shell. Commands: {{cmd:help}}.",
  custom: [],
};

export async function createSeed(): Promise<{ fs: Fs; settings: Settings }> {
  const [iconHash, lawHash, contractHash, stormHash] = await Promise.all([
    sha256(ICON_BODY),
    sha256(LAW_BODY),
    sha256(CONTRACT_BODY),
    sha256(STORM_ICON_BODY),
  ]);

  const yabat: Manifest = {
    name: "YABAT",
    ext: "RZL",
    title: "ヒロ",
    req: ["0", "1"],
    icon: "icon.png",
    entry: "host",
    faces: { closed: "clay-orb", open: "stone-mouth" },
    files: [
      { path: "icon.png", sha256: iconHash },
      { path: "LAW.txt", sha256: lawHash },
      { path: "shell.contract.json", sha256: contractHash },
    ],
    magnet_roots: ["magnet_roots/core"],
    toolbar: { label: "ヒロ" },
    refuses: ["execute-incoming", "mint", "qwen", "opencv"],
  };

  const storm: Manifest = {
    name: "STORM",
    ext: "RZL",
    title: "STORM",
    req: ["0", "1"],
    icon: "icon.png",
    entry: "host",
    faces: { closed: "clay-orb", open: "stone-mouth" },
    files: [
      { path: "icon.png", sha256: stormHash },
      { path: "mascot.kin.json", sha256: null },
    ],
    magnet_roots: ["magnet_roots/core"],
    toolbar: { label: "STORM" },
    refuses: ["execute-incoming", "mint"],
  };

  const fs: Fs = {
    "LAW.txt": LAW_BODY,
    "magnet_roots/core/shell.contract.json": CONTRACT_BODY,
    "YABAT.RZL/icon.png": ICON_BODY,
    "YABAT.RZL/manifest.json": `${JSON.stringify(yabat, null, 2)}\n`,
    "STORM.RZL/icon.png": STORM_ICON_BODY,
    "STORM.RZL/manifest.json": `${JSON.stringify(storm, null, 2)}\n`,
  };

  return { fs, settings: structuredClone(defaultSettings) };
}
