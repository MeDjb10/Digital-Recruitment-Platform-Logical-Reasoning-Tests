import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ChangeDetectionStrategy,
  ViewChildren,
  QueryList,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InteractiveDominoComponent } from '../interactive-domino/interactive-domino.component';

export interface DominoPosition {
  id: number;
  row: number;
  col: number;
  topValue: number | null;
  bottomValue: number | null;
  isEditable: boolean;
  isVertical?: boolean; // New property for domino orientation
  color?: string; // Optional styling for specific dominos
}

export interface DominoChange {
  id: number;
  topValue: number | null;
  bottomValue: number | null;
  isVertical?: boolean; // Include orientation in changes
}

@Component({
  selector: 'app-interactive-domino-grid',
  standalone: true,
  imports: [CommonModule, InteractiveDominoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid-container" [style.width.px]="totalWidth">
      <!-- Debug info -->
      <div class="debug-info" *ngIf="showDebug">
        <div>Grid size: {{ width }}x{{ height }}</div>
        <div>Cell size: {{ cellWidth }}x{{ cellHeight }}</div>
        <div>Dominos: {{ dominos.length }}</div>
        <div>Pattern: {{ patternType }}</div>
        <div>
          <button (click)="resetEditableDominos()">
            Reset Editable Dominos
          </button>
        </div>
      </div>

      <!-- Grid -->
      <div
        class="grid"
        [style.width.px]="totalWidth"
        [style.height.px]="totalHeight"
        [style.padding.px]="gridPadding"
      >
        <!-- Grid lines for debugging -->
        <div *ngIf="showGridLines" class="grid-lines">
          <div
            *ngFor="let line of horizontalLines"
            class="grid-line horizontal"
            [style.top.px]="line"
          ></div>
          <div
            *ngFor="let line of verticalLines"
            class="grid-line vertical"
            [style.left.px]="line"
          ></div>
        </div>

        <!-- Dominos with enhanced animations and positioning -->
        <div
          class="dominos-container"
          [style.transform]="'scale(' + zoomLevel + ')'"
          [style.transform-origin]="'center'"
        >
          <ng-container
            *ngFor="let domino of dominos; trackBy: trackByDominoId"
          >
            <div
              class="domino-wrapper"
              [style.left.px]="calculateX(domino)"
              [style.top.px]="calculateY(domino)"
              [style.transform]="domino.isVertical ? 'rotate(90deg)' : ''"
              [class.editable-domino]="domino.isEditable"
            >
              <app-interactive-domino
                #dominoComponent
                [id]="domino.id"
                [width]="dominoWidth"
                [height]="dominoHeight"
                [initialTopValue]="domino.topValue"
                [initialBottomValue]="domino.bottomValue"
                [isEditable]="domino.isEditable"
                [isVertical]="domino.isVertical ?? false"
                [color]="domino.color || ''"
                (valueChanged)="onDominoChange($event)"
                (dominoSelected)="onDominoSelected($event)"
                (rotationChanged)="onDominoRotate($event)"
              >
              </app-interactive-domino>
            </div>
          </ng-container>
        </div>

        <!-- Optional pattern lines to connect dominos -->
        <svg
          *ngIf="showConnections"
          class="connections-layer"
          [attr.width]="totalWidth"
          [attr.height]="totalHeight"
        >
          <g class="connection-lines">
            <!-- Lines could be added here -->
          </g>
        </svg>
      </div>
    </div>
  `,
  styles: [
    `
      .grid-container {
        margin: 0 auto;
        position: relative;
        transition: all 0.3s ease;
        min-height: 400px; /* Increased minimum height for better visibility */
      }

      .grid {
        position: relative;
        border: 1px solid #ddd;
        background-color: #f8f9fa;
        box-sizing: content-box;
        margin: 0 auto;
        border-radius: 8px;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
        transition: all 0.3s ease;
        overflow: hidden;
        min-height: 320px; /* Ensure grid has minimum height */
      }

      .dominos-container {
        position: relative;
        width: 100%;
        height: 100%;
        transition: transform 0.3s ease;
      }

      .domino-wrapper {
        position: absolute;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        z-index: 2;
      }

      .editable-domino {
        animation: pulse-shadow 2s infinite;
        z-index: 3;
      }

      @keyframes pulse-shadow {
        0%,
        100% {
          filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.4));
        }
        50% {
          filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.7));
        }
      }

      .zoom-controls-container {
        position: absolute;
        bottom: 25px;
        right: 25px; /* Increased distance from edge */
        z-index: 20;
        padding: 5px;
        transition: all 0.3s ease;
        border-radius: 20px;
        opacity: 0.5;
        margin: 10px; /* Added margin for more spacing */
      }

      .zoom-controls-container.zoom-active,
      .zoom-controls-container:hover {
        opacity: 1;
        background-color: rgba(255, 255, 255, 0.9);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }

      .zoom-controls {
        display: flex;
        align-items: center;
        gap: 5px;
        background-color: white;
        border-radius: 20px;
        padding: 5px 10px;
      }

      .zoom-level-indicator {
        font-size: 12px;
        font-weight: 600;
        color: #64748b;
        min-width: 40px;
        text-align: center;
      }

      .zoom-btn {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 1px solid #e2e8f0;
        background-color: white;
        color: #64748b;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
      }

      .zoom-btn:hover {
        background-color: #f1f5f9;
        color: #334155;
        transform: scale(1.1);
      }

      .help-tooltip {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 30;
        max-width: 280px;
      }

      .tooltip-content {
        background-color: white;
        border-radius: 8px;
        padding: 10px 15px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        border: 1px solid #e2e8f0;
        position: relative;
      }

      .tooltip-content h4 {
        margin: 0 0 8px 0;
        color: #334155;
        font-size: 14px;
      }

      .tooltip-content ul {
        margin: 0;
        padding-left: 20px;
        font-size: 13px;
        color: #64748b;
      }

      .tooltip-content li {
        margin-bottom: 4px;
      }

      .close-tooltip {
        position: absolute;
        top: 5px;
        right: 5px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: none;
        background-color: #f1f5f9;
        color: #64748b;
        font-size: 16px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .grid-lines .grid-line {
        position: absolute;
        background-color: rgba(0, 0, 0, 0.05);
      }

      .grid-lines .horizontal {
        width: 100%;
        height: 1px;
      }

      .grid-lines .vertical {
        width: 1px;
        height: 100%;
      }

      .connections-layer {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 1;
      }

      .debug-info {
        margin-bottom: 10px;
        padding: 8px;
        background-color: #f0f0f0;
        border: 1px dashed #ccc;
        font-size: 12px;
        font-family: monospace;
        border-radius: 4px;
      }

      button {
        margin-top: 5px;
        padding: 3px 8px;
        font-size: 12px;
        cursor: pointer;
        border-radius: 4px;
        border: 1px solid #ddd;
      }
    `,
  ],
})
export class InteractiveDominoGridComponent implements OnInit, OnChanges {
  @Input() dominos: DominoPosition[] = [];
  @Input() gridSize: { rows: number; cols: number } = { rows: 2, cols: 2 };
  @Input() showGridLines: boolean = false;
  @Input() showDebug: boolean = true;
  @Input() maxValue: number = 6; // Maximum domino value
  @Input() showConnections: boolean = false; // Whether to show connecting lines
  @Input() zoomControlsEnabled: boolean = true; // Whether to show zoom controls

  @Output() dominoChanged = new EventEmitter<DominoChange>();
  @Output() dominoSelected = new EventEmitter<number>();
  @Output() dominoRotated = new EventEmitter<{
    id: number;
    isVertical: boolean;
  }>();
  @Output() gridReset = new EventEmitter<void>();
  @Output() zoomLevelChanged = new EventEmitter<number>();
  @Output() hasEditableDominosChanged = new EventEmitter<boolean>();

  // Access to domino components
  @ViewChildren('dominoComponent')
  dominoComponents!: QueryList<InteractiveDominoComponent>;

  // Dimensions
  width: number = 200;
  height: number = 300;
  cellWidth: number = 100; // Increased from 80 to add more space
  cellHeight: number = 160; // Increased from 140
  dominoWidth: number = 70; // Increased from 60
  dominoHeight: number = 140; // Increased from 120
  gridPadding: number = 40; // Increased from 20 to add more space around the grid

  // Calculated total dimensions
  get totalWidth(): number {
    return this.width + this.gridPadding * 4;
  }

  get totalHeight(): number {
    return this.height + this.gridPadding * 2;
  }

  // Grid lines for debug - pre-calculate to avoid template calculations
  horizontalLines: number[] = [];
  verticalLines: number[] = [];

  // Pattern type
  patternType: 'row' | 'grid' | 'rhombus' | 'custom' = 'grid';

  // Zoom functionality
  zoomLevel: number = 1;
  minZoom: number = 0.5;
  maxZoom: number = 1.5;
  zoomStep: number = 0.1;

  // Tooltip
  showTooltip: boolean = true;
  hasEditableDominos: boolean = false;

  // Add property to track zoom controls interaction state
  isZoomActive: boolean = false;

  ngOnInit(): void {
    try {
      // Detect pattern type based on domino layout
      this.detectPatternType();

      // Calculate dimensions based on pattern
      this.calculateDimensions();

      // Calculate optimal grid size
      this.calculateOptimalGridSize();

      // Calculate actual width and height based on min/max row and column
      const maxCol = Math.max(...this.dominos.map((d) => d.col)) + 1;
      const maxRow = Math.max(...this.dominos.map((d) => d.row)) + 1;

      // Update grid size if needed
      this.gridSize.cols = Math.max(maxCol, this.gridSize.cols);
      this.gridSize.rows = Math.max(maxRow, this.gridSize.rows);

      // Recalculate dimensions with the updated grid size
      this.calculateDimensions();

      // Check if we have editable dominos for tooltip
      this.hasEditableDominos = this.dominos.some((d) => d.isEditable);
      this.hasEditableDominosChanged.emit(this.hasEditableDominos);

      // Generate grid lines for debugging
      this.generateGridLines();

      // If no dominos provided, create a simple example
      if (this.dominos.length === 0) {
        this.createSampleDominos();
      }
    } catch (err) {
      console.error('Error initializing interactive domino grid:', err);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dominos'] || changes['gridSize']) {
      this.detectPatternType();
      this.calculateDimensions(); // Calculate dimensions based on pattern
      this.calculateOptimalGridSize();

      // Calculate actual width and height based on min/max row and column
      if (this.dominos.length > 0) {
        const maxCol = Math.max(...this.dominos.map((d) => d.col)) + 1;
        const maxRow = Math.max(...this.dominos.map((d) => d.row)) + 1;

        // Update grid size if needed
        this.gridSize.cols = Math.max(maxCol, this.gridSize.cols);
        this.gridSize.rows = Math.max(maxRow, this.gridSize.rows);

        // Set width and height based on grid size
        this.width = this.gridSize.cols * this.cellWidth;
        this.height = this.gridSize.rows * this.cellHeight;
      }

      // Check if we have editable dominos for tooltip
      this.hasEditableDominos = this.dominos.some((d) => d.isEditable);
      this.hasEditableDominosChanged.emit(this.hasEditableDominos);

      this.generateGridLines();
    }
  }

  // Detect what type of pattern we're dealing with
  detectPatternType(): void {
    if (!this.dominos || this.dominos.length === 0) return;

    // Check if all dominos have the same row (horizontal row)
    const allSameRow = this.dominos.every((d) => d.row === this.dominos[0].row);
    if (allSameRow) {
      this.patternType = 'row';
      return;
    }

    // Check if dominos form a rhombic pattern (diamond shape)
    const uniqueRows = [...new Set(this.dominos.map((d) => d.row))];
    const uniqueCols = [...new Set(this.dominos.map((d) => d.col))];

    if (
      uniqueRows.length === 3 &&
      uniqueCols.length === 3 &&
      this.dominos.length === 4 &&
      !this.dominos.find((d) => d.row === 1 && d.col === 1)
    ) {
      this.patternType = 'rhombus';
      return;
    }

    // Default to grid
    this.patternType = 'grid';
  }

  // Calculate optimal grid size based on domino placement
  calculateOptimalGridSize(): void {
    if (!this.dominos || this.dominos.length === 0) return;

    // Find max row and col
    const maxRow = Math.max(...this.dominos.map((d) => d.row)) + 1;
    const maxCol = Math.max(...this.dominos.map((d) => d.col)) + 1;

    // Update grid size if needed
    if (maxRow > this.gridSize.rows || maxCol > this.gridSize.cols) {
      this.gridSize = {
        rows: Math.max(maxRow, this.gridSize.rows),
        cols: Math.max(maxCol, this.gridSize.cols),
      };

      // Recalculate dimensions
      this.width = this.gridSize.cols * this.cellWidth;
      this.height = this.gridSize.rows * this.cellHeight;
      this.generateGridLines();
    }
  }

  // Track function to improve ngFor performance
  trackByDominoId(index: number, domino: DominoPosition): number {
    return domino.id;
  }

  generateGridLines() {
    this.horizontalLines = [];
    this.verticalLines = [];

    // Generate horizontal lines
    for (let i = 0; i <= this.gridSize.rows; i++) {
      this.horizontalLines.push(i * this.cellHeight);
    }

    // Generate vertical lines
    for (let i = 0; i <= this.gridSize.cols; i++) {
      this.verticalLines.push(i * this.cellWidth);
    }
  }

  // Calculate X position with adjustments for pattern type
  calculateX(domino: DominoPosition): number {
    // Add padding to all positions
    const basePadding = this.gridPadding;

    switch (this.patternType) {
      case 'rhombus':
        // For rhombic pattern, adjust the center domino positions
        if (domino.row === 1) {
          return (
            basePadding +
            domino.col * this.cellWidth +
            (domino.col === 0 ? -20 : 20) // Increased offset for better spacing
          );
        }
        return basePadding + domino.col * this.cellWidth;

      case 'row':
        // For row pattern, add more spacing
        return basePadding + domino.col * (this.cellWidth + 20); // Increased spacing between dominos

      default:
        // Add more horizontal spacing between dominos in grid
        return basePadding + domino.col * (this.cellWidth + 10); // Added 10px spacing between columns
    }
  }

  // Calculate Y position with adjustments for pattern type
  calculateY(domino: DominoPosition): number {
    // Add padding to all positions
    const basePadding = this.gridPadding;

    switch (this.patternType) {
      case 'rhombus':
        // For rhombic pattern, position the top and bottom dominos with more space
        if (domino.row === 0 || domino.row === 2) {
          return (
            basePadding +
            domino.row * this.cellHeight -
            (domino.row === 0 ? 40 : -40) // Increased the offset to push further out
          );
        }
        return basePadding + domino.row * this.cellHeight;

      default:
        // Add more vertical spacing between rows in grid patterns
        return basePadding + domino.row * (this.cellHeight + 10); // Added 10px spacing between rows
    }
  }

  resetEditableDominos(): void {
    let changes = false;

    // First reset the data model
    this.dominos.forEach((domino) => {
      if (domino.isEditable) {
        domino.topValue = null;
        domino.bottomValue = null;
        changes = true;
      }
    });

    // Then reset the components if available
    if (this.dominoComponents) {
      this.dominoComponents.forEach((component) => {
        if (component['isEditable']) {
          component.clearValues();
        }
      });
    }

    if (changes) {
      this.gridReset.emit();
    }
  }

  // Zoom functions
  zoomIn(): void {
    if (this.zoomLevel < this.maxZoom) {
      this.zoomLevel = Math.min(this.maxZoom, this.zoomLevel + this.zoomStep);
      this.isZoomActive = true; // Keep controls visible during zooming
      this.zoomLevelChanged.emit(this.zoomLevel);
    }
  }

  zoomOut(): void {
    if (this.zoomLevel > this.minZoom) {
      this.zoomLevel = Math.max(this.minZoom, this.zoomLevel - this.zoomStep);
      this.isZoomActive = true; // Keep controls visible during zooming
      this.zoomLevelChanged.emit(this.zoomLevel);
    }
  }

  zoomReset(): void {
    this.zoomLevel = 1;
    this.isZoomActive = false; // Allow controls to fade when reset
    this.zoomLevelChanged.emit(this.zoomLevel);
  }

  // Tooltip function
  dismissTooltip(): void {
    this.showTooltip = false;
  }

  createSampleDominos() {
    // Create a very simple sample with fewer dominos
    this.dominos = [
      { id: 1, row: 0, col: 0, topValue: 1, bottomValue: 2, isEditable: false },
      {
        id: 2,
        row: 0,
        col: 1,
        topValue: 2,
        bottomValue: 3,
        isEditable: false,
        isVertical: true,
      },
      {
        id: 3,
        row: 1,
        col: 0,
        topValue: null,
        bottomValue: null,
        isEditable: true,
      },
      {
        id: 4,
        row: 1,
        col: 1,
        topValue: 4,
        bottomValue: 5,
        isEditable: false,
        color: '#f0f0f0',
      },
    ];

    this.hasEditableDominos = true;
  }

  onDominoChange(change: DominoChange): void {
    // Find and update the domino in our local array
    const domino = this.dominos.find((d) => d.id === change.id);
    if (domino) {
      domino.topValue = change.topValue;
      domino.bottomValue = change.bottomValue;
      if (change.isVertical !== undefined) {
        domino.isVertical = change.isVertical;
      }
    }

    // Emit the change event
    this.dominoChanged.emit(change);
  }

  onDominoRotate(event: { id: number; isVertical: boolean }): void {
    // Find and update the domino orientation in our local array
    const domino = this.dominos.find((d) => d.id === event.id);
    if (domino) {
      domino.isVertical = event.isVertical;
    }

    this.dominoRotated.emit(event);
  }

  onDominoSelected(id: number): void {
    this.dominoSelected.emit(id);
  }

  // Methods to handle zoom controls visibility
  activateZoomControls(): void {
    this.isZoomActive = true;
  }

  deactivateZoomControls(): void {
    // Only deactivate if not currently zooming
    if (this.zoomLevel === 1) {
      this.isZoomActive = false;
    }
  }

  // Public method to set zoom level from parent
  setZoomLevel(level: number): void {
    this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, level));
    this.zoomLevelChanged.emit(this.zoomLevel);
  }

  // Recalculate dimensions based on pattern type
  calculateDimensions(): void {
    // Depending on pattern type, adjust cell dimensions
    switch (this.patternType) {
      case 'rhombus':
        // For rhombus pattern, we need extra height
        this.cellWidth = 100;
        this.cellHeight = 180;
        this.dominoWidth = 70;
        this.dominoHeight = 140;
        break;
      case 'row':
        // For row patterns, add more horizontal spacing
        this.cellWidth = 110;
        this.cellHeight = 160;
        this.dominoWidth = 70;
        this.dominoHeight = 140;
        break;
      default:
        // For standard grid patterns
        this.cellWidth = 100;
        this.cellHeight = 160;
        this.dominoWidth = 70;
        this.dominoHeight = 140;
    }

    // Update dimensions based on grid size
    this.width = this.gridSize.cols * this.cellWidth;
    this.height = this.gridSize.rows * this.cellHeight;

    // For rhombus patterns, add extra height/width to accommodate the pattern
    if (this.patternType === 'rhombus') {
      this.height += 80; // Add extra height for top/bottom dominos
      this.width += 40; // Add extra width if needed
    }
  }
}
