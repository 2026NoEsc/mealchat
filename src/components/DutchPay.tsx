import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Plus, CreditCard, Send, Check, Bell, AlertCircle, CheckCircle, Camera, Sparkles, Image as ImageIcon } from 'lucide-react-native';
import { supabase } from '../lib/supabaseClient';
import { THEME } from '../lib/theme';
import { validateBankAccount, validateAmount, validateSplitCount } from '../lib/validators';
import type { DutchPayBill, Participant, Profile, DutchPayMember } from '../lib/types';

interface DutchPayProps {
  roomId?: string;
  roomTitle?: string;
  currentParticipant?: Participant | null;
  participants?: Participant[];
  globalProfile?: Profile | null;
}

// Gemini API Key - 환경 변수에서 읽음
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const sendExpoPushNotifications = async (tokens: string[], title: string, body: string) => {
  if (tokens.length === 0) return;

  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title: title,
    body: body,
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    const resData = await response.json();
    console.log('Expo Push Response:', resData);
  } catch (error) {
    console.error('Error sending Expo push notification:', error);
  }
};

const sendInitialNotification = async (bill: DutchPayBill, targetParticipants: Participant[]) => {
  try {
    const profileIds = targetParticipants
      .map(p => p.profile_id)
      .filter((id): id is string => !!id);

    if (profileIds.length === 0) return;

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('push_token')
      .in('id', profileIds);

    if (error) throw error;

    const tokens = profiles
      ?.map(p => p.push_token)
      .filter((t): t is string => !!t) || [];

    if (tokens.length > 0) {
      const amountPerPerson = Math.round(bill.total_amount / bill.split_count);
      await sendExpoPushNotifications(
        tokens,
        `[밀챗 N빵 정산] ${bill.title} 💸`,
        `인당 ${amountPerPerson.toLocaleString()}원 송금 요청이 도착했습니다. (${bill.bank_name} ${bill.account_number})`
      );
    }
  } catch (err) {
    console.error('Error sending initial notification:', err);
  }
};

const getMemberAmount = (bill: DutchPayBill, member: DutchPayMember | undefined | null, profileId?: string) => {
  let targetMember = member;
  if (!targetMember && profileId && bill.dutch_pay_members) {
    targetMember = bill.dutch_pay_members.find(m => m.profile_id === profileId) || null;
  }

  if (targetMember && targetMember.name.includes(':')) {
    const parts = targetMember.name.split(':');
    const amt = parseInt(parts[1], 10);
    if (!isNaN(amt)) return amt;
  }

  return Math.round(bill.total_amount / (bill.split_count || 1));
};

const getMemberCleanName = (rawName: string) => {
  if (rawName.includes(':')) {
    return rawName.split(':')[0];
  }
  return rawName;
};

function extractJsonString(text: string): string | null {
  const startArray = text.indexOf('[');
  const startObject = text.indexOf('{');
  
  let startIdx = -1;
  let endIdx = -1;
  
  if (startArray !== -1 && startObject !== -1) {
    startIdx = Math.min(startArray, startObject);
  } else if (startArray !== -1) {
    startIdx = startArray;
  } else if (startObject !== -1) {
    startIdx = startObject;
  }
  
  if (startIdx === -1) return null;
  
  if (startIdx === startArray) {
    endIdx = text.lastIndexOf(']');
  } else {
    endIdx = text.lastIndexOf('}');
  }
  
  if (endIdx === -1 || endIdx < startIdx) return null;
  
  return text.substring(startIdx, endIdx + 1);
}

