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
  questionId?: number;
  uniqueId?: string;
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
  templateUrl: './interactive-domino-grid.component.html',
  styleUrls: ['./interactive-domino-grid.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  patternType: 'row' | 'grid' | 'rhombus' | 'custom' | 'rhombus-large' = 'grid';

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

  // Add debug flag to help track issues
  private debug = false;

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
    if (changes['dominos']) {
      if (this.debug) {
        console.log(
          'Dominos input changed:',
          JSON.stringify(changes['dominos'].currentValue)
        );
      }

      // Create deep copies of dominos to prevent state sharing
      if (changes['dominos'].currentValue) {
        const newDominos = JSON.parse(
          JSON.stringify(changes['dominos'].currentValue)
        );
        this.dominos = newDominos;
      }
    }

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
      }

      // Check if we have editable dominos for tooltip
      this.hasEditableDominos = this.dominos.some((d) => d.isEditable);
      this.hasEditableDominosChanged.emit(this.hasEditableDominos);

      this.generateGridLines();

      // Always update components with current values
      setTimeout(() => {
        if (this.dominoComponents) {
          this.dominoComponents.forEach((component) => {
            const domino = this.dominos.find((d) => d.id === component.id);
            if (domino) {
              component.forceUpdate(domino.topValue, domino.bottomValue);
            }
          });
        }
      }, 10);
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

    // Get all unique rows and columns
    const uniqueRows = [...new Set(this.dominos.map((d) => d.row))];
    const uniqueCols = [...new Set(this.dominos.map((d) => d.col))];

    // Check if dominos form a classic rhombic pattern (diamond shape)
    if (
      uniqueRows.length === 3 &&
      uniqueCols.length === 3 &&
      this.dominos.length === 4 &&
      !this.dominos.find((d) => d.row === 1 && d.col === 1)
    ) {
      this.patternType = 'rhombus';
      return;
    }

    // Check for larger rhombic pattern with 8 dominos
    if (
      uniqueRows.length === 4 &&
      uniqueCols.length === 4 &&
      this.dominos.length === 8 &&
      !this.dominos.find((d) => d.row === 1 && d.col === 1) &&
      !this.dominos.find((d) => d.row === 2 && d.col === 2)
    ) {
      this.patternType = 'rhombus-large';
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
  trackByDominoId(index: number, domino: DominoPosition): string {
    return domino.uniqueId || `${domino.questionId || ''}_${domino.id}`;
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
        // For rhombus, center the middle column and offset based on row
        if (domino.col === 0) {
          // Left item - increase spacing from center
          return basePadding + this.width / 2 - this.cellWidth - 30;
        } else if (domino.col === 2) {
          // Right item - increase spacing from center
          return basePadding + this.width / 2 + 30;
        } else {
          // Center column
          return basePadding + this.width / 2 - this.cellWidth / 2;
        }

      case 'rhombus-large':
        // For larger rhombus pattern with 8 dominos
        const centerX = this.width / 2;
        const spacing = this.cellWidth * 1.3; // Wider spacing between dominos

        if (domino.col === 0) {
          // Leftmost
          return basePadding + centerX - spacing * 1.5;
        } else if (domino.col === 1) {
          // Left middle
          return basePadding + centerX - spacing * 0.75;
        } else if (domino.col === 2) {
          // Right middle
          return basePadding + centerX + spacing * 0.1;
        } else if (domino.col === 3) {
          // Rightmost
          return basePadding + centerX + spacing * 0.85;
        }
        return basePadding + domino.col * this.cellWidth; // Fallback

      case 'row':
        // For row pattern, spread out horizontally with more space
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
        // For rhombus, top and bottom rows are centered horizontally
        if (domino.row === 0) {
          // Top item - increase vertical spacing
          return basePadding;
        } else if (domino.row === 2) {
          // Bottom item - increase vertical spacing
          return basePadding + this.cellHeight * 2 + 20;
        } else {
          // Middle row items - position in middle with better spacing
          return basePadding + this.cellHeight + 10;
        }

      case 'rhombus-large':
        // For larger rhombus pattern with 8 dominos
        const spacing = this.cellHeight * 0.9;

        if (domino.row === 0) {
          // Top item
          return basePadding;
        } else if (domino.row === 1) {
          // Upper middle
          return basePadding + spacing;
        } else if (domino.row === 2) {
          // Lower middle
          return basePadding + spacing * 2;
        } else if (domino.row === 3) {
          // Bottom
          return basePadding + spacing * 3;
        }
        return basePadding + domino.row * this.cellHeight; // Fallback

      default:
        // Add more vertical spacing between rows in grid patterns
        return basePadding + domino.row * (this.cellHeight + 10); // Added 10px spacing between rows
    }
  }

  resetEditableDominos(): void {
    let changes = false;

    try {
      console.log('Resetting editable dominos');

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
          const domino = this.dominos.find((d) => d.id === component.id);
          if (domino && domino.isEditable) {
            component.clearValues();
          }
        });
      }

      // Check for editable dominos
      this.hasEditableDominos = this.dominos.some((d) => d.isEditable);
      this.hasEditableDominosChanged.emit(this.hasEditableDominos);

      if (changes) {
        this.gridReset.emit();
      }
    } catch (err) {
      console.error('Error resetting editable dominos:', err);
    }
  }

  // Enhanced method to completely reinitialize the grid with new dominos
  reinitializeGrid(newDominos: DominoPosition[]): void {
    try {
      if (this.debug) {
        console.log(
          'Reinitializing grid with dominos:',
          JSON.parse(JSON.stringify(newDominos))
        );
      }

      // Break the reference by creating deep copies
      this.dominos = JSON.parse(JSON.stringify(newDominos));

      // Make sure editable dominos have their proper state
      this.dominos.forEach((domino) => {
        if (domino.isEditable && domino.topValue === undefined) {
          domino.topValue = null;
        }
        if (domino.isEditable && domino.bottomValue === undefined) {
          domino.bottomValue = null;
        }
      });

      // Recalculate everything
      this.detectPatternType();
      this.calculateDimensions();
      this.calculateOptimalGridSize();
      this.generateGridLines();

      // Check for editable dominos
      this.hasEditableDominos = this.dominos.some((d) => d.isEditable);
      this.hasEditableDominosChanged.emit(this.hasEditableDominos);

      // Force reset of domino components if they exist
      setTimeout(() => {
        if (this.dominoComponents) {
          this.dominoComponents.forEach((component) => {
            const domino = this.dominos.find((d) => d.id === component.id);
            if (domino) {
              if (this.debug) {
                console.log(
                  `Setting domino ${component.id} to:`,
                  domino.topValue,
                  domino.bottomValue
                );
              }
              component.forceUpdate(domino.topValue, domino.bottomValue);
            }
          });
        }
      }, 0);
    } catch (err) {
      console.error('Error reinitializing grid:', err);
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

      case 'rhombus-large':
        // For larger rhombus pattern
        this.cellWidth = 120;
        this.cellHeight = 200;
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
      this.height += 120; // Increase height to add more space
      this.width += 60; // Add extra width to space out the sides
    } else if (this.patternType === 'rhombus-large') {
      this.height += 160; // Increase height even more for larger rhombus
      this.width += 100; // Add extra width for larger rhombus
    }
  }

  resetAllDominosVisualState(): void {
    if (this.dominoComponents) {
      this.dominoComponents.forEach((component) => {
        component.resetVisualState();
      });
    }
  }
}
