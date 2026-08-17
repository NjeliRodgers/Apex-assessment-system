import React, { useEffect, useState } from 'react';
import { FileCheck2, BookOpen, Layers, Clock, ListChecks, CalendarDays, CheckCircle2 } from 'lucide-react';
import {
  getCatalogItemApi,
  CatalogItemDetail,
  CatalogItemType,
  getMyEnrollmentsApi,
  enrollApi,
  verifyEnrollmentPaymentApi,
  ApexEnrollment
} from '../api/apexCatalogApi';

interface CatalogItemDetailPageProps {
  itemType: CatalogItemType;
  itemId: string;
  candidateEmail: string;
  onBack: () => void;
  onStartExam: (examId: string) => void;
  onStartCourse: (courseId: string) => void;
  onGoToInterview: (examId: string, examName: string) => void;
}

const TYPE_ICON: Record<CatalogItemType, React.ReactNode> = {
  exam: <FileCheck2 className="h-5 w-5" />,
  course: <BookOpen className="h-5 w-5" />,
  package: <Layers className="h-5 w-5" />
};

export const CatalogItemDetailPage: React.FC<CatalogItemDetailPageProps> = ({
  itemType,
  itemId,
  candidateEmail,
  onBack,
  onStartExam,
  onStartCourse,
  onGoToInterview
}) => {
  const [item, setItem] = useState<CatalogItemDetail | null>(null);
  const [enrollment, setEnrollment] = useState<ApexEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const loadItemAndEnrollment = async () => {
    setLoading(true);
    setError('');
    try {
      const [detail, enrollments] = await Promise.all([
        getCatalogItemApi(itemType, itemId),
        getMyEnrollmentsApi()
      ]);
      setItem(detail);
      const existing = enrollments.find((e) => e.itemType === itemType && e.itemId === itemId && e.status !== 'failed');
      setEnrollment(existing || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load this item');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItemAndEnrollment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemType, itemId]);

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
      const { enrollment: pendingEnrollment, costKsh } = await enrollApi(itemType, itemId);
      setEnrollment(pendingEnrollment);

      // Already paid up from a prior visit — nothing more to do here.
      if (pendingEnrollment.status === 'in_progress' || pendingEnrollment.status === 'completed') {
        setProcessing(false);
        return;
      }

      const reference = `apex-enroll-${pendingEnrollment.id}-${Date.now()}`;

      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: candidateEmail,
        amount: costKsh * 100,
        currency: 'KES',
        ref: reference,
        metadata: { enrollmentId: pendingEnrollment.id, itemType, itemId },
        callback: (response) => {
          verifyEnrollmentPaymentApi(pendingEnrollment.id, response.reference)
            .then((updated) => setEnrollment(updated))
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

  if (loading) {
    return (
      <div className="min-h-screen bg-fog flex items-center justify-center p-4">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="min-h-screen bg-fog flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-3">
          <p className="text-sm text-rose-700">{error}</p>
          <button type="button" onClick={onBack} className="text-xs font-semibold text-brand-700 hover:text-brand-800 cursor-pointer">
            Back to catalog
          </button>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const isPaidUp = enrollment?.status === 'in_progress' || enrollment?.status === 'completed';
  const isCompleted = enrollment?.status === 'completed';

  return (
    <div
      className="min-h-screen bg-fog p-4 sm:p-8"
      style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #d7e6dc 1px, transparent 0)',
        backgroundSize: '22px 22px'
      }}
    >
      <div className="max-w-2xl mx-auto space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-brand-700 cursor-pointer"
        >
          Back to catalog
        </button>

        <div className="bg-white rounded-lg border border-line shadow-[0_1px_2px_rgba(15,85,53,0.06),0_12px_28px_-10px_rgba(15,85,53,0.18)] overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-brand-600 via-brand-500 to-mint-400" />

          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shadow-sm shadow-brand-900/20 shrink-0">
                {TYPE_ICON[itemType]}
              </div>
              <div className="space-y-1">
                <span className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase block">
                  {itemType} · ID: {item.id}
                  {item.category ? ` · ${item.category}` : ''}
                </span>
                <h1 className="font-display text-xl font-bold text-ink">{item.name}</h1>
              </div>
            </div>

            {item.description && <p className="text-sm text-muted leading-relaxed">{item.description}</p>}

            <div className="flex flex-wrap gap-4 text-xs text-muted font-mono">
              {itemType === 'exam' && item.timeLimitMinutes && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {item.timeLimitMinutes} minutes
                </span>
              )}
              {itemType === 'exam' && item.questionsPerAttempt && (
                <span className="flex items-center gap-1.5">
                  <ListChecks className="h-4 w-4" />
                  {item.questionsPerAttempt} questions
                </span>
              )}
              {itemType === 'course' && item.durationDays && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  About {item.durationDays} days
                </span>
              )}
            </div>

            {itemType === 'course' && item.modules && item.modules.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-ink uppercase tracking-wide">Modules</p>
                <ul className="space-y-1">
                  {item.modules
                    .slice()
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((m) => (
                      <li key={m.id} className="text-sm text-muted flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                        {m.title}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {itemType === 'package' && (item.exam || item.course) && (
              <div className="space-y-2 border border-line rounded-lg p-4 bg-fog">
                <p className="text-xs font-semibold text-ink uppercase tracking-wide">This package includes</p>
                <div className="space-y-1 text-sm text-muted">
                  {item.exam && (
                    <p className="flex items-center gap-2">
                      <FileCheck2 className="h-4 w-4 text-brand-600" /> {item.exam.name}
                    </p>
                  )}
                  {item.course && (
                    <p className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-brand-600" /> {item.course.name}
                    </p>
                  )}
                </div>
                <p className="text-[11px] text-muted">
                  Your certificate issues once you've passed the exam and completed your AI-agent interview.
                  The course is optional take it for extra preparation,or you can just go straight to the exam.
                </p>
              </div>
            )}

            {error && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">{error}</div>}

            <div className="border border-line rounded-lg bg-fog px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted uppercase tracking-wide font-mono">Cost</p>
                <p className="font-display text-2xl font-bold text-ink">KSh {item.costKsh.toLocaleString()}</p>
              </div>
              {isCompleted && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                  <CheckCircle2 className="h-4 w-4" /> Completed
                </span>
              )}
            </div>

            {!isPaidUp && (
              <button
                type="button"
                onClick={handleEnrollAndPay}
                disabled={processing}
                className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg shadow-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? 'Waiting for payment…' : `Enroll & Pay KSh ${item.costKsh.toLocaleString()}`}
              </button>
            )}

            {isPaidUp && itemType === 'exam' && (
              <button
                type="button"
                onClick={() => onStartExam(itemId)}
                className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg shadow-sm transition cursor-pointer"
              >
                {isCompleted ? 'Review Exam' : 'Start Exam'}
              </button>
            )}

            {isCompleted && itemType === 'exam' && (
              <button
                type="button"
                onClick={() => onGoToInterview(itemId, item.name)}
                className="w-full py-3 bg-ink hover:bg-black text-white font-display font-bold text-sm rounded-lg shadow-sm transition cursor-pointer"
              >
                Continue to AI Interview
              </button>
            )}

            {isPaidUp && itemType === 'course' && (
              <button
                type="button"
                onClick={() => onStartCourse(itemId)}
                className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg shadow-sm transition cursor-pointer"
              >
                {isCompleted ? 'Review Course' : 'Continue Course'}
              </button>
            )}

            {isPaidUp && itemType === 'package' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {item.exam && (
                  <button
                    type="button"
                    onClick={() => onStartExam(item.exam!.id)}
                    className="py-3 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <FileCheck2 className="h-4 w-4" />
                    Start Exam
                  </button>
                )}
                {item.exam && (
                  <button
                    type="button"
                    onClick={() => onGoToInterview(item.exam!.id, item.exam!.name)}
                    className="py-3 bg-ink hover:bg-black text-white font-display font-bold text-sm rounded-lg shadow-sm transition cursor-pointer flex items-center justify-center gap-2 sm:col-span-2"
                  >
                    Continue to AI Interview
                  </button>
                )}
                {item.course && (
                  <button
                    type="button"
                    onClick={() => onStartCourse(item.course!.id)}
                    className="py-3 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    Start Course
                  </button>
                )}
              </div>
            )}

            <p className="text-[11px] text-muted text-center">
              Payments are processed securely by Paystack. Your card or mobile money details are never seen by Atesta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};