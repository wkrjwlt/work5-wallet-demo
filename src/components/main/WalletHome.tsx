import { useEffect, useState } from "react"

import { useAccounts } from "~hooks/useAccounts"
import { useNetwork } from "~hooks/useNetwork"
import { useWallet } from "~hooks/useWallet"
import { useMessaging } from "~hooks/useMessaging"
import { useTokens } from "~hooks/useTokens"
import { AccountList } from "./AccountList"
import { SendEth } from "./SendEth"
import { NetworkSwitcher } from "./NetworkSwitcher"
import { TokenList } from "./TokenList"
import { Settings } from "./Settings"
import { AddNetwork } from "./AddNetwork"
import { formatAddress, formatBalance, formatEther } from "~lib/utils"
import type { Token } from "~store/types"

type View = "home" | "accounts" | "send" | "tokens" | "settings" | "add-network"

export function WalletHome() {
  const { activeAccount } = useAccounts()
  const { activeNetwork, activeChainId } = useNetwork()
  const { lockWallet, getBalance, networkRequest } = useMessaging()
  const { setWalletStatus } = useWallet()
  const { tokens, updateTokenBalance } = useTokens()

  const [view, setView] = useState<View>("home")
  const [balance, setBalance] = useState<string>("0")
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [copied, setCopied] = useState(false)
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({})

  const fetchBalance = async () => {
    if (!activeAccount) return
    setLoadingBalance(true)
    try {
      const response = await getBalance(activeAccount.address)
      if (response.success && response.balance) {
        setBalance(response.balance)
      }
    } catch (err) {
      console.error("Failed to fetch balance:", err)
    } finally {
      setLoadingBalance(false)
    }
  }

  // 获取代币余额
  const fetchTokenBalances = async () => {
    if (!activeAccount) return

    // 获取当前网络的代币
    const currentNetworkTokens = tokens.filter(
      (t) => t.chainId === activeChainId
    )

    if (currentNetworkTokens.length === 0) return

    const balances: Record<string, string> = {}

    for (const token of currentNetworkTokens) {
      try {
        // ERC-20 balanceOf(address) selector
        const data = "0x70a08231" + activeAccount.address.toLowerCase().slice(2).padStart(64, "0")

        const result = await networkRequest("eth_call", [
          { to: token.contractAddress, data },
          "latest",
        ])

        if (result.success && result.result) {
          const rawBalance = BigInt(result.result)
          const divisor = BigInt(10 ** token.decimals)
          const displayBalance = (Number(rawBalance) / Number(divisor)).toFixed(4).replace(/\.?0+$/, "")
          balances[token.contractAddress] = displayBalance || "0"

          // 更新 store 中的余额
          updateTokenBalance(token.contractAddress, activeChainId, displayBalance || "0")
        }
      } catch (err) {
        console.error(`Failed to fetch balance for ${token.symbol}:`, err)
        balances[token.contractAddress] = "0"
      }
    }

    setTokenBalances(balances)
  }

  useEffect(() => {
    fetchBalance()
    fetchTokenBalances()
  }, [activeAccount?.address, activeNetwork?.chainId, tokens.length])

  const handleCopyAddress = async () => {
    if (!activeAccount) return
    try {
      await navigator.clipboard.writeText(activeAccount.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const handleLock = async () => {
    await lockWallet()
    setWalletStatus("locked")
  }

  // Sub-views
  if (view === "accounts") {
    return <AccountList onBack={() => setView("home")} />
  }
  if (view === "send") {
    return <SendEth onBack={() => setView("home")} />
  }
  if (view === "tokens") {
    return <TokenList onBack={() => setView("home")} />
  }
  if (view === "settings") {
    return <Settings onBack={() => setView("home")} onLock={handleLock} />
  }
  if (view === "add-network") {
    return <AddNetwork onBack={() => setView("home")} />
  }

  // Main view
  const ethBalance = formatBalance(balance)
  const currentNetworkTokens = tokens.filter((t) => t.chainId === activeChainId)

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 16px",
        }}
      >
        <NetworkSwitcher onAddNetwork={() => setView("add-network")} />
        <button
          className="btn btn-small btn-secondary"
          onClick={handleLock}
        >
          🔒 锁定
        </button>
      </div>

      {/* Account info */}
      <div style={{ padding: "0 16px" }}>
        <div
          className="account-card"
          onClick={() => setView("accounts")}
          style={{ cursor: "pointer" }}
        >
          <div className="account-avatar">
            {activeAccount?.name?.charAt(0) || "A"}
          </div>
          <div className="account-info">
            <div className="account-name">{activeAccount?.name}</div>
            <div className="account-address">
              {activeAccount ? formatAddress(activeAccount.address) : ""}
            </div>
          </div>
          <button
            className="copy-btn"
            onClick={(e) => {
              e.stopPropagation()
              handleCopyAddress()
            }}
            style={{ marginLeft: "auto" }}
          >
            {copied ? "已复制" : "复制"}
          </button>
        </div>
      </div>

      {/* Balance */}
      <div className="balance-display">
        <span className="balance-amount">{ethBalance}</span>
        <span className="balance-symbol">{activeNetwork.currencySymbol}</span>
        <button
          className="btn btn-small btn-secondary"
          onClick={() => {
            fetchBalance()
            fetchTokenBalances()
          }}
          disabled={loadingBalance}
          style={{ marginLeft: 8, fontSize: 12 }}
        >
          {loadingBalance ? "刷新中..." : "🔄 刷新"}
        </button>
      </div>

      {/* Action buttons */}
      <div className="action-grid" style={{ padding: "0 16px" }}>
        <div className="action-btn" onClick={() => setView("send")}>
          <span className="action-btn-icon">📤</span>
          <span className="action-btn-label">发送</span>
        </div>
        <div className="action-btn" onClick={() => setView("tokens")}>
          <span className="action-btn-icon">🪙</span>
          <span className="action-btn-label">代币</span>
        </div>
        <div className="action-btn" onClick={() => setView("settings")}>
          <span className="action-btn-icon">⚙️</span>
          <span className="action-btn-label">设置</span>
        </div>
      </div>

      {/* Asset list */}
      <div className="card" style={{ flex: 1, overflow: "auto" }}>
        <div className="card-header">资产</div>

        {/* ETH */}
        <div className="token-item">
          <div className="token-icon" style={{ background: "#627eea" }}>
            ETH
          </div>
          <div className="token-info">
            <div className="token-symbol">{activeNetwork.currencySymbol}</div>
            <div className="token-name">{activeNetwork.name}</div>
          </div>
          <div className="token-balance" style={{ textAlign: "right" }}>
            <div className="token-balance-amount">{ethBalance}</div>
            <div style={{ fontSize: 10, color: "#888" }}>{activeNetwork.currencySymbol}</div>
          </div>
        </div>

        {/* Tokens */}
        {currentNetworkTokens.map((token) => (
          <div
            key={`${token.contractAddress}-${token.chainId}`}
            className="token-item"
          >
            <div className="token-icon">
              {token.symbol.slice(0, 3)}
            </div>
            <div className="token-info">
              <div className="token-symbol">{token.symbol}</div>
              <div className="token-name" style={{ fontSize: 10 }}>
                {token.contractAddress.slice(0, 6)}...{token.contractAddress.slice(-4)}
              </div>
            </div>
            <div className="token-balance" style={{ textAlign: "right" }}>
              <div className="token-balance-amount">
                {tokenBalances[token.contractAddress] || token.balance || "0"}
              </div>
              <div style={{ fontSize: 10, color: "#888" }}>{token.symbol}</div>
            </div>
          </div>
        ))}

        {currentNetworkTokens.length === 0 && (
          <div style={{ textAlign: "center", padding: "16px", color: "#888", fontSize: 12 }}>
            点击"🪙 代币"添加 ERC-20 代币
          </div>
        )}
      </div>
    </div>
  )
}
