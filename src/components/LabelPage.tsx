import { useOrdersStore } from '../stores/ordersStore';
import { Printer } from 'lucide-react';
import { useState } from 'react';

const PrintConfirmModal = ({
  isOpen,
  onConfirm,
  onCancel,
  title = "Print Confirmation",
  message = "You will print all pages and cannot stop the process."
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 text-blue-700 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
};

const LabelPage = () => {
  const { orders, selectedDate } = useOrdersStore();

  // State for print confirmation modal
  const [showPrintModal, setShowPrintModal] = useState(false);

  const handlePrint = () => {
    setShowPrintModal(true);
  };

  const confirmPrint = async () => {
    setShowPrintModal(false);

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    // Helper function to wait for window close
    const waitForWindowClose = (win: Window, timeoutMs = 5 * 60 * 1000) => {
      return new Promise<void>((resolve) => {
        const timer = setInterval(() => {
          if (win.closed || Date.now() - Date.now() > timeoutMs) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    };

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Box Labels</title>
        <style>
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }

            body {
              margin: 0;
              padding: 0;
            }

            .print\\:break-inside-avoid {
              break-inside: avoid;
            }
          }

          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: white;
            color: black;
          }

          .label {
            width: 80mm;
            min-height: 60mm;
            margin: 0 auto;
            padding: 4px;
            border: 1px solid #ccc;
            background: white;
            position: relative;
            page-break-inside: avoid;
            break-inside: avoid;
            box-sizing: border-box;
          }

          .label.voided {
            opacity: 0.7;
            position: relative;
          }

          .label.voided::after {
            content: "VOIDED";
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 24px;
            font-weight: bold;
            color: red;
            z-index: 10;
            pointer-events: none;
            white-space: nowrap;
          }

          .order-info {
            text-align: center;
            margin-bottom: 6px;
          }

          .order-number {
            font-size: 16px;
            font-weight: bold;
            color: black;
          }

          .ref-number {
            font-size: 14px;
            font-weight: bold;
            color: blue;
          }

          .customer-name {
            font-size: 14px;
            color: black;
          }

          .customer-phone {
            font-size: 12px;
            color: gray;
          }

          .pickup-info {
            text-align: center;
            margin: 6px 0;
            border-top: 1px solid black;
            border-bottom: 1px solid black;
            padding: 4px 0;
          }

          .pickup-label {
            font-size: 12px;
            font-weight: bold;
            color: black;
          }

          .pickup-time {
            font-size: 14px;
            color: black;
          }

          .product-info {
            text-align: center;
            margin: 6px 0;
          }

          .product-title {
            font-size: 16px;
            font-weight: bold;
            color: black;
          }

          .product-size {
            font-size: 14px;
            color: black;
          }

          .customizations {
            text-align: center;
            margin: 6px 0;
            border-top: 1px solid black;
            padding-top: 4px;
          }

          .custom-label {
            font-size: 10px;
            color: gray;
          }

          .custom-content {
            font-size: 12px;
            color: black;
          }

          .message-section {
            text-align: center;
            margin: 6px 0;
            border: 2px solid blue;
            padding: 4px;
            background: #f0f8ff;
          }

          .message-label {
            font-size: 10px;
            color: blue;
          }

          .message-content {
            font-size: 14px;
            font-weight: bold;
            color: blue;
          }

          .print-controls {
            text-align: center;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid black;
          }

          .print-btn {
            background: black;
            color: white;
            border: 1px solid black;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin: 0 6px;
            font-size: 12px;
            font-weight: 500;
          }

          .close-btn {
            background: white;
            color: black;
            border: 1px solid black;
          }
        </style>
      </head>
      <body>
        ${orders.map((order) =>
          order.items.map((item, itemIndex) => `
            <div class="label ${order.financial_status === "VOIDED" ? "voided" : ""}">
              <!-- Order Info -->
              <div class="order-info">
                <div class="order-number">#${order.number}</div>
                <div class="ref-number">#${order.ref_number}</div>
                <div class="customer-name">${order.customer.name}</div>
                <div class="customer-phone">${order.customer.phone}</div>
              </div>

              <!-- Pickup Time -->
              <div class="pickup-info">
                <div class="pickup-label">Pickup</div>
                <div class="pickup-time">${new Date(order.pickupAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}</div>
              </div>

              <!-- Product Info -->
              <div class="product-info">
                <div class="product-title">${item.productTitle}</div>
                <div class="product-size">${item.variantSize}</div>
              </div>

              <!-- Customizations -->
              ${item.customRaw.length > 0 ? `
              <div class="customizations">
                <div class="custom-label">Notes:</div>
                <div class="custom-content">${item.customRaw.join(', ')}</div>
              </div>
              ` : ''}

              <!-- Message -->
              ${item.message ? `
              <div class="message-section">
                <div class="message-label">Message:</div>
                <div class="message-content">${item.message}</div>
              </div>
              ` : ''}
            </div>
          `).join('')
        ).join('')}

        <!-- Print Controls -->
        <div class="print-controls">
          <button class="print-btn" onclick="window.print()">🖨️ Print Labels</button>
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

  const cancelPrint = () => {
    setShowPrintModal(false);
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
        <p className="text-gray-500">No orders have been created for this date yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Box Labels</h2>
        <button
          onClick={handlePrint}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Labels
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 print:grid-cols-1">
        {orders.map((order) => (
          order.items.map((item, itemIndex) => (
                         <div
               key={`${order.id}-${item.id}`}
               className={`bg-white border border-gray-300 rounded-lg p-4 print:border-0 print:p-2 print:break-inside-avoid relative ${
                 order.financial_status === "VOIDED" ? "opacity-70" : ""
               }`}
               style={{ width: '80mm', minHeight: '60mm' }}
             >
               {order.financial_status === "VOIDED" && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                   <div className="text-4xl font-bold text-red-600 transform -rotate-45 select-none">
                     VOIDED
                   </div>
                 </div>
               )}
              {/* Order Info */}
              <div className="text-center mb-3">
                <div className="text-lg font-bold text-gray-900">#{order.number}</div>
                <div className="text-sm font-semibold text-blue-600">#{order.ref_number}</div>
                <div className="text-sm text-gray-600">{order.customer.name}</div>
                <div className="text-xs text-gray-500">{order.customer.phone}</div>
              </div>

              {/* Pickup Time */}
              <div className="text-center mb-3">
                <div className="text-sm font-medium text-gray-900">Pickup</div>
                <div className="text-xs text-gray-600">
                  {new Date(order.pickupAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>

              {/* Product Info */}
              <div className="text-center mb-3">
                <div className="text-base font-semibold text-gray-900">{item.productTitle}</div>
                <div className="text-sm text-gray-600">{item.variantSize}</div>
              </div>

              {/* Customizations */}
              {item.customRaw.length > 0 && (
                <div className="text-center mb-2">
                  <div className="text-xs text-gray-500">Notes:</div>
                  <div className="text-xs text-gray-700">
                    {item.customRaw.join(', ')}
                  </div>
                </div>
              )}

              {/* Message */}
              {item.message && (
                <div className="text-center">
                  <div className="text-xs text-gray-500">Message:</div>
                  <div className="text-xs font-medium text-blue-600">{item.message}</div>
                </div>
              )}
            </div>
          ))
        ))}
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          .print\\:break-inside-avoid {
            break-inside: avoid;
          }
        }
      `}      </style>

      {/* Print Confirmation Modal */}
      <PrintConfirmModal
        isOpen={showPrintModal}
        onConfirm={confirmPrint}
        onCancel={cancelPrint}
        title="Print All Labels"
        message={`You will print ${orders.flatMap(order => order.items).length} labels and cannot stop the process.`}
      />
    </div>
  );
};

export default LabelPage;
