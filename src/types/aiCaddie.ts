export interface CourseConditions {
  windSpeed: number;
  windDirection: string;
  temperature: number;
  humidity: number;
  greenSpeed: 'slow' | 'medium' | 'fast';
  firmness: 'soft' | 'medium' | 'firm';
}

export interface PlayerStats {
  averageDriver: number;
  average7Iron: number;
  averageWedge: number;
  recentRounds: number[];
  strengths: string[];
  improvements: string[];
}

export interface HoleInfo {
  number: number;
  par: number;
  distanceToPin: number;
  pinDifficulty: 'easy' | 'medium' | 'hard';
  hazards: Array<{ type: string; distance: number; carry: number }>;
}

export interface AIRecommendation {
  club: string;
  confidence: number;
  strategy: string;
  reasoning: string;
  alternativeClubs: string[];
  riskLevel: 'low' | 'medium' | 'high';
  yardageAdjustment?: number;
  keyConsiderations?: string[];
}