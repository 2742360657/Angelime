import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import {
  DEFAULT_PROFILE_NAME,
  DEFAULT_PROFILE_SIGNATURE,
  loadAppDataFromDisk,
  saveAppDataToDisk,
} from '../storage/habitStorage';
import { DEFAULT_THEME_ID, getTheme, ThemeId } from '../theme';
import {
  AppData,
  AppSettings,
  CheckinRecord,
  Habit,
  HabitCadence,
  HabitGroup,
  TodoItem,
  Memo,
  MemoGroup,
} from '../types/habit';
import { clampToMinute, getTodayKey, toLocalDateKey } from '../utils/date';
import { createId } from '../utils/id';

type HabitState = {
  appData: AppData;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;
};

type HabitAction =
  | { type: 'memo-add'; memo: Memo }
  | { type: 'memo-update'; id: string; patch: Partial<Pick<Memo, 'title' | 'body' | 'groupId'>> }
  | { type: 'memo-soft-delete'; ids: string[] }
  | { type: 'memo-restore'; ids: string[] }
  | { type: 'memo-purge'; ids: string[] }
  | { type: 'memo-purge-all' }
  | { type: 'memo-move-group'; ids: string[]; groupId: string | null }
  | { type: 'memo-reorder'; orderedIds: string[]; groupId: string | null }
  | { type: 'memo-group-add'; group: MemoGroup }
  | { type: 'memo-group-rename'; groupId: string; name: string }
  | { type: 'memo-group-delete'; groupId: string }
  | { type: 'memo-group-reorder'; groupIds: string[] }
  | { type: 'set-todo-bucket-collapsed'; bucketId: string; collapsed: boolean }
  | { type: 'move-todos-to-bucket'; todoIds: string[]; dueDateKey: string | null }
  | { type: 'hydrate'; appData: AppData }
  | { type: 'set-error'; error: string | null }
  | { type: 'clear-error' }
  | { type: 'replace-app-data'; appData: AppData }
  | { type: 'set-theme-id'; themeId: ThemeId }
  | { type: 'update-profile'; name: string; signature: string; avatarUri: string | null }
  | { type: 'add-group'; group: HabitGroup }
  | { type: 'rename-group'; groupId: string; name: string }
  | { type: 'delete-group'; groupId: string }
  | { type: 'reorder-groups'; groupIds: string[] }
  | { type: 'add-habit'; habit: Habit }
  | {
      type: 'update-habit';
      habitId: string;
      name: string;
      groupId: string | null;
      cadence: HabitCadence;
      targetCount: number;
      order: number;
    }
  | { type: 'reorder-habits'; groupId: string | null; habitIds: string[] }
  | { type: 'move-habits-to-group'; ids: string[]; groupId: string | null }
  | { type: 'delete-habits'; ids: string[] }
  | { type: 'archive-habit'; habitId: string }
  | { type: 'restore-archived-habit'; habitId: string }
  | { type: 'delete-habit'; habitId: string }
  | { type: 'add-checkin-now'; habitId: string; record: CheckinRecord }
  | { type: 'add-checkin'; habitId: string; dateKey: string; timestamp: number; note: string }
  | {
      type: 'update-checkin';
      habitId: string;
      recordId: string;
      timestamp: number;
      note: string;
    }
  | { type: 'delete-checkin'; habitId: string; recordId: string }
  | { type: 'add-todo'; todo: TodoItem }
  | {
      type: 'update-todo';
      todoId: string;
      title: string;
      note: string;
      dueDateKey: string | null;
      dueTime: string | null;
    }
  | { type: 'set-todo-completed'; todoId: string; completedAt: number | null }
  | { type: 'delete-todo'; todoId: string }
  | { type: 'reorder-todos'; todoIds: string[] };

export type HabitInput = {
  name: string;
  groupId: string | null;
  cadence: HabitCadence;
  targetCount: number;
};

export type TodoInput = {
  title: string;
  note: string;
  dueDateKey: string | null;
  dueTime: string | null;
};