export const DutchPay: React.FC<DutchPayProps> = ({
  roomId,
  roomTitle,
  currentParticipant,
  participants = [],
  globalProfile
}) => {
  const [bills, setBills] = useState<DutchPayBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchBills();
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  // New bill fields
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [splitCount, setSplitCount] = useState('');
  const [bankName, setBankName] = useState('카카오뱅크');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  // Custom split states
  const [isCustomSplit, setIsCustomSplit] = useState(false);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  // AI Receipt Split states
  const [showAiModal, setShowAiModal] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [nlpInstruction, setNlpInstruction] = useState('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalysisStep, setAiAnalysisStep] = useState('');

  interface ReceiptItem {
    id: string;
    name: string;
    price: number;
    assignedMemberIds: string[];
  }

  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([
    { id: '1', name: '삼겹살 (3인분)', price: 45000, assignedMemberIds: [] },
    { id: '2', name: '소주 (2병)', price: 10000, assignedMemberIds: [] },
    { id: '3', name: '공기밥 (2개)', price: 2000, assignedMemberIds: [] },
    { id: '4', name: '물냉면 (1인분)', price: 7000, assignedMemberIds: [] }
  ]);

  const handlePickReceiptImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 거부', '사진첩 접근 권한이 필요합니다.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        base64: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceiptImage(result.assets[0].uri);
        if (result.assets[0].base64) {
          setReceiptBase64(result.assets[0].base64);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAiAnalyze = async () => {
    if (!receiptImage) {
      Alert.alert('알림', '영수증 사진을 등록해 주세요.');
      return;
    }

    setIsAiAnalyzing(true);

    if (!GEMINI_API_KEY) {
      setAiAnalysisStep('📷 [시뮬레이션] 영수증 텍스트 OCR 판독 중...');
      setTimeout(() => {
        setAiAnalysisStep('🤖 [시뮬레이션] AI 자연어 매칭 분석 중...');
        setTimeout(() => {
          setIsAiAnalyzing(false);
          setAiAnalysisStep('');
          const parsed = parseNlpInstructions(nlpInstruction, [
            { id: '1', name: '삼겹살 (3인분)', price: 45000, assignedMemberIds: [] },
            { id: '2', name: '소주 (2병)', price: 10000, assignedMemberIds: [] },
            { id: '3', name: '공기밥 (2개)', price: 2000, assignedMemberIds: [] },
            { id: '4', name: '물냉면 (1인분)', price: 7000, assignedMemberIds: [] }
          ]);
          setReceiptItems(parsed);
          Alert.alert(
            '시뮬레이션 완료',
            '구글 제미나이 API 키가 등록되지 않아 가상 모드로 분석되었습니다. 실사용하시려면 DutchPay.tsx 파일 상단에 GEMINI_API_KEY를 등록해 주세요.'
          );
        }, 1500);
      }, 1500);
      return;
    }

    try {
      setAiAnalysisStep('📷 실시간 영수증 OCR 판독 중...');
      if (!receiptBase64) {
        throw new Error('영수증 이미지 Base64 데이터를 로드하지 못했습니다. 다시 촬영/등록해 주세요.');
      }

      const prompt = `
당신은 영수증 OCR 및 더치페이 매칭 전문가입니다. 제공된 영수증 이미지에서 모든 개별 메뉴 품목(품목 이름, 가격)을 정확히 판독하여 추출하세요. 
그리고 아래 제공된 지시사항에 따라 각 품목을 정산 참가자들에게 매칭해 주세요.

[지시사항]
"${nlpInstruction}"

[정산 참여 메이트 목록]
${participants.map(p => `- 이름: ${p.name}, ID: ${p.profile_id || p.id}`).join('\n')}
(참고: 지시사항에서 언급되는 '나' 혹은 '내가' 등은 방장인 ${globalProfile?.name || '나'} (ID: ${globalProfile?.id || ''})를 지칭합니다.)

[정산 매칭 규칙]
1. 유저가 지시사항에서 특정 사람이나 메뉴를 지정하여 묶은 경우 (예: "물냉면은 소희가 먹었고 소주는 대건이랑 내가 먹었어"), 해당 메뉴 품목의 'assignedMemberIds' 배열에 매칭된 사람들의 ID만 할당하세요.
2. 지시사항에서 특별히 언급이 없는 일반 품목(예: 지시사항에 전혀 안 나온 '공기밥'이나 '삼겹살')은 기본적으로 전체 참가자의 ID 목록을 'assignedMemberIds'에 할당해 주세요.
3. 가격은 쉼표나 기호 없이 순수한 숫자 정수형으로만 기입하세요.
4. 결과는 반드시 다른 설명 없이 오직 순수한 JSON 배열 형식으로만 응답해야 합니다. 백틱(\`\`\`json) 마크다운을 포함하지 마세요.

[출력 JSON 형식 예시]
[
  { "id": "1", "name": "삼겹살 (3인분)", "price": 45000, "assignedMemberIds": ["user-uuid-1", "user-uuid-2"] },
  { "id": "2", "name": "소주 (2병)", "price": 10000, "assignedMemberIds": ["user-uuid-2"] }
]
`;

      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: receiptBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      };

      setAiAnalysisStep('🤖 제미나이 AI 자연어 정산 매칭 중...');

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API 응답 실패 (상태 코드: ${response.status})`);
      }

      const json = await response.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || '';

      let cleanJsonText = rawText.trim();
      if (cleanJsonText.startsWith('```json')) {
        cleanJsonText = cleanJsonText.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleanJsonText.startsWith('```')) {
        cleanJsonText = cleanJsonText.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const extracted = extractJsonString(cleanJsonText);
      const parsedItems = extracted ? JSON.parse(extracted) : null;
      if (parsedItems && Array.isArray(parsedItems)) {
        const validatedItems: ReceiptItem[] = parsedItems.map((item: any, idx: number) => ({
          id: item.id ? String(item.id) : String(idx + 1),
          name: item.name || '알 수 없는 항목',
          price: typeof item.price === 'number' ? item.price : parseInt(String(item.price || '0')) || 0,
          assignedMemberIds: Array.isArray(item.assignedMemberIds) ? item.assignedMemberIds : participants.map(p => p.profile_id || p.id)
        }));
        setReceiptItems(validatedItems);
        Alert.alert('분석 완료', 'AI가 영수증의 실제 항목과 자연어 분배를 성공적으로 매칭했습니다!');
      } else {
        throw new Error('응답받은 AI 데이터 형식이 올바르지 않습니다.');
      }
    } catch (err: any) {
      console.error('Gemini Receipt Error:', err);
      Alert.alert('AI 분석 실패', err.message || '영수증을 판독하는 데 실패했습니다. 일반 모드로 항목을 불러옵니다.');
      const parsed = parseNlpInstructions(nlpInstruction, [
        { id: '1', name: '삼겹살 (3인분)', price: 45000, assignedMemberIds: [] },
        { id: '2', name: '소주 (2병)', price: 10000, assignedMemberIds: [] },
        { id: '3', name: '공기밥 (2개)', price: 2000, assignedMemberIds: [] },
        { id: '4', name: '물냉면 (1인분)', price: 7000, assignedMemberIds: [] }
      ]);
      setReceiptItems(parsed);
    } finally {
      setIsAiAnalyzing(false);
      setAiAnalysisStep('');
    }
  };

  const parseNlpInstructions = (text: string, items: ReceiptItem[]) => {
    const defaultIds = participants.map(p => p.profile_id || p.id);
    const updated = items.map(item => ({
      ...item,
      assignedMemberIds: [...defaultIds]
    }));

    if (!text.trim()) return updated;

    const clauses = text.split(/[,.및그리고]|\s+고\s+/);

    updated.forEach(item => {
      const itemKeyword = item.name.split(' ')[0];
      const matchingClause = clauses.find(c => c.includes(itemKeyword));

      if (matchingClause) {
        const assigned: string[] = [];
        participants.forEach(p => {
          if (matchingClause.includes(p.name)) {
            assigned.push(p.profile_id || p.id);
          }
        });
        if (assigned.length > 0) {
          item.assignedMemberIds = assigned;
        }
      }
    });

    return updated;
  };

  const handleToggleMemberInReceiptItem = (itemId: string, memberId: string) => {
    setReceiptItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const exists = item.assignedMemberIds.includes(memberId);
      const updated = exists
        ? item.assignedMemberIds.filter(id => id !== memberId)
        : [...item.assignedMemberIds, memberId];
      return {
        ...item,
        assignedMemberIds: updated
      };
    }));
  };

  const getReceiptParticipantTotals = () => {
    const totals: Record<string, number> = {};
    participants.forEach(p => {
      totals[p.profile_id || p.id] = 0;
    });

    receiptItems.forEach(item => {
      if (item.assignedMemberIds.length === 0) return;
      const perPerson = Math.round(item.price / item.assignedMemberIds.length);
      item.assignedMemberIds.forEach(id => {
        if (totals[id] !== undefined) {
          totals[id] += perPerson;
        }
      });
    });

    return totals;
  };

  const handleSaveAiReceiptBill = async () => {
    const totals = getReceiptParticipantTotals();
    const totalSum = receiptItems.reduce((acc, item) => acc + item.price, 0);

    // Save bank info from default profile bank values
    const fullAcct = globalProfile?.personal_data?.bank_account || '';
    const parts = fullAcct.split(' ');
    const myBank = parts[0] || '카카오뱅크';
    const myAcctNum = parts[1] || '';

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dutch_pay_bills')
        .insert([{
          title: `[AI 영수증] 삼겹살 모임 🍖`,
          total_amount: totalSum,
          split_count: participants.length,
          bank_name: myBank,
          account_number: myAcctNum,
          account_holder: globalProfile?.name || '',
          room_id: roomId,
          creator_id: globalProfile?.id
        }])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        const newBill = data[0] as DutchPayBill;
        const otherParticipants = participants.filter(p => p.profile_id !== globalProfile?.id);

        if (otherParticipants.length > 0) {
          const membersToInsert = otherParticipants.map(p => {
            const amt = totals[p.profile_id || p.id] || 0;
            return {
              bill_id: newBill.id,
              profile_id: p.profile_id,
              name: `${p.name}:${amt}`,
              is_completed: false
            };
          });

          const { error: membersErr } = await supabase
            .from('dutch_pay_members')
            .insert(membersToInsert);

          if (membersErr) throw membersErr;
        }

        setShowAiModal(false);
        setReceiptImage(null);
        setNlpInstruction('');
        await fetchBills();
        Alert.alert('성공', 'AI 정산 등록이 완료되었습니다!');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('오류', '정산 요청을 저장하는 도중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomAmountChange = (profileId: string, val: string) => {
    setCustomAmounts(prev => ({
      ...prev,
      [profileId]: val
    }));
  };

  const getCreatorPortion = () => {
    const total = parseInt(totalAmount, 10) || 0;
    let othersSum = 0;
    participants.filter(p => p.profile_id !== globalProfile?.id).forEach(p => {
      const amt = parseInt(customAmounts[p.profile_id || ''] || '0', 10) || 0;
      othersSum += amt;
    });
    return total - othersSum;
  };

  interface Settlement {
    from: { id: string; name: string };
    to: { id: string; name: string; bank?: string; account?: string; holder?: string };
    amount: number;
  }

  const calculateSettlements = (): Settlement[] => {
    if (!participants || participants.length === 0 || bills.length === 0) return [];

    const balances: Record<string, { name: string; paid: number; owed: number; bank?: string; account?: string; holder?: string }> = {};

    participants.forEach(p => {
      balances[p.profile_id || p.id] = {
        name: p.name,
        paid: 0,
        owed: 0
      };
    });

    bills.forEach(bill => {
      const creatorId = bill.creator_id;
      if (!creatorId) return;

      if (balances[creatorId]) {
        let othersOwed = 0;
        bill.dutch_pay_members?.forEach(m => {
          othersOwed += getMemberAmount(bill, m, m.profile_id);
        });
        const creatorPortion = bill.total_amount - othersOwed;
        balances[creatorId].paid += bill.total_amount;
        balances[creatorId].owed += creatorPortion;

        balances[creatorId].bank = bill.bank_name;
        balances[creatorId].account = bill.account_number;
        balances[creatorId].holder = bill.account_holder;
      }

      bill.dutch_pay_members?.forEach(m => {
        const memberId = m.profile_id;
        if (memberId && balances[memberId]) {
          const amt = getMemberAmount(bill, m, memberId);
          balances[memberId].owed += amt;
        }
      });
    });

    const netBalances = Object.keys(balances).map(id => {
      const b = balances[id];
      const net = b.paid - b.owed;
      return {
        id,
        name: b.name,
        net,
        bank: b.bank,
        account: b.account,
        holder: b.holder
      };
    });

    const debtors = netBalances.filter(b => b.net < 0).map(b => ({ ...b, net: Math.abs(b.net) })).sort((a, b) => b.net - a.net);
    const creditors = netBalances.filter(b => b.net > 0).sort((a, b) => b.net - a.net);

    const settlements: Settlement[] = [];
    let debtorIdx = 0;
    let creditorIdx = 0;

    while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
      const debtor = debtors[debtorIdx];
      const creditor = creditors[creditorIdx];

      const amount = Math.min(debtor.net, creditor.net);

      settlements.push({
        from: { id: debtor.id, name: debtor.name },
        to: {
          id: creditor.id,
          name: creditor.name,
          bank: creditor.bank,
          account: creditor.account,
          holder: creditor.holder
        },
        amount
      });

      debtor.net -= amount;
      creditor.net -= amount;

      if (debtor.net === 0) debtorIdx++;
      if (creditor.net === 0) creditorIdx++;
    }

    return settlements;
  };

  const calculateOffsetBalances = () => {
    if (!participants || participants.length === 0 || bills.length === 0) return [];

    const balances: Record<string, { name: string; paid: number; owed: number; bank?: string; account?: string; holder?: string }> = {};

    participants.forEach(p => {
      balances[p.profile_id || p.id] = {
        name: p.name,
        paid: 0,
        owed: 0
      };
    });

    bills.forEach(bill => {
      const creatorId = bill.creator_id;
      if (!creatorId) return;

      if (balances[creatorId]) {
        let othersOwed = 0;
        bill.dutch_pay_members?.forEach(m => {
          othersOwed += getMemberAmount(bill, m, m.profile_id);
        });
        const creatorPortion = bill.total_amount - othersOwed;
        balances[creatorId].paid += bill.total_amount;
        balances[creatorId].owed += creatorPortion;

        balances[creatorId].bank = bill.bank_name;
        balances[creatorId].account = bill.account_number;
        balances[creatorId].holder = bill.account_holder;
      }

      bill.dutch_pay_members?.forEach(m => {
        const memberId = m.profile_id;
        if (memberId && balances[memberId]) {
          const amt = getMemberAmount(bill, m, memberId);
          balances[memberId].owed += amt;
        }
      });
    });

    return Object.keys(balances).map(id => {
      const b = balances[id];
      const net = b.paid - b.owed;
      return {
        id,
        name: b.name,
        net,
        bank: b.bank,
        account: b.account,
        holder: b.holder
      };
    }).sort((a, b) => b.net - a.net);
  };

  // Selected bill for KakaoPay QR code preview
  const [selectedBill, setSelectedBill] = useState<DutchPayBill | null>(null);

  const fetchBills = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('dutch_pay_bills')
        .select('*, dutch_pay_members(*)')
        .order('created_at', { ascending: false });

      if (roomId) {
        query = query.eq('room_id', roomId);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filteredBills = data || [];
      if (!roomId && globalProfile) {
        filteredBills = filteredBills.filter(bill =>
          bill.creator_id === globalProfile.id ||
          (bill.dutch_pay_members && bill.dutch_pay_members.some((m: any) => m.profile_id === globalProfile.id))
        );
      }

      setBills(filteredBills);

      // Keep selectedBill state updated with fresh member details if selected
      if (selectedBill) {
        const freshSelected = filteredBills.find(b => b.id === selectedBill.id);
        if (freshSelected) {
          setSelectedBill(freshSelected);
        } else {
          setSelectedBill(null);
        }
      }
    } catch (err: any) {
      console.error('Error fetching bills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [roomId, globalProfile?.id]);

  // Pre-fill profile bank details and participant split count
  useEffect(() => {
    if (currentParticipant) {
      const bankAcct = currentParticipant.personal_data?.bank_account || '';
      if (bankAcct) {
        const parts = bankAcct.split(' ');
        if (parts.length >= 2) {
          setBankName(parts[0]);
          setAccountNumber(parts.slice(1).join(' '));
        } else {
          setAccountNumber(bankAcct);
        }
      }
      setAccountHolder(currentParticipant.name);
    }
    if (participants && participants.length > 0) {
      setSplitCount(participants.length.toString());
    }
  }, [currentParticipant, participants]);

  const handleAddBill = async () => {
    if (!title.trim() || !totalAmount.trim() || !splitCount.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      Alert.alert('알림', '모든 필수 필드를 입력해 주세요.');
      return;
    }

    const total = parseInt(totalAmount, 10);
    const count = parseInt(splitCount, 10);
    if (isNaN(total) || total <= 0) {
      Alert.alert('알림', '올바른 금액을 입력해 주세요.');
      return;
    }
    if (isNaN(count) || count <= 0) {
      Alert.alert('알림', '올바른 인원수를 입력해 주세요.');
      return;
    }

    if (isCustomSplit) {
      let othersSum = 0;
      const otherParts = participants.filter(p => p.profile_id !== globalProfile?.id);
      for (const p of otherParts) {
        const amt = parseInt(customAmounts[p.profile_id || ''] || '0', 10);
        if (isNaN(amt) || amt < 0) {
          Alert.alert('알림', `${p.name}님의 정산 금액을 올바르게 입력해 주세요.`);
          return;
        }
        othersSum += amt;
      }
      if (othersSum > total) {
        Alert.alert('알림', '개별 입력 금액의 합이 총 결제 금액을 초과할 수 없습니다.');
        return;
      }
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dutch_pay_bills')
        .insert([{
          title: title.trim(),
          total_amount: total,
          split_count: count,
          bank_name: bankName,
          account_number: accountNumber.trim(),
          account_holder: accountHolder.trim(),
          room_id: roomId,
          creator_id: globalProfile?.id
        }])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        const newBill = data[0] as DutchPayBill;

        // Insert other participants (excluding creator) as dutch_pay_members
        const otherParticipants = participants.filter(p => p.profile_id !== globalProfile?.id);
        if (otherParticipants.length > 0) {
          const membersToInsert = otherParticipants.map(p => {
            const amt = isCustomSplit
              ? parseInt(customAmounts[p.profile_id || ''] || '0', 10)
              : Math.round(total / count);
            return {
              bill_id: newBill.id,
              profile_id: p.profile_id,
              name: `${p.name}:${amt}`,
              is_completed: false
            };
          });

          const { error: membersErr } = await supabase
            .from('dutch_pay_members')
            .insert(membersToInsert);

          if (membersErr) throw membersErr;
        }

        // Send push notifications
        await sendInitialNotification(newBill, otherParticipants);

        setTitle('');
        setTotalAmount('');
        setShowAddForm(false);
        await fetchBills();
        Alert.alert('완료', '정산 요청이 등록되었습니다!');
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('오류', '정산 요청을 저장하는 도중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDeposit = async (bill: DutchPayBill, member: DutchPayMember) => {
    try {
      setLoading(true);
      // 1. Update status
      const { error } = await supabase
        .from('dutch_pay_members')
        .update({ is_completed: true })
        .eq('id', member.id);

      if (error) throw error;

      // 2. Fetch updated member list to check completion
      const { data: updatedMembers, error: fetchErr } = await supabase
        .from('dutch_pay_members')
        .select('*')
        .eq('bill_id', bill.id);

      if (fetchErr) throw fetchErr;

      const allCompleted = updatedMembers && updatedMembers.every((m: any) => m.is_completed);

      if (allCompleted) {
        // Delete members first
        const { error: delMembersErr } = await supabase
          .from('dutch_pay_members')
          .delete()
          .eq('bill_id', bill.id);

        if (delMembersErr) throw delMembersErr;

        // Delete bill (explode)
        const { error: delBillErr } = await supabase
          .from('dutch_pay_bills')
          .delete()
          .eq('id', bill.id);

        if (delBillErr) throw delBillErr;

        Alert.alert('정산 완료! 🎉', `'${bill.title}' 정산이 모든 구성원에 의해 완료되어 대장에서 폭파(자동 삭제)되었습니다!`);
        setSelectedBill(null);
      } else {
        Alert.alert('확인 완료', `${getMemberCleanName(member.name)}님의 입금을 확인했습니다.`);
      }

      await fetchBills();
    } catch (e: any) {
      console.error(e);
      Alert.alert('오류', '입금 확인 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoPayTransfer = (bill: DutchPayBill) => {
    const myMember = bill.dutch_pay_members?.find(m => m.profile_id === globalProfile?.id);
    const amt = getMemberAmount(bill, myMember, globalProfile?.id);
    const kakaopayDeepLink = `kakaotalk://kakaopay/money/to/qr?bank_name=${encodeURIComponent(bill.bank_name)}&account_number=${encodeURIComponent(bill.account_number)}&amount=${amt}`;
    Linking.openURL(kakaopayDeepLink).catch(() => {
      Alert.alert('연동 실패', '카카오톡을 실행할 수 없습니다.');
    });
  };

  const handleTossTransfer = (bill: DutchPayBill) => {
    const myMember = bill.dutch_pay_members?.find(m => m.profile_id === globalProfile?.id);
    const amt = getMemberAmount(bill, myMember, globalProfile?.id);
    const tossDeepLink = `supertoss://send?bank=${encodeURIComponent(bill.bank_name)}&account=${encodeURIComponent(bill.account_number)}&amount=${amt}`;
    const tossWebLink = `https://toss.im/_m/${encodeURIComponent(bill.bank_name)}?account=${encodeURIComponent(bill.account_number)}&amount=${amt}`;

    Linking.canOpenURL(tossDeepLink).then(supported => {
      if (supported) {
        Linking.openURL(tossDeepLink);
      } else {
        Linking.openURL(tossWebLink);
      }
    });
  };

  const handleSendNotification = async (bill: DutchPayBill) => {
    try {
      if (roomId) {
        const hasCustomSplit = bill.dutch_pay_members?.some(m => m.name.includes(':'));
        const msg = hasCustomSplit
          ? `개별 정산 금액 확인 후 송금 부탁드립니다. (${bill.bank_name} ${bill.account_number} 예금주: ${bill.account_holder})`
          : `인당 ${Math.round(bill.total_amount / bill.split_count).toLocaleString()}원 (${bill.bank_name} ${bill.account_number} 예금주: ${bill.account_holder})`;

        const { error } = await supabase
          .from('notifications')
          .insert([{
            room_id: roomId,
            title: `[${roomTitle || '밀챗'}] N빵 정산 요청 💸`,
            message: `${bill.title}: ${msg}`,
            bank_name: bill.bank_name,
            account_number: bill.account_number,
            amount: hasCustomSplit ? 0 : Math.round(bill.total_amount / bill.split_count)
          }]);

        if (error) throw error;
      }

      // Send native push notifications to unpaid members
      if (bill.dutch_pay_members) {
        const unpaidMembers = bill.dutch_pay_members.filter(m => !m.is_completed);
        for (const member of unpaidMembers) {
          const amt = getMemberAmount(bill, member, member.profile_id);
          if (member.profile_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('push_token')
              .eq('id', member.profile_id)
              .single();
            if (profile?.push_token) {
              await sendExpoPushNotifications(
                [profile.push_token],
                `[밀챗 N빵 정산 독촉] ${bill.title} ⏰`,
                `아직 송금하지 않으셨습니다! ${getMemberCleanName(member.name)}님 정산금 ${amt.toLocaleString()}원 입금 부탁드립니다. (${bill.bank_name} ${bill.account_number})`
              );
            }
          }
        }
      }

      Alert.alert('완료', '참여자들에게 정산 독촉 알림을 송신했습니다! 🔔');
    } catch (err: any) {
      console.error(err);
      Alert.alert('오류', '정산 알림 전송 중 오류가 발생했습니다.');
    }
  };

  const getQRImageUrl = (bill: DutchPayBill) => {
    const myMember = bill.dutch_pay_members?.find(m => m.profile_id === globalProfile?.id);
    const amt = getMemberAmount(bill, myMember, globalProfile?.id);
    const qrData = `https://toss.im/_m/${encodeURIComponent(bill.bank_name)}?account=${encodeURIComponent(bill.account_number)}&amount=${amt}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />
      }
    >
      {/* Permanent Ledger Header */}
      <View style={styles.header}>
        <Text style={styles.title}>💸 1/N 엔빵 정산 대장</Text>
        <Text style={styles.subtitle}>이 대장의 정산 내역은 폭파되지 않고 영구 보존됩니다.</Text>

        {roomId ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowAddForm(!showAddForm)}
            >
              <Text style={styles.addBtnText}>
                {showAddForm ? '닫기' : '+ 새 정산 등록'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: THEME.primary, flexDirection: 'row', alignItems: 'center' }]}
              onPress={() => setShowAiModal(true)}
            >
              <Sparkles size={12} color="white" style={{ marginRight: 4 }} />
              <Text style={styles.addBtnText}>📷 AI 영수증 정산</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.globalNoticeText}>※ 새로운 N빵 정산은 각 밀챗 톡방 안에서 등록하실 수 있습니다.</Text>
        )}
      </View>

      {/* PPT Slide 7: 정산 상계 로직 대시보드 */}
      {roomId && bills.length > 0 && (
        <View style={styles.offsetDashboardCard}>
          <Text style={styles.offsetDashboardTitle}>⚖️ 실시간 정산 상계 현황 (총 {bills.length}건)</Text>
          <Text style={styles.offsetDashboardSubtitle}>
            여러 건의 정산 요청을 상계하여 최종적으로 주고받을 금액만 보여드려요.
          </Text>

          {calculateSettlements().length > 0 ? (
            <View style={styles.offsetList}>
              {calculateSettlements().map((settlement, idx) => {
                const isMe = settlement.from.id === globalProfile?.id || settlement.to.id === globalProfile?.id;
                const iAmSender = settlement.from.id === globalProfile?.id;

                return (
                  <View key={idx} style={[styles.settlementRow, isMe && styles.settlementRowHighlight]}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text style={styles.settlementFromName}>
                          {settlement.from.name}
                          {settlement.from.id === globalProfile?.id && ' (나)'}
                        </Text>
                        <Text style={styles.settlementArrow}>→</Text>
                        <Text style={styles.settlementToName}>
                          {settlement.to.name}
                          {settlement.to.id === globalProfile?.id && ' (나)'}
                        </Text>
                      </View>
                      <Text style={styles.settlementAmount}>
                        {settlement.amount.toLocaleString()}원
                      </Text>
                    </View>
                    {settlement.to.id === globalProfile?.id && settlement.to.account && (
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 9, color: THEME.textMuted }}>
                          {settlement.to.bank}
                        </Text>
                        <Text style={{ fontSize: 9, color: THEME.textMuted }}>
                          {settlement.to.account}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.noSettlementText}>정산할 내역이 없습니다. 🎉</Text>
          )}
        </View>
      )}

      {/* Add Bill Form */}
      {showAddForm && roomId && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>새로운 N빵 정산 요청</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>정산 항목명</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="예: 혜화역 삼겹살 모임 🐷"
              placeholderTextColor="#64748b"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1.2, marginRight: 8 }]}>
              <Text style={styles.label}>총 결제 금액 (원)</Text>
              <TextInput
                style={styles.textInput}
                value={totalAmount}
                onChangeText={setTotalAmount}
                placeholder="예: 120000"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.formGroup, { flex: 0.8 }]}>
              <Text style={styles.label}>나눌 인원수 (명)</Text>
              <TextInput
                style={[styles.textInput, isCustomSplit && { backgroundColor: '#f1f5f9', color: '#94a3b8' }]}
                value={splitCount}
                editable={!isCustomSplit}
                onChangeText={setSplitCount}
                placeholder="예: 4"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* 정산 방식 선택 */}
          <View style={[styles.formGroup, { marginTop: 8 }]}>
            <Text style={styles.label}>정산 방식</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                style={[
                  styles.splitTypeBtn,
                  !isCustomSplit && styles.splitTypeBtnActive
                ]}
                onPress={() => {
                  setIsCustomSplit(false);
                  if (participants && participants.length > 0) {
                    setSplitCount(participants.length.toString());
                  }
                }}
              >
                <Text style={[styles.splitTypeBtnText, !isCustomSplit && styles.splitTypeBtnTextActive]}>
                  균등하게 N분의 1 (기본)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.splitTypeBtn,
                  isCustomSplit && styles.splitTypeBtnActive
                ]}
                onPress={() => {
                  setIsCustomSplit(true);
                  if (participants && participants.length > 0) {
                    setSplitCount(participants.length.toString());
                  }
                }}
              >
                <Text style={[styles.splitTypeBtnText, isCustomSplit && styles.splitTypeBtnTextActive]}>
                  개별 소비 금액 입력
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 개별 입력 폼 */}
          {isCustomSplit && participants && participants.length > 0 && (
            <View style={styles.customSplitList}>
              <Text style={[styles.label, { marginBottom: 6 }]}>멤버별 소비 금액 입력 (나 제외)</Text>
              {participants.filter(p => p.profile_id !== globalProfile?.id).map(p => {
                const amount = customAmounts[p.profile_id || ''] || '';
                return (
                  <View key={p.id} style={styles.customSplitRow}>
                    <Text style={styles.customSplitName}>{p.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
                      <TextInput
                        style={styles.customSplitInput}
                        value={amount}
                        onChangeText={(val) => handleCustomAmountChange(p.profile_id || '', val)}
                        placeholder="금액 입력"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                      />
                      <Text style={styles.customSplitUnit}>원</Text>
                    </View>
                  </View>
                );
              })}

              <View style={styles.creatorPortionBox}>
                <Text style={styles.creatorPortionText}>
                  내 정산 부담금: <Text style={{ fontWeight: 'bold', color: THEME.primary }}>{getCreatorPortion().toLocaleString()}원</Text>
                </Text>
                {getCreatorPortion() < 0 && (
                  <Text style={{ fontSize: 9, color: '#ef4444', marginTop: 4 }}>
                    ※ 개별 입력 금액의 합이 총 결제 금액을 초과했습니다!
                  </Text>
                )}
              </View>
            </View>
          )}

          <View style={[styles.formGroup, { marginTop: 12 }]}>
            <Text style={styles.label}>내 정산 계좌번호</Text>
            <TextInput
              style={styles.textInput}
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="예: 카카오뱅크 3333-12-34567"
              placeholderTextColor="#64748b"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>예금주 명</Text>
            <TextInput
              style={styles.textInput}
              value={accountHolder}
              onChangeText={setAccountHolder}
              placeholder="예: 홍길동"
              placeholderTextColor="#64748b"
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleAddBill}>
            <Text style={styles.saveBtnText}>정산 요청 등록 🚀</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bill List */}
      {loading ? (
        <ActivityIndicator size="large" color={THEME.primary} style={{ marginVertical: 20 }} />
      ) : bills.length > 0 ? (
        <View style={{ gap: 12 }}>
          {bills.map(bill => {
            const amountPerPerson = Math.round(bill.total_amount / bill.split_count);
            const isSelected = selectedBill?.id === bill.id;

            return (
              <View key={bill.id} style={styles.billCard}>
                <TouchableOpacity
                  style={styles.billCardHeader}
                  onPress={() => setSelectedBill(isSelected ? null : bill)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.billTitle}>{bill.title}</Text>
                    <Text style={styles.billMeta}>
                      총 {bill.total_amount.toLocaleString()}원 | {bill.split_count}명
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.billSplitAmount}>
                      {(() => {
                        const myMember = bill.dutch_pay_members?.find(m => m.profile_id === globalProfile?.id);
                        const hasCustomSplit = bill.dutch_pay_members?.some(m => m.name.includes(':'));
                        if (myMember) {
                          return `${getMemberAmount(bill, myMember, globalProfile?.id).toLocaleString()}원`;
                        }
                        if (globalProfile && bill.creator_id === globalProfile.id && hasCustomSplit) {
                          return '개별 정산';
                        }
                        return `${Math.round(bill.total_amount / (bill.split_count || 1)).toLocaleString()}원`;
                      })()}
                    </Text>
                    <Text style={styles.billSplitSub}>
                      {(() => {
                        const myMember = bill.dutch_pay_members?.find(m => m.profile_id === globalProfile?.id);
                        const hasCustomSplit = bill.dutch_pay_members?.some(m => m.name.includes(':'));
                        if (globalProfile && bill.creator_id === globalProfile.id && hasCustomSplit) {
                          return '총액 나눔';
                        }
                        return '내 정산 금액';
                      })()}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Expanded QR & Deep links details */}
                {isSelected && (
                  <View style={styles.expandedDetails}>
                    {/* If Creator: Management Panel */}
                    {globalProfile && bill.creator_id === globalProfile.id ? (
                      <View style={styles.managementSection}>
                        <Text style={styles.sectionSubHeading}>👥 구성원 입금 현황 관리</Text>
                        {bill.dutch_pay_members && bill.dutch_pay_members.length > 0 ? (
                          <View style={styles.memberList}>
                            {bill.dutch_pay_members.map(member => (
                              <View key={member.id} style={styles.memberRow}>
                                <Text style={styles.memberName}>
                                  {getMemberCleanName(member.name)} ({getMemberAmount(bill, member).toLocaleString()}원)
                                </Text>
                                <View style={styles.memberStatusRow}>
                                  {member.is_completed ? (
                                    <View style={styles.completedBadge}>
                                      <Check size={12} color="#10b981" />
                                      <Text style={styles.completedBadgeText}>입금 확인됨</Text>
                                    </View>
                                  ) : (
                                    <View style={styles.pendingBadgeRow}>
                                      <Text style={styles.pendingText}>미입금</Text>
                                      <TouchableOpacity
                                        style={styles.confirmDepositBtn}
                                        onPress={() => handleConfirmDeposit(bill, member)}
                                      >
                                        <Text style={styles.confirmDepositBtnText}>확인</Text>
                                      </TouchableOpacity>
                                    </View>
                                  )}
                                </View>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <Text style={styles.noMembersText}>정산 대상 멤버가 없습니다.</Text>
                        )}

                        {/* Broadcast Nudge Button */}
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.sendNotifBtn, { marginTop: 12, width: '100%' }]}
                          onPress={() => handleSendNotification(bill)}
                        >
                          <Bell size={12} color="white" />
                          <Text style={styles.sendNotifText}>미입금자에게 독촉 알림 전송</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      /* If Debtor: show status and payment options */
                      <View style={{ width: '100%', alignItems: 'center' }}>
                        {/* Check if user is a member of this bill */}
                        {(() => {
                          const myMember = bill.dutch_pay_members?.find(m => m.profile_id === globalProfile?.id);
                          if (myMember) {
                            return myMember.is_completed ? (
                              <View style={styles.statusBoxSuccess}>
                                <CheckCircle size={14} color="#10b981" />
                                <Text style={styles.statusBoxTextSuccess}>정산 완료! 예금주가 입금을 확인했습니다.</Text>
                              </View>
                            ) : (
                              <View style={styles.statusBoxPending}>
                                <AlertCircle size={14} color="#ef4444" />
                                <Text style={styles.statusBoxTextPending}>정산 대기 중 (아래 수단으로 송금해 주세요)</Text>
                              </View>
                            );
                          } else {
                            return (
                              <View style={styles.statusBoxInfo}>
                                <AlertCircle size={14} color={THEME.primary} />
                                <Text style={styles.statusBoxTextInfo}>이 정산의 직접적인 대상자가 아닙니다.</Text>
                              </View>
                            );
                          }
                        })()}

                        {/* QR Code Container */}
                        <View style={styles.qrContainer}>
                          <Image
                            source={{ uri: getQRImageUrl(bill) }}
                            style={styles.qrImage}
                            resizeMode="contain"
                          />
                          <Text style={styles.qrText}>상대방의 폰으로 스캔하여 정산</Text>
                        </View>

                        {/* Account Info Box */}
                        <View style={styles.accountBox}>
                          <CreditCard size={14} color="#94a3b8" />
                          <Text style={styles.accountText}>
                            {bill.bank_name} : {bill.account_number} ({bill.account_holder})
                          </Text>
                        </View>

                        {/* Button Row */}
                        <View style={styles.actionBtnRow}>
                          {/* KakaoPay DeepLink Button */}
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.kakaoPayBtn]}
                            onPress={() => handleKakaoPayTransfer(bill)}
                          >
                            <Send size={12} color="black" />
                            <Text style={styles.kakaoPayText}>카카오페이</Text>
                          </TouchableOpacity>

                          {/* Toss DeepLink Button */}
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.tossBtn]}
                            onPress={() => handleTossTransfer(bill)}
                          >
                            <Send size={12} color="white" />
                            <Text style={styles.tossText}>토스 송금</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.noBillsText}>등록된 N빵 정산 요청이 없습니다.</Text>
      )}

      {/* AI Receipt Split Modal */}
      <Modal
        visible={showAiModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAiModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '92%', height: '85%', borderRadius: 16 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.modalTitle}>📷 AI 영수증 인식 개별 정산</Text>
              <TouchableOpacity onPress={() => setShowAiModal(false)}>
                <Text style={{ fontSize: 13, color: THEME.textMuted }}>닫기</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {/* Photo Upload area */}
              <TouchableOpacity
                style={styles.photoUploadArea}
                onPress={handlePickReceiptImage}
              >
                {receiptImage ? (
                  <Image source={{ uri: receiptImage }} style={styles.uploadedReceiptImage} />
                ) : (
                  <View style={{ alignItems: 'center', gap: 6 }}>
                    <Camera size={24} color="#94a3b8" />
                    <Text style={{ fontSize: 11, color: '#94a3b8' }}>영수증 사진 업로드/촬영</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Instruction NLP Text Input */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>🤖 AI 자연어 정산 지시어</Text>
                <TextInput
                  style={[styles.textInput, { height: 60, textAlignVertical: 'top', paddingTop: 8 }]}
                  multiline
                  value={nlpInstruction}
                  onChangeText={setNlpInstruction}
                  placeholder='예: "물냉면은 소희가 먹었고 소주는 대건이랑 나랑 먹었어. 나머지는 전체 N빵해줘"'
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: THEME.primary, marginBottom: 16 }]}
                onPress={handleAiAnalyze}
                disabled={isAiAnalyzing}
              >
                {isAiAnalyzing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveBtnText}>AI 분석 및 자동 매칭 시작 ✨</Text>
                )}
              </TouchableOpacity>

              {isAiAnalyzing && (
                <View style={{ alignItems: 'center', marginVertical: 12 }}>
                  <Text style={{ fontSize: 11, color: THEME.primary, fontWeight: 'bold' }}>{aiAnalysisStep}</Text>
                </View>
              )}

              {/* Receipt Items Breakdown List */}
              {!isAiAnalyzing && receiptItems.length > 0 && (
                <View style={{ gap: 10, marginTop: 4 }}>
                  <Text style={styles.sectionSubHeading}>📋 영수증 세부 메뉴 정산 (터치하여 조율)</Text>

                  {receiptItems.map(item => {
                    return (
                      <View key={item.id} style={styles.receiptItemCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#1e293b' }}>{item.name}</Text>
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: THEME.primary }}>
                            {item.price.toLocaleString()}원
                          </Text>
                        </View>

                        {/* Members scrollable selection list */}
                        <Text style={{ fontSize: 9, color: '#94a3b8', marginBottom: 6 }}>이 메뉴를 먹은 사람 선택:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: 6 }}>
                          {participants.map(p => {
                            const isSelected = item.assignedMemberIds.includes(p.profile_id || p.id);
                            return (
                              <TouchableOpacity
                                key={p.id}
                                style={[
                                  styles.receiptMemberBtn,
                                  isSelected && styles.receiptMemberBtnActive
                                ]}
                                onPress={() => handleToggleMemberInReceiptItem(item.id, p.profile_id || p.id)}
                              >
                                <Text style={[
                                  styles.receiptMemberBtnText,
                                  isSelected && styles.receiptMemberBtnTextActive
                                ]}>
                                  {p.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>

                        <View style={{ marginTop: 6, alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 9, color: '#64748b' }}>
                            {item.assignedMemberIds.length > 0
                              ? `1인당 정산금: ${Math.round(item.price / item.assignedMemberIds.length).toLocaleString()}원 (${item.assignedMemberIds.length}명 분배)`
                              : '선택된 메이트가 없습니다.'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                  {/* Dynamic Totals Summary */}
                  <View style={styles.receiptTotalsCard}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#334155', marginBottom: 8 }}>
                      💰 정산 집계 결과
                    </Text>
                    {Object.keys(getReceiptParticipantTotals()).map(id => {
                      const p = participants.find(part => (part.profile_id || part.id) === id);
                      const isMe = id === globalProfile?.id;
                      const amt = getReceiptParticipantTotals()[id] || 0;
                      return (
                        <View key={id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                          <Text style={{ fontSize: 11, color: '#475569' }}>
                            {p?.name || '참여자'} {isMe && '(나)'}
                          </Text>
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#1e293b' }}>
                            {amt.toLocaleString()}원
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, { marginTop: 12 }]}
              onPress={handleSaveAiReceiptBill}
              disabled={loading}
            >
              <Text style={styles.saveBtnText}>이 결과로 대장에 N빵 등록하기 🚀</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
    padding: 16
  },
  header: {
    marginBottom: 16
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.text
  },
  subtitle: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 2,
    marginBottom: 12
  },
  globalNoticeText: {
    fontSize: 11,
    color: THEME.primary,
    fontStyle: 'italic',
    marginTop: 4
  },
  addBtn: {
    backgroundColor: THEME.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  addBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  formCard: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16
  },
  formTitle: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 12
  },
  formGroup: {
    marginBottom: 12
  },
  label: {
    fontSize: 11,
    color: THEME.textMuted,
    marginBottom: 4
  },
  textInput: {
    backgroundColor: THEME.input,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    color: THEME.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13
  },
  row: {
    flexDirection: 'row'
  },
  saveBtn: {
    backgroundColor: THEME.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8
  },
  saveBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  billCard: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    borderRadius: 10,
    padding: 12
  },
  billCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  billTitle: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: 'bold'
  },
  billMeta: {
    color: THEME.textMuted,
    fontSize: 11,
    marginTop: 2
  },
  billSplitAmount: {
    color: THEME.danger,
    fontSize: 14,
    fontWeight: 'bold'
  },
  billSplitSub: {
    color: THEME.textMuted,
    fontSize: 9,
    marginTop: 2
  },
  expandedDetails: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop: 12,
    alignItems: 'center',
    width: '100%'
  },
  managementSection: {
    width: '100%',
    backgroundColor: THEME.background,
    borderRadius: 8,
    padding: 10,
    marginTop: 4
  },
  sectionSubHeading: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 8
  },
  memberList: {
    gap: 8
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border
  },
  memberName: {
    fontSize: 12,
    color: THEME.text
  },
  memberStatusRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  completedBadgeText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: 'bold'
  },
  pendingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  pendingText: {
    fontSize: 10,
    color: THEME.danger,
    fontWeight: 'bold'
  },
  confirmDepositBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4
  },
  confirmDepositBtnText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold'
  },
  noMembersText: {
    fontSize: 11,
    color: THEME.textMuted,
    textAlign: 'center',
    paddingVertical: 8
  },
  statusBoxSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 6,
    padding: 10,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12
  },
  statusBoxTextSuccess: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: 'bold'
  },
  statusBoxPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
    padding: 10,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12
  },
  statusBoxTextPending: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: 'bold'
  },
  statusBoxInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.badgeBg,
    borderRadius: 6,
    padding: 10,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12
  },
  statusBoxTextInfo: {
    color: THEME.primary,
    fontSize: 11,
    fontWeight: 'bold'
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 12
  },
  qrImage: {
    width: 140,
    height: 140,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8
  },
  qrText: {
    color: THEME.textMuted,
    fontSize: 10,
    marginTop: 6
  },
  accountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.background,
    borderRadius: 6,
    padding: 8,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12
  },
  accountText: {
    color: THEME.text,
    fontSize: 11
  },
  actionBtnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  kakaoPayBtn: {
    backgroundColor: '#FEE500'
  },
  kakaoPayText: {
    color: '#191919',
    fontSize: 12,
    fontWeight: 'bold'
  },
  sendNotifBtn: {
    backgroundColor: THEME.primaryPressed
  },
  sendNotifText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  tossBtn: {
    backgroundColor: '#0057ff'
  },
  tossText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  noBillsText: {
    color: THEME.textMuted,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 20
  },
  roadmapCard: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#323333',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  roadmapTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  roadmapSubtitle: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 12,
    lineHeight: 16,
  },
  roadmapRow: {
    gap: 10,
  },
  roadmapItem: {
    backgroundColor: '#FAFAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  roadmapItemBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.primary,
    backgroundColor: THEME.badgeBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  roadmapItemTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  roadmapItemDesc: {
    fontSize: 10.5,
    color: '#8E8E93',
    lineHeight: 15,
  },
  reviewBadge: {
    backgroundColor: '#FF6B8B15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reviewBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FF6B8B',
  },
  splitTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center'
  },
  splitTypeBtnActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary
  },
  splitTypeBtnText: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '600'
  },
  splitTypeBtnTextActive: {
    color: '#ffffff'
  },
  customSplitList: {
    marginTop: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  customSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  customSplitName: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500'
  },
  customSplitInput: {
    width: 100,
    height: 32,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 12,
    color: '#334155',
    textAlign: 'right'
  },
  customSplitUnit: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4
  },
  creatorPortionBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'flex-end'
  },
  creatorPortionText: {
    fontSize: 12,
    color: '#475569'
  },
  offsetDashboardCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#323333',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  offsetDashboardTitle: {
    fontSize: 13.5,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4
  },
  offsetDashboardSubtitle: {
    fontSize: 10.5,
    color: '#8E8E93',
    marginBottom: 12
  },
  offsetList: {
    gap: 8
  },
  offsetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F2F2F7'
  },
  avatarDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  offsetName: {
    fontSize: 12,
    color: '#333333'
  },
  offsetAmount: {
    fontSize: 12
  },
  settlementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 6
  },
  settlementRowHighlight: {
    backgroundColor: THEME.badgeBg,
    borderColor: THEME.primary
  },
  settlementFromName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155'
  },
  settlementToName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155'
  },
  settlementArrow: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 'bold'
  },
  settlementAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 4
  },
  noSettlementText: {
    fontSize: 12,
    color: THEME.textMuted,
    textAlign: 'center',
    paddingVertical: 16
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#ffffff',
    padding: 18,
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333'
  },
  photoUploadArea: {
    width: '100%',
    height: 120,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  uploadedReceiptImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12
  },
  receiptItemCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2
  },
  receiptMemberBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  receiptMemberBtnActive: {
    backgroundColor: THEME.badgeBg,
    borderColor: THEME.primary
  },
  receiptMemberBtnText: {
    fontSize: 10.5,
    color: '#64748b'
  },
  receiptMemberBtnTextActive: {
    color: THEME.primary,
    fontWeight: 'bold'
  },
  receiptTotalsCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 10,
    marginBottom: 10
  }
});
