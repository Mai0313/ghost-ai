import screenshot from 'screenshot-desktop';

export async function captureScreen(): Promise<Buffer> {
  const img = await screenshot({ format: 'png' });
  return Buffer.isBuffer(img) ? img : Buffer.from(img);
}
