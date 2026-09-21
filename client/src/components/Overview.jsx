import { useState, useEffect } from 'react';
import API, { getError } from '../api.js';
import { formatMoney, formatDate } from '../utils.js';
import Loader from './Loader.jsx';
import ErrorMessage from './ErrorMessage.jsx';

function Overview({ groupId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await API.get('/groups/' + groupId + '/dashboard');
      setData(res.data);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [groupId]);

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;

  return (
    <div>
      <div className="stats">
        <div className="stat-box">
          <p className="grey-text">Total Expenses</p>
          <h3>{formatMoney(data.totalExpenses)}</h3>
        </div>
        <div className="stat-box">
          <p className="grey-text">Members</p>
          <h3>{data.memberCount}</h3>
        </div>
        <div className="stat-box">
          <p className="grey-text">Number of Expenses</p>
          <h3>{data.expenseCount}</h3>
        </div>
        <div className="stat-box">
          <p className="grey-text">Outstanding Balance</p>
          <h3>{formatMoney(data.outstandingBalance)}</h3>
        </div>
      </div>

      <div className="two-columns">
        <div className="box">
          <h3>Categories</h3>
          <table>
            <tbody>
              {data.categories.map((c) => (
                <tr key={c.category}>
                  <td>{c.category}</td>
                  <td className="right">{formatMoney(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="box">
          <h3>Recent Expenses</h3>
          {data.recentExpenses.length === 0 ? (
            <p className="grey-text">No expenses added yet.</p>
          ) : (
            <table>
              <tbody>
                {data.recentExpenses.map((e) => (
                  <tr key={e.id}>
                    <td>
                      {e.description}
                      <br />
                      <span className="grey-text small">
                        {e.paidByName} paid on {formatDate(e.date)}
                      </span>
                    </td>
                    <td className="right">{formatMoney(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default Overview;
