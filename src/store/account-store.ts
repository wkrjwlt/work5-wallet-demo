import { create } from "zustand"

import { STORAGE_KEYS } from "../lib/constants"
import type { Account } from "./types"

interface AccountState {
  accounts: Account[]
  activeAccountIndex: number

  // Actions
  setAccounts: (accounts: Account[]) => void
  setActiveAccount: (index: number) => void
  addAccount: (account: Account) => void
  renameAccount: (index: number, name: string) => void
  updateBalance: (
    address: string,
    ethBalance: string,
    tokenBalances?: Record<string, string>
  ) => void
  hydrate: () => Promise<void>
  reset: () => void
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  activeAccountIndex: 0,

  setAccounts: (accounts) => {
    set({ accounts })
    chrome.storage.local.set({ [STORAGE_KEYS.ACCOUNTS]: accounts })
  },

  setActiveAccount: (index) => {
    set({ activeAccountIndex: index })
    chrome.storage.local.set({ "wlt:active-account-index": index })
  },

  addAccount: (account) => {
    const { accounts } = get()
    const newAccounts = [...accounts, account]
    set({ accounts: newAccounts, activeAccountIndex: newAccounts.length - 1 })
    chrome.storage.local.set({ [STORAGE_KEYS.ACCOUNTS]: newAccounts })
  },

  renameAccount: (index, name) => {
    const { accounts } = get()
    const newAccounts = accounts.map((a, i) =>
      i === index ? { ...a, name } : a
    )
    set({ accounts: newAccounts })
    chrome.storage.local.set({ [STORAGE_KEYS.ACCOUNTS]: newAccounts })
  },

  updateBalance: (address, ethBalance, tokenBalances) => {
    const { accounts } = get()
    const newAccounts = accounts.map((a) => {
      if (a.address.toLowerCase() === address.toLowerCase()) {
        return {
          ...a,
          balances: {
            eth: ethBalance,
            tokens: tokenBalances || a.balances.tokens,
          },
        }
      }
      return a
    })
    set({ accounts: newAccounts })
    chrome.storage.local.set({ [STORAGE_KEYS.ACCOUNTS]: newAccounts })
  },

  hydrate: async () => {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.ACCOUNTS,
      "wlt:active-account-index",
    ])
    const accounts: Account[] = result[STORAGE_KEYS.ACCOUNTS] || []
    const activeIndex: number = result["wlt:active-account-index"] || 0

    set({ accounts, activeAccountIndex: activeIndex })
  },

  reset: () => {
    set({ accounts: [], activeAccountIndex: 0 })
    chrome.storage.local.remove([STORAGE_KEYS.ACCOUNTS, "wlt:active-account-index"])
  },
}))
