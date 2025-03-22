import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { TestManagementService } from '../../../../../core/services/test-management.service';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';

import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';

@Component({
  selector: 'app-create-test',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule, // Corrected from InputTextarea
    DropdownModule,
    ButtonModule, // Make sure this is included
    CheckboxModule,
    ToastModule,
  ],
  providers: [MessageService],
  template: `
    <div class="create-test-container">
      <div class="header">
        <h1>Create New Logical Reasoning Test</h1>
      </div>

      <form [formGroup]="testForm" (ngSubmit)="onSubmit()">
        <div class="p-fluid form-grid">
          <div class="form-field">
            <label for="name">Test Name*</label>
            <input
              id="name"
              type="text"
              pInputText
              formControlName="name"
              [ngClass]="{
                'ng-invalid ng-dirty': submitted && f['name'].errors
              }"
            />
            <small
              class="p-error"
              *ngIf="submitted && f['name'].errors?.['required']"
            >
              Test name is required.
            </small>
          </div>

          <div class="form-field">
            <label for="description">Description*</label>
            <textarea
              id="description"
              pInputTextarea
              formControlName="description"
              [rows]="3"
              [ngClass]="{
                'ng-invalid ng-dirty': submitted && f['description'].errors
              }"
            ></textarea>
            <small
              class="p-error"
              *ngIf="submitted && f['description'].errors?.['required']"
            >
              Description is required.
            </small>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label for="duration">Duration (minutes)*</label>
              <p-inputNumber
                id="duration"
                formControlName="duration"
                [min]="1"
                [max]="120"
                [showButtons]="true"
                [ngClass]="{
                  'ng-invalid ng-dirty': submitted && f['duration'].errors
                }"
              ></p-inputNumber>
              <small
                class="p-error"
                *ngIf="submitted && f['duration'].errors?.['required']"
              >
                Duration is required.
              </small>
            </div>

            <div class="form-field">
              <label for="difficulty">Difficulty*</label>
              <p-dropdown
                id="difficulty"
                formControlName="difficulty"
                [options]="difficultyOptions"
                optionLabel="label"
                optionValue="value"
                [placeholder]="'Select Difficulty'"
                [ngClass]="{
                  'ng-invalid ng-dirty': submitted && f['difficulty'].errors
                }"
              ></p-dropdown>
              <small
                class="p-error"
                *ngIf="submitted && f['difficulty'].errors?.['required']"
              >
                Difficulty is required.
              </small>
            </div>
          </div>

          <div class="form-field">
            <label for="instructions">General Instructions</label>
            <textarea
              id="instructions"
              pInputTextarea
              formControlName="instructionsGeneral"
              [rows]="4"
            ></textarea>
          </div>

          <div class="form-field">
            <div class="p-field-checkbox">
              <p-checkbox
                formControlName="isActive"
                [binary]="true"
                inputId="isActive"
              ></p-checkbox>
              <label for="isActive">Make test active</label>
            </div>
          </div>

          <div class="form-actions">
            <button
              pButton
              type="button"
              label="Cancel"
              class="p-button-outlined"
              (click)="goBack()"
            ></button>
            <button
              pButton
              type="submit"
              label="Create Test"
              [disabled]="creating"
            ></button>
          </div>
        </div>
      </form>
    </div>

    <p-toast></p-toast>
  `,
  styles: [
    `
      .create-test-container {
        padding: 1.5rem;
        max-width: 800px;
        margin: 0 auto;
      }

      .header {
        margin-bottom: 2rem;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 1rem;
      }

      .header h1 {
        margin: 0;
        font-size: 1.5rem;
        color: #1e293b;
      }

      .form-grid {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .form-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
      }

      .form-field {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .form-field label {
        font-weight: 500;
        color: #475569;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 1rem;
      }

      /* Responsive adjustments */
      @media screen and (max-width: 768px) {
        .form-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class CreateTestComponent implements OnInit {
  testForm!: FormGroup;
  submitted = false;
  creating = false;

  difficultyOptions = [
    { label: 'Easy', value: 'easy' },
    { label: 'Medium', value: 'medium' },
    { label: 'Hard', value: 'hard' },
    { label: 'Expert', value: 'expert' },
  ];

  constructor(
    private fb: FormBuilder,
    private testService: TestManagementService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.testForm = this.fb.group({
      name: ['', [Validators.required]],
      description: ['', [Validators.required]],
      duration: [
        30,
        [Validators.required, Validators.min(1), Validators.max(120)],
      ],
      difficulty: ['medium', [Validators.required]],
      instructionsGeneral: [''],
      isActive: [true],
      category: ['logical-reasoning'], // Hidden field, always set for this component
    });
  }

  get f() {
    return this.testForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.testForm.invalid) {
      return;
    }

    this.creating = true;
    this.testService.createTest(this.testForm.value).subscribe(
      (test) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Test created successfully',
        });

        // Navigate to the test details page where questions can be added
        setTimeout(() => {
          this.router.navigate([
            '/dashboard/RaisonnementLogique/Tests',
            test.id,
          ]);
        }, 1500);
      },
      (error) => {
        console.error('Error creating test:', error);
        this.creating = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create test. Please try again.',
        });
      }
    );
  }

  goBack(): void {
    this.router.navigate(['/dashboard/RaisonnementLogique/Tests']);
  }
}
