'use client';
import { useState, useRef, useEffect } from 'react';

export default function SearchBar({
  placeholder = "Search",
  onSearch = (_query, _filter) => {},
  results = [],
  onSelectResult = (_item) => {},
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Title');
  const [open, setOpen] = useState(false);
  const options = ["Title", "Artist"];
  const wrapperRef = useRef(null);

  const handleEnter = (e) => {
    if (e.key === 'Enter') onSearch(query, filter);
  };


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizedFilter = filter.toLowerCase();
  const filteredResults = Array.isArray(results)
    ? results.filter((item) =>
        normalizedFilter === 'artist'
          ? item?.type === 'artist'
          : item?.type === 'artwork'
      )
    : [];

  return (
    <div className="searchbar-container">
      <img src="https://raw.githubusercontent.com/hanandin/ArtPort/main/frontend-next/public/search_icon.svg" alt="search icon" className="search-icon" />

      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleEnter}
      />

      <div
        className="dropdown-wrapper"
        ref={wrapperRef}
        onClick={() => setOpen(!open)}
      >
        <div className="selected">{filter}</div>
        <img
          src="https://raw.githubusercontent.com/hanandin/ArtPort/main/frontend-next/public/dropdown_arrow.svg"
          alt="arrow"
          className={`dropdown-arrow${open ? ' open' : ''}`}
        />

        {open && (
          <div className="options">
            {options.map(opt => (
              <div
                key={opt}
                className="option"
                onClick={() => { setFilter(opt); setOpen(false); }}
              >
                {opt}
              </div>
            ))}
          </div>
        )}
      </div>

      {query.trim() && (
        <div className="search-results-panel">
          {filteredResults.length === 0 ? (
            <p className="search-results-empty">No {normalizedFilter} results yet.</p>
          ) : (
            filteredResults.map((item) =>
              item.type === 'artist' ? (
                <button
                  key={item.id}
                  type="button"
                  className="search-result-item"
                  onClick={() => onSelectResult(item)}
                >
                  <img
                    src={item.profilePictureUrl || "/avatar-default.svg"}
                    alt=""
                    className="search-result-artist-avatar"
                  />
                  <div>
                    <p className="search-result-artist-name">{item.username}</p>
                    {item.handle ? (
                      <p className="search-result-artist-handle">@{item.handle}</p>
                    ) : null}
                  </div>
                </button>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  className="search-result-item"
                  onClick={() => onSelectResult(item)}
                >
                  <img
                    src={item.artworkImageUrl || "/images/artwork_1.jpg"}
                    alt=""
                    className="search-result-artwork-thumb"
                  />
                  <div>
                    <p className="search-result-artwork-title">{item.title || "Untitled"}</p>
                    <div className="search-result-artwork-artist-row">
                      <img
                        src={item.artistProfilePictureUrl || "/avatar-default.svg"}
                        alt=""
                        className="search-result-artwork-artist-avatar"
                      />
                      <span className="search-result-artwork-artist-name">
                        {item.artistUsername || "Unknown artist"}
                      </span>
                    </div>
                  </div>
                </button>
              )
            )
          )}
        </div>
      )}
    </div>
  );
}