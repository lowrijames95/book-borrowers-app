'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../utils/client';
import BookDetailModal from './BookDetailModal.jsx';
import { Bookmark, BookmarkCheck, ArrowRight, CheckCircle, RotateCcw, PackageCheck, Check, Home, Users, X, ListOrdered, Trash2, UserCheck } from 'lucide-react';

export default function BookCard({ book, currentUserId, isSaved, userActiveBorrowCount, onUpdate, onToggleSave }) {
  const [queue, setQueue] = useState([]);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showLetGoModal, setShowLetGoModal] = useState(false);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const supabase = createClient();
  
  const isOwner = book.owner_id === currentUserId;
  const isCurrentHolder = book.current_holder_id === currentUserId;
  const isNextHolder = book.next_holder_id === currentUserId;

  const ownerName = book.owner?.display_name || 'Friend';
  const holderName = book.holder?.display_name || 'Friend';

  // Check queue position for current user
  const userQueuePosition = queue.findIndex(q => q.user_id === currentUserId) + 1;
  const isInQueue = userQueuePosition > 0;

  useEffect(() => {
    fetchQueue();
  }, [book.id]);

  async function fetchQueue() {
    const { data } = await supabase
      .from('queues')
      .select('*, profile:profiles!queues_user_id_fkey(display_name)')
      .eq('book_id', book.id)
      .order('position', { ascending: true });

    if (data) setQueue(data);
  }

  // Join Waiting List
  async function joinQueue() {
    setLoadingQueue(true);
    const nextPos = queue.length + 1;

    const { error } = await supabase.from('queues').insert({
      book_id: book.id,
      user_id: currentUserId,
      position: nextPos
    });

    if (error) {
      alert("Error joining queue: " + error.message);
    } else {
      fetchQueue();
      onUpdate();
    }
    setLoadingQueue(false);
  }

  // Leave Waiting List
  async function leaveQueue() {
    setLoadingQueue(true);
    const { error } = await supabase
      .from('queues')
      .delete()
      .eq('book_id', book.id)
      .eq('user_id', currentUserId);

    if (!error) {
      fetchQueue();
      onUpdate();
    }
    setLoadingQueue(false);
  }

  // 1. Owner Toggles Availability
  async function toggleAvailability() {
    const newStatus = book.status === 'AVAILABLE' ? 'NOT_AVAILABLE' : 'AVAILABLE';
    const { error } = await supabase.from('books').update({ status: newStatus }).eq('id', book.id);
    if (error) alert("Error: " + error.message);
    onUpdate();
  }

  // 2A. HARD DELETE FOR EVERYONE
  async function executeDeleteForEveryone() {
    setActionLoading(true);
    await supabase.from('queues').delete().eq('book_id', book.id);
    await supabase.from('reviews').delete().eq('book_id', book.id);
    await supabase.from('borrow_history').delete().eq('book_id', book.id);

    const { error } = await supabase.from('books').delete().eq('id', book.id);

    if (error) {
      alert("Error deleting book: " + error.message);
    } else {
      setShowLetGoModal(false);
      onUpdate();
    }
    setActionLoading(false);
  }

  // 2B. PASS OWNERSHIP TO CURRENT BORROWER
  async function executePassOwnership() {
    if (!book.current_holder_id || book.current_holder_id === currentUserId) {
      alert("No borrower is currently holding this book to pass ownership to.");
      return;
    }

    setActionLoading(true);
    const { error } = await supabase.from('books').update({
      owner_id: book.current_holder_id,
      status: 'AVAILABLE',
      next_holder_id: null
    }).eq('id', book.id);

    if (error) {
      alert("Error transferring ownership: " + error.message);
    } else {
      setShowLetGoModal(false);
      onUpdate();
    }
    setActionLoading(false);
  }

  // 3. Friend Requests Book
  async function requestBorrow() {
    if (userActiveBorrowCount >= 5) {
      alert("You have reached the maximum limit of 5 borrowed books at a time. Return a book to borrow more!");
      return;
    }

    const { error } = await supabase.from('books').update({ 
      status: 'IN_TRANSFER', 
      next_holder_id: currentUserId 
    }).eq('id', book.id);

    if (error) alert("Error requesting book: " + error.message);
    onUpdate();
  }

  // 4. Confirm Handover
  async function confirmHandover(keepForNext = false) {
    const { error } = await supabase.from('books').update({ 
      status: 'BORROWED', 
      current_holder_id: book.next_holder_id,
      next_holder_id: null,
      allow_keep_for_next: keepForNext
    }).eq('id', book.id);

    if (error) alert("Handover Error: " + error.message);
    onUpdate();
  }

  // 5. Borrower Taps "Finished Reading"
  async function finishedReading() {
    await supabase.from('borrow_history').insert({
      book_id: book.id,
      user_id: currentUserId
    });

    if (queue.length > 0) {
      const nextUser = queue[0];
      await supabase.from('books').update({
        status: 'IN_TRANSFER',
        next_holder_id: nextUser.user_id
      }).eq('id', book.id);

      await supabase.from('queues').delete().eq('id', nextUser.id);
    } else {
      const targetStatus = book.allow_keep_for_next ? 'HELD_FOR_NEXT' : 'RETURN_PENDING';
      const targetNextHolder = book.allow_keep_for_next ? null : book.owner_id;

      await supabase.from('books').update({ 
        status: targetStatus,
        next_holder_id: targetNextHolder
      }).eq('id', book.id);
    }
    onUpdate();
  }

  // 6. Borrower Initiates Return
  async function initiateReturn() {
    const { error } = await supabase.from('books').update({ 
      status: 'RETURN_PENDING',
      next_holder_id: book.owner_id
    }).eq('id', book.id);

    if (error) alert("Error initiating return: " + error.message);
    onUpdate();
  }

  // 7. Owner Forces "Request Return Home"
  async function ownerRequestReturn() {
    const { error } = await supabase.from('books').update({ 
      status: 'RETURN_PENDING',
      next_holder_id: book.owner_id
    }).eq('id', book.id);

    if (error) alert("Error requesting return: " + error.message);
    onUpdate();
  }

  // 8. Owner Confirms Book Received Back
  async function confirmReturnReceived() {
    if (book.current_holder_id && book.current_holder_id !== book.owner_id) {
      await supabase.from('borrow_history').insert({
        book_id: book.id,
        user_id: book.current_holder_id
      });
    }

    const { error } = await supabase.from('books').update({ 
      status: 'AVAILABLE', 
      current_holder_id: book.owner_id,
      next_holder_id: null,
      allow_keep_for_next: false
    }).eq('id', book.id);

    if (error) alert("Error confirming return: " + error.message);
    onUpdate();
  }

  const hasBorrowerToTransfer = book.current_holder_id && book.current_holder_id !== currentUserId;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex gap-4 relative">
      
      {/* Clickable Cover & Details */}
      <div 
        onClick={() => setShowDetailModal(true)} 
        className="flex gap-3 cursor-pointer flex-1 min-w-0"
      >
        {book.cover_url ? (
          <img src={book.cover_url} alt={book.title} className="w-16 h-24 object-cover rounded-lg flex-shrink-0 shadow-sm" />
        ) : (
          <div className="w-16 h-24 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-[10px] text-slate-400 flex-shrink-0">
            No Cover
          </div>
        )}

        <div className="flex flex-col justify-between flex-1 min-w-0 pr-6">
          <div>
            <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                book.status === 'AVAILABLE' || book.status === 'HELD_FOR_NEXT' ? 'bg-emerald-100 text-emerald-700' :
                book.status === 'BORROWED' ? 'bg-amber-100 text-amber-700' :
                book.status === 'IN_TRANSFER' ? 'bg-indigo-100 text-indigo-700 animate-pulse' :
                book.status === 'RETURN_PENDING' ? 'bg-purple-100 text-purple-700 animate-pulse' :
                'bg-slate-100 text-slate-600'
              }`}>
                {book.status === 'IN_TRANSFER' ? 'Handover Pending' : 
                 book.status === 'RETURN_PENDING' ? 'Return Pending' : 
                 book.status === 'HELD_FOR_NEXT' ? 'Available (With Holder)' :
                 book.status.replace('_', ' ')}
              </span>

              {queue.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowQueueModal(true); }}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
                >
                  <Users className="w-3 h-3" /> {queue.length} in queue
                </button>
              )}
            </div>

            <h3 className="font-bold text-sm line-clamp-1 hover:text-indigo-600 transition">{book.title}</h3>
            <p className="text-xs text-slate-500 line-clamp-1">{book.author}</p>

            <p className="text-[11px] text-slate-400 mt-1.5">
              Owner: <span className="font-medium text-slate-600 dark:text-slate-300">{isOwner ? 'You' : ownerName}</span>
              {(book.status === 'BORROWED' || book.status === 'HELD_FOR_NEXT' || book.status === 'RETURN_PENDING') && (
                <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                  Currently with: {isCurrentHolder ? 'You' : holderName}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Bookmark Save Button */}
      {!isOwner && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSave(book); }}
          className="absolute top-3 right-3 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition z-10"
        >
          {isSaved ? (
            <BookmarkCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 fill-indigo-600/20" />
          ) : (
            <Bookmark className="w-5 h-5" />
          )}
        </button>
      )}

      {/* Action Buttons Row */}
      <div className="absolute bottom-4 right-4 left-24 sm:left-auto sm:w-52 z-10">
        {/* 1. OWNER CONTROLS WHEN BOOK IS AVAILABLE/NOT_AVAILABLE */}
        {isOwner && (book.status === 'AVAILABLE' || book.status === 'NOT_AVAILABLE') && (
          <div className="flex gap-1.5">
            <button
              onClick={toggleAvailability}
              className={`flex-1 text-[11px] font-medium py-1.5 px-2 rounded-xl transition ${
                book.status === 'AVAILABLE'
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
              }`}
            >
              {book.status === 'AVAILABLE' ? 'Pause' : 'Available'}
            </button>

            <button
              onClick={() => setShowLetGoModal(true)}
              className="bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-600 text-[11px] font-medium py-1.5 px-2 rounded-xl transition"
            >
              Let Go
            </button>
          </div>
        )}

        {/* 2. OWNER CONTROLS WHEN BOOK IS BEING BORROWED */}
        {isOwner && !isCurrentHolder && (book.status === 'BORROWED' || book.status === 'HELD_FOR_NEXT') && (
          <div className="flex gap-1.5">
            <button
              onClick={ownerRequestReturn}
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium py-1.5 px-2 rounded-xl hover:bg-slate-200 transition text-center"
            >
              <Home className="w-3 h-3 inline mr-1" /> Request Return
            </button>

            <button
              onClick={() => setShowLetGoModal(true)}
              className="bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-600 text-[11px] font-medium py-1.5 px-2 rounded-xl transition"
            >
              Let Go
            </button>
          </div>
        )}

        {/* 3. BORROWER / FRIEND ACTIONS */}
        {!isOwner && !isCurrentHolder && (book.status === 'AVAILABLE' || book.status === 'HELD_FOR_NEXT') && (
          <button
            onClick={requestBorrow}
            className="w-full bg-indigo-600 text-white text-xs font-semibold py-1.5 px-3 rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-1 shadow-sm"
          >
            Request Borrow <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {!isOwner && !isCurrentHolder && !isNextHolder && 
         (book.status === 'BORROWED' || book.status === 'IN_TRANSFER' || book.status === 'NOT_AVAILABLE') && (
          isInQueue ? (
            <button
              onClick={leaveQueue}
              disabled={loadingQueue}
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold py-1.5 px-3 rounded-xl hover:bg-red-50 hover:text-red-600 transition"
            >
              In Queue (#{userQueuePosition}) • Leave
            </button>
          ) : (
            <button
              onClick={joinQueue}
              disabled={loadingQueue}
              className="w-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 text-xs font-semibold py-1.5 px-3 rounded-xl hover:bg-indigo-100 transition flex items-center justify-center gap-1"
            >
              <ListOrdered className="w-3.5 h-3.5" /> Join Waiting List
            </button>
          )
        )}

        {isCurrentHolder && book.status === 'IN_TRANSFER' && (
          <div className="flex gap-1.5">
            <button
              onClick={() => confirmHandover(false)}
              className="flex-1 bg-emerald-600 text-white text-[11px] font-semibold py-1.5 px-2 rounded-xl hover:bg-emerald-700 transition"
            >
              Passed Book
            </button>
            {isOwner && (
              <button
                onClick={() => confirmHandover(true)}
                className="flex-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 text-[11px] font-semibold py-1.5 px-2 rounded-xl"
              >
                Allow Keep
              </button>
            )}
          </div>
        )}

        {isCurrentHolder && !isOwner && book.status === 'BORROWED' && (
          <button
            onClick={finishedReading}
            className="w-full bg-amber-600 text-white text-xs font-semibold py-1.5 px-3 rounded-xl hover:bg-amber-700 transition flex items-center justify-center gap-1"
          >
            <Check className="w-3.5 h-3.5" /> Finished Reading
          </button>
        )}

        {isCurrentHolder && !isOwner && book.status === 'HELD_FOR_NEXT' && (
          <button
            onClick={initiateReturn}
            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold py-1.5 px-3 rounded-xl hover:bg-slate-200 transition flex items-center justify-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Return to Owner
          </button>
        )}

        {isOwner && book.status === 'RETURN_PENDING' && (
          <button
            onClick={confirmReturnReceived}
            className="w-full bg-purple-600 text-white text-xs font-semibold py-1.5 px-3 rounded-xl hover:bg-purple-700 transition flex items-center justify-center gap-1"
          >
            <PackageCheck className="w-3.5 h-3.5" /> Confirm Received
          </button>
        )}
      </div>

      {/* "LET GO" CHOICE MODAL */}
      {showLetGoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-2xl p-5 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Let Go of Book</h3>
              <button onClick={() => setShowLetGoModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 mb-4">
              Choose how you want to release <span className="font-bold text-slate-700 dark:text-slate-300">"{book.title}"</span>:
            </p>

            <div className="space-y-2">
              {/* Option A: Pass Ownership */}
              {hasBorrowerToTransfer ? (
                <button
                  onClick={executePassOwnership}
                  disabled={actionLoading}
                  className="w-full bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 p-3 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition"
                >
                  <UserCheck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <div>
                    <p className="leading-tight">Pass Ownership to {holderName}</p>
                    <p className="text-[10px] text-indigo-400 font-normal">Make them the official new owner.</p>
                  </div>
                </button>
              ) : null}

              {/* Option B: Delete for Everyone */}
              <button
                onClick={executeDeleteForEveryone}
                disabled={actionLoading}
                className="w-full bg-red-50 hover:bg-red-100 text-red-700 p-3 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition"
              >
                <Trash2 className="w-4 h-4 text-red-600 flex-shrink-0" />
                <div>
                  <p className="leading-tight">Delete for Everyone</p>
                  <p className="text-[10px] text-red-500 font-normal">Remove book completely from library.</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WAITING LIST MODAL */}
      {showQueueModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-2xl p-5 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <ListOrdered className="w-4 h-4 text-indigo-600" /> Waiting List
              </h3>
              <button onClick={() => setShowQueueModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-[11px] text-slate-500 mb-3">"{book.title}"</p>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {queue.map((q, idx) => (
                <div key={q.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                      #{idx + 1}
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {q.profile?.display_name || 'Friend'} {q.user_id === currentUserId ? '(You)' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BOOK DETAIL MODAL */}
      <BookDetailModal
        book={book}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        currentUserId={currentUserId}
        onUpdate={onUpdate}
      />
    </div>
  );
}