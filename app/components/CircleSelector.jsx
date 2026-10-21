'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../utils/client';
import { Users, Plus, Check, ChevronDown, Share2, Trash2, Copy } from 'lucide-react';

export default function CircleSelector({ currentCircle, circles, userId, onCircleChanged, onCirclesUpdated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState('join'); // 'join' or 'create'
  const [circleName, setCircleName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const supabase = createClient();

  // Auto-join if user opens a shareable link ending in ?join=CODE
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');

    if (joinCode && userId) {
      autoJoinCircle(joinCode.toUpperCase());
    }
  }, [userId]);

  async function autoJoinCircle(code) {
    const { data: circle } = await supabase
      .from('circles')
      .select('*')
      .eq('invite_code', code)
      .single();

    if (circle) {
      const { error } = await supabase
        .from('circle_members')
        .insert({ circle_id: circle.id, user_id: userId });

      if (!error || error.code === '23505') {
        onCircleChanged(circle);
        onCirclesUpdated();
        // Clean URL query param
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }

  async function handleCircleAction(e) {
    e.preventDefault();
    setLoading(true);

    if (mode === 'create') {
      const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: circle, error } = await supabase
        .from('circles')
        .insert({ name: circleName.trim(), invite_code: generatedCode, created_by: userId })
        .select()
        .single();

      if (!error && circle) {
        await supabase.from('circle_members').insert({ circle_id: circle.id, user_id: userId });
        onCircleChanged(circle);
        onCirclesUpdated();
        setShowModal(false);
        setCircleName('');
      } else {
        alert(error?.message || "Failed to create circle");
      }
    } else {
      await autoJoinCircle(inviteCode.trim().toUpperCase());
      setShowModal(false);
      setInviteCode('');
    }

    setLoading(false);
  }

  async function deleteCircle(circleId, circleName) {
    const confirmDelete = confirm(`Are you sure you want to delete "${circleName}"? All members will be removed.`);
    if (!confirmDelete) return;

    const { error } = await supabase.from('circles').delete().eq('id', circleId);

    if (!error) {
      if (currentCircle?.id === circleId) onCircleChanged(null);
      onCirclesUpdated();
    } else {
      alert("Error deleting circle: " + error.message);
    }
  }

  function copyInviteLink(code) {
    const link = `${window.location.origin}/?join=${code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative mb-4">
      {/* Circle Switcher Bar */}
      <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200 flex-1 text-left"
        >
          <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>{currentCircle ? currentCircle.name : 'All My Circles'}</span>
          <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
        </button>

        {/* 1-Click Share Button for Active Circle */}
        {currentCircle && (
          <button
            onClick={() => copyInviteLink(currentCircle.invite_code)}
            className="mr-2 text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 text-[11px] font-semibold flex items-center gap-1 bg-white dark:bg-indigo-900/50 px-2 py-1 rounded-xl shadow-sm transition"
            title="Copy shareable join link"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Share2 className="w-3 h-3" />}
            {copied ? 'Link Copied!' : 'Share Link'}
          </button>
        )}

        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded-xl flex items-center gap-1 hover:bg-indigo-700 transition"
        >
          <Plus className="w-3.5 h-3.5" /> Circle
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-12 left-0 right-0 bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-xl border border-slate-200 dark:border-slate-800 z-30 space-y-1">
          <button
            onClick={() => { onCircleChanged(null); setIsOpen(false); }}
            className={`w-full text-left px-3 py-2 text-xs font-medium rounded-xl flex justify-between items-center ${
              !currentCircle ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>All Joined Circles</span>
            {!currentCircle && <Check className="w-3.5 h-3.5" />}
          </button>

          {circles.map((c) => {
            const isCreator = c.created_by === userId;
            return (
              <div
                key={c.id}
                className={`flex items-center justify-between px-3 py-1.5 rounded-xl transition ${
                  currentCircle?.id === c.id ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <button
                  onClick={() => { onCircleChanged(c); setIsOpen(false); }}
                  className="flex-1 text-left"
                >
                  <p className="font-bold text-xs">{c.name}</p>
                  <p className="text-[10px] text-slate-400">Code: {c.invite_code}</p>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copyInviteLink(c.invite_code)}
                    className="p-1 text-slate-400 hover:text-indigo-600"
                    title="Copy invite link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {isCreator && (
                    <button
                      onClick={() => deleteCircle(c.id, c.name)}
                      className="p-1 text-slate-400 hover:text-red-500"
                      title="Delete circle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Join Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-2xl p-5 shadow-xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4 text-xs font-bold">
              <button
                onClick={() => setMode('join')}
                className={`flex-1 py-1.5 rounded-lg transition ${mode === 'join' ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600' : 'text-slate-400'}`}
              >
                Join Circle
              </button>
              <button
                onClick={() => setMode('create')}
                className={`flex-1 py-1.5 rounded-lg transition ${mode === 'create' ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600' : 'text-slate-400'}`}
              >
                Create New
              </button>
            </div>

            <form onSubmit={handleCircleAction} className="space-y-3">
              {mode === 'create' ? (
                <input
                  type="text"
                  required
                  placeholder="Circle Name (e.g. Work Friends)"
                  value={circleName}
                  onChange={(e) => setCircleName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <input
                  type="text"
                  required
                  placeholder="Enter 6-letter Code or paste link..."
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-mono uppercase tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 text-white text-xs font-semibold py-2 rounded-xl hover:bg-indigo-700 transition"
                >
                  {loading ? 'Wait...' : mode === 'create' ? 'Create' : 'Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}