import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "./auth/authSlice";
import documentReducer from "./documents/documentSlice";
import uiReducer from "./ui/uiSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  documents: documentReducer,
  ui: uiReducer,
});

export default rootReducer;
