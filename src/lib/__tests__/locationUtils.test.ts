import {
  SEOUL_CITY_HALL,
  isUsableCoordinate,
  isDefaultMapCenter,
  isStoredLocationVerified,
  resolveStartLocationForSave,
  didDropCoordinates
} from '../locationUtils';

describe('isUsableCoordinate', () => {
  it('정상 좌표를 통과시킨다', () => {
    expect(isUsableCoordinate(35.1579, 129.0594)).toBe(true); // 부산 서면
  });

  it('숫자가 아니면 거른다', () => {
    expect(isUsableCoordinate(null, 129)).toBe(false);
    expect(isUsableCoordinate(undefined, undefined)).toBe(false);
    expect(isUsableCoordinate('35.1', '129.0')).toBe(false);
  });

  it('NaN 을 거른다', () => {
    // parseFloat 실패가 그대로 흘러들어오는 경로가 있다.
    expect(isUsableCoordinate(parseFloat('없음'), 129)).toBe(false);
  });

  it('범위를 벗어난 값을 거른다', () => {
    expect(isUsableCoordinate(91, 129)).toBe(false);
    expect(isUsableCoordinate(35, 181)).toBe(false);
  });

  it('(0, 0) 은 "값 없음"으로 본다', () => {
    expect(isUsableCoordinate(0, 0)).toBe(false);
  });
});

describe('isDefaultMapCenter', () => {
  it('서울시청 기본값을 알아본다', () => {
    expect(isDefaultMapCenter(37.5665, 126.978)).toBe(true);
  });

  it('아주 조금만 달라도 기본값이 아니다', () => {
    expect(isDefaultMapCenter(37.57, 126.98)).toBe(false);
  });

  it('부산은 기본값이 아니다', () => {
    expect(isDefaultMapCenter(35.1579, 129.0594)).toBe(false);
  });
});

describe('isStoredLocationVerified', () => {
  it('실제 좌표가 저장돼 있으면 확정으로 본다', () => {
    expect(isStoredLocationVerified(35.1579, 129.0594)).toBe(true);
  });

  it('서울시청 기본값이 저장돼 있으면 확정으로 보지 않는다', () => {
    // 이 규칙이 생기기 전에 저장된 "이름만 있고 좌표는 기본값" 프로필을
    // 그대로 다시 저장하지 않기 위한 것이다.
    expect(isStoredLocationVerified(37.5665, 126.978)).toBe(false);
  });

  it('좌표가 없으면 확정이 아니다', () => {
    expect(isStoredLocationVerified(null, null)).toBe(false);
  });
});

describe('resolveStartLocationForSave', () => {
  it('이름이 비면 좌표까지 버린다', () => {
    expect(
      resolveStartLocationForSave({
        name: '   ',
        latitude: 35.1579,
        longitude: 129.0594,
        verified: true
      })
    ).toEqual({
      start_location_name: null,
      start_latitude: null,
      start_longitude: null
    });
  });

  it('검색으로 확정된 좌표는 그대로 저장한다', () => {
    expect(
      resolveStartLocationForSave({
        name: '  서면역  ',
        latitude: 35.1579,
        longitude: 129.0594,
        verified: true
      })
    ).toEqual({
      start_location_name: '서면역',
      start_latitude: 35.1579,
      start_longitude: 129.0594
    });
  });

  it('AE-8 재현: 이름만 타이핑하면 좌표를 버린다', () => {
    // 이 케이스가 이 파일이 존재하는 이유다.
    // 예전에는 서울시청 좌표가 그대로 저장돼 부산 사용자가 서울 추천을 받았다.
    const saved = resolveStartLocationForSave({
      name: 'Seomyeon',
      latitude: SEOUL_CITY_HALL.latitude,
      longitude: SEOUL_CITY_HALL.longitude,
      verified: false
    });

    expect(saved).toEqual({
      start_location_name: 'Seomyeon',
      start_latitude: null,
      start_longitude: null
    });
    expect(didDropCoordinates(saved)).toBe(true);
  });

  it('확정 표시가 있어도 좌표가 기본값이면 버린다', () => {
    // 플래그만 믿지 않는다. 값 자체도 확인한다.
    const saved = resolveStartLocationForSave({
      name: '우리집',
      latitude: SEOUL_CITY_HALL.latitude,
      longitude: SEOUL_CITY_HALL.longitude,
      verified: true
    });
    expect(saved.start_latitude).toBeNull();
  });

  it('확정 표시가 있어도 좌표가 쓸 수 없으면 버린다', () => {
    const saved = resolveStartLocationForSave({
      name: '회사',
      latitude: NaN,
      longitude: 129.0594,
      verified: true
    });
    expect(saved).toEqual({
      start_location_name: '회사',
      start_latitude: null,
      start_longitude: null
    });
  });

  it('이름 없이 저장하면 알림이 필요 없다', () => {
    const saved = resolveStartLocationForSave({
      name: '',
      latitude: null,
      longitude: null,
      verified: false
    });
    expect(didDropCoordinates(saved)).toBe(false);
  });

  it('정상 저장이면 알림이 필요 없다', () => {
    const saved = resolveStartLocationForSave({
      name: '서면역',
      latitude: 35.1579,
      longitude: 129.0594,
      verified: true
    });
    expect(didDropCoordinates(saved)).toBe(false);
  });
});

describe('AI 계산과의 계약', () => {
  it('좌표를 버린 참여자는 중간지점 평균에서 빠진다', () => {
    // resolveMeetingCenter / calculateAverageTravelTime 은
    // `typeof p.start_latitude === 'number'` 로 거른다.
    // 즉 null 은 "위치 모름"으로 정확히 해석된다. (라운드 W-2 테스트 참고)
    const saved = resolveStartLocationForSave({
      name: 'Seomyeon',
      latitude: SEOUL_CITY_HALL.latitude,
      longitude: SEOUL_CITY_HALL.longitude,
      verified: false
    });
    expect(typeof saved.start_latitude === 'number').toBe(false);
  });
});