type HabitContextValue = HabitState & {
  setTodoBucketCollapsed: (bucketId: string, collapsed: boolean) => void;
  allHabits: Habit[];
  habits: Habit[];
  archivedHabits: Habit[];
  groups: HabitGroup[];
  todos: TodoItem[];
  settings: AppSettings;
  theme: ReturnType<typeof getTheme>;
  memos: Memo[];
  trashedMemos: Memo[];
  activeMemos: Memo[];
  memoGroups: MemoGroup[];
  addMemo: (groupId: string | null) => string;
  updateMemo: (id: string, patch: Partial<Pick<Memo, 'title' | 'body' | 'groupId'>>) => void;
  trashMemos: (ids: string[]) => void;
  restoreMemos: (ids: string[]) => void;
  purgeMemos: (ids: string[]) => void;
  purgeAllMemos: () => void;
  moveMemosToGroup: (ids: string[], groupId: string | null) => void;
  reorderMemos: (groupId: string | null, orderedIds: string[]) => void;
  addMemoGroup: (name: string) => boolean;
  renameMemoGroup: (groupId: string, name: string) => boolean;
  deleteMemoGroup: (groupId: string) => void;
  reorderMemoGroups: (groupIds: string[]) => void;
  moveTodosToBucket: (todoIds: string[], dueDateKey: string | null) => void;
  moveHabitsToGroup: (ids: string[], groupId: string | null) => void;
  deleteHabits: (ids: string[]) => void;
  clearError: () => void;
  addGroup: (name: string) => boolean;
  renameGroup: (groupId: string, name: string) => boolean;
  deleteGroup: (groupId: string) => void;
  reorderGroups: (groupIds: string[]) => void;
  addHabit: (input: HabitInput) => boolean;
  updateHabit: (habitId: string, input: HabitInput) => boolean;
  reorderHabits: (groupId: string | null, habitIds: string[]) => void;
  archiveHabit: (habitId: string) => void;
  restoreArchivedHabit: (habitId: string) => void;
  deleteHabit: (habitId: string) => void;
  addCheckinNow: (habitId: string) => string;
  addCheckin: (habitId: string, dateKey: string, timestamp: number, note: string) => void;
  updateCheckin: (habitId: string, recordId: string, timestamp: number, note: string) => void;
  deleteCheckin: (habitId: string, recordId: string) => void;
  setThemeId: (themeId: ThemeId) => void;
  updateProfile: (name: string, signature: string, avatarUri: string | null) => boolean;
  replaceAppData: (appData: AppData) => void;
  addTodo: (input: TodoInput) => boolean;
  updateTodo: (todoId: string, input: TodoInput) => boolean;
  setTodoCompleted: (todoId: string, completed: boolean) => void;
  deleteTodo: (todoId: string) => void;
  reorderTodos: (todoIds: string[]) => void;
};

const HabitContext = createContext<HabitContextValue | null>(null);

const initialState: HabitState = {
  appData: {
      version: 7,
      habits: [],
      groups: [],
      todos: [],
      memoGroups: [],
      memos: [],
    settings: {
      themeId: DEFAULT_THEME_ID,
      profileName: DEFAULT_PROFILE_NAME,
      profileSignature: DEFAULT_PROFILE_SIGNATURE,
      avatarUri: null,
      collapsedTodoBuckets: [],
    },
  },
  isLoading: true,
  isHydrated: false,
  error: null,
};

function sortRecords(records: CheckinRecord[]) {
  return [...records].sort((left, right) => {
    if (left.timestamp !== right.timestamp) {
      return right.timestamp - left.timestamp;
    }

    return right.createdAt - left.createdAt;
  });
}

function createCheckinRecord(dateKey: string, timestamp: number, note: string): CheckinRecord {
  return {
    id: createId(),
    dateKey,
    timestamp: clampToMinute(timestamp),
    note: note.trim(),
    createdAt: Date.now(),
  };
}

function withUpdatedHabit(habits: Habit[], habitId: string, updater: (habit: Habit) => Habit) {
  return habits.map((habit) => (habit.id === habitId ? updater(habit) : habit));
}

