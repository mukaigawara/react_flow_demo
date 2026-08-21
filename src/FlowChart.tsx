import { useCallback } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
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

type FlowNode = Node<{ label: string }>

function StartNode({ data }: NodeProps<FlowNode>) {
  return (
    <div className="flow-pill flow-pill--start">
      <span className="flow-pill__mark" aria-hidden />
      <span>{data.label}</span>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

function ProcessNode({ data }: NodeProps<FlowNode>) {
  return (
    <div className="flow-card">
      <Handle type="target" position={Position.Top} />
      <span>{data.label}</span>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

function ErrorNode({ data }: NodeProps<FlowNode>) {
  return (
    <div className="flow-card flow-card--error">
      <Handle type="target" position={Position.Top} />
      <span className="flow-card__icon" aria-hidden>
        !
      </span>
      <span>{data.label}</span>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

function EndNode({ data }: NodeProps<FlowNode>) {
  return (
    <div className="flow-pill flow-pill--end">
      <Handle type="target" position={Position.Top} />
      <span>{data.label}</span>
      <span className="flow-pill__mark" aria-hidden />
    </div>
  )
}

function DecisionNode({ data }: NodeProps<FlowNode>) {
  return (
    <div className="decision-node">
      <Handle type="target" position={Position.Top} />
      <div className="decision-diamond">
        <span>{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="yes" />
      <Handle type="source" position={Position.Right} id="no" />
    </div>
  )
}

const nodeTypes = {
  start: StartNode,
  process: ProcessNode,
  decision: DecisionNode,
  error: ErrorNode,
  end: EndNode,
} satisfies NodeTypes

const initialNodes: FlowNode[] = [
  {
    id: 'start',
    type: 'start',
    position: { x: 280, y: 0 },
    data: { label: '開始' },
  },
  {
    id: 'form',
    type: 'process',
    position: { x: 236, y: 110 },
    data: { label: '登録フォーム入力' },
  },
  {
    id: 'validate',
    type: 'process',
    position: { x: 236, y: 210 },
    data: { label: '入力内容を検証' },
  },
  {
    id: 'decision',
    type: 'decision',
    position: { x: 272, y: 320 },
    data: { label: '入力は有効？' },
  },
  {
    id: 'create',
    type: 'process',
    position: { x: 60, y: 520 },
    data: { label: 'アカウントを作成' },
  },
  {
    id: 'email',
    type: 'process',
    position: { x: 60, y: 620 },
    data: { label: '完了メールを送信' },
  },
  {
    id: 'done',
    type: 'end',
    position: { x: 104, y: 720 },
    data: { label: '完了' },
  },
  {
    id: 'error',
    type: 'error',
    position: { x: 500, y: 420 },
    data: { label: 'エラーを表示' },
  },
]

const arrow = { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#94a3b8' }
const arrowYes = { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#0f766e' }
const arrowNo = { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#e11d48' }
const arrowRetry = { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#c2410c' }

const initialEdges: Edge[] = [
  { id: 'e-start-form', source: 'start', target: 'form', markerEnd: arrow },
  { id: 'e-form-validate', source: 'form', target: 'validate', markerEnd: arrow },
  {
    id: 'e-validate-decision',
    source: 'validate',
    target: 'decision',
    markerEnd: arrow,
  },
  {
    id: 'e-yes',
    source: 'decision',
    sourceHandle: 'yes',
    target: 'create',
    label: 'Yes',
    animated: true,
    markerEnd: arrowYes,
    className: 'edge-yes',
    style: { stroke: '#0f766e', strokeWidth: 2.25 },
  },
  {
    id: 'e-create-email',
    source: 'create',
    target: 'email',
    markerEnd: arrow,
  },
  {
    id: 'e-email-done',
    source: 'email',
    target: 'done',
    markerEnd: arrow,
  },
  {
    id: 'e-no',
    source: 'decision',
    sourceHandle: 'no',
    target: 'error',
    label: 'No',
    markerEnd: arrowNo,
    className: 'edge-no',
    style: { stroke: '#e11d48', strokeWidth: 2.25 },
  },
  {
    id: 'e-error-form',
    source: 'error',
    target: 'form',
    label: '再入力',
    animated: true,
    type: 'smoothstep',
    markerEnd: arrowRetry,
    className: 'edge-retry',
    style: { stroke: '#c2410c', strokeWidth: 2.25 },
  },
]

function nodeColor(node: Node) {
  if (node.type === 'start') return '#0f766e'
  if (node.type === 'end') return '#059669'
  if (node.type === 'decision') return '#f59e0b'
  if (node.type === 'error') return '#e11d48'
  return '#64748b'
}

export default function FlowChart() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((current) => addEdge({ ...params, markerEnd: arrow }, current)),
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
      fitViewOptions={{ padding: 0.18 }}
      attributionPosition="bottom-left"
      defaultEdgeOptions={{ markerEnd: arrow }}
    >
      <Background />
      <MiniMap nodeColor={nodeColor} pannable zoomable maskColor="rgba(18, 21, 28, 0.08)" />
      <Controls showInteractive={false} />
      <Panel position="top-left" className="flow-panel">
        <p className="flow-kicker">React Flow サンプル</p>
        <h1>ユーザー登録フロー</h1>
        <p>ノードをドラッグ、ホイールでズーム、ハンドル同士を接続できます。</p>
        <ul className="flow-legend">
          <li>
            <span className="swatch swatch--start" />
            開始
          </li>
          <li>
            <span className="swatch swatch--process" />
            処理
          </li>
          <li>
            <span className="swatch swatch--decision" />
            判定
          </li>
          <li>
            <span className="swatch swatch--error" />
            エラー
          </li>
          <li>
            <span className="swatch swatch--done" />
            完了
          </li>
        </ul>
      </Panel>
    </ReactFlow>
  )
}
