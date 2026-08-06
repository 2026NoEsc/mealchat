# 📋 명령어 빠른 참조

## 초기 설정

### 처음 한 번만
```bash
# 1. Clone
git clone <repository-url>
cd bobyak-app

# 2. 의존성 설치
npm install --legacy-peer-deps

# 3. EAS 로그인 (Expo 계정 필요)
eas login

# 4. 환경 변수 설정
cp .env.example .env
# .env 파일에서 Supabase 자격증 확인
```

---

## Development Build 생성

### Android Development Build
```bash
npm run build:android:dev
```

### iOS Development Build
```bash
npm run build:ios:dev
```

### 예비용 Build (preview)
```bash
npm run build:android:preview
npm run build:ios:preview
```

### 대기 없이 빌드 (완료될 때까지 기다림)
```bash
npm run build:android:all
npm run build:ios:all
```

---

## 개발 서버

### Expo 개발 서버 (로컬 테스트)
```bash
npm start              # 기본
npm run android        # Android 에뮬레이터 연결
npm run ios            # iOS 시뮬레이터 연결
npm run tunnel         # 터널 모드 (원격 테스트)
npm run web            # 웹 버전
```

---

## 빌드 관리

### EAS 빌드 상태 확인
```bash
# 최근 빌드 목록 보기
eas build:list

# 특정 빌드 상세 정보 보기
eas build:view <build-id>

# 특정 빌드의 로그 보기
eas build:view <build-id> --logs
```

---

## CI/CD 및 자동화

### GitHub에 푸시 (자동 빌드됨)
```bash
# develop 브랜치에 푸시
git push origin develop

# 또는 브랜치 생성 후 푸시 (feat/* 패턴)
git checkout -b feat/my-feature
git push origin feat/my-feature
```

---

## 프로덕션 배포

### Play Store 제출 (Android)
```bash
eas submit --platform android --latest
```

### App Store 제출 (iOS)
```bash
eas submit --platform ios --latest
```

### 양쪽 모두 제출
```bash
npm run submit
```

---

## 유틸리티

### TypeScript 타입 체크
```bash
npm run ts:check
```

### 개발 중 오류 해결

#### 패키지 재설치
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

#### EAS 재로그인
```bash
eas logout
eas login
```

#### 캐시 삭제
```bash
eas build:cache:clean
```

---

## 환경 변수

### .env 파일 확인
```bash
# 파일이 있는지 확인
cat .env

# 파일 생성 (없으면)
cp .env.example .env
```

### 필수 환경 변수
```bash
EXPO_PUBLIC_SUPABASE_URL=<your-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-key>
```

---

## Deep Linking 테스트

### 링크 형식
```
bobyak://join/[초대코드]
```

### 테스트 방법
1. 브라우저에서 직접 클릭
2. 또는 Expo 앱에서 URL 스킴으로 테스트

---

## 유용한 팁

### 빌드 병렬 실행
```bash
npm run build:android:dev & npm run build:ios:dev
```

### EAS 출력 모니터링
```bash
# 실시간 로그 보기
eas build:view <build-id> --logs --follow
```

### 프로젝트 초기화 (완전 리셋)
```bash
# 주의: 로컬 변경사항 삭제됨!
git clean -fd
rm -rf node_modules
npm install --legacy-peer-deps
```

---

## GitHub Secrets 설정 (CI/CD용)

### 필요한 Secrets
```
EXPO_TOKEN                    # EAS personal access token
EXPO_PUBLIC_SUPABASE_URL      # Supabase URL
EXPO_PUBLIC_SUPABASE_ANON_KEY # Supabase Anon Key
```

### Secrets 설정 위치
- GitHub Repository → Settings → Secrets and variables → Actions

---

## 일반적인 에러 해결

### "command not found: eas"
```bash
# EAS 전역 설치
npm install -g eas-cli

# 또는 npx 사용
npx eas --version
```

### "Build failed"
```bash
# 1. 패키지 확인
npm install --legacy-peer-deps

# 2. 로그인 확인
eas login

# 3. 캐시 삭제 후 재시도
eas build:cache:clean
```

### "EXPO_PUBLIC_* undefined"
```bash
# .env 파일 확인
cat .env

# 파일이 없으면 생성
cp .env.example .env
```

---

## 추가 도움말

### 더 자세한 가이드
- 📖 [QUICK_START.md](./QUICK_START.md) - 3분 시작 가이드
- 📖 [docs/BUILD_INSTRUCTIONS.md](./docs/BUILD_INSTRUCTIONS.md) - 빌드 가이드
- 📖 [docs/EAS_SETUP.md](./docs/EAS_SETUP.md) - 상세 설정

### 공식 문서
- 🔗 [EAS Build 공식 문서](https://docs.expo.dev/eas/)
- 🔗 [Expo 공식 문서](https://docs.expo.dev)

---

## 자주 사용하는 명령어 (북마크)

```bash
# 빌드 생성
npm run build:android:dev

# 빌드 상태 확인
eas build:list

# 개발 서버
npm start

# 타입 체크
npm run ts:check

# 재설치
npm install --legacy-peer-deps
```

---

**💡 팁**: 이 파일을 북마크해두세요!
