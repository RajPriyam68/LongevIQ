import type { Prisma } from '@prisma/client';
import { env } from './config/env.js';
import { PrismaAuthRepository } from './modules/auth/auth.repository.js';
import { TokenService } from './modules/auth/token.service.js';
import { EmailService } from './modules/auth/email.service.js';
import { PasswordService } from './modules/auth/password.service.js';
import { GoogleOAuthService } from './modules/auth/oauth.service.js';
import { AuthService } from './modules/auth/auth.service.js';
import type { AuthRepository } from './modules/auth/auth.repository.types.js';
import { PrismaMetricsRepository } from './modules/metrics/metrics.repository.js';
import { MetricsService } from './modules/metrics/metrics.service.js';
import type { AuditSink, MetricsRepository } from './modules/metrics/metrics.repository.types.js';
import { DashboardService } from './modules/dashboard/dashboard.service.js';
import { PrismaReportsRepository } from './modules/reports/reports.repository.js';
import { ReportsService } from './modules/reports/reports.service.js';
import type { ReportsRepository } from './modules/reports/reports.repository.types.js';
import { createReportStorage } from './modules/reports/storage/report-storage.js';
import type { ReportStorage } from './modules/reports/storage/report-storage.types.js';
import { ReportOcrService } from './modules/reports/ocr/report-ocr.js';
import { createOcrConfig } from './modules/reports/ocr/ocr-config.js';
import { ReportParser } from './modules/reports/parsing/report-parser.js';
import { ReportProcessorImpl } from './modules/reports/processing/report-processor.js';
import type { ReportProcessor } from './modules/reports/processing/report-processor.js';
import { PrismaKnowledgeRepository } from './modules/knowledge/knowledge.repository.js';
import { KnowledgeService } from './modules/knowledge/knowledge.service.js';
import type { KnowledgeRepository } from './modules/knowledge/knowledge.repository.types.js';
import { OpenAiCompatibleLlmClient, type LlmClient } from './modules/assistant/llm/llm-client.js';
import { PrismaAssistantRepository } from './modules/assistant/assistant.repository.js';
import { AssistantService } from './modules/assistant/assistant.service.js';
import type { AssistantRepository } from './modules/assistant/assistant.repository.types.js';
import { PrismaNutritionRepository } from './modules/nutrition/nutrition.repository.js';
import { NutritionService } from './modules/nutrition/nutrition.service.js';
import type { NutritionRepository } from './modules/nutrition/nutrition.repository.types.js';
import { PrismaWorkoutRepository } from './modules/workout/workout.repository.js';
import { WorkoutService } from './modules/workout/workout.service.js';
import type { WorkoutRepository } from './modules/workout/workout.repository.types.js';
import { PrismaMedicationRepository } from './modules/medications/medication.repository.js';
import { MedicationService } from './modules/medications/medication.service.js';
import type { MedicationRepository } from './modules/medications/medication.repository.types.js';
import { PrismaVoiceRepository } from './modules/voice/voice.repository.js';
import { VoiceService } from './modules/voice/voice.service.js';
import type { VoiceRepository } from './modules/voice/voice.repository.types.js';
import { AnalyticsService } from './modules/analytics/analytics.service.js';
import { PrismaCareRepository } from './modules/care/care.repository.js';
import { CareService } from './modules/care/care.service.js';
import type { CareRepository } from './modules/care/care.repository.types.js';
import { DoctorService } from './modules/doctor/doctor.service.js';

export interface Container {
  authRepository: AuthRepository;
  tokenService: TokenService;
  emailService: EmailService;
  passwordService: PasswordService;
  oauthService: GoogleOAuthService;
  authService: AuthService;
  metricsRepository: MetricsRepository;
  metricsService: MetricsService;
  dashboardService: DashboardService;
  reportsRepository: ReportsRepository;
  reportStorage: ReportStorage;
  reportProcessor: ReportProcessor;
  reportsService: ReportsService;
  knowledgeRepository: KnowledgeRepository;
  knowledgeService: KnowledgeService;
  llmClient: LlmClient;
  assistantRepository: AssistantRepository;
  assistantService: AssistantService;
  nutritionRepository: NutritionRepository;
  nutritionService: NutritionService;
  workoutRepository: WorkoutRepository;
  workoutService: WorkoutService;
  medicationRepository: MedicationRepository;
  medicationService: MedicationService;
  voiceRepository: VoiceRepository;
  voiceService: VoiceService;
  analyticsService: AnalyticsService;
  careRepository: CareRepository;
  careService: CareService;
  doctorService: DoctorService;
}

