import { createFileRoute } from "@tanstack/react-router";
import { ShellApp } from "@/components/shell/shell-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <ShellApp />;
}
