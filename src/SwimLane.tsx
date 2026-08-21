import { useCallback, useState } from 'react'
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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

type LaneTone = 'frontend' | 'backend' | 'database' | 'ops' | 'other'

type SwimlaneData = { label: string; tone: LaneTone }
type ProcessData = { label: string; tone: LaneTone }
type DecisionData = { label: string; tone: LaneTone; dualLeft?: boolean }

type SwimlaneNode = Node<SwimlaneData, 'swimlane'>
type ProcessNode = Node<ProcessData, 'process'>
type DecisionFlowNode = Node<DecisionData, 'decision'>
type FlowNode = SwimlaneNode | ProcessNode | DecisionFlowNode

const LANE_W = 280
const LANE_H = 1040
const LANE_GAP = 20
const HEADER_Y = 56
const NODE_GAP = 28
const PROCESS_W = 200
const PROCESS_H = 48
const DECISION_W = 150
const DECISION_H = 150

const TONES: LaneTone[] = ['frontend', 'backend', 'database', 'ops', 'other']
const LANE_LABELS = [
  'フロントエンド',
  'バックエンド',
  'データベース',
  '運用',
  'その他',
]

const arrow = { type: MarkerType.ArrowClosed, width: 18, height: 18 }

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
        minWidth={220}
        minHeight={280}
        color="#6366f1"
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
    position: { x: 40, y },
    data: { label, tone },
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
    position: { x: 65, y },
    data: { label, tone, dualLeft },
  }
}

const initialNodes: FlowNode[] = [
  lane('lane-frontend', 'フロントエンド', 'frontend', 0),
  lane('lane-backend', 'バックエンド', 'backend', LANE_W + LANE_GAP),
  lane('lane-database', 'データベース', 'database', (LANE_W + LANE_GAP) * 2),

  process('fe-send', '要求を送信', 'frontend', 'lane-frontend', 72),
  process('fe-fail-req', '失敗処理', 'frontend', 'lane-frontend', 249),
  process('fe-fail-abn', '失敗処理', 'frontend', 'lane-frontend', 670),
  process('fe-success', '成功処理', 'frontend', 'lane-frontend', 849),

  process('be-recv', '受信要求', 'backend', 'lane-backend', 72),
  decision('be-parse', '解析要求', 'backend', 'lane-backend', 200),
  process('be-dbreq', 'データベースと接続を要求', 'backend', 'lane-backend', 380),
  process('be-error', '異常処理', 'backend', 'lane-backend', 670),
  process('be-data', 'データ解析', 'backend', 'lane-backend', 849),

  process('db-recv', '受信要求', 'database', 'lane-database', 380),
  decision('db-accept', '要求の受理', 'database', 'lane-database', 500),
  process('db-sql', 'SQL文を実行する', 'database', 'lane-database', 670),
  decision('db-result', '実行結果', 'database', 'lane-database', 800, true),
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
  } = {},
): Edge {
  return {
    id,
    source,
    target,
    type: 'smoothstep',
    markerEnd: arrow,
    ...options,
  }
}

