import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-test-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="footer-container">
      <div class="progress-section">
        <div class="progress-stats">
          <span>{{ answeredCount }} / {{ totalQuestions }} answered</span>
          <span *ngIf="flaggedCount > 0" class="flagged-count">
            <i class="pi pi-flag"></i> {{ flaggedCount }} flagged
          </span>
        </div>

        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="progressPercentage"></div>
        </div>
      </div>

      <div class="actions-section">
        <button
          class="btn submit-btn"
          [class.all-answered]="answeredCount === totalQuestions"
          (click)="finishTest.emit()"
        >
          <i class="pi pi-check-circle"></i>
          {{
            answeredCount === totalQuestions ? 'Submit Test' : 'Review & Submit'
          }}
        </button>

        <button
          class="btn reset-btn"
          (click)="clearData.emit()"
          title="Clear saved progress (testing only)"
        >
          <i class="pi pi-trash"></i>
          Reset
        </button>
      </div>
    </footer>
  `,
  // Update the styles for better polish:
  styles: [
    `
      .footer-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        background-color: white;
        border-top: 1px solid #e2e8f0;
        box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.03);
        z-index: 20;
      }

      .progress-section {
        display: flex;
        flex-direction: column;
        width: 60%;
      }

      .progress-stats {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 8px;
        color: #475569;
        font-size: 14px;
        font-weight: 500;
      }

      .flagged-count {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #92400e;
      }

      .progress-bar {
        height: 8px;
        background-color: #e2e8f0;
        border-radius: 4px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background-color: #4f46e5;
        border-radius: 4px;
        transition: width 0.5s ease;
      }

      .actions-section {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px 16px;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
      }

      .btn:hover {
        transform: translateY(-1px);
      }

      .submit-btn {
        background-color: #4f46e5;
        color: white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .submit-btn:hover {
        background-color: #4338ca;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
      }

      .submit-btn.all-answered {
        background-color: #10b981;
      }

      .submit-btn.all-answered:hover {
        background-color: #059669;
      }

      .reset-btn {
        background-color: transparent;
        color: #64748b;
      }

      .reset-btn:hover {
        color: #ef4444;
        background-color: #fee2e2;
      }
    `,
  ],
})
export class TestFooterComponent {
  @Input() answeredCount: number = 0;
  @Input() totalQuestions: number = 0;
  @Input() flaggedCount: number = 0;
  @Input() progressPercentage: number = 0;

  @Output() finishTest = new EventEmitter<void>();
  @Output() clearData = new EventEmitter<void>();
}
