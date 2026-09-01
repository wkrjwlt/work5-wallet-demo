import { useCallback } from "react"
import { sendToBackground } from "@plasmohq/messaging"

import type {
  CreateWalletRequest,
  CreateWalletResponse,
  ImportMnemonicRequest,
  ImportMnemonicResponse,
  ImportPrivateKeyRequest,
  ImportPrivateKeyResponse,
  UnlockRequest,
  UnlockResponse,
  SignMessageRequest,
  SignMessageResponse,
  SignTransactionRequest,
  SignTransactionResponse,
  SendTransactionRequest,
  SendTransactionResponse,
  DeriveAccountRequest,
  DeriveAccountResponse,
  GetBalanceRequest,
  GetBalanceResponse,
  NetworkRequestRequest,
  NetworkRequestResponse,
  RecoverWalletRequest,
  RecoverWalletResponse,
} from "../store/types"

export function useMessaging() {
  const createWallet = useCallback(async (password: string) => {
    return sendToBackground<CreateWalletRequest, CreateWalletResponse>({
      name: "create-wallet",
      body: { password },
    })
  }, [])

  const importMnemonic = useCallback(
    async (mnemonic: string, password: string) => {
      return sendToBackground<ImportMnemonicRequest, ImportMnemonicResponse>({
        name: "import-mnemonic",
        body: { mnemonic, password },
      })
    },
    []
  )

  const importPrivateKey = useCallback(
    async (privateKey: string, password: string) => {
      return sendToBackground<
        ImportPrivateKeyRequest,
        ImportPrivateKeyResponse
      >({
        name: "import-private-key",
        body: { privateKey, password },
      })
    },
    []
  )

  const unlockWallet = useCallback(async (password: string) => {
    return sendToBackground<UnlockRequest, UnlockResponse>({
      name: "unlock-wallet",
      body: { password },
    })
  }, [])

  const lockWallet = useCallback(async () => {
    return sendToBackground<{}, { success: boolean }>({
      name: "lock-wallet",
      body: {},
    })
  }, [])

  const deriveAccount = useCallback(async (index: number) => {
    return sendToBackground<DeriveAccountRequest, DeriveAccountResponse>({
      name: "derive-account",
      body: { index },
    })
  }, [])

  const signMessage = useCallback(
    async (address: string, message: string) => {
      return sendToBackground<SignMessageRequest, SignMessageResponse>({
        name: "sign-message",
        body: { address, message },
      })
    },
    []
  )

  const signTransaction = useCallback(
    async (tx: SignTransactionRequest) => {
      return sendToBackground<
        SignTransactionRequest,
        SignTransactionResponse
      >({
        name: "sign-transaction",
        body: tx,
      })
    },
    []
  )

  const sendTransaction = useCallback(async (signedTx: string) => {
    return sendToBackground<
      SendTransactionRequest,
      SendTransactionResponse
    >({
      name: "send-transaction",
      body: { signedTx },
    })
  }, [])

  const getBalance = useCallback(async (address: string) => {
    return sendToBackground<GetBalanceRequest, GetBalanceResponse>({
      name: "get-balance",
      body: { address },
    })
  }, [])

  const networkRequest = useCallback(
    async (method: string, params: any[]) => {
      return sendToBackground<
        NetworkRequestRequest,
        NetworkRequestResponse
      >({
        name: "network-request",
        body: { method, params },
      })
    },
    []
  )

  const recoverWallet = useCallback(
    async (mnemonic: string, password: string) => {
      return sendToBackground<RecoverWalletRequest, RecoverWalletResponse>({
        name: "recover-wallet",
        body: { mnemonic, password },
      })
    },
    []
  )

  const checkLock = useCallback(async () => {
    return sendToBackground<{}, { locked: boolean }>({
      name: "check-lock",
      body: {},
    })
  }, [])

  const getGasPrice = useCallback(async () => {
    return sendToBackground<
      {},
      { success: boolean; gasPrice?: string; error?: string }
    >({
      name: "get-gas-price",
      body: {},
    })
  }, [])

  const getTokenInfo = useCallback(async (contractAddress: string) => {
    return sendToBackground<
      { contractAddress: string },
      {
        success: boolean
        symbol?: string
        decimals?: number
        name?: string
        error?: string
      }
    >({
      name: "get-token-info",
      body: { contractAddress },
    })
  }, [])

  return {
    createWallet,
    importMnemonic,
    importPrivateKey,
    unlockWallet,
    lockWallet,
    checkLock,
    deriveAccount,
    signMessage,
    signTransaction,
    sendTransaction,
    getBalance,
    networkRequest,
    recoverWallet,
    getGasPrice,
    getTokenInfo,
  }
}
