# Bob-yak (밥약)

공동 밥약 일정 조율, 메뉴 추천, N빵 정산을 위한 React Native 앱입니다.

## 🚀 주요 기능

- **일정 조율**: AI 기반 최적 약속 시간 추천
- **메뉴 추천**: 현위치/시간/식단 기반 AI 음식점 추천  
- **메뉴 투표**: 참가자들이 음식점 투표
- **N빵 정산**: 영수증 업로드 및 자동 정산
- **실시간 채팅**: Supabase Realtime을 이용한 채팅
- **초대 코드 & Deep Linking**: 방 참가 간편화

## 📱 기술 스택

- **Frontend**: React Native (Expo SDK 54)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Language**: TypeScript
- **Build**: EAS (Expo Application Services)

## 🛠️ 빠른 시작

### 1. 프로젝트 Clone
```bash
git clone <repository>
cd bobyak-app
```

### 2. 의존성 설치
```bash
npm install --legacy-peer-deps
```

### 3. 환경 변수 설정
```bash
cp .env.example .env
# .env 파일에서 Supabase 자격증 설정
```

### 4. 개발 서버 시작
```bash
npm start
```

### 5. Development Build 생성 (팀 테스트용)
```bash
# EAS 로그인 (첫 회 한번만)
eas login

# Android Development Build
npm run build:android:dev

# iOS Development Build  
npm run build:ios:dev
```

자세한 빌드 가이드는 [빌드 가이드](./docs/BUILD_INSTRUCTIONS.md)를 참고하세요.

## 📚 문서

### 시작하기
- **[빠른 시작](./docs/QUICK_START.md)** - 처음 받았을 때 3분 가이드
- **[명령어 참조](./docs/COMMANDS_REFERENCE.md)** - 자주 쓰는 명령어 모음

### 빌드 · 설정
- **[로컬 빌드 · USB 실행 가이드](./docs/BUILD_LOCAL_USB.md)** (권장) - USB-C로 실기기에 바로 빌드·설치
- **[EAS 설정 가이드](./docs/EAS_SETUP.md)** - 전체 EAS 설정 및 문제 해결 (클라우드 빌드 대안)
- **[빌드 가이드](./docs/BUILD_INSTRUCTIONS.md)** - EAS 단계별 빌드 및 설치 방법
- **[테스트 체크리스트](./docs/TESTING_CHECKLIST.md)** - 완전한 기능 테스트 가이드

### 화면 · 기능 명세
- **[docs/UI/](./docs/UI/README.md)** - 화면별 명세 18편, 코드와의 차이, 수정 내역
  - 현재 상태와 남은 문제를 먼저 보려면 **[15-수정-내역](./docs/UI/15-수정-내역.md)**

### 보관
- **[docs/archive/](./docs/archive/README.md)** - 지난 작업 기록.
  현재 코드 상태를 설명하지 않으므로, 읽기 전 해당 README의 정정 사항을 확인하세요.

## 🏗️ 프로젝트 구조

```
src/
├── App.tsx                    # 메인 앱 컴포넌트
├── components/
│   ├── AuthScreen.tsx         # 로그인/회원가입
│   ├── ScheduleGrid.tsx       # 일정 조율
│   ├── MenuRecommendation.tsx # 메뉴 추천
│   ├── BaeminSurvey.tsx      # 메뉴 투표
│   ├── DutchPay.tsx          # N빵 정산
│   └── ...
├── lib/
│   ├── supabaseClient.ts     # Supabase 설정
│   ├── types.ts              # TypeScript 타입 정의
│   ├── theme.ts              # 테마 설정
│   ├── aiRecommender.ts      # AI 추천 로직
│   └── storage.ts            # 로컬 스토리지
└── constants/
    └── foodData.ts           # 음식 데이터

eas.json                       # EAS Build 설정
app.json                       # Expo 앱 설정
.env.example                   # 환경 변수 템플릿
```

## 🔧 주요 명령어

```bash
# 개발
npm start                      # Expo 개발 서버
npm run ts:check              # TypeScript 타입 체크

# 빌드
npm run build:android:dev     # Android Development Build
npm run build:ios:dev         # iOS Development Build
npm run build:android:all     # Android 빌드 (대기)
npm run build:ios:all         # iOS 빌드 (대기)

# 제출
npm run submit                 # Play Store / App Store 제출
```

## 🔐 환경 변수

필수 환경 변수 (`.env` 파일):
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

GitHub Actions CI/CD를 위한 Secrets:
- `EXPO_TOKEN`: EAS personal access token
- `EXPO_PUBLIC_SUPABASE_URL`: Supabase URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Key

[EAS 설정 가이드](./docs/EAS_SETUP.md#github-actions-cicd)에서 자세히 확인하세요.

## 🚨 주요 설정 사항

### Deep Linking
- 초대 링크: `bobyak://join/[초대코드]`
- App.tsx에서 자동으로 처리

### Realtime 구독
- 채팅, 프로필 수정, 일정 변경 등이 실시간으로 동기화
- Supabase Realtime 사용

### Push Notifications
- Expo Push Notifications 사용
- 미완료 정산 알림 구현

### 권한 (Permissions)
- iOS: Calendar, Contacts, Photos, Location
- Android: Calendar, Location, Storage

## 📋 테스트 체크리스트

[완전한 테스트 체크리스트](./docs/TESTING_CHECKLIST.md)를 확인하세요:
- ✅ 회원가입/로그인
- ✅ 프로필 설정
- ✅ 방 생성 및 초대
- ✅ 실시간 채팅
- ✅ 일정 조율
- ✅ 메뉴 투표
- ✅ N빵 정산
- ✅ AI 기능
- ✅ Push Notification

## ⚙️ Expo Go vs Development Build

| 항목 | Expo Go | Development Build |
|------|---------|------------------|
| 설치 | QR 스캔 | APK/IPA 설치 |
| 환경 | 제한적 | 실제 앱 환경 |
| 성능 | 느림 | 빠름 |
| Native Module | 제한적 | 모든 모듈 사용 가능 |

현재 프로젝트는 **Development Build 기반**으로 설정되어 있습니다.

## 🐛 문제 해결

### "EXPO_PUBLIC_* 환경 변수 누락" 에러
```bash
# .env 파일 확인
cat .env

# 파일이 없으면 생성
cp .env.example .env
```

### 빌드 실패
```bash
# 의존성 재설치
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# EAS 재로그인
eas logout
eas login
```

더 자세한 문제 해결은 [EAS 설정 가이드](./docs/EAS_SETUP.md#잠재적-문제-해결)를 참고하세요.

## 🔄 CI/CD

GitHub Actions를 사용한 자동 빌드:
- `develop` 또는 `feat/*` 브랜치에 push → 자동 빌드
- Pull Request 생성 → 빌드 링크 자동 추가

[`.github/workflows/build.yml`](.github/workflows/build.yml) 참고

## 📞 지원

문제가 발생하면:
1. [테스트 체크리스트](./docs/TESTING_CHECKLIST.md)에서 문제 확인
2. [EAS 설정 가이드](./docs/EAS_SETUP.md#잠재적-문제-해결)에서 해결 방법 찾기
3. 위 문서에서 해결 안 되면 GitHub Issues 생성

## 📄 라이선스

MIT

## 🙏 기여

팀의 의견과 개선 제안을 환영합니다!

---

**마지막 업데이트**: 2026-07-05  
**버전**: 1.0.0  
**빌드 방식**: EAS Development Build
