import { useTokenStore } from "../store/token-store"

export function useTokens() {
  const tokens = useTokenStore((s) => s.tokens)
  const setTokens = useTokenStore((s) => s.setTokens)
  const addToken = useTokenStore((s) => s.addToken)
  const removeToken = useTokenStore((s) => s.removeToken)
  const updateTokenBalance = useTokenStore((s) => s.updateTokenBalance)

  return {
    tokens,
    setTokens,
    addToken,
    removeToken,
    updateTokenBalance,
  }
}
