import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Settings, 
  Volume2, 
  Monitor, 
  Subtitles, 
  Wifi,
  User,
  Database,
  Save,
  RotateCcw,
  Trash2,
  Info
} from 'lucide-react'

export default function SettingsScreen({ 
  userPreferences,
  connectionData,
  onBack, 
  onUpdatePreferences,
  onClearData,
  apiBase
}) {
  const [preferences, setPreferences] = useState({
    quality_preference: 'auto',
    volume_level: 1.0,
    subtitle_enabled: false,
    subtitle_language: 'pt',
    ...userPreferences
  })
  const [isSaving, setIsSaving] = useState(false)
  const [connectionInfo, setConnectionInfo] = useState(connectionData || {})

  useEffect(() => {
    setPreferences({
      quality_preference: 'auto',
      volume_level: 1.0,
      subtitle_enabled: false,
      subtitle_language: 'pt',
      ...userPreferences
    })
  }, [userPreferences])

  useEffect(() => {
    setConnectionInfo(connectionData || {});
  }, [connectionData]);

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onUpdatePreferences(preferences)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setPreferences({
      quality_preference: 'auto',
      volume_level: 1.0,
      subtitle_enabled: false,
      subtitle_language: 'pt',
      favorite_channels: [],
      recent_channels: []
    })
  }

  const qualityOptions = [
    { value: 'auto', label: 'Automática (Recomendado)' },
    { value: '4k', label: '4K Ultra HD' },
    { value: 'fullhd', label: 'Full HD (1080p)' },
    { value: 'hd', label: 'HD (720p)' },
    { value: 'sd', label: 'SD (480p)' }
  ]

  const languageOptions = [
    { value: 'pt', label: 'Português' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' }
  ]

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-purple-500/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-purple-300 hover:bg-purple-500/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center space-x-2">
              <Settings className="w-6 h-6 text-purple-400" />
              <h1 className="text-xl font-bold">Configurações</h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-700/50"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restaurar Padrões
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Connection Info */}
        <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Wifi className="w-5 h-5 mr-2 text-purple-400" />
              Informações da Conexão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Servidor</Label>
                <div className="text-white bg-gray-800/50 p-2 rounded">
                  {connectionInfo.server_url || 'N/A'}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Usuário</Label>
                <div className="text-white bg-gray-800/50 p-2 rounded">
                  {connectionInfo.username || 'N/A'}
                </div>
              </div>
            </div>

            {connectionInfo.server_info && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-600">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {connectionInfo.statistics?.total_live_channels || 0}
                  </div>
                  <div className="text-sm text-gray-300">Canais</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {connectionInfo.statistics?.total_vod || 0}
                  </div>
                  <div className="text-sm text-gray-300">Filmes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {connectionInfo.statistics?.total_series || 0}
                  </div>
                  <div className="text-sm text-gray-300">Séries</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Video Settings */}
        <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Monitor className="w-5 h-5 mr-2 text-purple-400" />
              Configurações de Vídeo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-gray-300">Qualidade Preferida</Label>
              <select
                value={preferences.quality_preference}
                onChange={(e) => handlePreferenceChange('quality_preference', e.target.value)}
                className="w-full bg-gray-800/50 text-white border border-gray-600 rounded px-3 py-2"
              >
                {qualityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400">
                A qualidade automática ajusta baseada na sua conexão de internet
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Audio Settings */}
        <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Volume2 className="w-5 h-5 mr-2 text-purple-400" />
              Configurações de Áudio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-gray-300">Volume Padrão</Label>
              <div className="space-y-2">
                <Slider
                  value={[preferences.volume_level]}
                  onValueChange={(value) => handlePreferenceChange('volume_level', value[0])}
                  max={1}
                  step={0.1}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0%</span>
                  <span className="text-purple-300">
                    {Math.round(preferences.volume_level * 100)}%
                  </span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subtitle Settings */}
        <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Subtitles className="w-5 h-5 mr-2 text-purple-400" />
              Configurações de Legendas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-gray-300">Ativar Legendas</Label>
                <p className="text-xs text-gray-400">
                  Habilita legendas quando disponíveis
                </p>
              </div>
              <Switch
                checked={preferences.subtitle_enabled}
                onCheckedChange={(checked) => handlePreferenceChange('subtitle_enabled', checked)}
              />
            </div>

            {preferences.subtitle_enabled && (
              <div className="space-y-2">
                <Label className="text-gray-300">Idioma das Legendas</Label>
                <select
                  value={preferences.subtitle_language}
                  onChange={(e) => handlePreferenceChange('subtitle_language', e.target.value)}
                  className="w-full bg-gray-800/50 text-white border border-gray-600 rounded px-3 py-2"
                >
                  {languageOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Data */}
        <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <User className="w-5 h-5 mr-2 text-purple-400" />
              Dados do Usuário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Canais Favoritos</Label>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                    {preferences.favorite_channels?.length || 0} canais
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Histórico Recente</Label>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                    {preferences.recent_channels?.length || 0} itens
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Database className="w-5 h-5 mr-2 text-purple-400" />
              Gerenciamento de Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
              <div className="space-y-1">
                <h4 className="text-white font-medium">Limpar Cache</h4>
                <p className="text-xs text-gray-400">
                  Remove dados temporários e melhora a performance
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!connectionData || (!connectionData.id && !connectionData.connection_id)) {
                    alert('Dados de conexão não encontrados para limpar o cache.');
                    return;
                  }
                  const confirmClear = confirm('Tem certeza que deseja limpar o cache local? Isso removerá todos os canais, filmes e séries salvos localmente.');
                  if (confirmClear) {
                    try {
                      const API_BASE = apiBase; // apiBase is passed as prop
                      const connectionId = connectionData.id || connectionData.connection_id;
                      const response = await fetch(`${API_BASE}/clear_cache/${connectionId}`, {
                        method: 'POST',
                      });
                      const data = await response.json();
                      if (data.success) {
                        alert('Cache local limpo com sucesso! A aplicação será recarregada para aplicar as mudanças.');
                        window.location.reload(); // Full reload to refresh frontend state
                      } else {
                        alert(`Erro ao limpar o cache: ${data.error}`);
                      }m
                    } catch (error) {
                      alert(`Erro de conexão ao tentar limpar o cache: ${error.message}`);
                    }
                  }
                }}
                className="border-gray-600 text-gray-300 hover:bg-gray-700/50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <div className="space-y-1">
                <h4 className="text-white font-medium">Resetar Todas as Configurações</h4>
                <p className="text-xs text-gray-400">
                  Remove todos os dados salvos e restaura configurações padrão
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm('Tem certeza? Esta ação não pode ser desfeita.')) {
                    onClearData && onClearData()
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Resetar Tudo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Info className="w-5 h-5 mr-2 text-purple-400" />
              Informações do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-gray-300">Versão</div>
                <div className="text-white">IPTV System v1.0</div>
              </div>
              <div className="space-y-1">
                <div className="text-gray-300">Navegador</div>
                <div className="text-white">{navigator.userAgent}</div>
              </div>
              <div className="space-y-1">
                <div className="text-gray-300">Resolução</div>
                <div className="text-white">{window.screen.width}x{window.screen.height}</div>
              </div>
              <div className="space-y-1">
                <div className="text-gray-300">Sistema Operacional</div>
                <div className="text-white">{navigator.platform}</div>
              </div>
              <div className="space-y-1">
                <div className="text-gray-300">Status da Rede</div>
                <div className="text-white">{navigator.onLine ? 'Online' : 'Offline'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-gray-300">Tipo de Dispositivo</div>
                <div className="text-white">
                  {/Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

