import React, { createContext, useContext, useEffect, useState } from 'react';
import { ApexCandidate, ApexApplicationRef, ApexPaymentStatus } from '../types';
import { getStoredToken, setStoredToken } from '../api/client';
import { apexLoginApi, apexSignUpApi, apexMeApi, apexAcceptTermsApi } from '../api/apexAuthApi';
import { getApexPaymentStatusApi } from '../api/apexPaymentApi';

interface ApexAuthContextValue {
  candidate: ApexCandidate | null;
  application: ApexApplicationRef | null;
  paymentStatus: ApexPaymentStatus | null;
  isAuthenticated: boolean;
  loadingProfile: boolean;
  loadingPaymentStatus: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (payload: { applicationId?: string | null; name: string; email: string; password: string }) => Promise<string>;
  logout: () => void;
  acceptTerms: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshPaymentStatus: () => Promise<void>;
}

const ApexAuthContext = createContext<ApexAuthContextValue | undefined>(undefined);

const CANDIDATE_STORAGE_KEY = 'apex_candidate';

export const ApexAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [candidate, setCandidate] = useState<ApexCandidate | null>(() => {
    const stored = localStorage.getItem(CANDIDATE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [application, setApplication] = useState<ApexApplicationRef | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<ApexPaymentStatus | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPaymentStatus, setLoadingPaymentStatus] = useState(false);

  useEffect(() => {
    if (candidate) {
      localStorage.setItem(CANDIDATE_STORAGE_KEY, JSON.stringify(candidate));
    } else {
      localStorage.removeItem(CANDIDATE_STORAGE_KEY);
    }
  }, [candidate]);

  const refreshProfile = async () => {
    if (!getStoredToken()) return;
    setLoadingProfile(true);
    try {
      const { candidate: fresh, application: app } = await apexMeApi();
      setCandidate(fresh);
      setApplication(app);
    } finally {
      setLoadingProfile(false);
    }
  };

  const refreshPaymentStatus = async () => {
    if (!getStoredToken()) return;
    setLoadingPaymentStatus(true);
    try {
      const status = await getApexPaymentStatusApi();
      setPaymentStatus(status);
    } finally {
      setLoadingPaymentStatus(false);
    }
  };

  // If we already have a token (e.g. page refresh), pull the latest profile
  // so termsAcceptedAt / application details are never stale.
  useEffect(() => {
    if (getStoredToken() && candidate) {
      refreshProfile().catch((err) => console.error('Failed to refresh Apex profile:', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once T&Cs are accepted, we need to know payment status to decide what to show next.
  useEffect(() => {
    if (candidate?.termsAcceptedAt) {
      refreshPaymentStatus().catch((err) => console.error('Failed to refresh Apex payment status:', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate?.termsAcceptedAt]);

  const login = async (email: string, password: string) => {
    const { candidate: loggedIn, token } = await apexLoginApi(email, password);
    setStoredToken(token);
    setCandidate(loggedIn);
    await refreshProfile();
  };

  const signUp = async (payload: { applicationId?: string | null; name: string; email: string; password: string }) => {
    const { message } = await apexSignUpApi(payload);
    return message;
  };

  const logout = () => {
    setStoredToken(null);
    setCandidate(null);
    setApplication(null);
    setPaymentStatus(null);
  };

  const acceptTerms = async () => {
    const { candidate: updated } = await apexAcceptTermsApi();
    setCandidate(updated);
  };

  return (
    <ApexAuthContext.Provider
      value={{
        candidate,
        application,
        paymentStatus,
        isAuthenticated: !!candidate && !!getStoredToken(),
        loadingProfile,
        loadingPaymentStatus,
        login,
        signUp,
        logout,
        acceptTerms,
        refreshProfile,
        refreshPaymentStatus
      }}
    >
      {children}
    </ApexAuthContext.Provider>
  );
};

export function useApexAuth(): ApexAuthContextValue {
  const ctx = useContext(ApexAuthContext);
  if (!ctx) throw new Error('useApexAuth must be used within ApexAuthProvider');
  return ctx;
}