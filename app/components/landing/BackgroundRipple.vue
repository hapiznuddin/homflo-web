<script setup lang="ts">
import type { CSSProperties } from 'vue'

const props = withDefaults(
  defineProps<{
    rows?: number
    cols?: number
    cellSize?: number
  }>(),
  { rows: 8, cols: 27, cellSize: 56 }
)

type Cell = { row: number; col: number }
type CellStyle = CSSProperties & { '--delay'?: string; '--duration'?: string }

const clickedCell = ref<Cell | null>(null)
const hoveredCell = ref<Cell | null>(null)
const rippleKey = ref(0)
const root = ref<HTMLElement | null>(null)

const cells = computed<Cell[]>(() =>
  Array.from({ length: props.rows * props.cols }, (_, index) => ({
    row: Math.floor(index / props.cols),
    col: index % props.cols
  }))
)

const gridStyle = computed<CSSProperties>(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${props.cols}, ${props.cellSize}px)`,
  gridTemplateRows: `repeat(${props.rows}, ${props.cellSize}px)`,
  width: `${props.cols * props.cellSize}px`,
  height: `${props.rows * props.cellSize}px`
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
  if (!root.value) return null

  const hero = root.value.parentElement
  const target = event.target as Element | null
  if (!hero?.contains(target) || target?.closest(interactiveSelector)) return null

  const rect = root.value.getBoundingClientRect()
  const col = Math.floor((event.clientX - rect.left) / props.cellSize)
  const row = Math.floor((event.clientY - rect.top) / props.cellSize)
  if (row < 0 || col < 0 || row >= props.rows || col >= props.cols) return null

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
    class="landing-ripple pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    aria-hidden="true"
  >
    <div :key="rippleKey" class="landing-ripple-mask relative z-[3] mx-auto" :style="gridStyle">
      <div
        v-for="cell in cells"
        :key="`${cell.row}-${cell.col}`"
        class="relative border-[0.5px] transition-opacity duration-150"
        :class="[
          hoveredCell?.row === cell.row && hoveredCell?.col === cell.col
            ? 'opacity-80'
            : 'opacity-40',
          clickedCell && 'animate-cell-ripple'
        ]"
        :style="cellStyle(cell)"
      />
    </div>
  </div>
</template>
