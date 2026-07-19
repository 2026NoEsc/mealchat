# EAS Development Build 설정 가이드

## 개요

이 프로젝트는 이제 **EAS (Expo Application Services)** Development Build를 사용하여 팀원들이 실제 앱 환경에서 테스트할 수 있도록 설정되었습니다.

## 필수 요구사항

### 1. Expo 계정 생성
```bash
npx expo register
```

### 2. EAS CLI 설치 및 인증
```bash
npm install -g eas-cli
eas login
```

### 3. 프로젝트 설정
이 리포지토리를 clone 받으면 이미 모든 설정이 완료되어 있습니다.

## 프로젝트 구조

```
bobyak-app/
├── eas.json                 # EAS Build 설정
├── app.json                 # Expo 앱 설정
├── .env                     # 환경 변수 (local만)
├── .env.example             # 환경 변수 템플릿
├── src/
│   ├── lib/supabaseClient.ts  # 환경변수 사용
│   └── ...
└── .github/
    └── workflows/
        └── build.yml        # CI/CD 자동 빌드
```

## 환경 변수 설정

### 로컬 개발 환경
1. `.env.example`을 복사하여 `.env` 파일 생성:
   ```bash
   cp .env.example .env
   ```

2. `.env` 파일에 Supabase 자격증 입력:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### GitHub Actions (CI/CD)
GitHub Repository Settings → Secrets and variables → Actions에서 다음 secret 추가:
- `EXPO_TOKEN`: EAS 계정의 personal access token
- `EXPO_PUBLIC_SUPABASE_URL`: Supabase URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Key

**EAS Token 생성:**
```bash
# Expo 대시보드에서 생성 또는
eas secret create --scope project --name EXPO_TOKEN
```

## 빌드 프로필

### development (개발용)
- 빠른 빌드 시간
- Development client 포함 (live reload, debugging)
- 모든 플랫폼에서 내부 배포만 가능

### preview (테스트용)
- 프로덕션에 가까운 환경
- 내부 배포

### production (출시용)
- Play Store / App Store 배포
- 최적화된 빌드

## Expo Go vs Development Build

| 항목 | Expo Go | Development Build |
|------|---------|------------------|
| 설치 | Expo Go 앱에서 QR 스캔 | 독립적인 앱 설치 |
| 환경 | 가상 환경 (제한적) | 실제 앱 환경 |
| Native Module | 제한적 (사전 설정된 것만) | 모든 Native Module 사용 가능 |
| 성능 | 느림 | 빠름 |
| 테스트 | 빠른 프로토타이핑 | 실제 배포와 유사 |

## app.json의 주요 설정

```json
{
  "expo": {
    "plugins": ["expo-dev-client", ...],
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD"
    },
    "ios": {
      "bundleIdentifier": "com.bobyak.app"
    },
    "android": {
      "package": "com.bobyak.app"
    }
  }
}
```

## 잠재적 문제 해결

### 1. 환경 변수 로드 실패
- `.env` 파일이 프로젝트 루트에 있는지 확인
- `EXPO_PUBLIC_` prefix가 붙어 있는지 확인 (필수)

### 2. Deep Linking 문제
```
bobyak://join/[code]
```
- App.tsx에서 링크 핸들링이 구현되어 있습니다.
- development build 설치 후 초대 링크 클릭 시 자동으로 방에 입장됩니다.

### 3. Notification 권한
- iOS: NSUserNotificationCenterDelegate 권한 필요
- Android: SCHEDULE_EXACT_ALARM 권한 필요

### 4. Camera/Photo 권한
- iOS: NSPhotoLibraryUsageDescription 필요
- Android: READ_EXTERNAL_STORAGE 필요

### 5. Calendar 권한
- iOS: NSCalendarsUsageDescription 필요
- Android: READ_CALENDAR, WRITE_CALENDAR 필요

## 빌드 프로세스

### 로컬 빌드
```bash
# Android
npm run build:android:dev

# iOS  
npm run build:ios:dev

# 모두 빌드 (대기)
npm run build:android:all
npm run build:ios:all
```

### CI/CD 자동 빌드
- `develop` 또는 `feat/*` 브랜치에 push하면 자동으로 빌드 시작
- Pull Request 생성 시 빌드 링크를 코멘트로 추가

## 다음 단계

1. **로컬 환경 설정**
   ```bash
   npm install
   eas login
   ```

2. **Environment 변수 설정**
   ```bash
   cp .env.example .env
   # .env 파일 수정
   ```

3. **첫 Development Build**
   ```bash
   npm run build:android:dev
   ```

4. **빌드 완료 후**
   - Expo Dashboard에서 QR 코드 스캔
   - 또는 직접 APK/IPA 다운로드

5. **팀 공유**
   - Expo Dashboard 프로젝트 링크 공유
   - 또는 빌드된 파일 직접 공유

## 참고 자료

- [EAS Documentation](https://docs.expo.dev/eas/)
- [Development Build Documentation](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build Best Practices](https://docs.expo.dev/deploy/build-best-practices/)
