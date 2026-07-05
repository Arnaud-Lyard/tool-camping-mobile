import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import {
  ActivityIndicator,
  Appbar,
  Button,
  Checkbox,
  Dialog,
  Divider,
  FAB,
  HelperText,
  Icon,
  IconButton,
  Menu,
  Portal,
  ProgressBar,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DraggableEquipmentList } from './draggable-equipment-list';
import type { Equipment, EquipmentStatus } from './types';
import { useEquipment } from './use-equipment';

type RowProps = {
  item: Equipment;
  selected: boolean;
  menuOpen: boolean;
  dragEnabled: boolean;
  dragGesture: PanGesture;
  onToggleSelect: (id: number) => void;
  onToggleStatus: (item: Equipment) => void;
  onOpenMenu: (id: number) => void;
  onCloseMenu: () => void;
  onEdit: (item: Equipment) => void;
  onDelete: (id: number) => void;
};

/**
 * A single equipment row. Memoized so a state change on the screen (selecting
 * another row, opening a menu, typing in a dialog) only re-renders the rows
 * whose own `selected` / `menuOpen` actually changed. The heavy `Menu` (a
 * Portal) is mounted only for the open row instead of once per row.
 */
const EquipmentRow = memo(function EquipmentRow({
  item,
  selected,
  menuOpen,
  dragEnabled,
  dragGesture,
  onToggleSelect,
  onToggleStatus,
  onOpenMenu,
  onCloseMenu,
  onEdit,
  onDelete,
}: RowProps) {
  const { t } = useTranslation();
  const complete = item.status === 'complete';
  const anchor = <IconButton icon="dots-vertical" onPress={() => onOpenMenu(item.id)} />;

  return (
    <View style={styles.row}>
      <Checkbox
        status={selected ? 'checked' : 'unchecked'}
        onPress={() => onToggleSelect(item.id)}
      />
      <IconButton
        icon={complete ? 'check-circle' : 'circle-outline'}
        iconColor={complete ? '#16a34a' : undefined}
        onPress={() => onToggleStatus(item)}
        accessibilityLabel={
          complete ? t('equipment.actions.markInProgress') : t('equipment.actions.markComplete')
        }
      />
      <Text style={[styles.name, complete && styles.nameComplete]} numberOfLines={1}>
        {item.name}
      </Text>
      {menuOpen ? (
        <Menu visible onDismiss={onCloseMenu} anchor={anchor}>
          <Menu.Item
            onPress={() => onEdit(item)}
            title={t('equipment.actions.edit')}
            leadingIcon="pencil"
          />
          <Divider />
          <Menu.Item
            onPress={() => onDelete(item.id)}
            title={t('equipment.actions.delete')}
            leadingIcon="delete"
          />
        </Menu>
      ) : (
        anchor
      )}
      {dragEnabled ? (
        <GestureDetector gesture={dragGesture}>
          <View
            style={styles.handle}
            accessible
            accessibilityLabel={t('equipment.actions.reorder')}
          >
            <Icon source="drag-vertical" size={26} />
          </View>
        </GestureDetector>
      ) : null}
    </View>
  );
});

