import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS } from "~lib/constants"
import {
  generateMnemonic,
  deriveAccountFromMnemonic,
} from "~lib/keyring"
import { createVault, storeVault } from "~lib/vault"
import type {
  CreateWalletRequest,
  CreateWalletResponse,
} from "~store/types"

// Import the setCachedSecret function to cache the mnemonic after creation
import { setCachedSecret } from "./unlock-wallet"

const handler: PlasmoMessaging.MessageHandler<
  CreateWalletRequest,
  CreateWalletResponse
> = async (req, res) => {
  try {
    const { password } = req.body

    if (!password || password.length < 6) {
      res.send({ success: false, error: "密码至少需要6个字符" })
      return
    }

    // Generate mnemonic
    const mnemonic = generateMnemonic()

    // Create encrypted vault
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

    // Cache the mnemonic in memory so user can access wallet immediately
    // without needing to enter password again
    setCachedSecret(mnemonic)

    // Return the mnemonic ONLY for backup - it won't be returned again
    res.send({ success: true, walletId, mnemonic })
  } catch (error) {
    console.error("create-wallet error:", error)
    res.send({ success: false, error: (error as Error).message })
  }
}

export default handler
