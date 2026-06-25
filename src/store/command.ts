"use client";

import { create } from "zustand";

interface CommandState {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

export const useCommand = create<CommandState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
