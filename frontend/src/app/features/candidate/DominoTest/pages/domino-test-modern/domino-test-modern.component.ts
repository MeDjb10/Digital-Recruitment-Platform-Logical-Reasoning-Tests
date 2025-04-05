import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  AfterViewInit,
  ViewChild,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { TestAttemptTrackingService } from '../../../../../core/services/testAttemptTracking.service';
import { HelpTooltipComponent } from '../../components/help-tooltip/helpTooltip.component';
import { NavigationControlsComponent } from '../../components/navigation-controls/navigationControls.component';
import { SimpleDominoGridComponent } from '../../components/simple-domino-grid/simpleDominoGrid.component';
import { TestHeaderComponent } from '../../components/test-header/testHeader.component';
import { TestSidebarComponent } from '../../components/test-sidebar/testSidebar.component';
import { DominoTestService } from '../../services/domino-test.service';
import { TestQuestion, DominoChange } from '../../models/domino.model';
import { DominoPosition } from '../../../../../core/models/domino.model';

@Component({
  selector: 'app-domino-test-modern',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TestHeaderComponent,
    TestSidebarComponent,
    SimpleDominoGridComponent,
    NavigationControlsComponent,
    HelpTooltipComponent,
  ],
  templateUrl: './domino-test-modern.component.html',
  styleUrls: ['./domino-test-modern.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DominoTestModernComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  @ViewChild(SimpleDominoGridComponent) dominoGrid?: SimpleDominoGridComponent;

  // Test meta data
  testName: string = 'Domino Logical Reasoning Test';
  testId: string = 'd70'; // Default to d70 test
  attemptId: string | null = null;

  // Questions and navigation
  questions: TestQuestion[] = [];
  currentQuestionIndex: number = 0;
  answeredCount: number = 0;
  flaggedCount: number = 0;

  // UI state
  sidebarCollapsed: boolean = false;
  showTooltip: boolean = true;
  animateTooltip: boolean = false;
  animateDominoGrid: boolean = false;
  animateQuestionInstructions: boolean = false;
  animateQuestionControls: boolean = false;
  animateFooter: boolean = false;

  // Timer related
  timeLeft: number = 30 * 60; // 30 minutes in seconds
  timerSubscription?: Subscription;
  formattedTime: string = '30:00';
  isTimerWarning: boolean = false;
  isTimerCritical: boolean = false;
  pulseTimer: boolean = false;
  testDuration: number = 30; // Default duration in minutes

  // Help text
  tooltipInstructions: string[] = [
    '<strong>Step 1:</strong> Click the highlighted blue domino to select it',
    '<strong>Step 2:</strong> Click on the top or bottom half to set the dots (1-6)',
    '<strong>Step 3:</strong> Keep clicking to cycle through different numbers',
    '<strong>Step 4:</strong> Double-click the domino to rotate it (if needed)',
    '<strong>Tip:</strong> Use the Flag button if you want to review this question later',
  ];

  // Flag to check if we have editable dominos
  hasEditableDominos: boolean = false;

  // Test submission state
  isSubmittingTest: boolean = false;
  loadingError: string | null = null;
  isTestComplete: boolean = false;

  // Current question getter for convenience
  get currentQuestion(): TestQuestion | undefined {
    return this.questions[this.currentQuestionIndex];
  }

  // Progress percentage
  get progressPercentage(): number {
    return this.questions.length > 0
      ? Math.round((this.answeredCount / this.questions.length) * 100)
      : 0;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private dominoTestService: DominoTestService,
    private trackingService: TestAttemptTrackingService
  ) {}

  // React to browser/tab close to save progress
  @HostListener('window:beforeunload')
  onBeforeUnload() {
    // Record time spent on current question before leaving
    this.trackingService.endCurrentQuestionVisit();
    this.saveProgress();
  }

  ngOnInit(): void {
    // Get test ID from route if available
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.testId = params['id'];
      }

      // Load the test data
      console.log('testId', this.testId);
      this.loadTestData(this.testId);
    });
  }

  ngAfterViewInit(): void {
    // Adding small delay for animations
    setTimeout(() => {
      this.animateQuestionInstructions = true;
      this.animateDominoGrid = true;
      this.animateQuestionControls = true;
      this.animateFooter = true;
      this.animateTooltip = true;
      this.cdr.detectChanges();
    }, 100);
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }

    // Record time spent and save progress before leaving
    this.trackingService.endCurrentQuestionVisit();
    this.saveProgress();
    this.trackingService.cleanup();
  }

  loadTestData(testId: string): void {
    console.log('Loading test data for ID:', testId);

    // Check for saved progress first
    const savedProgress = this.dominoTestService.loadProgress(testId);
    if (savedProgress) {
      console.log('Found saved progress, loading it');
      this.handleSavedProgress(savedProgress);
      return;
    }

    // Load fresh data from backend
    this.dominoTestService.getTest(testId).subscribe({
      next: (testData) => {
        console.log('Test data loaded:', testData);

        if (testData) {
          // Store test data
          this.testName = testData.name || 'Logical Reasoning Test';
          this.testDuration = testData.duration || 30;
          this.timeLeft = this.testDuration * 60;
          this.updateFormattedTime();

          // Store the attempt ID for tracking
          if (testData.attemptId) {
            this.attemptId = testData.attemptId;
            // Initialize the tracking service
            this.trackingService.initAttempt(testData.attemptId);
          } else {
            console.error('No attempt ID provided in test data');
          }

          // Process questions - handle both _id and id formats
          this.questions = testData.questions.map((q: any) => ({
            id: q._id || q.id, // Support both formats
            title: q.title || '',
            instruction:
              q.instruction || 'Find the missing values in the domino pattern',
            dominos: q.dominos || [],
            arrows: q.arrows || [],
            gridLayout: q.gridLayout || { rows: 3, cols: 3 },
            correctAnswer: q.correctAnswer,
            answered: q.answered || false,
            flaggedForReview: q.flaggedForReview || false,
            visited: q.visited || false,
            pattern: q.pattern || '',
            layoutType: q.layoutType || 'grid',
            userAnswer: q.userAnswer,
          }));

          // Set first question as visited and start tracking it
          if (this.questions.length > 0) {
            this.questions[0].visited = true;
            if (this.attemptId) {
              this.trackingService.startQuestionVisit(
                String(this.questions[0].id)
              );
            }
          }

          // Start timer and calculate progress
          this.startTimer();
          this.recalculateProgress();
          this.cdr.markForCheck();
        } else {
          this.loadingError = 'Failed to load test data.';
          this.cdr.markForCheck();
        }
      },
      error: (error) => {
        console.error('Error loading test:', error);
        this.loadingError = 'Error loading test data. Please try again.';
        this.cdr.markForCheck();
      },
    });
  }

  handleSavedProgress(savedProgress: any): void {
    // Restore test state
    this.testName = savedProgress.testName;
    this.timeLeft = savedProgress.timeLeft;
    this.testDuration = savedProgress.testDuration;
    this.attemptId = savedProgress.attemptId;
    this.updateFormattedTime();

    // Initialize tracking service if we have an attempt ID
    if (this.attemptId) {
      this.trackingService.initAttempt(this.attemptId);
    }

    // Restore questions and progress
    this.questions = savedProgress.questions;
    this.currentQuestionIndex = savedProgress.currentQuestionIndex || 0;

    // Start tracking the current question
    if (this.attemptId && this.currentQuestion) {
      this.trackingService.startQuestionVisit(String(this.currentQuestion.id));
    }

    // Calculate answered and flagged counts
    this.recalculateProgress();

    // Start the timer
    this.startTimer();
    this.cdr.markForCheck();

    console.log('Test progress restored from previous session.');
  }

  saveProgress(): void {
    // Skip if test is complete
    if (this.isTestComplete) return;

    const progress = {
      testId: this.testId,
      attemptId: this.attemptId,
      testName: this.testName,
      timeLeft: this.timeLeft,
      testDuration: this.testDuration,
      questions: this.questions,
      currentQuestionIndex: this.currentQuestionIndex,
      savedAt: new Date().toISOString(),
    };

    this.dominoTestService.saveProgress(this.testId, progress);
  }

  startTimer(): void {
    // Clear any existing timer
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }

    // Start a new timer
    this.timerSubscription = interval(1000).subscribe(() => {
      this.timeLeft--;

      // Update formatted time
      this.updateFormattedTime();

      // Check for warning thresholds
      const totalSeconds = this.testDuration * 60;
      const percentRemaining = (this.timeLeft / totalSeconds) * 100;

      this.isTimerWarning = percentRemaining <= 25 && percentRemaining > 10;
      this.isTimerCritical = percentRemaining <= 10;

      // Pulse effect for the last minute
      this.pulseTimer = this.timeLeft <= 60;

      // Auto-submit if time runs out
      if (this.timeLeft <= 0) {
        this.finishTest(true);
      }

      // Save progress every minute
      if (this.timeLeft % 60 === 0) {
        this.saveProgress();
      }

      this.cdr.markForCheck();
    });
  }

  updateFormattedTime(): void {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    this.formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  recalculateProgress(): void {
    // Count answered questions
    this.answeredCount = this.questions.filter((q) => q.answered).length;

    // Count flagged questions
    this.flaggedCount = this.questions.filter((q) => q.flaggedForReview).length;

    // Log for debugging
    console.log(
      `Progress updated: ${this.answeredCount}/${this.questions.length} answered, ${this.flaggedCount} flagged`
    );
  }

  // Navigation methods
  goToQuestion(index: number): void {
    if (
      index >= 0 &&
      index < this.questions.length &&
      index !== this.currentQuestionIndex
    ) {
      // Record time spent on current question before navigating away
      this.trackingService.endCurrentQuestionVisit();

      // Mark current question as visited
      if (this.currentQuestion) {
        this.currentQuestion.visited = true;
      }

      // Update current index
      this.currentQuestionIndex = index;

      // Mark new question as visited and start tracking time
      if (this.questions[index]) {
        this.questions[index].visited = true;
        this.trackingService.startQuestionVisit(
          String(this.questions[index].id)
        );
      }

      // Reset animations to trigger them again
      this.resetAnimations();
      setTimeout(() => this.startAnimations(), 50);

      this.cdr.markForCheck();

      // Auto-save progress
      this.saveProgress();
    }
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.goToQuestion(this.currentQuestionIndex - 1);
    }
  }

  nextQuestion(): void {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.goToQuestion(this.currentQuestionIndex + 1);
    }
  }

  // UI interaction methods
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.cdr.markForCheck();
  }

  toggleFlag(): void {
    if (!this.currentQuestion) return;

    // Update UI state immediately for better UX
    this.currentQuestion.flaggedForReview =
      !this.currentQuestion.flaggedForReview;

    if (this.attemptId) {
      // Use the tracking service to toggle the flag on the server
      this.trackingService
        .toggleQuestionFlag(String(this.currentQuestion.id))
        .subscribe({
          next: () => {
            this.recalculateProgress();
            this.saveProgress();
          },
          error: (err) => console.error('Error toggling flag:', err),
        });
    }

    this.recalculateProgress();
    this.cdr.markForCheck();
  }

  dismissTooltip(): void {
    this.showTooltip = false;
    this.cdr.markForCheck();
  }

  onHasEditableDominosChanged(hasEditableDominos: boolean): void {
    this.hasEditableDominos = hasEditableDominos;
    this.cdr.markForCheck();
  }

  onDominoChanged(change: DominoChange): void {
    if (!this.currentQuestion) return;

    const dominoIndex = this.currentQuestion.dominos.findIndex(
      (d) => d.id === change.id
    );

    if (dominoIndex !== -1) {
      // Only submit if both values are set (not null)
      if (change.topValue !== null && change.bottomValue !== null) {
        // Update the domino values in the UI
        this.currentQuestion.dominos[dominoIndex].topValue = change.topValue;
        this.currentQuestion.dominos[dominoIndex].bottomValue =
          change.bottomValue;

        // Create the answer in the correct format for the backend
        const dominoAnswer = {
          dominoId: change.id,
          topValue: change.topValue,
          bottomValue: change.bottomValue,
        };

        // Store the answer in the question object
        this.currentQuestion.userAnswer = dominoAnswer;
        this.currentQuestion.answered = true;

        console.log('Submitting domino answer:', dominoAnswer);

        // Submit the answer to backend via tracking service
        if (this.attemptId) {
          this.trackingService
            .submitAnswer(String(this.currentQuestion.id), dominoAnswer)
            .subscribe({
              next: (response) => {
                console.log('Answer submitted successfully:', response);
                this.recalculateProgress();
                this.saveProgress(); // Save progress after answering
              },
              error: (err) => console.error('Error submitting answer:', err),
            });
        } else {
          console.error('Cannot submit answer: No attempt ID available');
        }

        this.recalculateProgress();
        this.cdr.markForCheck();
      } else {
        console.log(
          'Waiting for both domino values to be set before submitting'
        );
      }
    }
  }

  onDominoSelected(id: number): void {
    console.log(`Domino ${id} selected`);

    // Hide the tooltip after first interaction
    if (this.showTooltip) {
      setTimeout(() => {
        this.showTooltip = false;
        this.cdr.markForCheck();
      }, 3000);
    }
  }

  onDominoRotated(event: { id: number; isVertical: boolean }): void {
    if (!this.currentQuestion) return;

    // Update the domino orientation in the current question
    const dominoIndex = this.currentQuestion.dominos.findIndex(
      (d) => d.id === event.id
    );
    if (dominoIndex !== -1) {
      this.currentQuestion.dominos[dominoIndex] = {
        ...this.currentQuestion.dominos[dominoIndex],
        isVertical: event.isVertical,
      };

      this.cdr.markForCheck();

      // Auto-save progress
      this.saveProgress();
    }
  }

  skipCurrentQuestion(): void {
    if (!this.currentQuestion || !this.attemptId) return;

    // Mark as skipped in the UI
    this.currentQuestion.answered = false;
    this.currentQuestion.userAnswer = undefined;

    // Send skip request to the server
    this.trackingService
      .skipQuestion(String(this.currentQuestion.id))
      .subscribe({
        next: () => {
          console.log(`Question ${this.currentQuestion?.id} marked as skipped`);

          // Move to the next question if available
          if (this.currentQuestionIndex < this.questions.length - 1) {
            this.nextQuestion();
          }
        },
        error: (err) => console.error('Error skipping question:', err),
      });
  }

  finishTest(autoSubmit: boolean = false): void {
    if (this.isSubmittingTest) return;

    const unansweredCount = this.questions.length - this.answeredCount;
    if (!autoSubmit && unansweredCount > 0) {
      if (
        !confirm(
          `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit your test?`
        )
      ) {
        return;
      }
    }

    this.isSubmittingTest = true;

    // Make sure to record the time spent on the current question
    this.trackingService.endCurrentQuestionVisit();

    // Complete the attempt through the tracking service
    this.trackingService.completeAttempt().subscribe({
      next: (result) => {
        console.log('Test submitted successfully:', result);
        this.isTestComplete = true;
        this.isSubmittingTest = false;

        // Extract score from the correct location in the response
        let attemptId = this.attemptId || 'unknown';
        let score = 0;

        // Handle different response formats
        if (result && result.data) {
          // Standard API response format
          attemptId = result.data._id || this.attemptId;
          score = result.data.percentageScore || 0;
        } else if (result) {
          // Direct object format
          attemptId = result._id || this.attemptId;
          score = result.percentageScore || 0;
        }

        console.log(
          `Test completed, score: ${score}%, attemptId: ${attemptId}`
        );

        // Clear saved progress since test is complete
        this.dominoTestService.clearTestProgress(this.testId);

        // Navigate to the completion page
        this.router.navigate(['/candidate/tests/complete'], {
          queryParams: {
            attemptId: attemptId,
            score: score,
          },
        });

        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error submitting test:', error);
        this.isSubmittingTest = false;
        alert('Failed to submit test. Please try again.');
        this.cdr.markForCheck();
      },
    });
  }

  // Animation helper methods
  resetAnimations(): void {
    this.animateQuestionInstructions = false;
    this.animateDominoGrid = false;
    this.animateQuestionControls = false;
    this.animateTooltip = false;
    this.cdr.markForCheck();
  }

  startAnimations(): void {
    this.animateQuestionInstructions = true;
    this.animateDominoGrid = true;
    this.animateQuestionControls = true;
    if (this.showTooltip) {
      this.animateTooltip = true;
    }
    this.cdr.markForCheck();
  }

  getProgressMarkers(): {
    position: number;
    active: boolean;
    flagged: boolean;
  }[] {
    return this.questions.map((q, index) => {
      const position = ((index + 1) / this.questions.length) * 100;
      return {
        position,
        active: this.currentQuestionIndex === index,
        flagged: q.flaggedForReview || false,
      };
    });
  }

  getAutoGridRows(dominos: DominoPosition[]): number {
    if (!dominos || dominos.length === 0) return 1;
    const maxRow = Math.max(
      ...dominos.map((d) => (d.row !== undefined ? d.row : 0))
    );
    return maxRow + 1; // Add 1 because rows are 0-indexed
  }

  // Alternative approach using subscription
  // Replace the resetTest method with this corrected version:
  resetTest(): void {
    // Show confirmation dialog
    if (confirm('This will reset all your progress. Are you sure?')) {
      // Clear saved progress for this test
      this.dominoTestService.clearTestProgress(this.testId);

      // Reset the questions to initial state
      this.questions = [];

      // Reset timer if needed
      this.timeLeft = this.testDuration * 60;
      this.updateFormattedTime();

      // Reset UI state
      this.showTooltip = true;
      this.sidebarCollapsed = false;

      // Go to the first question
      this.currentQuestionIndex = 0;

      // Load fresh test data with proper callback handling
      // Use the CURRENT test ID instead of hardcoded 'd70-enhanced'
      this.dominoTestService.getTest(this.testId).subscribe({
        next: (testData) => {
          if (testData) {
            this.testName = testData.name || 'Logical Reasoning Test';
            this.testDuration = testData.duration || 30;
            this.timeLeft = this.testDuration * 60;
            this.updateFormattedTime();

            // Process questions
            if (testData.questions && testData.questions.length > 0) {
              this.questions = testData.questions.map((q: any) => ({
                id: q.id,
                title: q.title || `Question ${q.id}`,
                instruction:
                  q.instruction ||
                  'Find the missing values in the domino pattern',
                dominos: q.dominos,
                arrows: q.arrows || [],
                gridLayout: q.gridLayout || { rows: 3, cols: 3 },
                answered: false,
                flaggedForReview: false,
                visited: false,
                pattern: q.pattern || '',
              }));

              // Mark first question as visited
              if (this.questions.length > 0) {
                this.questions[0].visited = true;
              }
            }

            // Start the timer
            this.startTimer();
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Error loading test data:', error);

          // Mark first question as visited
          if (this.questions.length > 0) {
            this.questions[0].visited = true;
          }

          this.cdr.markForCheck();
        },
      });
    }
  }

  getAutoGridCols(dominos: DominoPosition[]): number {
    if (!dominos || dominos.length === 0) return 1;
    const maxCol = Math.max(
      ...dominos.map((d) => (d.col !== undefined ? d.col : 0))
    );
    return maxCol + 1; // Add 1 because cols are 0-indexed
  }
}
