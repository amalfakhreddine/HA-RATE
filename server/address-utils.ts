import { Address } from '@ton/core';

/**
 * Normalizes TON wallet address to user-friendly non-bounceable format (UQ...)
 * This ensures all addresses match the format shown in TON wallets like Tonkeeper.
 * 
 * Handles:
 * - Raw format: 0:abc123...
 * - User-friendly bounceable: EQC...
 * - User-friendly non-bounceable: UQC...
 * 
 * @param address - Any valid TON address format
 * @returns Normalized address in user-friendly non-bounceable format (UQ...)
 */
export function normalizeAddress(address: string): string {
  try {
    // Parse address using @ton/core (handles all formats)
    const addr = Address.parse(address);
    
    // Convert to user-friendly non-bounceable format (UQ... - same as Tonkeeper)
    return addr.toString({ 
      bounceable: false,
      urlSafe: true 
    });
  } catch (error) {
    console.error('[Address] Failed to normalize address:', address, error);
    // Return original if parsing fails
    return address;
  }
}

/**
 * Converts address to non-bounceable format (UQ...) for display purposes
 * This format is commonly shown in wallet apps like Tonkeeper
 * 
 * @param address - Any valid TON address format
 * @returns Address in user-friendly non-bounceable format (UQ...)
 */
export function toDisplayAddress(address: string): string {
  try {
    // Parse address using @ton/core (handles all formats)
    const addr = Address.parse(address);
    
    // Convert to user-friendly non-bounceable format (UQ...)
    return addr.toString({ 
      bounceable: false,
      urlSafe: true 
    });
  } catch (error) {
    console.error('[Address] Failed to convert to display format:', address, error);
    // Return original if parsing fails
    return address;
  }
}

/**
 * Checks if two addresses are the same wallet
 * @param addr1 - First address (any format)
 * @param addr2 - Second address (any format)
 * @returns true if addresses represent the same wallet
 */
export function addressesEqual(addr1: string, addr2: string): boolean {
  try {
    const normalized1 = normalizeAddress(addr1);
    const normalized2 = normalizeAddress(addr2);
    return normalized1 === normalized2;
  } catch {
    return addr1 === addr2;
  }
}
