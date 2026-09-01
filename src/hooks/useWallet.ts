import { useWalletStore } from "../store/wallet-store"

export function useWallet() {
  const walletStatus = useWalletStore((s) => s.walletStatus)
  const walletMeta = useWalletStore((s) => s.walletMeta)
  const mnemonic = useWalletStore((s) => s.mnemonic)
  const setWalletStatus = useWalletStore((s) => s.setWalletStatus)
  const setWalletMeta = useWalletStore((s) => s.setWalletMeta)
  const setMnemonic = useWalletStore((s) => s.setMnemonic)

  return {
    walletStatus,
    walletMeta,
    mnemonic,
    setWalletStatus,
    setWalletMeta,
    setMnemonic,
  }
}
