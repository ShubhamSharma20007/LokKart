// Asks ImageKit for a resized copy so cards don't download the full-size upload.
export function imageSrc(url: string, width: number): string {
  return `${url}${url.includes("?") ? "&" : "?"}tr=w-${width}`;
}