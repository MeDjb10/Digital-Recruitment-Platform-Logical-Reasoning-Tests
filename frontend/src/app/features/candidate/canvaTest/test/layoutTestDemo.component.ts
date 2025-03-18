import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DominoLayoutService } from '../../canvaTest/services/domino-layout.service';
import { LayoutQuestionComponent } from './layoutQuestion.component';

@Component({
  selector: 'app-layout-test-demo',
  standalone: true,
  imports: [CommonModule, LayoutQuestionComponent],
  template: `
    <div class="test-container">
      <h2>Domino Pattern Test</h2>
      <p>This demo uses custom layouts created in the layout builder.</p>

      <div class="question-section">
        <app-layout-question
          *ngIf="currentLayout"
          [layout]="currentLayout"
          [question]="{
            id: 1,
            title: currentLayout.name,
            instruction:
              currentLayout.description || 'Complete the missing domino values.'
          }"
          (answerSubmitted)="handleAnswer($event)"
        >
        </app-layout-question>

        <div *ngIf="!currentLayout" class="no-layouts">
          <p>
            No layouts available. Please create some layouts in the Layout
            Builder first.
          </p>
          <button (click)="goToLayoutBuilder()">Go to Layout Builder</button>
        </div>

        <div *ngIf="layouts.length > 1" class="pagination">
          <button (click)="prevLayout()" [disabled]="currentLayoutIndex <= 0">
            Previous
          </button>
          <span>{{ currentLayoutIndex + 1 }} / {{ layouts.length }}</span>
          <button
            (click)="nextLayout()"
            [disabled]="currentLayoutIndex >= layouts.length - 1"
          >
            Next
          </button>
        </div>
      </div>

      <div *ngIf="lastAnswer" class="answer-feedback">
        <h3>Last Answer</h3>
        <pre>{{ lastAnswer | json }}</pre>
      </div>
    </div>
  `,
  styles: [
    `
      .test-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }

      .no-layouts {
        background-color: #f9fafb;
        padding: 40px;
        text-align: center;
        border-radius: 8px;
        margin: 30px 0;
      }

      .no-layouts button {
        padding: 10px 20px;
        background-color: #4f46e5;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        margin-top: 15px;
      }

      .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 20px;
        gap: 15px;
      }

      .pagination button {
        padding: 8px 16px;
        background-color: #4f46e5;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
      }

      .pagination button:disabled {
        background-color: #c7d2fe;
        cursor: not-allowed;
      }

      .answer-feedback {
        margin-top: 30px;
        padding: 15px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background-color: #f9fafb;
      }

      .answer-feedback pre {
        background-color: white;
        padding: 10px;
        border-radius: 6px;
        overflow: auto;
      }
    `,
  ],
})
export class LayoutTestDemoComponent implements OnInit {
  layouts: any[] = [];
  currentLayoutIndex = 0;
  currentLayout?: any;
  lastAnswer?: any;

  constructor(private layoutService: DominoLayoutService) {}

  ngOnInit(): void {
    this.layoutService.layouts$.subscribe((layouts) => {
      this.layouts = layouts;
      if (layouts.length > 0) {
        this.currentLayout = this.createDeepCopy(layouts[0]);
      }
    });
  }

  handleAnswer(answer: any): void {
    this.lastAnswer = answer;
    console.log('Answer submitted:', answer);
    alert(
      `Answer received: Domino ${answer.answer.dominoId} with values ${answer.answer.topValue}-${answer.answer.bottomValue}`
    );

    // Go to next layout if available
    if (this.currentLayoutIndex < this.layouts.length - 1) {
      this.nextLayout();
    }
  }

  nextLayout(): void {
    if (this.currentLayoutIndex < this.layouts.length - 1) {
      this.currentLayoutIndex++;
      this.currentLayout = this.createDeepCopy(
        this.layouts[this.currentLayoutIndex]
      );
    }
  }

  prevLayout(): void {
    if (this.currentLayoutIndex > 0) {
      this.currentLayoutIndex--;
      this.currentLayout = this.createDeepCopy(
        this.layouts[this.currentLayoutIndex]
      );
    }
  }

  goToLayoutBuilder(): void {
    window.location.href = '/admin/layout-builder';
  }

  // Create deep copy to prevent modifying the original layout
  createDeepCopy(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
  }
}
