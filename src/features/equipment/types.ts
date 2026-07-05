export type EquipmentStatus = 'in_progress' | 'complete';

export type Equipment = {
  id: number;
  name: string;
  status: EquipmentStatus;
  ordre: number;
  createdAt: string;
};

/**
 * Same ordering as the backend: manual order (ordre), then newest first as a
 * tie-breaker. Status no longer affects ordering — items stay where the user
 * placed them regardless of whether they are completed.
 */
export function compareEquipment(a: Equipment, b: Equipment): number {
  return a.ordre - b.ordre || b.createdAt.localeCompare(a.createdAt);
}
