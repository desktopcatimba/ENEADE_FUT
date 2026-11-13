"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "eneade-theme";
const LANG_KEY = "eneade-language";

type Theme = "light" | "dark";
type Language = "pt" | "en";

export default function SettingsPage() {
  const [theme, setTheme] = useState<Theme>("light");
  const [language, setLanguage] = useState<Language>("pt");

  useEffect(() => {
    const storedTheme = (localStorage.getItem(THEME_KEY) as Theme | null) ?? "light";
    const storedLanguage = (localStorage.getItem(LANG_KEY) as Language | null) ?? "pt";
    setTheme(storedTheme);
    setLanguage(storedLanguage);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, language);
  }, [language]);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Configurações</p>
        <h1 className="font-display text-4xl font-bold text-turf-dark">Gerais</h1>
      </div>

      <div className="grid gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Idioma</p>
          <div className="flex flex-wrap gap-3">
            {(["pt", "en"] as Language[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLanguage(option)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  language === option
                    ? "bg-turf text-white"
                    : "border border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                {option === "pt" ? "Português" : "English"}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Tema</p>
          <div className="flex flex-wrap gap-3">
            {(["light", "dark"] as Theme[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTheme(option)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  theme === option
                    ? "bg-turf-dark text-white"
                    : "border border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                {option === "light" ? "Claro" : "Escuro"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
