"use client";
/* eslint-disable @next/next/no-img-element */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";

import { publicAsset } from "@/lib/paths";
import type { SearchResultItem } from "@/lib/searchApi";
import { sanitizeSingleLineText, TEXT_LIMITS } from "@/lib/textInput";

export type SearchBarProps = {
  placeholder?: string;
  onSearch?: (query: string, filter: string) => void;
  /** Legacy: parent-owned results when not using `loadResults`. */
  results?: SearchResultItem[];
  onSelectResult?: (item: SearchResultItem) => void;
  /** If set, debounced fetch while typing (backend integration). */
  loadResults?: (query: string, filter: string) => Promise<SearchResultItem[]>;
  debounceMs?: number;
};

/**
 * Search bar — presentation + optional backend wiring.
 *
 * Modes:
 * - **Remote (recommended):** pass `loadResults={fetchSearchResults}` from `lib/searchApi.ts`.
 * - **Controlled:** pass `results` and handle `onSearch` yourself (legacy).
 */
export default function SearchBar({
  placeholder = "Search",
  onSearch = () => {},
  results = [],
  onSelectResult = () => {},
  loadResults,
  debounceMs = 350,
}: SearchBarProps) {
  const SEARCH_ICON_SRC = publicAsset("/search_icon.svg");
  const DROPDOWN_ARROW_SRC = publicAsset("/dropdown_arrow.svg");
  const DEFAULT_AVATAR_SRC = publicAsset("/avatar-default.svg");
  const DEFAULT_ARTWORK_SRC = publicAsset("/images/artwork_1.jpg");

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Title");
  const [open, setOpen] = useState(false);
  const [internalResults, setInternalResults] = useState<SearchResultItem[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const options = ["Title", "Artist"];
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const handleEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onSearch(query, filter);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const runRemoteSearch = useCallback(async () => {
    if (!loadResults) return;
    const q = query.trim();
    if (!q) {
      setInternalResults([]);
      setFetchError("");
      return;
    }
    setLoading(true);
    setFetchError("");
    try {
      const items = await loadResults(query, filter);
      setInternalResults(Array.isArray(items) ? items : []);
    } catch (err) {
      setInternalResults([]);
      setFetchError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [loadResults, query, filter]);

  useEffect(() => {
    if (!loadResults) return undefined;
    const q = query.trim();
    if (!q) {
      setInternalResults([]);
      setFetchError("");
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const t = setTimeout(() => {
      runRemoteSearch();
    }, debounceMs);
    return () => clearTimeout(t);
  }, [query, filter, loadResults, debounceMs, runRemoteSearch]);

  const normalizedFilter = filter.toLowerCase();

  const filteredResults: SearchResultItem[] = (() => {
    if (loadResults) {
      return Array.isArray(internalResults) ? internalResults : [];
    }
    return Array.isArray(results)
      ? results.filter((item) =>
          normalizedFilter === "artist"
            ? item?.type === "artist"
            : item?.type === "artwork"
        )
      : [];
  })();

  const showPanel = query.trim().length > 0;

  return (
    <div className="searchbar-container">
      <img src={SEARCH_ICON_SRC} alt="" className="search-icon" />

      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={query}
        onChange={(e) =>
          setQuery(
            sanitizeSingleLineText(e.target.value, TEXT_LIMITS.searchQuery)
          )
        }
        onKeyDown={handleEnter}
        autoComplete="off"
        aria-label={placeholder}
        maxLength={TEXT_LIMITS.searchQuery}
      />

      <div
        className="dropdown-wrapper"
        ref={wrapperRef}
        onClick={() => setOpen(!open)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(!open);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="selected">{filter}</div>
        <img
          src={DROPDOWN_ARROW_SRC}
          alt=""
          className={`dropdown-arrow${open ? " open" : ""}`}
        />

        {open && (
          <div className="options" role="listbox">
            {options.map((opt) => (
              <div
                key={opt}
                className="option"
                role="option"
                aria-selected={filter === opt}
                onClick={() => {
                  setFilter(opt);
                  setOpen(false);
                }}
              >
                {opt}
              </div>
            ))}
          </div>
        )}
      </div>

      {showPanel && (
        <div className="search-results-panel">
          {loadResults && loading ? (
            <p className="search-results-empty">Searching…</p>
          ) : null}
          {fetchError ? (
            <p className="search-results-empty" style={{ color: "#b91c1c" }}>
              {fetchError}
            </p>
          ) : null}
          {!loading && !fetchError && filteredResults.length === 0 ? (
            <p className="search-results-empty">
              No {normalizedFilter} results yet.
            </p>
          ) : null}
          {!loading &&
            !fetchError &&
            filteredResults.map((item) =>
              item.type === "artist" ? (
                <button
                  key={item.id}
                  type="button"
                  className="search-result-item"
                  onClick={() => {
                    onSelectResult(item);
                    setQuery("");
                  }}
                >
                  <img
                    src={item.profilePictureUrl || DEFAULT_AVATAR_SRC}
                    alt=""
                    className="search-result-artist-avatar"
                  />
                  <div>
                    <p className="search-result-artist-name">{item.username}</p>
                  </div>
                </button>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  className="search-result-item"
                  onClick={() => {
                    onSelectResult(item);
                    setQuery("");
                  }}
                >
                  <img
                    src={item.artworkImageUrl || DEFAULT_ARTWORK_SRC}
                    alt=""
                    className="search-result-artwork-thumb"
                  />
                  <div>
                    <p className="search-result-artwork-title">
                      {item.title || "Untitled"}
                    </p>
                    <div className="search-result-artwork-artist-row">
                      <img
                        src={
                          item.artistProfilePictureUrl || DEFAULT_AVATAR_SRC
                        }
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
            )}
        </div>
      )}
    </div>
  );
}
