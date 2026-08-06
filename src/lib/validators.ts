// 한국 은행계좌 검증
export function validateBankAccount(accountNumber: string): { valid: boolean; error?: string } {
  if (!accountNumber) {
    return { valid: false, error: '계좌 번호를 입력해주세요' };
  }

  const cleaned = accountNumber.replace(/[\s\-]/g, '');

  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, error: '계좌 번호는 숫자만 입력 가능합니다' };
  }

  if (cleaned.length < 10 || cleaned.length > 14) {
    return { valid: false, error: '계좌 번호 길이가 올바르지 않습니다 (10-14자)' };
  }

  return { valid: true };
}

// 생년월일 검증 (YYYY-MM-DD 형식)
export function validateBirthDate(dateStr: string): { valid: boolean; error?: string } {
  if (!dateStr) {
    return { valid: false, error: '생년월일을 입력해주세요' };
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return { valid: false, error: '생년월일 형식이 올바르지 않습니다 (YYYY-MM-DD)' };
  }

  const date = new Date(dateStr);
  const now = new Date();

  // 유효한 날짜인지 확인
  if (isNaN(date.getTime())) {
    return { valid: false, error: '유효하지 않은 날짜입니다' };
  }

  // 미래 날짜 체크
  if (date > now) {
    return { valid: false, error: '미래의 날짜는 입력할 수 없습니다' };
  }

  // 100세 이상 체크
  const age = now.getFullYear() - date.getFullYear();
  if (age > 120) {
    return { valid: false, error: '생년월일이 너무 과거입니다' };
  }

  return { valid: true };
}

// 금액 검증
export function validateAmount(amount: number | string): { valid: boolean; error?: string } {
  const num = typeof amount === 'string' ? parseInt(amount, 10) : amount;

  if (isNaN(num)) {
    return { valid: false, error: '금액은 숫자여야 합니다' };
  }

  if (num < 0) {
    return { valid: false, error: '금액은 0 이상이어야 합니다' };
  }

  if (num > 10000000) {
    return { valid: false, error: '금액이 너무 큽니다 (1천만원 초과)' };
  }

  if (!Number.isInteger(num)) {
    return { valid: false, error: '금액은 정수여야 합니다' };
  }

  return { valid: true };
}

// 참여자 수 검증
export function validateSplitCount(count: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(count) || count < 2) {
    return { valid: false, error: '참여자는 2명 이상이어야 합니다' };
  }

  if (count > 20) {
    return { valid: false, error: '참여자는 20명 이하여야 합니다' };
  }

  return { valid: true };
}

// 이름/닉네임 검증
export function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: '이름을 입력해주세요' };
  }

  if (name.length > 20) {
    return { valid: false, error: '이름은 20자 이내여야 합니다' };
  }

  return { valid: true };
}

// 방 제목 검증
export function validateRoomTitle(title: string): { valid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { valid: false, error: '방 제목을 입력해주세요' };
  }

  if (title.length > 50) {
    return { valid: false, error: '방 제목은 50자 이내여야 합니다' };
  }

  return { valid: true };
}

// 장소명 검증
export function validateLocation(location: string): { valid: boolean; error?: string } {
  if (!location || location.trim().length === 0) {
    return { valid: false, error: '장소를 입력해주세요' };
  }

  if (location.length > 100) {
    return { valid: false, error: '장소명은 100자 이내여야 합니다' };
  }

  return { valid: true };
}

// 메모 검증
export function validateMemo(memo: string): { valid: boolean; error?: string } {
  if (memo.length > 500) {
    return { valid: false, error: '메모는 500자 이내여야 합니다' };
  }

  return { valid: true };
}
