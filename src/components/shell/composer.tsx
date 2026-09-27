import { AudioLines, Mic, Plus } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { knownCommands } from "@/shell/host";
import { activeThread, useShell } from "@/shell/store";
import { partsToText, placeholderText } from "@/shell/template";

type Rec = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type RecCtor = new () => Rec;

function recognitionCtor(): RecCtor | null {
  const w = window as Window & { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function Composer() {
  const settings = useShell((state) => state.settings);
  const submit = useShell((state) => state.submit);
  const paletteOpen = useShell((state) => state.paletteOpen);
  const setPalette = useShell((state) => state.setPalette);
  const busy = useShell((state) => state.busy);
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState("");
  const recRef = useRef<Rec | null>(null);

  useEffect(() => {
    return () => recRef.current?.stop();
  }, []);

  function send(text: string) {
    const next = text.trim();
    if (!next) return;
    setValue("");
    setPalette(false);
    setHint("");
    void submit(next);
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
    const state = useShell.getState();
    const thread = activeThread(state);
    const last = [...thread.messages].reverse().find((message) => message.role === "host");
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

  return (
    <div className="composer-pad px-3 md:px-6">
      {hint ? <p className="mb-2 font-mono text-xs text-muted">{hint}</p> : null}
      <form
        className="relative flex items-center gap-1 rounded-full bg-surface-2 py-1 pr-1 pl-1"
        onSubmit={(event) => {
          event.preventDefault();
          send(value);
        }}
      >
        <IconButton label="Commands" onClick={() => setPalette(!paletteOpen)}>
          <Plus className="size-5" />
        </IconButton>
        {paletteOpen ? (
          <div className="absolute bottom-14 left-0 z-20 max-h-64 w-56 overflow-auto rounded-2xl border border-line bg-surface-2 p-1">
            {commands.map((name) => (
              <button
                key={name}
                type="button"
                className="flex min-h-11 w-full items-center rounded-xl px-3 text-left font-mono text-sm text-fg"
                onClick={() => send(name)}
              >
                {name}
              </button>
            ))}
          </div>
        ) : null}
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={busy}
          className="min-w-0 flex-1 bg-transparent px-2 py-2 text-base text-fg outline-none placeholder:text-faint"
        />
        <IconButton label={listening ? "Stop listening" : "Listen"} onClick={toggleListen} hot={listening}>
          <Mic className="size-5" />
        </IconButton>
        <IconButton label="Speak last reply" onClick={speakLast}>
          <AudioLines className="size-5" />
        </IconButton>
      </form>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  hot = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  hot?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full text-fg",
        hot ? "bg-clay text-fg" : "hover:bg-surface",
      )}
    >
      {children}
    </button>
  );
}
