import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
  AfterViewInit,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  InteractiveDominoGridComponent,
  DominoPosition,
  DominoChange,
} from '../../components/interactive-domino-grid/interactive-domino-grid.component';
import { DominoTestService } from '../../services/domino-test.service';
import { Subscription, interval } from 'rxjs';
import { take } from 'rxjs/operators';

interface Question {
  id: number;
  dominos: DominoPosition[];
  gridLayout: { rows: number; cols: number };
  answered: boolean;
  flaggedForReview: boolean;
  userAnswer?: {
    dominoId: number;
    topValue: number | null;
    bottomValue: number | null;
  };
  timeSpent: number; // in seconds
  visited: boolean;
  visits: number;
}

@Component({
  selector: 'app-domino-test',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    InteractiveDominoGridComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="test-container">
      <!-- Header with timer -->
      <header class="test-header">
        <div class="test-info">
          <h1>{{ testName }}</h1>
          <span class="question-counter"
            >Question {{ currentQuestionIndex + 1 }} of
            {{ questions.length }}</span
          >
        </div>

        <div
          class="timer"
          [ngClass]="{ 'timer-warning': timeLeft <= warningThreshold }"
        >
          <i class="pi pi-clock"></i>
          <span>{{ formatTime(timeLeft) }}</span>
        </div>
      </header>

      <!-- Main test area with grid and navigation -->
      <main class="test-body">
        <aside class="question-nav">
          <div class="question-nav-header">
            <h3>Questions</h3>
            <div class="legend">
              <div class="legend-item">
                <div class="legend-color current"></div>
                <span>Current</span>
              </div>
              <div class="legend-item">
                <div class="legend-color answered"></div>
                <span>Answered</span>
              </div>
              <div class="legend-item">
                <div class="legend-color flagged"></div>
                <span>Flagged</span>
              </div>
            </div>
          </div>
          <div class="question-list">
            <div
              *ngFor="let question of questions; let i = index"
              class="question-nav-row"
              [ngClass]="{
                current: i === currentQuestionIndex
              }"
            >
              <button
                class="question-nav-item"
                [ngClass]="{
                  visited: question.visited,
                  answered: question.answered,
                  flagged: question.flaggedForReview
                }"
                (click)="goToQuestion(i)"
              >
                <span class="question-number">{{ i + 1 }}</span>
                <span class="question-label">Question {{ i + 1 }}</span>
                <div class="question-status">
                  <span
                    *ngIf="question.answered"
                    class="status-icon answered-icon"
                    title="Answered"
                    >✓</span
                  >
                  <span
                    *ngIf="question.flaggedForReview"
                    class="status-icon flag-icon"
                    title="Flagged for review"
                  >
                    <i class="pi pi-flag"></i>
                  </span>
                </div>
              </button>
            </div>
          </div>
        </aside>

        <section
          class="question-area"
          [class.rhombus-pattern]="isRhombusPattern()"
        >
          <div class="question-instructions">
            <div class="instruction-header">
              <h2>Question {{ currentQuestionIndex + 1 }}</h2>
              <button
                class="flag-button"
                [class.flagged]="currentQuestion?.flaggedForReview"
                (click)="toggleFlag()"
                title="{{
                  currentQuestion?.flaggedForReview
                    ? 'Unflag question'
                    : 'Flag for review'
                }}"
              >
                <i
                  class="pi"
                  [ngClass]="
                    currentQuestion?.flaggedForReview
                      ? 'pi-flag-fill'
                      : 'pi-flag'
                  "
                ></i>
                {{
                  currentQuestion?.flaggedForReview
                    ? 'Flagged'
                    : 'Flag for Review'
                }}
              </button>
            </div>
            <p class="instruction-text">
              Find the missing values for the empty domino that best completes
              the pattern.
            </p>
          </div>

          <!-- Domino grid -->
          <div
            class="domino-grid-container"
            [class.rhombus-container]="isRhombusPattern()"
            #gridContainer
          >
            <!-- Help tooltip now in the domino-test component -->
            <div class="help-tooltip" *ngIf="hasEditableDominos && showTooltip">
              <div class="tooltip-content">
                <button class="close-tooltip" (click)="dismissTooltip()">
                  ×
                </button>
                <h4>How to interact:</h4>
                <ul>
                  <li>Click on an empty domino to select it</li>
                  <li>Click on the top or bottom half to add dots</li>
                  <li>Continue clicking to cycle through values 1-6</li>
                </ul>
              </div>
            </div>

            <app-interactive-domino-grid
              *ngIf="currentQuestion"
              [dominos]="currentQuestion.dominos"
              [gridSize]="currentQuestion.gridLayout"
              [zoomControlsEnabled]="false"
              [showConnections]="false"
              [showDebug]="false"
              (dominoChanged)="onDominoChanged($event)"
              (dominoSelected)="onDominoSelected($event)"
              (dominoRotated)="onDominoRotated($event)"
              (zoomLevelChanged)="onZoomLevelChanged($event)"
              (hasEditableDominosChanged)="onHasEditableDominosChanged($event)"
            ></app-interactive-domino-grid>

            <!-- Zoom controls moved to domino-test component -->
            <div
              class="zoom-controls-container"
              [class.zoom-active]="isZoomActive"
              (mouseenter)="activateZoomControls()"
              (mouseleave)="deactivateZoomControls()"
            >
              <div class="zoom-controls">
                <button class="zoom-btn" (click)="zoomIn()" title="Zoom In">
                  <i class="pi pi-plus"></i>
                </button>
                <span class="zoom-level-indicator"
                  >{{ (zoomLevel * 100).toFixed(0) }}%</span
                >
                <button
                  class="zoom-btn"
                  (click)="zoomReset()"
                  title="Reset Zoom"
                >
                  <i class="pi pi-refresh"></i>
                </button>
                <button class="zoom-btn" (click)="zoomOut()" title="Zoom Out">
                  <i class="pi pi-minus"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Question controls -->
          <div class="question-controls">
            <button
              class="btn btn-secondary"
              (click)="previousQuestion()"
              [disabled]="currentQuestionIndex === 0"
            >
              <i class="pi pi-arrow-left"></i>
              Previous
            </button>

            <button
              class="btn btn-outline"
              (click)="toggleFlag()"
              [class.btn-flagged]="currentQuestion?.flaggedForReview"
            >
              <i
                class="pi"
                [ngClass]="
                  currentQuestion?.flaggedForReview ? 'pi-flag-fill' : 'pi-flag'
                "
              ></i>
              {{
                currentQuestion?.flaggedForReview ? 'Unflag' : 'Flag for Review'
              }}
            </button>

            <button
              class="btn btn-primary"
              (click)="nextQuestion()"
              [disabled]="currentQuestionIndex === questions.length - 1"
            >
              Next
              <i class="pi pi-arrow-right"></i>
            </button>
          </div>
        </section>
      </main>

      <!-- Footer with progress and submit -->
      <footer class="test-footer">
        <div class="test-progress">
          <div class="progress-stats">
            <span>{{ answeredCount }} / {{ questions.length }} answered</span>
            <span *ngIf="flaggedCount > 0" class="flagged-count">
              <i class="pi pi-flag"></i> {{ flaggedCount }} flagged
            </span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              [style.width.%]="progressPercentage"
            ></div>
          </div>
        </div>

        <button class="btn btn-finish" (click)="finishTest()">
          <i class="pi pi-check-circle"></i>
          {{
            answeredCount === questions.length
              ? 'Submit Test'
              : 'Review & Submit'
          }}
        </button>
      </footer>
    </div>
  `,
  styles: [
    `
      .test-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background-color: #f5f7fa;
        overflow: hidden;
      }

      .test-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 2rem; /* Reduced from 1rem */
        background-color: white;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        z-index: 10;
        border-bottom: 1px solid #e2e8f0;
      }

      .test-info h1 {
        font-size: 1.5rem;
        margin: 0;
        color: #1e293b;
        font-weight: 700;
      }

      .question-counter {
        font-size: 0.875rem;
        color: #64748b;
        display: block;
        margin-top: 0.25rem;
      }

      .timer {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.25rem;
        background-color: #f1f5f9;
        border-radius: 0.5rem;
        font-weight: 600;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      .timer-warning {
        background-color: #fee2e2;
        color: #b91c1c;
        animation: pulse 2s infinite;
      }

      .test-body {
        display: flex;
        flex: 1;
        overflow: hidden;
      }

      .question-nav {
        width: 280px;
        background-color: white;
        border-right: 1px solid #e2e8f0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }

      .question-nav-header {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid #e2e8f0;
      }

      .question-nav-header h3 {
        margin: 0 0 12px 0;
        font-size: 1rem;
        color: #0f172a;
      }

      .legend {
        display: flex;
        gap: 12px;
        margin-top: 8px;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: #64748b;
      }

      .legend-color {
        width: 12px;
        height: 12px;
        border-radius: 3px;
      }

      .legend-color.current {
        background-color: #3b82f6;
      }

      .legend-color.answered {
        background-color: #10b981;
      }

      .legend-color.flagged {
        background-color: #f59e0b;
      }

      .question-list {
        flex: 1;
        padding: 1rem 0;
        overflow-y: auto;
      }

      .question-nav-row {
        padding: 0.25rem 1rem;
        border-left: 3px solid transparent;
        transition: background-color 0.2s ease;
      }

      .question-nav-row.current {
        background-color: rgba(59, 130, 246, 0.1);
        border-left-color: #3b82f6;
      }

      .question-nav-row:hover {
        background-color: #f8fafc;
      }

      .question-nav-item {
        display: flex;
        width: 100%;
        align-items: center;
        padding: 0.75rem 1rem;
        border-radius: 0.375rem;
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        transition: all 0.2s ease;
        cursor: pointer;
        text-align: left;
      }

      .question-number {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: #e2e8f0;
        color: #475569;
        font-weight: 600;
        margin-right: 0.75rem;
        flex-shrink: 0;
      }

      .question-label {
        flex: 1;
        font-size: 0.875rem;
        color: #475569;
      }

      .question-status {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .status-icon {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        font-size: 10px;
      }

      .answered-icon {
        background-color: #10b981;
        color: white;
      }

      .flag-icon {
        color: #f59e0b;
      }

      .question-nav-item.current {
        background-color: #3b82f6;
        color: white;
        border-color: #2563eb;
      }

      .question-nav-item.current .question-number {
        background-color: white;
        color: #3b82f6;
      }

      .question-nav-item.current .question-label {
        color: white;
      }

      .question-nav-item.visited {
        border-color: #94a3b8;
      }

      .question-nav-item.answered {
        background-color: #f0fdfa;
        border-color: #10b981;
      }

      .question-nav-item.answered .question-number {
        background-color: #10b981;
        color: white;
      }

      .question-nav-item.flagged {
        background-color: #fef3c7;
        border-color: #f59e0b;
      }

      .question-nav-item.flagged .question-number {
        background-color: #f59e0b;
        color: white;
      }

      .question-area {
        flex: 1;
        padding: 1.5rem 2rem; /* Reduced from 2rem */
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        background-color: #f8fafc;
      }

      .question-instructions {
        margin-bottom: 1rem; /* Reduced from 1.5rem */
        background-color: white;
        padding: 1rem; /* Reduced from 1.25rem */
        border-radius: 0.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      .instruction-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem; /* Reduced from 0.75rem */
      }

      .instruction-header h2 {
        margin: 0;
        font-size: 1.25rem;
        color: #0f172a;
      }

      .flag-button {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        border: 1px solid #e2e8f0;
        background-color: white;
        color: #64748b;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .flag-button:hover {
        background-color: #f8fafc;
      }

      .flag-button.flagged {
        background-color: #fef3c7;
        border-color: #f59e0b;
        color: #92400e;
      }

      .instruction-text {
        color: #475569;
        line-height: 1.4; /* Slightly condensed */
        margin: 0;
      }

      .domino-grid-container {
        display: flex;
        justify-content: flex-start; /* Changed from center to align to the left */
        align-items: center;
        flex: 1;
        margin: 0.75rem 0 1.5rem; /* Reduced top margin */
        background-color: white;
        border-radius: 0.75rem;
        padding: 1rem 2rem; /* Adjusted padding */
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        position: relative; /* Important: needed for absolute positioning of tooltip and controls */
        overflow: visible; /* Changed from hidden to prevent cutting off dominos */
        min-height: 450px; /* Increased minimum height */
        width: 100%; /* Ensure full width is used */
      }

      /* Make the grid container responsive to domino layout */
      .domino-grid-container ::ng-deep .grid-container {
        width: auto; /* Changed from 100% to auto to respect natural width */
        min-width: 90%; /* Wider grid */
        height: 100%;
        min-height: 380px;
        margin-left: 0; /* Align to the left */
      }

      /* Ensure the grid takes up available space */
      .domino-grid-container ::ng-deep .grid {
        min-height: 350px;
      }

      /* Add more space around dominos in special patterns */
      .domino-grid-container ::ng-deep .domino-wrapper {
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
      }

      /* Increase visibility of editable dominos */
      .domino-grid-container ::ng-deep .editable-domino {
        filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.6));
      }

      /* Adjust container size based on screen size */
      @media (min-width: 1200px) {
        .domino-grid-container {
          min-height: 500px; /* Even larger on big screens */
        }

        .domino-grid-container ::ng-deep .grid-container {
          min-height: 450px;
        }
      }

      @media (max-width: 768px) {
        .domino-grid-container {
          min-height: 380px;
          padding: 1.5rem;
        }
      }

      /* Help tooltip styling */
      .help-tooltip {
        position: absolute;
        top: 15px;
        right: 15px;
        z-index: 30;
        max-width: 300px;
      }

      .tooltip-content {
        background-color: white;
        border-radius: 8px;
        padding: 12px 15px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        border: 1px solid #e2e8f0;
        position: relative;
      }

      .tooltip-content h4 {
        margin: 0 0 8px 0;
        color: #334155;
        font-size: 14px;
        font-weight: 600;
      }

      .tooltip-content ul {
        margin: 0;
        padding-left: 20px;
        font-size: 13px;
        color: #64748b;
      }

      .tooltip-content li {
        margin-bottom: 4px;
      }

      .close-tooltip {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: none;
        background-color: #f1f5f9;
        color: #64748b;
        font-size: 16px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      /* Zoom controls styling */
      .zoom-controls-container {
        position: absolute;
        bottom: 15px;
        right: 15px;
        z-index: 30;
        padding: 5px;
        transition: all 0.3s ease;
        border-radius: 20px;
        opacity: 0.7;
      }

      .zoom-controls-container.zoom-active,
      .zoom-controls-container:hover {
        opacity: 1;
        background-color: rgba(255, 255, 255, 0.9);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }

      .zoom-controls {
        display: flex;
        align-items: center;
        gap: 5px;
        background-color: white;
        border-radius: 20px;
        padding: 5px 10px;
      }

      .zoom-level-indicator {
        font-size: 12px;
        font-weight: 600;
        color: #64748b;
        min-width: 40px;
        text-align: center;
      }

      .zoom-btn {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 1px solid #e2e8f0;
        background-color: white;
        color: #64748b;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
      }

      .zoom-btn:hover {
        background-color: #f1f5f9;
        color: #334155;
        transform: scale(1.1);
      }

      .question-controls {
        display: flex;
        justify-content: space-between;
        margin-top: 1rem; /* Reduced from 1.5rem */
      }

      .test-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        background-color: white;
        border-top: 1px solid #e2e8f0;
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.03);
      }

      .test-progress {
        display: flex;
        flex-direction: column;
        width: 60%;
      }

      .progress-stats {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 0.5rem;
      }

      .progress-stats span {
        font-size: 0.875rem;
        font-weight: 500;
        color: #475569;
      }

      .flagged-count {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #92400e;
      }

      .flagged-count i {
        color: #f59e0b;
      }

      .progress-bar {
        height: 8px;
        background-color: #e2e8f0;
        border-radius: 4px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background-color: #3b82f6;
        border-radius: 4px;
        transition: width 0.3s ease;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.75rem 1.25rem;
        border-radius: 0.5rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        font-size: 0.9375rem;
      }

      .btn-primary {
        background-color: #3b82f6;
        color: white;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }

      .btn-primary:hover {
        background-color: #2563eb;
      }

      .btn-primary:disabled {
        background-color: #93c5fd;
        cursor: not-allowed;
      }

      .btn-secondary {
        background-color: #f1f5f9;
        color: #334155;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }

      .btn-secondary:hover {
        background-color: #e2e8f0;
      }

      .btn-secondary:disabled {
        color: #94a3b8;
        cursor: not-allowed;
      }

      .btn-outline {
        background-color: transparent;
        border: 1px solid #cbd5e1;
        color: #64748b;
      }

      .btn-outline:hover {
        background-color: #f8fafc;
        border-color: #94a3b8;
      }

      .btn-outline.btn-flagged {
        background-color: #fef3c7;
        border-color: #f59e0b;
        color: #92400e;
      }

      .btn-outline.btn-flagged:hover {
        background-color: #fde68a;
      }

      .btn-finish {
        background-color: #10b981;
        color: white;
        padding: 0.75rem 1.5rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .btn-finish:hover {
        background-color: #059669;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.7;
        }
      }

      /* Responsive adjustments */
      @media (max-width: 1024px) {
        .question-nav {
          width: 240px;
        }
      }

      @media (max-width: 768px) {
        .test-body {
          flex-direction: column;
        }

        .question-nav {
          width: 100%;
          height: auto;
          max-height: 200px;
          border-right: none;
          border-bottom: 1px solid #e2e8f0;
        }

        .domino-grid-container {
          padding: 1.5rem;
        }

        .test-progress {
          width: 100%;
          margin-bottom: 1rem;
        }

        .test-footer {
          flex-direction: column;
          gap: 1rem;
        }
      }

      /* Specific styling for rhombus pattern */
      .rhombus-pattern .domino-grid-container {
        min-height: 650px; /* Increased minimum height significantly for rhombus patterns */
        transition: min-height 0.3s ease-in-out;
      }

      @media (min-width: 1200px) {
        .rhombus-pattern .domino-grid-container {
          min-height: 700px; /* Even more height on larger screens */
        }
      }

      @media (max-width: 768px) {
        .rhombus-pattern .domino-grid-container {
          min-height: 600px;
        }
      }

      @media (min-height: 900px) {
        .rhombus-pattern .domino-grid-container {
          min-height: 750px;
        }
      }
    `,
  ],
})
export class DominoTestComponent
  implements OnInit, OnDestroy, AfterViewInit, AfterViewChecked
{
  testId: string = '';
  testName: string = 'Logical Reasoning Test (D-70)';
  questions: Question[] = [];
  currentQuestionIndex: number = 0;
  currentQuestion: Question | null = null;

  // Timer
  timeLeft: number = 25 * 60; // 25 minutes in seconds
  warningThreshold: number = 300; // 5 minutes warning
  timerSubscription?: Subscription;

  // Question tracking
  lastQuestionChangeTime: number = 0;

  // Reference to the grid component
  @ViewChild(InteractiveDominoGridComponent)
  dominoGrid?: InteractiveDominoGridComponent;

  // Add properties for zoom functionality and help tooltip
  zoomLevel: number = 1;
  isZoomActive: boolean = false;
  hasEditableDominos: boolean = false;
  showTooltip: boolean = true;

  @ViewChild('gridContainer') gridContainerRef?: ElementRef;

  // Track whether heights have been synchronized
  private heightSynchronized = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dominoTestService: DominoTestService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.testId = params['id'] || 'd70';
      this.loadTest();
      this.startTimer();
    });
  }

  ngOnDestroy() {
    this.stopTimer();
    this.saveTestProgress();
  }

  loadTest() {
    // In a real app, you would load the test from your service
    // Try to load saved progress first
    const savedProgress = this.dominoTestService.loadProgress(this.testId);

    if (savedProgress) {
      this.questions = savedProgress.questions;
      this.currentQuestionIndex = savedProgress.currentQuestionIndex;
      this.timeLeft = savedProgress.timeLeft;
      this.testName = savedProgress.testName || this.testName;
    } else {
      // Create new test if no saved progress
      this.dominoTestService.getTest(this.testId).subscribe({
        next: (test) => {
          if (test) {
            this.testName = test.name;
            this.questions = test.questions;
            this.timeLeft = test.duration * 60; // Convert minutes to seconds
          } else {
            // Fallback to sample questions if API fails
            this.questions = this.createSampleQuestions();
          }
          this.currentQuestion = this.questions[this.currentQuestionIndex];
          this.markQuestionAsVisited(this.currentQuestionIndex);
          this.cdr.markForCheck();
        },
        error: () => {
          // Fallback to sample questions on error
          this.questions = this.createSampleQuestions();
          this.currentQuestion = this.questions[this.currentQuestionIndex];
          this.markQuestionAsVisited(this.currentQuestionIndex);
          this.cdr.markForCheck();
        },
      });
    }

    if (this.questions.length > 0) {
      this.currentQuestion = this.questions[this.currentQuestionIndex];
      this.markQuestionAsVisited(this.currentQuestionIndex);
    }
    this.cdr.markForCheck();
  }

  createSampleQuestions(): Question[] {
    // Create a few sample questions
    return [
      {
        id: 1,
        dominos: [
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
            id: 3,
            row: 0,
            col: 2,
            topValue: 3,
            bottomValue: 4,
            isEditable: false,
          },
          {
            id: 4,
            row: 0,
            col: 3,
            topValue: 4,
            bottomValue: 5,
            isEditable: false,
          },
          {
            id: 5,
            row: 0,
            col: 4,
            topValue: 5,
            bottomValue: 6,
            isEditable: false,
          },
          {
            id: 6,
            row: 0,
            col: 5,
            topValue: null,
            bottomValue: null,
            isEditable: true,
          },
        ],
        gridLayout: { rows: 1, cols: 6 },
        answered: false,
        flaggedForReview: false,
        timeSpent: 0,
        visited: false,
        visits: 0,
      },
      {
        id: 2,
        dominos: [
          {
            id: 1,
            row: 0,
            col: 0,
            topValue: 3,
            bottomValue: 3,
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
            id: 3,
            row: 0,
            col: 2,
            topValue: 1,
            bottomValue: 3,
            isEditable: false,
          },
          {
            id: 4,
            row: 1,
            col: 0,
            topValue: 3,
            bottomValue: 2,
            isEditable: false,
          },
          {
            id: 5,
            row: 1,
            col: 1,
            topValue: null,
            bottomValue: null,
            isEditable: true,
          },
          {
            id: 6,
            row: 1,
            col: 2,
            topValue: 3,
            bottomValue: 0,
            isEditable: false,
          },
        ],
        gridLayout: { rows: 2, cols: 3 },
        answered: false,
        flaggedForReview: false,
        timeSpent: 0,
        visited: false,
        visits: 0,
      },
      // Sample with rhombus shape
      {
        id: 3,
        dominos: [
          {
            id: 1,
            row: 0,
            col: 1,
            topValue: 1,
            bottomValue: 4,
            isEditable: false,
          },
          {
            id: 2,
            row: 1,
            col: 0,
            topValue: 3,
            bottomValue: 5,
            isEditable: false,
          },
          {
            id: 3,
            row: 1,
            col: 2,
            topValue: 2,
            bottomValue: 6,
            isEditable: false,
          },
          {
            id: 4,
            row: 2,
            col: 1,
            topValue: null,
            bottomValue: null,
            isEditable: true,
          },
        ],
        gridLayout: { rows: 3, cols: 3 },
        answered: false,
        flaggedForReview: false,
        timeSpent: 0,
        visited: false,
        visits: 0,
      },
    ];
  }

  startTimer() {
    this.lastQuestionChangeTime = Date.now();
    this.timerSubscription = interval(1000).subscribe(() => {
      this.timeLeft--;

      // Update time spent on current question
      if (this.currentQuestion) {
        this.currentQuestion.timeSpent += 1;
      }

      // Auto-save progress every minute
      if (this.timeLeft % 60 === 0) {
        this.saveTestProgress();
      }

      // Check if time's up
      if (this.timeLeft <= 0) {
        this.stopTimer();
        // Don't auto-submit, just notify the user
        alert("Time's up! Please review your answers and submit the test.");
      }

      this.cdr.markForCheck();
    });
  }

  stopTimer() {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }

  goToQuestion(index: number) {
    // Update time spent on current question before switching
    this.updateCurrentQuestionTime();

    // Store the old question type (rhombus or not) to detect changes
    const wasRhombusPattern = this.isRhombusPattern();

    this.currentQuestionIndex = index;
    this.currentQuestion = this.questions[index];

    // Reset height synchronization flag when changing questions
    // Only if we're coming from a rhombus pattern or going to a different pattern
    if (wasRhombusPattern !== this.isRhombusPattern()) {
      this.heightSynchronized = false;

      // If we're transitioning from a rhombus to non-rhombus, reset the height
      if (wasRhombusPattern && !this.isRhombusPattern()) {
        this.resetGridHeight();
      }
    }

    // Reset empty dominos in the next question after a short delay
    // to ensure the grid component is properly initialized
    setTimeout(() => {
      if (this.dominoGrid) {
        this.dominoGrid.resetEditableDominos();

        // Reset zoom level when changing questions
        if ('zoomReset' in this.dominoGrid) {
          (this.dominoGrid as any).zoomReset();
        }
      }
    }, 50);

    this.markQuestionAsVisited(index);
    this.lastQuestionChangeTime = Date.now();
    this.cdr.markForCheck();

    // Reset zoom level when changing questions
    if (this.dominoGrid) {
      this.dominoGrid.zoomReset();
    }
    this.zoomLevel = 1;
    this.isZoomActive = false;

    // Reset tooltip visibility when changing questions
    // Only show after first question if user hasn't dismissed
    if (index === 0 || this.showTooltip) {
      this.showTooltip = true;
    }

    // Reset height synchronization flag when changing questions
    this.heightSynchronized = false;
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.goToQuestion(this.currentQuestionIndex + 1);
    }
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.goToQuestion(this.currentQuestionIndex - 1);
    }
  }

  toggleFlag() {
    if (this.currentQuestion) {
      this.currentQuestion.flaggedForReview =
        !this.currentQuestion.flaggedForReview;
      this.cdr.markForCheck();
    }
  }

  onDominoChanged(change: DominoChange) {
    if (this.currentQuestion) {
      // Find the editable domino
      const editableDomino = this.currentQuestion.dominos.find(
        (d) => d.isEditable && d.id === change.id
      );

      if (editableDomino) {
        // Update the user answer
        editableDomino.topValue = change.topValue;
        editableDomino.bottomValue = change.bottomValue;

        this.currentQuestion.userAnswer = {
          dominoId: change.id,
          topValue: change.topValue,
          bottomValue: change.bottomValue,
        };

        // Mark question as answered if both values are provided
        this.currentQuestion.answered =
          change.topValue !== null && change.bottomValue !== null;

        this.cdr.markForCheck();
      }
    }
  }

  onDominoSelected(id: number) {
    // You can add additional logging or analytics here if needed
  }

  onDominoRotated(event: { id: number; isVertical: boolean }) {
    if (this.currentQuestion) {
      const domino = this.currentQuestion.dominos.find(
        (d) => d.id === event.id
      );
      if (domino) {
        domino.isVertical = event.isVertical;
        this.cdr.markForCheck();
      }
    }
  }

  markQuestionAsVisited(index: number) {
    const question = this.questions[index];
    if (!question.visited) {
      question.visited = true;
    }
    question.visits++;
  }

  updateCurrentQuestionTime() {
    if (this.currentQuestion) {
      const currentTime = Date.now();
      const timeSpent = Math.floor(
        (currentTime - this.lastQuestionChangeTime) / 1000
      );
      this.currentQuestion.timeSpent += timeSpent;
    }
  }

  get answeredCount(): number {
    return this.questions.filter((q) => q.answered).length;
  }

  get progressPercentage(): number {
    return (this.answeredCount / this.questions.length) * 100;
  }

  get flaggedCount(): number {
    return this.questions.filter((q) => q.flaggedForReview).length;
  }

  saveTestProgress() {
    // Update time spent on current question first
    this.updateCurrentQuestionTime();

    const progress = {
      testId: this.testId,
      testName: this.testName,
      questions: this.questions,
      currentQuestionIndex: this.currentQuestionIndex,
      timeLeft: this.timeLeft,
      timestamp: new Date().toISOString(),
    };

    this.dominoTestService.saveProgress(this.testId, progress);
  }

  finishTest() {
    this.saveTestProgress();

    // If not all questions are answered, show confirmation
    if (this.answeredCount < this.questions.length) {
      const confirm = window.confirm(
        `You have ${
          this.questions.length - this.answeredCount
        } unanswered questions. Are you sure you want to submit the test?`
      );

      if (!confirm) return;
    }

    // Submit the test
    this.dominoTestService.submitTest(this.testId, this.questions).subscribe({
      next: (result) => {
        // Navigate to results page
        this.router.navigate(['/test-completion'], {
          state: {
            testId: this.testId,
            testName: this.testName,
            score: result.score,
            totalQuestions: this.questions.length,
            timeSpent: 25 * 60 - this.timeLeft, // Total seconds spent
          },
        });
      },
      error: (err) => {
        console.error('Error submitting test:', err);
        alert('There was an error submitting your test. Please try again.');
      },
    });
  }

  // Add new methods for controlling zoom
  zoomIn(): void {
    if (this.dominoGrid) {
      this.dominoGrid.zoomIn();
      this.isZoomActive = true;
    }
  }

  zoomOut(): void {
    if (this.dominoGrid) {
      this.dominoGrid.zoomOut();
      this.isZoomActive = true;
    }
  }

  zoomReset(): void {
    if (this.dominoGrid) {
      this.dominoGrid.zoomReset();
      this.isZoomActive = false;
    }
  }

  activateZoomControls(): void {
    this.isZoomActive = true;
  }

  deactivateZoomControls(): void {
    // Only deactivate if not currently zooming
    if (this.zoomLevel === 1) {
      this.isZoomActive = false;
    }
  }

  dismissTooltip(): void {
    this.showTooltip = false;
  }

  onZoomLevelChanged(level: number): void {
    this.zoomLevel = level;
    this.cdr.markForCheck();
  }

  onHasEditableDominosChanged(hasEditables: boolean): void {
    this.hasEditableDominos = hasEditables;
    this.cdr.markForCheck();
  }

  // Add method to detect if current question has a rhombus pattern
  isRhombusPattern(): boolean {
    if (!this.currentQuestion || !this.currentQuestion.dominos) return false;

    const dominos = this.currentQuestion.dominos;

    // Check for rhombus pattern characteristics - first approach: check if it's question 3
    if (this.currentQuestionIndex === 2) return true;

    // Second approach: analyze the grid structure to detect rhombus pattern
    if (dominos.length !== 4) return false;

    // Get all unique rows and columns
    const uniqueRows = [...new Set(dominos.map((d) => d.row))];
    const uniqueCols = [...new Set(dominos.map((d) => d.col))];

    // Rhombus patterns typically have 3 rows/cols and form a diamond shape
    if (uniqueRows.length === 3 && uniqueCols.length === 3) {
      // Check for the classic rhombus pattern with missing center position
      const hasCenter = dominos.some((d) => d.row === 1 && d.col === 1);
      const hasTop = dominos.some((d) => d.row === 0);
      const hasBottom = dominos.some((d) => d.row === 2);

      // If we have top, sides, and bottom positions forming a diamond
      if (hasTop && hasBottom && !hasCenter) {
        return true;
      }
    }

    return false;
  }

  ngAfterViewInit() {
    // Initial sizing after view initialization
    this.syncGridHeight();
  }

  ngAfterViewChecked() {
    // If this is a rhombus pattern and height hasn't been synchronized yet
    if (this.isRhombusPattern() && !this.heightSynchronized) {
      this.syncGridHeight();
    }
    // If this is NOT a rhombus pattern but we have a previous height set
    else if (!this.isRhombusPattern() && this.heightSynchronized) {
      // Reset the custom height for non-rhombus patterns
      this.resetGridHeight();
    }
  }

  // Synchronize container height with actual grid height for rhombus patterns
  syncGridHeight() {
    setTimeout(() => {
      if (this.isRhombusPattern()) {
        const gridElement = document.querySelector(
          '.grid-container'
        ) as HTMLElement;
        const containerElement = this.gridContainerRef?.nativeElement;

        if (gridElement && containerElement) {
          const gridHeight = gridElement.offsetHeight;

          // Add padding to ensure it fits with some margin
          if (gridHeight > 0) {
            containerElement.style.minHeight = `${gridHeight + 80}px`;
            document.documentElement.style.setProperty(
              '--grid-height',
              `${gridHeight + 80}px`
            );
            this.heightSynchronized = true;
            this.cdr.markForCheck();
          }
        }
      }
    }, 200);
  }

  // Reset grid height for non-rhombus patterns
  resetGridHeight() {
    const containerElement = this.gridContainerRef?.nativeElement;
    if (containerElement) {
      // Remove the explicit minHeight and let CSS take over
      containerElement.style.minHeight = '';
      document.documentElement.style.removeProperty('--grid-height');
      this.heightSynchronized = false;
      this.cdr.markForCheck();
    }
  }
}
