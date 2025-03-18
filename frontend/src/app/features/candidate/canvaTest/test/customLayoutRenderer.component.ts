import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ViewChildren,
  QueryList,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InteractiveDominoComponent } from '../../DominoTest/components/interactive-domino/interactive-domino.component';
import { DominoPosition, DominoChange } from '../../DominoTest/models/domino.model';

@Component({
  selector: 'app-custom-layout-renderer',
  standalone: true,
  imports: [CommonModule, InteractiveDominoComponent],
  template: `
    <div
      class="layout-container"
      [style.width.px]="width"
      [style.height.px]="height"
      [style.transform]="'scale(' + zoomLevel + ')'"
      [style.transform-origin]="'center center'"
    >
      <!-- Render each domino at its exact position -->
      <div
        *ngFor="let domino of dominos; trackBy: trackByDominoId"
        class="domino-wrapper"
        [style.transform]="getDominoTransform(domino)"
        [class.editable]="domino.isEditable"
      >
        <app-interactive-domino
          [id]="domino.id"
          [width]="getDominoWidth(domino)"
          [height]="getDominoHeight(domino)"
          [initialTopValue]="domino.topValue"
          [initialBottomValue]="domino.bottomValue"
          [isEditable]="domino.isEditable"
          (valueChanged)="onDominoValueChanged($event)"
          (dominoClicked)="onDominoClicked(domino.id)"
          (dominoRotated)="onDominoRotated($event)"
          #dominoComponent
        >
        </app-interactive-domino>
      </div>
    </div>
  `,
  styles: [
    `
      .layout-container {
        position: relative;
        background-color: transparent;
        margin: 0 auto;
        overflow: visible;
        transition: transform 0.3s ease;
      }

      .domino-wrapper {
        position: absolute;
        transform-origin: center center;
        transition: transform 0.3s ease;
      }

      .domino-wrapper.editable {
        filter: drop-shadow(0 0 12px rgba(79, 70, 229, 0.8));
        animation: pulse 2s infinite;
        z-index: 5;
      }

      @keyframes pulse {
        0%,
        100% {
          filter: drop-shadow(0 0 6px rgba(79, 70, 229, 0.4));
        }
        50% {
          filter: drop-shadow(0 0 14px rgba(79, 70, 229, 0.7));
        }
      }
    `,
  ],
})
export class CustomLayoutRendererComponent implements OnChanges {
  @Input() dominos: DominoPosition[] = [];
  @Input() width: number = 800;
  @Input() height: number = 600;
  @Input() zoomLevel: number = 1;

  @Output() dominoChanged = new EventEmitter<DominoChange>();
  @Output() dominoSelected = new EventEmitter<number>();
  @Output() dominoRotated = new EventEmitter<{
    id: number;
    isVertical: boolean;
  }>();
  @Output() hasEditableDominosChanged = new EventEmitter<boolean>();

  @ViewChildren('dominoComponent')
  dominoComponents!: QueryList<InteractiveDominoComponent>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dominos']) {
      // Check if we have editable dominos
      const hasEditables = this.dominos.some((d) => d.isEditable);
      this.hasEditableDominosChanged.emit(hasEditables);
    }
  }

  getDominoTransform(domino: DominoPosition): string {
    // Always use exact positioning for custom layouts
    const x = domino.exactX !== undefined ? domino.exactX : 0;
    const y = domino.exactY !== undefined ? domino.exactY : 0;
    const angle = domino.angle !== undefined ? domino.angle : 0;
    const scale = domino.scale || 1;

    return `translate(${x}px, ${y}px) rotate(${angle}deg) scale(${scale})`;
  }

  getDominoWidth(domino: DominoPosition): number {
    return 70; // Standard width for domino
  }

  getDominoHeight(domino: DominoPosition): number {
    return 140; // Standard height for domino
  }

  onDominoValueChanged(change: any): void {
    this.dominoChanged.emit(change);
  }

  onDominoClicked(id: number): void {
    this.dominoSelected.emit(id);
  }

  onDominoRotated(event: any): void {
    this.dominoRotated.emit(event);
  }

  trackByDominoId(index: number, domino: DominoPosition): string {
    return domino.uniqueId || `${domino.questionId || ''}_${domino.id}`;
  }
}
