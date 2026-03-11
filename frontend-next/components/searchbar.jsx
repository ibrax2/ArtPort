'use client';
import { useState, useRef, useEffect } from 'react';
import styles from './searchbar.module.css';

export default function SearchBar({ placeholder = "Search", onSearch }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Title');
  const [open, setOpen] = useState(false);
  const options = ["Title", "Artist"];
  const wrapperRef = useRef(null);

  const handleEnter = (e) => {
    if (e.key === 'Enter' && onSearch) onSearch(query, filter);
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

  return (
    <div className={styles.searchbarContainer}>
      <img src="./search_icon.svg" alt="search icon" className={styles.searchIcon} />

      <input
        type="text"
        className={styles.searchInput}
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleEnter}
      />

      <div className={styles.dropdownWrapper} ref={wrapperRef} onClick={() => setOpen(!open)}>
        <div className={styles.selected}>{filter}</div>
        <img
          src="/dropdown_arrow.svg"
          alt="arrow"
          className={`${styles.dropdownArrow} ${open ? styles.open : ''}`}
        />

        {open && (
          <div className={styles.options}>
            {options.map(opt => (
              <div
                key={opt}
                className={styles.option}
                onClick={() => { setFilter(opt); setOpen(false); }}
              >
                {opt}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}