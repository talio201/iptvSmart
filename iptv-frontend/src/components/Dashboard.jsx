import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Tv,
  Film,
  MonitorPlay,
  Folder,
  Clock,
  Signal,
  Settings,
  Search,
  Play,
  Star,
  TrendingUp,
  Users,
  Wifi,
  Calendar,
  Loader2,
  RefreshCw
} from 'lucide-react'

export default function Dashboard({ 
  dashboardData, 
  connectionData,
  onNavigate, 
  onSearch, 
  onPlayChannel,
  onManageConnection,
  connectionStatus = 'active' 
}) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleSync = async () => {
    if (!connectionData) {
      alert('Dados de conexão não encontrados.');
      return;
    }
    setIsSyncing(true);
    try {
      // CORREÇÃO: Usar a variável de ambiente corretamente e apontar para o endpoint /api/iptv
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const connectionId = connectionData.id || connectionData.connection_id;
      // CORREÇÃO: Chamar a rota correta /request_sync
      const response = await fetch(`${API_BASE}/api/iptv/request_sync/${connectionId}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        // Mudar a mensagem de alerta, pois a sincronização agora é simbólica
        alert(data.message || 'Sincronização solicitada.');
      } else {
        alert(`Erro ao solicitar a sincronização: ${data.error}`);
      }
    } catch (error) {
      alert(`Erro de conexão ao tentar sincronizar: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const stats = dashboardData?.statistics || {}
  const recentChannels = dashboardData?.recent_channels || []
  const serverInfo = dashboardData?.server_info || {}
  const userInfo = dashboardData?.user_info || {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-purple-500/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
              <Tv className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">IPTV System</h1>
              <p className="text-sm text-gray-300">Smart TV Experience</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <Wifi className={`w-4 h-4 ${connectionStatus === 'active' ? 'text-green-400' : 'text-red-400'}`} />
              <span className="text-sm">
                {connectionStatus === 'active' ? 'Conectado' : 'Desconectado'}
              </span>
            </div>

            {/* Time Display */}
            <div className="text-right">
              <div className="text-lg font-mono">{formatTime(currentTime)}</div>
              <div className="text-xs text-gray-300">{formatDate(currentTime)}</div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onManageConnection}
              className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 flex items-center"
            >
              <Users className="w-4 h-4 mr-2" />
              <span>Conexão</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('settings')}
              className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 flex items-center"
            >
              <Settings className="w-4 h-4 mr-2" />
              <span>Configurações</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Welcome Section */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Bem-vindo ao seu IPTV
          </h2>
          <p className="text-gray-300">
            {userInfo.username && `Olá, ${userInfo.username}!`} Aproveite sua experiência de TV.
          </p>
        </div>

        {/* Quick Stats */}
        {dashboardData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Canais ao Vivo
                </CardTitle>
                <Tv className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {stats.total_live_channels || 0}
                </div>
                <p className="text-xs text-gray-400">
                  Disponíveis para assistir
                </p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Filmes VOD
                </CardTitle>
                <Film className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {stats.total_vod || 0}
                </div>
                <p className="text-xs text-gray-400">
                  Filmes disponíveis
                </p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Séries
                </CardTitle>
                <MonitorPlay className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {stats.total_series || 0}
                </div>
                <p className="text-xs text-gray-400">
                  Séries disponíveis
                </p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Categorias
                </CardTitle>
                <Folder className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {stats.total_categories || 0}
                </div>
                <p className="text-xs text-gray-400">
                  Organizadas por tipo
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <span className="ml-2 text-gray-300">Carregando estatísticas...</span>
          </div>
        )}

        {/* Main Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Live TV */}
          <Card 
            className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/50 backdrop-blur-sm cursor-pointer hover:from-purple-600/30 hover:to-purple-800/30 transition-all duration-300 transform hover:scale-105"
            onClick={() => onNavigate('live')}
          >
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center">
                <Tv className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">TV ao Vivo</h3>
                <p className="text-gray-300">Assista canais em tempo real</p>
              </div>
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                {stats.total_live_channels || 0} canais
              </Badge>
            </CardContent>
          </Card>

          {/* Movies */}
          <Card 
            className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/50 backdrop-blur-sm cursor-pointer hover:from-blue-600/30 hover:to-blue-800/30 transition-all duration-300 transform hover:scale-105"
            onClick={() => onNavigate('movies')}
          >
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center">
                <Film className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Filmes</h3>
                <p className="text-gray-300">Catálogo de filmes VOD</p>
              </div>
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                {stats.total_vod || 0} filmes
              </Badge>
            </CardContent>
          </Card>

          {/* Series */}
          <Card 
            className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/50 backdrop-blur-sm cursor-pointer hover:from-green-600/30 hover:to-green-800/30 transition-all duration-300 transform hover:scale-105"
            onClick={() => onNavigate('series')}
          >
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center">
                <MonitorPlay className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Séries</h3>
                <p className="text-gray-300">Episódios e temporadas</p>
              </div>
              <Badge variant="secondary" className="bg-green-500/20 text-green-300">
                {stats.total_series || 0} séries
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Recent Channels */}
        {dashboardData ? (
          recentChannels.length > 0 && (
            <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <span>Canais Recentes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentChannels.slice(0, 6).map((channel, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors"
                      onClick={() => onPlayChannel(channel)}
                    >
                      {channel.stream_icon ? (
                        <img
                          src={channel.stream_icon}
                          alt={channel.name}
                          className="w-10 h-10 rounded object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded flex items-center justify-center">
                          <Tv className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {channel.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {channel.stream_type === 'live' ? 'TV ao Vivo' : 
                           channel.stream_type === 'movie' ? 'Filme' : 'Série'}
                        </p>
                      </div>
                      <Play className="w-4 h-4 text-purple-400" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        ) : (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <span className="ml-2 text-gray-300">Carregando canais recentes...</span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button
            onClick={() => onSearch()}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Search className="w-4 h-4 mr-2" />
            Buscar Conteúdo
          </Button>

          <Button
            variant="outline"
            onClick={handleSync}
            disabled={isSyncing}
            className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Dados'}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => onNavigate('epg')}
            className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Guia EPG
          </Button>
          
          <Button
            variant="outline"
            onClick={() => onNavigate('favorites')}
            className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
          >
            <Star className="w-4 h-4 mr-2" />
            Favoritos
          </Button>
          
          <Button
            variant="outline"
            onClick={() => onNavigate('settings')}
            className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </Button>
        </div>
      </div>
    </div>
  )
}

