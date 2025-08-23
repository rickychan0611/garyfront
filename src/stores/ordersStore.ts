import { create } from 'zustand';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { fetchOrders, Order as ApiOrder } from '../api';

export interface GroupUnit {
  day: string;
  key: string;
  productTitle: string;
  variantSize: string;
  customBucket: string;
  need: number;
  done: number;
  progress: boolean[];
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
      
      console.log('Store: Subscribing to groups for date:', date);
      console.log('Store: Firestore path: days/' + date + '/groups');
      console.log('Store: DB object:', db);
      console.log('Store: Collection path:', `days/${date}/groups`);
      
      try {
        const groupsQuery = query(
          collection(db, 'days', date, 'groups'),
          orderBy('productTitle')
        );

        console.log('Store: Query created:', groupsQuery);

        groupsUnsubscribe = onSnapshot(groupsQuery, (snapshot) => {
          console.log('Store: Groups snapshot received:', snapshot.docs.length, 'docs');
          console.log('Store: Raw snapshot data:', snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })));
          
          const groups = snapshot.docs.map(doc => ({
            ...doc.data(),
            key: doc.id
          })) as GroupUnit[];
          
          console.log('Store: Processed groups:', groups);
          console.log('Store: Groups count after processing:', groups.length);
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

    unsubscribe: () => {
      if (groupsUnsubscribe) groupsUnsubscribe();
      if (ordersUnsubscribe) ordersUnsubscribe();
    }
  };
});
