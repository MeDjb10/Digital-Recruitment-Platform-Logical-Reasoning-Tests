import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestQuestion, PropositionResponse } from '../../models/domino.model';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';

@Component({
  selector: 'app-multiple-choice-question',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ProgressBarModule
  ],
  templateUrl: 'multiple-choice-question.component.html',
  // template: `
  //   <div class="mcq-container">
  //     <!-- Enhanced Header Section -->
   

  //     <!-- Main Content Area -->
  //     <div class="mcq-content" *ngIf="question && question.propositions">
  //       <!-- Propositions Grid Layout -->
  //       <div class="propositions-grid">
  //         <div
  //           *ngFor="let prop of question.propositions; let i = index"
  //           class="proposition-card"
  //           [class.answered]="responses[i].candidateEvaluation !== 'X'"
  //           [class.current-focus]="currentFocusedProposition === i"
  //         >
  //           <!-- Proposition Header -->
  //           <div class="proposition-header">
  //             <div class="proposition-number">
  //               <span class="number">{{ i + 1 }}</span>
  //             </div>
  //             <div class="proposition-status">
  //               <i
  //                 *ngIf="responses[i].candidateEvaluation !== 'X'"
  //                 class="pi pi-check-circle status-answered"
  //                 title="Answered"
  //               ></i>
  //               <i
  //                 *ngIf="responses[i].candidateEvaluation === 'X'"
  //                 class="pi pi-circle status-pending"
  //                 title="Not answered"
  //               ></i>
  //             </div>
  //           </div>

  //           <!-- Proposition Text -->
  //           <div class="proposition-content">
  //             <p class="proposition-text">{{ prop.text }}</p>
  //           </div>

  //           <!-- Enhanced Options Layout -->
  //           <div class="options-container">
  //             <div class="options-grid">
  //               <label
  //                 *ngFor="let option of evaluationOptions"
  //                 class="option-card"
  //                 [class.selected]="
  //                   responses[i].candidateEvaluation === option.value
  //                 "
  //                 [class.option-true]="option.value === 'V'"
  //                 [class.option-false]="option.value === 'F'"
  //                 [class.option-unknown]="option.value === '?'"
  //                 [class.option-confused]="option.value === 'X'"
  //                 (click)="onOptionClick(i, option.value)"
  //               >
  //                 <input
  //                   type="radio"
  //                   [name]="'prop_' + i"
  //                   [value]="option.value"
  //                   [(ngModel)]="responses[i].candidateEvaluation"
  //                   (change)="onSelectionChange(i, option.value)"
  //                   (focus)="onPropositionFocus(i)"
  //                   (blur)="onPropositionBlur()"
  //                 />

  //                 <!-- Option Icon -->
  //                 <div class="option-icon">
  //                   <i
  //                     class="pi"
  //                     [ngClass]="{
  //                       'pi-check': option.value === 'V',
  //                       'pi-times': option.value === 'F',
  //                       'pi-question': option.value === '?',
  //                       'pi-exclamation': option.value === 'X'
  //                     }"
  //                   ></i>
  //                 </div>

  //                 <!-- Option Content -->
  //                 <div class="option-content">
  //                   <span class="option-label">{{ option.label }}</span>
  //                   <span class="option-description">{{
  //                     getOptionDescription(option.value)
  //                   }}</span>
  //                 </div>

  //                 <!-- Selection Indicator -->
  //                 <div class="selection-indicator">
  //                   <div class="radio-custom"></div>
  //                 </div>
  //               </label>
  //             </div>
  //           </div>
  //         </div>
  //       </div>

  //       <!-- Progress Summary -->
  //       <div class="progress-summary">
  //         <div class="progress-info">
  //           <span class="progress-text">
  //             Progress: {{ getAnsweredCount() }}/{{
  //               question.propositions.length
  //             }}
  //             answered
  //           </span>
  //           <div class="progress-bar">
  //             <div
  //               class="progress-fill"
  //               [style.width.%]="getProgressPercentage()"
  //             ></div>
  //           </div>
  //         </div>

  //         <!-- Quick Navigation -->
  //         <div class="quick-nav" *ngIf="question.propositions.length > 3">
  //           <span class="nav-label">Quick jump:</span>
  //           <button
  //             *ngFor="let prop of question.propositions; let i = index"
  //             class="nav-dot"
  //             [class.answered]="responses[i].candidateEvaluation !== 'X'"
  //             [class.current]="currentFocusedProposition === i"
  //             (click)="scrollToProposition(i)"
  //             [attr.aria-label]="'Go to proposition ' + (i + 1)"
  //           >
  //             {{ i + 1 }}
  //           </button>
  //         </div>
  //       </div>
  //     </div>

  //     <!-- Error/Empty State -->
  //     <div class="mcq-empty-state" *ngIf="!question || !question.propositions">
  //       <div class="empty-content">
  //         <i class="pi pi-exclamation-triangle empty-icon"></i>
  //         <h3>Question Data Missing</h3>
  //         <p>Unable to load the propositions for this question.</p>
  //       </div>
  //     </div>
  //   </div>
  // `,
  styles: [
    `
      .mcq-container {
        width: 100%;
        height: 100%;
        padding: 2rem;
        background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        min-height: 600px;
      }

      /* Enhanced Header */
      .mcq-header {
        margin-bottom: 2rem;
        text-align: center;
        padding: 1.5rem;
        background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
        border-radius: 16px;
        color: white;
        box-shadow: 0 8px 25px rgba(79, 70, 229, 0.3);
      }

      .question-title {
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      /* Main Content Area */
      .mcq-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      /* Propositions Grid - Responsive Layout */
      .propositions-grid {
        display: grid;
        gap: 2rem;
        grid-template-columns: 1fr;
        max-width: 1200px;
        margin: 0 auto;
        width: 100%;
      }

      @media (min-width: 1024px) {
        .propositions-grid {
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
        }
      }

      /* Enhanced Proposition Cards */
      .proposition-card {
        background: white;
        border-radius: 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 2px solid #e2e8f0;
        padding: 1.5rem;
        position: relative;
        overflow: hidden;
      }

      .proposition-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #e2e8f0 0%, #e2e8f0 100%);
        transition: all 0.3s ease;
      }

      .proposition-card.answered::before {
        background: linear-gradient(90deg, #10b981 0%, #059669 100%);
      }

      .proposition-card.current-focus {
        border-color: #4f46e5;
        box-shadow: 0 8px 30px rgba(79, 70, 229, 0.15);
        transform: translateY(-2px);
      }

      .proposition-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
      }

      /* Proposition Header */
      .proposition-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .proposition-number {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
        color: white;
        border-radius: 12px;
        font-weight: 700;
        font-size: 1.1rem;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
      }

      .proposition-status {
        font-size: 1.25rem;
      }

      .status-answered {
        color: #10b981;
        animation: checkmark-pop 0.3s ease-out;
      }

      .status-pending {
        color: #94a3b8;
      }

      @keyframes checkmark-pop {
        0% {
          transform: scale(0);
        }
        50% {
          transform: scale(1.2);
        }
        100% {
          transform: scale(1);
        }
      }

      /* Proposition Content */
      .proposition-content {
        margin-bottom: 1.5rem;
      }

      .proposition-text {
        font-size: 1.1rem;
        line-height: 1.7;
        color: #1e293b;
        margin: 0;
        font-weight: 500;
        text-align: left;
      }

      /* Enhanced Options Layout */
      .options-container {
        margin-top: 1.5rem;
      }

      .options-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
      }

      @media (max-width: 640px) {
        .options-grid {
          grid-template-columns: 1fr;
        }
      }

      /* Enhanced Option Cards */
      .option-card {
        display: flex;
        align-items: center;
        padding: 1rem;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: #fafbfc;
        position: relative;
        overflow: hidden;
        min-height: 70px;
      }

      .option-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.4),
          transparent
        );
        transition: left 0.5s;
      }

      .option-card:hover::before {
        left: 100%;
      }

      .option-card:hover {
        border-color: #cbd5e1;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      /* Option Color Coding */
      .option-card.option-true.selected {
        background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
        border-color: #10b981;
        color: #065f46;
      }

      .option-card.option-false.selected {
        background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
        border-color: #ef4444;
        color: #991b1b;
      }

      .option-card.option-unknown.selected {
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        border-color: #f59e0b;
        color: #92400e;
      }

      /* Option Icon */
      .option-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        margin-right: 0.75rem;
        flex-shrink: 0;
        background: #f1f5f9;
        color: #64748b;
        transition: all 0.2s ease;
      }

      .option-card.selected .option-icon {
        background: currentColor;
        color: white;
        transform: scale(1.1);
      }

      /* Option Content */
      .option-content {
        flex: 1;
        text-align: left;
      }

      .option-label {
        display: block;
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
      }

      .option-description {
        display: block;
        font-size: 0.875rem;
        opacity: 0.8;
        line-height: 1.4;
      }

      /* Custom Radio Button */
      .option-card input[type='radio'] {
        display: none;
      }

      .selection-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        flex-shrink: 0;
      }

      .radio-custom {
        width: 20px;
        height: 20px;
        border: 2px solid #d1d5db;
        border-radius: 50%;
        background: white;
        position: relative;
        transition: all 0.2s ease;
      }

      .option-card.selected .radio-custom {
        border-color: currentColor;
        background: currentColor;
      }

      .option-card.selected .radio-custom::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 8px;
        height: 8px;
        background: white;
        border-radius: 50%;
        transform: translate(-50%, -50%);
      }

      /* Progress Summary */
      .progress-summary {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        border: 2px solid #f1f5f9;
        margin-top: 1rem;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .progress-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex: 1;
        min-width: 200px;
      }

      .progress-text {
        font-weight: 600;
        color: #374151;
        white-space: nowrap;
      }

      .progress-bar {
        flex: 1;
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        overflow: hidden;
        min-width: 100px;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #10b981 0%, #059669 100%);
        transition: width 0.3s ease;
        border-radius: 4px;
      }

      /* Quick Navigation */
      .quick-nav {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .nav-label {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 500;
      }

      .nav-dot {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        background: white;
        color: #6b7280;
        font-weight: 600;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .nav-dot:hover {
        border-color: #9ca3af;
        transform: translateY(-1px);
      }

      .nav-dot.answered {
        background: #10b981;
        border-color: #10b981;
        color: white;
      }

      .nav-dot.current {
        background: #4f46e5;
        border-color: #4f46e5;
        color: white;
        transform: scale(1.1);
      }

      /* Empty State */
      .mcq-empty-state {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 400px;
        text-align: center;
      }

      .empty-content {
        padding: 2rem;
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        max-width: 400px;
      }

      .empty-icon {
        font-size: 3rem;
        color: #ef4444;
        margin-bottom: 1rem;
      }

      .empty-content h3 {
        font-size: 1.25rem;
        font-weight: 700;
        color: #1f2937;
        margin: 0 0 0.5rem;
      }

      .empty-content p {
        color: #6b7280;
        margin: 0;
      }

      /* Keyboard Shortcuts */
      .keyboard-hints {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        padding: 1rem;
        border: 2px solid #e5e7eb;
        max-width: 300px;
        z-index: 1000;
      }

      .hints-content h4 {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        margin: 0 0 0.75rem;
      }

      .shortcuts-grid {
        display: grid;
        gap: 0.5rem;
        grid-template-columns: 1fr 1fr;
      }

      .shortcut-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.75rem;
      }

      .shortcut-item kbd {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        background: #f3f4f6;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        color: #374151;
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .mcq-container {
          padding: 1rem;
        }

        .proposition-card {
          padding: 1rem;
        }

        .proposition-text {
          font-size: 1rem;
        }

        .options-grid {
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }

        .option-card {
          min-height: 60px;
          padding: 0.75rem;
        }

        .progress-summary {
          flex-direction: column;
          align-items: stretch;
          text-align: center;
        }

        .keyboard-hints {
          bottom: 1rem;
          right: 1rem;
          left: 1rem;
          max-width: none;
        }
      }

      /* Focus and Accessibility */
      .option-card:focus-within {
        outline: 2px solid #4f46e5;
        outline-offset: 2px;
      }

      .nav-dot:focus {
        outline: 2px solid #4f46e5;
        outline-offset: 2px;
      }

      /* Animation for better UX */
      .proposition-card {
        animation: slideUp 0.4s ease-out;
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* High contrast mode */
      @media (prefers-contrast: high) {
        .option-card {
          border-width: 3px;
        }

        .proposition-card {
          border-width: 3px;
        }
      }

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          transition-duration: 0.01ms !important;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultipleChoiceQuestionComponent implements OnInit, OnChanges {
  @Input() question!: TestQuestion;
  @Output() answerChanged = new EventEmitter<PropositionResponse[]>();

  responses: PropositionResponse[] = [];
  currentFocusedProposition: number = -1;
  showKeyboardHints: boolean = true;

  evaluationOptions = [
    { value: 'V', label: 'True' },
    { value: 'F', label: 'False' },
    { value: '?', label: 'Cannot Know' }
  ];

  // Enhanced keyboard support
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.currentFocusedProposition === -1) return;

    switch (event.key) {
      case '1':
        this.selectOption(this.currentFocusedProposition, 'V');
        break;
      case '2':
        this.selectOption(this.currentFocusedProposition, 'F');
        break;
      case '3':
        this.selectOption(this.currentFocusedProposition, '?');
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.navigateProposition(-1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.navigateProposition(1);
        break;
    }
  }

  ngOnInit(): void {
    console.log(
      '[MCQ Component] ngOnInit - Initial Question Input:',
      JSON.stringify(this.question, null, 2)
    ); // DEBUG
    this.initializeResponses();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['question']) {
      console.log(
        '[MCQ Component] ngOnChanges - Question Input Changed:',
        JSON.stringify(changes['question'].currentValue, null, 2)
      ); // DEBUG
      // Log type and propositions specifically
      const currentQ = changes['question'].currentValue;
      console.log(
        `[MCQ Component] ngOnChanges - Question Type: ${currentQ?.questionType}`
      ); // DEBUG
      console.log(
        `[MCQ Component] ngOnChanges - Propositions: ${JSON.stringify(
          currentQ?.propositions
        )}`
      ); // DEBUG
      this.initializeResponses();
    }
  }

  initializeResponses(): void {
    console.log('[MCQ Component] Initializing responses...'); // DEBUG
    if (this.question && this.question.propositions) {
      console.log(
        `[MCQ Component] Found ${this.question.propositions.length} propositions.`
      ); // DEBUG
      // Initialize or restore responses
      const initialResponses = this.question.userAnswer as
        | PropositionResponse[]
        | undefined;
      console.log(
        '[MCQ Component] Initial User Answer from question:',
        JSON.stringify(initialResponses)
      ); // DEBUG
      this.responses = this.question.propositions.map((_, index) => {
        const existingResponse = initialResponses?.find(
          (r) => r.propositionIndex === index
        );
        return {
          propositionIndex: index,
          candidateEvaluation: existingResponse?.candidateEvaluation || 'X', // Default to 'X' if no answer yet
        };
      });
      console.log(
        '[MCQ Component] Initialized/Restored responses:',
        JSON.stringify(this.responses)
      ); // DEBUG
    } else {
      console.warn(
        '[MCQ Component] No question or propositions found during response initialization.'
      ); // DEBUG
      this.responses = [];
    }
  }

  getOptionDescription(value: string): string {
    switch (value) {
      case 'V':
        return 'This statement is true';
      case 'F':
        return 'This statement is false';
      case '?':
        return 'Cannot determine from given information';
      default:
        return '';
    }
  }

  onOptionClick(propositionIndex: number, value: string): void {
    this.selectOption(propositionIndex, value);
    this.currentFocusedProposition = propositionIndex;
  }

  selectOption(propositionIndex: number, value: string): void {
    if (value === 'V' || value === 'F' || value === '?' ) {
      this.responses[propositionIndex].candidateEvaluation = value as
        | 'V'
        | 'F'
        | '?'
        ;
      this.answerChanged.emit(this.responses);
    }
  }

  onPropositionFocus(index: number): void {
    this.currentFocusedProposition = index;
  }

  onPropositionBlur(): void {
    // Small delay to allow for option selection
    setTimeout(() => {
      this.currentFocusedProposition = -1;
    }, 100);
  }

  navigateProposition(direction: number): void {
    const newIndex = this.currentFocusedProposition + direction;
    if (newIndex >= 0 && newIndex < this.responses.length) {
      this.currentFocusedProposition = newIndex;
      this.scrollToProposition(newIndex);
    }
  }

  scrollToProposition(index: number): void {
    this.currentFocusedProposition = index;
    const element = document.querySelector(
      `.proposition-card:nth-child(${index + 1})`
    );
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  getAnsweredCount(): number {
    return this.responses.filter((r) => r.candidateEvaluation !== 'X').length;
  }

  getProgressPercentage(): number {
    return this.responses.length > 0
      ? (this.getAnsweredCount() / this.responses.length) * 100
      : 0;
  }

  onSelectionChange(index: number, value: string): void {
    this.selectOption(index, value);
  }
}
