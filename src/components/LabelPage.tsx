import { useOrdersStore } from '../stores/ordersStore';
import { Printer } from 'lucide-react';

const LabelPage = () => {
  const { orders, selectedDate } = useOrdersStore();

  const handlePrint = () => {
    window.print();
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
              className="bg-white border border-gray-300 rounded-lg p-4 print:border-0 print:p-2 print:break-inside-avoid"
              style={{ width: '80mm', minHeight: '60mm' }}
            >
              {/* Order Info */}
              <div className="text-center mb-3">
                <div className="text-lg font-bold text-gray-900">#{order.number}</div>
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
      `}</style>
    </div>
  );
};

export default LabelPage;
