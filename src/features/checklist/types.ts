export type ChecklistItemStatus = 'in_progress' | 'complete';

export type ChecklistItem = {
  id: number;
  name: string;
  status: ChecklistItemStatus;
  ordre: number;
  createdAt: string;
};

/**
 * Same ordering as the backend: manual order (ordre), then newest first as a
 * tie-breaker. Status no longer affects ordering — items stay where the user
 * placed them regardless of whether they are completed.
 */
export function compareChecklistItem(a: ChecklistItem, b: ChecklistItem): number {
  return a.ordre - b.ordre || b.createdAt.localeCompare(a.createdAt);
}
