

export enum TestStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  FINISHED = 'finished',
}

export interface CharDisplayState {
  char: string;
  status: 'pending' | 'correct' | 'incorrect' | 'extra' | 'missed';
}

export interface Profile {
  user_id: string;
  created_at: string;
}

export interface TestStats {
  wpm: number;
  accuracy: number; // Word-based accuracy: (Correct Words / Words Processed) * 100
  trueAccuracy: number; // Character-based accuracy
  timeElapsed: number;
  correctWords: number;
  // incorrectWords is removed
  // skippedWords is removed
}

// Interfaces for data fetched for the admin dashboard
export interface UserInfo {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  country: string;
  created_at: string;
}

export interface TestResult {
  id: number;
  created_at: string;
  user_id: string;
  wpm: number;
  accuracy: number;
  true_accuracy: number;
  pass_status: boolean;
  score?: number;
  attempt_count?: number;
}

// New type to distinguish between different tests
export type ExerciseKey =
  | 'warmup_home_row'
  | 'warmup_alphabet'
  | 'basic_simple_sentences'
  | 'basic_common_words'
  | 'intermediate_complex_sentences'
  | 'intermediate_paragraph'
  | 'advanced_technical_vocab'
  | 'advanced_special_chars'
  | 'drill_timed_1_min'
  | 'drill_timed_3_min'
  | 'drill_accuracy_challenge'
  | 'final_exam';

export type ActiveTestType = ExerciseKey | null;