import { create } from "zustand"

import { STORAGE_KEYS } from "../lib/constants"
import type { Token } from "./types"

interface TokenState {
  tokens: Token[]

  // Actions
  setTokens: (tokens: Token[]) => void
  addToken: (token: Token) => void
  removeToken: (contractAddress: string, chainId: number) => void
  updateTokenBalance: (
    contractAddress: string,
    chainId: number,
    balance: string
  ) => void
  hydrate: () => Promise<void>
  reset: () => void
}

export const useTokenStore = create<TokenState>((set, get) => ({
  tokens: [],

  setTokens: (tokens) => {
    set({ tokens })
    chrome.storage.local.set({ [STORAGE_KEYS.TOKENS]: tokens })
  },

  addToken: (token) => {
    const { tokens } = get()
    const exists = tokens.some(
      (t) =>
        t.contractAddress.toLowerCase() ===
          token.contractAddress.toLowerCase() && t.chainId === token.chainId
    )
    if (exists) return

    const newTokens = [...tokens, token]
    set({ tokens: newTokens })
    chrome.storage.local.set({ [STORAGE_KEYS.TOKENS]: newTokens })
  },

  removeToken: (contractAddress, chainId) => {
    const { tokens } = get()
    const newTokens = tokens.filter(
      (t) =>
        !(
          t.contractAddress.toLowerCase() ===
            contractAddress.toLowerCase() && t.chainId === chainId
        )
    )
    set({ tokens: newTokens })
    chrome.storage.local.set({ [STORAGE_KEYS.TOKENS]: newTokens })
  },

  updateTokenBalance: (contractAddress, chainId, balance) => {
    const { tokens } = get()
    const newTokens = tokens.map((t) => {
      if (
        t.contractAddress.toLowerCase() ===
          contractAddress.toLowerCase() &&
        t.chainId === chainId
      ) {
        return { ...t, balance }
      }
      return t
    })
    set({ tokens: newTokens })
    chrome.storage.local.set({ [STORAGE_KEYS.TOKENS]: newTokens })
  },

  hydrate: async () => {
    const result = await chrome.storage.local.get(STORAGE_KEYS.TOKENS)
    const tokens: Token[] = result[STORAGE_KEYS.TOKENS] || []
    set({ tokens })
  },

  reset: () => {
    set({ tokens: [] })
    chrome.storage.local.remove(STORAGE_KEYS.TOKENS)
  },
}))
