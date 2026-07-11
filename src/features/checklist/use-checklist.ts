import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/auth/auth-context';
import i18n from '@/i18n';
import { compareChecklistItem, type ChecklistItem, type ChecklistItemStatus } from './types';

export function useChecklist() {
  const { authedFetch } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const sorted = useCallback(
    (list: ChecklistItem[]) => [...list].sort(compareChecklistItem),
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await authedFetch<ChecklistItem[]>('/api/checklist');
      setItems(sorted(data));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [authedFetch, sorted]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (name: string) => {
      const row = await authedFetch<ChecklistItem>('/api/checklist', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setItems((prev) => sorted([row, ...prev]));
    },
    [authedFetch, sorted],
  );

  const update = useCallback(
    async (id: number, name: string) => {
      const row = await authedFetch<ChecklistItem>(`/api/checklist/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
      setItems((prev) => prev.map((e) => (e.id === id ? row : e)));
    },
    [authedFetch],
  );

  const generate = useCallback(async () => {
    const rows = await authedFetch<ChecklistItem[]>('/api/checklist/generate', {
      method: 'POST',
      body: JSON.stringify({ locale: i18n.language }),
    });
    setItems((prev) => sorted([...rows, ...prev]));
  }, [authedFetch, sorted]);

  const setStatus = useCallback(
    async (ids: number[], status: ChecklistItemStatus) => {
      setItems((prev) =>
        sorted(prev.map((e) => (ids.includes(e.id) ? { ...e, status } : e))),
      );
      try {
        await authedFetch('/api/checklist/status', {
          method: 'POST',
          body: JSON.stringify({ ids, status }),
        });
      } catch (err) {
        await load();
        throw err;
      }
    },
    [authedFetch, sorted, load],
  );

  const remove = useCallback(
    async (ids: number[]) => {
      const path =
        ids.length === 1
          ? `/api/checklist/${ids[0]}`
          : '/api/checklist/bulk-delete';
      const init: RequestInit =
        ids.length === 1
          ? { method: 'DELETE' }
          : { method: 'POST', body: JSON.stringify({ ids }) };
      setItems((prev) => prev.filter((e) => !ids.includes(e.id)));
      try {
        await authedFetch(path, init);
      } catch (err) {
        await load();
        throw err;
      }
    },
    [authedFetch, load],
  );

  const reorder = useCallback(
    async (ordered: ChecklistItem[]) => {
      const reindexed = ordered.map((e, index) => ({ ...e, ordre: index }));
      setItems(reindexed);
      try {
        await authedFetch('/api/checklist/reorder', {
          method: 'POST',
          body: JSON.stringify({ ids: reindexed.map((e) => e.id) }),
        });
      } catch (err) {
        await load();
        throw err;
      }
    },
    [authedFetch, load],
  );

  return {
    items,
    loading,
    error,
    reload: load,
    create,
    update,
    generate,
    setStatus,
    remove,
    reorder,
  };
}
