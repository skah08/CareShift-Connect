import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/modules/Auth/LoginPage";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in \u2014 Hospishift" },
      { name: "description", content: "Sign in to Hospishift to manage hospital shifts." },
    ],
  }),
  component: LoginPage,
});