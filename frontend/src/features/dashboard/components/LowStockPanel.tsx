import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { productsApi } from "../../../api/products";
import { Icon } from "../../../components/Icon";

export function LowStockPanel() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["products", "low-stock"], queryFn: productsApi.lowStock });

  const rows = (data ?? []).slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center">
        <h4 className="flex items-center gap-2 text-headline-md text-on-surface">
          <Icon name="inventory_2" className="text-tertiary" />
          Low Stock Alerts
        </h4>
        <Link to="/products" className="text-primary font-bold text-label-md hover:underline">View all</Link>
      </div>
      {isLoading ? (
        <p className="px-6 py-8 text-body-md text-on-surface-variant">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="px-6 py-8 text-body-md text-on-surface-variant">Everything is stocked above its threshold.</p>
      ) : (
        <div className="p-4 space-y-3">
          {rows.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate("/products")}
              className="flex items-center justify-between p-3 border border-outline-variant rounded-lg cursor-pointer hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-surface-variant flex items-center justify-center flex-shrink-0">
                  <Icon name="inventory_2" size={20} className="text-on-surface-variant" />
                </div>
                <div className="min-w-0">
                  <p className="text-body-md font-bold text-on-surface truncate">{p.name}</p>
                  <p className="text-label-md text-on-surface-variant">{p.sku ? `SKU: ${p.sku}` : "—"}</p>
                </div>
              </div>
              <span className={`text-body-md font-bold flex-shrink-0 ${p.outOfStock ? "text-error" : "text-tertiary"}`}>
                {p.currentStock} {p.unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}