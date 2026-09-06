import React, { useState } from 'react';
import '../styles/AddEntryModal.css';

const AddEntryModal = ({ isOpen, category, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({});

  const getFieldsForCategory = () => {
    const fields = {
      metals: [
        { name: 'purity', label: 'Purity (24k/22k)', type: 'text', required: true },
        { name: 'purchase_date', label: 'Date of Purchase', type: 'date', required: false },
        { name: 'quantity', label: 'Quantity (grams)', type: 'number', required: true },
        { name: 'cost_per_unit', label: 'Cost per gram (₹)', type: 'number', required: true }
      ],
      debt: [
        { name: 'fund_name', label: 'Fund Name', type: 'text', required: true },
        { name: 'invested_amount', label: 'Amount Invested (₹)', type: 'number', required: true },
        { name: 'interest_rate', label: 'Interest Rate (%)', type: 'number', required: false },
        { name: 'maturity_date', label: 'Maturity Date', type: 'date', required: false }
      ],
      retirement: [
        { 
          name: 'fund_name', 
          label: 'Fund Name*', 
          type: 'select', 
          required: true,
          options: [
            { value: 'Hesta', label: 'Hesta Super (A$)' },
            { value: 'SHOV', label: 'SHOV (₹)' },
            { value: 'AFAP', label: 'AFAP (US$)' }
          ]
        },
        { name: 'current_balance', label: 'Current Balance', type: 'number', required: true },
        { name: 'currency', label: 'Currency (INR/AUD/USD)', type: 'text', required: true, placeholder: 'INR, AUD, or USD' },
        { name: 'physical_gold_gms', label: 'Physical Gold (grams) - Optional', type: 'number', required: false },
        { name: 'contribution_rate', label: 'Annual Contribution - Optional', type: 'number', required: false }
      ]
    };
    return fields[category] || [];
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({});
  };

  if (!isOpen) return null;

  const fields = getFieldsForCategory();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add {category.charAt(0).toUpperCase() + category.slice(1)} Entry</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {fields.map(field => (
            <div key={field.name} className="form-group">
              <label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="required">*</span>}
              </label>
              
              {field.type === 'select' ? (
                <select
                  id={field.name}
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={handleInputChange}
                  required={field.required}
                  className="form-select"
                >
                  <option value="">-- Select {field.label} --</option>
                  {field.options?.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={field.name}
                  type={field.type}
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={handleInputChange}
                  required={field.required}
                  placeholder={field.placeholder || field.label}
                />
              )}
            </div>
          ))}

          <div className="modal-buttons">
            <button type="submit" className="btn-submit">Add Entry</button>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEntryModal;
