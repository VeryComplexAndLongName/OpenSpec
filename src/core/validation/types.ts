export type ValidationLevel = 'ERROR' | 'WARNING' | 'INFO';

export interface ValidationIssue {
  level: ValidationLevel;
  path: string;
  message: string;
  /** Planning advice remains non-blocking even under strict validation. */
  advisory?: boolean;
  line?: number;
  column?: number;
}

export interface ValidationReport {
  valid: boolean;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}
