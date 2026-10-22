import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { CATEGORY_META, CATEGORY_ORDER } from '@/data/categories'
import {
  PLANAR_SIZE,
  buildPlanarPositions,
  getConnectedNodeIds,
  getPlanarCategoryCenter,
  getPlanarNodeRadius,
} from '@/lib/layout'
import type {
  RelationKind,
  UniverseDataset,
  UniverseEdge,
  UniverseNode,
} from '@/types/universe'

interface PlanarSceneProps {
  dataset: UniverseDataset
  activeNodes: UniverseNode[]
  activeEdges: UniverseEdge[]
  selectedId: string | null
  resetToken: number
  onSelect: (nodeId: string | null) => void
}

const RELATION_DASH: Record<RelationKind, string | undefined> = {
  supports: undefined,
  references: '7 5',
  inspires: '3 5',
  ritual: '1 5',
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function PlanarScene({
  dataset,
  activeNodes,
  activeEdges,
  selectedId,
  resetToken,
  onSelect,
}: PlanarSceneProps) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const shellRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{
    startX: number
    startY: number
    originX: number
    originY: number
    scale: number
    moved: boolean
  } | null>(null)
  const suppressClickRef = useRef(false)

  const positions = useMemo(() => buildPlanarPositions(dataset), [dataset])
  const nodesById = useMemo(
    () => new Map(dataset.nodes.map((node) => [node.id, node])),
    [dataset.nodes],
  )
  const connectedIds = useMemo(
    () => (selectedId ? getConnectedNodeIds(selectedId, activeEdges) : new Set<string>()),
    [activeEdges, selectedId],
  )
  const activeCategories = useMemo(
    () => new Set(activeNodes.map((node) => node.category)),
    [activeNodes],
  )

  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [resetToken])

  useEffect(() => {
    const element = shellRef.current
    if (!element) return
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const direction = event.deltaY > 0 ? 0.9 : 1.1
      setZoom((current) => clamp(current * direction, 0.55, 2.2))
    }
    element.addEventListener('wheel', handleWheel, { passive: false })
    return () => element.removeEventListener('wheel', handleWheel)
  }, [])

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    const rect = svgRef.current?.getBoundingClientRect()
    const scale = rect ? PLANAR_SIZE.width / rect.width / zoom : 1
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
      scale,
      moved: false,
    }
    suppressClickRef.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)
  }

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = (event.clientX - drag.startX) * drag.scale
    const dy = (event.clientY - drag.startY) * drag.scale
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true
    setPan({ x: drag.originX + dx, y: drag.originY + dy })
  }

  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    const moved = drag?.moved ?? false
    suppressClickRef.current = moved
    if (moved) {
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
    }
    dragRef.current = null
    setIsDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const resetCamera = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const transform = `translate(${pan.x} ${pan.y}) translate(${PLANAR_SIZE.width / 2} ${
    PLANAR_SIZE.height / 2
  }) scale(${zoom}) translate(${-PLANAR_SIZE.width / 2} ${-PLANAR_SIZE.height / 2})`

  return (
    <div
      ref={shellRef}
      className={`planar-shell ${isDragging ? 'is-dragging' : ''}`}
    >
      <svg
        ref={svgRef}
        className="planar-svg"
        viewBox={`0 0 ${PLANAR_SIZE.width} ${PLANAR_SIZE.height}`}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Grafo 2D de registros fictícios. Use os nós com Tab e Enter, ou a lista de exploração."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false
            return
          }
          onSelect(null)
        }}
      >
        <g transform={transform}>
          {CATEGORY_ORDER.map((category) => {
            if (!activeCategories.has(category)) return null
            const meta = CATEGORY_META[category]
            const center = getPlanarCategoryCenter(category)
            const count = activeNodes.filter((node) => node.category === category).length
            return (
              <g key={category} aria-hidden="true">
                <circle
                  cx={center.x}
                  cy={center.y}
                  r={102}
                  fill={meta.softColor}
                  stroke={meta.color}
                  strokeOpacity={0.14}
                />
                <text
                  x={center.x}
                  y={center.y - 108}
                  className="planar-region__label"
                  fill={meta.color}
                  textAnchor="middle"
                >
                  {meta.label}
                </text>
                <text
                  x={center.x}
                  y={center.y - 93}
                  className="planar-region__count"
                  fill={meta.color}
                  textAnchor="middle"
                >
                  {count}
                </text>
              </g>
            )
          })}

          {activeEdges.map((edge) => {
            const source = positions.get(edge.source)
            const target = positions.get(edge.target)
            const sourceNode = nodesById.get(edge.source)
            if (!source || !target || !sourceNode) return null
            const isSelectedEdge = edge.source === selectedId || edge.target === selectedId
            const muted = Boolean(selectedId) && !isSelectedEdge
            return (
              <line
                key={edge.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={CATEGORY_META[sourceNode.category].color}
                strokeOpacity={muted ? 0.05 : isSelectedEdge ? 0.78 : 0.2}
                strokeWidth={isSelectedEdge ? 1.8 : 0.9}
                strokeDasharray={RELATION_DASH[edge.kind]}
                strokeLinecap="round"
              />
            )
          })}

          {activeNodes.map((node) => {
            const position = positions.get(node.id)
            if (!position) return null
            const meta = CATEGORY_META[node.category]
            const radius = getPlanarNodeRadius(node)
            const selected = node.id === selectedId
            const dimmed = Boolean(selectedId) && !selected && !connectedIds.has(node.id)
            const showLabel = selected || hoveredId === node.id
            return (
              <g
                key={node.id}
                transform={`translate(${position.x} ${position.y})`}
                className={`planar-node ${selected ? 'is-selected' : ''} ${
                  dimmed ? 'is-dimmed' : ''
                }`}
                role="button"
                tabIndex={0}
                aria-label={`${meta.singular}: ${node.title}`}
                aria-pressed={selected}
                onClick={(event) => {
                  event.stopPropagation()
                  onSelect(node.id)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(node.id)
                  }
                }}
                onFocus={() => setHoveredId(node.id)}
                onBlur={() => setHoveredId(null)}
                onPointerEnter={() => setHoveredId(node.id)}
                onPointerLeave={() => setHoveredId(null)}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <title>{node.title}</title>
                <circle r={radius + 12} fill="transparent" />
                <circle
                  className="planar-node__focus"
                  r={radius + 6}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={2}
                />
                {selected ? (
                  <circle
                    r={radius + 8}
                    fill="none"
                    stroke="#e7f4ff"
                    strokeOpacity={0.58}
                    strokeWidth={1.1}
                  />
                ) : null}
                <circle
                  className="planar-node__body"
                  r={radius}
                  fill={meta.color}
                  fillOpacity={dimmed ? 0.24 : 0.92}
                  stroke={meta.color}
                  strokeOpacity={dimmed ? 0.18 : 0.55}
                  strokeWidth={1}
                />
                <circle r={radius * 0.32} fill="#ffffff" fillOpacity={dimmed ? 0.12 : 0.62} />
                {showLabel ? (
                  <text
                    className="planar-node__label"
                    y={-(radius + 12)}
                    textAnchor="middle"
                    fill="#eaf3ff"
                  >
                    {node.title}
                  </text>
                ) : null}
              </g>
            )
          })}
        </g>
      </svg>

      <div className="planar-controls" role="group" aria-label="Controles de zoom do grafo 2D">
        <button
          type="button"
          className="icon-button"
          aria-label="Aproximar"
          onClick={() => setZoom((current) => clamp(current * 1.15, 0.55, 2.2))}
        >
          +
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Afastar"
          onClick={() => setZoom((current) => clamp(current / 1.15, 0.55, 2.2))}
        >
          −
        </button>
        <button type="button" className="icon-button icon-button--wide" onClick={resetCamera}>
          Centrar
        </button>
      </div>

      <p className="planar-hint">Arraste para mover · role para aproximar · clique no fundo para limpar</p>
    </div>
  )
}
