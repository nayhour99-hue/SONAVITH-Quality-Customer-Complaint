import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { getCustomers, getProducts, addCustomer, addProduct, addCustomersBulk, addProductsBulk } from '../services/api';

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
  const [activeTab, setActiveTab] = useState('customers'); // customers or products
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({ id: '', name: '', location: '', contact: '', short_code: '', unit_of_measure: '' });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([getCustomers(), getProducts()]);
      setCustomers(c);
      setProducts(p);
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
    if (!form.name) return;
    
    if (activeTab === 'customers') {
      await addCustomer({ id: form.id, name: form.name, location: form.location, contact: form.contact });
    } else {
      await addProduct({ id: form.id, name: form.name, short_code: form.short_code, unit_of_measure: form.unit_of_measure });
    }
    setForm({ id: '', name: '', location: '', contact: '', short_code: '', unit_of_measure: '' });
    fetchData();
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
      } else {
        const formatted = data.map(row => ({
          id: getVal(row, ['id', 'Id', 'ID', 'product_id', 'product id']),
          name: getVal(row, ['name', 'Name', 'NAME', 'product_name', 'product name', 'Product Name', 'description', 'item']),
          short_code: getVal(row, ['short_code', 'ShortCode', 'shortCode', 'Short Code', 'short code', 'code', 'Code', 'CODE', 'product_short_code']),
          unit_of_measure: getVal(row, ['unit_of_measure', 'UnitOfMeasure', 'unitOfMeasure', 'Unit of Measure', 'unit of measure', 'uom', 'UOM', 'Unit', 'unit', 'packing', 'size'])
        })).filter(p => p.name);
        await addProductsBulk(formatted);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchData();
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="card" style={{ padding: '20px' }}>
      <h2>Masterlist Management</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button className={activeTab === 'customers' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('customers')}>Customers</button>
        <button className={activeTab === 'products' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('products')}>Products</button>
      </div>

      <div style={{ display: 'flex', gap: '40px' }}>
        {/* Left side: Add form */}
        <div style={{ flex: 1 }}>
          <h3>Add New {activeTab === 'customers' ? 'Customer' : 'Product'}</h3>
          <form onSubmit={handleAddSingle} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
            <div>
              <label>ID (Optional)</label>
              <input name="id" value={form.id} onChange={handleInputChange} className="form-input" placeholder="Auto-generated if empty" />
            </div>
            <div>
              <label>Name*</label>
              <input name="name" value={form.name} onChange={handleInputChange} required className="form-input" />
            </div>
            
            {activeTab === 'customers' ? (
              <>
                <div>
                  <label>Location</label>
                  <input name="location" value={form.location} onChange={handleInputChange} className="form-input" />
                </div>
                <div>
                  <label>Contact</label>
                  <input name="contact" value={form.contact} onChange={handleInputChange} className="form-input" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label>Short Code</label>
                  <input name="short_code" value={form.short_code} onChange={handleInputChange} className="form-input" placeholder="e.g. FFCM, FFAF (duplicates allowed)" />
                </div>
                <div>
                  <label>Unit of Measure (UOM)</label>
                  <input name="unit_of_measure" value={form.unit_of_measure} onChange={handleInputChange} className="form-input" placeholder="e.g. 2L-BTL, 1L-BTL (duplicates allowed)" />
                </div>
              </>
            )}
            
            <button type="submit" className="btn-primary">Add Single Record</button>
          </form>

          {activeTab === 'products' && (
            <div style={{ marginTop: 10, fontSize: '0.78rem', color: '#047857', background: '#ecfdf5', padding: '6px 10px', borderRadius: 6, maxWidth: 300 }}>
              ✓ Duplicate Short Codes & duplicate UOMs are fully permitted across products.
            </div>
          )}

          <hr style={{ margin: '30px 0', borderColor: 'var(--color-border)' }} />

          <h3>Bulk Upload (Excel)</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
            Upload an Excel file (.xlsx) with columns: 
            {activeTab === 'customers' ? ' id, name, location, contact' : ' id, name, short_code (or Code), unit_of_measure (or UOM)'}.
          </p>
          <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} ref={fileInputRef} />
        </div>

        {/* Right side: List */}
        <div style={{ flex: 2 }}>
          <h3>{activeTab === 'customers' ? 'Customers List' : 'Products List'}</h3>
          {loading ? <p>Loading...</p> : (
            <div className="table-container">
              <table className="complaints-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  {activeTab === 'customers' ? (
                    <>
                      <th>Location</th>
                      <th>Contact</th>
                    </>
                  ) : (
                    <>
                      <th>Short Code</th>
                      <th>UOM</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {(activeTab === 'customers' ? customers : products).map((item, idx) => (
                  <tr key={idx}>
                    <td className="complaint-id-cell">{item.id}</td>
                    <td>{item.name}</td>
                    {activeTab === 'customers' ? (
                      <>
                        <td>{item.location}</td>
                        <td>{item.contact}</td>
                      </>
                    ) : (
                      <>
                        <td>{item.short_code}</td>
                        <td>{item.unit_of_measure}</td>
                      </>
                    )}
                  </tr>
                ))}
                {(activeTab === 'customers' ? customers.length : products.length) === 0 && (
                  <tr>
                    <td colSpan={activeTab === 'customers' ? 4 : 4} style={{ textAlign: 'center', padding: '20px' }}>No records found.</td>
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
