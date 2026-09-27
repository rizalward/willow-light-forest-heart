import { Plus, Search, Share } from "lucide-react";
import { useState, type ReactNode } from "react";
import { AppTile } from "@/components/shell/app-tile";
import { Composer } from "@/components/shell/composer";
import { MenuButton, OperatorMark } from "@/components/shell/menu-panel";
import { Transcript } from "@/components/shell/transcript";
import { iconSrc } from "@/shell/inventory";
import { useShell } from "@/shell/store";
import { partsToText } from "@/shell/template";

export function OpenShell() {
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
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="shell-grid shell-in bg-bg">
      <aside className="hidden h-dvh flex-col items-center justify-between border-r border-line py-3 md:flex">
        <div className="flex flex-col items-center gap-2">
          <RailButton label="Search" onClick={() => setSearch(true)}>
            <Search className="size-5" />
          </RailButton>
          <RailButton label="New thread" onClick={newThread}>
            <Plus className="size-5" />
          </RailButton>
          <AppTile size="rail" onOpen={() => void clickPackage("YABAT")} />
          {registered.map((name) => (
            <AppTile key={name} packageName={name} size="rail" onOpen={() => void clickPackage(name)} />
          ))}
        </div>
        <div className="flex flex-col items-center gap-2 pb-2">
          <OperatorMark />
          <MenuButton />
        </div>
      </aside>
      <div className="relative grid h-dvh min-w-0 grid-rows-[auto_minmax(0,1fr)_auto]">
        <header className="flex flex-col px-3 pt-2">
          <div className="relative flex h-14 w-full items-center justify-center">
            <div className="absolute left-0 flex items-center gap-2 md:hidden">
              <OperatorMark />
              <MenuButton />
            </div>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full bg-surface-2 py-1 pr-3 pl-1"
              aria-label={title}
              onClick={() => void clickPackage("YABAT")}
            >
              <img src={iconSrc(fs, "YABAT", face)} alt="" className="size-7 rounded-lg object-cover" />
              <span className="text-sm font-medium">{title}</span>
            </button>
            <div className="absolute right-0">
              <button
                type="button"
                aria-label="Share"
                className="flex size-11 items-center justify-center rounded-full text-fg"
                onClick={() => setShareOpen((open) => !open)}
              >
                <Share className="size-5" />
              </button>
              {shareOpen ? (
                <div className="absolute right-0 z-20 w-60 rounded-2xl border border-line bg-surface-2 p-2">
                  <a
                    href="/downloads/YABAT.RZL.zip"
                    download="YABAT.RZL.zip"
                    className="flex min-h-11 items-center rounded-xl px-3 text-sm text-fg"
                    onClick={(event) => {
                      event.preventDefault();
                      requestDownload();
                      setShareOpen(false);
                    }}
                  >
                    Download YABAT.RZL
                  </a>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm text-fg"
                    onClick={() => {
                      const line = `${focus}.RZL ${report?.status ?? "open"}`;
                      void navigator.clipboard?.writeText(line);
                      setShareOpen(false);
                    }}
                  >
                    Copy status
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          {registered.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 md:hidden">
              {registered.map((name) => (
                <AppTile key={name} packageName={name} size="rail" onOpen={() => void clickPackage(name)} />
              ))}
            </div>
          ) : null}
        </header>
        <Transcript />
        <Composer />
        <Inspect />
        <SearchOverlay />
      </div>
    </div>
  );
}

function RailButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-full text-fg"
    >
      {children}
    </button>
  );
}

function Inspect() {
  const inspect = useShell((state) => state.inspect);
  const report = useShell((state) => (inspect ? state.reports[inspect] : undefined));
  const setInspect = useShell((state) => state.setInspect);
  const sealFile = useShell((state) => state.sealFile);
  const [body, setBody] = useState('{\n  "kin": "stormling",\n  "count": 1\n}\n');
  if (!inspect || !report || report.status === "complete") return null;
  const missing = report.rows.find((row) => row.where === "missing")?.path;

  return (
    <aside className="absolute right-3 bottom-24 left-3 z-20 max-h-80 overflow-auto rounded-2xl border border-line bg-surface-2 p-4 md:left-auto md:w-96">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs text-clay">PLAN only · {inspect}.RZL</p>
        <button type="button" className="min-h-11 px-2 text-sm text-muted" onClick={() => setInspect(null)}>
          Close
        </button>
      </div>
      <pre className="mt-2 font-mono text-xs leading-relaxed text-muted">{report.missing.join("\n")}</pre>
      {missing ? (
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!body.trim()) return;
            void sealFile(inspect, missing, body);
          }}
        >
          <label className="font-mono text-xs text-faint" htmlFor="inspect-body">
            Supply {missing}
          </label>
          <textarea
            id="inspect-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            className="rounded-xl bg-bg p-3 font-mono text-xs text-fg outline-none"
          />
          <button type="submit" className="min-h-11 rounded-xl bg-surface px-4 text-sm text-fg">
            Seal my hash
          </button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-muted">Nothing to seal until you supply the missing bytes.</p>
      )}
    </aside>
  );
}

function SearchOverlay() {
  const open = useShell((state) => state.searchOpen);
  const setSearch = useShell((state) => state.setSearch);
  const threads = useShell((state) => state.threads);
  const selectThread = useShell((state) => state.selectThread);
  const submit = useShell((state) => state.submit);
  const settings = useShell((state) => state.settings);
  const [query, setQuery] = useState("");
  if (!open) return null;
  const needle = query.trim().toLowerCase();
  const hits = threads.flatMap((thread) =>
    thread.messages
      .filter((message) => !needle || partsToText(message.parts).toLowerCase().includes(needle))
      .map((message) => ({ thread, message, text: partsToText(message.parts) })),
  );
  const commands = ["ping", "help", "adapt", "evolve", "inventory", "register", "plan", ...settings.custom.map((item) => item.name)].filter(
    (name) => !needle || name.includes(needle),
  );

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-bg px-4 pt-4 md:px-8">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the shell"
          aria-label="Search the shell"
          className="min-w-0 flex-1 rounded-full bg-surface-2 px-4 py-3 text-base text-fg outline-none"
        />
        <button type="button" className="min-h-11 px-3 text-sm text-muted" onClick={() => setSearch(false)}>
          Close
        </button>
      </div>
      <div className="shell-scroll mt-4 min-h-0 flex-1 overflow-auto">
        <p className="font-mono text-xs text-faint">Commands</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {commands.map((name) => (
            <button
              key={name}
              type="button"
              className="min-h-11 rounded-xl bg-chip px-3 font-mono text-sm text-fg"
              onClick={() => {
                setSearch(false);
                void submit(name);
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <p className="mt-6 font-mono text-xs text-faint">Lines</p>
        <ul className="mt-2 flex flex-col">
          {hits.slice(0, 40).map((hit) => (
            <li key={hit.message.id}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3 text-left text-sm"
                onClick={() => selectThread(hit.thread.id)}
              >
                <span className="w-16 shrink-0 font-mono text-xs text-faint">{hit.thread.title}</span>
                <span className="truncate text-fg">{hit.text}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
