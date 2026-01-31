import { z } from 'zod';

// ============ BASE TYPES ============
export type Module = 'ccna' | 'netsec' | 'ccnp' | 'aws';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type Status = 'draft' | 'approved' | 'published' | 'archived';
export type Role = 'student' | 'faculty_reviewer' | 'content_admin' | 'super_admin';

// ============ API RESPONSE TYPES ============
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

// ============ SESSION USER ============
export interface SessionUser {
    id: string;
    email: string;
    role: Role;
}

// ============ TUTOR RESPONSE ============
export interface TutorResponse {
    topic: string;
    intent: string;
    explanation: {
        concept: string;
        mentalModel: string;
        wireLogic: string;
        cliExample?: string;
    };
    commonMistakes: string[];
    examNote?: string;
    followUpQuestions?: string[]; // For Socratic teaching mode
    mode: 'learn' | 'exam';
    source: 'cache' | 'database' | 'llm';
    latency: number;
}

// ============ QUIZ TYPES ============
export type QuestionType =
    | 'multiple_choice'
    | 'multiple_select'
    | 'drag_drop'
    | 'fill_blank'
    | 'hotspot'
    | 'simulation';

export interface QuestionOption {
    id: string;
    text: string;
    isCorrect?: boolean;
    image?: string;
}

export interface QuizConfig {
    id: string;
    title: string;
    description?: string;
    topics: string[];
    questionCount: number;
    timeLimit?: number;
    passingScore: number;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    showExplanations: boolean;
    allowReview: boolean;
    maxAttempts?: number;
    isAdaptive: boolean;
}

export interface QuizAttemptAnswer {
    questionId: string;
    answer: string | string[] | Record<string, string>;
    correct: boolean;
    timeSpent: number;
    points: number;
}

export interface QuizResult {
    attemptId: string;
    quizId: string;
    score: number;
    passed: boolean;
    correctCount: number;
    totalCount: number;
    timeSpent: number;
    answers: QuizAttemptAnswer[];
    topicBreakdown: Record<string, { correct: number; total: number; score: number }>;
}

// ============ PROGRESS TYPES ============
export interface UserProgressSummary {
    module: Module;
    totalTimeSpent: number;
    currentStreak: number;
    longestStreak: number;
    level: number;
    experiencePoints: number;
    topicsCompleted: number;
    topicsTotal: number;
    overallMastery: number;
    recentActivity: ActivityItem[];
}

export interface TopicProgressDetail {
    topic: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'mastered';
    nodesViewed: number;
    nodesTotal: number;
    quizzesPassed: number;
    quizzesTotal: number;
    averageScore?: number;
    timeSpent: number;
    masteryLevel: number;
    lastAccessedAt?: Date;
}

export interface ActivityItem {
    id: string;
    type: 'view' | 'quiz' | 'flashcard' | 'lab' | 'achievement';
    entityType: string;
    entityId: string;
    metadata: Record<string, unknown>;
    duration?: number;
    createdAt: Date;
}

export interface LearningRecommendation {
    type: 'review' | 'new' | 'quiz' | 'lab' | 'flashcard';
    topic: string;
    nodeId?: string;
    reason: string;
    priority: number;
}

export interface AchievementData {
    id: string;
    type: string;
    name: string;
    description: string;
    icon: string;
    xpReward: number;
    earnedAt?: Date;
    progress?: number;
}

// ============ FLASHCARD TYPES ============
export type FlashcardRating = 'again' | 'hard' | 'good' | 'easy';

export interface FlashcardWithProgress {
    id: string;
    nodeId?: string;
    module: Module;
    topic: string;
    front: string;
    back: string;
    frontHtml?: string;
    backHtml?: string;
    tags: string[];
    difficulty: Difficulty;
    easeFactor: number;
    interval: number;
    repetitions: number;
    nextReviewAt: Date;
    lastReviewedAt?: Date;
    totalReviews: number;
    correctReviews: number;
}

export interface FlashcardReviewSession {
    cards: FlashcardWithProgress[];
    totalCards: number;
    newCards: number;
    reviewCards: number;
    module: Module;
    topic?: string;
}

export interface FlashcardStats {
    totalCards: number;
    masteredCards: number;
    learningCards: number;
    newCards: number;
    dueToday: number;
    averageEaseFactor: number;
    streakDays: number;
    totalReviews: number;
    accuracy: number;
}

