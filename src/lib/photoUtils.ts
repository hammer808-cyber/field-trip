import EXIF from 'exif-js';
import { ImageMetadata, MetadataStatus } from '../types/proof';

function convertDMSToDD(dms: any, ref: string): number | null {
  if (!dms || !Array.isArray(dms) || dms.length < 3) return null;
  const parseVal = (val: any) => {
    if (typeof val === 'number') return val;
    if (val && typeof val === 'object' && val.numerator !== undefined && val.denominator !== undefined) {
      return val.numerator / val.denominator;
    }
    return parseFloat(val);
  };
  const degrees = parseVal(dms[0]);
  const minutes = parseVal(dms[1]);
  const seconds = parseVal(dms[2]);
  if (isNaN(degrees) || isNaN(minutes) || isNaN(seconds)) return null;
  let dd = degrees + minutes / 60 + seconds / 3600;
  if (ref === 'S' || ref === 'W') dd = -dd;
  return dd;
}

export async function extractImageMetadata(file: File): Promise<ImageMetadata> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const exifData = EXIF.readFromBinaryFile(arrayBuffer);
      
      const dateTimeOriginal = exifData?.DateTimeOriginal || exifData?.CreateDate || exifData?.ModifyDate;
      const createDate = exifData?.CreateDate;
      const modifyDate = exifData?.ModifyDate;
      
      let photoTakenAt: string | undefined;
      let status: MetadataStatus = 'missing';

      if (dateTimeOriginal) {
        // EXIF dates are usually in "YYYY:MM:DD HH:MM:SS" format
        const parts = dateTimeOriginal.split(/[: ]/);
        if (parts.length === 6) {
          const date = new Date(
            parseInt(parts[0]),
            parseInt(parts[1]) - 1,
            parseInt(parts[2]),
            parseInt(parts[3]),
            parseInt(parts[4]),
            parseInt(parts[5])
          );
          if (!isNaN(date.getTime())) {
            photoTakenAt = date.toISOString();
            status = 'verified';
          }
        }
      }

      const latitude = convertDMSToDD(exifData?.GPSLatitude, exifData?.GPSLatitudeRef);
      const longitude = convertDMSToDD(exifData?.GPSLongitude, exifData?.GPSLongitudeRef);

      const make = exifData?.Make ? String(exifData.Make).trim() : undefined;
      const model = exifData?.Model ? String(exifData.Model).trim() : undefined;
      const software = exifData?.Software ? String(exifData.Software).trim() : undefined;

      resolve({
        dateTimeOriginal,
        createDate,
        modifyDate,
        fileLastModified: file.lastModified,
        photoTakenAt,
        metadataStatus: status,
        latitude,
        longitude,
        make,
        model,
        software
      });
    };
    reader.onerror = () => {
      resolve({
        metadataStatus: 'missing',
        fileLastModified: file.lastModified
      });
    };
    reader.readAsArrayBuffer(file);
  });
}

export const FILTER_CSS: Record<string, string> = {
  original: "contrast(1.1) saturate(1.1)",
  disposable: "sepia(0.2) contrast(1.2) brightness(0.9) saturate(1.4) hue-rotate(-5deg)",
  sunburnt: "saturate(2) contrast(1.5) brightness(1.1) sepia(0.3) hue-rotate(10deg)",
  photobooth: "grayscale(1) contrast(1.8) brightness(1.1)",
  digital2003: "contrast(1.3) saturate(0.8) brightness(1.2) blur(0.2px)",
  evidence: "grayscale(0.4) contrast(1.5) brightness(0.8) sepia(0.1)",
  footage: "contrast(1.4) saturate(0.5) brightness(0.7) blur(1px) sepia(0.2)",
  blacktop: "saturate(1.5) contrast(1.3) brightness(0.9) hue-rotate(20deg) sepia(0.1)",
  polaroid: "contrast(0.9) brightness(1.1) saturate(1.2) sepia(0.4) opacity(0.9)",
  night: "brightness(0.6) contrast(1.2) saturate(0.5) hue-rotate(220deg)"
};

export async function applyFilterToImageUrl(imageUrl: string, filterId: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageUrl);
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      const filter = FILTER_CSS[filterId] || "none";
      ctx.filter = filter;
      ctx.drawImage(img, 0, 0);
      
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}
