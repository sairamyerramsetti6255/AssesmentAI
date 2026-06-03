import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn('flex h-10 w-full rounded-lg border border-brand-cream bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40', className)}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn('flex min-h-[80px] w-full rounded-lg border border-brand-cream bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40', className)}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn('flex h-10 w-full rounded-lg border border-brand-cream bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40', className)}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';

export const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn('text-sm font-medium text-brand-navy', className)} {...props} />
);
