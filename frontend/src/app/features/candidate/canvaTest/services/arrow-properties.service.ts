import { Injectable } from '@angular/core';
import { ArrowPosition } from '../../../../core/models/domino.model';


@Injectable({
  providedIn: 'root',
})
export class ArrowPropertiesService {
  constructor() {}

  /**
   * Get transform value for arrow positioning
   */
  getArrowTransform(arrow: ArrowPosition): string {
    const x = arrow.exactX || 0;
    const y = arrow.exactY || 0;
    const angle = arrow.angle || 0;
    const scale = arrow.scale || 1.0;

    return `translate(${x}px, ${y}px) rotate(${angle}deg) scale(${scale})`;
  }

  /**
   * Set angle for an arrow
   */
  setArrowAngle(arrow: ArrowPosition, angle: number): ArrowPosition {
    if (!arrow) return arrow;
    return { ...arrow, angle };
  }

  /**
   * Set scale for an arrow
   */
  setArrowScale(arrow: ArrowPosition, scale: number): ArrowPosition {
    if (!arrow) return arrow;
    return { ...arrow, scale };
  }

  /**
   * Set color for an arrow
   */
  setArrowColor(arrow: ArrowPosition, color: string): ArrowPosition {
    if (!arrow) return arrow;
    return { ...arrow, arrowColor: color };
  }

  /**
   * Set curved property for an arrow
   */
  setCurvedArrow(arrow: ArrowPosition, curved: boolean): ArrowPosition {
    if (!arrow) return arrow;
    return { ...arrow, curved };
  }

  /**
   * Set length for an arrow
   */
  setArrowLength(arrow: ArrowPosition, length: number): ArrowPosition {
    if (!arrow) return arrow;
    return { ...arrow, length };
  }

  /**
   * Set curvature for an arrow
   */
  setArrowCurvature(arrow: ArrowPosition, curvature: number): ArrowPosition {
    if (!arrow) return arrow;
    return { ...arrow, curvature };
  }

  /**
   * Set head size for an arrow
   */
  setArrowHeadSize(arrow: ArrowPosition, headSize: number): ArrowPosition {
    if (!arrow) return arrow;
    return { ...arrow, headSize };
  }

  /**
   * Adjust position of an arrow
   */
  adjustPosition(
    arrow: ArrowPosition,
    axis: 'x' | 'y',
    amount: number
  ): ArrowPosition {
    if (!arrow) return arrow;

    const updatedArrow = { ...arrow };
    if (axis === 'x') {
      updatedArrow.exactX = (updatedArrow.exactX ?? 0) + amount;
    } else {
      updatedArrow.exactY = (updatedArrow.exactY ?? 0) + amount;
    }
    return updatedArrow;
  }

  /**
   * Center an arrow on the canvas
   */
  centerArrow(
    arrow: ArrowPosition,
    canvasWidth: number,
    canvasHeight: number
  ): ArrowPosition {
    if (!arrow) return arrow;

    const updatedArrow = { ...arrow };
    updatedArrow.exactX = canvasWidth / 2;
    updatedArrow.exactY = canvasHeight / 2;
    return updatedArrow;
  }

  /**
   * Create a duplicate of an arrow
   */
  duplicateArrow(arrow: ArrowPosition, newId: number): ArrowPosition {
    if (!arrow) return arrow;

    // Create a deep copy with a new ID
    const duplicate: ArrowPosition = {
      ...JSON.parse(JSON.stringify(arrow)),
      id: newId,
      exactX: (arrow.exactX || 0) + 40,
      exactY: (arrow.exactY || 0) + 40,
      uniqueId: `arrow-${Date.now()}`,
    };

    return duplicate;
  }

  /**
   * Calculate snapped position for an arrow
   */
  calculateSnappedPosition(
    x: number,
    y: number,
    gridSize: number,
    snapToGrid: boolean
  ): { posX: number; posY: number } {
    // Apply grid snapping if enabled
    const posX = snapToGrid ? Math.round(x / gridSize) * gridSize : x;
    const posY = snapToGrid ? Math.round(y / gridSize) * gridSize : y;

    return { posX, posY };
  }

  /**
   * Validates and formats hex color input
   */
  validateHexColor(arrow: ArrowPosition): ArrowPosition {
    if (!arrow) return arrow;

    let color = arrow.arrowColor;

    // Add # if missing
    if (color && !color.startsWith('#')) {
      color = '#' + color;
    }

    // Validate hex color format
    const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(color);

    if (!isValidHex) {
      // Reset to default color if invalid
      color = '#4f46e5';
    }

    return { ...arrow, arrowColor: color };
  }

  /**
   * Converts hex color to RGB format
   */
  hexToRgb(hex: string): string {
    if (!hex) return '0, 0, 0';

    // Remove # if present
    hex = hex.replace('#', '');

    // Convert 3-digit hex to 6-digit
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    // Parse the hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `${r}, ${g}, ${b}`;
  }

  /**
   * Updates color from RGB input
   */
  updateFromRgb(arrow: ArrowPosition, rgbValue: string): ArrowPosition | null {
    if (!arrow) return arrow;

    try {
      const rgbParts = rgbValue
        .split(',')
        .map((part: string) => parseInt(part.trim(), 10));

      if (rgbParts.length !== 3 || rgbParts.some(isNaN)) {
        return null;
      }

      const [r, g, b] = rgbParts;

      // Validate RGB values (0-255)
      if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
        return null;
      }

      // Convert to hex
      const toHex = (value: number) => {
        const hex = value.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };

      const newColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      return { ...arrow, arrowColor: newColor };
    } catch (error) {
      console.error('Failed to parse RGB value', error);
      return null;
    }
  }
}
