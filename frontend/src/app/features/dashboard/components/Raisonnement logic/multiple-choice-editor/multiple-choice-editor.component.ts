import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TestManagementService } from '../../../../../core/services/test-management.service';
import { MultipleChoiceQuestion } from '../../../../../core/models/question.model';

@Component({
  selector: 'app-multiple-choice-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    DropdownModule,
    CheckboxModule,
    RadioButtonModule,
    CardModule,
    DividerModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="multiple-choice-editor">
      <div class="header-section">
        <h1>{{ isEditMode ? 'Edit' : 'Create' }} Multiple Choice Question</h1>
        <p class="subtitle" *ngIf="testInfo">For test: {{ testInfo.name }}</p>
      </div>

      <div *ngIf="loading" class="loading-container">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>

      <div *ngIf="!loading" class="editor-container">
        <form [formGroup]="questionForm" (ngSubmit)="saveQuestion()">
          <div class="p-fluid form-grid">
            <!-- Basic Info Section -->
            <div class="form-section">
              <h2>Question Details</h2>

              <div class="field">
                <label for="title"
                  >Title <span class="optional">(optional)</span></label
                >
                <input
                  id="title"
                  type="text"
                  pInputText
                  formControlName="title"
                  placeholder="Enter a title for this question"
                />
              </div>

              <div class="field">
                <label for="instruction"
                  >Question Text <span class="required">*</span></label
                >
                <textarea
                  id="instruction"
                  pTextarea
                  formControlName="instruction"
                  [rows]="3"
                  placeholder="Enter the main question text"
                ></textarea>
                <small
                  *ngIf="
                    questionForm.get('instruction')?.invalid &&
                    questionForm.get('instruction')?.touched
                  "
                  class="error-text"
                >
                  Question text is required
                </small>
              </div>

              <div class="field-row">
                <div class="field">
                  <label for="difficulty"
                    >Difficulty Level <span class="required">*</span></label
                  >
                  <p-dropdown
                    id="difficulty"
                    formControlName="difficulty"
                    [options]="difficultyOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select difficulty"
                  ></p-dropdown>
                </div>

                <div class="field checkbox-field">
                  <label class="checkbox-container">
                    <p-checkbox
                      formControlName="allowMultipleCorrect"
                      [binary]="true"
                      inputId="allowMultipleCorrect"
                    ></p-checkbox>
                    <label for="allowMultipleCorrect" class="checkbox-label"
                      >Allow multiple correct answers</label
                    >
                  </label>
                </div>

                <div class="field checkbox-field">
                  <label class="checkbox-container">
                    <p-checkbox
                      formControlName="randomizeOptions"
                      [binary]="true"
                      inputId="randomizeOptions"
                    ></p-checkbox>
                    <label for="randomizeOptions" class="checkbox-label"
                      >Randomize option order</label
                    >
                  </label>
                </div>
              </div>
            </div>

            <!-- Options Section -->
            <div class="form-section">
              <div class="section-header">
                <h2>Answer Options</h2>
                <button
                  type="button"
                  pButton
                  icon="pi pi-plus"
                  label="Add Option"
                  (click)="addOption()"
                  [disabled]="options.length >= 10"
                ></button>
              </div>

              <div formArrayName="options">
                <div
                  *ngFor="let option of options.controls; let i = index"
                  class="option-item"
                >
                  <div [formGroupName]="i" class="option-row">
                    <div class="option-number">{{ i + 1 }}</div>

                    <div class="option-content">
                      <div class="field mb-0">
                        <textarea
                          pInputTextarea
                          formControlName="text"
                          [rows]="2"
                          placeholder="Enter option text"
                        ></textarea>
                        <small
                          *ngIf="
                            option.get('text')?.invalid &&
                            option.get('text')?.touched
                          "
                          class="error-text"
                        >
                          Option text is required
                        </small>
                      </div>
                    </div>

                    <div class="option-correct">
                      <div
                        *ngIf="!questionForm.get('allowMultipleCorrect')?.value"
                        class="radio-button"
                      >
                        <p-radioButton
                          [inputId]="'correct-' + i"
                          [value]="i"
                          [(ngModel)]="correctOptionIndex"
                          [ngModelOptions]="{ standalone: true }"
                        ></p-radioButton>
                        <label [for]="'correct-' + i">Correct</label>
                      </div>
                      <div
                        *ngIf="questionForm.get('allowMultipleCorrect')?.value"
                        class="checkbox"
                      >
                        <p-checkbox
                          [inputId]="'correct-multi-' + i"
                          [binary]="true"
                          formControlName="isCorrect"
                        ></p-checkbox>
                        <label [for]="'correct-multi-' + i">Correct</label>
                      </div>
                    </div>

                    <div class="option-actions">
                      <button
                        type="button"
                        pButton
                        icon="pi pi-trash"
                        class="p-button-danger p-button-text"
                        (click)="removeOption(i)"
                        [disabled]="options.length <= 2"
                      ></button>
                    </div>
                  </div>
                </div>
              </div>

              <small
                *ngIf="showCorrectAnswerError"
                class="error-text mt-2 block"
              >
                Please select at least one correct answer
              </small>
            </div>

            <!-- Preview Section -->
            <div class="form-section preview-section">
              <h2>Question Preview</h2>
              <div class="preview-container">
                <div class="preview-question">
                  <h3>{{ questionForm.get('title')?.value || 'Question' }}</h3>
                  <p>
                    {{
                      questionForm.get('instruction')?.value ||
                        'Your question text will appear here'
                    }}
                  </p>
                </div>

                <div class="preview-options">
                  <div
                    *ngFor="let option of options.controls; let i = index"
                    class="preview-option"
                  >
                    <div class="option-label">{{ getOptionLabel(i) }}</div>
                    <div class="option-text">
                      {{ option.get('text')?.value || 'Option text' }}
                    </div>
                    <div *ngIf="isOptionCorrect(i)" class="correct-indicator">
                      Correct
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Form Actions -->
            <div class="form-actions">
              <button
                type="button"
                pButton
                icon="pi pi-times"
                label="Cancel"
                class="p-button-outlined"
                (click)="onCancel()"
              ></button>
              <button
                type="submit"
                pButton
                icon="pi pi-save"
                label="Save Question"
                [disabled]="isSaving"
              ></button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <p-toast></p-toast>
    <p-confirmDialog
      header="Confirm"
      icon="pi pi-exclamation-triangle"
      acceptLabel="Yes, discard changes"
      rejectLabel="No, continue editing"
    ></p-confirmDialog>
  `,
  styles: [
    `
      .multiple-choice-editor {
        max-width: 1100px;
        margin: 0 auto;
        padding: 1.5rem;
      }

      .header-section {
        margin-bottom: 2rem;
      }

      h1 {
        margin-bottom: 0.5rem;
        color: var(--primary-color, #3b82f6);
        font-size: 1.75rem;
      }

      .subtitle {
        color: #64748b;
        font-size: 1rem;
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 300px;
      }

      .spinner {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 3px solid #e2e8f0;
        border-top-color: #3b82f6;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .editor-container {
        background: white;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }

      .form-grid {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        padding: 1.5rem;
      }

      .form-section {
        background: #f8fafc;
        border-radius: 8px;
        padding: 1.5rem;
        border: 1px solid #e2e8f0;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.25rem;
      }

      h2 {
        margin: 0 0 1.25rem 0;
        font-size: 1.25rem;
        color: #334155;
        font-weight: 600;
      }

      .field {
        margin-bottom: 1.5rem;
      }

      .field-row {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
      }

      .field-row .field {
        flex: 1;
        min-width: 200px;
      }

      label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #475569;
      }

      .checkbox-container {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 2rem;
      }

      .checkbox-label {
        margin: 0;
      }

      .option-item {
        margin-bottom: 1rem;
        background: white;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
        overflow: hidden;
      }

      .option-row {
        display: flex;
        align-items: stretch;
      }

      .option-number {
        display: flex;
        align-items: center;
        justify-content: center;
        background: #eff6ff;
        color: #2563eb;
        font-weight: 600;
        padding: 0 1rem;
        min-width: 50px;
      }

      .option-content {
        flex: 1;
        padding: 0.75rem;
      }

      .option-correct {
        display: flex;
        align-items: center;
        padding: 0 0.75rem;
        min-width: 100px;
      }

      .option-correct label {
        margin: 0 0 0 0.5rem;
      }

      .option-actions {
        display: flex;
        align-items: center;
        padding: 0 0.5rem;
      }

      .preview-section {
        border: 1px solid #e2e8f0;
        background: white;
      }

      .preview-container {
        background: #f9fafb;
        border-radius: 6px;
        padding: 1.5rem;
        border: 1px dashed #cbd5e1;
      }

      .preview-question {
        margin-bottom: 1.5rem;
      }

      .preview-question h3 {
        margin: 0 0 0.75rem 0;
        font-size: 1.125rem;
        color: #1e293b;
      }

      .preview-question p {
        margin: 0;
        color: #475569;
      }

      .preview-options {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .preview-option {
        display: flex;
        align-items: center;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        padding: 0.75rem;
        position: relative;
      }

      .option-label {
        font-weight: 600;
        color: #3b82f6;
        margin-right: 0.75rem;
        width: 30px;
      }

      .option-text {
        flex: 1;
        color: #1e293b;
      }

      .correct-indicator {
        background: #dcfce7;
        color: #16a34a;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.25rem 0.75rem;
        border-radius: 100px;
        margin-left: 0.75rem;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 1rem;
      }

      .required {
        color: #ef4444;
      }

      .optional {
        color: #94a3b8;
        font-size: 0.875rem;
        font-weight: normal;
      }

      .error-text {
        color: #ef4444;
        font-size: 0.75rem;
        margin-top: 0.25rem;
        display: block;
      }

      .mt-2 {
        margin-top: 0.5rem;
      }

      .mb-0 {
        margin-bottom: 0;
      }

      .block {
        display: block;
      }

      @media (max-width: 768px) {
        .field-row {
          flex-direction: column;
          gap: 0;
        }

        .field-row .field {
          margin-bottom: 1.5rem;
        }

        .option-correct {
          min-width: 80px;
        }
      }
    `,
  ],
})
export class MultipleChoiceEditorComponent implements OnInit {
  questionForm!: FormGroup;
  testId: string = '';
  questionId?: string;
  isEditMode = false;
  loading = true;
  isSaving = false;
  testInfo: any = null;
  correctOptionIndex: number = 0;
  showCorrectAnswerError = false;

  difficultyOptions = [
    { label: 'Easy', value: 'easy' },
    { label: 'Medium', value: 'medium' },
    { label: 'Hard', value: 'hard' },
    { label: 'Expert', value: 'expert' },
  ];

  get options() {
    return this.questionForm.get('options') as FormArray;
  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private testService: TestManagementService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.initForm();

    this.route.paramMap.subscribe((params) => {
      this.testId = params.get('testId') || '';
      this.questionId = params.get('questionId') || undefined;

      this.isEditMode = !!this.questionId;

      if (this.testId) {
        this.loadTestInfo();
        if (this.isEditMode && this.questionId) {
          this.loadQuestion();
        } else {
          // In create mode, add default two empty options
          this.addOption();
          this.addOption();
          this.loading = false;
        }
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Test ID is missing. Cannot create question.',
        });
        this.router.navigate(['/dashboard/RaisonnementLogique/Tests']);
      }
    });
  }

  initForm(): void {
    this.questionForm = this.fb.group({
      title: [''],
      instruction: ['', Validators.required],
      difficulty: ['medium', Validators.required],
      allowMultipleCorrect: [false],
      randomizeOptions: [false],
      options: this.fb.array([]),
    });

    // Listen for changes in the allowMultipleCorrect checkbox
    this.questionForm
      .get('allowMultipleCorrect')
      ?.valueChanges.subscribe((allowMultiple) => {
        // When switching to single choice, reset all isCorrect flags and just use correctOptionIndex
        if (!allowMultiple) {
          const optionsArray = this.questionForm.get('options') as FormArray;
          optionsArray.controls.forEach((control, index) => {
            control
              .get('isCorrect')
              ?.setValue(index === this.correctOptionIndex);
          });
        } else {
          // When switching to multiple choice, set isCorrect based on correctOptionIndex
          const optionsArray = this.questionForm.get('options') as FormArray;
          optionsArray.controls.forEach((control, index) => {
            control
              .get('isCorrect')
              ?.setValue(index === this.correctOptionIndex);
          });
        }
      });
  }

  loadTestInfo(): void {
    this.testService.getTestById(this.testId).subscribe({
      next: (test) => {
        this.testInfo = test;
      },
      error: (error) => {
        console.error('Error loading test info:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load test information',
        });
      },
    });
  }

  loadQuestion(): void {
    if (!this.questionId) return;

    this.loading = true;
    this.testService.getQuestionById(this.questionId).subscribe({
      next: (question: any) => {
        if (question && question.questionType === 'MultipleChoiceQuestion') {
          this.populateFormWithQuestion(question as MultipleChoiceQuestion);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Invalid question type or question not found',
          });
          this.router.navigate([
            '/dashboard/RaisonnementLogique/Tests',
            this.testId,
          ]);
        }
      },
      error: (error) => {
        console.error('Error loading question:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load question',
        });
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  populateFormWithQuestion(question: MultipleChoiceQuestion): void {
    // Clear the existing options array
    while (this.options.length !== 0) {
      this.options.removeAt(0);
    }

    // Add options from the question
    if (question.options && question.options.length > 0) {
      question.options.forEach((option) => {
        this.options.push(this.createOption(option.text, option.isCorrect));
      });
    } else {
      // Add default options if none exist
      this.addOption();
      this.addOption();
    }

    // Set correctOptionIndex if available and not using multiple correct
    if (
      question.correctOptionIndex !== undefined &&
      !question.allowMultipleCorrect
    ) {
      this.correctOptionIndex = question.correctOptionIndex;
    } else {
      // Find the first correct option for single choice mode
      const correctIndex = question.options.findIndex((opt) => opt.isCorrect);
      this.correctOptionIndex = correctIndex >= 0 ? correctIndex : 0;
    }

    // Update the form values
    this.questionForm.patchValue({
      title: question.title || '',
      instruction: question.instruction,
      difficulty: question.difficulty,
      allowMultipleCorrect: question.allowMultipleCorrect,
      randomizeOptions: question.randomizeOptions,
    });
  }

  createOption(text: string = '', isCorrect: boolean = false) {
    return this.fb.group({
      text: [text, Validators.required],
      isCorrect: [isCorrect],
    });
  }

  addOption(): void {
    this.options.push(this.createOption());
  }

  removeOption(index: number): void {
    if (this.options.length <= 2) {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'A question must have at least two options',
      });
      return;
    }

    this.options.removeAt(index);

    // If removing the correct option in single choice mode, reset the index
    if (
      !this.questionForm.get('allowMultipleCorrect')?.value &&
      index === this.correctOptionIndex
    ) {
      this.correctOptionIndex = 0;
    }
  }

  isOptionCorrect(index: number): boolean {
    if (this.questionForm.get('allowMultipleCorrect')?.value) {
      return this.options.at(index).get('isCorrect')?.value;
    } else {
      return index === this.correctOptionIndex;
    }
  }

  getOptionLabel(index: number): string {
    return String.fromCharCode(65 + index) + '.';
  }

  onCancel(): void {
    if (this.questionForm.dirty) {
      this.confirmationService.confirm({
        message: 'You have unsaved changes. Are you sure you want to leave?',
        accept: () => {
          this.navigateBack();
        },
      });
    } else {
      this.navigateBack();
    }
  }

  navigateBack(): void {
    this.router.navigate(['/dashboard/RaisonnementLogique/Tests', this.testId]);
  }

  prepareQuestionData(): any {
    // Get base form values
    const formValue = this.questionForm.value;

    // Update the isCorrect flags for options if in single choice mode
    if (!formValue.allowMultipleCorrect) {
      formValue.options.forEach((option: any, index: number) => {
        option.isCorrect = index === this.correctOptionIndex;
      });
    }

    // Prepare the question data
    const questionData: any = {
      testId: this.testId,
      title: formValue.title,
      instruction: formValue.instruction,
      difficulty: formValue.difficulty,
      questionType: 'MultipleChoiceQuestion',
      allowMultipleCorrect: formValue.allowMultipleCorrect,
      randomizeOptions: formValue.randomizeOptions,
      options: formValue.options,
      // Only include correctOptionIndex for single-choice questions
      correctOptionIndex: !formValue.allowMultipleCorrect
        ? this.correctOptionIndex
        : undefined,
    };

    // If editing, include the question ID
    if (this.isEditMode && this.questionId) {
      questionData._id = this.questionId;
    }

    return questionData;
  }

  validateForm(): boolean {
    if (!this.questionForm.valid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please complete all required fields correctly',
      });

      // Mark all fields as touched to show validation errors
      this.questionForm.markAllAsTouched();
      return false;
    }

    // Check if at least one correct answer is selected
    const formValue = this.questionForm.value;
    let hasCorrectAnswer = false;

    if (formValue.allowMultipleCorrect) {
      // For multiple correct, check if any option has isCorrect=true
      hasCorrectAnswer = formValue.options.some((opt: any) => opt.isCorrect);
    } else {
      // For single correct, correctOptionIndex should be valid
      hasCorrectAnswer =
        this.correctOptionIndex >= 0 &&
        this.correctOptionIndex < formValue.options.length;
    }

    if (!hasCorrectAnswer) {
      this.showCorrectAnswerError = true;
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please select at least one correct answer',
      });
      return false;
    }

    this.showCorrectAnswerError = false;
    return true;
  }

  saveQuestion(): void {
    if (!this.validateForm()) return;

    this.isSaving = true;
    const questionData = this.prepareQuestionData();

    if (this.isEditMode && this.questionId) {
      // Update existing question
      this.testService.updateQuestion(this.questionId, questionData).subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Question updated successfully',
          });
          setTimeout(() => this.navigateBack(), 1500);
        },
        error: (error) => {
          console.error('Error updating question:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              'Failed to update question: ' +
              (error.message || 'Unknown error'),
          });
          this.isSaving = false;
        },
      });
    } else {
      // Create new question
      this.testService.createQuestion(this.testId, questionData).subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Question created successfully',
          });
          setTimeout(() => this.navigateBack(), 1500);
        },
        error: (error) => {
          console.error('Error creating question:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              'Failed to create question: ' +
              (error.message || 'Unknown error'),
          });
          this.isSaving = false;
        },
      });
    }
  }
}
