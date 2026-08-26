import React, { useEffect, useState } from 'react';
import { FileCheck2, Clock, ListChecks, CheckCircle2, XCircle, LoaderCircle, Sparkles, Layers } from 'lucide-react';
import {
  getCatalogItemApi,
  getMyEnrollmentsApi,
  getMyInterviewAccessApi,
  enrollApi,
  verifyEnrollmentPaymentApi,
  ApexEnrollment,
  InterviewAccess
} from '../api/apexCatalogApi';

interface PackageExamsPageProps {
  packageId: string;
  candidateName: string;
  candidateEmail: string;
  onBack: () => void;
  onStartExam: (examId: string) => void;
}

interface ExamRow {
  id: string;
  name: string;
  costKsh: number;
  passMarkPercent?: number;
  timeLimitMinutes?: number;
}

// Per-exam state, keyed by exam id.
interface ExamState {
  enrollment: ApexEnrollment | null;
  access: InterviewAccess | null; // reused purely for its `eligible` (=passed) flag
}

export const PackageExamsPage: React.FC<PackageExamsPageProps> = ({ packageId, candidateName, candidateEmail, onBack, onStartExam }) => {
  const [packageName, setPackageName] = useState('');
  const [examIntro, setExamIntro] = useState<string | null>(null);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [examState, setExamState] = useState<Record<string, ExamState>>({});
  const [loading, setLoading] = useState(true);
  const [processingExamId, setProcessingExamId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const pkg = await getCatalogItemApi('package', packageId);
      setPackageName(pkg.name);
      setExamIntro(pkg.instructions?.examIntro || null);
      const examList = pkg.exams || [];
      setExams(examList);

      const [enrollments, accessResults] = await Promise.all([
        getMyEnrollmentsApi(),
        Promise.allSettled(examList.map((e) => getMyInterviewAccessApi(e.id)))
      ]);

      const nextState: Record<string, ExamState> = {};
      examList.forEach((e, i) => {
        const enrollment =
          enrollments.find((en) => en.itemType === 'exam' && en.itemId === e.id && en.status !== 'failed') || null;
        const result = accessResults[i];
        nextState[e.id] = {
          enrollment,
          access: result.status === 'fulfilled' ? result.value : null
        };
      });
      setExamState(nextState);
    } catch (err: any) {
      setError(err.message || 'Failed to load the exams for this package');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId]);

  const handlePayForExam = async (exam: ExamRow) => {
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

    setProcessingExamId(exam.id);
    try {
      const { enrollment: pendingEnrollment, costKsh } = await enrollApi('exam', exam.id);

      if (pendingEnrollment.status === 'in_progress' || pendingEnrollment.status === 'completed') {
        setExamState((prev) => ({ ...prev, [exam.id]: { ...prev[exam.id], enrollment: pendingEnrollment } }));
        setProcessingExamId(null);
        return;
      }

      const reference = `apex-exam-${pendingEnrollment.id}-${Date.now()}`;

      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: candidateEmail,
        amount: costKsh * 100,
        currency: 'KES',
        ref: reference,
        metadata: { enrollmentId: pendingEnrollment.id, itemType: 'exam', itemId: exam.id, packageId },
        callback: (response) => {
          verifyEnrollmentPaymentApi(pendingEnrollment.id, response.reference)
            .then((updated) =>
              setExamState((prev) => ({ ...prev, [exam.id]: { ...prev[exam.id], enrollment: updated } }))
            )
            .catch((err: any) => {
              setError(
                err.message ||
                  `We could not confirm your payment. Please contact support with reference: ${response.reference}`
              );
            })
            .finally(() => setProcessingExamId(null));
        },
        onClose: () => setProcessingExamId(null)
      });

      handler.openIframe();
    } catch (err: any) {
      setError(err.message || 'Could not start payment for this exam');
      setProcessingExamId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-fog flex items-center justify-center p-4">
        <p className="text-sm text-muted">Loading exams…</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-fog p-4 sm:p-8"
      style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #d7e6dc 1px, transparent 0)',
        backgroundSize: '22px 22px'
      }}
    >
      <div className="max-w-6xl mx-auto space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-brand-700 cursor-pointer"
        >
          Back to {packageName || 'package'}
        </button>

        <div className="rounded-xl bg-gradient-to-br from-brand-700 via-brand-600 to-mint-500 p-6 sm:p-10 text-white space-y-4 shadow-sm shadow-brand-900/20">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[11px] font-semibold uppercase tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            Atesta International Dashboard
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight max-w-2xl">
            Standardized Testing, Master Courses &amp; Combined Certification Packages
          </h1>
          <p className="text-sm text-white/85 max-w-2xl leading-relaxed">
            Welcome, {candidateName.split(' ')[0]}. {exams.length > 1 ? 'These exams are' : 'This exam is'} a professional examination, (Take it serious), it's Verified by International Job Boards and it defines those candidates who are ready for the next step in their career. From those who are just trying. {examIntro || 'Please complete all exams in this package to proceed with your certification program.'}
          </p>

          <div className="bg-white/10 border border-white/20 rounded-lg p-4 sm:p-5 space-y-1.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/80">
              <Layers className="h-3.5 w-3.5" />
              {packageName ? `${packageName} · ` : ''}Certification Package
            </p>
            <h2 className="font-display text-lg font-bold">{exams.length > 1 ? `${exams.length} Exams` : 'Exam'}</h2>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-line shadow-[0_1px_2px_rgba(15,85,53,0.06),0_12px_28px_-10px_rgba(15,85,53,0.18)] overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-brand-600 via-brand-500 to-mint-400" />

          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shadow-sm shadow-brand-900/20 shrink-0">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase block">
                  Exams · {packageName}
                </span>
                <h1 className="font-display text-xl font-bold text-ink">
                  {exams.length > 1 ? `${exams.length} exams for this package` : 'Exam for this package'}
                </h1>
              </div>
            </div>

            <p className="text-sm text-muted leading-relaxed">
              {examIntro ||
                'Each exam below is taken independently. Once you pass every exam listed here, the AI-agent interview for this package unlocks.'}
            </p>

            <div className="border border-line rounded-lg p-5 bg-brand-50 space-y-2">
              <h2 className="font-display text-sm font-bold text-ink">Why this exam matters</h2>
              <p className="text-xs text-muted leading-relaxed">
                Atesta is an Examination and certification engine behind International Job placements. International employers can't
                personally interview every applicant, so they rely on Atesta to independently verify that a
                candidate has the real skills, discipline, and judgment the role demands before an offer is ever
                made. Passing this exam tells employers you're not just claiming to be qualified; you've proven it
                under the same standard used for candidates worldwide, which is exactly what lets hiring partners
                move fast and trust the shortlist Atesta hands them.
              </p>
            </div>

            {error && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">{error}</div>}

            <div className="space-y-3">
              {exams.map((exam, index) => {
                const state = examState[exam.id];
                const isPaidUp = state?.enrollment?.status === 'in_progress' || state?.enrollment?.status === 'completed';
                const passed = !!state?.access?.eligible;
                const isProcessing = processingExamId === exam.id;
                const previousExam = index > 0 ? exams[index - 1] : null;
                const previousDone = !previousExam || examState[previousExam.id]?.enrollment?.status === 'completed';

                return (
                  <div key={exam.id} className="border border-line rounded-lg p-4 sm:p-5 bg-fog space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-base font-bold text-ink">{exam.name}</h2>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted font-mono">
                          {exam.timeLimitMinutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" /> {exam.timeLimitMinutes} min
                            </span>
                          )}
                          {exam.passMarkPercent && (
                            <span className="flex items-center gap-1">
                              <ListChecks className="h-3.5 w-3.5" /> Pass mark {exam.passMarkPercent}%
                            </span>
                          )}
                        </div>
                      </div>
                      {passed && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-brand-700 shrink-0">
                          <CheckCircle2 className="h-4 w-4" /> Passed
                        </span>
                      )}
                      {isPaidUp && !passed && state?.access !== null && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 shrink-0">
                          <XCircle className="h-4 w-4" /> Not yet passed
                        </span>
                      )}
                    </div>

                    {!previousDone && (
                      <div className="bg-slate-50 border border-line rounded-lg p-4 text-xs text-muted">
                        Finish and submit "{previousExam?.name}" first — this exam unlocks right after.
                      </div>
                    )}

                    {previousDone && !isPaidUp && (
                      <div className="bg-white border border-amber-200 rounded-lg p-4 space-y-2">
                        <p className="text-xs font-bold text-ink uppercase tracking-wide">Exam Rules — Read Before You Continue</p>
                        <ul className="text-xs text-muted space-y-1.5 list-disc list-inside leading-relaxed">
                          <li>Do not use AI tools, search engines, or any external assistance to answer questions.</li>
                          <li>Do not copy answers from any source, printed or digital.</li>
                          <li>Do not get help from another person during the exam, in person or remotely.</li>
                          <li>Your camera must stay on for the full duration of the exam.</li>
                          <li>Our system takes random screenshots during the exam, which are used during marking.</li>
                          <li>Use a reliable device and a stable internet connection.</li>
                          <li>Sit the exam in a quiet, private environment free of interruptions.</li>
                          <li>Do not switch tabs, minimize the window, or open other applications during the exam.</li>
                          <li>Do not use a second device to look up answers.</li>
                          <li>Any violation of these rules may lead to disqualification of your attempt.</li>
                        </ul>
                        <p className="text-xs text-ink font-semibold pt-1">
                          This exam requires payment of KSh {exam.costKsh.toLocaleString()}. Continue, and wish you all the best.
                        </p>
                      </div>
                    )}

                    {previousDone && !isPaidUp && (
                      <button
                        type="button"
                        onClick={() => handlePayForExam(exam)}
                        disabled={isProcessing}
                        className="w-full max-w-xs mx-auto py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg shadow-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin" /> Processing…
                          </>
                        ) : (
                          'Start Exam'
                        )}
                      </button>
                    )}

                    {previousDone && isPaidUp && (
                      <button
                        type="button"
                        onClick={() => onStartExam(exam.id)}
                        className="w-full max-w-xs mx-auto py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg shadow-sm transition cursor-pointer"
                      >
                        {passed ? 'Review Exam' : 'Start Exam'}
                      </button>
                    )}
                  </div>
                );
              })}
              {exams.length === 0 && <p className="text-sm text-muted text-center py-6">No exams assigned to this package yet.</p>}
            </div>

            <p className="text-[11px] text-muted text-center">
              Payments are processed securely by Paystack. Each exam is paid for separately — passing every exam listed
              here unlocks the AI-agent interview.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};