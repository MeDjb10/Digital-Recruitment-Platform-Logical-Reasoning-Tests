import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { SliderModule } from 'primeng/slider';
import { InteractiveArrowComponent } from '../../DominoTest/components/interactive-arrow/interactive-arrow.component';
import { InteractiveDominoComponent } from '../../DominoTest/components/interactive-domino/interactive-domino.component';
import { ArrowPropertiesService } from '../services/arrow-properties.service';
import { DominoPropertiesService } from '../services/domino-proprties.service';
import { DominoPosition, ArrowPosition } from '../../DominoTest/models/domino.model';




export interface CorrectAnswer {
  dominoId: number;
  topValue: number | null;
  bottomValue: number | null;
}

@Component({
  selector: 'app-editor-layout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TooltipModule,
    SliderModule,
    InteractiveDominoComponent,
    InteractiveArrowComponent,
  ],
  templateUrl: './editor-layout.component.html',
  styleUrls: ['./editor-layout.component.css'],
})
export class EditorLayoutComponent implements OnInit, AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLDivElement>;

  // Input properties
  @Input() dominos: DominoPosition[] = [];
  @Input() arrows: ArrowPosition[] = [];
  @Input() canvasWidth: number = 1000;
  @Input() canvasHeight: number = 700;
  @Input() showGrid: boolean = true;
  @Input() gridSize: number = 20;
  @Input() snapToGrid: boolean = true;
  @Input() correctAnswer: CorrectAnswer | null = null;
  @Input() creationMode: 'domino' | 'arrow' = 'domino';

  // Output events
  @Output() dominoAdded = new EventEmitter<DominoPosition>();
  @Output() dominoUpdated = new EventEmitter<DominoPosition>();
  @Output() dominoDeleted = new EventEmitter<number>();
  @Output() dominoDuplicated = new EventEmitter<DominoPosition>();
  @Output() dominoValueChanged = new EventEmitter<{
    id: number;
    topValue: number | null;
    bottomValue: number | null;
  }>();
  @Output() dominoRoleChanged = new EventEmitter<{
    dominoId: number;
    isEditable: boolean;
  }>();
  @Output() correctAnswerChanged = new EventEmitter<CorrectAnswer | null>();

  @Output() arrowAdded = new EventEmitter<ArrowPosition>();
  @Output() arrowUpdated = new EventEmitter<ArrowPosition>();
  @Output() arrowDeleted = new EventEmitter<number>();
  @Output() arrowDuplicated = new EventEmitter<ArrowPosition>();

  @Output() creationModeChanged = new EventEmitter<'domino' | 'arrow'>();

  // Component state
  showPropertyPanel: boolean = false;
  selectedDomino: DominoPosition | null = null;
  selectedArrow: ArrowPosition | null = null;
  activePropertyTab: 'position' | 'appearance' | 'values' | 'settings' =
    'position';
  dominoValueOptions = [1, 2, 3, 4, 5, 6];
  dominoIdCounter: number = 1;
  arrowIdCounter: number = 1;

  // Drag state
  isDragging = false;
  dragStartX = 0;
  dragStartY = 0;
  isRotating = false;
  isResizing = false;
  resizeCorner = '';
  initialAngle = 0;
  initialDist = 0;
  initialScale = 1;

  constructor(
    private cdr: ChangeDetectorRef,
    private dominoPropertiesService: DominoPropertiesService,
    private arrowPropertiesService: ArrowPropertiesService
  ) {}

  ngOnInit(): void {
    // Find highest IDs to prevent duplicates
    if (this.dominos.length > 0) {
      this.dominoIdCounter = Math.max(...this.dominos.map((d) => d.id)) + 1;
    }
    if (this.arrows.length > 0) {
      this.arrowIdCounter = Math.max(...this.arrows.map((a) => a.id)) + 1;
    }
  }

  ngAfterViewInit(): void {
    // this.setupCanvasInteraction();
  }

  /**
   * Handle canvas click to add new elements
   */
  canvasClicked(event: MouseEvent): void {
    // Only process direct canvas clicks
    if (event.target !== this.canvasRef.nativeElement) return;

    // Get position within canvas accounting for offset
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Add appropriate element based on creation mode
    if (this.creationMode === 'domino') {
      this.addDominoAt(x, y);
    } else if (this.creationMode === 'arrow') {
      this.addArrowAt(x, y);
    }
  }

  // Update in addDominoAt method to ensure unique IDs

  addDominoAt(x: number, y: number): void {
    const { posX, posY } =
      this.dominoPropertiesService.calculateSnappedPosition(
        x,
        y,
        this.gridSize,
        this.snapToGrid
      );

    // Ensure dominoIdCounter is greater than any existing ID
    if (this.dominos.length > 0) {
      const maxId = Math.max(...this.dominos.map((d) => d.id));
      this.dominoIdCounter = Math.max(this.dominoIdCounter, maxId + 1);
    }

    const newDomino: DominoPosition = {
      id: this.dominoIdCounter++,
      row: Math.floor(posY / (this.canvasHeight / 10)),
      col: Math.floor(posX / (this.canvasWidth / 10)),
      topValue: 1,
      bottomValue: 2,
      isEditable: false,
      exactX: posX,
      exactY: posY,
      angle: 0,
      uniqueId: `domino-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`, // More unique ID
      scale: 1.0,
    };

    this.dominos.push(newDomino);
    this.selectDomino(newDomino);
    this.dominoAdded.emit(newDomino);
  }

  // /**
  //  * Set up canvas interaction for adding dominos/arrows on click
  //  */
  // setupCanvasInteraction(): void {
  //   const canvas = this.canvasRef?.nativeElement;
  //   if (!canvas) return;

  //   // Make canvas clickable for creating new items
  //   canvas.addEventListener('mousedown', (event: MouseEvent) => {
  //     if (event.target === canvas) {
  //       if (this.creationMode === 'domino') {
  //         this.addDominoAt(event.offsetX, event.offsetY);
  //       } else if (this.creationMode === 'arrow') {
  //         this.addArrowAt(event.offsetX, event.offsetY);
  //       }
  //     }
  //   });
  // }

  /**
   * Toggle creation mode between domino and arrow
   */
  toggleCreationMode(mode: 'domino' | 'arrow'): void {
    this.creationMode = mode;
    this.selectedDomino = null;
    this.selectedArrow = null;
    this.showPropertyPanel = false;
    this.creationModeChanged.emit(mode);
  }

  /**
   * Add a domino in the center of the canvas
   */
  addDominoToCenter(): void {
    this.addDominoAt(this.canvasWidth / 2, this.canvasHeight / 2);
  }

  /**
   * Add an arrow at the specified position
   */
  addArrowAt(x: number, y: number): void {
      if (this.arrows.length > 0) {
        const maxId = Math.max(...this.arrows.map((a) => a.id));
        this.arrowIdCounter = Math.max(this.arrowIdCounter, maxId + 1);
      }

    const { posX, posY } = this.arrowPropertiesService.calculateSnappedPosition(
      x,
      y,
      this.gridSize,
      this.snapToGrid
    );

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

    this.arrows.push(newArrow);
    this.selectArrow(newArrow);
    this.arrowAdded.emit(newArrow);
  }

  /**
   * Select a domino for editing
   */
  selectDomino(domino: DominoPosition): void {
    this.selectedArrow = null;
    this.selectedDomino = { ...domino }; // Create a copy to avoid reference issues
    this.showPropertyPanel = true;
    this.activePropertyTab = 'position';
    this.cdr.detectChanges();
  }

  /**
   * Toggle property panel visibility
   */
  togglePropertyPanel(show: boolean = true): void {
    this.showPropertyPanel = show;
    this.cdr.detectChanges();
  }

  /**
   * Select an arrow for editing
   */
  selectArrow(arrow: ArrowPosition): void {
    this.selectedDomino = null;
    this.selectedArrow = arrow;
    this.showPropertyPanel = true;
    this.cdr.detectChanges();
  }

  /**
   * Start dragging a domino
   */
  startDragging(event: MouseEvent, domino: DominoPosition): void {
    this.isDragging = true;
    this.dragStartX = event.clientX - (domino.exactX || 0);
    this.dragStartY = event.clientY - (domino.exactY || 0);

    event.preventDefault();
    event.stopPropagation();

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);

    this.selectDomino(domino);
  }

  /**
   * Start dragging an arrow
   */
  startDraggingArrow(event: MouseEvent, arrow: ArrowPosition): void {
    this.isDragging = true;
    this.dragStartX = event.clientX - (arrow.exactX || 0);
    this.dragStartY = event.clientY - (arrow.exactY || 0);

    event.preventDefault();
    event.stopPropagation();

    document.addEventListener('mousemove', this.onMouseMoveArrow);
    document.addEventListener('mouseup', this.onMouseUpArrow);

    this.selectArrow(arrow);
  }

  /**
   * Handle mouse move during domino dragging
   */
  onMouseMove = (event: MouseEvent) => {
    if (this.isDragging && this.selectedDomino) {
      let newX = event.clientX - this.dragStartX;
      let newY = event.clientY - this.dragStartY;

      const { posX, posY } =
        this.dominoPropertiesService.calculateSnappedPosition(
          newX,
          newY,
          this.gridSize,
          this.snapToGrid
        );

      this.selectedDomino.exactX = posX;
      this.selectedDomino.exactY = posY;
      this.updateSelectedDomino();
      this.cdr.detectChanges();
    }
  };

  /**
   * Handle mouse move during arrow dragging
   */
  onMouseMoveArrow = (event: MouseEvent) => {
    if (this.isDragging && this.selectedArrow) {
      let newX = event.clientX - this.dragStartX;
      let newY = event.clientY - this.dragStartY;

      const { posX, posY } =
        this.arrowPropertiesService.calculateSnappedPosition(
          newX,
          newY,
          this.gridSize,
          this.snapToGrid
        );

      this.selectedArrow.exactX = posX;
      this.selectedArrow.exactY = posY;
      this.updateSelectedArrow();
      this.cdr.detectChanges();
    }
  };

  /**
   * Handle mouse up after dragging
   */
  onMouseUp = () => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);

    if (this.selectedDomino) {
      this.dominoUpdated.emit(this.selectedDomino);
    }
  };

  /**
   * Handle mouse up after arrow dragging
   */
  onMouseUpArrow = () => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.onMouseMoveArrow);
    document.removeEventListener('mouseup', this.onMouseUpArrow);

    if (this.selectedArrow) {
      this.arrowUpdated.emit(this.selectedArrow);
    }
  };

  /**
   * Update the selected domino in the array
   */
  updateSelectedDomino(): void {
    if (!this.selectedDomino) return;

    const index = this.dominos.findIndex(
      (d) => d.id === this.selectedDomino!.id
    );
    if (index >= 0) {
      this.dominos[index] = { ...this.selectedDomino };
      this.cdr.detectChanges();
      this.dominoUpdated.emit(this.selectedDomino);
    }
  }

  /**
   * Update the selected arrow in the array
   */
  updateSelectedArrow(): void {
    if (!this.selectedArrow) return;

    const index = this.arrows.findIndex((a) => a.id === this.selectedArrow!.id);
    if (index >= 0) {
      this.arrows[index] = { ...this.selectedArrow };
      this.cdr.detectChanges();
      this.arrowUpdated.emit(this.selectedArrow);
    }
  }

  /**
   * Update direct arrow position from inputs
   */
  updateArrowPosition(): void {
    if (!this.selectedArrow) return;
    this.updateSelectedArrow();
  }

  /**
   * Get transform value for domino positioning
   */
  getDominoTransform(domino: DominoPosition): string {
    return this.dominoPropertiesService.getDominoTransform(domino);
  }

  /**
   * Get transform value for arrow positioning
   */
  getArrowTransform(arrow: ArrowPosition): string {
    return this.arrowPropertiesService.getArrowTransform(arrow);
  }

  /**
   * Set domino role (editable/fixed)
   */
  setDominoRole(isEditable: boolean): void {
    if (!this.selectedDomino) return;

    const result = this.dominoPropertiesService.setDominoRole(
      this.selectedDomino,
      isEditable,
      this.dominos,
      this.correctAnswer
    );

    if (result.existingEditableChanged) {
      if (
        confirm(
          'Only one domino can be editable. Make this the editable domino instead?'
        )
      ) {
        // Find and reset the previous editable domino
        const existingEditable = this.dominos.find(
          (d) => d.isEditable && d.id !== this.selectedDomino!.id
        );
        if (existingEditable) {
          existingEditable.isEditable = false;
          existingEditable.topValue = 1;
          existingEditable.bottomValue = 2;
        }

        this.selectedDomino = result.updatedDomino;
        this.correctAnswer = result.correctAnswer;

        this.updateSelectedDomino();
        this.dominoRoleChanged.emit({
          dominoId: this.selectedDomino.id,
          isEditable: true,
        });
        this.correctAnswerChanged.emit(this.correctAnswer);
      }
    } else {
      this.selectedDomino = result.updatedDomino;
      this.correctAnswer = result.correctAnswer;

      this.updateSelectedDomino();
      this.dominoRoleChanged.emit({
        dominoId: this.selectedDomino.id,
        isEditable: isEditable,
      });
      this.correctAnswerChanged.emit(this.correctAnswer);
    }
  }

  /**
   * Start rotation when handle is dragged
   */
  startRotation(event: MouseEvent): void {
    if (!this.selectedDomino && !this.selectedArrow) return;

    event.preventDefault();
    event.stopPropagation();

    this.isRotating = true;

    // Calculate center of the element
    const elementX = this.selectedDomino
      ? this.selectedDomino.exactX || 0
      : this.selectedArrow!.exactX || 0;
    const elementY = this.selectedDomino
      ? this.selectedDomino.exactY || 0
      : this.selectedArrow!.exactY || 0;

    // Calculate initial angle
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    this.initialAngle =
      Math.atan2(mouseY - elementY, mouseX - elementX) * (180 / Math.PI) + 90;

    // Add document listeners
    document.addEventListener('mousemove', this.onRotate);
    document.addEventListener('mouseup', this.endRotation);

    const wrapper =
      (event.target as Element)?.closest('.domino-wrapper') ||
      (event.target as Element)?.closest('.arrow-wrapper');
    if (wrapper) {
      wrapper.classList.add('rotating');
    }
  }

  /**
   * Handle rotation during mouse move
   */
  onRotate = (event: MouseEvent) => {
    if (!this.isRotating) return;

    const element = this.selectedDomino || this.selectedArrow;
    if (!element) return;

    // Calculate center of the element
    const elementX = element.exactX || 0;
    const elementY = element.exactY || 0;

    // Get mouse position
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    // Calculate angle from center to mouse
    const currentAngle =
      Math.atan2(mouseY - elementY, mouseX - elementX) * (180 / Math.PI) + 90;

    // Calculate angle difference
    let angleDifference = currentAngle - this.initialAngle;

    // Add the difference to the current angle
    let newAngle = element.angle || 0;
    newAngle += angleDifference;

    // Snap to 15-degree increments if shift is held
    if (event.shiftKey) {
      newAngle = Math.round(newAngle / 15) * 15;
    }

    // Update element angle
    element.angle = newAngle;

    if (this.selectedDomino) {
      this.updateSelectedDomino();
    } else if (this.selectedArrow) {
      this.updateSelectedArrow();
    }

    // Update initial angle for next move
    this.initialAngle = currentAngle;
  };

  /**
   * End rotation when mouse is released
   */
  endRotation = () => {
    this.isRotating = false;

    // Remove the rotating class
    const rotatingElement =
      document.querySelector('.domino-wrapper.rotating') ||
      document.querySelector('.arrow-wrapper.rotating');
    if (rotatingElement) {
      rotatingElement.classList.remove('rotating');
    }

    // Remove document listeners
    document.removeEventListener('mousemove', this.onRotate);
    document.removeEventListener('mouseup', this.endRotation);
  };

  /**
   * Start resizing when corner handle is dragged
   */
  startResizing(event: MouseEvent, corner: string): void {
    if (!this.selectedDomino && !this.selectedArrow) return;

    event.preventDefault();
    event.stopPropagation();

    this.isResizing = true;
    this.resizeCorner = corner;

    // Calculate center of the element
    const elementX = this.selectedDomino
      ? this.selectedDomino.exactX || 0
      : this.selectedArrow!.exactX || 0;
    const elementY = this.selectedDomino
      ? this.selectedDomino.exactY || 0
      : this.selectedArrow!.exactY || 0;

    // Calculate initial distance
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    this.initialDist = Math.sqrt(
      Math.pow(mouseX - elementX, 2) + Math.pow(mouseY - elementY, 2)
    );

    // Store current scale
    const element = this.selectedDomino || this.selectedArrow;
    this.initialScale = element!.scale || 1.0;

    // Add document listeners
    document.addEventListener('mousemove', this.onResize);
    document.addEventListener('mouseup', this.endResizing);
  }

  /**
   * Handle resizing during mouse move
   */
  onResize = (event: MouseEvent) => {
    if (!this.isResizing) return;

    const element = this.selectedDomino || this.selectedArrow;
    if (!element) return;

    // Calculate center of the element
    const elementX = element.exactX || 0;
    const elementY = element.exactY || 0;

    // Calculate new distance
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    const newDist = Math.sqrt(
      Math.pow(mouseX - elementX, 2) + Math.pow(mouseY - elementY, 2)
    );

    // Calculate scale factor
    let scaleFactor = newDist / this.initialDist;

    // Determine scaling direction based on corner position
    if (
      (this.resizeCorner.includes('top') && mouseY > elementY) ||
      (this.resizeCorner.includes('bottom') && mouseY < elementY)
    ) {
      scaleFactor = 1 / scaleFactor;
    }

    // Apply scale
    let newScale = this.initialScale * scaleFactor;
    newScale = Math.max(0.5, Math.min(2.0, newScale));
    newScale = Math.round(newScale * 10) / 10;

    // Update element scale
    element.scale = newScale;

    if (this.selectedDomino) {
      this.updateSelectedDomino();
    } else if (this.selectedArrow) {
      this.updateSelectedArrow();
    }
  };

  /**
   * End resizing when mouse is released
   */
  endResizing = () => {
    this.isResizing = false;
    document.removeEventListener('mousemove', this.onResize);
    document.removeEventListener('mouseup', this.endResizing);
  };

  /**
   * Handle value changes from interactive domino component
   */
  onDominoValueChanged(event: {
    id: number;
    topValue: number | null;
    bottomValue: number | null;
  }): void {
    const index = this.dominos.findIndex((d) => d.id === event.id);
    if (index !== -1) {
      this.dominos[index].topValue = event.topValue;
      this.dominos[index].bottomValue = event.bottomValue;

      if (this.selectedDomino && this.selectedDomino.id === event.id) {
        this.selectedDomino.topValue = event.topValue;
        this.selectedDomino.bottomValue = event.bottomValue;
      }

      this.dominoValueChanged.emit(event);
    }
  }

  /**
   * Handle domino selection from interactive component
   */
  onDominoSelected(domino: DominoPosition): void {
    this.selectDomino(domino);
  }

  /**
   * Handle arrow selection from interactive component
   */
  onArrowSelected(arrowId: number): void {
    const arrow = this.arrows.find((a) => a.id === arrowId);
    if (arrow) {
      this.selectArrow(arrow);
    }
  }

  /**
   * Adjust position for the selected element
   */
  adjustPosition(axis: 'x' | 'y', amount: number): void {
    if (this.selectedDomino) {
      if (axis === 'x') {
        this.selectedDomino.exactX = (this.selectedDomino.exactX || 0) + amount;
      } else {
        this.selectedDomino.exactY = (this.selectedDomino.exactY || 0) + amount;
      }
      this.updateSelectedDomino();
    } else if (this.selectedArrow) {
      if (axis === 'x') {
        this.selectedArrow.exactX = (this.selectedArrow.exactX || 0) + amount;
      } else {
        this.selectedArrow.exactY = (this.selectedArrow.exactY || 0) + amount;
      }
      this.updateSelectedArrow();
    }
  }

  /**
   * Set angle for selected domino
   */
  setAngle(angle: number): void {
    if (!this.selectedDomino) return;
    this.selectedDomino.angle = angle;
    this.updateSelectedDomino();
  }

  /**
   * Set scale for selected domino
   */
  setScale(scale: number): void {
    if (!this.selectedDomino) return;
    this.selectedDomino.scale = scale;
    this.updateSelectedDomino();
  }

  /**
   * Set orientation for selected domino
   */
  setOrientation(isVertical: boolean): void {
    if (!this.selectedDomino) return;
    this.selectedDomino.isVertical = isVertical;
    this.updateSelectedDomino();
  }

  /**
   * Set value for selected domino
   */
  setDominoValue(position: 'top' | 'bottom', value: number): void {
    if (!this.selectedDomino) return;

    if (position === 'top') {
      this.selectedDomino.topValue = value;
    } else {
      this.selectedDomino.bottomValue = value;
    }

    this.updateSelectedDomino();
  }

  /**
   * Update domino scale
   */
  updateDominoScale(event: any): void {
    if (!this.selectedDomino) return;

    const scaleValue = event.target
      ? parseFloat((event.target as HTMLInputElement).value)
      : event.value !== undefined
      ? event.value
      : this.selectedDomino.scale;

    this.selectedDomino.scale = scaleValue;
    this.updateSelectedDomino();
  }

  /**
   * Center selected domino on canvas
   */
  centerDomino(): void {
    if (!this.selectedDomino) return;

    this.selectedDomino.exactX = this.canvasWidth / 2;
    this.selectedDomino.exactY = this.canvasHeight / 2;
    this.updateSelectedDomino();
  }

  /**
   * Duplicate selected domino
   */
  duplicateDomino(): void {
    if (!this.selectedDomino) return;

    const duplicate: DominoPosition = {
      ...JSON.parse(JSON.stringify(this.selectedDomino)),
      id: this.dominoIdCounter++,
      uniqueId: `domino-${Date.now()}`,
      exactX: (this.selectedDomino.exactX || 0) + 50,
      exactY: (this.selectedDomino.exactY || 0) + 50,
      isEditable: false, // Duplicated dominos should not be editable by default
    };

    this.dominos.push(duplicate);
    this.selectDomino(duplicate);
    this.dominoDuplicated.emit(duplicate);
  }

  /**
   * Delete selected domino
   */
  deleteDomino(): void {
    if (!this.selectedDomino) return;

    const index = this.dominos.findIndex(
      (d) => d.id === this.selectedDomino!.id
    );
    if (index >= 0) {
      const deletedId = this.selectedDomino.id;

      // If this was the editable domino, notify about correct answer change
      if (
        this.selectedDomino.isEditable &&
        this.correctAnswer &&
        this.correctAnswer.dominoId === this.selectedDomino.id
      ) {
        this.correctAnswer = null;
        this.correctAnswerChanged.emit(null);
      }

      // Remove the domino
      this.dominos.splice(index, 1);
      this.selectedDomino = null;
      this.showPropertyPanel = false;
      this.dominoDeleted.emit(deletedId);
    }
  }

  /**
   * Set correct answer for the editable domino
   */
  setCorrectAnswer(position: 'top' | 'bottom', value: number): void {
    if (!this.correctAnswer) return;

    if (position === 'top') {
      this.correctAnswer.topValue = value;
    } else {
      this.correctAnswer.bottomValue = value;
    }

    this.correctAnswerChanged.emit(this.correctAnswer);
  }

  // Arrow methods

  /**
   * Set angle for selected arrow
   */
  setArrowAngle(angle: number): void {
    if (!this.selectedArrow) return;
    this.selectedArrow.angle = angle;
    this.updateSelectedArrow();
  }

  /**
   * Set color for selected arrow
   */
  setArrowColor(color: string): void {
    if (!this.selectedArrow) return;
    this.selectedArrow.arrowColor = color;
    this.updateSelectedArrow();
  }

  /**
   * Toggle curved/straight arrow
   */
  toggleCurvedArrow(curved: boolean): void {
    if (!this.selectedArrow) return;
    this.selectedArrow.curved = curved;
    this.updateSelectedArrow();
  }

  /**
   * Set length for selected arrow
   */
  setArrowLength(length: number): void {
    if (!this.selectedArrow) return;
    this.selectedArrow.length = length;
    this.updateSelectedArrow();
  }

  /**
   * Set curvature for selected arrow
   */
  setArrowCurvature(curvature: number): void {
    if (!this.selectedArrow) return;
    this.selectedArrow.curvature = curvature;
    this.updateSelectedArrow();
  }

  /**
   * Center selected arrow on canvas
   */
  centerArrow(): void {
    if (!this.selectedArrow) return;

    this.selectedArrow.exactX = this.canvasWidth / 2;
    this.selectedArrow.exactY = this.canvasHeight / 2;
    this.updateSelectedArrow();
  }

  /**
   * Duplicate selected arrow
   */
  duplicateArrow(): void {
    if (!this.selectedArrow) return;

    const duplicate: ArrowPosition = {
      ...JSON.parse(JSON.stringify(this.selectedArrow)),
      id: this.arrowIdCounter++,
      uniqueId: `arrow-${Date.now()}`,
      exactX: (this.selectedArrow.exactX || 0) + 50,
      exactY: (this.selectedArrow.exactY || 0) + 50,
    };

    this.arrows.push(duplicate);
    this.selectArrow(duplicate);
    this.arrowDuplicated.emit(duplicate);
  }

  /**
   * Delete selected arrow
   */
  deleteArrow(): void {
    if (!this.selectedArrow) return;

    const index = this.arrows.findIndex((a) => a.id === this.selectedArrow!.id);
    if (index >= 0) {
      const deletedId = this.selectedArrow.id;
      this.arrows.splice(index, 1);
      this.selectedArrow = null;
      this.showPropertyPanel = false;
      this.arrowDeleted.emit(deletedId);
    }
  }

  /**
   * Validate hex color input
   */
  validateHexColor(): void {
    if (!this.selectedArrow) return;

    // Ensure hex color starts with #
    let color = this.selectedArrow.arrowColor;
    if (!color.startsWith('#')) {
      color = '#' + color;
    }

    // Check if it's a valid hex color
    const isValid = /^#[0-9A-F]{6}$/i.test(color);

    if (!isValid) {
      // Default to blue if invalid
      color = '#4f46e5';
    }

    this.selectedArrow.arrowColor = color;
    this.updateSelectedArrow();
  }

  /**
   * Convert hex color to RGB
   */
  hexToRgb(hex: string): string {
    // Remove the # if present
    hex = hex.replace('#', '');

    // Parse the hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Return RGB string
    return `${r}, ${g}, ${b}`;
  }

  /**
   * Update color from RGB input
   */
  updateFromRgb(event: any): void {
    if (!this.selectedArrow) return;

    const value = event.target.value;
    const rgbValues = value
      .split(',')
      .map((val: string) => parseInt(val.trim(), 10));

    if (
      rgbValues.length !== 3 ||
      rgbValues.some(isNaN) ||
      rgbValues.some((val: number) => val < 0 || val > 255)
    ) {
      // Invalid RGB, ignore
      return;
    }

    // Convert to hex
    const hex =
      '#' +
      rgbValues
        .map((val: number) => {
          const hexVal = val.toString(16);
          return hexVal.length === 1 ? '0' + hexVal : hexVal;
        })
        .join('');

    this.selectedArrow.arrowColor = hex;
    this.updateSelectedArrow();
  }
}
