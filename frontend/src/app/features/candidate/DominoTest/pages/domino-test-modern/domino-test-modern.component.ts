import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  AfterViewInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';

import { Subscription, interval } from 'rxjs';

import {
  DominoChange,
  DominoPosition,
  TestQuestion,
} from '../../models/domino.model';
import { HelpTooltipComponent } from '../../components/help-tooltip/helpTooltip.component';
import { NavigationControlsComponent } from '../../components/navigation-controls/navigationControls.component';
import { SimpleDominoGridComponent } from '../../components/simple-domino-grid/simpleDominoGrid.component';
import { TestHeaderComponent } from '../../components/test-header/testHeader.component';
import { TestSidebarComponent } from '../../components/test-sidebar/testSidebar.component';
import { DominoTestService } from '../../services/domino-test.service';

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
    private dominoTestService: DominoTestService
  ) {}

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

    // Save progress before leaving
    this.saveProgress();
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

          // Set first question as visited
          if (this.questions.length > 0) {
            this.questions[0].visited = true;
            this.dominoTestService.trackQuestionVisit(this.questions[0].id);
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
    this.updateFormattedTime();

    // Restore questions and progress
    this.questions = savedProgress.questions;
    this.currentQuestionIndex = savedProgress.currentQuestionIndex || 0;

    // Calculate answered and flagged counts
    this.recalculateProgress();

    // Start the timer
    this.startTimer();
    this.cdr.markForCheck();

    // Show notification that progress was restored
    // In a real app, you might use a toast notification here
    console.log('Test progress restored from previous session.');
  }

  saveProgress(): void {
    // Skip if test is complete
    if (this.isTestComplete) return;

    const progress = {
      testId: this.testId,
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
      // Mark current question as visited
      if (this.currentQuestion) {
        this.currentQuestion.visited = true;
      }

      // Update current index
      this.currentQuestionIndex = index;

      // Mark new question as visited
      if (this.questions[index]) {
        this.questions[index].visited = true;
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

    this.currentQuestion.flaggedForReview =
      !this.currentQuestion.flaggedForReview;

    this.dominoTestService
      .toggleQuestionFlag(
        this.currentQuestion.id,
        this.currentQuestion.flaggedForReview
      )
      .subscribe({
        error: (err) => console.error('Error toggling flag:', err),
      });

    this.recalculateProgress();
    this.saveProgress();
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

  // In domino-test-modern.component.ts
  onDominoChanged(change: DominoChange): void {
    if (!this.currentQuestion) return;

    const dominoIndex = this.currentQuestion.dominos.findIndex(
      (d) => d.id === change.id
    );

    if (dominoIndex !== -1) {
      // Update the domino values
      this.currentQuestion.dominos[dominoIndex].topValue = change.topValue;
      this.currentQuestion.dominos[dominoIndex].bottomValue =
        change.bottomValue;

      // Set answer for the current question
      this.currentQuestion.answered = true;

      // Create the answer in the correct format
      const dominoAnswer = {
        dominoId: change.id,
        topValue: change.topValue,
        bottomValue: change.bottomValue,
      };

      // Store the answer in the question object
      this.currentQuestion.userAnswer = dominoAnswer;

      console.log('Submitting domino answer:', dominoAnswer);

      // Submit the answer to backend
      this.dominoTestService
        .submitAnswer(this.currentQuestion.id, dominoAnswer)
        .subscribe({
          next: (response) =>
            console.log('Answer submitted successfully:', response),
          error: (err) => console.error('Error submitting answer:', err),
        });

      this.recalculateProgress();
      this.saveProgress(); // Save progress after answering
      this.cdr.markForCheck();
    }
  }

  onDominoSelected(id: number): void {
    // This can be used to highlight a selected domino if needed
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

  // Update the finishTest method
  // Update the finishTest method to correctly handle the score
  // Update the finishTest method to use correct navigation
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

    this.dominoTestService.submitTest(this.testId).subscribe({
      next: (result) => {
        console.log('Test submitted successfully:', result);
        this.isTestComplete = true;
        this.isSubmittingTest = false;

        // Extract score from the correct location in the response
        let attemptId = 'unknown';
        let score = 0;

        // Handle different response formats
        if (result.data) {
          // Standard API response format
          attemptId = result.data._id;
          score = result.data.percentageScore;
        } else {
          // Direct object format
          attemptId = result._id;
          score = result.percentageScore;
        }

        console.log(
          `Test completed, score: ${score}%, attemptId: ${attemptId}`
        );

        // IMPORTANT: Fix navigation path to use a route, not an API path
        // Make sure you have this route defined in your app's routing module
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

  // In domino-test-modern.component.ts

  setupDemoTest(): void {
    // Use the enhanced test variant for a better demo
    this.dominoTestService.getTest('d70-enhanced').subscribe({
      next: (testData) => {
        if (testData) {
          this.testName = testData.name || 'Enhanced Domino Reasoning Test';
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

            // Set the first question as visited
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
        // Create fallback questions only if needed
        this.createBasicDemoQuestions();
        this.cdr.markForCheck();
      },
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
          this.createBasicDemoQuestions();

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
  createBasicDemoQuestions(): void {
    this.questions = [
      {
        id: 1,
        title: 'Simple Pattern',
        instruction: 'Identify the pattern and complete the missing domino.',
        dominos: [
          {
            id: 1,
            row: 0,
            col: 0,
            topValue: 1,
            bottomValue: 2,
            isEditable: false,
          },
          {
            id: 2,
            row: 0,
            col: 1,
            topValue: 2,
            bottomValue: 3,
            isEditable: false,
          },
          {
            id: 3,
            row: 0,
            col: 2,
            topValue: 3,
            bottomValue: 4,
            isEditable: false,
          },
          {
            id: 4,
            row: 0,
            col: 3,
            topValue: null,
            bottomValue: null,
            isEditable: true,
          },
        ],
        gridLayout: { rows: 1, cols: 4 },
        answered: false,
        flaggedForReview: false,
        visited: true,
      },
    ];
  }
}
