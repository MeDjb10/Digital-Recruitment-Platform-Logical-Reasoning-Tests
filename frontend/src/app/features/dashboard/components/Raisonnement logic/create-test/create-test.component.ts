import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TestManagementService } from '../../../../../core/services/test-management.service';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { ChipModule } from 'primeng/chip';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FieldsetModule } from 'primeng/fieldset';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

interface AutoCompleteCompleteEvent {
  originalEvent: Event;
  query: string;
}

@Component({
  selector: 'app-create-test',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    DropdownModule,
    ButtonModule,
    CheckboxModule,
    ToastModule,
    CardModule,
    TooltipModule,
    DividerModule,
    ChipModule,
    RadioButtonModule,
    FieldsetModule,
    AutoCompleteModule,
    FloatLabelModule,
    ProgressSpinnerModule,
  ],
  providers: [MessageService],
  templateUrl: './create-test.component.html',
  styleUrls: ['./create-test.component.css'],
})
export class CreateTestComponent implements OnInit {
  testForm!: FormGroup;
  submitted = false;
  creating = false;
  isEditMode = false;
  testId: string | null = null;
  pageTitle = 'Create New Test';
  pageSubtitle = 'Design a comprehensive assessment for candidate evaluation';
  submitButtonLabel = 'Create Test';

  difficultyOptions = [
    { label: 'Easy', value: 'easy' },
    { label: 'Medium', value: 'medium' },
    { label: 'Hard', value: 'hard' },
    { label: 'Expert', value: 'expert' },
  ];

  categoryOptions = [
    { label: 'Logical Reasoning', value: 'logical' },
    { label: 'Personality Assessment', value: 'personality' },
    { label: 'Cognitive Ability', value: 'cognitive' },
    { label: 'Verbal Reasoning', value: 'verbal' },
  ];

  testTypeOptions = [
    { label: 'Domino Test', value: 'domino' },
    { label: 'Multiple Choice Test', value: 'multiple-choice' },
    { label: 'Verbal Assessment', value: 'verbal' },
  ];

  // For simplified version control
  versionOptions = [
    { label: '1.0', value: 1 },
    { label: '2.0', value: 2 },
    { label: '3.0', value: 3 },
  ];

  // Updated tag management properties
  newTag: string = '';
  filteredTags: string[] = [];

  // Expanded tag suggestions
  suggestedTags: string[] = [
    'recruitment',
    'logical',
    'analytical',
    'patterns',
    'reasoning',
    'problem-solving',
    'technical',
    'executive',
    'interview',
    'entry-level',
    'senior',
    'cognitive',
    'evaluation',
    'assessment',
    'performance',
  ];

