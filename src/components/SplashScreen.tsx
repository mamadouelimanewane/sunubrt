import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFade(true);
      const fadeTimer = setTimeout(() => {
        onDone();
      }, 500);
      return () => clearTimeout(fadeTimer);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#05060f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        opacity: fade ? 0 : 1,
        transform: fade ? 'scale(1.05)' : 'scale(1)',
        pointerEvents: fade ? 'none' : 'auto',
        overflow: 'hidden',
        color: '#f1f5f9',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <style>{`
        @keyframes orb-float-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(50px, -50px) scale(1.2); }
        }
        @keyframes orb-float-2 {
          0%, 100% { transform: translate(0, 0) scale(1.2); }
          50% { transform: translate(-60px, 40px) scale(0.9); }
        }
        @keyframes logo-in {
          0% { transform: scale(0.8); opacity: 0; filter: blur(10px); }
          100% { transform: scale(1); opacity: 1; filter: blur(0); }
        }
        @keyframes progress-fill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes fade-in-stagger {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes dot-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .animate-logo {
          animation: logo-in 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-progress {
          animation: progress-fill 2.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .animate-operator-0 { animation: fade-in-stagger 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.8s both; }
        .animate-operator-1 { animation: fade-in-stagger 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 1.0s both; }
        .animate-operator-2 { animation: fade-in-stagger 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 1.2s both; }
        .animate-operator-3 { animation: fade-in-stagger 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 1.4s both; }
        .animate-tagline { animation: fade-in-stagger 0.8s ease 0.5s both; }
        .animate-dot-1 { animation: dot-pulse 1.2s infinite 0s; }
        .animate-dot-2 { animation: dot-pulse 1.2s infinite 0.2s; }
        .animate-dot-3 { animation: dot-pulse 1.2s infinite 0.4s; }
      `}</style>

      {/* Decorative Blur Orbs */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: '280px',
          height: '280px',
          background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'orb-float-1 8s infinite ease-in-out',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '10%',
          width: '320px',
          height: '320px',
          background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)',
          filter: 'blur(55px)',
          animation: 'orb-float-2 10s infinite ease-in-out',
        }}
      />

      {/* Grid Pattern overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.05,
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Main Logo Container */}
      <div className="animate-logo" style={{ textAlign: 'center', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Animated Bus Icon */}
        <div
          style={{
            width: '96px',
            height: '96px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #1d4ed8 0%, #00b450 100%)',
            boxShadow: '0 12px 36px rgba(37,99,235,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
            marginBottom: '20px',
            border: '1.5px solid rgba(255,255,255,0.15)',
          }}
        >
          🚌
        </div>

        {/* Brand Name */}
        <h1
          style={{
            fontSize: '42px',
            fontWeight: 950,
            letterSpacing: '-0.04em',
            margin: '0 0 8px 0',
            background: 'linear-gradient(135deg, #ffffff 0%, #93c5fd 50%, #86efac 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 2px 8px rgba(37,99,235,0.2))',
          }}
        >
          SunuBRT
        </h1>

        {/* Tagline */}
        <p className="animate-tagline" style={{ fontSize: '15px', color: '#94a3b8', margin: '0 0 40px 0', fontWeight: 600 }}>
          Votre Réseau de Transport à Dakar
        </p>
      </div>

      {/* Loading Progress Bar Container */}
      <div style={{ width: '220px', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '100%', height: '5px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div className="animate-progress" style={{ height: '100%', background: 'linear-gradient(90deg, #2563eb, #00b450)', borderRadius: '99px', width: '0%' }} />
        </div>

        {/* Pulsing Dots */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Chargement</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <div className="animate-dot-1" style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#2563eb' }} />
            <div className="animate-dot-2" style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#60a5fa' }} />
            <div className="animate-dot-3" style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#00b450' }} />
          </div>
        </div>
      </div>

      {/* Operator badges (BRT, DDD) */}
      <div
        style={{
          position: 'absolute',
          bottom: '50px',
          zIndex: 10,
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          padding: '0 20px',
        }}
      >
        {[
          { label: 'BRT', icon: '🚍', color: 'rgba(0,180,80,0.1)', borderColor: 'rgba(0,180,80,0.25)', textColor: '#00b450' },
          { label: 'DDD', icon: '🚌', color: 'rgba(37,99,235,0.1)', borderColor: 'rgba(37,99,235,0.25)', textColor: '#60a5fa' },
        ].map((op, idx) => (
          <div
            key={op.label}
            className={`animate-operator-${idx}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '14px',
              background: op.color,
              border: `1px solid ${op.borderColor}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontSize: '11px',
              fontWeight: 800,
              color: op.textColor,
            }}
          >
            <span>{op.icon}</span>
            <span>{op.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
