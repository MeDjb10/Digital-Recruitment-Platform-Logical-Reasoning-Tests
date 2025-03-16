import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
  AfterViewInit,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  InteractiveDominoGridComponent,
  DominoChange,
} from '../../components/interactive-domino-grid/interactive-domino-grid.component';
import { DominoTestService } from '../../services/domino-test.service';
import { Subscription, interval } from 'rxjs';
import { take } from 'rxjs/operators';

interface TestQuestion {
  id: number;
  dominos: TestDomino[];
  gridLayout: { rows: number; cols: number };
  instruction?: string;
}

interface TestDomino {
  id: number;
  row: number;
  col: number;
  topValue: number | null;
  bottomValue: number | null;
  isEditable: boolean;
  isVertical?: boolean;
  color?: string;
}

interface TestData {
  id: string;
  name: string;
  description: string;
  duration: number;
  questions: TestQuestion[];
}

interface Question {
  id: number;
  dominos: DominoPosition[];
  gridLayout: { rows: number; cols: number };
  answered: boolean;
  flaggedForReview: boolean;
  userAnswer?: {
    dominoId: number;
    topValue: number | null;
    bottomValue: number | null;
  };
  timeSpent: number; // in seconds
  visited: boolean;
  visits: number;
}

// Add the questionId property to DominoPosition interface
export interface DominoPosition {
  id: number;
  row: number;
  col: number;
  topValue: number | null;
  bottomValue: number | null;
  isEditable: boolean;
  isVertical?: boolean;
  color?: string;
  questionId?: number;
  uniqueId?: string;
}

