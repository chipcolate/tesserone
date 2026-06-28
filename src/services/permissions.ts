import { Alert, Linking } from 'react-native';
import type { TFunction } from 'i18next';

/**
 * Alert shown when a permission is permanently blocked — i.e. the OS will no
 * longer present its native prompt (`canAskAgain === false`). Offers a shortcut
 * into the system Settings so the user can re-enable it.
 *
 * Only call this when the permission is actually blocked. While it can still be
 * requested, request it instead of nagging — the native dialog is the right UX.
 */
export function alertPermissionBlocked(t: TFunction, title: string, body: string): void {
  Alert.alert(title, body, [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('common.openSettings'), onPress: () => void Linking.openSettings() },
  ]);
}
