import { useAccountStore } from "../store/account-store"

export function useAccounts() {
  const accounts = useAccountStore((s) => s.accounts)
  const activeAccountIndex = useAccountStore((s) => s.activeAccountIndex)
  const activeAccount = accounts[activeAccountIndex] || null
  const setAccounts = useAccountStore((s) => s.setAccounts)
  const setActiveAccount = useAccountStore((s) => s.setActiveAccount)
  const addAccount = useAccountStore((s) => s.addAccount)
  const renameAccount = useAccountStore((s) => s.renameAccount)
  const updateBalance = useAccountStore((s) => s.updateBalance)

  return {
    accounts,
    activeAccount,
    activeAccountIndex,
    setAccounts,
    setActiveAccount,
    addAccount,
    renameAccount,
    updateBalance,
  }
}
