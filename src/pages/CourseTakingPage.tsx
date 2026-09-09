import React, { useEffect, useMemo, useState } from 'react';
import { getMyCourseModulesApi, markModuleCompleteApi, ApexCourseModule } from '../api/apexCatalogApi';
import {
  BookOpen,
  CheckCircle2,
  HelpCircle,
  LoaderCircle,
  Award,
  FileText,
  Video,
  Link2,
  ChevronRight,
  X,
  Clock,
  Sparkles,
  Trophy,
  BarChart3,
  ChevronDown
} from 'lucide-react';

interface CourseTakingPageProps {
  courseId: string;
  packageId?: string;
  onBack: () => void;
  onGoToExam: () => void;
}

type Stage = 'notes' | 'summary' | 'quiz';

const CHUNK_SIZE = 4;

const splitParagraphs = (text: string): string[] =>
  (text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

const chunkParagraphs = (arr: string[], size: number): string[][] => {
  if (arr.length === 0) return [[]];
  const out: string[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const estimateMinutes = (module: ApexCourseModule): number => {
  const words = `${module.contentBody || ''} ${module.summary || ''}`.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 180));
};

const getYouTubeEmbedUrl = (url: string): string | null => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
};

export const CourseTakingPage: React.FC<CourseTakingPageProps> = ({ courseId, packageId, onBack, onGoToExam }) => {
  const [courseName, setCourseName] = useState('');
  const [modules, setModules] = useState<ApexCourseModule[]>([]);
  const [completedModuleIds, setCompletedModuleIds] = useState<string[]>([]);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('notes');
  const [pageIndex, setPageIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [resultPopup, setResultPopup] = useState<{ score: number; total: number; isLastModule: boolean } | null>(null);
  const [showPdf, setShowPdf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState('');
  const [scrollRatio, setScrollRatio] = useState(0);

  const loadCourse = () => {
    setLoading(true);
    setError('');
    getMyCourseModulesApi(courseId, packageId)
      .then((data) => {
        const sorted = [...data.modules].sort((a, b) => a.orderIndex - b.orderIndex);
        setCourseName(data.course.name);
        setModules(sorted);
        setCompletedModuleIds(data.completedModuleIds);
        setActiveModuleId((current) => current || sorted[0]?.id || null);
      })
      .catch((err: Error) => setError(err.message || 'Could not load this course.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, packageId]);

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

  const activeModule = modules.find((m) => m.id === activeModuleId) || null;
  const activeIndex = modules.findIndex((m) => m.id === activeModuleId);
  const allDone = modules.length > 0 && modules.every((m) => completedModuleIds.includes(m.id));
  const completionPercent = modules.length > 0 ? Math.round((completedModuleIds.length / modules.length) * 100) : 0;

  const paragraphs = useMemo(() => (activeModule ? splitParagraphs(activeModule.contentBody || '') : []), [activeModule]);
  const pages = useMemo(() => chunkParagraphs(paragraphs, CHUNK_SIZE), [paragraphs]);
  const toc = useMemo(
    () =>
      paragraphs
        .map((p, i) => ({ text: p.replace(/^##\s*/, ''), i, isHeading: p.startsWith('## ') }))
        .filter((p) => p.isHeading)
        .map((h) => ({ ...h, page: pages.findIndex((pg) => pg.includes(paragraphs[h.i])) })),
    [paragraphs, pages]
  );

  const hasSummary = !!activeModule?.summary?.trim();
  const hasQuiz = !!(activeModule?.quiz && activeModule.quiz.length > 0);
  const isLastNotesPage = pageIndex >= pages.length - 1;
  const showScrollDown = scrollRatio < 0.9;
  const showBottomProgressAction = scrollRatio >= 0.74;

  const selectModule = (moduleId: string) => {
    setActiveModuleId(moduleId);
    setStage('notes');
    setPageIndex(0);
    setQuizAnswers({});
  };

  const finishModule = async () => {
    if (!activeModule || marking) return;
    setMarking(true);
    setError('');
    try {
      const progress = await markModuleCompleteApi(courseId, activeModule.id, packageId);
      setCompletedModuleIds(progress.completedModuleIds);
    } catch (err: any) {
      setError(err.message || 'Could not update your progress.');
    } finally {
      setMarking(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeModule?.quiz) return;
    let score = 0;
    activeModule.quiz.forEach((q) => {
      if (quizAnswers[q.id] === q.correctIndex) score += 1;
    });
    await finishModule();
    setResultPopup({ score, total: activeModule.quiz.length, isLastModule: activeIndex === modules.length - 1 });
  };

  const handleContinueFromNotes = async () => {
    if (!isLastNotesPage) {
      setPageIndex((p) => p + 1);
      return;
    }
    if (hasSummary) {
      setStage('summary');
      return;
    }
    if (hasQuiz) {
      setStage('quiz');
      return;
    }
    await finishModule();
    setResultPopup({ score: 0, total: 0, isLastModule: activeIndex === modules.length - 1 });
  };

  const handleContinueFromSummary = async () => {
    if (hasQuiz) {
      setStage('quiz');
      return;
    }
    await finishModule();
    setResultPopup({ score: 0, total: 0, isLastModule: activeIndex === modules.length - 1 });
  };

  const closePopupAndAdvance = () => {
    const wasLast = resultPopup?.isLastModule;
    setResultPopup(null);
    if (wasLast) {
      onGoToExam();
      return;
    }
    const next = modules[activeIndex + 1];
    if (next) selectModule(next.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-fog flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-sm text-muted">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading your course…
        </div>
      </div>
    );
  }

  if (error && modules.length === 0) {
    return (
      <div className="min-h-screen bg-fog flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg border border-line p-8 text-center space-y-4">
          <h1 className="font-display text-xl font-bold text-ink">Course unavailable</h1>
          <p className="text-sm text-muted">{error}</p>
          <button type="button" onClick={onBack} className="text-xs font-semibold text-brand-700 hover:text-brand-800 cursor-pointer">
            Back to catalog
          </button>
        </div>
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
      <main className="mx-auto max-w-6xl space-y-5">
        <div className="sticky top-3 z-10 bg-white/95 backdrop-blur rounded-lg border border-line px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-ink mb-1.5">
            <span>Package training progress</span>
            <span>{completionPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-700 via-brand-600 to-mint-500" style={{ width: `${completionPercent}%` }} />
          </div>
        </div>

        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-brand-700 cursor-pointer">
          Back to package
        </button>

        <div className="rounded-xl bg-gradient-to-br from-brand-700 via-brand-600 to-mint-500 p-6 sm:p-10 text-white space-y-4 shadow-sm shadow-brand-900/20">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[11px] font-semibold uppercase tracking-wide">
            <BookOpen className="h-3.5 w-3.5" />
            Atesta International Assessment Dashboard
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight max-w-2xl">{courseName}</h1>
          <p className="text-sm text-white/85 max-w-2xl leading-relaxed">
            By the end of this course you should understand every topic covered in the modules below, be able to
            apply it to real scenarios in your field, and walk into your exam and international job screening
            already speaking the employer's language.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div className="rounded-lg border border-white/25 bg-white/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/75">Step 1</p>
              <p className="text-sm font-semibold">Read & Accept</p>
              <p className="text-[11px] text-white/80 mt-1">Completed</p>
            </div>
            <div className="rounded-lg border border-white/25 bg-white/15 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/75">Step 2</p>
              <p className="text-sm font-semibold">Course (Current)</p>
              <p className="text-[11px] text-white/80 mt-1">{completedModuleIds.length}/{modules.length} modules</p>
            </div>
            <div className="rounded-lg border border-white/25 bg-white/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/75">Step 3</p>
              <p className="text-sm font-semibold">Exams</p>
              <p className="text-[11px] text-white/80 mt-1">Unlock after training</p>
            </div>
            <div className="rounded-lg border border-white/25 bg-white/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/75">Step 4</p>
              <p className="text-sm font-semibold">Interview</p>
              <p className="text-[11px] text-white/80 mt-1">After exams pass</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-line p-5 sm:p-6 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase">Training Analytics</p>
              <h2 className="font-display text-lg font-bold text-ink">Course completion progress</h2>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-ink mb-1.5">
              <span>Completed modules</span>
              <span>{completionPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-600 to-mint-500" style={{ width: `${completionPercent}%` }} />
            </div>
          </div>
        </div>

        <header className="bg-white rounded-lg border border-line p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold text-muted uppercase tracking-wide">Course Progress</p>
            <p className="text-sm font-bold text-ink mt-0.5">
              {completedModuleIds.length} of {modules.length} modules completed
            </p>
          </div>
          <div className="flex items-center gap-2 w-40">
            <div className="flex-1 h-1.5 bg-fog rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600"
                style={{ width: `${modules.length ? Math.round((completedModuleIds.length / modules.length) * 100) : 0}%` }}
              />
            </div>
            <span className="text-xs font-bold text-brand-700 shrink-0">
              {modules.length ? Math.round((completedModuleIds.length / modules.length) * 100) : 0}%
            </span>
          </div>
          {allDone && (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-700 shrink-0">
              <Award className="h-4 w-4" /> Completed
            </span>
          )}
        </header>

        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-[260px_1fr] gap-5 items-start">
          <nav className="bg-white rounded-lg border border-line p-3 space-y-1.5">
            <p className="text-[11px] font-bold text-muted uppercase tracking-wide px-2 pb-1">
              Modules &amp; Lessons ({modules.length})
            </p>
            {modules.map((m, i) => {
              const isDone = completedModuleIds.includes(m.id);
              const isActive = m.id === activeModuleId;
              const Icon = m.quiz && m.quiz.length > 0 ? HelpCircle : m.contentUrl ? Video : BookOpen;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => selectModule(m.id)}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    isActive ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-line text-ink hover:bg-fog'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-brand-700' : 'text-muted'}`} />
                  <span className="flex-1">
                    Module {i + 1}: {m.title}
                  </span>
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" />
                  ) : (
                    <span className="text-[10px] text-muted shrink-0">{estimateMinutes(m)}m</span>
                  )}
                </button>
              );
            })}
          </nav>

          <section className="bg-white rounded-lg border border-line overflow-hidden">
            {activeModule ? (
              <>
                <div className="px-6 py-4 border-b border-line flex items-center justify-between flex-wrap gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
                    <Clock className="h-3.5 w-3.5" /> {estimateMinutes(activeModule)} MINUTES · {stage.toUpperCase()}
                  </span>
                  {completedModuleIds.includes(activeModule.id) && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-[11px] font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                    </span>
                  )}
                </div>

                {(activeModule.documentUrl || activeModule.externalLink) && (
                  <div className="px-6 py-3 border-b border-line flex flex-wrap items-center gap-2">
                    {activeModule.documentUrl && (
                      <button
                        type="button"
                        onClick={() => setShowPdf(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fog border border-line text-xs font-semibold text-brand-700 hover:border-brand-300 cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5" /> View study PDF
                      </button>
                    )}
                    {activeModule.externalLink && (
                      <a
                        href={activeModule.externalLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fog border border-line text-xs font-semibold text-brand-700 hover:border-brand-300"
                      >
                        <Link2 className="h-3.5 w-3.5" /> {activeModule.externalLinkLabel || 'External study material'}
                      </a>
                    )}
                  </div>
                )}

                <div className="p-6 space-y-6">
                  {toc.length > 0 && stage === 'notes' && (
                    <div className="border border-line rounded-lg p-4 bg-fog/60">
                      <p className="text-[11px] font-bold text-muted uppercase tracking-wide mb-2">Table of Contents</p>
                      <div className="flex flex-wrap gap-2">
                        {toc.map((h) => (
                          <button
                            key={h.i}
                            type="button"
                            onClick={() => setPageIndex(Math.max(0, h.page))}
                            className="px-2.5 py-1 rounded-full bg-white border border-line text-[11px] font-semibold text-brand-700 hover:border-brand-300 cursor-pointer"
                          >
                            {h.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <h2 className="font-display font-bold text-xl text-ink">{activeModule.title}</h2>

                  {activeModule.contentUrl && stage === 'notes' && pageIndex === 0 && (
                    getYouTubeEmbedUrl(activeModule.contentUrl) ? (
                      <div className="aspect-video rounded-lg overflow-hidden border border-line">
                        <iframe
                          src={getYouTubeEmbedUrl(activeModule.contentUrl)!}
                          title="Module video"
                          className="w-full h-full"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <a
                        href={activeModule.contentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
                      >
                        <Video className="h-4 w-4" /> Watch the module video
                      </a>
                    )
                  )}

                  {stage === 'notes' && (
                    <div className="space-y-4">
                      {(pages[pageIndex] || []).length === 0 && (
                        <p className="text-sm text-muted">No notes have been added for this module yet.</p>
                      )}
                      {(pages[pageIndex] || []).map((p, idx) =>
                        p.startsWith('## ') ? (
                          <h3 key={idx} className="font-display font-bold text-base text-brand-800 pt-2">
                            {p.replace(/^##\s*/, '')}
                          </h3>
                        ) : (
                          <p key={idx} className="text-sm text-ink/90 leading-relaxed whitespace-pre-wrap">
                            {p}
                          </p>
                        )
                      )}
                      {pages.length > 1 && (
                        <p className="text-[11px] text-muted font-semibold">
                          Page {pageIndex + 1} of {pages.length}
                        </p>
                      )}
                    </div>
                  )}

                  {stage === 'summary' && (
                    <div className="border border-brand-200 bg-brand-50 rounded-lg p-5 space-y-3">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-brand-700 uppercase tracking-wide">
                        <Sparkles className="h-3.5 w-3.5" /> Module Summary
                      </p>
                      {splitParagraphs(activeModule.summary || '').map((p, idx) => (
                        <p key={idx} className="text-sm text-ink/90 leading-relaxed">
                          {p}
                        </p>
                      ))}
                    </div>
                  )}

                  {stage === 'quiz' && activeModule.quiz && (
                    <div className="space-y-5">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700 uppercase tracking-wide">
                        <HelpCircle className="h-3.5 w-3.5" /> Check Your Understanding
                      </p>
                      {activeModule.quiz.map((q, qi) => (
                        <div key={q.id} className="border border-line rounded-lg p-4 space-y-2">
                          <p className="text-sm font-semibold text-ink">
                            {qi + 1}. {q.question}
                          </p>
                          <div className="space-y-1.5">
                            {q.options.map((opt, oi) => (
                              <label
                                key={oi}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer ${
                                  quizAnswers[q.id] === oi ? 'border-brand-600 bg-brand-50' : 'border-line hover:bg-fog'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={q.id}
                                  checked={quizAnswers[q.id] === oi}
                                  onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: oi })}
                                />
                                {opt}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-line flex items-center justify-between bg-fog/40">
                  <button
                    type="button"
                    onClick={() => (stage === 'notes' && pageIndex > 0 ? setPageIndex((p) => p - 1) : undefined)}
                    disabled={stage !== 'notes' || pageIndex === 0}
                    className="px-4 py-2 text-xs font-semibold text-muted hover:text-brand-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Previous
                  </button>

                  {stage === 'notes' && (
                    <button
                      type="button"
                      onClick={handleContinueFromNotes}
                      disabled={marking}
                      className="px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg transition cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                    >
                      Continue <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                  {stage === 'summary' && (
                    <button
                      type="button"
                      onClick={handleContinueFromSummary}
                      disabled={marking}
                      className="px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg transition cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                    >
                      {hasQuiz ? 'Continue to Quiz' : 'Finish Module'} <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                  {stage === 'quiz' && (
                    <button
                      type="button"
                      onClick={handleSubmitQuiz}
                      disabled={marking || Object.keys(quizAnswers).length < (activeModule.quiz?.length || 0)}
                      className="px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg transition cursor-pointer disabled:opacity-40"
                    >
                      Submit Quiz
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted p-6">This course has no modules yet.</p>
            )}
          </section>
        </div>
      </main>

      {showScrollDown && (
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

      {showBottomProgressAction && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 px-3 w-full max-w-xl">
          <div className="bg-white border border-line rounded-2xl shadow-[0_20px_45px_-24px_rgba(15,85,53,0.45)] px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {allDone
                ? 'Coursework complete. Continue to exams now.'
                : 'Continue module reading and quizzes to unlock exams.'}
            </p>
            <button
              type="button"
              onClick={allDone ? onGoToExam : () => window.scrollBy({ top: Math.round(window.innerHeight * 0.72), behavior: 'smooth' })}
              className="shrink-0 px-4 py-2 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold cursor-pointer"
            >
              {allDone ? 'Complete Coursework & Start Exam' : 'Continue Coursework'}
            </button>
          </div>
        </div>
      )}

      {showPdf && activeModule?.documentUrl && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <p className="text-sm font-bold text-ink">{activeModule.documentName || 'Study material'}</p>
              <div className="flex items-center gap-3">
                <a
                  href={activeModule.documentUrl}
                  download={activeModule.documentName || 'document.pdf'}
                  className="text-xs font-semibold text-brand-700 hover:underline"
                >
                  Download
                </a>
                <button type="button" onClick={() => setShowPdf(false)} className="p-1 text-muted hover:text-ink cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(activeModule.documentUrl)}&embedded=true`}
              title="Study PDF"
              className="flex-1 w-full"
            />
          </div>
        </div>
      )}

      {resultPopup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center mx-auto">
              <Trophy className="h-7 w-7" />
            </div>
            <h3 className="font-display text-lg font-bold text-ink">Module complete!</h3>
            {resultPopup.total > 0 ? (
              <p className="text-sm text-muted">
                You scored{' '}
                <span className="font-bold text-brand-700">
                  {resultPopup.score} / {resultPopup.total}
                </span>{' '}
                on this module's questions.
              </p>
            ) : (
              <p className="text-sm text-muted">Nice work — you're ready for the next module.</p>
            )}
            {resultPopup.isLastModule && (
              <p className="text-sm font-semibold text-brand-700">
                You've successfully completed {courseName}. You can now continue to the exam.
              </p>
            )}
            <button
              type="button"
              onClick={closePopupAndAdvance}
              className="w-full py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg transition cursor-pointer"
            >
              {resultPopup.isLastModule ? 'Continue to Exam' : 'Continue to Next Module'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};