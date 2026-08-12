// 모듈을 그대로 부르면 supabaseClient → AsyncStorage(네이티브 모듈)까지 끌려옵니다.
jest.mock('../../lib/supabaseClient', () => ({ supabase: {} }));

import { getMemberName, splitBankAccount, parseScannedAmount } from '../RoomDutchPaySheet';

/**
 * 시트 렌더는 supabase 왕복이 얽혀 있어, 여기서는 화면이 기대는 순수 변환만
 * 못 박아 둡니다. 잘못되면 남의 이름이나 금액이 틀리게 나가는 자리들입니다.
 */

describe('getMemberName', () => {
  it('"이름:금액" 에서 이름만 꺼낸다', () => {
    expect(getMemberName('모아:12000')).toBe('모아');
  });

  it('금액이 안 붙어 있어도 그대로 돌려준다', () => {
    expect(getMemberName('두두')).toBe('두두');
  });
});

describe('splitBankAccount', () => {
  it('"은행 계좌번호" 를 은행과 번호로 쪼갠다', () => {
    expect(splitBankAccount('카카오뱅크 3333-01-1234567')).toEqual({
      bankName: '카카오뱅크',
      accountNumber: '3333-01-1234567',
    });
  });

  it('은행 이름에 공백이 있어도 번호를 잃지 않는다', () => {
    expect(splitBankAccount('국민 123 456 789')).toEqual({
      bankName: '국민',
      accountNumber: '123 456 789',
    });
  });

  it('은행 없이 번호만 있으면 번호로만 채운다', () => {
    expect(splitBankAccount('1234567890')).toEqual({ bankName: '', accountNumber: '1234567890' });
  });

  it('값이 없으면 빈 값', () => {
    expect(splitBankAccount(undefined)).toEqual({ bankName: '', accountNumber: '' });
  });
});

describe('parseScannedAmount', () => {
  it('통화 기호와 쉼표를 걷어낸다', () => {
    expect(parseScannedAmount('₩48,000')).toBe(48000);
    expect(parseScannedAmount('총 48000원')).toBe(48000);
  });

  it('숫자가 없거나 0이면 실패로 본다', () => {
    expect(parseScannedAmount('모르겠어요')).toBeNull();
    expect(parseScannedAmount('0')).toBeNull();
  });
});
