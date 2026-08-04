import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../../../lib/useDebounce";
import { categoriesApi, productsApi, type CategoryResponse, type ProductResponse, type ProductSummary } from "../../../api/products";
import { Icon } from "../../../components/Icon";
import { Table, type Column } from "../../../components/ui/Table";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { useToast } from "../../../components/ui/Toast";
import { ProductFormModal } from "../components/ProductFormModal";
import { CategoryFormModal } from "../components/CategoryFormModal";

type Tab = "products" | "categories";

function formatINR(amount: number): string {
  return `₹ ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ProductsPage() {
  const [tab, setTab] = useState<Tab>("products");

  const { data: stats } = useQuery({ queryKey: ["products", "stats"], queryFn: productsApi.stats });

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-headline-lg text-on-surface">Products &amp; Inventory</h2>
          <p className="text-body-md text-on-surface-variant">Manage your catalog, stock levels, and HSN codes.</p>
        </div>
      </div>

      {/* Real stat cards only — the mockup shows a "+4% MoM" trend badge on
          Total Products and decorative avatar stack on Stock Value; neither
          has a backing field in ProductDTOs.StockStats, so both are omitted. */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-sm">
          <div className="w-10 h-10 bg-primary-container/10 text-primary rounded-lg flex items-center justify-center mb-3">
            <Icon name="inventory" />
          </div>
          <p className="text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Total Products</p>
          <h3 className="text-headline-lg font-tabular mt-1">{stats?.totalProducts ?? 0}</h3>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-sm">
          <div className="w-10 h-10 bg-tertiary/10 text-tertiary rounded-lg flex items-center justify-center mb-3">
            <Icon name="warning" />
          </div>
          <p className="text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Low Stock</p>
          <h3 className="text-headline-lg font-tabular mt-1">{stats?.lowStockCount ?? 0} <span className="text-body-md font-normal text-on-surface-variant">items</span></h3>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-sm">
          <div className="w-10 h-10 bg-error-container text-error rounded-lg flex items-center justify-center mb-3">
            <Icon name="error" />
          </div>
          <p className="text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Out of Stock</p>
          <h3 className="text-headline-lg font-tabular mt-1">{stats?.outOfStockCount ?? 0} <span className="text-body-md font-normal text-on-surface-variant">items</span></h3>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-sm">
          <div className="w-10 h-10 bg-secondary-container/20 text-secondary rounded-lg flex items-center justify-center mb-3">
            <Icon name="payments" />
          </div>
          <p className="text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Stock Value</p>
          <h3 className="text-headline-lg font-tabular mt-1">{formatINR(stats?.totalStockValue ?? 0)}</h3>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b border-outline-variant px-6">
          <button
            onClick={() => setTab("products")}
            className={`px-6 py-4 font-bold flex items-center gap-2 transition-colors ${
              tab === "products" ? "text-primary border-b-2 border-primary" : "text-on-surface-variant"
            }`}
          >
            <Icon name="category" size={20} />
            Products
          </button>
          <button
            onClick={() => setTab("categories")}
            className={`px-6 py-4 font-medium transition-colors ${
              tab === "categories" ? "text-primary border-b-2 border-primary font-bold" : "text-on-surface-variant"
            }`}
          >
            Categories
          </button>
        </div>

        {tab === "products" ? <ProductsTab /> : <CategoriesTab />}
      </div>
    </div>
  );
}

function ProductsTab() {
  const { show } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [categoryId, setCategoryId] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProductResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductSummary | null>(null);

  const { data: categories } = useQuery({ queryKey: ["product-categories"], queryFn: categoriesApi.list });
  const { data, isLoading } = useQuery({
    queryKey: ["products", debouncedSearch, categoryId, page],
    queryFn: () => productsApi.list(debouncedSearch, categoryId, page, 10),
  });

  // Client-side — GET /api/products has no isLowStock query param
  const rows = useMemo(
    () => (lowStockOnly ? (data?.content ?? []).filter((p) => p.lowStock) : data?.content ?? []),
    [data, lowStockOnly]
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      show("Product deleted", "success");
      setDeleteTarget(null);
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  async function openEdit(summary: ProductSummary) {
    const full = await productsApi.getById(summary.id);
    setEditTarget(full);
    setFormOpen(true);
  }

  const columns: Column<ProductSummary>[] = [
    {
      header: "Product Name",
      cell: (p) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-variant flex items-center justify-center text-on-surface-variant flex-shrink-0">
            <Icon name="inventory_2" size={20} />
          </div>
          <p className="text-body-lg font-semibold text-on-surface">{p.name}</p>
        </div>
      ),
    },
    {
      header: "SKU / HSN",
      cell: (p) => (
        <div>
          <p className="font-mono text-numeric-table">{p.sku || "—"}</p>
          <p className="text-label-md text-outline">{p.hsnCode ? `HSN: ${p.hsnCode}` : ""}</p>
        </div>
      ),
    },
    { header: "Unit", cell: (p) => p.unit || "—" },
    { header: "Sale Price", align: "right", cell: (p) => <span className="font-mono">{formatINR(p.salePrice)}</span> },
    {
      header: "Tax Rate",
      align: "center",
      cell: (p) => <span className="px-2 py-1 bg-surface-container-high rounded text-label-md font-medium">{p.taxRate ?? 0}%</span>,
    },
    {
      header: "Stock Status",
      cell: (p) => {
        const toneClasses = p.outOfStock
          ? { dot: "bg-error", text: "text-error" }
          : p.lowStock
          ? { dot: "bg-tertiary", text: "text-tertiary" }
          : { dot: "bg-secondary", text: "text-secondary" };
        return (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${toneClasses.dot}`} />
            <span className={`text-body-md font-medium ${toneClasses.text}`}>{p.currentStock} {p.unit}</span>
            {p.outOfStock && <span className="text-[10px] bg-error-container text-error px-1 rounded font-bold uppercase">Critical</span>}
            {!p.outOfStock && p.lowStock && <span className="text-[10px] bg-tertiary/20 text-tertiary px-1 rounded font-bold uppercase">Low</span>}
          </div>
        );
      },
    },
    {
      header: "Actions",
      align: "center",
      cell: (p) => (
        <div className="flex items-center justify-center gap-1">
          <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-primary-container/10 text-primary rounded-lg transition-colors" aria-label={`Edit ${p.name}`}>
            <Icon name="edit" size={20} />
          </button>
          <button onClick={() => setDeleteTarget(p)} className="p-1.5 hover:bg-error-container text-error rounded-lg transition-colors" aria-label={`Delete ${p.name}`}>
            <Icon name="delete" size={20} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="p-6 bg-surface-container-low/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-[300px]">
          <div className="relative flex-1 max-w-sm">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full bg-white border border-outline-variant rounded-lg pl-10 pr-4 py-2.5 text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="Search by name, SKU or HSN..."
            />
          </div>
          <select
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPage(0); }}
            className="bg-white border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          >
            <option value="">All Categories</option>
            {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button
          onClick={() => setLowStockOnly((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all ${
            lowStockOnly ? "bg-primary text-on-primary" : "border-2 border-primary/30 text-primary bg-white hover:bg-primary/5"
          }`}
        >
          <Icon name="filter_list" />
          Low Stock Only
        </button>
        <button
          onClick={() => { setEditTarget(null); setFormOpen(true); }}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-semibold shadow-sm hover:shadow-md active:scale-95 transition-all"
        >
          <Icon name="add_box" />
          Add Product
        </button>
      </div>

      <Table
        columns={columns}
        rows={rows}
        keyOf={(p) => p.id}
        isLoading={isLoading}
        emptyMessage="No products found. Try adjusting your filters or search terms."
        page={page}
        totalPages={data?.totalPages ?? 0}
        totalElements={data?.totalElements}
        onPageChange={setPage}
        entityLabel="items"
      />

      <ProductFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} product={editTarget} />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete this product?"
        description={`${deleteTarget?.name} will be permanently removed. This can't be undone.`}
        confirmLabel="Delete"
        tone="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

function CategoriesTab() {
  const { show } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryResponse | null>(null);

  const { data: categories, isLoading } = useQuery({ queryKey: ["product-categories"], queryFn: categoriesApi.list });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      show("Category deleted", "success");
      setDeleteTarget(null);
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  // Mirrors the backend list — no pagination on GET /api/product-categories
  const columns: Column<CategoryResponse>[] = [
    {
      header: "Category Name",
      cell: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-primary/10 text-primary flex items-center justify-center">
            <Icon name="sell" />
          </div>
          <span className="text-body-lg font-semibold">{c.name}</span>
        </div>
      ),
    },
    {
      header: "Description",
      cell: (c) => <span className="text-on-surface-variant truncate max-w-xs block">{c.description || "—"}</span>,
    },
    {
      header: "Actions",
      align: "right",
      cell: (c) => (
        <button
          onClick={() => setDeleteTarget(c)}
          className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-full transition-all active:scale-90"
          aria-label={`Delete ${c.name}`}
        >
          <Icon name="delete" size={20} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="p-6 bg-surface-container-low/50 flex items-center justify-between">
        <p className="text-body-md text-on-surface-variant">
          <span className="font-bold text-on-surface">{categories?.length ?? 0}</span> total categories
        </p>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary font-semibold rounded-lg shadow-sm hover:brightness-110 active:scale-95 transition-all"
        >
          <Icon name="add_circle" />
          Add Category
        </button>
      </div>

      <Table
        columns={columns}
        rows={categories ?? []}
        keyOf={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="No categories yet — group your products for better organization."
      />

      <CategoryFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete this category?"
        description={`Products in "${deleteTarget?.name}" will become uncategorized — not deleted themselves.`}
        confirmLabel="Delete"
        tone="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}