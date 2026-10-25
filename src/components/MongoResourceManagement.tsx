import { useCallback, useEffect, useState } from 'react';
import { Building2, Calendar, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import { useMongoAuth } from '../contexts/useMongoAuth';

interface BankRecord {
  _id: string;
  name: string;
  status: string;
  location?: { coordinates?: number[]; address?: string; city?: string };
  contact?: { phone?: string; email?: string; website?: string };
  hours?: string;
}

interface CampRecord {
  _id: string;
  name: string;
  status: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: { coordinates?: number[]; address?: string; venue?: string };
  contactInfo?: { phone?: string; email?: string };
  capacity?: number;
}

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200';
const initialBank = { name: '', address: '', city: '', longitude: '', latitude: '', phone: '', email: '', website: '', hours: '24/7' };
const initialCamp = { name: '', description: '', address: '', venue: '', longitude: '', latitude: '', date: '', startTime: '', endTime: '', phone: '', email: '', capacity: '' };

export function MongoResourceManagement() {
  const { token, user } = useMongoAuth();
  const [banks, setBanks] = useState<BankRecord[]>([]);
  const [camps, setCamps] = useState<CampRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [formType, setFormType] = useState<'bank' | 'camp' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState(initialBank);
  const [campForm, setCampForm] = useState(initialCamp);

  const loadResources = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [bankData, campData] = await Promise.all([
        api.bloodBanks.getManaged(token),
        api.camps.getManaged(token)
      ]);
      setBanks(bankData);
      setCamps(campData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load managed resources.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void loadResources(); }, [loadResources]);

  const locationDefaults = () => ({
    longitude: user?.location?.coordinates?.[0]?.toString() ?? '',
    latitude: user?.location?.coordinates?.[1]?.toString() ?? ''
  });

  const startNew = (type: 'bank' | 'camp') => {
    setError('');
    setNotice('');
    setEditingId(null);
    const coords = locationDefaults();
    setBankForm({ ...initialBank, ...coords, address: user?.location?.address ?? '', city: user?.location?.city ?? '' });
    setCampForm({ ...initialCamp, ...coords, address: user?.location?.address ?? '' });
    setFormType(type);
  };

  const startEditBank = (bank: BankRecord) => {
    setError('');
    setNotice('');
    setEditingId(bank._id);
    setBankForm({
      name: bank.name ?? '', address: bank.location?.address ?? '', city: bank.location?.city ?? '',
      longitude: bank.location?.coordinates?.[0]?.toString() ?? '', latitude: bank.location?.coordinates?.[1]?.toString() ?? '',
      phone: bank.contact?.phone ?? '', email: bank.contact?.email ?? '', website: bank.contact?.website ?? '', hours: bank.hours ?? ''
    });
    setFormType('bank');
  };

  const startEditCamp = (camp: CampRecord) => {
    setError('');
    setNotice('');
    setEditingId(camp._id);
    setCampForm({
      name: camp.name ?? '', description: camp.description ?? '', address: camp.location?.address ?? '', venue: camp.location?.venue ?? '',
      longitude: camp.location?.coordinates?.[0]?.toString() ?? '', latitude: camp.location?.coordinates?.[1]?.toString() ?? '',
      date: camp.date ? camp.date.slice(0, 10) : '', startTime: camp.startTime ?? '', endTime: camp.endTime ?? '',
      phone: camp.contactInfo?.phone ?? '', email: camp.contactInfo?.email ?? '', capacity: camp.capacity?.toString() ?? ''
    });
    setFormType('camp');
  };

  const removeResource = async (type: 'bank' | 'camp', id: string) => {
    if (!token || !window.confirm(`Delete this ${type === 'bank' ? 'blood bank' : 'donation camp'}?`)) return;
    setBusy(true);
    setError('');
    try {
      if (type === 'bank') await api.bloodBanks.delete(id, token);
      else await api.camps.delete(id, token);
      setNotice('Resource deleted.');
      await loadResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete resource.');
    } finally {
      setBusy(false);
    }
  };

  const submitBank = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    const longitude = Number(bankForm.longitude);
    const latitude = Number(bankForm.latitude);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      setError('Enter valid longitude and latitude coordinates.');
      return;
    }
    const data = {
      name: bankForm.name.trim(),
      location: { type: 'Point', coordinates: [longitude, latitude], address: bankForm.address.trim(), city: bankForm.city.trim() },
      contact: { phone: bankForm.phone.trim(), email: bankForm.email.trim(), website: bankForm.website.trim() },
      hours: bankForm.hours.trim()
    };
    setBusy(true);
    setError('');
    try {
      if (editingId) await api.bloodBanks.update(editingId, data, token);
      else await api.bloodBanks.create(data, token);
      setFormType(null);
      setEditingId(null);
      setNotice(editingId ? 'Blood bank updated.' : 'Blood bank submitted for review.');
      await loadResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save blood bank.');
    } finally {
      setBusy(false);
    }
  };

  const submitCamp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    const longitude = Number(campForm.longitude);
    const latitude = Number(campForm.latitude);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      setError('Enter valid longitude and latitude coordinates.');
      return;
    }
    const data = {
      name: campForm.name.trim(), description: campForm.description.trim(), date: campForm.date,
      startTime: campForm.startTime, endTime: campForm.endTime,
      location: { type: 'Point', coordinates: [longitude, latitude], address: campForm.address.trim(), venue: campForm.venue.trim() },
      contactInfo: { phone: campForm.phone.trim(), email: campForm.email.trim() },
      ...(campForm.capacity ? { capacity: Number(campForm.capacity) } : {})
    };
    setBusy(true);
    setError('');
    try {
      if (editingId) await api.camps.update(editingId, data, token);
      else await api.camps.create(data, token);
      setFormType(null);
      setEditingId(null);
      setNotice(editingId ? 'Donation camp updated.' : 'Donation camp submitted for review.');
      await loadResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save donation camp.');
    } finally {
      setBusy(false);
    }
  };

  const closeForm = () => { setFormType(null); setEditingId(null); setError(''); };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manage blood banks and camps</h2>
          <p className="mt-1 text-sm text-gray-600">
            Hospitals manage resources they created. Administrators can manage all resources. New entries are submitted for admin review.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => startNew('bank')} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700">
            <Plus size={18} /> Add blood bank
          </button>
          <button type="button" onClick={() => startNew('camp')} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700">
            <Plus size={18} /> Add donation camp
          </button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</div>}

      {formType && (
        <form onSubmit={formType === 'bank' ? submitBank : submitCamp} className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit' : 'Add'} {formType === 'bank' ? 'blood bank' : 'donation camp'}</h3>
            <button type="button" aria-label="Close form" onClick={closeForm} className="rounded p-1 text-gray-500 hover:bg-gray-200"><X size={20} /></button>
          </div>
          {formType === 'bank' ? (
            <>
              <input className={inputClass} required placeholder="Blood bank name" value={bankForm.name} onChange={e => setBankForm({ ...bankForm, name: e.target.value })} />
              <div className="grid gap-3 md:grid-cols-2">
                <input className={inputClass} required placeholder="Address" value={bankForm.address} onChange={e => setBankForm({ ...bankForm, address: e.target.value })} />
                <input className={inputClass} placeholder="City" value={bankForm.city} onChange={e => setBankForm({ ...bankForm, city: e.target.value })} />
                <input className={inputClass} required type="number" step="any" placeholder="Longitude" value={bankForm.longitude} onChange={e => setBankForm({ ...bankForm, longitude: e.target.value })} />
                <input className={inputClass} required type="number" step="any" placeholder="Latitude" value={bankForm.latitude} onChange={e => setBankForm({ ...bankForm, latitude: e.target.value })} />
                <input className={inputClass} placeholder="Phone" value={bankForm.phone} onChange={e => setBankForm({ ...bankForm, phone: e.target.value })} />
                <input className={inputClass} type="email" placeholder="Email" value={bankForm.email} onChange={e => setBankForm({ ...bankForm, email: e.target.value })} />
                <input className={inputClass} placeholder="Website" value={bankForm.website} onChange={e => setBankForm({ ...bankForm, website: e.target.value })} />
                <input className={inputClass} placeholder="Opening hours" value={bankForm.hours} onChange={e => setBankForm({ ...bankForm, hours: e.target.value })} />
              </div>
            </>
          ) : (
            <>
              <input className={inputClass} required placeholder="Camp name" value={campForm.name} onChange={e => setCampForm({ ...campForm, name: e.target.value })} />
              <textarea className={inputClass} rows={3} placeholder="Description" value={campForm.description} onChange={e => setCampForm({ ...campForm, description: e.target.value })} />
              <div className="grid gap-3 md:grid-cols-2">
                <input className={inputClass} required type="date" min={new Date().toISOString().slice(0, 10)} value={campForm.date} onChange={e => setCampForm({ ...campForm, date: e.target.value })} />
                <input className={inputClass} placeholder="Venue" value={campForm.venue} onChange={e => setCampForm({ ...campForm, venue: e.target.value })} />
                <input className={inputClass} placeholder="Address" value={campForm.address} onChange={e => setCampForm({ ...campForm, address: e.target.value })} />
                <input className={inputClass} required type="number" step="any" placeholder="Longitude" value={campForm.longitude} onChange={e => setCampForm({ ...campForm, longitude: e.target.value })} />
                <input className={inputClass} required type="number" step="any" placeholder="Latitude" value={campForm.latitude} onChange={e => setCampForm({ ...campForm, latitude: e.target.value })} />
                <input className={inputClass} type="time" placeholder="Start time" value={campForm.startTime} onChange={e => setCampForm({ ...campForm, startTime: e.target.value })} />
                <input className={inputClass} type="time" placeholder="End time" value={campForm.endTime} onChange={e => setCampForm({ ...campForm, endTime: e.target.value })} />
                <input className={inputClass} placeholder="Contact phone" value={campForm.phone} onChange={e => setCampForm({ ...campForm, phone: e.target.value })} />
                <input className={inputClass} type="email" placeholder="Contact email" value={campForm.email} onChange={e => setCampForm({ ...campForm, email: e.target.value })} />
                <input className={inputClass} type="number" min="1" placeholder="Capacity (optional)" value={campForm.capacity} onChange={e => setCampForm({ ...campForm, capacity: e.target.value })} />
              </div>
            </>
          )}
          <p className="text-xs text-gray-500">Coordinates default to your saved location when available. New resources remain pending until approved by an administrator.</p>
          <div className="flex gap-2">
            <button disabled={busy} className="rounded-lg bg-rose-600 px-5 py-2 font-semibold text-white hover:bg-rose-700 disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" onClick={closeForm} className="rounded-lg border border-gray-300 px-5 py-2 font-semibold text-gray-700 hover:bg-white">Cancel</button>
          </div>
        </form>
      )}

      {loading ? <p className="py-6 text-center text-gray-600">Loading managed resources…</p> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-bold text-gray-900"><Building2 size={19} /> Blood banks ({banks.length})</h3>
            {banks.length === 0 ? <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">No managed blood banks yet.</p> : banks.map(bank => (
              <div key={bank._id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4">
                <div><div className="font-semibold text-gray-900">{bank.name}</div><div className="text-sm text-gray-600">{bank.location?.address}{bank.location?.city ? `, ${bank.location.city}` : ''}</div><span className="mt-2 inline-block rounded bg-gray-100 px-2 py-1 text-xs capitalize text-gray-700">{bank.status}</span></div>
                <div className="flex gap-1"><button type="button" aria-label={`Edit ${bank.name}`} onClick={() => startEditBank(bank)} className="rounded p-2 text-gray-600 hover:bg-gray-100"><Pencil size={17} /></button><button type="button" disabled={busy} aria-label={`Delete ${bank.name}`} onClick={() => void removeResource('bank', bank._id)} className="rounded p-2 text-red-600 hover:bg-red-50"><Trash2 size={17} /></button></div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-bold text-gray-900"><Calendar size={19} /> Donation camps ({camps.length})</h3>
            {camps.length === 0 ? <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">No managed donation camps yet.</p> : camps.map(camp => (
              <div key={camp._id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4">
                <div><div className="font-semibold text-gray-900">{camp.name}</div><div className="text-sm text-gray-600">{new Date(camp.date).toLocaleDateString()} · {camp.location?.venue || camp.location?.address}</div><span className="mt-2 inline-block rounded bg-gray-100 px-2 py-1 text-xs capitalize text-gray-700">{camp.status}</span></div>
                <div className="flex gap-1"><button type="button" aria-label={`Edit ${camp.name}`} onClick={() => startEditCamp(camp)} className="rounded p-2 text-gray-600 hover:bg-gray-100"><Pencil size={17} /></button><button type="button" disabled={busy} aria-label={`Delete ${camp.name}`} onClick={() => void removeResource('camp', camp._id)} className="rounded p-2 text-red-600 hover:bg-red-50"><Trash2 size={17} /></button></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
