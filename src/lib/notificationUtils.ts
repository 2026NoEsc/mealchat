import * as Notifications from 'expo-notifications';

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
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1
      }
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
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1
      }
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
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1
      }
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
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1
      }
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
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1
      }
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
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1
      }
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
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.ceil(secondsUntilReminder)
        }
      });
    }
  } catch (error) {
    console.error('Error scheduling reminder notification:', error);
  }
};

/**
 * 특정 타입의 예약 알림만 골라서 취소합니다.
 *
 * ⚠️ `cancelAllScheduledNotificationsAsync()`를 쓰면 안 됩니다.
 *    그 함수는 앱의 모든 예약 알림을 지우기 때문에, 미납 정산 체크(30초 주기)가
 *    돌 때마다 약속 리마인더('appointment_reminder')까지 함께 삭제됩니다.
 *    실기기 확인 결과, 약속 확정 0.26초 뒤에 리마인더가 사라졌습니다.
 *
 * @param type content.data.type 값 (예: 'unpaid_bill')
 * @returns 취소한 알림 개수
 */
export const cancelNotificationsByType = async (type: string): Promise<number> => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const targets = scheduled.filter(
      (n) => (n.content?.data as { type?: string } | undefined)?.type === type
    );

    for (const n of targets) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }

    return targets.length;
  } catch (error) {
    console.error(`Error cancelling notifications of type "${type}":`, error);
    return 0;
  }
};

/**
 * 알림을 탭했을 때 이동할 목적지.
 * 이 파일이 발송하는 7종(type)을 모두 여기로 매핑합니다.
 */
export type NotificationTarget = 'schedule' | 'dutch';

export interface NotificationListenerHandlers {
  /** roomId 방을 열고 target 서브탭을 보여줍니다. */
  onOpenRoom?: (roomId: string, target: NotificationTarget) => void;
  /** 채팅 메시지 알림. 방을 열고 채팅을 띄웁니다. */
  onMessageReceived?: (roomId: string) => void;
}

/** type → 열어야 할 서브탭. */
const TYPE_TO_TARGET: Record<string, NotificationTarget> = {
  schedule_confirmed: 'schedule',
  appointment_reminder: 'schedule',
  room_participation: 'schedule',
  user_joined: 'schedule',
  room_created: 'schedule',
  unpaid_bill: 'dutch'
};

export const setupNotificationListeners = (handlers: NotificationListenerHandlers) => {
  const handleResponse = (response: Notifications.NotificationResponse) => {
    // content.data는 Record<string, unknown>이라 좁혀서 사용합니다.
    const { type, roomId } = (response.notification.request.content.data ?? {}) as {
      type?: string;
      roomId?: string;
    };

    if (!roomId || !type) return;

    if (type === 'message') {
      handlers.onMessageReceived?.(roomId);
      return;
    }

    const target = TYPE_TO_TARGET[type];
    if (target) handlers.onOpenRoom?.(roomId, target);
  };

  const notificationListener =
    Notifications.addNotificationResponseReceivedListener(handleResponse);

  // 앱이 완전히 종료된 상태에서 알림을 눌러 실행된 경우, 위 리스너는 이미
  // 지나간 이벤트를 받지 못하므로 마지막 응답을 한 번 직접 처리합니다.
  let cancelled = false;
  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (!cancelled && response) handleResponse(response);
    })
    .catch((error) => {
      console.error('Error reading last notification response:', error);
    });

  return () => {
    cancelled = true;
    notificationListener.remove();
  };
};
