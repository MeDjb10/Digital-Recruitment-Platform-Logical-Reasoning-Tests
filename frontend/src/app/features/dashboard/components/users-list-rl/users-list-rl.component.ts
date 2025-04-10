import { Component, OnInit } from '@angular/core';
import { Table } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { HttpClientModule } from '@angular/common/http';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { CompletedUsersComponent } from '../userDialogue/completed-users/completed-users.component';
import { NotAssignedUsersComponent } from '../userDialogue/not-assigned-users/not-assigned-users.component';
import { Router } from '@angular/router';
import { CalendarModule } from 'primeng/calendar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { User } from '../../../../core/models/user.model';
import {
  UserFilters,
  UserService,
} from '../../../../core/services/user.service';
import { BadgeModule } from 'primeng/badge';
@Component({
  selector: 'app-users-list-rl',
  standalone: true,
  imports: [
    TableModule,
    TagModule,
    IconFieldModule,
    InputTextModule,
    InputIconModule,
    MultiSelectModule,
    SelectModule,
    HttpClientModule,
    CommonModule,
    TooltipModule,
    ButtonModule,
    FormsModule,
    ReactiveFormsModule,
    DropdownModule,
    DialogModule,
    // NotAssignedUsersComponent,
    CalendarModule,
    ConfirmDialogModule,
    ToastModule,
    BadgeModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './users-list-rl.component.html',
  styleUrl: './users-list-rl.component.css',
})
export class UsersListRLComponent implements OnInit {
  candidates: User[] = [];
  selectedCandidates: User[] = [];
  loading: boolean = true;

  // Status options for filtering
  testAuthStatuses: any[] = [
    { label: 'Pending', value: 'pending', severity: 'warning' },
    { label: 'Approved', value: 'approved', severity: 'success' },
    { label: 'Rejected', value: 'rejected', severity: 'danger' },
    { label: 'Not Submitted', value: 'not_submitted', severity: 'secondary' },
  ];

  // Dialog visibility flags
  detailsDialogVisible: boolean = false;
  assignmentDialogVisible: boolean = false;
  bulkActionDialogVisible: boolean = false;

  // Selected candidate and form
  selectedCandidate: User | null = null;
  assignmentForm: FormGroup;
  bulkActionForm: FormGroup;

  // Filters
  filters: UserFilters = {
    role: 'candidate',
    page: 1,
    limit: 10,
  };

  // Options for assignment
  testOptions: any[] = [
    { label: 'D-70 (Basic)', value: 'D-70' },
    { label: 'D-2000 (Advanced)', value: 'D-2000' },
  ];

  additionalTestOptions: any[] = [
    { label: 'Logique des propositions', value: 'logique_des_propositions' },
  ];

  totalRecords: number = 0;
  currentDate: Date = new Date(); // Add current date for calendar min date

  constructor(
    private userService: UserService,
    private router: Router,
    private fb: FormBuilder,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {
    this.assignmentForm = this.fb.group({
      assignedTest: ['D-70', Validators.required],
      additionalTests: [[]],
      examDate: [null, Validators.required],
    });

    this.bulkActionForm = this.fb.group({
      status: ['approved', Validators.required],
      examDate: [null],
    });
  }

  ngOnInit() {
    this.loadCandidates();
  }

  loadCandidates(event?: any) {
    this.loading = true;

    if (event) {
      this.filters.page = event.first / event.rows + 1;
      this.filters.limit = event.rows;
    }

    this.userService.getUsers(this.filters).subscribe({
      next: (response) => {
        // Map users to ensure each has a consistent identifier property for table selection
        this.candidates = response.users.map((user) => {
          // If _id exists but id doesn't, assign _id to id for consistency
          if (user._id && !user.id) {
            user.id = user._id;
          }
          return user;
        });
        this.totalRecords = response.pagination.total;
        this.loading = false;
        // Clear selection when loading new data
        this.selectedCandidates = [];
      },
      error: (error) => {
        console.error('Error loading candidates:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load candidates. Please try again.',
        });
        this.loading = false;
      },
    });
  }

  // Method to load test authorization requests
  loadTestAuthRequests(status: string = 'pending') {
    this.loading = true;
    this.userService
      .getTestAuthorizationRequests({
        status: status,
        page: this.filters.page,
        limit: this.filters.limit,
      })
      .subscribe({
        next: (response) => {
          this.candidates = response.requests;
          this.totalRecords = response.pagination.total;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading test authorization requests:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load test requests. Please try again.',
          });
          this.loading = false;
        },
      });
  }

  getSeverity(
    status: string
  ): 'info' | 'success' | 'danger' | 'secondary' | 'warn' {
    switch (status) {
      case 'pending':
        return 'warn';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'completed':
        return 'info';
      default:
        return 'secondary';
    }
  }

  // Open details dialog for a candidate
  showDetails(candidate: User) {
    this.selectedCandidate = candidate;
    this.detailsDialogVisible = true;

    // Populate the assignment form if test is already assigned
    if (candidate.testAssignment) {
      this.assignmentForm.patchValue({
        assignedTest: candidate.testAssignment.assignedTest,
        additionalTests: candidate.testAssignment.additionalTests || [],
        examDate: candidate.testAssignment.examDate
          ? new Date(candidate.testAssignment.examDate)
          : null,
      });
    } else {
      // Reset form for new assignment
      this.assignmentForm.reset({
        assignedTest: 'D-70',
        additionalTests: [],
        examDate: null,
      });
    }
  }

  // Open assignment dialog
  showAssignmentDialog(candidate: User) {
    this.selectedCandidate = candidate;
    this.assignmentDialogVisible = true;

    // Populate the assignment form if test is already assigned
    if (candidate.testAssignment) {
      this.assignmentForm.patchValue({
        assignedTest: candidate.testAssignment.assignedTest,
        additionalTests: candidate.testAssignment.additionalTests || [],
        examDate: candidate.testAssignment.examDate
          ? new Date(candidate.testAssignment.examDate)
          : null,
      });
    } else {
      // Reset form for new assignment
      this.assignmentForm.reset({
        assignedTest: 'D-70',
        additionalTests: [],
        examDate: null,
      });
    }
  }

  // Open bulk action dialog
  showBulkActionDialog() {
    if (this.selectedCandidates.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please select at least one candidate',
      });
      return;
    }

    this.bulkActionDialogVisible = true;
    this.bulkActionForm.reset({
      status: 'approved',
      examDate: null,
    });
  }

  // Approve a test authorization request
  approveRequest(userId: string) {
    this.userService
      .updateTestAuthorizationStatus(userId, 'approved')
      .subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Test authorization approved successfully',
          });
          this.loadTestAuthRequests();
        },
        error: (error) => {
          console.error('Error approving request:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to approve request. Please try again.',
          });
        },
      });
  }

  // Reject a test authorization request
  rejectRequest(userId: string) {
    this.userService
      .updateTestAuthorizationStatus(userId, 'rejected')
      .subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Test authorization rejected successfully',
          });
          this.loadTestAuthRequests();
        },
        error: (error) => {
          console.error('Error rejecting request:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to reject request. Please try again.',
          });
        },
      });
  }

  // Assign a test to a candidate
  assignTest() {
    if (!this.selectedCandidate || !this.assignmentForm.valid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please fill all required fields',
      });
      return;
    }

    const formData = this.assignmentForm.value;

    // Debug the user ID to see what's being sent
    console.log('User ID for assignment:', {
      id: this.selectedCandidate.id,
      _id: this.selectedCandidate._id,
      type: typeof this.selectedCandidate.id,
      fullCandidate: this.selectedCandidate,
    });

    // Determine which ID to use - prefer _id if id is not valid
    let userId = this.selectedCandidate.id;

    // If the backend model is using _id instead of id, use that property
    if (
      !this.isValidObjectId(userId) &&
      this.selectedCandidate._id &&
      this.isValidObjectId(this.selectedCandidate._id)
    ) {
      userId = this.selectedCandidate._id;
      console.log('Using _id instead of id for user assignment:', userId);
    }

    this.userService
      .manualTestAssignment(userId, {
        assignedTest: formData.assignedTest,
        additionalTests: formData.additionalTests,
        examDate: formData.examDate,
      })
      .subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Test assigned successfully',
          });
          this.assignmentDialogVisible = false;
          this.loadTestAuthRequests('approved');
        },
        error: (error) => {
          console.error('Error assigning test:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to assign test. Please try again.',
          });
        },
      });
  }

  // Add this helper method to validate MongoDB ObjectIds
  isValidObjectId(id: string): boolean {
    // MongoDB ObjectId is a 24 character hex string
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  // Process bulk action
  processBulkAction() {
    if (!this.bulkActionForm.valid || this.selectedCandidates.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please fill all required fields and select candidates',
      });
      return;
    }

    const formData = this.bulkActionForm.value;

    // Get valid user IDs and check for problematic ones
    const userIds = this.selectedCandidates.map((candidate) => {
      // Determine which ID to use - prefer _id if id is not valid
      let userId = candidate.id;

      // If the backend model is using _id instead of id, use that property
      if (
        !this.isValidObjectId(userId) &&
        candidate._id &&
        this.isValidObjectId(candidate._id)
      ) {
        userId = candidate._id;
        console.log('Using _id instead of id for bulk operation:', userId);
      }

      return userId;
    });

    // Check if we have any invalid IDs before proceeding
    const invalidIds = userIds.filter((id) => !this.isValidObjectId(id));
    if (invalidIds.length > 0) {
      console.error('Invalid user IDs detected:', invalidIds);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `${invalidIds.length} users have invalid ID formats. Cannot proceed.`,
      });
      return;
    }

    this.userService
      .bulkUpdateTestAuthorizationStatus(userIds, formData.status)
      .subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `${response.updatedCount} request(s) updated successfully`,
          });
          this.bulkActionDialogVisible = false;
          this.selectedCandidates = [];
          this.loadTestAuthRequests();
        },
        error: (error) => {
          console.error('Error processing bulk action:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to process bulk action. Please try again.',
          });
        },
      });
  }

  // Confirm action with a dialog
  confirmAction(event: Event, action: string, userId: string) {
    // Check if we have a valid ID format before proceeding
    if (!this.isValidObjectId(userId)) {
      console.warn(
        'Invalid ObjectID format detected, checking for alternative ID'
      );

      // Try to find the candidate in our list to get the _id instead
      const candidate = this.candidates.find((c) => c.id === userId);
      if (candidate && candidate._id && this.isValidObjectId(candidate._id)) {
        userId = candidate._id;
        console.log('Using _id instead of id for action:', userId);
      } else {
        console.error('Cannot perform action: No valid ID found for user');
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Cannot perform action: Invalid user ID format',
        });
        return;
      }
    }

    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `Are you sure you want to ${action} this request?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        if (action === 'approve') {
          this.approveRequest(userId);
        } else if (action === 'reject') {
          this.rejectRequest(userId);
        }
      },
    });
  }

  // Format date for display
  formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }

  // Get education level display value
  getEducationLevel(level: string | undefined): string {
    if (!level) return 'N/A';

    // Format the education level for display
    return level.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // Utility method to check if candidate has submitted a test request
  hasSubmittedRequest(candidate: User): boolean {
    return candidate.testAuthorizationStatus !== 'not_submitted';
  }

  // Clear filters and reload data
  clearFilters() {
    this.filters = {
      role: 'candidate',
      page: 1,
      limit: 10,
    };
    this.loadCandidates();
  }
}
