/**
 * Parser AVL Teltonika - Codec 8 / Codec 8 Extended
 * Wrapper seguro que nunca lanza excepciones.
 */

import { decodeAvlPacket, type AVLRecord, type AVLPacket } from './avl-decoder.js';

/**
 * Decodifica paquete AVL de forma segura.
 * Detecta automáticamente Codec 8 (0x08) y Codec 8 Extended (0x8E).
 * Valida CRC.
 * Retorna null ante cualquier error (nunca lanza).
 */
export function parseAvlPacket(buffer: Buffer): AVLPacket | null {
  try {
    return decodeAvlPacket(buffer);
  } catch {
    return null;
  }
}

export type { AVLRecord, AVLPacket };
