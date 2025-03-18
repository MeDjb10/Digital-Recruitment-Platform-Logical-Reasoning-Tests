import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  AfterViewInit,
  ChangeDetectionStrategy,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';


import { InteractiveDominoComponent } from '../interactive-domino/interactive-domino.component';
import { DominoChange, DominoPosition } from '../../models/domino.model';

@Component({
  selector: 'app-simple-domino-grid',
  standalone: true,
  imports: [CommonModule, InteractiveDominoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="domino-grid-container"
      [class.animate]="animate"
      #dominoContainer
    >
      <!-- Grid information and zoom controls -->
      <div class="grid-controls">
        <div class="grid-info" *ngIf="showGridInfo">
          <span>{{ gridLayout.rows }}×{{ gridLayout.cols }} Grid</span>
        </div>
        <div class="zoom-controls">
          <button class="zoom-btn" (click)="zoomOut()">−</button>
          <span class="zoom-level">{{ (zoomLevel * 100).toFixed(0) }}%</span>
          <button class="zoom-btn" (click)="zoomIn()">+</button>
          <button class="zoom-reset" (click)="zoomReset()">Reset</button>
        </div>
      </div>

      <div class="grid-viewport">
        <!-- Custom layout with absolute positioning -->
        <div
          *ngIf="isCustomLayout"
          class="custom-layout"
          [style.transform]="'scale(' + zoomLevel + ')'"
          [style.width.px]="customLayoutWidth"
          [style.height.px]="customLayoutHeight"
        >
          <div
            *ngFor="let domino of dominos; trackBy: trackByDominoId"
            class="domino-wrapper"
            [class.editable]="domino.isEditable"
            [style.transform]="getDominoTransform(domino)"
          >
            <app-interactive-domino
              [id]="domino.id"
              [width]="getDominoWidth()"
              [height]="getDominoHeight()"
              [initialTopValue]="domino.topValue"
              [initialBottomValue]="domino.bottomValue"
              [isVertical]="domino.isVertical ?? false"
              [isEditable]="domino.isEditable"
              (valueChanged)="onDominoChanged($event)"
              (dominoClicked)="onDominoClicked($event)"
              (dominoRotated)="onDominoRotated($event)"
            >
            </app-interactive-domino>
          </div>
        </div>

        <!-- Standard grid layout -->
        <div
          *ngIf="!isCustomLayout"
          class="grid-layout"
          [style.transform]="'scale(' + zoomLevel + ')'"
          [style.grid-template-columns]="getGridTemplateColumns()"
          [style.grid-template-rows]="getGridTemplateRows()"
          [style.gap.px]="getGridGap()"
        >
          <ng-container
            *ngFor="let domino of dominos; trackBy: trackByDominoId"
          >
            <div
              class="grid-cell"
              [style.grid-row]="(domino.row || 0) + 1"
              [style.grid-column]="(domino.col || 0) + 1"
              [class.editable]="domino.isEditable"
            >
              <app-interactive-domino
                [id]="domino.id"
                [width]="getDominoWidth()"
                [height]="getDominoHeight()"
                [initialTopValue]="domino.topValue"
                [initialBottomValue]="domino.bottomValue"
                [isVertical]="domino.isVertical ?? false"
                [isEditable]="domino.isEditable"
                (valueChanged)="onDominoChanged($event)"
                (dominoClicked)="onDominoClicked($event)"
                (dominoRotated)="onDominoRotated($event)"
              >
              </app-interactive-domino>
            </div>
          </ng-container>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .domino-grid-container {
        position: relative;
        width: 100%; /* Take full width of parent */
        margin: 0 auto;
        padding: 1rem;
        background-color: #fff;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow: hidden;
      }
      .grid-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding-bottom: 10px;
        border-bottom: 1px solid #f1f5f9;
        margin-bottom: 15px;
      }

      .grid-info {
        font-size: 0.875rem;
        color: #64748b;
        font-weight: 500;
      }

      .zoom-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        background-color: #f8fafc;
        padding: 4px 8px;
        border-radius: 20px;
      }

      .zoom-btn {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: none;
        background-color: white;
        color: #64748b;
        font-weight: bold;
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }

      .zoom-btn:hover {
        background-color: #f1f5f9;
        color: #334155;
      }

      .zoom-level {
        font-size: 0.75rem;
        font-weight: 600;
        color: #64748b;
        min-width: 40px;
        text-align: center;
      }

      .zoom-reset {
        background-color: white;
        border: none;
        font-size: 0.75rem;
        color: #64748b;
        padding: 3px 6px;
        border-radius: 4px;
        cursor: pointer;
      }

      .zoom-reset:hover {
        background-color: #f1f5f9;
        color: #334155;
      }

      .grid-viewport {
        width: 100%;
        height: 100%;
        min-height: 300px;
        overflow: auto;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px 0;
      }

      .grid-layout {
        display: grid;
        justify-content: center;
        align-items: center;
        transform-origin: center;
        margin: 0 auto;
      }

      .custom-layout {
        position: relative;
        transform-origin: center;
        margin: 0 auto;
      }

      .grid-cell {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 5px;
      }

      .domino-wrapper {
        position: absolute;
        transform-origin: center;
      }

      .animate {
        animation: fadeIn 0.5s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `,
  ],
})
export class SimpleDominoGridComponent implements OnChanges, AfterViewInit {
  @Input() dominos: DominoPosition[] = [];
  @Input() gridLayout: {
    rows: number;
    cols: number;
    width?: number;
    height?: number;
  } = { rows: 3, cols: 3 };
  @Input() animate: boolean = false;
  @Input() showGridInfo: boolean = true;

  @Output() dominoChanged = new EventEmitter<DominoChange>();
  @Output() dominoSelected = new EventEmitter<number>();
  @Output() dominoRotated = new EventEmitter<{
    id: number;
    isVertical: boolean;
  }>();
  @Output() hasEditableDominosChanged = new EventEmitter<boolean>();

  @ViewChild('dominoContainer') dominoContainer!: ElementRef;

  isCustomLayout: boolean = false;
  hasEditableDominos: boolean = false;
  zoomLevel: number = 1;
  customLayoutWidth: number = 500;
  customLayoutHeight: number = 400;

  // Add these new properties to the class

  // Resize handler
  @HostListener('window:resize')
  onResize() {
    this.adjustSizesForViewport();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dominos']) {
      // Check if we're using custom layout
      this.isCustomLayout = this.dominos.some(
        (d) => d.hasOwnProperty('exactX') && d.hasOwnProperty('exactY')
      );

      // Check if we have editable dominos
      const hasEditables = this.dominos.some((d) => d.isEditable);
      this.hasEditableDominos = hasEditables;
      this.hasEditableDominosChanged.emit(hasEditables);

      // For custom layout, set dimensions based on positions
      if (this.isCustomLayout) {
        this.setCustomLayoutDimensions();
      }

      // Set initial zoom based on grid complexity
      this.setInitialZoom();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.adjustSizesForViewport();
    }, 0);
  }

  // Set dimensions for custom layout based on domino positions
  setCustomLayoutDimensions(): void {
    if (!this.isCustomLayout || !this.dominos.length) return;

    // Find the boundaries of the custom layout
    let maxX = 0;
    let maxY = 0;

    this.dominos.forEach((domino) => {
      if (domino.exactX !== undefined && domino.exactY !== undefined) {
        // Account for domino width/height and position
        const dominoWidth = this.getDominoWidth();
        const dominoHeight = this.getDominoHeight();
        const vertical = domino.isVertical ?? false;

        const endX = domino.exactX + (vertical ? dominoWidth : dominoHeight);
        const endY = domino.exactY + (vertical ? dominoHeight : dominoWidth);

        maxX = Math.max(maxX, endX);
        maxY = Math.max(maxY, endY);
      }
    });

    // Add padding
    this.customLayoutWidth = maxX + 40;
    this.customLayoutHeight = maxY + 40;
  }

  // Adjust sizes based on viewport
  adjustSizesForViewport(): void {
    if (!this.dominoContainer) return;

    const containerWidth = this.dominoContainer.nativeElement.clientWidth;
    const viewportHeight = window.innerHeight;

    // Adjust zoom if content is too large
    if (this.isCustomLayout) {
      const containerToContentWidthRatio =
        containerWidth / this.customLayoutWidth;
      if (containerToContentWidthRatio < 0.9) {
        this.zoomLevel = Math.min(1, containerToContentWidthRatio * 0.9);
      }
    }
  }

  // Set initial zoom level based on grid complexity
  setInitialZoom(): void {
    if (this.gridLayout) {
      if (this.gridLayout.rows === 1 && this.gridLayout.cols <= 6) {
        // Zoom in for single row with up to 6 columns (120% zoom)
        this.zoomLevel = 1.2;
      } else if (this.gridLayout.rows > 2) {
        // Zoom out for grids with more than 2 rows
        // Scale down progressively as rows increase
        const baseScale = 0.9;
        const rowScaleFactor = 0.05; // Reduce by 5% for each additional row beyond 3
        const rowsOver2 = Math.max(0, this.gridLayout.rows - 2);
        this.zoomLevel = Math.max(0.5, baseScale - rowScaleFactor * rowsOver2);
      } else if (this.gridLayout.cols > 5) {
        // Still adjust for very wide grids with 1-2 rows
        this.zoomLevel = 0.9;
      } else {
        // Default zoom level
        this.zoomLevel = 1;
      }
    }
  }

  // Calculate domino size based on grid complexity
  getDominoWidth(): number {
    const baseSize = 70;

    if (this.isCustomLayout) {
      return baseSize;
    }

    // Smaller dominos for larger grids
    if (this.gridLayout?.cols && this.gridLayout?.cols > 4) {
      return Math.max(50, baseSize - 5 * Math.min(4, this.gridLayout.cols - 4));
    }

    return baseSize;
  }

  getDominoHeight(): number {
    return this.getDominoWidth() * 1.7;
  }

  // Calculate transform for custom positioned dominos
  getDominoTransform(domino: DominoPosition): string {
    try {
      const x = domino.exactX ?? 0;
      const y = domino.exactY ?? 0;
      const angle = domino.angle ?? 0;
      const scale = domino.scale ?? 1;

      return `translate(${x}px, ${y}px) rotate(${angle}deg) scale(${scale})`;
    } catch (err) {
      console.error('Error generating domino transform:', err);
      return 'translate(0, 0)';
    }
  }

  // Grid template helpers
  getGridTemplateColumns(): string {
    if (!this.gridLayout?.cols) return 'repeat(3, auto)';
    return `repeat(${this.gridLayout.cols}, auto)`;
  }

  getGridTemplateRows(): string {
    if (!this.gridLayout?.rows) return 'repeat(3, auto)';
    return `repeat(${this.gridLayout.rows}, auto)`;
  }

  getGridGap(): number {
    // Smaller gaps for larger grids
    if (this.gridLayout?.cols && this.gridLayout?.cols > 5) {
      return 5;
    }
    return 10;
  }

  // Zoom controls
  zoomIn(): void {
    if (this.zoomLevel < 2.0) {
      this.zoomLevel = Math.min(2.0, this.zoomLevel + 0.1);
    }
  }

  zoomOut(): void {
    if (this.zoomLevel > 0.3) {
      // Smaller increments for more precise control
      const decrementAmount = this.zoomLevel > 1 ? 0.1 : 0.05;
      this.zoomLevel = Math.max(0.3, this.zoomLevel - decrementAmount);
    }
  }

  zoomReset(): void {
    this.setInitialZoom();
  }

  // Event handlers
  onDominoChanged(change: DominoChange): void {
    this.dominoChanged.emit(change);
  }

  onDominoClicked(id: any): void {
    if (id !== undefined) {
      this.dominoSelected.emit(Number(id));
    }
  }

  onDominoRotated(event: any): void {
    if (
      event &&
      typeof event.id === 'number' &&
      typeof event.isVertical === 'boolean'
    ) {
      this.dominoRotated.emit(event);
    } else {
      console.error('Invalid domino rotation event format:', event);
    }
  }

  // Track dominos by ID for better rendering performance
  trackByDominoId(index: number, domino: DominoPosition): string {
    return domino.uniqueId || `${domino.questionId || ''}_${domino.id}`;
  }
}
