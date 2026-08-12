/**
 * 밀챗 캐릭터 이모티콘.
 *
 * 채팅 메시지에는 `[emoticon:<key>]` 형태로 저장되고, 렌더링할 때 이 표에서
 * 이미지를 찾는다. App.tsx 에 있던 것을 채팅 화면 분리와 함께 옮겼다.
 */
export const EMOTICONS_MAP: { [key: string]: any } = {
  dudu_meet: require('../../public/characters/dudu_emoticon_meet.png'),
  dudu_sad: require('../../public/characters/dudu_emoticon_sad.png'),
  dudu_love: require('../../public/characters/dudu_emoticon_love.png'),
  dudu_wink: require('../../public/characters/dudu_emoticon_wink.png'),
  dudu_shock: require('../../public/characters/dudu_emoticon_shock.png'),
  moa_ok: require('../../public/characters/moa_emoticon_ok.png'),
  moa_hello: require('../../public/characters/moa_emoticon_hello.png'),
  moa_busy: require('../../public/characters/moa_emoticon_busy.png'),
  moa_sleep: require('../../public/characters/moa_emoticon_sleep.png'),
  moa_party: require('../../public/characters/moa_emoticon_party.png'),
  welling_eat: require('../../public/characters/welling_emoticon_eat.png'),
  welling_coffee: require('../../public/characters/welling_emoticon_coffee.png'),
  welling_starving: require('../../public/characters/welling_emoticon_starving.png'),
  welling_full: require('../../public/characters/welling_emoticon_full.png'),
  welling_thumbs: require('../../public/characters/welling_emoticon_thumbs.png'),
  ttori_dutch: require('../../public/characters/ttori_emoticon_dutch.png'),
  ttori_angry: require('../../public/characters/ttori_emoticon_angry.png'),
};

/** 이모티콘 고르기 그리드에 표시할 이름 */
export const EMOTICON_NAMES: { [key: string]: string } = {
  dudu_meet: '약속두두',
  dudu_sad: '슬픈두두',
  dudu_love: '하트두두',
  dudu_wink: '윙크두두',
  dudu_shock: '깜놀두두',
  moa_ok: '확인모아',
  moa_hello: '안녕모아',
  moa_busy: '바쁜모아',
  moa_sleep: '낮잠모아',
  moa_party: '파티모아',
  welling_eat: '냠냠웰링',
  welling_coffee: '커피웰링',
  welling_starving: '배고픈웰링',
  welling_full: '배부른웰링',
  welling_thumbs: '최고웰링',
  ttori_dutch: '정산또리',
  ttori_angry: '화난또리',
};

/** `[emoticon:key]` 이면 key 를, 아니면 null */
export const parseEmoticonKey = (message: string): string | null => {
  if (!message.startsWith('[emoticon:') || !message.endsWith(']')) return null;
  const key = message.slice('[emoticon:'.length, -1);
  return EMOTICONS_MAP[key] ? key : null;
};

/**
 * 방 목록 카드의 마지막 대화 미리보기.
 * 이모티콘 메시지는 `[emoticon:key]` 로 저장되므로 그대로 보여주면 원문이 샌다.
 */
export const formatMessagePreview = (message?: string): string => {
  if (!message) return '';
  const key = parseEmoticonKey(message);
  if (!key) return message;
  return `${EMOTICON_NAMES[key] ?? '캐릭터'} 이모티콘`;
};
