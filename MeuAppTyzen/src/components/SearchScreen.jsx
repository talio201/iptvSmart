import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  ArrowLeft, 
  Filter, 
  Play, 
  Star, 
  Clock,
  Loader2,
  X,
  Tv,
  Film,
  MonitorPlay
} from 'lucide-react'

export default function SearchScreen({ 
  connectionId,
  onBack, 
  onPlayStream,
  onToggleFavorite,
  favorites = [],
  apiBase
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [recentSearches, setRecentSearches] = useState([])
  const searchInputRef = useRef(null)

  const filters = [
    { id: 'all', label: 'Todos', icon: Search },
    { id: 'live', label: 'TV ao Vivo', icon: Tv },
    { id: 'movie', label: 'Filmes', icon: Film },
    { id: 'series', label: 'Séries', icon: MonitorPlay }
  ]

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('iptv_recent_searches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
    
    // Focus search input
    searchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const debounceTimer = setTimeout(() => {
        performSearch(searchQuery, selectedFilter)
      }, 500)

      return () => clearTimeout(debounceTimer)
    } else {
      setSearchResults([])
    }
  }, [searchQuery, selectedFilter])

  const performSearch = async (query, filter) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setSearchResults([]); // Clear previous results
    try {
      let results = [];
      if (filter === 'all') {
        // Search all types in parallel
        const searchPromises = ['live', 'movie', 'series'].map(type =>
          fetch(`${apiBase}/search/${connectionId}/${type}?q=${encodeURIComponent(query)}`).then(res => res.json())
        );
        const responses = await Promise.all(searchPromises);
        responses.forEach(data => {
          if (data.success && data.streams) {
            results = [...results, ...data.streams];
          }
        });
      } else {
        // Search a specific type
        const response = await fetch(`${apiBase}/search/${connectionId}/${filter}?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.success && data.streams) {
          results = data.streams;
        }
      }

      setSearchResults(results);

      // Add to recent searches
      const newRecentSearches = [
        query,
        ...recentSearches.filter(s => s !== query)
      ].slice(0, 10);
      
      setRecentSearches(newRecentSearches);
      localStorage.setItem('iptv_recent_searches', JSON.stringify(newRecentSearches));

    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecentSearchClick = (query) => {
    setSearchQuery(query)
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('iptv_recent_searches')
  }

  const getContentTypeIcon = (type) => {
    switch (type) {
      case 'live': return <Tv className="w-4 h-4" />
      case 'movie': return <Film className="w-4 h-4" />
      case 'series': return <MonitorPlay className="w-4 h-4" />
      default: return <Play className="w-4 h-4" />
    }
  }

  const getContentTypeLabel = (type) => {
    switch (type) {
      case 'live': return 'AO VIVO'
      case 'movie': return 'FILME'
      case 'series': return 'SÉRIE'
      default: return 'CONTEÚDO'
    }
  }

  const isFavorite = (streamId) => {
    return favorites.includes(streamId)
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
              <Search className="w-6 h-6 text-purple-400" />
              <h1 className="text-xl font-bold">Buscar Conteúdo</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Search Input */}
        <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                ref={searchInputRef}
                placeholder="Digite o nome do canal, filme ou série..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 text-lg py-3"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const Icon = filter.icon
            return (
              <Button
                key={filter.id}
                variant={selectedFilter === filter.id ? 'default' : 'outline'}
                onClick={() => setSelectedFilter(filter.id)}
                className={`${
                  selectedFilter === filter.id
                    ? 'bg-purple-600 text-white'
                    : 'border-purple-500/50 text-purple-300 hover:bg-purple-500/20'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {filter.label}
              </Button>
            )
          })}
        </div>

        {/* Recent Searches */}
        {!searchQuery && recentSearches.length > 0 && (
          <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-white">
                  <Clock className="w-5 h-5 mr-2 text-purple-400" />
                  Buscas Recentes
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearRecentSearches}
                  className="text-gray-400 hover:text-white"
                >
                  Limpar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleRecentSearchClick(search)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700/50"
                  >
                    {search}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <span className="ml-2 text-gray-300">Buscando...</span>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">
                Resultados da Busca
                <Badge variant="secondary" className="ml-2 bg-purple-500/20 text-purple-300">
                  {searchResults.length} encontrados
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((result) => (
                  <Card
                    key={result.stream_id}
                    className="bg-gray-800/50 border-gray-600 hover:bg-gray-700/50 transition-all duration-300 cursor-pointer group"
                    onClick={() => onPlayStream(result)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        {/* Thumbnail */}
                        <div className="w-16 h-12 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded overflow-hidden flex-shrink-0">
                          {result.stream_icon ? (
                            <img
                              src={result.stream_icon}
                              alt={result.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {getContentTypeIcon(result.stream_type)}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                            {result.name}
                          </h4>
                          <div className="flex items-center justify-between mt-2">
                            <Badge 
                              variant="secondary" 
                              className="text-xs bg-purple-500/20 text-purple-300"
                            >
                              {getContentTypeLabel(result.stream_type)}
                            </Badge>
                            
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onToggleFavorite(result.stream_id)
                                }}
                                className="w-8 h-8 p-0 hover:bg-gray-600/50"
                              >
                                <Star 
                                  className={`w-4 h-4 ${
                                    isFavorite(result.stream_id) 
                                      ? 'text-yellow-400 fill-yellow-400' 
                                      : 'text-gray-400'
                                  }`} 
                                />
                              </Button>
                              <Play className="w-4 h-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Results */}
        {searchQuery.trim().length >= 2 && !isLoading && searchResults.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Nenhum resultado encontrado
            </h3>
            <p className="text-gray-400">
              Tente usar palavras-chave diferentes ou verifique a ortografia
            </p>
          </div>
        )}

        {/* Search Tips */}
        {!searchQuery && recentSearches.length === 0 && (
          <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Dicas de Busca</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-300">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                <p>Digite pelo menos 2 caracteres para iniciar a busca</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                <p>Use filtros para refinar os resultados por tipo de conteúdo</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                <p>Suas buscas recentes ficam salvas para acesso rápido</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

