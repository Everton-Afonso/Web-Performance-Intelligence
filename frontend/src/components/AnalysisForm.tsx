import { useMemo, useState, type FormEvent } from "react";
import type { Strategy } from "@/types/analysis";
import { useI18n } from "@/i18n";

export interface AnalysisFormProps {
  /** Mirrors RF-12: true while an analysis is running */
  busy: boolean;
  initialUrl?: string;
  initialStrategy?: Strategy;
  onSubmit: (url: string, strategy: Strategy) => void;
}

const URL_PATTERN = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

function validateClientSide(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "form.error.min";
  }
  if (!URL_PATTERN.test(trimmed)) {
    return "form.error.invalid";
  }
  return null;
}

export function AnalysisForm({
  busy,
  initialUrl = "",
  initialStrategy = "mobile",
  onSubmit
}: AnalysisFormProps) {
  const { t } = useI18n();
  const [url, setUrl] = useState(initialUrl);
  const [strategy, setStrategy] = useState<Strategy>(initialStrategy);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const canSubmit = useMemo(() => !busy, [busy]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateClientSide(url);
    if (error) {
      setErrorKey(error);
      return;
    }
    setErrorKey(null);
    onSubmit(url.trim(), strategy);
  }

  return (
    <form className="analysis-form" onSubmit={handleSubmit} noValidate>
      <div className="analysis-form__field">
        <label htmlFor="url-input" className="analysis-form__label">
          {t("form.label.url")}
        </label>
        <input
          id="url-input"
          className="analysis-form__input"
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder={t("form.placeholder.url")}
          value={url}
          disabled={busy}
          aria-invalid={errorKey !== null}
          aria-describedby={errorKey ? "url-error" : undefined}
          onChange={(e) => {
            setUrl(e.target.value);
            if (errorKey) setErrorKey(null);
          }}
        />
        {errorKey && (
          <p id="url-error" className="analysis-form__error" role="alert">
            {t(errorKey)}
          </p>
        )}
      </div>

      <fieldset className="analysis-form__strategy">
        <legend className="analysis-form__label">{t("form.label.strategy")}</legend>
        <div className="analysis-form__options">
          <label className="analysis-form__option">
            <input
              type="radio"
              name="strategy"
              value="mobile"
              checked={strategy === "mobile"}
              disabled={busy}
              onChange={() => setStrategy("mobile")}
            />
            <span>{t("form.strategy.mobile")}</span>
          </label>
          <label className="analysis-form__option">
            <input
              type="radio"
              name="strategy"
              value="desktop"
              checked={strategy === "desktop"}
              disabled={busy}
              onChange={() => setStrategy("desktop")}
            />
            <span>{t("form.strategy.desktop")}</span>
          </label>
        </div>
      </fieldset>

      <button type="submit" className="analysis-form__submit" disabled={!canSubmit}>
        {busy ? t("form.submit.loading") : t("form.submit")}
      </button>
    </form>
  );
}