import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { buyTicket, useTicket, showToast, buyPass, PASS_CATALOG } from '@/store/store';
import type { PassType } from '@/store/store';
import { usePopBack } from '@/hooks/usePopBack';
import { QRCodeSVG } from 'qrcode.react';
import { AdSlot } from '@/components/AdBanner';
import PaymentModal from '@/components/PaymentModal';

const OPS = [
  { op:'BRT'  as const, p:300, c:'#00b450', e:'🚍', l:'BRT Climatisé', s:'Bus Rapid Transit' },
  { op:'DDD'  as const, p:200, c:'#2563eb', e:'🚌', l:'Bus Urbain',    s:'Dakar Dem Dikk' },
];

const PAY = [
  { id:'wave',   l:'Wave',         e:'🌊', g:'linear-gradient(135deg,#00c5e3,#0082a3)' },
  { id:'orange', l:'Orange Money', e:'🟠', g:'linear-gradient(135deg,#f97316,#c2410c)' },
  { id:'free',   l:'Free Money',   e:'🏦', g:'linear-gradient(135deg,#7c3aed,#4c1d95)' },
];

const PAY_METHODS = [
  { id:'wave',   l:'Wave',         e:'🌊', g:'linear-gradient(135deg,#00c5e3,#0082a3)' },
  { id:'orange', l:'Orange Money', e:'🟠', g:'linear-gradient(135deg,#f97316,#c2410c)' },
  { id:'free',   l:'Free Money',   e:'🏦', g:'linear-gradient(135deg,#7c3aed,#4c1d95)' },
];

function fmtFcfa(n: number) {
  return n.toLocaleString('fr-FR') + ' FCFA';
}
function daysLeft(ts: number) {
  return Math.max(0, Math.ceil((ts - Date.now()) / 86_400_000));
}

