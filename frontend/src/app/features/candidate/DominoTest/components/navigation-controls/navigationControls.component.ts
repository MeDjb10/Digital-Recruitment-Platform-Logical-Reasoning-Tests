import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navigation-controls',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav
      class="navigation-controls"
      [class.animate]="animate"
      aria-label="Question navigation"
    >
      <!-- Progress indicator -->
      <div class="nav-progress-indicator" *ngIf="totalQuestions > 0">
        <div class="progress-text">
          Question {{ currentQuestion }} of {{ totalQuestions }}
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            [style.width.%]="(currentQuestion / totalQuestions) * 100"
          ></div>
        </div>
      </div>

      <!-- Navigation buttons -->
      <div class="nav-buttons-container">
        <button
          class="btn btn-outline"
          [disabled]="isFirstQuestion"
          [class.btn-disabled]="isFirstQuestion"
          (click)="prevClicked.emit()"
          aria-label="Previous question"
          [attr.title]="
            isFirstQuestion
              ? 'This is the first question'
              : 'Go to previous question'
          "
        >
          <i class="pi pi-chevron-left" aria-hidden="true"></i>
          <span>Previous</span>
        </button>

        <button
          class="btn btn-flag"
          [class.flagged]="isFlagged"
          (click)="flagClicked.emit()"
          [attr.aria-label]="
            isFlagged
              ? 'Unflag this question'
              : 'Flag this question for later review'
          "
          [attr.title]="
            isFlagged
              ? 'Remove flag from this question'
              : 'Mark this question to review later'
          "
        >
          <i
            class="pi"
            [ngClass]="isFlagged ? 'pi-flag-fill' : 'pi-flag'"
            aria-hidden="true"
          ></i>
          <span>{{ isFlagged ? 'Unflag' : 'Flag' }}</span>
        </button>

        <button
          class="btn btn-primary"
          [class.pulse-once]="shouldPulse"
          [class.btn-finish]="isLastQuestion"
          [disabled]="isLastQuestion && !canFinish"
          (click)="isLastQuestion ? finishClicked.emit() : nextClicked.emit()"
          [attr.aria-label]="isLastQuestion ? 'Finish test' : 'Next question'"
          [attr.title]="
            isLastQuestion
              ? canFinish
                ? 'Submit your test'
                : 'Cannot finish yet'
              : 'Go to next question'
          "
        >
          <span>{{ isLastQuestion ? 'Finish Test' : 'Next' }}</span>
          <i
            class="pi"
            [ngClass]="{
              'pi-chevron-right': !isLastQuestion,
              'pi-check': isLastQuestion
            }"
            aria-hidden="true"
          ></i>
        </button>
      </div>

      <!-- Keyboard shortcuts hint -->
      <div class="keyboard-hint" *ngIf="showKeyboardHints">
        <span><kbd>←</kbd> Previous</span>
        <span><kbd>→</kbd> Next</span>
        <span><kbd>F</kbd> Flag</span>
      </div>
    </nav>
  `,
  styles: [
    `
      .navigation-controls {
        display: flex;
        flex-direction: column;
        width: 100%;
        transition: all 0.3s ease;
        padding: 12px 20px;
        background-color: white;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        gap: 12px;
        position: relative;
        margin-top: -4px;
      }

      .navigation-controls.animate {
        animation: fadeInUp 0.4s ease;
      }

      /* Progress indicator styling */
      .nav-progress-indicator {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 6px;
      }

      .progress-text {
        font-size: 14px;
        color: #64748b;
        font-weight: 600;
        text-align: center;
      }

      .progress-bar {
        height: 6px;
        background-color: #f1f5f9;
        border-radius: 3px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background-color: #4f46e5;
        border-radius: 3px;
        transition: width 0.5s ease;
      }

      /* Button container */
      .nav-buttons-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        gap: 12px;
      }

      /* Button styling */
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        font-size: 15px;
        flex: 1;
        max-width: 160px;
        height: 46px;
        position: relative;
        overflow: hidden;
      }

      /* Button hover effects */
      .btn:hover:not(:disabled):not(.btn-disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
          0 2px 4px -1px rgba(0, 0, 0, 0.06);
      }

      .btn:active:not(:disabled):not(.btn-disabled) {
        transform: translateY(0);
      }

      /* Button focus styles for accessibility */
      .btn:focus-visible {
        outline: 2px solid #4f46e5;
        outline-offset: 2px;
      }

      /* Button variants */
      .btn-outline {
        background-color: white;
        border: 1.5px solid #e2e8f0;
        color: #475569;
      }

      .btn-outline:hover:not(.btn-disabled) {
        background-color: #f8fafc;
        border-color: #cbd5e1;
        color: #1e293b;
      }

      .btn-primary {
        background-color: #4f46e5;
        color: white;
        border: none;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }

      .btn-primary:hover:not(:disabled) {
        background-color: #4338ca;
      }

      .btn-primary:active:not(:disabled) {
        background-color: #3730a3;
      }

      .btn-finish {
        background-color: #10b981;
      }

      .btn-finish:hover:not(:disabled) {
        background-color: #059669;
      }

      /* Flag button styling */
      .btn-flag {
        background-color: white;
        border: 1.5px solid #e2e8f0;
        color: #64748b;
      }

      .btn-flag:hover {
        background-color: #fef9c3;
        border-color: #f59e0b;
        color: #92400e;
      }

      .btn-flag.flagged {
        background-color: #fef3c7;
        border-color: #f59e0b;
        color: #92400e;
        font-weight: 600;
      }

      .btn-flag.flagged:hover {
        background-color: #fde68a;
      }

      /* Button states */
      .btn-disabled,
      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        box-shadow: none !important;
        transform: none !important;
        background-color: #f1f5f9;
        color: #94a3b8;
      }

      /* Icon styling */
      .btn i {
        font-size: 16px;
      }

      /* Keyboard shortcuts hint */
      .keyboard-hint {
        display: flex;
        justify-content: center;
        gap: 16px;
        font-size: 12px;
        color: #94a3b8;
        margin-top: 8px;
      }

      kbd {
        display: inline-block;
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        border-radius: 3px;
        padding: 1px 4px;
        font-size: 11px;
        box-shadow: 0 1px 0 rgba(0, 0, 0, 0.1);
      }

      /* Animations */
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes pulse {
        0% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.7);
        }
        50% {
          transform: scale(1.02);
          box-shadow: 0 0 0 10px rgba(79, 70, 229, 0);
        }
        100% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(79, 70, 229, 0);
        }
      }

      .pulse-once {
        animation: pulse 0.8s ease-in-out;
      }

      /* Ripple effect for buttons */
      .btn::after {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        pointer-events: none;
        background-image: radial-gradient(circle, #fff 10%, transparent 10.01%);
        background-repeat: no-repeat;
        background-position: 50%;
        transform: scale(10, 10);
        opacity: 0;
        transition: transform 0.5s, opacity 0.8s;
      }

      .btn:active::after {
        transform: scale(0, 0);
        opacity: 0.3;
        transition: 0s;
      }

      /* Responsive adjustments */
      @media (max-width: 640px) {
        .navigation-controls {
          padding: 16px;
        }

        .btn {
          padding: 8px 16px;
          font-size: 14px;
          height: 42px;
        }

        .btn span:not(.sr-only) {
          display: none;
        }

        .btn i {
          margin: 0;
        }

        .keyboard-hint {
          display: none;
        }
      }

      @media (min-width: 641px) and (max-width: 1024px) {
        .btn {
          max-width: 140px;
        }
      }
      /* Keyboard activation effect */
      .keyboard-activated {
        animation: button-flash 0.3s ease;
      }

      @keyframes button-flash {
        0%,
        100% {
          transform: scale(1);
          box-shadow: 0 0 0 rgba(79, 70, 229, 0.4);
        }
        50% {
          transform: scale(1.05);
          box-shadow: 0 0 10px rgba(79, 70, 229, 0.6);
        }
      }
    `,
  ],
})
export class NavigationControlsComponent {
  @Input() isFirstQuestion: boolean = false;
  @Input() isLastQuestion: boolean = false;
  @Input() canFinish: boolean = false;
  @Input() animate: boolean = false;
  @Input() shouldPulse: boolean = false;
  @Input() isFlagged: boolean = false;
  @Input() currentQuestion: number = 1;
  @Input() totalQuestions: number = 1;
  @Input() showKeyboardHints: boolean = true;

  @Output() prevClicked = new EventEmitter<void>();
  @Output() nextClicked = new EventEmitter<void>();
  @Output() finishClicked = new EventEmitter<void>();
  @Output() flagClicked = new EventEmitter<void>();

  // Add the keyboard event listener
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Avoid triggering when user is typing in an input field or textarea
    if (
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement ||
      (document.activeElement?.hasAttribute('contenteditable') &&
        document.activeElement.getAttribute('contenteditable') !== 'false')
    ) {
      return;
    }

    // Check if any modal/dialog is open where we shouldn't handle keyboard shortcuts
    const modalOpen = document.querySelector(
      '.modal-open, .dialog-open, [role="dialog"]'
    );
    if (modalOpen) {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
        if (!this.isFirstQuestion) {
          event.preventDefault(); // Prevent scrolling
          this.prevClicked.emit();
          this.highlightButton('previous');
        }
        break;

      case 'ArrowRight':
        if (!this.isLastQuestion) {
          event.preventDefault(); // Prevent scrolling
          this.nextClicked.emit();
          this.highlightButton('next');
        }
        break;

      case 'f':
      case 'F':
        event.preventDefault(); // Prevent browser's find function
        this.flagClicked.emit();
        this.highlightButton('flag');
        break;

      case 'Enter':
        // Only handle if we're on the last question and can finish, or not on the last question
        if (
          !event.ctrlKey &&
          !event.altKey &&
          !event.shiftKey &&
          !event.metaKey
        ) {
          if (this.isLastQuestion && this.canFinish) {
            this.finishClicked.emit();
            this.highlightButton('next'); // the finish button
          } else if (!this.isLastQuestion) {
            this.nextClicked.emit();
            this.highlightButton('next');
          }
        }
        break;
    }
  }

  // Visual feedback when keyboard shortcuts are used
  private highlightButton(buttonType: 'previous' | 'next' | 'flag') {
    const buttonSelectors = {
      previous: '.btn-outline',
      next: '.btn-primary',
      flag: '.btn-flag',
    };

    const button = document.querySelector(
      buttonSelectors[buttonType]
    ) as HTMLElement;
    if (button) {
      button.classList.add('keyboard-activated');
      setTimeout(() => {
        button.classList.remove('keyboard-activated');
      }, 300);
    }
  }
}
