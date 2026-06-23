import React, { useState, useMemo } from 'react';
import AdManagerPage from './AdManagerPage';
import AnalyticsPage from './AnalyticsPage';
import LineCreator from '@/components/admin/LineCreator';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout, acknowledgeReport, showToast } from '@/store/store';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { LINES, OPERATORS, INCIDENT_TYPES } from '@/data/transportData';
import { MOCK_DRIVERS } from '@/services/simulation';
import type { BusPosition, OperatorId } from '@/types';
import ToastContainer from '@/components/ToastContainer';

const makeBusIcon = (color: string, big = false) => L.divIcon({
  className: '',
  html: `<div style="position:relative;width:${big?28:20}px;height:${big?28:20}px">
    <div style="position:absolute;inset:0;border-radius:50%;background:${color}25;animation:pulse-ring 2.5s ease-out infinite"></div>
    <div style="position:absolute;inset:${big?3:2}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 ${big?16:10}px ${color}99;display:flex;align-items:center;justify-content:center;font-size:${big?9:7}px">🚌</div>
  </div>
  <style>@keyframes pulse-ring{0%{transform:scale(.8);opacity:.8}100%{transform:scale(2.2);opacity:0}}</style>`,
  iconSize: [big?28:20, big?28:20], iconAnchor: [big?14:10, big?14:10],
});

// ── Types ─────────────────────────────────────────────────────
type BusStatus = 'active' | 'idle' | 'maintenance' | 'garage';
const STATUS_CONFIG: Record<BusStatus, { label: string; color: string; bg: string; emoji: string }> = {
  active:      { label: 'En service',   color: '#4ade80', bg: 'rgba(74,222,128,.12)',  emoji: '🟢' },
  idle:        { label: 'En pause',     color: '#fbbf24', bg: 'rgba(251,191,36,.12)',  emoji: '🟡' },
  maintenance: { label: 'Maintenance',  color: '#f87171', bg: 'rgba(248,113,113,.12)', emoji: '🔴' },
  garage:      { label: 'Au garage',    color: '#94a3b8', bg: 'rgba(148,163,184,.12)', emoji: '⚫' },
};

interface FleetBus {
  id: string; plate: string; operator: string; lineId: string;
  status: BusStatus; driver: string; driverPhone: string;
  maintenanceDate?: string; maintenanceNote?: string;
  kmTotal?: number; avgOccupancy?: number;
}

const INITIAL_FLEET: FleetBus[] = Object.entries(MOCK_DRIVERS).map(([busId, d], i) => ({
  id: busId, plate: d.plate, operator: d.operator, lineId: d.lineId,
  status: i < 7 ? 'active' : i === 7 ? 'maintenance' : i === 8 ? 'idle' : 'garage',
  driver: d.name, driverPhone: d.phone,
  kmTotal: Math.floor(12000 + Math.random() * 80000),
  avgOccupancy: Math.floor(45 + Math.random() * 40),
  maintenanceDate: i === 7 ? new Date(Date.now() + 7*24*3600*1000).toISOString().slice(0,10) : undefined,
  maintenanceNote: i === 7 ? 'Révision vidange + freins' : undefined,
}));

const opColor = (op: string) => OPERATORS[op]?.color || '#64748b';

