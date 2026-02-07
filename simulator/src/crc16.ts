const CRC16_TABLE = new Uint16Array(256);
for (let i = 0; i < 256; i++) {
  let crc = i;
  for (let j = 0; j < 8; j++) {
    crc = (crc & 1) ? (crc >>> 1) ^ 0xA001 : crc >>> 1;
  }
  CRC16_TABLE[i] = crc;
}

export function crc16(buffer: Buffer): number {
  let crc = 0;
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC16_TABLE[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
  }
  return crc & 0xFFFF;
}
