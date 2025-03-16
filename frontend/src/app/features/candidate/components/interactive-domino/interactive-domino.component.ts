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
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="width"
      [attr.height]="height"
      class="domino"
      [class.selected]="isSelected"
      [class.editable]="isEditable"
    >
      <!-- Base rectangle with shadow for 3D effect -->
      <rect
        *ngIf="!isEditable || isSelected"
        [attr.x]="2"
        [attr.y]="2"
        [attr.width]="width - 4"
        [attr.height]="height - 4"
        [attr.rx]="8"
        fill="#00000010"
        class="domino-shadow"
      />

      <!-- Base rectangle -->
      <rect
        [attr.x]="0"
        [attr.y]="0"
        [attr.width]="width"
        [attr.height]="height"
        [attr.rx]="8"
        [attr.fill]="getBgColor()"
        stroke="#333"
        [attr.stroke-width]="isSelected ? 2 : 1"
        (click)="onDominoClick()"
      />

      <!-- Divider line -->
      <line
        [attr.x1]="0"
        [attr.y1]="height / 2"
        [attr.x2]="width"
        [attr.y2]="height / 2"
        stroke="#333"
        stroke-width="1"
      />

      <!-- Top half dots -->
      <ng-container *ngIf="!isEditable || (isEditable && topValue !== null)">
        <circle
          *ngFor="let dot of topDots"
          [attr.cx]="dot.x"
          [attr.cy]="dot.y"
          [attr.r]="dotSize"
          [attr.fill]="isSelected ? '#3b82f6' : '#333'"
          [class.dot-appear]="isSelected && isEditable"
        ></circle>
      </ng-container>

      <!-- Bottom half dots -->
      <ng-container *ngIf="!isEditable || (isEditable && bottomValue !== null)">
        <circle
          *ngFor="let dot of bottomDots"
          [attr.cx]="dot.x"
          [attr.cy]="dot.y"
          [attr.r]="dotSize"
          [attr.fill]="isSelected ? '#3b82f6' : '#333'"
          [class.dot-appear]="isSelected && isEditable"
        ></circle>
      </ng-container>

      <!-- Make the entire top half clickable even when empty -->
      <rect
        *ngIf="isEditable && isSelected"
        [attr.x]="0"
        [attr.y]="0"
        [attr.width]="width"
        [attr.height]="height / 2"
        fill="rgba(59, 130, 246, 0.1)"
        (click)="cycleTopValue($event)"
        class="top-half-click interactive-area"
      />

      <!-- Make the entire bottom half clickable even when empty -->
      <rect
        *ngIf="isEditable && isSelected"
        [attr.x]="0"
        [attr.y]="height / 2"
        [attr.width]="width"
        [attr.height]="height / 2"
        fill="rgba(59, 130, 246, 0.1)"
        (click)="cycleBottomValue($event)"
        class="bottom-half-click interactive-area"
      />

      <!-- Visual hint indicator when empty - top -->
      <circle
        *ngIf="isEditable && isSelected && topValue === null"
        [attr.cx]="width / 2"
        [attr.cy]="height / 4"
        r="12"
        fill="rgba(59, 130, 246, 0.2)"
        stroke="#3b82f6"
        stroke-width="1"
        stroke-dasharray="3,3"
        pointer-events="none"
      />

      <!-- Visual hint indicator when empty - bottom -->
      <circle
        *ngIf="isEditable && isSelected && bottomValue === null"
        [attr.cx]="width / 2"
        [attr.cy]="(height * 3) / 4"
        r="12"
        fill="rgba(59, 130, 246, 0.2)"
        stroke="#3b82f6"
        stroke-width="1"
        stroke-dasharray="3,3"
        pointer-events="none"
      />

      <!-- Hint for editable dominos that aren't selected -->
      <g
        *ngIf="
          isEditable &&
          !isSelected &&
          (topValue === null || bottomValue === null)
        "
      >
        <rect
          [attr.x]="width / 2 - 15"
          [attr.y]="height / 2 - 15"
          [attr.width]="30"
          [attr.height]="30"
          fill="transparent"
          stroke="#3b82f6"
          stroke-width="1"
          stroke-dasharray="3,3"
          opacity="0.5"
          rx="15"
          class="click-hint"
        />
      </g>
    </svg>
  `,
  styles: [
    `
      .domino {
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .domino.selected {
        filter: drop-shadow(0px 0px 5px rgba(59, 130, 246, 0.5));
      }

      .domino.editable:hover:not(.selected) {
        filter: drop-shadow(0px 0px 3px rgba(59, 130, 246, 0.3));
      }

      .top-half-click:hover,
      .bottom-half-click:hover {
        fill: rgba(59, 130, 246, 0.2);
        cursor: pointer;
      }

      .interactive-area {
        pointer-events: all;
        cursor: pointer;
      }

      .dot-appear {
        animation: appearDot 0.3s forwards;
      }

      @keyframes appearDot {
        from {
          opacity: 0;
          r: 2;
        }
        50% {
          opacity: 0.8;
          r: 7;
        }
        to {
          opacity: 1;
          r: 5;
        }
      }

      .click-hint {
        animation: pulse 2s infinite ease-in-out;
      }

      @keyframes pulse {
        0% {
          opacity: 0.3;
        }
        50% {
          opacity: 0.7;
        }
        100% {
          opacity: 0.3;
        }
      }
    `,
  ],
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

  ngOnInit() {
    this.topValue = this.initialTopValue;
    this.bottomValue = this.initialBottomValue;
    this.updateDotPositions();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Only recalculate dots if necessary
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
      if (this.isSelected) {
        return '#f0f7ff'; // Light blue when selected
      }
      return '#f9f9f9'; // Very light gray for empty
    }
    return this.color || '#ffffff'; // White for filled dominos or custom color
  }

  // Clear values method (to be called when changing questions)
  clearValues() {
    if (this.isEditable) {
      this.topValue = null;
      this.bottomValue = null;
      this.isSelected = false;
      this.updateDotPositions();
    }
  }
}
