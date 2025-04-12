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
import { IftaLabelModule } from 'primeng/iftalabel';

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
    IftaLabelModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './multiple-choice-editor.component.html',
  styleUrls: ['./multiple-choice-editor.component.css'],
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
