import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Play, 
  Info,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Tv
} from 'lucide-react'

export default function EPGScreen({ 
  connectionId,
  onBack, 
  onPlayChannel,
  apiBase
}) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [channels, setChannels] = useState([])
  const [epgData, setEpgData] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [timeSlots, setTimeSlots] = useState([])

  useEffect(() => {
    loadChannels()
    generateTimeSlots()
  }, [])

  useEffect(() => {
    if (channels.length > 0) {
      loadEPGData()
    }
  }, [selectedDate, channels])

  const loadChannels = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${apiBase}/streams/${connectionId}/live?limit=20`)
      const data = await response.json()
      
      if (data.success) {
        setChannels(data.streams)
        if (data.streams.length > 0) {
          setSelectedChannel(data.streams[0])
        }
      }
    } catch (error) {
      console.error('Error loading channels:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadEPGData = async () => {
    try {
      setIsLoading(true)
      const epgPromises = channels.slice(0, 10).map(async (channel) => {
        try {
          const response = await fetch(`${apiBase}/epg/${connectionId}/${channel.stream_id}`)
          const data = await response.json()
          
          if (data.success) {
            return { channelId: channel.stream_id, programs: data.epg }
          }
        } catch (error) {
          console.error(`Error loading EPG for channel ${channel.stream_id}:`, error)
        }
        return { channelId: channel.stream_id, programs: [] }
      })

      const results = await Promise.all(epgPromises)
      const epgMap = {}
      
      results.forEach(result => {
        epgMap[result.channelId] = result.programs
      })
      
      setEpgData(epgMap)
    } catch (error) {
      console.error('Error loading EPG data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateTimeSlots = () => {
    const slots = []
    const startHour = 0
    const endHour = 24
    
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        hour: hour
      })
    }
    
    setTimeSlots(slots)
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeString) => {
    if (!timeString) return ''
    const date = new Date(timeString)
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const changeDate = (direction) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + direction)
    setSelectedDate(newDate)
  }

  const isCurrentProgram = (program) => {
    if (!program.start_time || !program.end_time) return false
    
    const now = new Date()
    const start = new Date(program.start_time)
    const end = new Date(program.end_time)
    
    return now >= start && now <= end
  }

  const getProgramsForTimeSlot = (channelId, hour) => {
    const programs = epgData[channelId] || []
    return programs.filter(program => {
      if (!program.start_time) return false
      const programStart = new Date(program.start_time)
      return programStart.getHours() === hour
    })
  }

  const getCurrentProgram = (channelId) => {
    const programs = epgData[channelId] || []
    return programs.find(program => isCurrentProgram(program))
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
              <Calendar className="w-6 h-6 text-purple-400" />
              <h1 className="text-xl font-bold">Guia de Programação (EPG)</h1>
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => changeDate(-1)}
              className="text-purple-300 hover:bg-purple-500/20"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="text-center">
              <div className="text-lg font-semibold">{formatDate(selectedDate)}</div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => changeDate(1)}
              className="text-purple-300 hover:bg-purple-500/20"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <span className="ml-2 text-gray-300">Carregando programação...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Programs Overview */}
            <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Tv className="w-5 h-5 mr-2 text-purple-400" />
                  Programação Atual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {channels.slice(0, 6).map((channel) => {
                    const currentProgram = getCurrentProgram(channel.stream_id)
                    return (
                      <Card
                        key={channel.stream_id}
                        className="bg-gray-800/50 border-gray-600 hover:bg-gray-700/50 transition-all duration-300 cursor-pointer"
                        onClick={() => onPlayChannel(channel)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            {/* Channel Icon */}
                            <div className="w-12 h-8 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded overflow-hidden flex-shrink-0">
                              {channel.stream_icon ? (
                                <img
                                  src={channel.stream_icon}
                                  alt={channel.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none'
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Tv className="w-4 h-4 text-purple-400" />
                                </div>
                              )}
                            </div>

                            {/* Channel Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-white truncate">
                                {channel.name}
                              </h4>
                              
                              {currentProgram ? (
                                <div className="mt-1">
                                  <p className="text-xs text-purple-300 truncate">
                                    {currentProgram.title}
                                  </p>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Badge className="bg-green-500/20 text-green-300 text-xs">
                                      AO VIVO
                                    </Badge>
                                    <span className="text-xs text-gray-400">
                                      {formatTime(currentProgram.start_time)} - {formatTime(currentProgram.end_time)}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 mt-1">
                                  Programação não disponível
                                </p>
                              )}
                            </div>

                            <Play className="w-4 h-4 text-purple-400 flex-shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* EPG Grid */}
            <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Grade de Programação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="min-w-full">
                    {/* Time Header */}
                    <div className="flex border-b border-gray-600 pb-2 mb-4">
                      <div className="w-48 flex-shrink-0 text-sm font-medium text-gray-300">
                        Canal
                      </div>
                      {timeSlots.map((slot) => (
                        <div
                          key={slot.time}
                          className="w-32 flex-shrink-0 text-center text-sm font-medium text-gray-300"
                        >
                          {slot.time}
                        </div>
                      ))}
                    </div>

                    {/* Channel Rows */}
                    <div className="space-y-2">
                      {channels.slice(0, 10).map((channel) => (
                        <div key={channel.stream_id} className="flex items-center">
                          {/* Channel Name */}
                          <div className="w-48 flex-shrink-0 pr-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-6 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded overflow-hidden">
                                {channel.stream_icon ? (
                                  <img
                                    src={channel.stream_icon}
                                    alt={channel.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none'
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Tv className="w-3 h-3 text-purple-400" />
                                  </div>
                                )}
                              </div>
                              <span className="text-sm text-white truncate">
                                {channel.name}
                              </span>
                            </div>
                          </div>

                          {/* Program Slots */}
                          {timeSlots.map((slot) => {
                            const programs = getProgramsForTimeSlot(channel.stream_id, slot.hour)
                            const program = programs[0] // Take first program for this hour
                            
                            return (
                              <div
                                key={`${channel.stream_id}-${slot.time}`}
                                className="w-32 flex-shrink-0 h-12 border border-gray-700 bg-gray-800/30 p-1"
                              >
                                {program ? (
                                  <div 
                                    className={`w-full h-full rounded p-1 text-xs cursor-pointer transition-colors ${
                                      isCurrentProgram(program)
                                        ? 'bg-purple-600/50 text-white'
                                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                                    }`}
                                    title={program.description || program.title}
                                  >
                                    <div className="truncate font-medium">
                                      {program.title}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {formatTime(program.start_time)}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                                    <span className="text-xs">-</span>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legend */}
            <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-purple-600/50 rounded" />
                    <span className="text-gray-300">Programa Atual</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gray-700/50 rounded" />
                    <span className="text-gray-300">Próximos Programas</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span className="text-gray-300">Horários em GMT-3</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

