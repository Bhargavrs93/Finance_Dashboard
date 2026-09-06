import React, { useState, useEffect } from 'react';
import '../styles/AddEntryModal.css';

const AddEntryModal = ({ isOpen, category, initialData, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({});
  const isEdit = !!initialData;

  // Pre-fill the form when opening to edit an existing entry, and reset it for a fresh "Add"
  useEffect(() => {
    if (isOpen) {
      setFormData(initialData ? { ...initialData } : {});
    }
  }, [isOpen, initialData]);

  const getFieldsForCategory = () => {
    const fields = {
      mutualFund: [
        { name: 'fund_name', label: 'Fund Name', type: 'text', required: true },
        { name: 'quantity', label: 'Units', type: 'number', required: true },
        { name: 'average_cost', label: 'Purchase NAV (₹)', type: 'number', required: true },
        { name: 'current_price', label: 'Current NAV (₹) - Optional', type: 'number', required: false }
      ],
      metals: [
        { name: 'purity', label: 'Purity (24k/22k)', type: 'text', required: true },
        { name: 'purchase_date', label: 'Date of Purchase', type: 'date', required: false },
        { name: 'quantity', label: 'Quantity (grams)', type: 'number', required: true },
        { name: 'cost_per_unit', label: 'Cost per gram (₹)', type: 'number', required: true }
      ],
      global: [
        { name: 'name', label: 'Fund Name', type: 'text', required: true, placeholder: 'e.g., Vanguard VDHG' },
        { name: 'quantity', label: 'No. of Units', type: 'number', required: true },
        { name: 'cost_per_unit', label: 'Purchase Price per Unit (A$)', type: 'number', required: true },
        { name: 'purchase_date', label: 'Date of Purchase', type: 'date', required: false }
      ],
      debt: [
        { name: 'name', label: 'Fund Name', type: 'text', required: true },
        { name: 'type', label: 'Type', type: 'text', required: true, placeholder: 'e.g., Fixed Deposit, Bond' },
        { name: 'invested_amount', label: 'Amount', type: 'number', required: true },
        { name: 'interest_rate', label: 'Interest Rate (%)', type: 'number', required: false },
        { name: 'currency', label: 'Currency (INR/AUD/USD)', type: 'text', required: true, placeholder: 'INR, AUD, or USD' },
        { name: 'maturity_date', label: 'Maturity Date - Optional', type: 'date', required: false }
      ],
      retirement: [
        { name: 'name', label: 'Fund Name', type: 'text', required: true, placeholder: 'e.g., Hesta Super' },
        { name: 'account_type', label: 'Type', type: 'text', required: true, placeholder: 'e.g., Super, 401k, PPF' },
        { name: 'provider', label: 'Provider', type: 'text', required: true, placeholder: 'e.g., Hesta, Vanguard' },
        { name: 'currency', label: 'Currency (INR/AUD/USD)', type: 'text', required: true, placeholder: 'INR, AUD, or USD' },
        { name: 'current_balance', label: 'Current Value', type: 'number', required: true },
        { name: 'monthly_contribution', label: 'Monthly Contribution - Optional', type: 'number', required: false }
      ],
      retirementGold: [
        { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g., Physical Gold Holding' },
        { name: 'quantity', label: 'Quantity (grams)', type: 'number', required: true },
        { name: 'provider', label: 'Notes - Optional', type: 'text', required: false, placeholder: 'e.g., location, where it\'s held' }
      ],
      goal: [
        { name: 'name', label: 'Goal Name', type: 'text', required: true, placeholder: 'e.g., Emergency Fund' },
        { name: 'icon', label: 'Icon (emoji) - Optional', type: 'text', required: false, placeholder: '🎯' },
        { name: 'description', label: 'Description', type: 'text', required: false, placeholder: 'e.g., ₹1.35Cr in 18 months' },
        { name: 'progress_percent', label: 'Progress (%)', type: 'number', required: true }
      ]
    };
    return fields[category] || [];
  };

  const getCategoryTitle = () => {
    const titles = {
      mutualFund: 'Mutual Fund',
      global: 'Global Asset',
      retirementGold: 'Gold Holding',
      goal: 'Goal'
    };
    return titles[category] || (category.charAt(0).toUpperCase() + category.slice(1));
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
          <h2>{isEdit ? 'Edit' : 'Add'} {getCategoryTitle()} Entry</h2>
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
            <button type="submit" className="btn-submit">{isEdit ? 'Save Changes' : 'Add Entry'}</button>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEntryModal;
