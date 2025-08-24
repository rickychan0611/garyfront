import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;

// --- Shopify types (subset, extended to match your payload) ---

export type LineItemProperty = { name: string; value: string | number | null };

export type LineItem = {
  id: number;
  name: string;
  quantity: number;
  properties?: LineItemProperty[];
  selectedOptions?: Array<{ name: string; value: string }>;
};

export type Order = {
  id: number;
  note?: string;
  name: string;
  created_at: string; // e.g. 2025-08-18T00:34:54-07:00
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
  };
  delivery_phone?: string;
  tags: string[];
  line_items: LineItem[];
  custom_attributes?: Array<{ key: string; value: string }>;
  pickup_time?: string;
  pickup_date?: string;
  financial_status?: string;
  total_price?: string;
};

export async function fetchOrders(fromISO: string, toISO: string, excludeTag: string, dueDate?: string) {
  const res = await axios.get(`${API_BASE}/orders`, {
    params: { from: fromISO, to: toISO, excludeTag, dueDate },
  });
  // Normalize backend GraphQL response to expected Order type
  const rawOrders = res.data.orders;
  // console.log("rawOrders", rawOrders);
  const orders: Order[] = rawOrders.map((o: any) => ({
    id: o.id,
    note: o.note,
    name: o.name,
    created_at: o.created_at || o.createdAt,
    customer: o.customer
      ? {
          first_name: o.customer.first_name || o.customer.firstName || "",
          last_name: o.customer.last_name || o.customer.lastName || "",
        }
      : undefined,
    delivery_phone: o.delivery_phone || o.deliveryPhone,
    tags: o.tags || [],
    line_items: (o.line_items || o.lineItems || []).map((li: any) => ({
      id: li.id,
      name: li.name,
      quantity: li.quantity,
      properties: li.properties,
      selectedOptions: li.selectedOptions,
    })),
    financial_status: o.financial_status || o.financialStatus,
    custom_attributes: o.custom_attributes,
    pickup_time: o.pickup_time,
    pickup_date: o.pickup_date,
    total_price: o.total_price,
  }));
  return orders;
}

