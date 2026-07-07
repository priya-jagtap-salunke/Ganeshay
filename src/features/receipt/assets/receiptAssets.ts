/** Default assets and fallbacks for receipt PDF generation. */

export const BAPPAJI_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 64" width="240" height="64">
  <defs>
    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FF8C00"/>
      <stop offset="100%" style="stop-color:#B22234"/>
    </linearGradient>
  </defs>
  <text x="4" y="44" font-family="Georgia, serif" font-size="36" font-weight="700" fill="url(#logoGrad)">Bappaji</text>
  <text x="168" y="44" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#B22234">.com</text>
</svg>`;

export function svgToDataUri(svg: string): string {
  const encoded = encodeURIComponent(svg.replace(/\n\s*/g, ' ').trim())
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml,${encoded}`;
}

export const DEFAULT_ADDRESS =
  'Ulkanagari, Chhatrapati Sambhajinagar';

export const DEFAULT_PHONES = '9595219155 / 9665543009';
