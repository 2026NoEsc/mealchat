# Development Build 설치 및 실행 가이드

## 빠른 시작 (3분)

### Step 1: 프로젝트 Clone 및 설정
```bash
git clone <repository-url>
cd bobyak-app

# 환경 변수 설정
cp .env.example .env
# .env 파일에서 Supabase URL과 Anon Key 확인 및 수정 (필요시)

# 의존성 설치
npm install --legacy-peer-deps
```

### Step 2: EAS 로그인
```bash
eas login
# Expo 계정으로 로그인
```

### Step 3: Development Build 생성
```bash
# Android
npm run build:android:dev

# iOS
npm run build:ios:dev
```

## 상세 설치 가이드

### Android Development Build 설치

#### 방법 1: Expo Dashboard에서 QR 코드 스캔
1. 빌드 완료 후 Expo Dashboard (https://expo.dev) 접속
2. "Builds" 섹션에서 최신 빌드 선택
3. QR 코드 스캔
   - Android: Expo Go 앱에서 스캔 후 설치
   - 또는 Android 카메라 앱에서 직접 스캔

#### 방법 2: APK 직접 다운로드
1. Dashboard에서 빌드 선택
2. "APK 다운로드" 버튼 클릭
3. Android 기기에 APK 파일 전송
4. 기기에서 파일 실행하여 설치

#### 방법 3: CLI로 빌드 후 자동 설치
```bash
eas build --platform android --profile development --wait --auto-submit
```

### iOS Development Build 설치

#### 방법 1: TestFlight (권장)
iOS 기기에서:
1. TestFlight 앱 설치
2. 초대 링크 클릭
3. "수락" 후 앱 설치

#### 방법 2: IPA 파일 직접 설치
```bash
# Mac에서만 가능
eas build --platform ios --profile development --wait
# IPA 파일 다운로드 후 Xcode를 이용해 설치
```

#### 방법 3: 시뮬레이터에 설치
```bash
# Mac only
eas build --platform ios --profile development --simulator
```

## 첫 실행 후 확인사항

### 1. Supabase 연결 확인
- ✅ 로그인/회원가입 가능 여부 확인
- ✅ 프로필 데이터 저장 여부 확인

### 2. Deep Linking 테스트
```
bobyak://join/TEST123
```
- 초대 코드로 방 입장 가능 여부

### 3. 권한 요청 확인
- ✅ 카메라 권한
- ✅ 위치 권한
- ✅ 캘린더 권한
- ✅ 알림 권한

## 빌드 설정 커스터마이징

### eas.json 수정
```json
{
  "build": {
    "development": {
      "android": {
        "distribution": "internal",
        "withoutCredentials": true
      },
      "ios": {
        "distribution": "internal"
      }
    }
  }
}
```

### app.json 수정
```json
{
  "expo": {
    "name": "Bob-yak",
    "version": "1.0.0",
    "plugins": ["expo-dev-client"]
  }
}
```

## 문제 해결

### "Build failed" 에러
```bash
# 1. 의존성 확인
npm install --legacy-peer-deps

# 2. 캐시 삭제
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# 3. EAS 재로그인
eas logout
eas login
```

### 환경 변수 로드 실패
```
Error: Missing Supabase environment variables
```
- `.env` 파일이 프로젝트 루트에 있는지 확인
- `EXPO_PUBLIC_` prefix 확인

### APK 설치 실패
```
"Unknown sources" 오류
```
- 설정 → 보안 → 알 수 없는 출처 허용 활성화

### iOS 빌드 오류
```
"Certificate required"
```
- iOS 개발 인증서가 필요합니다.
- EAS에서 자동으로 관리합니다 (첫 빌드 시).

## 성능 최적화

### 빌드 시간 단축
```bash
# 병렬 빌드 (Android + iOS)
npm run build:android:dev & npm run build:ios:dev
```

### APK 크기 최소화
eas.json에서:
```json
{
  "android": {
    "buildType": "release"
  }
}
```

## CI/CD 자동 빌드

GitHub에 push하면 자동으로 빌드됩니다:
```bash
# develop 또는 feat/* 브랜치에 push
git push origin develop

# 또는 Pull Request 생성
# → GitHub Actions에서 자동 빌드
# → PR에 빌드 링크 댓글 추가
```

## 도움말

- EAS 상태 확인: `eas build:list`
- 빌드 로그 보기: `eas build:view <build-id>`
- 현재 설정 확인: `eas build --help`

## 다음 단계

1. ✅ Development Build 생성
2. ✅ 팀원들과 앱 설치
3. ✅ 기능 테스트 (아래 체크리스트)
4. → 준비되면 production build로 전환
