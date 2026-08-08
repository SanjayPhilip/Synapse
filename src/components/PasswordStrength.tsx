import { type ReactNode } from 'react';

export interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-cyan-500', 'bg-emerald-500'];
  const label = score > 0 ? levels[Math.min(score - 1, 4)] : '';
  const color = score > 0 ? colors[Math.min(score - 1, 4)] : '';

  return (
    <div className="pt-1" data-testid="password-strength">
      <div className="flex gap-1.5">
        {levels.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < score ? color : 'bg-slate-700'}`} />
        ))}
      </div>
      {label && (
        <p className={`mt-1 text-xs font-medium ${score >= 4 ? 'text-emerald-400' : score >= 3 ? 'text-cyan-400' : score >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>
          Password strength: {label}
        </p>
      )}
    </div>
  );
}

export function calculatePasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-cyan-500', 'bg-emerald-500'];
  const label = score > 0 ? levels[Math.min(score - 1, 4)] : '';
  const color = score > 0 ? colors[Math.min(score - 1, 4)] : '';

  return { score, label, color };
}