// ESLint 설정 (Expo / React Native)
//
// 이 파일은 한 번 삭제됐다가 다시 만든 것입니다. 예전 설정은 Vite/웹용이라
// (reactRefresh.configs.vite, globals.browser) React Native 전환 후 맞지 않았습니다.
// eslint-config-expo 가 RN 환경(전역 객체, react-hooks, import 해석)을 맞춰 줍니다.
//
// 규칙 강도에 대해
//   기존 코드에 console.* 226곳, any 52곳이 있습니다. 이걸 전부 error 로 잡으면
//   린트가 처음부터 빨간불이라 아무도 안 보게 됩니다. **새로 쓰는 코드가
//   나빠지지 않게 막는 것**을 목표로, 당장 고칠 수 있는 것만 error 로 두고
//   기존 부채는 warn 으로 표시만 합니다.

const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: [
      'node_modules/**',
      'android/**',
      'ios/**',
      '.expo/**',
      'dist/**',
      'supabase/functions/**', // Deno 런타임이라 규칙 체계가 다릅니다
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // ── 기존 부채: 표시만 하고 막지는 않음 ──────────────────────────
      // console.* 은 프로덕션에서 성능·정보 노출 문제가 됩니다.
      // 다만 이 코드베이스는 디버깅을 console 에 크게 의존하고 있어
      // 한 번에 걷어내면 문제 추적이 어려워집니다. warn 으로 두고
      // 새 코드에서 늘지 않는지만 봅니다. (error/warn 은 허용)
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'warn',

      // ── 기존 위반이 남아 있어 warn 으로 둔 것 ───────────────────────
      //
      // 원칙: **CI 가 처음부터 빨간불이면 아무도 안 본다.**
      // 지금 위반이 남아 있는 규칙은 warn 으로 두어 CI 를 통과시키고,
      // 목록을 줄여가며 하나씩 error 로 올린다.
      //
      // 현재 남은 수 (npm run lint 로 확인):
      //   no-unused-vars              67  대부분 지역 변수·파라미터.
      //                                   import 44개는 이미 제거했다.
      //                                   지역 변수는 의도가 있을 수 있어
      //                                   기계적으로 지우지 않았다.
      //   react-hooks/*               23  React Compiler 기반 규칙.
      //                                   refs 접근·effect 내 setState·TDZ 등
      //                                   사이트마다 판단이 필요하다.
      //
      // ⚠️ 이 둘을 error 로 올리는 것이 다음 목표다. 그때까지는
      //    `npm run lint` 의 warning 수가 늘지 않는지 보는 것으로 대신한다.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',

      // ── 위반이 0인 규칙: error 유지 ────────────────────────────────
      // 새로 들어오는 것을 막는다.
      'react/no-unescaped-entities': 'error',
      'react/display-name': 'error',
    },
  },
  {
    // 테스트 파일은 규칙을 완화합니다.
    files: ['**/__tests__/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
