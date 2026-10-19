/**
 * Dependency-free image inspection.
 *
 * Detects the real format from the file signature (magic bytes) rather than trusting the
 * filename or the client-declared MIME type, and decodes the header to read dimensions.
 * Files whose structure is truncated or malformed are rejected.
 *
 * Supported: JPEG, PNG, WebP (VP8, VP8L, VP8X).
 */

export class ImageValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ImageValidationError";
    this.statusCode = 400;
  }
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const inspectPng = (buf) => {
  // Signature (8) + IHDR length (4) + "IHDR" (4) + width (4) + height (4)
  if (buf.length < 33) throw new ImageValidationError("PNG file is truncated.");
  if (buf.toString("ascii", 12, 16) !== "IHDR") {
    throw new ImageValidationError("PNG file is malformed (missing IHDR header).");
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);

  // A complete PNG must terminate with the IEND chunk
  const tail = buf.subarray(Math.max(0, buf.length - 12));
  if (!tail.includes(Buffer.from("IEND", "ascii"))) {
    throw new ImageValidationError("PNG file is incomplete or corrupt (missing IEND chunk).");
  }
  return { mimeType: "image/png", extension: "png", width, height };
};

const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
]);

const inspectJpeg = (buf) => {
  let offset = 2;
  let dimensions = null;

  while (offset + 4 <= buf.length) {
    if (buf[offset] !== 0xff) {
      throw new ImageValidationError("JPEG file is malformed (invalid segment marker).");
    }
    const marker = buf[offset + 1];

    // Padding / standalone markers
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) break; // End of image / start of scan

    const segmentLength = buf.readUInt16BE(offset + 2);
    if (segmentLength < 2 || offset + 2 + segmentLength > buf.length) {
      throw new ImageValidationError("JPEG file is truncated or corrupt.");
    }

    if (SOF_MARKERS.has(marker)) {
      if (segmentLength < 7) throw new ImageValidationError("JPEG frame header is corrupt.");
      dimensions = {
        height: buf.readUInt16BE(offset + 5),
        width: buf.readUInt16BE(offset + 7)
      };
      break;
    }
    offset += 2 + segmentLength;
  }

  if (!dimensions) {
    throw new ImageValidationError("JPEG file is corrupt (no frame header found).");
  }

  // A complete JPEG ends with the EOI marker (allowing a little trailing padding)
  const tail = buf.subarray(Math.max(0, buf.length - 64));
  let hasEoi = false;
  for (let i = tail.length - 2; i >= 0; i--) {
    if (tail[i] === 0xff && tail[i + 1] === 0xd9) {
      hasEoi = true;
      break;
    }
  }
  if (!hasEoi) {
    throw new ImageValidationError("JPEG file is incomplete or corrupt (missing end-of-image marker).");
  }

  return { mimeType: "image/jpeg", extension: "jpg", ...dimensions };
};

const inspectWebp = (buf) => {
  if (buf.length < 30) throw new ImageValidationError("WebP file is truncated.");

  const riffSize = buf.readUInt32LE(4);
  if (riffSize + 8 > buf.length) {
    throw new ImageValidationError("WebP file is incomplete or corrupt.");
  }

  const chunk = buf.toString("ascii", 12, 16);
  let width;
  let height;

  if (chunk === "VP8 ") {
    // Lossy: start code 9D 01 2A at offset 23
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) {
      throw new ImageValidationError("WebP (lossy) bitstream is corrupt.");
    }
    width = buf.readUInt16LE(26) & 0x3fff;
    height = buf.readUInt16LE(28) & 0x3fff;
  } else if (chunk === "VP8L") {
    if (buf[20] !== 0x2f) throw new ImageValidationError("WebP (lossless) bitstream is corrupt.");
    const bits = buf.readUInt32LE(21);
    width = (bits & 0x3fff) + 1;
    height = ((bits >> 14) & 0x3fff) + 1;
  } else if (chunk === "VP8X") {
    width = 1 + buf.readUIntLE(24, 3);
    height = 1 + buf.readUIntLE(27, 3);
  } else {
    throw new ImageValidationError("WebP file uses an unrecognised encoding.");
  }

  return { mimeType: "image/webp", extension: "webp", width, height };
};

/**
 * Inspect an uploaded image buffer.
 * @param {Buffer} buffer
 * @param {{ maxDimension?: number }} [options]
 * @returns {{ mimeType: string, extension: string, width: number, height: number }}
 */
export const inspectImage = (buffer, { maxDimension = 12000 } = {}) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    throw new ImageValidationError("The uploaded file is empty or too small to be an image.");
  }

  let info;
  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    info = inspectPng(buffer);
  } else if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    info = inspectJpeg(buffer);
  } else if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    info = inspectWebp(buffer);
  } else {
    throw new ImageValidationError("Unsupported file type. Please upload a JPEG, PNG, or WebP image.");
  }

  if (!info.width || !info.height) {
    throw new ImageValidationError("Image dimensions could not be determined; the file may be corrupt.");
  }
  if (info.width > maxDimension || info.height > maxDimension) {
    throw new ImageValidationError(`Image dimensions exceed the ${maxDimension}px limit.`);
  }

  return info;
};

export default { inspectImage, ImageValidationError };
