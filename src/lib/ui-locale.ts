"use client";

import { useEffect, useMemo, useState } from "react";

export type UiLocale = "en" | "ru";
const UI_LOCALE_STORAGE_KEY = "sakura-ui-locale";
const UI_LOCALE_CHANGE_EVENT = "sakura-ui-locale-change";

const hasRussianLanguage = () => {
  if (typeof navigator === "undefined") {
    return false;
  }

  const languageCandidates = [navigator.language, ...(navigator.languages ?? [])]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.toLowerCase());

  return languageCandidates.some((value) => value.startsWith("ru"));
};

const isWindowsPlatform = () => {
  if (typeof navigator === "undefined") {
    return false;
  }

  const navigatorWithUserAgentData = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const userAgentPlatform =
    typeof navigatorWithUserAgentData.userAgentData?.platform === "string"
      ? navigatorWithUserAgentData.userAgentData.platform.toLowerCase()
      : "";
  const platform =
    typeof navigator.platform === "string" ? navigator.platform.toLowerCase() : "";
  const userAgent =
    typeof navigator.userAgent === "string" ? navigator.userAgent.toLowerCase() : "";

  return (
    userAgentPlatform.includes("windows") ||
    platform.includes("win") ||
    userAgent.includes("windows")
  );
};

export const detectUiLocale = (): UiLocale =>
  isWindowsPlatform() && hasRussianLanguage() ? "ru" : "en";

export const translateByLocale = (locale: UiLocale, englishText: string, russianText: string) =>
  locale === "ru" ? russianText : englishText;

export const readPreferredUiLocale = (): UiLocale | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedLocale = window.localStorage.getItem(UI_LOCALE_STORAGE_KEY);
    return storedLocale === "ru" || storedLocale === "en" ? storedLocale : null;
  } catch {
    return null;
  }
};

const emitLocaleChange = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(UI_LOCALE_CHANGE_EVENT));
};

export const setPreferredUiLocale = (locale: UiLocale) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale);
  } catch {}

  emitLocaleChange();
};

export const resolveUiLocale = (): UiLocale => readPreferredUiLocale() ?? detectUiLocale();

export const useUiLocale = () => {
  const [locale, setLocale] = useState<UiLocale>("en");

  useEffect(() => {
    const syncLocale = () => {
      setLocale(resolveUiLocale());
    };

    syncLocale();
    window.addEventListener(UI_LOCALE_CHANGE_EVENT, syncLocale);
    window.addEventListener("storage", syncLocale);

    return () => {
      window.removeEventListener(UI_LOCALE_CHANGE_EVENT, syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  return locale;
};

export const useLocaleText = () => {
  const locale = useUiLocale();

  const t = useMemo(
    () => (englishText: string, russianText: string) =>
      translateByLocale(locale, englishText, russianText),
    [locale]
  );

  return { locale, t };
};
