import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  KeyRound,
  UserCircle2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ListChecks,
  FileCheck2,
  BookOpen,
  Bot,
  ShieldCheck,
  Layers,
  Lock,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  CreditCard
} from 'lucide-react';
import {
  getCatalogItemApi,
  CatalogItemDetail,
  getPackageTermsApi,
  acceptPackageTermsApi,
  getPackageProgressSummaryApi,
  PackageProgressSummary,
  getMyEnrollmentsApi,
  enrollApi,
  verifyEnrollmentPaymentApi,
  AFFILIATE_FIRMS,
  redeemPackageCourseCodeApi,
  ApexEnrollment
} from '../api/apexCatalogApi';

interface PackageDetailPageProps {
  packageId: string;
  // Set when the candidate arrived here via the Dashboard's "Verify & Launch
  // Exam" box — jumps straight to the Exams page once loaded, instead of
  // making them find it themselves.
  highlightExamId?: string;
  candidateName: string;
  candidateEmail: string;
  candidateStatus?: string;
  onBack: () => void;
  onStartExam: (examId: string) => void;
  onStartCourse: (courseId: string) => void;
  onGoToInterview: (id: string, name: string) => void;
  onLogout: () => void;
  onGoToEnrollments?: () => void;
  onGoToCertificates?: () => void;
  onGoToProfile?: () => void;
}

interface PaymentIntent {
  type: 'exam';
  id: string;
  name: string;
  amountKsh: number;
}

const getInitials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?';

const shortenWords = (text: string, maxWords: number) => {
  const normalized = text.trim().replace(/\s+/g, ' ');
  const words = normalized.split(' ');
  if (words.length <= maxWords) return normalized;
  return `${words.slice(0, maxWords).join(' ')}...`;
};

