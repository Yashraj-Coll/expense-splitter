import { useState, useEffect } from 'react';
import API, { getError } from '../api.js';
import { formatMoney } from '../utils.js';
import BalanceCard from './BalanceCard.jsx';
import Loader from './Loader.jsx';
import ErrorMessage from './ErrorMessage.jsx';

function BalanceTab({ groupId }) {
  const [balances, setBalances] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const balanceRes = await API.get('/groups/' + groupId + '/balances');
      const suggestionRes = await API.get('/groups/' + groupId + '/settlements/suggestions');
      setBalances(balanceRes.data.balances);
      setSuggestions(suggestionRes.data.suggestions);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const markPaid = async (s) => {
    try {
      await API.post('/groups/' + groupId + '/settlements', {
        fromMember: s.fromMember,
        toMember: s.toMember,
        amount: s.amount,
      });
      fetchData();
    } catch (err) {
      setError(getError(err));
    }
  };

  if (loading) return <Loader text="Calculating balances..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;

  return (
    <div>
      <h3>Balance Summary</h3>
      {balances.length === 0 ? (
        <div className="empty-box">
          <p>No members in this group yet.</p>
        </div>
      ) : (
        balances.map((b) => <BalanceCard key={b.memberId} balance={b} />)
      )}

      <h3 className="section-title">Suggested Settlements</h3>
      {suggestions.length === 0 ? (
        <p className="grey-text">Everyone is settled up.</p>
      ) : (
        <table>
          <tbody>
            {suggestions.map((s) => (
              <tr key={s.fromMember + '-' + s.toMember}>
                <td>
                  {s.fromName} pays {s.toName}
                </td>
                <td className="right">{formatMoney(s.amount)}</td>
                <td className="right">
                  <button className="btn btn-small" onClick={() => markPaid(s)}>
                    Mark as paid
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default BalanceTab;
