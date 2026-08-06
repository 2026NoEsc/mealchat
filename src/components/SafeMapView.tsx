import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import MapView, { Marker, MapViewProps } from 'react-native-maps';
import { THEME } from '../lib/theme';

/**
 * 안드로이드에서 Google Maps API 키가 없으면 react-native-maps 가 MapView 를
 * 생성하는 순간 java.lang.IllegalStateException: API key not found 로 앱 전체가
 * 죽습니다. 지도 한 곳 때문에 앱이 종료되지 않도록, 키가 없을 때는 지도 대신
 * 안내 박스를 그립니다.
 *
 * 키 설정 방법은 app.config.js 상단 주석을 참고하세요.
 *
 * ⚠️ 이 플래그는 Metro 가 내려주는 JS 매니페스트에서 읽습니다. 즉 .env 만 채우고
 *    JS 를 리로드하면 이 값은 true 가 되지만, 설치된 APK 의 AndroidManifest 에는
 *    아직 키가 없어 다시 크래시합니다. .env 를 바꿨으면 반드시
 *    `npx expo prebuild --clean -p android` 후 재설치까지 해야 합니다.
 */
export const isGoogleMapsConfigured: boolean =
  Platform.OS !== 'android' ||
  Boolean(Constants.expoConfig?.extra?.googleMapsConfigured) ||
  Boolean((Constants.expoConfig as any)?.android?.config?.googleMaps?.apiKey);

export const SafeMapView: React.FC<MapViewProps & { children?: React.ReactNode }> = ({
  children,
  style,
  ...rest
}) => {
  if (!isGoogleMapsConfigured) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackTitle}>🗺️ 지도를 표시할 수 없습니다</Text>
        <Text style={styles.fallbackBody}>
          안드로이드 Google Maps API 키가 설정되지 않았습니다.{'\n'}
          위도·경도는 정상 저장되며, 키를 등록하면 지도가 표시됩니다.
        </Text>
      </View>
    );
  }

  return (
    <MapView style={style} {...rest}>
      {children}
    </MapView>
  );
};

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F3F5',
    borderWidth: 1,
    borderColor: '#DEE2E6',
    borderRadius: 12,
    padding: 16
  },
  fallbackTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 6
  },
  fallbackBody: {
    fontSize: 12,
    color: THEME.textMuted,
    textAlign: 'center',
    lineHeight: 18
  }
});

export { Marker };
export default SafeMapView;