// ============ LAB TYPES ============
export type LabDifficulty = 'guided' | 'standard' | 'challenge';

export interface LabObjective {
    id: string;
    text: string;
    verificationCommand?: string;
    expectedOutput?: string;
    completed?: boolean;
}

export interface NetworkDevice {
    id: string;
    name: string;
    type: 'router' | 'switch' | 'pc' | 'server' | 'firewall';
    interfaces: NetworkInterface[];
    config?: string;
    position: { x: number; y: number };
}

export interface NetworkInterface {
    name: string;
    ipAddress?: string;
    subnetMask?: string;
    status: 'up' | 'down' | 'admin_down';
    connectedTo?: { deviceId: string; interface: string };
}

export interface NetworkTopology {
    devices: NetworkDevice[];
    connections: Array<{
        from: { deviceId: string; interface: string };
        to: { deviceId: string; interface: string };
    }>;
}

export interface LabAttemptData {
    id: string;
    labId: string;
    startedAt: Date;
    completedAt?: Date;
    timeSpent?: number;
    objectivesCompleted: string[];
    finalConfigs: Record<string, string>;
    commandHistory: CLICommand[];
    hintsUsed: number;
    score?: number;
    passed?: boolean;
}

// ============ CLI SIMULATOR TYPES ============
export interface CLICommand {
    device: string;
    command: string;
    output: string;
    timestamp: Date;
    valid: boolean;
}

export interface CLIState {
    device: string;
    mode: 'user' | 'privileged' | 'global_config' | 'interface_config' | 'router_config' | 'line_config' | 'dhcp_config' | 'vlan_config' | 'acl_config';
    prompt: string;
    runningConfig: string;
    hostname: string;
    interfaces: Record<string, { ip?: string; mask?: string; status: string; description?: string }>;
    // New fields for configuration state tracking
    vlans: Array<{ id: number; name: string; ports: string[] }>;
    routes: Array<{ network: string; mask: string; nextHop: string; type: 'static' | 'connected' }>;
    modeHistory: string[]; // Track mode history for proper exit navigation
    currentInterface?: string; // Track which interface is being configured
    ospfConfig?: { processId: number; networks: Array<{ network: string; wildcard: string; area: string }> };
    dhcpPools?: Array<{ name: string; network?: string; defaultRouter?: string; dns?: string[] }>;
}

export interface CLIValidationRule {
    type: 'config_contains' | 'output_matches' | 'command_executed';
    target: string;
    pattern?: string;
    required: boolean;
}

// ============ EXAM TYPES ============
export interface ExamSection {
    topic: string;
    weight: number;
    questionCount: number;
}

export interface ExamConfig {
    id: string;
    module: Module;
    title: string;
    description?: string;
    duration: number;
    totalQuestions: number;
    passingScore: number;
    sections: ExamSection[];
    rules: {
        allowBacktrack: boolean;
        showTimer: boolean;
        showProgress: boolean;
        allowFlagging: boolean;
    };
    isOfficial: boolean;
}

export interface ExamAttemptState {
    id: string;
    examId: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
    startedAt?: Date;
    completedAt?: Date;
    timeRemaining: number;
    currentQuestionIndex: number;
    questions: string[];
    answers: Record<string, string | string[]>;
    flaggedQuestions: string[];
}

export interface ExamResult {
    attemptId: string;
    examId: string;
    rawScore: number;
    scaledScore: number;
    passed: boolean;
    timeSpent: number;
    sectionScores: Record<string, {
        topic: string;
        score: number;
        questionsCorrect: number;
        questionsTotal: number;
    }>;
    strengths: string[];
    weaknesses: string[];
}

// ============ STUDY GROUP TYPES ============
export interface GroupMemberInfo {
    id: string;
    groupId: string;
    userId: string;
    role: 'owner' | 'admin' | 'member';
    joinedAt: Date;
    lastActiveAt?: Date;
    user: {
        id: string;
        name?: string;
        email: string;
        avatar?: string;
    };
}

export interface GroupDiscussionInfo {
    id: string;
    groupId: string;
    nodeId?: string;
    title: string;
    createdBy: GroupMemberInfo;
    isPinned: boolean;
    isLocked: boolean;
    messageCount: number;
    lastMessageAt?: Date;
    createdAt: Date;
}

