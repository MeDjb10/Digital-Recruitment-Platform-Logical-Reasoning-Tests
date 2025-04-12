import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TestManagementService } from '../../../../../core/services/test-management.service';
import { DominoLayoutBuilderComponent } from '../../../../candidate/canvaTest/domino-layout-builder/domino-layout-builder.component';

@Component({
  selector: 'app-edit-question',
  standalone: true,
  imports: [DominoLayoutBuilderComponent, CommonModule],
  templateUrl: './edit-question.component.html',
  styleUrls: ['./edit-question.component.css'],
})
export class EditQuestionComponent implements OnInit {
  testId: string = '';
  questionId: string = '';
  question: any = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private testManagementService: TestManagementService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const testId = params.get('testId');
      const questionId = params.get('questionId');

      if (testId && questionId) {
        this.testId = testId;
        this.questionId = questionId;
        this.loadQuestion();
      } else {
        this.router.navigate(['/dashboard/RaisonnementLogique/Tests']);
      }
    });
  }

  // Update the loadQuestion method to handle API response format
  loadQuestion() {
    this.loading = true;
    this.testManagementService.getQuestionById(this.questionId).subscribe({
      next: (question) => {
        if (question) {
          // Check if it's a DominoQuestion by looking for dominos property
          if (question.questionType === 'DominoQuestion') {
            // Make sure _id is explicitly set
            question._id = question._id || this.questionId;

            // Map the question to the expected format
            this.question = {
              _id: question._id, // Ensure _id is properly set here
              testId: question.testId,
              title: question.title || '',
              instruction: question.instruction,
              difficulty: question.difficulty,
              pattern: question.pattern || '',
              dominos: question.dominos || [],
              arrows: question.arrows || [],
              gridLayout: question.gridLayout || { rows: 3, cols: 3 },
              correctAnswer: question.correctAnswer,
              layoutType: question.layoutType || 'grid',
              questionType: question.questionType,
            };

            console.log(
              'Question loaded for editing with ID:',
              this.question._id
            );
          } else {
            // Handle non-domino questions
            console.error(
              'Not a domino question, cannot edit in this component'
            );
            this.question = null;
          }
        } else {
          console.error('Question is null');
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading question:', error);
        this.loading = false;
      },
    });
  }

  onQuestionSaved(question: any) {
    // Navigate back to test details
    this.router.navigate(['/dashboard/RaisonnementLogique/Tests', this.testId]);
  }

  onCancel() {
    // Navigate back to test details
    this.router.navigate(['/dashboard/RaisonnementLogique/Tests', this.testId]);
  }

  goBack() {
    this.router.navigate(['/dashboard/RaisonnementLogique/Tests', this.testId]);
  }
}
