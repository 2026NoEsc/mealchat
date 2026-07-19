import { useRef, useCallback } from 'react';
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
      onStartShouldSetPanResponder: (evt) => {
        return enableCondition() && evt.nativeEvent.pageX < edgeWidth;
      },
      onStartShouldSetPanResponderCapture: (evt) => {
        return enableCondition() && evt.nativeEvent.pageX < edgeWidth;
      },
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
