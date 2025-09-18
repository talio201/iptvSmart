import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button'; // Import Button component
import './ChannelOverlay.css';

const ChannelOverlay = ({ channels, currentIndex, onSelectChannel, onClose, show, categories, currentCategoryId }) => {
  const [highlightedIndex, setHighlightedIndex] = useState(currentIndex);
  const [selectedCategory, setSelectedCategory] = useState(currentCategoryId);
  const [activePanel, setActivePanel] = useState('channels'); // 'categories' or 'channels'
  const listRef = useRef(null);
  const categoryListRef = useRef(null);
  const timeoutRef = useRef(null); // Ref for timeout

  // Filter channels based on selected category
  const filteredChannels = channels.filter(channel => channel.category_id === selectedCategory);

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onClose();
    }, 5000); // 5 seconds timeout
  }, [onClose]);

  useEffect(() => {
    if (show) {
      resetTimeout();
      window.addEventListener('mousemove', resetTimeout);
      window.addEventListener('keydown', resetTimeout);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      window.removeEventListener('mousemove', resetTimeout);
      window.removeEventListener('keydown', resetTimeout);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      window.removeEventListener('mousemove', resetTimeout);
      window.removeEventListener('keydown', resetTimeout);
    };
  }, [show, resetTimeout]);

  useEffect(() => {
    setHighlightedIndex(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    // Ensure selectedCategory is set when categories or currentCategoryId change
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(currentCategoryId || categories[0].category_id);
    }
  }, [categories, currentCategoryId, selectedCategory]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      resetTimeout(); // Reset timeout on keydown
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          if (activePanel === 'categories') {
            const currentCategoryIndex = categories.findIndex(cat => cat.category_id === selectedCategory);
            const newCategoryIndex = currentCategoryIndex > 0 ? currentCategoryIndex - 1 : categories.length - 1;
            setSelectedCategory(categories[newCategoryIndex].category_id);
            setHighlightedIndex(0); // Reset channel highlight when category changes
          } else { // activePanel === 'channels'
            setHighlightedIndex((prevIndex) =>
              prevIndex > 0 ? prevIndex - 1 : filteredChannels.length - 1
            );
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (activePanel === 'categories') {
            const currentCategoryIndex = categories.findIndex(cat => cat.category_id === selectedCategory);
            const newCategoryIndex = currentCategoryIndex < categories.length - 1 ? currentCategoryIndex + 1 : 0;
            setSelectedCategory(categories[newCategoryIndex].category_id);
            setHighlightedIndex(0); // Reset channel highlight when category changes
          } else { // activePanel === 'channels'
            setHighlightedIndex((prevIndex) =>
              prevIndex < filteredChannels.length - 1 ? prevIndex + 1 : 0
            );
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (activePanel === 'channels') {
            setActivePanel('categories');
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (activePanel === 'categories') {
            setActivePanel('channels');
          } else { // activePanel === 'channels'
            if (filteredChannels[highlightedIndex]) {
              onSelectChannel(filteredChannels[highlightedIndex].stream_id); // Pass stream_id
            }
          }
          break;
        case 'Enter':
          event.preventDefault();
          if (activePanel === 'channels' && filteredChannels[highlightedIndex]) {
            onSelectChannel(filteredChannels[highlightedIndex].stream_id); // Pass stream_id
          }
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [categories, selectedCategory, filteredChannels, highlightedIndex, onSelectChannel, onClose, activePanel, resetTimeout]);

  useEffect(() => {
    if (listRef.current && highlightedIndex !== null && activePanel === 'channels') {
      const highlightedElement = listRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [highlightedIndex, activePanel]);

  useEffect(() => {
    if (categoryListRef.current && selectedCategory && activePanel === 'categories') {
      const selectedCategoryElement = categoryListRef.current.querySelector(`.category-item[data-category-id="${selectedCategory}"]`);
      if (selectedCategoryElement) {
        selectedCategoryElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedCategory, activePanel]);

  return (
    <div className={`channel-overlay-backdrop ${show ? 'active' : ''}`}> {/* Add active class based on prop */}
      <div className="channel-overlay-content">
        <div className={`category-panel ${activePanel === 'categories' ? 'active' : ''}`}>
          <h3 className="panel-title">Categorias</h3>
          <ul className="category-list" ref={categoryListRef}>
            {categories.map(category => (
              <li
                key={category.category_id}
                data-category-id={category.category_id}
                className={`category-item ${category.category_id === selectedCategory ? 'highlighted' : ''}`}
                onClick={() => {
                  setSelectedCategory(category.category_id);
                  setHighlightedIndex(0); // Reset channel highlight when category changes
                  setActivePanel('channels'); // Automatically switch to channels panel on category click
                }}
              >
                {category.category_name}
              </li>
            ))}
          </ul>
        </div>
        <div className={`channel-panel ${activePanel === 'channels' ? 'active' : ''}`}>
          <h3 className="panel-title">Canais</h3>
          <ul className="channel-list" ref={listRef}>
            {filteredChannels.map((channel, index) => (
              <li
                key={channel.stream_id}
                className={`channel-item ${index === highlightedIndex ? 'highlighted' : ''}`}
                onClick={() => onSelectChannel(filteredChannels[index].stream_id)}
              >
                {channel.stream_icon && (
                  <img src={channel.stream_icon} alt={channel.name} className="channel-icon" />
                )}
                <span className="channel-name">{channel.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ChannelOverlay;
