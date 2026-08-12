import React from 'react';
import { StyleSheet } from 'react-native';
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

  /**
   * 회귀: solid/danger 변형은 TouchableOpacity 자체에 `flex: 1` 을 얹고 있었다.
   * flex:1 은 flexBasis 를 0 으로 만들어 같은 스타일의 height:48 을 덮어쓰므로,
   * 부모가 높이를 주지 않으면 버튼이 **높이 0 으로 접혀 화면에서 사라졌다.**
   * 홈의 "일정잡기" 등 3개가 실제로 보이지 않았는데, `findByText` 는 레이아웃을
   * 보지 않아 위 테스트들은 전부 통과했다. 그래서 스타일을 직접 확인한다.
   */
  it.each(VARIANTS)('variant "%s" 는 높이를 잃지 않는다', async (variant) => {
    const { findByTestId } = await render(<Button variant={variant} label="확인" onPress={() => {}} />);
    const flat = StyleSheet.flatten((await findByTestId('app-button')).props.style);
    expect(flat.height).toBe(48);
    expect(flat.flex).toBeUndefined();
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
