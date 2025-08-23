import { create } from 'zustand';
import moment from 'moment-timezone';

interface SettingsState {
  // State
  date: string;
  dueDate: string;
  
  // Actions
  setDate: (date: string) => void;
  setDueDate: (dueDate: string) => void;
  resetToDefaults: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  // Initial state - default to today
  date: moment().tz("America/Vancouver").format("YYYY-MM-DD"),
  dueDate: moment().tz("America/Vancouver").format("YYYY-MM-DD"),

  // Actions
  setDate: (date) => set({ date }),
  setDueDate: (dueDate) => set({ dueDate }),
  
  resetToDefaults: () => set({
    date: moment().tz("America/Vancouver").format("YYYY-MM-DD"),
    dueDate: moment().tz("America/Vancouver").format("YYYY-MM-DD"),
  }),
}));
