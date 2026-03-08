'use client';

import { useState } from 'react';
import styles from './searchbar.module.css';

export default function SearchBar({ placeholder = "Search", onSearch }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Title');

  const handleEnter = (e) => {
    if (e.key === 'Enter' && onSearch) onSearch(query, filter);
  };

  return (
    <div className={styles.searchbarContainer}>

      <img
        src="/public/search-icon.svg"
        alt="search icon"
        className={styles.searchIcon}
      />

      <input
        type="text"
        className={styles.searchInput}
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleEnter}
      />

      <div className={styles.dropdownWrapper}>
        <select
          className={styles.searchDropdown}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="Title">Title</option>
          <option value="Artist">Artist</option>
        </select>

        <img
          src="/dropdown_arrow.svg"
          alt="arrow"
          className={styles.dropdownArrow}
        />
      </div>

    </div>
  );
}