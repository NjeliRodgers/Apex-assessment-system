import React, { useEffect, useState } from 'react';
import { apexActivateAccountApi } from '../api/apexAuthApi';
import { AuthCard } from '../components/AuthCard';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface ActivateAccountProps {
  email: string;
  token: string;
  onSuccess: () => void;
}

export const ActivateAccount: React.FC<ActivateAccountProps> = ({ email, token, onSuccess }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const activate = async () => {
      try {
        const res = await apexActivateAccountApi(email, token);
        if (!cancelled) {
          setMessage(res.message);
          setStatus('success');
        }
      } catch (err: any) {
        if (!cancelled) {
          setMessage(err.message || 'This activation link is invalid or has expired.');
          setStatus('error');
        }
      }
    };

    activate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, token]);

  if (status === 'loading') {
    return (
      <AuthCard eyebrow="Verifying Access" title="Activating your account..." icon={<Loader2 className="h-6 w-6 animate-spin" />}>
        <p className="text-sm text-muted text-center">This will only take a moment.</p>
      </AuthCard>
    );
  }

  if (status === 'success') {
    return (
      <AuthCard eyebrow="Verifying Access" title="Account activated" icon={<CheckCircle2 className="h-6 w-6" />}>
        <div className="text-center space-y-4">
          <p className="text-sm text-muted">{message}</p>
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
    <AuthCard eyebrow="Verifying Access" title="Activation failed" icon={<XCircle className="h-6 w-6" />}>
      <div className="text-center space-y-4">
        <p className="text-sm text-muted">{message}</p>
        <button
          type="button"
          onClick={onSuccess}
          className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-md shadow-sm cursor-pointer"
        >
          Back to Sign In
        </button>
      </div>
    </AuthCard>
  );
};