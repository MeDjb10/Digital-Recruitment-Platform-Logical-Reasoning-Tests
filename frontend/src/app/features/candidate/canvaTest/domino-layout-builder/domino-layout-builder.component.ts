import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  AfterViewInit,
  OnChanges,
  ViewChild,
  ElementRef,
  Input,
  Output,
  ChangeDetectorRef,
  SimpleChanges,
  HostListener,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { InputGroupModule } from 'primeng/inputgroup';
import { SliderModule } from 'primeng/slider';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { TestManagementService } from '../../../../core/services/test-management.service';
import { InteractiveArrowComponent } from '../../DominoTest/components/interactive-arrow/interactive-arrow.component';
import { InteractiveDominoComponent } from '../../DominoTest/components/interactive-domino/interactive-domino.component';

import { BuilderHeaderComponent } from '../builder-header/builder-header.component';
import { EditorLayoutComponent } from '../editor-layout/editor-layout.component';
import { QuestionFormComponent } from '../question-form/question-form.component';
import { ArrowPropertiesService } from '../services/arrow-properties.service';
import { DominoPropertiesService } from '../services/domino-proprties.service';
import { StatusBarComponent } from '../status-bar/status-bar.component';
import { LayoutToolbarComponent } from '../toolbar/layout-toolbar.component';
import { DominoQuestion } from '../../../../core/models/question.model';
import {
  ArrowPosition,
  DominoPosition,
} from '../../../../core/models/domino.model';

// Define question interface for better type safety

