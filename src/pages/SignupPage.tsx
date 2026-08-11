import React, { useState } from 'react';
import { useApexAuth } from '../auth/ApexAuthContext';
import { AuthCard } from '../components/AuthCard';
import { User, Mail, Lock, CheckCircle2 } from 'lucide-react';

interface SignupPageProps {
  applicationId: string | null;
  onGoToLogin: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ applicationId, onGoToLogin }) => {
  const { signUp } = useApexAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const msg = await signUp({ applicationId, name, email, password });
      setMessage(msg);
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  if (message) {
    return (
      <AuthCard eyebrow="Enrollment Submitted" title="Check your email" icon={<CheckCircle2 className="h-6 w-6" />}>
        <div className="text-center space-y-4">
          <p className="text-sm text-muted">{message}</p>
          <button
            type="button"
            onClick={onGoToLogin}
            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-md shadow-sm cursor-pointer"
          >
            Back to Sign In
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      eyebrow="New Candidate Enrollment"
      title="Create Your Apex Account"
      subtitle="Register to take Apex exams, courses, or packages — no prior application needed."
      footer={
        <p className="text-center text-xs text-muted">
          Already have an account?{' '}
          <button type="button" onClick={onGoToLogin} className="font-semibold text-brand-700 hover:text-brand-800 cursor-pointer">
            Sign In
          </button>
        </p>
      }
    >
      {error && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-md border border-rose-200">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-ink mb-1">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
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
          <label className="block text-xs font-semibold text-ink mb-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full pl-9 pr-3 py-2 bg-fog border border-line rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white"
              placeholder="At least 8 characters"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-md shadow-sm shadow-brand-900/10 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
    </AuthCard>
  );
};