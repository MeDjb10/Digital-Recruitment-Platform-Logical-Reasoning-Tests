import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { Location } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DominoTestSectionComponent } from '../domino-test-section/domino-test-section.component';
import { TabViewModule } from 'primeng/tabview';
import { MultipleChoiceSectionComponent } from '../multiple-choice-section/multiple-choice-section.component';
import { PrintablePageComponent } from '../printable-page/printable-page.component';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../../../../../core/services/user.service';
import { TestService } from '../../../../../core/services/test.service';
import { forkJoin, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { User } from '../../../../../core/models/user.model';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-completed-users',
  standalone: true,
  imports: [
    CommonModule,
    ProgressSpinnerModule,
    FormsModule,
    ChartModule,
    ButtonModule,
    DominoTestSectionComponent,
    TabViewModule,
    MultipleChoiceSectionComponent,
    PrintablePageComponent,
  ],
  templateUrl: './completed-users.component.html',
  styleUrl: './completed-users.component.css',
})
export class CompletedUsersComponent implements OnInit {
  @ViewChild(PrintablePageComponent)
  printablePageComponent!: PrintablePageComponent;

  loading = true;
  dominoAttemptId?: string;
  mcqAttemptId?: string;
  // Properties expected by the HTML template
  userDetails: User | null = null;
  testAssignment: any = null;
  testResults: any = {
    dominoTest: null,
    additionalTest: null,
  };

  // Profile picture properties
  userAvatarUrl: string = '';
  assignedByAvatarUrl: string = '';

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private userService: UserService,
    private testService: TestService
  ) {}

  ngOnInit() {
    this.route.params
      .pipe(
        switchMap((params) => {
          const userId = params['id'];
          console.log('Starting data fetch for userId:', userId);

          // Load user details first
          return forkJoin({
            user: this.userService.getUserById(userId),
            attempts: this.testService.getCandidateAttempts(userId),
          });
        }),
        switchMap(({ user, attempts }) => {
          console.log('Got user and attempts:', { user, attempts });

          // Set user details and generate avatar
          this.userDetails = user.user || user;
          this.updateUserAvatar(this.userDetails);
          console.log(this.userDetails);

          const completedAttempts = attempts.data.filter(
            (attempt) => attempt.status === 'completed'
          );
          console.log('Completed attempts:', completedAttempts);

          if (completedAttempts.length === 0) {
            return of(null);
          } // Create an array of observables for each attempt's test details
          const testObservables = completedAttempts.map((attempt) => {
            // Handle both populated (object) and non-populated (string) testId
            const testId =
              typeof attempt.testId === 'object' && attempt.testId !== null
                ? (attempt.testId as any)._id
                : attempt.testId;

            return this.testService.getTestById(testId).pipe(
              map((testResponse) => ({
                attempt,
                test: testResponse.data,
              }))
            );
          });

          return forkJoin(testObservables);
        })
      )
      .subscribe({
        next: (results) => {
          console.log('CompletedUsers - Raw results from API:', results);
          if (results) {
            results.forEach(({ attempt, test }) => {
              console.log('Processing test result:', { attempt, test });
              const testName = test.name?.toLowerCase() || '';

              if (testName.includes('d-70') || testName.includes('d-2000')) {
                console.log('Found domino test:', attempt._id);
                this.dominoAttemptId = attempt._id;
                this.testResults.dominoTest = { attempt, test };
                console.log(
                  'CompletedUsers - Set dominoTest data:',
                  this.testResults.dominoTest
                );
              } else if (testName.includes('logique_des_propositions')) {
                console.log('Found MCQ test:', attempt._id);
                this.mcqAttemptId = attempt._id;
                this.testResults.additionalTest = { attempt, test };
                console.log(
                  'CompletedUsers - Set additionalTest data:',
                  this.testResults.additionalTest
                );
              }
            });
          }

          console.log(
            'CompletedUsers - Final testResults structure:',
            this.testResults
          );
          console.log(
            'CompletedUsers - Final dominoAttemptId:',
            this.dominoAttemptId
          );
          console.log(
            'CompletedUsers - Final mcqAttemptId:',
            this.mcqAttemptId
          );
          console.log('CompletedUsers - Final userDetails:', this.userDetails);

          // Update assigned by avatar if available
          if (this.testAssignment?.assignedBy) {
            this.updateAssignedByAvatar(this.testAssignment.assignedBy);
          }

          this.loading = false;
        },
        error: (error) => {
          console.error('Error in data loading pipeline:', error);
          this.loading = false;
        },
      });
  }
  goBack(): void {
    this.location.back();
  }
  print(): void {
    // Use the printable page component's PDF generation method
    if (this.printablePageComponent) {
      this.printablePageComponent.exportToPDF();
    } else {
      console.error('Printable page component not found');
    }
  }

  // Methods expected by the HTML template
  hasMultipleChoiceTest(): boolean {
    return !!this.testResults.additionalTest || !!this.mcqAttemptId;
  }

  hasTestResults(): boolean {
    return !!(
      this.testResults.dominoTest ||
      this.testResults.additionalTest ||
      this.dominoAttemptId ||
      this.mcqAttemptId
    );
  }

  // Profile picture helper methods
  private updateUserAvatar(user: User | null): void {
    if (!user) {
      this.userAvatarUrl = '';
      return;
    }

    if (user.profilePicture) {
      this.userAvatarUrl = this.getFullProfilePictureUrl(user.profilePicture);
    } else {
      this.generateFallbackAvatar(user, 'user');
    }
  }

  private updateAssignedByAvatar(assignedBy: any): void {
    if (!assignedBy) {
      this.assignedByAvatarUrl = '';
      return;
    }

    if (assignedBy.profilePicture) {
      this.assignedByAvatarUrl = this.getFullProfilePictureUrl(
        assignedBy.profilePicture
      );
    } else {
      this.generateFallbackAvatar(assignedBy, 'assignedBy');
    }
  }

  private getFullProfilePictureUrl(url: string | undefined): string {
    if (!url) return '';

    // If it's already a complete URL, return it
    if (url.startsWith('http')) return url;

    // If it's a relative URL, prepend the API base URL
    if (url.startsWith('/uploads')) {
      const baseUrl = environment.apiUrl.split('/api')[0];
      return `${baseUrl}${url}`;
    }

    return url;
  }

  private generateFallbackAvatar(user: any, type: 'user' | 'assignedBy'): void {
    if (!user.firstName && !user.lastName) {
      const fallbackUrl =
        'https://ui-avatars.com/api/?name=U&background=3b82f6&color=fff&bold=true';
      if (type === 'user') {
        this.userAvatarUrl = fallbackUrl;
      } else {
        this.assignedByAvatarUrl = fallbackUrl;
      }
      return;
    }

    const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      initials
    )}&background=3b82f6&color=fff&bold=true`;

    if (type === 'user') {
      this.userAvatarUrl = avatarUrl;
    } else {
      this.assignedByAvatarUrl = avatarUrl;
    }
  }
  // Handle image loading errors
  handleUserImageError(): void {
    if (this.userDetails) {
      this.generateFallbackAvatar(this.userDetails, 'user');
    }
  }

  handleAssignedByImageError(): void {
    if (this.testAssignment?.assignedBy) {
      this.generateFallbackAvatar(this.testAssignment.assignedBy, 'assignedBy');
    }
  }

  // Helper method for template
  encodeURIComponent(str: string): string {
    return encodeURIComponent(str);
  }
}
