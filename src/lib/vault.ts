// ============================================================
// Vault management: encrypt/decrypt, store/load from Chrome storage
// Used exclusively by the background script
// ============================================================

import { STORAGE_KEYS } from "./constants"
import { decrypt, encrypt } from "./crypto"
import type { EncryptedVault } from "../store/types"

/**
 * Create an encrypted vault from a secret (mnemonic or private key).
 */
export async function createVault(
  secret: string,
  password: string,
  vaultType: "hd" | "imported"
): Promise<EncryptedVault> {
  const encrypted = await encrypt(secret, password)

  return {
    cipherText: encrypted.cipherText,
    iv: encrypted.iv,
    salt: encrypted.salt,
    version: 1,
    vaultType,
  }
}

/**
 * Unlock a vault and return the decrypted secret.
 * Throws if the password is wrong.
 */
export async function unlockVault(
  vault: EncryptedVault,
  password: string
): Promise<string> {
  return decrypt(vault.cipherText, vault.iv, vault.salt, password)
}

/**
 * Store the vault in Chrome storage.
 */
export async function storeVault(vault: EncryptedVault): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.VAULT]: vault })
}

/**
 * Load the vault from Chrome storage.
 */
export async function loadVault(): Promise<EncryptedVault | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.VAULT)
  return result[STORAGE_KEYS.VAULT] || null
}

/**
 * Remove the vault from Chrome storage.
 */
export async function removeVault(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.VAULT)
}

/**
 * Check if a vault exists in storage.
 */
export async function hasVault(): Promise<boolean> {
  const vault = await loadVault()
  return vault !== null
}
