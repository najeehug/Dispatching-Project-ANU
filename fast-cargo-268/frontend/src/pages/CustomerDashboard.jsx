import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Package, LogOut, ChevronDown, ChevronUp, Truck } from 'lucide-react';
import { getPackages } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import StatusBadge from '../components/StatusBadge';
import PinDropMap from '../components/PinDropMap';

const STEPS = [
  { label: 'Arrived at port',  done: () => true },
  { label: 'Customs cleared',  done: p => !!p.customsClearedAt },
  { label: 'Out for delivery', done: p => ['OUT_FOR_DELIVERY','DELIVERED'].includes(p.status) },
  { label: 'Delivered',        done: p => p.status === 'DELIVERED' },
];

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const [expanded, setExpanded] = useState(null);

  const { data: packages = [], isLoading } = useQuery({
    queryKey:       ['packages'],
    queryFn:        getPackages,
    refetchInterval: 60_000,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <p className="font-bold">FastCargo 268</p>
          <p className="text-xs text-emerald-200">{user?.name}</p>
        </div>
        <button onClick={logout}><LogOut className="w-5 h-5 text-emerald-200 hover:text-white" /></button>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Your packages</p>

        {isLoading && <div className="text-center py-10"><div className="w-7 h-7 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>}

        {!isLoading && packages.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <Package className="w-10 h-10 mx-auto text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No packages yet</p>
          </div>
        )}

        {packages.map(pkg => (
          <div key={pkg.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <button
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              onClick={() => setExpanded(expanded === pkg.id ? null : pkg.id)}>
              <div>
                <p className="font-mono text-sm font-bold text-gray-900">{pkg.trackingNumber}</p>
                <p className="text-xs text-gray-500 mt-0.5">{pkg.description || 'Package'} · {format(new Date(pkg.createdAt), 'dd MMM yyyy')}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={pkg.status} />
                {expanded === pkg.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {expanded === pkg.id && (
              <div className="border-t border-gray-100 p-4 space-y-4">
                {/* Timeline */}
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

                {/* Driver */}
                {pkg.assignment?.driver && (
                  <div className="flex items-center gap-3 bg-indigo-50 rounded-xl px-4 py-3">
                    <Truck className="w-4 h-4 text-indigo-600" />
                    <div>
                      <p className="text-xs text-indigo-600 font-semibold">Your driver</p>
                      <p className="text-sm font-medium text-gray-900">{pkg.assignment.driver.name}</p>
                    </div>
                  </div>
                )}

                {/* Pin map */}
                {pkg.pinLatitude && pkg.pinLongitude ? (
                  <>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Your delivery pin</p>
                    <PinDropMap initialLat={pkg.pinLatitude} initialLng={pkg.pinLongitude} readOnly height="180px" />
                  </>
                ) : (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
                    Set your delivery location using the link sent to your email.
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
