/**
 * Unit Preference Utility
 *
 * The database stores all mass values in kilograms (kg).
 * Managers can choose to display values in Litres (L) via Settings.
 *
 * Conversion: 1 kg = 1 / PAINT_DENSITY litres
 * Standard paint density assumption: ~1.2 kg/L (typical for solvent/water-based paint).
 */

export type UnitPreference = 'kg' | 'L'

const UNIT_KEY = 'default_unit'
const PAINT_DENSITY_KG_PER_LITRE = 1.2 // kg per litre

/** Read the current unit preference from localStorage */
export function getUnitPreference(): UnitPreference {
  const stored = localStorage.getItem(UNIT_KEY)
  return stored === 'L' ? 'L' : 'kg'
}

/** Save the unit preference to localStorage */
export function setUnitPreference(unit: UnitPreference): void {
  localStorage.setItem(UNIT_KEY, unit)
  // Dispatch a custom event so any listening component can react
  window.dispatchEvent(new CustomEvent('unitPreferenceChange', { detail: unit }))
}

/** Convert a kg value to the display value in the current unit */
export function toDisplayValue(kg: number | string, unit?: UnitPreference): number {
  const numericKg = Number(kg) || 0
  const pref = unit ?? getUnitPreference()
  if (pref === 'L') {
    return parseFloat((numericKg / PAINT_DENSITY_KG_PER_LITRE).toFixed(2))
  }
  return parseFloat(numericKg.toFixed(2))
}

/** Return the unit label string ("kg" or "L") */
export function unitLabel(unit?: UnitPreference): string {
  return unit ?? getUnitPreference()
}

/** Format a kg value as a display string with unit, e.g. "83.33 L" or "100 kg" */
export function formatUnit(kg: number | string | null | undefined, unit?: UnitPreference): string {
  if (kg === null || kg === undefined || kg === '') return '—'
  const pref = unit ?? getUnitPreference()
  const val = toDisplayValue(kg, pref)
  return `${val}${pref}`
}

/** Convert a display value back to base raw kg for backend payload */
export function fromDisplayValue(displayVal: number | string, unit?: UnitPreference): number {
  const numericVal = Number(displayVal) || 0
  const pref = unit ?? getUnitPreference()
  if (pref === 'L') {
    return parseFloat((numericVal * PAINT_DENSITY_KG_PER_LITRE).toFixed(2))
  }
  return parseFloat(numericVal.toFixed(2))
}

/** React hook: returns the current unit preference and updates on change */
import { useState, useEffect } from 'react'
export function useUnitPreference(): UnitPreference {
  const [unit, setUnit] = useState<UnitPreference>(getUnitPreference)

  useEffect(() => {
    const handler = (e: Event) => {
      setUnit((e as CustomEvent<UnitPreference>).detail)
    }
    window.addEventListener('unitPreferenceChange', handler)
    return () => window.removeEventListener('unitPreferenceChange', handler)
  }, [])

  return unit
}
