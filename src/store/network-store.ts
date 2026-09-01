import { create } from "zustand"

import { DEFAULT_NETWORKS, DEFAULT_CHAIN_ID, STORAGE_KEYS } from "../lib/constants"
import type { Network } from "./types"

interface NetworkState {
  networks: Network[]
  activeChainId: number

  // Computed
  activeNetwork: () => Network
  rpcUrl: () => string

  // Actions
  setNetworks: (networks: Network[]) => void
  setActiveNetwork: (chainId: number) => void
  addNetwork: (network: Network) => void
  removeNetwork: (chainId: number) => void
  hydrate: () => Promise<void>
  reset: () => void
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  networks: DEFAULT_NETWORKS,
  activeChainId: DEFAULT_CHAIN_ID,

  activeNetwork: () => {
    const { networks, activeChainId } = get()
    return (
      networks.find((n) => n.chainId === activeChainId) || networks[0]
    )
  },

  rpcUrl: () => {
    return get().activeNetwork().rpcUrl
  },

  setNetworks: (networks) => {
    set({ networks })
    chrome.storage.local.set({ [STORAGE_KEYS.NETWORKS]: networks })
  },

  setActiveNetwork: (chainId) => {
    set({ activeChainId: chainId })
    chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_CHAIN_ID]: chainId })
  },

  addNetwork: (network) => {
    const { networks } = get()
    const exists = networks.some((n) => n.chainId === network.chainId)
    if (exists) return

    const newNetworks = [...networks, network]
    set({ networks: newNetworks })
    chrome.storage.local.set({ [STORAGE_KEYS.NETWORKS]: newNetworks })
  },

  removeNetwork: (chainId) => {
    const { networks, activeChainId } = get()
    const network = networks.find((n) => n.chainId === chainId)
    if (!network || network.isDefault) return // Cannot remove default networks

    const newNetworks = networks.filter((n) => n.chainId !== chainId)
    set({ networks: newNetworks })
    chrome.storage.local.set({ [STORAGE_KEYS.NETWORKS]: newNetworks })

    // If removed network was active, switch to default
    if (activeChainId === chainId) {
      get().setActiveNetwork(DEFAULT_CHAIN_ID)
    }
  },

  hydrate: async () => {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.NETWORKS,
      STORAGE_KEYS.ACTIVE_CHAIN_ID,
    ])
    const networks: Network[] =
      result[STORAGE_KEYS.NETWORKS] || DEFAULT_NETWORKS
    const activeChainId: number =
      result[STORAGE_KEYS.ACTIVE_CHAIN_ID] || DEFAULT_CHAIN_ID

    set({ networks, activeChainId })
  },

  reset: () => {
    set({ networks: DEFAULT_NETWORKS, activeChainId: DEFAULT_CHAIN_ID })
    chrome.storage.local.remove([
      STORAGE_KEYS.NETWORKS,
      STORAGE_KEYS.ACTIVE_CHAIN_ID,
    ])
  },
}))
