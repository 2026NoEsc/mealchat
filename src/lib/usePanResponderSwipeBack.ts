import { useRef } from 'react';
import { PanResponder } from 'react-native';

interface UsePanResponderSwipeBackOptions {
  onSwipeBack?: () => void;
  enableCondition?: () => boolean;
  edgeWidth?: number;
  swipeThreshold?: number;
}

export function usePanResponderSwipeBack(options: UsePanResponderSwipeBackOptions = {}) {
  const {
    onSwipeBack,
    enableCondition = () => true,
    edgeWidth = 90,
    swipeThreshold = 80
  } = options;

  const panResponder = useRef(
    PanResponder.create({
      // ⚠️ 터치 '시작' 단계에서는 절대 응답자가 되지 않습니다.
      //
      // 이전에는 두 핸들러가 `pageX < edgeWidth`만 보고 true를 반환했습니다.
      // 특히 onStartShouldSetPanResponderCapture는 캡처 단계라 자식보다 먼저
      // 실행되므로, 화면 왼쪽 90px 안에 있는 버튼은 손가락이 닿는 순간
      // 제스처를 빼앗겨 눌리지 않았습니다.
      // (N빵 정산의 `+ 새 정산 등록` 버튼이 대표 사례 — docs/UI/15 J-5)
      //
      // 스와이프백 판정은 아래 onMove* 에서만 합니다. 그쪽은 이미
      // `dx > 5 && dx > |dy|` 조건이라 탭(dx≈0)은 걸리지 않습니다.
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (!enableCondition()) return false;
        return (
          gestureState.x0 < edgeWidth &&
          gestureState.dx > 5 &&
          gestureState.dx > Math.abs(gestureState.dy)
        );
      },
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        if (!enableCondition()) return false;
        return (
          gestureState.x0 < edgeWidth &&
          gestureState.dx > 5 &&
          gestureState.dx > Math.abs(gestureState.dy)
        );
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (!enableCondition()) return;
        if (gestureState.dx > swipeThreshold) {
          onSwipeBack?.();
        }
      },
      onPanResponderTerminate: (evt, gestureState) => {
        if (!enableCondition()) return;
        if (gestureState.dx > swipeThreshold) {
          onSwipeBack?.();
        }
      },
      onPanResponderTerminationRequest: () => false
    })
  ).current;

  return {
    panHandlers: panResponder.panHandlers
  };
}
