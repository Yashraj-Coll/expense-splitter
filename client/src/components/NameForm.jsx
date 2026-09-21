import { useState } from 'react';
import Modal from './Modal.jsx';
import ErrorMessage from './ErrorMessage.jsx';
import { getError } from '../api.js';

function NameForm({ title, label, initialName, buttonText, onSubmit, onClose }) {
  const [name, setName] = useState(initialName || '');
  const [validationError, setValidationError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (name.trim() === '') {
      setValidationError(label + ' is required');
      return;
    }
    setValidationError('');

    try {
      setSaving(true);
      await onSubmit(name.trim());
      onClose();
    } catch (err) {
      setError(getError(err));
      setSaving(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>{label}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength="80" autoFocus />
          {validationError && <p className="field-error">{validationError}</p>}
        </div>
        <ErrorMessage message={error} />
        <div className="form-buttons">
          <button type="button" className="btn btn-grey" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Saving...' : buttonText}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default NameForm;
