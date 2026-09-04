import React, { useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';
import { validateNumericString } from './NumericInput';

interface NumberStepperProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  onInvalidChange?: (isInvalid: boolean) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  unit?: string;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export function NumberStepper({
  id,
  value,
  onChange,
  onInvalidChange,
  min = 0,
  max,
  step = 1,
  placeholder = '0',
  unit,
  className = '',
  inputClassName = '',
  ariaLabel,
  disabled = false,
}: NumberStepperProps) {
  // Local string representation to allow typing intermediate states (e.g. "0.", empty, etc.)
  const [localStr, setLocalStr] = useState<string>(() => (value === 0 && placeholder !== '0' ? '' : String(value)));
  const [isFocused, setIsFocused] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);

  // Sync from prop when value changes externally and input is not being actively typed into
  useEffect(() => {
    if (!isFocused && !isInvalid) {
      setLocalStr(value === 0 && placeholder !== '0' ? '' : String(value));
    }
  }, [value, isFocused, placeholder, isInvalid]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Handle "0 + new digit" UX fix:
    // If current field is just "0" and user starts entering a new number,
    // replace the existing 0 with the first digit typed regardless of cursor position.
    let nextStr = raw;
    if (localStr === '0') {
      if (/^[1-9]0$/.test(raw)) {
        // User clicked before 0 and typed a digit (e.g. '1' -> raw is '10')
        nextStr = raw[0];
      } else if (/^0[1-9]$/.test(raw)) {
        // User placed cursor after 0 and typed a digit (e.g. '1' -> raw is '01')
        nextStr = raw[1];
      } else if (raw.length > 2 && raw.endsWith('0') && /^\d+0$/.test(raw)) {
        // Multi-digit or paste before 0
        nextStr = raw.slice(0, -1);
      } else if (raw.length > 2 && raw.startsWith('0') && /^0\d+$/.test(raw)) {
        // Multi-digit or paste after 0
        nextStr = raw.slice(1);
      } else if (raw === '00') {
        nextStr = '0';
      } else if (raw === '.0' || raw === ',0') {
        nextStr = '0.';
      }
    }

    setLocalStr(nextStr);

    if (nextStr.trim() === '') {
      // Intermediate state while typing: keep valid state pending or reset to min on blur
      setIsInvalid(false);
      onInvalidChange?.(false);
      return;
    }

    // In-progress decimal typing state (e.g. "12." or "0.")
    const normalized = nextStr.trim().replace(',', '.');
    if (normalized.endsWith('.') && /^-?\d+\.$/.test(normalized)) {
      setIsInvalid(false);
      onInvalidChange?.(false);
      return;
    }

    const validation = validateNumericString(nextStr, min, max, true);
    if (validation.isValid && validation.parsedValue !== undefined) {
      setIsInvalid(false);
      onInvalidChange?.(false);
      onChange(validation.parsedValue);
    } else {
      setIsInvalid(true);
      onInvalidChange?.(true);
      // DO NOT call onChange(0)! Never silently convert invalid text to 0!
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (localStr.trim() === '') {
      setIsInvalid(false);
      onInvalidChange?.(false);
      onChange(min);
      setLocalStr(min === 0 && placeholder !== '0' ? '' : String(min));
      return;
    }

    // If blurred with trailing decimal point (e.g. "12.")
    let strToValidate = localStr.trim();
    if (strToValidate.endsWith('.') || strToValidate.endsWith(',')) {
      strToValidate = strToValidate.slice(0, -1);
      if (strToValidate === '') strToValidate = '0';
    }

    const validation = validateNumericString(strToValidate, min, max, true);
    if (validation.isValid && validation.parsedValue !== undefined) {
      setIsInvalid(false);
      onInvalidChange?.(false);
      onChange(validation.parsedValue);
      setLocalStr(String(validation.parsedValue));
    } else {
      // Keep invalid state active and visible
      setIsInvalid(true);
      onInvalidChange?.(true);
    }
  };

  const roundPrecision = (val: number): number => {
    return Math.round(val * 1000) / 1000;
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsInvalid(false);
    onInvalidChange?.(false);
    const current = typeof value === 'number' && !isNaN(value) ? value : min;
    const next = roundPrecision(current - step);
    const constrained = min !== undefined ? Math.max(min, next) : next;
    onChange(constrained);
    setLocalStr(String(constrained));
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsInvalid(false);
    onInvalidChange?.(false);
    const current = typeof value === 'number' && !isNaN(value) ? value : min;
    const next = roundPrecision(current + step);
    const constrained = max !== undefined ? Math.min(max, next) : next;
    onChange(constrained);
    setLocalStr(String(constrained));
  };

  const canDecrement = !disabled && (min === undefined || value > min);
  const canIncrement = !disabled && (max === undefined || value < max);

  return (
    <div
      className={`inline-flex items-center bg-white border rounded-lg shadow-2xs transition-all ${
        isInvalid
          ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
          : 'border-slate-300 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500'
      } ${disabled ? 'opacity-60 bg-slate-50' : ''} ${className}`}
    >
      <button
        type="button"
        tabIndex={-1}
        onClick={handleDecrement}
        disabled={!canDecrement}
        aria-label={ariaLabel ? `Diminuer ${ariaLabel}` : 'Diminuer'}
        className={`flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-l-md transition-colors shrink-0 active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <div className="relative flex-1 min-w-0">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={localStr}
          onChange={handleInputChange}
          onFocus={(e) => {
            setIsFocused(true);
            if (localStr === '0') {
              e.currentTarget.select();
            }
          }}
          onBlur={handleBlur}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-invalid={isInvalid}
          disabled={disabled}
          className={`w-full min-w-[48px] px-1 py-1 text-center font-mono font-bold text-slate-900 text-xs bg-transparent border-0 focus:outline-hidden ${inputClassName}`}
        />
      </div>

      {unit && (
        <span className="text-[11px] font-bold text-slate-400 pr-1 select-none shrink-0">
          {unit}
        </span>
      )}

      <button
        type="button"
        tabIndex={-1}
        onClick={handleIncrement}
        disabled={!canIncrement}
        aria-label={ariaLabel ? `Augmenter ${ariaLabel}` : 'Augmenter'}
        className={`flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-r-md transition-colors shrink-0 active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
