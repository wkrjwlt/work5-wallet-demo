export { useWalletStore } from "./wallet-store"
export { useAccountStore } from "./account-store"
export { useNetworkStore } from "./network-store"
export { useTokenStore } from "./token-store"
export { useDappStore } from "./dapp-store"

/**
 * Initialize all stores from Chrome storage.
 * Call this once when the popup mounts.
 */
export async function initializeStores() {
  const { useWalletStore } = await import("./wallet-store")
  const { useAccountStore } = await import("./account-store")
  const { useNetworkStore } = await import("./network-store")
  const { useTokenStore } = await import("./token-store")
  const { useDappStore } = await import("./dapp-store")

  await Promise.all([
    useWalletStore.getState().hydrate(),
    useAccountStore.getState().hydrate(),
    useNetworkStore.getState().hydrate(),
    useTokenStore.getState().hydrate(),
    useDappStore.getState().hydrate(),
  ])
}
