export const ROI_SIZE = 100;

export function calculateGray(r, g, b) {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

export function calculateGrayFromFrame(frame, roiSize) {
  if (!frame || !frame.data || !frame.width || !frame.height) {
    return 0;
  }

  const size = roiSize || ROI_SIZE;
  const width = frame.width;
  const height = frame.height;
  const actualSize = Math.min(size, width, height);
  const startX = Math.floor((width - actualSize) / 2);
  const startY = Math.floor((height - actualSize) / 2);
  const uint8 = frame.data instanceof Uint8Array || frame.data instanceof Uint8ClampedArray
    ? frame.data
    : new Uint8Array(frame.data);
  let total = 0;
  let count = 0;
  let y, x, idx;

  for (y = startY; y < startY + actualSize; y++) {
    for (x = startX; x < startX + actualSize; x++) {
      idx = (y * width + x) * 4;
      total += calculateGray(uint8[idx], uint8[idx + 1], uint8[idx + 2]);
      count++;
    }
  }

  return count > 0 ? Math.round(total / count) : 0;
}

export const FREQUENCIES = [
  130.81, 146.83, 164.81, 174.61, 196.00,
  220.00, 246.94, 261.63, 293.66, 329.63
];

export const NOTES = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4'];

export function grayToLevelIndex(gray) {
  const clamped = Math.max(0, Math.min(255, gray));
  let index = Math.floor((clamped / 256) * 10);
  if (index < 0) index = 0;
  if (index > 9) index = 9;
  return index;
}

export function grayToFrequency(gray) {
  return FREQUENCIES[grayToLevelIndex(gray)];
}

export function grayToNote(gray) {
  return NOTES[grayToLevelIndex(gray)];
}

export function extractROIGrayBuffer(frame, roiSize) {
  if (!frame || !frame.data || !frame.width || !frame.height) {
    return null;
  }

  const size = roiSize || ROI_SIZE;
  const width = frame.width;
  const height = frame.height;
  const actualSize = Math.min(size, width, height);
  const startX = Math.floor((width - actualSize) / 2);
  const startY = Math.floor((height - actualSize) / 2);
  const src = frame.data instanceof Uint8Array || frame.data instanceof Uint8ClampedArray
    ? frame.data
    : new Uint8Array(frame.data);
  const out = new Uint8ClampedArray(actualSize * actualSize * 4);
  let y, x, si, di, g;

  for (y = 0; y < actualSize; y++) {
    for (x = 0; x < actualSize; x++) {
      si = ((startY + y) * width + (startX + x)) * 4;
      di = (y * actualSize + x) * 4;
      g = calculateGray(src[si], src[si + 1], src[si + 2]);
      out[di] = g;
      out[di + 1] = g;
      out[di + 2] = g;
      out[di + 3] = 255;
    }
  }

  return { width: actualSize, height: actualSize, data: out };
}
