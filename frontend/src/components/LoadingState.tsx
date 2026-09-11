import { useI18n } from "@/i18n";

export function LoadingState() {
  const { t } = useI18n();

  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-state__spinner" aria-hidden="true" />
      <p className="loading-state__title">{t("loading.title")}</p>
      <p className="loading-state__hint">{t("loading.hint")}</p>
    </div>
  );
}