import type { ISchema } from "../slice";
import type store from "./store";

// тип store
export type RootState = ReturnType<typeof store.getState>;
// тип dispatch
export type AppDispatch = typeof store.dispatch;

// ручками описываем тип нашего состояния.
// динамические редьюсеры указываем как необязательные
export interface StateSchema {
  // Здесь перечисляем состояния постоянные
  state: ISchema;
  // Ниже динамические
}

export type StateSchemaKey = keyof StateSchema;
