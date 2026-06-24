'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AIProvider } from '@/types/providers'
import { DEFAULT_AI_SETTINGS } from '@/types/providers'

interface AISettingsState {
  provider: AIProvider
  model: string
  setProviderModel: (provider: AIProvider, model: string) => void
  reset: () => void
}

export const useAISettingsStore = create<AISettingsState>()(
  persist(
    (set) => ({
      provider: DEFAULT_AI_SETTINGS.provider,
      model: DEFAULT_AI_SETTINGS.model,
      setProviderModel: (provider, model) => set({ provider, model }),
      reset: () => set({ provider: DEFAULT_AI_SETTINGS.provider, model: DEFAULT_AI_SETTINGS.model }),
    }),
    { name: 'upcat-ai-settings' }
  )
)
