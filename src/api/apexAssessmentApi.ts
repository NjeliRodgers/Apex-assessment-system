import { apiFetch, jsonHeaders } from './client';

export interface ApexAssessmentQuestion {
  id: string;
  question: string;
  options: string[];
  points: number;
}

export interface ApexAssessmentQuestionsResponse {
  examId: string;
  examName: string;
  attemptNumber: number;
  attemptsRemaining: number;
  timeLimitMinutes: number;
  passMarkPercent: number;
  expiresAt: string;
  questions: ApexAssessmentQuestion[];
}

export async function getMyExamQuestionsApi(): Promise<ApexAssessmentQuestionsResponse> {
  const res = await apiFetch('/apex/my-exam/questions');
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Failed to load assessment questions');
  }

  return data;
}

export interface ApexAssessmentSubmitResponse {
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  passMarkPercent: number;
  attemptsUsed: number;
  attemptsRemaining: number;
}

export async function submitMyExamApi(
  answers: Record<string, number>
): Promise<ApexAssessmentSubmitResponse> {
  const res = await apiFetch('/apex/my-exam/submit', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ answers })
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Failed to submit assessment');
  }

  return data;
}

export const unlockCandidateStageTwo = async (
  candidateId: string
): Promise<{ eligibleAt: string; adminUnlockedAt: string }> => {
  const res = await apiFetch(`/apex/candidates/${candidateId}/stage-two/unlock`, {
    method: 'POST',
    headers: jsonHeaders
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Failed to unlock the candidate’s next action');
  }

  return data;
};