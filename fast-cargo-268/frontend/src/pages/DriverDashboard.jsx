import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, CheckCircle, Phone, Navigation, LogOut, Package, Radio } from 'lucide-react';
import { getMyDeliveries, startDelivery, markDelivered } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { useDriverLocation } from '../hooks/useDriverLocation';
import StatusBadge from '../components/StatusBadge';

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState(null);

  // Start broadcasting GPS location immediately
  const { status: gpsStatus } = useDriverLocation(true);

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey:       ['my-deliveries'],
    queryFn:        getMyDeliveries,
    refetchInterval: 30_000,
  });

  const startMut = useMutation({
    mutationFn: startDelivery,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['my-deliveries'] }),
  });
  const deliverMut = useMutation({
    mutationFn: (id) => markDelivered(id, {}),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['my-deliveries'] }); setActiveId(null); },
  });

  const active    = deliveries.filter(d => ['ASSIGNED','OUT_FOR_DELIVERY'].includes(d.status));
  const completed = deliveries.filter(d => d.status === 'DELIVERED');

  const gpsColor = { tracking: 'text-emerald-400', denied: 'text-red-400', unavailable: 'text-gray-400', idle: 'text-gray-400' }[gpsStatus];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <p className="font-bold">FastCargo 268</p>
          <p className="text-xs text-emerald-200">Driver · {user?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-emerald-200">
            <Radio className={`w-3.5 h-3.5 ${gpsColor}`} />
            {gpsStatus === 'tracking' ? 'Live' : gpsStatus === 'denied' ? 'GPS off' : 'No GPS'}
          </div>
          <button onClick={logout}><LogOut className="w-5 h-5 text-emerald-200 hover:text-white" /></button>
        </div>
      </header>

      {gpsStatus === 'denied' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-xs text-amber-800">
          Location access denied. Enable location in your browser settings so dispatch can track you.
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-900">{active.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Active deliveries</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-emerald-700">{completed.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Delivered today</p>
          </div>
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Active deliveries</p>

        {isLoading && <p className="text-sm text-gray-400 text-center py-8">Loading…</p>}

        {active.length === 0 && !isLoading && (
          <div className="text-center py-10 bg-white rounded-xl border border-gray-100">
            <Truck className="w-10 h-10 mx-auto text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No active deliveries</p>
          </div>
        )}

        {active.map(pkg => (
          <div key={pkg.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <button
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              onClick={() => setActiveId(activeId === pkg.id ? null : pkg.id)}>
              <div>
                <p className="font-mono text-sm font-bold text-gray-900">{pkg.trackingNumber}</p>
                <p className="text-xs text-gray-500 mt-0.5">{pkg.customer?.name}</p>
              </div>
              <StatusBadge status={pkg.status} />
            </button>

            {activeId === pkg.id && (
              <div className="border-t border-gray-100 p-4 space-y-3">
                <a href={`tel:${pkg.customer?.phone}`}
                  className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors text-gray-900 no-underline">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Call customer</p>
                    <p className="text-sm font-medium">{pkg.customer?.phone}</p>
                  </div>
                </a>

                {pkg.deliveryNotes && (
                  <div className="bg-amber-50 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-amber-700 mb-1">Delivery notes</p>
                    <p className="text-sm text-amber-900">{pkg.deliveryNotes}</p>
                  </div>
                )}

                {pkg.pinLatitude && pkg.pinLongitude ? (
                  <>
                    <div className="bg-gray-50 rounded-xl px-4 py-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1">Customer's pin</p>
                      <p className="text-xs font-mono text-gray-700">
                        {pkg.pinLatitude.toFixed(5)}° N, {Math.abs(pkg.pinLongitude).toFixed(5)}° W
                      </p>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${pkg.pinLatitude},${pkg.pinLongitude}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
                      <Navigation className="w-4 h-4" /> Navigate to pin
                    </a>
                  </>
                ) : (
                  <div className="bg-amber-50 rounded-xl px-4 py-3 text-center">
                    <p className="text-xs text-amber-800">Customer hasn't set a pin yet. Contact dispatch.</p>
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  {pkg.status === 'ASSIGNED' && (
                    <button onClick={() => startMut.mutate(pkg.id)} disabled={startMut.isPending}
                      className="w-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50">
                      {startMut.isPending ? 'Updating…' : 'Start delivery — I have the package'}
                    </button>
                  )}
                  {pkg.status === 'OUT_FOR_DELIVERY' && (
                    <button onClick={() => deliverMut.mutate(pkg.id)} disabled={deliverMut.isPending}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      {deliverMut.isPending ? 'Confirming…' : 'Mark as delivered'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {completed.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 pt-2">Delivered today</p>
            {completed.map(pkg => (
              <div key={pkg.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between opacity-70">
                <div>
                  <p className="font-mono text-xs font-bold text-gray-700">{pkg.trackingNumber}</p>
                  <p className="text-xs text-gray-500">{pkg.customer?.name}</p>
                </div>
                <StatusBadge status="DELIVERED" />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
