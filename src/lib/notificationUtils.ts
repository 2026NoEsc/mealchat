import * as Notifications from 'expo-notifications';
import { supabase } from './supabaseClient';

export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

export const sendScheduleConfirmedNotification = async (
  title: string,
  message: string,
  roomId: string,
  confirmedSlot: string
) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: message,
        data: {
          roomId: roomId,
          confirmedSlot: confirmedSlot,
          type: 'schedule_confirmed'
        },
        sound: 'default'
      },
      trigger: { type: 'seconds', seconds: 1 }
    });
  } catch (error) {
    console.error('Error sending schedule confirmed notification:', error);
  }
};

export const sendRoomParticipationNotification = async (
  title: string,
  message: string,
  roomId: string
) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: message,
        data: {
          roomId: roomId,
          type: 'room_participation'
        },
        sound: 'default'
      },
      trigger: { type: 'seconds', seconds: 1 }
    });
  } catch (error) {
    console.error('Error sending room participation notification:', error);
  }
};

export const sendMessageNotification = async (
  senderName: string,
  message: string,
  roomId: string
) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${senderName}님이 메시지를 보냈습니다`,
        body: message.substring(0, 100),
        data: {
          roomId: roomId,
          type: 'message'
        },
        sound: 'default'
      },
      trigger: { type: 'seconds', seconds: 1 }
    });
  } catch (error) {
    console.error('Error sending message notification:', error);
  }
};

export const sendUnpaidBillNotification = async (
  creditorName: string,
  amount: number,
  roomId: string
) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💰 미정산 내역이 있습니다',
        body: `${creditorName}님에게 ${amount.toLocaleString()}원을 보내야 합니다`,
        data: {
          roomId: roomId,
          creditorName: creditorName,
          amount: amount.toString(),
          type: 'unpaid_bill'
        },
        sound: 'default'
      },
      trigger: { type: 'seconds', seconds: 1 }
    });
  } catch (error) {
    console.error('Error sending unpaid bill notification:', error);
  }
};

export const sendRoomCreatedNotification = async (
  title: string,
  roomTitle: string,
  roomCode: string
) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: `"${roomTitle}" 방이 생성되었습니다. 초대코드: ${roomCode}`,
        data: {
          type: 'room_created',
          roomCode: roomCode
        },
        sound: 'default'
      },
      trigger: { type: 'seconds', seconds: 1 }
    });
  } catch (error) {
    console.error('Error sending room created notification:', error);
  }
};

export const sendUserJoinedNotification = async (
  userName: string,
  roomTitle: string,
  roomId: string
) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `👋 ${userName}님이 입장했습니다`,
        body: `"${roomTitle}" 방에 새로운 참여자가 들어왔습니다`,
        data: {
          roomId: roomId,
          userName: userName,
          type: 'user_joined'
        },
        sound: 'default'
      },
      trigger: { type: 'seconds', seconds: 1 }
    });
  } catch (error) {
    console.error('Error sending user joined notification:', error);
  }
};

export const scheduleConfirmedReminderNotification = async (
  roomTitle: string,
  confirmedSlot: string,
  roomId: string,
  meetingDate?: string
) => {
  try {
    // 약속 1시간 전에 알림 발송
    const timeMatch = confirmedSlot.match(/(\d{1,2}):(\d{2})/);
    if (!timeMatch) return;

    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);

    let appointmentTime: Date;
    if (meetingDate) {
      // meetingDate는 YYYY-MM-DD 형식
      const dateParts = meetingDate.split('-');
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1;
      const day = parseInt(dateParts[2]);
      appointmentTime = new Date(year, month, day, hours, minutes);
    } else {
      // meetingDate 없으면 오늘로 설정 (하위 호환성)
      const now = new Date();
      appointmentTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    }

    const now = new Date();
    if (appointmentTime <= now) return;

    const secondsUntilAppointment = (appointmentTime.getTime() - now.getTime()) / 1000;
    const secondsUntilReminder = secondsUntilAppointment - 3600; // 1시간 전

    if (secondsUntilReminder > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ 약속 시간이 다가왔습니다',
          body: `"${roomTitle}"의 약속이 1시간 후에 시작됩니다! (${confirmedSlot})`,
          data: {
            roomId: roomId,
            type: 'appointment_reminder'
          },
          sound: 'default'
        },
        trigger: { type: 'seconds', seconds: Math.ceil(secondsUntilReminder) }
      });
    }
  } catch (error) {
    console.error('Error scheduling reminder notification:', error);
  }
};

export const setupNotificationListeners = (
  onScheduleConfirmed?: (roomId: string) => void,
  onRoomParticipation?: (roomId: string) => void,
  onMessageReceived?: (roomId: string) => void
) => {
  const notificationListener = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const { type, roomId } = response.notification.request.content.data;

      switch (type) {
        case 'schedule_confirmed':
          if (onScheduleConfirmed) onScheduleConfirmed(roomId);
          break;
        case 'room_participation':
          if (onRoomParticipation) onRoomParticipation(roomId);
          break;
        case 'message':
          if (onMessageReceived) onMessageReceived(roomId);
          break;
      }
    }
  );

  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
  };
};
