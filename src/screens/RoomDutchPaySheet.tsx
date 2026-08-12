import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Receipt } from 'lucide-react-native';
import { Button } from '../components/Button';
import { RoomPanelSheet } from '../components/RoomPanelSheet';
import { supabase } from '../lib/supabaseClient';
import { THEME } from '../lib/theme';
import type { DutchPayBill, DutchPayMember, Participant, Profile } from '../lib/types';

/**
 * 방 안의 **N빵 정산 패널** — Figma `채팅/정산 패널`(node 553:727).
 *
 * Figma 는 방 하나에 정산 **1건**(총액 / 1인당 / 참여자별 완료·미납)만 두고,
 * 기존 `DutchPay.tsx` 의 다중 청구서 리스트·원장 구조는 없다.
 * 2026-08-13 결정에 따라 방 안에서는 Figma 구조로 좁혔다 — 이 시트는 방의
 * **가장 최근 정산 1건**만 다룬다.
 *
 * `DutchPay.tsx` 자체는 손대지 않았다. 방 밖의 "나의 N빵 정산 대장"
 * (`GlobalDutchPayModal`)이 여러 방·여러 건을 한꺼번에 보여줘야 해서
 * 그 구조가 계속 필요하기 때문이다.
 *
 * 테이블은 그대로 쓴다(`dutch_pay_bills` / `dutch_pay_members`). 방당 1건은
 * 화면에서 지키는 규칙이고 DB 제약으로 막지는 않았다 — 이미 여러 건이 있는
 * 방은 가장 최근 것을 보여준다.
 */
interface RoomDutchPaySheetProps {
  roomId: string;
  roomTitle: string;
  participants: Participant[];
  currentParticipant?: Participant | null;
  globalProfile?: Profile | null;
  onClose: () => void;
}

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

/** `dutch_pay_members.name` 은 "이름:금액" 으로 저장된다 */
export const getMemberName = (raw: string): string => raw.split(':')[0];

/** 참여자의 `personal_data.bank_account`("은행 계좌번호")를 쪼갠다 */
export const splitBankAccount = (bankAccount?: string): { bankName: string; accountNumber: string } => {
  if (!bankAccount) return { bankName: '', accountNumber: '' };
  const parts = bankAccount.trim().split(' ');
  if (parts.length >= 2) return { bankName: parts[0], accountNumber: parts.slice(1).join(' ') };
  return { bankName: '', accountNumber: bankAccount.trim() };
};

