import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/cassette")({
  component: () => <Navigate to="/dashboard" replace />,
});
