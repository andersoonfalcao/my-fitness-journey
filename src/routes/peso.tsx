import { createFileRoute, redirect } from "@tanstack/react-router";

// The weight screen became "Corpo" (weight, BMI and bioimpedance); old links and home-screen shortcuts land there.
export const Route = createFileRoute("/peso")({
  beforeLoad: () => {
    throw redirect({ to: "/corpo", replace: true });
  },
});
