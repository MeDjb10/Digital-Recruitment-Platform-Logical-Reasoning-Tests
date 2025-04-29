import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DropdownModule } from 'primeng/dropdown';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TestManagementService } from '../../../../../core/services/test-management.service';
import { MultipleChoiceQuestion } from '../../../../../core/models/question.model';
import { Subscription } from 'rxjs';
import { SelectButtonModule } from 'primeng/selectbutton';
import { IftaLabelModule } from 'primeng/iftalabel';
@Component({
  selector: 'app-multiple-choice-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    DropdownModule,
    CardModule,
    DividerModule,
    ToastModule,
    ConfirmDialogModule,
    SelectButtonModule,
    IftaLabelModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './multiple-choice-editor.component.html',
  styleUrls: ['./multiple-choice-editor.component.css'],
})
export class MultipleChoiceEditorComponent implements OnInit, OnDestroy {
  questionForm!: FormGroup;
  testId: string = '';
  questionId?: string;
  isEditMode = false;
  loading = true;
  isSaving = false;
  testInfo: any = null;
  private routeSub!: Subscription;
  private testInfoSub!: Subscription;
  private questionSub!: Subscription;
  private saveSub!: Subscription;

  difficultyOptions = [
    { label: 'Easy', value: 'easy' },
    { label: 'Medium', value: 'medium' },
    { label: 'Hard', value: 'hard' },
    { label: 'Expert', value: 'expert' },
  ];

  evaluationOptions = [
    { label: 'Vrai (V)', value: 'V' },
    { label: 'Faux (F)', value: 'F' },
    { label: 'Ne sait pas (?)', value: '?' },
  ];

  get propositions() {
    return this.questionForm.get('propositions') as FormArray;
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

    this.routeSub = this.route.paramMap.subscribe((params) => {
      this.testId = params.get('testId') || '';
      this.questionId = params.get('questionId') || undefined;
      this.isEditMode = !!this.questionId;

      if (!this.testId) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Test ID is missing.',
        });
        this.router.navigate(['/dashboard/RaisonnementLogique/Tests']);
        return;
      }

      this.loadTestInfo();
      if (this.isEditMode && this.questionId) {
        this.loadQuestion();
      } else {
        this.addProposition();
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.testInfoSub?.unsubscribe();
    this.questionSub?.unsubscribe();
    this.saveSub?.unsubscribe();
  }

  initForm(): void {
    this.questionForm = this.fb.group({
      title: [''],
      instruction: ['', Validators.required],
      difficulty: ['medium', Validators.required],
      propositions: this.fb.array([]),
    });
  }

