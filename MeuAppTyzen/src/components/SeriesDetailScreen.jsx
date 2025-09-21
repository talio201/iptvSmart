import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';

const SeriesDetailScreen = ({ seriesInfo, currentStream, onBack, onPlayEpisode }) => {
  if (!seriesInfo || !seriesInfo.series_info) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6 flex items-center justify-center">
        <p>Nenhuma informação da série disponível.</p>
      </div>
    );
  }

  const { info, episodes } = seriesInfo.series_info;

  // The 'episodes' object from seriesInfo.series_info is already structured by season
  // where keys are season numbers and values are arrays of episode objects.
  const seasons = episodes; // Directly use the episodes object as seasons

  const sortedSeasons = Object.keys(seasons).sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <div
      className="min-h-screen bg-slate-900 text-white p-6 relative"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 1)), url(${info.backdrop_path && info.backdrop_path[0] ? info.backdrop_path[0] : currentStream.backdrop_path && currentStream.backdrop_path[0] ? currentStream.backdrop_path[0] : ''})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Button
        onClick={onBack}
        className="mb-4 bg-purple-600 hover:bg-purple-700"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Categorias
      </Button>

      <div className="flex flex-col md:flex-row gap-6 mb-6">
        <div className="flex-shrink-0">
          <img
            src={info.cover || currentStream.cover}
            alt={info.name || currentStream.name}
            className="w-48 h-auto rounded-lg shadow-lg"
          />
        </div>
        <div className="flex-grow">
          <h2 className="text-4xl font-bold mb-2">{info.name || currentStream.name}</h2>
          <p className="text-lg text-gray-300 mb-2">{info.plot || currentStream.plot}</p>
          <p className="text-sm text-gray-400">
            Ano: {info.release_date ? info.release_date.substring(0, 4) : currentStream.year} | Gênero: {info.genre || currentStream.genre} | Classificação: {info.rating || currentStream.rating}
          </p>
        </div>
      </div>

      <h3 className="text-2xl font-bold mb-4">Temporadas e Episódios</h3>
      <ScrollArea className="h-[calc(100vh-350px)] pr-4">
        <Accordion type="single" collapsible className="w-full">
          {sortedSeasons.map((seasonNum) => (
            <AccordionItem value={`season-${seasonNum}`} key={seasonNum}>
              <AccordionTrigger className="text-xl font-semibold">Temporada {seasonNum}</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {seasons[seasonNum].sort((a, b) => parseInt(a.episode_num) - parseInt(b.episode_num)).map((episode) => (
                    <div
                      key={episode.id}
                      className="bg-slate-800 rounded-lg shadow-md overflow-hidden cursor-pointer hover:bg-slate-700 transition-colors"
                      onClick={() => onPlayEpisode(episode)}
                    >
                      <img
                        src={episode.info.movie_image || info.cover || currentStream.cover}
                        alt={episode.title}
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-4">
                        <h4 className="text-lg font-semibold mb-1">{`E${episode.episode_num}: ${episode.title}`}</h4>
                        <p className="text-sm text-gray-400 line-clamp-2">{episode.info.plot}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
    </div>
  );
};

export default SeriesDetailScreen;
