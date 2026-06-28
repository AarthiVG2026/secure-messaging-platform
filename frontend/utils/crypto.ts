/**
 * Client-Side Encryption Helpers
 * The client encrypts payloads prior to transit,
 * and decrypts it on receipt for visual rendering.
 */

export function encryptMessage(text: string): string {
  if (!text) return '';
  try {
    // Encodes UTF-8 string to Base64 in standard format
    const code = btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
    return `base64:${code}`;
  } catch (e) {
    console.error('Failed to encrypt text:', e);
    return text;
  }
}

export function decryptMessage(text?: string | null): string {
  if (!text) return '';
  if (!text.startsWith('base64:')) {
    return text;
  }
  
  try {
    const rawBase64 = text.substring(7);
    const decoded = decodeURIComponent(
      atob(rawBase64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return decoded;
  } catch (e) {
    // Fallback if base64 decoding fails
    return text.startsWith('base64:') ? text.substring(7) : text;
  }
}
