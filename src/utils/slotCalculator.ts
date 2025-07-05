/**
 * Calculate slots for accounts based on platform and management status
 */

export interface SlotCalculation {
  totalSlots: number;
  emptySlots: number;
}

export const calculateSlots = (
  platform: string,
  subscriptions: any[]
): SlotCalculation => {
  let totalSlots = 6;
  let emptySlots = 0;
  if (platform === 'YouTube' || platform === 'Spotify') {
    // Always reserve 1 slot for the manager (virtual)
    emptySlots = Math.max(0, totalSlots - (subscriptions.length + 1));
  } else {
    totalSlots = 3;
    emptySlots = Math.max(0, totalSlots - subscriptions.length);
  }
  return {
    totalSlots,
    emptySlots
  };
};

export const getSlotInfo = (platform: string, isManaged: boolean): string => {
  if (platform === 'YouTube' || platform === 'Spotify') {
    return isManaged ? '6 slots (managed)' : '5 slots (unmanaged)';
  }
  return isManaged ? '3 slots (managed)' : '3 slots (unmanaged)';
}; 