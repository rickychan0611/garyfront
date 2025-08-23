import { useMemo } from "react";
import moment from "moment-timezone";
import { useOrdersStore } from '../stores/ordersStore';
import { useSettingsStore } from '../stores/settingsStore';
import { Order } from "../stores/ordersStore";

function toWindowISO(dateInput: Date) {
  // Start date is 30 days before the selected end date
  const fromISO = moment.tz(dateInput, "America/Vancouver")
    .subtract(30, "days")
    .startOf("day")
    .toISOString();

  // End date is the selected date
  const toISO = moment.tz(dateInput, "America/Vancouver")
    .add(1, "day")
    .startOf("day")
    .toISOString();

  return { from: fromISO, to: toISO };
}

function getCustomerName(order: Order): string {
  return order.customer.name || "—";
}

function getCustomerPhone(order: Order): string | undefined {
  if (!order.customer.phone) return undefined;
  // Format phone number as (XXX) XXX-XXXX, removing country code if present
  const cleaned = order.customer.phone.replace(/^\+1\s?/, "").replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return order.customer.phone;
}

function formatDueDate(dateString: string): string {
  const date = moment(dateString);
  return date.format("ddd, DD MMM YYYY");
}

export default function OrdersPage() {
  // Use Zustand stores
  const { orders, loading, loadOrders } = useOrdersStore();
  const { date, dueDate, setDueDate } = useSettingsStore();

  const printedTag = useMemo(() => `Printed-${date}`, [date]);

  async function load() {
    const dateObj = moment.tz(date, "YYYY-MM-DD", "America/Vancouver").toDate();
    const { from, to } = toWindowISO(dateObj);
    const formattedDueDate = dueDate ? formatDueDate(dueDate) : undefined;

    // Log the parameters being sent
    console.log("API Parameters:", {
      from,
      to,
      excludeTag: printedTag,
      dueDate: formattedDueDate
    });

    await loadOrders(from, to, printedTag, formattedDueDate);
  }

  const handlePrintCard = (order: Order) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=500,height=700');
    if (!printWindow) return;

    // Create the print content that matches the card design exactly
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order Card - ${order.number}</title>
        <style>
          @media print {
            @page {
              margin: 0;
              size: 80mm auto;
            }
            body {
              margin: 0;
              padding: 0;
            }
            .no-print { display: none; }
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 10px;
            background: white;
          }
          
          .card {
            background: white;
            padding: 16px;
            max-width: 70mm;
            margin: 0 auto;
          }
          
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            text-align: center;
          }
          
          .order-number {
            color: #374151;
            font-size: 14px;
            font-weight: 600;
          }
          
          .ref-number {
            color: #3b82f6;
            font-size: 16px;
            font-weight: 700;
          }
          
          .customer-name {
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 8px;
            line-height: 1.3;
            text-align: center;
          }
          
          .info-section {
            margin: 12px 0;
          }
          
          .info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 4px 0;
            padding: 2px 0;
            gap: 6px;
          }
          
          .info-label {
            font-size: 12px;
            color: #6b7280;
            font-weight: 500;
            flex: 1;
          }
          
          .info-value {
            font-size: 12px;
            color: #111827;
            font-weight: 500;
            text-align: right;
            max-width: 50%;
          }
          
          .items-section {
            margin: 12px 0;
            border-top: 1px solid #e5e7eb;
            padding-top: 8px;
          }
          
          .item-header {
            font-size: 14px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 8px;
            text-align: center;
          }
          
          .item {
            margin: 8px 0;
            padding: 4px 0;
            border-bottom: 1px solid #f3f4f6;
          }
          
          .item-title {
            font-size: 13px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 2px;
          }
          
          .item-details {
            font-size: 11px;
            color: #6b7280;
            margin: 2px 0;
          }
          
          .item-size {
            font-size: 12px;
            font-weight: 700;
            color: #1d4ed8;
            background: #dbeafe;
            padding: 1px 4px;
            border-radius: 3px;
            display: inline-block;
            margin: 2px 0;
          }
          
          .item-message {
            background: #fef3c7;
            padding: 4px 6px;
            border-radius: 4px;
            font-size: 11px;
            color: #92400e;
            margin: 4px 0;
          }
          
          .print-controls {
            text-align: center;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
          }
          
          .print-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin: 0 6px;
            font-size: 12px;
            font-weight: 500;
            transition: background-color 0.2s;
          }
          
          .print-btn:hover {
            background: #2563eb;
          }
          
          .close-btn {
            background: #6b7280;
          }
          
          .close-btn:hover {
            background: #4b5563;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <!-- Header Row -->
          <div class="header-row">
            <div class="order-number">Order #${order.number || 'N/A'}</div>
            <div class="ref-number">#${order.ref_number || 'N/A'}</div>
          </div>

          <!-- Customer Name -->
          <h3 class="customer-name">${getCustomerName(order)}</h3>
          
          <!-- Order Info -->
          <div class="info-section">
            <div class="info-item">
              <span class="info-label">Id:</span>
              <span class="info-value">${order.number || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Phone:</span>
              <span class="info-value">${getCustomerPhone(order) || "—"}</span>
            </div>
            ${order.tags && order.tags.length > 0 ? `
            <div class="info-item">
              <span class="info-label">Pickup Time:</span>
              <span class="info-value">${order.tags[0]} - ${order.tags[1]}</span>
            </div>
            ` : ''}
            ${order.financial_status ? `
            <div class="info-item">
              <span class="info-label">Payment Status:</span>
              <span class="info-value">${order.financial_status}</span>
            </div>
            ` : ''}
            ${order.total_price ? `
            <div class="info-item">
              <span class="info-label">Total Price:</span>
              <span class="info-value">$${Number(order.total_price.replace(" CAD", '')).toFixed(2)}</span>
            </div>
            ` : ''}
          </div>

          <!-- Items Section -->
          <div class="items-section">
            <div class="item-header">Order Items</div>
            ${order.items
              .filter(lineItem => !lineItem.productTitle.toLowerCase().includes("tip"))
              .map(lineItem => `
                <div class="item">
                  <div class="item-title">${lineItem.productTitle.replace(/\s*\(.*?\)\s*/g, "").trim()} ×${lineItem.quantity}</div>
                  ${lineItem.variantSize ? `<div class="item-size">Size: ${lineItem.variantSize.replace(/\s*\(.*?\)\s*/g, "").trim()}</div>` : ''}
                  ${lineItem.selectedOptions && lineItem.selectedOptions.length > 0 ? lineItem.selectedOptions.map((opt) => {
                    if (opt.name.includes("Add Chocolate Plaque Message") || opt.name.includes("Size") || opt.name.includes("Title")) return '';
                    return `<div class="item-details">${opt.name.replace(/\s*\(.*?\)\s*/g, "").trim()}: ${opt.value.replace(/\s*\(.*?\)\s*/g, "").trim()}</div>`;
                  }).join('') : ''}
                  ${lineItem.message ? `<div class="item-message">Message: ${lineItem.message}</div>` : ''}
                </div>
              `).join('')}
          </div>
        </div>

        <!-- Print Controls -->
        <div class="no-print print-controls">
          <button class="print-btn" onclick="window.print()">🖨️ Print Card</button>
          <button class="print-btn close-btn" onclick="window.close()">❌ Close</button>
        </div>
      </body>
      </html>
    `;

    // Write content to the new window
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handlePrintAllCards = () => {
    // Create a new window for printing all cards
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) return;

    // Create the print content for all cards
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>All Order Cards - ${date}</title>
        <style>
          @media print {
            @page {
              margin: 0;
              size: 80mm auto;
            }
            body {
              margin: 0;
              margin-top: 20px;
              padding: 0;
            }
            .no-print { display: none; }
            .card { page-break-after: always; }
            .card:last-child { page-break-after: auto; }
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: white;
          }
          
          .card {
            background: white;
            padding: 16px;
            max-width: 70mm;
            margin: 0 auto;
            page-break-inside: avoid;
          }
          
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            text-align: center;
          }
          
          .order-number {
            color: #374151;
            font-size: 14px;
            font-weight: 600;
          }
          
          .ref-number {
            color: #3b82f6;
            font-size: 16px;
            font-weight: 700;
          }
          
          .customer-name {
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 8px;
            line-height: 1.3;
            text-align: center;
          }
          
          .info-section {
            margin: 12px 0;
          }
          
          .info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 4px 0;
            padding: 2px 0;
            gap: 6px;
          }
          
          .info-label {
            font-size: 12px;
            color: #6b7280;
            font-weight: 500;
            flex: 1;
          }
          
          .info-value {
            font-size: 12px;
            color: #111827;
            font-weight: 500;
            text-align: right;
            max-width: 50%;
          }
          
          .items-section {
            margin: 12px 0;
            border-top: 1px solid #e5e7eb;
            padding-top: 8px;
          }
          
          .item-header {
            font-size: 14px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 8px;
            text-align: center;
          }
          
          .item {
            margin: 8px 0;
            padding: 4px 0;
            border-bottom: 1px solid #f3f4f6;
          }
          
          .item-title {
            font-size: 13px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 2px;
          }
          
          .item-details {
            font-size: 11px;
            color: #6b7280;
            margin: 2px 0;
          }
          
          .item-size {
            font-size: 12px;
            font-weight: 700;
            color: #1d4ed8;
            background: #dbeafe;
            padding: 1px 4px;
            border-radius: 3px;
            display: inline-block;
            margin: 2px 0;
          }
          
          .item-message {
            background: #fef3c7;
            padding: 4px 6px;
            border-radius: 4px;
            font-size: 11px;
            color: #92400e;
            margin: 4px 0;
          }
          
          .card-index {
            display: flex;
            justify-content: flex-end;
            margin-top: 8px;
          }
          
          .index-text {
            font-size: 9px;
            color: #9ca3af;
            font-weight: 500;
          }
          
          .print-controls {
            text-align: center;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
          }
          
          .print-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin: 0 6px;
            font-size: 12px;
            font-weight: 500;
          }
          
          .close-btn {
            background: #6b7280;
          }
        </style>
      </head>
      <body>
        <!-- Print Controls -->
        <div class="no-print print-controls">
          <button class="print-btn" onclick="window.print()">🖨️ Print All Cards</button>
          <button class="print-btn close-btn" onclick="window.close()">❌ Close</button>
        </div>
        
                 ${orders.map((order, orderIndex) => `
           <div class="card">
             <!-- Header Row -->
             <div class="header-row">
               <div class="order-number">Order #${order.number || 'N/A'}</div>
               <div class="ref-number">#${order.ref_number || 'N/A'}</div>
             </div>

             <!-- Customer Name -->
             <h3 class="customer-name">${getCustomerName(order)}</h3>
             
             <!-- Order Info -->
             <div class="info-section">
               <div class="info-item">
                 <span class="info-label">Id:</span>
                 <span class="info-value">${order.number || 'N/A'}</span>
               </div>
               <div class="info-item">
                 <span class="info-label">Phone:</span>
                 <span class="info-value">${getCustomerPhone(order) || "—"}</span>
               </div>
               ${order.tags && order.tags.length > 0 ? `
               <div class="info-item">
                 <span class="info-label">Pickup Time:</span>
                 <span class="info-value">${order.tags[0]} - ${order.tags[1]}</span>
               </div>
               ` : ''}
               ${order.financial_status ? `
               <div class="info-item">
                 <span class="info-label">Payment Status:</span>
                 <span class="info-value">${order.financial_status}</span>
               </div>
               ` : ''}
               ${order.total_price ? `
               <div class="info-item">
                 <span class="info-label">Total Price:</span>
                 <span class="info-value">$${Number(order.total_price.replace(" CAD", '')).toFixed(2)}</span>
               </div>
               ` : ''}
             </div>

             <!-- Items Section -->
             <div class="items-section">
               <div class="item-header">Order Items</div>
               ${order.items
                 .filter(lineItem => !lineItem.productTitle.toLowerCase().includes("tip"))
                 .map(lineItem => `
                   <div class="item">
                     <div class="item-title">${lineItem.productTitle.replace(/\s*\(.*?\)\s*/g, "").trim()} ×${lineItem.quantity}</div>
                     ${lineItem.variantSize ? `<div class="item-size">Size: ${lineItem.variantSize.replace(/\s*\(.*?\)\s*/g, "").trim()}</div>` : ''}
                     ${lineItem.selectedOptions && lineItem.selectedOptions.length > 0 ? lineItem.selectedOptions.map((opt) => {
                       if (opt.name.includes("Add Chocolate Plaque Message") || opt.name.includes("Size") || opt.name.includes("Title")) return '';
                       return `<div class="item-details">${opt.name.replace(/\s*\(.*?\)\s*/g, "").trim()}: ${opt.value.replace(/\s*\(.*?\)\s*/g, "").trim()}</div>`;
                     }).join('') : ''}
                     ${lineItem.message ? `<div class="item-message">Message: ${lineItem.message}</div>` : ''}
                   </div>
                 `).join('')}
             </div>

             <!-- Card Index -->
             <div class="card-index">
               <span class="index-text">Page ${orderIndex + 1} / ${orders.length}</span>
             </div>
           </div>
         `).join('')}
      </body>
      </html>
    `;

    // Write content to the new window
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen">
      <header className="flex flex-col justify-between mb-8">
        <div className="text-xl font-bold text-gray-800 mb-4">
          Orders Pickup for: {dueDate ? formatDueDate(dueDate) : "All Dates"}
        </div>
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">Pickup Date</label>
            <input
              type="date"
              value={dueDate || ""}
              onChange={e => setDueDate(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm bg-white"
            />
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Fetch Orders from Shopify"}
          </button>
          <button
            onClick={handlePrintAllCards}
            disabled={!orders.length}
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            🖨️ Print All Cards
          </button>
        </div>
        <span className="mt-4 text-[20px] font-bold">
          Total: {orders.length}
        </span>
      </header>

      {!orders.length && !loading && (
        <div className="text-center text-gray-500 bg-white rounded-lg shadow p-6">
          No orders found for the date range {moment(date).subtract(30, 'days').format('YYYY-MM-DD')} to {date}
          {dueDate && ` with due date ${formatDueDate(dueDate)}`}.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-xl shadow-md p-6 flex flex-col hover:shadow-lg transition-shadow relative"
          >
            <div className="flex justify-between">
              <div className="mb-1 text-lg font-semibold text-gray-800">
                {getCustomerName(order) || "—"}
              </div>
              <div className="flex items-center gap-2">
                <div className="mb-1 text-lg font-semibold text-gray-800">
                  #{order.ref_number}
                </div>
                <button
                  onClick={() => handlePrintCard(order)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                  title="Print this order"
                >
                  🖨️
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-700">
              <div className="flex justify-between">
                <span className="font-medium">Id</span>
                <span>{order.number}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Phone</span>
                <span>{getCustomerPhone(order) || "—"}</span>
              </div>
              {order.tags && order.tags.length > 0 && (
                <div className="flex justify-between">
                  <span className="font-medium">Pickup Time</span>
                  <span className="text-sm text-green-600 font-medium max-w-xs text-right">
                    {order.tags[0]} - {order.tags[1]}
                  </span>
                </div>
              )}

              {/* Display financial status */}
              {order.financial_status && (
                <div className="flex justify-between">
                  <span className="font-medium">Payment Status</span>
                  <span className={`text-sm font-medium max-w-xs text-right ${order.financial_status === 'PAID' ? 'text-green-600' :
                    order.financial_status === 'PENDING' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                    {order.financial_status}
                  </span>
                </div>
              )}

              {/* Display total price */}
              {order.total_price && (
                <div className="flex justify-between">
                  <span className="font-medium">Total Price</span>
                  <span className="text-sm text-blue-600 font-medium max-w-xs text-right">
                    ${Number(order.total_price.replace(" CAD", '')).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 mt-3 pt-2">
              <ul className="space-y-2">
                {order.items
                  .filter(lineItem => !lineItem.productTitle.toLowerCase().includes("tip"))
                  .map(lineItem => (
                    <li
                      key={lineItem.id}
                      className="flex flex-col border-b pb-2 last:border-none"
                    >
                      <div className="flex justify-between">
                        <span className="font-bold">{lineItem.productTitle.replace(/\s*\(.*?\)\s*/g, "").trim()}</span>
                        <span className="text-sm text-gray-500 mt-1">
                          ×{lineItem.quantity}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-1 text-xs text-gray-600 flex-wrap flex-col">

                        {lineItem.variantSize && (
                          <span className="text-black text-[16px] font-bold text-red-500">
                            Size: {lineItem.variantSize.replace(/\s*\(.*?\)\s*/g, "").trim()}
                          </span>
                        )}

                        {lineItem.selectedOptions && lineItem.selectedOptions.length > 0 && (
                          <span className="text-black text-[14px]">
                            {lineItem.selectedOptions.map((opt) => {
                              if (opt.name.includes("Add Chocolate Plaque Message")) return null;
                              if (opt.name.includes("Size")) return null;
                              if (opt.name.includes("Title")) return null;
                              return (
                                <div>
                                  {opt.name.replace(/\s*\(.*?\)\s*/g, "").trim()}: {opt.value.replace(/\s*\(.*?\)\s*/g, "").trim()}
                                </div>
                              )
                            })}
                          </span>
                        )}

                        {lineItem.message && (
                          <span className="p-2 px-4 rounded bg-yellow-100 w-full text-[14px] text-black">
                            Message: {lineItem.message}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
