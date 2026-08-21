import React, { useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';

interface NumberStepperProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
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

  // Sync from prop when value changes externally and input is not being actively typed into
  useEffect(() => {
    if (!isFocused) {
      setLocalStr(value === 0 && placeholder !== '0' ? '' : String(value));
    }
  }, [value, isFocused, placeholder]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(',', '.');
    setLocalStr(raw);

    if (raw === '') {
      onChange(min);
      return;
    }

    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      let constrained = parsed;
      if (min !== undefined && constrained < min) {
        constrained = min;
      }
      if (max !== undefined && constrained > max) {
        constrained = max;
      }
      onChange(constrained);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (localStr === '' || isNaN(parseFloat(localStr))) {
      onChange(min);
      setLocalStr(min === 0 && placeholder !== '0' ? '' : String(min));
    } else {
      const parsed = parseFloat(localStr);
      let constrained = parsed;
      if (min !== undefined && constrained < min) constrained = min;
      if (max !== undefined && constrained > max) constrained = max;
      onChange(constrained);
      setLocalStr(constrained === 0 && placeholder !== '0' ? '' : String(constrained));
    }
  };

  const roundPrecision = (val: number): number => {
    return Math.round(val * 1000) / 1000;
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
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
      className={`inline-flex items-center bg-white border border-slate-300 rounded-lg shadow-2xs focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 transition-all ${
        disabled ? 'opacity-60 bg-slate-50' : ''
      } ${className}`}
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
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          aria-label={ariaLabel}
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
