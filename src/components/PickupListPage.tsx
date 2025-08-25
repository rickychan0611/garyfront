import React, { useMemo } from 'react';
import { useOrdersStore, Order } from '../stores/ordersStore';
import { useSettingsStore } from '../stores/settingsStore';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';

const PickupListPage = () => {
  const { orders, loading } = useOrdersStore();
  const { dueDate } = useSettingsStore();
  // No sorting state needed - table will be ordered by ref_number

  // Helper function to extract pickup time from tags
  const extractPickupTime = (tags: string[]): string => {
    if (!tags || tags.length < 2) return '—';
    const timeTag = tags[1];
    if (!timeTag) return '—';
    
    // Extract time from format like "3:30 PM - 5:45 PM"
    const timeMatch = timeTag.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
    return timeMatch ? timeMatch[1] : '—';
  };

  // Helper function to format items with messages
  const formatItems = (items: Order['items']): JSX.Element => {
    return (
      <div className="space-y-1">
        {items.map((item, index) => {
          let itemText = `${item.productTitle}`;
          if (item.variantSize) {
            itemText += ` (${item.variantSize})`;
          }
          itemText += ` ×${item.quantity}`;
          
          // Add message if exists
          if (item.message) {
            itemText += ` - ${item.message}`;
          }
          
          return (
            <div key={index} className="text-sm">
              • {itemText}
            </div>
          );
        })}
      </div>
    );
  };

  // Helper function to format phone number
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '—';
    // Format phone number as (XXX) XXX-XXXX, removing country code if present
    const cleaned = phone.replace(/^\+1\s?/, "").replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Transform orders data for the table, sorted by ref_number
  const tableData = useMemo(() => {
    return orders
      .sort((a, b) => a.ref_number - b.ref_number) // Sort by ref_number ascending
      .map((order) => ({
        id: order.id,
        refNumber: order.ref_number,
        number: order.number,
        customerName: order.customer.name || '—',
        phoneNumber: formatPhoneNumber(order.customer.phone),
        pickupTime: extractPickupTime(order.tags),
        items: formatItems(order.items),
        paymentStatus: order.financial_status || '—',
        notes: order.note || '—',
        originalOrder: order // Keep reference for any additional data needed
      }));
  }, [orders]);

  // Define table columns
  const columnHelper = createColumnHelper<typeof tableData[0]>();

  const columns = [
    columnHelper.accessor('refNumber', {
      header: '#',
      cell: info => info.getValue(),
      enableSorting: false,
    }),
         columnHelper.accessor('number', {
       header: 'Order #',
       cell: info => info.getValue(),
     }),
     columnHelper.accessor('customerName', {
       header: 'Customer Name',
       cell: info => info.getValue(),
     }),
     columnHelper.accessor('phoneNumber', {
       header: 'Phone Number',
       cell: info => info.getValue(),
     }),
     columnHelper.accessor('pickupTime', {
       header: 'Pickup Time',
       cell: info => info.getValue(),
     }),
     columnHelper.accessor('items', {
       header: 'Items',
       cell: info => (
         <div className="min-w-[200px] py-2">
           {info.getValue()}
         </div>
       ),
       enableSorting: false,
     }),
     columnHelper.accessor('paymentStatus', {
       header: 'Payment Status',
       cell: info => {
         const status = info.getValue();
         const statusColors = {
           'VOIDED': 'bg-red-100 text-red-800',
           'PENDING': 'bg-yellow-100 text-yellow-800',
           'PAID': 'bg-green-100 text-green-800',
           'REFUNDED': 'bg-orange-100 text-orange-800',
         };
         
         return (
           <span className={`px-2 py-1 rounded-full text-xs font-medium ${
             statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
           }`}>
             {status}
           </span>
         );
       },
     }),
     columnHelper.accessor('notes', {
       header: 'Notes',
       cell: info => (
         <div className="max-w-xs text-sm py-2">
           {info.getValue()}
         </div>
       ),
     }),
  ];

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handlePrint = () => {
    // Data is already sorted by ref_number, just use tableData directly
    const sortedForPrint = [...tableData];
    
    // Helper function to format items for print (convert JSX back to string with line breaks)
    const formatItemsForPrint = (items: Order['items']): string => {
      return items.map(item => {
        let itemText = `${item.productTitle}`;
        if (item.variantSize) {
          itemText += ` (${item.variantSize})`;
        }
        itemText += ` ×${item.quantity}`;
        
        // Add message if exists
        if (item.message) {
          itemText += ` - ${item.message}`;
        }
        
        return `• ${itemText}`;
      }).join('<br/>');
    };
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pickup Orders - ${dueDate}</title>
        <style>
          @media print {
            @page {
              margin: 0.5in;
              size: letter landscape;
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
            padding: 20px;
            background: white;
            color: black;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
          }
          
          .header h2 {
            margin: 5px 0 0 0;
            font-size: 18px;
            font-weight: normal;
            color: #666;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            vertical-align: top;
          }
          
          th {
            background-color: #f5f5f5;
            font-weight: bold;
            font-size: 14px;
          }
          
          td {
            font-size: 12px;
          }
          
          .row-number {
            font-weight: bold;
            width: 40px;
            text-align: center;
          }
          
          .order-number {
            font-weight: bold;
            width: 80px;
          }
          
          .customer-name {
            width: 120px;
          }
          
          .phone-number {
            width: 100px;
          }
          
          .pickup-time {
            width: 80px;
          }
          
          .items {
            width: 300px;
            line-height: 1.6;
          }
          
          .payment-status {
            width: 80px;
            text-align: center;
          }
          
          .notes {
            width: 50px;
          }
          
          .status-badge {
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
          }
          
          .status-voided {
            background-color: #fee2e2;
            color: #991b1b;
          }
          
          .status-pending {
            background-color: #fef3c7;
            color: #92400e;
          }
          
          .status-paid {
            background-color: #d1fae5;
            color: #065f46;
          }
          
                     .status-refunded {
             background-color: #fed7aa;
             color: #9a3412;
           }
           
           .voided-row {
             opacity: 0.7;
             position: relative;
           }
           
           .voided-row::after {
             content: "VOIDED";
             position: absolute;
             top: 50%;
             left: 50%;
             transform: translate(-50%, -50%) rotate(-45deg);
             font-size: 36px;
             font-weight: bold;
             color: #dc2626;
             text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
             z-index: 10;
             pointer-events: none;
             white-space: nowrap;
             letter-spacing: 2px;
           }
          
          .print-controls {
            text-align: center;
            margin-bottom: 20px;
          }
          
          .print-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin: 0 6px;
            font-size: 14px;
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
          <button class="print-btn" onclick="window.print()">🖨️ Print List</button>
          <button class="print-btn close-btn" onclick="window.close()">❌ Close</button>
        </div>
        
        <!-- Header -->
        <div class="header">
          <h2>Pickup Orders - ${dueDate}</h2>
        </div>
        
        <!-- Table -->
        <table>
          <thead>
            <tr>
              <th class="row-number">#</th>
              <th class="order-number">Order #</th>
              <th class="customer-name">Customer Name</th>
              <th class="phone-number">Phone Number</th>
              <th class="pickup-time">Pickup Time</th>
              <th class="items">Items</th>
              <th class="payment-status">Payment Status</th>
              <th class="notes">Notes</th>
            </tr>
          </thead>
          <tbody>
                         ${sortedForPrint.map(row => `
               <tr class="${row.paymentStatus === 'VOIDED' ? 'voided-row' : ''}">
                 <td class="row-number">${row.refNumber}</td>
                 <td class="order-number">${row.number}</td>
                 <td class="customer-name">${row.customerName}</td>
                 <td class="phone-number">${row.phoneNumber}</td>
                 <td class="pickup-time">${row.pickupTime}</td>
                 <td class="items">${formatItemsForPrint(row.originalOrder.items)}</td>
                 <td class="payment-status">
                   <span class="status-badge status-${row.paymentStatus.toLowerCase()}">${row.paymentStatus}</span>
                 </td>
                 <td class="notes">${row.notes}</td>
               </tr>
             `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="ml-4 text-gray-600">Loading pickup orders for {dueDate}...</div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="flex items-center mb-4">
          
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
        <p className="text-gray-500">
          No pickup orders found for date: {dueDate}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Pickup Orders - {dueDate}
          </h2>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-lg font-bold text-gray-700">
            {orders.length} orders
          </div>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            🖨️ Print List
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                                         <th
                       key={header.id}
                       className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                     >
                       <div className="flex items-center gap-2">
                         {flexRender(header.column.columnDef.header, header.getContext())}
                       </div>
                     </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4 text-sm text-gray-900 align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PickupListPage;
