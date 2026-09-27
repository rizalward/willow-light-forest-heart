import { sha256 } from "@/shell/sha256";
import type { Fs, InventoryRow, Manifest, Report } from "@/shell/types";

export function packageRoot(name: string): string {
  return `${name}.RZL`;
}

export function parseManifest(raw: string): Manifest | null {
  try {
    const value = JSON.parse(raw) as Partial<Manifest>;
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
        open: value.faces?.open ?? "stone-mouth",
      },
      files: value.files
        .filter((file) => file && typeof file.path === "string")
        .map((file) => ({
          path: file.path,
          sha256: typeof file.sha256 === "string" ? file.sha256 : null,
        })),
      magnet_roots: Array.isArray(value.magnet_roots)
        ? value.magnet_roots.filter((root) => typeof root === "string")
        : [],
      toolbar: value.toolbar?.label ? { label: value.toolbar.label } : null,
      refuses: value.refuses,
    };
  } catch {
    return null;
  }
}

export function readManifest(fs: Fs, packageName: string): Manifest | null {
  const raw = fs[`${packageRoot(packageName)}/manifest.json`];
  if (!raw) return null;
  return parseManifest(raw);
}

function plan(packageName: string, reason: string): Report {
  return {
    packageName,
    status: "plan",
    rows: [],
    missing: [reason],
    magnetized: [],
    reason,
  };
}

/**
 * REQ-0. Hash inventory walks inside → parent → magnet_roots.
 * A match inside stays. A match elsewhere is copied, then re-hashed.
 * A miss, or a hash that does not match the seal, stays PLAN. Nothing is minted.
 */
export async function inventoryPackage(
  fs: Fs,
  packageName: string,
): Promise<{ fs: Fs; report: Report }> {
  const next: Fs = { ...fs };
  const manifestPath = `${packageRoot(packageName)}/manifest.json`;
  const raw = next[manifestPath];
  if (!raw) return { fs: next, report: plan(packageName, "manifest.json missing") };
  const manifest = parseManifest(raw);
  if (!manifest) return { fs: next, report: plan(packageName, "manifest.json unreadable") };
  if (manifest.entry !== "host") return { fs: next, report: plan(packageName, "entry is not the host") };
  if (manifest.ext !== "RZL") return { fs: next, report: plan(packageName, "package is not .RZL") };
  if (!manifest.req.includes("0") || !manifest.req.includes("1")) {
    return { fs: next, report: plan(packageName, "REQ-0 + REQ-1 missing") };
  }

  const rows: InventoryRow[] = [];
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
        rows.push({ path: file.path, where: "inside", hash, magnetized: false });
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
        magnetized: true,
      });
      continue;
    }

    rows.push({
      path: file.path,
      where: "missing",
      hash: null,
      magnetized: false,
      note: insideBody != null ? "inside hash mismatch" : "not in parent or magnet_roots",
    });
  }

  if (sealed) {
    manifest.files = files;
    next[manifestPath] = `${JSON.stringify(manifest, null, 2)}\n`;
  }

  const missing = rows
    .filter((row) => row.where === "missing")
    .map((row) => (row.note ? `${row.path} (${row.note})` : row.path));
  const magnetized = rows.filter((row) => row.magnetized).map((row) => row.path);
  return {
    fs: next,
    report: {
      packageName,
      status: missing.length === 0 ? "complete" : "plan",
      rows,
      missing,
      magnetized,
    },
  };
}

async function magnetize(
  fs: Fs,
  roots: string[],
  rel: string,
  expected: string | null,
  inside: string,
): Promise<{ where: "parent" | "magnet"; hash: string } | null> {
  const parent = fs[rel];
  if (parent != null && !rel.includes(".RZL/")) {
    const copied = await copyIfHash(fs, parent, expected, inside);
    if (copied) return { where: "parent", hash: copied };
  }
  for (const root of roots) {
    const key = `${root.replace(/\/$/, "")}/${rel}`;
    const body = fs[key];
    if (body == null) continue;
    const copied = await copyIfHash(fs, body, expected, inside);
    if (copied) return { where: "magnet", hash: copied };
  }
  return null;
}

async function copyIfHash(
  fs: Fs,
  body: string,
  expected: string | null,
  inside: string,
): Promise<string | null> {
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

export async function sealUserFile(
  fs: Fs,
  packageName: string,
  rel: string,
  body: string,
): Promise<Fs> {
  const next: Fs = { ...fs, [`${packageRoot(packageName)}/${rel}`]: body };
  const hash = await sha256(body);
  const manifest = readManifest(next, packageName);
  if (!manifest) return next;
  const files = manifest.files.map((file) => ({ ...file }));
  const existing = files.find((file) => file.path === rel);
  if (existing) existing.sha256 = hash;
  else files.push({ path: rel, sha256: hash });
  manifest.files = files;
  next[`${packageRoot(packageName)}/manifest.json`] = `${JSON.stringify(manifest, null, 2)}\n`;
  return next;
}

export function detachInside(fs: Fs, packageName: string, rel: string): Fs {
  const next = { ...fs };
  delete next[`${packageRoot(packageName)}/${rel}`];
  return next;
}

export function reportScript(report: Report): string {
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

export function listPackages(fs: Fs): string[] {
  const names = new Set<string>();
  for (const path of Object.keys(fs)) {
    const match = path.match(/^([A-Za-z0-9_-]+)\.RZL\/manifest\.json$/);
    if (match?.[1]) names.add(match[1]);
  }
  return [...names].sort();
}

export function iconSrc(fs: Fs, packageName: string, face: "closed" | "open"): string {
  const body = fs[`${packageRoot(packageName)}/icon.png`] ?? "";
  const [closed, open] = body.split("|");
  if (face === "open" && open) return open;
  if (closed) return closed;
  return face === "open" ? "/shell/icon-open.jpg" : "/shell/icon-closed.jpg";
}
