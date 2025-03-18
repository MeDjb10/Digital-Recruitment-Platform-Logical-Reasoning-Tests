import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


import { DominoLayout, DominoLayoutService } from '../services/domino-layout.service';
import { InteractiveDominoComponent } from '../../DominoTest/components/interactive-domino/interactive-domino.component';
import { DominoPosition } from '../../DominoTest/models/domino.model';


@Component({
  selector: 'app-domino-layout-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, InteractiveDominoComponent],
  templateUrl: './domino-layout-builder.component.html',
  styleUrls: ['./domino-layout-builder.component.css'],
})
export class DominoLayoutBuilderComponent implements OnInit, AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLDivElement>;

  // Canvas properties
  canvasWidth = 1000;
  canvasHeight = 700;

  // Dominos in the layout
  dominos: DominoPosition[] = [];

  // Currently selected domino for editing
  selectedDomino: DominoPosition | null = null;

  // Layout properties
  layoutName: string = '';
  layoutDescription: string = '';
  layoutType:
    | 'row'
    | 'grid'
    | 'rhombus'
    | 'custom'
    | 'rhombus-large'
    | 'spiral' = 'grid'; // grid, spiral, rhombus, etc.

  // Counter for new domino IDs
  dominoIdCounter = 1;

  // Dragging state
  isDragging = false;
  dragStartX = 0;
  dragStartY = 0;

  // Property panel state
  showPropertyPanel = false;

  // For gridlines and snapping
  gridSize = 20;
  snapToGrid = true;
  showGrid = true;

  // Add this property to fix the error
  savedLayouts: DominoLayout[] = [];

  constructor(private dominoLayoutService: DominoLayoutService) {}

  ngOnInit(): void {
    // Load saved layouts
    this.dominoLayoutService.layouts$.subscribe((layouts) => {
      this.savedLayouts = layouts;
    });
  }

  ngAfterViewInit(): void {
    // Set up event listeners for the canvas
    this.setupCanvasInteraction();
  }

  setupCanvasInteraction(): void {
    const canvas = this.canvasRef.nativeElement;

    // Make canvas draggable for creating new dominos
    canvas.addEventListener('mousedown', (event) => {
      if (event.target === canvas) {
        // Add new domino where clicked
        this.addDominoAt(event.offsetX, event.offsetY);
      }
    });
  }

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
      row: 0, // These are just placeholders since we're using exactX/Y
      col: 0,
      topValue: 1,
      bottomValue: 2,
      isEditable: false,
      exactX: posX,
      exactY: posY,
      angle: 0,
      uniqueId: `custom-domino-${Date.now()}`,
      scale: 1.0, // Default scale
    };

    // Add to dominos array
    this.dominos.push(newDomino);

    // Select the new domino for editing
    this.selectDomino(newDomino);
  }

  selectDomino(domino: DominoPosition): void {
    this.selectedDomino = domino;
    this.showPropertyPanel = true;
  }

  startDragging(event: MouseEvent, domino: DominoPosition): void {
    this.isDragging = true;
    this.dragStartX = event.clientX - (domino.exactX || 0);
    this.dragStartY = event.clientY - (domino.exactY || 0);
    event.preventDefault();
    event.stopPropagation();

    // Add document-level event listeners
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);

    // Select the domino being dragged
    this.selectDomino(domino);
  }

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
    }
  };

  onMouseUp = () => {
    this.isDragging = false;

    // Remove document-level event listeners
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  };

  // Updates domino angle
  updateAngle(angle: number): void {
    if (this.selectedDomino) {
      this.selectedDomino.angle = angle;
    }
  }

  // In the DominoLayoutBuilderComponent class

  // Toggle editable status
  toggleEditable(): void {
    if (this.selectedDomino) {
      // Set the isEditable property directly on the domino object
      this.selectedDomino.isEditable = !this.selectedDomino.isEditable;

      // Update the values based on the editable state
      if (this.selectedDomino.isEditable) {
        // Clear values for editable dominos
        this.selectedDomino.topValue = null;
        this.selectedDomino.bottomValue = null;
      } else {
        // Set default values for non-editable dominos
        this.selectedDomino.topValue = 1;
        this.selectedDomino.bottomValue = 2;
      }

      // Log the change to verify it worked
      console.log(
        `Domino ${this.selectedDomino.id} editable status: ${this.selectedDomino.isEditable}`
      );
    }
  }

  // Delete the selected domino
  deleteDomino(): void {
    if (this.selectedDomino) {
      const index = this.dominos.findIndex(
        (d) => d.id === this.selectedDomino!.id
      );
      if (index >= 0) {
        this.dominos.splice(index, 1);
        this.selectedDomino = null;
        this.showPropertyPanel = false;
      }
    }
  }

  // Save the current layout
  saveLayout(): void {
    if (!this.layoutName) {
      alert('Please enter a layout name');
      return;
    }

    // Check if we have at least one editable domino for answering
    const hasEditableDomino = this.dominos.some((d) => d.isEditable);

    if (!hasEditableDomino) {
      if (
        confirm(
          'No editable domino found. For test questions, at least one domino should be marked as editable. Continue saving anyway?'
        )
      ) {
        // Continue with save if user confirms
      } else {
        return; // Exit the method if user wants to fix this
      }
    }

    // Create a deep copy of the dominos array to avoid reference issues
    const dominosCopy = this.dominos.map((domino) => ({
      ...domino,
      // Ensure isEditable is correctly copied
      isEditable: !!domino.isEditable,
    }));

    const layout: Partial<DominoLayout> = {
      id: Date.now().toString(),
      name: this.layoutName,
      description: this.layoutDescription,
      type: this.layoutType,
      dominos: dominosCopy,
      width: this.canvasWidth,
      height: this.canvasHeight,
      createdAt: new Date().toISOString(),
    };

    // Save to the service
    this.dominoLayoutService.saveLayout(layout);

    // Log the saved layout for verification
    console.log('Saved layout:', layout);
    console.log(
      'Number of editable dominos:',
      layout.dominos?.filter((d) => d.isEditable).length
    );

    alert('Layout saved successfully!');
  }

  // Load a previously saved layout
  loadLayout(layoutId: string): void {
    const layout = this.dominoLayoutService.getLayout(layoutId);

    if (layout) {
      this.dominos = layout.dominos;
      this.layoutName = layout.name;
      this.layoutDescription = layout.description;
      this.layoutType = layout.type;
      this.canvasWidth = layout.width;
      this.canvasHeight = layout.height;

      this.selectedDomino = null;
      this.showPropertyPanel = false;
    }
  }

  // Export the current layout as JSON
  exportLayoutAsJson(): void {
    const layout = {
      name: this.layoutName || 'Unnamed Layout',
      description: this.layoutDescription,
      type: this.layoutType,
      dominos: [...this.dominos],
      dimensions: {
        width: this.canvasWidth,
        height: this.canvasHeight,
      },
      createdAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(layout, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.layoutName || 'domino-layout'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Clear the canvas
  clearCanvas(): void {
    if (
      confirm(
        'Are you sure you want to clear the canvas? All unsaved work will be lost.'
      )
    ) {
      this.dominos = [];
      this.selectedDomino = null;
      this.showPropertyPanel = false;
    }
  }

  // Calculate display position for a domino, accounting for its angle
  getDominoTransform(domino: DominoPosition): string {
    const x = domino.exactX || 0;
    const y = domino.exactY || 0;
    const angle = domino.angle || 0;

    return `translate(${x}px, ${y}px) rotate(${angle}deg)`;
  }

  // Get domino scale from the scale property or default to 1
  getDominoScale(domino: DominoPosition): number {
    return domino.scale || 1.0;
  }
}
