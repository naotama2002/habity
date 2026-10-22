import {describe, expect, it, jest} from '@jest/globals';
import {render, screen} from '@testing-library/react-native';
import {Text} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SortableList} from '../SortableList';

/**
 * gesture-handler v3 から GestureDetector は GestureHandlerRootView の
 * 配下であることが必須になった。本番は app/_layout.tsx で包まれているので、
 * テストでも同じ構造で描画する。
 */
function renderInRoot(ui: React.ReactElement) {
  return render(<GestureHandlerRootView>{ui}</GestureHandlerRootView>);
}

const mockData = [
  {id: '1', name: 'Item A'},
  {id: '2', name: 'Item B'},
  {id: '3', name: 'Item C'},
];

describe('SortableList', () => {
  it('should render all items', () => {
    renderInRoot(
      <SortableList
        data={mockData}
        keyExtractor={(item) => item.id}
        renderItem={(item) => <Text>{item.name}</Text>}
        onReorder={jest.fn()}
      />,
    );

    expect(screen.getByText('Item A')).toBeTruthy();
    expect(screen.getByText('Item B')).toBeTruthy();
    expect(screen.getByText('Item C')).toBeTruthy();
  });

  it('should render grip handles for each item', () => {
    renderInRoot(
      <SortableList
        data={mockData}
        keyExtractor={(item) => item.id}
        renderItem={(item) => <Text>{item.name}</Text>}
        onReorder={jest.fn()}
      />,
    );

    const handles = screen.getAllByLabelText('Reorder');
    expect(handles).toHaveLength(3);
  });

  it('should render empty list when data is empty', () => {
    const onReorder = jest.fn();
    renderInRoot(
      <SortableList
        data={[]}
        keyExtractor={(item: {id: string}) => item.id}
        renderItem={() => <Text>Item</Text>}
        onReorder={onReorder}
      />,
    );

    expect(screen.queryByText('Item')).toBeNull();
  });

  it('should pass correct index to renderItem', () => {
    const renderItem = jest.fn((item: typeof mockData[number], index: number) => (
      <Text>{`${item.name}-${index}`}</Text>
    ));

    renderInRoot(
      <SortableList
        data={mockData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onReorder={jest.fn()}
      />,
    );

    expect(renderItem).toHaveBeenCalledTimes(3);
    expect(screen.getByText('Item A-0')).toBeTruthy();
    expect(screen.getByText('Item B-1')).toBeTruthy();
    expect(screen.getByText('Item C-2')).toBeTruthy();
  });
});
