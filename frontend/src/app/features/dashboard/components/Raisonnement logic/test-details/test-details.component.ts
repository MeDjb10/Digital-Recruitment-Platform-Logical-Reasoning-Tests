import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TestManagementService } from '../../../../../core/services/test-management.service';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { DropdownModule } from 'primeng/dropdown';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-test-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ButtonModule,
    DropdownModule,
    ConfirmDialogModule,
    ToastModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './test-details.component.html',
  styleUrls: ['./test-details.component.css'],
})
export class TestDetailsComponent implements OnInit {
  test: any;
  questions: any[] = [];
  loading = true;
  selectedQuestionType: string = 'domino'; // Default selected question type

  questionTypeOptions = [
    { label: 'Domino Questions', value: 'domino' },
    { label: 'Multiple Choice Questions', value: 'multiple-choice' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private testManagementService: TestManagementService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const testId = params.get('testId');
      if (testId) {
        this.loadTest(testId);
      }
    });
  }

  loadTest(testId: string) {
    this.loading = true;
    this.testManagementService.getTestById(testId).subscribe(
      (test) => {
        this.test = test;
        this.loadQuestions(testId);

        // Set the default selected question type based on the test type
        if (test && test.type === 'multiple-choice') {
          this.selectedQuestionType = 'multiple-choice';
        } else {
          this.selectedQuestionType = 'domino';
        }
      },
      (error) => {
        console.error('Error loading test:', error);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load test details. Please try again.',
        });
      }
    );
  }

  loadQuestions(testId: string) {
    this.testManagementService.getQuestionsByTestId(testId).subscribe(
      (questions) => {
        this.questions = questions;
        this.loading = false;
      },
      (error) => {
        console.error('Error loading questions:', error);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load questions. Please try again.',
        });
      }
    );
  }

  confirmDeleteQuestion(questionId: string) {
    this.confirmationService.confirm({
      message:
        'Are you sure you want to delete this question? This action cannot be undone.',
      accept: () => {
        this.deleteQuestion(questionId);
      },
    });
  }

  confirmDeleteTest() {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the test "${this.test.name}"? This will permanently remove all associated questions.`,
      accept: () => {
        this.deleteTest(this.test._id || this.test.id);
      },
    });
  }

  deleteQuestion(questionId: string) {
    this.testManagementService.deleteQuestion(questionId).subscribe(
      () => {
        this.questions = this.questions.filter(
          (q) => q._id !== questionId && q.id !== questionId
        );
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Question deleted successfully',
        });
      },
      (error) => {
        console.error('Error deleting question:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete question. Please try again.',
        });
      }
    );
  }

  deleteTest(testId: string) {
    this.testManagementService.deleteTest(testId).subscribe(
      () => {
        this.router.navigate(['/dashboard/RaisonnementLogique/Tests']);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Test deleted successfully',
        });
      },
      (error) => {
        console.error('Error deleting test:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete test. Please try again.',
        });
      }
    );
  }

  // Helper method to get the appropriate edit route based on question type
  getEditRoute(question: any): any[] {
    const testId = this.test._id || this.test.id;
    const questionId = question._id || question.id;

    if (question.questionType === 'MultipleChoiceQuestion') {
      return [
        '/dashboard/RaisonnementLogique/Tests',
        testId,
        'multiple-choice',
        questionId,
        'edit',
      ];
    } else {
      return [
        '/dashboard/RaisonnementLogique/Tests',
        testId,
        'questions',
        questionId,
        'edit',
      ];
    }
  }

  // Helper method to get a readable label for question type
  getQuestionTypeLabel(type: string): string {
    const types: { [key: string]: string } = {
      DominoQuestion: 'Domino',
      MultipleChoiceQuestion: 'Multiple Choice',
    };
    return types[type] || type;
  }

  // Helper method to get a readable label for test type
  getTestTypeLabel(type: string): string {
    const types: { [key: string]: string } = {
      domino: 'Domino Test',
      'multiple-choice': 'Multiple Choice',
      verbal: 'Verbal Assessment',
    };
    return types[type] || type;
  }
}
