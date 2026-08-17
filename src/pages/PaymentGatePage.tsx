import React, { useState } from 'react';
import { useApexAuth } from '../auth/ApexAuthContext';
import { verifyApexPaymentApi } from '../api/apexPaymentApi';
import { PaymentStage } from '../types';
import { Lock } from 'lucide-react';

interface PaymentGatePageProps {
  stage: PaymentStage;
  amountKsh: number;
  stepLabel: string;
  title: string;
  description: string;
  onPaid: () => void;
}

export const PaymentGatePage: React.FC<PaymentGatePageProps> = ({
  stage,
  amountKsh,
  stepLabel,
  title,
  description,
  onPaid
}) => {
  const { candidate, application, refreshPaymentStatus } = useApexAuth();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

  const handlePay = () => {
    setError('');

    if (!publicKey) {
      setError('Payment is not configured yet. Please contact support.');
      return;
    }
    if (!candidate?.email) {
      setError('Your account email could not be found. Please log in again.');
      return;
    }
    if (typeof window.PaystackPop === 'undefined') {
      setError('Payment popup failed to load. Please refresh the page and try again.');
      return;
    }

    setProcessing(true);

    const reference = `apex-${stage}-${candidate.id}-${Date.now()}`;

    const handler = window.PaystackPop.setup({
      key: publicKey,
      email: candidate.email,
      amount: amountKsh * 100, // Paystack expects the amount in the smallest currency unit
      currency: 'KES',
      ref: reference,
      metadata: { stage, applicationId: application?.id, candidateId: candidate.id },
      callback: (response) => {
        // Runs after the popup confirms payment client-side. We still verify
        // server-side before trusting it — see verifyApexPaymentApi below.
        verifyApexPaymentApi(response.reference, stage)
          .then(async () => {
            await refreshPaymentStatus();
            onPaid();
          })
          .catch((err: any) => {
            setError(err.message || 'We could not confirm your payment. Please contact support with your reference: ' + response.reference);
          })
          .finally(() => setProcessing(false));
      },
      onClose: () => {
        setProcessing(false);
      }
    });

    handler.openIframe();
  };

  return (
    <div
      className="min-h-screen bg-fog p-4 sm:p-8 flex items-center justify-center"
      style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #d7e6dc 1px, transparent 0)',
        backgroundSize: '22px 22px'
      }}
    >
      <div className="w-full max-w-md bg-white rounded-lg border border-line shadow-[0_1px_2px_rgba(15,85,53,0.06),0_12px_28px_-10px_rgba(15,85,53,0.18)] overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-brand-600 via-brand-500 to-mint-400 scan-bar" />

        <div className="p-6 sm:p-10 space-y-6 text-center">
          <div className="w-12 h-12 mx-auto rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shadow-sm shadow-brand-900/20">
            <Lock className="h-6 w-6" />
          </div>

          <div className="space-y-1">
            <span className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase block">
              {stepLabel}
            </span>
            <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
            <p className="text-sm text-muted">{description}</p>
          </div>

          <div className="border border-line rounded-lg bg-fog px-5 py-4">
            <p className="text-xs text-muted uppercase tracking-wide font-mono">Amount due</p>
            <p className="font-display text-3xl font-bold text-ink mt-1">KSh {amountKsh.toLocaleString()}</p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200 text-left">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handlePay}
            disabled={processing}
            className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg shadow-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing ? 'Waiting for payment…' : `Pay KSh ${amountKsh.toLocaleString()} with Paystack`}
          </button>

          <p className="text-[11px] text-muted">
            Payments are processed securely by Paystack. Your card or mobile money details are never seen by Global
            Talent Plus or Atesta.
          </p>
        </div>
      </div>
    </div>
  );
};