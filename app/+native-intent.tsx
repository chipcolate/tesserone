import { getScheme } from 'expo-share-intent';

// Monotonic per-session counter so every widget tap yields a unique URL — even
// for the same card — which makes the home screen re-trigger the expand each
// time (a plain repeated param wouldn't change and would be ignored).
let openSeq = 0;

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (path?.includes(`${getScheme()}://dataUrl=`)) {
    return '/';
  }
  // Widget tap (`tesserone://open/<cardId>`): route to the home screen with an
  // `open` param (+ nonce) so it can expand that card to its barcode.
  const openMatch = path?.match(/(?:^|\/\/)open\/([^/?#]+)/);
  if (openMatch) {
    openSeq += 1;
    return `/?open=${openMatch[1]}&n=${openSeq}`;
  }
  return path;
}