@Component({
  selector: 'app-domino-test',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    InteractiveDominoGridComponent,
  ],
  templateUrl: './domino-test.component.html',
  styleUrls: ['./domino-test.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DominoTestComponent
  implements OnInit, OnDestroy, AfterViewInit, AfterViewChecked
{
  testId: string = '';
  testName: string = 'Logical Reasoning Test (D-70)';
  questions: Question[] = [];
  currentQuestionIndex: number = 0;
  currentQuestion: Question | null = null;

  // Timer
  timeLeft: number = 25 * 60; // 25 minutes in seconds
  warningThreshold: number = 300; // 5 minutes warning
  timerSubscription?: Subscription;

  // Question tracking
  lastQuestionChangeTime: number = 0;

  // Reference to the grid component
  @ViewChild(InteractiveDominoGridComponent)
  dominoGrid?: InteractiveDominoGridComponent;

  // Add properties for zoom functionality and help tooltip
  zoomLevel: number = 1;
  isZoomActive: boolean = false;
  hasEditableDominos: boolean = false;
  showTooltip: boolean = true;

  @ViewChild('gridContainer') gridContainerRef?: ElementRef;

  // Track whether heights have been synchronized
  private heightSynchronized = false;

  // Add property to control grid container height
  gridContainerHeight: number = 300;

  // Add a map to store each question's state independently
  private questionStates: Map<number, Question> = new Map();

  // Add debug flag to help track issues
  private debug = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dominoTestService: DominoTestService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.testId = params['id'] || 'd70';
      this.loadTest();
      this.startTimer();
    });
  }

  ngOnDestroy() {
    this.stopTimer();
    this.saveCurrentQuestionState();
    this.saveTestProgress();
  }

  loadTest() {
    // Try to load saved progress first
    const savedProgress = this.dominoTestService.loadProgress(this.testId);

    if (savedProgress) {
      // Create deep copies of all questions to ensure isolation
      this.questions = JSON.parse(JSON.stringify(savedProgress.questions));

      // Ensure editable dominos have appropriate values from saved progress
      this.questions.forEach((question) => {
        question.dominos.forEach((domino) => {
          // Add uniqueId if not present
          if (!domino.uniqueId) {
            domino.uniqueId = `q${question.id}_d${domino.id}`;
          }

          // Add questionId if not present
          if (!domino.questionId) {
            domino.questionId = question.id;
          }
        });
      });

      this.currentQuestionIndex = savedProgress.currentQuestionIndex;
      this.timeLeft = savedProgress.timeLeft;
      this.testName = savedProgress.testName || this.testName;

      // Initialize the question states map
      this.questions.forEach((question: Question) => {
        this.questionStates.set(
          question.id,
          JSON.parse(JSON.stringify(question))
        );
      });

      // Set current question from the states map to ensure isolation
      this.currentQuestion = JSON.parse(
        JSON.stringify(
          this.questionStates.get(
            this.questions[this.currentQuestionIndex].id
          ) || this.questions[this.currentQuestionIndex]
        )
      );
    } else {
      // Create new test if no saved progress
      this.dominoTestService.getTest(this.testId).subscribe({
        next: (test: TestData) => {
          if (test) {
            this.testName = test.name;
            this.timeLeft = test.duration * 60; // Convert minutes to seconds

            // Transform test questions to our Question format
            this.questions = test.questions.map((q: TestQuestion) => {
              // Add uniqueId and questionId to each domino
              const dominos = q.dominos.map((d) => ({
                ...d,
                uniqueId: `q${q.id}_d${d.id}`,
                questionId: q.id,
              }));

              return {
                id: q.id,
                dominos: dominos,
                gridLayout: q.gridLayout,
                answered: false,
                flaggedForReview: false,
                timeSpent: 0,
                visited: false,
                visits: 0,
              };
            });

            // Store each question state separately
            this.questions.forEach((q) => {
              this.questionStates.set(q.id, JSON.parse(JSON.stringify(q)));
            });
          } else {
            // Fallback to sample questions if API returns empty data
            this.questions = this.createSampleQuestions();
          }

          // Ensure current question is a deep copy from the states map
          if (this.questions.length > 0) {
            this.currentQuestion = JSON.parse(
              JSON.stringify(
                this.questionStates.get(this.questions[0].id) ||
                  this.questions[0]
              )
            );
          }

          this.markQuestionAsVisited(this.currentQuestionIndex);
          this.cdr.markForCheck();
        },
        error: () => {
          // Fallback to sample questions on error
          this.questions = this.createSampleQuestions();
          this.currentQuestion = this.questions[this.currentQuestionIndex];
          this.markQuestionAsVisited(this.currentQuestionIndex);
          this.cdr.markForCheck();
        },
      });
    }

    if (this.questions.length > 0) {
      this.currentQuestion = this.questions[this.currentQuestionIndex];
      this.markQuestionAsVisited(this.currentQuestionIndex);
    }
    this.cdr.markForCheck();
  }

  createSampleQuestions(): Question[] {
    // Create a few sample questions with cleaner initialization
    const sampleQuestions = [
      {
        id: 1,
        dominos: [
          {
            id: 1,
            row: 0,
            col: 0,
            topValue: 1,
            bottomValue: 2,
            isEditable: false,
            questionId: 1,
          },
          // ... other non-editable dominos for question 1 ...
          {
            id: 6,
            row: 0,
            col: 5,
            topValue: null, // IMPORTANT: explicitly set to null for editable dominos
            bottomValue: null,
            isEditable: true,
            questionId: 1,
          },
        ],
        gridLayout: { rows: 1, cols: 6 },
        answered: false,
        flaggedForReview: false,
        timeSpent: 0,
        visited: false,
        visits: 0,
      },
      // ... other questions ...
    ];

    // Ensure deep copies are made and stored in the question states map
    const result = JSON.parse(JSON.stringify(sampleQuestions));
    result.forEach((question: Question) => {
      // Double check that editable dominos have null values
      question.dominos.forEach((domino) => {
        if (domino.isEditable) {
          // Make absolutely sure these are null, not undefined
          if (domino.topValue === undefined) domino.topValue = null;
          if (domino.bottomValue === undefined) domino.bottomValue = null;
        }
      });

      // Store in question states map
      this.questionStates.set(
        question.id,
        JSON.parse(JSON.stringify(question))
      );
    });

    return result;
  }

  startTimer() {
    this.lastQuestionChangeTime = Date.now();
    this.timerSubscription = interval(1000).subscribe(() => {
      this.timeLeft--;

      // Update time spent on current question
      if (this.currentQuestion) {
        this.currentQuestion.timeSpent += 1;
      }

      // Auto-save progress every minute
      if (this.timeLeft % 60 === 0) {
        this.saveTestProgress();
      }

      // Check if time's up
      if (this.timeLeft <= 0) {
        this.stopTimer();
        // Don't auto-submit, just notify the user
        alert("Time's up! Please review your answers and submit the test.");
      }

      this.cdr.markForCheck();
    });
  }

  stopTimer() {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }

  goToQuestion(index: number) {
    if (this.debug) {
      console.log(
        `[BEFORE CHANGE] Moving from question ${this.currentQuestionIndex} to ${index}`
      );
      console.log(
        'Current question state:',
        JSON.stringify(this.currentQuestion)
      );
    }

    // First save the current question state
    this.saveCurrentQuestionState();

    // Update time spent on current question before switching
    this.updateCurrentQuestionTime();

    // Store the old question type (rhombus or not) to detect changes
    const wasRhombusPattern = this.isRhombusPattern();
    const previousQuestionIndex = this.currentQuestionIndex;

    // Update current index
    this.currentQuestionIndex = index;

    const targetQuestion = this.questions[index];

    // Get the question state from our map, or use the question from the array as fallback
    // Always create a fresh deep copy to ensure complete isolation
    this.currentQuestion = JSON.parse(
      JSON.stringify(
        this.questionStates.get(targetQuestion.id) || targetQuestion
      )
    );

    if (this.debug) {
      console.log(
        `[AFTER CHANGE] Now at question ${this.currentQuestionIndex}`
      );
      console.log('New question state:', JSON.stringify(this.currentQuestion));

      // Check for editable dominos specifically
      const editableDominos = this.currentQuestion?.dominos.filter(
        (d) => d.isEditable
      );
      console.log('Editable dominos in new question:', editableDominos);
    }

    // Reset height synchronization flag when changing questions
    if (wasRhombusPattern !== this.isRhombusPattern()) {
      this.heightSynchronized = false;

      // If we're transitioning from a rhombus to non-rhombus, reset the height
      if (wasRhombusPattern && !this.isRhombusPattern()) {
        this.resetGridHeight();
      }
    }

    // Add a short delay to ensure DOM is updated before we modify the grid component
    setTimeout(() => {
      this.forceGridReinitialize();
    }, 50);

    this.markQuestionAsVisited(index);
    this.lastQuestionChangeTime = Date.now();

    // Reset zoom level when changing questions
    this.zoomLevel = 1;
    this.isZoomActive = false;

    // Reset tooltip visibility when changing questions
    if (index === 0 || this.showTooltip) {
      this.showTooltip = true;
    }

    // Reset height synchronization flag when changing questions
    this.heightSynchronized = false;

    // Add pattern-specific class for better sizing
    setTimeout(() => {
      const containerElement = this.gridContainerRef?.nativeElement;
      if (containerElement) {
        // Remove any existing pattern classes
        containerElement.classList.remove('row-pattern', 'grid-pattern');

        // Check pattern type and add appropriate class
        if (!this.isRhombusPattern() && this.currentQuestion) {
          // Add row pattern or grid pattern classes
          if (this.isRowPattern()) {
            containerElement.classList.add('row-pattern');
          } else {
            containerElement.classList.add('grid-pattern');
          }
        }
      }
    }, 50);

    // After changing question, reset height and resize after a delay
    this.gridContainerHeight = this.isRhombusPattern()
      ? 360
      : this.isRowPattern()
      ? 200
      : 260;

    setTimeout(() => {
      this.resizeGridContainer();
    }, 150);

    this.cdr.markForCheck();
  }

  // New method to completely reinitialize the grid when changing questions
  private forceGridReinitialize() {
    if (!this.dominoGrid || !this.currentQuestion) return;

    try {
      console.log('Reinitializing grid with fresh dominos');

      // Create a completely fresh copy of the dominos with new object references
      const freshDominos = this.currentQuestion.dominos.map((domino) => {
        return {
          ...JSON.parse(JSON.stringify(domino)),
          questionId: this.currentQuestion?.id, // Add question ID to track context
        };
      });

      this.dominoGrid.reinitializeGrid(freshDominos);
    } catch (err) {
      console.error('Error reinitializing grid:', err);
    }
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.goToQuestion(this.currentQuestionIndex + 1);
    }
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.goToQuestion(this.currentQuestionIndex - 1);
    }
  }

  toggleFlag() {
    if (this.currentQuestion) {
      this.currentQuestion.flaggedForReview =
        !this.currentQuestion.flaggedForReview;
      this.cdr.markForCheck();
    }
  }

  onDominoChanged(change: DominoChange) {
    if (!this.currentQuestion) return;

    if (this.debug) {
      console.log(
        `Domino change event: id=${change.id}, top=${change.topValue}, bottom=${change.bottomValue}`
      );
    }

    // Find the editable domino in current question only
    const editableDomino = this.currentQuestion.dominos.find(
      (d) => d.isEditable && d.id === change.id
    );

    if (editableDomino) {
      // Update the domino values
      editableDomino.topValue = change.topValue;
      editableDomino.bottomValue = change.bottomValue;

      // Update the user's answer for this specific question
      this.currentQuestion.userAnswer = {
        dominoId: change.id,
        topValue: change.topValue,
        bottomValue: change.bottomValue,
      };

      // Mark question as answered if both values are provided
      this.currentQuestion.answered =
        change.topValue !== null && change.bottomValue !== null;

      // Immediately save the updated question state to our map
      this.saveCurrentQuestionState();

      // Since we've changed a question's state, mark for detection
      this.cdr.markForCheck();

      if (this.debug) {
        console.log(
          'Question updated with new answer:',
          JSON.stringify(this.currentQuestion.userAnswer)
        );
      }
    }
  }

  onDominoSelected(id: number) {
    // You can add additional logging or analytics here if needed
  }

  onDominoRotated(event: { id: number; isVertical: boolean }) {
    if (this.currentQuestion) {
      const domino = this.currentQuestion.dominos.find(
        (d) => d.id === event.id
      );
      if (domino) {
        domino.isVertical = event.isVertical;
        this.cdr.markForCheck();
      }
    }
  }

  markQuestionAsVisited(index: number) {
    const question = this.questions[index];
    if (!question.visited) {
      question.visited = true;
    }
    question.visits++;
  }

  updateCurrentQuestionTime() {
    if (this.currentQuestion) {
      const currentTime = Date.now();
      const timeSpent = Math.floor(
        (currentTime - this.lastQuestionChangeTime) / 1000
      );
      this.currentQuestion.timeSpent += timeSpent;
    }
  }

  get answeredCount(): number {
    return this.questions.filter((q) => q.answered).length;
  }

  get progressPercentage(): number {
    return (this.answeredCount / this.questions.length) * 100;
  }

  get flaggedCount(): number {
    return this.questions.filter((q) => q.flaggedForReview).length;
  }

  saveTestProgress() {
    // Update time spent on current question first
    this.updateCurrentQuestionTime();

    // Save the current question state before saving progress
    this.saveCurrentQuestionState();

    // Create a deep copy of questions from our state map to ensure data integrity
    const questionsToSave = this.questions.map((q) => {
      const savedState = this.questionStates.get(q.id);
      return savedState ? JSON.parse(JSON.stringify(savedState)) : q;
    });

    const progress = {
      testId: this.testId,
      testName: this.testName,
      questions: questionsToSave,
      currentQuestionIndex: this.currentQuestionIndex,
      timeLeft: this.timeLeft,
      timestamp: new Date().toISOString(),
    };

    this.dominoTestService.saveProgress(this.testId, progress);
  }

  finishTest() {
    // Save the current question state first
    this.saveCurrentQuestionState();
    this.saveTestProgress();

    // If not all questions are answered, show confirmation
    if (this.answeredCount < this.questions.length) {
      const confirm = window.confirm(
        `You have ${
          this.questions.length - this.answeredCount
        } unanswered questions. Are you sure you want to submit the test?`
      );
      if (!confirm) return;
    }

    // Submit the test - use questions from our state map for submission
    const questionsToSubmit = this.questions.map((q: Question) => {
      const savedState = this.questionStates.get(q.id);
      return savedState ? JSON.parse(JSON.stringify(savedState)) : q;
    });

    this.dominoTestService
      .submitTest(this.testId, questionsToSubmit)
      .subscribe({
        next: (result) => {
          // Navigate to results page
          this.router.navigate(['/test-completion'], {
            state: {
              testId: this.testId,
              testName: this.testName,
              score: result.score,
              totalQuestions: this.questions.length,
              timeSpent: 25 * 60 - this.timeLeft, // Total seconds spent
            },
          });
        },
        error: (err) => {
          console.error('Error submitting test:', err);
          alert('There was an error submitting your test. Please try again.');
        },
      });
  }

  // Add new methods for controlling zoom
  zoomIn(): void {
    if (this.dominoGrid) {
      this.dominoGrid.zoomIn();
      this.isZoomActive = true;
    }
  }

  zoomOut(): void {
    if (this.dominoGrid) {
      this.dominoGrid.zoomOut();
      this.isZoomActive = true;
    }
  }

  zoomReset(): void {
    if (this.dominoGrid) {
      this.dominoGrid.zoomReset();
      this.isZoomActive = false;
    }
  }

  activateZoomControls(): void {
    this.isZoomActive = true;
  }

  deactivateZoomControls(): void {
    // Only deactivate if not currently zooming
    if (this.zoomLevel === 1) {
      this.isZoomActive = false;
    }
  }

  dismissTooltip(): void {
    this.showTooltip = false;
    this.cdr.markForCheck();
  }

  onZoomLevelChanged(level: number): void {
    this.zoomLevel = level;

    // Resize the container when zoom changes
    setTimeout(() => this.resizeGridContainer(), 100);

    this.cdr.markForCheck();
  }

  onHasEditableDominosChanged(hasEditables: boolean): void {
    this.hasEditableDominos = hasEditables;
    this.cdr.markForCheck();
  }

  // Add method to detect if current question has a rhombus pattern
  isRhombusPattern(): boolean {
    if (!this.currentQuestion || !this.currentQuestion.dominos) return false;

    const dominos = this.currentQuestion.dominos;

    // Check for rhombus pattern characteristics - first approach: check if it's question 3
    if (this.currentQuestionIndex === 2) return true;

    // Second approach: analyze the grid structure to detect rhombus pattern
    // Get all unique rows and columns
    const uniqueRows = [...new Set(dominos.map((d) => d.row))];
    const uniqueCols = [...new Set(dominos.map((d) => d.col))];

    // Rhombus patterns typically have 3 rows/cols and form a diamond shape
    if (uniqueRows.length === 3 && uniqueCols.length === 3) {
      // Check for the classic rhombus pattern with missing center position
      const hasCenter = dominos.some((d) => d.row === 1 && d.col === 1);
      const hasTop = dominos.some((d) => d.row === 0);
      const hasBottom = dominos.some((d) => d.row === 2);

      // If we have top, sides, and bottom positions forming a diamond
      if (hasTop && hasBottom && !hasCenter) {
        return true;
      }
    }

    return false;
  }

  // Detect row pattern
  isRowPattern(): boolean {
    if (!this.currentQuestion || !this.currentQuestion.dominos) return false;

    const dominos = this.currentQuestion.dominos;

    // Check if all dominos have the same row (horizontal layout)
    return dominos.every((d) => d.row === dominos[0].row);
  }

  ngAfterViewInit() {
    // Initial sizing after view initialization
    this.resizeGridContainer();
  }

  ngAfterViewChecked() {
    // Check for changes in grid size that would require container resizing
    this.resizeGridContainer();
  }

  // Enhanced method to handle all pattern types
  resizeGridContainer() {
    setTimeout(() => {
      try {
        const gridElement = document.querySelector('.grid') as HTMLElement;
        const containerElement = this.gridContainerRef?.nativeElement;

        if (gridElement && containerElement) {
          // Only adjust if grid is visible and rendered
          if (gridElement.offsetHeight > 0) {
            // Add some buffer space around the grid
            const buffer = this.isRhombusPattern() ? 100 : 60;
            const minHeight = Math.max(gridElement.offsetHeight + buffer, 300);

            // Set the minHeight directly on the container element
            containerElement.style.minHeight = `${minHeight}px`;

            // Store this height for later use
            this.gridContainerHeight = minHeight;

            // Set a custom CSS variable for the grid's height
            document.documentElement.style.setProperty(
              '--grid-height',
              `${minHeight}px`
            );

            this.heightSynchronized = true;
          }
        }
      } catch (err) {
        console.error('Error resizing grid container:', err);
      }
    }, 100);
  }

  // Reset grid height for non-rhombus patterns
  resetGridHeight() {
    const containerElement = this.gridContainerRef?.nativeElement;
    if (!containerElement) return;

    // Remove the explicit minHeight and let CSS take over
    containerElement.style.minHeight = '';
    document.documentElement.style.removeProperty('--grid-height');
    this.heightSynchronized = false;
    this.cdr.markForCheck();
  }

  /**
   * Clear all saved test progress data using the DominoTestService
   */
  clearSavedData(): void {
    const confirmed = confirm(
      'This will clear all saved progress data. Are you sure?'
    );
    if (confirmed) {
      try {
        // Use the service method to clear all progress data
        this.dominoTestService.clearAllProgress();

        // Reset the questions array and current question
        this.questions = [];
        this.currentQuestion = null;

        // Reset the timer to default value
        this.timeLeft = 25 * 60; // 25 minutes in seconds

        // Show success message
        alert('All progress data has been cleared. The page will now reload.');

        // Reload the page to start fresh
        window.location.reload();
      } catch (error) {
        console.error('Error clearing saved data:', error);
        alert('An error occurred while trying to clear saved data.');
      }
    }
  }

  // Ensure state is properly saved
  private saveCurrentQuestionState(): void {
    if (this.currentQuestion) {
      // Create a deep copy to save in our map
      const stateCopy = JSON.parse(JSON.stringify(this.currentQuestion));

      // Save to our state map
      this.questionStates.set(this.currentQuestion.id, stateCopy);

      // Also update the main questions array
      const index = this.questions.findIndex(
        (q) => q.id === this.currentQuestion!.id
      );
      if (index >= 0) {
        // Specific properties to update on the main array
        this.questions[index].answered = this.currentQuestion.answered;
        this.questions[index].flaggedForReview =
          this.currentQuestion.flaggedForReview;
        this.questions[index].timeSpent = this.currentQuestion.timeSpent;
        this.questions[index].visited = this.currentQuestion.visited;
        this.questions[index].visits = this.currentQuestion.visits;

        // Update user answer
        if (this.currentQuestion.userAnswer) {
          this.questions[index].userAnswer = JSON.parse(
            JSON.stringify(this.currentQuestion.userAnswer)
          );
        } else {
          this.questions[index].userAnswer = undefined;
        }
      }

      if (this.debug) {
        console.log(
          `Saved state for question ${this.currentQuestion.id}`,
          JSON.stringify(stateCopy)
        );
      }
    }
  }
}
