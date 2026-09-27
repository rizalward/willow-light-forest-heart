import { inventoryPackage, readManifest, reportScript } from "@/shell/inventory";
import { renderTemplate } from "@/shell/template";
import type { Fs, Part, Report, Settings } from "@/shell/types";

export const BUILTINS: { name: string; blurb: string }[] = [
  { name: "ping", blurb: "Host heartbeat and the last seal" },
  { name: "help", blurb: "Commands the host will run" },
  { name: "adapt", blurb: "Edit shell data. Nothing is executed." },
  { name: "evolve", blurb: "Write a PLAN. Does not mint." },
  { name: "open", blurb: "This window, already unfolding from the tile" },
  { name: "menu", blurb: "MENU, only after unfold" },
  { name: "manifest", blurb: "Read the focused package manifest" },
  { name: "inventory", blurb: "Hash walk: inside, parent, magnet_roots" },
  { name: "magnetize", blurb: "Copy missing seals and re-hash" },
  { name: "register", blurb: "Toolbar tile, only if inventory is complete" },
  { name: "plan", blurb: "Show PLAN. Incomplete packages stay here." },
  { name: "fold", blurb: "Closed face. The logo is the only click." },
  { name: "download", blurb: "Download YABAT.RZL" },
];

const REFUSAL = new Set(["mint", "integrate", "integrated", "exec", "eval", "execute", "run", "import"]);

export type HostCtx = {
  fs: Fs;
  settings: Settings;
  report: Report | null;
  focus: string;
  registered: string[];
};

export type HostResult = {
  parts: Part[];
  fs?: Fs;
  report?: Report;
  openMenu?: boolean;
  openAdapt?: boolean;
  fold?: boolean;
  download?: boolean;
  register?: string;
  focus?: string;
};

const REFUSED: Part[] = [
  {
    t: "text",
    s: "Refused. Only the host runs. No execute-incoming. No mint. Not Qwen. Not OpenCV.",
  },
];

