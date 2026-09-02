import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

export interface NumericInputProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  onInvalidChange?: (isInvalid: boolean, error?: string) => void;
  min?: number;
  max?: number;
  step?: number | 'any';
  placeholder?: string;
  unit?: string;
  suffix?: string;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
  disabled?: boolean;
  required?: boolean;
  allowZero?: boolean;
  align?: 'left' | 'right' | 'center';
}

/**
 * Validates whether a raw string is a valid numeric value according to optional min/max constraints.
 */
export function validateNumericString(
  rawStr: string,
  min?: number,
  max?: number,
  allowZero = true
): { isValid: boolean; parsedValue?: number; error?: string } {
  const trimmed = rawStr.trim();
  if (trimmed === '') {
    return { isValid: false, error: 'Champ obligatoire' };
  }

  // Normalize French comma to period
  const normalized = trimmed.replace(',', '.');

  // Strict numeric regex check (reject any alpha or punctuation characters like "12text", "abc", "1.2.3")
  const strictNumberRegex = /^-?\d+(\.\d+)?$/;
  if (!strictNumberRegex.test(normalized)) {
    return { isValid: false, error: 'Valeur numérique invalide' };
  }

  const parsed = parseFloat(normalized);
  if (isNaN(parsed) || !isFinite(parsed)) {
    return { isValid: false, error: 'Valeur numérique invalide' };
  }

  if (!allowZero && parsed === 0) {
    return { isValid: false, error: 'La valeur ne peut pas être égale à 0' };
  }

  if (min !== undefined && parsed < min) {
    return { isValid: false, error: `Valeur minimale : ${min}` };
  }

  if (max !== undefined && parsed > max) {
    return { isValid: false, error: `Valeur maximale : ${max}` };
  }

  return { isValid: true, parsedValue: parsed };
}

export function NumericInput({
  id,
  value,
  onChange,
  onInvalidChange,
  min = 0,
  max,
  placeholder = '0',
  unit,
  suffix,
  className = '',
  inputClassName = '',
  ariaLabel,
  disabled = false,
  required = false,
  allowZero = true,
  align = 'right',
}: NumericInputProps) {
  const displayUnit = suffix || unit;
  // Local string state to support typing intermediate states (e.g. empty, "0.", etc.)
  const [localStr, setLocalStr] = useState<string>(() => {
    if (value === 0) {
      return placeholder !== '0' && !allowZero ? '' : '0';
    }
    return String(value);
  });

  const [isFocused, setIsFocused] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isInternalChangeRef = useRef(false);

  // Sync external value when NOT focused and NOT caused by our own internal keystroke
  useEffect(() => {
    if (!isFocused && !isInternalChangeRef.current) {
      if (value === 0 && placeholder !== '0' && !allowZero) {
        setLocalStr('');
      } else {
        setLocalStr(String(value));
      }
      setErrorMessage(null);
      onInvalidChange?.(false);
    }
    isInternalChangeRef.current = false;
  }, [value, isFocused, placeholder, allowZero]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    isInternalChangeRef.current = true;

    // Handle "0 + new digit" UX fix:
    // If current field is just "0" and user types a non-zero digit (e.g. '1' -> raw is "01"),
    // replace leading "0" with that digit so it becomes "1", not "01".
    let nextStr = raw;
    if (localStr === '0' && /^0[1-9]$/.test(raw)) {
      nextStr = raw.substring(1);
    }

    setLocalStr(nextStr);

    // Empty string: allowed intermediate state while typing!
    if (nextStr.trim() === '') {
      if (required) {
        setErrorMessage('Champ obligatoire');
        onInvalidChange?.(true, 'Champ obligatoire');
      } else {
        // Clear error while user is actively backspacing to type a new number
        setErrorMessage(null);
        onInvalidChange?.(false);
      }
      return;
    }

    // Validate the content
    const validation = validateNumericString(nextStr, min, max, allowZero);

    if (validation.isValid && validation.parsedValue !== undefined) {
      setErrorMessage(null);
      onInvalidChange?.(false);
      onChange(validation.parsedValue);
    } else {
      // Keep invalid text visible and flag error
      const err = validation.error || 'Valeur numérique invalide';
      setErrorMessage(err);
      onInvalidChange?.(true, err);
      // DO NOT call onChange(0)! We prevent silent 0 conversions!
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    isInternalChangeRef.current = false;

    // If blurred while empty
    if (localStr.trim() === '') {
      if (required) {
        setErrorMessage('Champ obligatoire');
        onInvalidChange?.(true, 'Champ obligatoire');
      } else {
        const defaultVal = min !== undefined ? min : 0;
        setLocalStr(String(defaultVal));
        setErrorMessage(null);
        onInvalidChange?.(false);
        onChange(defaultVal);
      }
      return;
    }

    // Validate on blur
    const validation = validateNumericString(localStr, min, max, allowZero);
    if (validation.isValid && validation.parsedValue !== undefined) {
      setErrorMessage(null);
      onInvalidChange?.(false);
      onChange(validation.parsedValue);
      // Clean up format (e.g. normalize commas)
      setLocalStr(String(validation.parsedValue));
    } else {
      const err = validation.error || 'Valeur numérique invalide';
      setErrorMessage(err);
      onInvalidChange?.(true, err);
      // Keep the invalid string in place with red border
    }
  };

  const hasError = errorMessage !== null;

  return (
    <div className={`relative ${className}`}>
      <div
        className={`flex items-center bg-white border rounded-lg transition-all ${
          hasError
            ? 'border-red-500 ring-1 ring-red-500 focus-within:border-red-500 focus-within:ring-red-500 bg-red-50/20'
            : 'border-slate-300 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500'
        } ${disabled ? 'opacity-60 bg-slate-50' : ''}`}
      >
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={localStr}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-invalid={hasError}
          disabled={disabled}
          className={`w-full px-2.5 py-1.5 bg-transparent border-0 font-mono font-bold text-xs sm:text-sm text-slate-900 focus:outline-hidden ${
            align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
          } ${inputClassName}`}
        />

        {displayUnit && (
          <span className="text-[11px] font-bold text-slate-400 pr-2 select-none shrink-0">
            {displayUnit}
          </span>
        )}

        {hasError && (
          <span className="pr-2 text-red-500 shrink-0" title={errorMessage}>
            <AlertCircle className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      {hasError && (
        <span className="text-[10px] font-medium text-red-600 block mt-0.5 animate-in fade-in duration-150">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
