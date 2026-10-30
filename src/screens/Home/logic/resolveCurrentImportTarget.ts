import {BadgePhase} from '@/src/utils/import/importPhases';

export type CurrentImportTarget = 'report' | 'status';

/** A press on the current import opens its report once it is ready, its status before that. */
export const resolveCurrentImportTarget = (phase: BadgePhase | null): CurrentImportTarget => {
  if (phase === 'ready') {
    return 'report';
  }
  return 'status';
};
