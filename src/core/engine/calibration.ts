import type { LearnerState } from '../types';

export interface CalibrationSummary {
  sureCount: number;
  sureWrong: number;
  sureWrongRate: number; // 0..1
  overconfident: boolean; // sure, but wrong often
  enoughData: boolean;
}

export function calibrationSummary(state: LearnerState): CalibrationSummary {
  const s = state.calibration.sure;
  const rate = s.n ? s.wrong / s.n : 0;
  return {
    sureCount: s.n,
    sureWrong: s.wrong,
    sureWrongRate: rate,
    overconfident: s.n >= 4 && rate >= 0.3,
    enoughData: s.n >= 3,
  };
}
