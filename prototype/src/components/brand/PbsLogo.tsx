import { PBS_BRAND } from '../../lib/brand'

const sizes = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
} as const

export function PbsLogo({
  size = 'md',
  className = '',
}: {
  size?: keyof typeof sizes
  className?: string
}) {
  return (
    <img
      src={PBS_BRAND.logoSrc}
      alt={PBS_BRAND.shortName}
      className={`${sizes[size]} shrink-0 object-contain ${className}`}
    />
  )
}
