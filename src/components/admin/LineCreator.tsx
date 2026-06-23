import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { STOPS, addCustomStop, addCustomLine, OPERATORS, LINES } from '@/data/transportData';
import { routeLine } from '@/utils/osrm';
import type { Stop, Line, OperatorId } from '@/types';
import { 
  Undo, Trash2, ArrowUp, ArrowDown, MapPin, 
  Plus, Check, X, FileCode, Save, Sparkles, Navigation 
} from 'lucide-react';

interface LineCreatorProps {
  onClose: () => void;
  onSave: () => void;
}

// Custom icons for ordered stops
const makeStopIndexIcon = (index: number, color: string) => L.divIcon({
  className: '',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${color};border:2px solid white;color:white;font-weight:900;font-size:11px;box-shadow:0 4px 12px rgba(0,0,0,.5);animation:scale-in 0.2s ease-out">
    ${index + 1}
  </div>
  <style>
    @keyframes scale-in {
      0% { transform: scale(0.5); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
  </style>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Map click listener component
function MapClickEvents({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

// Map center modifier
function ChangeMapCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function LineCreator({ onClose, onSave }: LineCreatorProps) {
  // Form fields
  const [lineName, setLineName] = useState('');
  const [routeDetail, setRouteDetail] = useState('');
  const [operator, setOperator] = useState<OperatorId>('DDD');
  const [color, setColor] = useState('#1a56db');
  const [freq, setFreq] = useState('10 min');
  const [tarif, setTarif] = useState(200);

  // Stop list selection
  const [selectedStops, setSelectedStops] = useState<Stop[]>([]);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Custom stop creation state
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [newStopName, setNewStopName] = useState('');
  const [newStopZone, setNewStopZone] = useState('');

  // Code preview modal state
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  // Local component version of stops to react to addCustomStop
  const [allStops, setAllStops] = useState<Stop[]>(STOPS);

  // Sync color with operator defaults when operator changes
  useEffect(() => {
    const opColor = OPERATORS[operator]?.color || '#1a56db';
    setColor(opColor);
    const opTarif = OPERATORS[operator]?.tarif || 200;
    setTarif(opTarif);
  }, [operator]);

  // Recalculate route coordinates via OSRM when selectedStops change
  useEffect(() => {
    let active = true;
    async function calculateRoute() {
      if (selectedStops.length < 2) {
        setRouteCoords([]);
        return;
      }
      setLoadingRoute(true);
      const latLngs = selectedStops.map(s => ({ lat: s.lat, lng: s.lng }));
      try {
        const coords = await routeLine(latLngs);
        if (active) {
          if (coords && coords.length > 0) {
            setRouteCoords(coords);
          } else {
            // Fallback: straight lines
            setRouteCoords(selectedStops.map(s => [s.lat, s.lng]));
          }
        }
      } catch (err) {
        console.error('OSRM Route calculation error', err);
        if (active) {
          setRouteCoords(selectedStops.map(s => [s.lat, s.lng]));
        }
      } finally {
        if (active) setLoadingRoute(false);
      }
    }
    calculateRoute();
    return () => { active = false; };
  }, [selectedStops]);

  // Trigger code snippet generation
  const handleGenerateCode = () => {
    const lineId = `L-${operator}-${lineName.toUpperCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-4)}`;
    const stopIds = selectedStops.map(s => s.id);
    const snippet = `  {
    id: '${lineId}',
    name: '${lineName || 'Ligne ' + operator}',
    route: '${routeDetail || 'Tracé personnalisé'}',
    operator: '${operator}',
    color: '${color}',
    freq: '${freq}',
    tarif: ${tarif},
    stops: ${JSON.stringify(stopIds)}
  },`;
    setGeneratedCode(snippet);
    setShowCodeModal(true);
  };

  // Add stop to line
  const handleAddStop = (stop: Stop) => {
    if (selectedStops.some(s => s.id === stop.id)) return; // No duplicates
    setSelectedStops(prev => [...prev, stop]);
  };

  // Remove stop from line
  const handleRemoveStop = (stopId: string) => {
    setSelectedStops(prev => prev.filter(s => s.id !== stopId));
  };

  // Reorder stop
  const moveStop = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === selectedStops.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    setSelectedStops(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[newIndex];
      copy[newIndex] = temp;
      return copy;
    });
  };

  // Add custom stop
  const handleCreateCustomStop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clickedCoords || !newStopName.trim()) return;

    const newId = `cs-${Date.now()}`;
    const newStop: Stop = {
      id: newId,
      name: newStopName.trim(),
      zone: newStopZone.trim() || 'Dakar',
      lat: clickedCoords.lat,
      lng: clickedCoords.lng,
      operators: [operator],
      lines: []
    };

    // Save stop in localStorage and in STOPS
    addCustomStop(newStop);
    setAllStops([...STOPS]); // trigger list update
    
    // Automatically select the new stop for our line
    setSelectedStops(prev => [...prev, newStop]);

    // Reset clicked state
    setClickedCoords(null);
    setNewStopName('');
    setNewStopZone('');
  };

  // Save the custom line
  const handleSaveLine = () => {
    if (!lineName.trim()) {
      alert('Veuillez entrer un nom pour la ligne.');
      return;
    }
    if (selectedStops.length < 2) {
      alert('Une ligne doit comporter au moins 2 arrêts.');
      return;
    }

    const lineId = `custom-L-${operator}-${lineName.replace(/\s+/g, '-')}-${Date.now().toString().slice(-4)}`;
    
    const newLine: Line = {
      id: lineId,
      name: lineName.trim(),
      route: routeDetail.trim() || 'Tracé personnalisé',
      color: color,
      freq: freq,
      tarif: Number(tarif),
      stops: selectedStops.map(s => s.id),
      operator: operator
    };

    // Save to transportData (localStorage + in-memory array)
    addCustomLine(newLine);

    // Update stop relationships in-memory
    selectedStops.forEach(stop => {
      if (!stop.lines.includes(lineId)) {
        stop.lines.push(lineId);
      }
    });

    onSave();
  };

  return (
    <div className="fixed inset-0 z-[250] flex flex-col md:flex-row h-screen w-screen overflow-hidden" style={{ background: 'var(--c-bg)' }}>
      
      {/* MAP VIEW (Left) */}
      <div className="flex-1 h-[50vh] md:h-full relative">
        
        {/* Loader status */}
        {loadingRoute && (
          <div className="absolute top-4 right-4 z-[100] flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 text-xs font-black text-[#a78bfa] border border-[#a78bfa]/20 shadow-lg backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#a78bfa] animate-ping" />
            Tracé OSRM en cours...
          </div>
        )}

        <MapContainer center={[14.7167, -17.4677]} zoom={12} style={{ width: '100%', height: '100%' }}>
          <TileLayer 
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
            attribution="" 
          />

          {/* Click handler on map */}
          <MapClickEvents onMapClick={(lat, lng) => {
            setClickedCoords({ lat, lng });
            setNewStopName(`Arrêt ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            setNewStopZone('Dakar');
          }} />

          {/* New stop placeholder marker */}
          {clickedCoords && (
            <Marker 
              position={[clickedCoords.lat, clickedCoords.lng]} 
              icon={L.divIcon({
                className: '',
                html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#f59e0b;border:2px solid white;box-shadow:0 0 10px #f59e0b;animation:pulse 1.5s infinite">📍</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 28]
              })}
            />
          )}

          {/* Existing Stops */}
          {allStops.map(stop => {
            const isSelected = selectedStops.some(s => s.id === stop.id);
            const index = selectedStops.findIndex(s => s.id === stop.id);

            if (isSelected) {
              return (
                <Marker 
                  key={stop.id} 
                  position={[stop.lat, stop.lng]} 
                  icon={makeStopIndexIcon(index, color)}
                >
                  <Popup minWidth={150}>
                    <div className="p-1 font-sans text-xs">
                      <p className="font-black text-slate-800">{stop.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{stop.zone}</p>
                      <button 
                        onClick={() => handleRemoveStop(stop.id)}
                        className="mt-2 text-[10px] font-bold text-red-600 hover:underline"
                      >
                        Retirer de la ligne
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            }

            return (
              <CircleMarker
                key={stop.id}
                center={[stop.lat, stop.lng]}
                radius={5}
                pathOptions={{
                  fillColor: '#ffffff',
                  fillOpacity: 0.8,
                  color: '#475569',
                  weight: 1.5
                }}
                eventHandlers={{
                  click: () => handleAddStop(stop)
                }}
              >
                <Popup minWidth={150}>
                  <div className="p-1 font-sans text-xs">
                    <p className="font-bold text-slate-800">{stop.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{stop.zone}</p>
                    <button 
                      onClick={() => handleAddStop(stop)}
                      className="mt-2 text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Plus size={10} /> Ajouter à la ligne
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Traced Route Polyline */}
          {routeCoords.length > 0 && (
            <Polyline 
              positions={routeCoords} 
              pathOptions={{ 
                color: color, 
                weight: 5, 
                opacity: 0.85, 
                dashArray: 'none' 
              }} 
            />
          )}

          {/* Simple fallback straight lines in case OSRM didn't return any coordinate */}
          {routeCoords.length === 0 && selectedStops.length >= 2 && (
            <Polyline 
              positions={selectedStops.map(s => [s.lat, s.lng])} 
              pathOptions={{ 
                color: color, 
                weight: 4, 
                opacity: 0.6, 
                dashArray: '5, 8' 
              }} 
            />
          )}
        </MapContainer>

        {/* Floating guidance overlay */}
        <div className="absolute bottom-4 left-4 z-[100] max-w-sm p-4 rounded-2xl bg-slate-950/90 text-white border border-slate-800/80 shadow-2xl backdrop-blur-md">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
              <Sparkles size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1">Guide de tracé</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                1. Cliquez sur les cercles blancs pour connecter les arrêts.<br/>
                2. Cliquez n'importe où sur la carte pour créer un nouvel arrêt.<br/>
                3. Réordonnez-les dans le panneau latéral.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CONTROL SIDEBAR (Right) */}
      <div className="w-full md:w-[420px] h-[50vh] md:h-full flex flex-col bg-[#0c1220] border-t md:border-t-0 md:border-l border-slate-800/80 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg">
              <Navigation size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Créateur de Ligne</h2>
              <p className="text-[10px] text-slate-400 font-semibold">Tracé cartographique intelligent</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 active:scale-95 text-slate-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable controls */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
          
          {/* Metadata Section */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500">1. Paramètres de la Ligne</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1 block">Nom de la Ligne</label>
                <input 
                  type="text" 
                  value={lineName}
                  onChange={e => setLineName(e.target.value)}
                  placeholder="Ex: Ligne 12, AFTU 45" 
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1 block">Tracé / Description</label>
                <input 
                  type="text" 
                  value={routeDetail}
                  onChange={e => setRouteDetail(e.target.value)}
                  placeholder="Ex: Petersen ↔ Grand Yoff" 
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1 block">Opérateur</label>
                <select 
                  value={operator}
                  onChange={e => setOperator(e.target.value as OperatorId)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-violet-500 transition-colors"
                >
                  <option value="BRT">BRT</option>
                  <option value="DDD">DDD</option>
                </select>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1 block">Fréquence</label>
                <input 
                  type="text" 
                  value={freq}
                  onChange={e => setFreq(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1 block">Tarif (FCFA)</label>
                <input 
                  type="number" 
                  value={tarif}
                  onChange={e => setTarif(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 mb-1.5 block">Couleur du Tracé</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={color} 
                  onChange={e => setColor(e.target.value)}
                  className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer p-0"
                />
                <span className="text-xs font-mono text-slate-300">{color}</span>
              </div>
            </div>
          </div>

          {/* Clicked location - Stop Builder */}
          {clickedCoords && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 animate-fade-in space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-amber-500">
                  <MapPin size={16} />
                  <h4 className="text-xs font-black uppercase">Créer un nouvel arrêt</h4>
                </div>
                <button 
                  onClick={() => setClickedCoords(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleCreateCustomStop} className="space-y-2">
                <div>
                  <label className="text-[9px] font-bold text-amber-400/80 mb-1 block">Nom de l'Arrêt</label>
                  <input 
                    type="text"
                    required
                    value={newStopName}
                    onChange={e => setNewStopName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-amber-400/80 mb-1 block">Zone / Quartier</label>
                  <input 
                    type="text"
                    value={newStopZone}
                    onChange={e => setNewStopZone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button 
                    type="submit"
                    className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Check size={13} /> Ajouter l'arrêt
                  </button>
                  <button 
                    type="button"
                    onClick={() => setClickedCoords(null)}
                    className="py-1.5 px-3 rounded-lg border border-slate-800 text-slate-300 text-xs hover:bg-white/5"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Stops List Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                2. Ordre des Arrêts ({selectedStops.length})
              </h3>
              {selectedStops.length > 0 && (
                <button 
                  onClick={() => setSelectedStops([])}
                  className="text-[9px] font-bold text-red-500 hover:underline flex items-center gap-1"
                >
                  <Trash2 size={11} /> Tout effacer
                </button>
              )}
            </div>

            {selectedStops.length === 0 ? (
              <div className="p-6 text-center rounded-2xl border border-dashed border-slate-800/80 text-slate-500">
                <MapPin size={24} className="mx-auto mb-2 text-slate-600" />
                <p className="text-xs font-bold">Aucun arrêt sélectionné</p>
                <p className="text-[10px] text-slate-600 mt-1">Cliquez sur les arrêts sur la carte pour tracer la ligne.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {selectedStops.map((stop, i) => (
                  <div 
                    key={stop.id} 
                    className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-850 hover:border-slate-800 transition-colors"
                  >
                    {/* Index label */}
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                      style={{ background: color }}
                    >
                      {i + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{stop.name}</p>
                      <p className="text-[9px] text-slate-500">{stop.zone}</p>
                    </div>

                    {/* Reordering and removal controls */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button 
                        onClick={() => moveStop(i, 'up')}
                        disabled={i === 0}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/5 text-slate-400 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button 
                        onClick={() => moveStop(i, 'down')}
                        disabled={i === selectedStops.length - 1}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/5 text-slate-400 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button 
                        onClick={() => handleRemoveStop(stop.id)}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-500/10 text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900/80 border-t border-slate-800/80 space-y-2">
          
          <div className="flex gap-2">
            <button 
              onClick={handleSaveLine}
              disabled={selectedStops.length < 2 || !lineName.trim()}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-black text-white hover:opacity-95 active:scale-98 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg"
              style={{ background: `linear-gradient(135deg, ${color}, #4f46e5)` }}
            >
              <Save size={14} /> Sauvegarder
            </button>

            <button 
              onClick={handleGenerateCode}
              disabled={selectedStops.length < 2 || !lineName.trim()}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black active:scale-98 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
            >
              <FileCode size={14} /> Code
            </button>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-white/5 text-xs font-bold active:scale-98 transition-all"
          >
            Annuler
          </button>
        </div>
      </div>

      {/* CODE DISPLAY MODAL */}
      {showCodeModal && (
        <div 
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setShowCodeModal(false)}
        >
          <div 
            className="w-full max-w-lg rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-900 flex justify-between items-center bg-slate-900/40">
              <div className="flex items-center gap-2 text-violet-400">
                <FileCode size={18} />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Configuration TypeScript</h3>
              </div>
              <button 
                onClick={() => setShowCodeModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Voici le code TypeScript généré pour cette nouvelle ligne. Vous pouvez copier ce bloc et le coller directement dans le fichier <code className="px-1.5 py-0.5 rounded bg-slate-900 text-violet-300 font-mono text-[10px]">src/data/transportData.ts</code> pour l'intégrer de manière permanente.
              </p>

              <div className="relative">
                <pre className="p-4 rounded-2xl bg-slate-900 border border-slate-850 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-[250px] leading-normal select-all">
                  {generatedCode}
                </pre>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(generatedCode);
                    alert('Code copié dans le presse-papiers !');
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black active:scale-95 transition-all"
                >
                  Copier le code
                </button>
                <button 
                  onClick={() => setShowCodeModal(false)}
                  className="py-3 px-4 rounded-xl border border-slate-800 text-slate-300 text-xs font-bold hover:bg-white/5"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
