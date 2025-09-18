import { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
// ... (keep other imports)

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [connectionData, setConnectionData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // ... (keep other state variables)

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  useEffect(() => {
    // When the app loads, check if there is a logged in user in session/local storage
    // For simplicity, we are not doing that here yet. App will always start logged out.
  }, []);

  const handleLogin = async (credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await response.json();
      if (data.success) {
        setIsAuthenticated(true);
        setCurrentUser(data.user);
        // After login, fetch the xtream connections for the user
        // For now, we'll assume the first connection is the one to use
        const connectionsResponse = await fetch(`${API_BASE}/api/iptv/connections`);
        const connectionsData = await connectionsResponse.json();
        if (connectionsData.success && connectionsData.connections.length > 0) {
          setConnectionData(connectionsData.connections[0]);
          setCurrentScreen('dashboard');
        } else {
          setError('No Xtream connection found for this user.');
        }
      } else {
        console.log('Login failed with data:', data);
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Caught an exception during login:', err);
      setError('An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setConnectionData(null);
    setDashboardData(null);
    setCurrentScreen('login'); // Redirect to login screen
  };

  // ... (keep other handler functions like handleNavigate, handlePlayStream, etc.)
  // You might need to adjust them to use `currentUser` or `connectionData` as needed.

  const renderContent = () => {
    if (!isAuthenticated) {
      return <LoginScreen onLogin={handleLogin} isLoading={isLoading} error={error} />;
    }

    // The rest of your renderCurrentScreen logic goes here
    switch (currentScreen) {
      case 'dashboard':
        return (
          <Dashboard
            dashboardData={dashboardData}
            connectionData={connectionData}
            onNavigate={handleNavigate}
            // ... other props
          />
        );
      // ... (other cases)
      default:
        return <LoginScreen onLogin={handleLogin} isLoading={isLoading} error={error} />;
    }
  };

  return (
    <div className="App" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {renderContent()}
    </div>
  );
}

export default App;
