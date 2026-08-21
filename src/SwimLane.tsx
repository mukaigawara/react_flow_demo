import { useCallback, useState, type ReactNode } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  reconnectEdge,
  Panel,
  Handle,
  Position,
  MarkerType,
  ConnectionMode,
  ConnectionLineType,
  NodeResizer,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type NodeTypes,
  type OnBeforeDelete,
  type SmoothStepPathOptions,
} from '@xyflow/react'

type LaneTone = 'frontend' | 'backend' | 'database' | 'ops' | 'other'

type SwimlaneData = { label: string; tone: LaneTone }
type ProcessData = { label: string; tone: LaneTone }
type DecisionData = { label: string; tone: LaneTone; dualLeft?: boolean }

type SwimlaneNode = Node<SwimlaneData, 'swimlane'>
type ProcessNode = Node<ProcessData, 'process'>
type DecisionFlowNode = Node<DecisionData, 'decision'>
type FlowNode = SwimlaneNode | ProcessNode | DecisionFlowNode
type FlowEdge = Edge & { pathOptions?: SmoothStepPathOptions }

const LANE_W = 360
const LANE_H = 1140
const LANE_GAP = 100
const HEADER_Y = 88
const NODE_GAP = 56
const PROCESS_W = 232
const PROCESS_H = 52
const DECISION_W = 132
const DECISION_H = 132

function laneInnerX(laneWidth: number, childWidth: number) {
  return Math.round((laneWidth - childWidth) / 2)
}

const TONES: LaneTone[] = ['frontend', 'backend', 'database', 'ops', 'other']
const LANE_LABELS = [
  'フロントエンド',
  'バックエンド',
  'データベース',
  '運用',
  'その他',
]

