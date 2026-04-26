import { getScheme } from 'expo-share-intent';

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (path?.includes(`${getScheme()}://dataUrl=`)) {
    return '/';
  }
  return path;
}
