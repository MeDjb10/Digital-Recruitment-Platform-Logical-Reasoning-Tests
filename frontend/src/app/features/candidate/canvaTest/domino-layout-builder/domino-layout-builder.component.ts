import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { InteractiveDominoComponent } from '../../DominoTest/components/interactive-domino/interactive-domino.component';
import {
  ArrowPosition,
  DominoPosition,
} from '../../DominoTest/models/domino.model';
import { TestManagementService } from '../../../../core/services/test-management.service';

import { CheckboxModule } from 'primeng/checkbox';
import { SliderChangeEvent, SliderModule } from 'primeng/slider';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { InputGroupModule } from 'primeng/inputgroup';
import { TextareaModule } from 'primeng/textarea';

import { InputTextModule } from 'primeng/inputtext';
import { InteractiveArrowComponent } from '../../DominoTest/components/interactive-arrow/interactive-arrow.component';

// Define question interface for better type safety
export interface DominoQuestion {
  id?: string;
  testId?: string;
  title?: string;
  instruction: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  pattern: string;
  dominos: DominoPosition[];
  arrows?: ArrowPosition[]; // Add this line
  gridLayout?: {
    rows: number;
    cols: number;
    width?: number;
    height?: number;
  };
  correctAnswer?: {
    dominoId: number;
    topValue: number | null;
    bottomValue: number | null;
  };
  layoutType:
    | 'row'
    | 'grid'
    | 'rhombus'
    | 'custom'
    | 'rhombus-large'
    | 'spiral';
}

