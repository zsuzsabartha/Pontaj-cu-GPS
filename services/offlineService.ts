
import { OfflineAction, OfflineActionType } from '../types';

const STORAGE_KEY = 'pontaj_offline_queue';

export const saveOfflineAction = (type: OfflineActionType, payload: any, userId: string) => {
  const action: OfflineAction = {
    id: `act-${Date.now()}-${Math.random()}`,
    type,
    payload,
    timestamp: Date.now(),
    userId
  };

  const existing = getOfflineActions();
  const updated = [...existing, action];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  console.log(`[Offline Service] Action saved: ${type}`);
  return action;
};

export const getOfflineActions = (): OfflineAction[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const clearOfflineActions = () => {
  localStorage.removeItem(STORAGE_KEY);
  console.log(`[Offline Service] Queue cleared.`);
};

export const hasPendingActions = (): boolean => {
  return getOfflineActions().length > 0;
};
