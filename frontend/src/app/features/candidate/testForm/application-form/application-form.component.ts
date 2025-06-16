import { Component, OnInit, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
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
import { FileUploadModule } from 'primeng/fileupload';
import { ProgressBarModule } from 'primeng/progressbar';
import { BadgeModule } from 'primeng/badge';
import { AuthService } from '../../../../core/auth/services/auth.service';
import {
  User,
  TestAuthorizationRequest,
} from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user.service';
import { DatePickerModule } from 'primeng/datepicker';
import { InputGroupModule } from 'primeng/inputgroup';
import { SelectModule } from 'primeng/select';
import { AvatarModule } from 'primeng/avatar';

import { InputGroupAddonModule } from 'primeng/inputgroupaddon';

// Custom validator for age 18+
export function ageValidator(minAge: number = 18): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Let the required validator handle empty values
    }

    const birthDate = new Date(control.value);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    // Check if birthday hasn't occurred yet this year
    const actualAge =
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ? age - 1
        : age;

    return actualAge < minAge
      ? { minAge: { requiredAge: minAge, actualAge } }
      : null;
  };
}

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
    SelectModule, // Updated
    DatePickerModule,
    RadioButtonModule,
    CardModule,
    DividerModule,
    ToastModule,
    FileUploadModule,
    ProgressBarModule,
    BadgeModule,
    AvatarModule, // New
    InputGroupModule, // New
    InputGroupAddonModule, // New
  ],
  providers: [MessageService],
})
export class ApplicationFormComponent implements OnInit {
  currentUser: User | null = null;
  personalInfoForm!: FormGroup;
  jobInfoForm!: FormGroup;
  companyInfoForm!: FormGroup; // New form for company information
  submitting = false;
  maxDate = new Date(); // For date of birth - can't be future date
  minDate = new Date(); // For date of birth - minimum age 18

  // Profile picture handling
  profilePictureFile: File | undefined;
  profilePicturePreview: string | null = null;
  uploadProgress = 0;
  isDragOver = false;

  // Dropdown options
  genderOptions = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
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

  // Company information options
  jobPositionOptions = [
    { label: 'Software Engineer', value: 'software_engineer' },
    { label: 'Frontend Developer', value: 'frontend_developer' },
    { label: 'Backend Developer', value: 'backend_developer' },
    { label: 'Full Stack Developer', value: 'fullstack_developer' },
    { label: 'DevOps Engineer', value: 'devops_engineer' },
    { label: 'Data Scientist', value: 'data_scientist' },
    { label: 'Project Manager', value: 'project_manager' },
    { label: 'UI/UX Designer', value: 'ui_ux_designer' },
    { label: 'Quality Assurance Engineer', value: 'qa_engineer' },
    { label: 'Business Analyst', value: 'business_analyst' },
    { label: 'Product Manager', value: 'product_manager' },
    { label: 'System Administrator', value: 'system_admin' },
  ];

  companyOptions = [
    { label: 'Cofat Brazil', value: 'cofat_brazil' },
    { label: 'Cofat Tunisia', value: 'cofat_tunisia' },
    { label: 'Cofat Germany', value: 'cofat_germany' },
  ];

  departmentOptions = [
    { label: 'Engineering', value: 'engineering' },
    { label: 'Information Technology', value: 'it' },
    { label: 'Human Resources', value: 'hr' },
    { label: 'Marketing', value: 'marketing' },
    { label: 'Sales', value: 'sales' },
    { label: 'Finance', value: 'finance' },
    { label: 'Operations', value: 'operations' },
    { label: 'Research & Development', value: 'rd' },
    { label: 'Quality Assurance', value: 'qa' },
    { label: 'Customer Support', value: 'support' },
  ];

