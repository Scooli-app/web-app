import {
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from "react-redux";
import type { AppDispatch, RootState } from "./store";

// Typed hooks for better TypeScript support
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Re-export selectors for convenience
export {
  selectDocuments,
  selectCurrentDocument,
  selectIsLoading,
  selectIsChatting,
  selectStreamInfo,
  selectLastChatAnswer,
  selectPagination,
  selectFilters,
  selectError,
  selectDocumentById,
  selectHasMoreDocuments,
  selectTotalDocuments,
  selectEditorState,
  selectIsGenerating,
} from "./documents/selectors";
