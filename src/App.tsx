import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useOrdersStore } from './stores/ordersStore';
import './print.css';
import BatchView from './components/BatchView';
import OrdersPage from './components/OrdersPage';
import ProductPage from './components/ProductPage';
import MessageTicketsPage from './components/MessageTicketsPage';

function App() {
  const { selectedDate, setSelectedDate, subscribeToGroups, subscribeToOrders, unsubscribe } = useOrdersStore();

  useEffect(() => {
    // Subscribe to data when component mounts
    subscribeToGroups(selectedDate);
    subscribeToOrders(selectedDate);

    // Cleanup on unmount
    return () => unsubscribe();
  }, [selectedDate, subscribeToGroups, subscribeToOrders, unsubscribe]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-semibold text-gray-900">Gary's Order Tracker</h1>
              
              {/* Date Selector */}
              {/* <div className="flex items-center space-x-4">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div> */}

              {/* Navigation */}
              <nav className="flex space-x-4">
                <Link
                  to="/orders"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  Orders
                </Link>
                <Link
                  to="/products"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  Products
                </Link>
                <Link
                  to="/message-tickets"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  Message Tickets
                </Link>             
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<OrdersPage />} />
            <Route path="/batch-view" element={<BatchView />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/products" element={<ProductPage />} />
            <Route path="/message-tickets" element={<MessageTicketsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
