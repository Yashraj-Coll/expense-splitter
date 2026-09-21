import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API, { getError } from '../api.js';
import Loader from '../components/Loader.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import NameForm from '../components/NameForm.jsx';
import Overview from '../components/Overview.jsx';
import ExpenseTab from '../components/ExpenseTab.jsx';
import MemberTab from '../components/MemberTab.jsx';
import BalanceTab from '../components/BalanceTab.jsx';
import SettlementTab from '../components/SettlementTab.jsx';

const TABS = ['Overview', 'Expenses', 'Members', 'Balances', 'Settlements'];

function GroupDetails() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');
  const [showRename, setShowRename] = useState(false);

  const fetchGroup = async () => {
    try {
      setLoading(true);
      setError('');
      const groupRes = await API.get('/groups/' + groupId);
      const memberRes = await API.get('/groups/' + groupId + '/members');
      setGroup(groupRes.data);
      setMembers(memberRes.data);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await API.get('/groups/' + groupId + '/members');
      setMembers(res.data);
    } catch (err) {
      setError(getError(err));
    }
  };

  useEffect(() => {
    fetchGroup();
  }, [groupId]);

  const renameGroup = async (name) => {
    await API.patch('/groups/' + groupId, { name });
    setGroup({ ...group, name });
  };

  const deleteGroup = async () => {
    if (!window.confirm('Delete "' + group.name + '" with all its expenses? This cannot be undone.')) {
      return;
    }
    try {
      await API.delete('/groups/' + groupId);
      navigate('/');
    } catch (err) {
      setError(getError(err));
    }
  };

  if (loading) return <Loader text="Loading group..." />;
  if (!group) {
    return (
      <div>
        <ErrorMessage message={error} onRetry={fetchGroup} />
        <Link to="/">Back to groups</Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/" className="back-link">
        &lt; Back to groups
      </Link>

      <div className="page-header">
        <h2>{group.name}</h2>
        <div>
          <button className="btn btn-grey" onClick={() => setShowRename(true)}>
            Rename
          </button>{' '}
          <button className="btn btn-red" onClick={deleteGroup}>
            Delete
          </button>
        </div>
      </div>

      <ErrorMessage message={error} />

      <div className="tabs">
        {TABS.map((tab) => (
          <button key={tab} className={activeTab === tab ? 'tab active' : 'tab'} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && <Overview groupId={groupId} />}
      {activeTab === 'Expenses' && <ExpenseTab groupId={groupId} members={members} />}
      {activeTab === 'Members' && <MemberTab groupId={groupId} members={members} onChange={fetchMembers} />}
      {activeTab === 'Balances' && <BalanceTab groupId={groupId} />}
      {activeTab === 'Settlements' && <SettlementTab groupId={groupId} members={members} />}

      {showRename && (
        <NameForm
          title="Rename Group"
          label="Group name"
          initialName={group.name}
          buttonText="Save"
          onSubmit={renameGroup}
          onClose={() => setShowRename(false)}
        />
      )}
    </div>
  );
}

export default GroupDetails;
