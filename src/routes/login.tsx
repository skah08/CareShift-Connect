import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/modules/Auth/LoginPage";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in \u2014 HospiShift" },
      { name: "description", content: "Sign in to HospiShift to manage hospital shifts." },
    ],
  }),
  component: LoginPage,
});