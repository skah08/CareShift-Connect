import { useTranslation } from "react-i18next";

// Global blocking loader. Currently a CSS spinner; keep the shape stable so a
// Lottie animation can be dropped in later without touching call sites.
export const AppLoader = ({ label }: { label?: string }) => {
  const { t } = useTranslation();
  return (
    <div className="hospi-loader-overlay" role="status" aria-live="polite">
      <div className="hospi-spinner" />
      <p className="text-sm text-muted-foreground">{label ?? t("common.loading")}</p>
    </div>
  );
};