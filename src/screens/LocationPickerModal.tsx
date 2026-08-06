import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SafeMapView as MapView, Marker, isGoogleMapsConfigured } from '../components/SafeMapView';
import { THEME } from '../lib/theme';
import { useRoomEditing } from '../contexts';

/**
 * 약속 장소를 지도에서 직접 고르는 모달.
 *
 * 지도를 움직여 화면 중앙(핀)에 원하는 위치를 맞추는 방식입니다.
 * SafeMapView 를 쓰므로 Google Maps 키가 없어도 앱이 죽지 않고
 * 안내 박스로 대체됩니다.
 */
interface LocationPickerModalProps {
  /** 좌표 2개 또는 카카오 장소 객체를 받습니다 (App.tsx 의 오버로드 그대로) */
  onSelectLocation: (arg1: number | any, arg2?: number) => void;
}

const LocationPickerModal: React.FC<LocationPickerModalProps> = ({ onSelectLocation }) => {
  const { showLocationMapModal, setShowLocationMapModal, mapRegion, setMapRegion } =
    useRoomEditing();

  // 원본이 쓰던 이름을 유지해, 아래 JSX 를 한 줄도 고치지 않았습니다.
  const handleSelectLocation = onSelectLocation;

  return (
    <Modal
      visible={showLocationMapModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowLocationMapModal(false)}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ flex: 1 }}>
          <MapView
            style={{ flex: 1 }}
            // 안드로이드에서 `region` 만 주면 최초 마운트 시 카메라가
            // (0, 0) 부근에서 시작하는 경우가 있다(ScheduleGrid.tsx 의
            // 위치 지도 모달에서 실기기로 확인된 결함과 같은 부류,
            // docs/UI/15 라운드 AO-2). `initialRegion` 을 같이 준다.
            initialRegion={mapRegion}
            region={mapRegion}
            onRegionChange={setMapRegion}
          >
            <Marker
              coordinate={{
                latitude: mapRegion.latitude,
                longitude: mapRegion.longitude,
              }}
              title="선택된 위치"
              pinColor={THEME.primary}
            />
          </MapView>
        </View>

        {/* 지도 하단 컨트롤 */}
        <View
          style={{
            backgroundColor: THEME.surface,
            borderTopWidth: 1,
            borderTopColor: THEME.border,
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            gap: 12,
          }}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#F4F3EA',
              borderWidth: 1,
              borderColor: THEME.border,
              borderRadius: 8,
              paddingVertical: 12,
              alignItems: 'center',
            }}
            onPress={() => setShowLocationMapModal(false)}
          >
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: THEME.text }}>취소</Text>
          </TouchableOpacity>
          {/* ⚠️ 지도가 안 그려지면 이 버튼을 잠급니다.
              Google Maps 키가 없으면 SafeMapView 가 지도 대신 안내 박스를 그리는데,
              그때 지도를 움직일 수 없으니 `mapRegion` 은 초기값(서울시청) 그대로입니다.
              버튼이 눌리면 그 기본 좌표가 **사용자가 고른 위치인 것처럼** 저장됩니다.
              프로필의 출발 위치가 어긋나던 것과 같은 부류의 결함입니다(라운드 AE-8). */}
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: isGoogleMapsConfigured ? THEME.primary : THEME.border,
              borderRadius: 8,
              paddingVertical: 12,
              alignItems: 'center',
            }}
            disabled={!isGoogleMapsConfigured}
            onPress={() => {
              handleSelectLocation(mapRegion.latitude, mapRegion.longitude);
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: 'white' }}>
              {isGoogleMapsConfigured ? '이 위치로 설정' : '지도를 쓸 수 없어 선택 불가'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default LocationPickerModal;
