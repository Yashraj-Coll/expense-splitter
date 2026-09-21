import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API, { getError } from '../api.js';
import GroupCard from '../components/GroupCard.jsx';
import NameForm from '../components/NameForm.jsx';
import Loader from '../components/Loader.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await API.get('/groups');
      setGroups(res.data);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const createGroup = async (name) => {
    const res = await API.post('/groups', { name });
    navigate('/groups/' + res.data.id);
  };

  return (
    <div>
      <div className="page-header">
        <h2>My Groups</h2>
        <button className="btn" onClick={() => setShowForm(true)}>
          Add Group
        </button>
      </div>

      {loading && <Loader text="Loading groups..." />}
      <ErrorMessage message={error} onRetry={fetchGroups} />

      {!loading && !error && groups.length === 0 && (
        <div className="empty-box">
          <p>No groups yet. Click "Add Group" to create your first one.</p>
        </div>
      )}

      <div className="group-list">
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>

      {showForm && (
        <NameForm
          title="Add Group"
          label="Group name"
          buttonText="Create"
          onSubmit={createGroup}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

export default GroupsPage;
