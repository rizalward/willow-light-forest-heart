import { iconSrc, readManifest } from "@/shell/inventory";
import { useShell } from "@/shell/store";
import { cn } from "@/lib/cn";

export function AppTile({
  packageName = "YABAT",
  size,
  onOpen,
}: {
  packageName?: string;
  size: "stage" | "rail";
  onOpen: () => void;
}) {
  const fs = useShell((state) => state.fs);
  const face = useShell((state) => state.face);
  const booting = useShell((state) => state.booting);
  const shownFace = packageName === "YABAT" ? face : "closed";
  const src = iconSrc(fs, packageName, shownFace);
  const manifest = readManifest(fs, packageName);
  const label = manifest?.toolbar?.label ?? manifest?.title ?? packageName;
  const stage = size === "stage";

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={booting && stage}
      aria-label={stage ? `Open ${label}` : label}
      className={cn("flex flex-col items-center gap-1 rounded-tile", stage ? "gap-3" : "w-rail")}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        className={cn(
          "object-cover",
          stage ? "size-36 rounded-tile sm:size-40" : "size-11 rounded-xl",
        )}
      />
      <span className={cn("text-muted", stage ? "text-sm font-medium tracking-wide" : "text-xs")}>{label}</span>
    </button>
  );
}
