import React, { useEffect, useState } from 'react';
import {
  getMyInterviewAccessApi,
  enrollApi,
  verifyEnrollmentPaymentApi,
  startMyInterviewApi,
  InterviewAccess
} from '../api/apexCatalogApi';
import { ArrowLeft, Bot, Lock, LoaderCircle, CheckCircle2, Hourglass } from 'lucide-react';

interface InterviewTakingPageProps {
  examId: string;
  examName: string;
  candidateEmail: string;
  onBack: () => void;
}

export const InterviewTakingPage: React.FC<InterviewTakingPageProps> = ({ examId, examName, candidateEmail, onBack }) => {
  const [access, setAccess] = useState<InterviewAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const loadAccess = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMyInterviewAccessApi(examId);
      setAccess(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load your interview status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const handleEnrollAndPay = async () => {
    setError('');
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) {
      setError('Payment is not configured yet. Please contact support.');
      return;
    }
    if (typeof window.PaystackPop === 'undefined') {
      setError('Payment popup failed to load. Please refresh the page and try again.');
      return;
    }

    setProcessing(true);
    try {
      const { enrollment, costKsh } = await enrollApi('interview', examId);

      if (enrollment.status === 'in_progress' || enrollment.status === 'completed') {
        await loadAccess();
        setProcessing(false);
        return;
      }

      const reference = `apex-interview-${enrollment.id}-${Date.now()}`;

      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: candidateEmail,
        amount: costKsh * 100,
        currency: 'KES',
        ref: reference,
        metadata: { enrollmentId: enrollment.id, itemType: 'interview', itemId: examId },
        callback: (response) => {
          verifyEnrollmentPaymentApi(enrollment.id, response.reference)
            .then(() => loadAccess())
            .catch((err: any) => {
              setError(
                err.message ||
                  `We could not confirm your payment. Please contact support with reference: ${response.reference}`
              );
            })
            .finally(() => setProcessing(false));
        },
        onClose: () => setProcessing(false)
      });

      handler.openIframe();
    } catch (err: any) {
      setError(err.message || 'Enrollment failed');
      setProcessing(false);
    }
  };

  const handleStart = async () => {
    setError('');
    setProcessing(true);
    try {
      await startMyInterviewApi(examId);
      await loadAccess();
    } catch (err: any) {
      setError(err.message || 'Could not start your interview');
    } finally {
      setProcessing(false);
    }
  };

  const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen bg-fog p-4 sm:p-8">
      <main className="mx-auto max-w-2xl space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-brand-700 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to catalog
        </button>
        {children}
      </main>
    </div>
  );

  if (loading) {
    return (
      <Shell>
        <div className="py-16 text-center flex items-center justify-center gap-2 text-sm text-muted">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </Shell>
    );
  }

  if (error && !access) {
    return (
      <Shell>
        <div className="bg-white rounded-lg border border-line p-8 text-center space-y-3">
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      </Shell>
    );
  }

  if (!access) return null;

  const header = (
    <div className="bg-white rounded-lg border border-line p-6 sm:p-8 flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center shrink-0">
        <Bot className="h-5 w-5" />
      </div>
      <div>
        <p className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase">AI-Agent Interview</p>
        <h1 className="font-display text-xl font-bold text-ink mt-1">{examName}</h1>
      </div>
    </div>
  );

  if (access.pendingResultEmail) {
    return (
      <Shell>
        {header}
        <div className="bg-white rounded-lg border border-line p-6 text-center space-y-3">
          <Hourglass className="h-6 w-6 text-brand-700 mx-auto" />
          <p className="text-sm font-semibold text-ink">Assessment under review</p>
          <p className="text-sm text-muted">
            {access.statusMessage ||
              'Your assessment submission is being reviewed. You will receive your result by email in 9–15 hours.'}
          </p>
        </div>
      </Shell>
    );
  }

  if (!access.eligible) {
    return (
      <Shell>
        {header}
        <div className="bg-white rounded-lg border border-line p-6 text-center space-y-2">
          <p className="text-sm text-ink font-semibold">Not unlocked yet</p>
          <p className="text-sm text-muted">You need to pass this exam before the AI interview stage becomes available.</p>
        </div>
      </Shell>
    );
  }

  if (!access.configured) {
    return (
      <Shell>
        {header}
        <div className="bg-white rounded-lg border border-line p-6 text-center space-y-2">
          <p className="text-sm text-muted">The AI interview stage isn't set up for this exam yet. Check back later.</p>
        </div>
      </Shell>
    );
  }

  if (access.locked) {
    return (
      <Shell>
        {header}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center space-y-2">
          <Lock className="h-6 w-6 text-amber-700 mx-auto" />
          <p className="text-sm font-semibold text-amber-800">You've used all three interview attempts</p>
          <p className="text-sm text-amber-700">
            You can try again after {access.lockedUntil ? new Date(access.lockedUntil).toLocaleDateString() : 'the cooldown period ends'}.
          </p>
        </div>
      </Shell>
    );
  }

  if (access.enrollmentStatus === 'completed') {
    return (
      <Shell>
        {header}
        <div className="bg-white rounded-lg border border-line p-6 text-center space-y-2">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
          <p className="text-sm font-semibold text-ink">Interview completed and passed</p>
          <p className="text-sm text-muted">Check your certificates page — it'll be ready once approved.</p>
        </div>
      </Shell>
    );
  }

  const isPaidUp = access.enrollmentStatus === 'in_progress';

  if (isPaidUp && access.activeSession) {
    return (
      <Shell>
        {header}
        <div className="bg-white rounded-lg border border-line p-6 text-center space-y-3">
          <Hourglass className="h-6 w-6 text-brand-700 mx-auto" />
          <p className="text-sm font-semibold text-ink">Your interview session is active</p>
          <p className="text-sm text-muted">
            Session status: <span className="font-mono">{access.activeSession.status}</span>. Your results will be emailed to you
            once the AI-agent interview has been reviewed.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {header}

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      {access.attemptsUsed !== undefined && access.attemptsUsed > 0 && (
        <p className="text-xs text-muted text-center">
          Attempts used: {access.attemptsUsed} of 3 · {access.attemptsRemaining} remaining
        </p>
      )}

      {!isPaidUp && (
        <>
          <div className="bg-white rounded-lg border border-line px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted uppercase tracking-wide font-mono">Cost</p>
              <p className="font-display text-2xl font-bold text-ink">KSh {(access.costKsh || 0).toLocaleString()}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleEnrollAndPay}
            disabled={processing}
            className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg shadow-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {processing ? 'Waiting for payment…' : `Enroll & Pay KSh ${(access.costKsh || 0).toLocaleString()}`}
          </button>
        </>
      )}

      {isPaidUp && !access.activeSession && (
        <button
          type="button"
          onClick={handleStart}
          disabled={processing}
          className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg shadow-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {processing ? 'Starting…' : 'Start AI Interview'}
        </button>
      )}
    </Shell>
  );
};