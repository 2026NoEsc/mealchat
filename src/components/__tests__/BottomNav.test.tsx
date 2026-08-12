import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BottomNav } from '../BottomNav';

describe('BottomNav', () => {
  it('renders all four tab labels', async () => {
    const { findByText } = await render(<BottomNav activeTab="home" onTabChange={() => {}} />);
    expect(await findByText('홈')).toBeTruthy();
    expect(await findByText('일정 조율')).toBeTruthy();
    expect(await findByText('채팅방')).toBeTruthy();
    expect(await findByText('프로필')).toBeTruthy();
  });

  it('calls onTabChange with the tapped tab key', async () => {
    const onTabChange = jest.fn();
    const { findByText } = await render(<BottomNav activeTab="home" onTabChange={onTabChange} />);
    await fireEvent.press(await findByText('프로필'));
    expect(onTabChange).toHaveBeenCalledWith('profile');
  });
});
