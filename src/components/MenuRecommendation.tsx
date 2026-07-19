import React, { useState, useRef } from 'react';
import { THEME } from '../lib/theme';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Alert
} from 'react-native';
import { Sparkles, ShieldAlert, Award } from 'lucide-react-native';
import type { Participant } from '../lib/types';

interface MenuRecommendationProps {
  participants: Participant[];
}

const PRICE_RANGES = [
  { id: 'low', label: '1만원 이하 💰', maxPrice: 10000 },
  { id: 'mid', label: '1만~2만원 💵', maxPrice: 20000 },
  { id: 'high', label: '2만~3만원 💳', maxPrice: 30000 },
  { id: 'premium', label: '3만원 이상 💎', maxPrice: 999999 }
];

const ALCOHOL_PRIORITY = [
  { id: 'meal', label: '식사가 우선! 🍚' },
  { id: 'drink', label: '술이 우선! 🍺' },
  { id: 'either', label: '상관없음 🤷' }
];

// Master Menu List with Health/Allergy tags
interface MenuItem {
  name: string;
  price: number;
  isForDrink: boolean;
  allergies: string[]; // Exclude if participant has these allergies
  healthIssues: string[]; // Exclude if participant has these illnesses (e.g. diabetes -> sugar)
}

const MENU_POOL: MenuItem[] = [
  { name: '삼겹살 회식 🥩', price: 18000, isForDrink: true, allergies: [], healthIssues: ['hypertension'] },
  { name: '초밥 🍣', price: 22000, isForDrink: false, allergies: ['fish', 'shellfish'], healthIssues: [] },
  { name: '피자 🍕', price: 24000, isForDrink: true, allergies: ['gluten', 'dairy'], healthIssues: ['diabetes'] },
  { name: '치킨 🍗', price: 20000, isForDrink: true, allergies: ['gluten'], healthIssues: ['hypertension'] },
  { name: '곱창전골 🍲', price: 28000, isForDrink: true, allergies: [], healthIssues: ['hypertension'] },
  { name: '돈까스 🍛', price: 11000, isForDrink: false, allergies: ['gluten', 'dairy'], healthIssues: [] },
  { name: '짜장면/짬뽕 🍜', price: 9000, isForDrink: false, allergies: ['gluten'], healthIssues: ['diabetes'] },
  { name: '부대찌개 🍲', price: 10000, isForDrink: true, allergies: [], healthIssues: ['hypertension'] },
  { name: '샤브샤브 🍲', price: 19000, isForDrink: false, allergies: [], healthIssues: [] },
  { name: '파스타 🍝', price: 15000, isForDrink: false, allergies: ['gluten', 'dairy'], healthIssues: [] },
  { name: '해물찜 🐙', price: 35000, isForDrink: true, allergies: ['shellfish', 'fish'], healthIssues: [] },
  { name: '연어 덮밥 🍚', price: 14000, isForDrink: false, allergies: ['fish'], healthIssues: [] },
  { name: '햄버거 세트 🍔', price: 8500, isForDrink: false, allergies: ['gluten', 'dairy'], healthIssues: ['diabetes', 'hypertension'] },
  { name: '마라탕 🍢', price: 16000, isForDrink: true, allergies: ['peanuts', 'shellfish'], healthIssues: ['stomach'] },
  { name: '닭가슴살 샐러드 🥗', price: 9500, isForDrink: false, allergies: [], healthIssues: ['vegan'] }
];