export interface GroupMessageInfo {
    id: string;
    discussionId: string;
    user: {
        id: string;
        name?: string;
        avatar?: string;
    };
    content: string;
    replyToId?: string;
    isEdited: boolean;
    createdAt: Date;
}

export interface GroupChallengeInfo {
    id: string;
    groupId: string;
    quizId?: string;
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    participants: Array<{
        userId: string;
        name?: string;
        score?: number;
        completedAt?: Date;
    }>;
    createdBy: string;
}

export interface GroupLeaderboard {
    groupId: string;
    period: 'week' | 'month' | 'all_time';
    entries: Array<{
        rank: number;
        userId: string;
        name?: string;
        avatar?: string;
        score: number;
        quizzesPassed: number;
        streak: number;
    }>;
}

// ============ DASHBOARD STATS ============
export interface DashboardStats {
    totalNodes: number;
    publishedNodes: number;
    draftNodes: number;
    approvedNodes: number;
    pendingJobs: number;
    recentActivity: Array<{
        action: string;
        entityType: string;
        timestamp: Date;
        user?: string;
    }>;
}

// ============ ZOD SCHEMAS ============
export const loginSchema = z.object({
    email: z.string().email(),
});

export const verifySchema = z.object({
    token: z.string().min(1),
});

export const querySchema = z.object({
    query: z.string().min(1).max(500),
    module: z.enum(['ccna', 'netsec', 'ccnp', 'aws']).default('ccna'),
    mode: z.enum(['learn', 'exam']).default('learn'),
    style: z.enum(['direct', 'socratic']).default('direct'),
    difficulty: z.enum(['eli5', 'beginner', 'intermediate', 'expert']).default('intermediate'),
});

export const knowledgeNodeSchema = z.object({
    module: z.enum(['ccna', 'netsec', 'ccnp', 'aws']).default('ccna'),
    topic: z.string().min(1),
    subtopic: z.string().optional(),
    intent: z.string().min(1),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
    prerequisites: z.array(z.string()).default([]),
    coreExplanation: z.string().min(1),
    mentalModel: z.string().min(1),
    wireLogic: z.string().min(1),
    cliExample: z.string().optional(),
    commonMistakes: z.array(z.string()).default([]),
    examNote: z.string().optional(),
});

export const generationRequestSchema = z.object({
    module: z.enum(['ccna', 'netsec', 'ccnp', 'aws']).default('ccna'),
    topics: z.array(z.string()).min(1),
    provider: z.enum(['openai', 'anthropic']).default('openai'),
    model: z.string().default('gpt-4-turbo'),
    temperature: z.number().min(0).max(1).default(0.3),
});

export const quizSubmitSchema = z.object({
    attemptId: z.string().uuid(),
    answers: z.array(z.object({
        questionId: z.string().uuid(),
        answer: z.union([z.string(), z.array(z.string()), z.record(z.string())]),
        timeSpent: z.number().int().min(0),
    })),
});

export const flashcardReviewSchema = z.object({
    flashcardId: z.string().uuid(),
    rating: z.enum(['again', 'hard', 'good', 'easy']),
    responseTime: z.number().int().min(0),
});

export const examSubmitSchema = z.object({
    attemptId: z.string().uuid(),
    answers: z.record(z.union([z.string(), z.array(z.string())])),
});

export const cliCommandSchema = z.object({
    exerciseId: z.string().uuid(),
    command: z.string().max(500),
    deviceId: z.string().optional(),
});

export const groupCreateSchema = z.object({
    name: z.string().min(3).max(100),
    description: z.string().max(500).optional(),
    module: z.enum(['ccna', 'netsec', 'ccnp', 'aws']).default('ccna'),
    isPublic: z.boolean().default(true),
    maxMembers: z.number().int().min(2).max(100).default(50),
});

export const groupMessageSchema = z.object({
    discussionId: z.string().uuid(),
    content: z.string().min(1).max(2000),
    replyToId: z.string().uuid().optional(),
});

export type KnowledgeNodeInput = z.infer<typeof knowledgeNodeSchema>;
export type GenerationRequest = z.infer<typeof generationRequestSchema>;
export type QueryInput = z.infer<typeof querySchema>;
