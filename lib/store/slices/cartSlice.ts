import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";

export type CartItem = { id: string; title: string; price: number; mrp: number; stock: number; qty: number };
type CartState = { items: CartItem[]; hydrated: boolean };

const clamp = (qty: number, stock: number) => Math.max(1, Math.min(qty, stock));

const cartSlice = createSlice({
  name: "cart",
  initialState: { items: [], hydrated: false } as CartState,
  reducers: {
    hydrate(state, action: PayloadAction<CartItem[]>) {
      state.items = action.payload;
      state.hydrated = true;
    },
    addItem(state, action: PayloadAction<Omit<CartItem, "qty">>) {
      const existing = state.items.find((i) => i.id === action.payload.id);
      if (existing) existing.qty = clamp(existing.qty + 1, existing.stock);
      else state.items.push({ ...action.payload, qty: 1 });
    },
    setQty(state, action: PayloadAction<{ id: string; qty: number }>) {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (item) item.qty = clamp(action.payload.qty, item.stock);
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },
    clearCart(state) {
      state.items = [];
    },
  },
});

export const { hydrate, addItem, setQty, removeItem, clearCart } = cartSlice.actions;
export default cartSlice.reducer;

export const selectCount = (s: RootState) => s.cart.items.reduce((n, i) => n + i.qty, 0);
export const selectSubtotal = (s: RootState) => s.cart.items.reduce((n, i) => n + i.qty * i.price, 0);
export const selectHydrated = (s: RootState) => s.cart.hydrated;