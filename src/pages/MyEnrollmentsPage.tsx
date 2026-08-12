import React, { useEffect, useState } from 'react';
import { getMyEnrollmentsApi, ApexEnrollment, CatalogItemType } from '../api/apexCatalogApi';
import { FileCheck2, BookOpen, Layers, LoaderCircle } from 'lucide-react';

interface MyEnrollmentsPageProps {
  onBack: () => void;
  onSelectItem: (type: CatalogItemType | 'interview', id: string, itemName?: string) => void;
}

const TYPE_ICON: Record<CatalogItemType | 'interview', React.ReactNode> = {
  exam: <FileCheck2 className="h-4 w-4" />,
  course: <BookOpen className="h-4 w-4" />,
  package: <Layers className="h-4 w-4" />,
  interview: <FileCheck2 className="h-4 w-4" />
};

const STATUS_STYLE: Record<ApexEnrollment['status'], string> = {
  pending: 'bg-slate-100 text-slate-600 border-slate-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200'
};

const STATUS_LABEL: Record<ApexEnrollment['status'], string> = {
  pending: 'Awaiting Payment',
  in_progress: 'In Progress',
  completed: 'Completed',
  failed: 'Attempts Exhausted'
};

export const MyEnrollmentsPage: React.FC<MyEnrollmentsPageProps> = ({ onBack, onSelectItem }) => {
  const [enrollments, setEnrollments] = useState<ApexEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let stillMounted = true;
    getMyEnrollmentsApi()
      .then((data) => {
        if (stillMounted) setEnrollments(data);
      })
      .catch((err: Error) => {
        if (stillMounted) setError(err.message || 'Failed to load your enrollments');
      })
      .finally(() => {
        if (stillMounted) setLoading(false);
      });
    return () => {
      stillMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-fog p-4 sm:p-8">
      <main className="mx-auto max-w-3xl space-y-5">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-brand-700 cursor-pointer">
          Back to catalog
        </button>

        <div className="bg-white rounded-lg border border-line p-6">
          <h1 className="font-display text-xl font-bold text-ink">My Enrollments</h1>
          <p className="text-sm text-muted mt-1">Everything you've enrolled in, and where you left off.</p>
        </div>

        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        {loading ? (
          <div className="py-16 text-center flex items-center justify-center gap-2 text-sm text-muted">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : enrollments.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">You haven't enrolled in anything yet.</div>
        ) : (
          <div className="space-y-3">
            {enrollments.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() =>
                  onSelectItem(e.itemType, e.itemId, e.itemType === 'interview' ? (e.examName || e.itemName || e.itemId) : undefined)
                }
                className="w-full text-left bg-white rounded-lg border border-line p-5 flex items-center justify-between gap-4 hover:border-brand-300 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md border bg-fog flex items-center justify-center text-brand-700 shrink-0">
                    {TYPE_ICON[e.itemType]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-ink">{e.itemName || e.itemId}</p>
                    <p className="text-[11px] text-muted uppercase tracking-wide">{e.itemType}</p>
                    {e.itemType === 'package' && (e.examId || e.courseName) && (
                      <p className="text-[11px] text-muted mt-1 space-x-2">
                        {e.examId && (
                          <span>
                            Exam ID: <span className="font-mono font-semibold text-brand-700">{e.examId}</span>
                            {e.examName ? ` (${e.examName})` : ''}
                          </span>
                        )}
                        {e.courseName && <span>· Course: {e.courseName}</span>}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${STATUS_STYLE[e.status]}`}>
                    {STATUS_LABEL[e.status]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};