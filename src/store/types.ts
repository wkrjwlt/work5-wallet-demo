// ============================================================
// Vault / Wallet State
// ============================================================

export interface EncryptedVault {
  cipherText: string // Base64-encoded AES-GCM ciphertext
  iv: string // Base64-encoded initialization vector
  salt: string // Base64-encoded PBKDF2 salt
  version: 1
  vaultType: "hd" | "imported" // HD mnemonic vs raw private key
}

export interface WalletMeta {
  id: string
  createdAt: number
}

// ============================================================
// Account
// ============================================================

export interface Account {
  index: number // BIP44 index (0, 1, 2, ...) or -1 for imported
  address: string // 0x... checksummed
  path: string // e.g., "m/44'/60'/0'/0/0" or "imported"
  name: string // User-given label
  balances: {
    eth: string // Wei string
    tokens: Record<string, string> // contract address -> balance string
  }
}

// ============================================================
// Network
// ============================================================

export interface Network {
  chainId: number
  name: string
  rpcUrl: string
  currencySymbol: string
  blockExplorerUrl: string
  isDefault: boolean
}

// ============================================================
// Token
// ============================================================

export interface Token {
  contractAddress: string
  symbol: string
  name: string
  decimals: number
  chainId: number
  logoUrl?: string
  balance?: string
}

// ============================================================
// DApp
// ============================================================

export interface DAppConnection {
  origin: string
  favicon?: string
  connectedAccounts: string[]
  connectedChainId: number
}

// ============================================================
// Message Types (popup -> background)
// ============================================================

export interface CreateWalletRequest {
  password: string
}

export interface CreateWalletResponse {
  success: boolean
  walletId?: string
  mnemonic?: string // Only returned once for backup
  error?: string
}

export interface ImportMnemonicRequest {
  mnemonic: string
  password: string
}

export interface ImportMnemonicResponse {
  success: boolean
  walletId?: string
  error?: string
}

export interface ImportPrivateKeyRequest {
  privateKey: string
  password: string
}

export interface ImportPrivateKeyResponse {
  success: boolean
  walletId?: string
  error?: string
}

export interface UnlockRequest {
  password: string
}

export interface UnlockResponse {
  success: boolean
  error?: string
}

export interface LockResponse {
  success: boolean
}

export interface DeriveAccountRequest {
  index: number
}

export interface DeriveAccountResponse {
  success: boolean
  account?: Account
  error?: string
}

export interface SignMessageRequest {
  address: string
  message: string
}

export interface SignMessageResponse {
  success: boolean
  signature?: string
  error?: string
}

export interface SignTransactionRequest {
  address: string
  to: string
  value: string // hex string
  data?: string
  gasLimit?: string
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  nonce?: number
  chainId?: number
}

export interface SignTransactionResponse {
  success: boolean
  signedTx?: string
  error?: string
}

export interface SendTransactionRequest {
  signedTx: string
}

export interface SendTransactionResponse {
  success: boolean
  txHash?: string
  error?: string
}

export interface GetBalanceRequest {
  address: string
  chainId?: number
}

export interface GetBalanceResponse {
  success: boolean
  balance?: string // hex string
  error?: string
}

export interface GetTokenBalanceRequest {
  contractAddress: string
  ownerAddress: string
}

export interface GetTokenBalanceResponse {
  success: boolean
  balance?: string
  error?: string
}

export interface NetworkRequestRequest {
  method: string
  params: any[]
  chainId?: number
}

export interface NetworkRequestResponse {
  success: boolean
  result?: any
  error?: string
}

export interface RecoverWalletRequest {
  mnemonic: string
  password: string
}

export interface RecoverWalletResponse {
  success: boolean
  error?: string
}
