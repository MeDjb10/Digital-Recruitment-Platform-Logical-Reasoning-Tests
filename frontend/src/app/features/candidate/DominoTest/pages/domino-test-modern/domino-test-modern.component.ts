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
import {
  RealtimeSecurityAlertService,
  SecurityAlert,
} from '../../services/realtime-security-alert.service';
import { DominoPosition } from '../../../../../core/models/domino.model';
import { MultipleChoiceQuestionComponent } from '../../components/multiple-choice-question/multiple-choice-question.component'; // Import the new component
import { AuthService } from '../../../../../core/auth/services/auth.service';

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
  candidateId: string | null = null;
  candidateName: string | null = null;
  // Questions and navigation
  questions: TestQuestion[] = [];
  currentQuestionIndex: number = 0;
  currentQuestion: TestQuestion | undefined; // Explicitly type and ensure not readonly
  answeredCount: number = 0;
  flaggedCount: number = 0;

  // Getter to ensure currentQuestion is always in sync
  get currentQuestionSafe(): TestQuestion | undefined {
    return this.questions[this.currentQuestionIndex] || undefined;
  }

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
  hasEditableDominos: boolean = false; // Test submission state
  isSubmittingTest: boolean = false;
  loadingError: string | null = null;
  isTestComplete: boolean = false;
  loading: boolean = true; // Loading state for the test data
  // Progress expiration settings
  private readonly PROGRESS_EXPIRY_TIME = 60 * 60 * 1000; // 1 hour in milliseconds
  private progressStartTime: number = 0;
  private cleanupInterval?: number;

  // New properties for instruction handling
  instructionExpanded: boolean = false;
  isInstructionLong: boolean = false;
  private readonly INSTRUCTION_LENGTH_THRESHOLD = 120; // characters
  // Security and anti-cheating properties
  tabSwitchWarnings: number = 0;
  maxTabSwitchWarnings: number = 10; // Allow 10 warnings before auto-submit
  isTestSecurityViolated: boolean = false;
  securityViolationReason: string = '';
  lastFocusTime: number = Date.now();
  isPageVisible: boolean = true;

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
    private trackingService: TestAttemptTrackingService,
    private securityAlertService: RealtimeSecurityAlertService,
    private authService: AuthService // Inject AuthService
  ) {} // React to browser/tab close to save progress
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    // Record time spent on current question before leaving
    this.trackingService.endCurrentQuestionVisit();

    // Only save progress if test is not complete or being submitted
    if (!this.isTestComplete && !this.isSubmittingTest) {
      this.saveProgress();
    }

    // If test is not complete, show warning and send alert
    if (!this.isTestComplete && !this.isSubmittingTest) {
      // Send real-time alert about navigation attempt
      this.sendRealtimeAlert(
        'NAVIGATION_ATTEMPT',
        'Candidate attempted to leave test before completion',
        {
          navigationType: 'beforeunload',
          testProgress: `${this.answeredCount}/${this.questions.length}`,
          timeRemaining: this.timeLeft,
        }
      );

      const message =
        'Are you sure you want to leave? Your test progress will be saved, but leaving during the test may be considered suspicious activity and psychologists have been notified.';
      event.returnValue = message;

      // Log this as a potential security concern
      this.logSecurityEvent('User attempted to leave test before completion');

      return message;
    }

    return null;
  }
  // Security: Detect when user leaves the tab/window
  @HostListener('window:blur')
  onWindowBlur() {
    this.updatePageVisibility(false);
    this.handleTabSwitch('Window lost focus');
  }

  @HostListener('window:focus')
  onWindowFocus() {
    this.lastFocusTime = Date.now();
    this.updatePageVisibility(true);
  }

  // Security: Detect visibility change (tab switching)
  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (document.hidden) {
      this.updatePageVisibility(false);
      this.handleTabSwitch('Tab switched or browser minimized');
    } else {
      this.updatePageVisibility(true);
      this.lastFocusTime = Date.now();
    }
  } // Security: Log right-click attempts but don't prevent them
  @HostListener('contextmenu', ['$event'])
  onRightClick(event: Event) {
    // Just log the attempt but allow right-click
    this.logSecurityEvent('Right-click context menu accessed');

    // Send low-severity alert
    this.sendRealtimeAlert('RIGHT_CLICK', 'Right-click context menu accessed', {
      elementType: (event.target as HTMLElement)?.tagName || 'unknown',
      eventType: 'contextmenu',
    });

    return true; // Allow the context menu
  } // Security: Monitor keyboard shortcuts for cheating and copy/paste
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): boolean {
    // Monitor copy/paste operations
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'c' || event.key === 'C') {
        // Copy operation detected
        this.sendRealtimeAlert(
          'COPY_PASTE',
          'Copy operation detected (Ctrl+C)',
          {
            operation: 'copy',
            shortcut: event.ctrlKey ? 'Ctrl+C' : 'Cmd+C',
            eventType: 'keydown',
            prevented: false,
          }
        );
        this.logSecurityEvent('Copy operation detected');
        // Allow the operation but log it
        return true;
      }

      if (event.key === 'v' || event.key === 'V') {
        // Paste operation detected
        this.sendRealtimeAlert(
          'COPY_PASTE',
          'Paste operation detected (Ctrl+V)',
          {
            operation: 'paste',
            shortcut: event.ctrlKey ? 'Ctrl+V' : 'Cmd+V',
            eventType: 'keydown',
            prevented: false,
          }
        );
        this.logSecurityEvent('Paste operation detected');
        // Allow the operation but log it
        return true;
      }

      if (event.key === 'a' || event.key === 'A') {
        // Select all operation detected
        this.sendRealtimeAlert(
          'COPY_PASTE',
          'Select All operation detected (Ctrl+A)',
          {
            operation: 'selectAll',
            shortcut: event.ctrlKey ? 'Ctrl+A' : 'Cmd+A',
            eventType: 'keydown',
            prevented: false,
          }
        );
        this.logSecurityEvent('Select All operation detected');
        // Allow the operation but log it
        return true;
      }
    }

    // Monitor screenshot attempts
    if (
      event.key === 'PrintScreen' || // Print Screen
      (event.ctrlKey &&
        event.shiftKey &&
        (event.key === 'S' || event.key === 's')) // Ctrl+Shift+S (Screenshot in some browsers)
    ) {
      event.preventDefault();
      event.stopPropagation();

      const shortcut = `${event.ctrlKey ? 'Ctrl+' : ''}${
        event.shiftKey ? 'Shift+' : ''
      }${event.key}`;

      this.sendRealtimeAlert(
        'SCREENSHOT_ATTEMPT',
        `Screenshot attempt detected: ${shortcut}`,
        {
          shortcut: shortcut,
          eventType: 'keydown',
          prevented: true,
        }
      );

      this.logSecurityEvent(`Screenshot attempt blocked: ${shortcut}`);
      return false;
    }

    // Monitor DevTools shortcuts
    if (
      event.key === 'F12' || // F12
      (event.ctrlKey &&
        event.shiftKey &&
        (event.key === 'I' || event.key === 'i')) || // Ctrl+Shift+I
      (event.ctrlKey &&
        event.shiftKey &&
        (event.key === 'J' || event.key === 'j')) || // Ctrl+Shift+J
      (event.ctrlKey &&
        event.shiftKey &&
        (event.key === 'C' || event.key === 'c')) || // Ctrl+Shift+C
      (event.ctrlKey && (event.key === 'U' || event.key === 'u')) // Ctrl+U (View Source)
    ) {
      const shortcut = `${event.ctrlKey ? 'Ctrl+' : ''}${
        event.shiftKey ? 'Shift+' : ''
      }${event.key}`;

      this.sendRealtimeAlert(
        'DEVTOOLS_DETECTED',
        `Developer tools shortcut detected: ${shortcut}`,
        {
          shortcut: shortcut,
          eventType: 'keydown',
          prevented: false,
        }
      );

      this.logSecurityEvent(`DevTools shortcut detected: ${shortcut}`);
      // Allow the operation but log it
      return true;
    }

    return true;
  } // Security: Monitor text selection
  @HostListener('selectstart', ['$event'])
  onSelectStart(event: Event): boolean {
    // Monitor text selection and send alert
    this.sendRealtimeAlert('COPY_PASTE', 'Text selection detected', {
      operation: 'textSelection',
      elementType: (event.target as HTMLElement)?.tagName || 'unknown',
      eventType: 'selectstart',
      prevented: false,
    });

    this.logSecurityEvent('Text selection detected');
    return true; // Allow text selection
  }

  // Security: Monitor window resizing
  @HostListener('window:resize')
  onWindowResize() {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;

    // Send alert for window resizing
    this.sendRealtimeAlert(
      'DEVTOOLS_DETECTED',
      'Window resized - potential DevTools activity',
      {
        operation: 'windowResize',
        newDimensions: `${newWidth}x${newHeight}`,
        eventType: 'resize',
        prevented: false,
      }
    );

    this.logSecurityEvent(`Window resized to: ${newWidth}x${newHeight}`);
    console.log('Window resized to:', newWidth, 'x', newHeight);
  }
  ngOnInit(): void {
    console.log('[ModernTest] ngOnInit called');

    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.testId = params['id'];
        console.log('[ModernTest] Route params received, testId:', this.testId);
      }

      // Load the test data
      console.log('testId', this.testId);
      this.loadTestData(this.testId);
    });

    // Initialize security measures
    this.initializeSecurityMeasures();

    // Start periodic cleanup of expired progress
    this.startPeriodicCleanup();
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

    // Clean up cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    // Record time spent and save progress before leaving (only if test not complete)
    if (!this.isTestComplete) {
      this.trackingService.endCurrentQuestionVisit();
      this.saveProgress();
    }
    this.trackingService.cleanup();

    // Disconnect security alert service
    this.securityAlertService.disconnect();

    // Try to send any failed alerts before leaving
    this.retryFailedAlerts();

    // Clean up security event listeners
    this.cleanupSecurityMeasures();
  }

  /**
   * Clean up security measures when component is destroyed
   */
  private cleanupSecurityMeasures(): void {
    // Remove event listeners that were added globally
    document.removeEventListener('contextmenu', (e) => e.preventDefault());
    document.removeEventListener('selectstart', (e) => {
      const target = e.target as HTMLElement;
      if (!target.matches('input, textarea, [contenteditable]')) {
        e.preventDefault();
      }
    });
    document.removeEventListener('dragstart', (e) => e.preventDefault());
  }
  /**
   * Reset all component state to initial values
   */
  private resetComponentState(): void {
    console.log('[ModernTest] Resetting component state...');

    // Reset questions and navigation
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.currentQuestion = undefined;
    this.answeredCount = 0;
    this.flaggedCount = 0;

    // Reset UI state
    this.sidebarCollapsed = false;
    this.showTooltip = true;
    this.instructionExpanded = false;
    this.isInstructionLong = false;

    // Reset test state
    this.isSubmittingTest = false;
    this.isTestComplete = false;
    this.loadingError = null;

    // Reset security state
    this.tabSwitchWarnings = 0;
    this.isTestSecurityViolated = false;
    this.securityViolationReason = '';
    this.isPageVisible = true;

    console.log(
      '[ModernTest] Component state reset - questions cleared, counters zeroed'
    );

    // Force change detection to ensure UI reflects the reset state
    this.cdr.detectChanges();
  }
  loadTestData(testId: string): void {
    this.loading = true;
    this.loadingError = null;
    console.log('[ModernTest] Loading test data for ID:', testId); // DEBUG

    // Reset all state before loading
    this.resetComponentState();

    // Check for saved progress first
    const savedProgress = this.dominoTestService.loadProgress(testId);
    if (savedProgress && this.isProgressValid(savedProgress)) {
      console.log('[ModernTest] Found valid saved progress, loading it'); // DEBUG
      this.handleSavedProgress(savedProgress);
      return;
    } else if (savedProgress) {
      console.log('[ModernTest] Found expired saved progress, clearing it'); // DEBUG
      this.dominoTestService.clearTestProgress(testId);
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

          // Set progress start time for expiration tracking
          this.progressStartTime = Date.now();

          // Store the attempt ID and candidate info for tracking
          if (testData.attemptId) {
            this.attemptId = testData.attemptId;
            // Initialize the tracking service
            this.trackingService.initAttempt(testData.attemptId);
          } else {
            console.error('No attempt ID provided in test data');
          }

          // Extract candidate information for security alerts
          this.candidateId =
            testData.candidateId || testData.candidate?.id || 'unknown';
          this.candidateName =
            testData.candidateName ||
            testData.candidate?.name ||
            'Unknown Candidate';

          // If we don't have candidate info from test data, get it from current user
          if (
            this.candidateId === 'unknown' ||
            this.candidateName === 'Unknown Candidate'
          ) {
            this.authService.currentUser$.subscribe((user) => {
              if (user) {
                if (this.candidateId === 'unknown') {
                  this.candidateId = user.id;
                }
                if (this.candidateName === 'Unknown Candidate') {
                  this.candidateName = `${user.firstName} ${user.lastName}`;
                }
                console.log('Updated candidate info from auth:', {
                  id: this.candidateId,
                  name: this.candidateName,
                });
              }
            });
          }

          console.log('Candidate Info:', {
            id: this.candidateId,
            name: this.candidateName,
            attemptId: this.attemptId,
          }); // Process questions - handle both _id and id formats, and questionType
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
            // For NEW attempts, always start with fresh state
            answered: false, // Always false for new attempts
            flaggedForReview: false, // Always false for new attempts
            visited: false, // Always false for new attempts (except first question)
            pattern: q.pattern || '', // May only apply to Domino
            layoutType: q.layoutType || 'grid', // May only apply to Domino
            userAnswer: undefined, // Always undefined for new attempts
            questionNumber: index + 1, // Add question number for easier debugging
          }));
          console.log(
            '[ModernTest] Mapped questions after loading:',
            JSON.stringify(
              this.questions.map((q) => ({
                id: q.id,
                questionNumber: q.questionNumber,
                answered: q.answered,
                flagged: q.flaggedForReview,
                visited: q.visited,
                userAnswer: q.userAnswer,
              })),
              null,
              2
            )
          ); // DEBUG - Log mapped questions// Reset progress counters for new attempts
          this.answeredCount = 0;
          this.flaggedCount = 0;

          // Always start from the first question for new test attempts
          this.currentQuestionIndex = 0;
          this.currentQuestion = this.questions[0];

          // Set first question as visited and start tracking it
          if (this.questions.length > 0) {
            this.questions[0].visited = true;
            if (this.attemptId) {
              this.trackingService.startQuestionVisit(
                String(this.questions[0].id)
              );
            }
          } // Recalculate progress to ensure UI state is correct
          this.recalculateProgress();

          console.log(
            `[ModernTest] After recalculate - Answered: ${this.answeredCount}, Flagged: ${this.flaggedCount}`
          );
          console.log(
            `[ModernTest] Questions state after new load:`,
            this.questions.map((q) => ({
              id: q.id,
              questionNumber: q.questionNumber,
              answered: q.answered,
              flagged: q.flaggedForReview,
              visited: q.visited,
              userAnswer: q.userAnswer,
            }))
          );

          this.startTimer();
          this.loading = false;

          // Force change detection multiple times to ensure UI sync
          this.cdr.detectChanges();

          // Use setTimeout to ensure change detection happens after current cycle
          setTimeout(() => {
            this.cdr.detectChanges();
            console.log(
              `[ModernTest] Final UI sync - Answered: ${this.answeredCount}/${this.questions.length}`
            );
          }, 0);

          // Start animations after loading
          this.startAnimations();
        } else {
          this.loadingError = 'Failed to load test data.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      },
      error: (error) => {
        console.error('Error loading test:', error);
        this.loadingError = 'Error loading test data. Please try again.';
        this.loading = false;
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
    this.progressStartTime = savedProgress.progressStartTime || Date.now(); // Restore or set current time

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

    // Ensure currentQuestionIndex is within bounds
    if (this.currentQuestionIndex >= this.questions.length) {
      this.currentQuestionIndex = 0;
    }

    if (this.questions.length > 0) {
      this.currentQuestion = this.questions[this.currentQuestionIndex];
      // Mark the current question as visited upon loading progress
      if (this.currentQuestion) {
        this.currentQuestion.visited = true;
      }

      // Start tracking the current question
      if (this.attemptId && this.currentQuestion) {
        this.trackingService.initAttempt(this.attemptId);
        this.trackingService.startQuestionVisit(
          String(this.currentQuestion.id)
        );
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
    // Don't save progress if test is complete or being submitted
    if (this.isTestComplete || this.isSubmittingTest) {
      console.log(
        '[ModernTest] Skipping progress save - test complete or submitting'
      );
      return;
    }

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
      progressStartTime: this.progressStartTime, // Save start time for expiration
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
    console.log('[ModernTest] Recalculating progress...');
    console.log(`[ModernTest] Total questions: ${this.questions.length}`);

    // Count answered questions
    this.answeredCount = this.questions.filter((q) => q.answered).length;

    // Count flagged questions
    this.flaggedCount = this.questions.filter((q) => q.flaggedForReview).length;

    // Debug: Log which questions are marked as answered
    const answeredQuestions = this.questions.filter((q) => q.answered);
    const flaggedQuestions = this.questions.filter((q) => q.flaggedForReview);

    console.log(
      `[ModernTest] Progress calculated: ${this.answeredCount}/${this.questions.length} answered, ${this.flaggedCount} flagged`
    );

    if (answeredQuestions.length > 0) {
      console.log(
        '[ModernTest] Questions marked as answered:',
        answeredQuestions.map((q) => ({
          id: q.id,
          questionNumber: q.questionNumber,
          answered: q.answered,
          userAnswer: q.userAnswer,
        }))
      );
    } else {
      console.log('[ModernTest] No questions marked as answered');
    }

    if (flaggedQuestions.length > 0) {
      console.log(
        '[ModernTest] Questions marked as flagged:',
        flaggedQuestions.map((q) => ({
          id: q.id,
          questionNumber: q.questionNumber,
          flagged: q.flaggedForReview,
        }))
      );
    }

    // Debug: Show all questions state for troubleshooting
    if (this.questions.length > 0) {
      console.log(
        '[ModernTest] All questions state:',
        this.questions.map((q, index) => ({
          index: index,
          id: q.id,
          questionNumber: q.questionNumber,
          answered: q.answered,
          flagged: q.flaggedForReview,
          visited: q.visited,
          userAnswer: q.userAnswer,
        }))
      );
    }
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

    // Different handling for security violations vs normal submission
    if (this.isTestSecurityViolated) {
      // Security violation - force submit without confirmation
      console.log(
        'Force submitting test due to security violation:',
        this.securityViolationReason
      );
    } else if (!autoSubmit && unansweredCount > 0) {
      // Normal submission with unanswered questions
      if (
        !confirm(
          `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit your test?`
        )
      ) {
        return;
      }
    }

    this.isSubmittingTest = true; // Make sure to record the time spent on the current question
    this.trackingService.endCurrentQuestionVisit();

    // Complete the attempt through the tracking service
    this.trackingService.completeAttempt().subscribe({
      next: (result) => {
        console.log('Test submitted successfully:', result);

        // Log security information separately if needed
        if (this.isTestSecurityViolated) {
          console.log('Security violation details:', {
            reason: this.securityViolationReason,
            tabSwitchWarnings: this.tabSwitchWarnings,
            autoSubmitted: autoSubmit || this.isTestSecurityViolated,
          });
        }

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
        ); // Clear saved progress since test is complete
        this.dominoTestService.clearTestProgress(this.testId);

        // Clear security logs and cleanup intervals
        localStorage.removeItem(`security_logs_${this.testId}`);
        localStorage.removeItem(`failed_alerts_${this.testId}`);

        // Clear cleanup interval
        if (this.cleanupInterval) {
          clearInterval(this.cleanupInterval);
          this.cleanupInterval = undefined;
        }

        // Navigate to the completion page with security information
        this.router.navigate(['/candidate/tests/complete'], {
          queryParams: {
            attemptId: attemptId,
            score: score,
            securityViolated: this.isTestSecurityViolated,
            violationReason: this.securityViolationReason,
          },
        });

        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error submitting test:', error);
        this.isSubmittingTest = false;

        if (this.isTestSecurityViolated) {
          alert(
            'Test submission failed due to security violation. Please contact support.'
          );
        } else {
          alert('Failed to submit test. Please try again.');
        }

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
      // Stop current timer
      if (this.timerSubscription) {
        this.timerSubscription.unsubscribe();
        this.timerSubscription = undefined;
      }

      // End current question tracking
      this.trackingService.endCurrentQuestionVisit();

      // Clear saved progress for this test
      this.dominoTestService.clearTestProgress(this.testId);

      // Reset the questions to initial state
      this.questions = [];

      // Reset timer values
      this.timeLeft = this.testDuration * 60;
      this.updateFormattedTime();

      // Reset UI state
      this.showTooltip = true;
      this.sidebarCollapsed = false;
      this.instructionExpanded = false;

      // Reset to first question
      this.currentQuestionIndex = 0;
      this.currentQuestion = undefined;
      this.progressStartTime = Date.now(); // Reset progress start time

      // Reset progress counters
      this.answeredCount = 0;
      this.flaggedCount = 0;

      // Load fresh test data with proper callback handling
      this.dominoTestService.getTest(this.testId).subscribe({
        next: (testData) => {
          if (testData) {
            this.testName = testData.name || 'Logical Reasoning Test';
            this.testType = testData.type || 'domino'; // Default to domino type
            this.testDuration = testData.duration || 30;
            this.timeLeft = this.testDuration * 60;
            this.updateFormattedTime();

            // Reset progress start time for new attempt
            this.progressStartTime = Date.now();

            // Store the attempt ID for tracking
            if (testData.attemptId) {
              this.attemptId = testData.attemptId;
              this.trackingService.initAttempt(testData.attemptId);
            }

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

              // Always start from first question and mark it as visited
              this.currentQuestionIndex = 0;
              this.currentQuestion = this.questions[0];

              if (this.questions.length > 0) {
                this.questions[0].visited = true;
                // Start tracking the first question
                if (this.attemptId) {
                  this.trackingService.startQuestionVisit(
                    String(this.questions[0].id)
                  );
                }
              }
            } // Recalculate progress
            this.recalculateProgress();

            console.log(
              `[ModernTest] After reset recalculate - Answered: ${this.answeredCount}, Flagged: ${this.flaggedCount}`
            );
            console.log(
              `[ModernTest] Questions state after reset:`,
              this.questions.map((q) => ({
                id: q.id,
                questionNumber: q.questionNumber || 'N/A',
                answered: q.answered,
                flagged: q.flaggedForReview,
                visited: q.visited,
                userAnswer: q.userAnswer,
              }))
            );

            // Start the timer
            this.startTimer();

            // Force change detection multiple times to ensure UI sync
            this.cdr.detectChanges();

            // Use setTimeout to ensure change detection happens after current cycle
            setTimeout(() => {
              this.cdr.detectChanges();
              console.log(
                `[ModernTest] Final reset UI sync - Answered: ${this.answeredCount}/${this.questions.length}`
              );
            }, 0);
          }
        },
        error: (error) => {
          console.error('Error loading test data:', error);

          // Mark first question as visited even on error
          this.currentQuestionIndex = 0;
          if (this.questions.length > 0) {
            this.questions[0].visited = true;
            this.currentQuestion = this.questions[0];
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
  /**
   * Initialize security measures for the test
   */
  private initializeSecurityMeasures(): void {
    // Allow right-click context menu
    // document.addEventListener('contextmenu', (e) => e.preventDefault());

    // Allow text selection globally
    // document.addEventListener('selectstart', (e) => {
    //   const target = e.target as HTMLElement;
    //   if (!target.matches('input, textarea, [contenteditable]')) {
    //     e.preventDefault();
    //   }
    // });

    // Allow drag and drop
    // document.addEventListener('dragstart', (e) => e.preventDefault());

    // Remove DevTools monitoring - allowing DevTools access
    // this.monitorDevTools();

    // Minimal cheating detection (only essential monitoring)
    this.detectCheatingAttempts();

    // Add less intrusive warning about test monitoring
    this.showSecurityWarning();
  }
  /**
   * Show initial security warning to the user
   */
  private showSecurityWarning(): void {
    const message = `� Test Guidelines

Welcome to the logical reasoning test!

For the best test experience:
• Keep this tab focused and active
• Avoid switching between tabs frequently (you have ${this.maxTabSwitchWarnings} warnings before auto-submission)
• You can use developer tools and right-click if needed for accessibility
• Take your time and answer questions carefully

This test is monitored to ensure fairness and integrity.

Click OK to begin the test.`;

    if (!confirm(message)) {
      // If user doesn't accept, redirect them away
      this.router.navigate(['/']);
      return;
    }

    // Show additional reminder
    setTimeout(() => {
      alert(
        '📋 REMINDER: Keep this window focused and avoid suspicious activities. Your test session is now being monitored.'
      );
    }, 1000);
  }
  /**
   * Handle tab switching and focus loss
   */
  private handleTabSwitch(reason: string): void {
    if (this.isTestComplete || this.isSubmittingTest) {
      return; // Don't trigger if test is already complete
    }

    this.tabSwitchWarnings++;
    this.isPageVisible = false;

    console.info(`Security notice ${this.tabSwitchWarnings}: ${reason}`);

    // Log the violation locally
    this.logSecurityEvent(`Tab switch detected: ${reason}`);

    // Send real-time alert to psychologists (low severity)
    this.sendRealtimeAlert('TAB_SWITCH', reason, {
      currentWarning: this.tabSwitchWarnings,
      totalAllowed: this.maxTabSwitchWarnings,
      timeOnQuestion: Date.now() - this.lastFocusTime,
    });

    if (this.tabSwitchWarnings >= this.maxTabSwitchWarnings) {
      // Send critical alert before auto-submitting
      this.sendRealtimeAlert(
        'TEST_SUBMITTED_VIOLATION',
        `Test auto-submitted: Maximum tab switch violations reached (${this.maxTabSwitchWarnings})`,
        {
          finalViolation: true,
          autoSubmitted: true,
        }
      );

      // Auto-submit test after max warnings (now 10 instead of 3)
      this.handleSecurityViolation(
        `Maximum tab switch violations reached (${this.maxTabSwitchWarnings})`
      );
    } else {
      // Show less intrusive warning to user only for higher warning counts
      if (this.tabSwitchWarnings % 3 === 0) {
        // Only show warning every 3 violations
        const remainingWarnings =
          this.maxTabSwitchWarnings - this.tabSwitchWarnings;
        alert(`Security Notice: Tab switch detected (${this.tabSwitchWarnings}/${this.maxTabSwitchWarnings})

${remainingWarnings} more violations will result in auto-submission.

Please keep this tab focused to continue the test.`);
      }
    }
  }
  /**
   * Handle serious security violations (immediate test submission)
   */
  private handleSecurityViolation(reason: string): void {
    if (this.isTestComplete || this.isSubmittingTest) {
      return;
    }

    this.isTestSecurityViolated = true;
    this.securityViolationReason = reason;

    console.error('Security violation detected:', reason);
    this.logSecurityEvent(`Security violation: ${reason}`);

    // Send critical alert immediately
    this.sendCriticalAlert('TEST_SUBMITTED_VIOLATION', reason, {
      violationType: 'CRITICAL_SECURITY_VIOLATION',
      autoSubmitted: true,
      forceSubmission: true,
    });

    // Show final warning
    alert(`🚫 SECURITY VIOLATION DETECTED 🚫

Reason: ${reason}

⚠️ PSYCHOLOGISTS HAVE BEEN IMMEDIATELY NOTIFIED ⚠️

Your test is being automatically submitted due to suspicious activity.
This incident has been logged for review.`);

    // Force submit the test
    this.finishTest(true);
  }

  /**
   * Log security events for review
   */
  private logSecurityEvent(event: string): void {
    const securityLog = {
      timestamp: new Date().toISOString(),
      event: event,
      testId: this.testId,
      attemptId: this.attemptId,
      questionIndex: this.currentQuestionIndex,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.log('Security Event:', securityLog);

    // Send to backend if tracking service is available
    if (this.attemptId && this.trackingService) {
      // You might want to add a method to trackingService for logging security events
      // this.trackingService.logSecurityEvent(securityLog).subscribe();
    }

    // Store locally as backup
    const existingLogs =
      localStorage.getItem(`security_logs_${this.testId}`) || '[]';
    const logs = JSON.parse(existingLogs);
    logs.push(securityLog);
    localStorage.setItem(`security_logs_${this.testId}`, JSON.stringify(logs));
  }

  /**
   * Send real-time security alert to psychologists
   */
  private sendRealtimeAlert(
    alertType: SecurityAlert['alertType'],
    description: string,
    additionalData?: any
  ): void {
    if (!this.attemptId || !this.candidateId) {
      console.warn('Cannot send alert: Missing attemptId or candidateId');
      return;
    }

    const alert = RealtimeSecurityAlertService.createAlert(
      this.attemptId,
      this.testId,
      this.candidateId,
      alertType,
      description,
      this.currentQuestionIndex,
      {
        ...additionalData,
        candidateName: this.candidateName,
        testName: this.testName,
        questionTitle: this.currentQuestion?.title || 'Unknown',
        timeRemaining: this.timeLeft,
        browserInfo: {
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          language: navigator.language,
        },
      },
      this.tabSwitchWarnings,
      this.maxTabSwitchWarnings
    );

    // Send the alert
    this.securityAlertService.sendSecurityAlert(alert).subscribe({
      next: (response) => {
        console.log(
          `🚨 Real-time ${alertType} alert sent successfully:`,
          response
        );
      },
      error: (error) => {
        console.error(`❌ Failed to send ${alertType} alert:`, error);
        // Fallback: Store alert locally for later transmission
        this.storeFailedAlert(alert);
      },
    });
  }

  /**
   * Send critical security violation alert
   */
  private sendCriticalAlert(
    alertType: SecurityAlert['alertType'],
    description: string,
    additionalData?: any
  ): void {
    if (!this.attemptId || !this.candidateId) {
      console.warn(
        'Cannot send critical alert: Missing attemptId or candidateId'
      );
      return;
    }

    const alert = RealtimeSecurityAlertService.createAlert(
      this.attemptId,
      this.testId,
      this.candidateId,
      alertType,
      description,
      this.currentQuestionIndex,
      {
        ...additionalData,
        candidateName: this.candidateName,
        testName: this.testName,
        critical: true,
        requiresImmediateAttention: true,
      },
      this.tabSwitchWarnings,
      this.maxTabSwitchWarnings
    );

    // Send critical alert
    this.securityAlertService.sendCriticalViolation(alert).subscribe({
      next: (response) => {
        console.log(
          `🚨 CRITICAL ${alertType} alert sent successfully:`,
          response
        );
      },
      error: (error) => {
        console.error(`❌ Failed to send CRITICAL ${alertType} alert:`, error);
        this.storeFailedAlert(alert);
      },
    });
  }

  /**
   * Store failed alerts locally for retry
   */
  private storeFailedAlert(alert: SecurityAlert): void {
    try {
      const failedAlerts = JSON.parse(
        localStorage.getItem(`failed_alerts_${this.testId}`) || '[]'
      );
      failedAlerts.push(alert);
      localStorage.setItem(
        `failed_alerts_${this.testId}`,
        JSON.stringify(failedAlerts)
      );
      console.log('Alert stored locally for retry');
    } catch (error) {
      console.error('Failed to store alert locally:', error);
    }
  }

  /**
   * Retry failed alerts
   */
  private retryFailedAlerts(): void {
    try {
      const failedAlerts = JSON.parse(
        localStorage.getItem(`failed_alerts_${this.testId}`) || '[]'
      );
      if (failedAlerts.length > 0) {
        this.securityAlertService.sendBatchAlerts(failedAlerts).subscribe({
          next: () => {
            localStorage.removeItem(`failed_alerts_${this.testId}`);
            console.log(
              `Successfully sent ${failedAlerts.length} failed alerts`
            );
          },
          error: (error) => {
            console.error('Failed to send batch alerts:', error);
          },
        });
      }
    } catch (error) {
      console.error('Error retrying failed alerts:', error);
    }
  }

  /**
   * Monitor for DevTools opening
   */
  private monitorDevTools(): void {
    let devtools = false;
    const threshold = 160;

    const detectDevTools = () => {
      if (
        window.outerHeight - window.innerHeight > threshold ||
        window.outerWidth - window.innerWidth > threshold
      ) {
        if (!devtools) {
          devtools = true;
          this.handleSecurityViolation('Developer tools detected');
        }
      } else {
        devtools = false;
      }
    };

    // Check every 500ms
    setInterval(detectDevTools, 500);
  }

  /**
   * Update page visibility state and handle blur effects
   */
  private updatePageVisibility(isVisible: boolean): void {
    this.isPageVisible = isVisible;

    // Add visual feedback for loss of focus
    const testContainer = document.querySelector('.test-container');
    if (testContainer) {
      if (isVisible) {
        testContainer.classList.remove('blurred');
      } else {
        testContainer.classList.add('blurred');
      }
    }

    this.cdr.markForCheck();
  }

  /**
   * Enhanced detection of potential cheating attempts
   */
  private detectCheatingAttempts(): void {
    // Monitor for rapid window state changes (potential recording software)
    let focusChangeCount = 0;
    let lastFocusChange = 0;

    const monitorFocusChanges = () => {
      const now = Date.now();
      if (now - lastFocusChange < 1000) {
        // Less than 1 second between changes
        focusChangeCount++;
        if (focusChangeCount > 5) {
          // More than 5 rapid changes
          this.handleSecurityViolation(
            'Rapid window state changes detected (potential recording software)'
          );
        }
      } else {
        focusChangeCount = 0;
      }
      lastFocusChange = now;
    };

    window.addEventListener('focus', monitorFocusChanges);
    window.addEventListener('blur', monitorFocusChanges);
  }

  /**
   * Check if saved progress is still valid (not expired)
   */
  private isProgressValid(savedProgress: any): boolean {
    if (!savedProgress || !savedProgress.progressStartTime) {
      return false;
    }

    const now = Date.now();
    const progressAge = now - savedProgress.progressStartTime;

    if (progressAge > this.PROGRESS_EXPIRY_TIME) {
      console.log(
        `[ModernTest] Progress expired: ${progressAge}ms > ${this.PROGRESS_EXPIRY_TIME}ms`
      );
      return false;
    }

    console.log(
      `[ModernTest] Progress is valid: ${progressAge}ms <= ${this.PROGRESS_EXPIRY_TIME}ms`
    );
    return true;
  }
  /**
   * Start periodic cleanup of expired progress data
   */
  private startPeriodicCleanup(): void {
    // Check for expired progress every 2 minutes
    this.cleanupInterval = window.setInterval(() => {
      this.cleanupExpiredProgress();
    }, 2 * 60 * 1000); // 2 minutes

    // Also run cleanup once on startup
    this.cleanupExpiredProgress();
  }

  /**
   * Clean up expired progress data from localStorage
   */
  private cleanupExpiredProgress(): void {
    try {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith('domino_test_progress_')
      );

      let cleanedCount = 0;

      for (const key of keys) {
        const progressDataStr = localStorage.getItem(key);
        if (progressDataStr) {
          try {
            const progressData = JSON.parse(progressDataStr);
            if (!this.isProgressValid(progressData)) {
              console.log(
                `[Cleanup] Removing expired progress for key: ${key}`
              );
              localStorage.removeItem(key);
              cleanedCount++;

              // Also remove any associated security logs and failed alerts
              const testId = key.replace('domino_test_progress_', '');
              localStorage.removeItem(`security_logs_${testId}`);
              localStorage.removeItem(`failed_alerts_${testId}`);
            }
          } catch (e) {
            console.warn(
              `[Cleanup] Failed to parse progress data for key ${key}, removing:`,
              e
            );
            localStorage.removeItem(key);
            cleanedCount++;
          }
        }
      }

      if (cleanedCount > 0) {
        console.log(
          `[Cleanup] Cleaned up ${cleanedCount} expired progress entries`
        );
      }
    } catch (e) {
      console.error('[Cleanup] Error during periodic cleanup:', e);
    }
  }
}
