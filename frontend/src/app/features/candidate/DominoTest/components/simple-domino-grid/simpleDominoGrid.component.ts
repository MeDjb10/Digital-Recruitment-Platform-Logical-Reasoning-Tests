import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  AfterViewInit,
  ChangeDetectionStrategy,
  HostListener,
  ChangeDetectorRef,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { InteractiveDominoComponent } from '../interactive-domino/interactive-domino.component';
import {
  ArrowPosition,
  DominoChange,
  DominoPosition,
} from '../../models/domino.model';
import { InteractiveArrowComponent } from '../interactive-arrow/interactive-arrow.component';

@Component({
  selector: 'app-simple-domino-grid',
  standalone: true,
  imports: [
    CommonModule,
    InteractiveDominoComponent,
    InteractiveArrowComponent,
  ],
  templateUrl: './simpleDominoGrid.component.html',
  styleUrls: ['./simpleDominoGrid.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimpleDominoGridComponent implements OnChanges, AfterViewInit {
  @Input() dominos: DominoPosition[] = [];
  @Input() arrows: ArrowPosition[] = [];
  @Input() gridLayout: {
    rows: number;
    cols: number;
    width?: number;
    height?: number;
  } = { rows: 3, cols: 3 };
  @Input() animate: boolean = false;
  @Input() showGridInfo: boolean = true;

  @Output() dominoChanged = new EventEmitter<DominoChange>();
  @Output() dominoSelected = new EventEmitter<number>();
  @Output() dominoRotated = new EventEmitter<{
    id: number;
    isVertical: boolean;
  }>();
  @Output() hasEditableDominosChanged = new EventEmitter<boolean>();

  @ViewChild('dominoContainer') dominoContainer!: ElementRef;
  @ViewChildren('dominoComponent')
  dominoComponents!: QueryList<InteractiveDominoComponent>;

  isCustomLayout: boolean = false;
  hasEditableDominos: boolean = false;
  zoomLevel: number = 1;
  customLayoutWidth: number = 500;
  customLayoutHeight: number = 400;

  // Value selection properties
  selectedDomino: DominoPosition | null = null;
  dominoValueOptions: (number | null)[] = [null, 0, 1, 2, 3, 4, 5, 6];

  constructor(private cdr: ChangeDetectorRef) {}

  // Resize handler
  @HostListener('window:resize')
  onResize() {
    this.adjustSizesForViewport();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dominos'] || changes['arrows']) {
      console.log('Arrows detected:', this.arrows?.length);
      console.log('Arrows data:', this.arrows);

      const dominosUseCustomLayout = this.dominos.some(
        (d) => d.exactX !== undefined && d.exactY !== undefined
      );

      const arrowsUseCustomLayout =
        this.arrows &&
        this.arrows.length > 0 &&
        this.arrows.some(
          (a) => a.exactX !== undefined && a.exactY !== undefined
        );

      this.isCustomLayout = dominosUseCustomLayout || arrowsUseCustomLayout;

      if (this.arrows && this.arrows.length > 0) {
        this.isCustomLayout = true;
      }

      const hasEditables = this.dominos.some((d) => d.isEditable);
      this.hasEditableDominos = hasEditables;
      this.hasEditableDominosChanged.emit(hasEditables);

      if (this.isCustomLayout) {
        this.setCustomLayoutDimensions();
      }

      this.setInitialZoom();
    }

    if (changes['arrows']) {
      this.adjustArrowPositionsForLayout();
    }

    if (changes['arrows'] && this.arrows && this.arrows.length > 0) {
      this.showArrowDebugInfo();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.adjustSizesForViewport();
    }, 0);
  }

  // Value selection methods
  selectDomino(domino: DominoPosition): void {
    if (domino.isEditable) {
      // Deselect all dominos first
      this.updateAllDominoSelections(false);

      // Select the new domino
      this.selectedDomino = { ...domino };
      this.updateDominoSelection(domino.id, true);

      this.dominoSelected.emit(domino.id);
      this.cdr.detectChanges();
    }
  }

  deselectDomino(): void {
    if (this.selectedDomino) {
      this.updateDominoSelection(this.selectedDomino.id, false);
    }
    this.selectedDomino = null;
    this.cdr.detectChanges();
  }

  setDominoValue(position: 'top' | 'bottom', value: number | null): void {
    if (!this.selectedDomino) return;

    // Update the selected domino copy
    if (position === 'top') {
      this.selectedDomino.topValue = value;
    } else {
      this.selectedDomino.bottomValue = value;
    }

    // Update the domino in the main array
    const index = this.dominos.findIndex(
      (d) => d.id === this.selectedDomino!.id
    );
    if (index >= 0) {
      this.dominos[index] = { ...this.selectedDomino };

      // Update the domino component directly
      this.updateDominoComponentValues(
        this.selectedDomino.id,
        this.selectedDomino.topValue,
        this.selectedDomino.bottomValue
      );

      // Emit the change
      this.dominoChanged.emit({
        id: this.selectedDomino.id,
        topValue: this.selectedDomino.topValue,
        bottomValue: this.selectedDomino.bottomValue,
      });
    }

    this.cdr.detectChanges();
  }

  clearDominoValues(): void {
    if (!this.selectedDomino) return;

    this.setDominoValue('top', null);
    this.setDominoValue('bottom', null);
  }

  // Helper methods for managing domino component state
  private updateAllDominoSelections(selected: boolean): void {
    this.dominoComponents.forEach((component) => {
      component.setSelected(selected);
    });
  }

  private updateDominoSelection(dominoId: number, selected: boolean): void {
    const component = this.dominoComponents.find(
      (comp) => comp.id === dominoId
    );
    if (component) {
      component.setSelected(selected);
    }
  }

  private updateDominoComponentValues(
    dominoId: number,
    topValue: number | null,
    bottomValue: number | null
  ): void {
    const component = this.dominoComponents.find(
      (comp) => comp.id === dominoId
    );
    if (component) {
      component.setValues(topValue, bottomValue);
    }
  }

  setCustomLayoutDimensions(): void {
    if (!this.isCustomLayout) return;

    console.log('Setting custom layout dimensions');
    console.log('Dominos:', this.dominos.length);
    console.log('Arrows:', this.arrows?.length);

    let maxX = 500;
    let maxY = 300;

    if (this.dominos.length > 0) {
      this.dominos.forEach((domino) => {
        if (domino.exactX !== undefined && domino.exactY !== undefined) {
          const dominoWidth = this.getDominoWidth();
          const dominoHeight = this.getDominoHeight();
          const isVertical = domino.isVertical ?? false;

          const width = isVertical ? dominoWidth : dominoHeight;
          const height = isVertical ? dominoHeight : dominoWidth;

          maxX = Math.max(maxX, domino.exactX + width);
          maxY = Math.max(maxY, domino.exactY + height);
        }
      });
    }

    if (this.arrows && this.arrows.length > 0) {
      this.arrows.forEach((arrow) => {
        if (arrow.exactX !== undefined && arrow.exactY !== undefined) {
          const arrowLength = arrow.length || 100;
          const arrowScale = arrow.scale || 1.0;
          const totalLength = arrowLength * arrowScale;

          maxX = Math.max(maxX, arrow.exactX + totalLength);
          maxY = Math.max(maxY, arrow.exactY + 20);
        }
      });
    }

    this.customLayoutWidth = maxX + 80;
    this.customLayoutHeight = maxY + 80;

    console.log(
      `Custom layout dimensions: ${this.customLayoutWidth}×${this.customLayoutHeight}`
    );
  }

  adjustSizesForViewport(): void {
    if (!this.dominoContainer) return;

    const containerWidth = this.dominoContainer.nativeElement.clientWidth;

    if (this.isCustomLayout) {
      const containerToContentWidthRatio =
        containerWidth / this.customLayoutWidth;
      if (containerToContentWidthRatio < 0.9) {
        this.zoomLevel = Math.min(1, containerToContentWidthRatio * 0.9);
      }
    }
  }

  setInitialZoom(): void {
    if (this.gridLayout) {
      if (this.gridLayout.rows === 1) {
        this.zoomLevel = 1.5;
      } else if (this.gridLayout.rows === 1 && this.gridLayout.cols <= 6) {
        this.zoomLevel = 1.2;
      } else if (this.gridLayout.rows > 2) {
        const baseScale = 0.9;
        const rowScaleFactor = 0.05;
        const rowsOver2 = Math.max(0, this.gridLayout.rows - 2);
        this.zoomLevel = Math.max(0.5, baseScale - rowScaleFactor * rowsOver2);
      } else if (this.gridLayout.cols > 5) {
        this.zoomLevel = 0.9;
      } else {
        this.zoomLevel = 1;
      }
    }
  }

  getDominoWidth(): number {
    const baseSize = 70;

    if (this.isCustomLayout) {
      return baseSize;
    }

    if (this.gridLayout?.cols && this.gridLayout?.cols > 4) {
      return Math.max(50, baseSize - 5 * Math.min(4, this.gridLayout.cols - 4));
    }

    return baseSize;
  }

  getDominoHeight(): number {
    return this.getDominoWidth() * 1.7;
  }

  getDominoTransform(domino: DominoPosition): string {
    try {
      const x = domino.exactX ?? 0;
      const y = domino.exactY ?? 0;
      const angle = domino.angle ?? 0;
      const scale = domino.scale ?? 1;

      return `translate(${x}px, ${y}px) rotate(${angle}deg) scale(${scale})`;
    } catch (err) {
      console.error('Error generating domino transform:', err);
      return 'translate(0, 0)';
    }
  }

  getGridTemplateColumns(): string {
    if (!this.gridLayout?.cols) return 'repeat(3, auto)';
    return `repeat(${this.gridLayout.cols}, auto)`;
  }

  getGridTemplateRows(): string {
    if (!this.gridLayout?.rows) return 'repeat(3, auto)';
    return `repeat(${this.gridLayout.rows}, auto)`;
  }

  getGridGap(): number {
    if (this.gridLayout?.cols && this.gridLayout?.cols > 5) {
      return 5;
    }
    return 10;
  }

  zoomIn(): void {
    if (this.zoomLevel < 2.0) {
      this.zoomLevel = Math.min(2.0, this.zoomLevel + 0.1);
    }
  }

  zoomOut(): void {
    if (this.zoomLevel > 0.3) {
      const decrementAmount = this.zoomLevel > 1 ? 0.1 : 0.05;
      this.zoomLevel = Math.max(0.3, this.zoomLevel - decrementAmount);
    }
  }

  zoomReset(): void {
    this.setInitialZoom();
  }

  onDominoChanged(change: DominoChange): void {
    // Update selected domino if it matches
    if (this.selectedDomino && this.selectedDomino.id === change.id) {
      this.selectedDomino.topValue = change.topValue;
      this.selectedDomino.bottomValue = change.bottomValue;
    }

    this.dominoChanged.emit(change);
  }

  onDominoClicked(id: any): void {
    if (id !== undefined) {
      const domino = this.dominos.find((d) => d.id === Number(id));
      if (domino) {
        this.selectDomino(domino);
      }
    }
  }

  onDominoRotated(event: any): void {
    if (
      event &&
      typeof event.id === 'number' &&
      typeof event.isVertical === 'boolean'
    ) {
      this.dominoRotated.emit(event);
    } else {
      console.error('Invalid domino rotation event format:', event);
    }
  }

  trackByDominoId(index: number, domino: DominoPosition): string {
    return domino.uniqueId || `${domino.questionId || ''}_${domino.id}`;
  }

  trackByArrowId(index: number, arrow: ArrowPosition): string {
    return arrow.uniqueId || `arrow-${arrow.id}`;
  }

  getArrowTransform(arrow: ArrowPosition): string {
    try {
      const x = arrow.exactX !== undefined ? arrow.exactX : 0;
      const y = arrow.exactY !== undefined ? arrow.exactY : 0;
      const angle = arrow.angle !== undefined ? arrow.angle : 0;
      const scale = arrow.scale !== undefined ? arrow.scale : 1.0;

      console.log(
        `Arrow ${arrow.id} transform: x=${x}, y=${y}, angle=${angle}, scale=${scale}`
      );
      return `translate(${x}px, ${y}px) rotate(${angle}deg) scale(${scale})`;
    } catch (err) {
      console.error('Error generating arrow transform:', err, arrow);
      return 'translate(0, 0)';
    }
  }

  showArrowDebugInfo(): void {
    if (!this.arrows || this.arrows.length === 0) {
      console.log('No arrows to debug');
      return;
    }

    console.log('Arrow Debug Information:');
    this.arrows.forEach((arrow) => {
      console.log(`Arrow ${arrow.id}:`, {
        position: `X: ${arrow.exactX}, Y: ${arrow.exactY}`,
        length: arrow.length,
        angle: arrow.angle,
        scale: arrow.scale,
        color: arrow.arrowColor,
        curved: arrow.curved,
        curvature: arrow.curvature,
      });
    });
  }

  adjustArrowPositionsForLayout(): void {
    if (!this.arrows || this.arrows.length === 0) return;

    if (!this.isCustomLayout) {
      this.arrows.forEach((arrow) => {
        if (
          arrow.row !== undefined &&
          arrow.col !== undefined &&
          (arrow.exactX === undefined || arrow.exactY === undefined)
        ) {
          const cellWidth = this.getDominoWidth() + this.getGridGap();
          const cellHeight = this.getDominoHeight() + this.getGridGap();

          arrow.exactX = arrow.col * cellWidth + cellWidth / 2;
          arrow.exactY = arrow.row * cellHeight + cellHeight / 2;
        }
      });
    }

    if (
      this.isCustomLayout &&
      this.arrows.some((a) => a.exactX === undefined)
    ) {
      const centerX = this.customLayoutWidth / 2;
      const centerY = this.customLayoutHeight / 2;

      let posX = 50;

      this.arrows.forEach((arrow) => {
        if (arrow.exactX === undefined) {
          arrow.exactX = posX;
          posX += 100;
        }
        if (arrow.exactY === undefined) {
          arrow.exactY = centerY;
        }
      });
    }
  }
}
