import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { MealChatLogo } from './MealChatLogo';
import { Button } from './Button';
import { supabase } from '../lib/supabaseClient';
import { THEME } from '../lib/theme';

interface AuthScreenProps {
  onAuthSuccess: (userId: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('오류', '이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        if (data.user) {
          Alert.alert('가입 완료', '인증 이메일이 발송되었거나 회원가입이 완료되었습니다.');
          setIsSignUp(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        if (data.user) {
          onAuthSuccess(data.user.id);
        }
      }
    } catch (error: any) {
      Alert.alert('인증 실패', error.message || '인증 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* 상단 제목 — Figma `Onboarding/Login`(150:124) */}
        <View style={styles.topBar}>
          {isSignUp ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setIsSignUp(false)}
              disabled={loading}
              accessibilityLabel="로그인으로"
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backSpacer} />
          )}
          <Text style={styles.screenTitle}>{isSignUp ? '회원가입' : '로그인'}</Text>
        </View>

        {/* 브랜드 */}
        <View style={styles.brand}>
          <MealChatLogo size={56} />
          <Text style={styles.wordmark}>mealchat</Text>
          <Text style={styles.greeting}>
            {isSignUp ? '몇 가지만 적으면 바로 시작해요' : '다시 오셨네요, 반가워요!'}
          </Text>
        </View>

        {/* 입력 */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>아이디</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              placeholderTextColor={THEME.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="6자리 이상"
              placeholderTextColor={THEME.textTertiary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {loading ? (
            <View style={styles.loadingButton}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          ) : (
            <Button
              variant="accent"
              label={isSignUp ? '회원가입' : '로그인'}
              onPress={handleAuth}
            />
          )}
        </View>

        {/* 전환 / 도움말 */}
        <TouchableOpacity style={styles.switchLink} onPress={() => setIsSignUp(!isSignUp)} disabled={loading}>
          <Text style={styles.switchText}>
            {isSignUp ? '이미 계정이 있나요?' : '아직 계정이 없나요?'}{'  '}
            <Text style={styles.switchAccent}>{isSignUp ? '로그인' : '회원가입'}</Text>
          </Text>
        </TouchableOpacity>

        {!isSignUp && <Text style={styles.helpText}>아이디 비밀번호 찾기</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.surface,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 28,
    height: 26,
    borderRadius: 6,
    backgroundColor: THEME.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A9A9A9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 1,
  },
  backButtonText: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  backSpacer: {
    width: 28,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.text,
  },
  brand: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 44,
    paddingBottom: 28,
  },
  wordmark: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.accentSoft,
    marginTop: 6,
  },
  greeting: {
    fontSize: 12,
    color: THEME.unitMuted,
    marginTop: 2,
  },
  form: {
    gap: 14,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.labelMuted,
  },
  input: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: THEME.card,
    color: THEME.text,
    fontSize: 13,
    shadowColor: '#A9A9A9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 1,
  },
  loadingButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: THEME.accentGradientStart,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchLink: {
    alignItems: 'center',
    paddingTop: 22,
  },
  switchText: {
    fontSize: 12,
    color: THEME.labelMuted,
  },
  switchAccent: {
    fontWeight: 'bold',
    color: THEME.accentSoft,
  },
  helpText: {
    fontSize: 12,
    color: THEME.labelMuted,
    textAlign: 'center',
    paddingTop: 12,
  },
});

export default AuthScreen;
