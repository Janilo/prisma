import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/results/")({
  beforeLoad: () => {
    throw redirect({ to: "/results/decomp" });
  },
});
