import { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import CategoryBrowser from './components/CategoryBrowser';
import EPGScreen from './components/EPGScreen';
import FavoritesScreen from './components/FavoritesScreen';
import SearchScreen from './components/SearchScreen';
import SettingsScreen from './components/SettingsScreen';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [screenStack, setScreenStack] = useState(['login']); // Start at login
  const [connectionData, setConnectionData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // The current screen is the last one in the stack
  const currentScreen = screenStack[screenStack.length - 1];

  const handleNavigate = (screen) => {
    // Push the new screen onto the stack
    setScreenStack(prevStack => [...prevStack, screen]);
  };

  const handleBack = () => {
    // Pop the last screen from the stack, but don't empty it
    setScreenStack(prevStack => (prevStack.length > 1 ? prevStack.slice(0, -1) : prevStack));
  };

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  useEffect(() => {
    // This effect can be used to handle browser back button in the future if needed
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
        const connectionsResponse = await fetch(`${API_BASE}/api/iptv/connections`);
        const connectionsData = await connectionsResponse.json();
        if (connectionsData.success && connectionsData.connections.length > 0) {
          const connectionId = connectionsData.connections[0].id;
          setConnectionData(connectionsData.connections[0]);

          const dashboardResponse = await fetch(`${API_BASE}/api/iptv/dashboard/${connectionId}`);
          const dashboardData = await dashboardResponse.json();

          if (dashboardData.success) {
            setDashboardData(dashboardData.dashboard);
            // On successful login, reset stack to just the dashboard
            setScreenStack(['dashboard']);
          } else {
            setError(dashboardData.error || 'Failed to load dashboard data.');
          }
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
    // Reset stack to the login screen
    setScreenStack(['login']);
  };

  const renderContent = () => {
    if (!isAuthenticated || currentScreen === 'login') {
      return <LoginScreen onLogin={handleLogin} isLoading={isLoading} error={error} />;
    }

    switch (currentScreen) {
      case 'dashboard':
        return (
          <Dashboard
            dashboardData={dashboardData}
            connectionData={connectionData}
            onNavigate={handleNavigate}
            onSearch={() => handleNavigate('search')}
            onManageConnection={() => handleNavigate('settings')}
          />
        );
      case 'live':
        return (
          <CategoryBrowser
            connectionData={connectionData}
            categoryType="live"
            onNavigate={handleNavigate}
            onBack={handleBack}
          />
        );
      case 'movies':
        return (
          <CategoryBrowser
            connectionData={connectionData}
            categoryType="vod"
            onNavigate={handleNavigate}
            onBack={handleBack}
          />
        );
      case 'series':
        return (
          <CategoryBrowser
            connectionData={connectionData}
            categoryType="series"
            onNavigate={handleNavigate}
            onBack={handleBack}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            onBack={handleBack}
          />
        );
      case 'epg':
        return (
          <EPGScreen
            connectionData={connectionData}
            onNavigate={handleNavigate}
            onBack={handleBack}
          />
        );
      case 'favorites':
        return (
          <FavoritesScreen
            connectionData={connectionData}
            onNavigate={handleNavigate}
            onBack={handleBack}
          />
        );
      case 'search':
        return (
          <SearchScreen
            connectionData={connectionData}
            onNavigate={handleNavigate}
            onBack={handleBack}
          />
        );
      default:
        // Fallback to dashboard if authenticated but screen is unknown
        return (
          <Dashboard
            dashboardData={dashboardData}
            connectionData={connectionData}
            onNavigate={handleNavigate}
            onSearch={() => handleNavigate('search')}
            onManageConnection={() => handleNavigate('settings')}
          />
        );
    }
  };

  return (
    <div className="App" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {renderContent()}
    </div>
  );
}

export default App;