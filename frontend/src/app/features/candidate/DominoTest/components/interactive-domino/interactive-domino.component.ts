import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
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
  // Use Default change detection for better reliability
  changeDetection: ChangeDetectionStrategy.Default,
})
export class InteractiveDominoComponent implements OnInit, OnChanges {
  // Basic properties
  // Basic properties
  @Input() id: number = 0;
  @Input() initialTopValue: number | null = null; // Change this back to initialTopValue
  @Input() initialBottomValue: number | null = null; // Change this back to initialBottomValue
  @Input() isEditable: boolean = false;
  @Input() isVertical: boolean = false;
  @Input() scale: number = 1.0;
  @Input() readonly: boolean = false;

  // Size properties with sensible defaults
  @Input() width: number = 60;
  @Input() height: number = 120;

  // Events
  @Output() valueChanged = new EventEmitter<{
    id: number;
    topValue: number | null;
    bottomValue: number | null;
  }>();

  @Output() dominoSelected = new EventEmitter<number>();

  @Output() dominoClicked = new EventEmitter<number>();

  topValue: number | null = 1;
  bottomValue: number | null = 2;

  isSelected: boolean = false;

  // Dot rendering properties
  dotSize: number = 8;
  topDots: DotPosition[] = [];
  bottomDots: DotPosition[] = [];

  topValueChanged: boolean = false;
  bottomValueChanged: boolean = false;
  constructor(private cdr: ChangeDetectorRef) {}