function habitReducer(state: HabitState, action: HabitAction): HabitState {
  switch (action.type) {
    case 'memo-add':
      return { ...state, appData: { ...state.appData, memos: [...state.appData.memos, action.memo] } };
    case 'memo-update':
      return { ...state, appData: { ...state.appData, memos: state.appData.memos.map(m => m.id === action.id ? { ...m, ...action.patch, updatedAt: Date.now() } : m) } };
    case 'memo-soft-delete': {
      const target = new Set(action.ids);
      const now = Date.now();
      return { ...state, appData: { ...state.appData, memos: state.appData.memos.map(m => target.has(m.id) ? { ...m, deletedAt: now } : m) } };
    }
    case 'memo-restore': {
      const target = new Set(action.ids);
      return { ...state, appData: { ...state.appData, memos: state.appData.memos.map(m => target.has(m.id) ? { ...m, deletedAt: null, updatedAt: Date.now() } : m) } };
    }
    case 'memo-purge': {
      const target = new Set(action.ids);
      return { ...state, appData: { ...state.appData, memos: state.appData.memos.filter(m => !target.has(m.id)) } };
    }
    case 'memo-purge-all':
      return { ...state, appData: { ...state.appData, memos: state.appData.memos.filter(m => m.deletedAt === null) } };
    case 'memo-move-group': {
      const target = new Set(action.ids);
      let nextOrder = state.appData.memos.filter(m => m.deletedAt === null && m.groupId === action.groupId).length;
      return {
        ...state,
        appData: {
          ...state.appData,
          memos: state.appData.memos.map(m => {
            if (!target.has(m.id) || m.groupId === action.groupId) {
              return m;
            }
            const moved = { ...m, groupId: action.groupId, order: nextOrder, updatedAt: Date.now() };
            nextOrder += 1;
            return moved;
          }),
        },
      };
    }
    case 'memo-reorder': {
      const orderMap = new Map(action.orderedIds.map((id, index) => [id, index]));
      return {
        ...state,
        appData: {
          ...state.appData,
          memos: state.appData.memos.map(m =>
            m.groupId === action.groupId && orderMap.has(m.id)
              ? { ...m, order: orderMap.get(m.id) as number }
              : m
          ),
        },
      };
    }
    case 'memo-group-add':
      return { ...state, appData: { ...state.appData, memoGroups: [...state.appData.memoGroups, action.group] } };
    case 'memo-group-rename':
      return {
        ...state,
        appData: {
          ...state.appData,
          memoGroups: state.appData.memoGroups.map(group =>
            group.id === action.groupId ? { ...group, name: action.name } : group
          ),
        },
      };
    case 'memo-group-delete': {
      const remaining = state.appData.memoGroups.filter(group => group.id !== action.groupId);
      let nextOrder = state.appData.memos.filter(m => m.groupId === null).length;
      return {
        ...state,
        appData: {
          ...state.appData,
          memoGroups: remaining,
          memos: state.appData.memos.map(m => {
            if (m.groupId !== action.groupId) {
              return m;
            }
            const moved = { ...m, groupId: null, order: nextOrder };
            nextOrder += 1;
            return moved;
          }),
        },
      };
    }
    case 'memo-group-reorder': {
      const orderMap = new Map(action.groupIds.map((id, index) => [id, index]));
      return {
        ...state,
        appData: {
          ...state.appData,
          memoGroups: state.appData.memoGroups.map(group =>
            orderMap.has(group.id) ? { ...group, order: orderMap.get(group.id) as number } : group
          ),
        },
      };
    }
    case 'set-todo-bucket-collapsed': {
      const current = state.appData.settings.collapsedTodoBuckets;
      const next = action.collapsed
        ? [...new Set([...current, action.bucketId])]
        : current.filter(id => id !== action.bucketId);
      return { ...state, appData: { ...state.appData, settings: { ...state.appData.settings, collapsedTodoBuckets: next } } };
    }
    case 'move-todos-to-bucket': {
      const target = new Set(action.todoIds);
      return {
        ...state,
        appData: {
          ...state.appData,
          todos: state.appData.todos.map(todo =>
            target.has(todo.id) ? { ...todo, dueDateKey: action.dueDateKey } : todo
          ),
        },
      };
    }
    case 'hydrate':
      return {
        ...state,
        appData: action.appData,
        isLoading: false,
        isHydrated: true,
      };
    case 'set-error':
      return { ...state, error: action.error };
    case 'clear-error':
      return { ...state, error: null };
    case 'replace-app-data':
      return { ...state, appData: action.appData };
    case 'set-theme-id':
      return {
        ...state,
        appData: {
          ...state.appData,
          settings: {
            ...state.appData.settings,
            themeId: action.themeId,
          },
        },
      };
    case 'update-profile':
      return {
        ...state,
        appData: {
          ...state.appData,
          settings: {
            ...state.appData.settings,
            profileName: action.name,
            profileSignature: action.signature,
            avatarUri: action.avatarUri,
          },
        },
      };
    case 'add-group':
      return {
        ...state,
        appData: {
          ...state.appData,
          groups: [...state.appData.groups, action.group],
        },
      };
    case 'rename-group':
      return {
        ...state,
        appData: {
          ...state.appData,
          groups: state.appData.groups.map((group) =>
            group.id === action.groupId ? { ...group, name: action.name } : group
          ),
        },
      };
    case 'delete-group': {
      let nextUngroupedOrder = state.appData.habits.filter((habit) => habit.groupId === null).length;
      return {
        ...state,
        appData: {
          ...state.appData,
          groups: state.appData.groups.filter((group) => group.id !== action.groupId),
          habits: state.appData.habits.map((habit) => {
            if (habit.groupId !== action.groupId) {
              return habit;
            }
            const movedHabit = { ...habit, groupId: null, order: nextUngroupedOrder };
            nextUngroupedOrder += 1;
            return movedHabit;
          }),
        },
      };
    }
    case 'reorder-groups': {
      const orderMap = new Map(action.groupIds.map((id, index) => [id, index]));
      return {
        ...state,
        appData: {
          ...state.appData,
          groups: state.appData.groups
            .map((group) => ({ ...group, order: orderMap.get(group.id) ?? group.order }))
            .sort((left, right) => left.order - right.order),
        },
      };
    }
    case 'add-habit':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: [...state.appData.habits, action.habit],
        },
      };
    case 'update-habit':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: withUpdatedHabit(state.appData.habits, action.habitId, (habit) => ({
            ...habit,
            name: action.name,
            groupId: action.groupId,
            cadence: action.cadence,
            targetCount: action.targetCount,
            order: action.order,
          })),
        },
      };
    case 'reorder-habits': {
      const orderMap = new Map(action.habitIds.map((id, index) => [id, index]));
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: state.appData.habits.map((habit) =>
            habit.groupId === action.groupId && orderMap.has(habit.id)
              ? { ...habit, order: orderMap.get(habit.id) ?? habit.order }
              : habit
          ),
        },
      };
    }
    case 'move-habits-to-group': {
      const target = new Set(action.ids);
      let nextOrder = state.appData.habits.filter(
        (habit) => habit.groupId === action.groupId && habit.archivedAt === null
      ).length;
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: state.appData.habits.map((habit) => {
            if (!target.has(habit.id) || habit.groupId === action.groupId) {
              return habit;
            }
            const moved = { ...habit, groupId: action.groupId, order: nextOrder };
            nextOrder += 1;
            return moved;
          }),
        },
      };
    }
    case 'delete-habits': {
      const target = new Set(action.ids);
      return {
        ...state,
        appData: { ...state.appData, habits: state.appData.habits.filter((habit) => !target.has(habit.id)) },
      };
    }
    case 'archive-habit':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: withUpdatedHabit(state.appData.habits, action.habitId, (habit) => ({
            ...habit,
            archivedAt: Date.now(),
          })),
        },
      };
    case 'restore-archived-habit':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: withUpdatedHabit(state.appData.habits, action.habitId, (habit) => ({
            ...habit,
            archivedAt: null,
          })),
        },
      };
    case 'delete-habit':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: state.appData.habits.filter((habit) => habit.id !== action.habitId),
        },
      };
    case 'add-checkin-now':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: withUpdatedHabit(state.appData.habits, action.habitId, (habit) => {
            return {
              ...habit,
              checkins: sortRecords([...habit.checkins, action.record]),
            };
          }),
        },
      };
    case 'add-checkin':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: withUpdatedHabit(state.appData.habits, action.habitId, (habit) => ({
            ...habit,
            checkins: sortRecords([
              ...habit.checkins,
              createCheckinRecord(action.dateKey, action.timestamp, action.note),
            ]),
          })),
        },
      };
    case 'update-checkin':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: withUpdatedHabit(state.appData.habits, action.habitId, (habit) => ({
            ...habit,
            checkins: sortRecords(
              habit.checkins.map((record) =>
                record.id === action.recordId
                  ? {
                      ...record,
                      timestamp: clampToMinute(action.timestamp),
                      dateKey: toLocalDateKey(action.timestamp),
                      note: action.note.trim(),
                    }
                  : record
              )
            ),
          })),
        },
      };
    case 'delete-checkin':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: withUpdatedHabit(state.appData.habits, action.habitId, (habit) => ({
            ...habit,
            checkins: habit.checkins.filter((record) => record.id !== action.recordId),
          })),
        },
      };
    case 'add-todo':
      return {
        ...state,
        appData: {
          ...state.appData,
          todos: [...state.appData.todos, action.todo],
        },
      };
    case 'update-todo':
      return {
        ...state,
        appData: {
          ...state.appData,
          todos: state.appData.todos.map((todo) =>
            todo.id === action.todoId
              ? {
                  ...todo,
                  title: action.title,
                  note: action.note,
                  dueDateKey: action.dueDateKey,
                  dueTime: action.dueTime,
                }
              : todo
          ),
        },
      };
    case 'set-todo-completed':
      return {
        ...state,
        appData: {
          ...state.appData,
          todos: state.appData.todos.map((todo) =>
            todo.id === action.todoId ? { ...todo, completedAt: action.completedAt } : todo
          ),
        },
      };
    case 'delete-todo':
      return {
        ...state,
        appData: {
          ...state.appData,
          todos: state.appData.todos.filter((todo) => todo.id !== action.todoId),
        },
      };
    case 'reorder-todos': {
      const selectedIds = new Set(action.todoIds);
      const availableOrders = state.appData.todos
        .filter((todo) => selectedIds.has(todo.id))
        .map((todo) => todo.order)
        .sort((left, right) => left - right);
      const orderMap = new Map(
        action.todoIds.map((id, index) => [id, availableOrders[index] ?? index])
      );
      return {
        ...state,
        appData: {
          ...state.appData,
          todos: state.appData.todos.map((todo) => ({
            ...todo,
            order: orderMap.get(todo.id) ?? todo.order,
          })),
        },
      };
    }
    default:
      return state;
  }
}

