import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

interface ScheduleContextType {
  mySchedule: { [date: string]: string[] };
  selectedDate: string;
  noteDuration: number;
  noteTimeEnabled: boolean;
  noteTitle: string;
  noteContent: string;
  noteColor: string;
  noteVisibility: 'public' | 'best' | 'private';
  editingNoteId: string | null;
  editingRoomId: string | null;
  showNoteForm: boolean;
  noteTimeAmPm: 'AM' | 'PM';
  noteTimeHour: string;
  noteTimeMinute: string;
  noteEndTimeAmPm: 'AM' | 'PM';
  noteEndTimeHour: string;
  noteEndTimeMinute: string;
  showTimePickerModal: boolean;
  activeTimeField: 'start' | 'end';
  setMySchedule: (schedule: { [date: string]: string[] }) => void;
  setSelectedDate: (date: string) => void;
  setNoteDuration: (duration: number) => void;
  setNoteTimeEnabled: (enabled: boolean) => void;
  setNoteTitle: (title: string) => void;
  setNoteContent: (content: string) => void;
  setNoteColor: (color: string) => void;
  setNoteVisibility: (visibility: 'public' | 'best' | 'private') => void;
  setEditingNoteId: (id: string | null) => void;
  setEditingRoomId: (id: string | null) => void;
  setShowNoteForm: (show: boolean) => void;
  setNoteTimeAmPm: (amPm: 'AM' | 'PM') => void;
  setNoteTimeHour: (hour: string) => void;
  setNoteTimeMinute: (minute: string) => void;
  setNoteEndTimeAmPm: (amPm: 'AM' | 'PM') => void;
  setNoteEndTimeHour: (hour: string) => void;
  setNoteEndTimeMinute: (minute: string) => void;
  setShowTimePickerModal: (show: boolean) => void;
  setActiveTimeField: (field: 'start' | 'end') => void;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export const ScheduleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mySchedule, setMySchedule] = useState<{ [date: string]: string[] }>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [noteDuration, setNoteDuration] = useState(1);
  const [noteTimeEnabled, setNoteTimeEnabled] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteColor, setNoteColor] = useState('#23A455');
  const [noteVisibility, setNoteVisibility] = useState<'public' | 'best' | 'private'>('public');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTimeAmPm, setNoteTimeAmPm] = useState<'AM' | 'PM'>('AM');
  const [noteTimeHour, setNoteTimeHour] = useState('09');
  const [noteTimeMinute, setNoteTimeMinute] = useState('00');
  const [noteEndTimeAmPm, setNoteEndTimeAmPm] = useState<'AM' | 'PM'>('AM');
  const [noteEndTimeHour, setNoteEndTimeHour] = useState('10');
  const [noteEndTimeMinute, setNoteEndTimeMinute] = useState('00');
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState<'start' | 'end'>('start');

  const value = useMemo<ScheduleContextType>(() => ({
    mySchedule,
    selectedDate,
    noteDuration,
    noteTimeEnabled,
    noteTitle,
    noteContent,
    noteColor,
    noteVisibility,
    editingNoteId,
    editingRoomId,
    showNoteForm,
    noteTimeAmPm,
    noteTimeHour,
    noteTimeMinute,
    noteEndTimeAmPm,
    noteEndTimeHour,
    noteEndTimeMinute,
    showTimePickerModal,
    activeTimeField,
    setMySchedule,
    setSelectedDate,
    setNoteDuration,
    setNoteTimeEnabled,
    setNoteTitle,
    setNoteContent,
    setNoteColor,
    setNoteVisibility,
    setEditingNoteId,
    setEditingRoomId,
    setShowNoteForm,
    setNoteTimeAmPm,
    setNoteTimeHour,
    setNoteTimeMinute,
    setNoteEndTimeAmPm,
    setNoteEndTimeHour,
    setNoteEndTimeMinute,
    setShowTimePickerModal,
    setActiveTimeField,
  }), [mySchedule, selectedDate, noteDuration, noteTimeEnabled, noteTitle, noteContent, noteColor, noteVisibility, editingNoteId, editingRoomId, showNoteForm, noteTimeAmPm, noteTimeHour, noteTimeMinute, noteEndTimeAmPm, noteEndTimeHour, noteEndTimeMinute, showTimePickerModal, activeTimeField]);

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
};

export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within ScheduleProvider');
  }
  return context;
};
