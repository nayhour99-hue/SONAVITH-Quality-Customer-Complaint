import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  getCustomers,
  getProducts,
  getDefectTypes,
  addCustomer,
  addProduct,
  addDefectType,
  addCustomersBulk,
  addProductsBulk,
  addDefectTypesBulk,
  deleteDefectType,
} from '../services/api';
import { Trash2, AlertTriangle, Package, Users } from 'lucide-react';

const getVal = (row, keys) => {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return String(row[k]).trim();
    }
  }
  const cleanKeys = keys.map(k => k.toLowerCase().replace(/[\s_-]/g, ''));
  for (const objKey of Object.keys(row)) {
    const cleanObjKey = objKey.toLowerCase().replace(/[\s_-]/g, '');
    if (cleanKeys.includes(cleanObjKey)) {
      const val = row[objKey];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val).trim();
      }
    }
  }
  return '';
};

export default function MasterlistView() {
  const [activeTab, setActiveTab] = useState('defect_types'); // 'defect_types', 'customers', 'products'
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [defectTypes, setDefectTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [form, setForm] = useState({
    id: '',
    name: '',
    location: '',
    contact: '',
    short_code: '',
    unit_of_measure: '',
    description: '',
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [c, p, d] = await Promise.all([
        getCustomers(),
        getProducts(),
        getDefectTypes().catch(() => []),
      ]);
      setCustomers(c);
      setProducts(p);
      setDefectTypes(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddSingle = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    
    if (activeTab === 'customers') {
      await addCustomer({ id: form.id, name: form.name, location: form.location, contact: form.contact });
      setSuccessMsg(`Customer "${form.name}" added successfully`);
    } else if (activeTab === 'products') {
      await addProduct({ id: form.id, name: form.name, short_code: form.short_code, unit_of_measure: form.unit_of_measure });
      setSuccessMsg(`Product "${form.name}" added successfully`);
    } else {
      await addDefectType({ id: form.id, name: form.name, description: form.description });
      setSuccessMsg(`Defect Type "${form.name}" registered`);
    }
    setTimeout(() => setSuccessMsg(''), 3000);
    setForm({ id: '', name: '', location: '', contact: '', short_code: '', unit_of_measure: '', description: '' });
    fetchData();
  };

  const handleDeleteDefect = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete defect type "${name}"?`)) return;
    try {
      await deleteDefectType(id);
      setSuccessMsg(`Defect type "${name}" removed.`);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      if (activeTab === 'customers') {
        const formatted = data.map(row => ({
          id: getVal(row, ['id', 'Id', 'ID', 'customer_id', 'customer id']),
          name: getVal(row, ['name', 'Name', 'NAME', 'customer_name', 'customer name', 'Customer Name', 'account']),
          location: getVal(row, ['location', 'Location', 'LOCATION', 'address', 'Address', 'customer_location']),
          contact: getVal(row, ['contact', 'Contact', 'CONTACT', 'phone', 'Phone', 'telephone', 'customer_contact'])
        })).filter(c => c.name);
        await addCustomersBulk(formatted);
      } else if (activeTab === 'products') {
        const formatted = data.map(row => ({
          id: getVal(row, ['id', 'Id', 'ID', 'product_id', 'product id']),
          name: getVal(row, ['name', 'Name', 'NAME', 'product_name', 'product name', 'Product Name', 'description', 'item']),
          short_code: getVal(row, ['short_code', 'ShortCode', 'shortCode', 'Short Code', 'short code', 'code', 'Code', 'CODE', 'product_short_code']),
          unit_of_measure: getVal(row, ['unit_of_measure', 'UnitOfMeasure', 'unitOfMeasure', 'Unit of Measure', 'unit of measure', 'uom', 'UOM', 'Unit', 'unit', 'packing', 'size'])
        })).filter(p => p.name);
        await addProductsBulk(formatted);
      } else {
        const formatted = data.map(row => ({
          id: getVal(row, ['id', 'Id', 'ID', 'defect_id', 'defect id']),
          name: getVal(row, ['name', 'Name', 'NAME', 'defect_type', 'defect type', 'Defect Type', 'defect']),
          description: getVal(row, ['description', 'Description', 'desc', 'Notes', 'notes'])
        })).filter(d => d.name);
        await addDefectTypesBulk(formatted);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchData();
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="card" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '1.35rem', color: 'var(--color-brand)' }}>Masterlist & Defect Type Registration</h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Manage core master data. Defect types registered here automatically populate dropdown lists for both Sales intake and QA confirmation.
          </p>
        </div>
      </div>

      {successMsg && (
        <div style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '10px 14px', borderRadius: 6, fontSize: '0.85rem', marginBottom: 16 }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px' }}>
        <button
          className={activeTab === 'defect_types' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('defect_types')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <AlertTriangle size={15} />
          <span>Defect Type Registration ({defectTypes.length})</span>
        </button>
        <button
          className={activeTab === 'customers' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('customers')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Users size={15} />
          <span>Customers ({customers.length})</span>
        </button>
        <button
          className={activeTab === 'products' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('products')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Package size={15} />
          <span>Products ({products.length})</span>
        </button>
      </div>

      <div style={{ display: 'flex', gap: '36px', flexWrap: 'wrap' }}>
        {/* Left side: Add form */}
        <div style={{ flex: '1 1 320px', maxWidth: '380px' }}>
          <div style={{ background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#1e293b' }}>
              Add {activeTab === 'defect_types' ? 'Defect Type' : activeTab === 'customers' ? 'Customer' : 'Product'}
            </h3>
            <form onSubmit={handleAddSingle} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="form-label">ID (Optional)</label>
                <input name="id" value={form.id} onChange={handleInputChange} className="form-input" placeholder="Auto-generated if empty" />
              </div>
              <div>
                <label className="form-label">{activeTab === 'defect_types' ? 'Defect Type Name*' : 'Name*'}</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  placeholder={activeTab === 'defect_types' ? 'e.g. Packaging leak, Curdling' : ''}
                />
              </div>

              {activeTab === 'defect_types' && (
                <div>
                  <label className="form-label">Description / Guidelines</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleInputChange}
                    className="form-textarea"
                    rows="3"
                    placeholder="Provide inspection guidelines or visual criteria for this defect type..."
                  ></textarea>
                </div>
              )}
              
              {activeTab === 'customers' && (
                <>
                  <div>
                    <label className="form-label">Location</label>
                    <input name="location" value={form.location} onChange={handleInputChange} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Contact</label>
                    <input name="contact" value={form.contact} onChange={handleInputChange} className="form-input" />
                  </div>
                </>
              )}

              {activeTab === 'products' && (
                <>
                  <div>
                    <label className="form-label">Short Code</label>
                    <input name="short_code" value={form.short_code} onChange={handleInputChange} className="form-input" placeholder="e.g. FFCM, FFAF" />
                  </div>
                  <div>
                    <label className="form-label">Unit of Measure (UOM)</label>
                    <input name="unit_of_measure" value={form.unit_of_measure} onChange={handleInputChange} className="form-input" placeholder="e.g. 2L-BTL, PACK" />
                  </div>
                </>
              )}
              
              <button type="submit" className="btn-primary" style={{ marginTop: 4 }}>
                {activeTab === 'defect_types' ? '+ Register Defect Type' : '+ Add Record'}
              </button>
            </form>

            <hr style={{ margin: '20px 0', borderColor: 'var(--color-border)' }} />

            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.88rem', color: '#475569' }}>Bulk Upload via Excel</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 10 }}>
              Upload an Excel (.xlsx / .csv) file with column: 
              {activeTab === 'defect_types' && ' name, description'}
              {activeTab === 'customers' && ' name, location, contact'}
              {activeTab === 'products' && ' name, short_code, unit_of_measure'}.
            </p>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} ref={fileInputRef} style={{ fontSize: '0.8rem' }} />
          </div>
        </div>

        {/* Right side: List */}
        <div style={{ flex: '2 1 500px', minWidth: '320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>
              {activeTab === 'defect_types' ? 'Registered Defect Types' : activeTab === 'customers' ? 'Customers List' : 'Products List'}
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              Total: {activeTab === 'defect_types' ? defectTypes.length : activeTab === 'customers' ? customers.length : products.length}
            </span>
          </div>

          {loading ? <p>Loading data...</p> : (
            <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table className="complaints-table">
                <thead>
                  <tr>
                    <th style={{ width: '90px' }}>ID</th>
                    <th>Name</th>
                    {activeTab === 'defect_types' && <th>Description / Standards</th>}
                    {activeTab === 'customers' && (
                      <>
                        <th>Location</th>
                        <th>Contact</th>
                      </>
                    )}
                    {activeTab === 'products' && (
                      <>
                        <th>Short Code</th>
                        <th>UOM</th>
                      </>
                    )}
                    {activeTab === 'defect_types' && <th style={{ textAlign: 'center', width: '60px' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {activeTab === 'defect_types' && defectTypes.map((item) => (
                    <tr key={item.id}>
                      <td className="complaint-id-cell">{item.id}</td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</td>
                      <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{item.description || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteDefect(item.id, item.name)}
                          title="Delete defect type"
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {activeTab === 'customers' && customers.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="complaint-id-cell">{item.id}</td>
                      <td style={{ fontWeight: 500 }}>{item.name}</td>
                      <td>{item.location}</td>
                      <td>{item.contact}</td>
                    </tr>
                  ))}

                  {activeTab === 'products' && products.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="complaint-id-cell">{item.id}</td>
                      <td style={{ fontWeight: 500 }}>{item.name}</td>
                      <td>{item.short_code}</td>
                      <td>{item.unit_of_measure}</td>
                    </tr>
                  ))}

                  {((activeTab === 'defect_types' ? defectTypes.length : activeTab === 'customers' ? customers.length : products.length) === 0) && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