export const MenuRecommendation: React.FC<MenuRecommendationProps> = ({ participants }) => {
  const [priceRange, setPriceRange] = useState<'low' | 'mid' | 'high' | 'premium' | null>(null);
  const [alcoholMode, setAlcoholMode] = useState<'meal' | 'drink' | 'either'>('either');
  const [safetyCheck, setSafetyCheck] = useState(true);

  // Roulette states
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Gather active allergies and health conditions of all participants in the room
  const activeAllergies: string[] = [];
  const activeHealthIssues: string[] = [];

  participants.forEach(p => {
    const data = p.personal_data;
    if (data) {
      if (data.allergies) {
        data.allergies.forEach(a => {
          if (!activeAllergies.includes(a)) activeAllergies.push(a);
        });
      }
      if (data.health_issues) {
        data.health_issues.forEach(h => {
          if (!activeHealthIssues.includes(h)) activeHealthIssues.push(h);
        });
      }
    }
  });

  // Filter menu list dynamically
  const getFilteredMenu = () => {
    let list = [...MENU_POOL];

    // 1. Price Range filter
    if (priceRange) {
      const selectedRange = PRICE_RANGES.find(r => r.id === priceRange);
      if (selectedRange) {
        if (priceRange === 'low') {
          list = list.filter(item => item.price <= 10000);
        } else if (priceRange === 'mid') {
          list = list.filter(item => item.price > 10000 && item.price <= 20000);
        } else if (priceRange === 'high') {
          list = list.filter(item => item.price > 20000 && item.price <= 30000);
        } else {
          list = list.filter(item => item.price > 30000);
        }
      }
    }

    // 2. Alcohol/Meal priority filter
    if (alcoholMode === 'meal') {
      list = list.filter(item => !item.isForDrink);
    } else if (alcoholMode === 'drink') {
      list = list.filter(item => item.isForDrink);
    }

    // 3. Safety check (Allergies & Illnesses exclusions)
    if (safetyCheck) {
      list = list.filter(item => {
        // Exclude if any participant allergy matches menu allergen
        const hasAllergyConflict = item.allergies.some(a => activeAllergies.includes(a));
        // Exclude if any participant health issue matches menu hazard
        const hasHealthConflict = item.healthIssues.some(h => activeHealthIssues.includes(h));
        return !hasAllergyConflict && !hasHealthConflict;
      });
    }

    return list.map(item => item.name);
  };

  const filteredItems = getFilteredMenu();

  // If filtered items is less than 2, we fallback to a minimum default list to spin
  const spinItems = filteredItems.length >= 2 ? filteredItems.slice(0, 8) : ['피자 🍕', '치킨 🍗', '삼겹살 🥩', '초밥 🍣', '부대찌개 🍲', '돈까스 🍛'];

  const startSpin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);

    const randomIndex = Math.floor(Math.random() * spinItems.length);
    const rotations = 6;
    const segmentAngle = 360 / spinItems.length;
    // Rotate counter-clockwise to match point arrow at top (0 deg is top)
    const targetDegree = rotations * 360 + (360 - (randomIndex * segmentAngle));

    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: targetDegree,
      duration: 3500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true
    }).start(() => {
      setSpinning(false);
      setResult(spinItems[randomIndex]);
    });
  };

  const spinInterpolation = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg']
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Exclusions Status Card */}
      {safetyCheck && (activeAllergies.length > 0 || activeHealthIssues.length > 0) && (
        <View style={styles.safetyStatusCard}>
          <Text style={styles.safetyStatusTitle}>
            <ShieldAlert size={14} color="#fca5a5" /> 안심 지킴이 작동 중
          </Text>
          <Text style={styles.safetyStatusDesc}>
            모임 참여자들의 건강(지병, 알레르기)을 고려하여 아래 음식이 자동 제외되었습니다.
          </Text>
          <View style={styles.alertTagsBox}>
            {activeAllergies.map(a => (
              <Text key={a} style={[styles.alertTag, { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }]}>
                ⚠️ {a === 'peanuts' ? '땅콩' : a === 'shellfish' ? '갑각류' : a === 'fish' ? '생선' : a === 'peach' ? '복숭아' : a === 'dairy' ? '유제품' : '밀가루'} 알레르기
              </Text>
            ))}
            {activeHealthIssues.map(h => (
              <Text key={h} style={[styles.alertTag, { backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd' }]}>
                🩺 {h === 'diabetes' ? '당뇨식' : h === 'hypertension' ? '저염식' : h === 'stomach' ? '위장장애케어' : '비건식'} 대상
              </Text>
            ))}
          </View>
        </View>
      )}

      {/* Exclusions Toggle */}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleText}>건강/알레르기 안전 필터 적용</Text>
        <TouchableOpacity
          style={[styles.switch, safetyCheck ? styles.switchOn : styles.switchOff]}
          onPress={() => setSafetyCheck(!safetyCheck)}
        >
          <View style={[styles.switchHandle, safetyCheck ? styles.switchHandleOn : styles.switchHandleOff]} />
        </TouchableOpacity>
      </View>

      {/* Filter Options */}
      <View style={styles.filterCard}>
        <Text style={styles.filterCardTitle}>우유부단 필터 조건</Text>
        
        {/* Price Ranges */}
        <Text style={styles.sectionLabel}>💰 희망 가격대 선택</Text>
        <View style={styles.btnRow}>
          {PRICE_RANGES.map(range => (
            <TouchableOpacity
              key={range.id}
              style={[
                styles.filterBtn,
                priceRange === range.id ? styles.filterBtnActive : styles.filterBtnInactive
              ]}
              onPress={() => setPriceRange(priceRange === range.id ? null : (range.id as any))}
            >
              <Text style={styles.filterBtnText}>{range.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Alcohol Priorities */}
        <Text style={[styles.sectionLabel, { marginTop: 14 }]}>🍺 모임 목적 선택</Text>
        <View style={styles.btnRow}>
          {ALCOHOL_PRIORITY.map(priority => (
            <TouchableOpacity
              key={priority.id}
              style={[
                styles.filterBtn,
                alcoholMode === priority.id ? styles.filterBtnActive : styles.filterBtnInactive
              ]}
              onPress={() => setAlcoholMode(priority.id as any)}
            >
              <Text style={styles.filterBtnText}>{priority.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Spin Roulette Area */}
      <View style={styles.rouletteArea}>
        <Text style={styles.rouletteTitle}>🎰 메뉴 룰렛</Text>
        <Text style={styles.rouletteSubtitle}>
          {filteredItems.length}개의 후보 메뉴가 준비되었습니다.
        </Text>

        {/* Wheel Container */}
        <View style={styles.wheelWrapper}>
          {/* Static Arrow Point */}
          <Text style={styles.arrowPointer}>▼</Text>

          {/* Rotating Wheel */}
          <Animated.View style={[
            styles.wheelContainer,
            { transform: [{ rotate: spinInterpolation }] }
          ]}>
            {/* Draw segments */}
            {spinItems.map((item, index) => {
              const angle = index * (360 / spinItems.length);
              return (
                <View
                  key={index}
                  style={[
                    styles.wheelSegment,
                    { transform: [{ rotate: `${angle}deg` }] }
                  ]}
                >
                  <Text style={styles.segmentText}>{item}</Text>
                </View>
              );
            })}
            
            {/* Center Pin */}
            <View style={styles.centerPin} />
          </Animated.View>
        </View>

        {/* Spin Action Button */}
        <TouchableOpacity
          style={[styles.spinButton, spinning && { backgroundColor: '#475569' }]}
          disabled={spinning}
          onPress={startSpin}
        >
          <Text style={styles.spinButtonText}>
            {spinning ? '돌아가는 중...' : '오늘 뭐 먹지? 돌리기 🎲'}
          </Text>
        </TouchableOpacity>

        {/* Spin Result Banner */}
        {result && (
          <View style={styles.resultBanner}>
            <Award size={24} color="#f59e0b" style={{ alignSelf: 'center', marginBottom: 4 }} />
            <Text style={styles.resultLabel}>오늘의 추천 메뉴!</Text>
            <Text style={styles.resultMenu}>{result}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16
  },
  safetyStatusCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12
  },
  safetyStatusTitle: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4
  },
  safetyStatusDesc: {
    color: '#94a3b8',
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 8
  },
  alertTagsBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  alertTag: {
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12
  },
  toggleText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: 'bold'
  },
  switch: {
    width: 44,
    height: 22,
    borderRadius: 11,
    padding: 2
  },
  switchOn: {
    backgroundColor: '#2AC1BC'
  },
  switchOff: {
    backgroundColor: '#475569'
  },
  switchHandle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'white'
  },
  switchHandleOn: {
    alignSelf: 'flex-end'
  },
  switchHandleOff: {
    alignSelf: 'flex-start'
  },
  filterCard: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16
  },
  filterCardTitle: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 12
  },
  sectionLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 'bold',
    marginBottom: 8
  },
  btnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1
  },
  filterBtnActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primaryPressed
  },
  filterBtnInactive: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.08)'
  },
  filterBtnText: {
    color: 'white',
    fontSize: 11
  },
  rouletteArea: {
    alignItems: 'center',
    marginTop: 8
  },
  rouletteTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white'
  },
  rouletteSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 20
  },
  wheelWrapper: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  arrowPointer: {
    position: 'absolute',
    top: -18,
    fontSize: 24,
    color: '#ef4444',
    zIndex: 99
  },
  wheelContainer: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 6,
    borderColor: 'white',
    backgroundColor: '#1e293b',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center'
  },
  wheelSegment: {
    position: 'absolute',
    width: 240,
    height: 240,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20
  },
  segmentText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold'
  },
  centerPin: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 3,
    borderColor: THEME.primary,
    zIndex: 10
  },
  spinButton: {
    backgroundColor: THEME.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: THEME.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10
  },
  spinButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold'
  },
  resultBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 8,
    padding: 16,
    width: '100%',
    marginTop: 20,
    alignItems: 'center'
  },
  resultLabel: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: 'bold'
  },
  resultMenu: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 6
  }
});
