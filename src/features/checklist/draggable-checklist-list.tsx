import { type ReactNode, useCallback, useEffect } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { Gesture, type PanGesture, ScrollView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import type { ChecklistItem } from './types';

/** Fixed row height — required so absolute positions map cleanly to slots. */
export const ITEM_HEIGHT = 56;

type Positions = Record<number, number>;

const fromItems = (items: ChecklistItem[]): Positions =>
  Object.fromEntries(items.map((item, index) => [item.id, index]));

const clamp = (value: number, lower: number, upper: number): number => {
  'worklet';
  return Math.max(lower, Math.min(value, upper));
};

/** Swap the items sitting at positions `from` and `to`. */
const objectMove = (positions: Positions, from: number, to: number): Positions => {
  'worklet';
  const next: Positions = { ...positions };
  for (const id in positions) {
    if (positions[id] === from) next[id] = to;
    else if (positions[id] === to) next[id] = from;
  }
  return next;
};

type RowProps = {
  item: ChecklistItem;
  positions: SharedValue<Positions>;
  count: number;
  enabled: boolean;
  onReorder: () => void;
  render: (item: ChecklistItem, drag: PanGesture) => ReactNode;
};

function DraggableRow({ item, positions, count, enabled, onReorder, render }: RowProps) {
  const isActive = useSharedValue(false);
  const top = useSharedValue((positions.value[item.id] ?? 0) * ITEM_HEIGHT);
  const startTop = useSharedValue(0);

  // Follow the shared positions when another row's drag reshuffles this one.
  useAnimatedReaction(
    () => positions.value[item.id],
    (current, previous) => {
      if (current != null && current !== previous && !isActive.value) {
        top.value = withSpring(current * ITEM_HEIGHT);
      }
    },
  );

  const drag = Gesture.Pan()
    .enabled(enabled)
    .activateAfterLongPress(150)
    .onStart(() => {
      isActive.value = true;
      startTop.value = top.value;
    })
    .onUpdate((event) => {
      top.value = startTop.value + event.translationY;
      const newPos = clamp(Math.round(top.value / ITEM_HEIGHT), 0, count - 1);
      const oldPos = positions.value[item.id];
      if (newPos !== oldPos) {
        positions.value = objectMove(positions.value, oldPos, newPos);
      }
    })
    .onEnd(() => {
      top.value = withSpring((positions.value[item.id] ?? 0) * ITEM_HEIGHT);
    })
    .onFinalize(() => {
      if (isActive.value) {
        isActive.value = false;
        runOnJS(onReorder)();
      }
    });

  const style = useAnimatedStyle(() => ({
    top: top.value,
    zIndex: isActive.value ? 1 : 0,
    elevation: isActive.value ? 4 : 0,
    opacity: isActive.value ? 0.96 : 1,
  }));

  return (
    <Animated.View style={[styles.row, style]}>{render(item, drag)}</Animated.View>
  );
}

type Props = {
  items: ChecklistItem[];
  enabled: boolean;
  onReorder: (ordered: ChecklistItem[]) => void;
  renderItem: (item: ChecklistItem, drag: PanGesture) => ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  ListHeaderComponent?: ReactNode;
  ListEmptyComponent?: ReactNode;
};

/**
 * A reorderable list built on gesture-handler + reanimated (no extra
 * dependency). Rows are absolutely positioned at fixed-height slots; dragging a
 * row's handle reshuffles the shared `positions` and persists the new order on
 * release. Dragging is only enabled by the caller in the unfiltered view so the
 * persisted order always covers the whole list.
 */
export function DraggableChecklistList({
  items,
  enabled,
  onReorder,
  renderItem,
  refreshing,
  onRefresh,
  ListHeaderComponent,
  ListEmptyComponent,
}: Props) {
  const positions = useSharedValue<Positions>(fromItems(items));

  // Re-sync when items are added / removed / reloaded.
  useEffect(() => {
    positions.value = fromItems(items);
  }, [items, positions]);

  const handleReorder = useCallback(() => {
    const pos = positions.value;
    const ordered = [...items].sort((a, b) => (pos[a.id] ?? 0) - (pos[b.id] ?? 0));
    onReorder(ordered);
  }, [items, onReorder, positions]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      {ListHeaderComponent}
      {items.length === 0 ? (
        ListEmptyComponent
      ) : (
        <View style={{ height: items.length * ITEM_HEIGHT }}>
          {items.map((item) => (
            <DraggableRow
              key={item.id}
              item={item}
              positions={positions}
              count={items.length}
              enabled={enabled}
              onReorder={handleReorder}
              render={renderItem}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 88 },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
  },
});
