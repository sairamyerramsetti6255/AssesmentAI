import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const variants = {
      default: 'bg-brand-primary text-white hover:opacity-90',
      secondary: 'bg-brand-cream text-brand-navy hover:opacity-90',
      outline: 'border border-brand-slate/40 bg-white text-brand-navy hover:bg-brand-soft-light',
      destructive: 'bg-red-600 text-white hover:bg-red-700',
      ghost: 'text-brand-navy hover:bg-brand-soft-light',
    };
    const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2', lg: 'px-6 py-3 text-lg' };
    return (
      <button
        ref={ref}
        className={cn('inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50', variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
