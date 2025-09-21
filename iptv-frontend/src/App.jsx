import { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import CategoryBrowser from './components/CategoryBrowser';
import PlayerScreen from './components/player_xtream'; // Renamed for clarity
import EPGScreen from './components/EPGScreen';
import FavoritesScreen from './components/FavoritesScreen';
import SearchScreen from './components/SearchScreen';
import SettingsScreen from './components/SettingsScreen';
import { Button } from './components/ui/button';
import { ArrowLeft } from 'lucide-react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [screenStack, setScreenStack] = useState(['login']);
  const [connectionData, setConnectionData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStream, setSelectedStream] = useState(null);

  const currentScreen = screenStack[screenStack.length - 1];
  const currentContentType = screenStack.find(s => ['live', 'movies', 'series'].includes(s)) || 'live';

  const handleNavigate = (screen) => {
    setScreenStack(prevStack => [...prevStack, screen]);
  };

  const handleBack = () => {
    setScreenStack(prevStack => (prevStack.length > 1 ? prevStack.slice(0, -1) : prevStack));
  };

  const handlePlayStream = (stream) => {
    setSelectedStream(stream);
    handleNavigate('player');
  };

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  useEffect(() => {
    // This effect can be used to handle browser back button in the future if needed
  }, []);

  const handleLogin = async (credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const handleLogin = async (credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('https://flask-iptv.vercel.app/api/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await response.json();
      if (data.success) {
        setIsAuthenticated(true);
        setCurrentUser(data.user);
        const connectionsResponse = await fetch('https://flask-iptv.vercel.app/api/iptv/connections');
        const connectionsData = await connectionsResponse.json();
        if (connectionsData.success && connectionsData.connections.length > 0) {
          const connection = connectionsData.connections[0];
          setConnectionData(connection);

          const dashboardResponse = await fetch(`https://flask-iptv.vercel.app/api/iptv/dashboard/${connection.id}`);
          const dashboardData = await dashboardResponse.json();

          if (dashboardData.success) {
            setDashboardData(dashboardData.dashboard);
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
            contentType="live"
            onNavigate={handleNavigate}
            onBack={handleBack}
            onPlayStream={handlePlayStream}
          />
        );
      case 'movies':
        return (
          <CategoryBrowser
            connectionData={connectionData}
            contentType="vod"
            onNavigate={handleNavigate}
            onBack={handleBack}
            onPlayStream={handlePlayStream}
          />
        );
      case 'series':
        return (
          <CategoryBrowser
            connectionData={connectionData}
            contentType="series"
            onNavigate={handleNavigate}
            onBack={handleBack}
            onPlayStream={handlePlayStream}
          />
        );
      case 'player':
        if (!selectedStream || !connectionData) {
          handleBack(); // Go back if data is missing
          return null;
        }
        return (
          <div className="flex flex-col h-screen bg-black">
            <header className="bg-black/50 p-2 flex items-center z-10 text-white">
              <Button variant="ghost" size="sm" onClick={handleBack} className="mr-2 hover:bg-white/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold truncate">{selectedStream.n}</h1>
            </header>
            <div className="flex-1 flex items-center justify-center">
              <PlayerScreen
                serverUrl={connectionData.server_url} // Assuming property name is 'url'
                username={connectionData.username}
                password={connectionData.password}
                streamId={selectedStream.si}
                contentType={currentContentType === 'vod' ? 'movie' : currentContentType}
                title={selectedStream.n}
                posterUrl={selectedStream.ic}
                autoPlay={true}
              />
            </div>
          </div>
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
    <div className="App bg-slate-900" style={{ minHeight: '100vh' }}>
      {renderContent()}
    </div>
  );
}

export default App;
