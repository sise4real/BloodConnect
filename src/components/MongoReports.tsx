import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { useMongoAuth } from '../contexts/useMongoAuth';
import { api } from '../lib/api';

const reportOptions: Record<string, Array<{ value: string; label: string }>> = {
  admin: [
    { value: 'users', label: 'Users' }, { value: 'requests', label: 'Blood requests' },
    { value: 'donations', label: 'Donation history' }, { value: 'blood-stock', label: 'Blood stock' },
    { value: 'blood-banks', label: 'Blood banks' }, { value: 'institution-summary', label: 'Institution statistics' }, { value: 'camps', label: 'Donation camps' },
    { value: 'eligibility', label: 'Donor eligibility' }, { value: 'activity', label: 'Stock audit activity' },
    { value: 'monthly-trends', label: 'Monthly donation trends' }
  ],
  hospital: [
    { value: 'requests', label: 'My requests' }, { value: 'donations', label: 'Donations for my requests' },
    { value: 'blood-stock', label: 'My blood stock' }, { value: 'blood-banks', label: 'My blood banks' }, { value: 'institution-summary', label: 'My institution statistics' },
    { value: 'camps', label: 'My camps' }, { value: 'activity', label: 'My stock audit activity' }
  ],
  blood_bank: [
    { value: 'blood-stock', label: 'My blood stock' }, { value: 'blood-banks', label: 'My blood banks' }, { value: 'institution-summary', label: 'My institution statistics' },
    { value: 'activity', label: 'My stock audit activity' }
  ],
  donor: [{ value: 'donations', label: 'My donation history' }],
  recipient: [{ value: 'requests', label: 'My blood requests' }]
};

export function MongoReports() {
  const { token, user } = useMongoAuth();
  const options = reportOptions[user?.role || ''] || [];
  const [report, setReport] = useState(options[0]?.value || 'requests');
  const [format, setFormat] = useState('csv');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [city, setCity] = useState('');
  const [institution, setInstitution] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const download = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      const blob = await api.reports.download(report, { format, from: from || undefined, to: to || undefined, bloodType: bloodType || undefined, status: status || undefined, role: role || undefined, city: city || undefined, institution: institution || undefined }, token);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `bloodconnect-${report}.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to generate this report.'); }
    finally { setBusy(false); }
  };

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><FileText className="text-rose-600" /> Reports</h2>
        <p className="mt-1 text-sm text-gray-600">Reports are limited to the data your account is authorized to view. Refreshing stock does not verify physical inventory.</p>
      </div>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {options.length === 0 ? <p className="rounded-lg bg-gray-50 p-4 text-gray-600">No reports are available for this role.</p> : (
        <form onSubmit={download} className="grid gap-4 rounded-xl border border-gray-200 bg-white p-6 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">Report
            <select value={report} onChange={event => setReport(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2">
              {options.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">File format
            <select value={format} onChange={event => setFormat(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="csv">CSV</option><option value="xlsx">Excel (.xlsx)</option><option value="pdf">PDF</option>
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">From date
            <input type="date" value={from} onChange={event => setFrom(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">To date
            <input type="date" value={to} onChange={event => setTo(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">Blood group
            <select value={bloodType} onChange={event => setBloodType(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="">All</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">{report === 'donations' ? 'Donation status' : 'Request status'}
            <select value={status} onChange={event => setStatus(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="">All</option>{(report === 'donations' ? ['completed'] : ['pending', 'approved', 'fulfilled', 'expired', 'cancelled', 'rejected']).map(item => <option key={item}>{item}</option>)}
            </select>
          </label>
          {user?.role === 'admin' && report === 'users' && <label className="text-sm font-medium text-gray-700">User role
            <select value={role} onChange={event => setRole(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"><option value="">All</option>{['donor', 'recipient', 'hospital', 'blood_bank', 'admin'].map(item => <option key={item}>{item}</option>)}</select>
          </label>}
          <label className="text-sm font-medium text-gray-700">City
            <input value={city} onChange={event => setCity(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Filter by city" />
          </label>
          {user?.role === 'admin' && <label className="text-sm font-medium text-gray-700">Institution owner ID (optional)
            <input value={institution} onChange={event => setInstitution(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="MongoDB user ID" />
          </label>}
          <div className="sm:col-span-2">
            <button disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50"><Download size={18} />{busy ? 'Generating…' : 'Generate and download'}</button>
          </div>
        </form>
      )}
    </section>
  );
}
