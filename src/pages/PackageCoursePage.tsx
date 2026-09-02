import React, { useEffect, useState } from 'react';
import { BookOpen, CalendarDays, CheckCircle2, Lock, LoaderCircle, KeyRound, CreditCard, Sparkles, Layers } from 'lucide-react';
import {
  getCatalogItemApi,
  getMyEnrollmentsApi,
  enrollApi,
  verifyEnrollmentPaymentApi,
  redeemPackageCourseCodeApi,
  AFFILIATE_FIRMS,
  ApexEnrollment
} from '../api/apexCatalogApi';

interface PackageCoursePageProps {
  packageId: string;
  candidateName: string;
  candidateEmail: string;
  onBack: () => void;
  onStartCourse: (courseId: string) => void;
}

interface CourseRow {
  id: string;
  name: string;
  costKsh: number;
  durationDays?: number;
}

type UnlockMode = null | 'pay' | 'code';

export const PackageCoursePage: React.FC<PackageCoursePageProps> = ({
  packageId,
  candidateName,
  candidateEmail,
  onBack,
  onStartCourse
}) => {
  const [packageName, setPackageName] = useState('');
  const [courseIntro, setCourseIntro] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [enrollments, setEnrollments] = useState<ApexEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [unlockMode, setUnlockMode] = useState<UnlockMode>(null);
  const [payingCourseId, setPayingCourseId] = useState<string | null>(null);
  const [firmId, setFirmId] = useState('');
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [codeError, setCodeError] = useState('');

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const pkg = await getCatalogItemApi('package', packageId);
      setPackageName(pkg.name);
      setCourseIntro(pkg.instructions?.courseIntro || null);
      setCourses(pkg.courses || []);
      const myEnrollments = await getMyEnrollmentsApi();
      setEnrollments(myEnrollments);
    } catch (err: any) {
      setError(err.message || 'Failed to load the course(s) for this package');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId]);

  const isCourseUnlocked = (courseId: string) =>
    enrollments.some((e) => e.itemType === 'course' && e.itemId === courseId && e.status !== 'failed' && e.packageId === packageId);

  const anyUnlocked = courses.some((c) => isCourseUnlocked(c.id));

  const handlePayForCourse = async (course: CourseRow) => {
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

    setPayingCourseId(course.id);
    try {
      const { enrollment: pendingEnrollment, costKsh } = await enrollApi('course', course.id, packageId);

      if (pendingEnrollment.status === 'in_progress' || pendingEnrollment.status === 'completed') {
        setEnrollments((prev) => [...prev.filter((e) => e.id !== pendingEnrollment.id), pendingEnrollment]);
        setPayingCourseId(null);
        return;
      }

      const reference = `apex-course-${pendingEnrollment.id}-${Date.now()}`;

      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: candidateEmail,
        amount: costKsh * 100,
        currency: 'KES',
        ref: reference,
        metadata: { enrollmentId: pendingEnrollment.id, itemType: 'course', itemId: course.id, packageId },
        callback: (response) => {
          verifyEnrollmentPaymentApi(pendingEnrollment.id, response.reference)
            .then((updated) => setEnrollments((prev) => [...prev.filter((e) => e.id !== updated.id), updated]))
            .catch((err: any) => {
              setError(
                err.message ||
                  `We could not confirm your payment. Please contact support with reference: ${response.reference}`
              );
            })
            .finally(() => setPayingCourseId(null));
        },
        onClose: () => setPayingCourseId(null)
      });

      handler.openIframe();
    } catch (err: any) {
      setError(err.message || 'Could not start payment for this course');
      setPayingCourseId(null);
    }
  };

  const handleRedeemCode = async () => {
    setCodeError('');
    if (!firmId) {
      setCodeError('Please select the recruitment firm that gave you this code.');
      return;
    }
    if (!/^[A-Za-z0-9]{7}$/.test(code.trim())) {
      setCodeError('Codes are 7 characters. Please check the code and try again.');
      return;
    }
    setRedeeming(true);
    try {
      await redeemPackageCourseCodeApi(packageId, firmId, code.trim());
      await loadAll();
      setUnlockMode(null);
      setCode('');
      setFirmId('');
    } catch (err: any) {
      setCodeError(err.message || 'That code is not valid for the selected recruitment firm.');
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-fog flex items-center justify-center p-4">
        <p className="text-sm text-muted">Loading course…</p>
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
            Atesta International Assessment Dashboard
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight max-w-2xl">
            Package Course Stage
          </h1>
          <p className="text-sm text-white/85 max-w-2xl leading-relaxed">
            Welcome, {candidateName.split(' ')[0]}. {courses.length > 1 ? 'These courses walk' : 'This course walks'} you
            through the core knowledge required before your exams and interview. Study, complete the modules, then move on.
          </p>

          <div className="bg-white/10 border border-white/20 rounded-lg p-4 sm:p-5 space-y-1.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/80">
              <Layers className="h-3.5 w-3.5" />
              {packageName ? `${packageName} · ` : ''}Certification Package
            </p>
            <h2 className="font-display text-lg font-bold">{courses.length > 1 ? `${courses.length} Courses` : 'Course'}</h2>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-line shadow-[0_1px_2px_rgba(15,85,53,0.06),0_12px_28px_-10px_rgba(15,85,53,0.18)] overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-brand-600 via-brand-500 to-mint-400" />

          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shadow-sm shadow-brand-900/20 shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase block">
                  Course · {packageName}
                </span>
                <h1 className="font-display text-xl font-bold text-ink">
                  {courses.length > 1 ? `${courses.length} courses in this package` : 'Course for this package'}
                </h1>
              </div>
            </div>

            <p className="text-sm text-muted leading-relaxed">
              {courseIntro ||
                'This course is optional but recommended — it walks you through everything you are expected to know by the end of your studies, ahead of your exam and interview.'}
            </p>

            <div className="border border-line rounded-lg p-5 bg-brand-50 space-y-2">
              <h2 className="font-display text-sm font-bold text-ink">Why this course matters</h2>
              <p className="text-xs text-muted leading-relaxed">
                The course prepares you for real role tasks, not just test performance. Completing it helps you approach
                exams and interviews with stronger practical context.
              </p>
            </div>

            {error && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">{error}</div>}

            {/* ── Course list ── */}
            <div className="space-y-3">
              {courses.map((course) => {
                const unlocked = isCourseUnlocked(course.id);
                return (
                  <div key={course.id} className="border border-line rounded-lg p-4 sm:p-5 bg-fog space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-base font-bold text-ink">{course.name}</h2>
                        {course.durationDays && (
                          <span className="flex items-center gap-1 mt-1 text-xs text-muted font-mono">
                            <CalendarDays className="h-3.5 w-3.5" /> About {course.durationDays} days
                          </span>
                        )}
                      </div>
                      {unlocked ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-brand-700 shrink-0">
                          <CheckCircle2 className="h-4 w-4" /> Unlocked
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-muted shrink-0">
                          <Lock className="h-4 w-4" /> Locked
                        </span>
                      )}
                    </div>

                    {unlocked && (
                      <button
                        type="button"
                        onClick={() => onStartCourse(course.id)}
                        className="w-full max-w-xs mx-auto py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg shadow-sm transition cursor-pointer"
                      >
                        Continue Course
                      </button>
                    )}
                  </div>
                );
              })}
              {courses.length === 0 && <p className="text-sm text-muted text-center py-6">No course assigned to this package yet.</p>}
            </div>

            {/* ── Unlock card — only shown if at least one course is still locked ── */}
            {courses.length > 0 && !anyUnlocked && (
              <div className="border border-line rounded-lg p-5 bg-white space-y-4">
                <p className="text-sm font-semibold text-ink">Unlock the course{courses.length > 1 ? 's' : ''}</p>
                <p className="text-xs text-muted">
                  Pay for this package's course{courses.length > 1 ? 's' : ''}, or use a code from an affiliate
                  recruitment firm if you already have one.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUnlockMode('pay')}
                    className={`py-2.5 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition ${
                      unlockMode === 'pay' ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-line text-ink hover:bg-fog'
                    }`}
                  >
                    <CreditCard className="h-4 w-4" /> Pay
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnlockMode('code')}
                    className={`py-2.5 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition ${
                      unlockMode === 'code' ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-line text-ink hover:bg-fog'
                    }`}
                  >
                    <KeyRound className="h-4 w-4" /> I have a code
                  </button>
                </div>

                {unlockMode === 'pay' && (
                  <div className="space-y-2 pt-2">
                    {courses.map((course) => (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => handlePayForCourse(course)}
                        disabled={payingCourseId === course.id}
                        className="w-full max-w-xs mx-auto py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg shadow-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {payingCourseId === course.id ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin" /> Processing…
                          </>
                        ) : (
                          'Start Course'
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {unlockMode === 'code' && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-ink block mb-1">Recruitment firm</label>
                      <select
                        value={firmId}
                        onChange={(e) => setFirmId(e.target.value)}
                        className="w-full px-3 py-2.5 border border-line rounded-lg text-sm bg-white"
                      >
                        <option value="">Select a firm…</option>
                        {AFFILIATE_FIRMS.map((firm) => (
                          <option key={firm.id} value={firm.id}>
                            {firm.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-ink block mb-1">7-character code</label>
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        maxLength={7}
                        placeholder="e.g. A1B2C3D"
                        className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-mono tracking-widest uppercase bg-white"
                      />
                    </div>
                    {codeError && <p className="text-xs text-rose-700">{codeError}</p>}
                    <button
                      type="button"
                      onClick={handleRedeemCode}
                      disabled={redeeming}
                      className="w-full max-w-xs mx-auto py-2.5 bg-ink hover:bg-black text-white font-display font-bold text-sm rounded-lg shadow-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {redeeming ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" /> Checking code…
                        </>
                      ) : (
                        'Use code to unlock'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};