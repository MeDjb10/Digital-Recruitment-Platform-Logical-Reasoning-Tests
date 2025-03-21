import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';

import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';

// PrimeNG components
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { User } from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'app-application-form',
  templateUrl: './application-form.component.html',
  styleUrls: ['./application-form.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StepperModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    DropdownModule,
    CalendarModule,
    RadioButtonModule,
    CardModule,
    DividerModule,
    ToastModule,
  ],
  providers: [MessageService],
})
export class ApplicationFormComponent implements OnInit {
  currentUser: User | null = null;
  personalInfoForm!: FormGroup;
  jobInfoForm!: FormGroup;
  submitting = false;
  maxDate = new Date(); // For date of birth - can't be future date

  // Dropdown options
  genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
 
  ];

  educationOptions = [
    { label: 'High School', value: 'high_school' },
    { label: 'Associate Degree', value: 'associate' },
    { label: "Bachelor's Degree", value: 'bachelors' },
    { label: "Master's Degree", value: 'masters' },
    { label: 'Doctorate', value: 'doctorate' },
    { label: 'Professional Certification', value: 'certification' },
  ];

  availabilityOptions = [
    { label: 'Immediately', value: 'immediately' },
    { label: 'Within 1 week', value: 'one_week' },
    { label: 'Within 2 weeks', value: 'two_weeks' },
    { label: 'Within a month', value: 'one_month' },
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.initializeForms();
  }

  initializeForms(): void {
    // Personal information form
    this.personalInfoForm = this.fb.group({
      firstName: [
        this.currentUser?.firstName || '',
        [Validators.required, Validators.minLength(2)],
      ],
      lastName: [
        this.currentUser?.lastName || '',
        [Validators.required, Validators.minLength(2)],
      ],
      email: [
        this.currentUser?.email || '',
        [Validators.required, Validators.email],
      ],
      gender: [this.currentUser?.gender || '', Validators.required],
      dateOfBirth: [
        this.currentUser?.dateOfBirth
          ? new Date(this.currentUser?.dateOfBirth)
          : null,
        Validators.required,
      ],
    });

    // Job information form
    this.jobInfoForm = this.fb.group({
      currentPosition: [
        this.currentUser?.currentPosition || '',
        Validators.required,
      ],
      desiredPosition: [
        this.currentUser?.desiredPosition || '',
        Validators.required,
      ],
      educationLevel: [
        this.currentUser?.educationLevel || '',
        Validators.required,
      ],
      availability: ['immediately', Validators.required], // Default value
    });
  }

  // Computed properties for label display
  get genderLabel(): string {
    const gender = this.personalInfoForm.get('gender')?.value;
    const option = this.genderOptions.find((g) => g.value === gender);
    return option ? option.label : '';
  }

  get educationLabel(): string {
    const education = this.jobInfoForm.get('educationLevel')?.value;
    const option = this.educationOptions.find((e) => e.value === education);
    return option ? option.label : '';
  }

  get availabilityLabel(): string {
    const availability = this.jobInfoForm.get('availability')?.value;
    const option = this.availabilityOptions.find(
      (a) => a.value === availability
    );
    return option ? option.label : '';
  }

  // Validation helpers for template
  isFieldInvalid(form: FormGroup, field: string): boolean {
    return (
      (form.get(field)?.invalid &&
        (form.get(field)?.dirty || form.get(field)?.touched)) ||
      false
    );
  }

  // Submit form data
  onSubmit(): void {
    if (
      this.personalInfoForm.invalid ||
      this.jobInfoForm.invalid ||
      !this.currentUser?.id
    ) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please complete all required fields correctly.',
        life: 5000,
      });
      return;
    }

    this.submitting = true;

    // Combine form data
    const formData = {
      ...this.personalInfoForm.value,
      ...this.jobInfoForm.value,
      // Format date to ISO string if needed
      dateOfBirth: this.personalInfoForm.value.dateOfBirth
        ? this.personalInfoForm.value.dateOfBirth.toISOString()
        : undefined,
    };

    this.userService.updateUser(this.currentUser.id, formData).subscribe({
      next: (response) => {
        this.submitting = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Your application has been submitted successfully!',
          life: 5000,
        });

        // Navigate to tests page after a short delay
        setTimeout(() => {
          this.router.navigate(['/tests']);
        }, 2000);
      },
      error: (error) => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to submit your application: ${error.message}`,
          life: 5000,
        });
      },
    });
  }

  // Add to your component.ts
  // This updates the progress bar when moving between steps

  // Add this method to your component
  updateProgress(step: number): void {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
      // Calculate progress based on step
      const progress = Math.min(100, step * 33);
      progressBar.style.width = `${progress}%`;
    }
  }

  // Modify your activateCallback handling to include progress updates
  // For example, where you use (onClick)="activateCallback(2)", you might use:
  // (onClick)="changeStep(2, activateCallback)"

  // Add this method to your component
  changeStep(step: number, activateCallback: Function): void {
    this.updateProgress(step);
    activateCallback(step);
  }
}