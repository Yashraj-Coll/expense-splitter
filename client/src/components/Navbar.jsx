import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <div className="navbar">
      <Link to="/" className="navbar-title">
        Expense Splitter
      </Link>
    </div>
  );
}

export default Navbar;
