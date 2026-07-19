'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, X, Search, MapPin, Instagram, Facebook, Linkedin, Twitter, Mail, Phone, Trash2, Clock, Sparkles, Copy, Check, RefreshCw, LogOut, Star, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const STAGES = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'replied', label: 'Replied' },
  { key: 'demo', label: 'Demo booked' },
  { key: 'trial', label: 'Trial started' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
];

const SOURCES = [
  { key: 'google_maps', label: 'Google Maps', icon: MapPin, color: 'text-red-600 bg-red-50' },
  { key: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-600 bg-pink-50' },
  { key: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-600 bg-blue-50' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-sky-700 bg-sky-50' },
  { key: 'twitter', label: 'X / Twitter', icon: Twitter, color: 'text-slate-700 bg-slate-100' },
  { key: 'other', label: 'Other', icon: MapPin, color: 'text-gray-600 bg-gray-100' },
];

function sourceInfo(key) {
  return SOURCES.find((s) => s.key === key) || SOURCES[SOURCES.length - 1];
}

function daysAgo(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function Home() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFindModal, setShowFindModal] = useState(false);
  const [activeLead, setActiveLead] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.href = '/login';
        return;
      }
      setCheckingAuth(false);
      loadLeads();
    });
  }, []);

  async function loadLeads() {
    setLoading(true);
    setError('');
    const { data, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .order('date_added', { ascending: false });
    if (fetchError) {
      console.error('Could not load leads:', fetchError);
      setError('Could not load your pipeline. Try reloading.');
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  async function addLead(newLead) {
    const { data, error: insertError } = await supabase
      .from('leads')
      .insert({
        business_name: newLead.businessName,
        source: newLead.source,
        contact_type: newLead.contactType,
        contact_value: newLead.contactValue,
        email: newLead.email || null,
        social_media_link: newLead.socialMediaLink || null,
        notes: newLead.notes,
      })
      .select()
      .single();
    if (insertError) {
      console.error('Insert failed:', insertError);
      return { ok: false, message: insertError.message };
    }
    setLeads((prev) => [data, ...prev]);
    setShowAddModal(false);
    return { ok: true };
  }

  async function updateLead(updated) {
    const { data, error: updateError } = await supabase
      .from('leads')
      .update({
        notes: updated.notes,
        next_follow_up: updated.next_follow_up || null,
        stage: updated.stage,
        cold_email: updated.cold_email,
        follow_up_email: updated.follow_up_email,
        email: updated.email ?? null,
        social_media_link: updated.social_media_link ?? null,
        contact_value: updated.contact_value,
      })
      .eq('id', updated.id)
      .select()
      .single();
    if (updateError) {
      console.error('Update failed:', updateError);
      return { ok: false, message: updateError.message };
    }
    setLeads((prev) => prev.map((l) => (l.id === data.id ? data : l)));
    setActiveLead(data);
    return { ok: true };
  }

  async function deleteLead(id) {
    const { error: deleteError } = await supabase.from('leads').delete().eq('id', id);
    if (deleteError) {
      console.error('Delete failed:', deleteError);
      return { ok: false, message: deleteError.message };
    }
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setActiveLead(null);
    return { ok: true };
  }

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchesSearch = !search || l.business_name.toLowerCase().includes(search.toLowerCase());
      const matchesSource = sourceFilter === 'all' || l.source === sourceFilter;
      return matchesSearch && matchesSource;
    });
  }, [leads, search, sourceFilter]);

  const byStage = useMemo(() => {
    const map = {};
    for (const stage of STAGES) map[stage.key] = filtered.filter((l) => l.stage === stage.key);
    return map;
  }, [filtered]);

  if (checkingAuth || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading your pipeline...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Lead pipeline</h1>
            <p className="text-sm text-gray-500 mt-0.5">{leads.length} lead{leads.length === 1 ? '' : 's'} total</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFindModal(true)}
              className="flex items-center justify-center gap-1.5 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Search size={16} /> Find leads
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus size={16} /> Add lead
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 text-gray-500 text-sm px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-2.5 rounded-lg mb-4">{error}</div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by business name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          >
            <option value="all">All sources</option>
            {SOURCES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>

        {leads.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
            <p className="text-gray-900 font-medium mb-1">No leads yet</p>
            <p className="text-sm text-gray-500 mb-4">Add the first business you found on Google Maps or social media.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus size={16} /> Add your first lead
            </button>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STAGES.map((stage) => (
              <div key={stage.key} className="flex-shrink-0 w-72">
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{stage.label}</p>
                  <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">{byStage[stage.key].length}</span>
                </div>
                <div className="space-y-2 min-h-[40px]">
                  {byStage[stage.key].map((lead) => {
                    const src = sourceInfo(lead.source);
                    const Icon = src.icon;
                    const age = daysAgo(lead.date_added);
                    return (
                      <button
                        key={lead.id}
                        onClick={() => setActiveLead(lead)}
                        className="w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="text-sm font-medium text-gray-900 leading-snug">{lead.business_name}</p>
                          <span className={`shrink-0 rounded-full p-1 ${src.color}`}>
                            <Icon size={11} />
                          </span>
                        </div>
                        {lead.next_follow_up && (
                          <p className="text-xs text-amber-700 flex items-center gap-1 mb-1">
                            <Clock size={11} /> Follow up {new Date(lead.next_follow_up).toLocaleDateString()}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">{age === 0 ? 'Added today' : `Added ${age}d ago`}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} onAdd={addLead} />}
      {showFindModal && <FindLeadsModal onClose={() => setShowFindModal(false)} onAdd={addLead} />}
      {activeLead && (
        <LeadDetailModal lead={activeLead} onClose={() => setActiveLead(null)} onUpdate={updateLead} onDelete={deleteLead} />
      )}
    </div>
  );
}

function FindLeadsModal({ onClose, onAdd }) {
  const [businessType, setBusinessType] = useState('');
  const [city, setCity] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [results, setResults] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());
  const [addingId, setAddingId] = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    if (!businessType.trim() || !city.trim()) return;
    setSearching(true);
    setSearchError('');
    setResults(null);
    try {
      const res = await fetch('/api/find-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessType: businessType.trim(), city: city.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error || 'Search failed. Try again.');
      } else {
        setResults(data.results || []);
      }
    } catch (err) {
      console.error('Find leads search failed', err);
      setSearchError('Search failed. Try again.');
    }
    setSearching(false);
  }

  async function handleAdd(place) {
    setAddingId(place.placeId);
    const notes = place.reviews.length
      ? place.reviews.map((r) => `${r.rating} stars: ${r.text}`).join(String.fromCharCode(10, 10))
      : '';
    const result = await onAdd({
      businessName: place.name,
      source: 'google_maps',
      contactType: 'phone',
      contactValue: place.phone,
      notes,
    });
    if (result?.ok) setAddedIds((prev) => new Set(prev).add(place.placeId));
    setAddingId(null);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Find leads</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            type="text"
            required
            placeholder="Business type, e.g. med spa"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
          <input
            type="text"
            required
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
          <button
            type="submit"
            disabled={searching}
            className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Search
          </button>
        </form>

        {searchError && <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg mb-3">{searchError}</div>}

        {results && results.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No results found. Try a broader search.</p>
        )}

        {results && results.length > 0 && (
          <div className="space-y-3">
            {results.map((place) => (
              <div key={place.placeId} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{place.name}</p>
                    <p className="text-xs text-gray-500">{place.address}</p>
                  </div>
                  {place.rating != null && (
                    <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-1">
                      <Star size={11} className="fill-amber-500 text-amber-500" /> {place.rating} ({place.reviewCount})
                    </span>
                  )}
                </div>
                {place.reviews.length > 0 && (
                  <div className="space-y-1.5 mt-2 mb-2">
                    {place.reviews.slice(0, 3).map((r, i) => (
                      <p key={i} className={`text-xs rounded-lg px-2.5 py-2 ${r.rating <= 3 ? 'bg-red-50 text-red-900' : 'bg-gray-50 text-gray-600'}`}>
                        {r.rating} stars: {r.text.slice(0, 160)}{r.text.length > 160 ? '...' : ''}
                      </p>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => handleAdd(place)}
                  disabled={addingId === place.placeId || addedIds.has(place.placeId)}
                  className="w-full text-sm font-medium py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {addedIds.has(place.placeId) ? (
                    <>
                      <Check size={13} className="text-green-600" /> Added
                    </>
                  ) : addingId === place.placeId ? (
                    'Adding...'
                  ) : (
                    <>
                      <Plus size={13} /> Add to pipeline
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AddLeadModal({ onClose, onAdd }) {
  const [businessName, setBusinessName] = useState('');
  const [source, setSource] = useState('google_maps');
  const [contactType, setContactType] = useState('phone');
  const [contactValue, setContactValue] = useState('');
  const [email, setEmail] = useState('');
  const [socialMediaLink, setSocialMediaLink] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!businessName.trim()) return;
    setSaving(true);
    setLocalError('');
    const result = await onAdd({
      businessName: businessName.trim(),
      source,
      contactType,
      contactValue: contactValue.trim(),
      email: email.trim(),
      socialMediaLink: socialMediaLink.trim(),
      notes: notes.trim(),
    });
    if (!result?.ok) setLocalError(result?.message || 'Could not add this lead. Try again.');
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Add lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {localError && <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg mb-3">{localError}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Business name</label>
            <input type="text" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Sade's Supermarket" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Where you found them</label>
            <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10">
              {SOURCES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="w-28">
              <label className="text-xs font-medium text-gray-600 block mb-1">Contact via</label>
              <select value={contactType} onChange={(e) => setContactType(e.target.value)} className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10">
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="handle">Handle</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 block mb-1">Value</label>
              <input type="text" value={contactValue} onChange={(e) => setContactValue(e.target.value)} placeholder={contactType === 'email' ? 'name@business.com' : contactType === 'phone' ? '2348012345678' : '@theirhandle'} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@business.com" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 block mb-1">Social media link</label>
              <input type="text" value={socialMediaLink} onChange={(e) => setSocialMediaLink(e.target.value)} placeholder="instagram.com/business" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What you noticed about them, why they're a good fit" rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 resize-none" />
          </div>
          <button type="submit" disabled={saving || !businessName.trim()} className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50">
            {saving ? 'Adding...' : 'Add to pipeline'}
          </button>
        </form>
      </div>
    </div>
  );
}

function LeadDetailModal({ lead, onClose, onUpdate, onDelete }) {
  const [notes, setNotes] = useState(lead.notes || '');
  const [nextFollowUp, setNextFollowUp] = useState(lead.next_follow_up || '');
  const [contactValue, setContactValue] = useState(lead.contact_value || '');
  const [email, setEmail] = useState(lead.email || '');
  const [socialMediaLink, setSocialMediaLink] = useState(lead.social_media_link || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const [localError, setLocalError] = useState('');
  const [saving, setSaving] = useState(false);
  const src = sourceInfo(lead.source);
  const Icon = src.icon;

  async function handleStageChange(newStage) {
    setLocalError('');
    const result = await onUpdate({ ...lead, stage: newStage, notes, next_follow_up: nextFollowUp, contact_value: contactValue, email, social_media_link: socialMediaLink });
    if (!result?.ok) setLocalError(result?.message || 'Could not update the stage. Try again.');
  }

  async function handleSaveDetails() {
    setSaving(true);
    setLocalError('');
    const result = await onUpdate({ ...lead, notes, next_follow_up: nextFollowUp, contact_value: contactValue, email, social_media_link: socialMediaLink });
    if (!result?.ok) setLocalError(result?.message || 'Could not save. Try again.');
    setSaving(false);
  }

  async function handleDraft() {
    setDrafting(true);
    setDraftError('');
    try {
      const res = await fetch('/api/draft-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: lead.business_name, source: src.label, notes }),
      });
      const drafted = await res.json();
      if (!res.ok) {
        setDraftError(drafted.error || 'Could not draft the email just now.');
        setDrafting(false);
        return;
      }
      const result = await onUpdate({ ...lead, notes, next_follow_up: nextFollowUp, contact_value: contactValue, email, social_media_link: socialMediaLink, cold_email: drafted.coldEmail, follow_up_email: drafted.followUp });
      if (!result?.ok) setDraftError(result?.message || 'Drafted, but could not save it. Try again.');
    } catch (err) {
      console.error('Draft generation failed', err);
      setDraftError('Could not draft the email just now. Try again.');
    }
    setDrafting(false);
  }

  async function handleCopy(text, field) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 1500);
    } catch {
      // clipboard access denied, nothing more to do
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className={`rounded-full p-1.5 ${src.color}`}>
              <Icon size={13} />
            </span>
            <h2 className="text-base font-semibold text-gray-900">{lead.business_name}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Added {new Date(lead.date_added).toLocaleDateString()}</p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1 flex items-center gap-1">
              {lead.contact_type === 'phone' ? <Phone size={12} /> : lead.contact_type === 'email' ? <Mail size={12} /> : <Instagram size={12} />}
              {lead.contact_type === 'phone' ? 'Phone' : lead.contact_type === 'email' ? 'Contact email' : 'Handle'}
            </label>
            <input type="text" value={contactValue} onChange={(e) => setContactValue(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1 flex items-center gap-1">
              <Mail size={12} /> Email
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@business.com" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-gray-600 block mb-1">Social media link</label>
          <input type="text" value={socialMediaLink} onChange={(e) => setSocialMediaLink(e.target.value)} placeholder="instagram.com/business" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-gray-600 block mb-1.5">Stage</label>
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map((s) => (
              <button
                key={s.key}
                onClick={() => handleStageChange(s.key)}
                className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                  s.key === lead.stage ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-gray-600 block mb-1">Next follow-up</label>
          <input type="date" value={nextFollowUp || ''} onChange={(e) => setNextFollowUp(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 resize-none" />
        </div>

        <div className="mb-4 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-600">Cold email</label>
            <button onClick={handleDraft} disabled={drafting} className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50">
              {drafting ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {lead.cold_email ? 'Redraft' : 'Draft with notes'}
            </button>
          </div>
          {draftError && <p className="text-xs text-red-600 mb-2">{draftError}</p>}
          {!lead.cold_email && !drafting && (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2.5">
              Add a note about what you noticed, then draft a first email built from it, not a generic template.
            </p>
          )}
          {lead.cold_email && (
            <div className="space-y-2">
              <div className="bg-gray-50 rounded-lg p-3 relative">
                <p className="text-sm text-gray-700 whitespace-pre-wrap pr-6">{lead.cold_email}</p>
                <button onClick={() => handleCopy(lead.cold_email, 'cold')} className="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-700" aria-label="Copy cold email">
                  {copiedField === 'cold' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>
              </div>
              {lead.follow_up_email && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Follow-up, if no reply in ~5 days</p>
                  <div className="bg-gray-50 rounded-lg p-3 relative">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap pr-6">{lead.follow_up_email}</p>
                    <button onClick={() => handleCopy(lead.follow_up_email, 'followup')} className="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-700" aria-label="Copy follow-up email">
                      {copiedField === 'followup' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-400">Read it over before sending, this is a draft, not a final copy.</p>
            </div>
          )}
        </div>

        {localError && <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg mb-3">{localError}</div>}

        <div className="flex gap-2">
          <button onClick={handleSaveDetails} disabled={saving} className="flex-1 bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
          {confirmDelete ? (
            <button
              onClick={async () => {
                const result = await onDelete(lead.id);
                if (!result?.ok) setLocalError(result?.message || 'Could not delete. Try again.');
              }}
              className="text-sm font-medium text-red-600 border border-red-200 bg-red-50 px-3 py-2.5 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
            >
              <Trash2 size={14} /> Confirm
            </button>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-sm font-medium text-gray-500 border border-gray-200 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors" aria-label="Delete lead">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
