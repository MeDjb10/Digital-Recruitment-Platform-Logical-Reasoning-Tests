import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DominoLayout } from '../../canvaTest/services/domino-layout.service';
import { DominoLayoutRendererComponent } from './dominoLayoutRender.component';

@Component({
  selector: 'app-layout-question',
  standalone: true,
  imports: [CommonModule, DominoLayoutRendererComponent],
  template: `
    <div class="question-container">
      <div class="question-header">
        <h3>{{ question.title || 'Complete the Pattern' }}</h3>
        <p>
          {{
            question.instruction ||
              'Select the correct values for the missing domino.'
          }}
        </p>
      </div>

      <div class="layout-area">
        <app-domino-layout-renderer [layout]="layout" [showGrid]="false">
        </app-domino-layout-renderer>
      </div>

      <div class="question-footer">
        <button
          class="submit-btn"
          (click)="submitAnswer()"
          [disabled]="!isAnswerComplete()"
        >
          Submit Answer
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .question-container {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        padding: 20px;
        margin-bottom: 20px;
      }

      .question-header {
        margin-bottom: 20px;
      }

      .question-header h3 {
        font-size: 1.5rem;
        margin-bottom: 10px;
      }

      .layout-area {
        margin: 20px 0;
        min-height: 500px;
        border-radius: 8px;
        background-color: #f9fafb;
      }

      .question-footer {
        margin-top: 20px;
        display: flex;
        justify-content: flex-end;
      }

      .submit-btn {
        padding: 10px 20px;
        background-color: #4f46e5;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: background-color 0.2s;
      }

      .submit-btn:hover:not(:disabled) {
        background-color: #4338ca;
      }

      .submit-btn:disabled {
        background-color: #c7d2fe;
        cursor: not-allowed;
      }
    `,
  ],
})
export class LayoutQuestionComponent {
  @Input() question: any = {
    id: 1,
    title: 'Pattern Recognition',
    instruction:
      'Complete the pattern by selecting values for the highlighted domino.',
  };

  @Input() layout?: DominoLayout;

  @Output() answerSubmitted = new EventEmitter<{
    questionId: number;
    answer: {
      dominoId: number;
      topValue: number | null;
      bottomValue: number | null;
    };
  }>();

  isAnswerComplete(): boolean {
    if (!this.layout) return false;

    // Find the editable domino
    const editableDomino = this.layout.dominos.find((d) => d.isEditable);

    // Check if it has values
    return !!(
      editableDomino &&
      editableDomino.topValue !== null &&
      editableDomino.bottomValue !== null
    );
  }

  submitAnswer(): void {
    if (!this.layout) return;

    const editableDomino = this.layout.dominos.find((d) => d.isEditable);
    if (!editableDomino) return;

    this.answerSubmitted.emit({
      questionId: this.question.id,
      answer: {
        dominoId: editableDomino.id,
        topValue: editableDomino.topValue,
        bottomValue: editableDomino.bottomValue,
      },
    });
  }
}
