"use client";

import { initializeAuth } from "@/store/auth/authSlice";
import { store } from "@/store/store";
import { useEffect, useRef } from "react";
import { Provider } from "react-redux";

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      store.dispatch(initializeAuth());
      initialized.current = true;
    }
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
