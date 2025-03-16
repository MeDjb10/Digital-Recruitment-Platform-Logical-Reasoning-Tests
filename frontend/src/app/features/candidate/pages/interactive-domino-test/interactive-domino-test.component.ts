import {
  Component,
  ErrorHandler,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  InteractiveDominoGridComponent,
  DominoPosition,
  DominoChange,
} from '../../components/interactive-domino-grid/interactive-domino-grid.component';

@Component({
  selector: 'app-interactive-domino-test',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    InteractiveDominoGridComponent,
  ],
  templateUrl: './interactive-domino-test.component.html',
  styleUrls: ['./interactive-domino-test.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InteractiveDominoTestComponent {
  // Use a simpler set of dominos to reduce complexity
  dominos: DominoPosition[] = [
    { id: 1, row: 0, col: 0, topValue: 1, bottomValue: 2, isEditable: false },
    { id: 2, row: 0, col: 1, topValue: 2, bottomValue: 3, isEditable: false },
    {
      id: 4,
      row: 1,
      col: 1,
      topValue: null,
      bottomValue: null,
      isEditable: true,
    },
  ];

  gridSize = { rows: 2, cols: 2 };
  showGridLines = false;
  showDebug = false;
  activityLog: string[] = [];

  // Reference to the grid component
  @ViewChild(InteractiveDominoGridComponent)
  dominoGrid?: InteractiveDominoGridComponent;

  constructor(
    private cdr: ChangeDetectorRef,
    private errorHandler: ErrorHandler
  ) {
    // Add error handling
    window.addEventListener('error', (e) => {
      this.handleError('window error', e.message);
      return false;
    });
  }

  toggleGridLines() {
    this.showGridLines = !this.showGridLines;
    this.cdr.markForCheck();
  }

  toggleDebug() {
    this.showDebug = !this.showDebug;
    this.cdr.markForCheck();
  }

  resetGrid() {
    try {
      // Reset the data model
      this.dominos = [
        {
          id: 1,
          row: 0,
          col: 0,
          topValue: 1,
          bottomValue: 2,
          isEditable: false,
        },
        {
          id: 2,
          row: 0,
          col: 1,
          topValue: 2,
          bottomValue: 3,
          isEditable: false,
        },
        {
          id: 4,
          row: 1,
          col: 1,
          topValue: null,
          bottomValue: null,
          isEditable: true,
        },
      ];

      // Also use the grid's reset method if available
      if (this.dominoGrid) {
        setTimeout(() => this.dominoGrid?.resetEditableDominos(), 0);
      }

      this.addLogEntry('Grid reset to initial state');
      this.cdr.markForCheck();
    } catch (err) {
      this.handleError('reset', err);
    }
  }

  onDominoChanged(change: DominoChange) {
    try {
      this.addLogEntry(
        `Domino ${change.id} changed: top=${change.topValue}, bottom=${change.bottomValue}`
      );
      this.cdr.markForCheck();
    } catch (err) {
      this.handleError('domino change', err);
    }
  }

  onDominoSelected(id: number) {
    try {
      this.addLogEntry(`Domino ${id} selected`);
      this.cdr.markForCheck();
    } catch (err) {
      this.handleError('domino selection', err);
    }
  }

  addLogEntry(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.activityLog.unshift(`[${timestamp}] ${message}`);

    // Keep log to a reasonable size
    if (this.activityLog.length > 20) {
      this.activityLog = this.activityLog.slice(0, 20);
    }
  }

  clearLog() {
    this.activityLog = [];
    this.cdr.markForCheck();
  }

  private handleError(operation: string, error: any) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error during ${operation}:`, error);
    this.addLogEntry(`Error: ${message}`);
    this.errorHandler.handleError(error);
  }
}
