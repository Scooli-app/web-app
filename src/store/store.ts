import { injectStore } from "@/services/api/client";
import { configureStore } from "@reduxjs/toolkit";
import { analyticsListener } from "./analyticsListener";
import rootReducer from "./rootReducer";

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).prepend(analyticsListener.middleware),
});

injectStore(store.dispatch);

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