export function HabitProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(habitReducer, initialState);
  const saveQueue = useRef(Promise.resolve());
  const addMemo = useCallback((groupId: string | null) => {
    const id = createId();
    const now = Date.now();
    dispatch({
      type: 'memo-add',
      memo: {
        id,
        title: '',
        body: '',
        groupId,
        order: state.appData.memos.filter((memo) => memo.deletedAt === null && memo.groupId === groupId).length,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    });
    return id;
  }, [state.appData.memos]);
  const updateMemo = useCallback(
    (id: string, patch: Partial<Pick<Memo, 'title' | 'body' | 'groupId'>>) =>
      dispatch({ type: 'memo-update', id, patch }),
    []
  );
  const trashMemos = useCallback((ids: string[]) => {
    if (ids.length > 0) dispatch({ type: 'memo-soft-delete', ids });
  }, []);
  const restoreMemos = useCallback((ids: string[]) => {
    if (ids.length > 0) dispatch({ type: 'memo-restore', ids });
  }, []);
  const purgeMemos = useCallback((ids: string[]) => {
    if (ids.length > 0) dispatch({ type: 'memo-purge', ids });
  }, []);
  const purgeAllMemos = useCallback(() => dispatch({ type: 'memo-purge-all' }), []);
  const moveMemosToGroup = useCallback((ids: string[], groupId: string | null) => {
    if (ids.length > 0) dispatch({ type: 'memo-move-group', ids, groupId });
  }, []);
  const reorderMemos = useCallback((groupId: string | null, orderedIds: string[]) => {
    dispatch({ type: 'memo-reorder', orderedIds, groupId });
  }, []);
  const setTodoBucketCollapsed = useCallback((bucketId: string, collapsed: boolean) => {
    dispatch({ type: 'set-todo-bucket-collapsed', bucketId, collapsed });
  }, []);
  const moveTodosToBucket = useCallback((todoIds: string[], dueDateKey: string | null) => {
    if (todoIds.length > 0) dispatch({ type: 'move-todos-to-bucket', todoIds, dueDateKey });
  }, []);
  const moveHabitsToGroup = useCallback((ids: string[], groupId: string | null) => {
    if (ids.length > 0) dispatch({ type: 'move-habits-to-group', ids, groupId });
  }, []);
  const deleteHabits = useCallback((ids: string[]) => {
    if (ids.length > 0) dispatch({ type: 'delete-habits', ids });
  }, []);

  const addMemoGroup = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        dispatch({ type: 'set-error', error: '分类名称不能为空。' });
        return false;
      }
      const exists = state.appData.memoGroups.some(
        (group) => group.name.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) {
        dispatch({ type: 'set-error', error: '分类名称已存在，请换一个。' });
        return false;
      }
      dispatch({
        type: 'memo-group-add',
        group: { id: createId(), name: trimmed, order: state.appData.memoGroups.length, createdAt: Date.now() },
      });
      return true;
    },
    [state.appData.memoGroups]
  );

  const renameMemoGroup = useCallback(
    (groupId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        dispatch({ type: 'set-error', error: '分类名称不能为空。' });
        return false;
      }
      const exists = state.appData.memoGroups.some(
        (group) => group.id !== groupId && group.name.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) {
        dispatch({ type: 'set-error', error: '分类名称已存在，请换一个。' });
        return false;
      }
      dispatch({ type: 'memo-group-rename', groupId, name: trimmed });
      return true;
    },
    [state.appData.memoGroups]
  );

  const deleteMemoGroup = useCallback((groupId: string) => {
    dispatch({ type: 'memo-group-delete', groupId });
  }, []);

  const reorderMemoGroups = useCallback((groupIds: string[]) => {
    dispatch({ type: 'memo-group-reorder', groupIds });
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      try {
        const appData = await loadAppDataFromDisk();
        if (!isMounted) {
          return;
        }
        dispatch({ type: 'hydrate', appData });
      } catch (error) {
        if (!isMounted) {
          return;
        }
        dispatch({
          type: 'set-error',
          error: error instanceof Error ? error.message : '读取本地数据失败，请稍后重试。',
        });
        dispatch({ type: 'hydrate', appData: initialState.appData });
      }
    }

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!state.isHydrated) {
      return;
    }

    saveQueue.current = saveQueue.current.then(() => saveAppDataToDisk(state.appData)).catch((error: unknown) => {
      dispatch({
        type: 'set-error',
        error: error instanceof Error ? error.message : '保存本地数据失败，请稍后重试。',
      });
    });
  }, [state.appData, state.isHydrated]);

  const clearError = useCallback(() => {
    dispatch({ type: 'clear-error' });
  }, []);

  const addGroup = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        dispatch({ type: 'set-error', error: '分组名称不能为空。' });
        return false;
      }

      const exists = state.appData.groups.some(
        (group) => group.name.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) {
        dispatch({ type: 'set-error', error: '分组名称已存在，请换一个。' });
        return false;
      }

      dispatch({
        type: 'add-group',
        group: {
          id: createId(),
          name: trimmed,
          order: state.appData.groups.length,
          createdAt: Date.now(),
        },
      });
      return true;
    },
    [state.appData.groups]
  );

  const renameGroup = useCallback(
    (groupId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        dispatch({ type: 'set-error', error: '分组名称不能为空。' });
        return false;
      }

      const exists = state.appData.groups.some(
        (group) => group.id !== groupId && group.name.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) {
        dispatch({ type: 'set-error', error: '分组名称已存在，请换一个。' });
        return false;
      }

      dispatch({ type: 'rename-group', groupId, name: trimmed });
      return true;
    },
    [state.appData.groups]
  );

  const deleteGroup = useCallback((groupId: string) => {
    dispatch({ type: 'delete-group', groupId });
  }, []);

  const reorderGroups = useCallback((groupIds: string[]) => {
    dispatch({ type: 'reorder-groups', groupIds });
  }, []);

  const addHabit = useCallback(
    (input: HabitInput) => {
      const trimmed = input.name.trim();
      if (!trimmed) {
        dispatch({ type: 'set-error', error: '习惯名称不能为空。' });
        return false;
      }

      const normalizedGroupId =
        input.groupId && state.appData.groups.some((group) => group.id === input.groupId)
          ? input.groupId
          : null;
      const nextOrder = state.appData.habits.filter(
        (habit) => habit.groupId === normalizedGroupId
      ).length;

      dispatch({
        type: 'add-habit',
        habit: {
          id: createId(),
          name: trimmed,
          groupId: normalizedGroupId,
          order: nextOrder,
          cadence: input.cadence,
          targetCount: Math.max(1, Math.floor(input.targetCount)),
          createdAt: Date.now(),
          archivedAt: null,
          checkins: [],
        },
      });
      return true;
    },
    [state.appData.groups, state.appData.habits]
  );

  const updateHabit = useCallback(
    (habitId: string, input: HabitInput) => {
      const trimmed = input.name.trim();
      if (!trimmed) {
        dispatch({ type: 'set-error', error: '习惯名称不能为空。' });
        return false;
      }
      const normalizedGroupId =
        input.groupId && state.appData.groups.some((group) => group.id === input.groupId)
          ? input.groupId
          : null;
      const currentHabit = state.appData.habits.find((habit) => habit.id === habitId);
      const nextOrder =
        currentHabit && currentHabit.groupId === normalizedGroupId
          ? currentHabit.order
          : state.appData.habits.filter((habit) => habit.groupId === normalizedGroupId).length;
      dispatch({
        type: 'update-habit',
        habitId,
        name: trimmed,
        groupId: normalizedGroupId,
        cadence: input.cadence,
        targetCount: Math.max(1, Math.floor(input.targetCount)),
        order: nextOrder,
      });
      return true;
    },
    [state.appData.groups, state.appData.habits]
  );

  const reorderHabits = useCallback((groupId: string | null, habitIds: string[]) => {
    dispatch({ type: 'reorder-habits', groupId, habitIds });
  }, []);

  const archiveHabit = useCallback((habitId: string) => {
    dispatch({ type: 'archive-habit', habitId });
  }, []);

  const restoreArchivedHabit = useCallback((habitId: string) => {
    dispatch({ type: 'restore-archived-habit', habitId });
  }, []);

  const deleteHabit = useCallback((habitId: string) => {
    dispatch({ type: 'delete-habit', habitId });
  }, []);

  const addCheckinNow = useCallback((habitId: string) => {
    const timestamp = clampToMinute(Date.now());
    const record = createCheckinRecord(getTodayKey(), timestamp, '');
    dispatch({ type: 'add-checkin-now', habitId, record });
    return record.id;
  }, []);

  const addCheckin = useCallback((habitId: string, dateKey: string, timestamp: number, note: string) => {
    dispatch({ type: 'add-checkin', habitId, dateKey, timestamp, note });
  }, []);

  const updateCheckin = useCallback(
    (habitId: string, recordId: string, timestamp: number, note: string) => {
      dispatch({ type: 'update-checkin', habitId, recordId, timestamp, note });
    },
    []
  );

  const deleteCheckin = useCallback((habitId: string, recordId: string) => {
    dispatch({ type: 'delete-checkin', habitId, recordId });
  }, []);

  const setThemeId = useCallback((themeId: ThemeId) => {
    dispatch({ type: 'set-theme-id', themeId });
  }, []);

  const replaceAppData = useCallback((appData: AppData) => {
    dispatch({ type: 'replace-app-data', appData });
  }, []);

  const updateProfile = useCallback((name: string, signature: string, avatarUri: string | null) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      dispatch({ type: 'set-error', error: '用户名不能为空。' });
      return false;
    }
    dispatch({
      type: 'update-profile',
      name: trimmedName,
      signature: signature.trim(),
      avatarUri,
    });
    return true;
  }, []);

  const addTodo = useCallback(
    (input: TodoInput) => {
      const title = input.title.trim();
      if (!title) {
        dispatch({ type: 'set-error', error: '待办标题不能为空。' });
        return false;
      }

      dispatch({
        type: 'add-todo',
        todo: {
          id: createId(),
          title,
          note: input.note.trim(),
          dueDateKey: input.dueDateKey,
          dueTime: input.dueTime,
          order: state.appData.todos.length,
          createdAt: Date.now(),
          completedAt: null,
        },
      });
      return true;
    },
    [state.appData.todos.length]
  );

  const updateTodo = useCallback((todoId: string, input: TodoInput) => {
    const title = input.title.trim();
    if (!title) {
      dispatch({ type: 'set-error', error: '待办标题不能为空。' });
      return false;
    }

    dispatch({
      type: 'update-todo',
      todoId,
      title,
      note: input.note.trim(),
      dueDateKey: input.dueDateKey,
      dueTime: input.dueTime,
    });
    return true;
  }, []);

  const setTodoCompleted = useCallback((todoId: string, completed: boolean) => {
    dispatch({ type: 'set-todo-completed', todoId, completedAt: completed ? Date.now() : null });
  }, []);

  const deleteTodo = useCallback((todoId: string) => {
    dispatch({ type: 'delete-todo', todoId });
  }, []);

  const reorderTodos = useCallback((todoIds: string[]) => {
    dispatch({ type: 'reorder-todos', todoIds });
  }, []);

  const value = useMemo(() => {
    const allHabits = state.appData.habits;
    const habits = allHabits.filter((habit) => habit.archivedAt === null);
    const archivedHabits = allHabits.filter((habit) => habit.archivedAt !== null);

    return {
      ...state,
      setTodoBucketCollapsed,
      allHabits,
      habits,
      archivedHabits,
      groups: state.appData.groups,
      todos: state.appData.todos,
      settings: state.appData.settings,
      theme: getTheme(state.appData.settings.themeId),
      memos: state.appData.memos,
      activeMemos: state.appData.memos.filter((memo) => memo.deletedAt === null),
      trashedMemos: state.appData.memos
        .filter((memo) => memo.deletedAt !== null)
        .sort((left, right) => (right.deletedAt ?? 0) - (left.deletedAt ?? 0)),
      memoGroups: state.appData.memoGroups,
      addMemo,
      updateMemo,
      trashMemos,
      restoreMemos,
      purgeMemos,
      purgeAllMemos,
      moveMemosToGroup,
      reorderMemos,
      addMemoGroup,
      renameMemoGroup,
      deleteMemoGroup,
      reorderMemoGroups,
      moveTodosToBucket,
      moveHabitsToGroup,
      deleteHabits,
      clearError,
      addGroup,
      renameGroup,
      deleteGroup,
      reorderGroups,
      addHabit,
      updateHabit,
      reorderHabits,
      archiveHabit,
      restoreArchivedHabit,
      deleteHabit,
      addCheckinNow,
      addCheckin,
      updateCheckin,
      deleteCheckin,
      setThemeId,
      updateProfile,
      replaceAppData,
      addTodo,
      updateTodo,
      setTodoCompleted,
      deleteTodo,
      reorderTodos,
    };
  }, [
    state,
    setTodoBucketCollapsed,
    addMemo,
    updateMemo,
    trashMemos,
    restoreMemos,
    purgeMemos,
    purgeAllMemos,
    moveMemosToGroup,
    reorderMemos,
    addMemoGroup,
    renameMemoGroup,
    deleteMemoGroup,
    reorderMemoGroups,
    moveTodosToBucket,
    moveHabitsToGroup,
    deleteHabits,
    clearError,
    addGroup,
    renameGroup,
    deleteGroup,
    reorderGroups,
    addHabit,
    updateHabit,
    reorderHabits,
    archiveHabit,
    restoreArchivedHabit,
    deleteHabit,
    addCheckinNow,
    addCheckin,
    updateCheckin,
    deleteCheckin,
    setThemeId,
    updateProfile,
    replaceAppData,
    addTodo,
    updateTodo,
    setTodoCompleted,
    deleteTodo,
    reorderTodos,
  ]);

  return <HabitContext.Provider value={value}>{children}</HabitContext.Provider>;
}

export function useHabits() {
  const context = useContext(HabitContext);
  if (!context) {
    throw new Error('useHabits must be used within HabitProvider');
  }
  return context;
}
