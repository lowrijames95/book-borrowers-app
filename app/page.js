'use client';

import { useEffect, useState } from 'react';
import { createClient } from './utils/client';
import { useRouter } from 'next/navigation';
import Logo from './components/Logo.jsx';
import BookCard from './components/BookCard.jsx';
import BookSearchModal from './components/BookSearchModal.jsx';
import CircleSelector from './components/CircleSelector.jsx';
import BookDetailModal from './components/BookDetailModal.jsx';
import FeedFilterModal from './components/FeedFilterModal.jsx';
import { 
  LogOut, Plus, User, BookOpen, Bookmark, Bell, CheckCircle, 
  PackageCheck, AlertCircle, Library, BookMarked, Heart, CheckCircle2, 
  Search, Star, X, SlidersHorizontal 
} from 'lucide-react';

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  
  // Circle State
  const [circles, setCircles] = useState([]);
  const [currentCircle, setCurrentCircle] = useState(null);

  // Books & Lists Data
  const [books, setBooks] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [readHistory, setReadHistory] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [allHistoryRecords, setAllHistoryRecords] = useState([]);
  const [profilesMap, setProfilesMap] = useState([]);

  // Search & Filter State
  const [tabSearchQuery, setTabSearchQuery] = useState('');
  const [selectedOwnerFilter, setSelectedOwnerFilter] = useState('');
  const [selectedReaderFilter, setSelectedReaderFilter] = useState('');
  const [minRatingFilter, setMinRatingFilter] = useState(0);
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // 'all' or 'available'
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Notifications
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingReturns, setPendingReturns] = useState([]);
  const [returnRequestedForUser, setReturnRequestedForUser] = useState([]);

  const [savedBookIds, setSavedBookIds] = useState([]);
  const [activeTab, setActiveTab] = useState('library');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Detail Sheet Trigger
  const [selectedBookForDetail, setSelectedBookForDetail] = useState(null);
  
  const supabase = createClient();
  const router = useRouter();

  // AUTHENTICATION & INITIALIZATION (FIXED RACE CONDITION)
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (isMounted) {
        if (session?.user) {
          setUser(session.user);
          loadUserData(session.user);
        } else {
          router.push('/login');
        }
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' || session?.user) {
        setUser(session.user);
        loadUserData(session.user);
      } else if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  async function loadUserData(authUser) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', authUser.id)
      .single();

    if (prof && prof.display_name) {
      setProfile(prof);
      setDisplayNameInput(prof.display_name);
    } else {
      const fallbackName = authUser.email?.split('@')[0] || 'Friend';
      setProfile({ display_name: fallbackName });
      setDisplayNameInput(fallbackName);
    }

    fetchProfiles();
    fetchCircles(authUser.id);
    fetchSavedBooks(authUser.id);
    fetchWishlist(authUser.id);
    fetchReadHistory(authUser.id);
    fetchGlobalReviewsAndHistory();
    setLoading(false);
  }

  async function fetchProfiles() {
    const { data } = await supabase.from('profiles').select('id, display_name');
    if (data) setProfilesMap(data);
  }

  async function fetchGlobalReviewsAndHistory() {
    const { data: revs } = await supabase.from('reviews').select('*');
    if (revs) setAllReviews(revs);

    const { data: hist } = await supabase.from('borrow_history').select('*');
    if (hist) setAllHistoryRecords(hist);
  }

  async function fetchCircles(userId) {
    const { data: memberships } = await supabase
      .from('circle_members')
      .select('circle_id, circles(*)')
      .eq('user_id', userId);

    if (memberships) {
      const userCircles = memberships.map(m => m.circles).filter(Boolean);
      setCircles(userCircles);
      fetchBooks(userId, currentCircle, userCircles);
    }
  }

  async function fetchBooks(currentUserId = user?.id, circle = currentCircle, availableCircles = circles) {
    let circleUserIds = [];

    if (circle) {
      const { data: members } = await supabase
        .from('circle_members')
        .select('user_id')
        .eq('circle_id', circle.id);

      if (members) {
        circleUserIds = members.map(m => m.user_id);
      }
    } else if (availableCircles.length > 0) {
      const { data: allMemberships } = await supabase
        .from('circle_members')
        .select('user_id')
        .in('circle_id', availableCircles.map(c => c.id));

      if (allMemberships) {
        circleUserIds = [...new Set(allMemberships.map(m => m.user_id))];
      }
    }

    if (currentUserId && !circleUserIds.includes(currentUserId)) {
      circleUserIds.push(currentUserId);
    }

    let query = supabase
      .from('books')
      .select(`
        id,
        title,
        author,
        cover_url,
        status,
        owner_id,
        current_holder_id,
        next_holder_id,
        allow_keep_for_next,
        created_at,
        owner:profiles!books_owner_id_fkey(display_name),
        holder:profiles!books_current_holder_id_fkey(display_name),
        next_holder:profiles!books_next_holder_id_fkey(display_name)
      `)
      .order('created_at', { ascending: false });

    if (circleUserIds.length > 0) {
      query = query.in('owner_id', circleUserIds);
    }

    const { data, error } = await query;

    if (error) console.error("Error fetching books:", error.message);

    if (data) {
      setBooks(data);

      if (currentUserId) {
        setPendingRequests(data.filter(b => b.current_holder_id === currentUserId && b.status === 'IN_TRANSFER' && b.next_holder_id));
        setPendingReturns(data.filter(b => b.owner_id === currentUserId && b.status === 'RETURN_PENDING'));
        setReturnRequestedForUser(data.filter(b => b.current_holder_id === currentUserId && b.owner_id !== currentUserId && b.status === 'RETURN_PENDING'));
      }
    }
  }

  async function fetchSavedBooks(userId) {
    const { data } = await supabase.from('wishlists').select('title').eq('user_id', userId);
    if (data) setSavedBookIds(data.map(item => item.title));
  }

  async function fetchWishlist(userId) {
    const { data } = await supabase.from('wishlists').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) setWishlistItems(data);
  }

  async function fetchReadHistory(userId) {
    const { data } = await supabase
      .from('borrow_history')
      .select('*, book:books(*, owner:profiles!books_owner_id_fkey(display_name))')
      .eq('user_id', userId)
      .order('read_at', { ascending: false });

    if (data) setReadHistory(data);
  }

  async function removeFromWishlist(id) {
    await supabase.from('wishlists').delete().eq('id', id);
    if (user?.id) {
      fetchWishlist(user.id);
      fetchSavedBooks(user.id);
    }
  }

  async function confirmNotificationHandover(book) {
    await supabase.from('books').update({ status: 'BORROWED', current_holder_id: book.next_holder_id, next_holder_id: null }).eq('id', book.id);
    fetchBooks(user.id);
  }

  async function confirmNotificationReturn(book) {
    await supabase.from('books').update({ status: 'AVAILABLE', current_holder_id: book.owner_id, next_holder_id: null, allow_keep_for_next: false }).eq('id', book.id);
    fetchBooks(user.id);
  }

  async function toggleSaveForLater(book) {
    if (!user) return;
    const isSaved = savedBookIds.includes(book.title);

    if (isSaved) {
      await supabase.from('wishlists').delete().eq('user_id', user.id).eq('title', book.title);
      setSavedBookIds(savedBookIds.filter(t => t !== book.title));
    } else {
      await supabase.from('wishlists').insert({ user_id: user.id, title: book.title, author: book.author, cover_url: book.cover_url });
      setSavedBookIds([...savedBookIds, book.title]);
    }
    fetchWishlist(user.id);
  }

  async function saveDisplayName(e) {
    e.preventDefault();
    if (!displayNameInput.trim()) return;

    const { error } = await supabase.from('profiles').update({ display_name: displayNameInput.trim() }).eq('id', user.id);
    if (!error) {
      setProfile({ display_name: displayNameInput.trim() });
      setShowNameModal(false);
      fetchBooks(user.id);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-500">Loading BookBorrowers...</p>
      </div>
    );
  }

  const userActiveBorrowCount = books.filter(b => b.current_holder_id === user?.id && b.owner_id !== user?.id && b.status === 'BORROWED').length;

  const borrowedBooks = books.filter(b => b.current_holder_id === user?.id && b.owner_id !== user?.id);
  const ownedBooks = books.filter(b => b.owner_id === user?.id);
  const savedBooks = books.filter(b => savedBookIds.includes(b.title));

  // MASTER FILTER ENGINE
  function applyFilters(items, titleKey = 'title', authorKey = 'author') {
    return items.filter((item) => {
      const bookObj = item.book || item;

      // 1. Title/Author Search
      if (tabSearchQuery.trim()) {
        const q = tabSearchQuery.toLowerCase();
        const titleMatch = (bookObj[titleKey] || '').toLowerCase().includes(q);
        const authorMatch = (bookObj[authorKey] || '').toLowerCase().includes(q);
        if (!titleMatch && !authorMatch) return false;
      }

      // 2. Availability Filter
      if (availabilityFilter === 'available') {
        const isAvailable = bookObj.status === 'AVAILABLE' || bookObj.status === 'HELD_FOR_NEXT';
        if (!isAvailable) return false;
      }

      // 3. Owner Filter
      if (selectedOwnerFilter && bookObj.owner_id !== selectedOwnerFilter) {
        return false;
      }

      // 4. Past Reader Filter
      if (selectedReaderFilter) {
        const hasReaderRead = allHistoryRecords.some(
          h => h.book_id === bookObj.id && h.user_id === selectedReaderFilter
        );
        if (!hasReaderRead) return false;
      }

      // 5. Minimum Rating Filter
      if (minRatingFilter > 0) {
        const bookRevs = allReviews.filter(r => r.book_id === bookObj.id);
        if (bookRevs.length === 0) return false;
        const avg = bookRevs.reduce((acc, r) => acc + Number(r.rating), 0) / bookRevs.length;
        if (avg < minRatingFilter) return false;
      }

      return true;
    });
  }

  let displayedBooks = applyFilters(books);
  if (activeTab === 'borrowed') displayedBooks = applyFilters(borrowedBooks);
  if (activeTab === 'owned') displayedBooks = applyFilters(ownedBooks);
  if (activeTab === 'saved') displayedBooks = applyFilters(savedBooks);

  const filteredWishlist = applyFilters(wishlistItems);
  const filteredReadHistory = applyFilters(readHistory, 'book_title', 'book_author');

  const activeFilterCount = (selectedOwnerFilter ? 1 : 0) + 
                            (selectedReaderFilter ? 1 : 0) + 
                            (minRatingFilter > 0 ? 1 : 0) + 
                            (availabilityFilter === 'available' ? 1 : 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 max-w-md mx-auto pb-24">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 pt-2">
        <Logo size="md" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNameModal(true)}
            className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-xl transition"
          >
            <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{profile?.display_name}</span>
          </button>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              localStorage.clear();
              window.location.href = '/login';
            }}
            className="text-slate-400 hover:text-red-500 p-1.5"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Circle Switcher Bar */}
      <CircleSelector 
        currentCircle={currentCircle} 
        circles={circles} 
        userId={user?.id} 
        onCircleChanged={(c) => { 
          setCurrentCircle(c); 
          fetchBooks(user?.id, c); 
        }}
        onCirclesUpdated={() => fetchCircles(user?.id)}
      />

      {/* NOTIFICATIONS */}
      {pendingRequests.map((reqBook) => (
        <div key={reqBook.id} className="mb-3 bg-indigo-600 text-white rounded-2xl p-4 shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Bell className="w-5 h-5 text-white flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold leading-tight line-clamp-1">{reqBook.next_holder?.display_name || 'A friend'} requested your book!</p>
              <p className="text-[11px] text-indigo-100 line-clamp-1">"{reqBook.title}"</p>
            </div>
          </div>
          <button onClick={() => confirmNotificationHandover(reqBook)} className="bg-white text-indigo-600 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 flex-shrink-0">
            <CheckCircle className="w-4 h-4" /> Confirm
          </button>
        </div>
      ))}

      {pendingReturns.map((retBook) => (
        <div key={retBook.id} className="mb-3 bg-purple-600 text-white rounded-2xl p-4 shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <PackageCheck className="w-5 h-5 text-white flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold leading-tight line-clamp-1">{retBook.holder?.display_name || 'Borrower'} returned your book!</p>
              <p className="text-[11px] text-purple-100 line-clamp-1">"{retBook.title}"</p>
            </div>
          </div>
          <button onClick={() => confirmNotificationReturn(retBook)} className="bg-white text-purple-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 flex-shrink-0">
            <CheckCircle className="w-4 h-4" /> Confirm
          </button>
        </div>
      ))}

      {returnRequestedForUser.map((reqReturnBook) => (
        <div key={reqReturnBook.id} className="mb-3 bg-amber-600 text-white rounded-2xl p-4 shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold leading-tight line-clamp-1">{reqReturnBook.owner?.display_name || 'Owner'} requested "{reqReturnBook.title}" back!</p>
              <p className="text-[11px] text-amber-100 line-clamp-1">Please return this book when possible.</p>
            </div>
          </div>
        </div>
      ))}

      {/* Tabs Switcher Bar */}
      <div className="grid grid-cols-6 bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-2xl mb-3 text-[9px] font-bold">
        <button onClick={() => setActiveTab('library')} className={`py-2 rounded-xl flex flex-col items-center gap-0.5 ${activeTab === 'library' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
          <BookOpen className="w-3.5 h-3.5" /> All
        </button>
        <button onClick={() => setActiveTab('borrowed')} className={`py-2 rounded-xl flex flex-col items-center gap-0.5 ${activeTab === 'borrowed' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
          <BookMarked className="w-3.5 h-3.5" /> Borrowing
        </button>
        <button onClick={() => setActiveTab('owned')} className={`py-2 rounded-xl flex flex-col items-center gap-0.5 ${activeTab === 'owned' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
          <Library className="w-3.5 h-3.5" /> Mine
        </button>
        <button onClick={() => setActiveTab('saved')} className={`py-2 rounded-xl flex flex-col items-center gap-0.5 ${activeTab === 'saved' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
          <Bookmark className="w-3.5 h-3.5" /> Saved
        </button>
        <button onClick={() => setActiveTab('wishlist')} className={`py-2 rounded-xl flex flex-col items-center gap-0.5 ${activeTab === 'wishlist' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
          <Heart className="w-3.5 h-3.5" /> Wishlist
        </button>
        <button onClick={() => setActiveTab('read')} className={`py-2 rounded-xl flex flex-col items-center gap-0.5 ${activeTab === 'read' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
          <CheckCircle2 className="w-3.5 h-3.5" /> Read
        </button>
      </div>

      {/* SEARCH + FILTER BUTTON BAR */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search titles or authors..."
            value={tabSearchQuery}
            onChange={(e) => setTabSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          {tabSearchQuery && (
            <button onClick={() => setTabSearchQuery('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Drawer Trigger Button */}
        <button
          onClick={() => setShowFilterModal(true)}
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
            activeFilterCount > 0
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-white text-indigo-600 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-extrabold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Feed List */}
      <div className="space-y-3">
        {activeTab === 'wishlist' ? (
          filteredWishlist.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">No wishlist items match</p>
            </div>
          ) : (
            filteredWishlist.map((item) => {
              const matchedCircleBook = books.find(b => b.title.toLowerCase() === item.title.toLowerCase() && b.owner_id !== user?.id);

              return (
                <div key={item.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col gap-3">
                  <div className="flex justify-between items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.cover_url ? (
                        <img src={item.cover_url} alt={item.title} className="w-12 h-18 object-cover rounded-lg flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-18 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-[9px] text-slate-400 flex-shrink-0">
                          No Cover
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-bold text-xs line-clamp-1">{item.title}</h3>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{item.author}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromWishlist(item.id)}
                      className="text-slate-400 hover:text-red-500 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition flex-shrink-0"
                    >
                      Remove
                    </button>
                  </div>

                  {matchedCircleBook ? (
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-emerald-800 dark:text-emerald-300">
                          {matchedCircleBook.owner?.display_name || 'A friend'} has this book!
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Status: {matchedCircleBook.status.replace('_', ' ')}</p>
                      </div>
                      <button
                        onClick={() => setSelectedBookForDetail(matchedCircleBook)}
                        className="bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] hover:bg-emerald-700 transition"
                      >
                        View & Request
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">No one in your circles owns this book yet.</span>
                  )}
                </div>
              );
            })
          )
        ) : activeTab === 'read' ? (
          filteredReadHistory.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">No books match filter criteria</p>
            </div>
          ) : (
            filteredReadHistory.map((item) => (
              <div 
                key={item.id} 
                onClick={() => item.book && setSelectedBookForDetail(item.book)}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex justify-between items-center gap-3 cursor-pointer hover:border-indigo-200 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.book?.cover_url ? (
                    <img src={item.book.cover_url} alt={item.book.title} className="w-12 h-18 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-18 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-[9px] text-slate-400 flex-shrink-0">
                      No Cover
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wider mb-1 inline-block">
                      Finished
                    </span>
                    <h3 className="font-bold text-xs line-clamp-1">{item.book?.title || 'Book'}</h3>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{item.book?.author || 'Author'}</p>
                  </div>
                </div>
              </div>
            ))
          )
        ) : displayedBooks.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">No books found matching your filters</p>
          </div>
        ) : (
          displayedBooks.map((book) => (
            <BookCard 
              key={book.id} 
              book={book} 
              currentUserId={user?.id}
              isSaved={savedBookIds.includes(book.title)}
              userActiveBorrowCount={userActiveBorrowCount}
              onUpdate={() => { 
                fetchBooks(user?.id); 
                fetchWishlist(user?.id); 
                fetchReadHistory(user?.id);
                fetchGlobalReviewsAndHistory();
              }}
              onToggleSave={toggleSaveForLater}
            />
          ))
        )}
      </div>

      {/* Floating Add Button */}
      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-6 right-6 sm:absolute bg-indigo-600 text-white p-4 rounded-full shadow-lg z-40">
        <Plus className="w-6 h-6" />
      </button>

      {/* Edit Name Modal */}
      {showNameModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-2xl p-5 shadow-xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base mb-1">Edit Display Name</h3>
            <p className="text-xs text-slate-500 mb-4">Change the name your friends see on books.</p>

            <form onSubmit={saveDisplayName} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Enter display name..."
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowNameModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 text-xs font-semibold py-2 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white text-xs font-semibold py-2 rounded-xl hover:bg-indigo-700 transition">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Book Search Modal */}
      <BookSearchModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        userId={user?.id} 
        onBookAdded={() => { 
          fetchBooks(user?.id); 
          fetchWishlist(user?.id); 
          fetchReadHistory(user?.id);
        }} 
      />

      {/* Filter Drawer Modal */}
      <FeedFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        ownersList={profilesMap}
        readersList={profilesMap}
        selectedOwner={selectedOwnerFilter}
        setSelectedOwner={setSelectedOwnerFilter}
        selectedReader={selectedReaderFilter}
        setSelectedReader={setSelectedReaderFilter}
        minRating={minRatingFilter}
        setMinRating={setMinRatingFilter}
        availabilityFilter={availabilityFilter}
        setAvailabilityFilter={setAvailabilityFilter}
        onReset={() => {
          setSelectedOwnerFilter('');
          setSelectedReaderFilter('');
          setMinRatingFilter(0);
          setAvailabilityFilter('all');
          setTabSearchQuery('');
        }}
      />

      {/* Book Detail Modal */}
      {selectedBookForDetail && (
        <BookDetailModal
          book={selectedBookForDetail}
          isOpen={!!selectedBookForDetail}
          onClose={() => setSelectedBookForDetail(null)}
          currentUserId={user?.id}
          onUpdate={() => {
            fetchBooks(user?.id);
            fetchReadHistory(user?.id);
            fetchGlobalReviewsAndHistory();
          }}
        />
      )}
    </div>
  );
}