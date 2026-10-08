import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'

// Guard akar masalah instalabilitas PWA: ikon harus PNG yang benar-benar
// dapat di-decode. PNG yang struktur pikselnya terpotong (panjang data
// tidak sama dengan h*(1+w*4)) lolos `file`/CRC tetapi DITOLAK Chrome
// sehingga DevTools melapor "No supplied icon is at least 144 pixels
// square ...". Test ini mem-validasi seluruh rantai: signature, CRC tiap
// chunk, dimensi IHDR sesuai deklarasi manifest, dan panjang hasil
// inflate + byte filter tiap scanline.

interface PngExpectation {
  file: string
  width: number
  height: number
}

const icons: PngExpectation[] = [
  { file: 'pwa-icon-192.png', width: 192, height: 192 },
  { file: 'pwa-icon-512.png', width: 512, height: 512 },
  { file: 'pwa-maskable-512.png', width: 512, height: 512 }
]

function crc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (const byte of buf) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function validatePng(path: string, width: number, height: number): void {
  const data = readFileSync(path)

  expect(data.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))

  let offset = 8
  const idat: Buffer[] = []
  let sawIhdr = false
  let sawIend = false

  while (offset < data.length) {
    const length = data.readUInt32BE(offset)
    const type = data.subarray(offset + 4, offset + 8)
    const chunk = data.subarray(offset + 8, offset + 8 + length)
    const expectedCrc = data.readUInt32BE(offset + 8 + length)

    expect(crc32(Buffer.concat([type, chunk]))).toBe(expectedCrc)

    if (type.toString('latin1') === 'IHDR') {
      sawIhdr = true
      expect(chunk.readUInt32BE(0)).toBe(width)
      expect(chunk.readUInt32BE(4)).toBe(height)
      expect(chunk[8]).toBe(8)
      expect(chunk[9]).toBe(6)
      expect(chunk[12]).toBe(0)
    }

    if (type.toString('latin1') === 'IDAT') idat.push(chunk)
    if (type.toString('latin1') === 'IEND') sawIend = true

    offset += 12 + length
  }

  expect(sawIhdr).toBe(true)
  expect(sawIend).toBe(true)

  const raw = inflateSync(Buffer.concat(idat))
  const bytesPerPixel = 4
  const stride = 1 + width * bytesPerPixel

  expect(raw.length).toBe(height * stride)

  for (let row = 0; row < height; row++) {
    expect(raw[row * stride]).toBeLessThanOrEqual(4)
  }
}

describe('aset ikon PWA publik PNG', () => {
  for (const icon of icons) {
    it(`${icon.file} valid & decode-able ${icon.width}x${icon.height}`, () => {
      validatePng(resolve(process.cwd(), 'public', icon.file), icon.width, icon.height)
    })
  }
})
