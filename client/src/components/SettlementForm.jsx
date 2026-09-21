import { useState } from 'react';
import API, { getError } from '../api.js';
import { today } from '../utils.js';
import Modal from './Modal.jsx';
import ErrorMessage from './ErrorMessage.jsx';

function SettlementForm({ groupId, members, onClose, onSaved }) {
  const [fromMember, setFromMember] = useState(String(members[0].id));
  const [toMember, setToMember] = useState(String(members[1].id));
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    const newErrors = {};
    if (fromMember === toMember) newErrors.members = 'Choose two different members';
    if (amount === '' || isNaN(Number(amount)) || Number(amount) <= 0) newErrors.amount = 'Enter an amount greater than 0';
    if (date === '') newErrors.date = 'Date is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      setSaving(true);
      await API.post('/groups/' + groupId + '/settlements', {
        fromMember: Number(fromMember),
        toMember: Number(toMember),
        amount: Number(amount),
        date,
      });
      onSaved();
      onClose();
    } catch (err) {
      setApiError(getError(err));
      setSaving(false);
    }
  };

  return (
    <Modal title="Record Payment" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Paid by</label>
            <select value={fromMember} onChange={(e) => setFromMember(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Paid to</label>
            <select value={toMember} onChange={(e) => setToMember(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {errors.members && <p className="field-error">{errors.members}</p>}

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

        <ErrorMessage message={apiError} />

        <div className="form-buttons">
          <button type="button" className="btn btn-grey" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Saving...' : 'Save Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default SettlementForm;
