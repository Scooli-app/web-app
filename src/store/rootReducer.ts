import { combineReducers } from "@reduxjs/toolkit";
import documentReducer from "./documents/documentSlice";
import uiReducer from "./ui/uiSlice";

const rootReducer = combineReducers({
  documents: documentReducer,
  ui: uiReducer,
});

export default rootReducer;
