import React, { useState } from 'react';
import { apexResetPasswordApi } from '../api/apexAuthApi';
import { AuthCard } from '../components/AuthCard';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { PasswordInput } from '../components/PasswordInput';

interface ResetPasswordFormProps {
  email: string;
  token: string;
  onSuccess: () => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ email, token, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await apexResetPasswordApi({ email, token, newPassword });
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'This reset link is invalid or has expired. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthCard eyebrow="Account Recovery" title="Password updated" icon={<CheckCircle2 className="h-6 w-6" />}>
        <div className="text-center space-y-4">
          <p className="text-sm text-muted">Your password has been changed. You can now sign in with your new password.</p>
          <button
            type="button"
            onClick={onSuccess}
            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-md shadow-sm cursor-pointer"
          >
            Continue to Sign In
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      eyebrow="Account Recovery"
      title="Choose a new password"
      subtitle={`Setting a new password for ${email}.`}
      icon={<KeyRound className="h-6 w-6" />}
    >
      {error && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-md border border-rose-200">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-ink mb-1">New Password</label>
          <PasswordInput
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink mb-1">Confirm New Password</label>
          <PasswordInput
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Re-enter new password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-md shadow-sm shadow-brand-900/10 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Updating password...' : 'Update Password'}
        </button>
      </form>
    </AuthCard>
  );
};