const arrow = { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#7b8494' }
const arrowYes = { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#1a7a70' }
const arrowNo = { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#c24155' }
const edgePath: SmoothStepPathOptions = { offset: 36, borderRadius: 18 }
const labelBg = {
  fill: '#ffffff',
  fillOpacity: 0.96,
}

function IconLane() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="2.5" width="3.5" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="6.25" y="2.5" width="3.5" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="2.5" width="3.5" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconProcess() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="4" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconDecision() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 2.5 13.5 8 8 13.5 2.5 8 8 2.5Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconLink() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6.5 8.7a3.2 3.2 0 0 0 1.1 1.1l1.7 1.1a2.4 2.4 0 1 0 2.5-4.1L10.6 5.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M9.5 7.3a3.2 3.2 0 0 0-1.1-1.1L6.7 5.1a2.4 2.4 0 1 0-2.5 4.1l1.2 1.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconLayout() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 4.5h10M3 8h7M3 11.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3.5 5h9M6 5V3.8A.8.8 0 0 1 6.8 3h2.4a.8.8 0 0 1 .8.8V5m-.8 8h-3.2A1.2 1.2 0 0 1 4.8 12V5h6.4v7a1.2 1.2 0 0 1-1.2 1.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconReset() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3.4 8A4.6 4.6 0 1 0 8 3.4H5.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5.2 1.8 3.2 3.4l2 1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ToolButton({
  children,
  icon,
  onClick,
  disabled,
  danger,
  title,
}: {
  children: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      className={danger ? 'tool-btn tool-btn--danger' : 'tool-btn'}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

function EditableLabel({
  value,
  onChange,
}: {
  value: string
  onChange: (label: string) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const editing = draft !== null

  if (!editing) {
    return (
      <span
        onDoubleClick={(event) => {
          event.stopPropagation()
          setDraft(value)
        }}
      >
        {value}
      </span>
    )
  }

  return (
    <input
      className="nodrag nopan node-label-input"
      value={draft}
      autoFocus
      aria-label="名前を編集"
      onPointerDown={(event) => event.stopPropagation()}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        onChange(draft.trim() || value)
        setDraft(null)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          onChange(draft.trim() || value)
          setDraft(null)
        }
        if (event.key === 'Escape') setDraft(null)
      }}
    />
  )
}

function SwimlaneLane({ id, data, selected }: NodeProps<SwimlaneNode>) {
  const { updateNodeData } = useReactFlow()

  return (
    <div className={`swimlane-node swimlane-node--${data.tone}`}>
      <NodeResizer
        isVisible={selected}
        minWidth={280}
        minHeight={360}
        color="#818cf8"
      />
      <div className="swimlane-node__title">
        <EditableLabel
          value={data.label}
          onChange={(label) => updateNodeData(id, { label })}
        />
      </div>
    </div>
  )
}

function ProcessBox({ id, data }: NodeProps<ProcessNode>) {
  const { updateNodeData } = useReactFlow()

  return (
    <div className={`process-node process-node--${data.tone}`}>
      <Handle type="target" position={Position.Top} id="in-top" />
      <Handle type="source" position={Position.Bottom} id="out-bottom" />
      <Handle
        type="target"
        position={Position.Left}
        id="in-left"
        style={{ top: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="out-left"
        style={{ top: '70%' }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="in-right"
        style={{ top: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="out-right"
        style={{ top: '70%' }}
      />
      <EditableLabel
        value={data.label}
        onChange={(label) => updateNodeData(id, { label })}
      />
    </div>
  )
}

function DecisionBox({ id, data }: NodeProps<DecisionFlowNode>) {
  const { updateNodeData } = useReactFlow()

  return (
    <div className="decision-node">
      <Handle type="target" position={Position.Top} id="in-top" />
      <Handle
        type="target"
        position={Position.Right}
        id="in-right"
        style={{ top: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="out-right"
        style={{ top: '70%' }}
      />
      <Handle type="source" position={Position.Bottom} id="out-bottom" />
      <Handle
        type="target"
        position={Position.Left}
        id="in-left"
        style={data.dualLeft ? { top: '18%' } : undefined}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="out-left"
        style={data.dualLeft ? { top: '32%' } : undefined}
      />
      {data.dualLeft ? (
        <Handle
          type="source"
          position={Position.Left}
          id="out-left-bottom"
          style={{ top: '72%' }}
        />
      ) : null}
      <div className={`decision-diamond decision-diamond--${data.tone}`}>
        <EditableLabel
          value={data.label}
          onChange={(label) => updateNodeData(id, { label })}
        />
      </div>
    </div>
  )
}

const nodeTypes = {
  swimlane: SwimlaneLane,
  process: ProcessBox,
  decision: DecisionBox,
} satisfies NodeTypes

function lane(id: string, label: string, tone: LaneTone, x: number): SwimlaneNode {
  return {
    id,
    type: 'swimlane',
    position: { x, y: 0 },
    data: { label, tone },
    style: { width: LANE_W, height: LANE_H },
    connectable: false,
    zIndex: 0,
  }
}

function process(
  id: string,
  label: string,
  tone: LaneTone,
  parentId: string,
  y: number,
): ProcessNode {
  return {
    id,
    type: 'process',
    parentId,
    extent: 'parent',
    position: { x: laneInnerX(LANE_W, PROCESS_W), y },
    data: { label, tone },
    style: { width: PROCESS_W, height: PROCESS_H },
  }
}

function decision(
  id: string,
  label: string,
  tone: LaneTone,
  parentId: string,
  y: number,
  dualLeft = false,
): DecisionFlowNode {
  return {
    id,
    type: 'decision',
    parentId,
    extent: 'parent',
    position: { x: laneInnerX(LANE_W, DECISION_W), y },
    data: { label, tone, dualLeft },
    style: { width: DECISION_W, height: DECISION_H },
  }
}

const initialNodes: FlowNode[] = [
  lane('lane-frontend', 'フロントエンド', 'frontend', 0),
  lane('lane-backend', 'バックエンド', 'backend', LANE_W + LANE_GAP),
  lane('lane-database', 'データベース', 'database', (LANE_W + LANE_GAP) * 2),

  process('fe-send', '要求を送信', 'frontend', 'lane-frontend', 104),
  process('fe-fail-req', '失敗処理', 'frontend', 'lane-frontend', 276),
  process('fe-fail-abn', '失敗処理', 'frontend', 'lane-frontend', 780),
  process('fe-success', '成功処理', 'frontend', 'lane-frontend', 980),

  process('be-recv', '受信要求', 'backend', 'lane-backend', 104),
  decision('be-parse', '解析要求', 'backend', 'lane-backend', 224),
  process('be-dbreq', 'データベースと接続を要求', 'backend', 'lane-backend', 448),
  process('be-error', '異常処理', 'backend', 'lane-backend', 780),
  process('be-data', 'データ解析', 'backend', 'lane-backend', 980),

  process('db-recv', '受信要求', 'database', 'lane-database', 448),
  decision('db-accept', '要求の受理', 'database', 'lane-database', 576),
  process('db-sql', 'SQL文を実行する', 'database', 'lane-database', 780),
  decision('db-result', '実行結果', 'database', 'lane-database', 900, true),
]

function laneEdge(
  id: string,
  source: string,
  target: string,
  options: {
    sourceHandle?: string
    targetHandle?: string
    label?: string
    className?: string
    animated?: boolean
    markerEnd?: Edge['markerEnd']
    style?: Edge['style']
  } = {},
): FlowEdge {
  const { style, className, ...rest } = options
  const isYes = className === 'edge-yes'
  const isNo = className === 'edge-no'

  return {
    id,
    source,
    target,
    type: 'smoothstep',
    markerEnd: arrow,
    className,
    pathOptions: edgePath,
    zIndex: 3,
    labelShowBg: true,
    labelBgStyle: labelBg,
    labelBgPadding: [10, 6] as [number, number],
    labelBgBorderRadius: 8,
    labelStyle: {
      fontSize: 12,
      fontWeight: 700,
      fill: isYes ? '#1a7a70' : isNo ? '#c24155' : '#5b6370',
    },
    style: {
      stroke: '#8b93a3',
      strokeWidth: 2,
      ...style,
    },
    ...rest,
  }
}

const initialEdges: FlowEdge[] = [
  laneEdge('e-send-recv', 'fe-send', 'be-recv', {
    sourceHandle: 'out-right',
    targetHandle: 'in-left',
  }),
  laneEdge('e-recv-parse', 'be-recv', 'be-parse', {
    sourceHandle: 'out-bottom',
    targetHandle: 'in-top',
  }),
  laneEdge('e-parse-fail', 'be-parse', 'fe-fail-req', {
    sourceHandle: 'out-left',
    targetHandle: 'in-right',
    label: 'リクエスト失敗',
    className: 'edge-no',
    markerEnd: arrowNo,
    style: { stroke: '#c24155', strokeWidth: 2 },
  }),
  laneEdge('e-parse-ok', 'be-parse', 'be-dbreq', {
    sourceHandle: 'out-bottom',
    targetHandle: 'in-top',
    label: '成功',
    className: 'edge-yes',
    animated: true,
    markerEnd: arrowYes,
    style: { stroke: '#1a7a70', strokeWidth: 2 },
  }),
  laneEdge('e-dbreq-recv', 'be-dbreq', 'db-recv', {
    sourceHandle: 'out-right',
    targetHandle: 'in-left',
  }),
  laneEdge('e-recv-accept', 'db-recv', 'db-accept', {
    sourceHandle: 'out-bottom',
    targetHandle: 'in-top',
  }),
  laneEdge('e-accept-fail', 'db-accept', 'be-error', {
    sourceHandle: 'out-left',
    targetHandle: 'in-right',
    label: '失敗',
    className: 'edge-no',
    markerEnd: arrowNo,
    style: { stroke: '#c24155', strokeWidth: 2 },
  }),
  laneEdge('e-accept-ok', 'db-accept', 'db-sql', {
    sourceHandle: 'out-bottom',
    targetHandle: 'in-top',
    label: '成功',
    className: 'edge-yes',
    animated: true,
    markerEnd: arrowYes,
    style: { stroke: '#1a7a70', strokeWidth: 2 },
  }),
  laneEdge('e-sql-result', 'db-sql', 'db-result', {
    sourceHandle: 'out-bottom',
    targetHandle: 'in-top',
  }),
  laneEdge('e-result-fail', 'db-result', 'be-error', {
    sourceHandle: 'out-left',
    targetHandle: 'in-right',
    label: '失敗',
    className: 'edge-no',
    markerEnd: arrowNo,
    style: { stroke: '#c24155', strokeWidth: 2 },
  }),
  laneEdge('e-result-ok', 'db-result', 'be-data', {
    sourceHandle: 'out-left-bottom',
    targetHandle: 'in-right',
    label: '成功',
    className: 'edge-yes',
    animated: true,
    markerEnd: arrowYes,
    style: { stroke: '#1a7a70', strokeWidth: 2 },
  }),
  laneEdge('e-error-fe', 'be-error', 'fe-fail-abn', {
    sourceHandle: 'out-left',
    targetHandle: 'in-right',
    label: '異常情報を返す',
    className: 'edge-no',
    markerEnd: arrowNo,
    style: { stroke: '#c24155', strokeWidth: 2 },
  }),
  laneEdge('e-data-fe', 'be-data', 'fe-success', {
    sourceHandle: 'out-left',
    targetHandle: 'in-right',
    label: '返却データ情報',
    className: 'edge-yes',
    markerEnd: arrowYes,
    style: { stroke: '#1a7a70', strokeWidth: 2 },
  }),
]

function isSwimlane(node: FlowNode): node is SwimlaneNode {
  return node.type === 'swimlane'
}

function nodeSize(node: FlowNode) {
  if (node.type === 'decision') return { w: DECISION_W, h: DECISION_H }
  return { w: PROCESS_W, h: PROCESS_H }
}

function laneWidth(node: FlowNode) {
  return Number(node.style?.width ?? node.width ?? LANE_W)
}

function getTargetLane(nodes: FlowNode[]): SwimlaneNode | undefined {
  const selectedLane = nodes.find(
    (node): node is SwimlaneNode => Boolean(node.selected) && isSwimlane(node),
  )
  if (selectedLane) return selectedLane

  const selectedChild = nodes.find((node) => node.selected && node.parentId)
  if (selectedChild?.parentId) {
    return nodes.find(
      (node): node is SwimlaneNode =>
        isSwimlane(node) && node.id === selectedChild.parentId,
    )
  }

  return nodes.find(isSwimlane)
}

function formatNodes(nodes: FlowNode[]): FlowNode[] {
  const lanes = nodes
    .filter(isSwimlane)
    .slice()
    .sort((a, b) => a.position.x - b.position.x)
  const children = nodes.filter((node) => node.parentId)
  const formatted: FlowNode[] = []
  let x = 0

  for (const currentLane of lanes) {
    const kids = children
      .filter((node) => node.parentId === currentLane.id)
      .slice()
      .sort(
        (a, b) => a.position.y - b.position.y || a.position.x - b.position.x,
      )

    let y = HEADER_Y
    const width = LANE_W
    const laidKids = kids.map((kid) => {
      const { w, h } = nodeSize(kid)
      const nextKid = {
        ...kid,
        position: { x: laneInnerX(width, w), y },
        selected: false,
      }
      y += h + NODE_GAP
      return nextKid
    })

    formatted.push({
      ...currentLane,
      position: { x, y: 0 },
      selected: false,
      style: { ...currentLane.style, width, height: Math.max(420, y + 64) },
    })
    formatted.push(...laidKids)
    x += LANE_W + LANE_GAP
  }

  return formatted
}

function absolutePosition(nodes: FlowNode[], node: FlowNode) {
  const parent = node.parentId
    ? nodes.find((item) => item.id === node.parentId)
    : undefined
  return {
    x: (parent?.position.x ?? 0) + node.position.x,
    y: (parent?.position.y ?? 0) + node.position.y,
  }
}

function connectHandles(nodes: FlowNode[], source: FlowNode, target: FlowNode) {
  const from = absolutePosition(nodes, source)
  const to = absolutePosition(nodes, target)
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: 'out-right', targetHandle: 'in-left' }
      : { sourceHandle: 'out-left', targetHandle: 'in-right' }
  }
  return dy >= 0
    ? { sourceHandle: 'out-bottom', targetHandle: 'in-top' }
    : { sourceHandle: 'in-top', targetHandle: 'out-bottom' }
}

function cloneGraph() {
  return {
    nodes: structuredClone(initialNodes),
    edges: structuredClone(initialEdges) as FlowEdge[],
  }
}

function nodeColor(node: Node) {
  const tone = (node.data as { tone?: LaneTone } | undefined)?.tone
  if (node.type === 'swimlane') {
    if (tone === 'frontend') return '#e8eef4'
    if (tone === 'backend') return '#f0ebe4'
    if (tone === 'database') return '#f0e8ec'
    if (tone === 'ops') return '#e5efe9'
    if (tone === 'other') return '#eceaf3'
  }
  if (tone === 'frontend') return '#5a7a9a'
  if (tone === 'backend') return '#9a7a58'
  if (tone === 'database') return '#9a6f84'
  if (tone === 'ops') return '#5e8a76'
  if (tone === 'other') return '#7574a0'
  return '#64748b'
}

function SwimLaneEditor() {
  const { fitView, deleteElements } = useReactFlow<FlowNode, FlowEdge>()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(initialEdges)

  const selectedNodes = nodes.filter((node) => node.selected)
  const selectedEdges = edges.filter((edge) => edge.selected)
  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : undefined
  const selectedEdge = selectedEdges.length === 1 ? selectedEdges[0] : undefined
  const targetLane = getTargetLane(nodes)
  const selectedItems = selectedNodes.filter((node) => node.type !== 'swimlane')
  const canConnect = selectedItems.length === 2
  const canDelete = selectedNodes.length > 0 || selectedEdges.length > 0

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((current) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            markerEnd: arrow,
            pathOptions: edgePath,
          },
          current,
        ),
      ),
    [setEdges],
  )

  const onReconnect = useCallback(
    (oldEdge: FlowEdge, connection: Connection) => {
      setEdges((current) => reconnectEdge(oldEdge, connection, current))
    },
    [setEdges],
  )

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => connection.source !== connection.target,
    [],
  )

  const onBeforeDelete = useCallback<OnBeforeDelete<FlowNode, FlowEdge>>(
    async ({ nodes: removing, edges: removingEdges }) => {
      const ids = new Set(removing.map((node) => node.id))
      const extraNodes = nodes.filter(
        (node) => node.parentId && ids.has(node.parentId) && !ids.has(node.id),
      )
      const allNodes = [...removing, ...extraNodes]
      const allIds = new Set(allNodes.map((node) => node.id))
      const extraEdges = edges.filter(
        (edge) =>
          !removingEdges.some((item) => item.id === edge.id) &&
          (allIds.has(edge.source) || allIds.has(edge.target)),
      )
      return { nodes: allNodes, edges: [...removingEdges, ...extraEdges] }
    },
    [nodes, edges],
  )

  const scheduleFitView = useCallback(() => {
    window.setTimeout(() => {
      void fitView({ padding: 0.1, duration: 220 })
    }, 0)
  }, [fitView])

  const addLane = useCallback(() => {
    setNodes((current) => {
      const lanes = current.filter(isSwimlane)
      const index = lanes.length
      const tone = TONES[index % TONES.length]
      const label =
        index < LANE_LABELS.length ? LANE_LABELS[index] : `レーン ${index + 1}`
      const x =
        lanes.reduce(
          (max, node) => Math.max(max, node.position.x + laneWidth(node)),
          0,
        ) + (lanes.length ? LANE_GAP : 0)
      const nextLane: SwimlaneNode = {
        ...lane(`lane-${crypto.randomUUID()}`, label, tone, x),
        selected: true,
        style: { width: LANE_W, height: 520 },
      }

      return [
        ...current.map((node) => ({ ...node, selected: false })),
        nextLane,
      ]
    })
    scheduleFitView()
  }, [scheduleFitView, setNodes])

  const addChild = useCallback(
    (kind: 'process' | 'decision') => {
      setNodes((current) => {
        let working = current
        let parent = getTargetLane(working)

        if (!parent) {
          const created = lane(
            `lane-${crypto.randomUUID()}`,
            LANE_LABELS[0],
            TONES[0],
            0,
          )
          working = [...working, created]
          parent = created
        }

        const kids = working.filter((node) => node.parentId === parent.id)
        const maxBottom = kids.reduce((max, node) => {
          const { h } = nodeSize(node)
          return Math.max(max, node.position.y + h)
        }, HEADER_Y)
        const parentW = laneWidth(parent)
        const y = kids.length ? maxBottom + NODE_GAP : HEADER_Y
        const { w, h } =
          kind === 'decision'
            ? { w: DECISION_W, h: DECISION_H }
            : { w: PROCESS_W, h: PROCESS_H }
        const id = `${kind}-${crypto.randomUUID()}`
        const nextNode =
          kind === 'decision'
            ? decision(id, '判定', parent.data.tone, parent.id, y)
            : process(id, '処理', parent.data.tone, parent.id, y)
        nextNode.position = { x: laneInnerX(parentW, w), y }
        nextNode.selected = true

        const needed = y + h + 56
        const currentHeight = Number(parent.style?.height ?? LANE_H)

        return [
          ...working.map((node) => {
            if (node.id === parent.id) {
              return {
                ...node,
                selected: false,
                style: {
                  ...node.style,
                  height: Math.max(currentHeight, needed),
                },
              }
            }
            return { ...node, selected: false }
          }),
          nextNode,
        ]
      })
    },
    [setNodes],
  )

  const connectSelected = useCallback(() => {
    if (selectedItems.length !== 2) return
    const [source, target] = selectedItems
    setEdges((current) =>
      addEdge(
        {
          source: source.id,
          target: target.id,
          ...connectHandles(nodes, source, target),
          type: 'smoothstep',
          markerEnd: arrow,
          pathOptions: edgePath,
        },
        current,
      ),
    )
  }, [nodes, selectedItems, setEdges])

  const formatLayout = useCallback(() => {
    setNodes((current) => formatNodes(current))
    setEdges((current) => current.map((edge) => ({ ...edge, selected: false })))
    scheduleFitView()
  }, [scheduleFitView, setEdges, setNodes])

  const removeSelected = useCallback(() => {
    const extraChildren = nodes.filter(
      (node) =>
        node.parentId && selectedNodes.some((item) => item.id === node.parentId),
    )
    void deleteElements({
      nodes: [...selectedNodes, ...extraChildren],
      edges: selectedEdges,
    })
  }, [deleteElements, nodes, selectedEdges, selectedNodes])

  const reset = useCallback(() => {
    const graph = cloneGraph()
    setNodes(graph.nodes)
    setEdges(graph.edges)
    scheduleFitView()
  }, [scheduleFitView, setEdges, setNodes])

  const selectedLabel =
    selectedNode && 'label' in selectedNode.data
      ? selectedNode.data.label
      : selectedEdge
        ? String(selectedEdge.label ?? '')
        : ''

  return (
    <ReactFlow<FlowNode, FlowEdge>
      className="swimlane-flow"
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onReconnect={onReconnect}
      onBeforeDelete={onBeforeDelete}
      isValidConnection={isValidConnection}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.08, minZoom: 0.62 }}
      minZoom={0.35}
      maxZoom={1.4}
      snapToGrid
      snapGrid={[8, 8]}
      deleteKeyCode={['Backspace', 'Delete']}
      multiSelectionKeyCode={['Shift', 'Control', 'Meta']}
      connectionMode={ConnectionMode.Loose}
      connectionLineType={ConnectionLineType.SmoothStep}
      defaultEdgeOptions={{
        type: 'smoothstep',
        markerEnd: arrow,
      }}
      edgesReconnectable
      attributionPosition="bottom-left"
    >
      <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#d5dbe4" />
      <MiniMap nodeColor={nodeColor} pannable zoomable maskColor="rgba(18, 21, 28, 0.06)" />
      <Controls showInteractive={false} />
      <Panel position="top-left" className="flow-panel">
        <p className="flow-kicker">React Flow サンプル</p>
        <h1>スイムレーン</h1>
        <p>ハンドルをドラッグして線をつなぎます。ダブルクリックで名前を変更できます。</p>
      </Panel>
      <Panel position="top-right" className="flow-panel flow-panel--inspector">
        {selectedNode || selectedEdge ? (
          <label className="flow-field">
            {selectedEdge ? '線のラベル' : '名前'}
            <input
              className="nodrag nopan"
              value={selectedLabel}
              onChange={(event) => {
                const label = event.target.value
                if (selectedNode) {
                  setNodes((current) =>
                    current.map((node) =>
                      node.id === selectedNode.id
                        ? { ...node, data: { ...node.data, label } }
                        : node,
                    ),
                  )
                }
                if (selectedEdge) {
                  setEdges((current) =>
                    current.map((edge) =>
                      edge.id === selectedEdge.id ? { ...edge, label } : edge,
                    ),
                  )
                }
              }}
            />
          </label>
        ) : (
          <div className="inspector-empty">
            <p className="flow-kicker">選択なし</p>
            <p>
              レーンをクリックしてから処理・判定を追加します。Shift
              を押しながら 2 つのノードを選ぶと線でつなげます。
            </p>
          </div>
        )}
      </Panel>
      <Panel position="bottom-center" className="editor-bar">
        <div className="editor-bar__target">
          追加先
          <span
            className={`lane-chip${targetLane ? ` lane-chip--${targetLane.data.tone}` : ''}`}
          >
            {targetLane?.data.label ?? 'レーンを追加'}
          </span>
        </div>
        <div className="editor-group editor-group--add" aria-label="ノードを追加">
          <ToolButton icon={<IconLane />} onClick={addLane} title="新しいレーンを右端に追加">
            レーン
          </ToolButton>
          <ToolButton
            icon={<IconProcess />}
            onClick={() => addChild('process')}
            title="選択中のレーンに処理を追加"
          >
            処理
          </ToolButton>
          <ToolButton
            icon={<IconDecision />}
            onClick={() => addChild('decision')}
            title="選択中のレーンに判定を追加"
          >
            判定
          </ToolButton>
        </div>
        <div className="editor-group" aria-label="接続と配置">
          <ToolButton
            icon={<IconLink />}
            onClick={connectSelected}
            disabled={!canConnect}
            title={
              canConnect
                ? '選択した 2 つのノードを接続'
                : 'Shift を押しながら 2 つのノードを選択'
            }
          >
            線を追加
          </ToolButton>
          <ToolButton icon={<IconLayout />} onClick={formatLayout} title="レーンとノードを整列">
            整形
          </ToolButton>
        </div>
        <div className="editor-group editor-group--danger" aria-label="削除とリセット">
          <ToolButton
            icon={<IconTrash />}
            onClick={removeSelected}
            disabled={!canDelete}
            danger
            title={canDelete ? '選択中の要素を削除' : '削除する要素を選択'}
          >
            削除
          </ToolButton>
          <ToolButton icon={<IconReset />} onClick={reset} title="初期状態に戻す">
            リセット
          </ToolButton>
        </div>
      </Panel>
    </ReactFlow>
  )
}

export default function SwimLane() {
  return (
    <ReactFlowProvider>
      <SwimLaneEditor />
    </ReactFlowProvider>
  )
}
