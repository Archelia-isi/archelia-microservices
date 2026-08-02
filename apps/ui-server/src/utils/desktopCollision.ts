export const CELL_WIDTH = 10;
export const CELL_HEIGHT = 10;

export interface Rect {
  id: string;
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
  type: 'icon' | 'widget';
}

export function checkOverlap(rect1: Omit<Rect, 'id'|'type'>, rect2: Omit<Rect, 'id'|'type'>): boolean {
  return (
    rect1.col < rect2.col + rect2.colSpan &&
    rect1.col + rect1.colSpan > rect2.col &&
    rect1.row < rect2.row + rect2.rowSpan &&
    rect1.row + rect1.rowSpan > rect2.row
  );
}

// Convert absolute pixels to nearest cell
export function pixelsToCell(x: number, y: number) {
  return {
    col: Math.max(0, Math.round(x / CELL_WIDTH)),
    row: Math.max(0, Math.round(y / CELL_HEIGHT))
  };
}

// Get maximum grid boundaries
export function getGridBounds(screenWidth: number, screenHeight: number) {
  // Assumendo taskbar a 52px
  return {
    maxCols: Math.floor(screenWidth / CELL_WIDTH),
    maxRows: Math.floor((screenHeight - 52) / CELL_HEIGHT)
  };
}

export function findNearestFreeCell(
  targetCol: number,
  targetRow: number,
  colSpan: number,
  rowSpan: number,
  existingItems: Rect[],
  maxCols: number,
  maxRows: number,
  ignoreId?: string
): { col: number; row: number } {
  const itemsToCheck = existingItems.filter(i => i.id !== ignoreId);
  
  let radius = 0;
  const maxRadius = Math.max(maxCols, maxRows);
  
  while (radius <= maxRadius) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        
        const col = targetCol + dx;
        const row = targetRow + dy;
        
        if (col >= 0 && col + colSpan <= maxCols && row >= 0 && row + rowSpan <= maxRows) {
          const candidate = { col, row, colSpan, rowSpan };
          const hasOverlap = itemsToCheck.some(item => checkOverlap(candidate, item));
          
          if (!hasOverlap) {
            return { col, row };
          }
        }
      }
    }
    radius++;
  }
  
  // Fallback se schermo completamente saturo
  return { col: targetCol, row: targetRow };
}

export function getWidgetDimensions(_type: string, size: string = 'small') {
  // Original sizes were:
  // small: 160x160 -> 16 cols x 16 rows
  // medium: 320x160 -> 32 cols x 16 rows
  // large: 320x320 -> 32 cols x 32 rows
  if (size === 'small') return { colSpan: 16, rowSpan: 16 };
  if (size === 'medium') return { colSpan: 32, rowSpan: 16 };
  if (size === 'large') return { colSpan: 32, rowSpan: 32 };
  return { colSpan: 16, rowSpan: 16 };
}

export function getIconDimensions() {
  // Original size was 80x100 roughly, we will use 8x10 cells
  return { colSpan: 8, rowSpan: 10 };
}
