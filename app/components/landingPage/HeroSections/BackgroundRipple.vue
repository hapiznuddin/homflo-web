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

const root = ref<HTMLElement | null>(null)
const hoveredCell = ref<Cell | null>(null)
const clickedCell = ref<Cell | null>(null)
const rippleKey = ref(0)
// Cell elements exist only after the first ripple; the static grid is CSS.
const active = ref(false)
const dims = ref({ cols: 1, rows: 1 })

const cells = computed<Cell[]>(() => {
  if (!active.value) return []
  return Array.from({ length: dims.value.rows * dims.value.cols }, (_, index) => ({
    row: Math.floor(index / dims.value.cols),
    col: index % dims.value.cols
  }))
})

const gridStyle = computed<CSSProperties>(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${dims.value.cols}, ${props.cellSize}px)`,
  gridTemplateRows: `repeat(${dims.value.rows}, ${props.cellSize}px)`,
  width: `${dims.value.cols * props.cellSize}px`,
  height: `${dims.value.rows * props.cellSize}px`
}))

const hoverStyle = computed<CSSProperties | undefined>(() => {
  const cell = hoveredCell.value
  if (!cell) return undefined
  return {
    transform: `translate3d(${cell.col * props.cellSize}px, ${cell.row * props.cellSize}px, 0)`,
    width: `${props.cellSize}px`,
    height: `${props.cellSize}px`,
    backgroundColor: 'var(--cell-hover-fill-color)',
    borderColor: 'var(--cell-hover-border-color)'
  }
})

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

function measure(): { rect: DOMRect; cols: number; rows: number } | null {
  const el = root.value
  if (!el) return null
  const rect = el.getBoundingClientRect()
  return {
    rect,
    cols: Math.max(1, Math.ceil(rect.width / props.cellSize)),
    rows: Math.max(1, Math.ceil(rect.height / props.cellSize))
  }
}

// The layer never receives pointer events itself, so hover and click are
// derived from the hero's own events. Returns the cell under the pointer, or
// null outside the hero/grid or over an interactive element.
function cellAt(event: PointerEvent, rect: DOMRect, cols: number, rows: number): Cell | null {
  const target = event.target as Element | null
  if (!root.value?.parentElement?.contains(target) || target?.closest(interactiveSelector)) {
    return null
  }

  const col = Math.floor((event.clientX - rect.left) / props.cellSize)
  const row = Math.floor((event.clientY - rect.top) / props.cellSize)
  if (row < 0 || col < 0 || row >= rows || col >= cols) return null

  return { row, col }
}

function onPointerDown(event: PointerEvent): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const measured = measure()
  if (!measured) return
  const cell = cellAt(event, measured.rect, measured.cols, measured.rows)
  if (!cell) return

  dims.value = { cols: measured.cols, rows: measured.rows }
  active.value = true
  clickedCell.value = cell
  rippleKey.value += 1
}

// Hover is tracked with one throttled pointermove listener instead of CSS
// :hover, because the ripple layer must stay pointer-events-none.
let hoverFrame = 0
let hoverEvent: PointerEvent | null = null

function updateHover(): void {
  hoverFrame = 0
  const measured = measure()
  const next =
    measured && hoverEvent ? cellAt(hoverEvent, measured.rect, measured.cols, measured.rows) : null
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

onMounted(() => {
  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('scroll', clearHover, { passive: true })
  document.documentElement.addEventListener('pointerleave', clearHover)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('scroll', clearHover)
  document.documentElement.removeEventListener('pointerleave', clearHover)
  if (hoverFrame) cancelAnimationFrame(hoverFrame)
})
</script>

<template>
  <div
    ref="root"
    class="landing-ripple landing-ripple-mask pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    aria-hidden="true"
  >
    <!-- Static grid: CSS only, so it paints before hydration. -->
    <div class="landing-ripple-grid absolute inset-0" />

    <div v-if="hoverStyle" class="absolute top-0 left-0 border-[0.5px]" :style="hoverStyle" />

    <div v-if="active" :key="rippleKey" class="absolute top-0 left-0" :style="gridStyle">
      <div
        v-for="cell in cells"
        :key="`${cell.row}-${cell.col}`"
        class="border-[0.5px] opacity-0 animate-cell-ripple"
        :style="cellStyle(cell)"
      />
    </div>
  </div>
</template>
