import React, { useState } from 'react';
import { useApexAuth } from '../auth/ApexAuthContext';
import { ShieldCheck, CheckCircle2, Plane } from 'lucide-react';

const GUIDELINES: string[] = [
  'All assessments and interviews must be completed individually, without external assistance.',
  'Ensure a stable internet connection and a quiet environment before starting.',
  'Assessment and AI-interview payments are non-refundable once a session has started.',
  'Any impersonation, use of unauthorized aids, or dishonest conduct will result in disqualification.',
  'You will have a fixed time window to complete each stage once started.',
  'Technical issues should be reported immediately through the Apex Assessment System support contact.'
];

interface RulesRecapPageProps {
  onContinue: () => void;
}

export const RulesRecapPage: React.FC<RulesRecapPageProps> = ({ onContinue }) => {
  const { candidate, application, acceptTerms } = useApexAuth();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!agreed) return;
    setSubmitting(true);
    setError('');
    try {
      await acceptTerms();
      onContinue();
    } catch (err: any) {
      setError(err.message || 'Failed to record your acceptance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-fog p-4 sm:p-8 flex items-start sm:items-center justify-center"
      style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #d7e6dc 1px, transparent 0)',
        backgroundSize: '22px 22px'
      }}
    >
      <div className="w-full max-w-2xl bg-white rounded-lg border border-line shadow-[0_1px_2px_rgba(15,85,53,0.06),0_12px_28px_-10px_rgba(15,85,53,0.18)] overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-brand-600 via-brand-500 to-mint-400 scan-bar" />

        <div className="p-6 sm:p-10 space-y-6">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shadow-sm shadow-brand-900/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <span className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase block">
              Apex Assessment Process
            </span>
            <h1 className="font-display text-2xl font-bold text-ink">
              Welcome, {candidate?.name?.split(' ')[0]}
            </h1>
            {application && (
              <p className="text-sm text-muted">
                You're proceeding to the interview process for{' '}
                <strong className="text-ink">{application.jobTitle}</strong>.
              </p>
            )}
          </div>

          <div className="border border-line rounded-lg divide-y divide-line">
            <div className="px-5 py-3 bg-fog">
              <h2 className="font-display text-sm font-bold text-ink">Rules &amp; Regulations</h2>
              <p className="text-xs text-muted mt-0.5">Please read carefully before proceeding.</p>
            </div>
            <ul className="px-5 py-4 space-y-3">
              {GUIDELINES.map((rule, i) => (
                <li key={i} className="flex gap-3 text-sm text-ink/90">
                  <CheckCircle2 className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-line rounded-lg p-5 bg-brand-50 space-y-3">
            <h2 className="font-display text-sm font-bold text-ink flex items-center gap-2">
              <Plane className="h-4 w-4 text-brand-600" />
              Relocation &amp; Sponsorship
            </h2>
            {application?.workType && application.workType.toLowerCase() === 'remote' ? (
              <p className="text-xs text-muted leading-relaxed">
                This role is fully remote, so no relocation is required. You'll work from your current
                location once hired.
              </p>
            ) : (
              <p className="text-xs text-muted leading-relaxed">
                If you are offered this position and relocation is required, Global Talent Plus and our
                hiring partner fully sponsor your visa and transportation costs
                {application?.country ? <> to <strong className="text-ink">{application.country}</strong></> : null}, plus up to
                two months of accommodation on arrival to help you settle in and adjust to your new
                environment. This applies only where the role requires you to relocate — confirmed at
                the offer stage.
              </p>
            )}
          </div>

          <div className="border border-line rounded-lg p-5 bg-fog space-y-3">
            <h2 className="font-display text-sm font-bold text-ink">What to expect</h2>
            <p className="text-xs text-muted leading-relaxed">
              You will receive official instructions only when an action is ready for you. With apex assessments, you can complete your interview process from anywhere, at your own pace within given time. Apex Assessment provide equal opportunity to every candidate, regardless of race, gender, religion,
              disability, or background. Kindly ensure you have a stable internet connection and a quiet environment before starting. Kindly note that all assessments and interviews must be completed individually, without external assistance. Any impersonation, use of unauthorized aids, or dishonest conduct will result in disqualification. Kindly read and agree to the rules, regulations, and terms & conditions of the Apex Assessment System interview process before proceeding. Apex assessment wish you the best of luck in your interview process and hope you have a positive experience with our platform.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">{error}</div>
          )}

          <label className="flex items-start gap-3 text-sm text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500 cursor-pointer"
            />
            <span>
              I have read and agree to the rules, regulations, and terms &amp; conditions of the Apex Assessment
              System interview process.
            </span>
          </label>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!agreed || submitting}
            className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg shadow-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Recording your acceptance…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};