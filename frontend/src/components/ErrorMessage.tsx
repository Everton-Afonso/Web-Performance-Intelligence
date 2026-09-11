import { useI18n } from "@/i18n";

export interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  const { t } = useI18n();

  return (
    <div className="error-message" role="alert" aria-live="assertive">
      <p className="error-message__title">{t("error.title")}</p>
      <p className="error-message__body">{message}</p>
      {onRetry && (
        <button type="button" className="error-message__retry" onClick={onRetry}>
          {t("error.retry")}
        </button>
      )}
    </div>
  );
}