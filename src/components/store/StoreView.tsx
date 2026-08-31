import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Package, Truck, ShoppingCart, BarChart3, Loader2, ClipboardList, Receipt } from 'lucide-react';
import { useStore } from '@/hooks/useStore';
import { useProductVariations } from '@/hooks/useProductVariations';
import { Profile } from '@/types/database';
import { ProductsTab } from './ProductsTab';
import { ShippingTab } from './ShippingTab';
import { SalesTab } from './SalesTab';
import { PurchasesTab } from './PurchasesTab';
import { FinancialDashboard } from './FinancialDashboard';
import { InventoryReport } from './InventoryReport';
import { ProductInvoiceModal } from './ProductInvoiceModal';
import { ProductDetailModal } from './ProductDetailModal';
import { PurchaseModal } from './PurchaseModal';
import { EditPurchaseModal } from './EditPurchaseModal';
import { ShippingModal } from './ShippingModal';
import { SaleModal } from './SaleModal';
import { VariationModal } from './VariationModal';
import { StoreProduct, StoreShippingCost, StoreSale, StorePurchase, ProductWithDetails, StoreProductVariation } from '@/types/store';

interface StoreViewProps {
  profile: Profile;
}

export function StoreView({ profile }: StoreViewProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productDetailOpen, setProductDetailOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [editPurchaseModalOpen, setEditPurchaseModalOpen] = useState(false);
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [variationModalOpen, setVariationModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithDetails | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<StorePurchase | null>(null);
  const [editingShipping, setEditingShipping] = useState<StoreShippingCost | null>(null);
  const [editingSale, setEditingSale] = useState<StoreSale | null>(null);
  const [editingVariation, setEditingVariation] = useState<StoreProductVariation | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const store = useStore(profile.id);
  const variationsHook = useProductVariations(profile.id);

  const handleNewProduct = () => {
    setEditingProduct(null);
    setProductModalOpen(true);
  };

  const handleEditProduct = (product: StoreProduct) => {
    setEditingProduct(product);
    setProductModalOpen(true);
  };

  const handleNewShipping = (productId?: string) => {
    setEditingShipping(null);
    setSelectedProductId(productId || null);
    setShippingModalOpen(true);
  };

  const handleViewProductDetail = (product: ProductWithDetails) => {
    setSelectedProduct(product);
    setProductDetailOpen(true);
  };

  const handleNewPurchase = (productId?: string) => {
    setSelectedProductId(productId || null);
    setPurchaseModalOpen(true);
  };

  const handleEditPurchase = (purchase: StorePurchase) => {
    setEditingPurchase(purchase);
    setEditPurchaseModalOpen(true);
  };

  const handleEditShipping = (shipping: StoreShippingCost) => {
    setEditingShipping(shipping);
    setSelectedProductId(shipping.product_id);
    setShippingModalOpen(true);
  };

  const handleNewSale = (productId?: string) => {
    setEditingSale(null);
    setSelectedProductId(productId || null);
    setSaleModalOpen(true);
  };

  const handleEditSale = (sale: StoreSale) => {
    setEditingSale(sale);
    setSelectedProductId(sale.product_id);
    setSaleModalOpen(true);
  };

  const handleAddVariation = (productId: string) => {
    setEditingVariation(null);
    setSelectedProductId(productId);
    setVariationModalOpen(true);
  };

  const handleEditVariation = (variation: StoreProductVariation) => {
    setEditingVariation(variation);
    setSelectedProductId(variation.product_id);
    setVariationModalOpen(true);
  };

  if (store.loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border p-4 sm:p-6 bg-background">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              🛒 Gestión de Tienda
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Administra tus productos, envíos y ventas
            </p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'products' && (
              <Button onClick={handleNewProduct} size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" /> Producto
              </Button>
            )}
            {activeTab === 'purchases' && (
              <Button onClick={() => handleNewPurchase()} size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" /> Compra
              </Button>
            )}
            {activeTab === 'shipping' && (
              <Button onClick={() => handleNewShipping()} size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" /> Envío
              </Button>
            )}
            {activeTab === 'sales' && (
              <Button onClick={() => handleNewSale()} size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" /> Venta
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="shrink-0 border-b border-border px-4 sm:px-6 bg-muted/30">
          <TabsList className="h-12 w-full justify-start gap-1 bg-transparent p-0">
            <TabsTrigger
              value="dashboard"
              className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Resumen</span>
            </TabsTrigger>
            <TabsTrigger
              value="inventory"
              className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Inventario</span>
            </TabsTrigger>
            <TabsTrigger
              value="products"
              className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Productos</span>
            </TabsTrigger>
            <TabsTrigger
              value="purchases"
              className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              <Receipt className="w-4 h-4" />
              <span className="hidden sm:inline">Compras</span>
            </TabsTrigger>
            <TabsTrigger
              value="shipping"
              className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              <Truck className="w-4 h-4" />
              <span className="hidden sm:inline">Envíos</span>
            </TabsTrigger>
            <TabsTrigger
              value="sales"
              className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Ventas</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <TabsContent value="dashboard" className="m-0 h-full">
            <FinancialDashboard
              summary={store.financialSummary}
              products={store.productsWithDetails}
              sales={store.sales}
            />
          </TabsContent>

          <TabsContent value="inventory" className="m-0 h-full">
            <InventoryReport
              products={store.productsWithDetails}
              currency={store.financialSummary.currency}
            />
          </TabsContent>

          <TabsContent value="products" className="m-0 h-full">
            <ProductsTab
              products={store.productsWithDetails}
              onEdit={handleEditProduct}
              onDelete={store.deleteProduct}
              onViewDetail={handleViewProductDetail}
              onNewPurchase={handleNewPurchase}
              onNewShipping={handleNewShipping}
              onNewSale={handleNewSale}
            />
          </TabsContent>

          <TabsContent value="purchases" className="m-0 h-full">
            <PurchasesTab
              purchases={store.purchases}
              products={store.products}
              onEdit={handleEditPurchase}
              onDelete={store.deletePurchase}
            />
          </TabsContent>

          <TabsContent value="shipping" className="m-0 h-full">
            <ShippingTab
              shippingCosts={store.shippingCosts}
              products={store.products}
              onEdit={handleEditShipping}
              onDelete={store.deleteShippingCost}
            />
          </TabsContent>

          <TabsContent value="sales" className="m-0 h-full">
            <SalesTab
              sales={store.sales}
              products={store.products}
              onEdit={handleEditSale}
              onDelete={store.deleteSale}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Modals */}
      <ProductInvoiceModal
        open={productModalOpen}
        onOpenChange={setProductModalOpen}
        product={editingProduct}
        existingShippingCosts={store.shippingCosts}
        onCreate={store.createProduct}
        onUpdate={store.updateProduct}
        onCreateShipping={store.createShippingCost}
        onUpdateShipping={store.updateShippingCost}
        onDeleteShipping={store.deleteShippingCost}
      />

      <ProductDetailModal
        open={productDetailOpen}
        onOpenChange={(open) => {
          setProductDetailOpen(open);
          if (!open) {
            // Refresh the selected product data when modal closes
            if (selectedProduct) {
              const updated = store.productsWithDetails.find(p => p.id === selectedProduct.id);
              if (updated) setSelectedProduct(updated);
            }
          }
        }}
        product={selectedProduct}
        variations={selectedProduct ? variationsHook.getVariationsForProduct(selectedProduct.id) : []}
        onAddPurchase={(productId) => {
          handleNewPurchase(productId);
        }}
        onEditPurchase={handleEditPurchase}
        onDeletePurchase={store.deletePurchase}
        onAddVariation={handleAddVariation}
        onEditVariation={handleEditVariation}
        onDeleteVariation={variationsHook.deleteVariation}
      />

      <PurchaseModal
        open={purchaseModalOpen}
        onOpenChange={(open) => {
          setPurchaseModalOpen(open);
          // Refresh product detail if it's open
          if (!open && productDetailOpen && selectedProduct) {
            setTimeout(() => {
              const updated = store.productsWithDetails.find(p => p.id === selectedProduct.id);
              if (updated) setSelectedProduct(updated);
            }, 100);
          }
        }}
        products={store.products}
        variations={variationsHook.variations}
        selectedProductId={selectedProductId}
        onCreate={store.createPurchase}
      />

      <EditPurchaseModal
        open={editPurchaseModalOpen}
        onOpenChange={(open) => {
          setEditPurchaseModalOpen(open);
          if (!open) setEditingPurchase(null);
          // Refresh product detail if it's open
          if (!open && productDetailOpen && selectedProduct) {
            setTimeout(() => {
              const updated = store.productsWithDetails.find(p => p.id === selectedProduct.id);
              if (updated) setSelectedProduct(updated);
            }, 100);
          }
        }}
        purchase={editingPurchase}
        onUpdate={store.updatePurchase}
      />

      <ShippingModal
        open={shippingModalOpen}
        onOpenChange={setShippingModalOpen}
        shipping={editingShipping}
        products={store.products}
        selectedProductId={selectedProductId}
        onCreate={store.createShippingCost}
        onUpdate={store.updateShippingCost}
      />

      <SaleModal
        open={saleModalOpen}
        onOpenChange={setSaleModalOpen}
        sale={editingSale}
        products={store.products}
        variations={variationsHook.variations}
        selectedProductId={selectedProductId}
        onCreate={store.createSale}
        onUpdate={store.updateSale}
      />

      <VariationModal
        open={variationModalOpen}
        onOpenChange={(open) => {
          setVariationModalOpen(open);
          if (!open) setEditingVariation(null);
        }}
        productId={selectedProductId || ''}
        variation={editingVariation}
        onCreate={variationsHook.createVariation}
        onUpdate={variationsHook.updateVariation}
      />
    </div>
  );
}
