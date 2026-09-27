import { useEffect, useRef } from "react";
import { Rich } from "@/components/shell/rich";
import { activeThread, useShell } from "@/shell/store";

export function Transcript() {
  const threads = useShell((state) => state.threads);
  const activeId = useShell((state) => state.activeId);
  const thread = activeThread({ threads, activeId });
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.messages.length, activeId]);

  return (
    <div className="shell-scroll min-h-0 overflow-y-auto">
      <div className="flex flex-col gap-3 px-4 py-4 md:px-8 md:py-6">
        {thread.messages.map((message) => {
          const mine = message.role === "operator";
          const text = message.parts.map((part) => (part.t === "text" ? part.s : "")).join("");
          return (
            <div key={message.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  mine
                    ? "line-in max-w-xs rounded-bubble bg-user px-4 py-2 text-sm leading-relaxed text-user-fg"
                    : "line-in min-w-0 max-w-xl rounded-bubble bg-surface px-4 py-3 text-fg"
                }
              >
                {mine ? <p className="text-sm leading-relaxed">{text}</p> : <Rich parts={message.parts} />}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}
