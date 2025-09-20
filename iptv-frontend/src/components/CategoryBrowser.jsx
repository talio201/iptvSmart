import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Search,
  Grid3X3,
  List,
  Play,
  Star,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react'
import { FixedSizeList as ListVirtualizer } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'

// Helper para buscar dados do backend
const fetchStreamsPage = async (connectionId, contentType, categoryId, page) => {
  try {
    const response = await fetch(`/api/iptv/streams/${connectionId}/${contentType}?category_id=${categoryId}&page=${page}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching streams page:", error)
    return { success: false, streams: [], pagination: { has_more: false } }
  }
}

export default function CategoryBrowser({
  connectionData,
  contentType,
  onBack,
  onSelectCategory,
  onPlayStream,
  onToggleFavorite,
  isLoading: appIsLoading, // Renomeado para evitar conflito
  favorites = []
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('grid') // grid or list
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [allStreams, setAllStreams] = useState([]) // Acumula todos os streams carregados
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isFetchingStreams, setIsFetchingStreams] = useState(false) // Estado para carregamento de streams
  const [filteredStreams, setFilteredStreams] = useState([]) // Streams filtrados pela busca
  const scrollContainerRef = useRef(null)
  const listRef = useRef(null) // Ref para react-window

  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      console.log('CategoryBrowser: Fetching categories with connectionData:', connectionData, 'contentType:', contentType);
      if (!connectionData || !connectionData.id || !contentType) {
        console.log('CategoryBrowser: Skipping fetch due to missing data.');
        setIsLoadingCategories(false);
        return;
      }
      setIsLoadingCategories(true);
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || ''; // Get API base from env
        const response = await fetch(`${API_BASE}/api/iptv/categories/${connectionData.id}/${contentType}`);
        const data = await response.json();
        console.log('CategoryBrowser: Raw categories data from backend:', data); // Added for debugging
        if (data.success) {
          setCategories(data.categories);
          if (data.categories.length > 0 && !selectedCategory) {
            setSelectedCategory(data.categories[0]);
          }
        } else {
          console.error("Failed to fetch categories:", data.error);
          setCategories([]);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        setCategories([]);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, [connectionData, contentType]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500) // 500ms delay

    return () => {
      clearTimeout(timer)
    }
  }, [searchTerm])

  // Reset streams and pagination when category or content type changes
  useEffect(() => {
    setAllStreams([])
    setCurrentPage(1)
    setHasMore(true)
    // Se uma categoria já estiver selecionada, recarrega a primeira página
    if (selectedCategory) {
      fetchAndSetStreams(selectedCategory.category_id, 1, true)
    }
  }, [selectedCategory, contentType])

  // Filter streams based on search term
  useEffect(() => {
    if (!debouncedSearchTerm.trim()) {
      setFilteredStreams(allStreams)
    } else {
      const lowerCaseSearchTerm = debouncedSearchTerm.toLowerCase()
      const results = allStreams.filter(stream =>
        stream.n && stream.n.toLowerCase().includes(lowerCaseSearchTerm)
      )
      setFilteredStreams(results)
    }
  }, [debouncedSearchTerm, allStreams])

  // Função para buscar e acumular streams
  const fetchAndSetStreams = useCallback(async (categoryId, pageNum, reset = false) => {
    console.log(`CategoryBrowser: fetchAndSetStreams called for category ${categoryId}, page ${pageNum}, reset: ${reset}`);
    if (!connectionData || !connectionData.id || !categoryId) {
      console.log('CategoryBrowser: Skipping fetchAndSetStreams due to missing connectionData or categoryId.');
      return;
    }
    if (isFetchingStreams && !reset) {
      console.log('CategoryBrowser: Skipping fetchAndSetStreams due to ongoing fetch.');
      return; // Evita múltiplas requisições
    }
    if (!hasMore && !reset) {
      console.log('CategoryBrowser: Skipping fetchAndSetStreams due to no more pages.');
      return; // Não busca se não houver mais páginas e não for reset
    }

    setIsFetchingStreams(true)
    try {
      const data = await fetchStreamsPage(connectionData.id, contentType, categoryId, pageNum)
      if (data.success) {
        setAllStreams(prevStreams => {
          const transformedStreams = data.streams.map(s => ({
            i: s.id, // Supabase ID
            si: s.stream_id, // Stream ID
            n: s.name, // Name
            ic: s.stream_icon, // Icon
            a: s.added, // Added date
            // Add other properties as needed for display or future use
            ...s // Keep all other properties
          }));
          const newStreams = reset ? transformedStreams : [...prevStreams, ...transformedStreams];
          console.log(`CategoryBrowser: setAllStreams - new total streams: ${newStreams.length}`);
          return newStreams;
        })
        setCurrentPage(pageNum)
        setHasMore(data.pagination.has_more)
      } else {
        console.error("Failed to fetch streams:", data.error)
        setHasMore(false)
      }
    } catch (error) {
      console.error("Error in fetchAndSetStreams:", error)
      setHasMore(false)
    } finally {
      setIsFetchingStreams(false)
    }
  }, [connectionData, contentType, isFetchingStreams, hasMore])

  // Carrega a primeira página quando uma categoria é selecionada
  useEffect(() => {
    if (selectedCategory && allStreams.length === 0 && !isFetchingStreams) {
      fetchAndSetStreams(selectedCategory.category_id, 1, true)
    }
  }, [selectedCategory, allStreams.length, isFetchingStreams, fetchAndSetStreams])

  const handleCategorySelect = (category) => {
    console.log('CategoryBrowser: Category selected:', category);
    setSearchTerm('') // Clear search when category changes
    setSelectedCategory(category)
  }

  const scrollCategories = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  const getContentTypeTitle = () => {
    switch (contentType) {
      case 'live': return 'TV ao Vivo'
      case 'vod': return 'Filmes'
      case 'series': return 'Séries'
      default: return 'Conteúdo'
    }
  }

  const getContentTypeIcon = () => {
    switch (contentType) {
      case 'live': return '📺'
      case 'vod': return '🎬'
      case 'series': return '📺'
      default: return '📁'
    }
  }

  const isFavorite = (streamId) => {
    return favorites.includes(streamId)
  }

  // Renderização de um item da lista virtualizada
  const StreamItem = useCallback(({ index, style }) => {
    const stream = filteredStreams[index]
    console.log('CategoryBrowser: StreamItem rendering stream:', stream); // Added for debugging

    // Carrega mais itens quando o usuário se aproxima do final da lista
    if (hasMore && !isFetchingStreams && index >= filteredStreams.length - 10) {
      fetchAndSetStreams(selectedCategory.category_id, currentPage + 1)
    }

    if (!stream) return null // Item não encontrado ou ainda carregando

    return (
      <div style={style} className="p-2 border border-red-500 text-white">
        {stream.n} (ID: {stream.si})
      </div>
    )
  }, [filteredStreams, viewMode, isFavorite, onPlayStream, onToggleFavorite, hasMore, isFetchingStreams, fetchAndSetStreams, selectedCategory, currentPage, contentType])

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
              <span className="text-2xl">{getContentTypeIcon()}</span>
              <h1 className="text-xl font-bold">{getContentTypeTitle()}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative flex items-center">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 w-64"
              />
              {isFetchingStreams && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>

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

      <div className="p-6 space-y-6 flex-1 flex flex-col">
        {/* Categories Navigation */}
        {categories && categories.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center">
                <Filter className="w-5 h-5 mr-2 text-purple-400" />
                Categorias
              </h2>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => scrollCategories('left')}
                  className="text-purple-300 hover:bg-purple-500/20"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => scrollCategories('right')}
                  className="text-purple-300 hover:bg-purple-500/20"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div 
              ref={scrollContainerRef}
              className="flex space-x-3 overflow-x-auto scrollbar-hide pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              
              {categories.map((category) => (
                <Button
                  key={category.category_id}
                  variant={selectedCategory?.category_id === category.category_id ? 'default' : 'outline'}
                  onClick={() => handleCategorySelect(category)}
                  className={`whitespace-nowrap ${
                    selectedCategory?.category_id === category.category_id
                      ? 'bg-purple-600 text-white' 
                      : 'border-purple-500/50 text-purple-300 hover:bg-purple-500/20'
                  }`}
                >
                  {category.category_name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Content Grid/List */}
        {appIsLoading || isFetchingStreams && allStreams.length === 0 ? (
          <div className="flex items-center justify-center py-12 flex-1">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <span className="ml-2 text-gray-300">Carregando conteúdo...</span>
          </div>
        ) : filteredStreams.length > 0 ? (
          <div className="space-y-4 flex-1 flex flex-col">
            {console.log('CategoryBrowser: filteredStreams length:', filteredStreams.length, 'filteredStreams:', filteredStreams)} {/* Added for debugging */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {selectedCategory ? selectedCategory.category_name : 'Todo o Conteúdo'}
                <Badge variant="secondary" className="ml-2 bg-purple-500/20 text-purple-300">
                  {filteredStreams.length} itens
                </Badge>
              </h3>
            </div>

            <div className="flex-1 h-full"> {/* This div wraps AutoSizer */}
              <AutoSizer>
                {({ height, width }) => {
                  console.log('AutoSizer dimensions: ', { height, width }); // Added for debugging
                  return (
                  <ListVirtualizer
                    ref={listRef}
                    height={height}
                    itemCount={filteredStreams.length}
                    itemSize={viewMode === 'grid' ? 250 : 100} // Altura estimada do item
                    width={width}
                    overscanRowCount={5} // Renderiza alguns itens extras acima e abaixo da viewport
                  >
                    {StreamItem}
                  </ListVirtualizer>
                )}}
              </AutoSizer>
            </div>

            {isFetchingStreams && filteredStreams.length > 0 && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 flex-1 flex flex-col justify-center items-center">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Nenhum conteúdo encontrado
            </h3>
            <p className="text-gray-400">
              {searchTerm 
                ? `Nenhum resultado para "${searchTerm}"`
                : 'Selecione uma categoria para ver o conteúdo'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}