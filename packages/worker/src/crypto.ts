const ALGO = "AES-GCM"
const IV_LENGTH = 12

async function getKey(secret: string): Promise<CryptoKey> {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret))
    return crypto.subtle.importKey("raw", hash, { name: ALGO }, false, ["encrypt", "decrypt"])
}

export async function encrypt(secret: string, plaintext: string): Promise<string> {
    const key = await getKey(secret)
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
    const encoded = new TextEncoder().encode(plaintext)
    const cipher = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoded)
    const combined = new Uint8Array(iv.length + cipher.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(cipher), iv.length)
    return btoa(String.fromCharCode(...combined))
}

export async function hashLicenseKey(key: string): Promise<string> {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key))
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("")
}

export async function decrypt(secret: string, ciphertext: string): Promise<string> {
    const key = await getKey(secret)
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
    const iv = combined.slice(0, IV_LENGTH)
    const data = combined.slice(IV_LENGTH)
    const plain = await crypto.subtle.decrypt({ name: ALGO, iv }, key, data)
    return new TextDecoder().decode(plain)
}
