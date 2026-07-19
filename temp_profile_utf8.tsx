import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  SafeAreaView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  PanResponder,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { profileService } from '@/src/services/ProfileService';
import { authService, PROFILE_BG_COLORS, MALE_EMOJIS, FEMALE_EMOJIS, NEUTRAL_EMOJIS } from '@/src/services/AuthService';
import { User, UserProfile, CuisineType, AlcoholLiquor, Gender } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { POPULAR_FOODS, FoodItem } from '@/src/constants/foodData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BANKS = ['KB援??', '?좏븳', '?곕━', '?섎굹', 'NH?랁삊', '移댁뭅?ㅻ콉??, '?좎뒪諭낇겕'];

const ALLERGEN_OPTIONS = ['媛묎컖瑜?, '寃ш낵瑜?, '硫붾?', '諛', '蹂듭댂??, '?곗쑀', '議곌컻瑜?, '???, '怨꾨?'];
const CHRONIC_DISEASE_OPTIONS = ['?밸눊', '怨좏삁??, '?듯뭾', '??쪟???앸룄??, '留뚯꽦 ?꾩뿼', '怨좎??덉쬆'];
const DETAILED_DISLIKE_OPTIONS = ['?ㅼ씠', '媛吏', '怨좎닔', '誘쇳듃珥덉퐫', '?뚯씤?좏뵆 ?쇱옄', '?밴렐', '??, '留덈뒛', '?묓뙆'];

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'main' | 'edit' | 'food_taste'>('main');

  // 紐⑤떖 ?곹깭
  const [zoomModalVisible, setZoomModalVisible] = useState(false);

  // ?꾨줈???몄쭛 ?곹깭
  const [editNickname, setEditNickname] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editBirthdate, setEditBirthdate] = useState('');
  const [editGender, setEditGender] = useState<Gender | null>(null);
  const [editBank, setEditBank] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editEmoji, setEditEmoji] = useState('?쫨');
  const [editBgColor, setEditBgColor] = useState('#BFDBFE');
  const [showBankPicker, setShowBankPicker] = useState(false);

  // ?뚯떇 痍⑦뼢 ?ㅼ??댄봽 寃뚯엫 ?곹깭
  const [gameState, setGameState] = useState<'intro' | 'swiping' | 'questions' | 'alcohol' | 'result'>('intro');
  const [gameFoods, setGameFoods] = useState<FoodItem[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [likedFoods, setLikedFoods] = useState<string[]>([]);
  const [dislikedFoods, setDislikedFoods] = useState<string[]>([]);

  // ?깊뼢 ?ㅼ??댄봽 吏덈Ц ?④퀎 (0: ?댁궛臾?vs ?〓쪟, 1: ?먮겮 vs 源붾걫, 2: 留ㅼ슫?뚯떇 遺덊샇 vs ??
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionAnswers, setQuestionAnswers] = useState<('left' | 'right')[]>([]);

  // 二쇱쥌 ?좏깮 ?곹깭
  const [selectedLiquors, setSelectedLiquors] = useState<AlcoholLiquor[]>([]);
  const [noAlcohol, setNoAlcohol] = useState(false);

  // 寃곌낵 ?붾㈃ ?몃? ?쇰뱶諛??좏깮 ?곹깭
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
  const [selectedDislikes, setSelectedDislikes] = useState<string[]>([]);

  // 寃곌낵 ?꾩퐫?붿뼵 ?곹깭
  const [expandedSection, setExpandedSection] = useState<'allergy' | 'disease' | 'dislike' | null>(null);

  // ?ㅼ??댄봽 ?좊땲硫붿씠??諛??곗튂 ?덉뒪?곕뜑
  const pan = useRef(new Animated.ValueXY()).current;
  const introOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    setLoading(true);
    const profile = await profileService.getProfile();
    // profileService.getProfile() returns UserProfile or User. If logged in, we cast to User
    const currentUser = await authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      // ?몄쭛????珥덇린媛?二쇱엯
      setEditNickname(currentUser.nickname);
      setEditPassword(currentUser.password || '');
      setEditBirthdate(currentUser.birthdate);
      setEditGender(currentUser.gender);
      setEditBank(currentUser.accountBank);
      setEditAccountNumber(currentUser.accountNumber);
      setEditLocation(currentUser.location || '');
      setEditEmoji(currentUser.profileEmoji || '?쫨');
      setEditBgColor(currentUser.profileBgColor || '#BFDBFE');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    Alert.alert('濡쒓렇?꾩썐', '?뺣쭚 濡쒓렇?꾩썐 ?섏떆寃좎뒿?덇퉴?', [
      { text: '痍⑥냼', style: 'cancel' },
      {
        text: '濡쒓렇?꾩썐',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/auth/login');
        },
      },
    ]);
  };

  // ?꾨줈???몄쭛 ???  const handleSaveProfile = async () => {
    if (!editNickname.trim()) {
      Alert.alert('?뚮┝', '?됰꽕?꾩쓣 ?낅젰?섏꽭??');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editBirthdate)) {
      Alert.alert('?뚮┝', '?앸뀈?붿씪 ?뺤떇? YYYY-MM-DD ?ъ빞 ?⑸땲??');
      return;
    }

    if (!user) return;

    // 蹂寃쎌젏 泥댄겕
    const isPhotoModified = editEmoji !== user.profileEmoji || editBgColor !== user.profileBgColor;
    const isLocationModified = editLocation.trim().length > 0;

    const updatedProfile: UserProfile = {
      ...user,
      nickname: editNickname.trim(),
      password: editPassword.trim(),
      birthdate: editBirthdate,
      gender: editGender,
      accountBank: editBank,
      accountNumber: editAccountNumber.trim(),
      location: editLocation.trim(),
      profileEmoji: editEmoji,
      profileBgColor: editBgColor,
      hasCompletedProfilePhotoTutorial: user.hasCompletedProfilePhotoTutorial || isPhotoModified,
      hasCompletedLocationTutorial: user.hasCompletedLocationTutorial || isLocationModified,
    };

    const saved = await profileService.saveProfile(updatedProfile);
    setUser(saved as User);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setView('main');
    Alert.alert('????꾨즺', '?꾨줈???뺣낫媛 ??λ릺?덉뒿?덈떎.');
  };

  // 痍⑦뼢 遺꾩꽍 ?ㅼ??댄봽 寃뚯엫 ?쒖옉
  const startTasteFinder = () => {
    // 30媛?以?臾댁옉??10媛?異붿텧
    const shuffled = [...POPULAR_FOODS].sort(() => 0.5 - Math.random());
    setGameFoods(shuffled.slice(0, 10));
    setCardIndex(0);
    setLikedFoods([]);
    setDislikedFoods([]);
    setQuestionIndex(0);
    setQuestionAnswers([]);
    setSelectedLiquors([]);
    setNoAlcohol(false);
    setSelectedAllergies([]);
    setSelectedDiseases([]);
    setSelectedDislikes([]);
    setExpandedSection(null);
    
    setGameState('intro');
    setView('food_taste');

    // 3珥????ㅼ??댄봽 寃뚯엫 ?붾㈃?쇰줈 ?꾪솚
    Animated.sequence([
      Animated.timing(introOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(introOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setGameState('swiping');
    });
  };

  // 移대뱶 寃곗젙 泥섎━
  const makeDecision = (liked: boolean) => {
    const currentFood = gameFoods[cardIndex];
    if (liked) {
      setLikedFoods(prev => [...prev, currentFood.id]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      setDislikedFoods(prev => [...prev, currentFood.id]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (cardIndex < 9) {
      setCardIndex(prev => prev + 1);
    } else {
      setGameState('questions');
    }
    pan.setValue({ x: 0, y: 0 });
  };

  // ?깊뼢 ?ㅼ??댄봽 吏덈Ц 泥섎━
  const makeQuestionDecision = (choice: 'left' | 'right') => {
    setQuestionAnswers(prev => [...prev, choice]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (questionIndex < 2) {
      setQuestionIndex(prev => prev + 1);
    } else {
      setGameState('alcohol');
    }
    pan.setValue({ x: 0, y: 0 });
  };

  // 移대뱶 ?ㅼ??댄봽 ?쒖뒪泥??ㅼ젙
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dx > 120) {
          // ?ㅻⅨ履??ㅼ??댄봽
          Animated.timing(pan, {
            toValue: { x: SCREEN_WIDTH + 100, y: gestureState.dy },
            duration: 150,
            useNativeDriver: false,
          }).start(() => {
            if (gameState === 'swiping') {
              makeDecision(true);
            } else if (gameState === 'questions') {
              makeQuestionDecision('right');
            }
          });
        } else if (gestureState.dx < -120) {
          // ?쇱そ ?ㅼ??댄봽
          Animated.timing(pan, {
            toValue: { x: -SCREEN_WIDTH - 100, y: gestureState.dy },
            duration: 150,
            useNativeDriver: false,
          }).start(() => {
            if (gameState === 'swiping') {
              makeDecision(false);
            } else if (gameState === 'questions') {
              makeQuestionDecision('left');
            }
          });
        } else {
          // ?먮옒 ?꾩튂濡?蹂듦?
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 4,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // ?뚯떇 痍⑦뼢 ?ㅼ퐫??怨꾩궛 諛??곗씠??理쒖쥌 ???  const saveTastePreferenceData = async () => {
    if (!user) return;

    // 異붿쿇???ㅼ퐫??媛앹껜 珥덇린??    const scores = {
      meatScore: 0,
      seafoodScore: 0,
      spicyScore: 0,
      greasyScore: 0,
      cleanScore: 0,
    };

    // 1. ??Likes)??硫붾돱??諛섏쁺 (+1??
    likedFoods.forEach(foodId => {
      const item = POPULAR_FOODS.find(f => f.id === foodId);
      if (item) {
        if (item.labels.meat) scores.meatScore += 1;
        if (item.labels.seafood) scores.seafoodScore += 1;
        if (item.labels.spicy) scores.spicyScore += 1;
        if (item.labels.greasy) scores.greasyScore += 1;
        if (item.labels.clean) scores.cleanScore += 1;
      }
    });

    // 2. 遺덊샇(Dislikes)??硫붾돱??諛섏쁺 (-0.5??
    dislikedFoods.forEach(foodId => {
      const item = POPULAR_FOODS.find(f => f.id === foodId);
      if (item) {
        if (item.labels.meat) scores.meatScore -= 0.5;
        if (item.labels.seafood) scores.seafoodScore -= 0.5;
        if (item.labels.spicy) scores.spicyScore -= 0.5;
        if (item.labels.greasy) scores.greasyScore -= 0.5;
        if (item.labels.clean) scores.cleanScore -= 0.5;
      }
    });

    // 3. 3?④퀎 ?깊뼢 吏덈Ц 諛섏쁺
    // Q1: [?댁궛臾?(left) vs [?〓쪟](right)
    if (questionAnswers[0] === 'right') {
      scores.meatScore += 3;
      scores.seafoodScore -= 1;
    } else {
      scores.seafoodScore += 3;
      scores.meatScore -= 1;
    }

    // Q2: [?먮겮?쒓쾬](left) vs [源붾걫?쒓쾬](right)
    if (questionAnswers[1] === 'right') {
      scores.cleanScore += 3;
      scores.greasyScore -= 1;
    } else {
      scores.greasyScore += 3;
      scores.cleanScore -= 1;
    }

    // Q3: 留ㅼ슫寃?[紐삳㉨?붾떎](left) vs [?섎㉨?붾떎](right)
    if (questionAnswers[2] === 'right') {
      scores.spicyScore += 3;
    } else {
      // 留ㅼ슫 ?뚯떇 ?꾩삁 紐?癒밸뒗 ?좎?濡??ㅼ젙 (-10?쇰줈 留덊궧)
      scores.spicyScore = -10;
    }

    // 醫낇빀 痍⑦뼢 ?곗씠??痍⑦빀
    const updatedProfile: UserProfile = {
      ...user,
      hasCompletedFoodTasteTutorial: true,
      tastePreferences: {
        ...user.tastePreferences,
        hasAllergy: selectedAllergies.length > 0,
        allergyDetail: selectedAllergies.join(', '),
        alcoholLiquor: noAlcohol ? [] : selectedLiquors,
        preferredFoods: likedFoods,
        dislikedFoods: dislikedFoods,
        allergyFoods: selectedAllergies,
        chronicDiseases: selectedDiseases,
        customDislikedFoods: selectedDislikes,
        foodTasteScores: scores,
      }
    };

    const saved = await profileService.saveProfile(updatedProfile);
    setUser(saved as User);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setView('main');
    Alert.alert('遺꾩꽍 ?꾨즺', '?뚯떇 痍⑦뼢 ?뺣낫? 移댄뀒怨좊━ ?ㅼ퐫?닿? ??λ릺?덉뒿?덈떎!');
  };

  const getFoodTasteSummary = () => {
    if (!user || !user.hasCompletedFoodTasteTutorial || !user.tastePreferences.foodTasteScores) {
      return '?꾩쭅 ?ㅼ젙 ????;
    }
    const scores = user.tastePreferences.foodTasteScores;
    const summaries: string[] = [];

    // ?댁궛臾?vs ?〓쪟
    if (scores.meatScore > scores.seafoodScore) {
      summaries.push('?≪떇?뚴윥?);
    } else if (scores.seafoodScore > scores.meatScore) {
      summaries.push('?댁궛臾쇳뙆?뜠');
    }

    // ?먮겮 vs 源붾걫
    if (scores.cleanScore > scores.greasyScore) {
      summaries.push('源붾걫쨌?대갚??);
    } else if (scores.greasyScore > scores.cleanScore) {
      summaries.push('湲곕쫫吏??붾━??);
    }

    // 留듬???    if (scores.spicyScore >= 2) {
      summaries.push('留ㅼ슫留??뺥썑?뙳截?);
    } else if (scores.spicyScore < 0) {
      summaries.push('留듭컮?댑윑?);
    }

    // 紐?癒밸뒗 媛쒕퀎 ?뚯떇 ?붿빟
    if (user.tastePreferences.customDislikedFoods && user.tastePreferences.customDislikedFoods.length > 0) {
      summaries.push(`湲고뵾(${user.tastePreferences.customDislikedFoods[0]} ??`);
    }

    return summaries.join(', ') || '洹좏삎 ?≫엺 ?낅쭧';
  };

  if (loading || !user) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.loaderText}>?꾨줈???곗씠?곕? 遺덈윭?ㅺ퀬 ?덉뒿?덈떎...</Text>
      </View>
    );
  }

  // ?쒗넗由ъ뼹 吏꾪뻾 ?④퀎 怨꾩궛 (3??留뚯젏)
  let tutorialScore = 0;
  if (user.hasCompletedProfilePhotoTutorial) tutorialScore++;
  if (user.hasCompletedLocationTutorial) tutorialScore++;
  if (user.hasCompletedFoodTasteTutorial) tutorialScore++;
  const tutorialProgress = (tutorialScore / 3) * 100;

  // 移대뱶 ?뚯쟾 諛??몃옖?ㅽ뤌
  const rotate = pan.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ['-30deg', '0deg', '30deg'],
    extrapolate: 'clamp',
  });
  const swipeCardStyle = {
    transform: [...pan.getTranslateTransform(), { rotate }],
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      {view === 'main' && (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* 1. ?꾨줈???뺣낫 移대뱶 */}
          <View style={styles.profileCard}>
            <TouchableOpacity 
              style={[styles.avatarCircle, { backgroundColor: user.profileBgColor || '#BFDBFE' }]}
              onPress={() => setZoomModalVisible(true)}
              activeOpacity={0.9}
            >
              <Text style={styles.avatarEmoji}>{user.profileEmoji || '?쫨'}</Text>
            </TouchableOpacity>
            
            <Text style={styles.userName}>
              {user.nickname} <Text style={styles.userCode}>#{user.userTag}</Text>
            </Text>
            
            <View style={styles.divider} />

            {/* ?뷀뀒???꾨줈???붿냼??*/}
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color="#869B60" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>?앸뀈?붿씪</Text>
                <Text style={styles.detailValue}>{user.birthdate}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="transgender-outline" size={16} color="#869B60" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>?깅퀎</Text>
                <Text style={styles.detailValue}>{user.gender === 'MALE' ? '?⑥꽦' : '?ъ꽦'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color="#869B60" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>?щ뒗 怨?/Text>
                <Text style={[styles.detailValue, !user.location && styles.placeholderValue]}>
                  {user.location || '?꾩쭅 ?깅줉?섏? ?딆쓬'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="pizza-outline" size={16} color="#869B60" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>?뚯떇 痍⑦뼢</Text>
                <Text style={[styles.detailValue, !user.hasCompletedFoodTasteTutorial && styles.placeholderValue]}>
                  {getFoodTasteSummary()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="card-outline" size={16} color="#869B60" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>?뺤궛 怨꾩쥖</Text>
                <Text style={styles.detailValue}>{user.accountBank} {user.accountNumber}</Text>
              </View>
            </View>

            {/* ?섏젙 諛?濡쒓렇?꾩썐 踰꾪듉 */}
            <View style={styles.actionButtonGroup}>
              <TouchableOpacity style={styles.editBtn} onPress={() => setView('edit')} activeOpacity={0.7}>
                <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                <Text style={styles.editBtnText}>?꾨줈???섏젙</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                <Text style={styles.logoutBtnText}>濡쒓렇?꾩썐</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. 怨꾩젙 ?꾩꽦?섍린 ?쒗넗由ъ뼹 */}
          <View style={styles.tutorialCard}>
            <View style={styles.tutorialHeader}>
              <Text style={styles.tutorialTitle}>?렓 怨꾩젙 ?꾩꽦?섍린</Text>
              <Text style={styles.tutorialCount}>{tutorialScore} / 3 ?④퀎 ?꾨즺</Text>
            </View>
            
            {/* ?꾨줈洹몃젅??諛?*/}
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${tutorialProgress}%` }]} />
            </View>

            {/* ?④퀎 ??ぉ 1 */}
            <View style={styles.tutorialItem}>
              <View style={styles.tutorialItemLeft}>
                <View style={[styles.checkCircle, user.hasCompletedProfilePhotoTutorial && styles.checkCircleActive]}>
                  {user.hasCompletedProfilePhotoTutorial && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <View style={styles.tutorialTextContainer}>
                  <Text style={styles.tutorialItemName}>?꾨줈???ъ쭊 ?섏젙</Text>
                  <Text style={styles.tutorialItemDesc}>?섎쭔??怨좎쑀 ?대え吏? 諛곌꼍?됱쓣 ?섏젙??蹂댁꽭??</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.tutorialBtn, user.hasCompletedProfilePhotoTutorial && styles.tutorialBtnDone]}
                onPress={() => setView('edit')}
                disabled={user.hasCompletedProfilePhotoTutorial}
              >
                <Text style={[styles.tutorialBtnText, user.hasCompletedProfilePhotoTutorial && styles.tutorialBtnTextDone]}>
                  {user.hasCompletedProfilePhotoTutorial ? '?꾨즺?? : '?섏젙?섍린'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ?④퀎 ??ぉ 2 */}
            <View style={styles.tutorialItem}>
              <View style={styles.tutorialItemLeft}>
                <View style={[styles.checkCircle, user.hasCompletedLocationTutorial && styles.checkCircleActive]}>
                  {user.hasCompletedLocationTutorial && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <View style={styles.tutorialTextContainer}>
                  <Text style={styles.tutorialItemName}>?щ뒗 怨??ㅼ젙</Text>
                  <Text style={styles.tutorialItemDesc}>二쇱깮??吏??쓣 ?ㅼ젙??紐⑥엫 以묎컙?μ냼瑜??뺤씤?대낫?몄슂.</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.tutorialBtn, user.hasCompletedLocationTutorial && styles.tutorialBtnDone]}
                onPress={() => setView('edit')}
                disabled={user.hasCompletedLocationTutorial}
              >
                <Text style={[styles.tutorialBtnText, user.hasCompletedLocationTutorial && styles.tutorialBtnTextDone]}>
                  {user.hasCompletedLocationTutorial ? '?꾨즺?? : '?ㅼ젙?섍린'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ?④퀎 ??ぉ 3 */}
            <View style={styles.tutorialItem}>
              <View style={styles.tutorialItemLeft}>
                <View style={[styles.checkCircle, user.hasCompletedFoodTasteTutorial && styles.checkCircleActive]}>
                  {user.hasCompletedFoodTasteTutorial && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <View style={styles.tutorialTextContainer}>
                  <Text style={styles.tutorialItemName}>?뚯떇 痍⑦뼢 ?ㅼ젙</Text>
                  <Text style={styles.tutorialItemDesc}>?ㅼ??댄봽 寃뚯엫?쇰줈 30媛吏 ?뚯떇 ???좏샇瑜??ㅼ젙?섏꽭??</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.tutorialBtn, user.hasCompletedFoodTasteTutorial && styles.tutorialBtnDone]}
                onPress={startTasteFinder}
              >
                <Text style={[styles.tutorialBtnText, user.hasCompletedFoodTasteTutorial && styles.tutorialBtnTextDone]}>
                  {user.hasCompletedFoodTasteTutorial ? '?ㅼ떆?섍린' : '痍⑦뼢 李얘린'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {view === 'edit' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.editCard}>
              <Text style={styles.cardTitle}>?꾨줈???뺣낫 ?섏젙</Text>

              {/* 1. ?꾨줈???대?吏 ?쇱빱 */}
              <Text style={styles.sectionLabel}>?섎쭔???꾨줈???대?吏 留뚮뱾湲?/Text>
              <View style={styles.pickerSection}>
                <View style={[styles.avatarPreviewCircle, { backgroundColor: editBgColor }]}>
                  <Text style={styles.avatarPreviewEmoji}>{editEmoji}</Text>
                </View>

                {/* ?대え吏 ?좏깮 */}
                <Text style={styles.subSectionLabel}>?대え吏 ?좏깮</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiList}>
                  {[...MALE_EMOJIS, ...FEMALE_EMOJIS, ...NEUTRAL_EMOJIS].map((emoji, idx) => (
                    <TouchableOpacity 
                      key={`emoji-${idx}`} 
                      style={[styles.emojiPickItem, editEmoji === emoji && styles.emojiPickItemActive]}
                      onPress={() => setEditEmoji(emoji)}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* 諛곌꼍???좏깮 */}
                <Text style={styles.subSectionLabel}>諛곌꼍 ?됱긽 ?좏깮</Text>
                <View style={styles.colorGrid}>
                  {PROFILE_BG_COLORS.map((color, idx) => (
                    <TouchableOpacity 
                      key={`color-${idx}`} 
                      style={[styles.colorPickItem, { backgroundColor: color }, editBgColor === color && styles.colorPickItemActive]}
                      onPress={() => setEditBgColor(color)}
                    />
                  ))}
                </View>
              </View>

              {/* 2. ?쇰컲 ?뺣낫 ?섏젙 */}
              <View style={styles.divider} />
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>?됰꽕??/Text>
                <TextInput
                  style={styles.textInput}
                  value={editNickname}
                  onChangeText={setEditNickname}
                  placeholder="?됰꽕???낅젰"
                  placeholderTextColor="#94A3B8"
                  maxLength={6}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>鍮꾨?踰덊샇 蹂寃?/Text>
                <TextInput
                  style={styles.textInput}
                  value={editPassword}
                  onChangeText={setEditPassword}
                  placeholder="鍮꾨?踰덊샇 蹂寃?(4?먮━ ?댁긽)"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>?щ뒗 怨?(?꾩떆/???⑥쐞 ?낅젰)</Text>
                <TextInput
                  style={styles.textInput}
                  value={editLocation}
                  onChangeText={setEditLocation}
                  placeholder="?? ?쒖슱??留덊룷援?
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>?앸뀈?붿씪 (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  value={editBirthdate}
                  onChangeText={setEditBirthdate}
                  placeholder="?? 2000-01-01"
                  placeholderTextColor="#94A3B8"
                  maxLength={10}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>?깅퀎</Text>
                <View style={styles.genderContainer}>
                  {(['MALE', 'FEMALE'] as Gender[]).map(g => (
                    <TouchableOpacity 
                      key={g} 
                      style={[styles.genderBtnItem, editGender === g && styles.genderBtnItemActive]}
                      onPress={() => setEditGender(g)}
                    >
                      <Text style={[styles.genderBtnText, editGender === g && styles.genderBtnTextActive]}>
                        {g === 'MALE' ? '?솇?띯셽截??⑥꽦' : '?솇?띯?截??ъ꽦'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 3. 怨꾩쥖 ?뺣낫 ?섏젙 */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>?뺤궛 ???/Text>
                <TouchableOpacity
                  style={styles.bankSelectButton}
                  onPress={() => setShowBankPicker(!showBankPicker)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.bankSelectText, !editBank && styles.bankSelectPlaceholder]}>
                    {editBank || '????좏깮'}
                  </Text>
                  <Ionicons name={showBankPicker ? 'chevron-up' : 'chevron-down'} size={18} color="#94A3B8" />
                </TouchableOpacity>
                {showBankPicker && (
                  <View style={styles.bankPickerDropdown}>
                    {BANKS.map((bank) => (
                      <TouchableOpacity
                        key={bank}
                        style={styles.bankPickerItem}
                        onPress={() => {
                          setEditBank(bank);
                          setShowBankPicker(false);
                        }}
                      >
                        <Text style={styles.bankPickerItemText}>{bank}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>怨꾩쥖踰덊샇</Text>
                <TextInput
                  style={styles.textInput}
                  value={editAccountNumber}
                  onChangeText={setEditAccountNumber}
                  placeholder="怨꾩쥖踰덊샇 ?낅젰"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              </View>

              {/* ???諛?痍⑥냼 */}
              <View style={styles.editFooter}>
                <TouchableOpacity style={styles.saveActionBtn} onPress={handleSaveProfile} activeOpacity={0.8}>
                  <Text style={styles.saveActionBtnText}>??ν븯湲?/Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelActionBtn} onPress={() => setView('main')} activeOpacity={0.8}>
                  <Text style={styles.cancelActionBtnText}>痍⑥냼</Text>
                </TouchableOpacity>
              </View>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {view === 'food_taste' && (
        <View style={styles.gameContainer}>
          {gameState === 'intro' && (
            <Animated.View style={[styles.introOverlay, { opacity: introOpacity }]}>
              <View style={styles.introContent}>
                <Ionicons name="sparkles-outline" size={60} color="#869B60" style={styles.introIcon} />
                <Text style={styles.introTitle}>?몃뱶 痍⑦뼢 遺꾩꽍</Text>
                <Text style={styles.introSubtitle}>
                  ?닿? 醫뗭븘?섎뒗 ?뚯떇 痍⑦뼢??李얠븘蹂댁꽭??{"\n"}?ㅻⅨ履??? ?먮뒗 ?쇱そ(遺덊샇)?쇰줈 ?ㅼ??댄봽!
                </Text>
              </View>
            </Animated.View>
          )}

          {gameState === 'swiping' && gameFoods.length > 0 && (
            <View style={styles.swipeContainer}>
              <Text style={styles.gameHeaderTitle}>?뜴 ?뚯떇 ?좏샇??留ㅼ묶 ({cardIndex + 1} / 10)</Text>
              
              <View style={styles.cardStackContainer}>
                {/* ?ㅼ쓬 移대뱶 (?뺤쟻 酉곕줈 ?ㅼ뿉 諛곗튂) */}
                {cardIndex < 9 && (
                  <View style={[styles.foodCard, styles.nextFoodCard]}>
                    <Text style={styles.foodCardEmoji}>{gameFoods[cardIndex + 1].emoji}</Text>
                    <Text style={styles.foodCardName}>{gameFoods[cardIndex + 1].name}</Text>
                    <View style={styles.foodTagsRow}>
                      {Object.keys(gameFoods[cardIndex + 1].labels).map(lbl => {
                        if (lbl === 'meat' && gameFoods[cardIndex + 1].labels.meat) return <Text key={lbl} style={styles.foodTag}>#?〓쪟</Text>;
                        if (lbl === 'seafood' && gameFoods[cardIndex + 1].labels.seafood) return <Text key={lbl} style={styles.foodTag}>#?댁궛臾?/Text>;
                        if (lbl === 'spicy' && gameFoods[cardIndex + 1].labels.spicy) return <Text key={lbl} style={styles.foodTag}>#留ㅼ숴</Text>;
                        if (lbl === 'greasy' && gameFoods[cardIndex + 1].labels.greasy) return <Text key={lbl} style={styles.foodTag}>#?먮겮</Text>;
                        if (lbl === 'clean' && gameFoods[cardIndex + 1].labels.clean) return <Text key={lbl} style={styles.foodTag}>#源붾걫</Text>;
                        return null;
                      })}
                    </View>
                  </View>
                )}

                {/* ?꾩옱 ?ㅼ??댄봽 ?쒖꽦 移대뱶 */}
                <Animated.View style={[styles.foodCard, swipeCardStyle]} {...panResponder.panHandlers}>
                  <Text style={styles.foodCardEmoji}>{gameFoods[cardIndex].emoji}</Text>
                  <Text style={styles.foodCardName}>{gameFoods[cardIndex].name}</Text>
                  
                  <View style={styles.foodTagsRow}>
                    {Object.keys(gameFoods[cardIndex].labels).map(lbl => {
                      if (lbl === 'meat' && gameFoods[cardIndex].labels.meat) return <Text key={lbl} style={styles.foodTag}>#?〓쪟</Text>;
                      if (lbl === 'seafood' && gameFoods[cardIndex].labels.seafood) return <Text key={lbl} style={styles.foodTag}>#?댁궛臾?/Text>;
                      if (lbl === 'spicy' && gameFoods[cardIndex].labels.spicy) return <Text key={lbl} style={styles.foodTag}>#留ㅼ숴</Text>;
                      if (lbl === 'greasy' && gameFoods[cardIndex].labels.greasy) return <Text key={lbl} style={styles.foodTag}>#?먮겮</Text>;
                      if (lbl === 'clean' && gameFoods[cardIndex].labels.clean) return <Text key={lbl} style={styles.foodTag}>#源붾걫</Text>;
                      return null;
                    })}
                  </View>
                </Animated.View>
              </View>

              {/* O / X ?묎렐????踰꾪듉 */}
              <View style={styles.gameButtonRow}>
                <TouchableOpacity style={[styles.gameBtnCircle, styles.btnDislike]} onPress={() => makeDecision(false)}>
                  <Ionicons name="close" size={32} color="#EF4444" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.gameBtnCircle, styles.btnLike]} onPress={() => makeDecision(true)}>
                  <Ionicons name="heart" size={32} color="#10B981" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {gameState === 'questions' && (
            <View style={styles.swipeContainer}>
              <Text style={styles.gameHeaderTitle}>?쭬 ?낅쭧 移댄뀒怨좊━ 臾몃떟 ({questionIndex + 1} / 3)</Text>
              
              <View style={styles.cardStackContainer}>
                <Animated.View style={[styles.foodCard, swipeCardStyle]} {...panResponder.panHandlers}>
                  <Text style={styles.questionIconEmoji}>
                    {questionIndex === 0 ? '?쬇?ⅸ' : (questionIndex === 1 ? '?뜒?쪞' : '?뙳截륆윂?)}
                  </Text>
                  
                  {questionIndex === 0 && (
                    <View style={styles.questionCardBody}>
                      <Text style={styles.questionTitle}>?댁궛臾?vs ?〓쪟</Text>
                      <Text style={styles.questionInstruction}>?쇱そ?쇰줈 諛硫??댁궛臾??좏샇,{"\n"}?ㅻⅨ履쎌쑝濡?諛硫??〓쪟 ?좏샇!</Text>
                      <View style={styles.choiceLabels}>
                        <Text style={styles.choiceLeft}>?몚 ?댁궛臾?/Text>
                        <Text style={styles.choiceRight}>?〓쪟 ?몛</Text>
                      </View>
                    </View>
                  )}

                  {questionIndex === 1 && (
                    <View style={styles.questionCardBody}>
                      <Text style={styles.questionTitle}>?먮겮??留?vs 源붾걫??留?/Text>
                      <Text style={styles.questionInstruction}>?쇱そ?쇰줈 諛硫??먮겮??湲곕쫫吏?留??좏샇,{"\n"}?ㅻⅨ履쎌쑝濡?諛硫?源붾걫?섍퀬 媛踰쇱슫 留??좏샇!</Text>
                      <View style={styles.choiceLabels}>
                        <Text style={styles.choiceLeft}>?몚 ?먮겮??留?/Text>
                        <Text style={styles.choiceRight}>源붾걫??留??몛</Text>
                      </View>
                    </View>
                  )}

                  {questionIndex === 2 && (
                    <View style={styles.questionCardBody}>
                      <Text style={styles.questionTitle}>留ㅼ슫 ?뚯떇 痍⑦뼢</Text>
                      <Text style={styles.questionInstruction}>?쇱そ?쇰줈 諛硫?留ㅼ슫 ?뚯떇??紐?癒밸뒗??{"\n"}?ㅻⅨ履쎌쑝濡?諛硫???癒밸뒗??</Text>
                      <View style={styles.choiceLabels}>
                        <Text style={styles.choiceLeft}>?몚 紐?癒뱀뼱??/Text>
                        <Text style={styles.choiceRight}>??癒뱀뼱???몛</Text>
                      </View>
                    </View>
                  )}
                </Animated.View>
              </View>

              {/* ?섎룞 踰꾪듉 */}
              <View style={styles.gameButtonRow}>
                <TouchableOpacity 
                  style={[styles.questionChoiceBtn, { backgroundColor: '#E2E8F0' }]} 
                  onPress={() => makeQuestionDecision('left')}
                >
                  <Text style={styles.questionChoiceText}>
                    {questionIndex === 0 ? '?댁궛臾? : (questionIndex === 1 ? '?먮겮??留? : '紐?癒뱀뼱??)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.questionChoiceBtn, { backgroundColor: '#869B60' }]} 
                  onPress={() => makeQuestionDecision('right')}
                >
                  <Text style={[styles.questionChoiceText, { color: '#FFFFFF' }]}>
                    {questionIndex === 0 ? '?〓쪟' : (questionIndex === 1 ? '源붾걫??留? : '??癒뱀뼱??)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {gameState === 'alcohol' && (
            <View style={styles.alcoholContainer}>
              <Text style={styles.alcoholHeaderTitle}>?뜿 ?좏샇?섎뒗 二쇱쥌 ?ㅼ젙</Text>
              <Text style={styles.alcoholSubtitle}>留뚮굹???먮━?먯꽌 ?좏샇?섎뒗 二쇱쥌???좏깮??二쇱꽭??(以묐났 ?좏깮 媛??</Text>
              
              <View style={styles.liquorCard}>
                {[
                  { label: '?뚯＜', value: 'SOJU' },
                  { label: '留μ＜', value: 'BEER' },
                  { label: '移듯뀒??, value: 'COCKTAIL' },
                  { label: '?꾩뒪???묒＜', value: 'WHISKEY' },
                  { label: '???, value: 'WINE' },
                  { label: '怨좊웾二?, value: 'HIGH_ALCOHOL' },
                  { label: '留됯구由?, value: 'MAKGEOLLI' },
                ].map((liq) => {
                  const isChecked = selectedLiquors.includes(liq.value as AlcoholLiquor);
                  return (
                    <TouchableOpacity 
                      key={liq.value} 
                      style={[styles.liquorItem, isChecked && styles.liquorItemChecked, noAlcohol && styles.liquorItemDisabled]}
                      onPress={() => {
                        if (noAlcohol) return;
                        setSelectedLiquors(prev => 
                          prev.includes(liq.value as AlcoholLiquor) 
                            ? prev.filter(v => v !== liq.value) 
                            : [...prev, liq.value as AlcoholLiquor]
                        );
                      }}
                      disabled={noAlcohol}
                    >
                      <Text style={[styles.liquorLabel, isChecked && styles.liquorLabelChecked]}>{liq.label}</Text>
                      {isChecked && <Ionicons name="checkmark-circle" size={20} color="#869B60" />}
                    </TouchableOpacity>
                  );
                })}

                <View style={styles.divider} />
                
                <TouchableOpacity 
                  style={[styles.noAlcoholToggle, noAlcohol && styles.noAlcoholToggleActive]}
                  onPress={() => {
                    setNoAlcohol(!noAlcohol);
                    if (!noAlcohol) {
                      setSelectedLiquors([]);
                    }
                  }}
                >
                  <Text style={[styles.noAlcoholText, noAlcohol && styles.noAlcoholTextActive]}>
                    ???좎쓣 ??留덉뀛??/ 紐?留덉떗?덈떎.
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.alcoholFooter}>
                <TouchableOpacity 
                  style={[styles.alcoholNextBtn, (!noAlcohol && selectedLiquors.length === 0) && styles.alcoholNextBtnDisabled]}
                  onPress={() => setGameState('result')}
                  disabled={!noAlcohol && selectedLiquors.length === 0}
                >
                  <Text style={styles.alcoholNextBtnText}>?ㅼ쓬 ?④퀎濡??몛</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {gameState === 'result' && (
            <ScrollView contentContainerStyle={styles.resultContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.resultCheckHeader}>
                <View style={styles.checkmarkBadge}>
                  <Ionicons name="checkmark" size={40} color="#FFFFFF" />
                </View>
                <Text style={styles.resultTitle}>?뱀떊??痍⑦뼢????λ릺?덉뒿?덈떎!</Text>
                <Text style={styles.resultSubtitle}>
                  異붿쿇 ?뚯떇 ?꾪꽣留곸뿉 諛섏쁺?섍린 ?꾪빐 ?뚮젅瑜닿린, 吏蹂? ?먮뒗 紐?癒밸뒗 湲고뵾 ?뚯떇??異붽? ?낅젰??二쇱꽭??
                </Text>
              </View>

              {/* ?뚮젅瑜닿린 ?꾩퐫?붿뼵 */}
              <View style={styles.accordionCard}>
                <TouchableOpacity 
                  style={styles.accordionHeader} 
                  onPress={() => setExpandedSection(prev => prev === 'allergy' ? null : 'allergy')}
                >
                  <Text style={styles.accordionTitle}>?슚 ?앺뭹 ?뚮젅瑜닿린 ?щ? ({selectedAllergies.length})</Text>
                  <Ionicons name={expandedSection === 'allergy' ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
                </TouchableOpacity>
                {expandedSection === 'allergy' && (
                  <View style={styles.accordionContent}>
                    <View style={styles.tagSelector}>
                      {ALLERGEN_OPTIONS.map(opt => {
                        const isSelected = selectedAllergies.includes(opt);
                        return (
                          <TouchableOpacity 
                            key={opt}
                            style={[styles.tagSelectorItem, isSelected && styles.tagSelectorItemActive]}
                            onPress={() => setSelectedAllergies(prev => 
                              prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
                            )}
                          >
                            <Text style={[styles.tagSelectorText, isSelected && styles.tagSelectorTextActive]}>{opt}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              {/* 吏蹂??꾩퐫?붿뼵 */}
              <View style={styles.accordionCard}>
                <TouchableOpacity 
                  style={styles.accordionHeader} 
                  onPress={() => setExpandedSection(prev => prev === 'disease' ? null : 'disease')}
                >
                  <Text style={styles.accordionTitle}>?㈉ 嫄닿컯??吏蹂??щ? ({selectedDiseases.length})</Text>
                  <Ionicons name={expandedSection === 'disease' ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
                </TouchableOpacity>
                {expandedSection === 'disease' && (
                  <View style={styles.accordionContent}>
                    <View style={styles.tagSelector}>
                      {CHRONIC_DISEASE_OPTIONS.map(opt => {
                        const isSelected = selectedDiseases.includes(opt);
                        return (
                          <TouchableOpacity 
                            key={opt}
                            style={[styles.tagSelectorItem, isSelected && styles.tagSelectorItemActive]}
                            onPress={() => setSelectedDiseases(prev => 
                              prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
                            )}
                          >
                            <Text style={[styles.tagSelectorText, isSelected && styles.tagSelectorTextActive]}>{opt}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              {/* 紐?癒밸뒗 ?뚯떇 ?꾩퐫?붿뼵 */}
              <View style={styles.accordionCard}>
                <TouchableOpacity 
                  style={styles.accordionHeader} 
                  onPress={() => setExpandedSection(prev => prev === 'dislike' ? null : 'dislike')}
                >
                  <Text style={styles.accordionTitle}>?쪙 ?덈? 紐?癒밸뒗 ?뚯떇 湲고뵾 ({selectedDislikes.length})</Text>
                  <Ionicons name={expandedSection === 'dislike' ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
                </TouchableOpacity>
                {expandedSection === 'dislike' && (
                  <View style={styles.accordionContent}>
                    <View style={styles.tagSelector}>
                      {DETAILED_DISLIKE_OPTIONS.map(opt => {
                        const isSelected = selectedDislikes.includes(opt);
                        return (
                          <TouchableOpacity 
                            key={opt}
                            style={[styles.tagSelectorItem, isSelected && styles.tagSelectorItemActive]}
                            onPress={() => setSelectedDislikes(prev => 
                              prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
                            )}
                          >
                            <Text style={[styles.tagSelectorText, isSelected && styles.tagSelectorTextActive]}>{opt}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              {/* ?꾨즺 ?섎떒 踰꾪듉 */}
              <View style={styles.resultFooter}>
                <TouchableOpacity style={styles.retakeBtn} onPress={startTasteFinder} activeOpacity={0.8}>
                  <Text style={styles.retakeBtnText}>?ㅼ떆?섍린</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={saveTastePreferenceData} activeOpacity={0.8}>
                  <Text style={styles.submitBtnText}>紐⑤몢 ??ν븯湲?/Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          )}

        </View>
      )}

      {/* ????꾨줈??以??앹뾽 紐⑤떖 */}
      <Modal visible={zoomModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismissArea} onPress={() => setZoomModalVisible(false)} />
          <View style={styles.zoomModalContent}>
            
            <View style={[styles.largeAvatarCircle, { backgroundColor: user.profileBgColor || '#BFDBFE' }]}>
              <Text style={styles.largeAvatarEmoji}>{user.profileEmoji || '?쫨'}</Text>
            </View>
            
            <Text style={styles.largeUserName}>{user.nickname} <Text style={styles.largeUserCode}>#{user.userTag}</Text></Text>
            
            <View style={styles.zoomModalButtons}>
              <TouchableOpacity 
                style={styles.zoomEditBtn} 
                onPress={() => {
                  setZoomModalVisible(false);
                  setView('edit');
                }}
              >
                <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                <Text style={styles.zoomEditBtnText}>?꾨줈???섏젙?섍린</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.zoomCloseBtn} onPress={() => setZoomModalVisible(false)}>
                <Text style={styles.zoomCloseBtnText}>?リ린</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F3EA',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#F4F3EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarEmoji: {
    fontSize: 50,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  userCode: {
    fontSize: 15,
    fontWeight: '600',
    color: '#869B60',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    width: '100%',
    marginVertical: 18,
  },
  detailsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 10,
    width: 20,
    textAlign: 'center',
  },
  detailLabel: {
    width: 70,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  placeholderValue: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  editBtn: {
    flex: 1.6,
    backgroundColor: '#869B60',
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.02)',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  tutorialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
  },
  tutorialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tutorialTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  tutorialCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#869B60',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#869B60',
    borderRadius: 3,
  },
  tutorialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  tutorialItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleActive: {
    backgroundColor: '#869B60',
    borderColor: '#869B60',
  },
  tutorialTextContainer: {
    flex: 1,
  },
  tutorialItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  tutorialItemDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  tutorialBtn: {
    backgroundColor: '#869B60',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tutorialBtnDone: {
    backgroundColor: '#F1F5F9',
  },
  tutorialBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tutorialBtnTextDone: {
    color: '#94A3B8',
  },
  editCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 10,
  },
  pickerSection: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  avatarPreviewCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarPreviewEmoji: {
    fontSize: 40,
  },
  subSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    alignSelf: 'flex-start',
    marginBottom: 6,
    marginTop: 8,
  },
  emojiList: {
    width: '100%',
    paddingVertical: 4,
    marginBottom: 10,
  },
  emojiPickItem: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  emojiPickItemActive: {
    borderColor: '#869B60',
    backgroundColor: 'rgba(134, 155, 96, 0.1)',
  },
  emojiText: {
    fontSize: 22,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
    width: '100%',
  },
  colorPickItem: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  colorPickItemActive: {
    borderColor: '#1E293B',
    borderWidth: 2,
  },
  inputGroup: {
    marginBottom: 16,
    width: '100%',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1.5,
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1E293B',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderBtnItem: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderBtnItemActive: {
    backgroundColor: 'rgba(134, 155, 96, 0.15)',
    borderColor: '#869B60',
  },
  genderBtnText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  genderBtnTextActive: {
    color: '#869B60',
  },
  bankSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1.5,
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 16,
  },
  bankSelectText: {
    fontSize: 14,
    color: '#1E293B',
  },
  bankSelectPlaceholder: {
    color: '#94A3B8',
  },
  bankPickerDropdown: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1.5,
    borderRadius: 12,
    marginTop: 6,
    paddingVertical: 4,
  },
  bankPickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  bankPickerItemText: {
    fontSize: 14,
    color: '#1E293B',
  },
  editFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  saveActionBtn: {
    flex: 2,
    backgroundColor: '#869B60',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelActionBtn: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelActionBtnText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
  gameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F3EA',
  },
  introOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F4F3EA',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  introContent: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  introIcon: {
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 10,
  },
  introSubtitle: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '600',
  },
  swipeContainer: {
    width: '100%',
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    alignSelf: 'center',
  },
  cardStackContainer: {
    width: '100%',
    height: 380,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  foodCard: {
    position: 'absolute',
    width: SCREEN_WIDTH - 64,
    height: 350,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 8,
  },
  nextFoodCard: {
    zIndex: -1,
    transform: [{ scale: 0.95 }, { translateY: 15 }],
    opacity: 0.6,
  },
  foodCardEmoji: {
    fontSize: 110,
    marginBottom: 20,
  },
  foodCardName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 14,
  },
  foodTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  foodTag: {
    fontSize: 13,
    color: '#869B60',
    backgroundColor: 'rgba(134, 155, 96, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '700',
  },
  gameButtonRow: {
    flexDirection: 'row',
    gap: 40,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  gameBtnCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  btnLike: {
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  btnDislike: {
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  questionIconEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  questionCardBody: {
    alignItems: 'center',
    width: '100%',
  },
  questionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 10,
  },
  questionInstruction: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  choiceLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  choiceLeft: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  choiceRight: {
    fontSize: 14,
    fontWeight: '700',
    color: '#869B60',
  },
  questionChoiceBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionChoiceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  alcoholContainer: {
    flex: 1,
    width: '100%',
    padding: 24,
    justifyContent: 'space-between',
  },
  alcoholHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
    textAlign: 'center',
    marginTop: 10,
  },
  alcoholSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  liquorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  liquorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  liquorItemChecked: {
    backgroundColor: 'rgba(134, 155, 96, 0.05)',
  },
  liquorItemDisabled: {
    opacity: 0.3,
  },
  liquorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  liquorLabelChecked: {
    color: '#869B60',
    fontWeight: '800',
  },
  noAlcoholToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginTop: 10,
  },
  noAlcoholToggleActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  noAlcoholText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  noAlcoholTextActive: {
    color: '#EF4444',
  },
  alcoholFooter: {
    width: '100%',
    marginTop: 10,
  },
  alcoholNextBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#869B60',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alcoholNextBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  alcoholNextBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  resultContainer: {
    padding: 24,
    paddingBottom: 40,
    width: '100%',
  },
  resultCheckHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  checkmarkBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 8,
  },
  resultSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
    paddingHorizontal: 10,
  },
  accordionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  accordionContent: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  tagSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagSelectorItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  tagSelectorItemActive: {
    backgroundColor: 'rgba(134, 155, 96, 0.15)',
    borderColor: '#869B60',
  },
  tagSelectorText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  tagSelectorTextActive: {
    color: '#869B60',
    fontWeight: '800',
  },
  resultFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  retakeBtn: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retakeBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 2,
    backgroundColor: '#869B60',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  zoomModalContent: {
    width: SCREEN_WIDTH - 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  largeAvatarCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 4,
    borderColor: '#F8FAFC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  largeAvatarEmoji: {
    fontSize: 90,
  },
  largeUserName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 20,
  },
  largeUserCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#869B60',
  },
  zoomModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  zoomEditBtn: {
    flex: 1.8,
    backgroundColor: '#869B60',
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  zoomEditBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  zoomCloseBtn: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomCloseBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
});
