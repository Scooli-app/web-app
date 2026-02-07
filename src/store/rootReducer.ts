import { combineReducers } from "@reduxjs/toolkit";
import documentReducer from "./documents/documentSlice";
import subscriptionReducer from "./subscription/subscriptionSlice";
import uiReducer from "./ui/uiSlice";

const rootReducer = combineReducers({
  documents: documentReducer,
  ui: uiReducer,
  subscription: subscriptionReducer,
});

export default rootReducer;
