import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ProductVariant {
  id: string;
  title: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  inventoryQuantity: number;
  taxable: boolean;
  image: {
    id: string;
    url: string;
    altText: string;
  } | null;
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  productType: string;
  vendor: string;
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  variants: ProductVariant[];
  images: {
    id: string;
    url: string;
    altText: string;
  }[];
  options: {
    id: string;
    name: string;
    values: string[];
  }[];
  metafields: {
    id: string;
    namespace: string;
    key: string;
    value: string;
  }[];
}

export interface ProductCategory {
  name: string;
  products: Product[];
}

interface ProductState {
  products: Product[];
  categories: ProductCategory[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  isInitialized: boolean;
}

interface ProductActions {
  setProducts: (products: Product[]) => void;
  setCategories: (categories: ProductCategory[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastFetched: (timestamp: number) => void;
  setIsInitialized: (initialized: boolean) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState: ProductState = {
  products: [],
  categories: [],
  loading: false,
  error: null,
  lastFetched: null,
  isInitialized: false,
};

export const useProductStore = create<ProductState & ProductActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setProducts: (products) => set({ products }),
      
      setCategories: (categories) => set({ categories }),
      
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      setLastFetched: (timestamp) => set({ lastFetched: timestamp }),
      
      setIsInitialized: (initialized) => set({ isInitialized: initialized }),
      
      clearError: () => set({ error: null }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'product-store',
      partialize: (state) => ({
        products: state.products,
        categories: state.categories,
        lastFetched: state.lastFetched,
        isInitialized: state.isInitialized,
      }),
    }
  )
);

// Helper function to group products by category
export const groupProductsByCategory = (products: Product[]): ProductCategory[] => {
  const categoryMap = new Map<string, Product[]>();
  
  products.forEach(product => {
    const category = product.productType || 'Uncategorized';
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push(product);
  });
  
  return Array.from(categoryMap.entries()).map(([name, products]) => ({
    name,
    products
  }));
};

// Helper function to check if data is stale (older than 1 hour)
export const isDataStale = (lastFetched: number | null): boolean => {
  if (!lastFetched) return true;
  const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
  return Date.now() - lastFetched > oneHour;
};
