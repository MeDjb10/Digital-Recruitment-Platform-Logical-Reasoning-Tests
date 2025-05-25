import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  AfterViewInit,
  ViewChild,
  HostListener,
  SimpleChanges,
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
import {
  TestQuestion,
  DominoChange,
  PropositionResponse, // Import PropositionResponse
} from '../../models/domino.model';
import { DominoPosition } from '../../../../../core/models/domino.model';
import { MultipleChoiceQuestionComponent } from '../../components/multiple-choice-question/multiple-choice-question.component'; // Import the new component

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
    MultipleChoiceQuestionComponent, // Add the new component here
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
  testType: string = 'domino'; // Default type
  testId: string = 'd70'; // Default to d70 test
  attemptId: string | null = null;

  // Questions and navigation
  questions: TestQuestion[] = [];
  currentQuestionIndex: number = 0;
  currentQuestion: TestQuestion | undefined; // Explicitly type and ensure not readonly
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
  loading: boolean = true; // Loading state for the test data

  // New properties for instruction handling
  instructionExpanded: boolean = false;
  isInstructionLong: boolean = false;
  private readonly INSTRUCTION_LENGTH_THRESHOLD = 120; // characters

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
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.testId = params['id'];
      }

      // Load the test data
      console.log('testId', this.testId);
      this.loadTestData(this.testId);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Check instruction length when question changes
    if (changes['currentQuestion']) {
      this.checkInstructionLength();
      this.instructionExpanded = false; // Reset expansion state
    }
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
    this.checkInstructionLength();
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
    this.loading = true;
    this.loadingError = null;
    console.log('[ModernTest] Loading test data for ID:', testId); // DEBUG

    // Check for saved progress first
    const savedProgress = this.dominoTestService.loadProgress(testId);
    if (savedProgress) {
      console.log('[ModernTest] Found saved progress, loading it'); // DEBUG
      this.handleSavedProgress(savedProgress);
      return;
    }

    // Load fresh data from backend
    this.dominoTestService.getTest(testId).subscribe({
      next: (testData) => {
        console.log(
          '[ModernTest] Raw test data loaded from backend:',
          testData
        ); // DEBUG

        if (testData) {
          // Store test data
          this.testName = testData.name || 'Logical Reasoning Test';

          this.testType = testData.type || 'domino'; // Default to domino type
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

          // Process questions - handle both _id and id formats, and questionType
          this.questions = testData.questions.map((q: any, index: number) => ({
            // Added index for logging
            id: q._id || q.id, // Support both formats
            questionType: q.questionType || 'DominoQuestion', // Default to Domino if missing
            title: q.title || '',
            instruction:
              q.instruction ||
              'Answer the question based on the information provided', // More generic default
            // Domino specific fields
            dominos: q.dominos || [],
            arrows: q.arrows || [],
            gridLayout: q.gridLayout || { rows: 3, cols: 3 },
            // MCQ specific fields
            propositions: q.propositions || [],
            // Common fields
            correctAnswer: q.correctAnswer, // Keep generic for now
            answered: q.answered || false,
            flaggedForReview: q.flaggedForReview || false,
            visited: q.visited || false,
            pattern: q.pattern || '', // May only apply to Domino
            layoutType: q.layoutType || 'grid', // May only apply to Domino
            userAnswer: q.userAnswer, // Restore user answer
            questionNumber: index + 1, // Add question number for easier debugging
          }));

          console.log(
            '[ModernTest] Mapped questions after loading:',
            JSON.stringify(this.questions, null, 2)
          ); // DEBUG - Log mapped questions

          // Set first question as visited and start tracking it
          if (this.questions.length > 0) {
            this.questions[0].visited = true;
            if (this.attemptId) {
              this.trackingService.startQuestionVisit(
                String(this.questions[0].id)
              );
            }
          }

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
    console.log(
      '[ModernTest] Handling saved progress. Raw saved data:',
      JSON.stringify(savedProgress, null, 2)
    ); // DEBUG

    this.testId = savedProgress.testId;
    this.testName = savedProgress.testName;
    this.testDuration = savedProgress.duration;
    this.timeLeft = savedProgress.remainingTime;
    this.attemptId = savedProgress.attemptId; // Restore attemptId

    // Restore questions and progress - **Refined Mapping**
    this.questions = savedProgress.questions.map((q: any, index: number) => ({
      // Explicitly map all fields needed, similar to loadTestData
      id: q.id, // Assuming ID is saved correctly
      questionType: q.questionType || 'DominoQuestion', // Default if missing in saved data
      title: q.title || '',
      instruction:
        q.instruction ||
        'Answer the question based on the information provided',
      // Domino specific fields
      dominos: q.dominos || [],
      arrows: q.arrows || [],
      gridLayout: q.gridLayout || { rows: 3, cols: 3 },
      // MCQ specific fields
      propositions: q.propositions || [], // **Crucial: Ensure propositions are mapped**
      // Common fields
      correctAnswer: q.correctAnswer, // May or may not be saved/needed
      answered: q.answered || false,
      flaggedForReview: q.flaggedForReview || false,
      visited: q.visited || false,
      pattern: q.pattern || '',
      layoutType: q.layoutType || 'grid',
      userAnswer: q.userAnswer, // Restore user answer
      questionNumber: q.questionNumber || index + 1, // Restore or recalculate
    }));
    this.currentQuestionIndex = savedProgress.currentQuestionIndex || 0;

    console.log(
      '[ModernTest] Mapped questions after loading saved progress (Refined):',
      JSON.stringify(this.questions, null, 2)
    ); // DEBUG

    if (this.questions.length > 0) {
      this.currentQuestion = this.questions[this.currentQuestionIndex];
      // Mark the current question as visited upon loading progress
      if (this.currentQuestion) {
        this.currentQuestion.visited = true;
      }
    } else {
      this.currentQuestion = undefined;
    }

    this.recalculateProgress();
    this.startTimer(); // Resume timer

    this.loading = false;
    this.cdr.markForCheck();

    // Start animations after loading saved progress
    this.startAnimations();
  }

  saveProgress(): void {
    if (!this.testId || !this.questions || this.questions.length === 0) {
      console.warn(
        '[ModernTest] Attempted to save progress with invalid data.'
      );
      return;
    }

    const progressData = {
      testId: this.testId,
      testName: this.testName,
      duration: this.testDuration,
      remainingTime: this.timeLeft,
      currentQuestionIndex: this.currentQuestionIndex,
      questions: this.questions, // Save the current state of questions array
      attemptId: this.attemptId, // Save attemptId
      timestamp: new Date().toISOString(),
    };

    // DEBUG: Log the data being saved
    console.log(
      '[ModernTest] Saving progress. Data:',
      JSON.stringify(
        progressData.questions.map((q) => ({
          id: q.id,
          type: q.questionType,
          props: q.propositions?.length,
        })),
        null,
        2
      )
    );

    this.dominoTestService.saveProgress(this.testId, progressData);
  }

  startTimer(): void {
    if (this.timerSubscription) return; // Ensure modal closed and timer not running

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
    // Reset instruction state when changing questions
    this.instructionExpanded = false;

    if (index < 0 || index >= this.questions.length) {
      console.warn(
        `[ModernTest] Attempted to navigate to invalid index: ${index}`
      );
      return;
    }

    // End time tracking for the current question FIRST
    this.trackingService.endCurrentQuestionVisit();

    // Update current question
    this.currentQuestionIndex = index;
    this.currentQuestion = this.questions[this.currentQuestionIndex];

    // Start time tracking for the new question
    if (this.currentQuestion) {
      this.trackingService.startQuestionVisit(String(this.currentQuestion.id));
      this.currentQuestion.visited = true;
    }

    // Reset any existing selection in the domino grid
    if (this.dominoGrid) {
      this.dominoGrid.deselectDomino();
    }

    this.resetAnimations();
    this.startAnimations();

    setTimeout(() => {
      this.checkInstructionLength();
      this.cdr.detectChanges();
    }, 100);
  }

  previousQuestion(): void {
    // Reset instruction state
    this.instructionExpanded = false;

    if (this.currentQuestionIndex > 0) {
      this.goToQuestion(this.currentQuestionIndex - 1);
    }
    setTimeout(() => {
      this.checkInstructionLength();
      this.cdr.detectChanges();
    }, 100);
  }

  nextQuestion(): void {
    // Reset instruction state
    this.instructionExpanded = false;

    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.goToQuestion(this.currentQuestionIndex + 1);
    }
    setTimeout(() => {
      this.checkInstructionLength();
      this.cdr.detectChanges();
    }, 100);
  }

  // UI interaction methods
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.cdr.markForCheck();
  }

  // Update the flagging logic to use trackingService directly:
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
    // This might only be relevant for Domino questions, adjust tooltip logic if needed
    this.hasEditableDominos = hasEditableDominos;
    this.cdr.markForCheck();
  }

  onDominoChanged(change: DominoChange): void {
    if (
      !this.currentQuestion ||
      this.currentQuestion.questionType !== 'DominoQuestion'
    )
      return;

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

  // Update onPropositionAnswerChanged to use trackingService directly:
  onPropositionAnswerChanged(responses: PropositionResponse[]): void {
    if (
      !this.currentQuestion ||
      this.currentQuestion.questionType !== 'MultipleChoiceQuestion'
    )
      return;

    // Store the responses in the question object
    this.currentQuestion.userAnswer = responses;
    // Mark as answered if all propositions have a response other than 'X' (or decide your own logic)
    const allAnswered = responses.every((r) => r.candidateEvaluation !== 'X');
    this.currentQuestion.answered = allAnswered; // Or simply true once any interaction happens

    console.log('Submitting proposition answers:', responses);

    // Submit the answer array to the backend via tracking service
    if (this.attemptId) {
      this.trackingService
        .submitAnswer(String(this.currentQuestion.id), responses) // Send the array
        .subscribe({
          next: (response) => {
            console.log(
              'Proposition answers submitted successfully:',
              response
            );
            this.recalculateProgress();
            this.saveProgress(); // Save progress after answering
          },
          error: (err) =>
            console.error('Error submitting proposition answers:', err),
        });
    } else {
      console.error('Cannot submit answer: No attempt ID available');
    }

    this.recalculateProgress();
    this.cdr.markForCheck();
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
            this.testType = testData.type || 'domino'; // Default to domino type
            this.testDuration = testData.duration || 30;
            this.timeLeft = this.testDuration * 60;
            this.updateFormattedTime();

            // Process questions
            if (testData.questions && testData.questions.length > 0) {
              this.questions = testData.questions.map((q: any) => ({
                id: q._id || q.id,
                questionType: q.questionType || 'DominoQuestion', // Add this
                title: q.title || `Question ${q.id}`,
                instruction:
                  q.instruction ||
                  'Answer the question based on the information provided',
                dominos: q.dominos || [],
                arrows: q.arrows || [],
                gridLayout: q.gridLayout || { rows: 3, cols: 3 },
                propositions: q.propositions || [], // Add this
                answered: false,
                flaggedForReview: false,
                visited: false,
                pattern: q.pattern || '',
                layoutType: q.layoutType || 'grid',
                userAnswer: undefined, // Clear user answer on reset
                correctAnswer: q.correctAnswer,
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

  /**
   * Check if the current question's instruction is long enough to need truncation
   */
  private checkInstructionLength(): void {
    if (this.currentQuestion?.instruction) {
      this.isInstructionLong =
        this.currentQuestion.instruction.length >
        this.INSTRUCTION_LENGTH_THRESHOLD;
    } else {
      this.isInstructionLong = false;
    }
  }

  /**
   * Toggle the expansion state of the instruction text
   */
  toggleInstructionExpanded(): void {
    this.instructionExpanded = !this.instructionExpanded;

    // Optional: Track analytics for UX improvement
    if (this.instructionExpanded) {
      console.log(
        'User expanded instruction for question:',
        this.currentQuestionIndex + 1
      );
    }
  }

  /**
   * Auto-expand instruction if user stays on question for a while
   */
  private autoExpandInstruction(): void {
    if (this.isInstructionLong && !this.instructionExpanded) {
      setTimeout(() => {
        if (!this.instructionExpanded && this.isInstructionLong) {
          this.instructionExpanded = true;
          this.cdr.detectChanges();
        }
      }, 5000); // Auto-expand after 5 seconds
    }
  }
}
