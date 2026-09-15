import React, { useEffect, useState } from 'react';
import {
  getMyInterviewAccessApi,
  getMyPackageInterviewAccessApi,
  enrollApi,
  verifyEnrollmentPaymentApi,
  InterviewAccess
} from '../api/apexCatalogApi';
import { ArrowLeft, Bot, Lock, LoaderCircle, CheckCircle2, Hourglass, Sparkles, Layers, CreditCard, Mail } from 'lucide-react';

interface InterviewTakingPageProps {
  // Can be a packageId (candidate came from a package's Module 4) or a bare
  // examId (legacy/standalone exam that has its own interviewCostKsh set
  // directly, outside any package). We don't know which up front — we
  // detect it the same way the backend does: try package first, fall back
  // to exam.
  id: string;
  name: string;
  candidateName: string;
  candidateEmail: string;
  onBack: () => void;
}

type InterviewScope = 'package' | 'exam';

export const InterviewTakingPage: React.FC<InterviewTakingPageProps> = ({ id, name, candidateName, candidateEmail, onBack }) => {
  const [scope, setScope] = useState<InterviewScope | null>(null);
  const [access, setAccess] = useState<InterviewAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const loadAccess = async () => {
    setLoading(true);
    setError('');
    try {
      try {
        // Try package-scoped access first — this is the normal path for
        // candidates arriving from a package's AI-Agent Interview module.
        const data = await getMyPackageInterviewAccessApi(id);
        setScope('package');
        setAccess(data);
      } catch (packageErr: any) {
        if (packageErr.message === 'Package not found') {
          const data = await getMyInterviewAccessApi(id);
          setScope('exam');
          setAccess(data);
        } else {
          throw packageErr;
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load your interview status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

      const { enrollment, costKsh } = await enrollApi('interview', id);

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
        metadata: { enrollmentId: enrollment.id, itemType: 'interview', itemId: id },
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

  const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen bg-fog p-4 sm:p-8">
      <main className="mx-auto max-w-6xl space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-brand-700 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
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
    <>
      <div className="rounded-xl bg-gradient-to-br from-brand-700 via-brand-600 to-mint-500 p-6 sm:p-10 text-white space-y-4 shadow-sm shadow-brand-900/20">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[11px] font-semibold uppercase tracking-wide">
          <Sparkles className="h-3.5 w-3.5" />
          Atesta International Assessment Dashboard
        </span>
        <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight max-w-2xl">
          Standardized Testing, Master Courses &amp; Combined Certification Packages
        </h1>
        <p className="text-sm text-white/85 max-w-2xl leading-relaxed">
          Welcome, {candidateName.split(' ')[0]}. The AI-agent interview is the final step in this package it
           unlocks once every exam here is passed. It lets international employers see how you think and communicate under real conditions, not just what's on paper. Completing it well is what moves your profile into the shortlist hiring partners actually trust by receiving a congratulations Certificate.
        </p>

        <div className="bg-white/10 border border-white/20 rounded-lg p-4 sm:p-5 space-y-1.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/80">
            <Layers className="h-3.5 w-3.5" />
            Certification Package
          </p>
          <h2 className="font-display text-lg font-bold">International Job Screening</h2>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-line shadow-[0_1px_2px_rgba(15,85,53,0.06),0_12px_28px_-10px_rgba(15,85,53,0.18)] overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-brand-600 via-brand-500 to-mint-400" />
        <div className="p-6 sm:p-8 flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center shrink-0 shadow-sm shadow-brand-900/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase">International Job Screening</p>
            <h1 className="font-display text-xl font-bold text-ink mt-1">{name}</h1>
          </div>
        </div>
      </div>
    </>
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
          <p className="text-sm text-muted">
            {scope === 'package'
              ? 'Make sure you do and complete exams first.'
              : 'Make sure you do and complete this exam first.'}
          </p>
        </div>
      </Shell>
    );
  }

  if (!access.configured) {
    return (
      <Shell>
        {header}
        <div className="bg-white rounded-lg border border-line p-6 text-center space-y-2">
          <p className="text-sm text-muted">The AI interview stage isn't set up for this yet. Check back later.</p>
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
          <p className="text-sm text-muted">Check your certificates page it'll be ready once approved.</p>
        </div>
      </Shell>
    );
  }

  const isPaidUp = access.enrollmentStatus === 'in_progress';

  if (isPaidUp) {
    return (
      <Shell>
        {header}
        <div className="bg-white rounded-lg border border-line p-8 sm:p-10 text-center space-y-4 max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
            <Hourglass className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="font-display text-xl font-bold text-ink">AI Screening queued in interview backlog</h2>
          <p className="text-sm text-muted leading-relaxed">
            Your payment is confirmed and your screening request has been added to the interview backlog. A secure launch
            link will be sent to <strong>{candidateEmail}</strong> once your slot is prepared.
          </p>
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 text-xs text-amber-900 flex items-center justify-center gap-2">
            <Mail className="h-4 w-4 shrink-0" />
            <span>Check your inbox regularly for the interview access link and schedule instructions.</span>
          </div>
          <a
            href={window.location.origin}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold"
          >
            Return to Dashboard
          </a>
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
          <div className="border border-line rounded-lg p-5 bg-brand-50 space-y-2">
            <h2 className="font-display text-sm font-bold text-ink">Why this interview matters</h2>
            <p className="text-xs text-muted leading-relaxed">
              The AI-agent interview is Atesta's final checkthe stage that lets international employers see how
              you think and communicate under real conditions, not just what's on paper. Employers hiring across
              borders can't sit in the room with every candidate, so they lean on this interview to confirm you're
              genuinely ready to work and deliver on the responsibilities of the role from day one. Completing it
              well is what moves your profile into the shortlist hiring partners actually trust by receiving a congratulations Certificate.
            </p>
          </div>

                    <div className="border border-line rounded-lg p-5 bg-white space-y-3">
            <h2 className="font-display text-sm font-bold text-ink">How to prepare for your International Job Screening</h2>
            <ul className="text-xs text-muted space-y-1.5 list-disc list-inside leading-relaxed">
              <li>Turn your camera on for the entire session your video must stay on throughout.</li>
              <li>Make sure you are clearly audible: use a quiet room and, if possible, headphones with a mic.</li>
              <li>Use a stable internet connection and a fully charged device.</li>
              <li>Dress and present yourself as you would for a real international employer interview.</li>
              <li>Expect general questions (tell us about yourself, strengths/weaknesses, why this role) as well
                  as questions specific to the profession this package certifies.</li>
              <li>Answer in clear, complete sentences the AI agent is assessing communication as well as content.</li>
              <li>Sit somewhere private and free of interruptions or background noise.</li>
              <li>Have any role-relevant experience or examples ready to reference — specific stories land better
                  than generic answers.</li>
              <li>Treat this exactly like a real interview with an international recruiter: your recording and
                  performance are what hiring partners will see.</li>
            </ul>
          </div>
          {/* Interview fee hidden from initial view per UX request */}
          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            disabled={processing}
            className="w-full max-w-xs mx-auto py-3 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg shadow-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {processing ? 'Waiting for payment…' : 'Start online screening'}
          </button>
        </>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 flex items-center justify-center p-4" onClick={() => setShowPaymentModal(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl border border-line shadow-xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-brand-600 uppercase">Payment confirmation</p>
              <h3 className="font-display text-xl font-bold text-ink mt-1">Proceed to AI screening payment?</h3>
              <p className="text-sm text-muted mt-2 leading-relaxed">
                Once payment is successful, your interview will be queued and the launch link will be sent to your email.
              </p>
            </div>

            <div className="rounded-lg border border-line bg-fog p-4 space-y-2">
              <p className="text-sm font-bold text-ink">International Job Screening</p>
              <p className="text-xs text-muted">Candidate: {candidateName}</p>
              <p className="text-sm font-semibold text-ink">Amount: KSh {(access.costKsh || 0).toLocaleString()}</p>
            </div>

            <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-xs text-brand-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4 shrink-0" />
              <span>Secure payment is processed by Paystack. Atesta never sees your card or mobile-money credentials.</span>
            </div>

            <div className="pt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 rounded-lg border border-line text-xs font-semibold text-muted hover:text-ink hover:bg-fog cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleEnrollAndPay();
                  setShowPaymentModal(false);
                }}
                className="px-4 py-2 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold cursor-pointer"
              >
                Continue to Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
};