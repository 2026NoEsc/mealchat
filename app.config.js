// app.json 을 그대로 읽어들이면서, 비밀 값만 환경 변수·별도 파일로 주입합니다.
// 저장소에 키를 남기지 않기 위해서입니다.
//
// ⚠️ 아래 두 항목 모두 JS 리로드만으로는 반영되지 않습니다.
//    값을 바꾼 뒤에는 `npx expo prebuild --clean -p android` → 재빌드 → 재설치까지
//    해야 네이티브(AndroidManifest / google-services.json)에 들어갑니다.
//
// 1) GOOGLE_MAPS_ANDROID_API_KEY  (.env)
//    없으면 react-native-maps 가 MapView 를 만드는 순간
//    java.lang.IllegalStateException: API key not found 로 앱이 죽습니다.
//    (SafeMapView 가 그 경우 지도를 대체 화면으로 바꿔 크래시를 막습니다.)
//
// 2) google-services.json  (프로젝트 루트)
//    Firebase 콘솔 → 프로젝트 설정 → Android 앱(com.mealchat.app) → 다운로드.
//    없으면 FCM 이 초기화되지 않아 getExpoPushTokenAsync() 가 항상 실패하고,
//    push_tokens 가 비어 원격 알림이 한 건도 나가지 않습니다.
//    (로컬 알림은 이 파일 없이도 동작하므로 증상이 잘 드러나지 않습니다.)

const fs = require('fs');
const path = require('path');

const appJson = require('./app.json');

const googleMapsApiKey =
  process.env.GOOGLE_MAPS_ANDROID_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY ||
  '';

// 파일이 있을 때만 지정합니다. 없는 경로를 넣으면 prebuild 가 실패합니다.
// 루트를 먼저 보고, 없으면 docs/ 도 확인합니다.
const GOOGLE_SERVICES_CANDIDATES = [
  './google-services.json',
  './docs/google-services.json'
];
const googleServicesFile = GOOGLE_SERVICES_CANDIDATES.find((rel) =>
  fs.existsSync(path.join(__dirname, rel))
);

module.exports = () => {
  const expo = { ...appJson.expo };

  expo.android = {
    ...expo.android,
    ...(googleMapsApiKey
      ? { config: { ...expo.android?.config, googleMaps: { apiKey: googleMapsApiKey } } }
      : {}),
    ...(googleServicesFile ? { googleServicesFile } : {})
  };

  // 런타임에서 설정 여부를 알 수 있도록 extra 에도 표시해 둡니다.
  expo.extra = {
    ...expo.extra,
    googleMapsConfigured: Boolean(googleMapsApiKey),
    fcmConfigured: Boolean(googleServicesFile)
  };

  return expo;
};
