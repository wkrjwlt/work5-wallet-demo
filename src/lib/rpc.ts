// ============================================================
// Ethereum JSON-RPC client (fetch-based)
// ============================================================

interface JsonRpcRequest {
  jsonrpc: "2.0"
  id: number
  method: string
  params: any[]
}

interface JsonRpcResponse {
  jsonrpc: "2.0"
  id: number
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

/**
 * Send a JSON-RPC request to an Ethereum node.
 */
export async function rpcRequest(
  rpcUrl: string,
  method: string,
  params: any[] = []
): Promise<any> {
  const request: JsonRpcRequest = {
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params,
  }

  // 添加超时处理
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      throw new Error(`RPC request failed (${response.status}): ${text || response.statusText}`)
    }

    const json: JsonRpcResponse = await response.json()

    if (json.error) {
      throw new Error(`RPC error: ${json.error.message}`)
    }

    return json.result
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === "AbortError") {
      throw new Error("RPC request timeout")
    }
    throw error
  }
}

/**
 * Get the ETH balance for an address (returns hex string).
 */
export async function getBalance(
  rpcUrl: string,
  address: string
): Promise<string> {
  return rpcRequest(rpcUrl, "eth_getBalance", [address, "latest"])
}

/**
 * Get the current gas price (returns hex string).
 */
export async function getGasPrice(rpcUrl: string): Promise<string> {
  return rpcRequest(rpcUrl, "eth_gasPrice", [])
}

/**
 * Estimate gas for a transaction.
 */
export async function estimateGas(
  rpcUrl: string,
  from: string,
  to: string,
  value: string,
  data?: string
): Promise<string> {
  return rpcRequest(rpcUrl, "eth_estimateGas", [
    { from, to, value, data: data || "0x" },
  ])
}

/**
 * Get the nonce for an address.
 */
export async function getNonce(
  rpcUrl: string,
  address: string
): Promise<number> {
  const result = await rpcRequest(rpcUrl, "eth_getTransactionCount", [
    address,
    "pending",
  ])
  return parseInt(result, 16)
}

/**
 * Get the chain ID.
 */
export async function getChainId(rpcUrl: string): Promise<number> {
  const result = await rpcRequest(rpcUrl, "eth_chainId", [])
  return parseInt(result, 16)
}

/**
 * Send a raw (signed) transaction.
 */
export async function sendRawTransaction(
  rpcUrl: string,
  signedTx: string
): Promise<string> {
  return rpcRequest(rpcUrl, "eth_sendRawTransaction", [signedTx])
}

/**
 * Call a contract method (read-only).
 */
export async function ethCall(
  rpcUrl: string,
  to: string,
  data: string
): Promise<string> {
  return rpcRequest(rpcUrl, "eth_call", [
    { to, data },
    "latest",
  ])
}

/**
 * Get the latest block number.
 */
export async function getBlockNumber(rpcUrl: string): Promise<number> {
  const result = await rpcRequest(rpcUrl, "eth_blockNumber", [])
  return parseInt(result, 16)
}

/**
 * Get transaction receipt by hash.
 */
export async function getTransactionReceipt(
  rpcUrl: string,
  txHash: string
): Promise<{
  status: string
  blockNumber: string
  gasUsed: string
  cumulativeGasUsed: string
} | null> {
  try {
    const result = await rpcRequest(rpcUrl, "eth_getTransactionReceipt", [txHash])
    return result
  } catch {
    return null
  }
}

/**
 * Wait for transaction to be mined and return receipt.
 * Polls every 2 seconds, times out after 60 seconds.
 */
