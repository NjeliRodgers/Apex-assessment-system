import React, { useState } from 'react';
import { apexConfirmNationalIdRecoveryApi } from '../api/apexAuthApi';
import { AuthCard } from '../components/AuthCard';
import { CheckCircle2, IdCard } from 'lucide-react';
import { isValidNationalId, NATIONAL_ID_ERROR_MESSAGE } from '../utils/validators';

interface UpdateNationalIdFormProps {
  email: string;
  token: string;
  onSuccess: () => void;
}

export const UpdateNationalIdForm: React.FC<UpdateNationalIdFormProps> = ({ email, token, onSuccess }) => {
  const [nationalId, setNationalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidNationalId(nationalId)) {
      setError(NATIONAL_ID_ERROR_MESSAGE);
      return;
    }

    setLoading(true);
    try {
      await apexConfirmNationalIdRecoveryApi({ email, token, nationalId });
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'This link is invalid or has expired. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthCard eyebrow="Account Recovery" title="National ID updated" icon={<CheckCircle2 className="h-6 w-6" />}>
        <div className="text-center space-y-4">
          <p className="text-sm text-muted">
            Your National ID has been saved. You'll now need your email, password and this National ID to sign in.
          </p>
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
      title="Set your National ID"
      subtitle={`Updating the National ID for ${email}.`}
      icon={<IdCard className="h-6 w-6" />}
    >
      {error && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-md border border-rose-200">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-ink mb-1">National ID Number</label>
          <input
            type="text"
            inputMode="numeric"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
            required
            minLength={8}
            placeholder="At least 8 digits"
            className="w-full px-3 py-2 bg-fog border border-line rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-md shadow-sm shadow-brand-900/10 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Saving...' : 'Save National ID'}
        </button>
      </form>
    </AuthCard>
  );
};