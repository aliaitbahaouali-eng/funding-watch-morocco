import { classNames } from '@/lib/utils.js';

export default function GlassCard({ children, className = '', dark = false }) {
  return (
    <div className={`${dark ? 'glass-dark' : 'glass'} ${className}`}>
      {children}
    </div>
  );
}
