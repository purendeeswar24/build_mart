import { FormEvent, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost, apiUploadImage } from '../api';

type ListingStatus = 'on_sale' | 'limited' | 'out_of_stock' | 'hidden';

type ProductRow = {
  sku: string;
  name: string;
  brand: string;
  stock: number;
  product_id: string;
  variant_id: string;
  category_name: string;
  mrp: number | string;
  selling_price: number | string;
  variant_label: string;
  listing_status: ListingStatus;
  image_url: string | null;
};

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
};

const STATUS_LABEL: Record<ListingStatus, string> = {
  on_sale: 'On sale',
  limited: 'Limited stock',
  out_of_stock: 'No stock',
  hidden: 'Hidden / not for sale',
};

const emptyForm = {
  categoryId: '',
  brand: '',
  title: '',
  description: '',
  variantLabel: 'Standard',
  mrp: '',
  sellingPrice: '',
  stockQty: '10',
  listingStatus: 'on_sale' as ListingStatus,
  imageUrl: '',
  sku: '',
};

export function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [source, setSource] = useState('Loading inventory…');
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const pickImage = (file: File | null) => {
    if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setImageFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : '');
  };

  const load = async () => {
    const [prod, cats] = await Promise.all([
      apiGet<{ products: ProductRow[] }>('/api/v1/admin/products'),
      apiGet<{ categories: Category[] }>('/api/v1/admin/categories'),
    ]);
    setProducts(prod.products ?? []);
    setCategories(cats.categories ?? []);
    setSource('Live catalog — add, hide, delete, or change selling price. Shop picks up the new price on the next page load.');
  };

  useEffect(() => {
    load().catch(() => setSource('API offline — start the backend on port 4000'));
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setOk('');
    setSaving(true);
    try {
      let imageUrl = form.imageUrl.trim();
      if (imageFile) {
        const uploaded = await apiUploadImage(imageFile);
        imageUrl = uploaded.url;
      }
      await apiPost('/api/v1/admin/products', {
        categoryId: form.categoryId,
        brand: form.brand,
        title: form.title,
        description: form.description,
        variantLabel: form.variantLabel,
        mrp: Number(form.mrp),
        sellingPrice: Number(form.sellingPrice),
        stockQty: Number(form.stockQty),
        listingStatus: form.listingStatus,
        imageUrl: imageUrl || undefined,
        sku: form.sku || undefined,
      });
      pickImage(null);
      setForm({ ...emptyForm, categoryId: form.categoryId });
      setOk('Product added. It will show on the shop if status is On sale or Limited.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add product');
    } finally {
      setSaving(false);
    }
  };

  const savePrices = async (row: ProductRow, mrp: number, sellingPrice: number) => {
    if (!(mrp > 0) || !(sellingPrice > 0)) throw new Error('Enter both MRP and selling price.');
    if (sellingPrice > mrp) throw new Error('Selling price cannot be higher than MRP.');
    await apiPatch(`/api/v1/admin/products/${row.product_id}`, {
      variantId: row.variant_id,
      mrp,
      sellingPrice,
    });
    setOk('Price updated. Shop home and product pages pick this up on the next load.');
    await load();
  };

  const changeStatus = async (row: ProductRow, listingStatus: ListingStatus) => {
    await apiPatch(`/api/v1/admin/products/${row.product_id}`, {
      variantId: row.variant_id,
      listingStatus,
      stockQty: listingStatus === 'out_of_stock' ? 0 : Number(row.stock),
    });
    await load();
  };

  const remove = async (row: ProductRow) => {
    if (!confirm(`Delete “${row.name}”? It will disappear from the shop.`)) return;
    await apiDelete(`/api/v1/admin/products/${row.product_id}`);
    await load();
  };

  return (
    <div>
      <h1>Products</h1>
      <p className="lede">{source}</p>

      <form className="card form" onSubmit={onSubmit}>
        <h2>Add a material</h2>
        <div className="form-grid">
          <label>
            Category
            <select
              required
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent_id ? '— ' : ''}
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Brand
            <input
              required
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              placeholder="e.g. ULTRATECH"
            />
          </label>
          <label className="span-2">
            Product name
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. PPC Cement 50kg"
            />
          </label>
          <label className="span-2">
            Description
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short details for the product page"
            />
          </label>
          <label>
            Size / variant
            <input
              required
              value={form.variantLabel}
              onChange={(e) => setForm({ ...form, variantLabel: e.target.value })}
              placeholder="50kg, 10L, 1 inch"
            />
          </label>
          <label>
            SKU (optional)
            <input
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="Auto if left blank"
            />
          </label>
          <label>
            MRP (₹)
            <input
              required
              type="number"
              min={1}
              step="0.01"
              value={form.mrp}
              onChange={(e) => setForm({ ...form, mrp: e.target.value })}
            />
          </label>
          <label>
            Selling / discount price (₹)
            <input
              required
              type="number"
              min={1}
              step="0.01"
              value={form.sellingPrice}
              onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
            />
          </label>
          <label>
            Stock quantity
            <input
              required
              type="number"
              min={0}
              value={form.stockQty}
              onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
            />
          </label>
          <label>
            Sale status
            <select
              value={form.listingStatus}
              onChange={(e) => setForm({ ...form, listingStatus: e.target.value as ListingStatus })}
            >
              <option value="on_sale">On sale</option>
              <option value="limited">Limited stock</option>
              <option value="out_of_stock">No stock</option>
              <option value="hidden">Hidden / not for sale</option>
            </select>
          </label>
          <div className="span-2 image-field">
            <span className="image-field-label">Product photo</span>
            <div className="image-picker">
              <div className="image-preview-wrap">
                {previewUrl || form.imageUrl ? (
                  <img
                    className="image-preview"
                    src={previewUrl || form.imageUrl}
                    alt="Product preview"
                  />
                ) : (
                  <div className="image-preview placeholder">No photo</div>
                )}
              </div>
              <div className="image-picker-controls">
                <label className="file-btn">
                  Choose from computer
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => pickImage(e.target.files?.[0] ?? null)}
                  />
                </label>
                {imageFile ? (
                  <p className="muted">
                    {imageFile.name} · {(imageFile.size / 1024).toFixed(0)} KB
                  </p>
                ) : (
                  <p className="muted">JPG, PNG, WEBP or GIF · up to 5 MB</p>
                )}
                <label>
                  Or paste an image link
                  <input
                    type="text"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="https://… (optional if you uploaded a file)"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        {ok ? <p className="form-ok">{ok}</p> : null}
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Add to catalog'}
        </button>
      </form>

      <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Category</th>
            <th>MRP</th>
            <th>Selling price</th>
            <th>Stock</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr
              key={`${p.product_id}-${p.variant_id}`}
              className={Number(p.stock) < 10 || p.listing_status === 'out_of_stock' ? 'warn' : undefined}
            >
              <td>
                <div className="item-cell">
                  {p.image_url ? (
                    <img className="table-thumb" src={p.image_url} alt="" />
                  ) : (
                    <div className="table-thumb placeholder" />
                  )}
                  <div>
                    <strong>{p.name}</strong>
                    <div className="muted">
                      {p.brand} · {p.variant_label} · {p.sku}
                    </div>
                  </div>
                </div>
              </td>
              <td>{p.category_name}</td>
              <td>
                <PriceField
                  value={p.mrp}
                  ariaLabel={`MRP for ${p.name}`}
                  onSave={(mrp) => savePrices(p, mrp, Number(p.selling_price))}
                />
              </td>
              <td>
                <PriceField
                  value={p.selling_price}
                  ariaLabel={`Selling price for ${p.name}`}
                  onSave={(selling) => savePrices(p, Number(p.mrp), selling)}
                />
              </td>
              <td>{p.stock}</td>
              <td>
                <select
                  value={p.listing_status}
                  onChange={(e) => changeStatus(p, e.target.value as ListingStatus)}
                >
                  {(Object.keys(STATUS_LABEL) as ListingStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button className="btn-danger" type="button" onClick={() => remove(p)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function PriceField({
  value,
  ariaLabel,
  onSave,
}: {
  value: number | string;
  ariaLabel: string;
  onSave: (next: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState(String(value));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = async () => {
    const next = Number(draft);
    if (next === Number(value) || Number.isNaN(next)) return;
    setBusy(true);
    try {
      await onSave(next);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not save price');
      setDraft(String(value));
    } finally {
      setBusy(false);
    }
  };

  return (
    <input
      className="price-input"
      aria-label={ariaLabel}
      type="number"
      min={1}
      step="0.01"
      disabled={busy}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          void commit();
        }
      }}
    />
  );
}