  loadTestInfo(): void {
    this.testInfoSub = this.testService.getTestById(this.testId).subscribe({
      next: (response) => {
        this.testInfo = response;
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

    console.log(`[Editor] Loading question with ID: ${this.questionId}`); // Log start
    this.loading = true;
    this.questionSub = this.testService // This is actually TestManagementService
      .getQuestionById(this.questionId)
      .subscribe({
        // The 'response' here is the Question object itself, or null
        next: (question) => {
          console.log('[Editor] Received question data:', question); // Log received data

          // Check if question data exists and is the correct type
          if (question && question.questionType === 'MultipleChoiceQuestion') {
            console.log('[Editor] Question type is correct. Populating form.'); // Log success path
            this.populateFormWithQuestion(question as MultipleChoiceQuestion);
          } else {
            // Handle cases where question is null or wrong type
            console.error(
              `[Editor] Question not found, null, or invalid type (${question?.questionType}). Navigating back.`
            ); // Log failure path
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Question not found or invalid type.',
            });
            this.navigateBack(); // Navigate back if type is wrong or question is null
          }
        },
        error: (error) => {
          console.error('[Editor] Error loading question:', error); // Log error
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to load question: ${
              error.message || 'Unknown error'
            }`,
          });
          this.loading = false;
          this.navigateBack(); // Navigate back on error
        },
        complete: () => {
          console.log('[Editor] Finished loading question.'); // Log completion
          this.loading = false;
        },
      });
  }

  populateFormWithQuestion(question: MultipleChoiceQuestion): void {
    this.propositions.clear();

    if (question.propositions && question.propositions.length > 0) {
      question.propositions.forEach((prop) => {
        this.propositions.push(
          this.createProposition(prop.text, prop.correctEvaluation)
        );
      });
    } else {
      this.addProposition();
    }

    this.questionForm.patchValue({
      title: question.title || '',
      instruction: question.instruction,
      difficulty: question.difficulty,
    });
  }

  createProposition(
    text: string = '',
    correctEvaluation: 'V' | 'F' | '?' | null = null
  ): FormGroup {
    return this.fb.group({
      text: [text, Validators.required],
      correctEvaluation: [correctEvaluation, Validators.required],
    });
  }

  addProposition(): void {
    this.propositions.push(this.createProposition());
  }

  removeProposition(index: number): void {
    if (this.propositions.length <= 1) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'A question must have at least one proposition',
      });
      return;
    }
    this.propositions.removeAt(index);
  }

  getPropositionLabel(index: number): string {
    return `Proposition ${index + 1}:`;
  }

  onCancel(): void {
    if (this.questionForm.dirty) {
      this.confirmationService.confirm({
        message: 'You have unsaved changes. Are you sure you want to leave?',
        header: 'Unsaved Changes',
        icon: 'pi pi-exclamation-triangle',
        acceptButtonStyleClass: 'p-button-danger',
        rejectButtonStyleClass: 'p-button-text',
        accept: () => this.navigateBack(),
        reject: () => {},
      });
    } else {
      this.navigateBack();
    }
  }

  navigateBack(): void {
    console.log(
      `[Editor] Navigating back to test details for test ID: ${this.testId}`
    ); // Log navigation
    this.router.navigate(['/dashboard/RaisonnementLogique/Tests', this.testId]);
  }

  prepareQuestionData(): any {
    const formValue = this.questionForm.value;

    const questionData: any = {
      testId: this.testId,
      title: formValue.title || null,
      instruction: formValue.instruction,
      difficulty: formValue.difficulty,
      questionType: 'MultipleChoiceQuestion',
      propositions: formValue.propositions.map((prop: any) => ({
        text: prop.text,
        correctEvaluation: prop.correctEvaluation,
      })),
    };

    return questionData;
  }

  validateForm(): boolean {
    this.questionForm.markAllAsTouched();

    if (!this.questionForm.valid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please complete all required fields correctly.',
      });
      return false;
    }

    if (this.propositions.length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'At least one proposition is required.',
      });
      return false;
    }

    const allEvaluationsSet = this.propositions.controls.every(
      (control: AbstractControl) => !!control.get('correctEvaluation')?.value
    );
    if (!allEvaluationsSet) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail:
          'Please select the correct evaluation (V, F, or ?) for every proposition.',
      });
      this.propositions.controls.forEach((control) => {
        if (!control.get('correctEvaluation')?.value) {
          control.get('correctEvaluation')?.markAsTouched();
        }
      });
      return false;
    }

    return true;
  }

  saveQuestion(): void {
    if (!this.validateForm()) return;

    this.isSaving = true;
    const questionData = this.prepareQuestionData();
    console.log('Saving question data:', questionData);

    const operation =
      this.isEditMode && this.questionId
        ? this.testService.updateQuestion(this.questionId, questionData)
        : this.testService.createQuestion(this.testId, questionData);

    this.saveSub = operation.subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Question ${
            this.isEditMode ? 'updated' : 'created'
          } successfully`,
        });
        this.questionForm.markAsPristine();
        setTimeout(() => this.navigateBack(), 1500);
      },
      error: (error) => {
        console.error(
          `Error ${this.isEditMode ? 'updating' : 'creating'} question:`,
          error
        );
        const detail =
          error?.error?.message || error?.message || 'Unknown error';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to ${
            this.isEditMode ? 'update' : 'create'
          } question: ${detail}`,
        });
        this.isSaving = false;
      },
      complete: () => {
        this.isSaving = false;
      },
    });
  }
}
