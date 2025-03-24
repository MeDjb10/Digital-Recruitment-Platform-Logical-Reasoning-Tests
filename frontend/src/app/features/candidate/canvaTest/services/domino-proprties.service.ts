import { Injectable } from '@angular/core';
import { DominoPosition } from '../../DominoTest/models/domino.model';


@Injectable({
  providedIn: 'root',
})
export class DominoPropertiesService {
  constructor() {}

  /**
   * Get transform value for domino positioning
   */
  getDominoTransform(domino: DominoPosition): string {
    const x = domino.exactX || 0;
    const y = domino.exactY || 0;
    const angle = domino.angle || 0;
    const scale = domino.scale || 1.0;

    return `translate(${x}px, ${y}px) rotate(${angle}deg) scale(${scale})`;
  }

  /**
   * Set angle for a domino
   */
  setAngle(domino: DominoPosition, angle: number): DominoPosition {
    if (!domino) return domino;
    const updatedDomino = { ...domino, angle };
    return updatedDomino;
  }

  /**
   * Set scale for a domino
   */
  setScale(domino: DominoPosition, scale: number): DominoPosition {
    if (!domino) return domino;
    const updatedDomino = { ...domino, scale };
    return updatedDomino;
  }

  /**
   * Set orientation for a domino
   */
  setOrientation(domino: DominoPosition, isVertical: boolean): DominoPosition {
    if (!domino) return domino;
    const updatedDomino = { ...domino, isVertical };
    return updatedDomino;
  }

  /**
   * Adjust position of a domino
   */
  adjustPosition(
    domino: DominoPosition,
    axis: 'x' | 'y',
    amount: number
  ): DominoPosition {
    if (!domino) return domino;

    const updatedDomino = { ...domino };
    if (axis === 'x') {
      updatedDomino.exactX = (updatedDomino.exactX ?? 0) + amount;
    } else {
      updatedDomino.exactY = (updatedDomino.exactY ?? 0) + amount;
    }
    return updatedDomino;
  }

  /**
   * Center a domino on the canvas
   */
  centerDomino(
    domino: DominoPosition,
    canvasWidth: number,
    canvasHeight: number
  ): DominoPosition {
    if (!domino) return domino;

    const updatedDomino = { ...domino };
    updatedDomino.exactX = canvasWidth / 2;
    updatedDomino.exactY = canvasHeight / 2;
    return updatedDomino;
  }

  /**
   * Set domino values (top and bottom)
   */
  setDominoValue(
    domino: DominoPosition,
    position: 'top' | 'bottom',
    value: number
  ): DominoPosition {
    if (!domino) return domino;

    const updatedDomino = { ...domino };
    if (position === 'top') {
      updatedDomino.topValue = value;
    } else {
      updatedDomino.bottomValue = value;
    }
    return updatedDomino;
  }

  /**
   * Set domino role (editable or fixed)
   * Returns object with updated domino and correctAnswer status
   */
  setDominoRole(
    domino: DominoPosition,
    isEditable: boolean,
    allDominos: DominoPosition[],
    currentCorrectAnswer: {
      dominoId: number;
      topValue: number | null;
      bottomValue: number | null;
    } | null
  ): {
    updatedDomino: DominoPosition;
    correctAnswer: {
      dominoId: number;
      topValue: number | null;
      bottomValue: number | null;
    } | null;
    existingEditableChanged: boolean;
  } {
    if (!domino) {
      return {
        updatedDomino: domino,
        correctAnswer: currentCorrectAnswer,
        existingEditableChanged: false,
      };
    }

    let result = {
      updatedDomino: { ...domino },
      correctAnswer: currentCorrectAnswer,
      existingEditableChanged: false,
    };

    // If making a domino editable
    if (isEditable && !domino.isEditable) {
      // Check if another domino is already editable
      const existingEditable = allDominos.find(
        (d) => d.isEditable && d.id !== domino.id
      );

      if (existingEditable) {
        // Existing editable domino needs to be changed
        result.existingEditableChanged = true;
      }

      // Make this one editable
      result.updatedDomino.isEditable = true;
      result.updatedDomino.topValue = null;
      result.updatedDomino.bottomValue = null;

      // Update correct answer to point to this domino
      result.correctAnswer = {
        dominoId: domino.id,
        topValue: 1,
        bottomValue: 2,
      };
    }
    // If making a domino non-editable
    else if (!isEditable && domino.isEditable) {
      result.updatedDomino.isEditable = false;
      result.updatedDomino.topValue = 1;
      result.updatedDomino.bottomValue = 2;

      // Clear correct answer if it was for this domino
      if (currentCorrectAnswer && currentCorrectAnswer.dominoId === domino.id) {
        result.correctAnswer = null;
      }
    }

    return result;
  }

  /**
   * Create a duplicate of a domino
   */
  duplicateDomino(domino: DominoPosition, newId: number): DominoPosition {
    if (!domino) return domino;

    // Create a deep copy with a new ID
    const duplicate: DominoPosition = {
      ...JSON.parse(JSON.stringify(domino)),
      id: newId,
      exactX: (domino.exactX || 0) + 40,
      exactY: (domino.exactY || 0) + 40,
      uniqueId: `domino-${Date.now()}`,
      isEditable: false, // Don't duplicate editable status
    };

    return duplicate;
  }

  /**
   * Update scale for a domino from event
   */
  updateDominoScale(domino: DominoPosition, event: any): DominoPosition {
    if (!domino) return domino;

    // Handle both direct event from HTML input and PrimeNG slider event
    const scaleValue = event.target
      ? parseFloat((event.target as HTMLInputElement).value)
      : event.value !== undefined
      ? event.value
      : domino.scale;

    return { ...domino, scale: scaleValue };
  }

  /**
   * Update grid cell position for a domino
   */
  updateGridPosition(
    domino: DominoPosition,
    newX: number,
    newY: number,
    canvasHeight: number,
    canvasWidth: number,
    gridRows: number,
    gridCols: number
  ): DominoPosition {
    const updatedDomino = { ...domino };
    updatedDomino.exactX = newX;
    updatedDomino.exactY = newY;

    // Update grid cell position
    updatedDomino.row = Math.floor(newY / (canvasHeight / gridRows));
    updatedDomino.col = Math.floor(newX / (canvasWidth / gridCols));

    return updatedDomino;
  }

  /**
   * Calculate position based on grid snap
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
}
