import {
  getHaversineDistance,
  resolveMeetingCenter,
  calculateAverageTravelTime,
  stripGeneratedSuffix,
  extractJsonString,
  formatTimeKorean,
} from '../aiRecommender';
import type { Participant, Room } from '../types';

function p(lat?: number, lon?: number): Participant {
  return { start_latitude: lat, start_longitude: lon } as unknown as Participant;
}

describe('getHaversineDistance', () => {
  it('같은 지점이면 0', () => {
    expect(getHaversineDistance(37.5665, 126.978, 37.5665, 126.978)).toBe(0);
  });

  it('서울시청 ~ 부산시청은 약 325km', () => {
    // 실제 직선거리 약 325km. 계산식이 뒤집히거나 단위가 틀리면 크게 벗어난다.
    const d = getHaversineDistance(37.5665, 126.978, 35.1798, 129.0750);
    expect(d).toBeGreaterThan(310);
    expect(d).toBeLessThan(340);
  });

  it('방향이 바뀌어도 같은 거리', () => {
    const a = getHaversineDistance(37.5, 127.0, 35.1, 129.0);
    const b = getHaversineDistance(35.1, 129.0, 37.5, 127.0);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('resolveMeetingCenter', () => {
  const noCoordRoom = {} as Room;

  it('방에 좌표가 있으면 그것을 쓴다', () => {
    const room = { latitude: 35.1, longitude: 129.0 } as Room;
    expect(resolveMeetingCenter(room, [p(37.5, 127.0)])).toEqual({ lat: 35.1, lon: 129.0 });
  });

  it('방 좌표가 없으면 참여자 중심점', () => {
    const center = resolveMeetingCenter(noCoordRoom, [p(36, 128), p(38, 126)]);
    expect(center.lat).toBeCloseTo(37, 6);
    expect(center.lon).toBeCloseTo(127, 6);
  });

  it('좌표 없는 참여자는 평균에서 제외한다', () => {
    // 이게 틀리면 좌표 없는 사람이 (0,0) 으로 계산돼 중심점이 아프리카로 간다.
    const center = resolveMeetingCenter(noCoordRoom, [p(36, 128), p(), p(38, 126)]);
    expect(center.lat).toBeCloseTo(37, 6);
    expect(center.lon).toBeCloseTo(127, 6);
  });

  it('아무도 좌표가 없으면 서울시청으로 폴백', () => {
    expect(resolveMeetingCenter(noCoordRoom, [p(), p()])).toEqual({ lat: 37.5665, lon: 126.978 });
  });

  it('참여자가 비어도 폴백', () => {
    expect(resolveMeetingCenter(noCoordRoom, [])).toEqual({ lat: 37.5665, lon: 126.978 });
  });
});

describe('calculateAverageTravelTime', () => {
  it('같은 위치면 최소 버퍼(10분)만', () => {
    expect(calculateAverageTravelTime(37.5, 127.0, [p(37.5, 127.0)])).toBe(10);
  });

  it('멀수록 오래 걸린다', () => {
    const near = calculateAverageTravelTime(37.5, 127.0, [p(37.55, 127.0)]);
    const far = calculateAverageTravelTime(37.5, 127.0, [p(38.5, 127.0)]);
    expect(far).toBeGreaterThan(near);
  });

  it('좌표 없는 참여자는 평균에서 빠진다', () => {
    // 좌표 없는 사람을 (0,0) 으로 넣으면 평균이 수천 분으로 튄다.
    const withNull = calculateAverageTravelTime(37.5, 127.0, [p(37.5, 127.0), p()]);
    expect(withNull).toBe(10);
  });

  it('아무도 좌표가 없으면 20~40분 사이의 추정값', () => {
    const t = calculateAverageTravelTime(37.5, 127.0, [p(), p()]);
    expect(t).toBeGreaterThanOrEqual(20);
    expect(t).toBeLessThan(40);
  });
});

describe('stripGeneratedSuffix', () => {
  it("'근처' 가 없으면 그대로", () => {
    expect(stripGeneratedSuffix('강남역')).toBe('강남역');
  });

  it("첫 '근처' 에서 자른다", () => {
    // 이게 없으면 확정할 때마다 이름이 한 마디씩 길어진다 (J-3 에서 실제 발생).
    expect(stripGeneratedSuffix('알베르 (Alver) 근처 투썸플레이스')).toBe('알베르 (Alver)');
  });

  it('여러 번 누적된 이름도 첫 마디만 남긴다', () => {
    expect(stripGeneratedSuffix('강남역 근처 투썸플레이스 근처 투썸플레이스')).toBe('강남역');
  });

  it("맨 앞이 '근처' 면 자르지 않는다", () => {
    // idx > 0 조건이 없으면 빈 문자열이 되어 이름이 사라진다.
    expect(stripGeneratedSuffix(' 근처 카페')).toBe(' 근처 카페');
  });
});

describe('extractJsonString', () => {
  it('마크다운 코드펜스에 감싸인 JSON 을 꺼낸다', () => {
    expect(extractJsonString('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('배열도 꺼낸다', () => {
    expect(extractJsonString('앞말 [1,2,3] 뒷말')).toBe('[1,2,3]');
  });

  it('JSON 이 없으면 null', () => {
    expect(extractJsonString('그냥 문장입니다')).toBeNull();
  });

  it('중첩 객체의 마지막 닫는 괄호까지 포함한다', () => {
    expect(extractJsonString('{"a":{"b":1}}')).toBe('{"a":{"b":1}}');
  });
});

describe('formatTimeKorean', () => {
  it('오전/오후를 구분한다', () => {
    expect(formatTimeKorean('09:00')).toBe('오전 9시');
    expect(formatTimeKorean('18:30')).toBe('오후 6시 30분');
  });

  it('정오와 자정을 12시로 표기한다', () => {
    expect(formatTimeKorean('12:00')).toBe('오후 12시');
    expect(formatTimeKorean('00:00')).toBe('오전 12시');
  });
});
