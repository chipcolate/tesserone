import { requireOptionalNativeModule } from 'expo';

interface NativeWidgetBridge {
  writeSnapshot(appGroup: string, json: string): Promise<boolean>;
  copyLogo(appGroup: string, key: string, srcUri: string): Promise<boolean>;
  pruneLogos(appGroup: string, keepKeys: string[]): Promise<void>;
  reloadWidgets(): void;
}

// iOS-only native module. Returns null on Android (and in environments where the
// module isn't linked yet), so every wrapper below degrades to a no-op.
const Native = requireOptionalNativeModule('WidgetBridge') as NativeWidgetBridge | null;

export const isWidgetBridgeAvailable = Native != null;

/** Write the widget snapshot JSON into `<appGroup>/widgets/snapshot.json`. */
export async function writeWidgetSnapshot(appGroup: string, json: string): Promise<boolean> {
  if (!Native) return false;
  return Native.writeSnapshot(appGroup, json);
}

/**
 * Copy a logo image into `<appGroup>/widgets/logos/<key>.png` (`:` in the key is
 * sanitized to `_`). `srcUri` is an on-disk `file://` URI from the logos service.
 */
export async function copyWidgetLogo(
  appGroup: string,
  key: string,
  srcUri: string
): Promise<boolean> {
  if (!Native) return false;
  return Native.copyLogo(appGroup, key, srcUri);
}

/** Delete any logo files in the App Group whose key isn't in `keepKeys`. */
export async function pruneWidgetLogos(appGroup: string, keepKeys: string[]): Promise<void> {
  if (!Native) return;
  return Native.pruneLogos(appGroup, keepKeys);
}

/** Ask WidgetKit to reload all widget timelines. */
export function reloadWidgets(): void {
  Native?.reloadWidgets();
}
