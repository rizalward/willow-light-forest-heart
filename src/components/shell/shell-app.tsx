import { useEffect } from "react";
import { AdaptPanel } from "@/components/shell/adapt-panel";
import { ClosedStage } from "@/components/shell/closed-stage";
import { MenuPanel } from "@/components/shell/menu-panel";
import { OpenShell } from "@/components/shell/open-shell";
import { useShell } from "@/shell/store";
import { buildPackageZip, saveBlob } from "@/shell/zip";

export function ShellApp() {
  const phase = useShell((state) => state.phase);
  const boot = useShell((state) => state.boot);
  const nonce = useShell((state) => state.downloadNonce);

  useEffect(() => {
    void boot();
  }, [boot]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") useShell.getState().closeOverlays();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (nonce === 0) return;
    const fs = useShell.getState().fs;
    void buildPackageZip(fs)
      .then((blob) => saveBlob(blob, "YABAT.RZL.zip"))
      .catch(() => {
        const anchor = document.createElement("a");
        anchor.href = "/downloads/YABAT.RZL.zip";
        anchor.download = "YABAT.RZL.zip";
        anchor.click();
      });
  }, [nonce]);

  return (
    <>
      {phase === "open" ? <OpenShell /> : <ClosedStage />}
      <MenuPanel />
      <AdaptPanel />
    </>
  );
}
