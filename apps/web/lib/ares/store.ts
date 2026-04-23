import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (val: boolean) => void;
  activeTargetId: string | null;
  setActiveTargetId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  setSidebarCollapsed: (val) => set({ sidebarCollapsed: val }),
  activeTargetId: null,
  setActiveTargetId: (id) => set({ activeTargetId: id }),
}));
