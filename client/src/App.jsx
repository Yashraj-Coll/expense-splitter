import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import GroupsPage from './pages/GroupsPage.jsx';
import GroupDetails from './pages/GroupDetails.jsx';

function App() {
  return (
    <div>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/" element={<GroupsPage />} />
          <Route path="/groups/:groupId" element={<GroupDetails />} />
          <Route path="*" element={<p>Page not found</p>} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
