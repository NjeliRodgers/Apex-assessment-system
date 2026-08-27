import React, { useState } from 'react';
import { useApexAuth } from '../auth/ApexAuthContext';
import { AuthCard } from '../components/AuthCard';
import { Mail, IdCard } from 'lucide-react';
import { PasswordInput } from '../components/PasswordInput';
import { isValidNationalId, NATIONAL_ID_ERROR_MESSAGE } from '../utils/validators';

interface LoginPageProps {
  onGoToSignup: () => void;
  onGoToForgotPassword: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onGoToSignup, onGoToForgotPassword }) => {
  const { login } = useApexAuth();
  const [email, setEmail] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsActivation, setNeedsActivation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNeedsActivation(false);

    if (!isValidNationalId(nationalId)) {
      setError(NATIONAL_ID_ERROR_MESSAGE);
      return;
    }

    setLoading(true);
    try {
      await login(nationalId, email, password);
    } catch (err: any) {
      if (err.code === 'ACCOUNT_NOT_ACTIVATED') {
        setNeedsActivation(true);
      }
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      eyebrow="Secure Candidate Access"
      title="Sign in to Atesta"
      subtitle="Continue your assessment and interview process."
      footer={
        <p className="text-center text-xs text-muted">
          New here?{' '}
          <button type="button" onClick={onGoToSignup} className="font-semibold text-brand-700 hover:text-brand-800 cursor-pointer">
            Create an Atesta account
          </button>
        </p>
      }
    >
      {error && (
        <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-md border border-rose-200">
          {error}
          {needsActivation && (
            <div className="mt-1 font-semibold">Check your email for the activation link, or sign up again to resend it.</div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-ink mb-1">National ID Number</label>
          <div className="relative">
            <IdCard className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
            <input
              type="text"
              inputMode="numeric"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
              required
              minLength={8}
              placeholder=" "
              className="w-full pl-9 pr-3 py-2 bg-fog border border-line rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink mb-1">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-9 pr-3 py-2 bg-fog border border-line rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-ink">Password</label>
            <button type="button" onClick={onGoToForgotPassword} className="text-xs font-semibold text-brand-700 hover:text-brand-800 cursor-pointer">
              Forgot password?
            </button>
          </div>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-md shadow-sm shadow-brand-900/10 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </AuthCard>
  );
};