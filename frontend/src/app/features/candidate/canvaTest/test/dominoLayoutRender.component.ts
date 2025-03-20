import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DominoLayout } from '../services/domino-layout.service';
import { InteractiveDominoComponent } from '../../DominoTest/components/interactive-domino/interactive-domino.component';
import { DominoPosition } from '../../DominoTest/models/domino.model';



@Component({
  selector: 'app-domino-layout-renderer',
  standalone: true,
  imports: [CommonModule, InteractiveDominoComponent],
  template: `
    <div
      class="layout-container"
      [style.width.px]="layout?.width || 1000"
      [style.height.px]="layout?.height || 700"
    >
      <!-- Show grid lines if enabled -->
      <div class="grid-lines" *ngIf="showGrid">
        <div
          *ngFor="let x of gridLines.vertical"
          class="grid-line vertical"
          [style.left.px]="x"
          [style.height.px]="layout?.height || 700"
        ></div>
        <div
          *ngFor="let y of gridLines.horizontal"
          class="grid-line horizontal"
          [style.top.px]="y"
          [style.width.px]="layout?.width || 1000"
        ></div>
      </div>

      <!-- Render each domino at its exact position -->
      <div
        *ngFor="let domino of layout?.dominos"
        class="domino-wrapper"
        [style.transform]="getDominoTransform(domino)"
        [class.editable]="domino.isEditable"
      >
        <app-interactive-domino
          [id]="domino.id"
          [initialTopValue]="domino.topValue"
          [initialBottomValue]="domino.bottomValue"
          [isEditable]="domino.isEditable"
          [scale]="domino.scale || 1.0"
          [isVertical]="domino.isVertical || false"
          
          (valueChanged)="onDominoValueChanged($event)"
         
        ></app-interactive-domino>
      </div>
    </div>
  `,
  styles: [
    `
      .layout-container {
        position: relative;
        background-color: #f7fafc;
        border-radius: 8px;
        margin: 0 auto;
        overflow: visible;
      }

      .domino-wrapper {
        position: absolute;
        transform-origin: center center;
      }

      .domino-wrapper.editable {
        filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.6));
        animation: pulse 2s infinite;
      }

      .grid-lines {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .grid-line {
        position: absolute;
        background-color: rgba(0, 0, 0, 0.05);
      }

      .grid-line.horizontal {
        width: 100%;
        height: 1px;
      }

      .grid-line.vertical {
        width: 1px;
        height: 100%;
      }

      @keyframes pulse {
        0%,
        100% {
          filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.4));
        }
        50% {
          filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.7));
        }
      }
    `,
  ],
})
export class DominoLayoutRendererComponent implements OnChanges {
  @Input() layout?: DominoLayout;
  @Input() showGrid: boolean = false;
  @Input() gridSize: number = 20;

  gridLines = {
    horizontal: [] as number[],
    vertical: [] as number[],
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['layout'] || changes['showGrid'] || changes['gridSize']) {
      this.generateGridLines();
    }
  }

  getDominoTransform(domino: DominoPosition): string {
    const x = domino.exactX || 0;
    const y = domino.exactY || 0;
    const angle = domino.angle || 0;

    return `translate(${x}px, ${y}px) rotate(${angle}deg)`;
  }

  getDominoWidth(domino: DominoPosition): number {
    const scale = domino.scale || 1.0;
    return 70 * scale; // 70 is the default width from your builder
  }

  getDominoHeight(domino: DominoPosition): number {
    const scale = domino.scale || 1.0;
    return 140 * scale; // 140 is the default height from your builder
  }

  generateGridLines(): void {
    if (!this.showGrid || !this.layout) return;

    this.gridLines.horizontal = [];
    this.gridLines.vertical = [];

    // Generate horizontal grid lines
    for (let y = 0; y <= this.layout.height; y += this.gridSize) {
      this.gridLines.horizontal.push(y);
    }

    // Generate vertical grid lines
    for (let x = 0; x <= this.layout.width; x += this.gridSize) {
      this.gridLines.vertical.push(x);
    }
  }

  onDominoValueChanged(event: any): void {
    // Forward the event with additional layout info if needed
    const domino = this.layout?.dominos.find((d) => d.id === event.id);
    if (domino) {
      domino.topValue = event.topValue;
      domino.bottomValue = event.bottomValue;
    }
  }
}
