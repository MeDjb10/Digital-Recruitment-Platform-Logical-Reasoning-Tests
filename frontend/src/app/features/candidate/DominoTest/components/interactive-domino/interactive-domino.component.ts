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
  changeDetection: ChangeDetectionStrategy.Default,
})
export class InteractiveDominoComponent implements OnInit, OnChanges {
  // Basic properties
  @Input() id: number = 0;
  @Input() initialTopValue: number | null = null;
  @Input() initialBottomValue: number | null = null;
  @Input() isEditable: boolean = false;
  @Input() isVertical: boolean = false;
  @Input() scale: number = 1.0;
  @Input() readonly: boolean = false;

  // Size properties
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

  // Internal state
  topValue: number | null = null;
  bottomValue: number | null = null;
  isSelected: boolean = false;

  // Dot rendering properties
  topDots: DotPosition[] = [];
  bottomDots: DotPosition[] = [];
  topValueChanged: boolean = false;
  bottomValueChanged: boolean = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Initialize from initial values
    this.topValue = this.initialTopValue;
    this.bottomValue = this.initialBottomValue;
    this.updateDotPositions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    let shouldUpdate = false;

    // Always update from initial values when they change
    if (changes['initialTopValue']) {
      this.topValue = changes['initialTopValue'].currentValue;
      shouldUpdate = true;
    }

    if (changes['initialBottomValue']) {
      this.bottomValue = changes['initialBottomValue'].currentValue;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      this.updateDotPositions();
      this.cdr.detectChanges();
    }
  }

  onDominoClick(): void {
    if (this.isEditable && !this.readonly) {
      this.dominoClicked.emit(this.id);
      this.dominoSelected.emit(this.id);
    }
  }

  cycleTopValue(event: Event): void {
    event.stopPropagation();
    if (this.readonly || !this.isEditable || !this.isSelected) return;

    this.topValueChanged = true;
    this.bottomValueChanged = false;

    if (this.topValue === null || this.topValue >= 6) {
      this.topValue = 0;
    } else {
      this.topValue++;
    }

    this.updateDotPositions();
    this.emitValueChange();
    this.resetAnimationFlag('top');
  }

  cycleBottomValue(event: Event): void {
    event.stopPropagation();
    if (this.readonly || !this.isEditable || !this.isSelected) return;

    this.bottomValueChanged = true;
    this.topValueChanged = false;

    if (this.bottomValue === null || this.bottomValue >= 6) {
      this.bottomValue = 0;
    } else {
      this.bottomValue++;
    }

    this.updateDotPositions();
    this.emitValueChange();
    this.resetAnimationFlag('bottom');
  }

  // Public method to set values externally (from the panel)
  setValues(topValue: number | null, bottomValue: number | null): void {
    this.topValue = topValue;
    this.bottomValue = bottomValue;
    this.updateDotPositions();
    this.cdr.detectChanges();
  }

  // Public method to update selection state
  setSelected(selected: boolean): void {
    this.isSelected = selected;
    this.cdr.detectChanges();
  }

  private resetAnimationFlag(side: 'top' | 'bottom'): void {
    setTimeout(() => {
      if (side === 'top') {
        this.topValueChanged = false;
      } else {
        this.bottomValueChanged = false;
      }
      this.cdr.detectChanges();
    }, 500);
  }

  private emitValueChange(): void {
    this.valueChanged.emit({
      id: this.id,
      topValue: this.topValue,
      bottomValue: this.bottomValue,
    });
  }

  updateDotPositions(): void {
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

  generateDotPositions(
    value: number,
    margin: number,
    centerX: number,
    centerY: number
  ): DotPosition[] {
    const dots: DotPosition[] = [];

    if (value === 0) return dots; // No dots for 0

    const halfHeight = this.height / 4;
    const halfWidth = this.width / 2;
    const spacingMargin = halfWidth * 0.5;

    const leftX = centerX - spacingMargin;
    const rightX = centerX + spacingMargin;
    const topY = centerY - spacingMargin;
    const bottomY = centerY + spacingMargin;

    switch (value) {
      case 1:
        dots.push({ x: centerX, y: centerY });
        break;
      case 2:
        dots.push({ x: leftX, y: topY });
        dots.push({ x: rightX, y: bottomY });
        break;
      case 3:
        dots.push({ x: leftX, y: topY });
        dots.push({ x: centerX, y: centerY });
        dots.push({ x: rightX, y: bottomY });
        break;
      case 4:
        dots.push({ x: leftX, y: topY });
        dots.push({ x: rightX, y: topY });
        dots.push({ x: leftX, y: bottomY });
        dots.push({ x: rightX, y: bottomY });
        break;
      case 5:
        dots.push({ x: leftX, y: topY });
        dots.push({ x: rightX, y: topY });
        dots.push({ x: centerX, y: centerY });
        dots.push({ x: leftX, y: bottomY });
        dots.push({ x: rightX, y: bottomY });
        break;
      case 6:
        const verticalSpacing = halfHeight * 0.5;
        dots.push({ x: leftX, y: centerY - verticalSpacing });
        dots.push({ x: leftX, y: centerY });
        dots.push({ x: leftX, y: centerY + verticalSpacing });
        dots.push({ x: rightX, y: centerY - verticalSpacing });
        dots.push({ x: rightX, y: centerY });
        dots.push({ x: rightX, y: centerY + verticalSpacing });
        break;
    }

    return dots;
  }

  getDotSize(value: number | null): number {
    if (!value || value === 0) return 8;

    switch (value) {
      case 1:
      case 2:
      case 3:
        return 8;
      case 4:
        return 7;
      case 5:
      case 6:
        return 6;
      default:
        return 8;
    }
  }

  getDotColor(): string {
    if (!this.isEditable) {
      return '#000000';
    }
    return this.isSelected ? '#0f172a' : '#1e293b';
  }

  getBgColor(): string {
    if (!this.isEditable) {
      return '#fffff0';
    }
    return this.isSelected ? '#dbeafe' : '#eff6ff';
  }

  getStrokeWidth(): number {
    if (!this.isEditable) {
      return 2;
    }
    return this.isSelected ? 3 : 2;
  }
}
