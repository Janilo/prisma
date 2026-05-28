import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/datasets/$id/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/datasets/$id/explore", params: { id: params.id } });
  },
});
