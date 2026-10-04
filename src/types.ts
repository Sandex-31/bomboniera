export type Exam = {
  id: string;
  name: string;
  /** Academic year: 1, 2 or 3. */
  year: number;
  cfu: number;
  description: string;
  topics: string[];
  personalNote?: string;
  /** 18–31 (31 = 30 e lode). Omit if not taken / not shared. */
  grade?: number;
};

export type Project = {
  id: string;
  /** Museum label, e.g. "PROJECT #07". Auto-numbered if omitted. */
  title: string;
  year: number;
  course?: string;
  summary: string;
  description: string;
  tech: string[];
  /** Paths under /public, or absolute URLs. Missing files degrade gracefully. */
  media?: { src: string; alt: string; type?: 'image' | 'video' }[];
  github?: string;
  demo?: string;
};

export type ThesisStep = {
  label: string;
  body: string;
};

export type Thesis = {
  title: string;
  subtitle?: string;
  supervisor?: string;
  abstract: string;
  steps: ThesisStep[];
  tech: string[];
  architecture?: string[];
  results?: string[];
  media?: { src: string; alt: string }[];
  pdf?: string;
  repo?: string;
};

export type CreditBlock = {
  id: string;
  /** Rendered small above the body, e.g. "TO MY FAMILY". */
  heading?: string;
  body: string;
  /** Larger, centred, serif — used for the closing lines. */
  emphasis?: boolean;
};

/** One block of the roll that scrolls on the credits screen. */
export type CreditGroup = {
  /** Small gold line above the names, e.g. "LA FAMIGLIA". */
  heading: string;
  names: string[];
};

export type SectionId = 'exams' | 'projects' | 'thesis' | 'terminal' | 'credits';
