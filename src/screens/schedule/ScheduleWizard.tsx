import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { ScheduleGrid } from '../../components/ScheduleGrid';
import { StepProgress } from './StepProgress';
import StepDetail from './StepDetail';
import StepAiPicks from './StepAiPicks';
import ScheduleConfirmed from './ScheduleConfirmed';
import { emptyDraft, type ScheduleDraft } from './types';
import { calculateAIRecommendations } from '../../lib/aiRecommender';
import { THEME } from '../../lib/theme';
import { useAuth, useRoom } from '../../contexts';
import type { AIRecommendation, Participant, Profile, Room, ScheduleAvailability } from '../../lib/types';

/**
 * 일정 추가 마법사 — Figma 가 4개 화면으로 나눠 둔 흐름을 그대로 옮긴 컨테이너.
 *
 *   STEP 1 디테일 선택(309:1065) → STEP 2 시간 선택(160:733)
 *   → STEP 3 AI 추천 TOP3(159:491) → 확정(160:827)
 *
 * 각 단계 화면은 별도 파일이고, 여기서는 초안(ScheduleDraft)과 단계 이동만
 * 관리한다. 방을 실제로 만드는 것은 STEP 3 을 끝낼 때 한 번뿐이다.
 */
interface ScheduleWizardProps {
  onClose: () => void;
  onSaveSchedule: (schedule: ScheduleAvailability) => void;
  onCoordinationConfirm: (
    title: string,
    startDate: string,
    selectedFriends: Profile[],
    locationName?: string,
    latitude?: number,
    longitude?: number
  ) => void;
  onUpdateRoom: () => void;
  onSearchPlace?: (query: string) => void;
  placeResults?: { place_name: string; address_name: string; x?: string; y?: string }[];
}

/**
 * 방이 아직 없는 단계에서 AI 추천을 돌리기 위해, 고른 메이트의 프로필을
 * 참여자처럼 감싼다. 추천기는 `schedule` 과 출발 좌표만 본다.
 */
export const profilesAsParticipants = (profiles: Profile[]): Participant[] =>
  profiles.map(profile => ({
    id: profile.id,
    room_id: 'draft',
    profile_id: profile.id,
    name: profile.name,
    avatar_color: profile.avatar_color,
    personal_data: profile.personal_data,
    schedule: profile.schedule || {},
    created_at: profile.created_at,
    start_location_name: profile.start_location_name,
    start_latitude: profile.start_latitude,
    start_longitude: profile.start_longitude,
  }));

