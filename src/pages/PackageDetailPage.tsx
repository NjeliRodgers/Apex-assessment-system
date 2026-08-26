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
  Layers
} from 'lucide-react';
import {
  getCatalogItemApi,
  CatalogItemDetail,
  getPackageTermsApi,
  acceptPackageTermsApi
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
  onGoToPackageExams: () => void;
  onGoToPackageCourse: () => void;
  onGoToInterview: (id: string, name: string) => void;
  onLogout: () => void;
  onGoToEnrollments?: () => void;
  onGoToCertificates?: () => void;
  onGoToProfile?: () => void;
}

const getInitials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?';

export const PackageDetailPage: React.FC<PackageDetailPageProps> = ({
  packageId,
  highlightExamId,
  candidateName,
  candidateEmail,
  candidateStatus,
  onBack,
  onGoToPackageExams,
  onGoToPackageCourse,
  onGoToInterview,
  onLogout,
  onGoToEnrollments,
  onGoToCertificates,
  onGoToProfile
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [pkg, setPkg] = useState<CatalogItemDetail | null>(null);
  const [terms, setTerms] = useState<{ accepted: boolean; acceptedAt: string | null }>({ accepted: false, acceptedAt: null });
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [examIdInput, setExamIdInput] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [detail, termsStatus] = await Promise.all([
        getCatalogItemApi('package', packageId),
        getPackageTermsApi(packageId)
      ]);
      setPkg(detail);
      setTerms(termsStatus);
      setCheckboxChecked(termsStatus.accepted);
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

  // Auto-jump to the Exams page if the candidate arrived here by verifying
  // an Exam ID on the Dashboard.
  const didAutoJump = useRef(false);
  useEffect(() => {
    if (didAutoJump.current) return;
    if (!pkg || !highlightExamId) return;
    const exams = pkg.exams || [];
    if (!exams.some((e) => e.id === highlightExamId)) return;
    if (!modulesUnlocked) return;
    didAutoJump.current = true;
    onGoToPackageExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg, highlightExamId]);

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
  const moduleCount = 1 + (hasExams ? 1 : 0) + (hasCourses ? 1 : 0) + (hasInterview ? 1 : 0);
  const modulesUnlocked = checkboxChecked;
  const allExamsPassed = hasExams && exams.every((e: any) => e.passed === true);

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
            Standardized Testing, Master Courses &amp; Combined Certification Packages
          </h1>
          <p className="text-sm text-white/85 max-w-2xl leading-relaxed">
            Welcome, {candidateName.split(' ')[0]}. Each exam, the course, and the AI-agent interview in this
            package are paid for independently — review the instructions below, then open each module when
            you're ready.
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
            {pkg.description && <p className="text-sm text-white/85 leading-relaxed">{pkg.description}</p>}
          </div>

          {hasExams && (
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
                  placeholder="e.g. ATESTA-EX-9041"
                  className="flex-1 px-4 py-2.5 bg-white/95 text-ink placeholder:text-muted rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (exams.some((e) => e.id.toLowerCase() === examIdInput.trim().toLowerCase())) {
                      onGoToPackageExams();
                    }
                  }}
                  className="px-5 py-2.5 bg-ink hover:bg-black text-white text-sm font-bold rounded-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Verify &amp; Launch Exam
                </button>
              </div>
            </div>
          )}
        </div>

        {error && <div className="p-3 bg-rose-50 text-rose-700 text-sm rounded-md border border-rose-200">{error}</div>}

        {/* ── Module 1: Instructions & Guidelines — always free to read ── */}
        <div className="bg-white rounded-lg border border-line shadow-[0_1px_2px_rgba(15,85,53,0.06)] p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shrink-0">
                <ListChecks className="h-5 w-5" />
              </div>
              <div>
                <p className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase">Module 1 · Free to read</p>
                <h2 className="font-display text-xl font-bold text-ink">Instructions and Guidelines</h2>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {hasCourses && (
                <button
                  type="button"
                  disabled={!modulesUnlocked}
                  onClick={onGoToPackageCourse}
                  className="px-4 py-2 bg-ink hover:bg-ink/90 text-white text-xs sm:text-sm font-semibold rounded-md border border-black/10 shadow-sm shadow-black/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Courses ({courses.length})
                </button>
              )}
              {hasExams && (
                <button
                  type="button"
                  disabled={!modulesUnlocked}
                  onClick={onGoToPackageExams}
                  className="px-4 py-2 bg-ink hover:bg-ink/90 text-white text-xs sm:text-sm font-semibold rounded-md border border-black/10 shadow-sm shadow-black/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Exams ({exams.length})
                </button>
              )}
              {hasInterview && (
                <button
                  type="button"
                  disabled={!modulesUnlocked || !allExamsPassed}
                  onClick={() => onGoToInterview(packageId, pkg.name)}
                  title={!allExamsPassed ? 'Pass all exams in this package first' : undefined}
                  className="px-4 py-2 bg-ink hover:bg-ink/90 text-white text-xs sm:text-sm font-semibold rounded-md border border-black/10 shadow-sm shadow-black/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  International Job Screening
                </button>
              )}
            </div>
          </div>

          {(hasExams || hasCourses) && (
            <div className="flex flex-wrap gap-2">
              {exams.map((exam) => (
                <button
                  key={exam.id}
                  type="button"
                  disabled={!modulesUnlocked}
                  onClick={onGoToPackageExams}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-brand-200 bg-brand-50 text-brand-800 text-xs font-semibold hover:bg-brand-100 hover:border-brand-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
                >
                  <FileCheck2 className="h-3.5 w-3.5" />
                  {exam.name}
                </button>
              ))}
              {courses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  disabled={!modulesUnlocked}
                  onClick={onGoToPackageCourse}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-brand-200 bg-brand-50 text-brand-800 text-xs font-semibold hover:bg-brand-100 hover:border-brand-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  {course.name}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-4 text-sm text-muted leading-relaxed">
            <p>
              <span className="font-semibold text-ink">What this package carries: </span>
              {pkg.instructions?.whatItCarries ? pkg.instructions.whatItCarries : (
                <>
                  {pkg.name}{hasExams ? ` includes ${exams.length === 1 ? 'an exam' : `${exams.length} exams`}` : ''}
                  {hasCourses ? `, ${courses.length === 1 ? 'a short course' : `${courses.length} short courses`}` : ''}
                  {hasInterview ? ', and a mandatory AI-agent interview' : ''}. Each exam, the course, and the
                  interview are paid for independently — there is no single combined package payment.
                </>
              )}
            </p>

            <div className="border border-line rounded-lg bg-fog p-4 space-y-2">
              <p className="text-xs font-semibold text-ink uppercase tracking-wide">Why study it</p>
              <p className="text-sm text-muted leading-6">
                {pkg.instructions?.whyStudyIt || `This package is built for candidates working toward standardized,
                verifiable proof of competence in this field the kind employers and
                recruiters can check independently. Pick the package that matches your
                own profession or the role you're applying for. Every package on Atesta is
                scoped to a specific professional track, so choose the one that reflects
                what you actually do or want to be assessed on.`}
              </p>
            </div>

            <p className="leading-7 text-gray-700">
              <span className="font-semibold text-ink">Why the certificate matters: </span>
              {pkg.instructions?.whyCertificateMatters ? (
                pkg.instructions.whyCertificateMatters.split('\n').map((para, i) => (
                  <span key={i}>
                    {para}
                    <br />
                    <br />
                  </span>
                ))
              ) : (
                <>
                  Atesta study provides a structured learning path and career journey for every candidate, with a professional certificate designed to
                  demonstrate your knowledge, skills, and readiness for your next career opportunity.
                  Atesta provides standardized courses, examinations, and structured interview assessments
                  that help candidates prepare for the expectations of employers and recruitment firms
                  connecting talent with local and international opportunities across Africa and beyond.
                  <br /><br />
                  Once earned, your certificate belongs to you and can be shared with employers and
                  recruitment firms. Each certificate includes a unique verification code and scannable
                  verification feature, allowing its authenticity and achievement to be independently
                  confirmed quickly and easily. This gives employers greater confidence in your
                  qualifications and can support faster, more reliable candidate screening.
                  <br /><br />
                  We take assessment integrity seriously. Every candidate is expected to complete
                  courses, examinations, and interview assessments honestly and independently. Candidates
                  should ensure they have a reliable internet connection, a suitable device, and a
                  quiet environment before beginning an assessment. Any attempt to cheat, impersonate
                  another person, manipulate an assessment, or provide false information may result in
                  disqualification and the cancellation or withholding of certification.
                  <br /><br />
                  Prepare thoroughly, take every stage seriously, and give your best effort. Your Atesta
                  credential represents an achievement you have earned and can carry with you throughout
                  your professional journey. We wish you success as you prepare for your next career
                  opportunity.
                </>
              )}
            </p>

            <div className="border border-line rounded-lg bg-fog p-4 space-y-2">
              <p className="text-xs font-semibold text-ink uppercase tracking-wide">How to complete this package</p>
              <ol className="space-y-1.5 text-sm text-muted list-decimal list-inside">
                {pkg.instructions?.howToCompleteSteps?.length ? (
                  pkg.instructions.howToCompleteSteps.map((step, i) => <li key={i}>{step}</li>)
                ) : (
                  <>
                    {hasCourses && <li>(Optional) Pay for or unlock the short course with an affiliate code, then study it.</li>}
                    {hasExams && <li>Pay for and sit each exam assigned to this package, and reach the pass mark on all of them.</li>}
                    {hasInterview && <li>Once every exam is passed, pay for and complete the AI-agent interview.</li>}
                    <li>Once you have passed everything required, you are issued a Certificate of Completion by our HR team.</li>
                  </>
                )}
              </ol>
            </div>

            <div className="flex items-start gap-2.5 border border-brand-200 bg-brand-50/60 rounded-lg p-4">
              <ShieldCheck className="h-4 w-4 text-brand-700 shrink-0 mt-0.5" />
              <p className="text-xs text-brand-800 leading-relaxed">
                {pkg.instructions?.confidentialityNote || `Your information is kept confidential and secure. Exam answers, interview recordings, and personal
                details are only used to assess and certify you, and are never shared outside the Atesta and HR team during review
                process.`}
              </p>
            </div>
          </div>

          {/* Terms acknowledgement — no payment here, just unlocks the module links below */}
          <div className="border-t border-line pt-5 space-y-4">
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
            {!modulesUnlocked && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Accept the terms above to open the Exams, Course, or AI-agent interview modules below.
              </p>
            )}
          </div>
        </div>

        {/* ── Module directory: each item is its own page with its own payment ── */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">All Modules ({moduleCount})</p>

          {hasExams && (
            <button
              type="button"
              disabled={!modulesUnlocked}
              onClick={onGoToPackageExams}
              className="w-full text-left bg-white rounded-lg border border-line shadow-[0_1px_2px_rgba(15,85,53,0.06)] p-6 flex items-center justify-between gap-4 cursor-pointer hover:border-brand-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center shrink-0">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase">
                    Module 2 · {exams.length === 1 ? '1 exam' : `${exams.length} exams`} · Paid independently
                  </p>
                  <h2 className="font-display text-lg font-bold text-ink">Exams</h2>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted shrink-0" />
            </button>
          )}

          {hasCourses && (
            <button
              type="button"
              disabled={!modulesUnlocked}
              onClick={onGoToPackageCourse}
              className="w-full text-left bg-white rounded-lg border border-line shadow-[0_1px_2px_rgba(15,85,53,0.06)] p-6 flex items-center justify-between gap-4 cursor-pointer hover:border-brand-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase">
                    Module 3 · {courses.length === 1 ? '1 course' : `${courses.length} courses`} · Pay or use an affiliate code
                  </p>
                  <h2 className="font-display text-lg font-bold text-ink">Course</h2>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted shrink-0" />
            </button>
          )}

          {hasInterview && (
            <button
              type="button"
              disabled={!modulesUnlocked || !allExamsPassed}
              onClick={() => onGoToInterview(packageId, pkg.name)}
              title={!allExamsPassed ? 'Pass all exams in this package first' : undefined}
              className="w-full text-left bg-white rounded-lg border border-line shadow-[0_1px_2px_rgba(15,85,53,0.06)] p-6 flex items-center justify-between gap-4 cursor-pointer hover:border-brand-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-ink text-white flex items-center justify-center shrink-0">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase">
                    Module 4 · {allExamsPassed ? 'Unlocked' : 'Unlocks after all exams are passed'} · Paid independently
                  </p>
                  <h2 className="font-display text-lg font-bold text-ink">International Job Screening</h2>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted shrink-0" />
            </button>
          )}
        </div>

        <p className="text-[11px] text-muted text-center pb-4">
          Payments are processed securely by Paystack. Your card or mobile money details are never seen by Atesta.
        </p>
      </main>
    </div>
  );
};