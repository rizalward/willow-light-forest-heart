import { create } from "zustand";
import { runHost, type HostResult } from "@/shell/host";
import {
  detachInside,
  inventoryPackage,
  listPackages,
  reportScript,
  sealUserFile,
} from "@/shell/inventory";
import { createSeed, defaultSettings } from "@/shell/seed";
import { renderTemplate } from "@/shell/template";
import type { Face, Fs, Msg, Part, Phase, Report, Settings, Thread } from "@/shell/types";

const KEY = "yabat.hiro.v1";

type Persist = {
  fs: Fs;
  settings: Settings;
  threads: Thread[];
  activeId: string;
  registered: string[];
  focus: string;
};

type ShellState = Persist & {
  booted: boolean;
  booting: boolean;
  busy: boolean;
  phase: Phase;
  face: Face;
  bootLog: string[];
  reports: Record<string, Report>;
  menuOpen: boolean;
  adaptOpen: boolean;
  searchOpen: boolean;
  paletteOpen: boolean;
  inspect: string | null;
  downloadNonce: number;
  boot: () => Promise<void>;
  startHost: () => Promise<void>;
  clickPackage: (name: string) => Promise<void>;
  submit: (text: string) => Promise<void>;
  fold: () => void;
  newThread: () => void;
  selectThread: (id: string) => void;
  applySettings: (settings: Settings) => void;
  sealFile: (packageName: string, rel: string, body: string) => Promise<void>;
  detachFile: (packageName: string, rel: string) => void;
  resetHost: () => Promise<void>;
  requestDownload: () => void;
  setMenu: (open: boolean) => void;
  setAdapt: (open: boolean) => void;
  setSearch: (open: boolean) => void;
  setPalette: (open: boolean) => void;
  setInspect: (name: string | null) => void;
  closeOverlays: () => void;
};

function makeMsg(role: Msg["role"], parts: Part[]): Msg {
  return { id: crypto.randomUUID(), role, parts };
}

function append(threads: Thread[], activeId: string, message: Msg): Thread[] {
  return threads.map((thread) =>
    thread.id === activeId ? { ...thread, messages: [...thread.messages, message] } : thread,
  );
}

function withGreeting(threads: Thread[], activeId: string, settings: Settings): Thread[] {
  return threads.map((thread) => {
    if (thread.id !== activeId || thread.messages.length > 0) return thread;
    return {
      ...thread,
      messages: [makeMsg("host", renderTemplate(settings.greeting, settings.title))],
    };
  });
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function loadPersist(): Persist | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Persist;
    if (!value?.fs || !value.settings || !value.threads?.length || !value.activeId) return null;
    return value;
  } catch {
    return null;
  }
}

function savePersist(state: Persist) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function snapshot(state: ShellState): Persist {
  return {
    fs: state.fs,
    settings: state.settings,
    threads: state.threads,
    activeId: state.activeId,
    registered: state.registered,
    focus: state.focus,
  };
}

const initialThread: Thread = { id: "main", title: "shell", messages: [] };

