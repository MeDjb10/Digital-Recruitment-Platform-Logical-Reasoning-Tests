import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-question-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="panel-container">
      <div class="panel-header">
        <h2>Question {{ questionNumber }}</h2>
        <button
          class="flag-button"
          [class.flagged]="isFlagged"
          (click)="toggleFlag.emit()"
        >
          <i class="pi" [ngClass]="isFlagged ? 'pi-flag-fill' : 'pi-flag'"></i>
          {{ isFlagged ? 'Flagged' : 'Flag for Review' }}
        </button>
      </div>
      <p class="instruction-text">
        {{ instruction }}
      </p>
    </div>
  `,
  // Update the styles with enhanced styling:
  styles: [
    `
      .panel-container {
        background-color: white;
        border-radius: 12px;
        padding: 20px 24px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        transition: all 0.3s ease;
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .panel-header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: #1e293b;
        letter-spacing: -0.01em;
      }

      .flag-button {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
        background-color: white;
        color: #64748b;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .flag-button:hover {
        background-color: #fef3c7;
        border-color: #f59e0b;
        color: #92400e;
        transform: translateY(-1px);
      }

      .flag-button.flagged {
        background-color: #fef3c7;
        border-color: #f59e0b;
        color: #92400e;
      }

      .flag-button.flagged:hover {
        background-color: white;
        border-color: #e2e8f0;
        color: #64748b;
      }

      .instruction-text {
        color: #475569;
        line-height: 1.6;
        font-size: 15px;
        margin: 0;
      }
    `,
  ],
})
export class QuestionPanelComponent {
  @Input() questionNumber: number = 1;
  @Input() instruction: string = '';
  @Input() isFlagged: boolean = false;
  @Input() animate: boolean = false;
  @Input() title: string = '';

  @Output() toggleFlag = new EventEmitter<void>();
}
