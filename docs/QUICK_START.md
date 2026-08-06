# 🚀 빠른 시작 가이드 (3분)

팀원들이 처음 시작할 때 따라야 할 3분 가이드입니다.

## 사전 요구사항
- Node.js 18+ 설치
- Expo 계정 (https://expo.dev)
- 테스트 기기 (Android 또는 iOS)

## Step 1: 프로젝트 설정 (1분)

```bash
# 프로젝트 Clone
git clone <repository>
cd bobyak-app

# 의존성 설치
npm install --legacy-peer-deps
```

## Step 2: EAS 로그인 (30초)

```bash
# EAS 로그인 (Expo 계정 필요)
eas login
```

## Step 3: 환경 변수 설정 (30초)

```bash
# 환경 변수 템플릿 복사
cp .env.example .env

# .env 파일 열기 (텍스트 에디터로)
# EXPO_PUBLIC_SUPABASE_URL과 EXPO_PUBLIC_SUPABASE_ANON_KEY가
# 이미 설정되어 있는지 확인하면 됩니다.
```

## Step 4: Development Build 생성 (1분)

### Android인 경우:
```bash
npm run build:android:dev
```

### iOS인 경우:
```bash
npm run build:ios:dev
```

**빌드는 EAS 클라우드에서 수행되므로 기다리기만 하면 됩니다** ☕

빌드 시간:
- Android: ~10분
- iOS: ~15분

## Step 5: 앱 설치

### 방법 1️⃣: Expo Dashboard (권장)
1. https://expo.dev 접속
2. "Builds" 메뉴 클릭
3. 최신 빌드 선택
4. QR 코드 스캔
5. 앱 설치

### 방법 2️⃣: APK/IPA 직접 다운로드
1. Expo Dashboard의 빌드 페이지에서 "Download" 클릭
2. 파일을 기기로 전송
3. 앱 설치

## Step 6: 앱 실행 및 테스트

1. 앱 실행
2. 이메일/비밀번호로 회원가입
3. 프로필 설정
4. 방 생성 및 초대 코드 생성
5. 다른 기기에서 초대 코드로 입장

## ✅ 모든 기능 테스트

[완전한 테스트 가이드](./docs/TESTING_CHECKLIST.md)를 참고하세요.

## 🆘 빠른 문제 해결

### ❌ "build command not found" 에러
```bash
npm install --legacy-peer-deps
eas login
```

### ❌ "EXPO_PUBLIC_SUPABASE_URL is undefined" 에러
```bash
cp .env.example .env
# .env 파일 확인
```

### ❌ 빌드가 실패했을 때
```bash
# 캐시 삭제 후 재시도
eas logout
eas login
npm run build:android:dev  # 또는 ios
```

## 📚 더 알아보기

- [자세한 빌드 가이드](./docs/BUILD_INSTRUCTIONS.md)
- [EAS 설정 정보](./docs/EAS_SETUP.md)
- [테스트 체크리스트](./docs/TESTING_CHECKLIST.md)
- [메인 README](./README.md)

## 💡 팁

- **빌드 가속화**: `npm run build:android:dev & npm run build:ios:dev` (병렬 빌드)
- **빌드 상태 확인**: Expo Dashboard → Builds 메뉴
- **로그 보기**: `eas build:view <build-id>`
- **Deep Linking 테스트**: `bobyak://join/TEST123` (브라우저에서)

## 📱 다음 단계

1. ✅ Development Build 설치 완료
2. → [TESTING_CHECKLIST.md](./docs/TESTING_CHECKLIST.md)로 이동해서 모든 기능 테스트
3. → GitHub의 develop 브랜치에서 작업
4. → CI/CD가 자동으로 빌드해줄 거에요!

---

**💬 문제가 발생하면?**
- [EAS_SETUP.md](./docs/EAS_SETUP.md)의 "문제 해결" 섹션 참고
- GitHub Issues 생성

**행운을 빕니다! 🎉**