@Component({
  selector: 'app-domino-layout-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InteractiveDominoComponent,
    CheckboxModule,
    SliderModule,
    TextareaModule,
    DropdownModule,
    ButtonModule,
    TooltipModule,
    SliderModule,
    InputGroupModule,
    InteractiveArrowComponent,
  ],
  templateUrl: './domino-layout-builder.component.html',
  styleUrls: ['./domino-layout-builder.component.css'],
})
export class DominoLayoutBuilderComponent
  implements OnInit, AfterViewInit, OnChanges
{
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLDivElement>;

  // Component inputs
  @Input() initialQuestion: DominoQuestion | null = null;
  @Input() testId: string | null = null;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() returnUrl: string = '/admin/tests';

  // Component outputs
  @Output() save = new EventEmitter<DominoQuestion>();
  @Output() cancel = new EventEmitter<void>();

  // Canvas properties
  canvasWidth = 1000;
  canvasHeight = 700;

  // Dominos and selection state
  dominos: DominoPosition[] = [];
  selectedDomino: DominoPosition | null = null;
  dominoIdCounter = 1;

  // Question properties
  questionId: string = '';
  questionTitle: string = '';
  questionInstruction: string = '';
  questionDifficulty: 'easy' | 'medium' | 'hard' | 'expert' = 'medium';
  questionPattern: string = '';

  // Layout settings
  layoutType:
    | 'row'
    | 'grid'
    | 'rhombus'
    | 'custom'
    | 'rhombus-large'
    | 'spiral' = 'grid';
  gridRows: number = 3;
  gridCols: number = 3;

  // Correct answer for editable domino
  correctAnswer: {
    dominoId: number;
    topValue: number | null;
    bottomValue: number | null;
  } | null = null;

  // Drag interaction state
  isDragging = false;
  dragStartX = 0;
  dragStartY = 0;

  // UI state
  showPropertyPanel = false;
  gridSize = 20;
  snapToGrid = true;
  showGrid = true;
  isSaving = false;
  hasUnsavedChanges = false;

  // Preview mode
  previewMode = false;
  previewDominos: DominoPosition[] = [];

  // Validation
  validationErrors: string[] = [];
  validationWarnings: string[] = [];

  // Available values for domino halves
  dominoValueOptions = [1, 2, 3, 4, 5, 6];

  /* Add this to the component */
  gridJustApplied = false;

  // Track rotation and resize states
  private isRotating = false;
  private isResizing = false;
  private resizeCorner = '';
  private initialAngle = 0;
  private initialDist = 0;
  private initialScale = 1;

  customTemplates: {
    id: string;
    name: string;
    dominos: DominoPosition[];
    thumbnail?: string;
  }[] = [];

  // Flag for showing the save template dialog
  showSaveTemplateDialog = false;
  newTemplateName = '';

  showAdvancedOptions = false;
  timeLimit = 60; // default 60 seconds
  scoreWeight = 3; // default middle weight

  // Add these properties to the component class
  arrows: ArrowPosition[] = [];
  arrowIdCounter: number = 1;
  selectedArrow: ArrowPosition | null = null;
  creationMode: 'domino' | 'arrow' = 'domino';

  // Toggle advanced options panel visibility
  toggleAdvancedOptions() {
    this.showAdvancedOptions = !this.showAdvancedOptions;
  }

  constructor(
    private testManagementService: TestManagementService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Process query parameters
    this.route.queryParams.subscribe((params) => {
      if (params['questionId'] && !this.initialQuestion) {
        this.loadQuestionById(params['questionId']);
      }

      if (params['testId'] && !this.testId) {
        this.testId = params['testId'] || null;
      }

      if (params['returnUrl']) {
        this.returnUrl = decodeURIComponent(params['returnUrl']);
      }
    });

    // Initialize from initial question if provided
    this.initializeFromQuestion();
    this.initTemplates();

    if (!this.questionDifficulty) {
      this.questionDifficulty = 'medium';
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialQuestion'] && changes['initialQuestion'].currentValue) {
      this.initializeFromQuestion();
    }
  }

  ngAfterViewInit(): void {
    this.setupCanvasInteraction();
  }

  // Add this helper method to track when difficulty changes
  onDifficultyChange(value: string) {
    this.questionDifficulty = value as 'easy' | 'medium' | 'hard' | 'expert';
    this.hasUnsavedChanges = true;
  }

  /**
   * Initialize the builder from an existing question
   */
  initializeFromQuestion(): void {
    if (!this.initialQuestion) return;

    // Set basic properties
    this.questionId = this.initialQuestion.id || '';
    this.questionTitle = this.initialQuestion.title || '';
    this.questionInstruction = this.initialQuestion.instruction || '';
    this.questionDifficulty = this.initialQuestion.difficulty || 'medium';
    this.questionPattern = this.initialQuestion.pattern || '';
    this.layoutType = this.initialQuestion.layoutType || 'grid';

    // Handle canvas dimensions and grid size
    if (this.initialQuestion.gridLayout) {
      if (this.initialQuestion.gridLayout.width) {
        this.canvasWidth = this.initialQuestion.gridLayout.width;
      }
      if (this.initialQuestion.gridLayout.height) {
        this.canvasHeight = this.initialQuestion.gridLayout.height;
      }
      this.gridRows = this.initialQuestion.gridLayout.rows || 3;
      this.gridCols = this.initialQuestion.gridLayout.cols || 3;
    }

    // Load dominos with a deep copy to avoid reference issues
    if (this.initialQuestion.dominos && this.initialQuestion.dominos.length) {
      this.dominos = JSON.parse(JSON.stringify(this.initialQuestion.dominos));

      // Update domino counter to avoid ID conflicts
      const maxId = Math.max(...this.dominos.map((d) => d.id));
      this.dominoIdCounter = maxId + 1;
    }

    // Set correct answer if available
    if (this.initialQuestion.correctAnswer) {
      this.correctAnswer = { ...this.initialQuestion.correctAnswer };
    }

    // Mark as having no unsaved changes initially
    this.hasUnsavedChanges = false;
  }

  /**
   * Load a question by ID from the backend
   */
  loadQuestionById(questionId: string): void {
    this.testManagementService.getQuestionById(questionId).subscribe({
      next: (question) => {
        if (question) {
          this.initialQuestion = question;
          this.testId = question.testId || null;
          this.initializeFromQuestion();
        }
      },
      error: (error) => {
        console.error('Error loading question:', error);
        this.showNotification(
          'Failed to load question. Please try again.',
          'error'
        );
      },
    });
  }

  /**
   * Set up canvas interaction for adding dominos on click
   */
  setupCanvasInteraction(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    // Make canvas clickable for creating new items
    canvas.addEventListener('mousedown', (event: MouseEvent) => {
      if (event.target === canvas) {
        if (this.creationMode === 'domino') {
          this.addDominoAt(event.offsetX, event.offsetY);
        } else if (this.creationMode === 'arrow') {
          this.addArrowAt(event.offsetX, event.offsetY);
        }
      }
    });
  }

  /**
   * Add a new domino at the specified position
   */
  addDominoAt(x: number, y: number): void {
    // Calculate grid position if snapping is enabled
    const posX = this.snapToGrid
      ? Math.round(x / this.gridSize) * this.gridSize
      : x;
    const posY = this.snapToGrid
      ? Math.round(y / this.gridSize) * this.gridSize
      : y;

    // Create new domino with default properties
    const newDomino: DominoPosition = {
      id: this.dominoIdCounter++,
      row: Math.floor(posY / (this.canvasHeight / this.gridRows)),
      col: Math.floor(posX / (this.canvasWidth / this.gridCols)),
      topValue: 1,
      bottomValue: 2,
      isEditable: false,
      exactX: posX,
      exactY: posY,
      angle: 0,
      uniqueId: `domino-${Date.now()}`,
      scale: 1.0,
    };

    // Add to dominos array
    this.dominos.push(newDomino);
    this.hasUnsavedChanges = true;

    // Select the new domino for editing
    this.selectDomino(newDomino);
  }

  /**
   * Add a domino in the center of the canvas
   */
  addDominoToCenter(): void {
    this.addDominoAt(this.canvasWidth / 2, this.canvasHeight / 2);
  }

  /**
   * Select a domino for editing
   */
  selectDomino(domino: DominoPosition): void {
    this.selectedDomino = domino;
    this.showPropertyPanel = true;

    // Handle correct answer for editable dominos
    if (domino.isEditable) {
      if (this.correctAnswer && this.correctAnswer.dominoId === domino.id) {
        // Correct answer already exists for this domino
      } else {
        // Create a new correct answer with default values
        this.correctAnswer = {
          dominoId: domino.id,
          topValue: 1,
          bottomValue: 2,
        };
      }
    }
  }

  /**
   * Start dragging a domino
   */
  startDragging(event: MouseEvent, domino: DominoPosition): void {
    this.isDragging = true;
    this.dragStartX = event.clientX - (domino.exactX || 0);
    this.dragStartY = event.clientY - (domino.exactY || 0);

    // Prevent default and stop propagation
    event.preventDefault();
    event.stopPropagation();

    // Add document-level event listeners
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);

    // Select the domino being dragged
    this.selectDomino(domino);
  }

  /**
   * Handle mouse move during dragging
   */
  onMouseMove = (event: MouseEvent) => {
    if (this.isDragging && this.selectedDomino) {
      // Calculate new position
      let newX = event.clientX - this.dragStartX;
      let newY = event.clientY - this.dragStartY;

      // Apply grid snapping if enabled
      if (this.snapToGrid) {
        newX = Math.round(newX / this.gridSize) * this.gridSize;
        newY = Math.round(newY / this.gridSize) * this.gridSize;
      }

      // Update domino position
      this.selectedDomino.exactX = newX;
      this.selectedDomino.exactY = newY;

      // Update grid cell position
      if (this.layoutType === 'grid') {
        this.selectedDomino.row = Math.floor(
          newY / (this.canvasHeight / this.gridRows)
        );
        this.selectedDomino.col = Math.floor(
          newX / (this.canvasWidth / this.gridCols)
        );
      }

      this.hasUnsavedChanges = true;
    }
  };

  /**
   * Handle mouse up after dragging
   */
  onMouseUp = () => {
    this.isDragging = false;

    // Remove document-level event listeners
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  };

  /**
   * Update the selected domino's properties in the dominos array
   */
  updateSelectedDomino(): void {
    if (!this.selectedDomino) return;

    const index = this.dominos.findIndex(
      (d) => d.id === this.selectedDomino!.id
    );
    if (index >= 0) {
      // Replace the domino in the array with the current selectedDomino
      this.dominos[index] = { ...this.selectedDomino };

      // Force Angular to detect the change by creating a new array reference
      this.dominos = [...this.dominos];

      // Force detection of changes in the properties panel
      this.cdr.detectChanges();

      // Mark as having unsaved changes
      this.hasUnsavedChanges = true;
    }
  }

  /**
   * Prevent propagation of mouse events to avoid conflicts between handlers
   */
  preventPropagation(event: MouseEvent): void {
    event.stopPropagation();
  }

  /**
   * Change the role of the selected domino (editable or fixed)
   */
  setDominoRole(isEditable: boolean): void {
    if (!this.selectedDomino) return;

    // If making a domino editable
    if (isEditable && !this.selectedDomino.isEditable) {
      // Check if another domino is already editable
      const existingEditable = this.dominos.find(
        (d) => d.isEditable && d.id !== this.selectedDomino!.id
      );

      if (existingEditable) {
        // Confirm replacing the editable domino
        if (
          confirm(
            'Only one domino can be editable. Make this the editable domino instead?'
          )
        ) {
          // Reset the previous editable domino
          existingEditable.isEditable = false;
          existingEditable.topValue = 1;
          existingEditable.bottomValue = 2;

          // Make this one editable
          this.selectedDomino.isEditable = true;
          this.selectedDomino.topValue = null;
          this.selectedDomino.bottomValue = null;

          // Update correct answer to point to this domino
          this.correctAnswer = {
            dominoId: this.selectedDomino.id,
            topValue: 1,
            bottomValue: 2,
          };

          this.updateSelectedDomino();
          this.showNotification('Domino is now editable', 'success');
        }
      } else {
        // No other editable domino, make this one editable
        this.selectedDomino.isEditable = true;
        this.selectedDomino.topValue = null;
        this.selectedDomino.bottomValue = null;

        // Set default correct answer
        this.correctAnswer = {
          dominoId: this.selectedDomino.id,
          topValue: 1,
          bottomValue: 2,
        };

        this.updateSelectedDomino();
        this.showNotification('Domino is now editable', 'success');
      }
    }
    // If making a domino non-editable
    else if (!isEditable && this.selectedDomino.isEditable) {
      this.selectedDomino.isEditable = false;
      this.selectedDomino.topValue = 1;
      this.selectedDomino.bottomValue = 2;

      // Clear correct answer if it was for this domino
      if (
        this.correctAnswer &&
        this.correctAnswer.dominoId === this.selectedDomino.id
      ) {
        this.correctAnswer = null;
      }

      this.updateSelectedDomino();
      this.showNotification('Domino is no longer editable', 'info');
    }
  }

  /**
   * Update the correct answer for the editable domino
   */
  updateCorrectAnswer(): void {
    if (
      !this.correctAnswer ||
      !this.selectedDomino ||
      !this.selectedDomino.isEditable
    )
      return;

    // Make sure the correct answer is linked to the right domino
    this.correctAnswer.dominoId = this.selectedDomino.id;
    this.hasUnsavedChanges = true;
  }

  /**
   * Initialize the correct answer for an editable domino if missing
   */
  initializeCorrectAnswer(): void {
    if (!this.selectedDomino || !this.selectedDomino.isEditable) return;

    this.correctAnswer = {
      dominoId: this.selectedDomino.id,
      topValue: 1,
      bottomValue: 1,
    };
    this.hasUnsavedChanges = true;
  }

  /**
   * Delete the selected domino
   */
  deleteDomino(): void {
    if (!this.selectedDomino) return;

    const index = this.dominos.findIndex(
      (d) => d.id === this.selectedDomino!.id
    );
    if (index >= 0) {
      // If this was the editable domino, clear the correct answer
      if (
        this.selectedDomino.isEditable &&
        this.correctAnswer &&
        this.correctAnswer.dominoId === this.selectedDomino.id
      ) {
        this.correctAnswer = null;
      }

      // Remove the domino from the array
      this.dominos.splice(index, 1);
      this.selectedDomino = null;
      this.showPropertyPanel = false;
      this.hasUnsavedChanges = true;
    }
  }

  /**
   * Duplicate the selected domino
   */
  duplicateDomino(): void {
    if (!this.selectedDomino) return;

    // Create a deep copy with a new ID
    const duplicate: DominoPosition = {
      ...JSON.parse(JSON.stringify(this.selectedDomino)),
      id: this.dominoIdCounter++,
      exactX: (this.selectedDomino.exactX || 0) + 40,
      exactY: (this.selectedDomino.exactY || 0) + 40,
      uniqueId: `domino-${Date.now()}`,
      isEditable: false, // Don't duplicate editable status
    };

    this.dominos.push(duplicate);
    this.selectDomino(duplicate);
    this.hasUnsavedChanges = true;
    this.showNotification('Domino duplicated', 'success');
  }

  /**
   * Center the selected domino on the canvas
   */
  centerDomino(): void {
    if (!this.selectedDomino) return;

    this.selectedDomino.exactX = this.canvasWidth / 2;
    this.selectedDomino.exactY = this.canvasHeight / 2;
    this.hasUnsavedChanges = true;
    this.updateSelectedDomino();
  }

  /**
   * Update scale for the selected domino
   */
  updateDominoScale(event: any): void {
    if (!this.selectedDomino) return;

    // Handle both direct event from HTML input and PrimeNG slider event
    const scaleValue = event.target
      ? parseFloat((event.target as HTMLInputElement).value)
      : event.value !== undefined
      ? event.value
      : this.selectedDomino.scale;

    this.selectedDomino.scale = scaleValue;
    this.updateSelectedDomino();
  }

  /**
   * Calculate transform value for domino positioning
   */
  getDominoTransform(domino: DominoPosition): string {
    const x = domino.exactX || 0;
    const y = domino.exactY || 0;
    const angle = domino.angle || 0;
    const scale = domino.scale || 1.0;

    return `translate(${x}px, ${y}px) rotate(${angle}deg) scale(${scale})`;
  }

  /**
   * Update grid dimensions
   */
  updateGridDimensions(): void {
    // Ensure grid dimensions are valid
    this.gridRows = Math.max(1, Math.min(10, this.gridRows));
    this.gridCols = Math.max(1, Math.min(10, this.gridCols));

    this.showGrid = true;
    this.hasUnsavedChanges = true;

    // Update domino positions if using grid layout
    if (this.layoutType === 'grid') {
      this.updateDominoGridPositions();
    }
  }

  /**
   * Update domino positions based on grid
   */
  updateDominoGridPositions(): void {
    // Calculate cell dimensions
    const cellWidth = this.canvasWidth / this.gridCols;
    const cellHeight = this.canvasHeight / this.gridRows;

    // Update each domino's position
    this.dominos.forEach((domino) => {
      domino.row = Math.min(domino.row || 0, this.gridRows - 1);
      domino.col = Math.min(domino.col || 0, this.gridCols - 1);

      // Center the domino in its grid cell
      domino.exactX = domino.col * cellWidth + cellWidth / 2;
      domino.exactY = domino.row * cellHeight + cellHeight / 2;
    });

    this.hasUnsavedChanges = true;
  }

  /**
   * Apply grid to arrange dominos
   */
  /* Modify the applyGridToPositions method */
  applyGridToPositions(): void {
    // existing code...

    this.gridJustApplied = true;
    setTimeout(() => {
      this.gridJustApplied = false;
    }, 1000);
  }

  /**
   * Set the layout type
   */
  setLayoutType(
    type: 'row' | 'grid' | 'rhombus' | 'custom' | 'rhombus-large' | 'spiral'
  ): void {
    this.layoutType = type;
    this.hasUnsavedChanges = true;
  }

  /**
   * Generate a layout based on type
   */
  generateAutoLayout(): void {
    if (this.dominos.length > 0) {
      if (!confirm('This will replace your current dominos. Continue?')) {
        return;
      }
    }

    // Clear existing dominos
    this.clearCanvas();

    // Create new layout based on selected type
    switch (this.layoutType) {
      case 'grid':
        this.createGridLayout();
        break;
      case 'row':
        this.createRowLayout();
        break;
      case 'rhombus':
        this.createRhombusLayout();
        break;
      case 'rhombus-large':
        this.createRhombusLayout(true);
        break;
      case 'spiral':
        this.createSpiralLayout();
        break;
      default:
        // Custom layout remains empty
        break;
    }

    this.hasUnsavedChanges = true;
    this.showNotification(`Created ${this.layoutType} layout`, 'success');
  }

  /**
   * Create a grid layout
   */
  private createGridLayout(): void {
    const spacing = 120;
    const startX = (this.canvasWidth - (this.gridCols - 1) * spacing) / 2;
    const startY = (this.canvasHeight - (this.gridRows - 1) * spacing) / 2;

    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        // Skip the center position in odd-sized grids to create a "window" pattern
        if (
          this.gridRows % 2 === 1 &&
          this.gridCols % 2 === 1 &&
          row === Math.floor(this.gridRows / 2) &&
          col === Math.floor(this.gridCols / 2)
        ) {
          continue;
        }

        const id = this.dominoIdCounter++;
        const newDomino: DominoPosition = {
          id,
          row,
          col,
          topValue: row + 1,
          bottomValue: col + 1,
          isEditable: false,
          exactX: startX + col * spacing,
          exactY: startY + row * spacing,
          angle: 0,
          uniqueId: `domino-grid-${row}-${col}`,
          scale: 1.0,
        };

        this.dominos.push(newDomino);
      }
    }

    // Add an editable domino in the center if we created a "window" pattern
    if (this.gridRows % 2 === 1 && this.gridCols % 2 === 1) {
      const centerRow = Math.floor(this.gridRows / 2);
      const centerCol = Math.floor(this.gridCols / 2);

      const editableDomino: DominoPosition = {
        id: this.dominoIdCounter++,
        row: centerRow,
        col: centerCol,
        topValue: null,
        bottomValue: null,
        isEditable: true,
        exactX: startX + centerCol * spacing,
        exactY: startY + centerRow * spacing,
        angle: 0,
        uniqueId: `domino-grid-editable`,
        scale: 1.0,
      };

      this.dominos.push(editableDomino);

      // Set correct answer
      this.correctAnswer = {
        dominoId: editableDomino.id,
        topValue: centerRow + 1,
        bottomValue: centerCol + 1,
      };
    }
  }

  /**
   * Create a row layout
   */
  private createRowLayout(): void {
    const count = 5; // Number of dominos
    const spacing = 100;
    const startX = (this.canvasWidth - (count - 1) * spacing) / 2;
    const y = this.canvasHeight / 2;

    for (let i = 0; i < count; i++) {
      const isLast = i === count - 1;
      const newDomino: DominoPosition = {
        id: this.dominoIdCounter++,
        row: 0,
        col: i,
        topValue: isLast ? null : i + 1,
        bottomValue: isLast ? null : i + 2,
        isEditable: isLast,
        exactX: startX + i * spacing,
        exactY: y,
        angle: 0,
        uniqueId: `domino-row-${i}`,
        scale: 1.0,
      };

      this.dominos.push(newDomino);

      // Set correct answer for the last (editable) domino
      if (isLast) {
        this.correctAnswer = {
          dominoId: newDomino.id,
          topValue: count,
          bottomValue: count + 1,
        };
      }
    }
  }

  /**
   * Create a rhombus/diamond layout
   */
  private createRhombusLayout(large: boolean = false): void {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    const radius = large ? 180 : 140;

    // Create diamond points: top, right, bottom, left
    const positions = [
      { x: centerX, y: centerY - radius, angle: 0 },
      { x: centerX + radius, y: centerY, angle: 90 },
      { x: centerX, y: centerY + radius, angle: 0 },
      { x: centerX - radius, y: centerY, angle: 90 },
    ];

    positions.forEach((pos, index) => {
      const newDomino: DominoPosition = {
        id: this.dominoIdCounter++,
        row: Math.floor(pos.y / (this.canvasHeight / this.gridRows)),
        col: Math.floor(pos.x / (this.canvasWidth / this.gridCols)),
        topValue: index + 1,
        bottomValue: ((index + 1) % 4) + 1,
        isEditable: false,
        exactX: pos.x,
        exactY: pos.y,
        angle: pos.angle,
        uniqueId: `domino-rhombus-${index}`,
        scale: 1.0,
      };

      this.dominos.push(newDomino);
    });

    // Add editable domino in center
    const editableDomino: DominoPosition = {
      id: this.dominoIdCounter++,
      row: Math.floor(centerY / (this.canvasHeight / this.gridRows)),
      col: Math.floor(centerX / (this.canvasWidth / this.gridCols)),
      topValue: null,
      bottomValue: null,
      isEditable: true,
      exactX: centerX,
      exactY: centerY,
      angle: 45,
      uniqueId: `domino-rhombus-center`,
      scale: 1.0,
    };

    this.dominos.push(editableDomino);

    // Set correct answer based on pattern
    this.correctAnswer = {
      dominoId: editableDomino.id,
      topValue: 2,
      bottomValue: 3,
    };
  }

  /**
   * Create a spiral layout
   */
  private createSpiralLayout(): void {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    const radius = 180;
    const numDominos = 6;

    for (let i = 0; i < numDominos; i++) {
      // Calculate position along spiral
      const angle = i * 60 * (Math.PI / 180); // Convert degrees to radians
      const distance = radius * (1 - i / (numDominos * 2));

      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;

      const isLast = i === numDominos - 1;
      const newDomino: DominoPosition = {
        id: this.dominoIdCounter++,
        row: Math.floor(y / (this.canvasHeight / this.gridRows)),
        col: Math.floor(x / (this.canvasWidth / this.gridCols)),
        topValue: isLast ? null : i + 1,
        bottomValue: isLast ? null : ((i + 1) % numDominos) + 1,
        isEditable: isLast,
        exactX: x,
        exactY: y,
        angle: (angle * 180) / Math.PI + 90,
        uniqueId: `domino-spiral-${i}`,
        scale: 1.0,
      };

      this.dominos.push(newDomino);

      // Set correct answer for the last (editable) domino
      if (isLast) {
        this.correctAnswer = {
          dominoId: newDomino.id,
          topValue: 6,
          bottomValue: 1,
        };
      }
    }
  }

  /**
   * Clear the canvas, removing all dominos
   */
  /**
   * Clear the canvas, removing all dominos
   */
  // Update the clear canvas method to clear arrows as well
  clearCanvas(): void {
    this.dominos = [];
    this.arrows = [];
    this.selectedDomino = null;
    this.selectedArrow = null;
    this.showPropertyPanel = false;
    this.correctAnswer = null;
    this.hasUnsavedChanges = true;
  }

  /**
   * Show notification message
   */
  showNotification(
    message: string,
    type: 'success' | 'error' | 'info' | 'warning'
  ): void {
    // Simple alert for now, could be enhanced with a notification service
    // Based on type, use different styling/icons
    const icon =
      type === 'success'
        ? '✅'
        : type === 'error'
        ? '❌'
        : type === 'warning'
        ? '⚠️'
        : 'ℹ️';

    console.log(`${icon} ${message}`);

    // You could implement a more sophisticated notification system here
    // For now, just show an alert
    alert(`${message}`);
  }

  /**
   * Toggle preview mode to see how question will appear to candidates
   */
  togglePreviewMode(): void {
    this.previewMode = !this.previewMode;

    if (this.previewMode) {
      // Create a deep copy of dominos for preview to avoid modifying the originals
      this.previewDominos = JSON.parse(JSON.stringify(this.dominos));

      // Hide property panel during preview
      this.showPropertyPanel = false;
    } else {
      this.previewDominos = [];
    }
  }

  /**
   * Generate preview of the question for candidates
   */
  generatePreview(): void {
    this.previewMode = true;

    // Create a deep copy of dominos for the preview
    this.previewDominos = JSON.parse(JSON.stringify(this.dominos));

    // For each editable domino, ensure its values are reset to null
    // to show how it will appear to candidates
    this.previewDominos.forEach((domino) => {
      if (domino.isEditable) {
        domino.topValue = null;
        domino.bottomValue = null;
      }
    });

    // Hide property panel during preview
    this.showPropertyPanel = false;
  }

  /**
   * Exit preview mode
   */
  exitPreviewMode(): void {
    this.previewMode = false;
    this.previewDominos = [];
  }

  /**
   * Handle value changes from interactive domino component
   */
  onDominoValueChanged(event: {
    id: number;
    topValue: number | null;
    bottomValue: number | null;
  }): void {
    // Find the domino by ID
    const index = this.dominos.findIndex((d) => d.id === event.id);
    if (index !== -1) {
      // Update the values
      this.dominos[index].topValue = event.topValue;
      this.dominos[index].bottomValue = event.bottomValue;

      // If this is the selected domino, update the reference as well
      if (this.selectedDomino && this.selectedDomino.id === event.id) {
        this.selectedDomino.topValue = event.topValue;
        this.selectedDomino.bottomValue = event.bottomValue;
      }

      this.hasUnsavedChanges = true;
    }
  }

  /**
   * Handle domino selection from interactive domino component
   */
  onDominoSelected(domino: DominoPosition): void {
    this.selectDomino(domino);
  }

  /**
   * Validate question before saving
   */
  validateQuestion(): boolean {
    this.validationErrors = [];

    // Check for required fields
    if (!this.questionInstruction?.trim()) {
      this.validationErrors.push('Question instruction is required');
    }

    if (this.dominos.length === 0) {
      this.validationErrors.push('At least one domino is required');
    }

    // Check for editable domino
    const editableDominos = this.dominos.filter((d) => d.isEditable);

    if (editableDominos.length === 0) {
      this.validationErrors.push(
        'At least one domino must be editable for candidates to answer'
      );
    } else if (editableDominos.length > 1) {
      this.validationErrors.push(
        'Only one domino should be editable (the answer field)'
      );
    }

    // Check if editable domino has a correct answer defined
    if (editableDominos.length === 1) {
      const editableDomino = editableDominos[0];
      if (
        !this.correctAnswer ||
        this.correctAnswer.dominoId !== editableDomino.id
      ) {
        this.validationErrors.push(
          'The editable domino must have a correct answer defined'
        );
      }
    }

    return this.validationErrors.length === 0;
  }

  /**
   * Save the current question
   */
  saveQuestion(): void {
    // Validate the question first
    if (!this.validateQuestion()) {
      alert(
        `Please fix the following issues before saving:\n${this.validationErrors.join(
          '\n'
        )}`
      );
      return;
    }

    this.isSaving = true;

    // Create question object
    const question: DominoQuestion = {
      id: this.questionId || undefined,
      testId: this.testId || undefined,
      title: this.questionTitle,
      instruction: this.questionInstruction,
      difficulty: this.questionDifficulty,
      pattern: this.questionPattern,
      dominos: this.dominos.map((domino) => ({ ...domino })), // Create a copy to avoid references
      arrows: this.arrows.map((arrow) => ({ ...arrow })), // Include arrows in the question
      layoutType: this.layoutType,
      gridLayout: {
        rows: this.gridRows,
        cols: this.gridCols,
        width: this.canvasWidth,
        height: this.canvasHeight,
      },
    };

    // Add correct answer if defined
    if (this.correctAnswer) {
      question.correctAnswer = { ...this.correctAnswer };
    }

    // Save the question based on mode
    if (this.mode === 'create') {
      if (!this.testId) {
        alert('Test ID is required to create a question');
        this.isSaving = false;
        return;
      }

      this.testManagementService
        .createQuestion(this.testId, question)
        .subscribe({
          next: (result) => {
            this.isSaving = false;
            this.hasUnsavedChanges = false;
            this.showNotification('Question saved successfully!', 'success');

            // Emit saved event
            this.save.emit(result);

            // Navigate back if needed
            if (this.returnUrl) {
              this.router.navigateByUrl(this.returnUrl);
            }
          },
          error: (error) => {
            this.isSaving = false;
            console.error('Error saving question:', error);
            this.showNotification(
              'Error saving question. Please try again.',
              'error'
            );
          },
        });
    } else {
      // Editing existing question
      if (!this.questionId) {
        alert('Question ID is required to update a question');
        this.isSaving = false;
        return;
      }

      this.testManagementService
        .updateQuestion(this.questionId, question)
        .subscribe({
          next: (result) => {
            this.isSaving = false;
            this.hasUnsavedChanges = false;
            this.showNotification('Question updated successfully!', 'success');

            // Emit saved event
            this.save.emit(result);

            // Navigate back if needed
            if (this.returnUrl) {
              this.router.navigateByUrl(this.returnUrl);
            }
          },
          error: (error) => {
            this.isSaving = false;
            console.error('Error updating question:', error);
            this.showNotification(
              'Error updating question. Please try again.',
              'error'
            );
          },
        });
    }
  }

  /**
   * Export layout as JSON for sharing or backup
   */
  exportLayoutAsJson(): void {
    const exportData = {
      testId: this.testId,
      question: {
        id: this.questionId,
        title: this.questionTitle,
        instruction: this.questionInstruction,
        difficulty: this.questionDifficulty,
        pattern: this.questionPattern,
        layoutType: this.layoutType,
        dominos: this.dominos,
        gridLayout: {
          rows: this.gridRows,
          cols: this.gridCols,
          width: this.canvasWidth,
          height: this.canvasHeight,
        },
        correctAnswer: this.correctAnswer,
      },
    };

    // Create a blob and trigger download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `domino-question-${this.questionId || 'new'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showNotification('Layout exported to JSON file', 'success');
  }

  /**
   * Import layout from JSON file
   */
  importLayoutFromJson(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e: any) => {
        try {
          const importedData = JSON.parse(e.target.result);

          if (importedData.question && importedData.question.dominos) {
            // Confirm before replacing current layout
            if (this.dominos.length > 0) {
              if (
                !confirm('This will replace your current layout. Continue?')
              ) {
                return;
              }
            }

            // Import question data
            this.questionTitle = importedData.question.title || '';
            this.questionInstruction = importedData.question.instruction || '';
            this.questionDifficulty =
              importedData.question.difficulty || 'medium';
            this.questionPattern = importedData.question.pattern || '';
            this.layoutType = importedData.question.layoutType || 'custom';

            // Import grid layout
            if (importedData.question.gridLayout) {
              this.gridRows = importedData.question.gridLayout.rows || 3;
              this.gridCols = importedData.question.gridLayout.cols || 3;
              this.canvasWidth =
                importedData.question.gridLayout.width || this.canvasWidth;
              this.canvasHeight =
                importedData.question.gridLayout.height || this.canvasHeight;
            }

            // Import dominos
            this.dominos = importedData.question.dominos.map((d: any) => ({
              ...d,
              uniqueId: d.uniqueId || `imported-domino-${Date.now()}-${d.id}`,
            }));

            // Update domino counter
            if (this.dominos.length > 0) {
              const maxId = Math.max(...this.dominos.map((d) => d.id));
              this.dominoIdCounter = maxId + 1;
            }

            // Import correct answer
            if (importedData.question.correctAnswer) {
              this.correctAnswer = importedData.question.correctAnswer;
            }

            this.hasUnsavedChanges = true;
            this.showNotification('Layout imported successfully!', 'success');
          } else {
            this.showNotification(
              'Invalid file format. Could not import layout.',
              'error'
            );
          }
        } catch (error) {
          console.error('Error importing layout:', error);
          this.showNotification(
            'Error importing layout. Please check file format.',
            'error'
          );
        }
      };

      reader.readAsText(file);

      // Reset input so the same file can be imported again if needed
      input.value = '';
    }
  }

  /**
   * Confirm before canceling if there are unsaved changes
   */
  confirmCancel(): void {
    if (this.hasUnsavedChanges) {
      if (
        confirm('You have unsaved changes. Are you sure you want to cancel?')
      ) {
        this.cancelEdit();
      }
    } else {
      this.cancelEdit();
    }
  }

  /**
   * Cancel edit and return to previous page
   */
  cancelEdit(): void {
    this.cancel.emit();

    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  /**
   * Check if preview dominos have editable dominos
   */
  hasEditableDominos(): boolean {
    return this.previewDominos.some((d) => d.isEditable === true);
  }

  /**
   * Check if main dominos have editable dominos
   */
  hasEditableDominosInMain(): boolean {
    return this.dominos.some((d) => d.isEditable === true);
  }

  /**
   * Warn user before leaving if there are unsaved changes
   */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): string | undefined {
    if (this.hasUnsavedChanges) {
      const message =
        'You have unsaved changes. Are you sure you want to leave?';
      event.returnValue = message;
      return message;
    }
    return undefined;
  }

  isGridBasedLayout(): boolean {
    // These layouts benefit from grid controls
    return (
      this.layoutType === 'grid' ||
      this.layoutType === 'custom' ||
      this.layoutType === 'rhombus' ||
      this.layoutType === 'rhombus-large'
    );
  }

  /**
   * Start rotation when rotation handle is dragged
   */
  startRotation(event: MouseEvent): void {
    if (!this.selectedDomino) return;

    event.preventDefault();
    event.stopPropagation();

    this.isRotating = true;

    // Calculate center of the domino
    const dominoX = this.selectedDomino.exactX || 0;
    const dominoY = this.selectedDomino.exactY || 0;

    // Calculate initial angle between mouse and center
    // The -90 adjustment aligns with our onRotate calculation
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    this.initialAngle =
      Math.atan2(mouseY - dominoY, mouseX - dominoX) * (180 / Math.PI) + 90;

    // Add document-level event listeners
    document.addEventListener('mousemove', this.onRotate);
    document.addEventListener('mouseup', this.endRotation);

    const dominoWrapper = (event.target as Element)?.closest('.domino-wrapper');
    if (dominoWrapper) {
      dominoWrapper.classList.add('rotating');
    }
  }

  /**
   * Handle rotation during mouse move
   */
  onRotate = (event: MouseEvent) => {
    if (!this.isRotating || !this.selectedDomino) return;

    // Calculate center of the domino
    const dominoX = this.selectedDomino.exactX || 0;
    const dominoY = this.selectedDomino.exactY || 0;

    // Get mouse position in page coordinates
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    // Calculate angle from center to mouse position
    // The -90 adjustment is to make 0 degrees point up rather than right
    const currentAngle =
      Math.atan2(mouseY - dominoY, mouseX - dominoX) * (180 / Math.PI) + 90;

    // Calculate the change in angle since starting the rotation
    let angleDifference = currentAngle - this.initialAngle;

    // Add the difference to the starting angle of the domino
    let newAngle = this.selectedDomino.angle || 0;
    newAngle += angleDifference;

    // Snap to 15-degree increments if shift is held
    if (event.shiftKey) {
      newAngle = Math.round(newAngle / 15) * 15;
    }

    // Update the domino angle
    this.selectedDomino.angle = newAngle;
    this.updateSelectedDomino();

    // Update the initial angle for the next move
    this.initialAngle = currentAngle;
  };

  /**
   * End rotation when mouse is released
   */
  endRotation = () => {
    this.isRotating = false;

    // Remove the rotating class
    const rotatingDomino = document.querySelector('.domino-wrapper.rotating');
    if (rotatingDomino) {
      rotatingDomino.classList.remove('rotating');
    }

    // Remove document-level event listeners
    document.removeEventListener('mousemove', this.onRotate);
    document.removeEventListener('mouseup', this.endRotation);
  };

  /**
   * Start resizing when corner handle is dragged
   */
  startResizing(event: MouseEvent, corner: string): void {
    if (!this.selectedDomino) return;

    event.preventDefault();
    event.stopPropagation();

    this.isResizing = true;
    this.resizeCorner = corner;

    // Calculate center of the domino
    const dominoX = this.selectedDomino.exactX || 0;
    const dominoY = this.selectedDomino.exactY || 0;

    // Calculate initial distance between mouse and center
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    this.initialDist = Math.sqrt(
      Math.pow(mouseX - dominoX, 2) + Math.pow(mouseY - dominoY, 2)
    );

    // Store current scale
    this.initialScale = this.selectedDomino.scale || 1.0;

    // Add document-level event listeners
    document.addEventListener('mousemove', this.onResize);
    document.addEventListener('mouseup', this.endResizing);
  }

  /**
   * Handle resizing during mouse move
   */
  onResize = (event: MouseEvent) => {
    if (!this.isResizing || !this.selectedDomino) return;

    // Calculate center of the domino
    const dominoX = this.selectedDomino.exactX || 0;
    const dominoY = this.selectedDomino.exactY || 0;

    // Calculate new distance between mouse and center
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    const newDist = Math.sqrt(
      Math.pow(mouseX - dominoX, 2) + Math.pow(mouseY - dominoY, 2)
    );

    // Calculate scale factor based on distance ratio
    let scaleFactor = newDist / this.initialDist;

    // Determine if we should scale up or down based on corner position
    // For opposite corners (e.g., top-left when dragging to bottom-right)
    // we might need to invert the scale factor
    if (
      (this.resizeCorner.includes('top') && mouseY > dominoY) ||
      (this.resizeCorner.includes('bottom') && mouseY < dominoY)
    ) {
      scaleFactor = 1 / scaleFactor;
    }

    // Apply the scale
    let newScale = this.initialScale * scaleFactor;

    // Limit scale to reasonable bounds
    newScale = Math.max(0.5, Math.min(2.0, newScale));

    // Round to 1 decimal place for cleaner values
    newScale = Math.round(newScale * 10) / 10;

    // Update the domino scale
    this.selectedDomino.scale = newScale;
    this.updateSelectedDomino();
  };

  /**
   * End resizing when mouse is released
   */
  endResizing = () => {
    this.isResizing = false;

    // Remove document-level event listeners
    document.removeEventListener('mousemove', this.onResize);
    document.removeEventListener('mouseup', this.endResizing);
  };

  /**
   * Show dialog to save current layout as template
   */
  openSaveTemplateDialog(): void {
    if (this.dominos.length === 0) {
      this.showNotification(
        'Cannot save an empty layout as template',
        'warning'
      );
      return;
    }

    this.showSaveTemplateDialog = true;
    this.newTemplateName = `Custom Layout ${this.customTemplates.length + 1}`;
  }

  /**
   * Save the current layout as a custom template
   */
  saveAsTemplate(): void {
    if (!this.newTemplateName?.trim()) {
      this.showNotification('Please provide a template name', 'warning');
      return;
    }

    // Create a new template with current dominos
    const templateId = 'template-' + Date.now();
    const newTemplate = {
      id: templateId,
      name: this.newTemplateName.trim(),
      dominos: JSON.parse(JSON.stringify(this.dominos)), // Deep copy
      // Optional: generate a thumbnail (could be implemented later)
    };

    // Add to templates array
    this.customTemplates.push(newTemplate);

    // Save to local storage for persistence
    this.saveTemplatesToStorage();

    // Close dialog
    this.showSaveTemplateDialog = false;
    this.newTemplateName = '';

    this.showNotification(
      `Template "${newTemplate.name}" saved successfully`,
      'success'
    );
  }

  /**
   * Apply a custom template to the canvas
   */
  applyTemplate(templateId: string): void {
    const template = this.customTemplates.find((t) => t.id === templateId);

    if (!template) {
      this.showNotification('Template not found', 'error');
      return;
    }

    if (this.dominos.length > 0) {
      if (!confirm('This will replace your current layout. Continue?')) {
        return;
      }
    }

    // Clear canvas and apply template
    this.clearCanvas();

    // Deep copy the template dominos
    const templateDominos = JSON.parse(JSON.stringify(template.dominos));

    // Assign new IDs to avoid conflicts
    const maxId: number = templateDominos.reduce(
      (max: number, domino: DominoPosition) => Math.max(max, domino.id),
      0
    );
    this.dominoIdCounter = maxId + 1;

    // Set the dominos
    this.dominos = templateDominos;

    // Update correct answer if there's an editable domino
    const editableDomino = this.dominos.find((d) => d.isEditable);
    if (editableDomino && !this.correctAnswer) {
      this.correctAnswer = {
        dominoId: editableDomino.id,
        topValue: 1,
        bottomValue: 1,
      };
    }

    this.hasUnsavedChanges = true;
    this.showNotification(`Template "${template.name}" applied`, 'success');
  }

  /**
   * Delete a custom template
   */
  deleteTemplate(templateId: string): void {
    const templateIndex = this.customTemplates.findIndex(
      (t) => t.id === templateId
    );

    if (templateIndex === -1) {
      this.showNotification('Template not found', 'error');
      return;
    }

    const templateName = this.customTemplates[templateIndex].name;

    if (
      confirm(`Are you sure you want to delete the template "${templateName}"?`)
    ) {
      this.customTemplates.splice(templateIndex, 1);
      this.saveTemplatesToStorage();
      this.showNotification(`Template "${templateName}" deleted`, 'info');
    }
  }

  /**
   * Save templates to local storage
   */
  private saveTemplatesToStorage(): void {
    try {
      localStorage.setItem(
        'domino-layout-templates',
        JSON.stringify(this.customTemplates)
      );
    } catch (e) {
      console.error('Error saving templates to local storage:', e);
    }
  }

  /**
   * Load templates from local storage
   */
  private loadTemplatesFromStorage(): void {
    try {
      const templates = localStorage.getItem('domino-layout-templates');
      if (templates) {
        this.customTemplates = JSON.parse(templates);
      }
    } catch (e) {
      console.error('Error loading templates from local storage:', e);
    }
  }

  /**
   * Initialize custom templates when component loads
   */
  private initTemplates(): void {
    this.loadTemplatesFromStorage();
  }

  // Add these properties to your component class
  activePropertyTab: 'position' | 'appearance' | 'values' | 'settings' =
    'position';

  // Add these methods to your component class
  setAngle(angle: number): void {
    if (!this.selectedDomino) return;
    this.selectedDomino.angle = angle;
    this.updateSelectedDomino();
  }

  setScale(scale: number): void {
    if (!this.selectedDomino) return;
    this.selectedDomino.scale = scale;
    this.updateSelectedDomino();
  }

  setOrientation(isVertical: boolean): void {
    if (!this.selectedDomino) return;
    this.selectedDomino.isVertical = isVertical;
    this.updateSelectedDomino();
  }

  // Modify the adjustPosition method to handle both domino and arrow correctly
  adjustPosition(axis: 'x' | 'y', amount: number): void {
    // If we have a selected domino, adjust its position
    if (this.selectedDomino) {
      if (axis === 'x') {
        this.selectedDomino.exactX = (this.selectedDomino.exactX ?? 0) + amount;
      } else {
        this.selectedDomino.exactY = (this.selectedDomino.exactY ?? 0) + amount;
      }
      this.updateSelectedDomino();
    }
    // If we have a selected arrow, adjust its position
    else if (this.selectedArrow) {
      if (axis === 'x') {
        this.selectedArrow.exactX = (this.selectedArrow.exactX ?? 0) + amount;
      } else {
        this.selectedArrow.exactY = (this.selectedArrow.exactY ?? 0) + amount;
      }
      this.updateSelectedArrow();
    }
  }

  // Add this method to handle direct input changes for arrow position
  updateArrowPosition(): void {
    if (!this.selectedArrow) return;

    // Make sure exactX and exactY are valid numbers
    if (typeof this.selectedArrow.exactX !== 'number') {
      this.selectedArrow.exactX = 0;
    }
    if (typeof this.selectedArrow.exactY !== 'number') {
      this.selectedArrow.exactY = 0;
    }

    this.updateSelectedArrow();
  }

  setDominoValue(position: 'top' | 'bottom', value: number): void {
    if (!this.selectedDomino) return;

    if (position === 'top') {
      this.selectedDomino.topValue = value;
    } else {
      this.selectedDomino.bottomValue = value;
    }

    this.updateSelectedDomino();
  }

  setCorrectAnswer(position: 'top' | 'bottom', value: number): void {
    if (!this.correctAnswer) return;

    if (position === 'top') {
      this.correctAnswer.topValue = value;
    } else {
      this.correctAnswer.bottomValue = value;
    }

    this.updateCorrectAnswer();
  }

  // Add these methods for arrow management
  toggleCreationMode(mode: 'domino' | 'arrow'): void {
    this.creationMode = mode;
    // Deselect any selected item when changing modes
    this.selectedDomino = null;
    this.selectedArrow = null;
    this.showPropertyPanel = false;
  }

  // Method to add arrow at specific position on canvas
  addArrowAt(x: number, y: number): void {
    // Calculate grid position if snapping is enabled
    const posX = this.snapToGrid
      ? Math.round(x / this.gridSize) * this.gridSize
      : x;
    const posY = this.snapToGrid
      ? Math.round(y / this.gridSize) * this.gridSize
      : y;

    // Create new arrow with default properties
    const newArrow: ArrowPosition = {
      id: this.arrowIdCounter++,
      exactX: posX,
      exactY: posY,
      angle: 0,
      uniqueId: `arrow-${Date.now()}`,
      scale: 1.0,
      length: 100,
      arrowColor: '#4f46e5',
      headSize: 10,
      curved: false,
      curvature: 0,
    };

    // Add to arrows array
    this.arrows.push(newArrow);
    this.hasUnsavedChanges = true;

    // Select the new arrow for editing
    this.selectArrow(newArrow);
  }

  // Method to select arrow for editing
  selectArrow(arrow: ArrowPosition): void {
    // Deselect any selected domino
    this.selectedDomino = null;

    // Select the arrow
    this.selectedArrow = arrow;
    this.showPropertyPanel = true;
  }

  // Modify the existing updateSelectedDomino method to handle arrows as well
  updateSelectedArrow(): void {
    if (!this.selectedArrow) return;

    const index = this.arrows.findIndex((a) => a.id === this.selectedArrow!.id);
    if (index >= 0) {
      this.arrows[index] = { ...this.selectedArrow };
      this.hasUnsavedChanges = true;
      this.cdr.detectChanges();
    }
  }

  // Method to delete selected arrow
  deleteArrow(): void {
    if (!this.selectedArrow) return;

    const index = this.arrows.findIndex((a) => a.id === this.selectedArrow!.id);
    if (index >= 0) {
      this.arrows.splice(index, 1);
      this.selectedArrow = null;
      this.showPropertyPanel = false;
      this.hasUnsavedChanges = true;
    }
  }

  // Method to duplicate selected arrow
  duplicateArrow(): void {
    if (!this.selectedArrow) return;

    // Create a deep copy with a new ID
    const duplicate: ArrowPosition = {
      ...JSON.parse(JSON.stringify(this.selectedArrow)),
      id: this.arrowIdCounter++,
      exactX: (this.selectedArrow.exactX || 0) + 40,
      exactY: (this.selectedArrow.exactY || 0) + 40,
      uniqueId: `arrow-${Date.now()}`,
    };

    this.arrows.push(duplicate);
    this.selectArrow(duplicate);
    this.hasUnsavedChanges = true;
    this.showNotification('Arrow duplicated', 'success');
  }

  // Method to center selected arrow on canvas
  centerArrow(): void {
    if (!this.selectedArrow) return;

    this.selectedArrow.exactX = this.canvasWidth / 2;
    this.selectedArrow.exactY = this.canvasHeight / 2;
    this.hasUnsavedChanges = true;
    this.updateSelectedArrow();
  }

  // Method to get arrow transform for positioning
  getArrowTransform(arrow: ArrowPosition): string {
    const x = arrow.exactX || 0;
    const y = arrow.exactY || 0;
    const angle = arrow.angle || 0;
    const scale = arrow.scale || 1.0;

    return `translate(${x}px, ${y}px) rotate(${angle}deg) scale(${scale})`;
  }

  // Update arrow color
  setArrowColor(color: string): void {
    if (!this.selectedArrow) return;
    this.selectedArrow.arrowColor = color;
    this.updateSelectedArrow();
  }

  // Toggle arrow curvature
  toggleCurvedArrow(curved: boolean): void {
    if (!this.selectedArrow) return;
    this.selectedArrow.curved = curved;
    this.updateSelectedArrow();
  }

  // Update arrow length
  setArrowLength(length: number): void {
    if (!this.selectedArrow) return;
    this.selectedArrow.length = length;
    this.updateSelectedArrow();
  }

  // Update arrow curvature
  setArrowCurvature(curvature: number): void {
    if (!this.selectedArrow) return;
    this.selectedArrow.curvature = curvature;
    this.updateSelectedArrow();
  }

  // Update arrow head size
  setArrowHeadSize(size: number): void {
    if (!this.selectedArrow) return;
    this.selectedArrow.headSize = size;
    this.updateSelectedArrow();
  }

  // Update arrow angle
  setArrowAngle(angle: number): void {
    if (!this.selectedArrow) return;
    this.selectedArrow.angle = angle;
    this.updateSelectedArrow();
  }

  // Start dragging an arrow
  startDraggingArrow(event: MouseEvent, arrow: ArrowPosition): void {
    this.isDragging = true;
    this.dragStartX = event.clientX - (arrow.exactX || 0);
    this.dragStartY = event.clientY - (arrow.exactY || 0);

    // Prevent default and stop propagation
    event.preventDefault();
    event.stopPropagation();

    // Add document-level event listeners
    document.addEventListener('mousemove', this.onMouseMoveArrow);
    document.addEventListener('mouseup', this.onMouseUpArrow);

    // Select the arrow being dragged
    this.selectArrow(arrow);
  }

  // Handle mouse move during arrow dragging
  onMouseMoveArrow = (event: MouseEvent) => {
    if (this.isDragging && this.selectedArrow) {
      // Calculate new position
      let newX = event.clientX - this.dragStartX;
      let newY = event.clientY - this.dragStartY;

      // Apply grid snapping if enabled
      if (this.snapToGrid) {
        newX = Math.round(newX / this.gridSize) * this.gridSize;
        newY = Math.round(newY / this.gridSize) * this.gridSize;
      }

      // Update arrow position
      this.selectedArrow.exactX = newX;
      this.selectedArrow.exactY = newY;
      this.hasUnsavedChanges = true;
      this.cdr.detectChanges();
    }
  };

  // Handle mouse up after arrow dragging
  onMouseUpArrow = () => {
    this.isDragging = false;

    // Remove document-level event listeners
    document.removeEventListener('mousemove', this.onMouseMoveArrow);
    document.removeEventListener('mouseup', this.onMouseUpArrow);
  };

  // Handle arrow selection from interactive arrow component
  onArrowSelected(arrowId: number): void {
    const arrow = this.arrows.find((a) => a.id === arrowId);
    if (arrow) {
      this.selectArrow(arrow);
    }
  }

  // Add these methods to your component class

/**
 * Validates and formats hex color input
 */
validateHexColor(): void {
  if (!this.selectedArrow) return;
  
  let color = this.selectedArrow.arrowColor;
  
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
  
  this.selectedArrow.arrowColor = color;
  this.updateSelectedArrow();
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
updateFromRgb(event: any): void {
  if (!this.selectedArrow) return;
  
  try {
    const rgbValue = event.target.value;
    const rgbParts = rgbValue.split(',').map((part: string) => parseInt(part.trim(), 10));
    
    if (rgbParts.length !== 3 || rgbParts.some(isNaN)) {
      return;
    }
    
    const [r, g, b] = rgbParts;
    
    // Validate RGB values (0-255)
    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
      return;
    }
    
    // Convert to hex
    const toHex = (value: number) => {
      const hex = value.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    this.selectedArrow.arrowColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    this.updateSelectedArrow();
  } catch (error) {
    console.error('Failed to parse RGB value', error);
  }
}
}

