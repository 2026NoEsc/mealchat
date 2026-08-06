import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { DutchPay } from '../components/DutchPay';
import { THEME } from '../lib/theme';
import { useAuth, useNavigation } from '../contexts';

/**
 * 방 밖에서 여는 "나의 N빵 정산 대장".
 *
 * 방이 폭파된 뒤에도 남아 있는 미완료 정산을 보기 위한 화면이라
 * roomId 없이 DutchPay 를 띄웁니다.
 */
interface GlobalDutchPayModalProps {
  /** 아래로 쓸어 닫기 위한 PanResponder (App.tsx 에서 생성) */
  panHandlers: any;
}

const GlobalDutchPayModal: React.FC<GlobalDutchPayModalProps> = ({ panHandlers }) => {
  const { globalProfile } = useAuth();
  const { showGlobalDutchPay, setShowGlobalDutchPay } = useNavigation();

  return (
    <Modal
      visible={showGlobalDutchPay}
      animationType="slide"
      onRequestClose={() => setShowGlobalDutchPay(false)}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.background }} {...panHandlers}>
        <View style={styles.globalDutchPayHeader}>
          <Text style={styles.globalDutchPayHeaderTitle}>💸 나의 N빵 정산 대장</Text>
          <TouchableOpacity
            style={styles.globalDutchPayCloseBtn}
            onPress={() => setShowGlobalDutchPay(false)}
          >
            <X size={20} color={THEME.text} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <DutchPay
            globalProfile={globalProfile}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  globalDutchPayHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.surface,
  },
  globalDutchPayHeaderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.text,
  },
  globalDutchPayCloseBtn: {
    padding: 6,
  },
});

export default GlobalDutchPayModal;
