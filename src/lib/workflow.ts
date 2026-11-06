export type WorkflowStageKey =
  | 'pending'
  | 'washing_drying'
  | 'washing'
  | 'drying'
  | 'ironing'
  | 'dry_cleaning'
  | 'processing'
  | 'folding'
  | 'done'
  | 'claimed'
  | 'cancelled';

export interface WorkflowStageInfo {
  key: WorkflowStageKey;
  label: string;
  icon: string;
  color: string;
}

export const ALL_STAGES: Record<WorkflowStageKey, WorkflowStageInfo> = {
  pending: { key: 'pending', label: 'Received', icon: '⏳', color: 'amber' },
  processing: { key: 'processing', label: 'Processing', icon: '🔄', color: 'blue' },
  washing_drying: { key: 'washing_drying', label: 'Washing & Drying', icon: '🧼', color: 'cyan' },
  washing: { key: 'washing', label: 'Washing & Drying', icon: '🧼', color: 'cyan' },
  drying: { key: 'drying', label: 'Washing & Drying', icon: '💨', color: 'purple' },
  ironing: { key: 'ironing', label: 'Iron / Press', icon: '👔', color: 'indigo' },
  dry_cleaning: { key: 'dry_cleaning', label: 'Dry Clean', icon: '✨', color: 'violet' },
  folding: { key: 'folding', label: 'Folding', icon: '🧺', color: 'sky' },
  done: { key: 'done', label: 'Ready for Collection', icon: '✅', color: 'emerald' },
  claimed: { key: 'claimed', label: 'Delivered', icon: '📦', color: 'slate' },
  cancelled: { key: 'cancelled', label: 'Cancelled', icon: '❌', color: 'rose' },
};

/**
 * Normalizes any stages array so that:
 * 1. 'washing' and 'drying' are always merged into 'washing_drying'
 * 2. Unrepresented intermediate steps ('processing', 'folding') are mapped into operational stations
 * 3. Duplicate stages are stripped
 */
export function normalizeWorkflowStages(stages?: (WorkflowStageKey | string)[]): WorkflowStageKey[] {
  if (!stages || stages.length === 0) {
    return ['pending', 'washing_drying', 'ironing', 'done', 'claimed'];
  }

  const result: WorkflowStageKey[] = [];
  let hasWashDry = false;

  for (const s of stages) {
    const stage = s as WorkflowStageKey;
    // Skip intermediate sub-steps that don't correspond to physical board stations
    if (stage === 'processing' || stage === 'folding') continue;

    if (stage === 'washing' || stage === 'drying' || stage === 'washing_drying') {
      if (!hasWashDry) {
        result.push('washing_drying');
        hasWashDry = true;
      }
    } else {
      if (!result.includes(stage)) {
        result.push(stage);
      }
    }
  }

  // Ensure 'pending' is at the beginning
  if (!result.includes('pending')) {
    result.unshift('pending');
  }
  // Ensure 'done' and 'claimed' are at the end
  if (!result.includes('done')) {
    result.push('done');
  }
  if (!result.includes('claimed')) {
    result.push('claimed');
  }

  return result;
}

/**
 * Determine the ordered workflow stages based on services selected in the order.
 * Services can be: 'Wash & Fold', 'Wash & Iron', 'Iron Only' / 'Steam Press', 'Dry Clean', etc.
 */
export function getWorkflowStagesForServices(services: string[]): WorkflowStageKey[] {
  if (!services || services.length === 0) {
    // Default standard workflow if none specified
    return ['pending', 'washing_drying', 'ironing', 'done', 'claimed'];
  }

  const normalized = services.map((s) => s.toLowerCase());

  const hasDryClean = normalized.some((s) => s.includes('dry clean'));
  const hasWash = normalized.some((s) => s.includes('wash'));
  const hasIron = normalized.some((s) => s.includes('iron') || s.includes('press'));

  // If it's Ironing/Press ONLY
  if (hasIron && !hasWash && !hasDryClean) {
    return ['pending', 'ironing', 'done', 'claimed'];
  }

  // If it's Dry Cleaning ONLY
  if (hasDryClean && !hasWash && !hasIron) {
    return ['pending', 'dry_cleaning', 'done', 'claimed'];
  }

  // If it's Washing ONLY (e.g. Wash & Fold or Wash Only)
  if (hasWash && !hasIron && !hasDryClean) {
    return ['pending', 'washing_drying', 'done', 'claimed'];
  }

  // Combined services (e.g. Wash & Iron, Wash & Dry Clean & Iron, Dry Clean & Iron)
  const stages: WorkflowStageKey[] = ['pending'];
  if (hasWash) {
    stages.push('washing_drying');
  }
  if (hasDryClean) {
    stages.push('dry_cleaning');
  }
  if (hasIron) {
    stages.push('ironing');
  }
  stages.push('done');
  stages.push('claimed');

  return stages;
}

/**
 * Get next workflow stage for an order.
 * Strictly guarantees that moving from 'washing_drying' (or legacy 'washing' / 'drying')
 * advances directly to the next service station (such as 'ironing', 'dry_cleaning', or 'done'),
 * NEVER staying in or looping back to washing/drying.
 */
export function getNextStage(
  currentStage: WorkflowStageKey | string,
  activeStages?: (WorkflowStageKey | string)[]
): WorkflowStageKey | null {
  const normalizedStages = normalizeWorkflowStages(activeStages);

  // Normalize current stage:
  // If current stage is washing or drying, it is at washing_drying
  // If current stage is processing, treat as pending
  let normalizedCurrent: WorkflowStageKey = currentStage as WorkflowStageKey;
  if (currentStage === 'washing' || currentStage === 'drying') {
    normalizedCurrent = 'washing_drying';
  } else if (currentStage === 'processing') {
    normalizedCurrent = 'pending';
  }

  const currentIndex = normalizedStages.indexOf(normalizedCurrent);
  if (currentIndex === -1) {
    // If not found in stages, find standard next or ready
    if (normalizedCurrent === 'pending') {
      return normalizedStages[1] || 'done';
    }
    return 'done';
  }

  if (currentIndex < normalizedStages.length - 1) {
    return normalizedStages[currentIndex + 1];
  }

  return null; // Already at the end ('claimed')
}