export const useShell = create<ShellState>((set, get) => ({
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
        bootLog: [],
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
      booting: false,
    });
  },

  startHost: async () => {
    const state = get();
    if (!state.booted || state.busy || state.phase === "hosting" || state.phase === "open") return;
    set({ busy: true, phase: "hosting", face: "closed", bootLog: ["host start", "YABAT.RZL"], inspect: null });
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
          reports: { ...current.reports, YABAT: inv.report },
          threads: withGreeting(current.threads, current.activeId, current.settings),
          busy: false,
        });
      } else {
        set({
          fs: inv.fs,
          phase: "plan",
          face: "closed",
          focus: "YABAT",
          inspect: "YABAT",
          reports: { ...get().reports, YABAT: inv.report },
          busy: false,
        });
      }
    } catch {
      set({
        phase: "plan",
        face: "closed",
        inspect: "YABAT",
        busy: false,
        bootLog: [...get().bootLog, "host error · PLAN only"],
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
    set({ busy: true, focus: name });
    try {
      const inv = await inventoryPackage(get().fs, name);
      const host = makeMsg("host", [
        {
          t: "text",
          s:
            inv.report.status === "complete"
              ? `${name}.RZL is sealed. Same window.`
              : `${name}.RZL is PLAN only. It is not on the toolbar.`,
        },
        { t: "code", s: reportScript(inv.report) },
      ]);
      set((current) => ({
        fs: inv.fs,
        focus: name,
        reports: { ...current.reports, [name]: inv.report },
        threads: append(current.threads, current.activeId, host),
        inspect: inv.report.status === "complete" ? null : name,
        busy: false,
      }));
    } catch {
      set({ busy: false });
    }
  },

  submit: async (text) => {
    const trimmed = text.trim();
    const state = get();
    if (!trimmed || state.phase !== "open" || state.busy) return;
    const operator = makeMsg("operator", [{ t: "text", s: trimmed }]);
    set({
      busy: true,
      paletteOpen: false,
      threads: append(state.threads, state.activeId, operator),
    });
    try {
      const current = get();
      const activeReport = current.reports[current.focus] ?? null;
      const result: HostResult = await runHost(trimmed, {
        fs: current.fs,
        settings: current.settings,
        report: activeReport,
        focus: current.focus,
        registered: current.registered,
      });
      const host = makeMsg("host", result.parts);
      set((snapshotState) => {
        const registered = result.register
          ? [...new Set([...snapshotState.registered, result.register])]
          : snapshotState.registered;
        return {
          fs: result.fs ?? snapshotState.fs,
          focus: result.focus ?? snapshotState.focus,
          registered,
          reports: result.report
            ? { ...snapshotState.reports, [result.report.packageName]: result.report }
            : snapshotState.reports,
          threads: append(snapshotState.threads, snapshotState.activeId, host),
          menuOpen: result.openMenu ? true : snapshotState.menuOpen,
          adaptOpen: result.openAdapt ? true : snapshotState.adaptOpen,
          inspect: result.report && result.report.status === "plan" ? result.report.packageName : snapshotState.inspect,
          downloadNonce: result.download ? snapshotState.downloadNonce + 1 : snapshotState.downloadNonce,
          phase: result.fold ? "closed" : snapshotState.phase,
          face: result.fold ? "closed" : snapshotState.face,
          searchOpen: result.fold ? false : snapshotState.searchOpen,
          busy: false,
        };
      });
    } catch {
      const host = makeMsg("host", [{ t: "text", s: "Host stopped on that input. Nothing ran." }]);
      set((current) => ({
        threads: append(current.threads, current.activeId, host),
        busy: false,
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
      inspect: null,
    });
  },

  newThread: () => {
    const state = get();
    if (state.phase !== "open") return;
    const id = crypto.randomUUID();
    const thread: Thread = {
      id,
      title: `shell ${state.threads.length + 1}`,
      messages: [makeMsg("host", renderTemplate(state.settings.greeting, state.settings.title))],
    };
    set({ threads: [...state.threads, thread], activeId: id, menuOpen: false });
  },

  selectThread: (id) => {
    if (!get().threads.some((thread) => thread.id === id)) return;
    set({ activeId: id, menuOpen: false, searchOpen: false });
  },

  applySettings: (settings) => set({ settings }),

  sealFile: async (packageName, rel, body) => {
    const next = await sealUserFile(get().fs, packageName, rel, body);
    const inv = await inventoryPackage(next, packageName);
    const state = get();
    if (packageName === "YABAT" && state.phase !== "open" && inv.report.status === "complete") {
      set({
        fs: inv.fs,
        phase: "open",
        face: "open",
        focus: "YABAT",
        reports: { ...state.reports, YABAT: inv.report },
        threads: withGreeting(state.threads, state.activeId, state.settings),
        inspect: null,
      });
      return;
    }
    const host = makeMsg("host", [
      {
        t: "text",
        s:
          inv.report.status === "complete"
            ? `Sealed ${rel} into ${packageName}.RZL. Your hash, not a mint.${packageName === "YABAT" ? "" : ` register ${packageName} for the toolbar.`}`
            : `Sealed ${rel}. ${packageName}.RZL is still PLAN.`,
      },
      { t: "code", s: reportScript(inv.report) },
    ]);
    set({
      fs: inv.fs,
      reports: { ...get().reports, [packageName]: inv.report },
      inspect: inv.report.status === "complete" ? null : packageName,
      threads:
        get().phase === "open" ? append(get().threads, get().activeId, host) : get().threads,
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
      threads: [{ id: "main", title: "shell", messages: [] }],
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
      booting: false,
    });
  },

  requestDownload: () => set((state) => ({ downloadNonce: state.downloadNonce + 1, menuOpen: false })),

  setMenu: (open) => set({ menuOpen: open, paletteOpen: open ? false : get().paletteOpen }),
  setAdapt: (open) => set({ adaptOpen: open, menuOpen: false }),
  setSearch: (open) => set({ searchOpen: open, menuOpen: false }),
  setPalette: (open) => set({ paletteOpen: open }),
  setInspect: (name) => set({ inspect: name, menuOpen: false }),
  closeOverlays: () => set({ menuOpen: false, adaptOpen: false, searchOpen: false, paletteOpen: false }),
}));

if (typeof window !== "undefined") {
  useShell.subscribe((state) => {
    if (!state.booted) return;
    savePersist(snapshot(state));
  });
}

export function activeThread(state: Pick<ShellState, "threads" | "activeId">): Thread {
  return state.threads.find((thread) => thread.id === state.activeId) ?? state.threads[0];
}

export function packageNames(state: Pick<ShellState, "fs">): string[] {
  return listPackages(state.fs);
}
