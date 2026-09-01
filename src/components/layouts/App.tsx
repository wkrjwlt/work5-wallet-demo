import { useEffect, useState } from "react"

import { initializeStores } from "~store"
import { useWallet } from "~hooks/useWallet"
import { useMessaging } from "~hooks/useMessaging"
import { CreateWallet } from "~components/wallet/CreateWallet"
import { ShowMnemonic } from "~components/wallet/ShowMnemonic"
import { UnlockWallet } from "~components/wallet/UnlockWallet"
import { RecoverWallet } from "~components/wallet/RecoverWallet"
import { WalletHome } from "~components/main/WalletHome"

export function App() {
  const [initialized, setInitialized] = useState(false)
  const { walletStatus, mnemonic, setWalletStatus } = useWallet()
  const { checkLock } = useMessaging()

  useEffect(() => {
    initializeStores().then(() => setInitialized(true))
  }, [])

  // 当状态为 unlocked 时，验证 background 是否真的持有密钥
  useEffect(() => {
    if (walletStatus === "unlocked") {
      checkLock().then(({ locked }) => {
        if (locked) {
          setWalletStatus("locked")
        }
      })
    }
  }, [walletStatus])

  if (!initialized) {
    return (
      <div className="app-container">
        <div className="header">
          <span className="header-title">WLT-Wallet</span>
        </div>
        <div className="loading">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  // After wallet creation, show mnemonic for backup
  if (mnemonic) {
    return (
      <div className="app-container">
        <div className="header">
          <span className="header-title">WLT-Wallet</span>
        </div>
        <ShowMnemonic mnemonic={mnemonic} />
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="header">
        <span className="header-title">WLT-Wallet</span>
      </div>

      {walletStatus === "none" && <CreateWallet />}
      {walletStatus === "locked" && <UnlockWallet />}
      {walletStatus === "recovering" && <RecoverWallet />}
      {walletStatus === "unlocked" && <WalletHome />}
    </div>
  )
}
