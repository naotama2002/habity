import {describe, expect, it, jest, beforeEach} from '@jest/globals';
import {Text} from 'react-native';
import {render, screen} from '@testing-library/react-native';

const mockInitI18n = jest.fn();

jest.mock('../i18n', () => ({
  i18n: {locale: 'ja', _: (v: unknown) => v},
  initI18n: (...args: unknown[]) => mockInitI18n(...args),
}));

jest.mock('@lingui/react', () => ({
  I18nProvider: ({children}: {children: React.ReactNode}) => children,
}));

import {I18nProvider, resetI18nInitializedForTest} from '../i18nProvider';
import {DEFAULT_LANGUAGE} from '../languages';

describe('I18nProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetI18nInitializedForTest();
  });

  it('初回描画で children を返す（準備待ちの空描画を挟まない）', () => {
    // 回帰: 以前は effect + setState で初期化していたため
    // 初回に null を返す余分な描画が入っていた
    render(
      <I18nProvider>
        <Text>content</Text>
      </I18nProvider>,
    );

    expect(screen.getByText('content')).toBeTruthy();
  });

  it('デフォルト言語で i18n を初期化する', () => {
    render(
      <I18nProvider>
        <Text>content</Text>
      </I18nProvider>,
    );

    expect(mockInitI18n).toHaveBeenCalledWith(DEFAULT_LANGUAGE);
  });

  it('再描画しても初期化は一度だけ', () => {
    const {rerender} = render(
      <I18nProvider>
        <Text>a</Text>
      </I18nProvider>,
    );
    rerender(
      <I18nProvider>
        <Text>b</Text>
      </I18nProvider>,
    );

    expect(mockInitI18n).toHaveBeenCalledTimes(1);
  });
});
