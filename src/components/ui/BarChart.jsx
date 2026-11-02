import { useEffect, useRef, useState } from 'react';
import { formatNumber } from '../../utils/format';

const PAD = { top: 12, right: 8, bottom: 22, left: 36 };

// Escala "bonita" para o eixo: 1, 2, 5 × 10^n.
function niceMax(max) {
  if (max <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 5, 10].find((s) => s * pow >= max / 4) * pow;
  return Math.ceil(max / step) * step;
}

/**
 * Gráfico de barras de uma série. `data`: [{ key, label, value, tooltip? }].
 * Uma série só: o título do cartão identifica-a, sem legenda. Tooltip por barra
 * e tabela para leitores de ecrã.
 */
export default function BarChart({ data, height = 180, color = '#FF286A', valueLabel = 'Valor', formatValue = formatNumber, xLabel }) {
  const [hover, setHover] = useState(null);
  // O viewBox acompanha a largura real, para o texto dos eixos não encolher em ecrãs pequenos.
  const boxRef = useRef(null);
  const [W, setW] = useState(600);
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(240, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = height;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const slot = innerW / Math.max(data.length, 1);
  const gap = Math.min(2, slot * 0.2);
  const barW = Math.max(slot - gap, 1);
  const y = (v) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, max / 2, max];
  // Rótulos do eixo X: primeiro, meio e último (evita sobreposição em 90 dias).
  const labelIdx = new Set(data.length <= 8 ? data.map((_, i) => i) : [0, Math.floor((data.length - 1) / 2), data.length - 1]);
  const hovered = hover != null ? data[hover] : null;

  return (
    <div className="relative" ref={boxRef}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="block" role="img" aria-label={`${valueLabel}${xLabel ? ` por ${xLabel}` : ''}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={PAD.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#7A7A7A">
              {formatNumber(Math.round(t))}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = PAD.left + i * slot + gap / 2;
          const top = y(d.value);
          const h = PAD.top + innerH - top;
          const r = Math.min(4, barW / 2, h);
          return (
            <g key={d.key}>
              {h > 0 && (
                <path
                  d={`M${x},${PAD.top + innerH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${PAD.top + innerH} Z`}
                  fill={color}
                  opacity={hover == null || hover === i ? 1 : 0.45}
                />
              )}
              {/* Alvo de hover maior do que a barra */}
              <rect
                x={PAD.left + i * slot}
                y={PAD.top}
                width={slot}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
              {labelIdx.has(i) && (
                <text x={x + barW / 2} y={H - 6} textAnchor={i === 0 && data.length > 8 ? 'start' : i === data.length - 1 && data.length > 8 ? 'end' : 'middle'} fontSize="10" fill="#7A7A7A">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
        <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 px-2.5 py-1.5 rounded-lg bg-ink-800 border border-white/10 text-xs shadow-lg whitespace-nowrap"
          style={{ left: `${((PAD.left + (hover + 0.5) * slot) / W) * 100}%` }}
        >
          <p className="text-gray-400">{hovered.tooltip || hovered.label}</p>
          <p className="text-white font-semibold tabular-nums">{formatValue(hovered.value)} {valueLabel.toLowerCase()}</p>
        </div>
      )}

      <table className="sr-only">
        <caption>{valueLabel}</caption>
        <thead><tr><th scope="col">{xLabel || 'Período'}</th><th scope="col">{valueLabel}</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.key}><td>{d.tooltip || d.label}</td><td>{d.value}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
