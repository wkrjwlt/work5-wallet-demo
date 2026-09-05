import type { Network } from "./types"

export const BIP44_PATH_PREFIX = "m/44'/60'/0'/0"

export const STORAGE_KEYS = {
  VAULT: "wlt:vault",
  WALLET_META: "wlt:wallet-meta",
  ACCOUNTS: "wlt:accounts",
  NETWORKS: "wlt:networks",
  ACTIVE_CHAIN_ID: "wlt:active-chain-id",
  TOKENS: "wlt:tokens",
  DAPPS: "wlt:dapps",
} as const

export const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

// 从环境变量读取默认网络配置
const defaultChainId = Number(process.env.PLASMO_DEFAULT_CHAIN_ID) || 1
const defaultRpcUrl = process.env.PLASMO_DEFAULT_RPC_URL || "https://ethereum-rpc.publicnode.com"

export const DEFAULT_NETWORKS: Network[] = [
  {
    chainId: 11155111,
    name: "Sepolia Testnet",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    currencySymbol: "ETH",
    blockExplorerUrl: "https://sepolia.etherscan.io",
    isDefault: defaultChainId === 11155111,
  },
  {
    chainId: 1,
    name: "Ethereum Mainnet",
    rpcUrl: "https://ethereum-rpc.publicnode.com",
    currencySymbol: "ETH",
    blockExplorerUrl: "https://etherscan.io",
    isDefault: defaultChainId === 1,
  },
  {
    chainId: 137,
    name: "Polygon",
    rpcUrl: "https://polygon-rpc.com",
    currencySymbol: "MATIC",
    blockExplorerUrl: "https://polygonscan.com",
    isDefault: false,
  },
]

export const DEFAULT_CHAIN_ID = defaultChainId
export const DEFAULT_RPC_URL = defaultRpcUrl
