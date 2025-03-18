import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

interface QuestionInfo {
  id: number;
  visited: boolean;
  answered: boolean;
  flaggedForReview: boolean;
  flagged?: boolean;
}

@Component({
  selector: 'app-test-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="sidebar-container" [class.collapsed]="isCollapsed">
      <button class="toggle-button" (click)="toggleSidebar()">
        <i
          class="pi"
          [ngClass]="isCollapsed ? 'pi-angle-right' : 'pi-angle-left'"
        ></i>
      </button>

      <div class="sidebar-content" [class.hidden]="isCollapsed">
        <div class="sidebar-header">
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

        <div class="questions-list">
          <div
            *ngFor="let question of questions; let i = index"
            class="question-item-wrapper"
          >
            <button
              class="question-item"
              [class.current]="i === currentQuestion"
              [class.visited]="question.visited"
              [class.answered]="question.answered"
              [class.flagged]="question.flaggedForReview || question.flagged"
              (click)="onQuestionSelected(i)"
            >
              <span class="question-number">{{ i + 1 }}</span>
              <span class="question-label" *ngIf="!isCollapsed">
                Question {{ i + 1 }}
              </span>
              <div class="status-icons" *ngIf="!isCollapsed">
                <span
                  *ngIf="question.answered"
                  class="status-icon answered-icon"
                >
                  ✓
                </span>
                <span
                  *ngIf="question.flaggedForReview || question.flagged"
                  class="status-icon flagged"
                >
                  <i class="pi pi-flag"></i>
                </span>
              </div>
            </button>
          </div>
        </div>

        <!-- New submit button section always visible at bottom -->
        <div class="submit-section">
          <div class="progress-mini" *ngIf="!isCollapsed">
            <span>{{ answeredCount }}/{{ questions.length }} answered</span>
            <div class="progress-mini-bar">
              <div
                class="progress-mini-fill"
                [style.width.%]="(answeredCount / questions.length) * 100"
                [class.all-complete]="answeredCount === questions.length"
              ></div>
            </div>
          </div>

          <button
            class="submit-button"
            [class.all-answered]="answeredCount === questions.length"
            (click)="finishTest.emit()"
            [attr.title]="
              answeredCount === questions.length
                ? 'Submit your test'
                : 'Review and submit test'
            "
          >
            <i
              class="pi"
              [ngClass]="
                answeredCount === questions.length
                  ? 'pi-check-circle'
                  : 'pi-send'
              "
            ></i>
            <span *ngIf="!isCollapsed">
              {{
                answeredCount === questions.length
                  ? 'Submit Test'
                  : 'Review & Submit'
              }}
            </span>
          </button>

          <button
            *ngIf="showReset"
            class="reset-button"
            (click)="resetTest.emit()"
            title="Reset test progress"
          >
            <i class="pi pi-trash"></i>
            <span *ngIf="!isCollapsed">Reset</span>
          </button>
        </div>
      </div>
    </aside>
  `,
  styles: [
    `
      .sidebar-container {
        width: 280px;
        height: 100%;
        background-color: white;
        border-right: 1px solid #e2e8f0;
        position: relative;
        transition: width 0.3s ease;
        display: flex;
        flex-direction: column;
      }

      .sidebar-container.collapsed {
        width: 60px;
      }

      .toggle-button {
        position: absolute;
        right: -15px;
        top: 20px;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background-color: white;
        border: 1px solid #e2e8f0;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10;
      }

      .toggle-button:hover {
        background-color: #f8fafc;
        transform: scale(1.05);
      }

      .sidebar-content {
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .sidebar-content.hidden {
        opacity: 0;
      }

      .sidebar-header {
        padding: 16px;
        border-bottom: 1px solid #e2e8f0;
      }

      .sidebar-header h3 {
        margin: 0 0 10px 0;
        font-size: 16px;
        font-weight: 600;
        color: #1e293b;
      }

      .legend {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: #64748b;
      }

      .legend-color {
        width: 10px;
        height: 10px;
        border-radius: 2px;
      }

      .legend-color.current {
        background-color: #4f46e5;
      }

      .legend-color.answered {
        background-color: #10b981;
      }

      .legend-color.flagged {
        background-color: #f59e0b;
      }

      .questions-list {
        flex: 1;
        overflow-y: auto;
        padding: 12px 8px;
      }

      .question-item-wrapper {
        padding: 4px 8px;
      }

      .question-item {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 10px 16px;
        border-radius: 6px;
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        transition: all 0.2s ease;
        cursor: pointer;
        text-align: left;
      }

      .question-item:hover {
        background-color: #f1f5f9;
        transform: translateY(-1px);
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
        margin-right: 12px;
        flex-shrink: 0;
      }

      .question-label {
        flex: 1;
        font-size: 14px;
        color: #475569;
      }

      .status-icons {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .status-icon {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 20px;
        height: 22px;
        border-radius: 50%;
        font-size: 10px;
      }

      .answered-icon {
        background-color: #10b981;
        color: white;
      }

      .status-icon.flagged {
        color: #f59e0b;
      }

      .question-item.current {
        background-color: #4f46e5;
        border-color: #4338ca;
        transform: translateZ(0) scale(1.02);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .question-item.current .question-number {
        background-color: white;
        color: #4f46e5;
      }

      .question-item.current .question-label {
        color: white;
      }

      .question-item.answered {
        background-color: #f0fdfa;
        border-color: #10b981;
      }

      .question-item.answered .question-number {
        background-color: #10b981;
        color: white;
      }

      .question-item.flagged {
        background-color: #fef3c7;
        border-color: #f59e0b;
      }

      .question-item.flagged .question-number {
        background-color: #f59e0b;
        color: white;
      }

      .question-item.current.flagged {
        background-color: #4f46e5;
        border: 2px solid #f59e0b;
      }

      .question-item.current.answered {
        background-color: #4f46e5;
        border: 2px solid #10b981;
      }

      /* New submit section styling */
      .submit-section {
        padding: 16px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background-color: #f8fafc;
      }

      .progress-mini {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .progress-mini span {
        font-size: 12px;
        color: #64748b;
        font-weight: 500;
      }

      .progress-mini-bar {
        height: 4px;
        background-color: #e2e8f0;
        border-radius: 2px;
        overflow: hidden;
      }

      .progress-mini-fill {
        height: 100%;
        background-color: #4f46e5;
        border-radius: 2px;
        transition: width 0.5s ease;
      }

      .progress-mini-fill.all-complete {
        background-color: #10b981;
      }

      .submit-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 16px;
        border-radius: 6px;
        background-color: #4f46e5;
        color: white;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .submit-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        background-color: #4338ca;
      }

      .submit-button.all-answered {
        background-color: #10b981;
      }

      .submit-button.all-answered:hover {
        background-color: #059669;
      }

      .reset-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 8px;
        border-radius: 6px;
        background-color: transparent;
        color: #64748b;
        font-size: 13px;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .reset-button:hover {
        color: #ef4444;
        background-color: #fee2e2;
      }

      /* Adjust button appearance when sidebar is collapsed */
      .sidebar-container.collapsed .submit-button,
      .sidebar-container.collapsed .reset-button {
        padding: 12px;
        justify-content: center;
        border-radius: 50%;
        width: 42px;
        height: 42px;
        margin: 0 auto;
      }

      .sidebar-container.collapsed .submit-section {
        padding: 12px 8px;
      }
    `,
  ],
})
export class TestSidebarComponent {
  @Input() questions: QuestionInfo[] = [];
  @Input() currentQuestion: number = 0;
  @Input() isCollapsed: boolean = false;
  @Input() answeredCount: number = 0;
  @Input() showReset: boolean = true;

  @Output() questionSelected = new EventEmitter<number>();
  @Output() toggleCollapse = new EventEmitter<boolean>();
  @Output() finishTest = new EventEmitter<void>();
  @Output() resetTest = new EventEmitter<void>();

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    this.toggleCollapse.emit(this.isCollapsed);
  }

  onQuestionSelected(index: number): void {
    this.questionSelected.emit(index);
  }
}
