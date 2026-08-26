import React, { useEffect, useState } from 'react';
import { getMyCourseModulesApi, markModuleCompleteApi, ApexCourseModule } from '../api/apexCatalogApi';
import { BookOpen, CheckCircle2, Circle, LoaderCircle, Award, FileDown } from 'lucide-react';

interface CourseTakingPageProps {
  courseId: string;
  packageId?: string;
  onBack: () => void;
}

export const CourseTakingPage: React.FC<CourseTakingPageProps> = ({ courseId, packageId, onBack }) => {
  const [courseName, setCourseName] = useState('');
  const [modules, setModules] = useState<ApexCourseModule[]>([]);
  const [completedModuleIds, setCompletedModuleIds] = useState<string[]>([]);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState('');

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

  const activeModule = modules.find((m) => m.id === activeModuleId) || null;
  const allDone = modules.length > 0 && modules.every((m) => completedModuleIds.includes(m.id));

  const handleMarkComplete = async () => {
    if (!activeModule || marking) return;
    setMarking(true);
    setError('');
    try {
      const progress = await markModuleCompleteApi(courseId, activeModule.id, packageId);
      setCompletedModuleIds(progress.completedModuleIds);

      const nextModule = modules.find((m) => !progress.completedModuleIds.includes(m.id));
      if (nextModule) setActiveModuleId(nextModule.id);
    } catch (err: any) {
      setError(err.message || 'Could not update your progress.');
    } finally {
      setMarking(false);
    }
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
        </div>

        <header className="bg-white rounded-lg border border-line p-6 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-700 text-white flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase">Course</p>
            <h1 className="font-display text-xl font-bold text-ink mt-1">{courseName}</h1>
            <p className="text-xs text-muted mt-1">
              {completedModuleIds.length} of {modules.length} modules completed
            </p>
          </div>
          {allDone && (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-700 shrink-0">
              <Award className="h-4 w-4" /> Completed
            </span>
          )}
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-5">
          <nav className="bg-white rounded-lg border border-line p-3 space-y-1 h-fit">
            {modules.map((m, i) => {
              const isDone = completedModuleIds.includes(m.id);
              const isActive = m.id === activeModuleId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveModuleId(m.id)}
                  className={`w-full text-left flex items-start gap-2 px-3 py-2 rounded-md text-xs font-semibold transition cursor-pointer ${
                    isActive ? 'bg-brand-700 text-white' : 'text-ink hover:bg-fog'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${isActive ? 'text-white' : 'text-brand-600'}`} />
                  ) : (
                    <Circle className={`h-4 w-4 shrink-0 mt-0.5 ${isActive ? 'text-white/70' : 'text-muted'}`} />
                  )}
                  <span>
                    {i + 1}. {m.title}
                  </span>
                </button>
              );
            })}
          </nav>

          <section className="bg-white rounded-lg border border-line p-6 space-y-5">
            {activeModule ? (
              <>
                <h2 className="font-display font-bold text-lg text-ink">{activeModule.title}</h2>
                <div className="text-sm text-ink/90 leading-relaxed whitespace-pre-wrap">
                  {activeModule.content || 'No content has been added for this module yet.'}
                </div>

                {activeModule.documentUrl && (
                  <a
                    href={activeModule.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-fog border border-line rounded-lg text-sm font-semibold text-brand-700 hover:border-brand-300 hover:bg-brand-50 transition"
                  >
                    <FileDown className="h-4 w-4" />
                    Download study material{activeModule.documentName ? ` — ${activeModule.documentName}` : ' (PDF)'}
                  </a>
                )}

                {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

                <div className="pt-3 border-t border-line flex items-center justify-between">
                  <button type="button" onClick={onBack} className="text-xs font-semibold text-muted hover:text-brand-700 cursor-pointer">
                    Back to catalog
                  </button>
                  {completedModuleIds.includes(activeModule.id) ? (
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                      <CheckCircle2 className="h-4 w-4" /> Completed
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleMarkComplete}
                      disabled={marking}
                      className="px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg transition cursor-pointer disabled:opacity-40"
                    >
                      {marking ? 'Saving…' : 'Mark as complete'}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">This course has no modules yet.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};