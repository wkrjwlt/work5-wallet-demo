import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS, DEFAULT_NETWORKS, DEFAULT_CHAIN_ID } from "~lib/constants"
import { getCachedSecret, refreshSession } from "./unlock-wallet"
import { loadVault } from "~lib/vault"
import { derivePrivateKeyFromMnemonic, signTransaction } from "~lib/keyring"
import { sendRawTransaction, getNonce, getGasPrice, estimateGas } from "~lib/rpc"
import type { Account, Network } from "~store/types"

// 处理 DApp 发送交易请求
const handler: PlasmoMessaging.MessageHandler<
  { params: any },
  { txHash?: string; error?: string }
> = async (req, res) => {
  try {
    const { params } = req.body
    const txParams = params

    // 检查钱包是否解锁
    const secret = getCachedSecret()
    if (!secret) {
      res.send({ error: "钱包已锁定" })
      return
    }

    // 获取当前网络
    const networksResult = await chrome.storage.local.get([
      STORAGE_KEYS.NETWORKS,
      STORAGE_KEYS.ACTIVE_CHAIN_ID,
    ])
    const networks: Network[] = networksResult[STORAGE_KEYS.NETWORKS] || DEFAULT_NETWORKS
    const activeChainId = networksResult[STORAGE_KEYS.ACTIVE_CHAIN_ID] || DEFAULT_CHAIN_ID
    const activeNetwork = networks.find((n) => n.chainId === activeChainId)
    const rpcUrl = activeNetwork?.rpcUrl || DEFAULT_NETWORKS[0].rpcUrl

    // 获取账户
    const accountsResult = await chrome.storage.local.get(STORAGE_KEYS.ACCOUNTS)
    const accounts: Account[] = accountsResult[STORAGE_KEYS.ACCOUNTS] || []

    const fromAddress = txParams.from?.toLowerCase()
    const account = accounts.find(
      (a) => a.address.toLowerCase() === fromAddress
    )

    if (!account) {
      res.send({ error: "未找到账户" })
      return
    }

    // 验证收款地址
    const toAddress = txParams.to?.toLowerCase()
    if (!toAddress || !toAddress.startsWith("0x") || toAddress.length !== 42) {
      res.send({ error: "无效的收款地址" })
      return
    }

    // 验证是否是自己地址
    if (toAddress === fromAddress) {
      res.send({ error: "不能转账到自己的地址" })
      return
    }

    // 验证是否是零地址
    if (toAddress === "0x0000000000000000000000000000000000000000") {
      res.send({ error: "不能转账到零地址" })
      return
    }

    // 获取私钥
    const vault = await loadVault()
    let privateKey: string
    if (vault.vaultType === "hd") {
      privateKey = derivePrivateKeyFromMnemonic(secret, account.index)
    } else {
      privateKey = secret
    }

    // 获取 nonce 和 gas price
    const nonce = await getNonce(rpcUrl, account.address)
    const gasPrice = await getGasPrice(rpcUrl)

    // 获取 gas limit - 优先使用传入值，否则估算
    let gasLimit: string
    if (txParams.gas) {
      gasLimit = txParams.gas
    } else {
      try {
        const estimated = await estimateGas(
          rpcUrl,
          account.address,
          txParams.to,
          txParams.value || "0x0",
          txParams.data
        )
        // 增加 20% buffer
        const estimatedBigInt = BigInt(estimated)
        const withBuffer = (estimatedBigInt * 120n) / 100n
        gasLimit = "0x" + withBuffer.toString(16)
      } catch {
        // 估算失败，使用默认值
        gasLimit = txParams.data ? "0x186a0" : "0x5208" // 100000 for contract, 21000 for simple transfer
      }
    }

    // 构建交易
    const transaction = {
      to: txParams.to,
      value: txParams.value || "0x0",
      data: txParams.data || "0x",
      gasLimit,
      gasPrice,
      nonce,
      chainId: activeChainId,
    }

    // 签名交易
    const signedTx = await signTransaction(privateKey, transaction)

    // 广播交易
    const txHash = await sendRawTransaction(rpcUrl, signedTx)

    // 刷新会话
    refreshSession()

    res.send({ txHash })
  } catch (error) {
    console.error("dapp-send-transaction error:", error)
    res.send({ error: (error as Error).message })
  }
}

export default handler
