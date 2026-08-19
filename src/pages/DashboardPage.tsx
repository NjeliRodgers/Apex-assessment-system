import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Layers,
  ListChecks,
  Award,
  UserCircle2,
  Sparkles,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { getCatalogApi, CatalogListItem, CatalogItemType } from '../api/apexCatalogApi';

interface DashboardPageProps {
  candidateName: string;
  candidateEmail?: string;
  candidateStatus?: string;
  onSelectItem: (type: CatalogItemType, id: string, highlightExamId?: string) => void;
  onLogout: () => void;
  onGoToEnrollments?: () => void;
  onGoToCertificates?: () => void;
  onGoToProfile?: () => void;
}

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || '?';

  const formatKsh = (amount: number) => `KSh ${amount.toLocaleString()}`;

type TabKey = 'all' | 'package';

const TAB_LABEL: Record<TabKey, string> = {
  all: 'All Modules',
  package: 'Packages'
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  candidateName,
  candidateEmail,
  candidateStatus,
  onSelectItem,
  onLogout,
  onGoToEnrollments,
  onGoToCertificates,
  onGoToProfile
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [items, setItems] = useState<CatalogListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let stillMounted = true;
    setLoading(true);
    setError('');

    getCatalogApi({ category: categoryFilter || undefined })
      .then((results) => {
        if (stillMounted) setItems(results);
      })
      .catch((err: Error) => {
        if (stillMounted) setError(err.message || 'Failed to load the catalog');
      })
      .finally(() => {
        if (stillMounted) setLoading(false);
      });

    return () => {
      stillMounted = false;
    };
  }, [categoryFilter]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [items]);

  const packages = useMemo(() => items.filter((i) => i.type === 'package'), [items]);
  const filteredPackages = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter((item) => {
      const haystack = [item.name, item.packageId, item.category, item.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [packages, searchInput]);

  const renderPackageCard = (item: CatalogListItem) => {
    return (
      <div
        key={`package-${item.id}`}
        className="bg-white rounded-lg border border-line shadow-[0_1px_2px_rgba(15,85,53,0.06)] p-5 space-y-4 hover:shadow-[0_12px_28px_-10px_rgba(15,85,53,0.18)] hover:border-brand-300 transition"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-md border bg-amber-50 text-amber-700 border-amber-200 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            {item.category && (
              <span className="text-[11px] font-semibold text-amber-700">{item.category}</span>
            )}
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-amber-50 text-amber-700 border-amber-200">
            Combined Bundle | {formatKsh(item.costKsh)}
          </span>
        </div>

        <div className="space-y-1">
          <h3 className="font-display font-bold text-sm text-ink leading-snug">
            {item.name}
            {item.packageId && <span className="text-ink"> - {item.packageId}</span>}
          </h3>
          {item.description && <p className="text-xs text-muted leading-relaxed line-clamp-2">{item.description}</p>}
        </div>

        <div className="space-y-1.5 border border-line rounded-md bg-fog px-3 py-2.5">
          {item.courseName && (
            <p className="flex items-center gap-2 text-xs text-muted">
              <CheckCircle2 className="h-3.5 w-3.5 text-brand-600 shrink-0" />
              Training Course: <span className="font-semibold text-ink">{item.courseName}</span>
            </p>
          )}
        </div>

        <div className="flex items-center justify-end pt-1 border-t border-line">
          <button
            type="button"
            onClick={() => onSelectItem('package', item.id)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white text-xs font-bold rounded-md shadow-sm cursor-pointer"
          >
            View Package & Start
          </button>
        </div>
      </div>
    );
  };

  // Note: exam- and course-only cards are not shown on this dashboard.
  // Candidates browse and start from package cards only.

  return (
    <div
      className="min-h-screen bg-fog"
      style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #d7e6dc 1px, transparent 0)',
        backgroundSize: '22px 22px'
      }}
    >
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-line">
        <div className="w-full px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shadow-sm shadow-brand-900/20">
              <Award className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="font-display font-bold text-sm text-ink">
                ATESTA <span className="text-brand-600">ASSESSMENT</span>
              </p>
              <p className="font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
                International Examination Standard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-line rounded-md text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => heroRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-3 py-1.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-md cursor-pointer"
            >
              Browse Packages
            </button>
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

                  <div className="flex items-center justify-between pt-2 border-t border-line text-[11px]">
                    <span className="text-muted">Account</span>
                    <span className="font-semibold text-ink">Candidate</span>
                  </div>

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
        {/* Hero */}
        <div
          ref={heroRef}
          className="rounded-xl bg-gradient-to-br from-brand-700 via-brand-600 to-mint-500 p-6 sm:p-10 text-white space-y-6 shadow-sm shadow-brand-900/20"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[11px] font-semibold uppercase tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            Atesta International Assessment Dashboard
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight max-w-2xl">
            Standardized Testing, Master Courses &amp; Professionally Priced Certification Bundles
          </h1>
          <p className="text-sm text-white/85 max-w-2xl leading-relaxed">
            Welcome, {candidateName.split(' ')[0]}. Take assigned or public exams, complete specialized short
            courses, or pursue combined packages with clear package pricing to receive an official downloadable Atesta
            Assessment PDF
            certificate.
          </p>

          <div className="bg-white/10 border border-white/20 rounded-lg p-4 sm:p-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/90">Looking for your package?</p>
            <p className="text-xs text-white/85 leading-relaxed">
              Use your Package ID from your recruitment email in the live search below to instantly filter and open your
              package.
            </p>
          </div>
        </div>

        {/* Tabs + search */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'package'] as TabKey[]).map((tab) => {
              const count = packages.length;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-2 rounded-md text-xs font-bold border cursor-pointer transition ${
                    activeTab === tab
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {TAB_LABEL[tab]} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by package name, category, or package ID…"
              className="w-full pl-9 pr-3 py-2 bg-white border border-line rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>

        {error && <div className="p-3 bg-rose-50 text-rose-700 text-sm rounded-md border border-rose-200">{error}</div>}

        {loading ? (
          <div className="py-16 text-center text-sm text-muted">Loading the catalog…</div>
        ) : filteredPackages.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">
            No packages match your search yet.
          </div>
        ) : (
          <div className="space-y-10">
            <section className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="flex items-center gap-2 font-display font-bold text-base text-ink">
                  <Layers className="h-5 w-5 text-amber-600" />
                  Certification Packages (Exam + Course + AI Interview Combined)
                </h2>
                <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold">
                  Career Advancement and Professional Development
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{filteredPackages.map(renderPackageCard)}</div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};