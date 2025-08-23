import { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnDef,
} from '@tanstack/react-table';
import { ChevronDown, ChevronRight, Search, Eye, Package, Tag, Calendar, ChevronUp } from 'lucide-react';
import { 
  useProductStore, 
  groupProductsByCategory, 
  isDataStale,
  type Product,
  type ProductCategory 
} from '../stores/productStore';

const API_BASE = import.meta.env.VITE_API_BASE;

const ProductPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Zustand store
  const {
    products,
    categories,
    loading,
    error,
    lastFetched,
    isInitialized,
    setProducts,
    setCategories,
    setLoading,
    setError,
    setLastFetched,
    setIsInitialized,
    clearError
  } = useProductStore();

  useEffect(() => {
    // Only fetch if data is stale or not initialized
    if (!isInitialized || isDataStale(lastFetched)) {
      loadProducts();
    }
  }, [isInitialized, lastFetched]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      clearError();
      
      const response = await fetch(`${API_BASE}/fetchAllProducts`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.products) {
        setProducts(data.products);
        const groupedCategories = groupProductsByCategory(data.products);
        setCategories(groupedCategories);
        setLastFetched(Date.now());
        setIsInitialized(true);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to fetch products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    let filtered = selectedCategory === 'all' 
      ? products 
      : categories.find(cat => cat.name === selectedCategory)?.products || [];

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered;
  }, [products, categories, selectedCategory, searchTerm]);

  const getMainImage = (product: Product) => {
    return product.images[0]?.url || product.variants[0]?.image?.url || '/placeholder-image.png';
  };

  const formatPrice = (price: string) => {
    return `$${parseFloat(price).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const toggleRowExpansion = (productId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedRows(newExpanded);
  };

  const columns: ColumnDef<Product, any>[] = [
    {
      id: 'expand',
      header: '',
      size: 40,
      cell: ({ row }) => (
        <button
          onClick={() => toggleRowExpansion(row.original.id)}
          className="p-0.5 hover:bg-gray-100 rounded"
        >
          {expandedRows.has(row.original.id) ? (
            <ChevronDown className="w-3 h-3 text-gray-600" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-600" />
          )}
        </button>
      ),
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 hover:bg-gray-100 px-1 py-0.5 rounded text-xs font-medium"
        >
          Product
          {column.getIsSorted() === "asc" && <ChevronDown className="w-2.5 h-2.5" />}
          {column.getIsSorted() === "desc" && <ChevronUp className="w-2.5 h-2.5" />}
        </button>
      ),
      size: 200,
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <img
            src={row.original.images[0]?.url}
            // src={getMainImage(row.original)}
            alt={row.original.title}
            className="w-8 h-8 rounded object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder-image.png';
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-gray-900 truncate">
              {row.original.title}
            </div>
            <div className="text-xs text-gray-500">
              {row.original.handle}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'productType',
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 hover:bg-gray-100 px-1 py-0.5 rounded text-xs font-medium"
        >
          Category
          {column.getIsSorted() === "asc" && <ChevronDown className="w-2.5 h-2.5" />}
          {column.getIsSorted() === "desc" && <ChevronUp className="w-2.5 h-2.5" />}
        </button>
      ),
      size: 150,
      cell: ({ row }) => (
        <div className="text-xs">
          <div className="font-medium text-gray-900">
            {row.original.productType || 'Uncategorized'}
          </div>
          <div className="text-gray-500">
            {row.original.vendor}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'variants',
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 hover:bg-gray-100 px-1 py-0.5 rounded text-xs font-medium"
        >
          Variants
          {column.getIsSorted() === "asc" && <ChevronDown className="w-2.5 h-2.5" />}
          {column.getIsSorted() === "desc" && <ChevronUp className="w-2.5 h-2.5" />}
        </button>
      ),
      size: 80,
      cell: ({ row }) => (
        <div className="text-xs text-center">
          <div className="font-medium text-gray-900">
            {row.original.variants.length}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 hover:bg-gray-100 px-1 py-0.5 rounded text-xs font-medium"
        >
          Status
          {column.getIsSorted() === "asc" && <ChevronDown className="w-2.5 h-2.5" />}
          {column.getIsSorted() === "desc" && <ChevronUp className="w-2.5 h-2.5" />}
        </button>
      ),
      size: 80,
      cell: ({ row }) => (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
          row.original.status === 'ACTIVE' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 hover:bg-gray-100 px-1 py-0.5 rounded text-xs font-medium"
        >
          Created
          {column.getIsSorted() === "asc" && <ChevronDown className="w-2.5 h-2.5" />}
          {column.getIsSorted() === "desc" && <ChevronUp className="w-2.5 h-2.5" />}
        </button>
      ),
      size: 100,
      cell: ({ row }) => (
        <div className="text-xs text-gray-900">
          {formatDate(row.original.createdAt)}
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: filteredProducts,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="ml-4 text-gray-600">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg mb-4">{error}</div>
        <button
          onClick={loadProducts}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Product Catalog</h1>
          
          {/* Controls */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products, vendors, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.name} value={category.name}>
                  {category.name} ({category.products.length})
                </option>
              ))}
            </select>
            
            <button
              onClick={loadProducts}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              Refresh
            </button>
          </div>
          
          <div className="text-lg text-gray-600">
            Total Products: {filteredProducts.length}
            {lastFetched && (
              <span className="ml-4 text-sm text-gray-500">
                Last updated: {new Date(lastFetched).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Table */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg shadow">
            <div className="text-gray-500 text-lg">No products found</div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th
                          key={header.id}
                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          style={{ width: header.getSize() }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {table.getRowModel().rows.map(row => (
                    <>
                      <tr key={row.id} className="hover:bg-gray-50">
                        {row.getVisibleCells().map(cell => (
                          <td
                            key={cell.id}
                            className="px-3 py-2 whitespace-nowrap"
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Expanded Row Details */}
                      {expandedRows.has(row.original.id) && (
                        <tr>
                          <td colSpan={columns.length} className="px-3 py-3 bg-gray-50">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* Product Details */}
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2 text-sm">
                                  <Eye className="w-3 h-3" />
                                  Product Details
                                </h4>
                                <div className="space-y-1 text-xs">
                                  <div><span className="font-medium">Description:</span> {row.original.description || 'No description'}</div>
                                  <div><span className="font-medium">Tags:</span> 
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {row.original.tags.map((tag, index) => (
                                        <span key={index} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div><span className="font-medium">Updated:</span> {formatDate(row.original.updatedAt)}</div>
                                  {row.original.publishedAt && (
                                    <div><span className="font-medium">Published:</span> {formatDate(row.original.publishedAt)}</div>
                                  )}
                                </div>
                              </div>

                              {/* Variants */}
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2 text-sm">
                                  <Package className="w-3 h-3" />
                                  Variants ({row.original.variants.length})
                                </h4>
                                <div className="space-y-1">
                                  {row.original.variants.map((variant, index) => (
                                    <div key={variant.id} className="p-2 bg-white rounded border text-xs">
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <div className="font-medium">{variant.title}</div>
                                          <div className="text-gray-600">
                                            SKU: {variant.sku || 'N/A'} | Stock: {variant.inventoryQuantity}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="font-medium">{formatPrice(variant.price)}</div>
                                          {variant.compareAtPrice && (
                                            <div className="text-red-500 line-through">
                                              {formatPrice(variant.compareAtPrice)}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Options */}
                              {row.original.options.length > 0 && (
                                <div className="lg:col-span-2">
                                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2 text-sm">
                                    <Tag className="w-3 h-3" />
                                    Product Options
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {row.original.options.map((option, index) => (
                                      <div key={option.id} className="p-2 bg-white rounded border text-xs">
                                        <div className="font-medium mb-1">{option.name}</div>
                                        <div className="text-gray-600">
                                          {option.values.slice(0, 5).join(', ')}
                                          {option.values.length > 5 && ` +${option.values.length - 5} more`}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Metafields */}
                              {row.original.metafields.length > 0 && (
                                <div className="lg:col-span-2">
                                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2 text-sm">
                                    <Calendar className="w-3 h-3" />
                                    Custom Fields
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {row.original.metafields.map((metafield, index) => (
                                      <div key={metafield.id} className="p-2 bg-white rounded border text-xs">
                                        <div className="font-medium mb-1">
                                          {metafield.namespace}.{metafield.key}
                                        </div>
                                        <div className="text-gray-600">
                                          {metafield.value}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductPage;
