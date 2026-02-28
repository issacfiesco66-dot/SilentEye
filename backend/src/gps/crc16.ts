/**
 * CRC-16/IBM para validación de paquetes AVL Teltonika
 * Polinomio: 0x8005 (reversed)
 */
const CRC16_TABLE = new Uint16Array(256);

function initCrcTable() {
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (crc >>> 1) ^ 0xA001 : crc >>> 1;
    }
    CRC16_TABLE[i] = crc;
  }
}

initCrcTable();

export function crc16(buffer: Buffer): number {
  let crc = 0;
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC16_TABLE[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
  }
  return crc & 0xFFFF;
}

export function validateCrc(buffer: Buffer, from: number, to: number, receivedCrc: number): boolean {
  return crc16(buffer.subarray(from, to)) === receivedCrc;
}
