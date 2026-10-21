'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../utils/client';
import { Search, Plus, Bookmark, X, Check, Sparkles } from 'lucide-react';

export default function BookSearchModal({ isOpen, onClose, userId, onBookAdded }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('library'); // 'library' or 'wishlist'
  const [matchedBook, setMatchedBook] = useState(null);
  const [addedBookTitle, setAddedBookTitle] = useState(null);

  const supabase = createClient();

  // AUTOMATIC SEARCH-AS-YOU-TYPE (DEBOUNCED)
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      executeSearch(query.trim());
    }, 400); // 400ms delay while typing

    return () => clearTimeout(timer);
  }, [query]);

  async function executeSearch(searchQuery) {
    setLoading(true);
    setMatchedBook(null);
    setAddedBookTitle(null);

    try {
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=8`);
      const data = await res.json();

      const formatted = data.docs.map(doc => ({
        key: doc.key,
        title: doc.title,
        author: doc.author_name ? doc.author_name[0] : 'Unknown Author',
        cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null
      }));

      setResults(formatted);
    } catch (err) {
      console.error("Search error:", err);
    }
    setLoading(false);
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    if (query.trim()) {
      executeSearch(query.trim());
    }
  }

  async function handleAddBook(book) {
    if (mode === 'library') {
      const { error } = await supabase.from('books').insert({
        title: book.title,
        author: book.author,
        cover_url: book.cover_url,
        owner_id: userId,
        current_holder_id: userId,
        status: 'AVAILABLE'
      });

      if (!error) {
        setAddedBookTitle(book.title);
        onBookAdded();
      } else {
        alert("Error adding book: " + error.message);
      }
    } else {
      const { error } = await supabase.from('wishlists').insert({
        user_id: userId,
        title: book.title,
        author: book.author,
        cover_url: book.cover_url
      });

      if (!error) {
        setAddedBookTitle(book.title);
        onBookAdded();

        // Check if a friend in your library already owns it
        const { data: existing } = await supabase
          .from('books')
          .select('*, owner:profiles!books_owner_id_fkey(display_name)')
          .ilike('title', book.title)
          .neq('owner_id', userId)
          .limit(1);

        if (existing && existing.length > 0) {
          setMatchedBook(existing[0]);
        }
      } else if (error.code === '23505') {
        alert("This book is already in your wishlist!");
      } else {
        alert("Error saving wishlist item: " + error.message);
      }
    }
  }

  async function requestMatchedBook(book) {
    const { error } = await supabase.from('books').update({
      status: 'IN_TRANSFER',
      next_holder_id: userId
    }).eq('id', book.id);

    if (!error) {
      alert(`Requested "${book.title}" from ${book.owner?.display_name || 'your friend'}!`);
      onClose();
      onBookAdded();
    } else {
      alert("Request error: " + error.message);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800">
        
        {/* Header & Mode Switcher */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-extrabold text-base">Add a Book</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle Bar */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode('library')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              mode === 'library' ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Add to My Library
          </button>
          <button
            type="button"
            onClick={() => setMode('wishlist')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              mode === 'wishlist' ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" /> Save to Wishlist
          </button>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleFormSubmit} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <input
              type="text"
              autoFocus
              placeholder={mode === 'library' ? "Start typing book title..." : "Start typing wishlist title..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-3 py-2 pr-8 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>

        {/* AUTO-MATCH BANNER */}
        {matchedBook && (
          <div className="mb-4 bg-emerald-500 text-white p-3 rounded-2xl shadow-md flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <p className="font-extrabold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Found in Circle!
              </p>
              <p className="text-[11px] text-emerald-100 line-clamp-1">
                {matchedBook.owner?.display_name || 'A friend'} owns "{matchedBook.title}"!
              </p>
            </div>
            <button
              onClick={() => requestMatchedBook(matchedBook)}
              className="bg-white text-emerald-700 font-bold px-2.5 py-1.5 rounded-xl flex-shrink-0 text-[11px]"
            >
              Request
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <p className="text-center text-xs text-slate-400 py-4">Searching Open Library...</p>
        )}

        {/* Results Feed */}
        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
          {results.map((book) => {
            const isAdded = addedBookTitle === book.title;

            return (
              <div key={book.key} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-10 h-14 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-14 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center text-[9px] text-slate-400 flex-shrink-0">
                      No Cover
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-xs line-clamp-1">{book.title}</p>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{book.author}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleAddBook(book)}
                  disabled={isAdded}
                  className={`p-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                    isAdded 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isAdded ? (
                    <Check className="w-4 h-4" />
                  ) : mode === 'library' ? (
                    <Plus className="w-4 h-4" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}