export async function waitForTransaction(
  rpcUrl: string,
  txHash: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<{
  success: boolean
  receipt?: {
    status: string
    blockNumber: string
    gasUsed: string
    cumulativeGasUsed: string
  }
  error?: string
}> {
  for (let i = 0; i < maxAttempts; i++) {
    const receipt = await getTransactionReceipt(rpcUrl, txHash)
    if (receipt) {
      return {
        success: receipt.status === "0x1",
        receipt,
      }
    }
    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  return { success: false, error: "等待交易超时" }
}

/**
 * ERC-20 balanceOf(address) selector: 0x70a08231
 */
export function encodeBalanceOf(ownerAddress: string): string {
  const selector = "0x70a08231"
  const paddedAddress = ownerAddress.toLowerCase().slice(2).padStart(64, "0")
  return selector + paddedAddress
}

/**
 * ERC-20 symbol() selector: 0x95d89b41
 */
export function encodeSymbol(): string {
  return "0x95d89b41"
}

/**
 * ERC-20 decimals() selector: 0x313ce567
 */
export function encodeDecimals(): string {
  return "0x313ce567"
}

/**
 * ERC-20 name() selector: 0x06fdde03
 */
export function encodeName(): string {
  return "0x06fdde03"
}

/**
 * Decode hex string to UTF-8 text
 */
export function hexToUtf8(hex: string): string {
  if (!hex || hex === "0x" || hex === "0x0") {
    return ""
  }

  // Remove 0x prefix
  let cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex

  // Remove padding zeros at the end
  cleanHex = cleanHex.replace(/0+$/, "")

  if (cleanHex.length === 0) {
    return ""
  }

  // For string returns, ABI encoding is: offset (32 bytes) + length (32 bytes) + data
  // Try to detect if it's ABI encoded (starts with 20 zero bytes followed by 20 for offset)
  if (
    cleanHex.length >= 128 &&
    cleanHex.startsWith("0000000000000000000000000000000000000000000000000000000000000020")
  ) {
    // Skip offset (32 bytes = 64 hex chars)
    cleanHex = cleanHex.slice(64)
    // Get length (next 32 bytes = 64 hex chars)
    const lengthHex = cleanHex.slice(0, 64)
    const length = parseInt(lengthHex, 16)

    if (!isNaN(length) && length > 0 && length <= 1000) {
      // Get actual data
      cleanHex = cleanHex.slice(64, 64 + length * 2)
    } else {
      // Invalid length, try to decode as raw bytes
      cleanHex = cleanHex.slice(0, 128) // Limit to 64 bytes
    }
  }

  // Convert hex to string
  let result = ""
  for (let i = 0; i < cleanHex.length; i += 2) {
    const charCode = parseInt(cleanHex.slice(i, i + 2), 16)
    // Only include printable ASCII characters
    if (charCode >= 32 && charCode <= 126) {
      result += String.fromCharCode(charCode)
    } else if (charCode > 126) {
      // Try UTF-8 multi-byte
      try {
        const bytes = new Uint8Array([charCode])
        result += new TextDecoder().decode(bytes)
      } catch {
        // Skip non-printable
      }
    }
  }
  return result.trim()
}

/**
 * Get ERC-20 token info (symbol, decimals)
 */
export async function getTokenInfo(
  rpcUrl: string,
  contractAddress: string
): Promise<{ symbol: string; decimals: number; name: string } | null> {
  try {
    let symbol = "UNKNOWN"
    let decimals = 18
    let name = "Unknown Token"

    // Query symbol - 容错处理
    try {
      const symbolData = encodeSymbol()
      const symbolResult = await ethCall(rpcUrl, contractAddress, symbolData)
      if (symbolResult && symbolResult !== "0x") {
        const decoded = hexToUtf8(symbolResult)
        if (decoded && decoded.length > 0 && decoded.length <= 20) {
          symbol = decoded
        }
      }
    } catch (e) {
      console.warn("Failed to query symbol:", e)
    }

    // Query decimals - 容错处理
    try {
      const decimalsData = encodeDecimals()
      const decimalsResult = await ethCall(rpcUrl, contractAddress, decimalsData)
      if (decimalsResult && decimalsResult !== "0x") {
        const parsed = parseInt(decimalsResult, 16)
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 18) {
          decimals = parsed
        }
      }
    } catch (e) {
      console.warn("Failed to query decimals:", e)
    }

    // Query name - 容错处理
    try {
      const nameData = encodeName()
      const nameResult = await ethCall(rpcUrl, contractAddress, nameData)
      if (nameResult && nameResult !== "0x") {
        const decoded = hexToUtf8(nameResult)
        if (decoded && decoded.length > 0 && decoded.length <= 100) {
          name = decoded
        }
      }
    } catch (e) {
      console.warn("Failed to query name:", e)
    }

    // 如果 symbol 还是 UNKNOWN，说明查询完全失败
    if (symbol === "UNKNOWN") {
      return null
    }

    return { symbol, decimals, name }
  } catch (error) {
    console.error("Failed to get token info:", error)
    return null
  }
}

/**
 * Get an ERC-20 token balance.
 */
export async function getTokenBalance(
  rpcUrl: string,
  contractAddress: string,
  ownerAddress: string,
  decimals: number
): Promise<string> {
  const data = encodeBalanceOf(ownerAddress)
  const result = await ethCall(rpcUrl, contractAddress, data)

  // Convert hex to decimal string with proper decimals
  const balance = BigInt(result)
  const divisor = BigInt(10 ** decimals)
  const wholePart = balance / divisor
  const fractionalPart = balance % divisor

  if (fractionalPart === 0n) {
    return wholePart.toString()
  }

  return `${wholePart}.${fractionalPart.toString().padStart(decimals, "0").replace(/0+$/, "")}`
}
