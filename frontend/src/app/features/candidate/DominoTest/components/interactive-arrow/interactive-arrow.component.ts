import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-interactive-arrow',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './interactive-arrow.component.html',
  styleUrls: ['./interactive-arrow.component.css'],
})
export class InteractiveArrowComponent implements OnInit, OnChanges {
  @Input() id: number = 0;
  @Input() length: number = 100;
  @Input() angle: number = 0;
  @Input() scale: number = 1.0;
  @Input() arrowColor: string = '#4f46e5';
  @Input() headSize: number = 10;
  @Input() curved: boolean = false;
  @Input() curvature: number = 0;
  @Input() isSelected: boolean = false;

  @Output() arrowSelected = new EventEmitter<number>();

  // SVG path data for the arrow
  arrowPath: string = '';

  // Arrow dimensions for the SVG viewBox
  width: number = 100;
  height: number = 30;

  constructor() {}

  ngOnInit(): void {
    this.updateArrowPath();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Recalculate path when any property changes
    if (
      changes['length'] ||
      changes['headSize'] ||
      changes['curved'] ||
      changes['curvature']
    ) {
      this.updateArrowPath();
    }
  }

  updateArrowPath(): void {
    // Calculate the actual length considering the scale
    const actualLength = this.length * this.scale;
    const actualWidth = Math.max(actualLength + this.headSize * 2, 30);

    this.width = actualWidth;
    this.height = Math.max(30, this.headSize * 4);

    // Calculate control points for the curve (if curved)
    if (this.curved) {
      const controlY = this.curvature * (this.height / 2);
      // Create a curved arrow path
      this.arrowPath = `M 5,${this.height / 2} 
                        Q ${actualLength / 2},${this.height / 2 + controlY} ${
        actualLength - this.headSize
      },${this.height / 2}
                        L ${actualLength - this.headSize - 5},${
        this.height / 2 - this.headSize
      }
                        M ${actualLength - this.headSize},${this.height / 2}
                        L ${actualLength - this.headSize - 5},${
        this.height / 2 + this.headSize
      }`;
    } else {
      // Create a straight arrow path
      this.arrowPath = `M 5,${this.height / 2} 
                        L ${actualLength - this.headSize},${this.height / 2}
                        L ${actualLength - this.headSize - 5},${
        this.height / 2 - this.headSize
      }
                        M ${actualLength - this.headSize},${this.height / 2}
                        L ${actualLength - this.headSize - 5},${
        this.height / 2 + this.headSize
      }`;
    }
  }

  onArrowClick(): void {
    this.arrowSelected.emit(this.id);
  }
}