const initialEdges: Edge[] = [
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
  }),
  laneEdge('e-parse-ok', 'be-parse', 'be-dbreq', {
    sourceHandle: 'out-bottom',
    targetHandle: 'in-top',
    label: '成功',
    className: 'edge-yes',
    animated: true,
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
  }),
  laneEdge('e-accept-ok', 'db-accept', 'db-sql', {
    sourceHandle: 'out-bottom',
    targetHandle: 'in-top',
    label: '成功',
    className: 'edge-yes',
    animated: true,
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
  }),
  laneEdge('e-result-ok', 'db-result', 'be-data', {
    sourceHandle: 'out-left-bottom',
    targetHandle: 'in-right',
    label: '成功',
    className: 'edge-yes',
    animated: true,
  }),
  laneEdge('e-error-fe', 'be-error', 'fe-fail-abn', {
    sourceHandle: 'out-left',
    targetHandle: 'in-right',
    label: '異常情報を返す',
    className: 'edge-no',
  }),
  laneEdge('e-data-fe', 'be-data', 'fe-success', {
    sourceHandle: 'out-left',
    targetHandle: 'in-right',
    label: '返却データ情報',
    className: 'edge-yes',
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
    const laidKids = kids.map((kid) => {
      const { w, h } = nodeSize(kid)
      const nextKid = {
        ...kid,
        position: { x: (LANE_W - w) / 2, y },
        selected: false,
      }
      y += h + NODE_GAP
      return nextKid
    })

    formatted.push({
      ...currentLane,
      position: { x, y: 0 },
      selected: false,
      style: { ...currentLane.style, width: LANE_W, height: Math.max(360, y + 24) },
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
    edges: structuredClone(initialEdges),
  }
}

function nodeColor(node: Node) {
  const tone = (node.data as { tone?: LaneTone } | undefined)?.tone
  if (node.type === 'swimlane') {
    if (tone === 'frontend') return '#bfdbfe'
    if (tone === 'backend') return '#fef08a'
    if (tone === 'database') return '#fbcfe8'
    if (tone === 'ops') return '#bbf7d0'
    if (tone === 'other') return '#ddd6fe'
  }
  if (node.type === 'decision') {
    if (tone === 'frontend') return '#3b82f6'
    if (tone === 'backend') return '#eab308'
    if (tone === 'database') return '#ec4899'
    if (tone === 'ops') return '#16a34a'
    if (tone === 'other') return '#7c3aed'
  }
  if (tone === 'frontend') return '#60a5fa'
  if (tone === 'backend') return '#facc15'
  if (tone === 'database') return '#f9a8d4'
  if (tone === 'ops') return '#4ade80'
  if (tone === 'other') return '#a78bfa'
  return '#64748b'
}

function SwimLaneEditor() {
  const { fitView, deleteElements } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

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
        addEdge({ ...params, type: 'smoothstep', markerEnd: arrow }, current),
      ),
    [setEdges],
  )

  const onReconnect = useCallback(
    (oldEdge: Edge, connection: Connection) => {
      setEdges((current) => reconnectEdge(oldEdge, connection, current))
    },
    [setEdges],
  )

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => connection.source !== connection.target,
    [],
  )

  const onBeforeDelete = useCallback<OnBeforeDelete<FlowNode, Edge>>(
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
      void fitView({ padding: 0.14, duration: 220 })
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
        style: { width: LANE_W, height: 420 },
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
        nextNode.position = { x: (LANE_W - w) / 2, y }
        nextNode.selected = true

        const needed = y + h + 32
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
    <ReactFlow
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
      minZoom={0.3}
      snapToGrid
      snapGrid={[10, 10]}
      deleteKeyCode={['Backspace', 'Delete']}
      multiSelectionKeyCode={['Shift', 'Control', 'Meta']}
      connectionMode={ConnectionMode.Loose}
      connectionLineType={ConnectionLineType.SmoothStep}
      defaultEdgeOptions={{ type: 'smoothstep', markerEnd: arrow }}
      edgesReconnectable
      attributionPosition="bottom-left"
    >
      <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
      <MiniMap nodeColor={nodeColor} pannable zoomable />
      <Controls />
      <Panel position="top-left" className="flow-panel">
        <p className="flow-kicker">React Flow サンプル</p>
        <h1>スイムレーン</h1>
        <p>
          ハンドルをドラッグして線をつなぎます。ダブルクリックで名前を変更できます。
        </p>
      </Panel>
      <Panel position="top-right" className="flow-panel flow-panel--editor">
        <p className="flow-kicker">編集</p>
        <p className="flow-hint">
          追加先: <strong>{targetLane?.data.label ?? 'レーンを追加'}</strong>
        </p>
        <div className="flow-toolbar">
          <button type="button" onClick={addLane}>
            レーンを追加
          </button>
          <button type="button" onClick={() => addChild('process')}>
            処理を追加
          </button>
          <button type="button" onClick={() => addChild('decision')}>
            判定を追加
          </button>
          <button type="button" onClick={formatLayout}>
            整形
          </button>
          <button type="button" onClick={connectSelected} disabled={!canConnect}>
            線を追加
          </button>
          <button
            type="button"
            className="danger"
            onClick={removeSelected}
            disabled={!canDelete}
          >
            削除
          </button>
          <button type="button" onClick={reset}>
            リセット
          </button>
        </div>
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
          <p className="flow-hint">
            レーンをクリックしてから処理・判定を追加します。Shift
            を押しながら 2 つのノードを選んで「線を追加」もできます。
          </p>
        )}
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
