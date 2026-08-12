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
  /**
   * 시트를 화면 전체 높이로 연다.
   * 안쪽에 `ScheduleGrid` 처럼 최소 높이를 요구하는 큰 컴포넌트가 들어갈 때
   * 쓴다 — 높이가 모자라면 그 컴포넌트가 0으로 접힌 전례가 있다.
   */
  expanded?: boolean;
}

export const RoomPanelSheet: React.FC<RoomPanelSheetProps> = ({
  title,
  subtitle,
  onClose,
  children,
  footer,
  scrollable = true,
  expanded = false,
}) => (
  <View style={styles.overlay}>
    <TouchableWithoutFeedback onPress={onClose} accessible={false}>
      <View style={styles.dim} />
    </TouchableWithoutFeedback>

    <View
      style={[
        styles.sheet,
        // 자식이 자기 ScrollView 를 들고 오면(scrollable=false) 시트 높이를
        // 못 박아 준다. 안 그러면 부모도 자식도 높이가 확정되지 않아 내용이
        // 0 으로 접힌다 — Figma 의 패널도 높이가 고정(286/486 ≈ 60%)이다.
        !scrollable && !expanded && styles.sheetFixed,
        expanded && styles.sheetExpanded,
      ]}
    >
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
        <View style={[styles.plainContent, expanded && styles.plainContentExpanded]}>{children}</View>
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
  sheetFixed: {
    height: '62%',
  },
  sheetExpanded: {
    flex: 1,
    maxHeight: '100%',
  },
  plainContent: {
    flex: 1,
    marginTop: 12,
  },
  plainContentExpanded: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
});
