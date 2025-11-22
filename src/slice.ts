import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { StateSchema } from "./redux/types";

export interface IItem {
  id: number;
  title: string;
}

export interface ISchema {
  counter: number;
  value: string;
  list: IItem[];
}

const initialState: ISchema = {
  counter: 0,
  value: "",
  list: [],
};

const slice = createSlice({
  name: "sliceName",
  initialState,
  reducers: {
    increment(state) {
      state.counter = state.counter + 1;
    },
    decrement(state) {
      state.counter = state.counter - 1;
    },
    setValue(state, action: PayloadAction<string>) {
      state.value = action.payload;
    },
    addItem(state, action: PayloadAction<IItem>) {
      state.list.push(action.payload);
    },
  },
});

export const { actions } = slice;
export const { reducer } = slice;

export const getCount = (state: StateSchema) => state.state.counter;
export const getValue = (state: StateSchema) => state.state.value;
export const getState = (state: StateSchema) => state.state;
export const getList = (state: StateSchema) => state.state.list;
