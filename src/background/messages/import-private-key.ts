import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS } from "~lib/constants"
import { deriveAccountFromPrivateKey } from "~lib/keyring"
import { createVault, storeVault } from "~lib/vault"
import type {
  ImportPrivateKeyRequest,
  ImportPrivateKeyResponse,
} from "~store/types"

const handler: PlasmoMessaging.MessageHandler<
  ImportPrivateKeyRequest,
  ImportPrivateKeyResponse
> = async (req, res) => {
  try {
    const { privateKey, password } = req.body

    // Validate private key
    let cleanKey = privateKey.trim()
    if (!cleanKey.startsWith("0x")) {
      cleanKey = "0x" + cleanKey
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(cleanKey)) {
      res.send({ success: false, error: "无效的私钥格式" })
      return
    }

    if (!password || password.length < 6) {
      res.send({
        success: false,
        error: "密码至少需要6个字符",
      })
      return
    }

    // Derive account from private key
    const account = deriveAccountFromPrivateKey(cleanKey, "导入的账户")

    // Create encrypted vault (storing the private key, not a mnemonic)
    const vault = await createVault(cleanKey, password, "imported")
    await storeVault(vault)

    // Generate wallet ID
    const walletId = crypto.randomUUID()

    // Store wallet metadata
    const walletMeta = {
      id: walletId,
      createdAt: Date.now(),
    }
    await chrome.storage.local.set({ [STORAGE_KEYS.WALLET_META]: walletMeta })

    // Store the imported account
    await chrome.storage.local.set({
      [STORAGE_KEYS.ACCOUNTS]: [account],
      "wlt:active-account-index": 0,
    })

    res.send({ success: true, walletId })
  } catch (error) {
    console.error("import-private-key error:", error)
    res.send({ success: false, error: (error as Error).message })
  }
}

export default handler