const ScheduleWizard: React.FC<ScheduleWizardProps> = ({
  onClose,
  onSaveSchedule,
  onCoordinationConfirm,
  onUpdateRoom,
  onSearchPlace,
  placeResults,
}) => {
  const { globalProfile, myFollows } = useAuth();
  const { roomList } = useRoom();

  const today = new Date().toISOString().split('T')[0];
  const [step, setStep] = useState<1 | 2 | 3 | 'done'>(1);
  const [draft, setDraft] = useState<ScheduleDraft>(() => emptyDraft(today));
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loadingPicks, setLoadingPicks] = useState(false);

  const patchDraft = useCallback((patch: Partial<ScheduleDraft>) => {
    setDraft(prev => ({ ...prev, ...patch }));
  }, []);

  const selectedMates = useMemo(() => {
    const picked: Profile[] = [];
    for (const follow of myFollows || []) {
      const profile = follow.profiles;
      if (profile && draft.mateIds.includes(profile.id)) picked.push(profile);
    }
    return picked;
  }, [myFollows, draft.mateIds]);

  const attendees = useMemo(
    () => (globalProfile ? [globalProfile, ...selectedMates] : selectedMates),
    [globalProfile, selectedMates]
  );

  // React Compiler 가 알아서 메모하므로 useCallback 을 손으로 달지 않는다.
  const runRecommendations = async () => {
    setLoadingPicks(true);
    try {
      const draftRoom: Room = {
        id: 'draft',
        code: 'DRAFT',
        title: draft.title || '새 약속',
        meeting_date: draft.date,
        // 후보를 하루가 아니라 한 주에서 고르도록 넉넉히 잡는다
        expires_at: new Date(new Date(draft.date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        owner_id: globalProfile?.id || '',
        created_at: new Date().toISOString(),
        location_name: draft.locationName || undefined,
        latitude: draft.latitude,
        longitude: draft.longitude,
      };
      const picks = await calculateAIRecommendations(draftRoom, profilesAsParticipants(attendees));
      setRecommendations(picks);
    } catch (err) {
      console.warn('[ScheduleWizard] Could not compute recommendations:', err);
      setRecommendations([]);
    } finally {
      setLoadingPicks(false);
    }
  };

  const goNext = async () => {
    if (step === 1) {
      if (!draft.title.trim()) {
        Alert.alert('알림', '약속 이름을 입력해 주세요.');
        return;
      }
      if (draft.mateIds.length === 0) {
        Alert.alert('알림', '함께할 메이트를 한 명 이상 골라 주세요.');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      runRecommendations();
      return;
    }
    if (step === 3) {
      const picked = draft.picked;
      await onCoordinationConfirm(
        draft.title.trim(),
        picked?.date || draft.date,
        selectedMates,
        draft.locationName || picked?.recommended_place?.name,
        draft.latitude ?? picked?.recommended_place?.latitude,
        draft.longitude ?? picked?.recommended_place?.longitude
      );
      onUpdateRoom();
      setStep('done');
    }
  };

  const goBack = () => {
    if (step === 1) return onClose();
    if (step === 2) return setStep(1);
    if (step === 3) return setStep(2);
    onClose();
  };

  const footerLabel =
    step === 1 ? '다음 →' : step === 2 ? '시간 선택 완료 →' : step === 3 ? '이 시간으로 약속 만들기 →' : '완료';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.back} accessibilityLabel="이전">
          <ChevronLeft size={20} color={THEME.textSecondary} />
        </TouchableOpacity>
        {step !== 'done' && <StepProgress current={step} />}
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <StepDetail
            draft={draft}
            onChange={patchDraft}
            follows={myFollows || []}
            onSearchPlace={onSearchPlace}
            placeResults={placeResults}
          />
        )}

        {step === 2 && (
          <>
            <Text style={styles.title}>언제 만날까요?</Text>
            <Text style={styles.subtitle}>가능한 시간을 드래그해서 표시해 주세요</Text>
            {/* ⚠️ ScheduleGrid 는 부모가 높이를 확정해 주지 않으면 0 으로 접힌다 */}
            <View style={styles.gridFrame}>
              <ScheduleGrid
                meetingDate={draft.date}
                participants={profilesAsParticipants(attendees)}
                currentParticipantId={globalProfile?.id || ''}
                onSaveSchedule={onSaveSchedule}
                isCoordination
                myProfile={globalProfile}
                follows={myFollows}
                activeRooms={roomList}
                onUpdateRoom={onUpdateRoom}
              />
            </View>
          </>
        )}

        {step === 3 && (
          <StepAiPicks
            recommendations={recommendations}
            loading={loadingPicks}
            participantCount={attendees.length}
            pickedRank={draft.picked?.rank}
            onPick={rec => patchDraft({ picked: rec })}
          />
        )}

        {step === 'done' && (
          <ScheduleConfirmed
            title={draft.title}
            slotLabel={draft.picked ? `${draft.picked.date} ${draft.picked.time}` : draft.date}
            locationName={draft.locationName || draft.picked?.recommended_place?.name}
            averageTravelMinutes={draft.picked?.average_travel_time}
            mates={attendees}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          variant={step === 'done' ? 'complete' : 'completeAndNext'}
          label={footerLabel}
          onPress={step === 'done' ? onClose : goNext}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  back: {
    padding: 2,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.text,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 4,
    marginBottom: 12,
  },
  gridFrame: {
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    borderRadius: 12,
    minHeight: 600,
    overflow: 'hidden',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
});

export default ScheduleWizard;
