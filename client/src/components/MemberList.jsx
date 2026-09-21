function MemberList({ members, onRename, onRemove }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th className="right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {members.map((member) => (
          <tr key={member.id}>
            <td>{member.name}</td>
            <td className="right">
              <button className="btn btn-small btn-grey" onClick={() => onRename(member)}>
                Rename
              </button>{' '}
              <button className="btn btn-small btn-red" onClick={() => onRemove(member)}>
                Remove
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default MemberList;
