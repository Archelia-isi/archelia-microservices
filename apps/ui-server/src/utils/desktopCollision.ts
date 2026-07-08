export interface Rect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'icon' | 'widget';
}

export function checkOverlap(rect1: Omit<Rect, 'id'|'type'>, rect2: Omit<Rect, 'id'|'type'>): boolean {
  const margin = 0; // Rimossa tolleranza per consentire allineamenti più stretti
  return (
    rect1.x < rect2.x + rect2.width + margin &&
    rect1.x + rect1.width > rect2.x - margin &&
    rect1.y < rect2.y + rect2.height + margin &&
    rect1.y + rect1.height > rect2.y - margin
  );
}

export function findNearestFreeSpot(
  target: Omit<Rect, 'id' | 'type'>,
  existingItems: Rect[],
  screenWidth: number,
  screenHeight: number,
  ignoreId?: string
): { x: number; y: number } {
  const itemsToCheck = existingItems.filter(i => i.id !== ignoreId);
  
  // 1. Se la posizione esatta corrente non ha collisioni ed è nei bound, restituiscila
  const isInside = target.x >= 20 && target.x + target.width <= screenWidth - 20 && 
                   target.y >= 20 && target.y + target.height <= screenHeight - 60;
                   
  if (isInside) {
    const hasOverlap = itemsToCheck.some(item => checkOverlap(target, item));
    if (!hasOverlap) return { x: target.x, y: target.y };
  }

  // 2. Ricerca a spirale del punto libero più vicino
  const step = 30;
  const maxRadius = Math.max(screenWidth, screenHeight);
  let radius = step;
  
  while (radius < maxRadius) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const x = Math.round(target.x + Math.cos(angle) * radius);
      const y = Math.round(target.y + Math.sin(angle) * radius);
      
      // Controllo confini schermo
      if (x >= 20 && x + target.width <= screenWidth - 20 && y >= 20 && y + target.height <= screenHeight - 60) {
        const candidate = { ...target, x, y };
        const overlap = itemsToCheck.some(item => checkOverlap(candidate, item));
        if (!overlap) {
          return { x, y };
        }
      }
    }
    radius += step;
  }
  
  // Fallback se lo schermo è completamente saturo
  return { x: target.x, y: target.y };
}

// Helper per ottenere l'ingombro stimato
export function getWidgetDimensions(type: string) {
  switch (type) {
    case 'clock': return { width: 300, height: 160 };
    case 'weather': return { width: 220, height: 160 };
    case 'kpi': return { width: 220, height: 140 };
    default: return { width: 250, height: 150 };
  }
}

export function getIconDimensions() {
  return { width: 80, height: 100 };
}
