import { create } from "zustand";

interface UIState {
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  toggleCommand: () => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  commandOpen: false,
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  mobileNavOpen: false,
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
}));
