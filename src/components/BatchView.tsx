import { useOrdersStore, GroupUnit, GroupProgressItem } from '../stores/ordersStore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';

const BatchView = () => {
  const { groups, loading, toggleGroupItemOptimistically } = useOrdersStore();

  const toggleUnit = httpsCallable(functions, 'toggleGroupUnit');
  const { dueDate } = useSettingsStore();

  // Debug logging
  useEffect(() => {
    console.log('BatchView - dueDate:', dueDate);
    console.log('BatchView - groups:', groups);
    console.log('BatchView - loading:', loading);
  }, [dueDate, groups, loading]);

  const handleToggleUnit = async (group: GroupUnit, progressItem: GroupProgressItem) => {
    try {
      console.log('Toggling unit:', { 
        day: dueDate, 
        groupKey: group.key, 
        orderId: progressItem.orderId,
        lineItemId: progressItem.lineItemId,
        unitIndex: progressItem.unitIndex
      });

      // Optimistic UI update - update immediately for better UX
      toggleGroupItemOptimistically(group.key, progressItem.orderId, progressItem.lineItemId);

      // Send request to Firebase using the new structure
      const result = await toggleUnit({
        day: dueDate,
        groupKey: group.key,
        orderId: progressItem.orderId,
        lineItemId: progressItem.lineItemId
      });

      console.log('Toggle result:', result);
    } catch (error) {
      console.error('Error toggling unit:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        details: (error as any)?.details
      });

      // Note: If there's an error, the Firestore subscription will revert the UI to the correct state
    }
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
        <title>All Production Cards - ${dueDate}</title>
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
          
          .date {
            color: #374151;
            font-size: 12px;
          }
          
          .total-section {
            display: flex;
            flex-direction: row;
            gap: 6px;
            align-items: center;
          }
          
          .total-text {
            font-weight: 500;
            color: #374151;
            font-size: 16px;
          }
          
          .product-title {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 4px;
            line-height: 1.3;
          }
          
          .size-badge {
            display: inline-block;
            background: #dbeafe;
            padding: 2px 4px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 14px;
          }
          
          .options-section {
            margin: 12px 0;
          }
          
          .option-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 3px 0;
            padding: 2px 0;
            gap: 6px;
          }
          
          .option-text {
            font-size: 11px;
            color: #6b7280;
            font-weight: 500;
            flex: 1;
          }
          
          .option-count {
            padding: 0px 4px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 500;
            min-width: 18px;
            text-align: center;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .unit-buttons {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 3px;
            margin: 8px 0;
          }
          
          .unit-button {
            width: 32px;
            height: 32px;
            border-radius: 6px;
            border: 2px solid #d1d5db;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 600;
            color: #6b7280;
            background: #f9fafb;
            position: relative;
          }
          
          .unit-button.completed {
            background: white !important;
            border-color: black !important;
            color: black !important;
          }
          
          .unit-button.completed::after {
             content: '';
             position: absolute;
             top: 50%;
             left: 50%;
             width: 28px;
             height: 2px;
             background: black !important;
             border-radius: 1px;
             transform: translate(-50%, -50%) rotate(-45deg);
             z-index: 10;
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
        
        ${groups
        .filter(group => !group.productTitle.includes("Tip"))
        .map((group, groupIndex) => `
          <div class="card">
            <!-- Header Row -->
            <div class="header-row">
              <div class="date">${dueDate}</div>
              <div class="total-section">
                <div class="total-text">Total: ${group.need}</div>
              </div>
            </div>

            <!-- Product Title -->
            <h3 class="product-title">${group.productTitle.replace(/\([^)]*\)/g, "")}</h3>
            
            <!-- Size Badge -->
            ${group.variantSize ? `<div class="size-badge">${group.variantSize.replace(/\([^)]*\)/g, "")}</div>` : ''}

            <!-- Selected Options -->
            ${group.selectedOptions && group.selectedOptions.length > 0 ? `
            <div class="options-section">
              ${group.selectedOptions.map((option, index) => {
          let optionText = option.option
            .replace(/\([^)]*\)/g, "")
            .replace("Add Message +$3", "Yes")
            .replace("Add Message + $3", "Yes")
            .replace("Add Chocolate Plaque", "")
            .replace("thanks", "")
            .replace("+$3", "")
            .replace(/,[^,]*$/, "")
            .replace("Title: Default Title", "")
            .replace('6" Add Extra 1 Unit +$10', "Yes")
            .replace('6" - Add Extra 1 Unit +$10', "Yes");

          if (!optionText) return '';

          return `
                  <div class="option-item">
                    <span class="option-text">${index + 1}. ${optionText}</span>
                    <span class="option-count">x ${option.count}</span>
                  </div>
                `;
        }).join('')}
            </div>
            ` : ''}

            <!-- Unit Buttons -->
            <div class="unit-buttons">
              ${Array.from({ length: group.need }, (_, index) => `
                <div class="unit-button ${group.progress[index] ? 'completed' : ''}">
                  ${index + 1}
                </div>
              `).join('')}
            </div>

            <!-- Card Index -->
            <div class="card-index">
              <span class="index-text">Page ${groupIndex + 1} / ${groups.filter(g => !g.productTitle.includes("Tip")).length}</span>
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

  const handlePrintCard = (group: GroupUnit) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=500,height=700');
    if (!printWindow) return;

    // Create the print content that matches the card design exactly
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Production Card - ${group.productTitle}</title>
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
           
           .date {
             color: #374151;
             font-size: 12px;
           }
           
           .total-section {
             display: flex;
             flex-direction: row;
             gap: 6px;
             align-items: center;
           }
           
           .total-text {
             font-weight: 500;
             color: #374151;
             font-size: 16px;
           }
           
           .print-icon {
             font-size: 14px;
             color: #3b82f6;
           }
           
           .product-title {
             font-size: 16px;
             font-weight: 600;
             color: #111827;
             margin-bottom: 4px;
             line-height: 1.3;
           }
           
           .size-badge {
             display: inline-block;
             background: #dbeafe;
             padding: 2px 4px;
             border-radius: 4px;
             font-weight: 700;
             font-size: 14px;
           }
           
           .options-section {
             margin: 12px 0;
           }
           
           .option-item {
             display: flex;
             justify-content: space-between;
             align-items: center;
             margin: 3px 0;
             padding: 2px 0;
             gap: 6px;
           }
           
           .option-text {
             font-size: 11px;
             color: #6b7280;
             font-weight: 500;
             flex: 1;
           }
           
           .option-count {
             padding: 0px 4px;
             border-radius: 3px;
             font-size: 11px;
             font-weight: 500;
             min-width: 18px;
             text-align: center;
             height: 18px;
             display: flex;
             align-items: center;
             justify-content: center;
           }
           
           .unit-buttons {
             display: grid;
             grid-template-columns: repeat(5, 1fr);
             gap: 3px;
             margin: 8px 0;
           }
           
           .unit-button {
             width: 32px;
             height: 32px;
             border-radius: 6px;
             border: 2px solid #d1d5db;
             display: flex;
             align-items: center;
             justify-content: center;
             font-size: 14px;
             font-weight: 600;
             color: #6b7280;
             background: #f9fafb;
             position: relative;
             transition: all 0.2s;
           }
          
          .unit-button.completed {
            background: white !important;
            border-color: black !important;
            color: black !important;
          }
          
          .unit-button.completed::after {
             content: '';
             position: absolute;
             top: 50%;
             left: 50%;
             width: 28px;
             height: 2px;
             background: black !important;
             border-radius: 1px;
             transform: translate(-50%, -50%) rotate(-45deg);
             z-index: 10;
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
            <div class="date">${dueDate}</div>
            <div class="total-section">
              <div class="total-text">Total: ${group.need}</div>
            </div>
          </div>

          <!-- Product Title -->
          <h3 class="product-title">${group.productTitle.replace(/\([^)]*\)/g, "")}</h3>
          
          <!-- Size Badge -->
          ${group.variantSize ? `<div class="size-badge">${group.variantSize.replace(/\([^)]*\)/g, "")}</div>` : ''}

          <!-- Selected Options -->
          ${group.selectedOptions && group.selectedOptions.length > 0 ? `
          <div class="options-section">
            ${group.selectedOptions.map((option, index) => {
      let optionText = option.option
        .replace(/\([^)]*\)/g, "")
        .replace("Add Message +$3", "Yes")
        .replace("Add Message + $3", "Yes")
        .replace("Add Chocolate Plaque", "")
        .replace("thanks", "")
        .replace("+$3", "")
        .replace(/,[^,]*$/, "")
        .replace("Title: Default Title", "")
        .replace('6" Add Extra 1 Unit +$10', "Yes")
        .replace('6" - Add Extra 1 Unit +$10', "Yes");

      if (!optionText) return '';

      return `
                <div class="option-item">
                  <span class="option-text">${index + 1}. ${optionText}</span>
                  <span class="option-count">x ${option.count}</span>
                </div>
              `;
    }).join('')}
          </div>
          ` : ''}

          <!-- Unit Buttons -->
          <div class="unit-buttons">
            ${Array.from({ length: group.need }, (_, index) => `
              <div class="unit-button ${group.progress[index] ? 'completed' : ''}">
                ${index + 1}
              </div>
            `).join('')}
          </div>

          <!-- Card Index -->
          <div class="card-index">
            <span class="index-text">Page ${groups.findIndex(g => g.key === group.key) + 1} / ${groups.length}</span>
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="ml-4 text-gray-600">Loading groups for {dueDate}...</div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        {/* Back to Order Page Button */}
        <div className="flex items-center">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors mb-4"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-sm font-medium">Back to Order Page</span>
          </button>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders found</h3>
        <p className="text-gray-500">
          No batch sheet have been created for date: {dueDate}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back to Order Page Button */}
      <div className="flex items-center">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors mb-4"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="text-sm font-medium">Back to Order Page</span>
        </button>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Batch Production for {dueDate}</h2>
        <div className="flex items-center gap-4">
          <div className="text-lg font-bold">
            {groups.length} groups • {groups.reduce((sum, g) => sum + g.need, 0)} total units
          </div>
          <button
            onClick={handlePrintAllCards}
            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            🖨️ Print All Cards
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => {
          if (group.productTitle.includes("Tip")) return null
          return (
            <div key={group.key} className="bg-white rounded-lg shadow-sm border p-6">
              {/* Date and Total */}
              <div className=" text-center flex justify-between flex-row">
                <div>{dueDate}</div>
                <div className="flex flex-row gap-2">
                  <div className="font-medium">
                    Total: {group.need}
                  </div>
                  {/* Print Button */}
                  <button
                    onClick={() => handlePrintCard(group)}
                    className="text-white text-sm font-semibold rounded-lg"
                  >
                    🖨️
                  </button>
                </div>
              </div>

              {/* Group Header */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {group.productTitle.replace(/\([^)]*\)/g, "")}
                </h3>
                {group.variantSize && <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold  ">
                    {group.variantSize.replace(/\([^)]*\)/g, "")}
                  </span>
                </div>}

                {/* Selected Options */}
                {group.selectedOptions && group.selectedOptions.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {group.selectedOptions.map((option, index) => {
                      let optionText = option.option
                        .replace(/\([^)]*\)/g, "") // remove everything inside ()
                        .replace("Add Message +$3", "Yes")
                        .replace("Add Message + $3", "Yes")
                        .replace("Add Chocolate Plaque", "")
                        .replace("Add Chocolate Plaque", "")
                        .replace("thanks", "")
                        .replace("+$3", "")
                        .replace(/,[^,]*$/, "")
                        .replace("Title: Default Title", "")
                        .replace('6" Add Extra 1 Unit +$10', "Yes")
                        .replace('6" - Add Extra 1 Unit +$10', "Yes")
                      if (!optionText) return null
                      return (
                        <div key={index} className="flex justify-between text-xs text-gray-600 gap-2">
                          <span className="font-medium">
                            {index + 1}. {optionText}
                          </span>
                          {optionText && <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded h-5">
                            {option.count}
                          </span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>



              {/* Unit Buttons */}
              <div className="grid grid-cols-5 gap-2 mt-4">
                {group.progressItems?.map((item, index) => {
                  return (
                    <div key={index} className='flex flex-col items-center justify-center'>
                                             <button
                         key={index}
                         onClick={() => !item.isVoided && handleToggleUnit(group, item)}
                         disabled={item.isVoided}
                        className={`
                     w-10 h-10 rounded-lg border-2 transition-all duration-200 flex items-center justify-center relative
                     ${item.completed === 1 && !item.isVoided
                            ? 'bg-green-100 border-green-500 text-green-700 hover:bg-green-200'
                            : item.isVoided
                            ? 'bg-red-100 border-red-300 text-red-500 opacity-50 cursor-not-allowed'
                            : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                          }
                   `}
                      >
                        {/* Ref Number */}
                        <span className="text-2xl">
                          {index + 1}
                        </span>

                        {/* X Overlay when checked */}
                        {item.completed === 1 && !item.isVoided && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span
                              className="block w-9 h-[2px] bg-red-600 rounded-full"
                              style={{ transform: "rotate(-45deg)" }}
                            ></span>
                          </div>
                        )}
                      </button>
                      <div className='text-[9px] text-center'>{item.orderNumber + (item.isVoided ? " Voided" : "")}</div>
                    </div>
                  )
                })}
              </div>

              {/* Card Index */}
              <div className="flex justify-end mt-3">
                <span className="text-xs text-gray-500 font-medium">
                  Page {groups.findIndex(g => g.key === group.key) + 1} / {groups.length}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default BatchView;
