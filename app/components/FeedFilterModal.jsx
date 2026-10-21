'use client';

import { X, Filter, RotateCcw, Star, User, Users, CheckCircle2 } from 'lucide-react';

export default function FeedFilterModal({ 
  isOpen, 
  onClose, 
  ownersList, 
  readersList, 
  selectedOwner, 
  setSelectedOwner, 
  selectedReader, 
  setSelectedReader, 
  minRating, 
  setMinRating,
  availabilityFilter,
  setAvailabilityFilter,
  onReset 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-extrabold text-base flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" /> Filter Books
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* 1. AVAILABILITY STATUS FILTER */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Availability
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAvailabilityFilter('all')}
                className={`py-2 rounded-xl text-xs font-bold transition border ${
                  availabilityFilter === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200'
                }`}
              >
                All Statuses
              </button>
              <button
                type="button"
                onClick={() => setAvailabilityFilter('available')}
                className={`py-2 rounded-xl text-xs font-bold transition border ${
                  availabilityFilter === 'available'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200'
                }`}
              >
                Available Now
              </button>
            </div>
          </div>

          {/* 2. FILTER BY OWNER */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-indigo-500" /> Owned By
            </label>
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="">All Owners</option>
              {ownersList.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. FILTER BY PAST READER */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-emerald-500" /> Read By
            </label>
            <select
              value={selectedReader}
              onChange={(e) => setSelectedReader(e.target.value)}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="">Anyone</option>
              {readersList.map((reader) => (
                <option key={reader.id} value={reader.id}>
                  {reader.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. FILTER BY MINIMUM RATING */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Minimum Rating
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[0, 3, 4, 4.5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMinRating(val)}
                  className={`py-1.5 rounded-xl text-xs font-bold transition border ${
                    minRating === val
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200'
                  }`}
                >
                  {val === 0 ? 'Any' : `${val}+ ★`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 pt-5 border-t border-slate-100 dark:border-slate-800 mt-5">
          <button
            onClick={onReset}
            className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-indigo-600 text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-indigo-700 transition"
          >
            Apply Filters
          </button>
        </div>

      </div>
    </div>
  );
}