import { useEffect, useRef, useState } from 'react';
import { postDriverLocation } from '../lib/api';

// Automatically posts driver GPS to server every 15 seconds
// Uses browser Geolocation API — completely free
export function useDriverLocation(enabled = true) {
  const [status, setStatus]   = useState('idle'); // idle | tracking | denied | unavailable
  const [coords, setCoords]   = useState(null);
  const intervalRef = useRef(null);

  const postLocation = (position) => {
    const { latitude: lat, longitude: lng } = position.coords;
    setCoords({ lat, lng });
    postDriverLocation(lat, lng).catch(() => {});
  };

  const onError = (err) => {
    if (err.code === 1) setStatus('denied');
    else setStatus('unavailable');
    console.warn('Geolocation error:', err.message);
  };

  useEffect(() => {
    if (!enabled || !navigator.geolocation) {
      setStatus('unavailable');
      return;
    }

    setStatus('tracking');

    // Get location immediately
    navigator.geolocation.getCurrentPosition(postLocation, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
    });

    // Then every 15 seconds
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(postLocation, onError, {
        enableHighAccuracy: true,
        timeout: 10000,
      });
    }, 15000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled]);

  return { status, coords };
}
