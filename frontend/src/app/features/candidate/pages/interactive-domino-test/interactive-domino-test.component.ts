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
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container">
      <h1>Interactive Domino Test</h1>
      <p>A more complex test using interactive dominos</p>

      <!-- Simple controls for better performance -->
      <div class="controls">
        <label>
          <input
            type="checkbox"
            [checked]="showGridLines"
            (change)="toggleGridLines()"
          />
          Show Grid Lines
        </label>
        <label>
          <input
            type="checkbox"
            [checked]="showDebug"
            (change)="toggleDebug()"
          />
          Show Debug Info
        </label>
        <button (click)="resetGrid()" class="btn">Reset Grid</button>
      </div>

      <div class="grid-wrap">
        <app-interactive-domino-grid
          [dominos]="dominos"
          [gridSize]="gridSize"
          [showGridLines]="showGridLines"
          [showDebug]="showDebug"
          (dominoChanged)="onDominoChanged($event)"
          (dominoSelected)="onDominoSelected($event)"
        ></app-interactive-domino-grid>
      </div>

      <div class="activity-log" *ngIf="activityLog.length > 0">
        <h3>Activity Log</h3>
        <div class="log-entries">
          <div *ngFor="let entry of activityLog.slice(0, 5)" class="log-entry">
            {{ entry }}
          </div>
        </div>
        <button (click)="clearLog()" class="btn btn-small">Clear Log</button>
      </div>

      <div class="navigation">
        <a routerLink="/svg-test" class="btn">Back to SVG Test</a>
        <a routerLink="/simple-domino-grid" class="btn">Simple Grid Test</a>
      </div>
    </div>
  `,
  styles: [
    `
      .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        font-family: Arial, sans-serif;
      }

      .controls {
        display: flex;
        gap: 15px;
        margin-bottom: 20px;
        align-items: center;
      }

      .controls label {
        margin-right: 15px;
      }

      .grid-wrap {
        border: 1px solid #ddd;
        padding: 10px;
        margin: 20px 0;
        border-radius: 5px;
        background-color: white;
      }

      .activity-log {
        border: 1px solid #eee;
        padding: 15px;
        margin: 20px 0;
        border-radius: 5px;
        background-color: #fafafa;
        max-height: 200px;
        overflow-y: auto;
      }

      .log-entries {
        margin-bottom: 10px;
      }

      .log-entry {
        padding: 5px;
        border-bottom: 1px solid #eee;
        font-family: monospace;
        font-size: 12px;
      }

      .navigation {
        display: flex;
        gap: 10px;
        margin-top: 30px;
      }

      .btn {
        padding: 8px 16px;
        background-color: #3b82f6;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        text-decoration: none;
        display: inline-block;
      }

      .btn-small {
        padding: 5px 10px;
        font-size: 12px;
      }
    `,
  ],
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
