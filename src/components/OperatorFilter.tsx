import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSelectedOperator } from '@/store/store';
import type { OperatorId } from '@/types';
import { OPERATORS } from '@/data/transportData';

const ALL = { id: 'all' as OperatorId, name: 'Tous', icon: '🌐', color: '#475569' };

export default function OperatorFilter() {
  const dispatch = useAppDispatch();
  const selected = useAppSelector(s => s.mobility.selectedOperator);
  const ops = [ALL, ...Object.values(OPERATORS).filter(o => o.id !== 'YANGO')] as typeof ALL[];

  return (
    <div className="flex gap-1.5 overflow-x-auto px-3 py-2 scrollbar-hide">
      {ops.map(op => {
        const active = selected === op.id;
        return (
          <button
            key={op.id}
            onClick={() => dispatch(setSelectedOperator(op.id))}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold text-xs transition-all active:scale-95 flex-shrink-0"
            style={{
              padding: '10px 14px',
              minHeight: 44,
              background:     active ? op.color             : 'rgba(255,255,255,.05)',
              color:          active ? 'white'              : '#94a3b8',
              border:         active ? `1px solid ${op.color}` : '1px solid rgba(255,255,255,.07)',
              boxShadow:      active ? `0 4px 16px ${op.color}40` : 'none',
              transform:      active ? 'scale(1.04)' : 'scale(1)',
            }}>
            <span style={{ fontSize: 13 }}>{op.icon}</span>
            <span>{op.name}</span>
          </button>
        );
      })}
    </div>
  );
}
