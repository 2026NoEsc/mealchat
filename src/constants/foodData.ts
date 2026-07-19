export interface FoodItem {
  id: string;
  name: string;
  emoji: string;
  labels: {
    meat?: boolean;
    seafood?: boolean;
    spicy?: boolean;
    greasy?: boolean;
    clean?: boolean;
    allergens?: string[];
  };
}

export const POPULAR_FOODS: FoodItem[] = [
  { id: 'f1', name: '삼겹살', emoji: '🥓', labels: { meat: true, greasy: true } },
  { id: 'f2', name: '초밥', emoji: '🍣', labels: { seafood: true, clean: true, allergens: ['seafood'] } },
  { id: 'f3', name: '김치찌개', emoji: '🍲', labels: { meat: true, spicy: true } },
  { id: 'f4', name: '후라이드 치킨', emoji: '🍗', labels: { meat: true, greasy: true, allergens: ['wheat'] } },
  { id: 'f5', name: '양념 치킨', emoji: '🍗', labels: { meat: true, greasy: true, spicy: true, allergens: ['wheat', 'peanuts'] } },
  { id: 'f6', name: '짜장면', emoji: '🍜', labels: { meat: true, greasy: true, allergens: ['wheat'] } },
  { id: 'f7', name: '짬뽕', emoji: '🍜', labels: { seafood: true, spicy: true, allergens: ['wheat', 'crustaceans'] } },
  { id: 'f8', name: '제육볶음', emoji: '🥩', labels: { meat: true, spicy: true } },
  { id: 'f9', name: '떡볶이', emoji: '🍡', labels: { spicy: true, allergens: ['wheat'] } },
  { id: 'f10', name: '된장찌개', emoji: '🍲', labels: { clean: true } },
  { id: 'f11', name: '갈비탕', emoji: '🍖', labels: { meat: true, clean: true } },
  { id: 'f12', name: '부대찌개', emoji: '🥘', labels: { meat: true, spicy: true } },
  { id: 'f13', name: '보쌈', emoji: '🐷', labels: { meat: true, clean: true } },
  { id: 'f14', name: '족발', emoji: '🐖', labels: { meat: true, greasy: true } },
  { id: 'f15', name: '피자', emoji: '🍕', labels: { meat: true, greasy: true, allergens: ['wheat', 'dairy'] } },
  { id: 'f16', name: '크림 파스타', emoji: '🍝', labels: { greasy: true, allergens: ['wheat', 'dairy'] } },
  { id: 'f17', name: '광어회', emoji: '🐟', labels: { seafood: true, clean: true, allergens: ['seafood'] } },
  { id: 'f18', name: '마라탕', emoji: '🌶️', labels: { meat: true, seafood: true, spicy: true, greasy: true, allergens: ['peanuts'] } },
  { id: 'f19', name: '칼국수', emoji: '🍜', labels: { clean: true, allergens: ['wheat'] } },
  { id: 'f20', name: '물냉면', emoji: '🧊', labels: { clean: true, allergens: ['wheat'] } },
  { id: 'f21', name: '감자탕', emoji: '🍲', labels: { meat: true, spicy: true } },
  { id: 'f22', name: '매운 닭발', emoji: '🐓', labels: { meat: true, spicy: true } },
  { id: 'f23', name: '아구찜', emoji: '🐡', labels: { seafood: true, spicy: true, allergens: ['seafood', 'crustaceans'] } },
  { id: 'f24', name: '간장게장', emoji: '🦀', labels: { seafood: true, clean: true, allergens: ['crustaceans'] } },
  { id: 'f25', name: '소곱창 구이', emoji: '🐂', labels: { meat: true, greasy: true } },
  { id: 'f26', name: '산낙지 회', emoji: '🐙', labels: { seafood: true, clean: true, allergens: ['seafood'] } },
  { id: 'f27', name: '소고기 쌀국수', emoji: '🍜', labels: { clean: true, allergens: ['wheat'] } },
  { id: 'f28', name: '클럽 샌드위치', emoji: '🥪', labels: { clean: true, allergens: ['wheat', 'dairy'] } },
  { id: 'f29', name: '치즈 돈까스', emoji: '🐷', labels: { meat: true, greasy: true, allergens: ['wheat', 'dairy'] } },
  { id: 'f30', name: '소고기 샤브샤브', emoji: '🍲', labels: { meat: true, clean: true } }
];
