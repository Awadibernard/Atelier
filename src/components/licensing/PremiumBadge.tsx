import { Sparkles, Crown } from 'lucide-react';

interface Props {
  label?: string;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'gold' | 'teal' | 'subtle';
  className?: string;
}

export function PremiumBadge({
  label = 'Premium',
  size = 'xs',
  variant = 'gold',
  className = '',
}: Props) {
  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.2 gap-1 font-bold',
    sm: 'text-[11px] px-2 py-0.5 gap-1.5 font-bold',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-extrabold',
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  const variantClasses = {
    gold: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    teal: 'bg-teal-500/15 text-teal-400 border border-teal-500/30',
    subtle: 'bg-slate-800 text-slate-300 border border-slate-700',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full uppercase tracking-wider ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      <Crown className={iconSizes[size]} />
      <span>{label}</span>
    </span>
  );
}
