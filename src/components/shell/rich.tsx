import { useShell } from "@/shell/store";
import type { Part } from "@/shell/types";

export function Rich({ parts }: { parts: Part[] }) {
  const submit = useShell((state) => state.submit);
  return (
    <div className="text-sm leading-relaxed text-pretty">
      {parts.map((part, index) => {
        if (part.t === "text") return <span key={index}>{part.s}</span>;
        if (part.t === "cmd") {
          return (
            <button
              key={index}
              type="button"
              className="mx-0.5 inline-flex min-h-6 items-center rounded-md bg-chip px-1.5 align-baseline font-mono text-xs text-fg"
              onClick={() => void submit(part.name)}
            >
              {part.name === "menu" ? "MENU" : part.name}
            </button>
          );
        }
        return (
          <pre
            key={index}
            className="mt-2 max-w-full overflow-x-auto rounded-lg bg-chip p-3 font-mono text-xs leading-relaxed text-fg"
          >
            {part.s}
          </pre>
        );
      })}
    </div>
  );
}
