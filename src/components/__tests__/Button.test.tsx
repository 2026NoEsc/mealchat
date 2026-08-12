import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button, ButtonVariant } from '../Button';

const VARIANTS: ButtonVariant[] = ['complete', 'completeAndNext', 'accent', 'accentAndNext', 'danger'];

describe('Button', () => {
  it.each(VARIANTS)('renders the label for variant "%s"', async (variant) => {
    const { findByText } = await render(<Button variant={variant} label="확인" onPress={() => {}} />);
    expect(await findByText('확인')).toBeTruthy();
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    const { findByText } = await render(<Button variant="complete" label="다음 →" onPress={onPress} />);
    await fireEvent.press(await findByText('다음 →'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    const { findByText } = await render(
      <Button variant="danger" label="방 나가기" onPress={onPress} disabled />
    );
    await fireEvent.press(await findByText('방 나가기'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
