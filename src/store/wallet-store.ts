import { create } from "zustand"

import { STORAGE_KEYS } from "../lib/constants"
import type { WalletMeta } from "./types"

interface WalletState {
  walletStatus: "none" | "locked" | "unlocked" | "recovering"
  walletMeta: WalletMeta | null
  mnemonic: string | null // Temporary: only set after creation for backup

  // Actions
  setWalletStatus: (status: "none" | "locked" | "unlocked" | "recovering") => void
  setWalletMeta: (meta: WalletMeta | null) => void
  setMnemonic: (mnemonic: string | null) => void
  hydrate: () => Promise<void>
  reset: () => void
}

export const useWalletStore = create<WalletState>((set, get) => ({
  walletStatus: "none",
  walletMeta: null,
  mnemonic: null,

  setWalletStatus: (status) => {
    set({ walletStatus: status })
    // 持久化解锁/锁定状态，这样重新打开弹窗时能保持
    chrome.storage.local.set({ "wlt:wallet-status": status })
  },

  setWalletMeta: (meta) => {
    set({ walletMeta: meta })
    if (meta) {
      chrome.storage.local.set({ [STORAGE_KEYS.WALLET_META]: meta })
    } else {
      chrome.storage.local.remove(STORAGE_KEYS.WALLET_META)
    }
  },

  setMnemonic: (mnemonic) => set({ mnemonic }),

  hydrate: async () => {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.WALLET_META,
      "wlt:wallet-status",
    ])
    const meta: WalletMeta | undefined = result[STORAGE_KEYS.WALLET_META]
    const savedStatus = result["wlt:wallet-status"]

    if (meta) {
      // 如果有保存的状态（如 "unlocked"），恢复它；否则默认 "locked"
      const status = savedStatus === "unlocked" ? "unlocked" : "locked"
      set({ walletMeta: meta, walletStatus: status })
    } else {
      set({ walletMeta: null, walletStatus: "none" })
    }
  },

  reset: () => {
    set({ walletStatus: "none", walletMeta: null, mnemonic: null })
    chrome.storage.local.remove([
      STORAGE_KEYS.WALLET_META,
      "wlt:wallet-status",
    ])
  },
}))
