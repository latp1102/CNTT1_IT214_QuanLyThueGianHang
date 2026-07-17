import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { RootState } from "../store";

export interface Booth {
  id: number;
  name: string;
  area: number;
  price: number;
  floor: number;
  zone: string;
  status: string;
  description?: string;
  images?: string;
}

interface BoothState {
  list: Booth[];
  loading: boolean;
  error?: string;
}

const initialState: BoothState = {
  list: [],
  loading: false,
};

export const fetchBooths = createAsyncThunk('booth/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const response = await fetch('/api/booths/public');
    const data = await response.json();
    if (!response.ok) {
      return rejectWithValue(data.message || 'Failed to fetch booths');
    }
    return data.data; // assuming API returns { data: [...] }
  } catch (err) {
    return rejectWithValue('Network error');
  }
});

const boothSlice = createSlice({
  name: 'booth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBooths.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(fetchBooths.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload as Booth[];
      })
      .addCase(fetchBooths.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const selectBooths = (state: RootState) => state.booth.list;
export const selectBoothLoading = (state: RootState) => state.booth.loading;
export const selectBoothError = (state: RootState) => state.booth.error;

export default boothSlice.reducer;
