import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";

import { GlassPanel } from "@/components/GlassPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

export const LoginPage = () => {
  const { t } = useTranslation();
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") await signIn({ email, password });
      else await signUp({ email, password });
      await navigate({ to: "/dashboard" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <GlassPanel variant="strong" className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 size-12 rounded-xl bg-primary text-primary-foreground grid place-items-center text-xl font-bold">
            H
          </div>
          <h1 className="text-2xl font-semibold">{t("auth.signInTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("auth.signInSubtitle")}</p>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("common.email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("common.password")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "signin" ? t("common.signIn") : t("common.signUp")}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {mode === "signin" ? t("auth.noAccount") : t("auth.hasAccount")}
        </button>
      </GlassPanel>
    </div>
  );
};