// ── Section Pass Mensuel ─────────────────────────────────────
function PassSection() {
  const dispatch = useAppDispatch();
  const myPasses = useAppSelector(s => s.passes.myPasses);
  const [buying, setBuying] = useState<PassType | null>(null);
  const [holderName, setHolderName] = useState('');
  const [passTab, setPassTab] = useState<'mes_pass'|'acheter'>('mes_pass');
  const [showPayModal, setShowPayModal] = useState(false);
  usePopBack(() => { setShowPayModal(false); setBuying(null); setHolderName(''); }, showPayModal || !!buying);

  const activeCount = myPasses.filter(p => p.status === 'active').length;

  const confirmBuy = (method: string, _ref: string) => {
    if (!buying) return;
    dispatch(buyPass({ type: buying, holderName: holderName || 'Passager', payMethod: method }));
    dispatch(showToast({ type: 'success', message: `✅ Pass activé ! Valable 30 jours.` }));
    setShowPayModal(false);
    setBuying(null);
    setHolderName('');
    setPassTab('mes_pass');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs */}
      <div className="flex gap-1.5 p-1 mx-4 mt-3 rounded-2xl" style={{ background: 'var(--c-surface)' }}>
        {[{ id:'mes_pass', l:`Mes pass${activeCount>0?` (${activeCount})`:''}` }, { id:'acheter', l:'Acheter un pass' }].map(t => (
          <button key={t.id} onClick={() => setPassTab(t.id as any)}
            className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all"
            style={passTab===t.id ? { background:'#7c3aed', color:'white' } : { color:'#475569' }}>
            {t.l}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-24 space-y-3">
        {passTab === 'mes_pass' && (
          myPasses.length === 0 ? (
            <div className="text-center mt-10">
              <div className="text-5xl mb-3">🎟</div>
              <p className="font-black text-white">Aucun pass actif</p>
              <p className="text-sm mt-1 mb-5" style={{ color:'#475569' }}>Un pass mensuel vous fait économiser jusqu'à 40%</p>
              <button onClick={() => setPassTab('acheter')} className="btn btn-primary px-8">Voir les pass</button>
            </div>
          ) : myPasses.map(p => {
            const cfg = PASS_CATALOG[p.type];
            const left = daysLeft(p.validUntil);
            const pct = Math.round((left / 30) * 100);
            const isActive = p.status === 'active' && left > 0;
            return (
              <div key={p.id} className="rounded-3xl overflow-hidden"
                style={{ background: `linear-gradient(160deg,${cfg.color}15,var(--c-surface) 60%)`, border:`1px solid ${cfg.color}${isActive?'40':'15'}` }}>
                <div className="h-1" style={{ background: isActive ? cfg.color : '#1e293b' }} />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{cfg.emoji}</span>
                      <div>
                        <div className="font-black text-white">{cfg.label}</div>
                        <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{p.holderName}</div>
                      </div>
                    </div>
                    <span className="badge" style={isActive
                      ? { background:'rgba(34,197,94,.12)', color:'#4ade80', border:'1px solid rgba(34,197,94,.2)' }
                      : { background:'rgba(255,255,255,.05)', color:'#475569' }}>
                      {isActive ? `✓ ACTIF` : '✗ EXPIRÉ'}
                    </span>
                  </div>
                  {/* Validity bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color:'#475569' }}>Validité</span>
                      <span className="font-black" style={{ color: left <= 5 ? '#f87171' : '#94a3b8' }}>
                        {isActive ? `${left}j restants` : 'Expiré'}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,.08)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background: cfg.color }} />
                    </div>
                  </div>
                  {/* Stats */}
                  <div className="flex gap-4 text-xs">
                    <span style={{ color:'#475569' }}>🚌 <strong className="text-white">{p.usedRides}</strong> trajets</span>
                    <span style={{ color:'#475569' }}>💰 <strong className="text-white">{fmtFcfa(p.price)}</strong></span>
                    <span style={{ color:'#475569' }}>QR: <strong className="font-mono text-[10px]" style={{ color: cfg.color }}>{p.qrData.slice(-8)}</strong></span>
                  </div>
                  {isActive && (
                    <div className="mt-3 p-3 rounded-2xl flex items-center justify-center" style={{ background:'white' }}>
                      <QRCodeSVG value={p.qrData} size={120} level="M" />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {passTab === 'acheter' && !buying && (
          <>
            <p className="text-xs font-black uppercase tracking-widest pb-1" style={{ color:'var(--c-muted)' }}>Choisissez votre formule</p>
            {(Object.entries(PASS_CATALOG) as [PassType, typeof PASS_CATALOG[PassType]][]).map(([key, cfg]) => (
              <button key={key} onClick={() => setBuying(key)}
                className="w-full p-4 rounded-2xl text-left transition-all active:scale-[.98]"
                style={{ background:`${cfg.color}12`, border:`1.5px solid ${cfg.color}30` }}>
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{cfg.emoji}</span>
                  <div className="flex-1">
                    <div className="font-black text-white">{cfg.label}</div>
                    <div className="text-xs mt-0.5 mb-2" style={{ color:'#64748b' }}>{cfg.desc}</div>
                    {cfg.maxRides && <div className="text-xs" style={{ color:'#94a3b8' }}>Max {cfg.maxRides} trajets/mois</div>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xl font-black" style={{ color: cfg.color }}>{cfg.price.toLocaleString('fr-FR')}</div>
                    <div className="text-[10px]" style={{ color:'#334155' }}>FCFA/mois</div>
                  </div>
                </div>
              </button>
            ))}
          </>
        )}

        {passTab === 'acheter' && buying && (
          <div className="space-y-4 animate-fade-up">
            <button onClick={() => { setBuying(null); setHolderName(''); }} className="text-sm font-bold px-2 rounded-xl" style={{ color:'#60a5fa', minHeight: 40 }}>← Retour</button>
            <div className="rounded-2xl p-4" style={{ background:`${PASS_CATALOG[buying].color}15`, border:`1.5px solid ${PASS_CATALOG[buying].color}35` }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{PASS_CATALOG[buying].emoji}</span>
                <div>
                  <div className="font-black text-white">{PASS_CATALOG[buying].label}</div>
                  <div className="text-xs" style={{ color:'#64748b' }}>{PASS_CATALOG[buying].desc}</div>
                </div>
              </div>
              <div className="text-2xl font-black" style={{ color: PASS_CATALOG[buying].color }}>
                {PASS_CATALOG[buying].price.toLocaleString('fr-FR')} FCFA
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest mb-2 block" style={{ color:'var(--c-muted)' }}>Nom du titulaire</label>
              <input
                type="text" value={holderName} onChange={e => setHolderName(e.target.value)}
                placeholder="Votre prénom et nom"
                className="input w-full"
                style={{ fontSize:14, padding:'12px 16px' }}
              />
            </div>

            <button
              onClick={() => setShowPayModal(true)}
              className="w-full py-4 rounded-2xl font-black text-white text-lg transition-all active:scale-[.98]"
              style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', boxShadow: '0 8px 28px rgba(37,99,235,.35)' }}
            >
              💳 Payer {PASS_CATALOG[buying].price.toLocaleString('fr-FR')} FCFA
            </button>

            {showPayModal && (
              <PaymentModal
                amount={PASS_CATALOG[buying].price}
                label={PASS_CATALOG[buying].label}
                emoji={PASS_CATALOG[buying].emoji}
                onSuccess={confirmBuy}
                onCancel={() => setShowPayModal(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mini spending history ─────────────────────────────────────
interface Ticket { id: string; operator: string; price: number; purchaseTime: number; status: string; qrData: string; }
function SpendingHistory({ tickets }: { tickets: Ticket[] }) {
  const now = Date.now();
  const weekAgo  = now - 7 * 86_400_000;
  const monthAgo = now - 30 * 86_400_000;
  const weekAmt  = tickets.filter(t => t.purchaseTime >= weekAgo).reduce((s, t) => s + t.price, 0);
  const monthAmt = tickets.filter(t => t.purchaseTime >= monthAgo).reduce((s, t) => s + t.price, 0);
  const byOp = OPS.map(o => ({
    ...o,
    total: tickets.filter(t => t.operator === o.op && t.purchaseTime >= monthAgo).reduce((s, t) => s + t.price, 0),
  })).filter(o => o.total > 0);

  if (tickets.length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl overflow-hidden" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
      <div className="px-4 pt-3 pb-2 border-b" style={{ borderColor: 'var(--c-border)' }}>
        <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--c-muted)' }}>📊 Historique des dépenses</p>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(37,99,235,.08)', border: '1px solid rgba(37,99,235,.15)' }}>
          <p className="text-[10px] font-bold mb-1" style={{ color: '#64748b' }}>Cette semaine</p>
          <p className="text-lg font-black text-white">{weekAmt.toLocaleString('fr-FR')}</p>
          <p className="text-[10px]" style={{ color: '#3b82f6' }}>FCFA</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.15)' }}>
          <p className="text-[10px] font-bold mb-1" style={{ color: '#64748b' }}>Ce mois</p>
          <p className="text-lg font-black text-white">{monthAmt.toLocaleString('fr-FR')}</p>
          <p className="text-[10px]" style={{ color: '#a78bfa' }}>FCFA</p>
        </div>
      </div>
      {byOp.length > 0 && (
        <div className="px-4 pb-3 space-y-1.5">
          {byOp.map(o => {
            const pct = monthAmt > 0 ? Math.round((o.total / monthAmt) * 100) : 0;
            return (
              <div key={o.op}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span style={{ color: '#64748b' }}>{o.e} {o.op}</span>
                  <span className="font-black text-white">{o.total.toLocaleString('fr-FR')} F</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: o.c }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TicketsPage() {
  const dispatch = useAppDispatch();
  const { myTickets } = useAppSelector(s=>s.tickets);
  const [tab, setTab]         = useState<'wallet'|'buy'|'pass'>('wallet');
  const [selOp, setSelOp]     = useState<typeof OPS[number]['op']>('DDD');
  const [expanded, setExpanded]= useState<string|null>(null);
  const [confirming, setConfirming] = useState<string|null>(null);
  const [showTicketPayModal, setShowTicketPayModal] = useState(false);
  // Retour Android
  usePopBack(() => setConfirming(null), !!confirming);
  usePopBack(() => setExpanded(null),   !!expanded && !confirming);
  usePopBack(() => setShowTicketPayModal(false), showTicketPayModal);
  const op = OPS.find(o=>o.op===selOp)!;
  const validCount = myTickets.filter(t=>t.status==='valid').length;
  const activePassCount = useAppSelector(s => s.passes.myPasses.filter(p => p.status === 'active').length);

  const buy = (method: string, _ref: string) => {
    dispatch(buyTicket({operator:selOp, price:op.p}));
    dispatch(showToast({type:'success',message:`✅ Billet ${selOp} acheté via ${method} !`}));
    setShowTicketPayModal(false);
    setTab('wallet');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0" style={{borderBottom:'1px solid var(--c-border)'}}>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-xl font-black text-white">Billetterie</h2>
          {validCount>0&&<span className="badge" style={{background:'rgba(34,197,94,.1)',color:'#4ade80',border:'1px solid rgba(34,197,94,.2)'}}>{validCount} valide{validCount>1?'s':''}</span>}
        </div>
        <div className="flex gap-1 p-1 rounded-2xl" style={{background:'var(--c-surface)'}}>
          {[
            {id:'wallet',l:`Billets${myTickets.length>0?` (${myTickets.length})`:''}`,a:'#2563eb'},
            {id:'pass',  l:`Pass${activePassCount>0?` (${activePassCount})`:''}`,      a:'#7c3aed'},
            {id:'buy',   l:'Acheter +',                                                  a:'#059669'},
          ].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id as any)}
              className="flex-1 py-2.5 rounded-xl text-xs font-black transition-all"
              style={tab===t.id?{background:t.a,color:'white',boxShadow:`0 4px 16px ${t.a}40`,minHeight:40}:{color:'#475569',minHeight:40}}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {/* Pub contextuelle — opérateur sélectionné */}
      {tab !== 'pass' && <AdSlot format="card" context={{ operator: selOp as 'DDD'|'BRT' }} className="px-4 pt-3" />}

      {/* Pass tab */}
      {tab === 'pass' && <div className="flex-1 overflow-hidden"><PassSection /></div>}

      <div className="flex-1 overflow-y-auto p-4" style={tab==='pass'?{display:'none'}:{}}>
        {/* WALLET */}
        {tab==='wallet'&&(
          <div className="space-y-3 pb-20">
            <SpendingHistory tickets={myTickets} />
            {myTickets.length===0 ? (
              <div className="text-center mt-14">
                <div className="text-6xl mb-4">🎫</div>
                <p className="font-black text-lg text-white">Aucun billet</p>
                <p className="text-sm mt-1 mb-6" style={{color:'#475569'}}>Achetez votre premier M-Ticket</p>
                <button onClick={()=>setTab('buy')} className="btn btn-primary px-8">Acheter maintenant</button>
              </div>
            ) : myTickets.map(t=>{
              const o=OPS.find(x=>x.op===t.operator);
              const isExp=expanded===t.id;
              const isCfm=confirming===t.id;
              const valid=t.status==='valid';
              return (
                <div key={t.id} className="rounded-3xl overflow-hidden transition-all"
                  style={{background:valid?`linear-gradient(160deg,${o?.c||'#2563eb'}12,var(--c-surface) 60%)`:'var(--c-surface)',
                    border:`1px solid ${valid?(o?.c||'#2563eb')+'30':'var(--c-border)'}`}}>
                  <div className="h-1" style={{background:valid?(o?.c||'#2563eb'):'#1e293b'}}/>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{o?.e||'🎫'}</span>
                        <div>
                          <div className="font-black text-white">{o?.l||t.operator}</div>
                          <div className="text-[10px] mt-0.5" style={{color:'#475569'}}>{new Date(t.purchaseTime).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'})}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black" style={{color:o?.c||'#2563eb'}}>{t.price}</div>
                        <div className="text-[10px]" style={{color:'#334155'}}>FCFA</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="badge" style={valid?{background:'rgba(34,197,94,.12)',color:'#4ade80',border:'1px solid rgba(34,197,94,.2)'}:{background:'rgba(255,255,255,.05)',color:'#475569',border:'1px solid var(--c-border)'}}>
                        {valid?'✓ VALIDE':t.status==='used'?'✗ UTILISÉ':'⌛ EXPIRÉ'}
                      </span>
                      <button onClick={()=>setExpanded(isExp?null:t.id)}
                        className="text-xs font-bold transition-colors" style={{color:isExp?'#60a5fa':'#475569'}}>
                        {isExp?'Masquer ▲':'QR Code ▼'}
                      </button>
                    </div>
                    {isExp&&(
                      <div className="mt-4 flex flex-col items-center animate-fade-up">
                        <div className={`p-4 rounded-2xl ${!valid?'opacity-30 grayscale':''}`} style={{background:'white',boxShadow:'0 8px 32px rgba(0,0,0,.4)'}}>
                          <QRCodeSVG value={t.qrData} size={160} level="M" />
                        </div>
                        <p className="text-[10px] mt-2 font-mono" style={{color:'#334155'}}>{t.qrData}</p>
                        {valid&&(
                          <div className="mt-3 w-full">
                            {!isCfm
                              ? <button onClick={()=>setConfirming(t.id)} className="w-full py-2 rounded-xl text-xs font-black btn btn-ghost">Marquer utilisé</button>
                              : <div className="flex gap-2">
                                  <button onClick={()=>{dispatch(useTicket(t.id));setConfirming(null);setExpanded(null);dispatch(showToast({type:'info',message:'Billet utilisé.'}));}}
                                    className="flex-1 py-2 rounded-xl text-xs font-black text-white" style={{background:'#dc2626'}}>Confirmer</button>
                                  <button onClick={()=>setConfirming(null)} className="px-4 py-2 rounded-xl text-xs btn btn-ghost">Annuler</button>
                                </div>
                            }
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BUY */}
        {tab==='buy'&&(
          <div className="space-y-5 pb-20">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{color:'var(--c-muted)'}}>Réseau</p>
              <div className="grid grid-cols-2 gap-2.5">
                {OPS.map(x=>(
                  <button key={x.op} onClick={()=>setSelOp(x.op)}
                    className="p-4 rounded-2xl text-left transition-all active:scale-95"
                    style={selOp===x.op
                      ?{background:`${x.c}20`,border:`1.5px solid ${x.c}55`,transform:'scale(1.02)',boxShadow:`0 8px 24px ${x.c}25`}
                      :{background:'var(--c-surface)',border:'1px solid var(--c-border)',opacity:.65}}>
                    <div className="text-2xl mb-2">{x.e}</div>
                    <div className="font-black text-white text-sm">{x.op}</div>
                    <div className="text-[10px] mt-0.5 mb-2" style={{color:'#64748b'}}>{x.l}</div>
                    <div className="font-black text-sm" style={{color:x.c}}>{x.p} <span className="text-[10px] opacity-60">FCFA</span></div>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="flex items-center gap-4 p-4 rounded-2xl" style={{background:'var(--c-surface)',border:'1px solid var(--c-border)'}}>
              <span className="text-3xl">{op.e}</span>
              <div className="flex-1">
                <div className="font-black text-white">{op.l}</div>
                <div className="text-xs" style={{color:'#475569'}}>{op.s}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black" style={{color:op.c}}>{op.p}</div>
                <div className="text-[10px]" style={{color:'#334155'}}>FCFA</div>
              </div>
            </div>

            <button
              onClick={() => setShowTicketPayModal(true)}
              className="w-full py-4 rounded-2xl font-black text-white text-lg transition-all active:scale-[.98]"
              style={{ background: op.c, boxShadow: `0 8px 28px ${op.c}50` }}
            >
              {op.e} Payer {op.p} FCFA avec Wave / Orange Money
            </button>

            {showTicketPayModal && (
              <PaymentModal
                amount={op.p}
                label={op.l}
                emoji={op.e}
                onSuccess={buy}
                onCancel={() => setShowTicketPayModal(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
