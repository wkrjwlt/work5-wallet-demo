import { useNetworkStore } from "../store/network-store"

export function useNetwork() {
  const networks = useNetworkStore((s) => s.networks)
  const activeChainId = useNetworkStore((s) => s.activeChainId)
  const activeNetwork = useNetworkStore((s) => s.activeNetwork)()
  const rpcUrl = useNetworkStore((s) => s.rpcUrl)()
  const setNetworks = useNetworkStore((s) => s.setNetworks)
  const setActiveNetwork = useNetworkStore((s) => s.setActiveNetwork)
  const addNetwork = useNetworkStore((s) => s.addNetwork)
  const removeNetwork = useNetworkStore((s) => s.removeNetwork)

  return {
    networks,
    activeChainId,
    activeNetwork,
    rpcUrl,
    setNetworks,
    setActiveNetwork,
    addNetwork,
    removeNetwork,
  }
}
