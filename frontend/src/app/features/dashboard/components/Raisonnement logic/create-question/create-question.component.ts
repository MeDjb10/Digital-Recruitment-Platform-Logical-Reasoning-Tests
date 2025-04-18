import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DominoLayoutBuilderComponent } from '../../../../candidate/canvaTest/domino-layout-builder/domino-layout-builder.component';
import { TestManagementService } from '../../../../../core/services/test-management.service';

@Component({
  selector: 'app-create-question',
  standalone: true,
  imports: [CommonModule, DominoLayoutBuilderComponent],
  templateUrl: './create-question.component.html',
  styleUrls: ['./create-question.component.css'],
})
export class CreateQuestionComponent implements OnInit {
  testId: string | null = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private testService: TestManagementService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const testId = params.get('testId');
      if (testId) {
        this.testId = testId;
        console.log('Creating question for test ID:', this.testId);
        this.verifyTest(testId);
      } else {
        this.loading = false;
      }
    });
  }

  verifyTest(testId: string): void {
    this.testService.getTestById(testId).subscribe({
      next: (test) => {
        if (test) {
          console.log('Test verified successfully:', test.name);
          this.loading = false;
        } else {
          this.testId = null;
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error verifying test:', error);
        this.testId = null;
        this.loading = false;
      },
    });
  }

  onQuestionSaved(question: any): void {
    console.log('Question saved successfully:', question._id);
    // Navigate back to test details page
    this.router.navigate(['/dashboard/RaisonnementLogique/Tests', this.testId]);
  }

  onCancel(): void {
    this.goBack();
  }

  goBack(): void {
    if (this.testId) {
      this.router.navigate([
        '/dashboard/RaisonnementLogique/Tests',
        this.testId,
      ]);
    } else {
      this.router.navigate(['/dashboard/RaisonnementLogique/Tests']);
    }
  }
}
