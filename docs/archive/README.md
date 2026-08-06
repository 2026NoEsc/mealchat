# 보관 문서 (archive)

여기 있는 문서는 **당시의 작업 기록**입니다. 지금 코드 상태를 설명하지 않습니다.
읽을 때는 아래 정정 사항을 먼저 보세요.

원래 저장소 루트에 흩어져 있던 것을 2026-08-03에 옮겼습니다.
내용은 손대지 않았습니다.

---

## 2026-07-context-migration/

Context API 마이그레이션과 그 성능 최적화 계획 문서 7개.

### ⚠️ "마이그레이션 완료"는 당시 사실이 아니었고, 지금은 다른 의미로 완료됐습니다

**작성 당시(2026-07)**: 문서들은 12개 Context로의 전환이 끝났다고 적었지만,
Provider만 만들어 마운트했을 뿐 **소비하는 코드가 한 곳도 없었습니다.**
`AppContent`는 여전히 자기 안에서 `useState` 56개로 모든 상태를 들고 있었습니다.
골격만 세우고 실제 이전은 하지 않은 상태였습니다.

**2026-08-03**: 실제 이전을 수행했습니다.

```
App.tsx useState   55개 → 0개
Context 파일        12개 → 11개
Context 상태        76개 → 55개 (App.tsx 와 1:1 대응)
```

자세한 내용은 **[`docs/UI/15-수정-내역.md`](../UI/15-수정-내역.md)의 라운드 M**에 있습니다.

**다만 이 문서들은 여전히 지금 코드와 다릅니다:**

- `LocationContext`와 `ScheduleContext`는 **삭제**됐습니다. 전자는 대응하는 상태가
  없었고, 후자는 `ScheduleGrid`의 로컬 폼 상태를 복제한 것이었습니다.
- `RoomTimerContext`가 **추가**됐습니다. 1초마다 바뀌는 카운트다운이
  `RoomContext`를 매초 무효화하는 문제 때문입니다.
- `AuthContext`의 `loadProfile()` / `logout()`은 **제거**됐습니다.
  `App.tsx`의 실제 구현과 달라서 그대로 쓰면 신규 사용자에게서 깨졌습니다.
- `OPTIMIZATION_*.md`, `PHASE1-OPTIMIZATION-COMPLETE.md`가 다루는 렌더링 성능
  문제는 **아직 해결되지 않았고, 이 문서들의 방법으로는 해결되지 않습니다.**
  `AppContent` 하나가 11개 Context를 전부 구독하는 한 리렌더 범위는 그대로입니다.
  실익은 컴포넌트를 화면 단위로 쪼갤 때(Stage 4) 생기며, 그건 아직 안 했습니다.
- `CONTEXT-MIGRATION-GUIDE.md`의 구현 템플릿은 Stage 4 때 참고 가치가 있습니다.

| 파일 | 성격 |
|---|---|
| `CONTEXT-MIGRATION-GUIDE.md` | 구현 템플릿. 향후 실제 이전 시 참고 가능 |
| `MIGRATION-PHASE1-COMPLETE.md` | Provider 작성 기록 |
| `MIGRATION-PHASE2-COMPLETE.md` | Provider 작성 기록 |
| `MIGRATION-COMPLETE.md` | Provider 작성 기록. "완료" 아님 |
| `OPTIMIZATION_PRIORITY_SUMMARY.md` | 미사용 트리 대상 계획 |
| `OPTIMIZATION_IMPLEMENTATION_GUIDE.md` | 미사용 트리 대상 계획 |
| `PHASE1-OPTIMIZATION-COMPLETE.md` | 미사용 트리 대상 작업 기록 |

---

## 2026-07-eas-setup/

2026-07-05 EAS Development Build 설정 완료 보고서 3개.

설정 자체는 지금도 유효하지만, 세 문서 모두 같은 시점의 **완료 보고**라
내용이 크게 겹칩니다. 실제로 참고할 문서는 아카이브 밖에 있습니다:

| 지금 볼 문서 | 위치 |
|---|---|
| 빌드 방법 | `docs/BUILD_INSTRUCTIONS.md` |
| EAS 설정·문제 해결 | `docs/EAS_SETUP.md` |
| 명령어 참조 | `docs/COMMANDS_REFERENCE.md` |
| 처음 시작 | `docs/QUICK_START.md` |

또한 이 문서들이 쓰인 뒤 빌드 방식이 하나 늘었습니다. 현재는
`npx expo prebuild` + `gradlew assembleDebug`로 로컬 빌드도 하고 있으며,
이때 `.env`의 `GOOGLE_MAPS_ANDROID_API_KEY`가 `AndroidManifest`에 주입됩니다.
자세한 내용은 `app.config.js` 상단 주석과 `docs/UI/15-수정-내역.md` K-1 참고.
