import { useState, useEffect } from "react";
import { apiRequest } from "../services/api";
import { ClipboardList, Plus, Loader2, Search, X, ShoppingCart } from "lucide-react";

interface OrderItem {
  item_id: number;
  color_id: number;
  color_name: string;
  business_code: string;
  pack_size_kg: number;
  quantity: number;
}

interface ClientOrder {
  id: number;
  client_name: string;
  status: string;
  notes: string;
  created_at: string;
  logged_by: string;
  items: OrderItem[];
}

interface InventoryItem {
  color_id: number;
  color_name: string;
  business_code: string;
  series: string;
  packs: { pack_size_kg: number; quantity_units: number }[];
}

export default function Orders() {
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New Order Form State
  const [clientName, setClientName] = useState("");
  const [notes, setNotes] = useState("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [newOrderItems, setNewOrderItems] = useState<{ colorId: number, packSizeKg: number, quantity: number }[]>([]);
  
  // Temporary selections
  const [selectedColorId, setSelectedColorId] = useState<number | "">("");
  const [selectedPackSize, setSelectedPackSize] = useState<number | "">("");
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    fetchOrders();
    fetchInventory();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<ClientOrder[]>("/sales/orders");
      setOrders(res);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await apiRequest<{ data: InventoryItem[] }>("/inventory/finished-stock");
      setInventory(res.data);
    } catch (err) {
      console.error("Failed to fetch inventory for products", err);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || newOrderItems.length === 0) return;

    setIsSubmitting(true);
    try {
      await apiRequest("/sales/orders", {
        method: "POST",
        body: {
          clientName,
          notes,
          items: newOrderItems
        }
      });
      setIsModalOpen(false);
      setClientName("");
      setNotes("");
      setNewOrderItems([]);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || "Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProduct = inventory.find(i => i.color_id === Number(selectedColorId));

  const handleAddItem = () => {
    if (!selectedColorId || !selectedPackSize || quantity <= 0) return;
    
    // Check if item already exists
    const existingIndex = newOrderItems.findIndex(i => i.colorId === Number(selectedColorId) && i.packSizeKg === Number(selectedPackSize));
    if (existingIndex >= 0) {
      const updated = [...newOrderItems];
      updated[existingIndex].quantity += quantity;
      setNewOrderItems(updated);
    } else {
      setNewOrderItems([...newOrderItems, { colorId: Number(selectedColorId), packSizeKg: Number(selectedPackSize), quantity }]);
    }
    
    // Reset selections
    setSelectedColorId("");
    setSelectedPackSize("");
    setQuantity(1);
  };

  const handleRemoveItem = (index: number) => {
    setNewOrderItems(newOrderItems.filter((_, i) => i !== index));
  };

  const filtered = orders.filter(o => 
    o.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.notes && o.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-slate-900">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
              <ClipboardList className="h-6 w-6 text-white" />
            </div>
            Client Orders
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Manage and view all incoming customer orders.</p>
        </div>
        <div>
           <button 
             onClick={() => setIsModalOpen(true)}
             className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl font-bold uppercase tracking-widest text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
           >
             <Plus className="w-5 h-5" /> New Order
           </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col items-stretch">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search clients or notes..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{filtered.length} orders</p>
        </div>

        <div className="overflow-x-auto p-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
          {isLoading ? (
            <div className="col-span-full py-12 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-3" />
                <p className="text-xs font-bold uppercase tracking-widest">Loading orders...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400">
                <ClipboardList className="w-10 h-10 mx-auto text-slate-200 mb-3" />
                <p className="text-sm font-bold">No orders found</p>
            </div>
          ) : (
            filtered.map((o) => (
              <div key={o.id} className="border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden flex flex-col h-full group">
                 <div className="p-5 border-b border-slate-50 flex items-start justify-between bg-slate-50/50 group-hover:bg-blue-50/30 transition-colors">
                    <div>
                      <h3 className="font-black text-lg text-slate-900 leading-tight">{o.client_name}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        Order #{o.id} • {new Date(o.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                      o.status === 'pending' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                      o.status === 'fulfilled' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {o.status}
                    </span>
                 </div>
                 
                 <div className="p-5 flex-1 flex flex-col gap-4">
                    {o.notes && (
                      <p className="text-sm text-slate-600 italic bg-blue-50/30 p-3 rounded-lg border border-blue-100/50">
                        "{o.notes}"
                      </p>
                    )}
                    
                    <div className="space-y-2 mt-auto">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order Items</p>
                      <div className="space-y-1.5">
                        {o.items.map(item => (
                          <div key={item.item_id} className="flex items-center justify-between text-sm py-1 border-b border-slate-50 last:border-0">
                             <div className="flex flex-col">
                               <span className="font-bold text-slate-800">{item.color_name}</span>
                               <span className="text-[10px] uppercase font-bold text-slate-400">{item.business_code}</span>
                             </div>
                             <div className="flex items-center gap-4 text-right">
                               <span className="text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded text-[11px]">{item.pack_size_kg}kg</span>
                               <span className="font-black text-slate-900 px-2 py-0.5 bg-blue-50 text-blue-800 rounded">{item.quantity}x</span>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                 </div>
                 
                 <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 text-[10px] font-bold text-slate-400 flex items-center justify-between uppercase tracking-widest">
                    <span>Logged by: {o.logged_by || 'System'}</span>
                    <span>{o.items.length} unique items</span>
                 </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 duration-300 border border-slate-200">
             
             <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                   <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                     <ClipboardList className="w-5 h-5 text-blue-600" />
                     Create Client Order
                   </h2>
                   <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Record a new incoming sales order</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
             </div>

             <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                <form id="order-form" onSubmit={handleCreateOrder} className="space-y-6">
                  
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Client Name *</label>
                       <input 
                         type="text" 
                         required
                         value={clientName}
                         onChange={(e) => setClientName(e.target.value)}
                         placeholder="e.g. Acme Corp"
                         className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm outline-none"
                       />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Order Notes</label>
                       <input 
                         type="text" 
                         value={notes}
                         onChange={(e) => setNotes(e.target.value)}
                         placeholder="Optional details, delivery instructions..."
                         className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm outline-none"
                       />
                     </div>
                  </div>

                  {/* Add Item Section */}
                  <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 shadow-inner">
                     <h3 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <ShoppingCart className="w-4 h-4" /> Add Products to Order
                     </h3>
                     
                     <div className="flex flex-col md:flex-row gap-3 items-end">
                        <div className="w-full md:flex-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Product</label>
                          <select
                            value={selectedColorId}
                            onChange={(e) => {
                              setSelectedColorId(e.target.value ? Number(e.target.value) : "");
                              setSelectedPackSize("");
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                          >
                            <option value="">-- Select Product --</option>
                            {inventory.map(i => (
                              <option key={i.color_id} value={i.color_id}>{i.color_name} ({i.business_code})</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="w-full md:w-32">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Pack Size</label>
                          <select
                            value={selectedPackSize}
                            onChange={(e) => setSelectedPackSize(e.target.value ? Number(e.target.value) : "")}
                            disabled={!selectedColorId}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none disabled:opacity-50"
                          >
                            <option value="">-- Size --</option>
                            {selectedProduct?.packs.map(p => (
                              <option key={p.pack_size_kg} value={p.pack_size_kg}>{p.pack_size_kg}kg</option>
                            ))}
                            {/* Allow custom pack sizes by adding some common defaults if no packs exist yet */}
                            {(!selectedProduct?.packs || selectedProduct.packs.length === 0) && selectedColorId && (
                               <>
                                <option value="1">1kg</option>
                                <option value="5">5kg</option>
                                <option value="20">20kg</option>
                               </>
                            )}
                          </select>
                        </div>

                        <div className="w-full md:w-24">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Qty</label>
                          <input
                             type="number"
                             min="1"
                             value={quantity}
                             onChange={(e) => setQuantity(Number(e.target.value))}
                             className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleAddItem}
                          disabled={!selectedColorId || !selectedPackSize || quantity <= 0}
                          className="w-full md:w-auto px-4 py-2 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-lg disabled:opacity-50 hover:bg-slate-800 transition-colors shadow-md h-[38px]"
                        >
                          Add
                        </button>
                     </div>
                  </div>

                  {/* Added Items List */}
                  {newOrderItems.length > 0 && (
                    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                       <table className="w-full text-sm text-left bg-white">
                         <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                           <tr>
                             <th className="px-4 py-2">Product</th>
                             <th className="px-4 py-2">Size</th>
                             <th className="px-4 py-2 text-center">Qty</th>
                             <th className="px-4 py-2"></th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50">
                           {newOrderItems.map((item, idx) => {
                             const color = inventory.find(i => i.color_id === item.colorId);
                             return (
                               <tr key={idx} className="hover:bg-slate-50/50">
                                 <td className="px-4 py-3 font-bold text-slate-800">{color?.color_name}</td>
                                 <td className="px-4 py-3 font-medium text-slate-600">{item.packSizeKg}kg</td>
                                 <td className="px-4 py-3 text-center text-blue-700 font-black">
                                   <span className="bg-blue-50 px-2 py-0.5 rounded">{item.quantity}</span>
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                   <button 
                                     type="button"
                                     onClick={() => handleRemoveItem(idx)}
                                     className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                                   >
                                     Remove
                                   </button>
                                 </td>
                               </tr>
                             );
                           })}
                         </tbody>
                       </table>
                    </div>
                  )}

                </form>
             </div>

             <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-500 uppercase tracking-widest hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="order-form"
                  disabled={isSubmitting || newOrderItems.length === 0 || !clientName}
                  className="inline-flex items-center px-6 py-2.5 text-sm font-black bg-blue-600 shadow-lg shadow-blue-200 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 uppercase tracking-widest active:scale-95"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Order
                </button>
             </div>

           </div>
        </div>
      )}
    </div>
  );
}
