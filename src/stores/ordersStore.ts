import { create } from 'zustand';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { fetchOrders, Order as ApiOrder } from '../api';

export interface GroupProgressItem {
  orderId: string;
  lineItemId: string;
  orderNumber: string;
  customerName: string;
  quantity: number; // Always 1 for individual tracking
  completed: number; // 0 or 1 for individual units
  isVoided: boolean;
  pickupAt: string;
  unitIndex: number; // Which unit of the original line item this represents
}

export interface GroupUnit {
  day: string;
  key: string;
  productTitle: string;
  variantSize: string;
  customBucket: string;
  need: number;
  done: number;
  progress: boolean[];
  progressItems?: GroupProgressItem[];
  selectedOptions?: Array<{
    option: string;
    count: number;
  }>;
}

export interface Order {
  id: string;
  number: number;
  ref_number: number;
  pickupAt: string;
  customer: {
    name: string;
    phone: string;
  };
  financial_status?: string;
  total_price?: string;
  pickup_time_sort: number;
  note?: string;
  created_at?: string;
  items: Array<{
    id: string;
    orderId: string;
    productTitle: string;
    variantSize: string;
    quantity: number;
    customRaw: string[];
    customBucket: string;
    message: string | null;
    allergens: string[];
    status: string;
    pickupAt: string;
    selectedOptions: Array<{ name: string; value: string }>;
  }>;
  tags: string[];
}

interface OrdersState {
  groups: GroupUnit[];
  orders: Order[];
  loading: boolean;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  subscribeToGroups: (date: string) => void;
  subscribeToOrders: (date: string) => void;
  loadOrders: (from: string, to: string, excludeTag: string, dueDate?: string) => Promise<void>;

  toggleGroupUnitOptimistically: (groupKey: string, unitIndex: number) => void;
  toggleGroupItemOptimistically: (groupKey: string, orderId: string, lineItemId: string) => void;
  unsubscribe: () => void;
}

export const useOrdersStore = create<OrdersState>((set, get) => {
  let groupsUnsubscribe: (() => void) | null = null;
  let ordersUnsubscribe: (() => void) | null = null;

  return {
    groups: [],
    orders: [],
    loading: true,
    selectedDate: new Date().toISOString().slice(0, 10),

    setSelectedDate: (date: string) => {
      set({ selectedDate: date });
      get().subscribeToGroups(date);
      get().subscribeToOrders(date);
    },

    subscribeToGroups: (date: string) => {
      if (groupsUnsubscribe) groupsUnsubscribe();
      try {
        const groupsQuery = query(
          collection(db, 'days', date, 'groups'),
          orderBy('productTitle')
        );
        groupsUnsubscribe = onSnapshot(groupsQuery, (snapshot) => {
          const groups = snapshot.docs.map(doc => ({
            ...doc.data(),
            key: doc.id
          })) as GroupUnit[];

          console.log('Store: Processed groups:', groups);
          set({ groups, loading: false });
        }, (error) => {
          console.error('Store: Error listening to groups:', error);
          set({ loading: false });
        });
      } catch (error) {
        console.error('Store: Error creating query:', error);
        set({ loading: false });
      }
    },

    subscribeToOrders: (date: string) => {
      if (ordersUnsubscribe) ordersUnsubscribe();

      const ordersQuery = query(
        collection(db, 'days', date, 'orders'),
        orderBy('ref_number')
      );

      ordersUnsubscribe = onSnapshot(ordersQuery, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as Order[];
        console.log('Store: Processed orders:', orders);
        set({ orders });
      }, (error) => {
        console.error('Error listening to orders:', error);
      });
    },

    loadOrders: async (from: string, to: string, excludeTag: string, dueDate?: string) => {
      set({ loading: true });
      try {
        const apiOrders = await fetchOrders(from, to, excludeTag, dueDate);

        // Convert API orders to store orders
        const storeOrders: Order[] = apiOrders.map((apiOrder: ApiOrder, index: number) => ({
          id: String(apiOrder.id),
          number: parseInt(apiOrder.name.replace('#', '')) || 0,
          note: apiOrder.note,
          created_at: apiOrder.created_at,
          ref_number: index + 1, // Generate ref number based on array index
          pickupAt: apiOrder.pickup_date || apiOrder.created_at,
          customer: {
            name: `${apiOrder.customer?.first_name || ''} ${apiOrder.customer?.last_name || ''}`.trim(),
            phone: apiOrder.delivery_phone || ''
          },
          financial_status: apiOrder.financial_status,
          total_price: apiOrder.total_price,
          pickup_time_sort: 0, // Will be populated from Firestore
          items: apiOrder.line_items.map(item => ({
            id: String(item.id),
            orderId: String(apiOrder.id),
            productTitle: item.name,
            variantSize: item.selectedOptions?.find(opt => opt.name.toLowerCase().includes('size'))?.value || '',
            quantity: item.quantity,
            customRaw: item.properties?.map(p => p.value?.toString() || '') || [],
            customBucket: 'STANDARD',
            message: item.properties?.find(p => p.name?.toLowerCase().includes('message'))?.value?.toString() || null,
            allergens: [],
            status: 'NOT_STARTED',
            pickupAt: apiOrder.pickup_date || apiOrder.created_at,
            selectedOptions: item.selectedOptions || []
          })),
          tags: apiOrder.tags || []
        }));

        set({ orders: storeOrders, loading: false });
      } catch (error) {
        console.error('Error loading orders:', error);
        set({ loading: false });
      }
    },

    toggleGroupUnitOptimistically: (groupKey: string, unitIndex: number) => {
      set((state) => ({
        groups: state.groups.map(g => {
          if (g.key === groupKey) {
            const newProgress = [...g.progress];
            newProgress[unitIndex] = !newProgress[unitIndex];
            const newDone = newProgress.filter(Boolean).length;

            return {
              ...g,
              progress: newProgress,
              done: newDone
            };
          }
          return g;
        })
      }));
    },

    toggleGroupItemOptimistically: (groupKey: string, orderId: string, lineItemId: string) => {
      set((state) => ({
        groups: state.groups.map(g => {
          if (g.key === groupKey && g.progressItems) {
            const newProgressItems = [...g.progressItems];
            const itemIndex = newProgressItems.findIndex(p =>
              p.orderId === orderId && p.lineItemId === lineItemId
            );

            if (itemIndex !== -1) {
              const item = { ...newProgressItems[itemIndex] };
              // Toggle completion for individual units (0 or 1)
              item.completed = item.completed === 0 ? 1 : 0;
              newProgressItems[itemIndex] = item;

              // Recalculate legacy progress array
              const newProgress: boolean[] = [];
              newProgressItems.forEach(progressItem => {
                if (!progressItem.isVoided) {
                  for (let i = 0; i < progressItem.completed; i++) {
                    newProgress.push(true);
                  }
                  for (let i = 0; i < progressItem.quantity - progressItem.completed; i++) {
                    newProgress.push(false);
                  }
                }
              });

              const newDone = newProgress.filter(Boolean).length;

              return {
                ...g,
                progressItems: newProgressItems,
                progress: newProgress,
                done: newDone
              };
            }
          }
          return g;
        })
      }));
    },

    unsubscribe: () => {
      if (groupsUnsubscribe) groupsUnsubscribe();
      if (ordersUnsubscribe) ordersUnsubscribe();
    }
  };
});
