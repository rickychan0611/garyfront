import { useMemo, useState } from 'react';
import { useOrdersStore, Order } from '../stores/ordersStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useNavigate } from 'react-router-dom';
import PrintConfirmModal from './PrintConfirmModal';

interface MessageTicket {
  id: string;
  order: Order;
  item: Order['items'][0];
  message: string;
}

const MessageTicketsPage = () => {
  const { orders, loading } = useOrdersStore();
  const { dueDate } = useSettingsStore();
  const navigate = useNavigate();

  // State for print confirmation modal
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Filter orders with messages and create message tickets
  const messageTickets = useMemo(() => {
    const tickets: MessageTicket[] = [];
    
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.message && item.message.trim()) {
          tickets.push({
            id: `${order.id}-${item.id}`,
            order,
            item,
            message: item.message.trim()
          });
        }
      });
    });
    
    return tickets.sort((a, b) => a.order.ref_number - b.order.ref_number);
  }, [orders]);

  // Generate HTML for a single message ticket
  const generateMessageTicketHTML = (ticket: MessageTicket, showIndex = false, ticketIndex = 0, totalTickets = 0) => {
    const { order, item, message } = ticket;
    
    return `
      <div class="message-ticket">
        ${showIndex ? `<div class="ticket-index">Ticket ${ticketIndex + 1} / ${totalTickets}</div>` : ''}
        
        <!-- Title -->
        <div class="decorative-title">Message</div>
        
        <!-- Order Info -->
        <div class="order-info">
          <div class="order-header">
            <div class="order-number">Order ${order.number}</div>
            <div class="ref-number">#${order.ref_number}</div>
          </div>
          <div class="customer-name">${order.customer.name || '—'}</div>
          <div class="customer-phone">${order.customer.phone || '—'}</div>
          ${order.tags && order.tags.length > 0 ? `
            <div class="pickup-time">
              <div class="time-label">Pickup:</div>
              <div class="time-value">${order.tags[0]} | ${order.tags[1]}</div>
            </div>
          ` : ''}
        </div>
        
        <!-- Product Info -->
        <div class="product-info">
          <div class="product-title">${item.productTitle.replace(/\s*\([^)]*\)/g, '')}</div>
          ${item.variantSize ? `<div class="product-size">${item.variantSize.replace(/\s*\([^)]*\)/g, '')}</div>` : ''}
        </div>
        
        <!-- Message -->
        <div class="message-section">
          <div class="message-content">${message}</div>
        </div>
      </div>
    `;
  };

  // Print styles for message tickets - optimized for 80mm receipt paper - BLACK ONLY
  const getPrintStyles = (isMultiTicket = false) => `
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
      ${isMultiTicket ? `
      .message-ticket { page-break-after: always; }
      .message-ticket:last-child { page-break-after: auto; }
      ` : ''}
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      margin: 0;
      padding: ${isMultiTicket ? '0' : '10px'};
      background: white;
      color: black;
    }
    
    .message-ticket {
      background: white;
      width: 100%;
      margin: 0 auto;
      ${isMultiTicket ? 'page-break-inside: avoid;' : ''}
      position: relative;
    }
    
    .ticket-index {
      position: absolute;
      top: 8px;
      right: 12px;
      font-size: 10px;
      color: black;
      font-weight: 500;
    }
    
    .decorative-title {
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      color: black;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid black;
      padding-bottom: 6px;
    }
    
    .order-info {
      padding: 8px;
      background: white;
      border-bottom: 1px solid black;
    }
    
    .order-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    
    .order-number {
      font-size: 14px;
      font-weight: bold;
      color: black;
    }
    
    .ref-number {
      font-size: 17px;
      font-weight: bold;
      color: black;
    }
    
    .customer-name {
      font-size: 12px;
      font-weight: 600;
      color: black;
      margin-bottom: 3px;
    }
    
    .customer-phone {
      font-size: 12px;
      color: black;
      margin-bottom: 6px;
    }
    
    .pickup-time {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    
    .time-label {
      font-size: 10px;
      color: black;
      font-weight: 500;
    }
    
    .time-value {
      font-size: 12px;
      color: black;
      font-weight: 600;
    }
    
    .product-info {
      padding: 8px;
      background: white;
    }
    
    .product-title {
      font-size: 14px;
      font-weight: 600;
      color: black;
      margin-bottom: 3px;
    }
    
    .product-size {
      font-size: 12px;
      color: black;
      margin-bottom: 3px;
    }
    
    .product-quantity {
      font-size: 12px;
      color: black;
      font-weight: 500;
    }
    
    .message-section {
      padding: 12px;
      background: white;
      border: 2px solid black;
      border-radius: 6px;
    }
    
    .message-content {
      font-size: 16px;
      font-weight: 600;
      color: black;
      line-height: 1.3;
      text-align: center;
      min-height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .print-controls {
      text-align: center;
      margin-top: ${isMultiTicket ? '20px' : '16px'};
      padding-top: ${isMultiTicket ? '20px' : '16px'};
      margin-bottom: 20px;
    }
    
    .print-btn {
      background: black;
      color: white;
      border: 1px solid black;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      margin: 0 8px;
      font-size: 14px;
      font-weight: 500;
      transition: background-color 0.2s;
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
  `;

  const handlePrintTicket = (ticket: MessageTicket) => {
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Message Ticket - ${ticket.order.number}</title>
        <style>
          ${getPrintStyles(false)}
        </style>
      </head>
      <body>
        ${generateMessageTicketHTML(ticket, false)}

        <!-- Print Controls -->
        <div class="no-print print-controls">
          <button class="print-btn" onclick="window.print()">🖨️ Print Ticket</button>
          <button class="print-btn close-btn" onclick="window.close()">❌ Close</button>
        </div>

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

  const handlePrintAllTickets = () => {
    setShowPrintModal(true);
  };

  const confirmPrintAllTickets = async () => {
    setShowPrintModal(false);

    if (messageTickets.length === 0) return;

    for (let i = 0; i < messageTickets.length; i++) {
      const ticket = messageTickets[i];
      const printWindow = window.open('', '_blank', 'width=600,height=800');
      if (!printWindow) {
        console.warn('Popup blocked while opening print window for ticket:', ticket?.order?.number);
        continue;
      }

      const singleTicketContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Message Ticket - ${ticket.order.number}</title>
          <style>
            ${getPrintStyles(false)}
          </style>
        </head>
        <body>
          ${generateMessageTicketHTML(ticket, false)}

          <!-- Print Controls -->
          <div class="no-print print-controls">
            <button class="print-btn" onclick="window.print()">🖨️ Print Ticket</button>
            <button class="print-btn close-btn" onclick="window.close()">❌ Close</button>
          </div>

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

      printWindow.document.write(singleTicketContent);
      printWindow.document.close();

      // Wait until the window closes (after printing), then continue with next ticket
      await waitForWindowClose(printWindow);
    }
  };

  const cancelPrintAllTickets = () => {
    setShowPrintModal(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
        <div className="ml-4 text-gray-600">Loading message tickets for {dueDate}...</div>
      </div>
    );
  }

  if (messageTickets.length === 0) {
    return (
      <div className="text-center py-12">
        <button
            onClick={() => navigate('/orders')}
            className="w-[150px] px-3 py-2 bg-gray-500 text-white text-sm font-semibold rounded hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            ← Back to Orders
          </button>
        <div className="flex items-center justify-center mb-4">
          <div className="text-6xl">📝</div>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Message Tickets Found</h3>
        <p className="text-gray-500">
          No orders with messages found for date: {dueDate}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-4">
          <button
            onClick={() => navigate('/orders')}
            className="w-[150px] px-3 py-2 bg-gray-500 text-white text-sm font-semibold rounded hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            ← Back to Orders
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Message Tickets - {dueDate}
            </h2>
            <p className="text-gray-600">Production message tickets for cake orders</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-lg font-bold text-gray-700">
            {messageTickets.length} message tickets
          </div>
          <button
            onClick={handlePrintAllTickets}
            className="px-4 py-2 bg-gray-700 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            🖨️ Print All Tickets
          </button>
        </div>
      </div>

      {/* Message Tickets Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {messageTickets.map((ticket) => (
          <div
            key={ticket.id}
            className="bg-white rounded-lg shadow-md border border-gray-300 p-6 flex flex-col hover:shadow-lg transition-shadow relative"
          >
            {/* Ticket Index */}
            <div className="absolute top-3 right-3 text-xs text-gray-400 font-medium">
              #{ticket.order.ref_number}
            </div>
            
            {/* Title */}
            <div className="text-center mb-4">
              <div className="text-xl font-bold text-gray-900 mb-2 uppercase tracking-wide">Message</div>
            </div>
            
            {/* Order Info */}
            <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-700">Order #{ticket.order.number}</span>
                <span className="text-sm font-bold text-gray-900">#{ticket.order.ref_number}</span>
              </div>
              <div className="font-semibold text-gray-900 mb-1">{ticket.order.customer.name}</div>
              <div className="text-sm text-gray-600 mb-2">{ticket.order.customer.phone}</div>
              {ticket.order.tags && ticket.order.tags.length > 0 && (
                <div className="text-sm text-gray-700 font-medium">
                  {ticket.order.tags[0]} | {ticket.order.tags[1]}
                </div>
              )}
            </div>
            
            {/* Product Info */}
            <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
              <div className="font-semibold text-gray-900 mb-1">{ticket.item.productTitle}</div>
              {ticket.item.variantSize && (
                <div className="text-sm text-gray-700 mb-1">{ticket.item.variantSize}</div>
              )}
              <div className="text-sm text-gray-700 font-medium">Quantity: {ticket.item.quantity}</div>
            </div>
            
            {/* Message */}
            <div className="flex-1 p-4 bg-white rounded border-2 border-gray-400">
              <div className="text-lg font-semibold text-gray-900 text-center leading-relaxed min-h-[60px] flex items-center justify-center">
                {ticket.message}
              </div>
            </div>
            
            {/* Print Button */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <button
                onClick={() => handlePrintTicket(ticket)}
                className="w-full px-4 py-2 bg-gray-700 text-white text-sm font-semibold rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                🖨️ Print Ticket
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Print Confirmation Modal */}
      <PrintConfirmModal
        isOpen={showPrintModal}
        onConfirm={confirmPrintAllTickets}
        onCancel={cancelPrintAllTickets}
        title="Print All Message Tickets"
        message={`You will print ${messageTickets.length} message tickets and cannot stop the process.`}
      />
    </div>
  );
};

export default MessageTicketsPage;
