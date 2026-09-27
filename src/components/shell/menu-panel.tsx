import { useState } from "react";
import { inventoryPackage } from "@/shell/inventory";
import { useShell } from "@/shell/store";

export function MenuButton() {
  const open = useShell((state) => state.menuOpen);
  const setMenu = useShell((state) => state.setMenu);
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-haspopup="menu"
      onClick={() => setMenu(!open)}
      className="min-h-11 rounded-xl bg-menu px-3 text-xs font-medium tracking-wide text-fg"
    >
      MENU
    </button>
  );
}

export function OperatorMark() {
  const mark = useShell((state) => state.settings.operator);
  return (
    <span
      aria-hidden="true"
      className="flex size-9 items-center justify-center rounded-full bg-surface text-sm font-medium text-fg"
    >
      {mark.slice(0, 2)}
    </span>
  );
}

export function MenuPanel() {
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
  const [confirm, setConfirm] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 bg-bg/70 md:bg-transparent" onClick={() => setMenu(false)}>
      <div
        role="menu"
        className="absolute right-0 bottom-0 left-0 max-h-[80dvh] overflow-auto rounded-t-2xl border border-line bg-surface-2 p-3 md:bottom-24 md:left-3 md:w-80 md:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="px-2 pb-2 font-mono text-xs text-muted">
          {focus}.RZL · {report?.status ?? "sealed after unfold"}
        </p>
        <Item
          label="Adapt shell"
          onClick={() => {
            setAdapt(true);
          }}
        />
        <Item label="Search" onClick={() => useShell.getState().setSearch(true)} />
        <Item label="New thread" onClick={() => useShell.getState().newThread()} />
        <Item
          label="STORM plan"
          onClick={() => {
            void (async () => {
              const state = useShell.getState();
              const inv = await inventoryPackage(state.fs, "STORM");
              useShell.setState({
                fs: inv.fs,
                reports: { ...useShell.getState().reports, STORM: inv.report },
                inspect: "STORM",
                menuOpen: false,
              });
            })();
          }}
        />
        <a
          role="menuitem"
          href="/downloads/YABAT.RZL.zip"
          download="YABAT.RZL.zip"
          className="flex min-h-11 items-center rounded-xl px-3 text-sm text-fg"
          onClick={(event) => {
            event.preventDefault();
            requestDownload();
          }}
        >
          Download YABAT.RZL
        </a>
        {registered.map((name) => (
          <Item key={name} label={`${name} tile`} onClick={() => void useShell.getState().clickPackage(name)} />
        ))}
        <p className="px-3 pt-3 pb-1 font-mono text-xs text-faint">Threads</p>
        {threads.map((thread) => (
          <Item
            key={thread.id}
            label={thread.id === activeId ? `${thread.title} · open` : thread.title}
            onClick={() => selectThread(thread.id)}
          />
        ))}
        <Item label="Fold to logo" onClick={fold} />
        {confirm ? (
          <div className="mt-2 flex gap-2 px-1">
            <button
              type="button"
              className="min-h-11 flex-1 rounded-xl bg-clay px-3 text-sm font-medium text-fg"
              onClick={() => void resetHost()}
            >
              Reset host
            </button>
            <button
              type="button"
              className="min-h-11 flex-1 rounded-xl bg-surface px-3 text-sm text-fg"
              onClick={() => setConfirm(false)}
            >
              Keep
            </button>
          </div>
        ) : (
          <Item label="Reset host" onClick={() => setConfirm(true)} />
        )}
        <p className="px-3 pt-3 font-mono text-xs text-faint">Only the host runs. No mint.</p>
      </div>
    </div>
  );
}

function Item({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm text-fg"
    >
      {label}
    </button>
  );
}
