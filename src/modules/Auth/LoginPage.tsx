import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";

import { GlassPanel } from "@/components/GlassPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

const SOCIAL_PROVIDERS = [
  { provider: "google" as const, labelKey: "auth.signInWithGoogle" },
  { provider: "apple" as const, labelKey: "auth.signInWithApple" },
] as const;

export const LoginPage = () => {
  const { t } = useTranslation();
  const { signIn, signUp, signInWithOAuth } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") {
        await signIn({ email, password });
        await navigate({ to: "/dashboard" });
      } else {
        const result = await signUp({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        });
        if (result.needsEmailConfirmation) {
          await navigate({ to: "/verify-email", search: { email } });
        } else {
          await navigate({ to: "/dashboard" });
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleOAuth = async (provider: string) => {
    setBusy(true);
    setError(null);
    try {
      await signInWithOAuth(provider);
    } catch (err) {
      setError((err as Error).message);
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
          {mode === "signup" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="firstName">{t("auth.firstName")}</Label>
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t("auth.lastName")}</Label>
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </>
          )}
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

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">{t("auth.orContinueWith")}</span>
          </div>
        </div>

        <div className="space-y-3">
          {SOCIAL_PROVIDERS.map(({ provider, labelKey }) => (
            <Button
              key={provider}
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={busy}
              onClick={() => handleOAuth(provider)}
            >
              {provider === "google" ? (
                <svg viewBox="0 0 24 24" className="size-5">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="size-5">
                  <path
                    fill="currentColor"
                    d="M11.673 7.222c-.876 0-2.232-.996-3.66-.96-1.884.036-3.612 1.092-4.584 2.784-1.956 3.396-.504 8.412 1.404 11.172.936 1.344 2.04 2.856 3.504 2.808 1.404-.06 1.932-.912 3.636-.912 1.692 0 2.172.912 3.66.876 1.512-.024 2.472-1.368 3.396-2.724 1.068-1.56 1.512-3.072 1.536-3.156-.036-.012-2.94-1.128-2.964-4.488-.024-2.808 2.292-4.152 2.388-4.212-1.308-1.92-3.312-2.136-4.032-2.184-1.824-.144-3.36 1.008-4.248 1.008zm3.12-2.832c.78-.936 1.296-2.244 1.152-3.54-1.116.048-2.472.744-3.276 1.68-.72.828-1.344 2.148-1.176 3.42 1.236.096 2.508-.636 3.3-1.56z"
                  />
                </svg>
              )}
              {t(labelKey)}
            </Button>
          ))}
        </div>

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
