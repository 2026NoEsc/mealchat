import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Animated,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import { THEME } from '../lib/theme';

interface LoadingScreenProps {
  isOffline?: boolean;
  onRetry?: () => void;
}

const { width } = Dimensions.get('window');

interface CharacterSlide {
  name: string;
  role: string;
  color: string;
  badgeBg: string;
  image: any;
  desc: string;
}

const CHARACTER_SLIDES: CharacterSlide[] = [
  {
    name: '두두',
    role: '일정 조율 담당',
    color: '#FF7A00', // MealChat Orange Accent
    badgeBg: 'rgba(255, 122, 0, 0.1)',
    image: require('../../public/characters/dudu_original.jpg'),
    desc: '온화하고 든든한 성격으로 친구들의 다양한 의견을 포용하여, 가장 합리적이고 편안한 약속 일정을 조율해 주는 두두입니다. 🧡',
  },
  {
    name: '모아',
    role: '일정 관리 담당',
    color: '#FFD600', // MealChat Yellow Warning
    badgeBg: 'rgba(255, 214, 0, 0.15)',
    image: require('../../public/characters/moa_original.png'),
    desc: '활기차고 부지런한 몸짓으로 확정된 약속과 할 일들을 달력에 깔끔하게 모아서 꼼꼼하게 관리해 주는 모아입니다. 💛',
  },
  {
    name: '웰링',
    role: '메뉴 추천 담당',
    color: '#23A455', // MealChat Green Primary
    badgeBg: 'rgba(35, 164, 85, 0.1)',
    image: require('../../public/characters/welling_original.jpg'),
    desc: '순박하고 느긋한 성격으로 메뉴 결정을 어려워하는 친구들을 위해 맛있고 든든한 메뉴를 숟가락 얹듯 골라주는 웰링입니다. 💚',
  },
  {
    name: '또리',
    role: '정산 담당',
    color: '#00A3FF', // MealChat Sky Blue Secondary
    badgeBg: 'rgba(0, 163, 255, 0.1)',
    image: require('../../public/characters/ttori_original.jpg'),
    desc: '차분하고 논리적인 눈빛으로 복잡하고 번거로운 정산과 N빵 금액을 오차 없이 완벽하게 계산해 주는 또리입니다. 💙',
  },
  {
    name: '밀챗 프렌즈',
    role: '든든한 동반자',
    color: '#23A455',
    badgeBg: 'rgba(35, 164, 85, 0.1)',
    image: require('../../public/characters/friends_group.png'),
    desc: '일정 조율부터 메뉴 추천, 정산까지! 밀챗 프렌즈가 즐거운 모임의 모든 과정을 더 쉽고 편하게 만들어 드릴게요! 🤝',
  },
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isOffline = false, onRetry }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentCharacter = CHARACTER_SLIDES[activeIndex];

  const startProgressBar = () => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    startProgressBar();

    timerRef.current = setInterval(() => {
      // 1. Fade out (250ms)
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        // 2. Change Index
        setActiveIndex((prev) => (prev + 1) % CHARACTER_SLIDES.length);
        startProgressBar();
        // 3. Fade in (400ms)
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [activeIndex]);

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: THEME.background }]}>
      <StatusBar style="dark" />

      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>밀챗 (MealChat)</Text>
      </View>

      {/* Main Content Area with Fade Animation */}
      <Animated.View style={[styles.contentCard, { opacity: fadeAnim }]}>
        <View style={styles.imageContainer}>
          <Image
            source={currentCharacter.image}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Role Badge */}
        <View style={[styles.badge, { backgroundColor: currentCharacter.badgeBg }]}>
          <Text style={[styles.badgeText, { color: currentCharacter.color }]}>
            {currentCharacter.role}
          </Text>
        </View>

        {/* Character Name */}
        <Text style={[styles.name, { color: THEME.text }]}>{currentCharacter.name}</Text>

        {/* Description Text */}
        <Text style={[styles.description, { color: THEME.textMuted }]}>
          {currentCharacter.desc}
        </Text>
      </Animated.View>

      {/* Bottom Controls */}
      <View style={styles.bottomContainer}>
        {/* Pagination Dots */}
        <View style={styles.dotsContainer}>
          {CHARACTER_SLIDES.map((_, index) => {
            const isActive = index === activeIndex;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive ? currentCharacter.color : THEME.border,
                    width: isActive ? 18 : 6,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Progress Bar & Spinner */}
        <View style={styles.loadingProgressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: THEME.border }]}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressBarWidth,
                  backgroundColor: currentCharacter.color,
                },
              ]}
            />
          </View>
          {isOffline ? (
            <View style={styles.offlineContainer}>
              <View style={styles.offlineTextRow}>
                <WifiOff size={16} color="#EF4444" />
                <Text style={[styles.offlineText, { color: '#EF4444' }]}>
                  인터넷 연결이 끊겼습니다. 네트워크 연결을 확인해 주세요.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: currentCharacter.color }]}
                onPress={onRetry}
                activeOpacity={0.8}
              >
                <RefreshCw size={14} color="white" style={styles.retryIcon} />
                <Text style={styles.retryButtonText}>연결 재시도</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.spinnerRow}>
              <ActivityIndicator size="small" color={currentCharacter.color} />
              <Text style={[styles.loadingText, { color: THEME.textMuted }]}>
                모임 준비를 위한 데이터를 불러오는 중...
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 30,
  },
  header: {
    marginTop: 20,
    alignItems: 'center',
  },
  appName: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    color: '#8E8E93',
  },
  contentCard: {
    width: width * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginVertical: 20,
  },
  imageContainer: {
    width: width * 0.65,
    height: width * 0.65,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  bottomContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  loadingProgressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressTrack: {
    width: '80%',
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginBottom: 15,
  },
  progressBar: {
    height: '100%',
  },
  spinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    marginLeft: 8,
  },
  offlineContainer: {
    alignItems: 'center',
    width: '100%',
    gap: 12,
    marginTop: 5,
  },
  offlineTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  offlineText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 4,
  },
  retryIcon: {
    marginRight: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
