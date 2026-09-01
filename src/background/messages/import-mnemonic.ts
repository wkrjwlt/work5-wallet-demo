import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS } from "~lib/constants"
import { deriveAccountFromMnemonic, validateMnemonic } from "~lib/keyring"
import { createVault, storeVault } from "~lib/vault"
import type {
  ImportMnemonicRequest,
  ImportMnemonicResponse,
} from "~store/types"

// Import the setCachedSecret function to cache the mnemonic after import
import { setCachedSecret } from "./unlock-wallet"

const handler: PlasmoMessaging.MessageHandler<
  ImportMnemonicRequest,
  ImportMnemonicResponse
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

    // Create encrypted vault
    const vault = await createVault(mnemonic.trim(), password, "hd")
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
    const firstAccount = deriveAccountFromMnemonic(
      mnemonic.trim(),
      0,
      "账户 1"
    )
    await chrome.storage.local.set({
      [STORAGE_KEYS.ACCOUNTS]: [firstAccount],
      "wlt:active-account-index": 0,
    })

    // Cache the mnemonic in memory so user can access wallet immediately
    // without needing to enter password again
    setCachedSecret(mnemonic.trim())

    res.send({ success: true, walletId })
  } catch (error) {
    console.error("import-mnemonic error:", error)
    res.send({ success: false, error: (error as Error).message })
  }
}

export default handler
