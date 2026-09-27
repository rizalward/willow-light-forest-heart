import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Mic, i as Plus, n as Share, o as AudioLines, r as Search } from "../_libs/lucide-react.mjs";
import { t as create } from "../_libs/zustand.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BiO7E8MT.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
async function sha256(text) {
	const data = new TextEncoder().encode(text);
	const buf = await crypto.subtle.digest("SHA-256", data);
	const bytes = new Uint8Array(buf);
	let hex = "";
	for (const b of bytes) hex += b.toString(16).padStart(2, "0");
	return hex;
}
function packageRoot(name) {
	return `${name}.RZL`;
}
function parseManifest(raw) {
	try {
		const value = JSON.parse(raw);
		if (!value || typeof value.name !== "string" || !Array.isArray(value.files)) return null;
		return {
			name: value.name,
			ext: typeof value.ext === "string" ? value.ext : "",
			title: typeof value.title === "string" ? value.title : value.name,
			req: Array.isArray(value.req) ? value.req.filter((item) => typeof item === "string") : [],
			icon: typeof value.icon === "string" ? value.icon : "icon.png",
			entry: typeof value.entry === "string" ? value.entry : "",
			faces: {
				closed: value.faces?.closed ?? "clay-orb",
				open: value.faces?.open ?? "stone-mouth"
			},
			files: value.files.filter((file) => file && typeof file.path === "string").map((file) => ({
				path: file.path,
				sha256: typeof file.sha256 === "string" ? file.sha256 : null
			})),
			magnet_roots: Array.isArray(value.magnet_roots) ? value.magnet_roots.filter((root) => typeof root === "string") : [],
			toolbar: value.toolbar?.label ? { label: value.toolbar.label } : null,
			refuses: value.refuses
		};
	} catch {
		return null;
	}
}
function readManifest(fs, packageName) {
	const raw = fs[`${packageRoot(packageName)}/manifest.json`];
	if (!raw) return null;
	return parseManifest(raw);
}
function plan(packageName, reason) {
	return {
		packageName,
		status: "plan",
		rows: [],
		missing: [reason],
		magnetized: [],
		reason
	};
}
/**
* REQ-0. Hash inventory walks inside → parent → magnet_roots.
* A match inside stays. A match elsewhere is copied, then re-hashed.
* A miss, or a hash that does not match the seal, stays PLAN. Nothing is minted.
*/
async function inventoryPackage(fs, packageName) {
	const next = { ...fs };
	const manifestPath = `${packageRoot(packageName)}/manifest.json`;
	const raw = next[manifestPath];
	if (!raw) return {
		fs: next,
		report: plan(packageName, "manifest.json missing")
	};
	const manifest = parseManifest(raw);
	if (!manifest) return {
		fs: next,
		report: plan(packageName, "manifest.json unreadable")
	};
	if (manifest.entry !== "host") return {
		fs: next,
		report: plan(packageName, "entry is not the host")
	};
	if (manifest.ext !== "RZL") return {
		fs: next,
		report: plan(packageName, "package is not .RZL")
	};
	if (!manifest.req.includes("0") || !manifest.req.includes("1")) return {
		fs: next,
		report: plan(packageName, "REQ-0 + REQ-1 missing")
	};
	const rows = [];
	const files = manifest.files.map((file) => ({ ...file }));
	let sealed = false;
	for (const file of files) {
		const inside = `${packageRoot(packageName)}/${file.path}`;
		const insideBody = next[inside];
		if (insideBody != null) {
			const hash = await sha256(insideBody);
			if (!file.sha256 || hash === file.sha256) {
				if (!file.sha256) {
					file.sha256 = hash;
					sealed = true;
				}
				rows.push({
					path: file.path,
					where: "inside",
					hash,
					magnetized: false
				});
				continue;
			}
		}
		const found = await magnetize(next, manifest.magnet_roots, file.path, file.sha256, inside);
		if (found) {
			if (!file.sha256) {
				file.sha256 = found.hash;
				sealed = true;
			}
			rows.push({
				path: file.path,
				where: found.where,
				hash: found.hash,
				magnetized: true
			});
			continue;
		}
		rows.push({
			path: file.path,
			where: "missing",
			hash: null,
			magnetized: false,
			note: insideBody != null ? "inside hash mismatch" : "not in parent or magnet_roots"
		});
	}
	if (sealed) {
		manifest.files = files;
		next[manifestPath] = `${JSON.stringify(manifest, null, 2)}\n`;
	}
	const missing = rows.filter((row) => row.where === "missing").map((row) => row.note ? `${row.path} (${row.note})` : row.path);
	const magnetized = rows.filter((row) => row.magnetized).map((row) => row.path);
	return {
		fs: next,
		report: {
			packageName,
			status: missing.length === 0 ? "complete" : "plan",
			rows,
			missing,
			magnetized
		}
	};
}
async function magnetize(fs, roots, rel, expected, inside) {
	const parent = fs[rel];
	if (parent != null && !rel.includes(".RZL/")) {
		const copied = await copyIfHash(fs, parent, expected, inside);
		if (copied) return {
			where: "parent",
			hash: copied
		};
	}
	for (const root of roots) {
		const body = fs[`${root.replace(/\/$/, "")}/${rel}`];
		if (body == null) continue;
		const copied = await copyIfHash(fs, body, expected, inside);
		if (copied) return {
			where: "magnet",
			hash: copied
		};
	}
	return null;
}
async function copyIfHash(fs, body, expected, inside) {
	const hash = await sha256(body);
	if (expected && hash !== expected) return null;
	fs[inside] = body;
	const again = await sha256(fs[inside] ?? "");
	if (again !== hash) {
		delete fs[inside];
		return null;
	}
	return again;
}
async function sealUserFile(fs, packageName, rel, body) {
	const next = {
		...fs,
		[`${packageRoot(packageName)}/${rel}`]: body
	};
	const hash = await sha256(body);
	const manifest = readManifest(next, packageName);
	if (!manifest) return next;
	const files = manifest.files.map((file) => ({ ...file }));
	const existing = files.find((file) => file.path === rel);
	if (existing) existing.sha256 = hash;
	else files.push({
		path: rel,
		sha256: hash
	});
	manifest.files = files;
	next[`${packageRoot(packageName)}/manifest.json`] = `${JSON.stringify(manifest, null, 2)}\n`;
	return next;
}
function detachInside(fs, packageName, rel) {
	const next = { ...fs };
	delete next[`${packageRoot(packageName)}/${rel}`];
	return next;
}
function reportScript(report) {
	const lines = [`${report.packageName}.RZL`];
	if (report.reason && report.rows.length === 0) lines.push(report.reason);
	for (const row of report.rows) {
		const hash = row.hash ? row.hash.slice(0, 12) : "————";
		const act = row.magnetized ? "magnetize" : row.where === "missing" ? "PLAN" : "seal";
		lines.push(`${row.where.padEnd(7, " ")}  ${row.path}  ${hash}  ${act}`);
	}
	lines.push(report.status === "complete" ? "re-hash ok" : "still missing · PLAN only");
	return lines.join("\n");
}
function iconSrc(fs, packageName, face) {
	const [closed, open] = (fs[`${packageRoot(packageName)}/icon.png`] ?? "").split("|");
	if (face === "open" && open) return open;
	if (closed) return closed;
	return face === "open" ? "/shell/icon-open.jpg" : "/shell/icon-closed.jpg";
}
function renderTemplate(tpl, title) {
	const parts = [];
	const re = /\{\{(cmd:([A-Za-z][\w-]*)|title)\}\}/g;
	let last = 0;
	for (const match of tpl.matchAll(re)) {
		const index = match.index ?? 0;
		if (index > last) parts.push({
			t: "text",
			s: tpl.slice(last, index)
		});
		if (match[1] === "title") parts.push({
			t: "text",
			s: title
		});
		else if (match[2]) parts.push({
			t: "cmd",
			name: match[2].toLowerCase()
		});
		last = index + match[0].length;
	}
	if (last < tpl.length) parts.push({
		t: "text",
		s: tpl.slice(last)
	});
	return mergeText(parts.filter((part) => !(part.t === "text" && part.s === "")));
}
function mergeText(parts) {
	const out = [];
	for (const part of parts) {
		const prev = out[out.length - 1];
		if (part.t === "text" && prev?.t === "text") prev.s += part.s;
		else out.push(part);
	}
	return out;
}
function partsToText(parts) {
	return parts.map((part) => {
		if (part.t === "cmd") return part.name;
		return part.s;
	}).join("");
}
function placeholderText(tpl, title) {
	return tpl.replaceAll("{{title}}", title);
}
var BUILTINS = [
	{
		name: "ping",
		blurb: "Host heartbeat and the last seal"
	},
	{
		name: "help",
		blurb: "Commands the host will run"
	},
	{
		name: "adapt",
		blurb: "Edit shell data. Nothing is executed."
	},
	{
		name: "evolve",
		blurb: "Write a PLAN. Does not mint."
	},
	{
		name: "open",
		blurb: "This window, already unfolding from the tile"
	},
	{
		name: "menu",
		blurb: "MENU, only after unfold"
	},
	{
		name: "manifest",
		blurb: "Read the focused package manifest"
	},
	{
		name: "inventory",
		blurb: "Hash walk: inside, parent, magnet_roots"
	},
	{
		name: "magnetize",
		blurb: "Copy missing seals and re-hash"
	},
	{
		name: "register",
		blurb: "Toolbar tile, only if inventory is complete"
	},
	{
		name: "plan",
		blurb: "Show PLAN. Incomplete packages stay here."
	},
	{
		name: "fold",
		blurb: "Closed face. The logo is the only click."
	},
	{
		name: "download",
		blurb: "Download YABAT.RZL"
	}
];
var REFUSAL = /* @__PURE__ */ new Set([
	"mint",
	"integrate",
	"integrated",
	"exec",
	"eval",
	"execute",
	"run",
	"import"
]);
var REFUSED = [{
	t: "text",
	s: "Refused. Only the host runs. No execute-incoming. No mint. Not Qwen. Not OpenCV."
}];
async function runHost(input, ctx) {
	const trimmed = input.trim();
	if (/\b(qwen|opencv)\b/i.test(trimmed) || /eval\s*\(|new\s+Function|<\s*script/i.test(trimmed)) return { parts: REFUSED };
	const match = trimmed.match(/^(?:\/)?(\S+)(?:\s+([\s\S]*))?$/);
	const cmd = (match?.[1] ?? "").toLowerCase();
	const arg = (match?.[2] ?? "").trim();
	if (REFUSAL.has(cmd)) return { parts: REFUSED };
	if (/^(hello|hi|hey|yo)$/i.test(trimmed)) return { parts: renderTemplate(ctx.settings.hello, ctx.settings.title) };
	if (cmd === "help") return { parts: helpParts(ctx.settings) };
	if (cmd === "ping") return ping(ctx);
	if (cmd === "adapt") return {
		parts: [{
			t: "text",
			s: "Adapt edits data. The host does not run what you type."
		}],
		openAdapt: true
	};
	if (cmd === "evolve") return evolve(ctx);
	if (cmd === "open") return { parts: [{
		t: "text",
		s: "This is the window. Same logo, open face."
	}] };
	if (cmd === "menu") return {
		parts: [{
			t: "text",
			s: "MENU."
		}],
		openMenu: true
	};
	if (cmd === "manifest") return manifestReply(ctx);
	if (cmd === "inventory" || cmd === "magnetize") return walk(ctx, cmd);
	if (cmd === "register") return register(ctx, arg);
	if (cmd === "plan") return showPlan(ctx, arg);
	if (cmd === "fold") return {
		parts: [{
			t: "text",
			s: "Folded. The logo is the only click."
		}],
		fold: true
	};
	if (cmd === "download") return {
		parts: [{
			t: "text",
			s: "YABAT.RZL — the folder, not bytecode."
		}],
		download: true
	};
	const custom = ctx.settings.custom.find((item) => item.name === cmd);
	if (custom) return { parts: renderTemplate(custom.template, ctx.settings.title) };
	return { parts: [{
		t: "text",
		s: "Offline shell. I don't run incoming text. "
	}, {
		t: "cmd",
		name: "help"
	}] };
}
function helpParts(settings) {
	const names = [...BUILTINS.map((item) => item.name), ...settings.custom.map((item) => item.name)];
	const parts = [{
		t: "text",
		s: "Commands: "
	}];
	names.forEach((name, index) => {
		if (index > 0) parts.push({
			t: "text",
			s: index === names.length - 1 ? ", and " : ", "
		});
		parts.push({
			t: "cmd",
			name
		});
	});
	parts.push({
		t: "text",
		s: "."
	});
	const lines = [...BUILTINS.map((item) => `${item.name.padEnd(10, " ")} ${item.blurb}`), ...settings.custom.map((item) => `${item.name.padEnd(10, " ")} ${item.blurb}`)];
	parts.push({
		t: "code",
		s: lines.join("\n")
	});
	return parts;
}
function ping(ctx) {
	const report = ctx.report;
	return { parts: [
		{
			t: "text",
			s: "Host. "
		},
		{
			t: "code",
			s: [
				`host up · ${ctx.focus}.RZL`,
				"face open",
				report ? `inventory ${report.status}` : "inventory —",
				report && report.magnetized.length > 0 ? `last magnetize ${report.magnetized.join(", ")}` : "last magnetize none",
				`toolbar ${["ヒロ", ...ctx.registered].join(" ")}`
			].join("\n")
		},
		{
			t: "text",
			s: " "
		},
		{
			t: "cmd",
			name: "inventory"
		}
	] };
}
function evolve(ctx) {
	const count = Object.keys(ctx.fs).filter((path) => path.startsWith("plans/") && path.endsWith(".plan.json")).length + 1;
	const path = `plans/${ctx.focus}-evolve-${count}.plan.json`;
	const plan = {
		kind: "PLAN",
		package: `${ctx.focus}.RZL`,
		mint: false,
		executeIncoming: false,
		integrated: false,
		note: "A voice-line pack can be sealed later by you. This file is a plan, not a module.",
		wouldAdd: ["voice.lines.json"]
	};
	const body = `${JSON.stringify(plan, null, 2)}\n`;
	return {
		fs: {
			...ctx.fs,
			[path]: body
		},
		parts: [{
			t: "text",
			s: `Wrote ${path}. Nothing was minted.`
		}, {
			t: "code",
			s: body.trimEnd()
		}]
	};
}
function manifestReply(ctx) {
	const raw = ctx.fs[`${ctx.focus}.RZL/manifest.json`];
	if (!raw) return { parts: [{
		t: "text",
		s: `${ctx.focus}.RZL has no manifest. PLAN only.`
	}] };
	return { parts: [{
		t: "text",
		s: `${ctx.focus}.RZL manifest. Read, not run.`
	}, {
		t: "code",
		s: raw.trimEnd()
	}] };
}
async function walk(ctx, cmd) {
	const inv = await inventoryPackage(ctx.fs, ctx.focus);
	const copied = inv.report.magnetized;
	const lead = cmd === "magnetize" ? copied.length > 0 ? `Magnetized ${copied.join(", ")}. Re-hashed.` : "Nothing to magnetize. Seals hold, or the bytes are not in parent or magnet_roots." : inv.report.status === "complete" ? "Inventory complete." : "Inventory held. PLAN only.";
	return {
		fs: inv.fs,
		report: inv.report,
		focus: ctx.focus,
		parts: [{
			t: "text",
			s: lead
		}, {
			t: "code",
			s: reportScript(inv.report)
		}]
	};
}
async function register(ctx, arg) {
	if (!arg) return { parts: [{
		t: "text",
		s: `Toolbar: ${["YABAT", ...ctx.registered].join(", ")}. register NAME — complete packages only.`
	}] };
	const name = arg.split(/\s+/)[0]?.toUpperCase() ?? "";
	if (!ctx.fs[`${name}.RZL/manifest.json`]) return { parts: [{
		t: "text",
		s: `${name}.RZL is not a folder here.`
	}] };
	const inv = await inventoryPackage(ctx.fs, name);
	if (inv.report.status !== "complete") return {
		fs: inv.fs,
		report: inv.report,
		parts: [{
			t: "text",
			s: `${name}.RZL is PLAN only. Not registered. No integrated without you.`
		}, {
			t: "code",
			s: reportScript(inv.report)
		}]
	};
	if (name === "YABAT") return {
		fs: inv.fs,
		report: inv.report,
		parts: [{
			t: "text",
			s: "ヒロ is already the tile. Same icon, same window."
		}]
	};
	return {
		fs: inv.fs,
		report: inv.report,
		register: name,
		focus: name,
		parts: [{
			t: "text",
			s: `${name}.RZL registered on the toolbar. Still one window. Only the host runs.`
		}]
	};
}
function showPlan(ctx, arg) {
	const name = (arg.split(/\s+/)[0] || "STORM").toUpperCase();
	const manifest = readManifest(ctx.fs, name);
	const plans = Object.keys(ctx.fs).filter((path) => path.startsWith("plans/") && path.endsWith(".plan.json")).sort();
	const missing = manifest?.files.filter((file) => !ctx.fs[`${name}.RZL/${file.path}`]).map((file) => file.path) ?? ["manifest.json"];
	return { parts: [{
		t: "code",
		s: [
			`${name}.RZL`,
			missing.length ? `missing ${missing.join(", ")}` : "no missing declared files — run inventory",
			plans.length ? `plans ${plans.join(", ")}` : "no evolve plans yet",
			"No mint. No execute-incoming."
		].join("\n")
	}] };
}
function knownCommands(settings) {
	return [...BUILTINS.map((item) => item.name), ...settings.custom.map((item) => item.name)];
}
/** Shared src for the outer tile and the inner AppTile. Closed face, then open face. */
var ICON_BODY = "/shell/icon-closed.jpg|/shell/icon-open.jpg";
var STORM_ICON_BODY = "/shell/icon-open.jpg";
var LAW_BODY = [
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
	""
].join("\n");
var CONTRACT_BODY = JSON.stringify({
	entry: "host",
	runs: "host-only",
	executeIncoming: false,
	mint: false,
	faces: {
		closed: "clay-orb",
		open: "stone-mouth+stormling"
	},
	menu: "after-unfold"
}, null, 2) + "\n";
var README_BODY = [
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
	""
].join("\n");
var defaultSettings = {
	title: "ヒロ",
	operator: "R",
	placeholder: "Message {{title}}",
	greeting: "Hi — I'm {{title}}. Offline shell ready. Try {{cmd:ping}}, {{cmd:help}}, {{cmd:adapt}}, {{cmd:evolve}}, or open {{cmd:menu}}.",
	hello: "Hey — I'm {{title}}. Tile click or {{cmd:open}} for shell. Commands: {{cmd:help}}.",
	custom: []
};
async function createSeed() {
	const [iconHash, lawHash, contractHash, stormHash] = await Promise.all([
		sha256(ICON_BODY),
		sha256(LAW_BODY),
		sha256(CONTRACT_BODY),
		sha256(STORM_ICON_BODY)
	]);
	const yabat = {
		name: "YABAT",
		ext: "RZL",
		title: "ヒロ",
		req: ["0", "1"],
		icon: "icon.png",
		entry: "host",
		faces: {
			closed: "clay-orb",
			open: "stone-mouth"
		},
		files: [
			{
				path: "icon.png",
				sha256: iconHash
			},
			{
				path: "LAW.txt",
				sha256: lawHash
			},
			{
				path: "shell.contract.json",
				sha256: contractHash
			}
		],
		magnet_roots: ["magnet_roots/core"],
		toolbar: { label: "ヒロ" },
		refuses: [
			"execute-incoming",
			"mint",
			"qwen",
			"opencv"
		]
	};
	const storm = {
		name: "STORM",
		ext: "RZL",
		title: "STORM",
		req: ["0", "1"],
		icon: "icon.png",
		entry: "host",
		faces: {
			closed: "clay-orb",
			open: "stone-mouth"
		},
		files: [{
			path: "icon.png",
			sha256: stormHash
		}, {
			path: "mascot.kin.json",
			sha256: null
		}],
		magnet_roots: ["magnet_roots/core"],
		toolbar: { label: "STORM" },
		refuses: ["execute-incoming", "mint"]
	};
	return {
		fs: {
			"LAW.txt": LAW_BODY,
			"magnet_roots/core/shell.contract.json": CONTRACT_BODY,
			"YABAT.RZL/icon.png": ICON_BODY,
			"YABAT.RZL/manifest.json": `${JSON.stringify(yabat, null, 2)}\n`,
			"STORM.RZL/icon.png": STORM_ICON_BODY,
			"STORM.RZL/manifest.json": `${JSON.stringify(storm, null, 2)}\n`
		},
		settings: structuredClone(defaultSettings)
	};
}
var KEY = "yabat.hiro.v1";
function makeMsg(role, parts) {
	return {
		id: crypto.randomUUID(),
		role,
		parts
	};
}
function append(threads, activeId, message) {
	return threads.map((thread) => thread.id === activeId ? {
		...thread,
		messages: [...thread.messages, message]
	} : thread);
}
function withGreeting(threads, activeId, settings) {
	return threads.map((thread) => {
		if (thread.id !== activeId || thread.messages.length > 0) return thread;
		return {
			...thread,
			messages: [makeMsg("host", renderTemplate(settings.greeting, settings.title))]
		};
	});
}
function wait(ms) {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
function reducedMotion() {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function loadPersist() {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return null;
		const value = JSON.parse(raw);
		if (!value?.fs || !value.settings || !value.threads?.length || !value.activeId) return null;
		return value;
	} catch {
		return null;
	}
}
function savePersist(state) {
	localStorage.setItem(KEY, JSON.stringify(state));
}
function snapshot(state) {
	return {
		fs: state.fs,
		settings: state.settings,
		threads: state.threads,
		activeId: state.activeId,
		registered: state.registered,
		focus: state.focus
	};
}
var initialThread = {
	id: "main",
	title: "shell",
	messages: []
};
var useShell = create((set, get) => ({
	fs: {},
	settings: defaultSettings,
	threads: [initialThread],
	activeId: "main",
	registered: [],
	focus: "YABAT",
	booted: false,
	booting: true,
	busy: false,
	phase: "closed",
	face: "closed",
	bootLog: [],
	reports: {},
	menuOpen: false,
	adaptOpen: false,
	searchOpen: false,
	paletteOpen: false,
	inspect: null,
	downloadNonce: 0,
	boot: async () => {
		if (get().booted) return;
		const saved = loadPersist();
		if (saved) {
			set({
				...saved,
				booted: true,
				booting: false,
				phase: "closed",
				face: "closed",
				menuOpen: false,
				adaptOpen: false,
				searchOpen: false,
				paletteOpen: false,
				inspect: null,
				bootLog: []
			});
			return;
		}
		const seed = await createSeed();
		set({
			fs: seed.fs,
			settings: seed.settings,
			threads: [{ ...initialThread }],
			activeId: "main",
			registered: [],
			focus: "YABAT",
			booted: true,
			booting: false
		});
	},
	startHost: async () => {
		const state = get();
		if (!state.booted || state.busy || state.phase === "hosting" || state.phase === "open") return;
		set({
			busy: true,
			phase: "hosting",
			face: "closed",
			bootLog: ["host start", "YABAT.RZL"],
			inspect: null
		});
		try {
			const inv = await inventoryPackage(get().fs, "YABAT");
			const lines = reportScript(inv.report).split("\n").slice(1);
			const pause = reducedMotion() ? 0 : 110;
			for (const line of lines) {
				if (pause) await wait(pause);
				set((current) => ({ bootLog: [...current.bootLog, line] }));
			}
			if (pause) await wait(pause);
			if (inv.report.status === "complete") {
				const current = get();
				set({
					fs: inv.fs,
					phase: "open",
					face: "open",
					focus: "YABAT",
					reports: {
						...current.reports,
						YABAT: inv.report
					},
					threads: withGreeting(current.threads, current.activeId, current.settings),
					busy: false
				});
			} else set({
				fs: inv.fs,
				phase: "plan",
				face: "closed",
				focus: "YABAT",
				inspect: "YABAT",
				reports: {
					...get().reports,
					YABAT: inv.report
				},
				busy: false
			});
		} catch {
			set({
				phase: "plan",
				face: "closed",
				inspect: "YABAT",
				busy: false,
				bootLog: [...get().bootLog, "host error · PLAN only"]
			});
		}
	},
	clickPackage: async (name) => {
		const state = get();
		if (state.phase !== "open" || state.busy) return;
		if (name === "YABAT") {
			await get().submit("inventory");
			return;
		}
		set({
			busy: true,
			focus: name
		});
		try {
			const inv = await inventoryPackage(get().fs, name);
			const host = makeMsg("host", [{
				t: "text",
				s: inv.report.status === "complete" ? `${name}.RZL is sealed. Same window.` : `${name}.RZL is PLAN only. It is not on the toolbar.`
			}, {
				t: "code",
				s: reportScript(inv.report)
			}]);
			set((current) => ({
				fs: inv.fs,
				focus: name,
				reports: {
					...current.reports,
					[name]: inv.report
				},
				threads: append(current.threads, current.activeId, host),
				inspect: inv.report.status === "complete" ? null : name,
				busy: false
			}));
		} catch {
			set({ busy: false });
		}
	},
	submit: async (text) => {
		const trimmed = text.trim();
		const state = get();
		if (!trimmed || state.phase !== "open" || state.busy) return;
		const operator = makeMsg("operator", [{
			t: "text",
			s: trimmed
		}]);
		set({
			busy: true,
			paletteOpen: false,
			threads: append(state.threads, state.activeId, operator)
		});
		try {
			const current = get();
			const activeReport = current.reports[current.focus] ?? null;
			const result = await runHost(trimmed, {
				fs: current.fs,
				settings: current.settings,
				report: activeReport,
				focus: current.focus,
				registered: current.registered
			});
			const host = makeMsg("host", result.parts);
			set((snapshotState) => {
				const registered = result.register ? [.../* @__PURE__ */ new Set([...snapshotState.registered, result.register])] : snapshotState.registered;
				return {
					fs: result.fs ?? snapshotState.fs,
					focus: result.focus ?? snapshotState.focus,
					registered,
					reports: result.report ? {
						...snapshotState.reports,
						[result.report.packageName]: result.report
					} : snapshotState.reports,
					threads: append(snapshotState.threads, snapshotState.activeId, host),
					menuOpen: result.openMenu ? true : snapshotState.menuOpen,
					adaptOpen: result.openAdapt ? true : snapshotState.adaptOpen,
					inspect: result.report && result.report.status === "plan" ? result.report.packageName : snapshotState.inspect,
					downloadNonce: result.download ? snapshotState.downloadNonce + 1 : snapshotState.downloadNonce,
					phase: result.fold ? "closed" : snapshotState.phase,
					face: result.fold ? "closed" : snapshotState.face,
					searchOpen: result.fold ? false : snapshotState.searchOpen,
					busy: false
				};
			});
		} catch {
			const host = makeMsg("host", [{
				t: "text",
				s: "Host stopped on that input. Nothing ran."
			}]);
			set((current) => ({
				threads: append(current.threads, current.activeId, host),
				busy: false
			}));
		}
	},
	fold: () => {
		set({
			phase: "closed",
			face: "closed",
			menuOpen: false,
			adaptOpen: false,
			searchOpen: false,
			paletteOpen: false,
			inspect: null
		});
	},
	newThread: () => {
		const state = get();
		if (state.phase !== "open") return;
		const id = crypto.randomUUID();
		const thread = {
			id,
			title: `shell ${state.threads.length + 1}`,
			messages: [makeMsg("host", renderTemplate(state.settings.greeting, state.settings.title))]
		};
		set({
			threads: [...state.threads, thread],
			activeId: id,
			menuOpen: false
		});
	},
	selectThread: (id) => {
		if (!get().threads.some((thread) => thread.id === id)) return;
		set({
			activeId: id,
			menuOpen: false,
			searchOpen: false
		});
	},
	applySettings: (settings) => set({ settings }),
	sealFile: async (packageName, rel, body) => {
		const inv = await inventoryPackage(await sealUserFile(get().fs, packageName, rel, body), packageName);
		const state = get();
		if (packageName === "YABAT" && state.phase !== "open" && inv.report.status === "complete") {
			set({
				fs: inv.fs,
				phase: "open",
				face: "open",
				focus: "YABAT",
				reports: {
					...state.reports,
					YABAT: inv.report
				},
				threads: withGreeting(state.threads, state.activeId, state.settings),
				inspect: null
			});
			return;
		}
		const host = makeMsg("host", [{
			t: "text",
			s: inv.report.status === "complete" ? `Sealed ${rel} into ${packageName}.RZL. Your hash, not a mint.${packageName === "YABAT" ? "" : ` register ${packageName} for the toolbar.`}` : `Sealed ${rel}. ${packageName}.RZL is still PLAN.`
		}, {
			t: "code",
			s: reportScript(inv.report)
		}]);
		set({
			fs: inv.fs,
			reports: {
				...get().reports,
				[packageName]: inv.report
			},
			inspect: inv.report.status === "complete" ? null : packageName,
			threads: get().phase === "open" ? append(get().threads, get().activeId, host) : get().threads
		});
	},
	detachFile: (packageName, rel) => {
		set({ fs: detachInside(get().fs, packageName, rel) });
	},
	resetHost: async () => {
		localStorage.removeItem(KEY);
		const seed = await createSeed();
		set({
			fs: seed.fs,
			settings: seed.settings,
			threads: [{
				id: "main",
				title: "shell",
				messages: []
			}],
			activeId: "main",
			registered: [],
			focus: "YABAT",
			phase: "closed",
			face: "closed",
			bootLog: [],
			reports: {},
			menuOpen: false,
			adaptOpen: false,
			searchOpen: false,
			paletteOpen: false,
			inspect: null,
			busy: false,
			booted: true,
			booting: false
		});
	},
	requestDownload: () => set((state) => ({
		downloadNonce: state.downloadNonce + 1,
		menuOpen: false
	})),
	setMenu: (open) => set({
		menuOpen: open,
		paletteOpen: open ? false : get().paletteOpen
	}),
	setAdapt: (open) => set({
		adaptOpen: open,
		menuOpen: false
	}),
	setSearch: (open) => set({
		searchOpen: open,
		menuOpen: false
	}),
	setPalette: (open) => set({ paletteOpen: open }),
	setInspect: (name) => set({
		inspect: name,
		menuOpen: false
	}),
	closeOverlays: () => set({
		menuOpen: false,
		adaptOpen: false,
		searchOpen: false,
		paletteOpen: false
	})
}));
if (typeof window !== "undefined") useShell.subscribe((state) => {
	if (!state.booted) return;
	savePersist(snapshot(state));
});
function activeThread(state) {
	return state.threads.find((thread) => thread.id === state.activeId) ?? state.threads[0];
}
function Rich({ parts }) {
	const submit = useShell((state) => state.submit);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "text-sm leading-relaxed text-pretty",
		children: parts.map((part, index) => {
			if (part.t === "text") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: part.s }, index);
			if (part.t === "cmd") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "mx-0.5 inline-flex min-h-6 items-center rounded-md bg-chip px-1.5 align-baseline font-mono text-xs text-fg",
				onClick: () => void submit(part.name),
				children: part.name === "menu" ? "MENU" : part.name
			}, index);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				className: "mt-2 max-w-full overflow-x-auto rounded-lg bg-chip p-3 font-mono text-xs leading-relaxed text-fg",
				children: part.s
			}, index);
		})
	});
}
var HOST_NAMES = /* @__PURE__ */ new Set([
	...BUILTINS.map((item) => item.name),
	"mint",
	"qwen",
	"opencv",
	"eval",
	"exec",
	"run",
	"import",
	"hello",
	"hi",
	"hey"
]);
function AdaptPanel() {
	const open = useShell((state) => state.adaptOpen);
	const setAdapt = useShell((state) => state.setAdapt);
	const applySettings = useShell((state) => state.applySettings);
	const fs = useShell((state) => state.fs);
	const sealFile = useShell((state) => state.sealFile);
	const detachFile = useShell((state) => state.detachFile);
	const [draft, setDraft] = (0, import_react.useState)(null);
	const [cmdName, setCmdName] = (0, import_react.useState)("");
	const [cmdBlurb, setCmdBlurb] = (0, import_react.useState)("");
	const [cmdTpl, setCmdTpl] = (0, import_react.useState)("Noted, {{title}}.");
	const [filePath, setFilePath] = (0, import_react.useState)("");
	const [fileBody, setFileBody] = (0, import_react.useState)("");
	const [pkg, setPkg] = (0, import_react.useState)("STORM");
	const [rel, setRel] = (0, import_react.useState)("mascot.kin.json");
	const [relBody, setRelBody] = (0, import_react.useState)("{\n  \"kin\": \"stormling\",\n  \"count\": 1\n}\n");
	const [note, setNote] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		if (!open) return;
		const state = useShell.getState();
		setDraft(structuredClone(state.settings));
		const first = Object.keys(state.fs).sort()[0] ?? "";
		setFilePath(first);
		setFileBody(state.fs[first] ?? "");
		setNote("");
	}, [open]);
	if (!open || !draft) return null;
	const paths = Object.keys(fs).sort();
	function addCommand() {
		const name = cmdName.trim().toLowerCase();
		if (!/^[a-z][a-z0-9-]{0,16}$/.test(name) || HOST_NAMES.has(name)) {
			setNote("That name stays with the host.");
			return;
		}
		setDraft((current) => current ? {
			...current,
			custom: [...current.custom.filter((item) => item.name !== name), {
				name,
				blurb: cmdBlurb.trim() || "Custom data",
				template: cmdTpl
			}]
		} : current);
		setCmdName("");
		setCmdBlurb("");
		setNote(`Added ${name}. Apply to seal it into the shell.`);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-40 flex justify-end bg-bg/70",
		onClick: () => setAdapt(false),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "shell-scroll h-dvh w-full max-w-md overflow-y-auto border-l border-line bg-bg p-5",
			onClick: (event) => event.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-base font-medium",
						children: "Adapt"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "min-h-11 px-2 text-sm text-muted",
						onClick: () => setAdapt(false),
						children: "Close"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm leading-relaxed text-muted",
					children: "Data only. The host will not execute this. Outer tile and AppTile keep one icon.png."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "mt-5 block font-mono text-xs text-faint",
					htmlFor: "adapt-title",
					children: "Name"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					id: "adapt-title",
					value: draft.title,
					maxLength: 24,
					onChange: (event) => setDraft({
						...draft,
						title: event.target.value
					}),
					className: "mt-1 w-full rounded-xl bg-surface-2 px-3 py-3 text-sm text-fg outline-none"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "mt-4 block font-mono text-xs text-faint",
					htmlFor: "adapt-op",
					children: "Operator mark"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					id: "adapt-op",
					value: draft.operator,
					maxLength: 2,
					onChange: (event) => setDraft({
						...draft,
						operator: event.target.value.toUpperCase()
					}),
					className: "mt-1 w-24 rounded-xl bg-surface-2 px-3 py-3 text-sm text-fg outline-none"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Placeholder",
					value: draft.placeholder,
					onChange: (placeholder) => setDraft({
						...draft,
						placeholder
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Greeting",
					value: draft.greeting,
					onChange: (greeting) => setDraft({
						...draft,
						greeting
					}),
					rows: 4
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Hello",
					value: draft.hello,
					onChange: (hello) => setDraft({
						...draft,
						hello
					}),
					rows: 3
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-none mt-3 rounded-bubble bg-surface px-4 py-3",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rich, { parts: renderTemplate(draft.greeting, draft.title || "ヒロ") })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "mt-4 min-h-11 rounded-xl bg-surface px-4 text-sm font-medium text-fg",
					onClick: () => {
						const title = draft.title.trim() || "ヒロ";
						const operator = (draft.operator.trim() || "R").slice(0, 2).toUpperCase();
						applySettings({
							...draft,
							title,
							operator
						});
						setNote("Applied. Next lines use this voice.");
					},
					children: "Apply voice"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mt-8 text-sm font-medium",
					children: "Commands"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-2 flex flex-col gap-1",
					children: draft.custom.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center justify-between gap-2 font-mono text-xs text-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "min-h-11 px-2 text-fg",
							onClick: () => setDraft({
								...draft,
								custom: draft.custom.filter((command) => command.name !== item.name)
							}),
							children: "Remove"
						})]
					}, item.name))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 grid gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: cmdName,
							onChange: (event) => setCmdName(event.target.value),
							placeholder: "name",
							"aria-label": "Command name",
							className: "rounded-xl bg-surface-2 px-3 py-3 font-mono text-sm text-fg outline-none"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: cmdBlurb,
							onChange: (event) => setCmdBlurb(event.target.value),
							placeholder: "blurb",
							"aria-label": "Command blurb",
							className: "rounded-xl bg-surface-2 px-3 py-3 text-sm text-fg outline-none"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: cmdTpl,
							onChange: (event) => setCmdTpl(event.target.value),
							rows: 2,
							"aria-label": "Command reply",
							className: "rounded-xl bg-surface-2 px-3 py-3 font-mono text-xs text-fg outline-none"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "min-h-11 rounded-xl bg-surface px-4 text-sm text-fg",
							onClick: addCommand,
							children: "Add command"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mt-8 text-sm font-medium",
					children: "Folder bytes"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted",
					children: "icon.png is the shared src. Detach an inside copy to magnetize it again."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					value: filePath,
					"aria-label": "File",
					onChange: (event) => {
						const path = event.target.value;
						setFilePath(path);
						setFileBody(useShell.getState().fs[path] ?? "");
					},
					className: "mt-3 w-full rounded-xl bg-surface-2 px-3 py-3 font-mono text-xs text-fg outline-none",
					children: paths.map((path) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: path,
						children: path
					}, path))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: fileBody,
					onChange: (event) => setFileBody(event.target.value),
					rows: 8,
					"aria-label": "File body",
					className: "mt-2 w-full rounded-xl bg-surface-2 p-3 font-mono text-xs leading-relaxed text-fg outline-none"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "min-h-11 rounded-xl bg-surface px-4 text-sm text-fg",
						onClick: () => {
							if (!filePath) return;
							useShell.setState({ fs: {
								...useShell.getState().fs,
								[filePath]: fileBody
							} });
							setNote(`Wrote ${filePath}. Not executed.`);
						},
						children: "Write bytes"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "min-h-11 rounded-xl bg-surface px-4 text-sm text-fg",
						onClick: () => {
							const match = filePath.match(/^([A-Za-z0-9_-]+)\.RZL\/(.+)$/);
							if (!match?.[1] || !match[2] || match[2] === "manifest.json") {
								setNote("Detach an inside file, not the manifest.");
								return;
							}
							detachFile(match[1], match[2]);
							setNote(`Detached ${filePath}. Next inventory can magnetize it.`);
						},
						children: "Detach inside copy"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mt-8 text-sm font-medium",
					children: "Seal a missing file"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 grid grid-cols-2 gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: pkg,
						onChange: (event) => setPkg(event.target.value.toUpperCase()),
						"aria-label": "Package",
						className: "rounded-xl bg-surface-2 px-3 py-3 font-mono text-sm text-fg outline-none"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: rel,
						onChange: (event) => setRel(event.target.value),
						"aria-label": "Relative path",
						className: "rounded-xl bg-surface-2 px-3 py-3 font-mono text-sm text-fg outline-none"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: relBody,
					onChange: (event) => setRelBody(event.target.value),
					rows: 5,
					"aria-label": "Seal body",
					className: "mt-2 w-full rounded-xl bg-surface-2 p-3 font-mono text-xs text-fg outline-none"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "mt-2 min-h-11 rounded-xl bg-surface px-4 text-sm text-fg",
					onClick: () => {
						if (!/^[A-Z][A-Z0-9_-]{0,16}$/.test(pkg) || !rel.trim()) {
							setNote("Package and path required.");
							return;
						}
						sealFile(pkg, rel.trim(), relBody);
						setNote(`Sealed ${rel} into ${pkg}.RZL with your hash.`);
					},
					children: "Seal my hash"
				}),
				note ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 font-mono text-xs text-muted",
					children: note
				}) : null
			]
		})
	});
}
function Field({ label, value, onChange, rows = 1 }) {
	const id = `adapt-${label}`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
		className: "mt-4 block font-mono text-xs text-faint",
		htmlFor: id,
		children: label
	}), rows > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		id,
		value,
		rows,
		onChange: (event) => onChange(event.target.value),
		className: "mt-1 w-full rounded-xl bg-surface-2 px-3 py-3 font-mono text-xs leading-relaxed text-fg outline-none"
	}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		id,
		value,
		onChange: (event) => onChange(event.target.value),
		className: "mt-1 w-full rounded-xl bg-surface-2 px-3 py-3 text-sm text-fg outline-none"
	})] });
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function AppTile({ packageName = "YABAT", size, onOpen }) {
	const fs = useShell((state) => state.fs);
	const face = useShell((state) => state.face);
	const booting = useShell((state) => state.booting);
	const src = iconSrc(fs, packageName, packageName === "YABAT" ? face : "closed");
	const manifest = readManifest(fs, packageName);
	const label = manifest?.toolbar?.label ?? manifest?.title ?? packageName;
	const stage = size === "stage";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick: onOpen,
		disabled: booting && stage,
		"aria-label": stage ? `Open ${label}` : label,
		className: cn("flex flex-col items-center gap-1 rounded-tile", stage ? "gap-3" : "w-rail"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src,
			alt: "",
			draggable: false,
			className: cn("object-cover", stage ? "size-36 rounded-tile sm:size-40" : "size-11 rounded-xl")
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("text-muted", stage ? "text-sm font-medium tracking-wide" : "text-xs"),
			children: label
		})]
	});
}
function ClosedStage() {
	const phase = useShell((state) => state.phase);
	const bootLog = useShell((state) => state.bootLog);
	const report = useShell((state) => state.reports.YABAT);
	const startHost = useShell((state) => state.startHost);
	const boot = useShell((state) => state.boot);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "shell-in flex h-dvh flex-col items-center justify-center gap-8 bg-bg px-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppTile, {
				size: "stage",
				onOpen: () => {
					(async () => {
						if (!useShell.getState().booted) await boot();
						await startHost();
					})();
				}
			}),
			phase === "hosting" && bootLog.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				className: "shell-scroll max-h-64 max-w-full overflow-auto text-left font-mono text-xs leading-relaxed text-muted",
				children: bootLog.map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "line-in block",
					children: line
				}, line))
			}) : null,
			phase === "plan" && report ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlanSeal, { report }) : null
		]
	});
}
function PlanSeal({ report }) {
	const missing = report.rows.find((row) => row.where === "missing")?.path ?? report.missing[0] ?? "file";
	const sealFile = useShell((state) => state.sealFile);
	const [body, setBody] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "w-full max-w-md text-left",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-xs text-clay",
				children: "PLAN only"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm leading-relaxed text-fg",
				children: [report.packageName, ".RZL did not unfold. Still missing. No mint, and nothing incoming will run."]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				className: "mt-3 overflow-x-auto font-mono text-xs leading-relaxed text-muted",
				children: report.missing.join("\n")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "mt-4 flex flex-col gap-3",
				onSubmit: (event) => {
					event.preventDefault();
					if (!body.trim() || missing.includes(" ")) return;
					sealFile(report.packageName, missing, body);
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "font-mono text-xs text-muted",
						htmlFor: "plan-body",
						children: ["Supply ", missing]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						id: "plan-body",
						value: body,
						onChange: (event) => setBody(event.target.value),
						rows: 5,
						className: "rounded-xl bg-surface-2 p-3 font-mono text-xs leading-relaxed text-fg outline-none"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						disabled: !body.trim(),
						className: "min-h-11 rounded-xl bg-surface px-4 text-sm font-medium text-fg disabled:opacity-40",
						children: "Seal my hash"
					})
				]
			})
		]
	});
}
function MenuButton() {
	const open = useShell((state) => state.menuOpen);
	const setMenu = useShell((state) => state.setMenu);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-expanded": open,
		"aria-haspopup": "menu",
		onClick: () => setMenu(!open),
		className: "min-h-11 rounded-xl bg-menu px-3 text-xs font-medium tracking-wide text-fg",
		children: "MENU"
	});
}
function OperatorMark() {
	const mark = useShell((state) => state.settings.operator);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		"aria-hidden": "true",
		className: "flex size-9 items-center justify-center rounded-full bg-surface text-sm font-medium text-fg",
		children: mark.slice(0, 2)
	});
}
function MenuPanel() {
	const open = useShell((state) => state.menuOpen);
	const setMenu = useShell((state) => state.setMenu);
	const setAdapt = useShell((state) => state.setAdapt);
	const fold = useShell((state) => state.fold);
	const threads = useShell((state) => state.threads);
	const registered = useShell((state) => state.registered);
	const activeId = useShell((state) => state.activeId);
	const selectThread = useShell((state) => state.selectThread);
	const resetHost = useShell((state) => state.resetHost);
	const requestDownload = useShell((state) => state.requestDownload);
	const focus = useShell((state) => state.focus);
	const report = useShell((state) => state.reports[focus]);
	const [confirm, setConfirm] = (0, import_react.useState)(false);
	if (!open) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-30 bg-bg/70 md:bg-transparent",
		onClick: () => setMenu(false),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			role: "menu",
			className: "absolute right-0 bottom-0 left-0 max-h-[80dvh] overflow-auto rounded-t-2xl border border-line bg-surface-2 p-3 md:bottom-24 md:left-3 md:w-80 md:rounded-2xl",
			onClick: (event) => event.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "px-2 pb-2 font-mono text-xs text-muted",
					children: [
						focus,
						".RZL · ",
						report?.status ?? "sealed after unfold"
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item, {
					label: "Adapt shell",
					onClick: () => {
						setAdapt(true);
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item, {
					label: "Search",
					onClick: () => useShell.getState().setSearch(true)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item, {
					label: "New thread",
					onClick: () => useShell.getState().newThread()
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item, {
					label: "STORM plan",
					onClick: () => {
						(async () => {
							const inv = await inventoryPackage(useShell.getState().fs, "STORM");
							useShell.setState({
								fs: inv.fs,
								reports: {
									...useShell.getState().reports,
									STORM: inv.report
								},
								inspect: "STORM",
								menuOpen: false
							});
						})();
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					role: "menuitem",
					href: "/downloads/YABAT.RZL.zip",
					download: "YABAT.RZL.zip",
					className: "flex min-h-11 items-center rounded-xl px-3 text-sm text-fg",
					onClick: (event) => {
						event.preventDefault();
						requestDownload();
					},
					children: "Download YABAT.RZL"
				}),
				registered.map((name) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item, {
					label: `${name} tile`,
					onClick: () => void useShell.getState().clickPackage(name)
				}, name)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-3 pt-3 pb-1 font-mono text-xs text-faint",
					children: "Threads"
				}),
				threads.map((thread) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item, {
					label: thread.id === activeId ? `${thread.title} · open` : thread.title,
					onClick: () => selectThread(thread.id)
				}, thread.id)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item, {
					label: "Fold to logo",
					onClick: fold
				}),
				confirm ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 flex gap-2 px-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "min-h-11 flex-1 rounded-xl bg-clay px-3 text-sm font-medium text-fg",
						onClick: () => void resetHost(),
						children: "Reset host"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "min-h-11 flex-1 rounded-xl bg-surface px-3 text-sm text-fg",
						onClick: () => setConfirm(false),
						children: "Keep"
					})]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item, {
					label: "Reset host",
					onClick: () => setConfirm(true)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-3 pt-3 font-mono text-xs text-faint",
					children: "Only the host runs. No mint."
				})
			]
		})
	});
}
function Item({ label, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		role: "menuitem",
		onClick,
		className: "flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm text-fg",
		children: label
	});
}
function recognitionCtor() {
	const w = window;
	return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
function Composer() {
	const settings = useShell((state) => state.settings);
	const submit = useShell((state) => state.submit);
	const paletteOpen = useShell((state) => state.paletteOpen);
	const setPalette = useShell((state) => state.setPalette);
	const busy = useShell((state) => state.busy);
	const [value, setValue] = (0, import_react.useState)("");
	const [listening, setListening] = (0, import_react.useState)(false);
	const [hint, setHint] = (0, import_react.useState)("");
	const recRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		return () => recRef.current?.stop();
	}, []);
	function send(text) {
		const next = text.trim();
		if (!next) return;
		setValue("");
		setPalette(false);
		setHint("");
		submit(next);
	}
	function toggleListen() {
		if (listening) {
			recRef.current?.stop();
			setListening(false);
			return;
		}
		const Ctor = recognitionCtor();
		if (!Ctor) {
			setHint("No listener on this host. Type the command.");
			return;
		}
		const rec = new Ctor();
		rec.lang = "en-US";
		rec.interimResults = false;
		rec.onresult = (event) => {
			const said = event.results[0]?.[0]?.transcript ?? "";
			if (said) send(said);
		};
		rec.onerror = () => setListening(false);
		rec.onend = () => setListening(false);
		recRef.current = rec;
		rec.start();
		setListening(true);
		setHint("");
	}
	function speakLast() {
		const last = [...activeThread(useShell.getState()).messages].reverse().find((message) => message.role === "host");
		if (!last || !window.speechSynthesis) {
			setHint("No voice on this host.");
			return;
		}
		const utterance = new SpeechSynthesisUtterance(partsToText(last.parts));
		utterance.lang = "en-US";
		window.speechSynthesis.cancel();
		window.speechSynthesis.speak(utterance);
	}
	const commands = knownCommands(settings);
	const placeholder = placeholderText(settings.placeholder, settings.title);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "composer-pad px-3 md:px-6",
		children: [hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-2 font-mono text-xs text-muted",
			children: hint
		}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "relative flex items-center gap-1 rounded-full bg-surface-2 py-1 pr-1 pl-1",
			onSubmit: (event) => {
				event.preventDefault();
				send(value);
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
					label: "Commands",
					onClick: () => setPalette(!paletteOpen),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-5" })
				}),
				paletteOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "absolute bottom-14 left-0 z-20 max-h-64 w-56 overflow-auto rounded-2xl border border-line bg-surface-2 p-1",
					children: commands.map((name) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "flex min-h-11 w-full items-center rounded-xl px-3 text-left font-mono text-sm text-fg",
						onClick: () => send(name),
						children: name
					}, name))
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value,
					onChange: (event) => setValue(event.target.value),
					placeholder,
					"aria-label": placeholder,
					autoComplete: "off",
					autoCorrect: "off",
					spellCheck: false,
					disabled: busy,
					className: "min-w-0 flex-1 bg-transparent px-2 py-2 text-base text-fg outline-none placeholder:text-faint"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
					label: listening ? "Stop listening" : "Listen",
					onClick: toggleListen,
					hot: listening,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: "size-5" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
					label: "Speak last reply",
					onClick: speakLast,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AudioLines, { className: "size-5" })
				})
			]
		})]
	});
}
function IconButton({ label, onClick, children, hot = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-label": label,
		onClick,
		className: cn("flex size-11 shrink-0 items-center justify-center rounded-full text-fg", hot ? "bg-clay text-fg" : "hover:bg-surface"),
		children
	});
}
function Transcript() {
	const threads = useShell((state) => state.threads);
	const activeId = useShell((state) => state.activeId);
	const thread = activeThread({
		threads,
		activeId
	});
	const endRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		endRef.current?.scrollIntoView({ block: "end" });
	}, [thread.messages.length, activeId]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "shell-scroll min-h-0 overflow-y-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col gap-3 px-4 py-4 md:px-8 md:py-6",
			children: [thread.messages.map((message) => {
				const mine = message.role === "operator";
				const text = message.parts.map((part) => part.t === "text" ? part.s : "").join("");
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: mine ? "flex justify-end" : "flex justify-start",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: mine ? "line-in max-w-xs rounded-bubble bg-user px-4 py-2 text-sm leading-relaxed text-user-fg" : "line-in min-w-0 max-w-xl rounded-bubble bg-surface px-4 py-3 text-fg",
						children: mine ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm leading-relaxed",
							children: text
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rich, { parts: message.parts })
					})
				}, message.id);
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: endRef })]
		})
	});
}
function OpenShell() {
	const registered = useShell((state) => state.registered);
	const newThread = useShell((state) => state.newThread);
	const setSearch = useShell((state) => state.setSearch);
	const clickPackage = useShell((state) => state.clickPackage);
	const fs = useShell((state) => state.fs);
	const face = useShell((state) => state.face);
	const title = useShell((state) => state.settings.title);
	const requestDownload = useShell((state) => state.requestDownload);
	const focus = useShell((state) => state.focus);
	const report = useShell((state) => state.reports[focus]);
	const [shareOpen, setShareOpen] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "shell-grid shell-in bg-bg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "hidden h-dvh flex-col items-center justify-between border-r border-line py-3 md:flex",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RailButton, {
						label: "Search",
						onClick: () => setSearch(true),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "size-5" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RailButton, {
						label: "New thread",
						onClick: newThread,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-5" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppTile, {
						size: "rail",
						onOpen: () => void clickPackage("YABAT")
					}),
					registered.map((name) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppTile, {
						packageName: name,
						size: "rail",
						onOpen: () => void clickPackage(name)
					}, name))
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col items-center gap-2 pb-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OperatorMark, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuButton, {})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative grid h-dvh min-w-0 grid-rows-[auto_minmax(0,1fr)_auto]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "flex flex-col px-3 pt-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative flex h-14 w-full items-center justify-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "absolute left-0 flex items-center gap-2 md:hidden",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OperatorMark, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuButton, {})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "flex items-center gap-2 rounded-full bg-surface-2 py-1 pr-3 pl-1",
								"aria-label": title,
								onClick: () => void clickPackage("YABAT"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: iconSrc(fs, "YABAT", face),
									alt: "",
									className: "size-7 rounded-lg object-cover"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-medium",
									children: title
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "absolute right-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-label": "Share",
									className: "flex size-11 items-center justify-center rounded-full text-fg",
									onClick: () => setShareOpen((open) => !open),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Share, { className: "size-5" })
								}), shareOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "absolute right-0 z-20 w-60 rounded-2xl border border-line bg-surface-2 p-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: "/downloads/YABAT.RZL.zip",
										download: "YABAT.RZL.zip",
										className: "flex min-h-11 items-center rounded-xl px-3 text-sm text-fg",
										onClick: (event) => {
											event.preventDefault();
											requestDownload();
											setShareOpen(false);
										},
										children: "Download YABAT.RZL"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm text-fg",
										onClick: () => {
											const line = `${focus}.RZL ${report?.status ?? "open"}`;
											navigator.clipboard?.writeText(line);
											setShareOpen(false);
										},
										children: "Copy status"
									})]
								}) : null]
							})
						]
					}), registered.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex gap-3 overflow-x-auto pb-2 md:hidden",
						children: registered.map((name) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppTile, {
							packageName: name,
							size: "rail",
							onOpen: () => void clickPackage(name)
						}, name))
					}) : null]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Transcript, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Composer, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inspect, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchOverlay, {})
			]
		})]
	});
}
function RailButton({ label, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-label": label,
		onClick,
		className: "flex size-11 items-center justify-center rounded-full text-fg",
		children
	});
}
function Inspect() {
	const inspect = useShell((state) => state.inspect);
	const report = useShell((state) => inspect ? state.reports[inspect] : void 0);
	const setInspect = useShell((state) => state.setInspect);
	const sealFile = useShell((state) => state.sealFile);
	const [body, setBody] = (0, import_react.useState)("{\n  \"kin\": \"stormling\",\n  \"count\": 1\n}\n");
	if (!inspect || !report || report.status === "complete") return null;
	const missing = report.rows.find((row) => row.where === "missing")?.path;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "absolute right-3 bottom-24 left-3 z-20 max-h-80 overflow-auto rounded-2xl border border-line bg-surface-2 p-4 md:left-auto md:w-96",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "font-mono text-xs text-clay",
					children: [
						"PLAN only · ",
						inspect,
						".RZL"
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "min-h-11 px-2 text-sm text-muted",
					onClick: () => setInspect(null),
					children: "Close"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				className: "mt-2 font-mono text-xs leading-relaxed text-muted",
				children: report.missing.join("\n")
			}),
			missing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "mt-3 flex flex-col gap-2",
				onSubmit: (event) => {
					event.preventDefault();
					if (!body.trim()) return;
					sealFile(inspect, missing, body);
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "font-mono text-xs text-faint",
						htmlFor: "inspect-body",
						children: ["Supply ", missing]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						id: "inspect-body",
						value: body,
						onChange: (event) => setBody(event.target.value),
						rows: 4,
						className: "rounded-xl bg-bg p-3 font-mono text-xs text-fg outline-none"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						className: "min-h-11 rounded-xl bg-surface px-4 text-sm text-fg",
						children: "Seal my hash"
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm text-muted",
				children: "Nothing to seal until you supply the missing bytes."
			})
		]
	});
}
function SearchOverlay() {
	const open = useShell((state) => state.searchOpen);
	const setSearch = useShell((state) => state.setSearch);
	const threads = useShell((state) => state.threads);
	const selectThread = useShell((state) => state.selectThread);
	const submit = useShell((state) => state.submit);
	const settings = useShell((state) => state.settings);
	const [query, setQuery] = (0, import_react.useState)("");
	if (!open) return null;
	const needle = query.trim().toLowerCase();
	const hits = threads.flatMap((thread) => thread.messages.filter((message) => !needle || partsToText(message.parts).toLowerCase().includes(needle)).map((message) => ({
		thread,
		message,
		text: partsToText(message.parts)
	})));
	const commands = [
		"ping",
		"help",
		"adapt",
		"evolve",
		"inventory",
		"register",
		"plan",
		...settings.custom.map((item) => item.name)
	].filter((name) => !needle || name.includes(needle));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-0 z-20 flex flex-col bg-bg px-4 pt-4 md:px-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				autoFocus: true,
				value: query,
				onChange: (event) => setQuery(event.target.value),
				placeholder: "Search the shell",
				"aria-label": "Search the shell",
				className: "min-w-0 flex-1 rounded-full bg-surface-2 px-4 py-3 text-base text-fg outline-none"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "min-h-11 px-3 text-sm text-muted",
				onClick: () => setSearch(false),
				children: "Close"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "shell-scroll mt-4 min-h-0 flex-1 overflow-auto",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-xs text-faint",
					children: "Commands"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2 flex flex-wrap gap-2",
					children: commands.map((name) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "min-h-11 rounded-xl bg-chip px-3 font-mono text-sm text-fg",
						onClick: () => {
							setSearch(false);
							submit(name);
						},
						children: name
					}, name))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-6 font-mono text-xs text-faint",
					children: "Lines"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-2 flex flex-col",
					children: hits.slice(0, 40).map((hit) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "flex min-h-11 w-full items-center gap-3 text-left text-sm",
						onClick: () => selectThread(hit.thread.id),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "w-16 shrink-0 font-mono text-xs text-faint",
							children: hit.thread.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate text-fg",
							children: hit.text
						})]
					}) }, hit.message.id))
				})
			]
		})]
	});
}
var CRC_TABLE = (() => {
	const table = /* @__PURE__ */ new Uint32Array(256);
	for (let n = 0; n < 256; n += 1) {
		let crc = n;
		for (let k = 0; k < 8; k += 1) crc = crc & 1 ? 3988292384 ^ crc >>> 1 : crc >>> 1;
		table[n] = crc >>> 0;
	}
	return table;
})();
function crc32(data) {
	let crc = 4294967295;
	for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 255] ^ crc >>> 8;
	return (crc ^ 4294967295) >>> 0;
}
function concat(parts) {
	const size = parts.reduce((sum, part) => sum + part.length, 0);
	const out = new Uint8Array(size);
	let offset = 0;
	for (const part of parts) {
		out.set(part, offset);
		offset += part.length;
	}
	return out;
}
function u16(value) {
	const bytes = /* @__PURE__ */ new Uint8Array(2);
	new DataView(bytes.buffer).setUint16(0, value, true);
	return bytes;
}
function u32(value) {
	const bytes = /* @__PURE__ */ new Uint8Array(4);
	new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
	return bytes;
}
function zipStore(files) {
	const encoder = new TextEncoder();
	const locals = [];
	const centrals = [];
	let offset = 0;
	for (const file of files) {
		const name = encoder.encode(file.name);
		const crc = crc32(file.data);
		const local = concat([
			u32(67324752),
			u16(20),
			u16(0),
			u16(0),
			u16(0),
			u16(0),
			u32(crc),
			u32(file.data.length),
			u32(file.data.length),
			u16(name.length),
			u16(0),
			name,
			file.data
		]);
		locals.push(local);
		centrals.push(concat([
			u32(33639248),
			u16(20),
			u16(20),
			u16(0),
			u16(0),
			u16(0),
			u16(0),
			u32(crc),
			u32(file.data.length),
			u32(file.data.length),
			u16(name.length),
			u16(0),
			u16(0),
			u16(0),
			u16(0),
			u32(0),
			u32(offset),
			name
		]));
		offset += local.length;
	}
	const central = concat(centrals);
	const eocd = concat([
		u32(101010256),
		u16(0),
		u16(0),
		u16(files.length),
		u16(files.length),
		u32(central.length),
		u32(offset),
		u16(0)
	]);
	const archive = concat([
		...locals,
		central,
		eocd
	]);
	const copy = new ArrayBuffer(archive.byteLength);
	new Uint8Array(copy).set(archive);
	return new Blob([copy], { type: "application/zip" });
}
async function rasterPng(src) {
	const image = new Image();
	image.crossOrigin = "anonymous";
	image.src = src;
	await image.decode();
	const canvas = document.createElement("canvas");
	canvas.width = image.naturalWidth;
	canvas.height = image.naturalHeight;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("canvas");
	ctx.drawImage(image, 0, 0);
	const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
	if (!blob) throw new Error("png");
	return new Uint8Array(await blob.arrayBuffer());
}
async function buildPackageZip(fs, packageName = "YABAT") {
	const encoder = new TextEncoder();
	const prefix = `${packageName}.RZL/`;
	const files = [];
	for (const [path, body] of Object.entries(fs)) {
		if (!path.startsWith(prefix)) continue;
		if (path.slice(prefix.length) === "icon.png" && body.startsWith("/shell/")) {
			const src = body.split("|")[0] ?? body;
			files.push({
				name: path,
				data: await rasterPng(src)
			});
			continue;
		}
		files.push({
			name: path,
			data: encoder.encode(body)
		});
	}
	files.push({
		name: "README.txt",
		data: encoder.encode(README_BODY)
	});
	return zipStore(files);
}
function saveBlob(blob, filename) {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function ShellApp() {
	const phase = useShell((state) => state.phase);
	const boot = useShell((state) => state.boot);
	const nonce = useShell((state) => state.downloadNonce);
	(0, import_react.useEffect)(() => {
		boot();
	}, [boot]);
	(0, import_react.useEffect)(() => {
		const onKey = (event) => {
			if (event.key === "Escape") useShell.getState().closeOverlays();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
	(0, import_react.useEffect)(() => {
		if (nonce === 0) return;
		const fs = useShell.getState().fs;
		buildPackageZip(fs).then((blob) => saveBlob(blob, "YABAT.RZL.zip")).catch(() => {
			const anchor = document.createElement("a");
			anchor.href = "/downloads/YABAT.RZL.zip";
			anchor.download = "YABAT.RZL.zip";
			anchor.click();
		});
	}, [nonce]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		phase === "open" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OpenShell, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClosedStage, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuPanel, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdaptPanel, {})
	] });
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShellApp, {});
}
//#endregion
export { Home as component };
