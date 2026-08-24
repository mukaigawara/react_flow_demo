import { act, renderHook } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, test } from 'vitest'
import {
  isEditingField,
  useGraphHistory,
  type GraphSnapshot,
} from './useGraphHistory'

type TestNode = {
  id: string
  type?: string
  parentId?: string
  data?: { label: string }
}

type TestEdge = { id: string; source: string; target: string }

const initialGraph: GraphSnapshot<TestNode, TestEdge> = {
  nodes: [
    { id: 'frame', type: 'swimlane-frame' },
    { id: 'lane-frontend', type: 'swimlane', data: { label: 'フロントエンド' } },
    { id: 'lane-backend', type: 'swimlane', data: { label: 'バックエンド' } },
    {
      id: 'fe-send',
      type: 'process',
      parentId: 'lane-frontend',
      data: { label: '要求を送信' },
    },
    {
      id: 'fe-fail',
      type: 'process',
      parentId: 'lane-frontend',
      data: { label: '失敗処理' },
    },
    {
      id: 'be-recv',
      type: 'process',
      parentId: 'lane-backend',
      data: { label: '受信要求' },
    },
  ],
  edges: [{ id: 'e-send-recv', source: 'fe-send', target: 'be-recv' }],
}

function deleteLane(
  graph: GraphSnapshot<TestNode, TestEdge>,
  laneId: string,
): GraphSnapshot<TestNode, TestEdge> {
  const removingIds = new Set(
    graph.nodes
      .filter((node) => node.id === laneId || node.parentId === laneId)
      .map((node) => node.id),
  )

  return {
    nodes: graph.nodes.filter((node) => !removingIds.has(node.id)),
    edges: graph.edges.filter(
      (edge) => !removingIds.has(edge.source) && !removingIds.has(edge.target),
    ),
  }
}

function useTestHistory(initial: GraphSnapshot<TestNode, TestEdge>) {
  const [graph, setGraph] = useState(initial)
  const history = useGraphHistory(graph.nodes, graph.edges, setGraph)
  return { graph, setGraph, history }
}

function dispatchUndoShortcut(target: EventTarget, metaKey = false) {
  const event = new KeyboardEvent('keydown', {
    key: 'z',
    ctrlKey: !metaKey,
    metaKey,
    bubbles: true,
    cancelable: true,
  })
  target.dispatchEvent(event)
  return event
}

describe('isEditingField', () => {
  test('treats input, textarea, select, and contentEditable as editing fields', () => {
    const input = document.createElement('input')
    const textarea = document.createElement('textarea')
    const select = document.createElement('select')
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    document.body.append(editable)
    const wrapper = document.createElement('label')
    const nestedInput = document.createElement('input')
    wrapper.append(nestedInput)

    expect(isEditingField(input)).toBe(true)
    expect(isEditingField(textarea)).toBe(true)
    expect(isEditingField(select)).toBe(true)
    expect(isEditingField(editable)).toBe(true)
    expect(isEditingField(nestedInput)).toBe(true)
    expect(isEditingField(document.createElement('button'))).toBe(false)
    expect(isEditingField(document.body)).toBe(false)
  })
})

describe('useGraphHistory', () => {
  test('undoing a lane delete restores the lane and its child nodes', () => {
    const { result } = renderHook(() => useTestHistory(initialGraph))

    act(() => {
      result.current.history.record()
      result.current.setGraph(deleteLane(result.current.graph, 'lane-frontend'))
    })

    expect(result.current.graph.nodes.map((node) => node.id)).toEqual([
      'frame',
      'lane-backend',
      'be-recv',
    ])
    expect(result.current.graph.edges).toEqual([])

    act(() => {
      result.current.history.undo()
    })

    expect(result.current.graph.nodes.map((node) => node.id)).toEqual([
      'frame',
      'lane-frontend',
      'lane-backend',
      'fe-send',
      'fe-fail',
      'be-recv',
    ])
    expect(
      result.current.graph.nodes
        .filter((node) => node.parentId === 'lane-frontend')
        .map((node) => node.id),
    ).toEqual(['fe-send', 'fe-fail'])
    expect(result.current.graph.edges).toEqual(initialGraph.edges)
  })

  test('Ctrl/Cmd+Z while a label input is focused does not undo the graph', () => {
    const { result } = renderHook(() => useTestHistory(initialGraph))

    act(() => {
      result.current.history.record()
      result.current.setGraph(deleteLane(result.current.graph, 'lane-frontend'))
    })

    const input = document.createElement('input')
    input.setAttribute('aria-label', '名前を編集')
    document.body.append(input)

    const ctrlEvent = dispatchUndoShortcut(input)
    const metaEvent = dispatchUndoShortcut(input, true)

    expect(ctrlEvent.defaultPrevented).toBe(false)
    expect(metaEvent.defaultPrevented).toBe(false)
    expect(result.current.graph.nodes.some((node) => node.id === 'lane-frontend')).toBe(
      false,
    )

    act(() => {
      dispatchUndoShortcut(document.body)
    })

    expect(result.current.graph.nodes.map((node) => node.id)).toContain('lane-frontend')
    expect(
      result.current.graph.nodes.filter((node) => node.parentId === 'lane-frontend'),
    ).toHaveLength(2)

    input.remove()
  })
})
