export const CELL_WIDTH = 1;
export const CELL_HEIGHT = 1;

export interface Rect {
  id: string;
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
  type: 'icon' | 'widget';
}

export function checkOverlap(rect1: Omit<Rect, 'id'|'type'>, rect2: Omit<Rect, 'id'|'type'>, margin: number = 0): boolean {
  // Aggiungiamo il margine al rect1 in tutte le direzioni
  return (
    rect1.col - margin < rect2.col + rect2.colSpan &&
    rect1.col + rect1.colSpan + margin > rect2.col &&
    rect1.row - margin < rect2.row + rect2.rowSpan &&
    rect1.row + rect1.rowSpan + margin > rect2.row
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
  margin: number = 0,
  ignoreId?: string
): { col: number; row: number } {
  const itemsToCheck = existingItems.filter(i => i.id !== ignoreId);
  
  const step = 20; // Saltiamo di 20 pixel per non bloccare la CPU con la 1x1 grid
  let radius = 0;
  const maxRadius = Math.max(maxCols, maxRows);
  
  while (radius <= maxRadius) {
    for (let dy = -radius; dy <= radius; dy += step) {
      for (let dx = -radius; dx <= radius; dx += step) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        
        const col = targetCol + dx;
        const row = targetRow + dy;
        
        if (col >= 0 && col + colSpan <= maxCols && row >= 0 && row + rowSpan <= maxRows) {
          const candidate = { col, row, colSpan, rowSpan };
          const hasOverlap = itemsToCheck.some(item => checkOverlap(candidate, item, margin));
          
          if (!hasOverlap) {
            return { col, row };
          }
        }
      }
    }
    radius += step;
  }
  
  // Fallback se schermo completamente saturo
  return { col: targetCol, row: targetRow };
}

export function getWidgetDimensions(_type: string, size: string = 'small') {
  if (size === 'small') return { colSpan: 160, rowSpan: 160 };
  if (size === 'medium') return { colSpan: 320, rowSpan: 160 };
  if (size === 'large') return { colSpan: 320, rowSpan: 320 };
  return { colSpan: 160, rowSpan: 160 };
}

export function getIconDimensions() {
  return { colSpan: 80, rowSpan: 100 };
}

// Algoritmo di Snapping Magnetico
export function getMagneticSnap(
  targetCol: number,
  targetRow: number,
  colSpan: number,
  rowSpan: number,
  existingItems: Rect[],
  snapRadius: number,
  margin: number,
  ignoreId?: string
): { col: number; row: number } {
  let snappedCol = targetCol;
  let snappedRow = targetRow;
  
  const itemsToCheck = existingItems.filter(i => i.id !== ignoreId);

  // Cerchiamo l'elemento più vicino per allineamento
  for (const item of itemsToCheck) {
    // Snap a sinistra o destra dell'oggetto (più il margine)
    if (Math.abs(targetCol - (item.col - colSpan - margin)) <= snapRadius) {
      snappedCol = item.col - colSpan - margin;
    } else if (Math.abs(targetCol - (item.col + item.colSpan + margin)) <= snapRadius) {
      snappedCol = item.col + item.colSpan + margin;
    }
    
    // Snap in alto o in basso dell'oggetto (più il margine)
    if (Math.abs(targetRow - (item.row - rowSpan - margin)) <= snapRadius) {
      snappedRow = item.row - rowSpan - margin;
    } else if (Math.abs(targetRow - (item.row + item.rowSpan + margin)) <= snapRadius) {
      snappedRow = item.row + item.rowSpan + margin;
    }
    
    // Possiamo allineare il bordo superiore/inferiore pari-pari o sinistro/destro pari-pari
    if (Math.abs(targetCol - item.col) <= snapRadius) snappedCol = item.col;
    if (Math.abs(targetRow - item.row) <= snapRadius) snappedRow = item.row;
  }
  
  return { col: snappedCol, row: snappedRow };
}
