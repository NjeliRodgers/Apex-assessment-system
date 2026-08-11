export interface ApexCandidate {
  id: string;
  applicationId: string;
  name: string;
  email: string;
  isActive: boolean;
  termsAcceptedAt?: string | null;
}

export interface ApexApplicationRef {
  id: string;
  jobId: string;
  jobTitle: string;
  country?: string | null;
  workType?: string | null;
}

export type PaymentStage = 'stage_1_assessment' | 'stage_2_ai_interview';

export interface ApexPaymentStatus {
  stage1Paid: boolean;
  stage2Paid: boolean;
  attemptsUsed: number;
  attemptsRemaining: number;
  nextAttemptNumber: number | null;
}