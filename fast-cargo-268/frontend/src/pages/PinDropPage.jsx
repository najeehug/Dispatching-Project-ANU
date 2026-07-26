import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getPackage, setPin } from '../lib/api';
import PinDropMap from '../components/PinDropMap';
import { Package, CheckCircle, AlertTriangle, MapPin } from 'lucide-react';

export default function PinDropPage() {
  const { packageId } = useParams();
  const [lng, setLng]         = useState(null);
  const [lat, setLat]         = useState(null);
  const [notes, setNotes]     = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: pkg, isLoading, error } = useQuery({
    queryKey: ['pkg-pin', packageId],
    queryFn:  () => getPackage(packageId),
  });

  const mutation = useMutation({
    mutationFn: () => setPin(packageId, lat, lng, notes),
    onSuccess:  () => setSubmitted(true),
  });

  if (isLoading) return <Center><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></Center>;
  if (error)     return <Center><AlertTriangle className="w-10 h-10 text-amber-500 mb-3" /><p className="text-gray-700 font-medium">Package not found</p></Center>;

  if (submitted) return (
    <Center>
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
        <CheckCircle className="w-9 h-9 text-emerald-600" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Location saved!</h1>
      <p className="text-gray-500 text-sm text-center max-w-xs">A FastCargo 268 driver will deliver to your pinned location.</p>
      <div className="mt-5 bg-white rounded-xl border border-gray-100 px-5 py-4 w-full max-w-xs">
        <p className="text-xs text-gray-400 mb-1">Tracking number</p>
        <p className="font-mono font-semibold text-emerald-700">{pkg?.trackingNumber}</p>
      </div>
    </Center>
  );

  return (
    <div className="min-h-screen bg-emerald-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900">FastCargo 268</p>
            <p className="text-xs text-gray-500">Antigua &amp; Barbuda</p>
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-1">Set your delivery location</h1>
        <p className="text-sm text-gray-500 mb-5">
          Package <span className="font-mono font-semibold text-emerald-700">{pkg?.trackingNumber}</span> is at the port.
          Drop a pin where you need it delivered.
        </p>

        {pkg?.pinLatitude && !submitted && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800">
            You've already set a pin. Move it below to update.
          </div>
        )}

        <PinDropMap
          initialLat={pkg?.pinLatitude}
          initialLng={pkg?.pinLongitude}
          onPinChange={(newLng, newLat) => { setLng(newLng); setLat(newLat); }}
          height="320px"
        />

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Delivery notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Blue gate, call when you arrive, leave with neighbor…"
            rows={3} maxLength={300}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
        </div>

        {mutation.error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
            {mutation.error.response?.data?.error || 'Something went wrong'}
          </div>
        )}

        <button onClick={() => mutation.mutate()} disabled={!lat || mutation.isPending}
          className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3.5 text-sm transition-colors">
          {mutation.isPending ? 'Saving…' : lat ? 'Confirm delivery location' : 'Move the pin to continue'}
        </button>

        <div className="flex items-start gap-2 mt-4 text-xs text-gray-400">
          <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          Tap anywhere on the map or drag the green pin to your exact spot — your gate, door, or yard.
        </div>
      </div>
    </div>
  );
}

function Center({ children }) {
  return (
    <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center px-4 text-center">
      {children}
    </div>
  );
}