interface CorrectAnswer {
  dominoId: number;
  topValue: number | null;
  bottomValue: number | null;
}
interface CustomTemplate {
  id: string;
  name: string;
  dominos: DominoPosition[];
  arrows?: ArrowPosition[];
  thumbnail?: string;
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
    BuilderHeaderComponent,
    QuestionFormComponent,
    LayoutToolbarComponent,
    StatusBarComponent,
    EditorLayoutComponent,
  ],
  templateUrl: './domino-layout-builder.component.html',
  styleUrls: ['./domino-layout-builder.component.css'],
})
export class DominoLayoutBuilderComponent
  implements OnInit, AfterViewInit, OnChanges
{
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLDivElement>;

  // Update the input type to accept backend model
  @Input() initialQuestion: DominoQuestion | null = null;
  @Input() testId: string | null = null;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() returnUrl: string = '/admin/tests';

  // Update the output type to emit backend model
  @Output() save = new EventEmitter<Partial<DominoQuestion>>();
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

  customTemplates: CustomTemplate[] = [];

  // Flag for showing the save template dialog
  showSaveTemplateDialog = false;
  newTemplateName = '';

  showAdvancedOptions = false;
  timeLimit = 60; // default 60 seconds
  scoreWeight = 3; // default middle weight

  // Add these properties to the component class
  arrows: ArrowPosition[] = [];

  previewArrows: ArrowPosition[] = [];
  arrowIdCounter: number = 1;
  selectedArrow: ArrowPosition | null = null;
  creationMode: 'domino' | 'arrow' = 'domino';

  // Add this with your other ViewChild declarations
  @ViewChild(EditorLayoutComponent)
  editorLayoutComponent!: EditorLayoutComponent;

  // Toggle advanced options panel visibility
  toggleAdvancedOptions() {
    this.showAdvancedOptions = !this.showAdvancedOptions;
  }

  onToolbarGridDimensionsChange(dimensions: {
    rows: number;
    cols: number;
  }): void {
    this.gridRows = dimensions.rows;
    this.gridCols = dimensions.cols;
    this.updateGridDimensions();
  }

  onToolbarDisplayOptionsChange(options: {
    snapToGrid: boolean;
    showGrid: boolean;
    gridSize: number;
  }): void {
    this.snapToGrid = options.snapToGrid;
    this.showGrid = options.showGrid;
    this.gridSize = options.gridSize;
    this.hasUnsavedChanges = true;
  }

  constructor(
    private testManagementService: TestManagementService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    public dominoPropertiesService: DominoPropertiesService,
    public arrowPropertiesService: ArrowPropertiesService
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

  ngAfterViewInit(): void {}

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
    this.questionId = this.initialQuestion._id || '';
    this.questionTitle = this.initialQuestion.title || '';
    this.questionInstruction = this.initialQuestion.instruction || '';
    this.questionDifficulty = this.initialQuestion.difficulty || 'medium';
    this.questionPattern = this.initialQuestion.pattern || '';
    this.layoutType = this.initialQuestion.layoutType || 'grid';

    console.log('Initializing from question with ID:', this.questionId);

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

    // Load arrows if available
    if (this.initialQuestion.arrows && this.initialQuestion.arrows.length) {
      this.arrows = JSON.parse(JSON.stringify(this.initialQuestion.arrows));

      // Update arrow counter to avoid ID conflicts
      const maxArrowId = Math.max(...this.arrows.map((a) => a.id));
      this.arrowIdCounter = maxArrowId + 1;
    } else {
      this.arrows = []; // Ensure arrows array is initialized even if no arrows in question
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
          // Check if it's a DominoQuestion type
          if (question.questionType === 'DominoQuestion') {
            // Cast as DominoQuestion to access properties
            this.initialQuestion = question as DominoQuestion;
            this.testId = question.testId || null;
            this.initializeFromQuestion();
          } else {
            // Not a domino question
            this.showNotification(
              'This question is not a domino question',
              'error'
            );
          }
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

  // Event handlers for child component events
  onDominoAdded(domino: DominoPosition): void {
    this.hasUnsavedChanges = true;
  }

  onDominoUpdated(domino: DominoPosition): void {
    const index = this.dominos.findIndex((d) => d.id === domino.id);
    if (index >= 0) {
      this.dominos[index] = { ...domino };
      this.hasUnsavedChanges = true;
    }
  }

  onDominoDeleted(id: number): void {
    const index = this.dominos.findIndex((d) => d.id === id);
    if (index >= 0) {
      this.dominos.splice(index, 1);
      this.hasUnsavedChanges = true;
    }
  }

  onDominoDuplicated(domino: DominoPosition): void {
    this.dominos.push(domino);
    this.hasUnsavedChanges = true;
  }

  onDominoValueChanged(event: {
    id: number;
    topValue: number | null;
    bottomValue: number | null;
  }): void {
    const index = this.dominos.findIndex((d) => d.id === event.id);
    if (index >= 0) {
      this.dominos[index].topValue = event.topValue;
      this.dominos[index].bottomValue = event.bottomValue;
      this.hasUnsavedChanges = true;
    }
  }

  onDominoRoleChanged(event: { dominoId: number; isEditable: boolean }): void {
    const index = this.dominos.findIndex((d) => d.id === event.dominoId);
    if (index >= 0) {
      this.dominos[index].isEditable = event.isEditable;
      this.hasUnsavedChanges = true;
    }
  }

  onCorrectAnswerChanged(correctAnswer: CorrectAnswer | null): void {
    this.correctAnswer = correctAnswer;
    this.hasUnsavedChanges = true;
  }

  onArrowAdded(arrow: ArrowPosition): void {
    this.hasUnsavedChanges = true;
  }

  onArrowUpdated(arrow: ArrowPosition): void {
    const index = this.arrows.findIndex((a) => a.id === arrow.id);
    if (index >= 0) {
      this.arrows[index] = { ...arrow };
      this.hasUnsavedChanges = true;
    }
  }

  onArrowDeleted(id: number): void {
    const index = this.arrows.findIndex((a) => a.id === id);
    if (index >= 0) {
      this.arrows.splice(index, 1);
      this.hasUnsavedChanges = true;
    }
  }

  onArrowDuplicated(arrow: ArrowPosition): void {
    this.arrows.push(arrow);
    this.hasUnsavedChanges = true;
  }

  onCreationModeChanged(mode: 'domino' | 'arrow'): void {
    this.creationMode = mode;
  }

  /**
   * Add a domino in the center of the canvas
   * Delegates to editor layout component
   */
  addDominoToCenter(): void {
    if (this.editorLayoutComponent) {
      this.editorLayoutComponent.addDominoToCenter();
    } else {
      // Fallback if the component reference isn't available
      const centerX = this.canvasWidth / 2;
      const centerY = this.canvasHeight / 2;

      // Create a new domino position
      const { posX, posY } =
        this.dominoPropertiesService.calculateSnappedPosition(
          centerX,
          centerY,
          this.gridSize,
          this.snapToGrid
        );

      // Ensure unique ID
      if (this.dominos.length > 0) {
        const maxId = Math.max(...this.dominos.map((d) => d.id));
        this.dominoIdCounter = Math.max(this.dominoIdCounter, maxId + 1);
      }

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
        uniqueId: `domino-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        scale: 1.0,
      };

      this.dominos.push(newDomino);
      this.hasUnsavedChanges = true;
    }
  }

  /**
   * Add an arrow at a specific position
   * Delegates to editor layout component
   */
  addArrowAt(x: number, y: number): void {
    if (this.editorLayoutComponent) {
      this.editorLayoutComponent.addArrowAt(x, y);
    }
  }

  /**
   * Update grid dimensions
   */
  updateGridDimensions(): void {
    // Implementation for updating grid dimensions
    this.hasUnsavedChanges = true;
  }

  /**
   * Apply grid to arrange dominos
   */
  applyGridToPositions(): void {
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
   * Clear the canvas, removing all dominos and arrows
   */
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
    const icon =
      type === 'success'
        ? '✅'
        : type === 'error'
        ? '❌'
        : type === 'warning'
        ? '⚠️'
        : 'ℹ️';

    console.log(`${icon} ${message}`);
    alert(`${message}`);
  }

  /**
   * Generate preview of the question for candidates
   */
  generatePreview(): void {
    this.previewMode = true;

    // Create a deep copy of dominos and arrows for the preview
    this.previewDominos = JSON.parse(JSON.stringify(this.dominos));
    this.previewArrows = JSON.parse(JSON.stringify(this.arrows));

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
    this.previewArrows = [];
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

  // Update the saveQuestion method
  saveQuestion(): void {
    if (!this.validateQuestion()) {
      return;
    }

    this.isSaving = true;
    console.log('Saving question to backend...');

    // Prepare the question data for saving
    const questionData: Partial<DominoQuestion> = {
      title: this.questionTitle,
      instruction: this.questionInstruction,
      difficulty: this.questionDifficulty,
      questionType: 'DominoQuestion',
      pattern: this.questionPattern,
      layoutType: this.layoutType,
      dominos: this.dominos.map((d) => ({
        ...d,
        // Ensure all required fields are present
        id: d.id,
        topValue: d.topValue,
        bottomValue: d.bottomValue,
        isEditable: d.isEditable,
      })),
      arrows: this.arrows,
      gridLayout:
        this.layoutType === 'grid'
          ? {
              rows: this.gridRows,
              cols: this.gridCols,
              width: this.canvasWidth,
              height: this.canvasHeight,
            }
          : undefined,
      correctAnswer: this.correctAnswer,
    };

    console.log('Question data to save:', questionData);

    // Check if we're in edit mode with a valid questionId
    const isEditMode = this.mode === 'edit' && this.questionId;
    console.log(
      'Save operation mode:',
      isEditMode ? 'UPDATE' : 'CREATE',
      'mode:',
      this.mode,
      'questionId:',
      this.questionId || '<empty string>'
    );

    if (isEditMode) {
      // Update existing question
      this.testManagementService
        .updateQuestion(this.questionId, questionData)
        .subscribe({
          next: (response) => {
            console.log('Question updated successfully:', response);
            this.isSaving = false;
            this.hasUnsavedChanges = false;
            this.showNotification(
              '✅ Question updated successfully!',
              'success'
            );

            // Combine the response and local data into a properly formatted object
            const updatedQuestion: Partial<DominoQuestion> = {
              _id: response._id,
              testId: response.testId,
              ...questionData,
            };

            this.save.emit(updatedQuestion);
          },
          error: (error) => {
            console.error('Error updating question:', error);
            this.isSaving = false;
            this.showNotification(
              '❌ Failed to update question: ' + (error.message || error),
              'error'
            );
          },
        });
    } else {
      // Create new question
      if (!this.testId) {
        this.showNotification(
          'Test ID is required to create a question',
          'error'
        );
        this.isSaving = false;
        return;
      }

      this.testManagementService
        .createQuestion(this.testId, questionData)
        .subscribe({
          next: (response) => {
            console.log('Question created successfully:', response);
            this.isSaving = false;
            this.hasUnsavedChanges = false;
            this.showNotification(
              '✅ ✅ Question created successfully!',
              'success'
            );

            // Update mode and ID for future saves
            this.mode = 'edit';
            this.questionId = response._id;

            // Combine the response and local data into a properly formatted object
            const newQuestion: Partial<DominoQuestion> = {
              _id: response._id,
              testId: this.testId ?? undefined,
              ...questionData,
            };

            this.save.emit(newQuestion);
          },
          error: (error) => {
            console.error('Error creating question:', error);
            this.isSaving = false;
            this.showNotification(
              '❌ Failed to create question: ' + (error.message || error),
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
        _id: this.questionId, // Use _id for consistency with backend
        title: this.questionTitle,
        instruction: this.questionInstruction,
        difficulty: this.questionDifficulty,
        pattern: this.questionPattern,
        layoutType: this.layoutType,
        dominos: this.dominos,
        arrows: this.arrows,
        gridLayout: {
          rows: this.gridRows,
          cols: this.gridCols,
          width: this.canvasWidth,
          height: this.canvasHeight,
        },
        correctAnswer: this.correctAnswer,
        questionType: 'DominoQuestion',
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

            // Import arrows if available
            if (
              importedData.question.arrows &&
              importedData.question.arrows.length
            ) {
              this.arrows = importedData.question.arrows.map((a: any) => ({
                ...a,
                uniqueId: a.uniqueId || `imported-arrow-${Date.now()}-${a.id}`,
              }));

              // Update arrow counter
              if (this.arrows.length > 0) {
                const maxArrowId = Math.max(...this.arrows.map((a) => a.id));
                this.arrowIdCounter = maxArrowId + 1;
              }
            } else {
              this.arrows = []; // Reset arrows if none in import
            }

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
   * Determine if layout is grid based for UI purposes
   */
  isGridBasedLayout(): boolean {
    return (
      this.layoutType === 'grid' ||
      this.layoutType === 'custom' ||
      this.layoutType === 'rhombus' ||
      this.layoutType === 'rhombus-large'
    );
  }

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
      arrows: JSON.parse(JSON.stringify(this.arrows)),
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

    // Handle arrows if available in the template
    if (template.arrows && template.arrows.length) {
      const templateArrows = JSON.parse(JSON.stringify(template.arrows));

      // Assign new IDs to avoid conflicts
      const maxArrowId: number = templateArrows.reduce(
        (max: number, arrow: ArrowPosition) => Math.max(max, arrow.id),
        0
      );
      this.arrowIdCounter = maxArrowId + 1;

      // Set the arrows
      this.arrows = templateArrows;
    }

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
}
