import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Grid3X3, 
  List, 
  Play, 
  Star,
  Tv,
  Film,
  MonitorPlay
} from 'lucide-react'

export default function FavoritesScreen({ 
  favoriteStreams = [], 
  onBack, 
  onPlayStream,
  onToggleFavorite,
  favorites = []
}) {
  const [viewMode, setViewMode] = useState('grid') // grid or list

  const isFavorite = (streamId) => {
    return favorites.includes(streamId)
  }

  const getContentTypeIcon = (type) => {
    switch (type) {
      case 'live': return <Tv className="w-8 h-8 text-purple-400" />
      case 'movie': return <Film className="w-8 h-8 text-purple-400" />
      case 'series': return <MonitorPlay className="w-8 h-8 text-purple-400" />
      default: return <Play className="w-8 h-8 text-purple-400" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-purple-500/30 p-4 sticky top-0 z-10">
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
              <Star className="w-6 h-6 text-yellow-400" />
              <h1 className="text-xl font-bold">Meus Favoritos</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-800/50 rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-purple-600' : 'text-gray-400'}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-purple-600' : 'text-gray-400'}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Content Grid/List */}
        {favoriteStreams.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Todo o Conteúdo
                <Badge variant="secondary" className="ml-2 bg-purple-500/20 text-purple-300">
                  {favoriteStreams.length} itens
                </Badge>
              </h3>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {favoriteStreams.map((stream) => (
                  <Card
                    key={stream.stream_id || stream.series_id}
                    className="bg-black/40 border-purple-500/30 backdrop-blur-sm hover:bg-black/60 transition-all duration-300 cursor-pointer group"
                    onClick={() => onPlayStream(stream)}
                  >
                    <CardContent className="p-3 space-y-3">
                      <div className="relative aspect-video bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-lg overflow-hidden">
                        {stream.stream_icon ? (
                          <img
                            src={stream.stream_icon}
                            alt={stream.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {getContentTypeIcon(stream.stream_type)}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-8 h-8 text-white" />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 w-8 h-8 p-0 bg-black/50 hover:bg-black/70"
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleFavorite(stream.stream_id || stream.series_id)
                          }}
                        >
                          <Star 
                            className={`w-4 h-4 ${
                              isFavorite(stream.stream_id || stream.series_id) 
                                ? 'text-yellow-400 fill-yellow-400' 
                                : 'text-white'
                            }`} 
                          />
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-white truncate">
                          {stream.name}
                        </h4>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {favoriteStreams.map((stream) => (
                  <Card
                    key={stream.stream_id || stream.series_id}
                    className="bg-black/40 border-purple-500/30 backdrop-blur-sm hover:bg-black/60 transition-all duration-300 cursor-pointer"
                    onClick={() => onPlayStream(stream)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-12 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded overflow-hidden flex-shrink-0">
                          {stream.stream_icon ? (
                            <img
                              src={stream.stream_icon}
                              alt={stream.name}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {getContentTypeIcon(stream.stream_type)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-white truncate">
                            {stream.name}
                          </h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onToggleFavorite(stream.stream_id || stream.series_id)
                            }}
                            className="w-8 h-8 p-0"
                          >
                            <Star 
                              className={`w-4 h-4 ${
                                isFavorite(stream.stream_id || stream.series_id) 
                                  ? 'text-yellow-400 fill-yellow-400' 
                                  : 'text-gray-400'
                              }`} 
                            />
                          </Button>
                          <Play className="w-5 h-5 text-purple-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center mb-4">
              <Star className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Nenhum favorito encontrado
            </h3>
            <p className="text-gray-400">
              Adicione canais, filmes ou séries aos seus favoritos para vê-los aqui.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