export const PackageDetailPage: React.FC<PackageDetailPageProps> = ({
  packageId,
  highlightExamId,
  candidateName,
  candidateEmail,
  candidateStatus,
  onBack,
  onStartExam,
  onStartCourse,
  onGoToInterview,
  onLogout,
  onGoToEnrollments,
  onGoToCertificates,
  onGoToProfile
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [pkg, setPkg] = useState<CatalogItemDetail | null>(null);
  const [terms, setTerms] = useState<{ accepted: boolean; acceptedAt: string | null }>({ accepted: false, acceptedAt: null });
  const [summary, setSummary] = useState<PackageProgressSummary | null>(null);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [packageSearchInput, setPackageSearchInput] = useState('');
  const [activeModule, setActiveModule] = useState<'instructions' | 'course' | 'exam' | 'screening'>('instructions');
  const [enrollments, setEnrollments] = useState<ApexEnrollment[]>([]);
  const [payingCourseId, setPayingCourseId] = useState<string | null>(null);
  const [processingExamId, setProcessingExamId] = useState<string | null>(null);
  const [firmId, setFirmId] = useState('');
  const [code, setCode] = useState('');
  const [redeemingCode, setRedeemingCode] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [showStartTrainingModal, setShowStartTrainingModal] = useState(false);
  const [scrollRatio, setScrollRatio] = useState(0);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [detail, termsStatus, progression] = await Promise.all([
        getCatalogItemApi('package', packageId),
        getPackageTermsApi(packageId),
        getPackageProgressSummaryApi(packageId)
      ]);
      setPkg(detail);
      setTerms(termsStatus);
      setSummary(progression);
      setCheckboxChecked(termsStatus.accepted);
      const myEnrollments = await getMyEnrollmentsApi();
      setEnrollments(myEnrollments);
    } catch (err: any) {
      setError(err.message || 'Failed to load this package');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId]);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const totalScrollable = doc.scrollHeight - window.innerHeight;
      if (totalScrollable <= 0) {
        setScrollRatio(0);
        return;
      }
      setScrollRatio(Math.min(1, Math.max(0, window.scrollY / totalScrollable)));
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Auto-jump to the Exams page if the candidate arrived here by verifying
  // an Exam ID on the Dashboard.
  const didAutoJump = useRef(false);
  const termsAccepted = summary?.termsAccepted || terms.accepted || checkboxChecked;
  const modulesUnlocked = termsAccepted;

  useEffect(() => {
    if (didAutoJump.current) return;
    if (!pkg || !highlightExamId) return;
    const exams = pkg.exams || [];
    if (!exams.some((e) => e.id === highlightExamId)) return;
    if (!modulesUnlocked) return;
    didAutoJump.current = true;
    setActiveModule('exam');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg, highlightExamId]);

  const refreshProgress = async () => {
    const [myEnrollments, progression] = await Promise.all([
      getMyEnrollmentsApi(),
      getPackageProgressSummaryApi(packageId)
    ]);
    setEnrollments(myEnrollments);
    setSummary(progression);
  };

  const handlePayForCourse = async (courseId: string) => {
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

    setPayingCourseId(courseId);
    try {
      const { enrollment: pendingEnrollment, costKsh } = await enrollApi('course', courseId, packageId);

      if (pendingEnrollment.status === 'in_progress' || pendingEnrollment.status === 'completed') {
        await refreshProgress();
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
        metadata: { enrollmentId: pendingEnrollment.id, itemType: 'course', itemId: courseId, packageId },
        callback: (response) => {
          verifyEnrollmentPaymentApi(pendingEnrollment.id, response.reference)
            .then(async () => {
              await refreshProgress();
            })
            .catch((err: any) => {
              setError(err.message || `We could not confirm your payment. Reference: ${response.reference}`);
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

  const handlePayForExam = async (examId: string) => {
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

    setProcessingExamId(examId);
    try {
      const { enrollment: pendingEnrollment, costKsh } = await enrollApi('exam', examId, packageId);

      if (pendingEnrollment.status === 'in_progress' || pendingEnrollment.status === 'completed') {
        await refreshProgress();
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
        metadata: { enrollmentId: pendingEnrollment.id, itemType: 'exam', itemId: examId, packageId },
        callback: (response) => {
          verifyEnrollmentPaymentApi(pendingEnrollment.id, response.reference)
            .then(async () => {
              await refreshProgress();
            })
            .catch((err: any) => {
              setError(err.message || `We could not confirm your payment. Reference: ${response.reference}`);
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

  const handleRedeemCode = async () => {
    setCodeError('');
    if (!firmId) {
      setCodeError('Select the recruitment firm that gave you this code.');
      return;
    }
    if (!/^[A-Za-z0-9]{7}$/.test(code.trim())) {
      setCodeError('Codes are 7 characters. Confirm the code and try again.');
      return;
    }
    setRedeemingCode(true);
    try {
      await redeemPackageCourseCodeApi(packageId, firmId, code.trim());
      await refreshProgress();
      setShowStartTrainingModal(false);
      setFirmId('');
      setCode('');
    } catch (err: any) {
      setCodeError(err.message || 'This code is not valid for the selected firm.');
    } finally {
      setRedeemingCode(false);
    }
  };

  const handleCheckboxChange = async (checked: boolean) => {
    setCheckboxChecked(checked);
    if (checked && !terms.accepted) {
      try {
        const updated = await acceptPackageTermsApi(packageId);
        setTerms(updated);
        const refreshed = await getPackageProgressSummaryApi(packageId);
        setSummary(refreshed);
      } catch (err: any) {
        setError(err.message || 'Failed to save your acceptance. Please try again.');
        setCheckboxChecked(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-fog flex items-center justify-center p-4">
        <p className="text-sm text-muted">Loading this package…</p>
      </div>
    );
  }

  if (error && !pkg) {
    return (
      <div className="min-h-screen bg-fog flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-3">
          <p className="text-sm text-rose-700">{error}</p>
          <button type="button" onClick={onBack} className="text-xs font-semibold text-brand-700 hover:text-brand-800 cursor-pointer">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!pkg) return null;

  const exams = pkg.exams || [];
  const courses = pkg.courses || [];
  const hasExams = exams.length > 0;
  const hasCourses = courses.length > 0;
  const hasInterview = hasExams; // interview is gated by exams, so it only exists if exams exist
  const allExamsPassed = hasExams && !!summary && summary.exams.passed === summary.exams.total;
  const interviewUnlocked = !!summary?.interview.unlocked && modulesUnlocked;
  const analyticsVisible = !!summary?.analyticsVisible;
  const packageSummaryText = pkg.instructions?.whatItCarries
    ? shortenWords(pkg.instructions.whatItCarries, 30)
    : `${pkg.name}${hasExams ? ` includes ${exams.length === 1 ? 'an exam' : `${exams.length} exams`}` : ''}${hasCourses ? `, ${courses.length === 1 ? 'a short course' : `${courses.length} short courses`}` : ''}${hasInterview ? ', and an AI interview' : ''}. Complete each step to finish certification review.`;
  const whyStudyText = shortenWords(
    pkg.instructions?.whyStudyIt ||
      'This package prepares you for one career track with practical and standardized proof of competence that employers can trust.',
    28
  );
  const certificateText = shortenWords(
    pkg.instructions?.whyCertificateMatters ||
      'Your certificate confirms completed learning and assessment steps with a verification code recruiters can validate quickly.',
    24
  );
  const confidentialityText = shortenWords(
    pkg.instructions?.confidentialityNote ||
      'Your personal data, exam responses, and interview records are kept private and used only for assessment and certification review.',
    24
  );
  const instructionSteps = pkg.instructions?.howToCompleteSteps?.length
    ? pkg.instructions.howToCompleteSteps.slice(0, 4).map((step) => shortenWords(step, 14))
    : [
        'Confirm the Package ID from your recruiter email.',
        ...(hasCourses ? [`Complete the assigned course module${courses.length > 1 ? 's' : ''}.`] : []),
        ...(hasExams ? ['Take and pass each assigned exam.'] : []),
        ...(hasInterview ? ['Finish the AI interview after exam completion.'] : []),
        'Wait for review, then download your certificate.'
      ].slice(0, 4);

  const launchDefaultModule = () => {
    if (!modulesUnlocked) {
      setActiveModule('instructions');
      return;
    }
    if (hasCourses) {
      setActiveModule('course');
      return;
    }
    if (hasExams) {
      setActiveModule('exam');
      return;
    }
    setActiveModule('screening');
  };

  const launchTrainingNow = () => {
    setShowStartTrainingModal(false);
    if (!modulesUnlocked) {
      setActiveModule('instructions');
      return;
    }

    const firstUnlockedCourse = courses.find((course) => {
      const enrollment = enrollments.find(
        (item) =>
          item.itemType === 'course' &&
          item.itemId === course.id &&
          item.packageId === packageId &&
          item.status !== 'failed' &&
          item.status !== 'pending'
      );
      return !!enrollment;
    });

    if (firstUnlockedCourse) {
      onStartCourse(firstUnlockedCourse.id);
      return;
    }

    if (hasCourses) {
      setActiveModule('course');
      return;
    }

    if (hasExams) {
      setActiveModule('exam');
      return;
    }

    setActiveModule('screening');
  };

  const moduleSteps = [
    {
      id: 'instructions' as const,
      title: 'Instructions',
      subtitle: termsAccepted ? 'Accepted' : 'Read and accept',
      icon: <ListChecks className="h-4 w-4" />,
      locked: false
    },
    {
      id: 'course' as const,
      title: 'Course',
      subtitle: hasCourses
        ? `${summary?.courses.completed || 0}/${summary?.courses.total || courses.length} completed`
        : 'Not required',
      icon: <BookOpen className="h-4 w-4" />,
      locked: !modulesUnlocked || !hasCourses
    },
    {
      id: 'exam' as const,
      title: 'Exam',
      subtitle: hasExams
        ? `${summary?.exams.passed || 0}/${summary?.exams.total || exams.length} passed`
        : 'Not required',
      icon: <FileCheck2 className="h-4 w-4" />,
      locked: !modulesUnlocked || !hasExams
    },
    {
      id: 'screening' as const,
      title: 'Screening',
      subtitle: hasInterview
        ? interviewUnlocked
          ? summary?.interview.completed
            ? 'Completed'
            : 'Unlocked'
          : 'Locked'
        : 'Not required',
      icon: <Bot className="h-4 w-4" />,
      locked: !hasInterview
    }
  ];

  const completionPercent = summary?.overall.completionPercent || 0;
  const totalCourseCost = courses.reduce((sum, course) => sum + Number(course.costKsh || 0), 0);
  const courseCompleted = !hasCourses || ((summary?.courses.completed || 0) >= (summary?.courses.total || 0));
  const shouldShowBottomAction = scrollRatio >= 0.74 && modulesUnlocked;
  const shouldShowScrollDown = scrollRatio < 0.9;
  const lockedCourses = courses.filter((course) => {
    const enrollment = enrollments.find(
      (item) =>
        item.itemType === 'course' &&
        item.itemId === course.id &&
        item.packageId === packageId &&
        item.status !== 'failed'
    );
    return !enrollment || enrollment.status === 'pending';
  });
  const primaryLockedCourse = lockedCourses[0] || null;
  const firstIncompleteExamIndex = exams.findIndex((exam) => {
    const enrollment = enrollments.find(
      (item) =>
        item.itemType === 'exam' &&
        item.itemId === exam.id &&
        item.packageId === packageId &&
        item.status !== 'failed'
    );
    return enrollment?.status !== 'completed';
  });
  const visibleExamLimit = firstIncompleteExamIndex === -1 ? exams.length : firstIncompleteExamIndex + 1;
  const visibleExams = exams.slice(0, visibleExamLimit);
  const hiddenExamsCount = Math.max(0, exams.length - visibleExams.length);
  const stepCards = [
    {
      id: 'read',
      label: 'Read & Accept',
      detail: 'Module 1 terms and guidance',
      done: termsAccepted
    },
    {
      id: 'course',
      label: 'Course Training',
      detail: hasCourses ? `${summary?.courses.completed || 0}/${summary?.courses.total || courses.length} completed` : 'Not required in this package',
      done: !hasCourses || ((summary?.courses.completed || 0) >= (summary?.courses.total || 0))
    },
    {
      id: 'exam',
      label: 'Exams',
      detail: hasExams ? `${summary?.exams.passed || 0}/${summary?.exams.total || exams.length} passed` : 'Not required in this package',
      done: !hasExams || allExamsPassed
    },
    {
      id: 'interview',
      label: 'Job Screening',
      detail: hasInterview
        ? summary?.interview.completed
          ? 'Completed'
          : interviewUnlocked
          ? 'Unlocked'
          : 'Locked until all exams pass'
        : 'Not required in this package',
      done: !hasInterview || !!summary?.interview.completed
    }
  ];

  const moduleLockMessage = 'Read Module 1 and accept the terms first to unlock the next modules.';

  return (
    <div
      className="min-h-screen bg-fog"
      style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #d7e6dc 1px, transparent 0)',
        backgroundSize: '22px 22px'
      }}
    >
      {/* Top bar — same as Dashboard */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-line">
        <div className="w-full px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onBack} className="flex items-center gap-2.5 cursor-pointer group">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shadow-sm shadow-brand-900/20">
              <Award className="h-4 w-4" />
            </div>
            <div className="leading-tight text-left">
              <p className="font-display font-bold text-sm text-ink">
                ATESTA <span className="text-brand-600">ASSESSMENT</span>
              </p>
              <p className="font-mono text-[10px] tracking-[0.1em] text-muted uppercase group-hover:text-brand-600">
                ← Back to Dashboard
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1.5 flex-wrap">
            {onGoToProfile && (
              <button
                type="button"
                onClick={onGoToProfile}
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-brand-700 px-2 cursor-pointer"
              >
                <UserCircle2 className="h-4 w-4" />
                My Profile &amp; Progress
              </button>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2 pl-1 pr-1 sm:pr-3 py-1 rounded-full border border-line bg-white hover:border-brand-300 cursor-pointer"
            >
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {getInitials(candidateName)}
              </span>
              <span className="hidden sm:block text-xs font-bold text-ink">{candidateName.split(' ')[0]}</span>
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-white border border-line rounded-lg shadow-lg z-20 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-white text-sm font-bold flex items-center justify-center shrink-0">
                      {getInitials(candidateName)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink truncate">{candidateName}</p>
                      {candidateEmail && <p className="text-[11px] text-muted truncate">{candidateEmail}</p>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-line">
                    <span className="text-[11px] text-muted">Status</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                        candidateStatus === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {candidateStatus || 'Active'}
                    </span>
                  </div>
                  {onGoToEnrollments && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        onGoToEnrollments();
                      }}
                      className="w-full flex items-center justify-between gap-2 pt-2 border-t border-line text-ink hover:text-brand-700 cursor-pointer group"
                    >
                      <span className="flex items-center gap-1.5 text-xs font-semibold">
                        <ListChecks className="h-4 w-4 text-brand-600" />
                        My Enrollments
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted group-hover:text-brand-700" />
                    </button>
                  )}
                  {onGoToCertificates && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        onGoToCertificates();
                      }}
                      className="w-full flex items-center justify-between gap-2 pt-2 border-t border-line text-ink hover:text-brand-700 cursor-pointer group"
                    >
                      <span className="flex items-center gap-1.5 text-xs font-semibold">
                        <Award className="h-4 w-4 text-brand-600" />
                        My Certificates
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted group-hover:text-brand-700" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-full text-center text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md py-2 cursor-pointer mt-1 transition"
                  >
                    Log Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="sticky top-[74px] z-[9] bg-white/95 backdrop-blur rounded-lg border border-line px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-ink mb-1.5">
            <span>Certification progress</span>
            <span>{completionPercent}% to certificate readiness</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-700 via-brand-600 to-mint-500" style={{ width: `${completionPercent}%` }} />
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-brand-700 cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to catalog
        </button>

        {/* Hero */}
        <div className="rounded-xl bg-gradient-to-br from-brand-700 via-brand-600 to-mint-500 p-6 sm:p-10 text-white space-y-6 shadow-sm shadow-brand-900/20">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[11px] font-semibold uppercase tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            Atesta International Assessment Dashboard
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight max-w-2xl">
            Package Learning and Assessment Journey
          </h1>
          <p className="text-sm text-white/85 max-w-2xl leading-relaxed">
            Welcome, {candidateName.split(' ')[0]}. This package follows a clear progression: accept Module 1 terms,
            complete training, pass all assigned exams, then finish the international job screening interview.
          </p>

          <div className="bg-white/10 border border-white/20 rounded-lg p-4 sm:p-5 space-y-1.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/80">
              <Layers className="h-3.5 w-3.5" />
              {pkg.category ? `${pkg.category} · ` : ''}Certification Package
            </p>
            <h2 className="font-display text-lg font-bold">
              {pkg.name}
              {pkg.packageId && <span className="font-bold"> - {pkg.packageId}</span>}
            </h2>
            {pkg.packageId && (
              <p className="text-xs text-white/85 leading-relaxed">
                Package ID {pkg.packageId} is your unique package reference from recruiter emails.
              </p>
            )}
            {pkg.description && <p className="text-sm text-white/85 leading-relaxed">{pkg.description}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {stepCards.map((step, index) => (
              <div key={step.id} className="rounded-lg border border-white/25 bg-white/10 px-3.5 py-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/75">Step {index + 1}</p>
                <p className="text-sm font-semibold text-white mt-0.5">{step.label}</p>
                <p className="text-[11px] text-white/80 mt-1 leading-relaxed">{step.detail}</p>
                <span className={`inline-flex items-center gap-1 mt-2 text-[11px] font-semibold ${step.done ? 'text-emerald-100' : 'text-amber-100'}`}>
                  {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {step.done ? 'Completed' : 'Pending'}
                </span>
              </div>
            ))}
          </div>

          {hasExams && (
            <div className="bg-white/10 border border-white/20 rounded-lg p-4 sm:p-5 space-y-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/90">
                <KeyRound className="h-4 w-4" />
                Search your assigned Package ID
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={packageSearchInput}
                  onChange={(e) => setPackageSearchInput(e.target.value)}
                  placeholder="e.g. PKG-AT-09041"
                  className="flex-1 px-4 py-2.5 bg-white/95 text-ink placeholder:text-muted rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-white"
                />
                <button
                  type="button"
                  disabled={!packageSearchInput.trim()}
                  onClick={() => {
                    const term = packageSearchInput.trim().toLowerCase();
                    const matched = term === packageId.toLowerCase() || (!!pkg.packageId && term === pkg.packageId.toLowerCase());
                    if (matched) {
                      setError('');
                      launchDefaultModule();
                    } else {
                      setError('Package ID not found here. Confirm the ID from your recruiter email and try again.');
                    }
                  }}
                  className="px-5 py-2.5 bg-ink hover:bg-black text-white text-sm font-bold rounded-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Search &amp; Launch Package
                </button>
              </div>
              <p className="text-xs text-white/80">
                Enter your Package ID to jump directly into this package workflow and continue from the correct step.
              </p>
            </div>
          )}
        </div>

        {error && <div className="p-3 bg-rose-50 text-rose-700 text-sm rounded-md border border-rose-200">{error}</div>}
        <div className="bg-white rounded-xl border border-line shadow-[0_8px_26px_-16px_rgba(15,85,53,0.3)] p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            <aside className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-24 h-fit">
              <div className="rounded-xl border border-brand-200 bg-gradient-to-b from-brand-50 to-white p-4">
                <p className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase">Package Flow</p>
                <div className="mt-4 space-y-1.5">
                  {moduleSteps.map((step, index) => {
                    const isActive = activeModule === step.id;
                    const isDone = step.id === 'instructions'
                      ? termsAccepted
                      : step.id === 'course'
                      ? (summary?.courses.completed || 0) >= (summary?.courses.total || 0)
                      : step.id === 'exam'
                      ? allExamsPassed
                      : !!summary?.interview.completed;
                    const isLockedByFlow = step.id !== 'instructions' && !modulesUnlocked;

                    return (
                      <button
                        key={step.id}
                        type="button"
                        disabled={step.locked || isLockedByFlow}
                        onClick={() => setActiveModule(step.id)}
                        className={`w-full text-left rounded-lg border px-3 py-3 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                          isActive
                            ? 'bg-brand-700 border-brand-700 text-white shadow-md'
                            : 'bg-white border-line text-ink hover:border-brand-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative mt-0.5">
                            <span
                              className={`w-7 h-7 rounded-full border flex items-center justify-center ${
                                isActive
                                  ? 'bg-white text-brand-700 border-white'
                                  : isDone
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : 'bg-white text-brand-600 border-brand-300'
                              }`}
                            >
                              {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.icon}
                            </span>
                            {index < moduleSteps.length - 1 && (
                              <span className={`absolute left-1/2 top-7 -translate-x-1/2 h-7 w-px ${isActive ? 'bg-white/60 animate-pulse' : 'bg-brand-200'}`} />
                            )}
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-ink'}`}>{step.title}</p>
                            <p className={`text-xs ${isActive ? 'text-white/80' : 'text-muted'}`}>{step.subtitle}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            <section className="lg:col-span-8 xl:col-span-9 space-y-5">
              {activeModule === 'instructions' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shrink-0">
                      <ListChecks className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase">Module 1 · Instructions</p>
                      <h2 className="font-display text-xl font-bold text-ink">Quick Instructions</h2>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm text-muted leading-6">
                    <p>
                      <span className="font-semibold text-ink">Package summary: </span>
                      {packageSummaryText}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="border border-line rounded-lg bg-fog p-3 space-y-1.5">
                        <p className="text-[11px] font-semibold text-ink uppercase tracking-wide">Why study it</p>
                        <p className="text-sm text-muted">{whyStudyText}</p>
                      </div>
                      <div className="border border-line rounded-lg bg-fog p-3 space-y-1.5">
                        <p className="text-[11px] font-semibold text-ink uppercase tracking-wide">Certificate value</p>
                        <p className="text-sm text-muted">{certificateText}</p>
                      </div>
                    </div>

                    <div className="border border-line rounded-lg bg-fog p-3 space-y-1.5">
                      <p className="text-[11px] font-semibold text-ink uppercase tracking-wide">Complete in 4 steps</p>
                      <ol className="space-y-1 text-sm text-muted list-decimal list-inside">
                        {instructionSteps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>

                    <div className="flex items-start gap-2 border border-brand-200 bg-brand-50/60 rounded-lg p-3">
                      <ShieldCheck className="h-4 w-4 text-brand-700 shrink-0 mt-0.5" />
                      <p className="text-xs text-brand-800 leading-relaxed">{confidentialityText}</p>
                    </div>
                  </div>

                  <div className="border-t border-line pt-4 space-y-3">
                    <label className="flex items-start gap-2.5 text-sm text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checkboxChecked}
                        onChange={(e) => handleCheckboxChange(e.target.checked)}
                        disabled={termsAccepted}
                        className="mt-0.5 h-4 w-4 rounded border-line accent-brand-600 cursor-pointer"
                      />
                      <span>
                        I have read the quick instructions and I accept the package Terms &amp; Conditions.
                      </span>
                    </label>
                    {termsAccepted && (
                      <p className="text-xs text-brand-700">
                        Terms accepted. You can now move to Course, Exam, and Screening from the stepper on the left.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeModule === 'course' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-line bg-brand-50/70 p-5">
                    <h3 className="font-display text-lg font-bold text-ink">Course Access and Training Funding</h3>
                    <p className="mt-2 text-sm text-muted leading-relaxed">
                      Course payment and employer access-code redemption are now available directly from the
                      <strong> Start Training {'>>'} </strong> action in Module 1 to keep your flow simple.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {courses.map((course) => {
                      const enrollment = enrollments.find(
                        (item) =>
                          item.itemType === 'course' &&
                          item.itemId === course.id &&
                          item.packageId === packageId &&
                          item.status !== 'failed'
                      );
                      const unlocked = !!enrollment && enrollment.status !== 'pending';

                      return (
                        <div key={course.id} className="rounded-lg border border-line bg-fog p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-display text-base font-bold text-ink">{course.name}</p>
                              <p className="text-xs text-muted">Amount: KSh {course.costKsh.toLocaleString()}</p>
                            </div>
                            <span className={`text-xs font-semibold ${unlocked ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {unlocked ? 'Unlocked' : 'Locked'}
                            </span>
                          </div>

                          {unlocked ? (
                            <button
                              type="button"
                              onClick={() => onStartCourse(course.id)}
                              className="px-4 py-2 rounded-md bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold cursor-pointer"
                            >
                              Launch Course
                            </button>
                          ) : (
                            <p className="text-xs text-muted">
                              Locked. Use <span className="font-semibold text-ink">Start Training {'>>'}</span> to pay or apply an employer code.
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {courses.length === 0 && <p className="text-sm text-muted">No course is assigned to this package.</p>}
                  </div>
                </div>
              )}

              {activeModule === 'exam' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-line bg-amber-50/70 p-5">
                    <h3 className="font-display text-lg font-bold text-ink">Exam Payment and Launch</h3>
                    <p className="mt-2 text-sm text-muted leading-relaxed">
                      Review each exam amount below and pay only when you are ready to sit the certification test.
                      Payment activates your exam access immediately.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {visibleExams.map((exam, index) => {
                      const enrollment = enrollments.find(
                        (item) =>
                          item.itemType === 'exam' &&
                          item.itemId === exam.id &&
                          item.packageId === packageId &&
                          item.status !== 'failed'
                      );
                      const paid = !!enrollment && enrollment.status !== 'pending';
                      const previousExam = index > 0 ? visibleExams[index - 1] : null;
                      const previousEnrollment = previousExam
                        ? enrollments.find(
                            (item) =>
                              item.itemType === 'exam' &&
                              item.itemId === previousExam.id &&
                              item.packageId === packageId &&
                              item.status !== 'failed'
                          )
                        : null;
                      const previousDone = !previousExam || previousEnrollment?.status === 'completed';

                      return (
                        <div key={exam.id} className="rounded-lg border border-line bg-fog p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-display text-base font-bold text-ink">{exam.name}</p>
                              <p className="text-xs text-muted">Amount: KSh {exam.costKsh.toLocaleString()}</p>
                              <div className="text-xs text-muted mt-1 flex gap-3">
                                {exam.passMarkPercent && <span>Pass mark: {exam.passMarkPercent}%</span>}
                                {exam.timeLimitMinutes && <span>Time: {exam.timeLimitMinutes} min</span>}
                              </div>
                            </div>
                            <span className={`text-xs font-semibold ${paid ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {paid ? 'Paid' : 'Awaiting payment'}
                            </span>
                          </div>

                          {!previousDone && (
                            <p className="text-xs text-muted bg-white border border-line rounded-md px-3 py-2">
                              Complete the previous exam first to unlock this step.
                            </p>
                          )}

                          {previousDone && !paid && (
                            <button
                              type="button"
                              disabled={processingExamId === exam.id || !modulesUnlocked}
                              onClick={() =>
                                setPaymentIntent({
                                  type: 'exam',
                                  id: exam.id,
                                  name: exam.name,
                                  amountKsh: Number(exam.costKsh || 0)
                                })
                              }
                              className="px-4 py-2 rounded-md bg-ink hover:bg-black text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processingExamId === exam.id ? 'Processing...' : `Pay KSh ${exam.costKsh.toLocaleString()} and Unlock Exam`}
                            </button>
                          )}

                          {previousDone && paid && (
                            <button
                              type="button"
                              onClick={() => onStartExam(exam.id)}
                              className="px-4 py-2 rounded-md bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold cursor-pointer"
                            >
                              Launch Exam
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {hiddenExamsCount > 0 && (
                      <div className="rounded-lg border border-dashed border-line bg-white p-4 text-xs text-muted">
                        {hiddenExamsCount} upcoming exam{hiddenExamsCount === 1 ? '' : 's'} will unlock after you complete the current exam.
                      </div>
                    )}

                    {exams.length === 0 && <p className="text-sm text-muted">No exam is assigned to this package.</p>}
                  </div>
                </div>
              )}

              {activeModule === 'screening' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-line bg-slate-50 p-5">
                    <h3 className="font-display text-lg font-bold text-ink">International Job Screening</h3>
                    <p className="mt-2 text-sm text-muted leading-relaxed">
                      This is the final stage. Pass all required exams first, then launch your AI screening interview.
                      {typeof pkg.interviewCostKsh === 'number' && pkg.interviewCostKsh > 0
                        ? ` Interview fee: KSh ${pkg.interviewCostKsh.toLocaleString()}.`
                        : ' Interview fee is shown at launch if applicable.'}
                    </p>
                  </div>

                  <div className="rounded-lg border border-line bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Status</p>
                    <p className="text-sm text-ink mt-1">
                      {summary?.interview.completed
                        ? 'Completed'
                        : interviewUnlocked
                        ? 'Ready to launch'
                        : 'Locked until all package exams are passed'}
                    </p>
                    <button
                      type="button"
                      disabled={!interviewUnlocked}
                      onClick={() => onGoToInterview(packageId, pkg.name)}
                      className="mt-3 px-4 py-2 rounded-md bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Launch Screening
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg border border-line p-4 sm:p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center shrink-0">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase">Progress Analytics</p>
                    <h2 className="font-display text-lg font-bold text-ink">Certification progression</h2>
                  </div>
                </div>

                {analyticsVisible && summary ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-ink mb-1.5">
                        <span>Overall completion</span>
                        <span>{completionPercent}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-brand-600 to-mint-500" style={{ width: `${completionPercent}%` }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-lg border border-line p-3 bg-fog">
                        <p className="text-[11px] uppercase tracking-wide text-muted">Course</p>
                        <p className="text-sm font-bold text-ink mt-1">{summary.courses.completed}/{summary.courses.total} completed</p>
                      </div>
                      <div className="rounded-lg border border-line p-3 bg-fog">
                        <p className="text-[11px] uppercase tracking-wide text-muted">Exams</p>
                        <p className="text-sm font-bold text-ink mt-1">{summary.exams.passed}/{summary.exams.total} passed</p>
                      </div>
                      <div className="rounded-lg border border-line p-3 bg-fog">
                        <p className="text-[11px] uppercase tracking-wide text-muted">Interview</p>
                        <p className="text-sm font-bold text-ink mt-1">{summary.interview.completed ? 'Completed' : summary.interview.unlocked ? 'Unlocked' : 'Locked'}</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-3 text-xs text-brand-900">
                      Next action: {summary.overall.nextAction}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-line bg-slate-50 p-4 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/65 backdrop-blur-[1px]" />
                    <div className="relative space-y-3">
                      <div className="h-2 rounded-full bg-slate-200" />
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="h-16 rounded-md bg-slate-200/80" />
                        <div className="h-16 rounded-md bg-slate-200/80" />
                        <div className="h-16 rounded-md bg-slate-200/80" />
                      </div>
                      <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5" />
                        Analytics unlock after the first paid or redeemed training module.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        <p className="text-[11px] text-muted text-center pb-4">
          Continue every step from this single package workspace using the left stepper flow.
        </p>
      </main>

      {activeModule === 'instructions' && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 px-3 w-full max-w-md">
          <button
            type="button"
            onClick={() => setShowStartTrainingModal(true)}
            className="w-full py-3 rounded-full bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm shadow-[0_14px_34px_-16px_rgba(15,85,53,0.55)] border border-brand-800/40 transition cursor-pointer"
          >
            Start Training {'>>'}
          </button>
        </div>
      )}

      {shouldShowScrollDown && (
        <button
          type="button"
          onClick={() => window.scrollBy({ top: Math.round(window.innerHeight * 0.78), behavior: 'smooth' })}
          className="fixed right-5 bottom-20 z-40 w-11 h-11 rounded-full bg-white border border-line text-brand-700 hover:text-brand-800 hover:border-brand-300 shadow-md flex items-center justify-center cursor-pointer"
          aria-label="Scroll down"
          title="Scroll down"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}

      {shouldShowBottomAction && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 px-3 w-full max-w-lg">
          <div className="bg-white border border-line rounded-2xl shadow-[0_20px_45px_-24px_rgba(15,85,53,0.45)] px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {courseCompleted
                ? 'Coursework looks complete. Continue to your exam stage.'
                : 'Continue your coursework, then proceed to exams.'}
            </p>
            <button
              type="button"
              onClick={() => setActiveModule(courseCompleted && hasExams ? 'exam' : 'course')}
              className="shrink-0 px-4 py-2 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold cursor-pointer"
            >
              {courseCompleted && hasExams ? 'Complete Coursework & Start Exam' : 'Continue Coursework'}
            </button>
          </div>
        </div>
      )}

      {showStartTrainingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 flex items-center justify-center p-4" onClick={() => setShowStartTrainingModal(false)}>
          <div className="w-full max-w-xl bg-white rounded-2xl border border-line shadow-xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-brand-600 uppercase">Before You Start</p>
              <h3 className="font-display text-xl font-bold text-ink mt-1">Training Funding & Access</h3>
              <p className="text-sm text-muted mt-2 leading-relaxed">
                This package has paid coursework. If your recruiter or employer gave you an access code,
                you can use it below to unlock your training.
              </p>
            </div>

            <div className="rounded-lg border border-line bg-fog p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted">Coursework Access Amount</p>
              <p className="text-lg font-bold text-ink mt-1">KSh {totalCourseCost.toLocaleString()}</p>
            </div>

            <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-xs text-brand-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4 shrink-0" />
              <span>Option 1: use your employer access code first. Option 2: pay to access if you do not have a valid code.</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink block">Option 1 - Access Code from Employer</label>
              <select
                value={firmId}
                onChange={(e) => setFirmId(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-lg text-sm"
              >
                <option value="">Select recruitment firm</option>
                {AFFILIATE_FIRMS.map((firm) => (
                  <option key={firm.id} value={firm.id}>{firm.name}</option>
                ))}
              </select>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter 7-character access code"
                className="w-full px-3 py-2 border border-line rounded-lg text-sm font-mono tracking-widest uppercase"
              />
              {codeError && <p className="text-xs text-rose-700">{codeError}</p>}
              <button
                type="button"
                disabled={redeemingCode}
                onClick={handleRedeemCode}
                className="w-full px-4 py-2 rounded-lg border border-brand-300 bg-brand-50 hover:bg-brand-100 text-brand-800 text-sm font-semibold disabled:opacity-50"
              >
                {redeemingCode ? 'Checking code...' : '1. Use Access Code to Unlock'}
              </button>
            </div>

            <div className="pt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowStartTrainingModal(false)}
                className="px-4 py-2 rounded-lg border border-line text-xs font-semibold text-muted hover:text-ink hover:bg-fog cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!modulesUnlocked) {
                    setActiveModule('instructions');
                    setShowStartTrainingModal(false);
                    return;
                  }

                  if (!primaryLockedCourse) {
                    launchTrainingNow();
                    return;
                  }

                  setShowStartTrainingModal(false);
                  setActiveModule('course');
                  void handlePayForCourse(primaryLockedCourse.id);
                }}
                disabled={Boolean(payingCourseId)}
                className="px-4 py-2 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold cursor-pointer"
              >
                {payingCourseId ? 'Opening payment...' : primaryLockedCourse ? '2. Pay to Access' : 'Start Training'}
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentIntent && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 flex items-center justify-center p-4" onClick={() => setPaymentIntent(null)}>
          <div className="w-full max-w-lg bg-white rounded-2xl border border-line shadow-xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-brand-600 uppercase">Payment confirmation</p>
              <h3 className="font-display text-xl font-bold text-ink mt-1">
                Continue to exam payment?
              </h3>
              <p className="text-sm text-muted mt-2 leading-relaxed">
                You are about to unlock the next package step through secure Paystack checkout.
              </p>
            </div>

            <div className="rounded-lg border border-line bg-fog p-4 space-y-2">
              <p className="text-sm font-bold text-ink">{paymentIntent.name}</p>
              <p className="text-xs text-muted">Type: Exam</p>
              <p className="text-sm font-semibold text-ink">Amount: KSh {paymentIntent.amountKsh.toLocaleString()}</p>
            </div>

            <div className="pt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPaymentIntent(null)}
                className="px-4 py-2 rounded-lg border border-line text-xs font-semibold text-muted hover:text-ink hover:bg-fog cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handlePayForExam(paymentIntent.id);
                  setPaymentIntent(null);
                }}
                className="px-4 py-2 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold cursor-pointer"
              >
                Continue to Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};