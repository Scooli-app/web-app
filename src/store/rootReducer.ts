import { combineReducers } from "@reduxjs/toolkit";
import adminFeedbackReducer from "./admin-feedback/adminFeedbackSlice";
import assistantReducer from "./assistant/assistantSlice";
import { communityReducer } from "./community";
import documentReducer from "./documents/documentSlice";
import entitlementsReducer from "./entitlements/entitlementsSlice";
import featuresReducer from "./features/featuresSlice";
import { moderationReducer } from "./moderation";
import subscriptionReducer from "./subscription/subscriptionSlice";
import uiReducer from "./ui/uiSlice";
import workspaceReducer from "./workspace/workspaceSlice";

const rootReducer = combineReducers({
  documents: documentReducer,
  ui: uiReducer,
  subscription: subscriptionReducer,
  entitlements: entitlementsReducer,
  assistant: assistantReducer,
  adminFeedback: adminFeedbackReducer,
  community: communityReducer,
  moderation: moderationReducer,
  features: featuresReducer,
  workspace: workspaceReducer,
});

export default rootReducer;
