export const AppLoader = ({ label }: { label?: string }) => {
  return (
    <div className="hospi-loader-overlay" role="status" aria-live="polite">
      <div className="hospi-spinner" />
      <p className="text-sm text-muted-foreground">{label ?? "Loading..."}</p>
    </div>
  );
};
