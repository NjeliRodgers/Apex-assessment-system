import React, { useEffect, useRef, useState } from 'react';
import { ApexAuthProvider, useApexAuth } from './auth/ApexAuthContext';
import { ActivateAccount } from './auth/ActivateAccount';
import { ResetPasswordForm } from './auth/ResetPasswordForm';
import { UpdateNationalIdForm } from './pages/UpdateNationalIdForm';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { RecoverNationalIdPage } from './pages/RecoverNationalIdPage';
import { DashboardPage } from './pages/DashboardPage';
import { CatalogItemDetailPage } from './pages/CatalogItemDetailPage';
import { PackageDetailPage } from './pages/PackageDetailPage';
import { PackageExamsPage } from './pages/PackageExamsPage';
import { PackageCoursePage } from './pages/PackageCoursePage';
import { InterviewTakingPage } from './pages/InterviewTakingPage';
import { ExamTakingPage } from './pages/ExamTakingPage';
import { CourseTakingPage } from './pages/CourseTakingPage';
import { MyEnrollmentsPage } from './pages/MyEnrollmentsPage';
import { MyCertificatesPage } from './pages/MyCertificatesPage';
import { CatalogItemType } from './api/apexCatalogApi';

type Screen = 'login' | 'signup' | 'forgot' | 'recover-national-id';

type CandidateScreen =
  | { view: 'dashboard' }
  | { view: 'detail'; itemType: CatalogItemType; itemId: string; highlightExamId?: string }
  | { view: 'packageExams'; packageId: string }
  | { view: 'packageCourse'; packageId: string }
  | { view: 'exam'; examId: string; packageId?: string }
  | { view: 'course'; courseId: string; packageId?: string }
  | { view: 'interview'; interviewId: string; interviewName: string; packageId?: string }
  | { view: 'enrollments' }
  | { view: 'certificates' };

const SCREEN_STORAGE_KEY = 'apex_candidate_screen';
const HISTORY_STATE_KEY = '__apexAssessmentRoute';

type ScreenScope = 'authed' | 'unauthed';

type StoredHistoryState<T> = {
  scope: ScreenScope;
  screen: T;
};

const readRouteState = <T,>(scope: ScreenScope): T | null => {
  const state = window.history.state as { [HISTORY_STATE_KEY]?: StoredHistoryState<T> } | null;
  if (!state || !state[HISTORY_STATE_KEY] || state[HISTORY_STATE_KEY]?.scope !== scope) {
    return null;
  }
  return state[HISTORY_STATE_KEY]?.screen ?? null;
};

const writeRouteState = <T,>(scope: ScreenScope, screen: T, replace: boolean) => {
  const nextState = {
    ...(window.history.state ?? {}),
    [HISTORY_STATE_KEY]: {
      scope,
      screen,
    } as StoredHistoryState<T>,
  };

  if (replace) {
    window.history.replaceState(nextState, '');
  } else {
    window.history.pushState(nextState, '');
  }
};

