import { useState } from 'react';
import { getStoredUser, clearUser } from './data/users';
import type { User } from './data/users';
import LoginWorkZone from './components/LoginWorkZone';
import WorkZoneShell from './components/WorkZoneShell';
import './styles/workzone.css';

function App() {
  const [user, setUser] = useState<User | null>(getStoredUser);

  const handleLogin = (u: User) => setUser(u);

  const handleLogout = () => {
    clearUser();
    setUser(null);
  };

  if (!user) {
    return <LoginWorkZone onLogin={handleLogin} />;
  }

  return <WorkZoneShell user={user} onLogout={handleLogout} />;
}

export default App;
