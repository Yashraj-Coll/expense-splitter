import { useState } from 'react';
import API, { getError } from '../api.js';
import { CATEGORIES, today, formatMoney } from '../utils.js';
import Modal from './Modal.jsx';
import ErrorMessage from './ErrorMessage.jsx';

function ExpenseForm({ groupId, members, expense, onClose, onSaved }) {
  const [description, setDescription] = useState(expense ? expense.description : '');
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [paidBy, setPaidBy] = useState(expense ? String(expense.paidBy) : String(members[0].id));
  const [category, setCategory] = useState(expense ? expense.category : 'Food');
  const [date, setDate] = useState(expense ? expense.date : today());
  const [splitType, setSplitType] = useState(expense ? expense.splitType : 'equal');

  const [selected, setSelected] = useState(expense ? expense.splits.map((s) => s.memberId) : members.map((m) => m.id));
  const [shares, setShares] = useState(() => {
    const start = {};
    if (expense) {
      expense.splits.forEach((s) => {
        start[s.memberId] = String(s.amount);
      });
    }
    return start;
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleMember = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const changeShare = (id, value) => {
    setShares({ ...shares, [id]: value });
  };

  const sharesTotal = selected.reduce((sum, id) => sum + Math.round(Number(shares[id] || 0) * 100), 0);

  const validate = () => {
    const newErrors = {};

    if (description.trim() === '') newErrors.description = 'Description is required';

    if (amount === '' || isNaN(Number(amount))) {
      newErrors.amount = 'Enter a valid amount';
    } else if (Number(amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (Math.abs(Number(amount) * 100 - Math.round(Number(amount) * 100)) > 0.000001) {
      newErrors.amount = 'Only 2 decimal places are allowed';
    }

    if (date === '') newErrors.date = 'Date is required';

    if (selected.length === 0) {
      newErrors.split = 'Select at least one member';
    } else if (splitType === 'exact') {
      const missing = selected.some((id) => shares[id] === undefined || shares[id] === '' || isNaN(Number(shares[id])));
      if (missing) {
        newErrors.split = 'Enter an amount for every selected member';
      } else if (!newErrors.amount && sharesTotal !== Math.round(Number(amount) * 100)) {
        newErrors.split = 'Shares add up to ' + formatMoney(sharesTotal / 100) + ' but the amount is ' + formatMoney(Number(amount));
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const data = {
      description: description.trim(),
      amount: Number(amount),
      paidBy: Number(paidBy),
      category,
      date,
      splitType,
    };
    if (splitType === 'equal') {
      data.splitBetween = selected;
    } else {
      data.splits = selected.map((id) => ({ memberId: id, amount: Number(shares[id]) }));
    }

    try {
      setSaving(true);
      if (expense) {
        await API.put('/groups/' + groupId + '/expenses/' + expense.id, data);
      } else {
        await API.post('/groups/' + groupId + '/expenses', data);
      }
      onSaved();
      onClose();
    } catch (err) {
      setApiError(getError(err));
      setSaving(false);
    }
  };

  return (
    <Modal title={expense ? 'Edit Expense' : 'Add Expense'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} maxLength="80" />
          {errors.description && <p className="field-error">{errors.description}</p>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Amount (₹)</label>
            <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} />
            {errors.amount && <p className="field-error">{errors.amount}</p>}
          </div>
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            {errors.date && <p className="field-error">{errors.date}</p>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Paid by</label>
            <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Split type</label>
          <label className="inline-label">
            <input type="radio" checked={splitType === 'equal'} onChange={() => setSplitType('equal')} /> Equal
          </label>
          <label className="inline-label">
            <input type="radio" checked={splitType === 'exact'} onChange={() => setSplitType('exact')} /> Exact amounts
          </label>
        </div>

        <div className="form-group">
          <label>Split between</label>
          {members.map((m) => (
            <div key={m.id} className="split-row">
              <label className="inline-label">
                <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggleMember(m.id)} /> {m.name}
              </label>
              {splitType === 'exact' && selected.includes(m.id) && (
                <input
                  type="text"
                  className="share-input"
                  placeholder="0"
                  value={shares[m.id] || ''}
                  onChange={(e) => changeShare(m.id, e.target.value)}
                />
              )}
            </div>
          ))}
          {errors.split && <p className="field-error">{errors.split}</p>}
        </div>

        <ErrorMessage message={apiError} />

        <div className="form-buttons">
          <button type="button" className="btn btn-grey" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Saving...' : expense ? 'Save Changes' : 'Add Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ExpenseForm;
