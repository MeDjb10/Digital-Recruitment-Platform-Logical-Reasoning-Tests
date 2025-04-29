import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestQuestion, PropositionResponse } from '../../models/domino.model';

@Component({
  selector: 'app-multiple-choice-question',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mcq-container">
      <div *ngIf="question && question.propositions">
        <div
          *ngFor="let prop of question.propositions; let i = index"
          class="proposition"
        >
          <p class="proposition-text">{{ i + 1 }}. {{ prop.text }}</p>
          <div class="options">
            <label
              *ngFor="let option of evaluationOptions"
              class="option-label"
              [class.selected]="
                responses[i].candidateEvaluation === option.value
              "
            >
              <input
                type="radio"
                [name]="'prop_' + i"
                [value]="option.value"
                [(ngModel)]="responses[i].candidateEvaluation"
                (change)="onSelectionChange(i, option.value)"
              />
              <span class="option-text">{{ option.label }}</span>
            </label>
          </div>
        </div>
      </div>
      <div *ngIf="!question || !question.propositions">
        <p>Question data is missing propositions.</p>
      </div>
    </div>
  `,
  styles: [
    `
      .mcq-container {
        padding: 20px;
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        max-width: 800px; /* Adjust as needed */
        margin: 20px auto;
      }
      .proposition {
        margin-bottom: 25px;
        padding-bottom: 15px;
        border-bottom: 1px solid #e5e7eb;
      }
      .proposition:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
      }
      .proposition-text {
        font-size: 1rem;
        color: #374151;
        margin-bottom: 15px;
        line-height: 1.6;
      }
      .options {
        display: flex;
        gap: 15px;
        flex-wrap: wrap;
      }
      .option-label {
        display: flex;
        align-items: center;
        padding: 8px 15px;
        border: 1px solid #d1d5db;
        border-radius: 20px;
        cursor: pointer;
        transition: all 0.2s ease;
        background-color: #fff;
      }
      .option-label:hover {
        border-color: #9ca3af;
        background-color: #f9fafb;
      }
      .option-label.selected {
        background-color: #dbeafe; /* Light blue */
        border-color: #3b82f6; /* Blue */
        color: #1e40af; /* Darker blue */
        font-weight: 500;
      }
      .option-label input[type='radio'] {
        display: none; /* Hide the actual radio button */
      }
      .option-text {
        font-size: 0.9rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultipleChoiceQuestionComponent implements OnInit, OnChanges {
  @Input() question!: TestQuestion;
  @Output() answerChanged = new EventEmitter<PropositionResponse[]>();

  responses: PropositionResponse[] = [];
  evaluationOptions = [
    { value: 'V', label: 'True (V)' },
    { value: 'F', label: 'False (F)' },
    { value: '?', label: 'Cannot Know (?)' },
    { value: 'X', label: "Don't Understand (X)" },
  ];

  ngOnInit(): void {
    console.log('[MCQ Component] ngOnInit - Initial Question Input:', JSON.stringify(this.question, null, 2)); // DEBUG
    this.initializeResponses();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['question']) {
      console.log('[MCQ Component] ngOnChanges - Question Input Changed:', JSON.stringify(changes['question'].currentValue, null, 2)); // DEBUG
      // Log type and propositions specifically
      const currentQ = changes['question'].currentValue;
      console.log(`[MCQ Component] ngOnChanges - Question Type: ${currentQ?.questionType}`); // DEBUG
      console.log(`[MCQ Component] ngOnChanges - Propositions: ${JSON.stringify(currentQ?.propositions)}`); // DEBUG
      this.initializeResponses();
    }
  }

  initializeResponses(): void {
    console.log('[MCQ Component] Initializing responses...'); // DEBUG
    if (this.question && this.question.propositions) {
      console.log(`[MCQ Component] Found ${this.question.propositions.length} propositions.`); // DEBUG
      // Initialize or restore responses
      const initialResponses = this.question.userAnswer as
        | PropositionResponse[]
        | undefined;
      console.log('[MCQ Component] Initial User Answer from question:', JSON.stringify(initialResponses)); // DEBUG
      this.responses = this.question.propositions.map((_, index) => {
        const existingResponse = initialResponses?.find(
          (r) => r.propositionIndex === index
        );
        return {
          propositionIndex: index,
          candidateEvaluation: existingResponse?.candidateEvaluation || 'X', // Default to 'X' if no answer yet
        };
      });
      console.log('[MCQ Component] Initialized/Restored responses:', JSON.stringify(this.responses)); // DEBUG
    } else {
      console.warn('[MCQ Component] No question or propositions found during response initialization.'); // DEBUG
      this.responses = [];
    }
  }

  onSelectionChange(index: number, value: string): void {
    if (
      this.responses[index] &&
      (value === 'V' || value === 'F' || value === '?' || value === 'X')
    ) {
      this.responses[index].candidateEvaluation = value as
        | 'V'
        | 'F'
        | '?'
        | 'X';
      this.answerChanged.emit(this.responses);
    }
  }
}
