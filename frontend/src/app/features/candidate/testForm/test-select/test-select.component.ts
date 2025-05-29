import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { User, UserResponse } from '../../../../core/models/user.model';

@Component({
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ToastModule,
    DialogModule,
    ProgressSpinnerModule
  ],
  selector: 'app-test-select',
  templateUrl: './test-select.component.html',
  styleUrls: ['./test-select.component.css'],
  providers: [MessageService]
})
export class TestSelectComponent implements OnInit {
  showProcessDetails = false;
  testAuthStatus: 'pending' | 'approved' | 'rejected' | 'not_submitted' = 'not_submitted';
  showTestListDialog = false;
  showAuthFormDialog = false;
  assignedTests: any[] = [];
  loading = true;
  currentUser?: User;

  constructor(
    private router: Router,
    private userService: UserService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.checkTestAuthorizationStatus();
  }

  getStatusText(): string {
    switch (this.testAuthStatus) {
      case 'approved':
        return 'Available Now';
      case 'pending':
        return 'Under Review';
      case 'rejected':
        return 'Not Available';
      case 'not_submitted':
        return 'Authorization Required';
      default:
        return 'Not Available';
    }
  }

  checkTestAuthorizationStatus(): void {
    this.loading = true;
    // Get current user's profile to check test authorization status
    this.userService.getMyProfile().subscribe({
      next: (response: UserResponse) => {
        this.currentUser = response.user;
        this.testAuthStatus = response.user.testAuthorizationStatus || 'not_submitted';
        if (this.testAuthStatus === 'approved') {
          this.loadAssignedTests();
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error fetching user profile:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load test status. Please try again.',
        });
        this.loading = false;
      }
    });
  }

  loadAssignedTests(): void {
    if (!this.currentUser?.id) {
      return;
    }

    this.userService.getUserTestAssignment(this.currentUser.id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.assignedTests = response.data.additionalTests || [];
        }
      },
      error: (error: any) => {
        console.error('Error loading assigned tests:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load assigned tests.',
        });
      }
    });
  }

  toggleProcessDetails(): void {
    this.showProcessDetails = !this.showProcessDetails;
  }

  openTestList(): void {
    this.showTestListDialog = true;
  }

  openAuthForm(): void {
    this.router.navigate(['/candidate/application-form']);
  }

  startTest(testType: string): void {
    // Only allow starting test if approved and tests are assigned
    if (this.testAuthStatus !== 'approved') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Access Denied',
        detail: 'You need authorization to take the test.',
      });
      return;
    }

    // Implement test start logic here
    if (testType === 'logical') {
      this.router.navigate(['/tests/logical-reasoning']);
    }
  }
}
