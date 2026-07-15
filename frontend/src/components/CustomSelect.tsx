import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  accentColor?: string; // e.g. 'blue', 'indigo'
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  icon,
  accentColor = 'blue',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const ringClass = accentColor === 'indigo'
    ? 'focus-within:ring-indigo-500/40 focus-within:border-indigo-500'
    : 'focus-within:ring-blue-500/40 focus-within:border-blue-500';

  const checkClass = accentColor === 'indigo'
    ? 'text-indigo-500'
    : 'text-blue-500';

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className={`w-full flex items-center gap-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3 text-left transition-all ring-2 ring-transparent ${ringClass} focus:outline-none`}
      >
        {icon && (
          <span className="shrink-0 text-neutral-400 dark:text-neutral-500">
            {icon}
          </span>
        )}
        <span className={`flex-1 text-sm truncate ${selected ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-500'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm border border-neutral-200/80 dark:border-neutral-700/80 rounded-2xl shadow-xl shadow-neutral-900/10 dark:shadow-black/30 overflow-hidden">
          {/* Header */}
          {placeholder && (
            <div className="px-3 pt-3 pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                {placeholder}
              </p>
            </div>
          )}
          <div className="p-1.5 space-y-0.5 max-h-60 overflow-y-auto">
            {options.map(option => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors text-left ${
                    isSelected
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium'
                      : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {option.icon && (
                    <span className="shrink-0">{option.icon}</span>
                  )}
                  <span className="flex-1 truncate">{option.label}</span>
                  {isSelected && (
                    <Check className={`w-4 h-4 shrink-0 ${checkClass}`} />
                  )}
                </button>
              );
            })}
            {options.length === 0 && (
              <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-4">
                No options available
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
