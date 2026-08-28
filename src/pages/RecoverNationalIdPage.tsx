import React, { useState } from 'react';
import { apexRequestNationalIdRecoveryApi } from '../api/apexAuthApi';
import { AuthCard } from '../components/AuthCard';
import { PasswordInput } from '../components/PasswordInput';
import { IdCard, Mail, CheckCircle2 } from 'lucide-react';

interface RecoverNationalIdPageProps {
  onGoToLogin: () => void;
}

export const RecoverNationalIdPage: React.FC<RecoverNationalIdPageProps> = ({ onGoToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apexRequestNationalIdRecoveryApi({ email, password });
      setMessage(res.message);
    } catch (err: any) {
      setError(err.message || 'Failed to process this request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      eyebrow="Account Recovery"
      title="Update Your National ID"
      subtitle={message ? undefined : "Confirm your email and password, and we'll email you a secure link to set your National ID."}
      icon={<IdCard className="h-6 w-6" />}
      footer={
        <p className="text-center text-xs text-muted">
          <button type="button" onClick={onGoToLogin} className="font-semibold text-brand-700 hover:text-brand-800 cursor-pointer">
            Back to Sign In
          </button>
        </p>
      }
    >
      {message ? (
        <div className="text-center space-y-4">
          <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-full mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="text-sm text-muted">{message}</p>
        </div>
      ) : (
        <>
          {error && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-md border border-rose-200">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-md shadow-sm shadow-brand-900/10 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Checking...' : 'Send Update Link'}
            </button>
          </form>
        </>
      )}
    </AuthCard>
  );
};