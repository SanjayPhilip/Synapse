import { type ReactNode, useState, useRef } from 'react';

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full ${maxWidth} card max-h-[90vh] overflow-y-auto animate-scale-in`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h3 id="modal-title" className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none" aria-label="Close">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function FormModal<T extends Record<string, any>>({ open, onClose, title, initialValues, onSubmit, children, maxWidth = 'max-w-lg', submitText = 'Submit', cancelText = 'Cancel', loading = false }: {
  open: boolean;
  onClose: () => void;
  title: string;
  initialValues?: Partial<T>;
  onSubmit: (values: T) => void | Promise<void>;
  children: (field: { register: (name: keyof T) => React.InputHTMLAttributes<HTMLInputElement> & { value: any; onChange: any }; errors: Record<keyof T, string>; setValue: (name: keyof T, value: any) => void; values: T; }) => ReactNode;
  maxWidth?: string;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
}) {
  const [values, setValues] = useState<T>({ ...initialValues } as T);
  const [errors, setErrors] = useState<Record<keyof T, string>>({} as Record<keyof T, string>);

  const register = (name: keyof T) => ({
    value: values[name] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValues(prev => ({ ...prev, [name]: e.target.value }));
      if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    },
  });

  const setValue = (name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(values);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full ${maxWidth} card max-h-[90vh] overflow-y-auto animate-scale-in`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {children({ register, errors, setValue, values })}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="btn-ghost">{cancelText}</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Badge({ children, color = 'slate' }: { children: ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-primary-100 text-primary-700',
    green: 'bg-success-100 text-success-700',
    amber: 'bg-warning-100 text-warning-700',
    red: 'bg-danger-100 text-danger-700',
    teal: 'bg-accent-100 text-accent-700',
  };
  return <span className={`badge ${colors[color] || colors.slate}`}>{children}</span>;
}

export function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : score >= 25 ? '#f97316' : '#ef4444';
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color }}>{score.toFixed(0)}</span>
        <span className="text-xs text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

export function ProgressBar({ value, max = 100, color = 'primary' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const colors: Record<string, string> = {
    primary: 'bg-primary-500',
    green: 'bg-success-500',
    amber: 'bg-warning-500',
    red: 'bg-danger-500',
  };
  return (
    <div className="h-2 w-full rounded-full bg-slate-200" data-testid="progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-2 rounded-full ${colors[color] || colors.primary} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-slate-300">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-700">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Toast({ message, type = 'success', onClose }: { message: string; type?: string; onClose: () => void }) {
  const colors: Record<string, string> = {
    success: 'bg-success-600',
    error: 'bg-danger-600',
    info: 'bg-primary-600',
  };
  return (
    <div className="fixed bottom-6 right-6 z-[60] animate-slide-up">
      <div className={`flex items-center gap-3 rounded-lg ${colors[type] || colors.success} px-4 py-3 text-white shadow-lg`}>
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="text-white/80 hover:text-white">&times;</button>
      </div>
    </div>
  );
}

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div
      data-testid="spinner"
      className="animate-spin rounded-full border-2 border-slate-200 border-t-primary-600"
      style={{ width: size, height: size }}
    />
  );
}

export function ToggleSwitch({ checked, onChange, disabled, title }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      title={title}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-cyan-600' : 'bg-slate-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  );
}

