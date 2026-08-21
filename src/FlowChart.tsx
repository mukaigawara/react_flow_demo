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

type FlowNode = Node<{ label: string }>

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
  decision: DecisionNode,
} satisfies NodeTypes

const initialNodes: FlowNode[] = [
  {
    id: 'start',
    type: 'input',
    position: { x: 280, y: 0 },
    data: { label: '開始' },
    className: 'node-start',
  },
  {
    id: 'form',
    position: { x: 256, y: 110 },
    data: { label: '登録フォーム入力' },
  },
  {
    id: 'validate',
    position: { x: 256, y: 210 },
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
    position: { x: 80, y: 520 },
    data: { label: 'アカウントを作成' },
  },
  {
    id: 'email',
    position: { x: 80, y: 620 },
    data: { label: '完了メールを送信' },
  },
  {
    id: 'done',
    type: 'output',
    position: { x: 104, y: 720 },
    data: { label: '完了' },
    className: 'node-done',
  },
  {
    id: 'error',
    position: { x: 500, y: 420 },
    data: { label: 'エラーを表示' },
    className: 'node-error',
  },
]

const arrow = { type: MarkerType.ArrowClosed, width: 18, height: 18 }

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
    markerEnd: arrow,
    className: 'edge-yes',
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
    markerEnd: arrow,
    className: 'edge-no',
  },
  {
    id: 'e-error-form',
    source: 'error',
    target: 'form',
    label: '再入力',
    animated: true,
    type: 'smoothstep',
    markerEnd: arrow,
    className: 'edge-retry',
  },
]

function nodeColor(node: Node) {
  if (node.type === 'input') return '#6366f1'
  if (node.type === 'output') return '#10b981'
  if (node.type === 'decision') return '#f59e0b'
  if (node.className === 'node-error') return '#ef4444'
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
      attributionPosition="bottom-left"
    >
      <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
      <MiniMap nodeColor={nodeColor} pannable zoomable />
      <Controls />
      <Panel position="top-left" className="flow-panel">
        <p className="flow-kicker">React Flow サンプル</p>
        <h1>ユーザー登録フロー</h1>
        <p>
          ノードのドラッグ、ホイールでのズーム、ハンドル同士の接続ができます。
        </p>
      </Panel>
    </ReactFlow>
  )
}