  constructor(
    private fb: FormBuilder,
    private testService: TestManagementService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.filteredTags = [...this.suggestedTags]; // Initialize with all suggestions

    // Check if we are in edit mode by looking for a testId parameter
    this.route.paramMap.subscribe((params) => {
      this.testId = params.get('testId');
      this.isEditMode = !!this.testId;

      if (this.isEditMode && this.testId) {
        this.pageTitle = 'Edit Test';
        this.pageSubtitle = 'Modify test properties and settings';
        this.submitButtonLabel = 'Save Changes';
        this.creating = true; // Show loading state

        // Load the test data
        this.testService.getTestById(this.testId).subscribe({
          next: (test) => {
            if (test) {
              // Populate the form with existing test data
              this.testForm.patchValue({
                name: test.name,
                description: test.description,
                category: test.category,
                type: test.type,
                duration: test.duration,
                difficulty: test.difficulty,
                instructions: test.instructions || '',
                tags: test.tags || [],
                isActive: test.isActive,
                totalQuestions: test.totalQuestions || 0,
              });

              this.messageService.add({
                severity: 'info',
                summary: 'Test Loaded',
                detail: 'Test data loaded successfully',
                life: 3000,
              });
            } else {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load test data',
                life: 5000,
              });
              this.router.navigate(['/dashboard/RaisonnementLogique/Tests']);
            }
          },
          error: (error) => {
            console.error('Error loading test:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: `Failed to load test: ${
                error.message || 'Unknown error'
              }`,
              life: 5000,
            });
            this.router.navigate(['/dashboard/RaisonnementLogique/Tests']);
          },
          complete: () => {
            this.creating = false;
          },
        });
      }
    });
  }

  initForm(): void {
    this.testForm = this.fb.group({
      name: ['', [Validators.required]],
      description: ['', [Validators.required]],
      category: ['logical', [Validators.required]],
      type: ['domino', [Validators.required]],
      duration: [
        30,
        [Validators.required, Validators.min(1), Validators.max(120)],
      ],
      difficulty: ['medium', [Validators.required]],
      instructions: [''],
      tags: [[]],
      version: [1],
      isActive: [true],
      totalQuestions: [
        10,
        [Validators.required, Validators.min(1), Validators.max(100)],
      ],
    });
  }

  get f() {
    return this.testForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.testForm.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please complete all required fields correctly.',
      });
      return;
    }

    this.creating = true;

    // Prepare the test data
    const testData = {
      ...this.testForm.value,
      createdBy: this.getCurrentUserId(),
    };

    if (this.isEditMode && this.testId) {
      // Update existing test
      this.testService.updateTest(this.testId, testData).subscribe({
        next: (test) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Test updated successfully',
          });

          setTimeout(() => {
            this.router.navigate([
              '/dashboard/RaisonnementLogique/Tests',
              test._id,
            ]);
          }, 1500);
        },
        error: (error) => {
          console.error('Error updating test:', error);
          this.creating = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              'Failed to update test: ' + (error.message || 'Unknown error'),
          });
        },
        complete: () => {
          this.creating = false;
        },
      });
    } else {
      // Create new test
      this.testService.createTest(testData).subscribe({
        next: (test) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Test created successfully',
          });

          setTimeout(() => {
            this.router.navigate([
              '/dashboard/RaisonnementLogique/Tests',
              test._id,
            ]);
          }, 1500);
        },
        error: (error) => {
          console.error('Error creating test:', error);
          this.creating = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              'Failed to create test: ' + (error.message || 'Unknown error'),
          });
        },
        complete: () => {
          this.creating = false;
        },
      });
    }
  }

  // Filter tags for autocomplete (simplified)
  filterTags(event: AutoCompleteCompleteEvent) {
    if (!event || !event.query) {
      this.filteredTags = [...this.suggestedTags];
      return;
    }

    const query = event.query.toLowerCase();
    this.filteredTags = this.suggestedTags.filter(
      (tag) =>
        tag.toLowerCase().includes(query) &&
        !(this.testForm.get('tags')?.value || []).includes(tag)
    );
  }

  // Add a new tag from autocomplete or manual entry
  addTag(): void {
    if (!this.newTag || this.newTag.trim() === '') {
      return;
    }

    const tag = this.newTag.trim().toLowerCase();
    const currentTags = [...(this.testForm.get('tags')?.value || [])];

    if (!currentTags.includes(tag)) {
      this.testForm.patchValue({
        tags: [...currentTags, tag],
      });

      // Show success toast for feedback
      this.messageService.add({
        severity: 'info',
        summary: 'Tag Added',
        detail: `"${tag}" has been added to tags`,
        life: 2000,
      });
    }

    this.newTag = '';
  }

  // Add a tag selected from autocomplete
  selectTag(tag: any): void {
    if (
      typeof tag === 'object' &&
      Object.prototype.hasOwnProperty.call(tag, 'value')
    ) {
      tag = (tag as { value: string }).value;
    }

    const currentTags = [...(this.testForm.get('tags')?.value || [])];

    if (!currentTags.includes(tag)) {
      this.testForm.patchValue({
        tags: [...currentTags, tag],
      });
    }

    this.newTag = '';
  }

  // Remove a tag
  removeTag(tag: string): void {
    const currentTags = [...(this.testForm.get('tags')?.value || [])];
    this.testForm.patchValue({
      tags: currentTags.filter((t) => t !== tag),
    });

    // Show info toast for feedback
    this.messageService.add({
      severity: 'info',
      summary: 'Tag Removed',
      detail: `"${tag}" has been removed`,
      life: 2000,
    });
  }

  // Handle enter key in tag input
  onTagInputKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addTag();
    }
  }

  // Helper method to get the current logged in user ID - you'll need to implement this based on your auth system
  getCurrentUserId(): string {
    // This is a placeholder - replace with your actual authentication logic
    return 'current-admin-user-id';
  }

  goBack(): void {
    if (this.isEditMode && this.testId) {
      this.router.navigate([
        '/dashboard/RaisonnementLogique/Tests',
        this.testId,
      ]);
    } else {
      this.router.navigate(['/dashboard/RaisonnementLogique/Tests']);
    }
  }
}
