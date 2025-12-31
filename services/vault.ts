
/**
 * THE VAULT: AES-GCM Encryption Service
 * Ensures user data is only readable with their local Sanctuary Key.
 */

export const vault = {
  async generateKey(passphrase: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(passphrase),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("sanctuary_salt_2024"),
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  },

  async encrypt(data: string, key: CryptoKey): Promise<{ cipherText: string; iv: string }> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = encoder.encode(data);
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoded
    );
    return {
      cipherText: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv)),
    };
  },

  async decrypt(cipherText: string, iv: string, key: CryptoKey): Promise<string> {
    const decoder = new TextDecoder();
    const encryptedData = new Uint8Array(
      atob(cipherText)
        .split("")
        .map((c) => c.charCodeAt(0))
    );
    const ivData = new Uint8Array(
      atob(iv)
        .split("")
        .map((c) => c.charCodeAt(0))
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivData },
      key,
      encryptedData
    );
    return decoder.decode(decrypted);
  },
};
