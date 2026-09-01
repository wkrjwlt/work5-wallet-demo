import type { PlasmoMessaging } from "@plasmohq/messaging"

import { STORAGE_KEYS } from "~lib/constants"
import { derivePrivateKeyFromMnemonic, signMessage } from "~lib/keyring"
import { loadVault } from "~lib/vault"
import { getCachedSecret, refreshSession } from "./unlock-wallet"
import type {
  SignMessageRequest,
  SignMessageResponse,
  Account,
} from "~store/types"

const handler: PlasmoMessaging.MessageHandler<
  SignMessageRequest,
  SignMessageResponse
> = async (req, res) => {
  try {
    const { address, message } = req.body
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
      // Find the account index for this address
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
      // Imported private key
      privateKey = secret
    }

    // Sign the message
    const signature = await signMessage(privateKey, message)

    // Refresh session timestamp
    refreshSession()

    res.send({ success: true, signature })
  } catch (error) {
    console.error("sign-message error:", error)
    res.send({ success: false, error: (error as Error).message })
  }
}

export default handler
