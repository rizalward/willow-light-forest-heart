import { useState } from "react";
import { AppTile } from "@/components/shell/app-tile";
import { useShell } from "@/shell/store";
import type { Report } from "@/shell/types";

export function ClosedStage() {
  const phase = useShell((state) => state.phase);
  const bootLog = useShell((state) => state.bootLog);
  const report = useShell((state) => state.reports.YABAT);
  const startHost = useShell((state) => state.startHost);
  const boot = useShell((state) => state.boot);

  return (
    <main className="shell-in flex h-dvh flex-col items-center justify-center gap-8 bg-bg px-6">
      <AppTile
        size="stage"
        onOpen={() => {
          void (async () => {
            if (!useShell.getState().booted) await boot();
            await startHost();
          })();
        }}
      />
      {phase === "hosting" && bootLog.length > 0 ? (
        <pre className="shell-scroll max-h-64 max-w-full overflow-auto text-left font-mono text-xs leading-relaxed text-muted">
          {bootLog.map((line) => (
            <span key={line} className="line-in block">
              {line}
            </span>
          ))}
        </pre>
      ) : null}
      {phase === "plan" && report ? <PlanSeal report={report} /> : null}
    </main>
  );
}

function PlanSeal({ report }: { report: Report }) {
  const missing = report.rows.find((row) => row.where === "missing")?.path ?? report.missing[0] ?? "file";
  const sealFile = useShell((state) => state.sealFile);
  const [body, setBody] = useState("");

  return (
    <section className="w-full max-w-md text-left">
      <p className="font-mono text-xs text-clay">PLAN only</p>
      <p className="mt-2 text-sm leading-relaxed text-fg">
        {report.packageName}.RZL did not unfold. Still missing. No mint, and nothing incoming will run.
      </p>
      <pre className="mt-3 overflow-x-auto font-mono text-xs leading-relaxed text-muted">{report.missing.join("\n")}</pre>
      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!body.trim() || missing.includes(" ")) return;
          void sealFile(report.packageName, missing, body);
        }}
      >
        <label className="font-mono text-xs text-muted" htmlFor="plan-body">
          Supply {missing}
        </label>
        <textarea
          id="plan-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={5}
          className="rounded-xl bg-surface-2 p-3 font-mono text-xs leading-relaxed text-fg outline-none"
        />
        <button
          type="submit"
          disabled={!body.trim()}
          className="min-h-11 rounded-xl bg-surface px-4 text-sm font-medium text-fg disabled:opacity-40"
        >
          Seal my hash
        </button>
      </form>
    </section>
  );
}
