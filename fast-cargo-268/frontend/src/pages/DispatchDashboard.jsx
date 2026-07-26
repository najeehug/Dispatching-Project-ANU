import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Package, Clock, CheckCircle, Bell, Truck, Map,
  ChevronDown, ChevronUp, AlertTriangle, LogOut, Plus, Search, Users, X,
} from 'lucide-react';
import {
  getDashboard, getPackages, getDispatchDrivers, getCustomers, getDriverLocations,
  logCustomsEntry, logCustomsCleared, assignDriver, sendPinReminder,
  createPackage, createCustomer, createDriver,
} from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import StatusBadge from '../components/StatusBadge';
import PinDropMap from '../components/PinDropMap';

export default function DispatchDashboard() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch]         = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab]   = useState('packages');
  const [showMap, setShowMap]       = useState(false);
  const [modal, setModal]           = useState(null); // 'pkg' | 'customer' | 'driver'

  const { data: dashboard }               = useQuery({ queryKey: ['dashboard'],        queryFn: getDashboard,                   refetchInterval: 30_000 });
  const { data: packages = [], isLoading} = useQuery({ queryKey: ['packages', search], queryFn: () => getPackages({ search }), refetchInterval: 20_000 });
  const { data: drivers  = [] }           = useQuery({ queryKey: ['dispatch-drivers'], queryFn: getDispatchDrivers,             refetchInterval: 15_000 });
  const { data: customers = [] }          = useQuery({ queryKey: ['customers'],        queryFn: getCustomers });
  const { data: driverLocations = [] }    = useQuery({ queryKey: ['driver-locations'], queryFn: getDriverLocations,             refetchInterval: 15_000, enabled: showMap });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['packages'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['dispatch-drivers'] });
  };

  const entryMut   = useMutation({ mutationFn: ({ id, n }) => logCustomsEntry(id,   { officerName: n }), onSuccess: invalidate });
  const clearMut   = useMutation({ mutationFn: (id)       => logCustomsCleared(id,  {}),                 onSuccess: invalidate });
  const assignMut  = useMutation({ mutationFn: ({ pkgId, driverId }) => assignDriver(pkgId, driverId),   onSuccess: invalidate });
  const reminderMut= useMutation({ mutationFn: (id)       => sendPinReminder(id) });

  const statusMap = dashboard?.statusMap || {};
  const stats = [
    { label: 'At customs',       value: statusMap.AT_CUSTOMS || 0,                                                   icon: Clock,         color: 'text-orange-600 bg-orange-50'  },
    { label: 'Need pin',         value: (statusMap.PENDING_PIN || 0) + (statusMap.PIN_REQUESTED || 0),               icon: AlertTriangle, color: 'text-amber-600 bg-amber-50'    },
    { label: 'Out for delivery', value: (statusMap.OUT_FOR_DELIVERY || 0) + (statusMap.ASSIGNED || 0),               icon: Truck,         color: 'text-indigo-600 bg-indigo-50'  },
    { label: 'Delivered',        value: statusMap.DELIVERED || 0,                                                     icon: CheckCircle,   color: 'text-emerald-600 bg-emerald-50'},
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <p className="font-bold">FastCargo 268</p>
          <p className="text-xs text-emerald-200">Dispatch · {user?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowMap(m => !m)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${showMap ? 'bg-white text-emerald-700' : 'bg-emerald-600 text-white border border-emerald-500'}`}>
            <Map className="w-3.5 h-3.5" /> Live map
          </button>
          <button onClick={logout} className="text-emerald-200 hover:text-white ml-1"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* Live driver map */}
        {showMap && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Live driver locations</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" /> Active</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block" /> Offline</span>
              </div>
            </div>
            <PinDropMap
              readOnly
              height="280px"
              drivers={driverLocations.map(d => ({
                id:       d.id,
                name:     d.name,
                lat:      d.driverLat,
                lng:      d.driverLng,
                isActive: d.isActive,
              }))}
            />
            <p className="text-xs text-gray-400 mt-2">Updates every 15 seconds · Click a driver marker for details</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {dashboard?.avgCustomsHours != null && (
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
            <Clock className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-600">
              Avg customs time: <span className="font-semibold text-gray-900">{Number(dashboard.avgCustomsHours).toFixed(1)} hrs</span>
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {[['packages', Package, 'Packages'], ['customers', Users, 'Customers']].map(([key, Icon, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === key ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
          <div className="flex-1" />
          {activeTab === 'packages' && (
            <button onClick={() => setModal('pkg')} className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg mb-1">
              <Plus className="w-3.5 h-3.5" /> New package
            </button>
          )}
          {activeTab === 'customers' && (
            <div className="flex gap-1 mb-1">
              <button onClick={() => setModal('customer')} className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg">
                <Plus className="w-3.5 h-3.5" /> Customer
              </button>
              <button onClick={() => setModal('driver')} className="flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg">
                <Plus className="w-3.5 h-3.5" /> Driver
              </button>
            </div>
          )}
        </div>

        {activeTab === 'packages' && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search tracking number or name…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
            </div>

            <div className="space-y-2">
              {isLoading && <p className="text-sm text-gray-400 text-center py-8">Loading packages…</p>}
              {packages.map(pkg => (
                <PackageCard key={pkg.id} pkg={pkg} drivers={drivers}
                  expanded={expandedId === pkg.id}
                  onToggle={() => setExpandedId(expandedId === pkg.id ? null : pkg.id)}
                  onCustomsEntry={(n) => entryMut.mutate({ id: pkg.id, n })}
                  onCustomsClear={() => clearMut.mutate(pkg.id)}
                  onAssign={(driverId) => assignMut.mutate({ pkgId: pkg.id, driverId })}
                  onReminder={() => reminderMut.mutate(pkg.id)}
                  mutating={entryMut.isPending || clearMut.isPending || assignMut.isPending}
                />
              ))}
              {!isLoading && packages.length === 0 && (
                <div className="text-center py-10"><Package className="w-10 h-10 mx-auto text-gray-200 mb-2" /><p className="text-sm text-gray-400">No packages found</p></div>
              )}
            </div>
          </>
        )}

        {activeTab === 'customers' && (
          <div className="space-y-2">
            {customers.map(c => (
              <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.phone}{c.email ? ` · ${c.email}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-emerald-700">{c._count?.packages || 0} packages</p>
                  <p className="text-xs text-gray-400">{format(new Date(c.createdAt), 'MMM yyyy')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal === 'pkg'      && <NewPackageModal   customers={customers} onClose={() => setModal(null)} onSaved={() => { setModal(null); invalidate(); }} />}
      {modal === 'customer' && <PersonModal title="New customer" role="customer" onClose={() => setModal(null)} onSaved={() => { setModal(null); qc.invalidateQueries({ queryKey: ['customers'] }); }} />}
      {modal === 'driver'   && <PersonModal title="New driver"   role="driver"   onClose={() => setModal(null)} onSaved={() => { setModal(null); invalidate(); }} />}
    </div>
  );
}

