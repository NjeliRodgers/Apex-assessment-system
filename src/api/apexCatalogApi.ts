import { apiFetch, jsonHeaders } from './client';

// ─────────────────────────────────────────────────────────────
// Catalog (public — GET /apex/catalog, GET /apex/catalog/:type/:id)
// ─────────────────────────────────────────────────────────────

export type CatalogItemType = 'exam' | 'course' | 'package';

export interface CatalogListItem {
  type: CatalogItemType;
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  costKsh: number;
  // exam-only
  timeLimitMinutes?: number;
  questionsPerAttempt?: number;
  passMarkPercent?: number;
  // course-only
  durationDays?: number;
  // package-only
  examId?: string | null;
  courseId?: string | null;
  examName?: string | null;
  courseName?: string | null;
  examCostKsh?: number | null;
  courseCostKsh?: number | null;
  certificateRule?: string | null;
}

export async function getCatalogApi(params?: { q?: string; category?: string }): Promise<CatalogListItem[]> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.category) qs.set('category', params.category);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';

  const res = await apiFetch(`/apex/catalog${suffix}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load the catalog');
  return data.items;
}

export interface CatalogItemDetail extends CatalogListItem {
  passMarkPercent?: number;
  modules?: { id: string; title: string; orderIndex: number }[];
  exam?: { id: string; name: string; costKsh: number } | null;
  course?: { id: string; name: string; costKsh: number } | null;
}

export async function getCatalogItemApi(type: CatalogItemType, id: string): Promise<CatalogItemDetail> {
  const res = await apiFetch(`/apex/catalog/${type}/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'That item could not be found');
  return data.item;
}

// ─────────────────────────────────────────────────────────────
// Enrollment (candidate — POST /apex/enroll, POST /apex/enroll/verify-payment,
// GET /apex/my-enrollments)
// ─────────────────────────────────────────────────────────────

export type EnrollmentStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface ApexEnrollment {
  id: string;
  candidateId: string;
  itemType: CatalogItemType | 'interview';
  itemId: string;
  status: EnrollmentStatus;
  amountPaidKsh: number | null;
  paymentRef: string | null;
  startedAt: string | null;
  completedAt: string | null;
  itemName?: string;
}

export async function enrollApi(
  itemType: CatalogItemType | 'interview',
  itemId: string
): Promise<{ enrollment: ApexEnrollment; costKsh: number }> {
  const res = await apiFetch('/apex/enroll', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ itemType, itemId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Enrollment failed');
  return { enrollment: data.enrollment, costKsh: data.costKsh };
}

// Distinct from verifyApexPaymentApi (apexPaymentApi.ts) which is stage-based
// for the legacy GTP-linked flow. This one verifies against an enrollmentId.
export async function verifyEnrollmentPaymentApi(enrollmentId: string, reference: string): Promise<ApexEnrollment> {
  const res = await apiFetch('/apex/enroll/verify-payment', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ enrollmentId, reference })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'We could not confirm your payment');
  return data.enrollment;
}

export async function getMyEnrollmentsApi(): Promise<ApexEnrollment[]> {
  const res = await apiFetch('/apex/my-enrollments');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load your enrollments');
  return data.enrollments;
}

// ─────────────────────────────────────────────────────────────
// AI Interview (candidate — GET .../interview/access, POST .../interview/start)
// ─────────────────────────────────────────────────────────────

export interface InterviewAccess {
  eligible: boolean;
  configured?: boolean;
  costKsh?: number;
  passMarkPercent?: number;
  enrollmentStatus?: EnrollmentStatus | null;
  locked?: boolean;
  lockedUntil?: string | null;
  attemptsUsed?: number;
  attemptsRemaining?: number;
  activeSession?: { id: string; status: string } | null;
}

export async function getMyInterviewAccessApi(examId: string): Promise<InterviewAccess> {
  const res = await apiFetch(`/apex/exams/${examId}/interview/access`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load interview status');
  return data;
}

export async function startMyInterviewApi(examId: string): Promise<{ id: string; status: string }> {
  const res = await apiFetch(`/apex/exams/${examId}/interview/start`, {
    method: 'POST',
    headers: jsonHeaders
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not start your interview');
  return data.session;
}

// ─────────────────────────────────────────────────────────────
// Course-taking (candidate — GET .../my-modules, POST .../complete)
// ─────────────────────────────────────────────────────────────

export interface ApexCourseModule {
  id: string;
  courseId: string;
  title: string;
  contentType: string;
  content?: string;
  contentUrl?: string;
  documentUrl?: string | null;
  documentName?: string | null;
  orderIndex: number;
}

export interface MyCourseModulesResponse {
  course: { id: string; name: string; description?: string | null };
  modules: ApexCourseModule[];
  completedModuleIds: string[];
}

export async function getMyCourseModulesApi(courseId: string): Promise<MyCourseModulesResponse> {
  const res = await apiFetch(`/apex/courses/${courseId}/my-modules`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load course content');
  return data;
}

export async function markModuleCompleteApi(
  courseId: string,
  moduleId: string
): Promise<{ completedModuleIds: string[]; completedAt: string | null }> {
  const res = await apiFetch(`/apex/courses/${courseId}/modules/${moduleId}/complete`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update your progress');
  return data.progress;
}

// ─────────────────────────────────────────────────────────────
// Exam-by-id (candidate — generalized catalog exam flow, replaces the
// legacy single-assigned-exam my-exam/* endpoints for Phase 5)
// ─────────────────────────────────────────────────────────────

export interface ExamQuestion {
  id: string;
  question: string;
  options: string[];
  points: number;
}

export interface ExamQuestionsResponse {
  examId: string;
  examName: string;
  attemptNumber: number;
  attemptsRemaining: number;
  timeLimitMinutes: number;
  passMarkPercent: number;
  expiresAt: string;
  questions: ExamQuestion[];
}

export async function getExamQuestionsByIdApi(examId: string): Promise<ExamQuestionsResponse> {
  const res = await apiFetch(`/apex/exams/${examId}/questions`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load exam questions');
  return data;
}

export interface ExamSubmitResult {
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  passMarkPercent: number;
  attemptsUsed: number;
  attemptsRemaining: number;
}

export async function submitExamByIdApi(examId: string, answers: Record<string, number>): Promise<ExamSubmitResult> {
  const res = await apiFetch(`/apex/exams/${examId}/submit`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ answers })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit your exam');
  return data;
}

export interface ApexCertificate {
  id: string;
  candidateId: string;
  candidateName: string;
  sourceType: CatalogItemType;
  sourceId: string;
  sourceName: string;
  verificationCode: string;
  pdfUrl: string | null;
  status: 'pending_approval' | 'approved';
  issuedAt: string;
}

export async function getMyCertificatesApi(): Promise<ApexCertificate[]> {
  const res = await apiFetch('/apex/my-certificates');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load your certificates');
  return data.certificates;
}

// ─────────────────────────────────────────────────────────────
// Package Instructions & Guidelines — terms acceptance
// ─────────────────────────────────────────────────────────────

export interface PackageTermsStatus {
  accepted: boolean;
  acceptedAt: string | null;
}

export async function getPackageTermsApi(packageId: string): Promise<PackageTermsStatus> {
  const res = await apiFetch(`/apex/packages/${packageId}/terms`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load terms status');
  return { accepted: data.accepted, acceptedAt: data.acceptedAt };
}

export async function acceptPackageTermsApi(packageId: string): Promise<PackageTermsStatus> {
  const res = await apiFetch(`/apex/packages/${packageId}/terms/accept`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to accept terms');
  return { accepted: data.accepted, acceptedAt: data.acceptedAt };
}