import { create } from "zustand"

import { STORAGE_KEYS } from "../lib/constants"
import type { DAppConnection } from "./types"

interface DAppState {
  connections: DAppConnection[]

  // Actions
  addConnection: (
    origin: string,
    accounts: string[],
    chainId: number
  ) => void
  removeConnection: (origin: string) => void
  updateConnection: (
    origin: string,
    partial: Partial<DAppConnection>
  ) => void
  hydrate: () => Promise<void>
  reset: () => void
}

export const useDappStore = create<DAppState>((set, get) => ({
  connections: [],

  addConnection: (origin, accounts, chainId) => {
    const { connections } = get()
    const exists = connections.some((c) => c.origin === origin)
    if (exists) return

    const newConnection: DAppConnection = {
      origin,
      connectedAccounts: accounts,
      connectedChainId: chainId,
    }
    const newConnections = [...connections, newConnection]
    set({ connections: newConnections })
    chrome.storage.local.set({ [STORAGE_KEYS.DAPPS]: newConnections })
  },

  removeConnection: (origin) => {
    const { connections } = get()
    const newConnections = connections.filter((c) => c.origin !== origin)
    set({ connections: newConnections })
    chrome.storage.local.set({ [STORAGE_KEYS.DAPPS]: newConnections })
  },

  updateConnection: (origin, partial) => {
    const { connections } = get()
    const newConnections = connections.map((c) =>
      c.origin === origin ? { ...c, ...partial } : c
    )
    set({ connections: newConnections })
    chrome.storage.local.set({ [STORAGE_KEYS.DAPPS]: newConnections })
  },

  hydrate: async () => {
    const result = await chrome.storage.local.get(STORAGE_KEYS.DAPPS)
    const connections: DAppConnection[] = result[STORAGE_KEYS.DAPPS] || []
    set({ connections })
  },

  reset: () => {
    set({ connections: [] })
    chrome.storage.local.remove(STORAGE_KEYS.DAPPS)
  },
}))