// ── Package card ─────────────────────────────────────────────────────────────
function PackageCard({ pkg, drivers, expanded, onToggle, onCustomsEntry, onCustomsClear, onAssign, onReminder, mutating }) {
  const [officerName, setOfficerName]   = useState('');
  const [selectedDriver, setDriver]     = useState('');
  const hasPin = !!(pkg.pinLatitude && pkg.pinLongitude);

  const duration = pkg.customsEntryAt && pkg.customsClearedAt
    ? ((new Date(pkg.customsClearedAt) - new Date(pkg.customsEntryAt)) / 3_600_000).toFixed(1)
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0">
            {!hasPin && !['DELIVERED','CUSTOMS_CLEARED','ASSIGNED','OUT_FOR_DELIVERY'].includes(pkg.status)
              ? <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-amber-600" /></div>
              : <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"><Package className="w-4 h-4 text-emerald-600" /></div>}
          </div>
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-gray-900 truncate">{pkg.trackingNumber}</p>
            <p className="text-xs text-gray-500 truncate">{pkg.customer?.name} · {pkg.customer?.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <StatusBadge status={pkg.status} />
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4">

          {/* Pin */}
          <Section title="Delivery pin">
            {hasPin ? (
              <div className="space-y-2">
                <p className="text-xs text-emerald-700 font-medium">Pin set {pkg.pinSetAt ? formatDistanceToNow(new Date(pkg.pinSetAt), { addSuffix: true }) : ''}</p>
                <p className="text-xs font-mono text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{pkg.pinLatitude?.toFixed(5)}° N, {Math.abs(pkg.pinLongitude)?.toFixed(5)}° W</p>
                <PinDropMap initialLat={pkg.pinLatitude} initialLng={pkg.pinLongitude} readOnly height="160px" />
                {pkg.deliveryNotes && <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">📝 {pkg.deliveryNotes}</p>}
                <a href={`https://www.google.com/maps?q=${pkg.pinLatitude},${pkg.pinLongitude}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex text-xs text-indigo-600 font-medium hover:underline">View on Google Maps →</a>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2.5">
                <p className="text-xs text-amber-800">Customer hasn't set a pin yet</p>
                <button onClick={onReminder} className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1.5 rounded-lg">
                  <Bell className="w-3 h-3" /> Send reminder
                </button>
              </div>
            )}
          </Section>

          {/* Customs */}
          <Section title="Customs tracking">
            <div className="space-y-2">
              {pkg.customsEntryAt ? (
                <Row label="Entry time" value={format(new Date(pkg.customsEntryAt), 'dd MMM yyyy, HH:mm')} />
              ) : (
                <div className="flex gap-2">
                  <input placeholder="Officer name (optional)" value={officerName} onChange={e => setOfficerName(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                  <button disabled={mutating} onClick={() => onCustomsEntry(officerName)}
                    className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50">
                    Log entry
                  </button>
                </div>
              )}
              {pkg.customsEntryAt && (pkg.customsClearedAt ? (
                <>
                  <Row label="Cleared"  value={format(new Date(pkg.customsClearedAt), 'dd MMM yyyy, HH:mm')} />
                  {duration && <Row label="Duration" value={`${duration} hours`} />}
                </>
              ) : (
                <button disabled={mutating} onClick={onCustomsClear}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold py-2.5 rounded-lg disabled:opacity-50">
                  Mark customs cleared — email customer
                </button>
              ))}
            </div>
          </Section>

          {/* Driver assignment */}
          <Section title="Driver">
            {pkg.assignment ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center"><Truck className="w-4 h-4 text-indigo-600" /></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{pkg.assignment.driver?.name}</p>
                  <p className="text-xs text-gray-500">Assigned {pkg.assignment.assignedAt ? formatDistanceToNow(new Date(pkg.assignment.assignedAt), { addSuffix: true }) : ''}</p>
                </div>
              </div>
            ) : (
              <>
                {!hasPin && <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mb-2">Pin required before assigning driver</p>}
                <div className="flex gap-2">
                  <select value={selectedDriver} onChange={e => setDriver(e.target.value)} disabled={!hasPin}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 bg-white">
                    <option value="">Select driver…</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.activeDeliveries} active)</option>)}
                  </select>
                  <button disabled={!selectedDriver || !hasPin || mutating} onClick={() => onAssign(selectedDriver)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50">
                    Assign
                  </button>
                </div>
              </>
            )}
          </Section>

          <Section title="Timeline">
            <p className="text-xs text-gray-500">Created {format(new Date(pkg.createdAt), 'dd MMM yyyy, HH:mm')}</p>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</p>{children}</div>;
}
function Row({ label, value }) {
  return <div className="flex items-center justify-between text-xs"><span className="text-gray-500">{label}</span><span className="font-medium text-gray-900">{value}</span></div>;
}

// ── Modals ───────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white';

function NewPackageModal({ customers, onClose, onSaved }) {
  const [form, setForm]     = useState({ trackingNumber: '', customerId: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const submit = async () => {
    if (!form.trackingNumber || !form.customerId) return setError('Tracking number and customer are required');
    setLoading(true);
    try { await createPackage(form); onSaved(); }
    catch (e) { setError(e.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="New package" onClose={onClose}>
      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}
      <div className="space-y-3">
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Tracking number</label>
          <input className={inputCls} placeholder="AG-2024-XXXXX" value={form.trackingNumber} onChange={e => setForm(f => ({ ...f, trackingNumber: e.target.value }))} /></div>
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Customer</label>
          <select className={inputCls} value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}>
            <option value="">Select customer…</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
          </select></div>
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
          <input className={inputCls} placeholder="e.g. Electronics, 2 boxes" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
        <p className="text-xs text-gray-500 bg-emerald-50 rounded-lg px-3 py-2">A pin request email will be sent to the customer automatically.</p>
        <button onClick={submit} disabled={loading} className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-50">
          {loading ? 'Creating…' : 'Create package & notify customer'}
        </button>
      </div>
    </Modal>
  );
}

function PersonModal({ title, role, onClose, onSaved }) {
  const [form, setForm]     = useState({ name: '', phone: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async () => {
    setLoading(true);
    try {
      const fn = role === 'driver' ? createDriver : createCustomer;
      const data = await fn(form);
      setResult(data);
      onSaved();
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={title} onClose={onClose}>
      {result ? (
        <div className="text-center space-y-3">
          <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
          <p className="font-semibold text-gray-900">{result.name} added</p>
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-left">
            <p className="text-xs text-gray-500 mb-1">Temporary password — share with {role}</p>
            <p className="font-mono font-bold text-gray-900">{result.tempPassword}</p>
          </div>
          <button onClick={onClose} className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl text-sm">Done</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Full name</label><input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Phone</label><input className={inputCls} placeholder="+1 268 xxx xxxx" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Email (for notifications)</label><input className={inputCls} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <button onClick={submit} disabled={loading} className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-50">
            {loading ? 'Creating…' : `Create ${role}`}
          </button>
        </div>
      )}
    </Modal>
  );
}
