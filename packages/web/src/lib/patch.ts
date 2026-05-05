import type { PatchOperation } from '@/types'

/**
 * Generic JSON patch applicator — mutates the target object in place.
 *
 * Path: "a/b/0/c" segments are object keys or array indices.
 *
 * Ops:
 *   PUSH   — push value onto array at path
 *   APPEND — append value to string/number at path
 *   UPDATE — merge value into object at path
 *   DELETE — remove key from object, or splice from array at path
 */

function navigate(root: any, segments: string[]): any {
  let cur: any = root
  for (const seg of segments) {
    if (cur === null || cur === undefined) return undefined
    if (Array.isArray(cur)) {
      cur = cur[parseInt(seg)]
    } else if (typeof cur === 'object') {
      cur = cur[seg]
    } else {
      return undefined
    }
  }
  return cur
}

export function applyPatch(root: any, { p, o, v }: PatchOperation): void {
  const segments = p.split('/').filter(Boolean)
  if (segments.length === 0) return

  if (o === 'PUSH') {
    const arr = navigate(root, segments)
    if (Array.isArray(arr)) arr.push(v)
    return
  }

  const lastKey = segments.pop()!
  const parent = navigate(root, segments)
  if (!parent || typeof parent !== 'object') return

  switch (o) {
    case 'APPEND': {
      const cur = parent[lastKey]
      if (typeof cur === 'string') parent[lastKey] = cur + String(v)
      else if (typeof cur === 'number') parent[lastKey] = cur + Number(v)
      break
    }
    case 'UPDATE': {
      const target = parent[lastKey]
      if (target && typeof target === 'object' && !Array.isArray(target)) {
        Object.assign(target, v)
      } else {
        parent[lastKey] = v
      }
      break
    }
    case 'DELETE': {
      if (Array.isArray(parent)) {
        parent.splice(parseInt(lastKey), 1)
      } else {
        delete parent[lastKey]
      }
      break
    }
  }
}
