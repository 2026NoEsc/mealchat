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
import { Mail, Lock, LogIn, UserPlus } from 'lucide-react-native';
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
        <View style={styles.card}>
          {/* Logo / Header */}
          <View style={styles.header}>
            <MealChatLogo size={80} />
            <Text style={styles.logoText}>밀챗</Text>
            <Text style={styles.subtitle}>
              {isSignUp ? '간편 회원가입으로 일정 조율 시작하기' : '로그인하여 친구들과 밀챗을 맞춰 보세요'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>이메일 주소</Text>
              <View style={styles.inputWrapper}>
                <Mail size={16} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="example@email.com"
                  placeholderTextColor="#64748b"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>비밀번호 (6자리 이상)</Text>
              <View style={styles.inputWrapper}>
                <Lock size={16} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#64748b"
                  secureTextEntry={true}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isSignUp ? styles.signUpBtn : styles.signInBtn]}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <View style={styles.buttonRow}>
                  {isSignUp ? <UserPlus size={16} color="white" /> : <LogIn size={16} color="white" />}
                  <Text style={styles.submitButtonText}>
                    {isSignUp ? ' 회원가입 및 시작하기' : ' 로그인하기'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Switch Tab Link */}
          <TouchableOpacity
            style={styles.switchLink}
            onPress={() => setIsSignUp(!isSignUp)}
            disabled={loading}
          >
            <Text style={styles.switchLinkText}>
              {isSignUp ? '이미 계정이 있으신가요? 로그인하기' : '계정이 없으신가요? 회원가입하기'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
    justifyContent: 'center'
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24
  },
  card: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16
  },
  header: {
    alignItems: 'center',
    marginBottom: 28
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.text,
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: 12,
    color: THEME.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18
  },
  form: {
    gap: 16
  },
  inputGroup: {
    marginBottom: 12
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.textMuted,
    marginBottom: 6
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.input,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    paddingHorizontal: 12
  },
  inputIcon: {
    marginRight: 8
  },
  textInput: {
    flex: 1,
    color: THEME.text,
    paddingVertical: 12,
    fontSize: 14
  },
  submitButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12
  },
  signInBtn: {
    backgroundColor: THEME.primary
  },
  signUpBtn: {
    backgroundColor: THEME.primaryPressed
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4
  },
  submitButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  },
  switchLink: {
    alignItems: 'center',
    marginTop: 20
  },
  switchLinkText: {
    color: THEME.textMuted,
    fontSize: 12,
    textDecorationLine: 'underline'
  }
});
