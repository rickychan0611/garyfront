import { useMemo, useEffect, useState } from "react";
import moment from "moment-timezone";
import { useOrdersStore } from '../stores/ordersStore';
import { useSettingsStore } from '../stores/settingsStore';
import { Order } from "../stores/ordersStore";
import { useNavigate } from "react-router-dom";
import PickupListPage from './PickupListPage';
import PrintConfirmModal from "./PrintConfirmModal";

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
  const { orders, loading, loadOrders, subscribeToOrders, subscribeToGroups } = useOrdersStore();
  const { date, dueDate, setDueDate } = useSettingsStore();

  // State for view switching
  const [currentView, setCurrentView] = useState<'orders' | 'pickup'>('orders');

  // State for print confirmation modal
  const [showPrintModal, setShowPrintModal] = useState(false);

  const printedTag = useMemo(() => `Printed-${date}`, [date]);

  // Auto-subscribe to orders when dueDate changes
  useEffect(() => {
    if (dueDate) {
      console.log('OrdersPage - dueDate changed, subscribing to orders:', dueDate);
      subscribeToOrders(dueDate);
      subscribeToGroups(dueDate);
    }
  }, [dueDate]);

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

  // Shared function to generate order card HTML
  const generateOrderCardHTML = (order: Order, showIndex = false, orderIndex = 0, totalOrders = 0) => {
    const isVoided = order.financial_status === "VOIDED";
    return `
      <div class="card ${isVoided ? 'voided' : ''}">
        ${isVoided ? '<div class="voided-overlay">VOIDED</div>' : ''}
        
        <!-- Header Row -->
        <div class="header-row">
          <div class="order-number">Order ${order.number || 'N/A'}</div>
          <div class="ref-number">#${order.ref_number || 'N/A'}</div>
        </div>

        <!-- Customer Name -->
        <h3 class="customer-name">${getCustomerName(order)}</h3>
        
        <!-- Order Info -->
        <div class="info-section">
          <div class="info-item">
            <span class="info-label">Phone:</span>
            <span class="info-value">${getCustomerPhone(order) || "—"}</span>
          </div>
             ${order.tags && order.tags.length > 0 ? `
           <div class="info-item">
             <span class="info-label">Pickup Time:</span>
             <div style="text-align: right;">
             <span class="info-value pickup-time">${order.tags[0]}</span>
             </br>
             <span class="info-value pickup-time">${order.tags[1]}</span>
             </div>
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
                ${lineItem.message ? `<div class="item-message">${lineItem.message}</div>` : ''}
              </div>
            `).join('')}
        </div>

        <!-- Note and Created Date Section -->
        ${order.note ? `
        <div class="note-section">
          <div class="note-content">Note: ${order.note}</div>
        </div>
        ` : ''}

        ${showIndex ? `
        <!-- Card Index -->
        <div class="card-index">
          <span class="index-text">Page ${orderIndex + 1} / ${totalOrders}</span>
        </div>
        ` : ''}
      </div>
    `;
  };

  // Shared CSS styles for print functions - BLACK ONLY
  const getPrintStyles = (isMultiCard = false) => `
    @media print {
      @page {
        margin: 0;
        size: auto; /* use printer's default paper width */
      }
      body {
        margin: 0;
        padding: 0;
      }
      .no-print { display: none; }
      ${isMultiCard ? `
      .card { 
        page-break-after: always; 
        break-after: page;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .card:last-child { 
        page-break-after: auto; 
        break-after: auto;
      }
      ` : ''}
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      margin: 0;
      background: white;
      color: black;
      font-size: 15px;
      line-height: 1.35;
      /* stretch to full printable width */
      width: 100%;
      max-width: 100%;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Ensure padding/border do not expand element beyond width */
    *, *::before, *::after { box-sizing: border-box; }
    
    /* Allow long words/values to wrap within the narrow roll */
    .card, .info-value, .item, .item-title, .item-details, .note-content, .customer-name {
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    
    .card {
      background: white;
      width: 100%;
      margin: 0 auto;
      position: relative;
      padding: 6px 8px;
      box-sizing: border-box;
    }
     
    .card.voided {
      opacity: 1;
    }
     
    .voided-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 40px;
      font-weight: bold;
      color: black;
      z-index: 10;
      pointer-events: none;
      white-space: nowrap;
      letter-spacing: 2px;
    }
    
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      text-align: center;
      border-bottom: 1px solid black;
      padding-bottom: 6px;
    }

    /* Allow flex children to shrink and wrap instead of overflowing */
    .header-row > * { min-width: 0; }
    
    .order-number {
      color: black;
      font-size: 20px;
      font-weight: 600;
    }
    
    .ref-number {
      color: black;
      font-size: 23px;
      font-weight: 700;
    }
    
    .customer-name {
      font-size: 20px;
      font-weight: 600;
      color: black;
      margin-bottom: 4px;
      line-height: 1.3;
      text-align: center;
    }
    
    .info-section {
      margin: 6px 0;
    }
    
    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 4px 0;
      gap: 2px;
    }
    
    .info-label {
      font-size: 15px;
      color: black;
      font-weight: 500;
      flex: 1;
    }
    
    .info-value {
      font-size: 15px;
      color: black;
      font-weight: 500;
      text-align: right;
      max-width: 50%;
    }
     
    .pickup-time {
      line-height: 1.25;
      white-space: pre-line;
    }
    
    .items-section {
      margin: 6px 0;
    }
    
    .item-header {
      font-size: 17px;
      font-weight: 600;
      color: black;
      margin-bottom: 6px;
      text-align: center;
      border-bottom: 1px solid black;
      padding-bottom: 4px;
    }
    
    .item {
      margin: 6px 0;
      padding: 4px 0;
      border-bottom: 1px dotted black;
    }
    
    .item:last-child {
      border-bottom: none;
    }
    
    .item-title {
      font-size: 17px;
      font-weight: 600;
      color: black;
      margin-bottom: 2px;
    }
    
    .item-details {
      font-size: 15px;
      color: black;
      margin: 2px 0;
    }
    
    .item-size {
      font-size: 15px;
      font-weight: 700;
      color: black;
      background: white;
      display: inline-block;
      margin: 2px 0;
    }
    
    .item-message {
      background: white;
      border: 1px solid black;
      padding: 4px 6px;
      border-radius: 4px;
      font-size: 15px;
      color: black;
      margin: 4px 0;
    }
    
    .print-controls {
      text-align: center;
      margin-top: ${isMultiCard ? '16px' : '12px'};
      padding-top: ${isMultiCard ? '16px' : '12px'};
      border-top: 1px solid black;
    }
    
    .print-btn {
      background: black;
      color: white;
      border: 1px solid black;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      margin: 0 6px;
      font-size: 14px;
      font-weight: 500;
    }
    
    .print-btn:hover {
      background: black;
    }
    
    .close-btn {
      background: white;
      color: black;
      border: 1px solid black;
    }
    
    .close-btn:hover {
      background: white;
    }
    
    .note-section {
      margin-top: 4px;
    }
    
    .note-label {
      font-size: 13px;
      color: black;
      font-weight: 600;
    }
    
    .note-content {
      font-size: 15px;
      color: black;
    }
    
    .created-date {
      font-size: 13px;
      color: black;
    }
    
    .date-label {
      font-weight: 600;
    }
    
    .date-value {
      color: black;
    }
    
    ${isMultiCard ? `
    .card-index {
      display: flex;
      justify-content: flex-end;
      margin-top: 8px;
    }
    
    .index-text {
      font-size: 12px;
      color: black;
      font-weight: 500;
    }
    ` : ''}
  `;

  const handlePrintCard = (order: Order) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=500,height=700');
    if (!printWindow) return;

    // Create the print content using shared functions
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order Card - ${order.number}</title>
        <style>
          ${getPrintStyles(false)}
        </style>
      </head>
      <body>
        ${generateOrderCardHTML(order, false)}
        
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

  async function waitForWindowClose(win: Window, timeoutMs = 5 * 60 * 1000) {
    const started = Date.now();
    return new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        if (win.closed || Date.now() - started > timeoutMs) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  }

  const handlePrintAllCards = () => {
    setShowPrintModal(true);
  };

  const confirmPrintAllCards = async () => {
    setShowPrintModal(false);

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const printWindow = window.open('', '_blank', 'width=600,height=800');
      if (!printWindow) {
        console.warn('Popup blocked while opening print window for order:', order?.number);
        continue;
      }

      const singleCardContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Ticket - ${order.number || ''}</title>
          <style>
            ${getPrintStyles(false)}
          </style>
        </head>
        <body>
          ${generateOrderCardHTML(order, false)}
          <script>
            try {
              window.onafterprint = function() { try { window.close(); } catch (e) {} };
              window.onload = function() {
                setTimeout(function(){ try { window.focus(); window.print(); } catch (e) {} }, 50);
              };
            } catch (e) { /* no-op */ }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(singleCardContent);
      printWindow.document.close();

      // Wait until the window closes (after printing), then continue with next ticket
      await waitForWindowClose(printWindow);
    }
  };

  const cancelPrintAllCards = () => {
    setShowPrintModal(false);
  };

  const navigate = useNavigate();

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
            {loading ? "Loading…" : "Refresh Orders from Shopify"}
          </button>
          <button
            onClick={() => setCurrentView(currentView === 'orders' ? 'pickup' : 'orders')}
            className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
          >
            {currentView === 'orders' ? '📋 View Pick Up Table' : '📋 View Orders Tickets'}
          </button>
          <button
            onClick={() => navigate('/batch-view')}
            className="px-4 py-2 rounded bg-blue-500 text-white"
          >
            👷 Production Batch Sheets
          </button>
          <button
            onClick={() => navigate('/message-tickets')}
            className="px-4 py-2 rounded bg-pink-500 text-white hover:bg-pink-600"
          >
            💌 Message Tickets
          </button>
        </div>

      </header>

      {/* Conditional rendering based on current view */}
      {currentView === 'pickup' ? (
        <PickupListPage />
      ) : (
        <>
          <div className="flex items-center gap-4 my-8 justify-end">
            <div className="text-lg font-bold text-gray-700">
              Total: {orders.length} orders
            </div>
            <button
              onClick={handlePrintAllCards}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              🖨️ Print All Tickets
            </button>
          </div>
          {!orders.length && !loading && (
            <div className="text-center text-gray-500 bg-white rounded-lg shadow p-6">
              No orders found.
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => {
              // if (order.financial_status === "VOIDED") return null;
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl shadow-md p-6 flex flex-col hover:shadow-lg transition-shadow relative"
                >
                  <div className="flex justify-between">
                    <div className="mb-1 text-lg font-semibold text-gray-800">
                      {getCustomerName(order) || "—"}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="mb-1 text-lg font-semibold text-blue-500">
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
                    <div className="flex justify-between ">
                      <span className="font-medium">Id</span>
                      <span
                        className={`font-bold text-[18px] ${order.financial_status === "VOIDED" ? "line-through" : ""}`}
                      >
                        {order.number}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Phone</span>
                      <span>{getCustomerPhone(order) || "—"}</span>
                    </div>
                    {order.tags && order.tags.length > 0 && (
                      <div className="flex justify-between">
                        <span className="font-medium">Pickup Time</span>
                        <span className="text-sm text-green-600 font-medium max-w-xs text-right">
                          {order.tags[0]} | {order.tags[1]}
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
                            className={`flex flex-col border-b pb-2 last:border-none ${order.financial_status === "VOIDED" ? "line-through" : ""}`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold">{lineItem.productTitle.replace(/\s*\(.*?\)\s*/g, "").trim()}</span>
                              <span className="text-[18px] font-bold mt-1">
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
                                  {lineItem.message}
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>

                  {/* Note and Created Date Section */}
                  {(order.note || order.created_at) && (
                    <div className="pt-2">
                      {order.note && (
                        <div className="">
                          <div className="text-xs text-gray-500">
                            Note: {order.note}
                          </div>
                        </div>
                      )}
                      {/* {order.created_at && (
                  <div className="text-xs text-gray-500">
                    <span className="">Ordered at:</span>{" "}
                    {moment(order.created_at).format("MMM DD, YYYY [at] h:mm A")}
                  </div>
                )} */}
                    </div>
                  )}

                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Print Confirmation Modal */}
      <PrintConfirmModal
        isOpen={showPrintModal}
        onConfirm={confirmPrintAllCards}
        onCancel={cancelPrintAllCards}
        title="Print All Tickets"
        message={`You will print ${orders.length} tickets and cannot stop the process.`}
      />
    </div>
  );
}