// ── Bus Detail Modal ──────────────────────────────────────────
function BusModal({ bus, busPositions, onClose, onUpdate }: {
  bus: FleetBus; busPositions: BusPosition[];
  onClose: () => void; onUpdate: (id: string, updates: Partial<FleetBus>) => void;
}) {
  const [status, setStatus] = useState<BusStatus>(bus.status);
  const [maintDate, setMaintDate] = useState(bus.maintenanceDate || '');
  const [maintNote, setMaintNote] = useState(bus.maintenanceNote || '');
  const [driver, setDriver] = useState(bus.driver);
  const [phone, setPhone] = useState(bus.driverPhone);
  const live = busPositions.find(b => b.lineId === bus.lineId);
  const line = LINES.find(l => l.id === bus.lineId);
  const cfg = STATUS_CONFIG[status];

  const save = () => {
    onUpdate(bus.id, { status, maintenanceDate: maintDate || undefined, maintenanceNote: maintNote || undefined, driver, driverPhone: phone });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(16px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden animate-slide-up"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border2)', boxShadow: 'var(--shadow-xl)', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div className="p-5" style={{ background: `linear-gradient(145deg, ${opColor(bus.operator)}20, transparent)`, borderBottom: '1px solid var(--c-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: opColor(bus.operator) + '20' }}>🚌</div>
              <div>
                <h2 className="text-xl font-black text-white">{bus.plate}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: opColor(bus.operator) }}>{bus.operator}</span>
                  <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.emoji} {cfg.label}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-11 h-11 rounded-xl flex items-center justify-center btn btn-ghost text-sm">✕</button>
          </div>

          {/* Live status */}
          {live && bus.status === 'active' && (
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.2)' }}>
              <span className="w-2 h-2 rounded-full bg-green-400" style={{ animation: 'live-pulse 2s infinite' }} />
              <span className="text-xs font-bold text-white">En circulation</span>
              <span className="text-xs" style={{ color: '#64748b' }}>{live.speed} km/h · {live.occupancy}% plein</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 p-4" style={{ borderBottom: '1px solid var(--c-border)' }}>
          {[
            { l: 'Kilométrage', v: `${Math.round((bus.kmTotal||0)/1000)}k km`, e: '📏' },
            { l: 'Occupation moy.', v: `${bus.avgOccupancy}%`, e: '👥' },
            { l: 'Ligne', v: line?.name || bus.lineId, e: '🛤️' },
          ].map((s, i) => (
            <div key={i} className="text-center py-3 rounded-xl" style={{ background: 'rgba(255,255,255,.04)' }}>
              <div className="text-lg mb-1">{s.e}</div>
              <div className="text-sm font-black text-white">{s.v}</div>
              <div className="text-[10px]" style={{ color: '#334155' }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Edit fields */}
        <div className="p-4 space-y-4">
          {/* Status */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest mb-2 block" style={{ color: 'var(--c-muted)' }}>Statut</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(STATUS_CONFIG) as [BusStatus, typeof STATUS_CONFIG[BusStatus]][]).map(([key, cfg]) => (
                <button key={key} onClick={() => setStatus(key)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                  style={status === key
                    ? { background: cfg.bg, border: `1px solid ${cfg.color}50`, color: 'white' }
                    : { background: 'rgba(255,255,255,.03)', border: '1px solid var(--c-border)', color: '#64748b' }}>
                  <span>{cfg.emoji}</span><span>{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Maintenance */}
          {(status === 'maintenance' || maintDate) && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest mb-2 block" style={{ color: 'var(--c-muted)' }}>Maintenance</label>
              <input type="date" value={maintDate} onChange={e => setMaintDate(e.target.value)} className="input mb-2" />
              <input type="text" value={maintNote} onChange={e => setMaintNote(e.target.value)} placeholder="Motif (ex: révision moteur, freins…)" className="input" />
            </div>
          )}

          {/* Driver */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest mb-2 block" style={{ color: 'var(--c-muted)' }}>Chauffeur assigné</label>
            <input value={driver} onChange={e => setDriver(e.target.value)} placeholder="Prénom Nom" className="input mb-2" />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+221 77 000 00 00" className="input" />
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-5">
          <button onClick={save} className="flex-1 btn btn-primary py-3">✓ Sauvegarder</button>
          <button onClick={onClose} className="btn btn-ghost px-5">Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ── Main AdminApp ─────────────────────────────────────────────
export default function AdminApp() {
  const dispatch = useAppDispatch();
  const { busPositions }          = useAppSelector(s => s.mobility);
  const { adminRevenue, reports } = useAppSelector(s => s.tickets);
  const { name }                  = useAppSelector(s => s.auth);
  const darkMode                  = useAppSelector(s => s.ui.darkMode);

  const [activeTab, setActiveTab] = useState<'map'|'fleet'|'routes'|'alerts'|'finance'|'ads'|'analytics'|'audit'>('map');
  const [selectedLine, setSelectedLine] = useState<string|null>(null);
  const [mapSidebarOpen, setMapSidebarOpen] = useState(false);
  const [fleet, setFleet]         = useState<FleetBus[]>(INITIAL_FLEET);
  const [showAdd, setShowAdd]     = useState(false);
  const [newBus, setNewBus]       = useState({ plate:'', operator:'DDD', lineId:'L8', driver:'', driverPhone:'' });
  const [addErrors, setAddErrors] = useState<Record<string,string>>({});
  const [searchQ, setSearchQ]     = useState('');
  const [statusFilter, setStatusFilter] = useState<BusStatus|'all'>('all');
  const [selectedBusModal, setSelectedBusModal] = useState<FleetBus|null>(null);
  const [showLineCreator, setShowLineCreator] = useState(false);
  const [auditLogs, setAuditLogs] = useState<{id:string, time:number, action:string}[]>([
    { id: 'a1', time: Date.now() - 3600000, action: 'Connexion administrateur' },
  ]);

  const totalRevenue = (['BRT','DDD'] as OperatorId[]).reduce((s,op)=>s+adminRevenue[op],0);
  const pendingAlerts = reports.filter(r=>Date.now()-r.timestamp<1000*60*60).length;

  // Fleet stats
  const fleetStats = useMemo(() => ({
    active:      fleet.filter(b=>b.status==='active').length,
    idle:        fleet.filter(b=>b.status==='idle').length,
    maintenance: fleet.filter(b=>b.status==='maintenance').length,
    garage:      fleet.filter(b=>b.status==='garage').length,
  }), [fleet]);

  const filteredFleet = useMemo(() =>
    fleet.filter(b => {
      const matchStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchQ = !searchQ || [b.plate,b.driver,b.lineId,b.operator].some(f=>f.toLowerCase().includes(searchQ.toLowerCase()));
      return matchStatus && matchQ;
    }), [fleet, searchQ, statusFilter]
  );

  const updateBus = (id: string, updates: Partial<FleetBus>) => {
    setFleet(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    dispatch(showToast({ type: 'success', message: 'Bus mis à jour !' }));
    setAuditLogs(p => [{ id: `log_${Date.now()}`, time: Date.now(), action: `Mise à jour du bus ${id}` }, ...p]);
  };

  const addBus = () => {
    const e: Record<string,string> = {};
    if (!newBus.plate)  e.plate='Requis';
    if (!newBus.driver) e.driver='Requis';
    setAddErrors(e);
    if (Object.keys(e).length) return;
    setFleet(p=>[...p,{...newBus,id:`bus_${Date.now()}`,status:'idle',kmTotal:0,avgOccupancy:0}]);
    dispatch(showToast({type:'success',message:'Véhicule ajouté !'}));
    setAuditLogs(p => [{ id: `log_${Date.now()}`, time: Date.now(), action: `Ajout nouveau bus: ${newBus.plate}` }, ...p]);
    setShowAdd(false); setNewBus({plate:'',operator:'DDD',lineId:'L8',driver:'',driverPhone:''});
  };

  const exportCSV = () => {
    const rows=[['Operateur','Revenus (FCFA)','Part (%)'],
      ...(['BRT','DDD'] as OperatorId[]).map(op=>[op,adminRevenue[op].toString(),
        totalRevenue>0?((adminRevenue[op]/totalRevenue)*100).toFixed(1)+'%':'0%']),
      ['TOTAL',totalRevenue.toString(),'100%']];
    const blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=`dakarbus_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    dispatch(showToast({type:'success',message:'CSV téléchargé !'}));
    setAuditLogs(p => [{ id: `log_${Date.now()}`, time: Date.now(), action: `Export CSV des revenus` }, ...p]);
  };

  const exportPDF = () => {
    dispatch(showToast({ type: 'info', message: 'Génération du PDF en cours...' }));
    setTimeout(() => {
      window.print();
      setAuditLogs(p => [{ id: `log_${Date.now()}`, time: Date.now(), action: `Export PDF Rapport Réseau` }, ...p]);
    }, 1000);
  };

  const tabs: {id:typeof activeTab;label:string;icon:string;badge?:number}[] = [
    {id:'map',       label:'Carte',     icon:'🗺️'},
    {id:'fleet',     label:'Flotte',    icon:'🚌'},
    {id:'routes',    label:'Lignes',    icon:'🛤️'},
    {id:'alerts',    label:'Alertes',   icon:'⚠️', badge:pendingAlerts},
    {id:'finance',   label:'Revenus',   icon:'💰'},
    {id:'analytics', label:'Analytics', icon:'📊'},
    {id:'ads',       label:'Pub',       icon:'📢'},
    {id:'audit',     label:'Audit',     icon:'📋'},
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{background:'var(--c-bg)'}}>
      <ToastContainer />
      {selectedBusModal && (
        <BusModal bus={selectedBusModal} busPositions={busPositions}
          onClose={()=>setSelectedBusModal(null)}
          onUpdate={updateBus} />
      )}

      {showLineCreator && (
        <LineCreator 
          onClose={() => setShowLineCreator(false)}
          onSave={() => {
            setShowLineCreator(false);
            dispatch(showToast({ type: 'success', message: 'Ligne créée avec succès !' }));
          }}
        />
      )}

      {/* Header */}
      <header className="flex-shrink-0 h-14 flex items-center justify-between px-4 glass-panel"
        style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{background:'linear-gradient(135deg,#5b21b6,#7c3aed)',boxShadow:'0 4px 16px rgba(124,58,237,.4)',fontSize:15}}>🛡️</div>
          <div>
            <div className="text-sm font-black text-white leading-none">Admin · {name}</div>
            <div className="text-[10px] font-semibold mt-0.5" style={{color:'#a78bfa'}}>SunuBus · Supervision</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="badge badge-live px-2.5 py-1 rounded-lg text-[10px] font-black"
            style={{background:'rgba(5,150,105,.1)',color:'#34d399',border:'1px solid rgba(5,150,105,.2)'}}>
            {busPositions.filter(b=>b.lineId).length} actifs
          </div>
          <button onClick={()=>{ if(window.confirm('Se déconnecter ?')) dispatch(logout()); }} className="btn btn-danger" style={{padding:'8px 14px',fontSize:12,minHeight:40}}>Déco.</button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex-shrink-0 flex overflow-x-auto whitespace-nowrap scrollbar-hide glass" style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors min-w-[75px] px-2"
            style={{color:activeTab===t.id?'#a78bfa':'#475569',borderBottom:activeTab===t.id?'2px solid #7c3aed':'2px solid transparent',minHeight:48}}>
            <span className="text-base">{t.icon}</span>
            <span className="text-[10px] font-black">{t.label}</span>
            {t.badge!=null&&t.badge>0&&(
              <span className="absolute top-1 right-1/4 w-4 h-4 rounded-full text-white text-xs font-black flex items-center justify-center"
                style={{background:'#dc2626',boxShadow:'0 2px 8px rgba(220,38,38,.5)'}}>
                {t.badge>9?'9+':t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">

        {/* ── MAP ── */}
        {activeTab==='map'&&(
          <div className="flex-1 flex overflow-hidden relative">
            {/* Sidebar — masquée sur mobile, visible sur md+ */}
            <aside className={`flex-col overflow-hidden flex-shrink-0 transition-all ${mapSidebarOpen ? 'flex absolute inset-0 z-[200] md:relative md:inset-auto' : 'hidden md:flex'}`}
              style={{background:'var(--c-surface)',borderRight:'1px solid var(--c-border)',width: mapSidebarOpen ? '100%' : 240}}>
              <div className="p-3 flex-shrink-0 flex items-center gap-2" style={{borderBottom:'1px solid var(--c-border)'}}>
                <button onClick={()=>setSelectedLine(null)}
                  className="flex-1 text-left px-3 py-2 rounded-xl text-xs font-black transition-all"
                  style={!selectedLine?{background:'rgba(124,58,237,.2)',color:'#c4b5fd',border:'1px solid rgba(124,58,237,.3)'}:{color:'#64748b'}}>
                  🌐 Toutes · {busPositions.length} bus
                </button>
                {/* Fermer sur mobile */}
                <button onClick={()=>setMapSidebarOpen(false)} className="md:hidden w-11 h-11 rounded-xl flex items-center justify-center btn btn-ghost text-base">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {LINES.map(line=>{
                  const n=busPositions.filter((b:BusPosition)=>b.lineId===line.id).length;
                  const a=selectedLine===line.id;
                  return(
                    <button key={line.id} onClick={()=>{ setSelectedLine(a?null:line.id); setMapSidebarOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-3 rounded-xl mb-1 text-left transition-all active:scale-95"
                      style={{background:a?'rgba(255,255,255,.07)':'transparent',minHeight:44}}
                      onMouseEnter={e=>{if(!a)e.currentTarget.style.background='rgba(255,255,255,.04)'}}
                      onMouseLeave={e=>{if(!a)e.currentTarget.style.background='transparent'}}>
                      <span className="w-1.5 h-6 rounded-full flex-shrink-0" style={{background:line.color}}/>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{line.name}</div>
                        <div className="text-xs truncate" style={{color:'#475569'}}>{line.operator}</div>
                      </div>
                      {n>0&&<span className="text-xs font-black px-2 py-1 rounded-md flex-shrink-0" style={{background:'rgba(74,222,128,.15)',color:'#4ade80'}}>{n}</span>}
                    </button>
                  );
                })}
              </div>
            </aside>
            <div className="flex-1 relative">
              {/* Bouton toggle lignes sur mobile */}
              <button onClick={()=>setMapSidebarOpen(true)}
                className="md:hidden absolute z-[100] flex items-center gap-2 px-3 py-2 rounded-xl shadow-xl"
                style={{top:12,left:12,background:'rgba(10,15,30,.9)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,.15)',color:'white',fontSize:13,fontWeight:800,minHeight:40}}>
                📋 {selectedLine ? LINES.find(l=>l.id===selectedLine)?.name : 'Lignes'}
              </button>
              <MapContainer center={[14.7167,-17.4677]} zoom={12} style={{width:'100%',height:'100%'}}>
                <TileLayer url={darkMode ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"} attribution="" />
                {busPositions.map((bus:BusPosition,i:number)=>{
                  const line=LINES.find(l=>l.id===bus.lineId);
                  const color=line?.color||'#10b981';
                  const d=MOCK_DRIVERS[bus.busId]??Object.values(MOCK_DRIVERS).find(d=>d.lineId===bus.lineId);
                  if(selectedLine&&bus.lineId!==selectedLine)return null;
                  const isFocused=selectedLine===bus.lineId;
                  return(
                    <Marker key={i} position={[bus.lat,bus.lng]} icon={makeBusIcon(color,isFocused)}>
                      <Popup minWidth={200}>
                        <div style={{padding:12,fontFamily:'Inter',fontSize:12}}>
                          <div style={{fontWeight:900,color,marginBottom:6}}>{line?.name} — {line?.operator}</div>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,color:'#94a3b8'}}>
                            <span>🚌 {d?.plate??'N/A'}</span>
                            <span style={{color:'#4ade80',fontWeight:700}}>{bus.speed} km/h</span>
                            <span>👤 {d?.name??'—'}</span>
                            <span>👥 {bus.occupancy}%</span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>
        )}

        {/* ── FLEET ── */}
        {activeTab==='fleet'&&(
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Stats bar */}
            <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-3" style={{borderBottom:'1px solid var(--c-border)',background:'rgba(255,255,255,.01)'}}>
              {(Object.entries(fleetStats) as [BusStatus, number][]).map(([key, count]) => {
                const cfg = STATUS_CONFIG[key];
                return (
                  <button key={key}
                    onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all active:scale-95"
                    style={{minHeight:44,background:statusFilter===key?cfg.bg:'rgba(255,255,255,.03)',border:statusFilter===key?`1px solid ${cfg.color}40`:'1px solid var(--c-border)'}}>
                    <div className="text-lg font-black text-white">{count}</div>
                    <div className="text-xs font-bold leading-tight" style={{color:cfg.color}}>{cfg.emoji} {cfg.label}</div>
                  </button>
                );
              })}
            </div>

            {/* Toolbar */}
            <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5" style={{borderBottom:'1px solid var(--c-border)'}}>
              <input value={searchQ} onChange={e=>setSearchQ(e.target.value)}
                placeholder="🔍 Plaque, chauffeur, ligne…" className="input flex-1" style={{fontSize:12,padding:'6px 12px'}} />
              <button onClick={()=>setShowAdd(true)} className="btn btn-primary flex-shrink-0" style={{padding:'8px 14px',fontSize:12,minHeight:40}}>+ Ajouter</button>
            </div>

            {/* Add form */}
            {showAdd&&(
              <div className="flex-shrink-0 mx-4 my-2 card rounded-2xl p-4 animate-fade-up">
                <h3 className="font-black text-sm text-white mb-3">Nouveau véhicule</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[{k:'plate',ph:'DK-1234-AB'},{k:'driver',ph:'Prénom Nom'},{k:'driverPhone',ph:'+221 77 …'}].map(f=>(
                    <div key={f.k}>
                      <input placeholder={f.ph} value={(newBus as any)[f.k]}
                        onChange={e=>setNewBus(p=>({...p,[f.k]:e.target.value}))}
                        className={`input ${addErrors[f.k]?'border-red-500':''}`} />
                      {addErrors[f.k]&&<p className="text-[10px] text-red-400 mt-0.5">{addErrors[f.k]}</p>}
                    </div>
                  ))}
                  <select value={newBus.operator} onChange={e=>setNewBus(p=>({...p,operator:e.target.value}))} className="input">
                    {['BRT','DDD'].map(op=><option key={op}>{op}</option>)}
                  </select>
                  <select value={newBus.lineId} onChange={e=>setNewBus(p=>({...p,lineId:e.target.value}))} className="input">
                    {LINES.filter(l=>l.operator===newBus.operator).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={addBus} className="flex-1 btn btn-primary">✓ Enregistrer</button>
                  <button onClick={()=>setShowAdd(false)} className="btn btn-ghost px-4">Annuler</button>
                </div>
              </div>
            )}

            {/* Fleet list */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
              {filteredFleet.length===0&&(
                <div className="text-center py-12" style={{color:'#1e293b'}}>
                  <div className="text-5xl mb-3">🚌</div>
                  <p className="font-bold">Aucun véhicule</p>
                </div>
              )}
              {filteredFleet.map(bus=>{
                const line=LINES.find(l=>l.id===bus.lineId);
                const isLive=bus.status==='active'&&busPositions.some((b:BusPosition)=>b.lineId===bus.lineId);
                const cfg=STATUS_CONFIG[bus.status];
                return(
                  <div key={bus.id}
                    className={`card rounded-2xl p-4 cursor-pointer hover-scale transition-all ${
                      bus.operator === 'DDD' ? 'glow-card-ddd' :
                      bus.operator === 'BRT' ? 'glow-card-brt' : ''
                    }`}
                    onClick={()=>setSelectedBusModal(bus)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{background:opColor(bus.operator)+'20'}}>🚌</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="font-black text-white text-sm">{bus.plate}</span>
                          <span className="badge text-white" style={{background:opColor(bus.operator),fontSize:11}}>{bus.operator}</span>
                          <span className="badge" style={{background:cfg.bg,color:cfg.color,fontSize:11}}>{cfg.emoji} {cfg.label}</span>
                          {isLive&&<span className="badge" style={{background:'rgba(74,222,128,.1)',color:'#4ade80',fontSize:11}}>● Live</span>}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs" style={{color:'#64748b'}}>
                          <span>👤 {bus.driver}</span>
                          {line&&<span style={{color:line.color}}>🛤️ {line.name}</span>}
                          {bus.maintenanceDate&&<span style={{color:'#f87171'}}>🔧 {bus.maintenanceDate}</span>}
                        </div>
                      </div>
                      <span className="text-lg" style={{color:'#1e293b'}}>→</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ROUTES ── */}
        {activeTab==='routes'&&(
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-4 gap-2">
              <h2 className="font-black text-white">{LINES.length} lignes</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowLineCreator(true)} className="btn btn-primary" style={{padding:'8px 14px',fontSize:12,minHeight:40}}>
                  + Créer une ligne
                </button>
                <span className="badge" style={{background:'rgba(74,222,128,.1)',color:'#4ade80',border:'1px solid rgba(74,222,128,.2)'}}>
                  {busPositions.length} bus actifs
                </span>
              </div>
            </div>
            {(['BRT','DDD'] as const).map(op=>{
              const opLines=LINES.filter(l=>l.operator===op);
              if(!opLines.length)return null;
              return(
                <div key={op} className="mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{background:opColor(op)}}/>
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{color:opColor(op)}}>{OPERATORS[op]?.fullName}</span>
                  </div>
                  {opLines.map(line=>{
                    const n=busPositions.filter((b:BusPosition)=>b.lineId===line.id).length;
                    return(
                      <div key={line.id} className={`card rounded-xl p-3 mb-1.5 flex items-center gap-3 hover-scale transition-all ${
                        line.operator === 'DDD' ? 'glow-card-ddd' :
                        line.operator === 'BRT' ? 'glow-card-brt' : ''
                      }`}>
                        <span className="w-1.5 h-10 rounded-full flex-shrink-0" style={{background:line.color}}/>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-white text-sm">{line.name}</div>
                          <div className="text-xs truncate" style={{color:'#64748b'}}>{line.route}</div>
                          <div className="text-xs mt-0.5" style={{color:'#334155'}}>{line.stops.length} arrêts · {line.freq} · {line.tarif} FCFA</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-lg font-black" style={{color:n>0?'#4ade80':'#1e293b'}}>{n}</div>
                          <div className="text-xs" style={{color:'#334155'}}>bus</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* ── ALERTS ── */}
        {activeTab==='alerts'&&(
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-white">Incidents</h2>
              <span className="badge" style={pendingAlerts>0?{background:'rgba(220,38,38,.1)',color:'#f87171',border:'1px solid rgba(220,38,38,.2)'}:{background:'rgba(74,222,128,.1)',color:'#4ade80',border:'1px solid rgba(74,222,128,.2)'}}>
                {pendingAlerts>0?`${pendingAlerts} en cours`:'✓ RAS'}
              </span>
            </div>
            {reports.length===0?(
              <div className="text-center py-16" style={{color:'#1e293b'}}><div className="text-5xl mb-3">✅</div><p className="font-bold">Aucun incident</p></div>
            ):(
              <div className="space-y-3">
                {reports.map(r=>{
                  const incType = INCIDENT_TYPES.find(t => t.id === r.type);
                  const meta = incType ? { e: incType.emoji, c: incType.color, l: incType.label } : { e: '⚠️', c: '#64748b', l: 'Incident' };
                  const min=Math.floor((Date.now()-r.timestamp)/60000);
                  return(
                    <div key={r.id} className="card rounded-2xl p-4">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{background:meta.c+'20'}}>{meta.e}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-white text-sm">{meta.l}</span>
                            <span className="badge" style={{background:meta.c+'25',color:'white',fontSize:11}}>Il y a {min<1?'<1':min} min</span>
                            <span className="badge" style={{background:'rgba(255,255,255,.05)',color:'#475569',fontSize:11}}>👍 {r.upvotes}</span>
                          </div>
                          <p className="text-xs mt-1.5 leading-relaxed" style={{color:'#94a3b8'}}>{r.description}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>dispatch(acknowledgeReport(r.id))} className="btn" style={{padding:'8px 14px',fontSize:12,minHeight:40,background:'rgba(74,222,128,.1)',color:'#4ade80',border:'1px solid rgba(74,222,128,.2)'}}>✓ Acquitter</button>
                        <button className="btn" style={{padding:'8px 14px',fontSize:12,minHeight:40,background:'rgba(124,58,237,.1)',color:'#a78bfa',border:'1px solid rgba(124,58,237,.2)'}}>📞 Contacter</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── FINANCE ── */}
        {activeTab==='finance'&&(
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="rounded-3xl p-6 relative overflow-hidden gradient-border-animated shadow-xl"
              style={{background:'linear-gradient(135deg,#2e1065,#1d4ed8)'}}>
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-10" style={{background:'white'}}/>
              <p className="text-sm font-semibold mb-2 relative" style={{color:'rgba(216,180,254,.8)'}}>CA Global · Aujourd'hui</p>
              <h3 className="text-4xl font-black text-white tracking-tight relative">
                {totalRevenue.toLocaleString('fr-FR')}<span className="text-xl ml-1" style={{color:'rgba(216,180,254,.7)'}}>F</span>
              </h3>
              <div className="mt-3 flex items-center gap-2 relative">
                <span className="badge" style={{background:'rgba(74,222,128,.2)',color:'#4ade80'}}>↑ +14.5%</span>
                <span className="text-xs" style={{color:'rgba(216,180,254,.6)'}}>vs hier</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(['BRT','DDD'] as OperatorId[]).map(op=>{
                const pct=totalRevenue>0?(adminRevenue[op]/totalRevenue*100):0;
                return(
                  <div key={op} className={`card rounded-2xl p-4 hover-scale transition-all ${
                    op === 'DDD' ? 'glow-card-ddd' :
                    op === 'BRT' ? 'glow-card-brt' : ''
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-3.5 h-3.5 rounded-full" style={{background:opColor(op)}}/>
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{color:'#475569'}}>{op}</span>
                    </div>
                    <h4 className="text-xl font-black text-white mb-2">{adminRevenue[op].toLocaleString('fr-FR')}<span className="text-[10px] text-slate-500 ml-1">FCFA</span></h4>
                    <div className="rounded-full overflow-hidden mb-1" style={{height:4,background:'rgba(255,255,255,.06)'}}>
                      <div className="h-full rounded-full transition-all" style={{background:opColor(op),width:`${pct.toFixed(0)}%`}}/>
                    </div>
                    <p className="text-[10px]" style={{color:'#334155'}}>{pct.toFixed(1)}%</p>
                  </div>
                );
              })}
            </div>
            <div className="card rounded-2xl p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black uppercase tracking-widest" style={{color:'#475569'}}>Transactions récentes</h3>
                <div className="flex gap-2">
                  <button onClick={exportCSV} className="btn" style={{padding:'8px 14px',fontSize:12,minHeight:40,background:'rgba(5,150,105,.15)',color:'#34d399',border:'1px solid rgba(5,150,105,.2)'}}>⬇ CSV</button>
                  <button onClick={exportPDF} className="btn" style={{padding:'8px 14px',fontSize:12,minHeight:40,background:'rgba(220,38,38,.15)',color:'#f87171',border:'1px solid rgba(220,38,38,.2)'}}>📄 PDF</button>
                </div>
              </div>
              <div className="space-y-2">
                {[{id:'T-8F9A',op:'BRT',p:300,t:"À l'instant",m:'Wave'},{id:'T-2B4C',op:'DDD',p:200,t:'Il y a 2 min',m:'Orange Money'},{id:'T-7D3A',op:'BRT',p:300,t:'Il y a 5 min',m:'Wave'},{id:'T-5C7F',op:'DDD',p:200,t:'Il y a 8 min',m:'Free Money'}].map((tx,i)=>(
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{background:'rgba(255,255,255,.03)'}}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-xs flex-shrink-0" style={{background:opColor(tx.op)}}>{tx.op[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-white">{tx.id}</div>
                      <div className="text-[10px]" style={{color:'#475569'}}>{tx.t} · {tx.m}</div>
                    </div>
                    <div className="font-black text-sm" style={{color:'#4ade80'}}>+{tx.p} F</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {activeTab==='analytics'&&(
          <div className="flex-1 overflow-hidden">
            <AnalyticsPage operator="DDD" />
          </div>
        )}

        {/* ── PUBLICITÉ ── */}
        {activeTab==='ads'&&(
          <div className="flex-1 overflow-hidden">
            <AdManagerPage />
          </div>
        )}

        {/* ── AUDIT ── */}
        {activeTab==='audit'&&(
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <h2 className="font-black text-white text-lg mb-4">Journal d'Audit (Logs)</h2>
            {auditLogs.map(log => (
              <div key={log.id} className="card rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{background:'rgba(124,58,237,.15)'}}>
                  📋
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-white text-sm truncate">{log.action}</div>
                  <div className="text-[11px]" style={{color:'#64748b'}}>Il y a {Math.floor((Date.now() - log.time)/60000)} min</div>
                </div>
                <div className="text-xs font-bold px-2 py-1 rounded-md" style={{background:'rgba(255,255,255,.05)',color:'#475569'}}>
                  {new Date(log.time).toLocaleTimeString('fr-FR')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
