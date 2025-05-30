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

          // Set user details
          this.userDetails = user.user || user;

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
          if (results) {
            results.forEach(({ attempt, test }) => {
              console.log('Processing test result:', { attempt, test });
              const testName = test.name?.toLowerCase() || '';

              if (testName.includes('d-70') || testName.includes('d-2000')) {
                console.log('Found domino test:', attempt._id);
                this.dominoAttemptId = attempt._id;
                this.testResults.dominoTest = { attempt, test };
              } else if (testName.includes('logique_des_propositions')) {
                console.log('Found MCQ test:', attempt._id);
                this.mcqAttemptId = attempt._id;
                this.testResults.additionalTest = { attempt, test };
              }
            });
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
}
