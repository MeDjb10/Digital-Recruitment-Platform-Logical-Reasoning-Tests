import {
  Component,
  OnInit,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
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
export class UsersListRLComponent implements OnInit, AfterViewInit {
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

  testStatusOptions = [
    { label: 'Not Started', value: 'not_started', severity: 'secondary' },
    { label: 'In Progress', value: 'in-progress', severity: 'info' },
    { label: 'Completed', value: 'completed', severity: 'success' },
  ];

  // Education level options for filtering
  educationLevelOptions = [
    { label: 'High School', value: 'high_school' },
    { label: 'Bachelor\'s Degree', value: 'bachelor' },
    { label: 'Master\'s Degree', value: 'master' },
    { label: 'PhD', value: 'phd' },
    { label: 'Other', value: 'other' },
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


  // Add loading state for tests
  testsLoading: boolean = false;

  // Options for assignment - will be populated dynamically from database
  testOptions: any[] = [];
  additionalTestOptions: any[] = [];


  totalRecords: number = 0;
  currentDate: Date = new Date(); // Add current date for calendar min date

  // Add variables to track filter state
  filterValues: any = {};


  // Quick filter variables
  quickStatusFilter: string = '';
  quickTestStatusFilter: string = '';


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
    private testLookupService: TestLookupService,
    private testService: TestService
  ) {
    // Initialize assignment form with empty values - tests will be loaded dynamically
    this.assignmentForm = this.fb.group({
      assignedTest: ['', Validators.required], // Will be populated with test IDs from database
      additionalTests: [[]],
      examDate: [null, Validators.required],
    });

    this.bulkActionForm = this.fb.group({
      status: ['approved', Validators.required],
      examDate: [null],
    });
  }

  ngAfterViewInit(): void {
    // Initialize the data table if it exists
    if (this.table) {
      // Set initial global filter value if needed
      this.table.filterGlobal(this.globalFilterValue, 'contains');
      
      // Ensure the table is properly initialized with current data
      if (this.candidates.length === 0 && !this.loading) {
        this.loadCandidates();
      }
    }
  }
  ngOnInit() {
    this.loadCandidates();
    this.loadTests(); // Load tests on component initialization

    // Setup debounce for search
    this.searchTerms
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((term) => {
        this.filters.search = term;
        this.loadCandidates();
      });

  }

  // Simplified global filter method that works with PrimeNG table
  clearGlobalFilter(input: HTMLInputElement, table: Table) {
    this.globalFilterValue = '';
    input.value = '';
    table.clear();
  }

  // Refresh data method
  refreshData() {
    this.selectedCandidates = [];
    this.loadCandidates();
  }
  // Clear all filters
  clearAllFilters(table: Table) {
    this.globalFilterValue = '';
    this.filterValues = {};
    this.quickStatusFilter = '';
    this.quickTestStatusFilter = '';
    this.filters = {
      role: 'candidate',
      page: 1,
      limit: 10,
    };
    table.clear();
    this.loadCandidates();
  }  // Check if there are active filters
  hasActiveFilters(): boolean {
    return (
      !!this.globalFilterValue ||
      !!this.quickStatusFilter ||
      !!this.quickTestStatusFilter ||
      this.table?.hasFilter() ||
      Object.keys(this.filterValues).length > 0
    );
  }

  // Clear selection
  clearSelection() {
    this.selectedCandidates = [];
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
  }  // Simplified loadCandidates method
  loadCandidates(event?: any) {
    this.loading = true;

    
    // Build filters based on current view
    const currentFilters: UserFilters = {
      ...this.filters,
      ...(this.activeView === 'test_progress' && { testAuthorizationStatus: 'approved' as const })
    };
    
    if (this.activeView === 'test_progress') {
      this.userService.getUsers(currentFilters).pipe(
        catchError(error => {
          console.error('Error loading users:', error);
          return of({ users: [], pagination: { total: 0 } });
        }),
        switchMap(response => {
          const candidates = response.users;
          
          // Get test progress for approved candidates
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
                console.error(`Error loading attempts for candidate ${candidate._id}:`, error);
                return of({
                  ...candidate,
                  testProgress: null
                });
              })
            );
          });

          return forkJoin(attemptRequests).pipe(
            map(candidatesWithProgress => ({
              candidates: candidatesWithProgress,
              totalRecords: response.pagination.total
            }))
          );
        })
      ).subscribe({
        next: (result) => {
          this.candidates = result.candidates.map(user => {
            if (user._id && !user.id) {
              user.id = user._id;
            }
            return user;
          });
          this.totalRecords = result.totalRecords;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error:', error);
          this.handleLoadError(error);
        }
      });

    } else {
      this.userService.getUsers(currentFilters).subscribe({
        next: (response) => {
          this.candidates = response.users.map((user) => {
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
          this.handleLoadError(error);
        },
      });
    }
  }
  private handleLoadError(error: any) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load data. Please try again.',
    });
    this.loading = false;
    this.candidates = [];
    this.totalRecords = 0;
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
      return '';    }
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
  getTestProgressSeverity(
    status: string | undefined
  ): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'in-progress': // Add this case
      case 'in_progress': // Keep this for backward compatibility
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
  getSeverity(
    status: string
  ): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
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
  } // Open assignment dialog
  showAssignmentDialog(candidate: User) {
    this.selectedCandidate = candidate;

    // Ensure tests are loaded before showing dialog
    if (this.testOptions.length === 0) {
      this.loadTests();
    }

    this.assignmentDialogVisible = true;

    // If candidate already has a test assignment, populate the form with the assigned test IDs
    if (candidate.testAssignment) {
      // Handle both old format (using names) and new format (using IDs)
      const assignedTestValue =
        (candidate.testAssignment as any).assignedTestId ||
        candidate.testAssignment.assignedTest ||
        '';
      const additionalTestValues =
        (candidate.testAssignment as any).additionalTestIds ||
        candidate.testAssignment.additionalTests ||
        [];

      this.assignmentForm.patchValue({
        assignedTest: assignedTestValue,
        additionalTests: additionalTestValues,
        examDate: candidate.testAssignment.examDate
          ? new Date(candidate.testAssignment.examDate)
          : null,
      });
    } else {
      // Reset form for new assignment with empty values (no defaults)
      this.assignmentForm.reset({
        assignedTest: '', // Let user select from loaded tests
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
        summary: 'Incomplete Form',
        detail: 'Please fill all required fields before assigning the test',
      });
      return;
    }

    const formData = this.assignmentForm.value;
    let userId = this.selectedCandidate.id;

    // Ensure we have a valid user ID
    if (
      !this.isValidObjectId(userId) &&
      this.selectedCandidate._id &&
      this.isValidObjectId(this.selectedCandidate._id)
    ) {
      userId = this.selectedCandidate._id;
    }

    if (!this.isValidObjectId(userId)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid User',
        detail: 'Cannot assign test: Invalid user ID',
      });
      return;
    }

    // Validate the selected test ID
    if (!this.isValidObjectId(formData.assignedTest)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid Test Selection',
        detail: 'Please select a valid test from the dropdown',
      });
      return;
    }

    // Validate additional test IDs if provided
    const additionalTestIds = formData.additionalTests || [];
    for (const testId of additionalTestIds) {
      if (!this.isValidObjectId(testId)) {
        this.messageService.add({
          severity: 'error',
          summary: 'Invalid Additional Test',
          detail:
            'One or more additional tests are invalid. Please review your selections.',
        });
        return;
      }
    }

    // Prepare assignment data with validated test IDs
    const assignmentData = {
      assignedTestId: formData.assignedTest, // This is now a validated test ID from database
      additionalTestIds: additionalTestIds, // These are now validated test IDs from database
      examDate: formData.examDate,
    };

    console.log('Assigning test with data:', {
      userId,
      assignmentData,
      selectedTestName: this.getTestNameById(formData.assignedTest),
      additionalTestNames: additionalTestIds.map((id: string) =>
        this.getTestNameById(id)
      ),
    });

    this.testAssignmentService
      .manualTestAssignment(userId, assignmentData)
      .subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Test Assigned Successfully',
            detail: `Test has been assigned to ${this.selectedCandidate?.firstName} ${this.selectedCandidate?.lastName}`,
          });

          this.assignmentDialogVisible = false;
          this.assignmentForm.reset();
          this.selectedCandidate = null;

          // Refresh the candidates list to show updated assignment status
          this.loadCandidates();
        },
        error: (error) => {
          console.error('Test assignment error:', error);
          const errorMessage =
            error?.error?.message || error?.message || 'Failed to assign test';

          this.messageService.add({
            severity: 'error',
            summary: 'Assignment Failed',
            detail: errorMessage,
          });
        },
      });
  }

  // Helper method to get test name by ID for logging/display purposes
  private getTestNameById(testId: string): string {
    const test =
      this.testOptions.find((option) => option.value === testId) ||
      this.additionalTestOptions.find((option) => option.value === testId);
    return test ? test.label : 'Unknown Test';
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
  } // Load tests dynamically from database and populate dropdowns
  loadTests() {
    this.testsLoading = true;

    this.testLookupService.getAllTests().subscribe({
      next: (tests) => {
        console.log('Loaded available tests from database:', tests);

        if (!tests || tests.length === 0) {
          console.warn('No tests found in database');
          this.testOptions = [];
          this.additionalTestOptions = [];
          this.testsLoading = false;
          return;
        }

        // Create dropdown options using test IDs as values
        const allTestOptions = tests
          .filter((test: any) => test.isActive !== false) // Only include active tests
          .map((test: any) => ({
            label: `${test.name} ${
              test.difficulty ? `(${test.difficulty})` : ''
            } - ${test.category || test.type || 'General'}`,
            value: test._id, // Use the database ID
            testData: test, // Store full test data for reference
            category: test.category,
            type: test.type,
            difficulty: test.difficulty,
            isActive: test.isActive,
          }));

        // Categorize tests - Primary tests for main assignment, additional tests for extras
        const primaryTests: any[] = [];
        const additionalTests: any[] = [];

        allTestOptions.forEach((option: any) => {
          // Main tests: typically domino and logical reasoning tests
          if (option.type === 'domino' || option.category === 'logical') {
            primaryTests.push(option);
          }

          // Additional tests can be any test type
          additionalTests.push(option);
        });

        // Set the options for dropdowns
        this.testOptions =
          primaryTests.length > 0 ? primaryTests : allTestOptions;
        this.additionalTestOptions = additionalTests;

        console.log('Primary test options (using IDs):', this.testOptions);
        console.log(
          'Additional test options (using IDs):',
          this.additionalTestOptions
        );

        this.testsLoading = false;
      },
      error: (error) => {
        console.error('Error loading tests from database:', error);
        this.testsLoading = false;

        this.messageService.add({
          severity: 'error',
          summary: 'Error Loading Tests',
          detail:
            'Failed to load tests from database. Please refresh the page and try again.',
        });

        // Clear options on error rather than using hardcoded fallbacks
        this.testOptions = [];
        this.additionalTestOptions = [];
      },
    });
  }

  // Method to switch between views
  switchView(view: 'auth_requests' | 'test_progress') {
    this.activeView = view;
    this.selectedCandidates = [];
    this.clearAllFilters(this.table);
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
    this.router.navigate([
      '/dashboard/RaisonnementLogique/Users/completed',
      candidateId,
    ]);
  }

  // Quick filter methods
  applyQuickStatusFilter(status: string) {
    if (this.table) {
      this.table.filter(status, 'testAuthorizationStatus', 'equals');
    }
  }

  applyQuickTestStatusFilter(status: string) {
    if (this.table) {
      this.table.filter(status, 'testProgress.status', 'equals');
    }
  }

  // Clear all filters and reset quick filters
  clearQuickFilters() {
    this.quickStatusFilter = '';
    this.quickTestStatusFilter = '';
    this.clearAllFilters(this.table);
  }
}
