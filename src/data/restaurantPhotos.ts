import { parse } from 'exifr';

export interface RestaurantPhoto { image: string; shotAt: { date: string; time: string } | null; metadataFailed: boolean }
async function readImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', .82);
}
async function readShotTime(file: File): Promise<Pick<RestaurantPhoto, 'shotAt' | 'metadataFailed'>> {
  try {
    const metadata = await parse(file, { pick: ['DateTimeOriginal'], reviveValues: false });
    const value: unknown = metadata?.DateTimeOriginal;
    const match = typeof value === 'string' ? /^(\d{4}):(\d{2}):(\d{2}) ([01]\d|2[0-3]):([0-5]\d):\d{2}$/.exec(value) : null;
    return { shotAt: match ? { date: `${match[1]}-${match[2]}-${match[3]}`, time: `${match[4]}:${match[5]}` } : null, metadataFailed: false };
  } catch { return { shotAt: null, metadataFailed: true }; }
}
export async function readRestaurantPhotos(files: File[], metadata: boolean) {
  const photos: RestaurantPhoto[] = [];
  let failures = 0;
  // 一次最多解码三张，避免手机同时展开大量原始像素。
  for (let start = 0; start < files.length; start += 3) {
    const batch = await Promise.allSettled(files.slice(start, start + 3).map(async file => ({
      image: await readImage(file), ...(metadata ? await readShotTime(file) : { shotAt: null, metadataFailed: false }),
    })));
    for (const result of batch) {
      if (result.status === 'fulfilled') photos.push(result.value);
      else failures++;
    }
  }
  return { photos, failures };
}
