/**
 * Date Formatter Utility
 *
 * Provides global date formatting settings based on user preference
 * stored in localStorage.
 */
import { useState, useEffect } from "react";

export type DateFormatPreference = "DD-MM-YYYY" | "MM-DD-YYYY" | "YYYY-MM-DD";

const DATE_FORMAT_KEY = "default_date_format";

/** Read the current date format preference from localStorage */
export function getDateFormatPreference(): DateFormatPreference {
  const stored = localStorage.getItem(DATE_FORMAT_KEY);
  if (stored === "MM-DD-YYYY" || stored === "YYYY-MM-DD" || stored === "DD-MM-YYYY") {
    return stored as DateFormatPreference;
  }
  return "DD-MM-YYYY"; // Default fallback
}

/** Save the date format preference to localStorage */
export function setDateFormatPreference(format: DateFormatPreference): void {
  localStorage.setItem(DATE_FORMAT_KEY, format);
  // Dispatch a custom event so any listening component can react
  window.dispatchEvent(new CustomEvent("dateFormatChange", { detail: format }));
}

/** Format a date string according to preference */
export function formatDate(
  dateInput: string | Date | null | undefined,
  formatPref?: DateFormatPreference,
  includeTime: boolean = false
): string {
  if (!dateInput) return "—";
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Invalid Date";

  const pref = formatPref ?? getDateFormatPreference();

  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();

  let formattedDate = "";
  if (pref === "DD-MM-YYYY") {
    formattedDate = `${day}-${month}-${year}`;
  } else if (pref === "MM-DD-YYYY") {
    formattedDate = `${month}-${day}-${year}`;
  } else if (pref === "YYYY-MM-DD") {
    formattedDate = `${year}-${month}-${day}`;
  }

  if (includeTime) {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${formattedDate} ${hours}:${minutes}`;
  }

  return formattedDate;
}

/** React hook: returns the current date format preference and updates on change */
export function useDateFormatPreference(): DateFormatPreference {
  const [format, setFormat] = useState<DateFormatPreference>(getDateFormatPreference);

  useEffect(() => {
    const handler = (e: Event) => {
      setFormat((e as CustomEvent<DateFormatPreference>).detail);
    };
    window.addEventListener("dateFormatChange", handler);
    return () => window.removeEventListener("dateFormatChange", handler);
  }, []);

  return format;
}