export async function runHost(input: string, ctx: HostCtx): Promise<HostResult> {
  const trimmed = input.trim();
  if (/\b(qwen|opencv)\b/i.test(trimmed) || /eval\s*\(|new\s+Function|<\s*script/i.test(trimmed)) {
    return { parts: REFUSED };
  }
  const match = trimmed.match(/^(?:\/)?(\S+)(?:\s+([\s\S]*))?$/);
  const cmd = (match?.[1] ?? "").toLowerCase();
  const arg = (match?.[2] ?? "").trim();
  if (REFUSAL.has(cmd)) return { parts: REFUSED };
  if (/^(hello|hi|hey|yo)$/i.test(trimmed)) {
    return { parts: renderTemplate(ctx.settings.hello, ctx.settings.title) };
  }
  if (cmd === "help") return { parts: helpParts(ctx.settings) };
  if (cmd === "ping") return ping(ctx);
  if (cmd === "adapt") {
    return {
      parts: [{ t: "text", s: "Adapt edits data. The host does not run what you type." }],
      openAdapt: true,
    };
  }
  if (cmd === "evolve") return evolve(ctx);
  if (cmd === "open") {
    return { parts: [{ t: "text", s: "This is the window. Same logo, open face." }] };
  }
  if (cmd === "menu") return { parts: [{ t: "text", s: "MENU." }], openMenu: true };
  if (cmd === "manifest") return manifestReply(ctx);
  if (cmd === "inventory" || cmd === "magnetize") return walk(ctx, cmd);
  if (cmd === "register") return register(ctx, arg);
  if (cmd === "plan") return showPlan(ctx, arg);
  if (cmd === "fold") {
    return { parts: [{ t: "text", s: "Folded. The logo is the only click." }], fold: true };
  }
  if (cmd === "download") {
    return { parts: [{ t: "text", s: "YABAT.RZL — the folder, not bytecode." }], download: true };
  }
  const custom = ctx.settings.custom.find((item) => item.name === cmd);
  if (custom) return { parts: renderTemplate(custom.template, ctx.settings.title) };
  return {
    parts: [
      { t: "text", s: "Offline shell. I don't run incoming text. " },
      { t: "cmd", name: "help" },
    ],
  };
}

function helpParts(settings: Settings): Part[] {
  const names = [...BUILTINS.map((item) => item.name), ...settings.custom.map((item) => item.name)];
  const parts: Part[] = [{ t: "text", s: "Commands: " }];
  names.forEach((name, index) => {
    if (index > 0) parts.push({ t: "text", s: index === names.length - 1 ? ", and " : ", " });
    parts.push({ t: "cmd", name });
  });
  parts.push({ t: "text", s: "." });
  const lines = [
    ...BUILTINS.map((item) => `${item.name.padEnd(10, " ")} ${item.blurb}`),
    ...settings.custom.map((item) => `${item.name.padEnd(10, " ")} ${item.blurb}`),
  ];
  parts.push({ t: "code", s: lines.join("\n") });
  return parts;
}

function ping(ctx: HostCtx): HostResult {
  const report = ctx.report;
  const lines = [
    `host up · ${ctx.focus}.RZL`,
    "face open",
    report ? `inventory ${report.status}` : "inventory —",
    report && report.magnetized.length > 0 ? `last magnetize ${report.magnetized.join(", ")}` : "last magnetize none",
    `toolbar ${["ヒロ", ...ctx.registered].join(" ")}`,
  ];
  return {
    parts: [
      { t: "text", s: "Host. " },
      { t: "code", s: lines.join("\n") },
      { t: "text", s: " " },
      { t: "cmd", name: "inventory" },
    ],
  };
}

function evolve(ctx: HostCtx): HostResult {
  const count =
    Object.keys(ctx.fs).filter((path) => path.startsWith("plans/") && path.endsWith(".plan.json")).length + 1;
  const path = `plans/${ctx.focus}-evolve-${count}.plan.json`;
  const plan = {
    kind: "PLAN",
    package: `${ctx.focus}.RZL`,
    mint: false,
    executeIncoming: false,
    integrated: false,
    note: "A voice-line pack can be sealed later by you. This file is a plan, not a module.",
    wouldAdd: ["voice.lines.json"],
  };
  const body = `${JSON.stringify(plan, null, 2)}\n`;
  return {
    fs: { ...ctx.fs, [path]: body },
    parts: [
      { t: "text", s: `Wrote ${path}. Nothing was minted.` },
      { t: "code", s: body.trimEnd() },
    ],
  };
}

function manifestReply(ctx: HostCtx): HostResult {
  const raw = ctx.fs[`${ctx.focus}.RZL/manifest.json`];
  if (!raw) return { parts: [{ t: "text", s: `${ctx.focus}.RZL has no manifest. PLAN only.` }] };
  return {
    parts: [
      { t: "text", s: `${ctx.focus}.RZL manifest. Read, not run.` },
      { t: "code", s: raw.trimEnd() },
    ],
  };
}

async function walk(ctx: HostCtx, cmd: "inventory" | "magnetize"): Promise<HostResult> {
  const inv = await inventoryPackage(ctx.fs, ctx.focus);
  const copied = inv.report.magnetized;
  const lead =
    cmd === "magnetize"
      ? copied.length > 0
        ? `Magnetized ${copied.join(", ")}. Re-hashed.`
        : "Nothing to magnetize. Seals hold, or the bytes are not in parent or magnet_roots."
      : inv.report.status === "complete"
        ? "Inventory complete."
        : "Inventory held. PLAN only.";
  return {
    fs: inv.fs,
    report: inv.report,
    focus: ctx.focus,
    parts: [
      { t: "text", s: lead },
      { t: "code", s: reportScript(inv.report) },
    ],
  };
}

async function register(ctx: HostCtx, arg: string): Promise<HostResult> {
  if (!arg) {
    const names = ["YABAT", ...ctx.registered];
    return { parts: [{ t: "text", s: `Toolbar: ${names.join(", ")}. register NAME — complete packages only.` }] };
  }
  const name = arg.split(/\s+/)[0]?.toUpperCase() ?? "";
  if (!ctx.fs[`${name}.RZL/manifest.json`]) {
    return { parts: [{ t: "text", s: `${name}.RZL is not a folder here.` }] };
  }
  const inv = await inventoryPackage(ctx.fs, name);
  if (inv.report.status !== "complete") {
    return {
      fs: inv.fs,
      report: inv.report,
      parts: [
        {
          t: "text",
          s: `${name}.RZL is PLAN only. Not registered. No integrated without you.`,
        },
        { t: "code", s: reportScript(inv.report) },
      ],
    };
  }
  if (name === "YABAT") {
    return {
      fs: inv.fs,
      report: inv.report,
      parts: [{ t: "text", s: "ヒロ is already the tile. Same icon, same window." }],
    };
  }
  return {
    fs: inv.fs,
    report: inv.report,
    register: name,
    focus: name,
    parts: [{ t: "text", s: `${name}.RZL registered on the toolbar. Still one window. Only the host runs.` }],
  };
}

function showPlan(ctx: HostCtx, arg: string): HostResult {
  const name = (arg.split(/\s+/)[0] || "STORM").toUpperCase();
  const manifest = readManifest(ctx.fs, name);
  const plans = Object.keys(ctx.fs)
    .filter((path) => path.startsWith("plans/") && path.endsWith(".plan.json"))
    .sort();
  const missing = manifest?.files.filter((file) => !ctx.fs[`${name}.RZL/${file.path}`]).map((file) => file.path) ?? [
    "manifest.json",
  ];
  const lines = [
    `${name}.RZL`,
    missing.length ? `missing ${missing.join(", ")}` : "no missing declared files — run inventory",
    plans.length ? `plans ${plans.join(", ")}` : "no evolve plans yet",
    "No mint. No execute-incoming.",
  ];
  return { parts: [{ t: "code", s: lines.join("\n") }] };
}

export function knownCommands(settings: Settings): string[] {
  return [...BUILTINS.map((item) => item.name), ...settings.custom.map((item) => item.name)];
}