export function createContainer(overrides?: Partial<Container>): Container {
  const authRepository = overrides?.authRepository ?? new PrismaAuthRepository();
  const tokenService = overrides?.tokenService ?? new TokenService();
  const emailService = overrides?.emailService ?? new EmailService();
  const passwordService = overrides?.passwordService ?? new PasswordService();
  const oauthService = overrides?.oauthService ?? new GoogleOAuthService();
  const authService =
    overrides?.authService ??
    new AuthService(authRepository, tokenService, emailService, passwordService, oauthService);

  const metricsRepository = overrides?.metricsRepository ?? new PrismaMetricsRepository();

  const auditSink: AuditSink = {
    recordAudit: (input) =>
      authRepository.recordAudit({
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: (input.metadata ?? null) as Prisma.InputJsonValue | null,
      }),
  };

  const metricsService =
    overrides?.metricsService ?? new MetricsService(metricsRepository, auditSink);
  const dashboardService = overrides?.dashboardService ?? new DashboardService(metricsRepository);

  const reportsRepository = overrides?.reportsRepository ?? new PrismaReportsRepository();
  const reportStorage = overrides?.reportStorage ?? createReportStorage(env);
  const reportProcessor =
    overrides?.reportProcessor ??
    new ReportProcessorImpl(new ReportOcrService(createOcrConfig(env)), new ReportParser());
  const reportsService =
    overrides?.reportsService ??
    new ReportsService(
      reportsRepository,
      reportStorage,
      reportProcessor,
      auditSink,
      env.MAX_UPLOAD_BYTES,
    );

  const knowledgeRepository = overrides?.knowledgeRepository ?? new PrismaKnowledgeRepository();
  const knowledgeService =
    overrides?.knowledgeService ?? new KnowledgeService(knowledgeRepository, auditSink);

  const llmClient =
    overrides?.llmClient ??
    new OpenAiCompatibleLlmClient({
      apiKey: env.USER_LLM_API_KEY,
      baseUrl: env.USER_LLM_BASE_URL,
      model: env.USER_LLM_MODEL,
      timeoutMs: env.LLM_TIMEOUT_MS,
    });
  const assistantRepository = overrides?.assistantRepository ?? new PrismaAssistantRepository();
  const assistantService =
    overrides?.assistantService ??
    new AssistantService(
      assistantRepository,
      knowledgeRepository,
      llmClient,
      {
        retrievalTopK: env.ASSISTANT_RETRIEVAL_TOP_K,
        contextCharLimit: env.ASSISTANT_CONTEXT_CHAR_LIMIT,
        historyMessages: env.ASSISTANT_HISTORY_MESSAGES,
      },
      auditSink,
    );

  const nutritionRepository = overrides?.nutritionRepository ?? new PrismaNutritionRepository();
  const nutritionService =
    overrides?.nutritionService ?? new NutritionService(nutritionRepository, auditSink);

  const workoutRepository = overrides?.workoutRepository ?? new PrismaWorkoutRepository();
  const workoutService =
    overrides?.workoutService ?? new WorkoutService(workoutRepository, auditSink);

  const medicationRepository = overrides?.medicationRepository ?? new PrismaMedicationRepository();
  const medicationService =
    overrides?.medicationService ?? new MedicationService(medicationRepository, auditSink);

  const voiceRepository = overrides?.voiceRepository ?? new PrismaVoiceRepository();
  const voiceService = overrides?.voiceService ?? new VoiceService(voiceRepository, auditSink);

  const analyticsService = overrides?.analyticsService ?? new AnalyticsService(metricsRepository);

  const careRepository = overrides?.careRepository ?? new PrismaCareRepository();
  const careService = overrides?.careService ?? new CareService(careRepository, auditSink);
  const doctorService =
    overrides?.doctorService ??
    new DoctorService(
      careRepository,
      authRepository,
      dashboardService,
      metricsService,
      reportsService,
      analyticsService,
      auditSink,
    );

  return {
    authRepository,
    tokenService,
    emailService,
    passwordService,
    oauthService,
    authService,
    metricsRepository,
    metricsService,
    dashboardService,
    reportsRepository,
    reportStorage,
    reportProcessor,
    reportsService,
    knowledgeRepository,
    knowledgeService,
    llmClient,
    assistantRepository,
    assistantService,
    nutritionRepository,
    nutritionService,
    workoutRepository,
    workoutService,
    medicationRepository,
    medicationService,
    voiceRepository,
    voiceService,
    analyticsService,
    careRepository,
    careService,
    doctorService,
  };
}
