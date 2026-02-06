import {Action, ThunkAction, configureStore} from '@reduxjs/toolkit';
import {taskBoardReducer} from './taskBoardSlice';

export const store = configureStore({
  reducer: {
    taskBoard: taskBoardReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
