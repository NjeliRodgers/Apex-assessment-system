import React, { useState } from 'react';
import { ApexAuthProvider, useApexAuth } from './auth/ApexAuthContext';
import { ActivateAccount } from './auth/ActivateAccount';
import { ResetPasswordForm } from './auth/ResetPasswordForm';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { CatalogItemDetailPage } from './pages/CatalogItemDetailPage';
import { PackageDetailPage } from './pages/PackageDetailPage';
import { InterviewTakingPage } from './pages/InterviewTakingPage';
import { ExamTakingPage } from './pages/ExamTakingPage';
import { CourseTakingPage } from './pages/CourseTakingPage';
import { MyEnrollmentsPage } from './pages/MyEnrollmentsPage';
import { MyCertificatesPage } from './pages/MyCertificatesPage';
import { CatalogItemType } from './api/apexCatalogApi';

type Screen = 'login' | 'signup' | 'forgot';

type CandidateScreen =
  | { view: 'dashboard' }
  | { view: 'detail'; itemType: CatalogItemType; itemId: string; highlightExamId?: string }
  | { view: 'exam'; examId: string }
  | { view: 'course'; courseId: string }
  | { view: 'interview'; examId: string; examName: string }
  | { view: 'enrollments' }
  | { view: 'certificates' };

const AuthedGate: React.FC = () => {
  const { candidate, logout, loadingProfile } = useApexAuth();
  const [screen, setScreen] = useState<CandidateScreen>({ view: 'dashboard' });

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-fog flex items-center justify-center p-4">
        <p className="text-sm text-muted">Loading your Apex profile…</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-fog flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-3">
          <p className="text-sm text-muted">We could not load your Apex account.</p>
          <button onClick={logout} className="text-xs font-semibold text-brand-700 hover:text-brand-800 cursor-pointer">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const goToDashboard = () => setScreen({ view: 'dashboard' });
  const goToItem = (itemType: CatalogItemType | 'interview', itemId: string, highlightExamId?: string) =>
    setScreen({ view: 'detail', itemType, itemId, highlightExamId });

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
            onStartExam={(examId) => setScreen({ view: 'exam', examId })}
            onStartCourse={(courseId) => setScreen({ view: 'course', courseId })}
            onGoToInterview={(examId, examName) => setScreen({ view: 'interview', examId, examName })}
            onLogout={logout}
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
          onGoToInterview={(examId, examName) => setScreen({ view: 'interview', examId, examName })}
        />
      );
    case 'exam':
      return <ExamTakingPage examId={screen.examId} onBack={goToDashboard} />;
    case 'interview':
      return (
        <InterviewTakingPage
          examId={screen.examId}
          examName={screen.examName}
          candidateEmail={candidate.email}
          onBack={goToDashboard}
        />
      );
    case 'course':
      return <CourseTakingPage courseId={screen.courseId} onBack={goToDashboard} />;
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
  const [screen, setScreen] = useState<Screen>(applicationId ? 'signup' : 'login');

  if (screen === 'signup') {
    return <SignupPage applicationId={applicationId} onGoToLogin={() => setScreen('login')} />;
  }
  if (screen === 'forgot') {
    return <ForgotPasswordPage onGoToLogin={() => setScreen('login')} />;
  }
  return <LoginPage onGoToSignup={() => setScreen('signup')} onGoToForgotPassword={() => setScreen('forgot')} />;
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

  return (
    <ApexAuthProvider>
      <AppInner applicationId={applicationId} />
    </ApexAuthProvider>
  );
}