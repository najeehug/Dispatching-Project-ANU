import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const CENTER = [
  parseFloat(import.meta.env.VITE_MAP_CENTER_LNG || -61.8468),
  parseFloat(import.meta.env.VITE_MAP_CENTER_LAT || 17.1274),
];
const ZOOM = parseFloat(import.meta.env.VITE_MAP_DEFAULT_ZOOM || 11);

export default function PinDropMap({
  initialLng,
  initialLat,
  onPinChange,
  readOnly  = false,
  height    = '300px',
  drivers   = [],        // array of { id, name, lat, lng, isActive } for dispatcher view
}) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markerRef    = useRef(null);
  const driverMarkersRef = useRef({});

  const [coords, setCoords] = useState({
    lng: initialLng || CENTER[0],
    lat: initialLat || CENTER[1],
  });

  // Init map
  useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style:     'mapbox://styles/mapbox/streets-v12',
      center:    [coords.lng, coords.lat],
      zoom:      ZOOM,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Customer delivery pin (green)
    const el = makePinEl('#059669', !readOnly);
    markerRef.current = new mapboxgl.Marker({ element: el, draggable: !readOnly })
      .setLngLat([coords.lng, coords.lat])
      .addTo(mapRef.current);

    if (!readOnly) {
      markerRef.current.on('dragend', () => {
        const { lng, lat } = markerRef.current.getLngLat();
        const r = round(lng, lat);
        setCoords(r);
        onPinChange?.(r.lng, r.lat);
      });

      mapRef.current.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        markerRef.current.setLngLat([lng, lat]);
        const r = round(lng, lat);
        setCoords(r);
        onPinChange?.(r.lng, r.lat);
      });
    }

    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  // Update driver markers on map whenever drivers array changes
  useEffect(() => {
    if (!mapRef.current || drivers.length === 0) return;

    // Remove stale markers
    Object.keys(driverMarkersRef.current).forEach(id => {
      if (!drivers.find(d => d.id === id)) {
        driverMarkersRef.current[id].remove();
        delete driverMarkersRef.current[id];
      }
    });

    // Add/update driver markers
    drivers.forEach(driver => {
      if (!driver.lat || !driver.lng) return;
      const color = driver.isActive ? '#4f46e5' : '#9ca3af';

      if (driverMarkersRef.current[driver.id]) {
        driverMarkersRef.current[driver.id].setLngLat([driver.lng, driver.lat]);
      } else {
        const el = makeDriverEl(driver.name, color);
        const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
          <div style="font-family:sans-serif;font-size:12px;padding:4px 2px">
            <strong>${driver.name}</strong><br/>
            <span style="color:${driver.isActive ? '#059669' : '#6b7280'}">${driver.isActive ? 'Active' : 'Last seen recently'}</span>
          </div>
        `);
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([driver.lng, driver.lat])
          .setPopup(popup)
          .addTo(mapRef.current);
        driverMarkersRef.current[driver.id] = marker;
      }
    });
  }, [drivers]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200" style={{ height }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {!readOnly && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-emerald-700 font-medium shadow-sm border border-emerald-100 pointer-events-none whitespace-nowrap">
          Tap map or drag pin to set location
        </div>
      )}
      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs text-gray-600 font-mono shadow-sm border border-gray-100">
        {coords.lat.toFixed(5)}° N, {Math.abs(coords.lng).toFixed(5)}° W
      </div>
    </div>
  );
}

function round(lng, lat) {
  return { lng: parseFloat(lng.toFixed(6)), lat: parseFloat(lat.toFixed(6)) };
}

function makePinEl(color, draggable) {
  const el = document.createElement('div');
  el.style.cssText = `width:28px;height:36px;cursor:${draggable ? 'grab' : 'default'};`;
  el.innerHTML = `<svg viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 5.25 2.87 9.83 7.13 12.27L14 36l6.87-9.73C25.13 23.83 28 19.25 28 14 28 6.27 21.73 0 14 0z" fill="${color}"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
  </svg>`;
  return el;
}

function makeDriverEl(name, color) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const el = document.createElement('div');
  el.style.cssText = `
    width:32px;height:32px;border-radius:50%;background:${color};
    display:flex;align-items:center;justify-content:center;
    color:white;font-size:11px;font-weight:600;
    border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25);
    cursor:pointer;font-family:sans-serif;
  `;
  el.textContent = initials;
  return el;
}
