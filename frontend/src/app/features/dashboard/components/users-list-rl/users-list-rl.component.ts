import { Component, OnInit, ViewChild } from '@angular/core';
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
import { Router } from '@angular/router';
import { CalendarModule } from 'primeng/calendar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { map, catchError } from 'rxjs/operators';

import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { User } from '../../../../core/models/user.model';
import {
  UserFilters,
  UserService,
} from '../../../../core/services/user.service';
import { BadgeModule } from 'primeng/badge';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { TestAssignmentService } from '../../../../core/services/test-assignment.service';
import { TestLookupService } from '../../../../core/services/test-lookup.service';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TestService } from '../../../../core/services/test.service';

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
  @ViewChild('dt') table!: Table;

  candidates: User[] = [];
  selectedCandidates: User[] = [];
  loading: boolean = true;
  globalFilterValue: string = '';
  private searchTerms = new Subject<string>();

  // Status options for filtering
  testAuthStatuses: any[] = [
    { label: 'Pending', value: 'pending', severity: 'warning' },
    { label: 'Approved', value: 'approved', severity: 'success' },
    { label: 'Rejected', value: 'rejected', severity: 'danger' },
    { label: 'Not Submitted', value: 'not_submitted', severity: 'secondary' },
  ];

  testProgressStatuses: any[] = [
    { label: 'Not Started', value: 'not_started', severity: 'secondary' },
    { label: 'In Progress', value: 'in_progress', severity: 'info' },
    { label: 'Completed', value: 'completed', severity: 'success' },
  ];

  // Add new property to track which view is active
  activeView: 'auth_requests' | 'test_progress' = 'auth_requests';

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

  // Add variables to track filter state
  filterValues: any = {};

  testStatusOptions = [
    { label: 'Completed', value: 'completed', severity: 'success' },
    { label: 'In Progress', value: 'in-progress', severity: 'info' }, // Match database value
    { label: 'Timed Out', value: 'timed-out', severity: 'warning' },
    { label: 'Abandoned', value: 'abandoned', severity: 'danger' },
  ];

  constructor(
    private userService: UserService,
    private router: Router,
    private fb: FormBuilder,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private testAssignmentService: TestAssignmentService,
    private testLookupService: TestLookupService, // Add this
    private testService: TestService
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
    this.loadTests(); // Add this to load tests on component init

    // Setup debounce for search
    this.searchTerms
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => {
        this.filters.search = term;
        this.loadCandidates();
      });
  }

  // New method to handle global filter input changes
  onGlobalFilterChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.globalFilterValue = value;
    this.filters.search = value;
    this.loadCandidates();
  }

  // Method to handle status filter changes
  onStatusFilterChange(value: string) {
    console.log('Status filter changed to:', value);
    if (value) {
      this.filters.testAuthorizationStatus = value as any;
    } else {
      delete this.filters.testAuthorizationStatus;
    }
    // Manually trigger a reload with the new filters
    this.loadCandidates();
  }

  // Clear the global filter
  clearGlobalFilter(input: HTMLInputElement) {
    this.globalFilterValue = '';
    input.value = '';
    this.searchTerms.next('');
  }

  // Check if there are active filters
  hasActiveFilters(): boolean {
    return (
      !!this.globalFilterValue ||
      Object.keys(this.filterValues).length > 0 ||
      Object.keys(this.filters).some((key) => {
        const value = this.filters[key as keyof UserFilters];
        return (
          key !== 'role' &&
          key !== 'page' &&
          key !== 'limit' &&
          value !== undefined &&
          value !== null &&
          value !== ''
        );
      })
    );
  }

  // Clear selection
  clearSelection() {
    this.selectedCandidates = [];
  }

  // Add a new method to handle generic column filter changes
  onColumnFilterChange(field: string, value: any) {
    console.log(`Column filter changed: ${field} = ${value}`);

    if (value && value.trim() !== '') {
      // Update our tracking object
      this.filterValues[field] = value;

      // Update the filters object based on the field
      switch (field) {
        case 'firstName':
          this.filters.firstName = value;
          break;
        case 'lastName':
          this.filters.lastName = value;
          break;
        case 'email':
          this.filters.email = value;
          break;
        case 'educationLevel':
          this.filters.educationLevel = value;
          break;
        default:
          // For any other fields
          (this.filters as any)[field] = value;
      }
    } else {
      // Clear filter if value is empty
      delete this.filterValues[field];

      // Remove from filters object
      switch (field) {
        case 'firstName':
          delete this.filters.firstName;
          break;
        case 'lastName':
          delete this.filters.lastName;
          break;
        case 'email':
          delete this.filters.email;
          break;
        case 'educationLevel':
          delete this.filters.educationLevel;
          break;
        default:
          // For any other fields
          delete (this.filters as any)[field];
      }
    }

    // Reload the data with updated filters
    this.loadCandidates();
  }

  // Add specific handler for date filter - improve with better null handling
  onDateFilterChange(date: Date | null) {
    console.log('Date filter changed to:', date);

    if (date) {
      try {
        this.filters.testAuthorizationDate = this.formatDateForApi(date);
        this.filterValues['testAuthorizationDate'] = date;
      } catch (err) {
        console.error('Error formatting date:', err);
        delete this.filters.testAuthorizationDate;
        delete this.filterValues['testAuthorizationDate'];
      }
    } else {
      delete this.filters.testAuthorizationDate;
      delete this.filterValues['testAuthorizationDate'];
    }

    this.loadCandidates();
  }

  // Improved to handle the right event type
  loadCandidates(event?: any) {
    this.loading = true;
    
    if (this.activeView === 'test_progress') {
      this.userService.getUsers(this.filters).pipe(
        catchError(error => {
          console.error('Error loading users:', error);
          return of({ users: [], pagination: { total: 0 } });
        }),
        switchMap(response => {
          const candidates = response.users;
          
          // Use individual attempts instead of getting all at once
          const attemptRequests = candidates.map(candidate => {
            if (!candidate._id) {
              return of({ ...candidate, testProgress: null });
            }
            return this.testService.getCandidateAttempts(candidate._id).pipe(
              map(attemptsResponse => {
                const sortedAttempts = attemptsResponse.data.sort((a, b) => 
                  new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
                );
                const latestAttempt = sortedAttempts[0];
                console.log(`Latest attempt for candidate ${candidate._id}:`, latestAttempt);
                
                return {
                  ...candidate,
                  testProgress: latestAttempt ? {
                    status: latestAttempt.status,
                    percentageScore: latestAttempt.percentageScore,
                    timeSpent: latestAttempt.timeSpent,
                    lastActive: latestAttempt.lastActivityAt,
                    completedAt: latestAttempt.endTime
                  } : null
                };
              }),
              catchError(error => {
                console.error(`Error loading attempts for candidate ${candidate.id}:`, error);
                return of({
                  ...candidate,
                  testProgress: null
                });
              })
            )}
          );

          return forkJoin(attemptRequests).pipe(
            map(candidatesWithProgress => ({
              candidates: candidatesWithProgress,
              totalRecords: response.pagination.total
            }))
          );
        })
      ).subscribe({
        next: (result) => {
          this.candidates = result.candidates;
          this.totalRecords = result.totalRecords;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load data'
          });
          this.loading = false;
          this.candidates = [];
          this.totalRecords = 0;
        }
      });
    } else {
      this.userService.getUsers(this.filters).subscribe({
        next: (response) => {
          console.log('Response from server:', response);
          console.log('Total records:', response.pagination.total);

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
  }

  // Make formatDateForApi more robust with better error handling
  formatDateForApi(date: Date | null): string {
    if (!date) return '';

    try {
      // More robust way that works even if date is actually a string
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        throw new Error('Invalid date');
      }

      // Format as YYYY-MM-DD
      return d.toISOString().split('T')[0];
    } catch (err) {
      console.error('Error formatting date:', err);
      return '';
    }
  }

  // Improved method to clear filters
  clearAllFilters(table: Table) {
    // Reset the table UI filters
    table.clear();

    // Reset our internal state
    this.globalFilterValue = '';
    this.filterValues = {};

    // Reset the API request filters
    this.filters = {
      role: 'candidate',
      page: 1,
      limit: 10,
    };

    // Reload data
    this.loadCandidates();
  }

  // Method to load test authorization requests
  loadTestAuthRequests(status: string = 'pending') {
    this.loading = true;
    this.globalFilterValue = ''; // Reset global filter when changing views

    // Update filters object to include testAuthorizationStatus
    this.filters = {
      role: 'candidate',
      page: 1,
      limit: 10,
      testAuthorizationStatus: status as
        | 'pending'
        | 'approved'
        | 'rejected'
        | 'not_submitted',
    };

    this.userService.getUsers(this.filters).subscribe({
      next: (response) => {
        this.candidates = response.users.map((user) => {
          if (user._id && !user.id) {
            user.id = user._id;
          }
          return user;
        });
        this.totalRecords = response.pagination.total;
        this.loading = false;
        this.selectedCandidates = [];
      },
      error: (error) => {
        console.error('Error loading candidates with filter:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load candidates. Please try again.',
        });
        this.loading = false;
      },
    });
  }

  // Update return type to match PrimeNG's p-tag severity options
  getTestProgressSeverity(status: string | undefined): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'in-progress':  // Add this case
      case 'in_progress':  // Keep this for backward compatibility
        return 'info';
      case 'timed-out':
      case 'timed_out':
        return 'warn';
      case 'abandoned':
        return 'danger';
      case 'not_started':
      case 'not-started':
      default:
        return 'secondary';
    }
  }

  // Update getSeverity method to match PrimeNG's p-tag severity options
  getSeverity(status: string): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
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
    let userId = this.selectedCandidate.id;

    // If the backend model is using _id instead of id, use that property
    if (
      !this.isValidObjectId(userId) &&
      this.selectedCandidate._id &&
      this.isValidObjectId(this.selectedCandidate._id)
    ) {
      userId = this.selectedCandidate._id;
    }

    // Use TestLookupService to get the test IDs
    forkJoin({
      mainTestId: this.testLookupService.getTestIdByName(formData.assignedTest),
      additionalTestIds:
        formData.additionalTests && formData.additionalTests.length > 0
          ? this.testLookupService.getTestIdsByNames(formData.additionalTests)
          : of([]),
    })
      .pipe(
        switchMap(({ mainTestId, additionalTestIds }) => {
          if (!mainTestId) {
            throw new Error(
              `Test "${formData.assignedTest}" not found. Please refresh the page and try again.`
            );
          }

          return this.testAssignmentService.manualTestAssignment(userId, {
            assignedTestId: mainTestId,
            additionalTestIds: additionalTestIds,
            examDate: formData.examDate,
          });
        })
      )
      .subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Test assigned successfully',
          });
          this.assignmentDialogVisible = false;
          // Refresh the data with current filters
          this.loadCandidates();
        },
        error: (error) => {
          console.error('Error assigning test:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to assign test. Please try again.',
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

  // Add this method to load tests
  loadTests() {
    this.testLookupService.getAllTests().subscribe({
      next: (tests) => {
        console.log('Loaded available tests:', tests);
      },
      error: (error) => {
        console.error('Error loading tests:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail:
            'Failed to load tests. Test assignment might not work properly.',
        });
      },
    });
  }

  // Method to switch between views
  switchView(view: 'auth_requests' | 'test_progress') {
    this.activeView = view;
    this.clearSelection();
    this.loadCandidates();
  }

  // Format time spent in a human-readable way
  formatTimeSpent(timeSpent: number): string {
    const minutes = Math.floor(timeSpent / 60000);
    const seconds = Math.floor((timeSpent % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  // Add new method to view attempt details
  viewAttemptDetails(candidateId: string) {
    // Navigate to the details page with the candidate ID
    this.router.navigate(['/dashboard/RaisonnementLogique/Users/completed', candidateId]);
  }
}
