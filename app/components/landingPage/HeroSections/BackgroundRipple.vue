<script setup lang="ts">
import type { CSSProperties } from 'vue'

const props = withDefaults(
  defineProps<{
    cellSize?: number
  }>(),
  { cellSize: 56 }
)

type Cell = { row: number; col: number }
type CellStyle = CSSProperties & { '--delay'?: string; '--duration'?: string }

const clickedCell = ref<Cell | null>(null)
const hoveredCell = ref<Cell | null>(null)
const rippleKey = ref(0)
const root = ref<HTMLElement | null>(null)
const grid = ref<HTMLElement | null>(null)
const size = ref({ width: 0, height: 0 })

const cols = computed(() => Math.max(1, Math.ceil(size.value.width / props.cellSize)))
const rows = computed(() => Math.max(1, Math.ceil(size.value.height / props.cellSize)))

const cells = computed<Cell[]>(() =>
  Array.from({ length: rows.value * cols.value }, (_, index) => ({
    row: Math.floor(index / cols.value),
    col: index % cols.value
  }))
)

const gridStyle = computed<CSSProperties>(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${cols.value}, ${props.cellSize}px)`,
  gridTemplateRows: `repeat(${rows.value}, ${props.cellSize}px)`,
  width: `${cols.value * props.cellSize}px`,
  height: `${rows.value * props.cellSize}px`
}))

// Aceternity's ripple: every cell animates opacity, staggered by its distance
// from the clicked cell. Kept as-is; only the tint comes from Homflo tokens.
function cellStyle(cell: Cell): CellStyle {
  const style: CellStyle = {
    backgroundColor: 'var(--cell-fill-color)',
    borderColor: 'var(--cell-border-color)'
  }
  if (!clickedCell.value) return style

  const distance = Math.hypot(clickedCell.value.row - cell.row, clickedCell.value.col - cell.col)
  style['--delay'] = `${Math.max(0, distance * 55)}ms`
  style['--duration'] = `${200 + distance * 80}ms`
  return style
}

const interactiveSelector = 'a, button, input, select, textarea, [role="button"]'

// The layer never receives pointer events itself, so hover and click are
// derived from the hero's own events. Returns the cell under the pointer, or
// null outside the hero/grid or over an interactive element.
function cellAt(event: PointerEvent): Cell | null {
  if (!root.value || !grid.value) return null

  const hero = root.value.parentElement
  const target = event.target as Element | null
  if (!hero?.contains(target) || target?.closest(interactiveSelector)) return null

  // Measure the grid, not the layer: the grid is wider than the viewport and
  // centered, so the layer's left edge is not the first cell's left edge.
  const rect = grid.value.getBoundingClientRect()
  const col = Math.floor((event.clientX - rect.left) / props.cellSize)
  const row = Math.floor((event.clientY - rect.top) / props.cellSize)
  if (row < 0 || col < 0 || row >= rows.value || col >= cols.value) return null

  return { row, col }
}

function onPointerDown(event: PointerEvent): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const cell = cellAt(event)
  if (!cell) return

  clickedCell.value = cell
  rippleKey.value += 1
}

// Hover is tracked with one throttled pointermove listener instead of CSS
// :hover, because the ripple layer must stay pointer-events-none.
let hoverFrame = 0
let hoverEvent: PointerEvent | null = null

function updateHover(): void {
  hoverFrame = 0
  const next = hoverEvent ? cellAt(hoverEvent) : null
  if (next?.row === hoveredCell.value?.row && next?.col === hoveredCell.value?.col) return
  hoveredCell.value = next
}

function onPointerMove(event: PointerEvent): void {
  if (event.pointerType === 'touch') {
    hoveredCell.value = null
    return
  }
  hoverEvent = event
  if (!hoverFrame) hoverFrame = requestAnimationFrame(updateHover)
}

function clearHover(): void {
  hoveredCell.value = null
}

// The grid must cover the whole hero at every viewport, so its row/column
// count is derived from the layer's measured size instead of a fixed 8 × 27.
let observer: ResizeObserver | null = null

function measure(element: HTMLElement | null): void {
  if (!element) return
  const rect = element.getBoundingClientRect()
  if (rect.width === size.value.width && rect.height === size.value.height) return
  size.value = { width: rect.width, height: rect.height }
  // Re-evaluate the cell under a stationary pointer after a resize.
  if (hoverEvent && !hoverFrame) hoverFrame = requestAnimationFrame(updateHover)
}

function onResize(): void {
  measure(root.value)
}

onMounted(() => {
  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('scroll', clearHover, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })
  document.documentElement.addEventListener('pointerleave', clearHover)

  measure(root.value)
  // The layer can still be unmeasured on the first mounted frame (fonts,
  // hydration), so measure again after paint and track later size changes.
  nextTick(() => measure(root.value))
  if (root.value) {
    observer = new ResizeObserver(() => measure(root.value))
    observer.observe(root.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('scroll', clearHover)
  window.removeEventListener('resize', onResize)
  document.documentElement.removeEventListener('pointerleave', clearHover)
  if (hoverFrame) cancelAnimationFrame(hoverFrame)
  observer?.disconnect()
})
</script>

<template>
  <div
    ref="root"
    class="landing-ripple pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    aria-hidden="true"
  >
    <div
      ref="grid"
      :key="rippleKey"
      class="landing-ripple-mask relative z-3 mx-auto"
      :style="gridStyle"
    >
      <div
        v-for="cell in cells"
        :key="`${cell.row}-${cell.col}`"
        v-memo="[hoveredCell?.row === cell.row && hoveredCell?.col === cell.col, clickedCell]"
        class="relative border-[0.5px] transition-opacity duration-150"
        :class="[
          hoveredCell?.row === cell.row && hoveredCell?.col === cell.col
            ? 'opacity-80'
            : 'opacity-70',
          clickedCell && 'animate-cell-ripple'
        ]"
        :style="cellStyle(cell)"
      />
    </div>
  </div>
</template>