/** 영수증 OCR 응답에서 총액으로 쓸 숫자만 건져낸다 */
export const parseScannedAmount = (text: string): number | null => {
  const digits = text.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const amount = parseInt(digits, 10);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

const RoomDutchPaySheet: React.FC<RoomDutchPaySheetProps> = ({
  roomId,
  roomTitle,
  participants,
  currentParticipant,
  globalProfile,
  onClose,
}) => {
  const [bill, setBill] = useState<DutchPayBill | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchBill = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dutch_pay_bills')
        .select('*, dutch_pay_members(*)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      const latest = (data && data[0]) as DutchPayBill | undefined;
      setBill(latest || null);
      if (latest) setAmountInput(String(latest.total_amount));
      setLoadError(null);
    } catch (err) {
      // 불러오기 실패를 "정산 없음" 으로 보이게 두면 받을 돈이 없다고 읽힌다.
      console.error('[RoomDutchPay] Could not load the settlement:', err);
      setLoadError('정산 내역을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchBill();
  }, [fetchBill]);

  const splitCount = Math.max(participants.length, 1);
  const totalAmount = bill ? bill.total_amount : parseInt(amountInput.replace(/[^0-9]/g, ''), 10) || 0;
  const perPerson = Math.round(totalAmount / splitCount);
  const isCreator = !bill || bill.creator_id === globalProfile?.id;

  const memberByProfile = useMemo(() => {
    const map = new Map<string, DutchPayMember>();
    (bill?.dutch_pay_members || []).forEach(member => map.set(member.profile_id, member));
    return map;
  }, [bill]);

  const bankDetails = useMemo(() => {
    const { bankName, accountNumber } = splitBankAccount(currentParticipant?.personal_data?.bank_account);
    return { bankName, accountNumber, accountHolder: currentParticipant?.name || '' };
  }, [currentParticipant]);

  const scanReceipt = async () => {
    if (!GEMINI_API_KEY) {
      Alert.alert('영수증 인식 불가', '이 빌드에는 Gemini 키가 없어 금액을 직접 입력해야 합니다.');
      return;
    }
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('권한 필요', '영수증을 읽으려면 사진 접근 권한이 필요합니다.');
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.6,
      });
      if (picked.canceled || !picked.assets?.[0]?.base64) return;

      setScanning(true);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: '이 영수증의 총 결제금액만 숫자로 답해. 다른 말은 하지 마.' },
                { inline_data: { mime_type: 'image/jpeg', data: picked.assets[0].base64 } },
              ],
            }],
          }),
        }
      );
      const json = await response.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const amount = parseScannedAmount(text);
      if (amount) {
        setAmountInput(String(amount));
      } else {
        Alert.alert('인식 실패', '영수증에서 금액을 찾지 못했습니다. 직접 입력해 주세요.');
      }
    } catch (err) {
      console.error('[RoomDutchPay] Receipt scan failed:', err);
      Alert.alert('인식 실패', '영수증을 읽는 중 문제가 생겼습니다. 직접 입력해 주세요.');
    } finally {
      setScanning(false);
    }
  };

  const notifyRequest = async (amountPerPerson: number) => {
    const { bankName, accountNumber, accountHolder } = bankDetails;
    const { error } = await supabase.from('notifications').insert([{
      room_id: roomId,
      title: `[${roomTitle || '밀챗'}] N빵 정산 요청 💸`,
      message: `인당 ${amountPerPerson.toLocaleString()}원 (${bankName} ${accountNumber} 예금주: ${accountHolder})`,
      bank_name: bankName,
      account_number: accountNumber,
      amount: amountPerPerson,
    }]);
    if (error) console.error('[RoomDutchPay] Could not create the notification:', error);
  };

  const createBill = async () => {
    if (totalAmount <= 0) {
      Alert.alert('알림', '총 결제금액을 입력해 주세요.');
      return;
    }
    if (!bankDetails.accountNumber) {
      Alert.alert('계좌 정보 필요', '프로필에 입금받을 계좌를 먼저 등록해 주세요.');
      return;
    }
    try {
      setBusy(true);
      const { data, error } = await supabase
        .from('dutch_pay_bills')
        .insert([{
          title: roomTitle || '밀챗 정산',
          total_amount: totalAmount,
          split_count: splitCount,
          bank_name: bankDetails.bankName,
          account_number: bankDetails.accountNumber,
          account_holder: bankDetails.accountHolder,
          room_id: roomId,
          creator_id: globalProfile?.id,
        }])
        .select();
      if (error) throw error;

      const created = data?.[0] as DutchPayBill | undefined;
      if (!created) throw new Error('정산을 만들지 못했습니다.');

      const others = participants.filter(p => p.profile_id && p.profile_id !== globalProfile?.id);
      if (others.length > 0) {
        const { error: membersError } = await supabase.from('dutch_pay_members').insert(
          others.map(p => ({
            bill_id: created.id,
            profile_id: p.profile_id,
            name: `${p.name}:${perPerson}`,
            is_completed: false,
          }))
        );
        if (membersError) throw membersError;
      }

      await notifyRequest(perPerson);
      await fetchBill();
      Alert.alert('정산 요청 완료', `인당 ${perPerson.toLocaleString()}원으로 요청을 보냈습니다.`);
    } catch (err) {
      console.error('[RoomDutchPay] Could not create the settlement:', err);
      Alert.alert('오류', '정산 요청을 보내지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const remind = async () => {
    setBusy(true);
    await notifyRequest(perPerson);
    setBusy(false);
    Alert.alert('알림 발송', '아직 보내지 않은 메이트에게 다시 알렸습니다.');
  };

  const confirmDeposit = async (member: DutchPayMember) => {
    if (!bill) return;
    try {
      setBusy(true);
      const { error } = await supabase
        .from('dutch_pay_members')
        .update({ is_completed: true })
        .eq('id', member.id);
      if (error) throw error;

      const { data: updated, error: fetchError } = await supabase
        .from('dutch_pay_members')
        .select('*')
        .eq('bill_id', bill.id);
      if (fetchError) throw fetchError;

      // 모두 입금했으면 정산은 폭파된다 (기존 DutchPay 와 같은 동작).
      if (updated && updated.every((m: DutchPayMember) => m.is_completed)) {
        await supabase.from('dutch_pay_members').delete().eq('bill_id', bill.id);
        await supabase.from('dutch_pay_bills').delete().eq('id', bill.id);
        setAmountInput('');
        Alert.alert('정산 완료! 🎉', '모두 입금을 마쳐 이 방의 정산이 마무리되었습니다.');
      } else {
        Alert.alert('확인 완료', `${getMemberName(member.name)}님의 입금을 확인했습니다.`);
      }
      await fetchBill();
    } catch (err) {
      console.error('[RoomDutchPay] Could not confirm the deposit:', err);
      Alert.alert('오류', '입금 확인에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const footer = bill ? (
    <Button
      variant="complete"
      label="정산 요청 다시 보내기 →"
      disabled={busy || !isCreator}
      onPress={remind}
    />
  ) : (
    <Button variant="complete" label="정산 요청 보내기 →" disabled={busy} onPress={createBill} />
  );

  return (
    <RoomPanelSheet
      title="N빵 정산"
      subtitle="결제 금액을 입력하면 자동으로 나눠요"
      onClose={onClose}
      footer={footer}
    >
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={THEME.primary} />
        </View>
      ) : (
        <>
          {Boolean(loadError) && <Text style={styles.error}>{loadError}</Text>}

          <View style={styles.amountBox}>
            <View style={styles.amountCell}>
              <Text style={styles.amountLabel}>총 결제금액</Text>
              {bill ? (
                <Text style={styles.amountValue}>₩{bill.total_amount.toLocaleString()}</Text>
              ) : (
                <TextInput
                  style={[styles.amountValue, styles.amountInput]}
                  value={amountInput}
                  onChangeText={setAmountInput}
                  placeholder="₩0"
                  placeholderTextColor={THEME.textTertiary}
                  keyboardType="number-pad"
                />
              )}
            </View>
            <View style={styles.amountCell}>
              <Text style={styles.amountLabel}>1인당</Text>
              <Text style={[styles.amountValue, styles.amountValueAccent]}>
                ₩{perPerson.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.members}>
            {participants.map(participant => {
              const member = participant.profile_id ? memberByProfile.get(participant.profile_id) : undefined;
              // 정산을 만든 사람은 이미 결제한 사람이라 언제나 완료다
              const isPayer = !member;
              const done = isPayer || member.is_completed;
              const canConfirm = Boolean(bill) && isCreator && member && !member.is_completed;

              return (
                <TouchableOpacity
                  key={participant.id}
                  style={[styles.member, done && styles.memberDone]}
                  activeOpacity={canConfirm ? 0.7 : 1}
                  disabled={!canConfirm || busy}
                  onPress={() => member && confirmDeposit(member)}
                >
                  <View style={styles.memberAvatar}>
                    {participant.avatar_url ? (
                      <Image source={{ uri: participant.avatar_url }} style={styles.memberAvatarImage} />
                    ) : (
                      <Text style={[styles.memberInitial, { color: participant.avatar_color || THEME.primary }]}>
                        {participant.name[0]}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.memberName, done && styles.memberNameDone]} numberOfLines={1}>
                    {participant.name}
                  </Text>
                  <Text style={styles.memberStatus}>{done ? '완료' : '미납'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!bill && (
            <TouchableOpacity style={styles.receipt} onPress={scanReceipt} disabled={scanning}>
              {scanning ? (
                <ActivityIndicator size="small" color={THEME.accentSoft} />
              ) : (
                <Receipt size={14} color={THEME.accentSoft} />
              )}
              <Text style={styles.receiptText}>
                {scanning ? '영수증을 읽는 중...' : '영수증 촬영하여 자동 입력'}
              </Text>
            </TouchableOpacity>
          )}

          {bill && !isCreator && (
            <Text style={styles.note}>
              입금 확인은 정산을 요청한 메이트가 합니다.
            </Text>
          )}
        </>
      )}
    </RoomPanelSheet>
  );
};

const styles = StyleSheet.create({
  loading: {
    paddingVertical: 40,
  },
  error: {
    fontSize: 12,
    color: THEME.danger,
  },
  amountBox: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: THEME.surfaceHighlight,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  amountCell: {
    flex: 1,
    gap: 2,
  },
  amountLabel: {
    fontSize: 11,
    color: THEME.textSecondary,
  },
  amountValue: {
    fontSize: 19,
    fontWeight: 'bold',
    color: THEME.text,
  },
  amountValueAccent: {
    color: THEME.accentSoft,
  },
  amountInput: {
    padding: 0,
  },
  members: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  member: {
    width: 78,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: THEME.surface,
  },
  memberDone: {
    backgroundColor: THEME.surfaceHighlight,
  },
  memberAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: THEME.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memberAvatarImage: {
    width: '100%',
    height: '100%',
  },
  memberInitial: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  memberName: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textSecondary,
    maxWidth: 70,
  },
  memberNameDone: {
    color: THEME.accentSoft,
  },
  memberStatus: {
    fontSize: 10,
    color: THEME.textSecondary,
  },
  receipt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: THEME.receiptBorder,
    backgroundColor: THEME.badgeBg,
  },
  receiptText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.accentSoft,
  },
  note: {
    fontSize: 11,
    color: THEME.textMuted,
    textAlign: 'center',
    paddingTop: 4,
  },
});

export default RoomDutchPaySheet;
