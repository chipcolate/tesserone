import { Camera } from 'expo-camera';
import { Alert, Linking } from 'react-native';

export async function requestCameraPermission(): Promise<boolean> {
  const { status, canAskAgain } = await Camera.requestCameraPermissionsAsync();
  if (status === 'granted') return true;

  if (!canAskAgain) {
    Alert.alert(
      'Camera Permission',
      'Camera access is needed to scan barcodes. You can enable it in Settings, or enter codes manually.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  }
  return false;
}
