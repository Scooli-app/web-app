import { combineReducers } from "@reduxjs/toolkit";
import adminFeedbackReducer from "./admin-feedback/adminFeedbackSlice";
import assistantReducer from "./assistant/assistantSlice";
import { communityReducer } from "./community";
import documentReducer from "./documents/documentSlice";
import featuresReducer from "./features/featuresSlice";
import { moderationReducer } from "./moderation";
import presentationReducer from "./presentation/presentationSlice";
import subscriptionReducer from "./subscription/subscriptionSlice";
import uiReducer from "./ui/uiSlice";

const rootReducer = combineReducers({
  documents: documentReducer,
  presentation: presentationReducer,
  ui: uiReducer,
  subscription: subscriptionReducer,
  assistant: assistantReducer,
  adminFeedback: adminFeedbackReducer,
  community: communityReducer,
  moderation: moderationReducer,
  features: featuresReducer,
});

export default rootReducer;