export function Avatar({ src, alt, fallback, size = 40 }: {
  src?: string | null;
  alt?: string;
  fallback?: ReactNode;
  size?: number;
}) {
  const [error, setError] = useState(false);
  const initials = fallback || (alt ? alt.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?');
  const style = { width: size, height: size } as React.CSSProperties;

  if (!src || error) {
    return (
      <div className="flex items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-500/30 font-medium text-cyan-400"
           style={style}>
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || ''}
      onError={() => setError(true)}
      className="rounded-full object-cover"
      style={style}
    />
  );
}

export function ConfirmModal({ open, onClose, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger', onConfirm }: {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
}) {
  if (!open) return null;
  const confirmClass = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-primary-600 hover:bg-primary-700';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md card max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5">
          <p className="text-sm text-slate-600 mb-5">{message}</p>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-ghost">{cancelText}</button>
            <button onClick={() => { onConfirm(); onClose(); }} className={`btn-primary ${confirmClass}`}>{confirmText}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
      <ol className="flex items-center gap-1">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-1">
            {index > 0 && <span className="text-slate-400">/</span>}
            {item.href && index < items.length - 1 ? (
              <a href={item.href} className="hover:text-white transition-colors">{item.label}</a>
            ) : (
              <span className={index === items.length - 1 ? 'font-medium text-white' : ''}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Tooltip({ children, content, position = 'top' }: {
  children: ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}) {
  const [visible, setVisible] = useState(false);
  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };
  return (
    <div className="relative inline-block" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <div className={`absolute ${positions[position]} z-10 px-2 py-1 text-xs font-medium text-white bg-slate-900 rounded shadow-lg whitespace-nowrap animate-fade-in`}>
          {content}
        </div>
      )}
    </div>
  );
}

export function Skeleton({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: 'text' | 'card' | 'circular' | 'rectangular' }) {
  return (
    <div
      className={`animate-pulse bg-slate-700/50 rounded ${className}`}
      {...props}
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="h-32 w-full bg-slate-700/50 rounded-xl mb-4" />
      <div className="space-y-3">
        <div className="h-6 w-3/4 bg-slate-700/50 rounded" />
        <div className="h-4 w-1/2 bg-slate-700/50 rounded" />
        <div className="h-4 w-1/3 bg-slate-700/50 rounded" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs, className = '', variant = 'default' }: {
  value: T;
  onChange: (value: T) => void;
  tabs: Array<{ value: T; label: string; icon?: ReactNode; count?: number }>;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
}) {
  const baseStyles = 'flex items-center gap-1';
  const variantStyles = {
    default: 'bg-slate-800/50 rounded-xl p-1',
    pills: '',
    underline: 'border-b border-slate-700/50 pb-1',
  };
  const tabStyles = {
    default: (active: boolean) => `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
      active ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
    }`,
    pills: (active: boolean) => `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
      active ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
    }`,
    underline: (active: boolean) => `px-4 py-2 rounded-t-lg text-sm font-medium transition-all border-b-2 ${
      active ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-white'
    }`,
  };

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${className}`} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={tabStyles[variant](value === tab.value)}
        >
          {tab.icon && <span className="flex items-center gap-2">{tab.icon}</span>}
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-slate-700/50 text-slate-300">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Accordion({ items, className = '', allowMultiple = false }: {
  items: Array<{ title: string; content: ReactNode; icon?: ReactNode; disabled?: boolean }>;
  className?: string;
  allowMultiple?: boolean;
}) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggle = (title: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        if (!allowMultiple) next.clear();
        next.add(title);
      }
      return next;
    });
  };

  const ChevronIcon = ({ open }: { open: boolean }) => (
    <svg className={`h-5 w-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item, index) => {
        const isOpen = openItems.has(item.title);
        return (
          <div key={index} className="rounded-xl border border-slate-700/50 bg-slate-800/30 overflow-hidden">
            <button
              onClick={() => !item.disabled && toggle(item.title)}
              disabled={item.disabled}
              className="w-full flex items-center justify-between gap-4 p-4 text-left"
            >
              <div className="flex items-center gap-3">
                {item.icon && <span className="text-cyan-400">{item.icon}</span>}
                <span className="font-medium text-white">{item.title}</span>
                {item.disabled && <span className="text-xs text-slate-500">(disabled)</span>}
              </div>
              <ChevronIcon open={isOpen} />
            </button>
            {isOpen && (
              <div className="border-t border-slate-700/50 p-4 animate-slide-down">
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Select<T extends string>({ value, onChange, options, placeholder, className = '', disabled, error, label, required }: {
  value: T | '';
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; disabled?: boolean }>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}) {
  const inputClass = "w-full rounded-lg border bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-300 mb-1">{label} {required && <span className="text-red-400">*</span>}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
        className={`${inputClass} ${error ? 'border-red-500' : ''}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? 'select-error' : undefined}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
        ))}
      </select>
      {error && <p id="select-error" className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}

export function TagInput({ value, onChange, placeholder = 'Add tags...', className = '', maxTags, suggestions = [], disabled }: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  maxTags?: number;
  suggestions?: string[];
  disabled?: boolean;
}) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) return;
    if (maxTags && value.length >= maxTags) return;
    onChange([...value, trimmed]);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleAddTag(suggestion);
    setShowSuggestions(false);
  };

  const filteredSuggestions = suggestions.filter(s =>
    !value.includes(s) && s.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className={className}>
      <div
        className={`flex flex-wrap gap-2 rounded-lg border bg-slate-800/50 px-3 py-2 text-sm focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500 ${disabled ? 'opacity-50' : ''}`}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {value.map((tag, index) => (
          <span key={index} className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 px-3 py-0.5 text-sm text-cyan-400">
            {tag}
            {!disabled && <button type="button" onClick={(e) => { e.stopPropagation(); onChange(value.filter((_, i) => i !== index)); }} className="hover:text-cyan-300">×</button>}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] bg-transparent text-white placeholder-slate-500 focus:outline-none"
          disabled={disabled || (maxTags && value.length >= maxTags)}
        />
      </div>
      {showSuggestions && filteredSuggestions.length > 0 && !disabled && (
        <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-lg">
          {filteredSuggestions.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => handleSuggestionClick(s)}
              className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function RadioGroup<T extends string>({ value, onChange, options, label, error, disabled, name, className = '', orientation = 'vertical' }: {
  value: T | '';
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; description?: string; disabled?: boolean }>;
  label: string;
  error?: string;
  disabled?: boolean;
  name?: string;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}) {
  const groupName = name || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <fieldset disabled={disabled} className={className} role="radiogroup" aria-labelledby={`${groupName}-legend`} aria-invalid={error ? 'true' : undefined}>
      <legend id={`${groupName}-legend`} className="block text-sm font-medium text-slate-300 mb-2">
        {label}
      </legend>
      <div className={orientation === 'horizontal' ? 'flex flex-wrap gap-3' : 'space-y-2'}>
        {options.map((opt) => {
          const id = `${groupName}-${opt.value}`;
          const checked = value === opt.value;
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors cursor-pointer ${
                checked
                  ? 'border-cyan-500/50 bg-cyan-500/10'
                  : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'
              } ${(disabled || opt.disabled) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2">
                {checked && <span className="h-2 w-2 rounded-full bg-cyan-500" />}
                <span className={`absolute h-4 w-4 rounded-full border-2 ${checked ? 'border-cyan-500' : 'border-slate-500'}`} />
              </span>
              <input
                type="radio"
                id={id}
                name={groupName}
                value={opt.value}
                checked={checked}
                disabled={disabled || opt.disabled}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              <div className="min-w-0">
                <span className="font-medium text-white">{opt.label}</span>
                {opt.description && <p className="mt-0.5 text-xs text-slate-400">{opt.description}</p>}
              </div>
            </label>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </fieldset>
  );
}

export function Slider({ value, onChange, min = 0, max = 100, step = 1, label, showValue = true, unit = '', error, disabled, className = '', id }: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  unit?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}) {
  const sliderId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : 'slider');
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && <label htmlFor={sliderId} className="block text-sm font-medium text-slate-300">{label}</label>}
          {showValue && (
            <span className="text-sm font-mono font-semibold text-cyan-400">{value}{unit}</span>
          )}
        </div>
      )}
      <div className="relative">
        <input
          type="range"
          id={sliderId}
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-700 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          style={{
            background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${pct}%, #334155 ${pct}%, #334155 100%)`,
          }}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={`${value}${unit}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${sliderId}-error` : undefined}
        />
      </div>
      {(min !== undefined && max !== undefined) && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-500">{min}{unit}</span>
          <span className="text-xs text-slate-500">{max}{unit}</span>
        </div>
      )}
      {error && <p id={`${sliderId}-error`} className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}

export function DatePicker({ value, onChange, label, placeholder, error, disabled, required, min, max, className = '', id }: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  min?: string;
  max?: string;
  className?: string;
  id?: string;
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : 'date-picker');
  const inputClass = "w-full rounded-lg border bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-300 mb-1">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="date"
          id={inputId}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} ${error ? 'border-red-500' : ''} pr-10`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
      </div>
      {error && <p id={`${inputId}-error`} className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}

export function FileUpload({ onFile, accept, maxSizeMB = 5, label, description, error, disabled, uploading, uploadProgress, className = '' }: {
  onFile: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  uploading?: boolean;
  uploadProgress?: number;
  className?: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState('');

  const validate = (file: File): boolean => {
    setLocalError('');
    if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
      setLocalError(`File exceeds ${maxSizeMB}MB limit`);
      return false;
    }
    if (accept) {
      const allowed = accept.split(',').map(s => s.trim().toLowerCase());
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const mime = file.type;
      const match = allowed.some(a => a === ext || mime.startsWith(a.replace('.', '').replace('*', '')));
      if (!match) {
        setLocalError(`File type not allowed. Accepted: ${accept}`);
        return false;
      }
    }
    return true;
  };

  const handleFile = (file: File) => {
    if (validate(file)) onFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !uploading) setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  const displayError = localError || error;

  return (
    <div className={className}>
      {label && <h3 className="text-base font-semibold text-white">{label}</h3>}
      {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
          disabled || uploading ? 'pointer-events-none opacity-50' : ''
        } ${
          dragOver
            ? 'border-cyan-400 bg-cyan-500/10'
            : displayError
              ? 'border-red-500/50 bg-red-500/5'
              : 'border-slate-700 hover:border-cyan-500/50 hover:bg-cyan-500/5'
        }`}
      >
        {uploading ? (
          <div className="w-full max-w-xs">
            <div className="flex items-center gap-2 mb-2">
              <Spinner size={20} />
              <span className="text-sm font-medium text-slate-300">Uploading...</span>
              <span className="text-sm text-slate-500 ml-auto">{uploadProgress ?? 0}%</span>
            </div>
            <ProgressBar value={uploadProgress ?? 0} color="primary" />
          </div>
        ) : (
          <>
            <svg className="h-10 w-10 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            <span className="mt-2 text-sm font-medium text-slate-300">
              {dragOver ? 'Drop your file here' : 'Click to upload or drag & drop'}
            </span>
            {accept && <span className="text-xs text-slate-500">{accept} · max {maxSizeMB}MB</span>}
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          disabled={disabled || uploading}
          className="hidden"
        />
      </label>
      {displayError && <p className="mt-2 text-sm text-red-400">{displayError}</p>}
    </div>
  );
}
