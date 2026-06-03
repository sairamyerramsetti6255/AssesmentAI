import { Link } from 'react-router-dom';
import logoSrc from '@/assets/pbs-pcr.png';
import { cn } from '@/lib/utils';

type LogoVariant = 'sidebar' | 'light' | 'compact' | 'hero';

interface AppLogoProps {
  variant?: LogoVariant;
  showText?: boolean;
  className?: string;
  to?: string;
  onNavigate?: () => void;
  /** When false, render logo only (no navigation link) */
  linked?: boolean;
}

const IMG_SIZE: Record<LogoVariant, string> = {
  compact: 'h-9 w-9',
  light: 'h-10 w-10',
  sidebar: 'h-10 w-10',
  hero: 'h-12 w-12',
};

export function AppLogo({
  variant = 'light',
  showText = true,
  className,
  to = '/dashboard',
  onNavigate,
  linked = true,
}: AppLogoProps) {
  const isDark = variant === 'sidebar' || variant === 'hero';

  const content = (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img
        src={logoSrc}
        alt="Assessment ai logo"
        className={cn(
          IMG_SIZE[variant],
          'shrink-0 rounded-xl object-contain',
          isDark ? 'bg-white p-1 shadow-sm ring-1 ring-white/25' : 'bg-white p-0.5 ring-1 ring-brand-cream shadow-sm',
        )}
      />
      {showText && (
        <div className="min-w-0 leading-tight">
          <span
            className={cn(
              'block font-bold tracking-tight',
              variant === 'hero' ? 'text-xl' : 'text-sm',
              isDark ? 'text-white' : 'text-brand-navy',
            )}
          >
            Assessment{' '}
            <span className={isDark ? 'text-brand-cream' : 'text-brand-primary'}>ai</span>
          </span>
          {variant !== 'compact' && variant !== 'hero' && (
            <span className={cn('block text-[10px] font-medium tracking-wide text-brand-slate')}>
              AI Readiness
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (!linked) return content;

  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="inline-flex rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
    >
      {content}
    </Link>
  );
}
