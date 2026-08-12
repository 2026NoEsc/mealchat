import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AppHeader } from '../AppHeader';

describe('AppHeader', () => {
  it('renders the MEALCHAT wordmark', async () => {
    const { findByText } = await render(<AppHeader />);
    expect(await findByText('MEALCHAT')).toBeTruthy();
  });

  it('calls onBellPress when the bell is tapped', async () => {
    const onBellPress = jest.fn();
    const { findByTestId } = await render(<AppHeader onBellPress={onBellPress} />);
    await fireEvent.press(await findByTestId('app-header-bell'));
    expect(onBellPress).toHaveBeenCalledTimes(1);
  });
});
