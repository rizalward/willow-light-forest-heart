import { useEffect, useState } from "react";
import { Rich } from "@/components/shell/rich";
import { BUILTINS } from "@/shell/host";
import { useShell } from "@/shell/store";
import { renderTemplate } from "@/shell/template";
import type { Settings } from "@/shell/types";

const HOST_NAMES = new Set([
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
  "hey",
]);

export function AdaptPanel() {
  const open = useShell((state) => state.adaptOpen);
  const setAdapt = useShell((state) => state.setAdapt);
  const applySettings = useShell((state) => state.applySettings);
  const fs = useShell((state) => state.fs);
  const sealFile = useShell((state) => state.sealFile);
  const detachFile = useShell((state) => state.detachFile);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [cmdName, setCmdName] = useState("");
  const [cmdBlurb, setCmdBlurb] = useState("");
  const [cmdTpl, setCmdTpl] = useState("Noted, {{title}}.");
  const [filePath, setFilePath] = useState("");
  const [fileBody, setFileBody] = useState("");
  const [pkg, setPkg] = useState("STORM");
  const [rel, setRel] = useState("mascot.kin.json");
  const [relBody, setRelBody] = useState('{\n  "kin": "stormling",\n  "count": 1\n}\n');
  const [note, setNote] = useState("");

  useEffect(() => {
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
    setDraft((current) =>
      current
        ? {
            ...current,
            custom: [
              ...current.custom.filter((item) => item.name !== name),
              { name, blurb: cmdBlurb.trim() || "Custom data", template: cmdTpl },
            ],
          }
        : current,
    );
    setCmdName("");
    setCmdBlurb("");
    setNote(`Added ${name}. Apply to seal it into the shell.`);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-bg/70" onClick={() => setAdapt(false)}>
      <div
        className="shell-scroll h-dvh w-full max-w-md overflow-y-auto border-l border-line bg-bg p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-medium">Adapt</h2>
          <button type="button" className="min-h-11 px-2 text-sm text-muted" onClick={() => setAdapt(false)}>
            Close
          </button>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Data only. The host will not execute this. Outer tile and AppTile keep one icon.png.
        </p>

        <label className="mt-5 block font-mono text-xs text-faint" htmlFor="adapt-title">
          Name
        </label>
        <input
          id="adapt-title"
          value={draft.title}
          maxLength={24}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          className="mt-1 w-full rounded-xl bg-surface-2 px-3 py-3 text-sm text-fg outline-none"
        />
        <label className="mt-4 block font-mono text-xs text-faint" htmlFor="adapt-op">
          Operator mark
        </label>
        <input
          id="adapt-op"
          value={draft.operator}
          maxLength={2}
          onChange={(event) => setDraft({ ...draft, operator: event.target.value.toUpperCase() })}
          className="mt-1 w-24 rounded-xl bg-surface-2 px-3 py-3 text-sm text-fg outline-none"
        />
        <Field label="Placeholder" value={draft.placeholder} onChange={(placeholder) => setDraft({ ...draft, placeholder })} />
        <Field label="Greeting" value={draft.greeting} onChange={(greeting) => setDraft({ ...draft, greeting })} rows={4} />
        <Field label="Hello" value={draft.hello} onChange={(hello) => setDraft({ ...draft, hello })} rows={3} />
        <div className="pointer-events-none mt-3 rounded-bubble bg-surface px-4 py-3">
          <Rich parts={renderTemplate(draft.greeting, draft.title || "ヒロ")} />
        </div>
        <button
          type="button"
          className="mt-4 min-h-11 rounded-xl bg-surface px-4 text-sm font-medium text-fg"
          onClick={() => {
            const title = draft.title.trim() || "ヒロ";
            const operator = (draft.operator.trim() || "R").slice(0, 2).toUpperCase();
            applySettings({ ...draft, title, operator });
            setNote("Applied. Next lines use this voice.");
          }}
        >
          Apply voice
        </button>

        <h3 className="mt-8 text-sm font-medium">Commands</h3>
        <ul className="mt-2 flex flex-col gap-1">
          {draft.custom.map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-2 font-mono text-xs text-muted">
              <span>{item.name}</span>
              <button
                type="button"
                className="min-h-11 px-2 text-fg"
                onClick={() =>
                  setDraft({ ...draft, custom: draft.custom.filter((command) => command.name !== item.name) })
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-2 grid gap-2">
          <input
            value={cmdName}
            onChange={(event) => setCmdName(event.target.value)}
            placeholder="name"
            aria-label="Command name"
            className="rounded-xl bg-surface-2 px-3 py-3 font-mono text-sm text-fg outline-none"
          />
          <input
            value={cmdBlurb}
            onChange={(event) => setCmdBlurb(event.target.value)}
            placeholder="blurb"
            aria-label="Command blurb"
            className="rounded-xl bg-surface-2 px-3 py-3 text-sm text-fg outline-none"
          />
          <textarea
            value={cmdTpl}
            onChange={(event) => setCmdTpl(event.target.value)}
            rows={2}
            aria-label="Command reply"
            className="rounded-xl bg-surface-2 px-3 py-3 font-mono text-xs text-fg outline-none"
          />
          <button type="button" className="min-h-11 rounded-xl bg-surface px-4 text-sm text-fg" onClick={addCommand}>
            Add command
          </button>
        </div>

        <h3 className="mt-8 text-sm font-medium">Folder bytes</h3>
        <p className="mt-1 text-sm text-muted">icon.png is the shared src. Detach an inside copy to magnetize it again.</p>
        <select
          value={filePath}
          aria-label="File"
          onChange={(event) => {
            const path = event.target.value;
            setFilePath(path);
            setFileBody(useShell.getState().fs[path] ?? "");
          }}
          className="mt-3 w-full rounded-xl bg-surface-2 px-3 py-3 font-mono text-xs text-fg outline-none"
        >
          {paths.map((path) => (
            <option key={path} value={path}>
              {path}
            </option>
          ))}
        </select>
        <textarea
          value={fileBody}
          onChange={(event) => setFileBody(event.target.value)}
          rows={8}
          aria-label="File body"
          className="mt-2 w-full rounded-xl bg-surface-2 p-3 font-mono text-xs leading-relaxed text-fg outline-none"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-11 rounded-xl bg-surface px-4 text-sm text-fg"
            onClick={() => {
              if (!filePath) return;
              useShell.setState({ fs: { ...useShell.getState().fs, [filePath]: fileBody } });
              setNote(`Wrote ${filePath}. Not executed.`);
            }}
          >
            Write bytes
          </button>
          <button
            type="button"
            className="min-h-11 rounded-xl bg-surface px-4 text-sm text-fg"
            onClick={() => {
              const match = filePath.match(/^([A-Za-z0-9_-]+)\.RZL\/(.+)$/);
              if (!match?.[1] || !match[2] || match[2] === "manifest.json") {
                setNote("Detach an inside file, not the manifest.");
                return;
              }
              detachFile(match[1], match[2]);
              setNote(`Detached ${filePath}. Next inventory can magnetize it.`);
            }}
          >
            Detach inside copy
          </button>
        </div>

        <h3 className="mt-8 text-sm font-medium">Seal a missing file</h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            value={pkg}
            onChange={(event) => setPkg(event.target.value.toUpperCase())}
            aria-label="Package"
            className="rounded-xl bg-surface-2 px-3 py-3 font-mono text-sm text-fg outline-none"
          />
          <input
            value={rel}
            onChange={(event) => setRel(event.target.value)}
            aria-label="Relative path"
            className="rounded-xl bg-surface-2 px-3 py-3 font-mono text-sm text-fg outline-none"
          />
        </div>
        <textarea
          value={relBody}
          onChange={(event) => setRelBody(event.target.value)}
          rows={5}
          aria-label="Seal body"
          className="mt-2 w-full rounded-xl bg-surface-2 p-3 font-mono text-xs text-fg outline-none"
        />
        <button
          type="button"
          className="mt-2 min-h-11 rounded-xl bg-surface px-4 text-sm text-fg"
          onClick={() => {
            if (!/^[A-Z][A-Z0-9_-]{0,16}$/.test(pkg) || !rel.trim()) {
              setNote("Package and path required.");
              return;
            }
            void sealFile(pkg, rel.trim(), relBody);
            setNote(`Sealed ${rel} into ${pkg}.RZL with your hash.`);
          }}
        >
          Seal my hash
        </button>
        {note ? <p className="mt-4 font-mono text-xs text-muted">{note}</p> : null}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  rows = 1,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  const id = `adapt-${label}`;
  return (
    <>
      <label className="mt-4 block font-mono text-xs text-faint" htmlFor={id}>
        {label}
      </label>
      {rows > 1 ? (
        <textarea
          id={id}
          value={value}
          rows={rows}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 w-full rounded-xl bg-surface-2 px-3 py-3 font-mono text-xs leading-relaxed text-fg outline-none"
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 w-full rounded-xl bg-surface-2 px-3 py-3 text-sm text-fg outline-none"
        />
      )}
    </>
  );
}
