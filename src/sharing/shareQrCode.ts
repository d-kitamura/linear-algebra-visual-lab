import { toDataURL } from 'qrcode';

const QR_CODE_IMAGE_SIZE = 768;

export async function createShareQrCodeDataUrl(shareUrl: string): Promise<string> {
  if (shareUrl.trim().length === 0) {
    throw new TypeError('QRコードに変換する共有URLがありません。');
  }

  try {
    return await toDataURL(shareUrl, {
      type: 'image/png',
      width: QR_CODE_IMAGE_SIZE,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#102631ff',
        light: '#ffffffff',
      },
    });
  } catch (error) {
    throw new Error(
      '共有URLからQRコードを生成できませんでした。URLが長すぎる可能性があります。',
      { cause: error },
    );
  }
}

export function createShareQrCodeFileName(now = new Date()): string {
  const timestamp = [
    now.getFullYear(),
    padTwoDigits(now.getMonth() + 1),
    padTwoDigits(now.getDate()),
    '-',
    padTwoDigits(now.getHours()),
    padTwoDigits(now.getMinutes()),
  ].join('');

  return `linear-algebra-visual-lab-qr-${timestamp}.png`;
}

function padTwoDigits(value: number): string {
  return String(value).padStart(2, '0');
}
