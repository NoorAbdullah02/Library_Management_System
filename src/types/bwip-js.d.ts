declare module "bwip-js" {
  interface ToSVGOptions {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    includetext?: boolean;
    textxalign?: string;
    [key: string]: unknown;
  }
  export function toSVG(options: ToSVGOptions): string;
  const _default: { toSVG: (options: ToSVGOptions) => string };
  export default _default;
}
