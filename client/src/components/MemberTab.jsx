import { useState } from 'react';
import API, { getError } from '../api.js';
import MemberList from './MemberList.jsx';
import NameForm from './NameForm.jsx';
import ErrorMessage from './ErrorMessage.jsx';

function MemberTab({ groupId, members, onChange }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [error, setError] = useState('');

  const addMember = async (name) => {
    await API.post('/groups/' + groupId + '/members', { name });
    onChange();
  };

  const renameMember = async (name) => {
    await API.patch('/groups/' + groupId + '/members/' + editingMember.id, { name });
    onChange();
  };

  const removeMember = async (member) => {
    if (!window.confirm('Remove ' + member.name + ' from this group?')) {
      return;
    }
    try {
      setError('');
      await API.delete('/groups/' + groupId + '/members/' + member.id);
      onChange();
    } catch (err) {
      setError(getError(err));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h3>Members</h3>
        <button className="btn" onClick={() => setShowAdd(true)}>
          Add Member
        </button>
      </div>

      <ErrorMessage message={error} />

      {members.length === 0 ? (
        <div className="empty-box">
          <p>No members yet. Add the people who will share expenses.</p>
        </div>
      ) : (
        <MemberList members={members} onRename={setEditingMember} onRemove={removeMember} />
      )}

      {showAdd && (
        <NameForm
          title="Add Member"
          label="Member name"
          buttonText="Add"
          onSubmit={addMember}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editingMember && (
        <NameForm
          title="Rename Member"
          label="Member name"
          initialName={editingMember.name}
          buttonText="Save"
          onSubmit={renameMember}
          onClose={() => setEditingMember(null)}
        />
      )}
    </div>
  );
}

export default MemberTab;
