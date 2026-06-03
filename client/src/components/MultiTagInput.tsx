import { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './ui/Input';

interface MultiTagInputProps {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  hint?: string;
}

export function MultiTagInput({
  label,
  value,
  onChange,
  suggestions = [],
  placeholder = 'Type and press Enter to add',
  hint,
}: MultiTagInputProps) {
  const [input, setInput] = useState('');

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInput('');
  };

  const removeTag = (tag: string) => onChange(value.filter((t) => t !== tag));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && value.length) {
      removeTag(value[value.length - 1]);
    }
  };

  const availableSuggestions = suggestions.filter((s) => !value.includes(s));

  return (
    <div>
      <label className="text-sm font-medium text-brand-navy">{label}</label>
      {hint && <p className="mt-0.5 text-xs text-brand-slate">{hint}</p>}
      <div className="mt-1.5 rounded-lg border border-brand-cream bg-white p-2 focus-within:ring-2 focus-within:ring-brand-primary/40">
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-brand-soft-light px-2.5 py-0.5 text-sm text-brand-navy ring-1 ring-brand-cream"
            >
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-brand-primary">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={value.length === 0 ? placeholder : 'Add more...'}
            className="min-w-[120px] flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none"
          />
        </div>
      </div>
      {availableSuggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {availableSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-brand-cream px-2.5 py-0.5 text-xs text-brand-slate hover:border-brand-primary hover:bg-brand-soft-light hover:text-brand-primary"
            >
              <Plus className="h-3 w-3" /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const BUSINESS_DOMAIN_SUGGESTIONS = [
  'Financial Services',
  'Healthcare',
  'Retail',
  'E-commerce',
  'Manufacturing',
  'Technology',
  'B2B SaaS',
  'Logistics',
  'Energy',
  'Government',
  'Media',
  'Telecommunications',
  'Real Estate',
  'Education',
];