export default function EquipmentScreen() {
  const { t } = useTranslation();
  const eq = useEquipment();

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [dialog, setDialog] = useState<{
    editId: number | null;
    name: string;
    error: boolean;
  } | null>(null);
  const progress = useMemo(() => {
    const total = eq.items.length;
    const complete = eq.items.filter((e) => e.status === 'complete').length;
    return { total, complete, ratio: total ? complete / total : 0 };
  }, [eq.items]);

  const visible = eq.items;

  const toggleSelected = useCallback(
    (id: number) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    [],
  );

  const allVisibleSelected =
    visible.length > 0 && visible.every((e) => selected.has(e.id));

  const toggleSelectAll = () =>
    setSelected(allVisibleSelected ? new Set() : new Set(visible.map((e) => e.id)));

  const clearSelection = () => setSelected(new Set());

  // --- Actions ------------------------------------------------------------
  // Row handlers are stabilized with useCallback so the memoized rows don't
  // re-render on unrelated screen state changes.
  const setStatus = eq.setStatus;
  const remove = eq.remove;

  const removeIds = useCallback(
    async (ids: number[]) => {
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      try {
        await remove(ids);
      } catch {
        /* optimistic list reloads on error */
      }
    },
    [remove],
  );

  const toggleStatus = useCallback(
    async (item: Equipment) => {
      const next: EquipmentStatus =
        item.status === 'in_progress' ? 'complete' : 'in_progress';
      try {
        await setStatus([item.id], next);
      } catch {
        /* optimistic list reloads on error */
      }
    },
    [setStatus],
  );

  const openMenu = useCallback((id: number) => setMenuFor(id), []);
  const closeMenu = useCallback(() => setMenuFor(null), []);

  const editItem = useCallback((item: Equipment) => {
    setMenuFor(null);
    setDialog({ editId: item.id, name: item.name, error: false });
  }, []);

  const bulkStatus = async (status: EquipmentStatus) => {
    const ids = [...selected];
    if (!ids.length) return;
    try {
      await eq.setStatus(ids, status);
      clearSelection();
    } catch {
      /* optimistic list reloads on error */
    }
  };

  const requestDelete = useCallback(
    (id: number) => {
      setMenuFor(null);
      void removeIds([id]);
    },
    [removeIds],
  );

  const generate = async () => {
    try {
      await eq.generate();
    } catch {
      /* the item is only added on success, so nothing changes on error */
    }
  };

  const submitDialog = async () => {
    if (!dialog) return;
    const name = dialog.name.trim();
    if (!name) {
      setDialog({ ...dialog, error: true });
      return;
    }
    try {
      if (dialog.editId == null) {
        await eq.create(name);
      } else {
        await eq.update(dialog.editId, name);
      }
      setDialog(null);
    } catch {
      /* keep the dialog open so the user can retry */
    }
  };

  // The list is never filtered, so `visible` always equals the full list and
  // dragging can stay enabled: the persisted order covers every item.
  const canDrag = true;

  const reorder = eq.reorder;
  const onReorder = useCallback(
    async (ordered: Equipment[]) => {
      try {
        await reorder(ordered);
      } catch {
        /* optimistic list reloads on error */
      }
    },
    [reorder],
  );

  // --- Render -------------------------------------------------------------
  const renderRow = useCallback(
    (item: Equipment, dragGesture: PanGesture) => (
      <EquipmentRow
        item={item}
        selected={selected.has(item.id)}
        menuOpen={menuFor === item.id}
        dragEnabled={canDrag}
        dragGesture={dragGesture}
        onToggleSelect={toggleSelected}
        onToggleStatus={toggleStatus}
        onOpenMenu={openMenu}
        onCloseMenu={closeMenu}
        onEdit={editItem}
        onDelete={requestDelete}
      />
    ),
    [selected, menuFor, canDrag, toggleSelected, toggleStatus, openMenu, closeMenu, editItem, requestDelete],
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Appbar.Header>
        <Appbar.Content title={t('equipment.title')} />
      </Appbar.Header>

      {eq.items.length > 0 ? (
        <View style={styles.toolbar}>
          <View style={styles.progressHeader}>
            <Text variant="labelLarge">{t('equipment.progress.label')}</Text>
            <Text variant="labelLarge">
              {progress.complete} / {progress.total}
            </Text>
          </View>
          <ProgressBar progress={progress.ratio} color="#16a34a" style={styles.progressBar} />
        </View>
      ) : null}

      {selected.size > 0 ? (
        <Surface style={styles.bulkBar} elevation={2}>
          <Text variant="labelLarge">
            {selected.size} {t('equipment.bulk.selectedLabel')}
          </Text>
          <View style={styles.bulkActions}>
            <IconButton icon="circle-outline" onPress={() => bulkStatus('in_progress')} accessibilityLabel={t('equipment.bulk.markAllInProgress')} />
            <IconButton icon="check-circle" onPress={() => bulkStatus('complete')} accessibilityLabel={t('equipment.bulk.markAllComplete')} />
            <IconButton icon="delete" onPress={() => removeIds([...selected])} accessibilityLabel={t('equipment.bulk.delete')} />
          </View>
        </Surface>
      ) : null}

      {eq.loading ? (
        <ActivityIndicator style={styles.center} />
      ) : (
        <DraggableEquipmentList
          items={visible}
          enabled={canDrag}
          onReorder={onReorder}
          renderItem={renderRow}
          onRefresh={eq.reload}
          refreshing={false}
          ListHeaderComponent={
            visible.length > 0 ? (
              <Button compact onPress={toggleSelectAll} style={styles.selectAll}>
                {allVisibleSelected ? t('equipment.deselectAll') : t('equipment.selectAll')}
              </Button>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text variant="titleMedium">
                {eq.error ? t('equipment.toast.error') : t('equipment.empty.title')}
              </Text>
              {!eq.error ? <Text variant="bodyMedium">{t('equipment.empty.text')}</Text> : null}
            </View>
          }
        />
      )}

      {eq.items.length === 0 && !eq.loading ? (
        <FAB
          icon="playlist-plus"
          label={t('equipment.generate')}
          style={styles.fabGenerate}
          onPress={generate}
        />
      ) : null}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setDialog({ editId: null, name: '', error: false })}
        accessibilityLabel={t('equipment.create')}
      />

      {/* Create / edit dialog */}
      <Portal>
        <Dialog visible={dialog !== null} onDismiss={() => setDialog(null)}>
          <Dialog.Title>
            {t(dialog?.editId == null ? 'equipment.modal.createTitle' : 'equipment.modal.editTitle')}
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label={t('equipment.modal.nameLabel')}
              placeholder={t('equipment.modal.namePlaceholder')}
              value={dialog?.name ?? ''}
              maxLength={510}
              autoFocus
              onChangeText={(name) => setDialog((d) => (d ? { ...d, name, error: false } : d))}
            />
            <HelperText type="error" visible={!!dialog?.error}>
              {t('equipment.modal.nameRequired')}
            </HelperText>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialog(null)}>{t('equipment.modal.cancel')}</Button>
            <Button onPress={submitDialog}>{t('equipment.modal.save')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: { paddingHorizontal: 12, paddingVertical: 8 },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressBar: { height: 8, borderRadius: 4 },
  bulkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingLeft: 16,
    borderRadius: 12,
  },
  bulkActions: { flexDirection: 'row' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingRight: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(120,120,120,0.25)',
  },
  name: { flex: 1, marginLeft: 4 },
  nameComplete: { textDecorationLine: 'line-through', opacity: 0.6 },
  handle: { paddingHorizontal: 8, paddingVertical: 12, justifyContent: 'center' },
  selectAll: { alignSelf: 'flex-start' },
  center: { padding: 32, alignItems: 'center', gap: 4 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
  fabGenerate: { position: 'absolute', right: 16, bottom: 84 },
});
