import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS, DEFAULT_NETWORKS, DEFAULT_CHAIN_ID } from "~lib/constants"
import { derivePrivateKeyFromMnemonic, signTransaction } from "~lib/keyring"
import { loadVault } from "~lib/vault"
import { getCachedSecret, refreshSession } from "./unlock-wallet"
import { getNonce, getGasPrice, estimateGas } from "~lib/rpc"
import type {
  SignTransactionRequest,
  SignTransactionResponse,
  Account,
  Network,
} from "~store/types"

const handler: PlasmoMessaging.MessageHandler<
  SignTransactionRequest,
  SignTransactionResponse
> = async (req, res) => {
  try {
    const { address, to, value, data, gasLimit, gasPrice, nonce, chainId } =
      req.body
    const secret = getCachedSecret()

    if (!secret) {
      res.send({ success: false, error: "钱包已锁定" })
      return
    }

    const vault = await loadVault()
    if (!vault) {
      res.send({ success: false, error: "未找到钱包" })
      return
    }

    let privateKey: string

    if (vault.vaultType === "hd") {
      const result = await chrome.storage.local.get(STORAGE_KEYS.ACCOUNTS)
      const accounts: Account[] = result[STORAGE_KEYS.ACCOUNTS] || []
      const account = accounts.find(
        (a) => a.address.toLowerCase() === address.toLowerCase()
      )

      if (!account) {
        res.send({ success: false, error: "未找到账户" })
        return
      }

      privateKey = derivePrivateKeyFromMnemonic(secret, account.index)
    } else {
      privateKey = secret
    }

    // 获取当前网络 RPC URL
    const networksResult = await chrome.storage.local.get([
      STORAGE_KEYS.NETWORKS,
      STORAGE_KEYS.ACTIVE_CHAIN_ID,
    ])
    const networks: Network[] = networksResult[STORAGE_KEYS.NETWORKS] || DEFAULT_NETWORKS
    const activeChainId = networksResult[STORAGE_KEYS.ACTIVE_CHAIN_ID] || DEFAULT_CHAIN_ID
    const activeNetwork = networks.find((n) => n.chainId === activeChainId)
    const rpcUrl = activeNetwork?.rpcUrl || DEFAULT_NETWORKS[0].rpcUrl

    // 获取 nonce 和 gasPrice
    const txNonce = nonce ?? await getNonce(rpcUrl, address)
    const txGasPrice = gasPrice ?? await getGasPrice(rpcUrl)

    // 获取 gas limit - 优先使用传入值，否则估算
    let txGasLimit: bigint
    if (gasLimit) {
      txGasLimit = BigInt(gasLimit)
    } else {
      try {
        // 尝试估算 gas
        const estimated = await estimateGas(rpcUrl, address, to, value, data)
        // 增加 20% buffer 防止 out of gas
        txGasLimit = (BigInt(estimated) * 120n) / 100n
      } catch {
        // 估算失败，使用默认值
        txGasLimit = data ? 100000n : 21000n
      }
    }

    // Build transaction object
    const tx: any = { to, value }
    if (data) tx.data = data
    tx.gasLimit = txGasLimit
    tx.gasPrice = BigInt(txGasPrice)
    tx.nonce = txNonce
    tx.chainId = chainId || activeChainId

    const signedTx = await signTransaction(privateKey, tx)

    refreshSession()

    res.send({ success: true, signedTx })
  } catch (error) {
    console.error("sign-transaction error:", error)
    res.send({ success: false, error: (error as Error).message })
  }
}

export default handler
