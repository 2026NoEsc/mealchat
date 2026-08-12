import React, { ReactNode } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TouchableWithoutFeedback } from 'react-native';
import { THEME } from '../lib/theme';

/**
 * 방 안에서 열리는 하단 패널의 공통 껍데기.
 *
 * Figma 의 `채팅/일정 패널`(553:408) · `메뉴 패널`(553:698) ·
 * `정산 패널`(553:727) · `멤버 패널`(553:768) 이 전부 같은 구조라
 * 손잡이 / 제목 / 부제 / 본문 / 하단 버튼을 한곳에 모았다.
 *
 * 뒤쪽 Dim 을 누르면 닫힌다.
 */
interface RoomPanelSheetProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** 시트 하단에 고정되는 액션 버튼 영역 */
  footer?: ReactNode;
  /**
   * 본문을 시트가 스크롤할지 여부. 자식이 이미 자기 ScrollView 를 들고 있으면
   * `false` 로 넘겨 중첩 스크롤을 피한다.
   */
  scrollable?: boolean;
}

export const RoomPanelSheet: React.FC<RoomPanelSheetProps> = ({
  title,
  subtitle,
  onClose,
  children,
  footer,
  scrollable = true,
}) => (
  <View style={styles.overlay}>
    <TouchableWithoutFeedback onPress={onClose} accessible={false}>
      <View style={styles.dim} />
    </TouchableWithoutFeedback>

    <View style={styles.sheet}>
      <TouchableOpacity
        style={styles.handleTapTarget}
        onPress={onClose}
        accessibilityLabel={`${title} 닫기`}
      >
        <View style={styles.handle} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {Boolean(subtitle) && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {scrollable ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.plainContent}>{children}</View>
      )}

      {footer && <View style={styles.footer}>{footer}</View>}
    </View>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.modalOverlay,
  },
  sheet: {
    maxHeight: '78%',
    backgroundColor: THEME.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 12,
  },
  handleTapTarget: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 6,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.handleBar,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 6,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
  },
  subtitle: {
    fontSize: 11,
    color: THEME.textSecondary,
  },
  content: {
    flexGrow: 0,
    marginTop: 12,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 8,
  },
  plainContent: {
    flexShrink: 1,
    marginTop: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
});
