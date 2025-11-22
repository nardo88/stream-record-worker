import { type ReducersMapObject, configureStore } from "@reduxjs/toolkit";
import type { AppDispatch, RootState, StateSchema } from "./types";
import { reducer } from "../slice";

const rootReducer: ReducersMapObject<StateSchema> = {
  // Reducer которые мы получаем в результате создания slice
  state: reducer,
};

const store = configureStore({
  reducer: rootReducer,
  devTools: true, // Определяем mode. Он определяет будут ли работать devtools (плагин redux)
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
});

export default store;

import {
  type TypedUseSelectorHook,
  useDispatch,
  useSelector,
} from "react-redux";

export const useAppDispatch = () => useDispatch<AppDispatch>();

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
