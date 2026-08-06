# 로컬 빌드 · USB 실행 가이드 (권장)

`docs/BUILD_INSTRUCTIONS.md` · `docs/EAS_SETUP.md` · `docs/QUICK_START.md` 는
**EAS 클라우드 빌드** 기준으로 쓰여 있다. 하지만 실제로 개발·시연에 쓰인 방식은
**USB-C 로 연결한 실기기에 로컬로 빌드해 설치하는 것**이다 — 인터넷에 있는
EAS 빌드 큐를 기다릴 필요가 없고, 이 저장소에는 이미 `android/` 네이티브
프로젝트가 생성되어 있어 바로 된다.

새로 이 프로젝트를 넘겨받은 사람은 **이 문서를 먼저 따라가면 된다.**

---

## 사전 준비 (한 번만)

다음이 설치되어 있어야 한다:

| 항목 | 확인 명령 |
|---|---|
| Node.js | `node --version` |
| Java (JDK 17 이상) | `java -version` |
| Android SDK | `android/local.properties` 의 `sdk.dir` 경로가 실제로 존재하는지 |
| adb | `adb --version` |

Android Studio를 설치하면 SDK와 adb가 함께 깔린다. 이미 깔려 있다면
`android/local.properties` 파일 하나만 있으면 되고, 없으면 아래처럼 만든다:

```
sdk.dir=C\:\\Users\\<사용자명>\\AppData\\Local\\Android\\Sdk
```

`.env` 파일이 프로젝트 루트에 있어야 한다(`.env.example` 참고). 없으면 앱이
Supabase 연결 실패로 죽거나, 지도가 대체 화면으로 뜬다(`GOOGLE_MAPS_ANDROID_API_KEY`
누락 시 — `SafeMapView` 가 크래시는 막아 준다).

---

## 1. 폰 준비 (최초 1회)

1. 설정 → 휴대전화 정보 → **빌드 번호 7번 연타** → 개발자 옵션 활성화
2. 개발자 옵션 → **USB 디버깅** 켜기
3. USB-C 케이블로 PC와 연결
4. 폰에 "USB 디버깅을 허용하시겠습니까?" 팝업이 뜨면 **허용**
   (이 팝업을 놓치면 다음 단계에서 기기가 `unauthorized`로 보인다)

## 2. 연결 확인

```bash
adb devices
```

기기가 `device` 상태로 나와야 한다.

- `unauthorized` → 폰 화면의 허용 팝업을 놓친 것. 케이블을 뽑았다 다시 꽂는다.
- 아무것도 안 뜸 → USB 디버깅이 꺼져 있거나, 케이블이 충전 전용이다.

## 3. 빌드 & 설치

```bash
npm install --legacy-peer-deps   # node_modules 가 없거나 package.json 이 바뀐 경우만
npm run android                  # = expo run:android
```

- `android/` 폴더가 이미 있으므로 `expo prebuild` 를 따로 할 필요는 없다.
- 첫 빌드는 Gradle 이 네이티브 코드를 컴파일하므로 몇 분 걸린다. 끝나면 자동으로
  폰에 설치되고 Metro 번들러가 뜬다.

## 4. 이후 작업 (JS/TS만 고친 경우 — 대부분 이 경우)

네이티브를 다시 빌드할 필요 없이:

```bash
npm start
```

폰에 이미 깔린 개발용 앱(dev client)을 열면 USB로 연결된 Metro에 자동으로
붙는다.

## 5. 다시 `npm run android` 로 재빌드해야 하는 경우

- `app.json` / `app.config.js` 의 플러그인·권한을 바꿨을 때
- 새 네이티브 의존성(`expo install <package>`)을 추가했을 때
- **`GOOGLE_MAPS_ANDROID_API_KEY` 나 `google-services.json` 을 바꿨을 때** —
  `app.config.js` 상단 주석에 적혀 있듯, 이 둘은 JS 리로드로는 절대 반영되지
  않는다. 값을 바꾼 뒤에는
  ```bash
  npx expo prebuild --clean -p android
  npm run android
  ```
  까지 해야 `AndroidManifest.xml` / `google-services.json` 에 실제로 들어간다.

---

## 문제 해결

### Gradle 빌드 실패
```bash
cd android && ./gradlew clean && cd ..
npm run android
```

### `EXPO_PUBLIC_* is undefined` / Supabase 연결 실패
`.env` 파일이 프로젝트 루트에 있는지, `EXPO_PUBLIC_` 접두사가 붙어 있는지 확인.

### 지도 화면 진입 시 크래시
```
java.lang.IllegalStateException: API key not found
```
`.env` 의 `GOOGLE_MAPS_ANDROID_API_KEY` 확인 후 위 5번의 prebuild 절차를 거친다.

### 푸시 알림이 한 건도 안 옴
`google-services.json` 이 프로젝트 루트 또는 `docs/` 에 있는지 확인
(`app.config.js` 가 이 두 경로만 찾는다). 로컬 알림은 이 파일 없이도 동작하므로
증상이 잘 드러나지 않는다.

---

## EAS 클라우드 빌드는 언제 쓰나

이 프로젝트를 넘겨받을 사람(초보자)이나 시연용 PC에 USB 케이블/Android
Studio를 갖추기 어려운 경우에는 기존 `docs/BUILD_INSTRUCTIONS.md` 의 EAS
클라우드 빌드 경로가 대안이 된다. 다만 빌드 큐 대기 시간이 있고 Expo 계정
로그인이 필요하다. 평소 개발·디버깅에는 이 문서(로컬 USB)가 더 빠르다.
