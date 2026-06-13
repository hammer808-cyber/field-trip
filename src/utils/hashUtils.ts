/**
 * Hash utilities for Fieldtrip picture proof duplicate and near-duplicate detection.
 */

/**
 * Generate a SHA-256 hash of a string
 */
export async function hashString(str: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Calculates a standard Average Hash (aHash) from a base64 image.
 * Resizes the image to 8x8, converts it to grayscale, computes the average luminance,
 * and sets bits based on whether each pixel's luminance is above or below the average.
 */
export async function calculateAverageHash(base64Image: string): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Image) {
      resolve('');
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 8;
        canvas.height = 8;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }

        ctx.drawImage(img, 0, 0, 8, 8);
        const imgData = ctx.getImageData(0, 0, 8, 8);
        const data = imgData.data;
        
        // Convert to grayscale and get average luminance
        let sum = 0;
        const luminance: number[] = [];
        for (let i = 0; i < 64; i++) {
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          const b = data[i * 4 + 2];
          // Relative luminance formula
          const l = r * 0.299 + g * 0.587 + b * 0.114;
          luminance.push(l);
          sum += l;
        }
        const average = sum / 64;
        
        // Generate hash bits
        let hashBin = '';
        for (let i = 0; i < 64; i++) {
          hashBin += luminance[i] >= average ? '1' : '0';
        }
        
        // Convert binary string to 16-character hex string
        let hashHex = '';
        for (let i = 0; i < 64; i += 4) {
          const chunk = hashBin.substring(i, i + 4);
          hashHex += parseInt(chunk, 2).toString(16);
        }
        resolve(hashHex);
      } catch (err) {
        console.error('[hashUtils] Failed to calculate aHash:', err);
        resolve('');
      }
    };
    img.onerror = () => {
      console.warn('[hashUtils] Image load failed for aHash calculation');
      resolve('');
    };
    img.src = base64Image;
  });
}

/**
 * Calculates the Hamming distance between two hex hashes of equal length
 */
export function calculateHammingDistance(h1: string, h2: string): number {
  if (!h1 || !h2 || h1.length !== h2.length) return 99;
  
  // Convert hex to binary strings
  let bin1 = '';
  let bin2 = '';
  
  for (let i = 0; i < h1.length; i++) {
    bin1 += parseInt(h1[i], 16).toString(2).padStart(4, '0');
    bin2 += parseInt(h2[i], 16).toString(2).padStart(4, '0');
  }
  
  let distance = 0;
  for (let i = 0; i < bin1.length; i++) {
    if (bin1[i] !== bin2[i]) {
      distance++;
    }
  }
  return distance;
}
