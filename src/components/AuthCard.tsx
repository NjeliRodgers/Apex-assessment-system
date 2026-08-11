import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface AuthCardProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AuthCard: React.FC<AuthCardProps> = ({ eyebrow, title, subtitle, icon, children, footer }) => {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-fog"
      style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #d7e6dc 1px, transparent 0)',
        backgroundSize: '22px 22px'
      }}
    >
      <div className="w-full max-w-md bg-white rounded-lg border border-line shadow-[0_1px_2px_rgba(15,85,53,0.06),0_12px_28px_-10px_rgba(15,85,53,0.18)] overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-brand-600 via-brand-500 to-mint-400 scan-bar" />

        <div className="p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 mx-auto flex items-center justify-center text-white shadow-sm shadow-brand-900/20">
              {icon || <ShieldCheck className="h-6 w-6" />}
            </div>
            <span className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase block">
              {eyebrow}
            </span>
            <h1 className="font-display text-xl font-bold text-ink">{title}</h1>
            {subtitle && <p className="text-xs text-muted leading-relaxed">{subtitle}</p>}
          </div>

          {children}

          {footer && <div className="pt-1">{footer}</div>}
        </div>
      </div>
    </div>
  );
};