// Type declaration for screenshot-desktop module
declare module "screenshot-desktop" {
  interface ScreenshotOptions {
    format?: "png" | "jpg";
    screen?: number;
    quality?: number;
  }

  function screenshot(options?: ScreenshotOptions): Promise<Buffer>;

  export default screenshot;
}
