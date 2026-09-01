import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS } from "~lib/constants"
import {
  validateMnemonic,
  deriveAccountFromMnemonic,
} from "~lib/keyring"
import { createVault, storeVault, removeVault } from "~lib/vault"
import type {
  RecoverWalletRequest,
  RecoverWalletResponse,
} from "~store/types"

const handler: PlasmoMessaging.MessageHandler<
  RecoverWalletRequest,
  RecoverWalletResponse
> = async (req, res) => {
  try {
    const { mnemonic, password } = req.body

    if (!validateMnemonic(mnemonic)) {
      res.send({ success: false, error: "无效的助记词" })
      return
    }

    if (!password || password.length < 6) {
      res.send({ success: false, error: "密码至少需要6个字符" })
      return
    }

    // Remove old vault
    await removeVault()

    // Create new vault with the mnemonic
    const vault = await createVault(mnemonic, password, "hd")
    await storeVault(vault)

    // Generate wallet ID
    const walletId = crypto.randomUUID()

    // Store wallet metadata
    const walletMeta = {
      id: walletId,
      createdAt: Date.now(),
    }
    await chrome.storage.local.set({ [STORAGE_KEYS.WALLET_META]: walletMeta })

    // Derive the first account (index 0) and store it
    const firstAccount = deriveAccountFromMnemonic(mnemonic, 0, "账户 1")
    await chrome.storage.local.set({
      [STORAGE_KEYS.ACCOUNTS]: [firstAccount],
      "wlt:active-account-index": 0,
    })

    res.send({ success: true })
  } catch (error) {
    console.error("recover-wallet error:", error)
    res.send({ success: false, error: (error as Error).message })
  }
}

export default handler
