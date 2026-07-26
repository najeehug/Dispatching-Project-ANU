import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { trackPackage } from '../lib/api';
import { format } from 'date-fns';
import { Package, Search, Truck } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

const STEPS = [
  { label: 'Arrived at port',    done: () => true },
  { label: 'Customs cleared',    done: (p) => !!p.customsClearedAt },
  { label: 'Out for delivery',   done: (p) => ['OUT_FOR_DELIVERY','DELIVERED'].includes(p.status) },
  { label: 'Delivered',          done: (p) => p.status === 'DELIVERED' },
];

export default function TrackPage() {
  const { number }  = useParams();
  const navigate    = useNavigate();
  const [input,    setInput]    = useState(number || '');
  const [tracking, setTracking] = useState(number || null);

  const { data: pkg, isLoading, error } = useQuery({
    queryKey: ['track', tracking],
    queryFn:  () => trackPackage(tracking),
    enabled:  !!tracking,
    retry:    false,
  });

  const search = (e) => {
    e.preventDefault();
    const val = input.trim().toUpperCase();
    if (val) { setTracking(val); navigate(`/track/${val}`, { replace: true }); }
  };

  return (
    <div className="min-h-screen bg-emerald-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-600 rounded-2xl mb-3">
            <Package className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Track your package</h1>
          <p className="text-sm text-gray-500 mt-1">FastCargo 268 · Antigua &amp; Barbuda</p>
        </div>

        <form onSubmit={search} className="flex gap-2 mb-6">
          <input value={input} onChange={e => setInput(e.target.value)}
            placeholder="e.g. FC268-2024-00841"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white uppercase" />
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl transition-colors">
            <Search className="w-4 h-4" />
          </button>
        </form>

        {isLoading && <div className="text-center py-10"><div className="w-7 h-7 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>}

        {error && (
          <div className="bg-white rounded-xl border border-red-100 p-5 text-center">
            <p className="text-red-600 font-medium text-sm">Tracking number not found</p>
          </div>
        )}

        {pkg && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono font-bold text-lg text-gray-900">{pkg.trackingNumber}</p>
                <p className="text-sm text-gray-500 mt-0.5">{pkg.customer?.name}</p>
              </div>
              <StatusBadge status={pkg.status} />
            </div>

            <div className="space-y-3">
              {STEPS.map(step => {
                const done = step.done(pkg);
                return (
                  <div key={step.label} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center ${done ? 'bg-emerald-500' : 'bg-gray-100'}`}>
                      {done
                        ? <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        : <span className="w-2 h-2 rounded-full bg-gray-300" />}
                    </div>
                    <span className={`text-sm ${done ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{step.label}</span>
                  </div>
                );
              })}
            </div>

            {pkg.customsEntryAt && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Customs</p>
                <div className="flex justify-between"><span className="text-gray-500">Entry</span><span className="font-medium">{format(new Date(pkg.customsEntryAt), 'dd MMM, HH:mm')}</span></div>
                {pkg.customsClearedAt && (
                  <div className="flex justify-between"><span className="text-gray-500">Cleared</span><span className="font-medium text-emerald-700">{format(new Date(pkg.customsClearedAt), 'dd MMM, HH:mm')}</span></div>
                )}
              </div>
            )}

            {pkg.assignment?.driver && (
              <div className="flex items-center gap-3 bg-indigo-50 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-indigo-600 font-semibold">Your driver</p>
                  <p className="text-sm font-medium text-gray-900">{pkg.assignment.driver.name}</p>
                </div>
              </div>
            )}

            <a href="/login" className="block text-center text-xs text-emerald-600 hover:underline font-medium">
              Sign in to manage your deliveries →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
