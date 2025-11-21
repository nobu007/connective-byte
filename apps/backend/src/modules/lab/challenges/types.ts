/**
 * Challenge System Types
 */

export type ChallengeDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type ChallengeStatus = 'locked' | 'available' | 'in-progress' | 'completed';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  category: string;
  objectives: ChallengeObjective[];
  targetMetrics: ChallengeMetrics;
  hints: ChallengeHint[];
  estimatedDuration: number; // minutes
  points: number;
  prerequisites: string[]; // Challenge IDs
  createdAt: Date;
}

export interface ChallengeObjective {
  id: string;
  description: string;
  required: boolean;
  completed: boolean;
}

export interface ChallengeMetrics {
  maxCost: number;
  maxTokens: number;
  minCostReduction: number; // percentage
  maxLatency: number;
}

export interface ChallengeHint {
  id: string;
  level: number;
  content: string;
  pointsPenalty: number;
}

export interface ChallengeSession {
  id: string;
  challengeId: string;
  userId: string;
  status: ChallengeStatus;
  startedAt: Date;
  completedAt?: Date;
  attempts: number;
  hintsUsed: string[];
  score: number;
  metrics: {
    actualCost: number;
    actualTokens: number;
    costReduction: number;
    latency: number;
  };
}

export interface ChallengeResult {
  success: boolean;
  score: number;
  objectivesCompleted: number;
  totalObjectives: number;
  metricsAchieved: boolean;
  feedback: string[];
  badgesEarned: string[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: string;
  earnedAt?: Date;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  challengesCompleted: number;
  totalPoints: number;
  rank: number;
}