const loadStoredScreen = (): CandidateScreen => {
  try {
    const raw = sessionStorage.getItem(SCREEN_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CandidateScreen;
  } catch {
    // malformed or unavailable storage (e.g. private browsing) — fall back to dashboard
  }
  return { view: 'dashboard' };
};

const AuthedGate: React.FC = () => {
  const { candidate, logout, loadingProfile } = useApexAuth();
  const [screen, setScreen] = useState<CandidateScreen>(() => readRouteState<CandidateScreen>('authed') ?? loadStoredScreen());
  const handlingPopStateRef = useRef(false);
  const lastScreenRef = useRef<string>(JSON.stringify(screen));

  useEffect(() => {
    try {
      sessionStorage.setItem(SCREEN_STORAGE_KEY, JSON.stringify(screen));
    } catch {
      // storage unavailable — refresh will just fall back to dashboard, not a hard failure
    }
  }, [screen]);

  useEffect(() => {
    writeRouteState('authed', screen, true);
    lastScreenRef.current = JSON.stringify(screen);
  }, []);

  useEffect(() => {
    const serialized = JSON.stringify(screen);
    if (serialized === lastScreenRef.current) {
      return;
    }

    if (handlingPopStateRef.current) {
      handlingPopStateRef.current = false;
      lastScreenRef.current = serialized;
      return;
    }

    writeRouteState('authed', screen, false);
    lastScreenRef.current = serialized;
  }, [screen]);

  useEffect(() => {
    const onPopState = () => {
      const previousScreen = readRouteState<CandidateScreen>('authed');
      if (!previousScreen) {
        return;
      }
      handlingPopStateRef.current = true;
      setScreen(previousScreen);
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-fog flex items-center justify-center p-4">
        <p className="text-sm text-muted">Loading your Atesta profile…</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-fog flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-3">
          <p className="text-sm text-muted">We could not load your Atesta account.</p>
          <button onClick={logout} className="text-xs font-semibold text-brand-700 hover:text-brand-800 cursor-pointer">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const goToDashboard = () => setScreen({ view: 'dashboard' });

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(SCREEN_STORAGE_KEY);
    } catch {
      // ignore
    }
    logout();
  };
  const goToItem = (itemType: CatalogItemType | 'interview', itemId: string, extra?: string) => {
    // Interview enrollments aren't a catalog item — CatalogItemDetailPage
    // and getCatalogItemApi only know 'exam' | 'course' | 'package'. Route
    // these straight into the interview screen instead, which needs both
    // the exam id and its name (passed through as `extra` from the caller).
    if (itemType === 'interview') {
      setScreen({ view: 'interview', interviewId: itemId, interviewName: extra || itemId });
      return;
    }
    setScreen({ view: 'detail', itemType, itemId, highlightExamId: extra });
  };

  switch (screen.view) {
    case 'detail':
      // Packages get the full module-based Package Page. Standalone exam/course
      // items (e.g. a recruiter-assigned exam ID outside any package) still use
      // the simpler generic detail page.
      if (screen.itemType === 'package') {
        return (
          <PackageDetailPage
            packageId={screen.itemId}
            highlightExamId={screen.highlightExamId}
            candidateName={candidate.name}
            candidateEmail={candidate.email}
            candidateStatus={candidate.isActive ? 'Active' : 'Inactive'}
            onBack={goToDashboard}
            onStartExam={(examId) => setScreen({ view: 'exam', examId, packageId: screen.itemId })}
            onStartCourse={(courseId) => setScreen({ view: 'course', courseId, packageId: screen.itemId })}
            onGoToInterview={(id, name) => setScreen({ view: 'interview', interviewId: id, interviewName: name, packageId: screen.itemId })}
            onLogout={handleLogout}
            onGoToEnrollments={() => setScreen({ view: 'enrollments' })}
            onGoToCertificates={() => setScreen({ view: 'certificates' })}
            onGoToProfile={undefined}
          />
        );
      }
      return (
        <CatalogItemDetailPage
          itemType={screen.itemType}
          itemId={screen.itemId}
          candidateEmail={candidate.email}
          onBack={goToDashboard}
          onStartExam={(examId) => setScreen({ view: 'exam', examId })}
          onStartCourse={(courseId) => setScreen({ view: 'course', courseId })}
          onGoToInterview={(id, name) => setScreen({ view: 'interview', interviewId: id, interviewName: name })}
        />
      );
    case 'packageExams':
      return (
        <PackageExamsPage
          packageId={screen.packageId}
          candidateName={candidate.name}
          candidateEmail={candidate.email}
          onBack={() => setScreen({ view: 'detail', itemType: 'package', itemId: screen.packageId })}
          onStartExam={(examId) => setScreen({ view: 'exam', examId, packageId: screen.packageId })}
          onGoToInterview={(name) =>
            setScreen({ view: 'interview', interviewId: screen.packageId, interviewName: name, packageId: screen.packageId })
          }
        />
      );
    case 'packageCourse':
      return (
        <PackageCoursePage
          packageId={screen.packageId}
          candidateName={candidate.name}
          candidateEmail={candidate.email}
          onBack={() => setScreen({ view: 'detail', itemType: 'package', itemId: screen.packageId })}
          onStartCourse={(courseId) => setScreen({ view: 'course', courseId, packageId: screen.packageId })}
        />
      );
    case 'exam':
      return (
        <ExamTakingPage
          examId={screen.examId}
          onBack={
            screen.packageId
              ? () => setScreen({ view: 'detail', itemType: 'package', itemId: screen.packageId! })
              : goToDashboard
          }
        />
      );
    case 'interview':
      return (
        <InterviewTakingPage
          id={screen.interviewId}
          name={screen.interviewName}
          candidateName={candidate.name}
          candidateEmail={candidate.email}
          onBack={
            screen.packageId
              ? () => setScreen({ view: 'detail', itemType: 'package', itemId: screen.packageId! })
              : goToDashboard
          }
        />
      );
    case 'course':
      return (
        <CourseTakingPage
          courseId={screen.courseId}
          packageId={screen.packageId}
          onBack={
            screen.packageId
              ? () => setScreen({ view: 'detail', itemType: 'package', itemId: screen.packageId! })
              : goToDashboard
          }
          onGoToExam={
            screen.packageId
              ? () => setScreen({ view: 'packageExams', packageId: screen.packageId! })
              : goToDashboard
          }
        />
      );
    case 'enrollments':
      return <MyEnrollmentsPage onBack={goToDashboard} onSelectItem={goToItem} />;
    case 'certificates':
      return <MyCertificatesPage onBack={goToDashboard} />;
    case 'dashboard':
    default:
      return (
        <DashboardPage
          candidateName={candidate.name}
          candidateEmail={candidate.email}
          candidateStatus={candidate.isActive ? 'Active' : 'Inactive'}
          onSelectItem={goToItem}
          onLogout={logout}
          onGoToEnrollments={() => setScreen({ view: 'enrollments' })}
          onGoToCertificates={() => setScreen({ view: 'certificates' })}
        />
      );
  }
};

const UnauthedRouter: React.FC<{ applicationId: string | null }> = ({ applicationId }) => {
  const [screen, setScreen] = useState<Screen>(() => readRouteState<Screen>('unauthed') ?? (applicationId ? 'signup' : 'login'));
  const handlingPopStateRef = useRef(false);
  const lastScreenRef = useRef<string>(screen);

  useEffect(() => {
    writeRouteState('unauthed', screen, true);
    lastScreenRef.current = screen;
  }, []);

  useEffect(() => {
    if (screen === lastScreenRef.current) {
      return;
    }

    if (handlingPopStateRef.current) {
      handlingPopStateRef.current = false;
      lastScreenRef.current = screen;
      return;
    }

    writeRouteState('unauthed', screen, false);
    lastScreenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    const onPopState = () => {
      const previousScreen = readRouteState<Screen>('unauthed');
      if (!previousScreen) {
        return;
      }
      handlingPopStateRef.current = true;
      setScreen(previousScreen);
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  if (screen === 'signup') {
    return <SignupPage applicationId={applicationId} onGoToLogin={() => setScreen('login')} />;
  }
  if (screen === 'forgot') {
    return <ForgotPasswordPage onGoToLogin={() => setScreen('login')} />;
  }
  if (screen === 'recover-national-id') {
    return <RecoverNationalIdPage onGoToLogin={() => setScreen('login')} />;
  }
  return (
    <LoginPage
      onGoToSignup={() => setScreen('signup')}
      onGoToForgotPassword={() => setScreen('forgot')}
      onGoToRecoverNationalId={() => setScreen('recover-national-id')}
    />
  );
};

const AppInner: React.FC<{ applicationId: string | null }> = ({ applicationId }) => {
  const { isAuthenticated } = useApexAuth();
  return isAuthenticated ? <AuthedGate /> : <UnauthedRouter applicationId={applicationId} />;
};

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get('resetToken');
  const resetEmail = params.get('email');
  const activationToken = params.get('activationToken');
  const activationEmail = params.get('email');
  const nationalIdRecoveryToken = params.get('nationalIdRecoveryToken');
  const nationalIdRecoveryEmail = params.get('email');
  const applicationId = params.get('ref');

  const backToApp = () => {
    window.location.href = window.location.origin + window.location.pathname;
  };

  if (resetToken && resetEmail) {
    return <ResetPasswordForm email={resetEmail} token={resetToken} onSuccess={backToApp} />;
  }

  if (activationToken && activationEmail) {
    return <ActivateAccount email={activationEmail} token={activationToken} onSuccess={backToApp} />;
  }

  if (nationalIdRecoveryToken && nationalIdRecoveryEmail) {
    return (
      <UpdateNationalIdForm email={nationalIdRecoveryEmail} token={nationalIdRecoveryToken} onSuccess={backToApp} />
    );
  }

  return (
    <ApexAuthProvider>
      <AppInner applicationId={applicationId} />
    </ApexAuthProvider>
  );
}