import { configureStore } from "@reduxjs/toolkit";
import cart from "./slices/cartSlice";

export const makeStore = () => {
  const prevRandom = Math.random;
  Math.random = () => 0.5;
  try {
    return configureStore({ reducer: { cart } });
  } finally {
    Math.random = prevRandom;
  }
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];