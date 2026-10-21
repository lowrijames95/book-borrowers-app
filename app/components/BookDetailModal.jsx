'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../utils/client';
import { X, Star, Users, History, Bookmark, User, MessageSquare, Send, Trash2, CheckCircle2 } from 'lucide-react';

export default function BookDetailModal({ book, isOpen, onClose, currentUserId, onUpdate }) {
  const [reviews, setReviews] = useState([]);
  const [history, setHistory] = useState([]);
  const [savedUsers, setSavedUsers] = useState([]);
  const [queue, setQueue] = useState([]);

  // Review Form State
  const [userRating, setUserRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);

  const supabase = createClient();
  const bookId = book?.id;

  const hasUserRead = history.some(h => h.user_id === currentUserId);

  useEffect(() => {
    if (isOpen && bookId) {
      fetchBookDetails();
    }
  }, [isOpen, bookId]);

  async function fetchBookDetails() {
    if (!bookId) return;

    // 1. Fetch Reviews
    const { data: revs } = await supabase
      .from('reviews')
      .select('*, profile:profiles!reviews_user_id_fkey(display_name)')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false });

    if (revs) {
      setReviews(revs);
      const myReview = revs.find(r => r.user_id === currentUserId);
      if (myReview) {
        setUserRating(Number(myReview.rating));
        setReviewText(myReview.review_text || '');
        setHasExistingReview(true);
      } else {
        setHasExistingReview(false);
        setUserRating(5);
        setReviewText('');
      }
    }

    // 2. Fetch Borrow / Reader History
    const { data: hist } = await supabase
      .from('borrow_history')
      .select('*, profile:profiles!borrow_history_user_id_fkey(display_name)')
      .eq('book_id', bookId)
      .order('read_at', { ascending: false });
    if (hist) setHistory(hist);

    // 3. Fetch Saved Users
    const { data: saved } = await supabase
      .from('wishlists')
      .select('*, profile:profiles!wishlists_user_id_fkey(display_name)')
      .eq('title', book.title);
    if (saved) setSavedUsers(saved);

    // 4. Fetch Queue
    const { data: q } = await supabase
      .from('queues')
      .select('*, profile:profiles!queues_user_id_fkey(display_name)')
      .eq('book_id', bookId)
      .order('position', { ascending: true });
    if (q) setQueue(q);
  }

  // Toggle "I've Read This" manually without borrowing
  async function toggleHasRead() {
    if (hasUserRead) {
      await supabase
        .from('borrow_history')
        .delete()
        .eq('book_id', bookId)
        .eq('user_id', currentUserId);
    } else {
      await supabase
        .from('borrow_history')
        .insert({ book_id: bookId, user_id: currentUserId });
    }
    fetchBookDetails();
    onUpdate();
  }

  async function handleAddReview(e) {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.from('reviews').upsert({
      book_id: bookId,
      user_id: currentUserId,
      rating: userRating,
      review_text: reviewText.trim()
    });

    if (!error) {
      if (!hasUserRead) {
        await supabase.from('borrow_history').insert({ book_id: bookId, user_id: currentUserId });
      }
      fetchBookDetails();
      onUpdate();
    } else {
      alert("Error saving review: " + error.message);
    }
    setSubmitting(false);
  }

  // DELETE REVIEW FUNCTION
  async function handleDeleteReview() {
    const confirmDelete = confirm("Are you sure you want to delete your review?");
    if (!confirmDelete) return;

    setSubmitting(true);
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('book_id', bookId)
      .eq('user_id', currentUserId);

    if (!error) {
      setUserRating(5);
      setReviewText('');
      setHasExistingReview(false);
      fetchBookDetails();
      onUpdate();
    } else {
      alert("Error deleting review: " + error.message);
    }
    setSubmitting(false);
  }

  if (!isOpen || !book) return null;

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + Number(r.rating), 0) / reviews.length).toFixed(1) 
    : null;

  function StarRatingDisplay({ rating, size = "w-3.5 h-3.5" }) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) {
        stars.push(<Star key={i} className={`${size} fill-amber-400 text-amber-400`} />);
      } else if (rating >= i - 0.5) {
        stars.push(
          <div key={i} className="relative inline-block">
            <Star className={`${size} text-slate-300 dark:text-slate-600`} />
            <div className="absolute top-0 left-0 w-1/2 overflow-hidden">
              <Star className={`${size} fill-amber-400 text-amber-400`} />
            </div>
          </div>
        );
      } else {
        stars.push(<Star key={i} className={`${size} text-slate-300 dark:text-slate-600`} />);
      }
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
  }

  const activeRating = hoverRating !== null ? hoverRating : userRating;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-3">
            {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} className="w-16 h-24 object-cover rounded-xl shadow-md" />
            ) : (
              <div className="w-16 h-24 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-xs text-slate-400">No Cover</div>
            )}
            <div>
              <h2 className="font-extrabold text-base line-clamp-2">{book.title}</h2>
              <p className="text-xs text-slate-500 mb-1.5">{book.author}</p>
              
              {avgRating ? (
                <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-lg text-xs font-bold w-max">
                  <StarRatingDisplay rating={parseFloat(avgRating)} size="w-3.5 h-3.5" />
                  <span>{avgRating} ({reviews.length})</span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-400">No reviews yet</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick "I've Read This" Button */}
        <button
          onClick={toggleHasRead}
          className={`w-full py-2 px-3 mb-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            hasUserRead 
              ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <CheckCircle2 className={`w-4 h-4 ${hasUserRead ? 'text-emerald-600' : 'text-slate-400'}`} />
          {hasUserRead ? "You've marked this as read! (Tap to undo)" : "I've read this book before"}
        </button>

        {/* Status Breakdown */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl mb-4 space-y-2 text-xs">
          <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
            <span className="text-slate-400 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-indigo-500" /> Owner</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{book.owner?.display_name || 'Friend'}</span>
          </div>

          <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
            <span className="text-slate-400 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-amber-500" /> Currently With</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{book.holder?.display_name || 'Owner'}</span>
          </div>

          <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
            <span className="text-slate-400 flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-indigo-500" /> Next in Queue</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {queue.length > 0 ? queue[0].profile?.display_name : 'No waiting list'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400 flex items-center gap-1.5"><Bookmark className="w-3.5 h-3.5 text-emerald-500" /> Saved For Later</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{savedUsers.length} friends</span>
          </div>
        </div>

        {/* Past Readers List */}
        <div className="mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" /> Read in the Past
          </h3>
          {history.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No readers recorded yet. Be the first to mark it as read!</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {history.map((h) => (
                <span key={h.id} className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] px-2.5 py-1 rounded-xl font-medium">
                  ✓ {h.profile?.display_name} {h.user_id === currentUserId ? '(You)' : ''}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Friend Reviews
          </h3>

          <form onSubmit={handleAddReview} className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl mb-4 space-y-2.5">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {hasExistingReview ? 'Edit your review' : 'Rate this book'}
              </p>
              <span className="text-xs font-extrabold text-amber-500">{activeRating} / 5</span>
            </div>
            
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((starIndex) => {
                const halfVal = starIndex - 0.5;
                const fullVal = starIndex;

                return (
                  <div key={starIndex} className="relative flex items-center cursor-pointer">
                    <div
                      className="w-2.5 h-5 z-10"
                      onClick={() => setUserRating(halfVal)}
                      onMouseEnter={() => setHoverRating(halfVal)}
                      onMouseLeave={() => setHoverRating(null)}
                    />
                    <div
                      className="w-2.5 h-5 z-10"
                      onClick={() => setUserRating(fullVal)}
                      onMouseEnter={() => setHoverRating(fullVal)}
                      onMouseLeave={() => setHoverRating(null)}
                    />

                    <div className="absolute inset-0 pointer-events-none">
                      {activeRating >= fullVal ? (
                        <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                      ) : activeRating >= halfVal ? (
                        <div className="relative inline-block">
                          <Star className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                          <div className="absolute top-0 left-0 w-1/2 overflow-hidden">
                            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                          </div>
                        </div>
                      ) : (
                        <Star className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <input
              type="text"
              placeholder="Write a quick recommendation or genuine review..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-indigo-600 text-white text-xs font-semibold py-2 rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-1"
              >
                <Send className="w-3.5 h-3.5" /> {hasExistingReview ? 'Update Review' : 'Post Review'}
              </button>

              {/* DELETE REVIEW BUTTON */}
              {hasExistingReview && (
                <button
                  type="button"
                  onClick={handleDeleteReview}
                  disabled={submitting}
                  className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1"
                  title="Delete review"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>

          <div className="space-y-2.5">
            {reviews.map((rev) => (
              <div key={rev.id} className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs">{rev.profile?.display_name || 'Friend'} {rev.user_id === currentUserId ? '(You)' : ''}</span>
                  <StarRatingDisplay rating={Number(rev.rating)} size="w-3.5 h-3.5" />
                </div>
                {rev.review_text && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{rev.review_text}</p>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}