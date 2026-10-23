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
import { getPlanarEdgeMotion, PLANAR_ORBIT_DURATION_SECONDS } from '@/lib/planar'
import type {
  HoverHandler,
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
  motion: boolean
  resetToken: number
  onSelect: (nodeId: string | null) => void
  onHover: HoverHandler
}

const RELATION_DASH: Record<RelationKind, string | undefined> = {
  supports: undefined,
  references: '7 5',
  inspires: '3 5',
  ritual: '1 5',
}

const CORE_COLOR = '#8fe0e4'
const PLANAR_CENTER = {
  x: PLANAR_SIZE.width / 2,
  y: PLANAR_SIZE.height / 2,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

interface OrbitRotationProps {
  duration: number
  centerX?: number
  centerY?: number
  reverse?: boolean
}

function OrbitRotation({
  duration,
  centerX = 0,
  centerY = 0,
  reverse = false,
}: OrbitRotationProps) {
  return (
    <animateTransform
      attributeName="transform"
      attributeType="XML"
      type="rotate"
      from={`0 ${centerX} ${centerY}`}
      to={`${reverse ? -360 : 360} ${centerX} ${centerY}`}
      dur={`${duration}s`}
      repeatCount="indefinite"
    />
  )
}

interface PlanarSparkProps {
  path: string
  color: string
  duration: number
  offset: number
  radius: number
  selected: boolean
}

function PlanarSpark({
  path,
  color,
  duration,
  offset,
  radius,
  selected,
}: PlanarSparkProps) {
  return (
    <circle
      className="planar-spark"
      r={radius}
      fill={color}
      opacity={selected ? 0.95 : 0.7}
      style={{ color }}
      pointerEvents="none"
    >
      <animateMotion
        path={path}
        dur={`${duration}s`}
        begin={`-${offset.toFixed(2)}s`}
        repeatCount="indefinite"
      />
    </circle>
  )
}

interface PlanarCoreProps {
  motion: boolean
  onHover: HoverHandler
}

function PlanarCore({ motion, onHover }: PlanarCoreProps) {
  return (
    <g
      className="planar-core"
      transform={`translate(${PLANAR_CENTER.x} ${PLANAR_CENTER.y})`}
      onPointerEnter={(event) => {
        onHover(
          { title: 'Elisa', color: CORE_COLOR, kind: 'Núcleo' },
          { x: event.clientX, y: event.clientY },
        )
      }}
      onPointerLeave={() => onHover(null)}
      aria-hidden="true"
    >
      <title>Elisa · Núcleo</title>
      <circle
        className="planar-core__halo"
        r={82}
        fill="url(#planar-core-glow)"
        pointerEvents="none"
      />

      <g pointerEvents="none">
        {motion ? <OrbitRotation duration={48} /> : null}
        <g transform="rotate(-24)">
          <ellipse
            className="planar-core__ring"
            rx={72}
            ry={24}
            fill="none"
            stroke={CORE_COLOR}
            strokeOpacity={0.42}
            strokeWidth={1}
          />
        </g>
      </g>

      <g pointerEvents="none">
        {motion ? <OrbitRotation duration={76} reverse /> : null}
        <g transform="rotate(33)">
          <ellipse
            className="planar-core__ring planar-core__ring--inner"
            rx={54}
            ry={17}
            fill="none"
            stroke={CORE_COLOR}
            strokeOpacity={0.24}
            strokeWidth={0.8}
          />
        </g>
      </g>

      <circle
        r={28}
        fill="none"
        stroke={CORE_COLOR}
        strokeOpacity={0.22}
        strokeWidth={0.9}
        strokeDasharray="2 6"
        pointerEvents="none"
      />
      <circle r={17} fill="url(#planar-core-body)" pointerEvents="none" />
      <circle r={5.5} fill="#f4feff" pointerEvents="none" />
      <circle className="planar-core__hit" r={76} fill="transparent" pointerEvents="all" />
    </g>
  )
}

export function PlanarScene({
  dataset,
  activeNodes,
  activeEdges,
  selectedId,
  motion,
  resetToken,
  onSelect,
  onHover,
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
    svgRef.current?.pauseAnimations()
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
    svgRef.current?.unpauseAnimations()
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
        <defs>
          {CATEGORY_ORDER.map((category) => (
            <radialGradient
              key={`planar-node-glow-${category}`}
              id={`planar-node-glow-${category}`}
            >
              <stop
                offset="0%"
                stopColor={CATEGORY_META[category].color}
                stopOpacity={0.48}
              />
              <stop
                offset="32%"
                stopColor={CATEGORY_META[category].color}
                stopOpacity={0.18}
              />
              <stop
                offset="68%"
                stopColor={CATEGORY_META[category].color}
                stopOpacity={0.035}
              />
              <stop
                offset="100%"
                stopColor={CATEGORY_META[category].color}
                stopOpacity={0}
              />
            </radialGradient>
          ))}
          <radialGradient id="planar-core-glow">
            <stop offset="0%" stopColor={CORE_COLOR} stopOpacity={0.42} />
            <stop offset="38%" stopColor={CORE_COLOR} stopOpacity={0.13} />
            <stop offset="100%" stopColor={CORE_COLOR} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="planar-core-body">
            <stop offset="0%" stopColor="#f4feff" />
            <stop offset="42%" stopColor="#b8f2ff" />
            <stop offset="100%" stopColor="#62c4ef" />
          </radialGradient>
        </defs>

        <g transform={transform}>
          <g>
            {motion ? (
              <OrbitRotation
                duration={PLANAR_ORBIT_DURATION_SECONDS}
                centerX={PLANAR_CENTER.x}
                centerY={PLANAR_CENTER.y}
              />
            ) : null}
          {CATEGORY_ORDER.map((category) => {
            if (!activeCategories.has(category)) return null
            const meta = CATEGORY_META[category]
            const center = getPlanarCategoryCenter(category)
            const count = activeNodes.filter((node) => node.category === category).length
            return (
              <g
                key={category}
                transform={`translate(${center.x} ${center.y})`}
                aria-hidden="true"
              >
                <g>
                  {motion ? (
                    <OrbitRotation
                      duration={PLANAR_ORBIT_DURATION_SECONDS}
                      reverse
                    />
                  ) : null}
                  <circle
                    r={102}
                    fill={meta.softColor}
                    stroke={meta.color}
                    strokeOpacity={0.14}
                  />
                  <text
                    y={-108}
                    className="planar-region__label"
                    fill={meta.color}
                    textAnchor="middle"
                  >
                    {meta.label}
                  </text>
                  <text
                    y={-93}
                    className="planar-region__count"
                    fill={meta.color}
                    textAnchor="middle"
                  >
                    {count}
                  </text>
                </g>
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
            const color = CATEGORY_META[sourceNode.category].color
            const sparkMotion = getPlanarEdgeMotion(edge.id)
            const path = `M ${source.x} ${source.y} L ${target.x} ${target.y}`
            const sparksVisible = motion && !muted
            return (
              <g key={edge.id} aria-hidden="true">
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={color}
                  strokeOpacity={muted ? 0.05 : isSelectedEdge ? 0.78 : 0.2}
                  strokeWidth={isSelectedEdge ? 1.8 : 0.9}
                  strokeDasharray={RELATION_DASH[edge.kind]}
                  strokeLinecap="round"
                />
                {sparksVisible ? (
                  <>
                    <PlanarSpark
                      path={path}
                      color={color}
                      duration={sparkMotion.duration}
                      offset={sparkMotion.offset}
                      radius={isSelectedEdge ? 3.1 : 2.2}
                      selected={isSelectedEdge}
                    />
                    {isSelectedEdge ? (
                      <PlanarSpark
                        path={path}
                        color={color}
                        duration={sparkMotion.duration * 0.88}
                        offset={sparkMotion.secondOffset}
                        radius={2.4}
                        selected
                      />
                    ) : null}
                  </>
                ) : null}
              </g>
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
                onPointerEnter={(event) => {
                  setHoveredId(node.id)
                  onHover(
                    { title: node.title, color: meta.color, kind: meta.singular },
                    { x: event.clientX, y: event.clientY },
                  )
                }}
                onPointerLeave={() => {
                  setHoveredId(null)
                  onHover(null)
                }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <title>{node.title}</title>
                <g>
                  {motion ? (
                    <OrbitRotation
                      duration={PLANAR_ORBIT_DURATION_SECONDS}
                      reverse
                    />
                  ) : null}
                  <circle
                    className="planar-node__glow"
                    r={radius * 3.2}
                    fill={`url(#planar-node-glow-${node.category})`}
                    pointerEvents="none"
                  />
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
                  <circle
                    r={radius * 0.32}
                    fill="#ffffff"
                    fillOpacity={dimmed ? 0.12 : 0.62}
                  />
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
              </g>
            )
          })}
          </g>
          <PlanarCore motion={motion} onHover={onHover} />
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
