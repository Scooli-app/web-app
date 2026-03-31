import {
  createPresentation as createPresentationService,
  getPresentation as getPresentationService,
  getPresentationSummaries,
  updatePresentation as updatePresentationService,
  uploadPresentationAsset as uploadPresentationAssetService,
} from "@/services/api/presentation.service";
import type {
  CreatePresentationParams,
  PresentationAsset,
  PresentationCalloutBlock,
  PresentationContent,
  PresentationIconName,
  PresentationLayout,
  PresentationRecord,
  PresentationSummary,
  PresentationThemeId,
} from "@/shared/types/presentation";
import {
  appendSlide,
  createDefaultPresentationContent,
  findPresentationBlock,
  removeSlide,
  replaceBulletsBlockItems,
  replaceCalloutBlock,
  replaceIconBlockName,
  replaceImageAsset,
  replaceImageBlockMeta,
  replaceSlideLayout,
  replaceTextBlockContent,
} from "@/shared/utils/presentation";
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface PresentationState {
  items: PresentationSummary[];
  currentPresentation: PresentationRecord | null;
  activeSlideId: string | null;
  selectedBlockId: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  isLoading: boolean;
  isCreating: boolean;
  isSaving: boolean;
  isUploading: boolean;
  dirty: boolean;
  error: string | null;
  lastSaveSnapshot: string | null;
}

const initialState: PresentationState = {
  items: [],
  currentPresentation: null,
  activeSlideId: null,
  selectedBlockId: null,
  pagination: {
    page: 1,
    limit: 12,
    total: 0,
    hasMore: false,
  },
  isLoading: false,
  isCreating: false,
  isSaving: false,
  isUploading: false,
  dirty: false,
  error: null,
  lastSaveSnapshot: null,
};

function buildSaveSnapshot(payload: {
  title: string;
  themeId: PresentationThemeId;
  content: PresentationContent;
}): string {
  return JSON.stringify(payload);
}

function buildCurrentPresentationSnapshot(
  presentation: PresentationRecord | null,
): string | null {
  if (!presentation) {
    return null;
  }

  return buildSaveSnapshot({
    title: presentation.title,
    themeId: presentation.themeId,
    content: presentation.content,
  });
}

export const fetchPresentationSummaries = createAsyncThunk(
  "presentation/fetchPresentationSummaries",
  async (
    { page = 1, limit = 12 }: { page?: number; limit?: number } = {},
    { rejectWithValue },
  ) => {
    try {
      return await getPresentationSummaries(page, limit);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as apresentações.",
      );
    }
  },
);

export const fetchPresentation = createAsyncThunk(
  "presentation/fetchPresentation",
  async (id: string, { rejectWithValue }) => {
    try {
      return await getPresentationService(id);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a apresentação.",
      );
    }
  },
);

export const createPresentation = createAsyncThunk(
  "presentation/createPresentation",
  async (payload: CreatePresentationParams, { rejectWithValue }) => {
    try {
      return await createPresentationService(payload);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a apresentação.",
      );
    }
  },
);

export const savePresentation = createAsyncThunk(
  "presentation/savePresentation",
  async (
    { id, title, themeId, content }: { id: string; title: string; themeId: PresentationThemeId; content: PresentationContent },
    { rejectWithValue },
  ) => {
    try {
      return await updatePresentationService(id, { title, themeId, content });
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar a apresentação.",
      );
    }
  },
);

export const uploadPresentationAsset = createAsyncThunk(
  "presentation/uploadPresentationAsset",
  async (
    {
      presentationId,
      file,
      alt,
    }: { presentationId: string; file: File; alt?: string },
    { rejectWithValue },
  ) => {
    try {
      return await uploadPresentationAssetService(presentationId, file, alt);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a imagem.",
      );
    }
  },
);

function syncPresentationEnvelope(state: PresentationState): void {
  if (!state.currentPresentation) {
    return;
  }
  state.currentPresentation.title = state.currentPresentation.content.title;
  state.currentPresentation.themeId = state.currentPresentation.content.themeId;
}

