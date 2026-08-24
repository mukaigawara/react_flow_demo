import { useCallback, useEffect, useRef, useState } from 'react'

export type GraphSnapshot<N, E> = {
  nodes: N[]
  edges: E[]
}

const MAX_HISTORY = 80

function withoutDrag<N>(nodes: N[]): N[] {
  return nodes.map((node) => {
    if (node && typeof node === 'object' && 'dragging' in node) {
      return { ...node, dragging: false }
    }
    return node
  })
}

export function cloneGraph<N, E>(graph: GraphSnapshot<N, E>): GraphSnapshot<N, E> {
  const cloned = structuredClone(graph)
  return { nodes: withoutDrag(cloned.nodes), edges: cloned.edges }
}

function omitVolatile(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(omitVolatile)
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (
        key === 'selected' ||
        key === 'dragging' ||
        key === 'measured' ||
        key === 'resizing' ||
        key === 'width' ||
        key === 'height'
      ) {
        continue
      }
      result[key] = omitVolatile(nested)
    }
    return result
  }
  return value
}

export function graphsEqual<N, E>(a: GraphSnapshot<N, E>, b: GraphSnapshot<N, E>) {
  return JSON.stringify(omitVolatile(a)) === JSON.stringify(omitVolatile(b))
}

function isEditingField(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.closest('textarea, select') !== null || target.isContentEditable)
  )
}

export function useGraphHistory<N, E>(
  nodes: N[],
  edges: E[],
  applyGraph: (graph: GraphSnapshot<N, E>) => void,
) {
  const pastRef = useRef<GraphSnapshot<N, E>[]>([])
  const futureRef = useRef<GraphSnapshot<N, E>[]>([])
  const coalesceRef = useRef<string | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const snapshot = useCallback(
    () => cloneGraph({ nodes, edges }),
    [edges, nodes],
  )

  const syncAvailability = useCallback(() => {
    setCanUndo(pastRef.current.length > 0)
    setCanRedo(futureRef.current.length > 0)
  }, [])

  const pushPast = useCallback(
    (graph: GraphSnapshot<N, E>) => {
      pastRef.current = [...pastRef.current, cloneGraph(graph)].slice(-MAX_HISTORY)
      futureRef.current = []
      syncAvailability()
    },
    [syncAvailability],
  )

  const record = useCallback(
    (coalesceKey?: string) => {
      if (coalesceKey && coalesceRef.current === coalesceKey) return
      const current = snapshot()
      const last = pastRef.current.at(-1)
      if (last && graphsEqual(last, current)) {
        coalesceRef.current = coalesceKey ?? null
        return
      }
      coalesceRef.current = coalesceKey ?? null
      pushPast(current)
    },
    [pushPast, snapshot],
  )

  const commitChange = useCallback(
    (before: GraphSnapshot<N, E>, after: GraphSnapshot<N, E>) => {
      if (graphsEqual(before, after)) return
      coalesceRef.current = null
      pushPast(before)
    },
    [pushPast],
  )

  const undo = useCallback(() => {
    const previous = pastRef.current.at(-1)
    if (!previous) return
    pastRef.current = pastRef.current.slice(0, -1)
    futureRef.current = [...futureRef.current, snapshot()]
    coalesceRef.current = null
    applyGraph(cloneGraph(previous))
    syncAvailability()
  }, [applyGraph, snapshot, syncAvailability])

  const redo = useCallback(() => {
    const next = futureRef.current.at(-1)
    if (!next) return
    futureRef.current = futureRef.current.slice(0, -1)
    pastRef.current = [...pastRef.current, snapshot()]
    coalesceRef.current = null
    applyGraph(cloneGraph(next))
    syncAvailability()
  }, [applyGraph, snapshot, syncAvailability])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || isEditingField(event.target)) return
      const key = event.key.toLowerCase()
      if (key === 'z' && event.shiftKey) {
        event.preventDefault()
        redo()
        return
      }
      if (key === 'z') {
        event.preventDefault()
        undo()
        return
      }
      if (key === 'y' && !event.shiftKey) {
        event.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [redo, undo])

  return {
    record,
    commitChange,
    snapshot,
    undo,
    redo,
    canUndo,
    canRedo,
  }
}
