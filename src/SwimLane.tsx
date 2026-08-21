import { useCallback } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

type LaneTone = 'frontend' | 'backend' | 'database'

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

function SwimlaneLane({ data }: NodeProps<SwimlaneNode>) {
  return (
    <div className={`swimlane-node swimlane-node--${data.tone}`}>
      <div className="swimlane-node__title">{data.label}</div>
    </div>
  )
}

function ProcessBox({ data }: NodeProps<ProcessNode>) {
  return (
    <div className={`process-node process-node--${data.tone}`}>
      <Handle type="target" position={Position.Top} id="in-top" />
      <Handle type="source" position={Position.Bottom} id="out-bottom" />
      <Handle type="target" position={Position.Left} id="in-left" />
      <Handle type="source" position={Position.Left} id="out-left" />
      <Handle type="target" position={Position.Right} id="in-right" />
      <Handle type="source" position={Position.Right} id="out-right" />
      <span>{data.label}</span>
    </div>
  )
}

function DecisionBox({ data }: NodeProps<DecisionFlowNode>) {
  return (
    <div className="decision-node">
      <Handle type="target" position={Position.Top} id="in-top" />
      <Handle type="source" position={Position.Right} id="out-right" />
      <Handle type="source" position={Position.Bottom} id="out-bottom" />
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
        <span>{data.label}</span>
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

const arrow = { type: MarkerType.ArrowClosed, width: 18, height: 18 }

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

function nodeColor(node: Node) {
  const tone = (node.data as { tone?: LaneTone } | undefined)?.tone
  if (node.type === 'swimlane') {
    if (tone === 'frontend') return '#bfdbfe'
    if (tone === 'backend') return '#fef08a'
    if (tone === 'database') return '#fbcfe8'
  }
  if (node.type === 'decision') {
    if (tone === 'frontend') return '#3b82f6'
    if (tone === 'backend') return '#eab308'
    if (tone === 'database') return '#ec4899'
  }
  if (tone === 'frontend') return '#60a5fa'
  if (tone === 'backend') return '#facc15'
  if (tone === 'database') return '#f9a8d4'
  return '#64748b'
}

export default function SwimLane() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((current) =>
        addEdge({ ...params, type: 'smoothstep', markerEnd: arrow }, current),
      ),
    [setEdges],
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.4}
      attributionPosition="bottom-left"
    >
      <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
      <MiniMap nodeColor={nodeColor} pannable zoomable />
      <Controls />
      <Panel position="top-left" className="flow-panel">
        <p className="flow-kicker">React Flow サンプル</p>
        <h1>スイムレーン</h1>
        <p>
          フロントエンド・バックエンド・データベースの処理分担です。ノードのドラッグ、ズーム、ハンドル同士の接続ができます。
        </p>
      </Panel>
    </ReactFlow>
  )
}
