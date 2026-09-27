import type { Part } from "@/shell/types";

export function renderTemplate(tpl: string, title: string): Part[] {
  const parts: Part[] = [];
  const re = /\{\{(cmd:([A-Za-z][\w-]*)|title)\}\}/g;
  let last = 0;
  for (const match of tpl.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ t: "text", s: tpl.slice(last, index) });
    if (match[1] === "title") parts.push({ t: "text", s: title });
    else if (match[2]) parts.push({ t: "cmd", name: match[2].toLowerCase() });
    last = index + match[0].length;
  }
  if (last < tpl.length) parts.push({ t: "text", s: tpl.slice(last) });
  return mergeText(parts.filter((part) => !(part.t === "text" && part.s === "")));
}

function mergeText(parts: Part[]): Part[] {
  const out: Part[] = [];
  for (const part of parts) {
    const prev = out[out.length - 1];
    if (part.t === "text" && prev?.t === "text") prev.s += part.s;
    else out.push(part);
  }
  return out;
}

export function partsToText(parts: Part[]): string {
  return parts
    .map((part) => {
      if (part.t === "cmd") return part.name;
      return part.s;
    })
    .join("");
}

export function placeholderText(tpl: string, title: string): string {
  return tpl.replaceAll("{{title}}", title);
}
