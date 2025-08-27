import screenshot from "screenshot-desktop";

async function tryCapture(): Promise<Buffer> {
  const img = await screenshot({ format: "png" });

  return Buffer.isBuffer(img) ? img : Buffer.from(img);
}

export async function captureScreen(): Promise<Buffer> {
  let lastError: unknown;

  for (let i = 0; i < 3; i += 1) {
    try {
      return await tryCapture();
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 200 * Math.pow(2, i)));
    }
  }
  throw lastError ?? new Error("Failed to capture screen");
}
