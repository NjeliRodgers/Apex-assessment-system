import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Layers,
  Award,
  KeyRound,
  UserCircle2,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ListChecks,
  FileCheck2,
  BookOpen,
  Bot,
  Lock,
  ShieldCheck,
  X
} from 'lucide-react';
import {
  getCatalogItemApi,
  CatalogItemDetail,
  getMyEnrollmentsApi,
  enrollApi,
  verifyEnrollmentPaymentApi,
  ApexEnrollment,
  getPackageTermsApi,
  acceptPackageTermsApi,
  getMyInterviewAccessApi,
  InterviewAccess,
  getMyCourseModulesApi
} from '../api/apexCatalogApi';

interface PackageDetailPageProps {
  packageId: string;
  candidateName: string;
  candidateEmail: string;
  candidateStatus?: string;
  onBack: () => void;
  onStartExam: (examId: string) => void;
  onStartCourse: (courseId: string) => void;
  onGoToInterview: (examId: string, examName: string) => void;
  onLogout: () => void;
  onGoToEnrollments?: () => void;
  onGoToCertificates?: () => void;
  onGoToProfile?: () => void;
}

const getInitials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?';

type ModuleKey = 'all' | 'instructions' | 'exam' | 'course' | 'interview';

export const PackageDetailPage: React.FC<PackageDetailPageProps> = ({
  packageId,
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
  const [enrollment, setEnrollment] = useState<ApexEnrollment | null>(null);
  const [terms, setTerms] = useState<{ accepted: boolean; acceptedAt: string | null }>({ accepted: false, acceptedAt: null });
  const [interviewAccess, setInterviewAccess] = useState<InterviewAccess | null>(null);
  const [examPassed, setExamPassed] = useState(false);
  const [courseProgress, setCourseProgress] = useState<{ done: number; total: number } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleKey>('all');
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [examIdInput, setExamIdInput] = useState('');

  const heroRef = useRef<HTMLDivElement>(null);
  const instructionsRef = useRef<HTMLDivElement>(null);
  const examRef = useRef<HTMLDivElement>(null);
  const courseRef = useRef<HTMLDivElement>(null);
  const interviewRef = useRef<HTMLDivElement>(null);
  const [highlighted, setHighlighted] = useState<ModuleKey | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [detail, enrollments, termsStatus] = await Promise.all([
        getCatalogItemApi('package', packageId),
        getMyEnrollmentsApi(),
        getPackageTermsApi(packageId)
      ]);
      setPkg(detail);
      setTerms(termsStatus);
      setCheckboxChecked(termsStatus.accepted);

      const pkgEnrollment = enrollments.find(
        (e) => e.itemType === 'package' && e.itemId === packageId && e.status !== 'failed'
      );
      setEnrollment(pkgEnrollment || null);

      const isPaidUp = pkgEnrollment?.status === 'in_progress' || pkgEnrollment?.status === 'completed';

      if (isPaidUp && detail.exam) {
        const access = await getMyInterviewAccessApi(detail.exam.id);
        setInterviewAccess(access);
        setExamPassed(access.eligible);
      }

      if (isPaidUp && detail.course) {
        try {
          const modules = await getMyCourseModulesApi(detail.course.id);
          setCourseProgress({ done: modules.completedModuleIds.length, total: modules.modules.length });
        } catch {
          setCourseProgress(null);
        }
      }
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

  const isPaidUp = enrollment?.status === 'in_progress' || enrollment?.status === 'completed';

  const handleCheckboxChange = async (checked: boolean) => {
    setCheckboxChecked(checked);
    if (checked && !terms.accepted) {
      try {
        const updated = await acceptPackageTermsApi(packageId);
        setTerms(updated);
      } catch (err: any) {
        setError(err.message || 'Failed to save your acceptance. Please try again.');
        setCheckboxChecked(false);
      }
    }
  };

  const handleProceedToPayment = async () => {
    setShowPriceModal(false);
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
    if (!pkg) return;

    setProcessing(true);
    try {
      const { enrollment: pendingEnrollment, costKsh } = await enrollApi('package', packageId);
      setEnrollment(pendingEnrollment);

      if (pendingEnrollment.status === 'in_progress' || pendingEnrollment.status === 'completed') {
        setProcessing(false);
        await load();
        return;
      }

      const reference = `apex-enroll-${pendingEnrollment.id}-${Date.now()}`;
      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: candidateEmail,
        amount: costKsh * 100,
        currency: 'KES',
        ref: reference,
        metadata: { enrollmentId: pendingEnrollment.id, itemType: 'package', itemId: packageId },
        callback: (response) => {
          verifyEnrollmentPaymentApi(pendingEnrollment.id, response.reference)
            .then(async (updated) => {
              setEnrollment(updated);
              await load();
            })
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

  const scrollToModule = (key: ModuleKey) => {
    setActiveModule(key);
    const refMap: Partial<Record<ModuleKey, React.RefObject<HTMLDivElement | null>>> = {
      instructions: instructionsRef,
      exam: examRef,
      course: courseRef,
      interview: interviewRef
    };
    const ref = refMap[key];
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setHighlighted(key);
      setTimeout(() => setHighlighted((h) => (h === key ? null : h)), 1600);
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

  const moduleCount = 1 + (pkg.exam ? 1 : 0) + (pkg.course ? 1 : 0) + (pkg.exam ? 1 : 0); // instructions + exam + course + interview(mirrors exam)

  const lockedNotice = (label: string) => (
    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
      <Lock className="h-3.5 w-3.5 shrink-0" />
      Please complete payment to unlock {label}.
    </div>
  );

  const highlightClass = (key: ModuleKey) =>
    highlighted === key ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-fog' : '';

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
                APEX <span className="text-brand-600">ASSESSMENT</span>
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
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-brand-700 cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to catalog
        </button>

        {/* Hero — same card as Dashboard, plus this package's description */}
        <div
          ref={heroRef}
          className="rounded-xl bg-gradient-to-br from-brand-700 via-brand-600 to-mint-500 p-6 sm:p-10 text-white space-y-6 shadow-sm shadow-brand-900/20"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[11px] font-semibold uppercase tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            Apex International Assessment Dashboard
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight max-w-2xl">
            Standardized Testing, Master Courses &amp; Combined Certification Packages
          </h1>
          <p className="text-sm text-white/85 max-w-2xl leading-relaxed">
            Welcome, {candidateName.split(' ')[0]}. Take assigned or public exams, complete specialized short
            courses, or pursue combined packages to receive an official downloadable Apex Assessment PDF
            certificate.
          </p>

          {/* Package identity + description — kept in addition to the text above, not replacing it */}
          <div className="bg-white/10 border border-white/20 rounded-lg p-4 sm:p-5 space-y-1.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/80">
              <Layers className="h-3.5 w-3.5" />
              {pkg.category ? `${pkg.category} · ` : ''}Certification Package
            </p>
            <h2 className="font-display text-lg font-bold">{pkg.name}</h2>
            {pkg.description && <p className="text-sm text-white/85 leading-relaxed">{pkg.description}</p>}
          </div>

          <div className="bg-white/10 border border-white/20 rounded-lg p-4 sm:p-5 space-y-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/90">
              <KeyRound className="h-4 w-4" />
              Assigned an Exam ID in your recruitment email?
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={examIdInput}
                onChange={(e) => setExamIdInput(e.target.value)}
                placeholder="e.g. APEX-EX-9041"
                className="flex-1 px-4 py-2.5 bg-white/95 text-ink placeholder:text-muted rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (pkg.exam && examIdInput.trim().toLowerCase() === pkg.exam.id.toLowerCase()) {
                    scrollToModule('exam');
                  }
                }}
                className="px-5 py-2.5 bg-ink hover:bg-black text-white text-sm font-bold rounded-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                Verify &amp; Launch Exam
              </button>
            </div>
          </div>
        </div>

        {/* Module tabs */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveModule('all')}
              className={`px-3.5 py-2 rounded-md text-xs font-bold border cursor-pointer transition ${
                activeModule === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Modules ({moduleCount})
            </button>
            <button
              type="button"
              onClick={() => scrollToModule('instructions')}
              className={`px-3.5 py-2 rounded-md text-xs font-bold border cursor-pointer transition ${
                activeModule === 'instructions' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Instructions and Guidelines (1)
            </button>
            {pkg.exam && (
              <button
                type="button"
                onClick={() => scrollToModule('exam')}
                className={`px-3.5 py-2 rounded-md text-xs font-bold border cursor-pointer transition ${
                  activeModule === 'exam' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Exams (1)
              </button>
            )}
            <button
              type="button"
              onClick={() => pkg.course && scrollToModule('course')}
              className={`px-3.5 py-2 rounded-md text-xs font-bold border cursor-pointer transition ${
                activeModule === 'course' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Courses ({pkg.course ? 1 : 0})
            </button>
            {pkg.exam && (
              <button
                type="button"
                onClick={() => scrollToModule('interview')}
                className={`px-3.5 py-2 rounded-md text-xs font-bold border cursor-pointer transition ${
                  activeModule === 'interview' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                AI-agent interview
              </button>
            )}
          </div>
        </div>

        {error && <div className="p-3 bg-rose-50 text-rose-700 text-sm rounded-md border border-rose-200">{error}</div>}

        {/* ── Module 1: Instructions & Guidelines — always unlocked ── */}
        <div
          ref={instructionsRef}
          className={`bg-white rounded-lg border border-line shadow-[0_1px_2px_rgba(15,85,53,0.06)] p-6 sm:p-8 space-y-6 transition ${highlightClass('instructions')}`}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shrink-0">
              <ListChecks className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase">Module 1 · Free to read</p>
              <h2 className="font-display text-xl font-bold text-ink">Instructions &amp; Guidelines</h2>
            </div>
          </div>

          <div className="space-y-4 text-sm text-muted leading-relaxed">
            <p>
              <span className="font-semibold text-ink">What this package carries: </span>
              {pkg.name}{pkg.exam ? ` includes the ${pkg.exam.name} exam` : ''}{pkg.course ? `, the ${pkg.course.name} short course (optional)` : ''}
              {pkg.exam ? ', and a mandatory AI-agent interview' : ''}. You pay once for the whole package there is no
              separate charge for the exam, the course, or the AI-agent interview.
            </p>

            <div className="border border-line rounded-lg bg-fog p-4 space-y-2">
  <p className="text-xs font-semibold text-ink uppercase tracking-wide">
    Why study it
  </p>

  <p className="text-sm text-muted leading-6">
    This package is built for candidates working toward standardized,
    verifiable proof of competence in this field the kind employers and
    recruiters can check independently. Pick the package that matches your
    own profession or the role you're applying for. Every package on Apex is
    scoped to a specific professional track, so choose the one that reflects
    what you actually do or want to be assessed on.
  </p>
</div>

           <p className="leading-7 text-gray-700">
  <span className="font-semibold text-ink">Why the certificate matters: </span>
  Apex study provide a structured learning path and career journey for every candidate,with a professional certificate designed to
  demonstrate your knowledge, skills, and readiness for your next career opportunity.
  Apex provides standardized courses, examinations, and structured interview assessments
  that help candidates prepare for the expectations of employers and recruitment firms
  connecting talent with local and international opportunities across Africa and beyond.
  <br />
  <br />
  Once earned, your certificate belongs to you and can be shared with employers and
  recruitment firms. Each certificate includes a unique verification code and scannable
  verification feature, allowing its authenticity and achievement to be independently
  confirmed quickly and easily. This gives employers greater confidence in your
  qualifications and can support faster, more reliable candidate screening.
  <br />
  <br />
  We take assessment integrity seriously. Every candidate is expected to complete
  courses, examinations, and interview assessments honestly and independently. Candidates
  should ensure they have a reliable internet connection, a suitable device, and a
  quiet environment before beginning an assessment. Any attempt to cheat, impersonate
  another person, manipulate an assessment, or provide false information may result in
  disqualification and the cancellation or withholding of certification.
  <br />
  <br />
  Prepare thoroughly, take every stage seriously, and give your best effort. Your Apex
  credential represents an achievement you have earned and can carry with you throughout
  your professional journey. We wish you success as you prepare for your next career
  opportunity.
</p>

<div className="border border-line rounded-lg bg-fog p-4 space-y-2">
              <p className="text-xs font-semibold text-ink uppercase tracking-wide">How to complete this package</p>
              <ol className="space-y-1.5 text-sm text-muted list-decimal list-inside">
                {pkg.course && <li>(Optional) Study the short course with the provided materials.</li>}
                {pkg.exam && <li>Sit for the exam and reach the pass mark.</li>}
                {pkg.exam && <li>Complete the AI-agent interview and reach its pass mark.</li>}
                <li>Once you have passed both, You are given a Certificate of Completion By Our HR Team.</li>
              </ol>
            </div>

            <div className="flex items-start gap-2.5 border border-brand-200 bg-brand-50/60 rounded-lg p-4">
              <ShieldCheck className="h-4 w-4 text-brand-700 shrink-0 mt-0.5" />
              <p className="text-xs text-brand-800 leading-relaxed">
                Your information is kept confidential and secure. Exam answers, interview recordings, and personal
                details are only used to assess and certify you, and are never shared outside the Apex and HR team during review
                process.
              </p>
            </div>
          </div>

          {/* Terms & payment gate */}
          <div className="border-t border-line pt-5 space-y-4">
            {isPaidUp ? (
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
                <CheckCircle2 className="h-4 w-4" />
                Payment complete Exams, Courses, and the AI-agent interview are unlocked below.
              </div>
            ) : (
              <>
                <label className="flex items-start gap-2.5 text-sm text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkboxChecked}
                    onChange={(e) => handleCheckboxChange(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-line accent-brand-600 cursor-pointer"
                  />
                  <span>
                    I have read and understood the Instructions and Guidelines above, and I accept the Terms &amp;
                    Conditions for this package.
                  </span>
                </label>

                <button
                  type="button"
                  disabled={!checkboxChecked || processing}
                  onClick={() => setShowPriceModal(true)}
                  className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg shadow-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {checkboxChecked ? 'Continue to Payment' : 'Accept the terms above to continue'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Module 2: Exam ── */}
        {pkg.exam && (
          <div
            ref={examRef}
            className={`bg-white rounded-lg border border-line shadow-[0_1px_2px_rgba(15,85,53,0.06)] p-6 space-y-4 transition ${highlightClass('exam')}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center shrink-0">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase">Module 2 · Required</p>
                  <h2 className="font-display text-lg font-bold text-ink">{pkg.exam.name}</h2>
                </div>
              </div>
              {examPassed && (
                <span className="flex items-center gap-1 text-xs font-semibold text-brand-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Passed
                </span>
              )}
            </div>

            {!isPaidUp ? (
              lockedNotice('the exam')
            ) : (
              <button
                type="button"
                onClick={() => onStartExam(pkg.exam!.id)}
                className="w-full sm:w-auto px-6 py-2.5 bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold rounded-md shadow-sm cursor-pointer"
              >
                {examPassed ? 'Review Exam' : 'Start Exam'}
              </button>
            )}
          </div>
        )}

        {/* ── Module 3: Course (optional) ── */}
        <div
          ref={courseRef}
          className={`bg-white rounded-lg border border-line shadow-[0_1px_2px_rgba(15,85,53,0.06)] p-6 space-y-4 transition ${highlightClass('course')}`}
        >
          {pkg.course ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase">Module 3 · Optional</p>
                    <h2 className="font-display text-lg font-bold text-ink">{pkg.course.name}</h2>
                  </div>
                </div>
                {courseProgress && courseProgress.total > 0 && (
                  <span className="text-xs font-semibold text-muted">
                    {courseProgress.done}/{courseProgress.total} modules done
                  </span>
                )}
              </div>

              {!isPaidUp ? (
                lockedNotice('the course')
              ) : (
                <button
                  type="button"
                  onClick={() => onStartCourse(pkg.course!.id)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold rounded-md shadow-sm cursor-pointer"
                >
                  {courseProgress && courseProgress.done === courseProgress.total && courseProgress.total > 0
                    ? 'Review Course'
                    : 'Start Course'}
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">This package doesn't include a short course.</p>
          )}
        </div>

        {/* ── Module 4: AI-agent interview ── */}
        {pkg.exam && (
          <div
            ref={interviewRef}
            className={`bg-white rounded-lg border border-line shadow-[0_1px_2px_rgba(15,85,53,0.06)] p-6 space-y-4 transition ${highlightClass('interview')}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ink text-white flex items-center justify-center shrink-0">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase">Module 4 · Required</p>
                <h2 className="font-display text-lg font-bold text-ink">AI-Agent Interview</h2>
              </div>
            </div>

            {!isPaidUp ? (
              lockedNotice('the AI-agent interview')
            ) : !examPassed ? (
              lockedNotice('by passing the exam first')
            ) : interviewAccess?.enrollmentStatus === 'completed' ? (
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
                <CheckCircle2 className="h-4 w-4" /> Interview completed and passed
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onGoToInterview(pkg.exam!.id, pkg.exam!.name)}
                className="w-full sm:w-auto px-6 py-2.5 bg-ink hover:bg-black text-white text-sm font-bold rounded-md shadow-sm cursor-pointer"
              >
                Continue to AI Interview
              </button>
            )}
          </div>
        )}

        <p className="text-[11px] text-muted text-center pb-4">
          Payments are processed securely by Paystack. Your card or mobile money details are never seen by Apex.
        </p>
      </main>

      {/* Price reveal modal — Task 6 */}
      {showPriceModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPriceModal(false)} />
          <div className="relative bg-white rounded-xl border border-line shadow-xl w-full max-w-sm p-6 space-y-5">
            <button
              type="button"
              onClick={() => setShowPriceModal(false)}
              className="absolute top-3 right-3 text-muted hover:text-ink cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-center space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Package Cost</p>
              <p className="font-display text-3xl font-bold text-ink">KSh {pkg.costKsh.toLocaleString()}</p>
              <p className="text-xs text-muted">{pkg.name}</p>
            </div>
            <button
              type="button"
              onClick={handleProceedToPayment}
              disabled={processing}
              className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg shadow-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {processing ? 'Waiting for payment…' : 'Proceed'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};