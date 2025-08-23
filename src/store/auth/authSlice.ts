import type { User } from "@/shared/types";
import type { UserProfile } from "@/shared/types/auth";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: unknown | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

const initialState: AuthState = {
  user: null,
  profile: null,
  session: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  isInitialized: false,
};

// Async Thunks
export const initializeAuth = createAsyncThunk(
  "auth/initializeAuth",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/auth/session");
      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || "Failed to fetch session");
      }
      return data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to initialize auth"
      );
    }
  }
);

export const signUp = createAsyncThunk(
  "auth/signUp",
  async (
    {
      email,
      password,
      name,
    }: { email: string; password: string; name?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || "Sign up failed");
      }
      return data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Sign up failed"
      );
    }
  }
);

export const signIn = createAsyncThunk(
  "auth/signIn",
  async (
    { email, password }: { email: string; password: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || "Sign in failed");
      }

      await dispatch(initializeAuth());
      return data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Sign in failed"
      );
    }
  }
);

export const signOut = createAsyncThunk(
  "auth/signOut",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        return rejectWithValue(data.error || "Sign out failed");
      }
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Sign out failed"
      );
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    setUser(state, action) {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setProfile(state, action) {
      state.profile = action.payload;
    },
    setSession(state, action) {
      state.session = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // initializeAuth
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.profile = action.payload.profile;
        state.session = action.payload.session;
        state.isAuthenticated = !!action.payload.user;
        state.isLoading = false;
        state.isInitialized = true;
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.user = null;
        state.profile = null;
        state.session = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.isInitialized = true;
        state.error = action.payload as string;
      })
      // signUp
      .addCase(signUp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.isAuthenticated = !!action.payload.user;
        state.isLoading = false;
      })
      .addCase(signUp.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      })
      // signIn
      .addCase(signIn.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state) => {
        // State is updated by initializeAuth thunk
        state.isLoading = false;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      })
      // signOut
      .addCase(signOut.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.profile = null;
        state.session = null;
        state.isAuthenticated = false;
        state.isLoading = false;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      });
  },
});

export const { clearError, setUser, setProfile, setSession } =
  authSlice.actions;
export default authSlice.reducer;