  getDotSize(value: number | null): number {
    if (!value) return 8; // Default size for null values

    // Reduce dot size for higher values
    switch (value) {
      case 1:
      case 2:
      case 3:
        return 8; // Larger dots for 1-3 dots
      case 4:
        return 7; // Slightly smaller for 4 dots
      case 5:
        return 6; // Even smaller for 5 dots
      case 6:
        return 6; // Smallest for 6 dots
      default:
        return 8;
    }
  }
  ngOnInit(): void {
    // Initialize from initial values
    this.topValue = this.initialTopValue;
    this.bottomValue = this.initialBottomValue;
    // Initialize the dot positions
    this.updateDotPositions();

    // Debug logging
    console.log(`Domino ${this.id} initialized:`, {
      isEditable: this.isEditable,
      isSelected: this.isSelected,
      topValue: this.topValue,
      bottomValue: this.bottomValue,
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Only update values from initialTopValue and initialBottomValue if we're not editable
    // or if this is first initialization
    if (
      (changes['initialTopValue'] && !this.isEditable) ||
      (changes['initialTopValue'] && changes['initialTopValue'].firstChange)
    ) {
      this.topValue = changes['initialTopValue'].currentValue;
    }

    if (
      (changes['initialBottomValue'] && !this.isEditable) ||
      (changes['initialBottomValue'] &&
        changes['initialBottomValue'].firstChange)
    ) {
      this.bottomValue = changes['initialBottomValue'].currentValue;
    }

    // Always update dot positions when inputs change
    this.updateDotPositions();
  }
  // Update the onDominoClick method to ensure selection
  // Update the onDominoClick method to toggle selection internally
  onDominoClick(): void {
    // If editable domino, toggle selection
    if (this.isEditable && !this.readonly) {
      // Toggle selection state internally
      this.isSelected = !this.isSelected;

      // Emit events only if becoming selected
      if (this.isSelected) {
        // Emit the click event with the domino ID
        this.dominoClicked.emit(this.id);

        // Also select this domino
        this.dominoSelected.emit(this.id);
      }

      // Force change detection
      this.cdr.detectChanges();
    }
  }

  // Update the cycle methods to track which side was changed
  cycleTopValue(event: Event): void {
    event.stopPropagation();
    if (this.readonly || !this.isEditable || !this.isSelected) return;

    // Mark that top was changed, reset bottom flag
    this.topValueChanged = true;
    this.bottomValueChanged = false;

    if (this.topValue === null || this.topValue >= 6) {
      this.topValue = 1;
    } else {
      this.topValue++;
    }

    this.updateDotPositions();
    this.emitValueChange();

    // Reset flag after a delay
    setTimeout(() => {
      this.topValueChanged = false;
      this.cdr.detectChanges();
    }, 500); // Just slightly longer than animation duration
  }

  cycleBottomValue(event: Event): void {
    event.stopPropagation();
    if (this.readonly || !this.isEditable || !this.isSelected) return;

    // Mark that bottom was changed, reset top flag
    this.bottomValueChanged = true;
    this.topValueChanged = false;

    if (this.bottomValue === null || this.bottomValue >= 6) {
      this.bottomValue = 1;
    } else {
      this.bottomValue++;
    }

    this.updateDotPositions();
    this.emitValueChange();

    // Reset flag after a delay
    setTimeout(() => {
      this.bottomValueChanged = false;
      this.cdr.detectChanges();
    }, 500); // Just slightly longer than animation duration
  }
  // Emit value changes up to parent
  emitValueChange(): void {
    console.log(
      `Emitting value change for domino ${this.id}:`,
      this.topValue,
      this.bottomValue
    );
    this.valueChanged.emit({
      id: this.id,
      topValue: this.topValue,
      bottomValue: this.bottomValue,
    });

    // Force change detection
    this.cdr.detectChanges();
  }

  // Update the visualization of dots
  updateDotPositions(): void {
    const topValue = this.topValue || 0;
    const bottomValue = this.bottomValue || 0;

    this.topDots = this.generateDotPositions(
      topValue,
      this.width / 6,
      this.width / 2,
      this.height / 4
    );

    this.bottomDots = this.generateDotPositions(
      bottomValue,
      this.width / 6,
      this.width / 2,
      (this.height * 3) / 4
    );
  }

  // Generate positions for dots based on value
  // Generate positions for dots based on value - IMPROVED REALISTIC VERSION
  generateDotPositions(
    value: number,
    margin: number,
    centerX: number,
    centerY: number
  ): DotPosition[] {
    const dots: DotPosition[] = [];

    // Get half height/width of the region
    const halfHeight = this.height / 4; // Quarter of total height (half of one side)
    const halfWidth = this.width / 2;

    // Make margin larger for better spacing (30% of half width)
    const spacingMargin = halfWidth * 0.5;

    // Calculate key points for dots
    const leftX = centerX - spacingMargin;
    const rightX = centerX + spacingMargin;
    const topY = centerY - spacingMargin;
    const bottomY = centerY + spacingMargin;

    // Keep dots away from divider by ensuring minimum distance
    const dividerSafetyMargin = 10;
    const minTopY = this.height / 2 - this.height / 4 + dividerSafetyMargin;
    const maxBottomY = this.height / 2 + this.height / 4 - dividerSafetyMargin;

    // Adjust Y positions if needed to keep away from divider
    const adjustedTopY = topY < minTopY ? minTopY : topY;
    const adjustedBottomY = bottomY > maxBottomY ? maxBottomY : bottomY;

    switch (value) {
      case 1:
        // Single dot in middle
        dots.push({ x: centerX, y: centerY });
        break;

      case 2:
        // Diagonal corners - typical domino pattern
        dots.push({ x: leftX, y: topY });
        dots.push({ x: rightX, y: bottomY });
        break;

      case 3:
        // Diagonal corners plus middle
        dots.push({ x: leftX, y: topY });
        dots.push({ x: centerX, y: centerY });
        dots.push({ x: rightX, y: bottomY });
        break;

      case 4:
        // Four corners in a square pattern
        dots.push({ x: leftX, y: topY });
        dots.push({ x: rightX, y: topY });
        dots.push({ x: leftX, y: bottomY });
        dots.push({ x: rightX, y: bottomY });
        break;

      case 5:
        // Four corners plus center
        dots.push({ x: leftX, y: topY });
        dots.push({ x: rightX, y: topY });
        dots.push({ x: centerX, y: centerY });
        dots.push({ x: leftX, y: bottomY });
        dots.push({ x: rightX, y: bottomY });
        break;

      case 6:
        // Domino 6 pattern - two columns of three dots
        const verticalSpacing = halfHeight * 0.5;

        // Left column, top to bottom
        dots.push({ x: leftX, y: centerY - verticalSpacing });
        dots.push({ x: leftX, y: centerY });
        dots.push({ x: leftX, y: centerY + verticalSpacing });

        // Right column, top to bottom
        dots.push({ x: rightX, y: centerY - verticalSpacing });
        dots.push({ x: rightX, y: centerY });
        dots.push({ x: rightX, y: centerY + verticalSpacing });
        break;

      default:
        // Return empty array for null or invalid values
        break;
    }

    return dots;
  }

  // Helper methods for styling
  getDotColor(): string {
    // Non-editable dominoes have pure black dots
    if (!this.isEditable) {
      return '#000000';
    }

    // For editable dominoes, use a much higher contrast color
    // Dark navy blue with higher contrast against light blue background
    return this.isSelected ? '#0f172a' : '#1e293b'; // Darker colors for better contrast
  }

  // Also update the getBgColor method for better contrast
  getBgColor(): string {
    // For non-editable dominos, use an ivory color like real dominoes
    if (!this.isEditable) {
      return '#fffff0'; // Slight ivory tint
    }

    // Lighter backgrounds for editable dominoes for better contrast with dots
    return this.isSelected ? '#dbeafe' : '#eff6ff'; // Lighter blues
  }
  getStrokeWidth(): number {
    // Thicker border for more visibility
    if (!this.isEditable) {
      return 2; // Give non-editable dominoes a visible border
    }

    // Keep your current styling for editable dominoes
    return this.isSelected ? 3 : 2;
  }

  // Set specific values (for external control)
  setValues(top: number | null, bottom: number | null): void {
    this.topValue = top;
    this.bottomValue = bottom;
    this.updateDotPositions();
    this.emitValueChange();
  }
}
