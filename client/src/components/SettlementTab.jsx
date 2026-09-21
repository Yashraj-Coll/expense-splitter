import { useState, useEffect } from 'react';
import API, { getError } from '../api.js';
import SettlementList from './SettlementList.jsx';
import SettlementForm from './SettlementForm.jsx';
import Loader from './Loader.jsx';
import ErrorMessage from './ErrorMessage.jsx';

function SettlementTab({ groupId, members }) {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchSettlements = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await API.get('/groups/' + groupId + '/settlements');
      setSettlements(res.data);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, [groupId]);

  if (members.length < 2) {
    return (
      <div className="empty-box">
        <p>You need at least 2 members to record a payment.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h3>Settlement History</h3>
        <button className="btn" onClick={() => setShowForm(true)}>
          Record Payment
        </button>
      </div>

      {loading && <Loader text="Loading payments..." />}
      <ErrorMessage message={error} onRetry={fetchSettlements} />

      {!loading && !error && settlements.length === 0 && (
        <div className="empty-box">
          <p>No payments recorded yet.</p>
        </div>
      )}

      {settlements.length > 0 && <SettlementList settlements={settlements} />}

      {showForm && (
        <SettlementForm groupId={groupId} members={members} onClose={() => setShowForm(false)} onSaved={fetchSettlements} />
      )}
    </div>
  );
}

export default SettlementTab;
