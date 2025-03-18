import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';

interface DotPosition {
  x: number;
  y: number;
}

@Component({
  selector: 'app-interactive-domino',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './interactive-domino.component.html',
  styleUrls: ['./interactive-domino.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InteractiveDominoComponent implements OnInit, OnChanges {
  @Input() width: number = 60;
  @Input() height: number = 120;
  @Input() initialTopValue: number | null = 1;
  @Input() initialBottomValue: number | null = 2;
  @Input() isEditable: boolean = false;
  @Input() id: number = 0;
  @Input() isVertical: boolean = false;
  @Input() color: string = '';
  @Input() questionId?: number; // Add this input property
  @Output() valueChanged = new EventEmitter<{
    id: number;
    topValue: number | null;
    bottomValue: number | null;
  }>();

  @Output() dominoSelected = new EventEmitter<number>();
  @Output() rotationChanged = new EventEmitter<{
    id: number;
    isVertical: boolean;
  }>();

  topValue: number | null = 1;
  bottomValue: number | null = 2;
  isSelected: boolean = false;
  dotSize: number = 5;

  // Pre-calculated dot positions to reduce computations
  topDots: DotPosition[] = [];
  bottomDots: DotPosition[] = [];
  

  // Add debug flag to help track issues
  private debug = false;

  ngOnInit() {
    this.topValue = this.initialTopValue;
    this.bottomValue = this.initialBottomValue;
    this.updateDotPositions();
  }

  // Enhance ngOnChanges to be more careful about state changes
  ngOnChanges(changes: SimpleChanges) {
    if (changes['questionId'] && !changes['questionId'].firstChange) {
      this.isSelected = false;
      this.topValue = this.initialTopValue;
      this.bottomValue = this.initialBottomValue;
      this.updateDotPositions();
    }

    if (
      this.debug &&
      (changes['initialTopValue'] || changes['initialBottomValue'])
    ) {
      console.log(
        `Domino ${this.id} input changed:`,
        changes['initialTopValue']?.currentValue,
        changes['initialBottomValue']?.currentValue
      );
    }

    // Only update from inputs if we're not editable or this is the first initialization
    if (
      (changes['initialTopValue'] && !this.isEditable) ||
      (changes['initialTopValue'] && !changes['initialTopValue'].previousValue)
    ) {
      this.topValue =
        changes['initialTopValue'].currentValue === undefined
          ? null
          : changes['initialTopValue'].currentValue;
    }

    if (
      (changes['initialBottomValue'] && !this.isEditable) ||
      (changes['initialBottomValue'] &&
        !changes['initialBottomValue'].previousValue)
    ) {
      this.bottomValue =
        changes['initialBottomValue'].currentValue === undefined
          ? null
          : changes['initialBottomValue'].currentValue;
    }

    if (
      changes['initialTopValue'] ||
      changes['initialBottomValue'] ||
      changes['width'] ||
      changes['height']
    ) {
      this.updateDotPositions();
    }
  }

  updateDotPositions() {
    this.topDots = this.generateDotPositions(
      this.topValue || 0,
      this.width / 6,
      this.width / 2,
      this.height / 4
    );
    this.bottomDots = this.generateDotPositions(
      this.bottomValue || 0,
      this.width / 6,
      this.width / 2,
      (this.height * 3) / 4
    );
  }

  onDominoClick() {
    // Only toggle selection if editable
    if (this.isEditable) {
      this.isSelected = !this.isSelected;
      if (this.isSelected) {
        this.dominoSelected.emit(this.id);
      }
    }
  }

  cycleTopValue(event: Event) {
    event.stopPropagation();
    if (!this.isEditable || !this.isSelected) return;

    // Start at 1 if null
    if (this.topValue === null) {
      this.topValue = 1;
    } else {
      this.topValue = this.topValue === 6 ? 1 : this.topValue + 1;
    }

    this.updateDotPositions();
    this.emitChange();
  }

  cycleBottomValue(event: Event) {
    event.stopPropagation();
    if (!this.isEditable || !this.isSelected) return;

    // Start at 1 if null
    if (this.bottomValue === null) {
      this.bottomValue = 1;
    } else {
      this.bottomValue = this.bottomValue === 6 ? 1 : this.bottomValue + 1;
    }

    this.updateDotPositions();
    this.emitChange();
  }

  emitChange() {
    this.valueChanged.emit({
      id: this.id,
      topValue: this.topValue,
      bottomValue: this.bottomValue,
    });
  }

  generateDotPositions(
    value: number,
    margin: number,
    centerX: number,
    centerY: number
  ): DotPosition[] {
    const dots: DotPosition[] = [];

    switch (value) {
      case 1:
        dots.push({ x: centerX, y: centerY });
        break;
      case 2:
        dots.push({ x: centerX - margin, y: centerY - margin });
        dots.push({ x: centerX + margin, y: centerY + margin });
        break;
      case 3:
        dots.push({ x: centerX - margin, y: centerY - margin });
        dots.push({ x: centerX, y: centerY });
        dots.push({ x: centerX + margin, y: centerY + margin });
        break;
      case 4:
        dots.push({ x: centerX - margin, y: centerY - margin });
        dots.push({ x: centerX + margin, y: centerY - margin });
        dots.push({ x: centerX - margin, y: centerY + margin });
        dots.push({ x: centerX + margin, y: centerY + margin });
        break;
      case 5:
        dots.push({ x: centerX - margin, y: centerY - margin });
        dots.push({ x: centerX + margin, y: centerY - margin });
        dots.push({ x: centerX, y: centerY });
        dots.push({ x: centerX - margin, y: centerY + margin });
        dots.push({ x: centerX + margin, y: centerY + margin });
        break;
      case 6:
        dots.push({ x: centerX - margin, y: centerY - margin });
        dots.push({ x: centerX + margin, y: centerY - margin });
        dots.push({ x: centerX - margin, y: centerY });
        dots.push({ x: centerX + margin, y: centerY });
        dots.push({ x: centerX - margin, y: centerY + margin });
        dots.push({ x: centerX + margin, y: centerY + margin });
        break;
      default:
        // Return empty array for null or invalid values
        break;
    }

    return dots;
  }

  // Add this method to toggle domino orientation
  toggleOrientation(event: Event) {
    event.stopPropagation();
    if (!this.isEditable) return;

    this.isVertical = !this.isVertical;
    // Swap width and height for the domino
    const temp = this.width;
    this.width = this.height;
    this.height = temp;

    // Recalculate dot positions after rotation
    this.updateDotPositions();

    // Emit rotation change
    this.rotationChanged.emit({
      id: this.id,
      isVertical: this.isVertical,
    });
  }

  // Add method to get background color based on state
  getBgColor(): string {
    if (this.isEditable) {
      return this.isSelected ? '#a2cdf6' : '#c8e1fa'; // Using #a2cdf6 as requested, lighter shade when not selected
    } else {
      return 'white';
    }
  }

  getDotColor(): string {
    if (this.isEditable) {
      return this.isSelected ? '#2563eb' : '#1e40af'; // Darker blue that works well with #a2cdf6
    } else {
      return '#333'; // Regular dark color for non-editable dominos
    }
  }

  getStrokeWidth(): number {
    if (this.isEditable) {
      return this.isSelected ? 5 : 3; // 5px when selected, 3px when just editable
    }
    return 1; // Regular 1px border for non-editable dominos
  }

  // Enhance clearValues to be more thorough
  clearValues() {
    if (this.isEditable) {
      this.topValue = null;
      this.bottomValue = null;
      this.isSelected = false;
      this.updateDotPositions();

      // Notify listeners of the change
      this.valueChanged.emit({
        id: this.id,
        topValue: null,
        bottomValue: null,
      });

      if (this.debug) {
        console.log(`Cleared values for domino ${this.id}`);
      }
    }
  }

  // Improve the forceUpdate method to be more robust
  forceUpdate(topValue: number | null, bottomValue: number | null): void {
    if (this.debug) {
      console.log(
        `Forcing update of domino ${this.id} to:`,
        topValue,
        bottomValue
      );
    }

    // Ensure we're using real null values, not undefined
    this.topValue = topValue === undefined ? null : topValue;
    this.bottomValue = bottomValue === undefined ? null : bottomValue;

    // Update dot positions for visualization
    this.updateDotPositions();

    // If this is an editable domino, also notify any listeners of the change
    if (this.isEditable) {
      this.valueChanged.emit({
        id: this.id,
        topValue: this.topValue,
        bottomValue: this.bottomValue,
      });
    }
  }

  resetVisualState(): void {
    this.isSelected = false;
    this.updateDotPositions();
  }
}
