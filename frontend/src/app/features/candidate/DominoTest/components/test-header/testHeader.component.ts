import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-test-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="test-header" [class.animate]="animate">
      <div class="test-info">
        <h1>{{ testName }}</h1>
        <span class="question-counter">
          Question {{ currentQuestionIndex + 1 }} of {{ totalQuestions }}
        </span>
      </div>

      <!-- Added progress section -->
      <div class="progress-section">
        <div class="progress-stats">
          <span>{{ answeredCount }} / {{ totalQuestions }} answered</span>
          <span *ngIf="flaggedCount > 0" class="flagged-count">
            <i class="pi pi-flag"></i> {{ flaggedCount }} flagged
          </span>
        </div>

        <div class="progress-bar">
          <div
            class="progress-fill"
            [style.width.%]="progressPercentage"
            [class.all-answered]="answeredCount === totalQuestions"
          ></div>
          <div class="progress-markers">
            <div
              *ngFor="let marker of progressMarkers; let i = index"
              class="marker"
              [class.active]="marker.active"
              [class.flagged]="marker.flagged"
              [style.left.%]="marker.position"
              [attr.title]="'Question ' + (i + 1)"
            ></div>
          </div>
        </div>
      </div>

      <div
        class="timer"
        [class.timer-warning]="isTimerWarning"
        [class.timer-critical]="isTimerCritical"
        [class.pulse]="pulseTimer"
      >
        <i class="pi pi-clock"></i> {{ formattedTime }}
      </div>
    </header>
  `,
  styles: [
    `
      .test-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 20px; /* Reduced padding */
        background-color: white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        z-index: 10;
        border-bottom: 1px solid #e2e8f0;
        transition: all 0.3s ease;
        flex-wrap: wrap;
        gap: 8px; /* Reduced gap */
      }

      .test-header.animate {
        animation: fadeInDown 0.5s ease;
      }

      .test-info {
        flex: 0 0 22%;
      }

      .test-info h1 {
        font-size: 1rem;
        margin: 0;
        color: #0f172a;
        font-weight: 700;
        letter-spacing: -0.025em;
      }

      .question-counter {
        font-size: 0.875rem;
        color: #64748b;
        display: block;
        margin-top: 0.25rem;
      }

      /* Progress section styling */
      .progress-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 0 20px;
        min-width: 200px;
      }

      .progress-stats {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 4px;
        color: #475569;
        font-size: 13px;
        font-weight: 500;
      }

      .flagged-count {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #92400e;
      }

      .progress-bar {
        height: 10px;
        background-color: #e2e8f0;
        border-radius: 5px;
        overflow: hidden;
        position: relative;
      }

      .progress-fill {
        height: 100%;
        background-color: #4f46e5;
        border-radius: 5px;
        transition: width 0.5s ease;
      }

      .progress-fill.all-answered {
        background-color: #10b981;
      }

      /* Progress markers */
      .progress-markers {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .marker {
        position: absolute;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: #cbd5e1;
        top: 2px;
        transform: translateX(-50%);
        transition: all 0.3s ease;
      }

      .marker.active {
        background-color: white;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
      }

      .marker.flagged {
        background-color: #fbbf24;
      }

      .timer {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.25rem;
        background-color: #f1f5f9;
        border-radius: 6px;
        font-weight: 600;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        transition: background-color 0.3s ease;
        flex: 0 0 auto;
      }

      .timer-warning {
        background-color: #fef3c7;
        color: #92400e;
        animation: pulse 2s infinite;
      }

      .timer-critical {
        background-color: #fee2e2;
        color: #b91c1c;
        animation: pulse 1s infinite;
      }

      @keyframes fadeInDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.8;
        }
      }

      @media (max-width: 768px) {
        .test-header {
          flex-direction: column;
          align-items: stretch;
          padding: 12px;
        }

        .test-info {
          flex: 0 0 100%;
          margin-bottom: 8px;
        }

        .progress-section {
          padding: 0;
          margin-bottom: 8px;
        }

        .timer {
          align-self: flex-end;
        }
      }
    `,
  ],
})
export class TestHeaderComponent {
  @Input() testName: string = '';
  @Input() currentQuestionIndex: number = 0;
  @Input() totalQuestions: number = 0;
  @Input() formattedTime: string = '00:00';
  @Input() isTimerWarning: boolean = false;
  @Input() isTimerCritical: boolean = false;
  @Input() pulseTimer: boolean = false;
  @Input() animate: boolean = false;

  // New inputs for progress tracking
  @Input() answeredCount: number = 0;
  @Input() flaggedCount: number = 0;
  @Input() progressPercentage: number = 0;
  @Input() progressMarkers: {
    position: number;
    active: boolean;
    flagged: boolean;
  }[] = [];
}
