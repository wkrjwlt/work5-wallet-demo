import { useDappStore } from "../store/dapp-store"

export function useDapp() {
  const connections = useDappStore((s) => s.connections)
  const addConnection = useDappStore((s) => s.addConnection)
  const removeConnection = useDappStore((s) => s.removeConnection)
  const updateConnection = useDappStore((s) => s.updateConnection)

  return {
    connections,
    addConnection,
    removeConnection,
    updateConnection,
  }
}
