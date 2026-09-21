import React, { useEffect, useRef, useState } from 'react';
import { getExamQuestionsByIdApi, submitExamByIdApi, ExamQuestion, ExamSubmitResponse } from '../api/apexCatalogApi';
import { CheckCircle2, Clock, ClipboardCheck, LoaderCircle, XCircle } from 'lucide-react';

interface ExamTakingPageProps {
  examId: string;
  packageId?: string; // set when the exam is opened from a certification package
  onBack: () => void;
}

const formatCountdown = (totalSeconds: number): string => {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const ExamTakingPage: React.FC<ExamTakingPageProps> = ({ examId, packageId, onBack }) => {
  const [examName, setExamName] = useState('');
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const autoSubmitTriggered = useRef(false);

  useEffect(() => {
    let stillMounted = true;

    getExamQuestionsByIdApi(examId)
      .then((data) => {
        if (!stillMounted) return;
        setExamName(data.examName);
        setQuestions(data.questions);
        setExpiresAt(data.expiresAt);
      })
      .catch((err: Error) => {
        if (stillMounted) setError(err.message || 'Could not load this exam.');
      })
      .finally(() => {
        if (stillMounted) setLoading(false);
      });

    return () => {
      stillMounted = false;
    };
  }, [examId]);

  useEffect(() => {
    if (!expiresAt) return;

    const tick = () => {
      const secondsLeft = Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000);
      setRemainingSeconds(secondsLeft);

      if (secondsLeft <= 0 && !autoSubmitTriggered.current && !completed) {
        autoSubmitTriggered.current = true;
        finalizeSubmit();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt, completed]);

  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const allQuestionsAnswered = questions.length > 0 && answeredCount === questions.length;

  const chooseAnswer = (questionId: string, optionIndex: number) => {
    if (submitting || completed) return;
    setAnswers((current) => ({ ...current, [questionId]: optionIndex }));
  };

  const finalizeSubmit = async () => {
    if (submitting || completed) return;
    setSubmitting(true);
    setError('');
    try {
      await submitExamByIdApi(examId, answers);
      setCompleted(true);
    } catch (err: any) {
      setError(err.message || 'Your exam could not be submitted. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitExam = async () => {
    if (!allQuestionsAnswered || submitting || completed) return;
    const confirmed = window.confirm('Submit this exam now? You will not be able to change your answers after submission.');
    if (!confirmed) return;
    autoSubmitTriggered.current = true;
    await finalizeSubmit();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-fog flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-sm text-muted">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading your exam…
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-fog flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg border border-line p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-brand-600 text-white flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7" />
          </div>

          <h1 className="font-display text-2xl font-bold text-ink">Submitted</h1>

          <p className="text-sm font-semibold text-ink">Your Exam test has been received.</p>

          <p className="text-sm text-muted leading-relaxed">
            Our Talent Acquisition Team will Review your Exam and you will receive your score on your Email within 24 Hours 
          </p>

          {packageId && (
            <p className="text-xs text-muted leading-relaxed">
              This exam is part of a certification package. If you pass, your next exam (if the package has one) opens on
              your package page. The AI interview only unlocks after you have passed every exam in the package.
            </p>
          )}

          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-brand-700 hover:text-brand-800 cursor-pointer"
          >
            {packageId ? 'Back to your package' : 'Back to catalog'}
          </button>
        </div>
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="min-h-screen bg-fog flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg border border-line p-8 text-center space-y-4">
          <h1 className="font-display text-xl font-bold text-ink">Exam unavailable</h1>
          <p className="text-sm text-muted">{error}</p>
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-brand-700 hover:text-brand-800 cursor-pointer"
          >
            Back to catalog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fog p-4 sm:p-8">
      <main className="mx-auto max-w-3xl space-y-5">
        <header className="bg-white rounded-lg border border-line p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-700 text-white flex items-center justify-center shrink-0">
              <ClipboardCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="font-mono text-[11px] font-semibold tracking-[0.15em] text-brand-600 uppercase">Certification assessment</p>
              <h1 className="font-display text-2xl font-bold text-ink mt-1">{examName}</h1>
              <p className="text-sm text-muted mt-2">Answer every question, then review your selections before submitting.</p>
            </div>

            {remainingSeconds !== null && (
              <div
                className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-bold shrink-0 ${
                  remainingSeconds <= 300 ? 'bg-rose-50 text-rose-700' : 'bg-fog text-ink'
                }`}
              >
                <Clock className="h-4 w-4" />
                {formatCountdown(remainingSeconds)}
              </div>
            )}
          </div>

          <p className="text-xs text-muted mt-5">
            {answeredCount} of {questions.length} questions answered
          </p>
        </header>

        {questions.map((question, questionIndex) => (
          <section key={question.id} className="bg-white rounded-lg border border-line p-6 space-y-4">
            <h2 className="font-semibold text-ink leading-relaxed">
              {questionIndex + 1}. {question.question}
            </h2>

            <div className="space-y-2">
              {question.options.map((option, optionIndex) => {
                const selected = answers[question.id] === optionIndex;
                return (
                  <label
                    key={`${question.id}-${optionIndex}`}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-sm cursor-pointer transition ${
                      selected ? 'border-brand-600 bg-emerald-50 text-ink' : 'border-line hover:border-brand-300 text-ink/90'
                    }`}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      checked={selected}
                      onChange={() => chooseAnswer(question.id, optionIndex)}
                      disabled={submitting}
                      className="mt-0.5 h-4 w-4 text-brand-600"
                    />
                    <span>{option}</span>
                  </label>
                );
              })}
            </div>
          </section>
        ))}

        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <div className="bg-white rounded-lg border border-line p-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <p className="text-xs text-muted">You can submit only after answering every question.</p>
          <button
            type="button"
            onClick={submitExam}
            disabled={!allQuestionsAnswered || submitting}
            className="px-5 py-3 bg-brand-700 hover:bg-brand-800 text-white font-display font-bold text-sm rounded-lg transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting assessment…' : 'Submit assessment'}
          </button>
        </div>
      </main>
    </div>
  );
};