const presentationSlice = createSlice({
  name: "presentation",
  initialState,
  reducers: {
    clearPresentationError(state) {
      state.error = null;
    },
    setActiveSlide(state, action: PayloadAction<string>) {
      state.activeSlideId = action.payload;
      state.selectedBlockId = null;
    },
    setSelectedBlock(state, action: PayloadAction<string | null>) {
      state.selectedBlockId = action.payload;
    },
    updatePresentationTitle(state, action: PayloadAction<string>) {
      if (!state.currentPresentation) {
        return;
      }
      const nextTitle = action.payload;
      state.currentPresentation.content.title = nextTitle;
      state.currentPresentation.title = nextTitle;
      state.dirty = true;
    },
    updatePresentationTheme(state, action: PayloadAction<PresentationThemeId>) {
      if (!state.currentPresentation) {
        return;
      }
      state.currentPresentation.content.themeId = action.payload;
      state.currentPresentation.themeId = action.payload;
      state.dirty = true;
    },
    updateSlideLayout(state, action: PayloadAction<{ slideId: string; layout: PresentationLayout }>) {
      if (!state.currentPresentation) {
        return;
      }
      state.currentPresentation.content.slides = replaceSlideLayout(
        state.currentPresentation.content.slides,
        action.payload.slideId,
        action.payload.layout,
      );
      state.dirty = true;
    },
    updateTextBlock(state, action: PayloadAction<{ slideId: string; blockId: string; content: string }>) {
      if (!state.currentPresentation) {
        return;
      }
      const currentBlock = findPresentationBlock(
        state.currentPresentation.content,
        action.payload.slideId,
        action.payload.blockId,
      );
      state.currentPresentation.content.slides = replaceTextBlockContent(
        state.currentPresentation.content.slides,
        action.payload.slideId,
        action.payload.blockId,
        action.payload.content,
      );
      if (
        currentBlock?.type === "title" &&
        state.currentPresentation.content.slides[0]?.id === action.payload.slideId
      ) {
        state.currentPresentation.content.title =
          action.payload.content.trim() || "Apresentação sem título";
      }
      syncPresentationEnvelope(state);
      state.dirty = true;
    },
    updateBulletsBlock(state, action: PayloadAction<{ slideId: string; blockId: string; items: string[] }>) {
      if (!state.currentPresentation) {
        return;
      }
      state.currentPresentation.content.slides = replaceBulletsBlockItems(
        state.currentPresentation.content.slides,
        action.payload.slideId,
        action.payload.blockId,
        action.payload.items,
      );
      state.dirty = true;
    },
    updateCalloutBlock(
      state,
      action: PayloadAction<{
        slideId: string;
        blockId: string;
        nextValue: Partial<PresentationCalloutBlock>;
      }>,
    ) {
      if (!state.currentPresentation) {
        return;
      }
      state.currentPresentation.content.slides = replaceCalloutBlock(
        state.currentPresentation.content.slides,
        action.payload.slideId,
        action.payload.blockId,
        action.payload.nextValue,
      );
      state.dirty = true;
    },
    updateImageBlockMeta(
      state,
      action: PayloadAction<{
        slideId: string;
        blockId: string;
        nextValue: Partial<{ alt: string; caption: string; imagePrompt: string }>;
      }>,
    ) {
      if (!state.currentPresentation) {
        return;
      }
      state.currentPresentation.content.slides = replaceImageBlockMeta(
        state.currentPresentation.content.slides,
        action.payload.slideId,
        action.payload.blockId,
        action.payload.nextValue,
      );
      state.dirty = true;
    },
    setImageBlockAsset(
      state,
      action: PayloadAction<{
        slideId: string;
        blockId: string;
        assetId: string;
        altText: string;
      }>,
    ) {
      if (!state.currentPresentation) {
        return;
      }
      state.currentPresentation.content.slides = replaceImageAsset(
        state.currentPresentation.content.slides,
        action.payload.slideId,
        action.payload.blockId,
        action.payload.assetId,
        action.payload.altText,
      );
      state.dirty = true;
    },
    updateIconBlock(
      state,
      action: PayloadAction<{ slideId: string; blockId: string; name: PresentationIconName }>,
    ) {
      if (!state.currentPresentation) {
        return;
      }
      state.currentPresentation.content.slides = replaceIconBlockName(
        state.currentPresentation.content.slides,
        action.payload.slideId,
        action.payload.blockId,
        action.payload.name,
      );
      state.dirty = true;
    },
    addPresentationSlide(state) {
      if (!state.currentPresentation) {
        return;
      }
      state.currentPresentation.content.slides = appendSlide(
        state.currentPresentation.content.slides,
      );
      state.activeSlideId =
        state.currentPresentation.content.slides[
          state.currentPresentation.content.slides.length - 1
        ]?.id ?? state.activeSlideId;
      state.selectedBlockId = null;
      state.dirty = true;
    },
    removePresentationSlide(state, action: PayloadAction<string>) {
      if (!state.currentPresentation) {
        return;
      }
      state.currentPresentation.content.slides = removeSlide(
        state.currentPresentation.content.slides,
        action.payload,
      );
      state.activeSlideId =
        state.currentPresentation.content.slides[0]?.id ?? null;
      state.selectedBlockId = null;
      state.dirty = true;
    },
    bootstrapEmptyPresentation(
      state,
      action: PayloadAction<{ title?: string; themeId?: PresentationThemeId } | undefined>,
    ) {
      const title = action.payload?.title ?? "Nova apresentação";
      const themeId = action.payload?.themeId ?? "scooli-dark";
      state.currentPresentation = {
        id: "draft",
        title,
        themeId,
        subject: "",
        gradeLevel: null,
        prompt: "",
        additionalInstructions: null,
        status: "draft",
        content: createDefaultPresentationContent(title, themeId),
        assets: [],
        createdAt: null,
        updatedAt: null,
      };
      state.activeSlideId = state.currentPresentation.content.slides[0]?.id ?? null;
      state.selectedBlockId = null;
      state.dirty = true;
    },
    addPresentationAssetToState(state, action: PayloadAction<PresentationAsset>) {
      if (!state.currentPresentation) {
        return;
      }
      state.currentPresentation.assets = [
        ...state.currentPresentation.assets.filter(
          (asset) => asset.id !== action.payload.id,
        ),
        action.payload,
      ];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPresentationSummaries.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPresentationSummaries.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.pagination = action.payload.pagination;
        state.isLoading = false;
      })
      .addCase(fetchPresentationSummaries.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchPresentation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPresentation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentPresentation = action.payload;
        state.activeSlideId = action.payload.content.slides[0]?.id ?? null;
        state.selectedBlockId = null;
        state.dirty = false;
        state.lastSaveSnapshot = null;
      })
      .addCase(fetchPresentation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createPresentation.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createPresentation.fulfilled, (state, action) => {
        state.isCreating = false;
        state.currentPresentation = action.payload;
        state.activeSlideId = action.payload.content.slides[0]?.id ?? null;
        state.selectedBlockId = null;
        state.dirty = false;
        state.lastSaveSnapshot = null;
        state.items = [
          {
            id: action.payload.id,
            title: action.payload.title,
            themeId: action.payload.themeId,
            subject: action.payload.subject,
            gradeLevel: action.payload.gradeLevel,
            status: action.payload.status,
            updatedAt: action.payload.updatedAt,
          },
          ...state.items.filter((item) => item.id !== action.payload.id),
        ];
      })
      .addCase(createPresentation.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      })
      .addCase(savePresentation.pending, (state, action) => {
        state.isSaving = true;
        state.error = null;
        state.lastSaveSnapshot = buildSaveSnapshot(action.meta.arg);
      })
      .addCase(savePresentation.fulfilled, (state, action) => {
        state.isSaving = false;
        const savedSnapshot = state.lastSaveSnapshot;
        const currentSnapshot = buildCurrentPresentationSnapshot(
          state.currentPresentation,
        );
        const hasNewerLocalChanges =
          savedSnapshot !== null &&
          currentSnapshot !== null &&
          currentSnapshot !== savedSnapshot;

        state.lastSaveSnapshot = null;

        if (!hasNewerLocalChanges) {
          state.currentPresentation = action.payload;
          state.activeSlideId =
            state.activeSlideId ?? action.payload.content.slides[0]?.id ?? null;
          state.dirty = false;
        }
        state.items = state.items.map((item) =>
          item.id === action.payload.id
            ? {
                ...item,
                title: action.payload.title,
                themeId: action.payload.themeId,
                updatedAt: action.payload.updatedAt,
              }
            : item,
        );
      })
      .addCase(savePresentation.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
        state.lastSaveSnapshot = null;
      })
      .addCase(uploadPresentationAsset.pending, (state) => {
        state.isUploading = true;
        state.error = null;
      })
      .addCase(uploadPresentationAsset.fulfilled, (state, action) => {
        state.isUploading = false;
        if (!state.currentPresentation) {
          return;
        }
        state.currentPresentation.assets = [
          ...state.currentPresentation.assets.filter(
            (asset) => asset.id !== action.payload.id,
          ),
          action.payload,
        ];
      })
      .addCase(uploadPresentationAsset.rejected, (state, action) => {
        state.isUploading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearPresentationError,
  setActiveSlide,
  setSelectedBlock,
  updatePresentationTitle,
  updatePresentationTheme,
  updateSlideLayout,
  updateTextBlock,
  updateBulletsBlock,
  updateCalloutBlock,
  updateImageBlockMeta,
  setImageBlockAsset,
  updateIconBlock,
  addPresentationSlide,
  removePresentationSlide,
  bootstrapEmptyPresentation,
  addPresentationAssetToState,
} = presentationSlice.actions;

export default presentationSlice.reducer;