  @ViewChild('fileUpload') fileUpload: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private messageService: MessageService
  ) {}
  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    // Set minimum date for 18+ validation (18 years ago from today)
    this.minDate = new Date();
    this.minDate.setFullYear(this.minDate.getFullYear() - 100); // Allow up to 100 years old

    // Set maximum date for 18+ validation (18 years ago from today)
    this.maxDate = new Date();
    this.maxDate.setFullYear(this.maxDate.getFullYear() - 18);

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
        [Validators.required, ageValidator(18)], // Updated with custom validator
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

    // Company information form (for test authorization)
    this.companyInfoForm = this.fb.group({
      jobPosition: ['', Validators.required],
      company: ['', Validators.required],
      department: [''],
      additionalInfo: [''],
    });
  } // Profile picture handling methods
  onProfilePictureSelect(event: any): void {
    if (event.currentFiles && event.currentFiles.length > 0) {
      const selectedFile = event.currentFiles[0];

      // Check file size (1MB = 1,000,000 bytes)
      if (selectedFile.size > 1000000) {
        this.messageService.add({
          severity: 'error',
          summary: 'File Too Large',
          detail: `File size (${this.formatSize(
            selectedFile.size
          )}) exceeds the maximum limit of 1MB. Please select a smaller image.`,
          life: 5000,
        });

        // Clear the file upload
        if (this.fileUpload && this.fileUpload.clear) {
          this.fileUpload.clear();
        }

        // Reset file variables
        this.profilePictureFile = undefined;
        this.profilePicturePreview = null;
        this.uploadProgress = 0;
        return;
      }

      this.profilePictureFile = selectedFile;

      // Create preview
      if (this.profilePictureFile) {
        const reader = new FileReader();
        reader.onload = () => {
          this.profilePicturePreview = reader.result as string;
        };
        reader.readAsDataURL(this.profilePictureFile);

        // Show success message
        this.messageService.add({
          severity: 'success',
          summary: 'File Selected',
          detail: `Profile picture "${
            this.profilePictureFile.name
          }" (${this.formatSize(
            this.profilePictureFile.size
          )}) selected successfully`,
          life: 3000,
        });

        this.uploadProgress = 100;
      }
    }
  }

  // Replace the triggerFileInput method with this improved version

  triggerFileInput(): void {
    setTimeout(() => {
      if (
        this.fileUpload &&
        this.fileUpload.basicFileInput &&
        this.fileUpload.basicFileInput.nativeElement
      ) {
        this.fileUpload.basicFileInput.nativeElement.click();
      } else {
        // Try to directly access the file input element by query selector
        const fileInput = document.querySelector(
          '.p-fileupload input[type=file]'
        ) as HTMLInputElement;
        if (fileInput) {
          fileInput.click();
        } else {
          console.error('File input element not found');
          // Fallback message if the file input can't be found
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              'Unable to open file browser. Please try again or drag and drop your file.',
            life: 3000,
          });
        }
      }
    }, 0);
  }

  removeProfilePicture(): void {
    this.profilePictureFile = undefined;
    this.profilePicturePreview = null;
    this.uploadProgress = 0;
  }

  // Handle drag over event
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  // Handle drag leave event
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  } // Handle drop event
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];

      // Check if it's an image
      if (file.type.startsWith('image/')) {
        // Check file size (1MB = 1,000,000 bytes)
        if (file.size > 1000000) {
          this.messageService.add({
            severity: 'error',
            summary: 'File Too Large',
            detail: `File size (${this.formatSize(
              file.size
            )}) exceeds the maximum limit of 1MB. Please select a smaller image.`,
            life: 5000,
          });

          // Reset any existing file data
          this.profilePictureFile = undefined;
          this.profilePicturePreview = null;
          this.uploadProgress = 0;
          return;
        }

        // Create a file list-like object that PrimeNG's FileUpload expects
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        // Create the event object that mimics what PrimeNG's FileUpload would create
        const fileUploadEvent = {
          originalEvent: event,
          files: dataTransfer.files,
          currentFiles: [file],
        };

        // Call the same method that handles the file upload selection
        this.onProfilePictureSelect(fileUploadEvent);
      } else {
        // Not an image file
        this.messageService.add({
          severity: 'error',
          summary: 'Invalid File Type',
          detail: 'Please upload an image file.',
          life: 3000,
        });
      }
    }
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

  // New getter methods for company information labels
  get jobPositionLabel(): string {
    const jobPosition = this.companyInfoForm.get('jobPosition')?.value;
    const option = this.jobPositionOptions.find((j) => j.value === jobPosition);
    return option ? option.label : '';
  }

  get companyLabel(): string {
    const company = this.companyInfoForm.get('company')?.value;
    const option = this.companyOptions.find((c) => c.value === company);
    return option ? option.label : '';
  }

  get departmentLabel(): string {
    const department = this.companyInfoForm.get('department')?.value;
    const option = this.departmentOptions.find((d) => d.value === department);
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

  onSubmit(): void {
    if (
      this.personalInfoForm.invalid ||
      this.jobInfoForm.invalid ||
      this.companyInfoForm.invalid
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

    // Create test auth request object
    const testAuthRequest: TestAuthorizationRequest = {
      firstName: this.personalInfoForm.value.firstName,
      lastName: this.personalInfoForm.value.lastName,
      gender: this.personalInfoForm.value.gender,
      dateOfBirth: this.personalInfoForm.value.dateOfBirth
        ? this.personalInfoForm.value.dateOfBirth.toISOString()
        : '',
      currentPosition: this.jobInfoForm.value.currentPosition,
      desiredPosition: this.jobInfoForm.value.desiredPosition,
      educationLevel: this.jobInfoForm.value.educationLevel,
      availability: this.jobInfoForm.value.availability, // Add the availability field
      jobPosition: this.companyInfoForm.value.jobPosition,
      company: this.companyInfoForm.value.company,
      department: this.companyInfoForm.value.department || '',
      additionalInfo: this.companyInfoForm.value.additionalInfo || '',
    };

    this.userService
      .submitTestAuthorizationRequest(testAuthRequest, this.profilePictureFile)
      .subscribe({
        next: (response) => {
          this.submitting = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail:
              'Your test authorization request has been submitted successfully!',
            life: 5000,
          });

          setTimeout(() => {
            this.router.navigate(['/']);
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

  // Handle PrimeNG FileUpload error events (like file size exceeded)
  onFileUploadError(event: any): void {
    if (event.error && event.error.type === 'fileSize') {
      this.messageService.add({
        severity: 'error',
        summary: 'File Too Large',
        detail: `File size exceeds the maximum limit of 1MB. Please select a smaller image.`,
        life: 5000,
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Upload Error',
        detail: 'An error occurred while uploading the file. Please try again.',
        life: 5000,
      });
    }
  }

  // Helper for formatting file size
  formatSize(bytes: number): string {
    if (bytes === 0) {
      return '0 B';
    }

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Add this method to your component
  updateProgress(step: number): void {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
      // Calculate progress based on step (now with 4 steps)
      const progress = Math.min(100, step * 25);
      progressBar.style.width = `${progress}%`;
    }
  }

  // Add this method to your component
  changeStep(step: number, activateCallback: Function): void {
    this.updateProgress(step);
    activateCallback(step);
  }
}
