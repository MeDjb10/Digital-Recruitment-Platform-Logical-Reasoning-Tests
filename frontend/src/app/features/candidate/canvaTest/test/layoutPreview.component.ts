import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import {
  DominoLayout,
  DominoLayoutService,
} from '../services/domino-layout.service';
import { DominoLayoutRendererComponent } from './dominoLayoutRender.component';

@Component({
  selector: 'app-layout-preview',
  standalone: true,
  imports: [CommonModule, DominoLayoutRendererComponent],
  template: `
    <div class="preview-container">
      <div class="preview-header">
        <h2>Layout Preview: {{ layout?.name }}</h2>
        <div class="layout-info">
          <span class="layout-type">{{ layout?.type }}</span>
          <span>{{ layout?.dominos?.length }} dominos</span>
        </div>
        <p *ngIf="layout?.description">{{ layout?.description }}</p>
      </div>

      <div class="preview-area">
        <app-domino-layout-renderer
          *ngIf="layout"
          [layout]="layout"
          [showGrid]="showGrid"
        >
        </app-domino-layout-renderer>
      </div>

      <div class="preview-footer">
        <button (click)="goBack()" class="back-btn">Back to Layouts</button>
        <div class="right-buttons">
          <button (click)="toggleGridLines()" class="grid-btn">
            Toggle Grid Lines
          </button>
          <button (click)="useInTest()" *ngIf="layout" class="use-btn">
            Use in Test
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .preview-container {
        padding: 20px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .preview-header {
        margin-bottom: 20px;
      }

      .layout-info {
        display: flex;
        gap: 15px;
        margin: 10px 0;
      }

      .layout-type {
        background-color: #e5e7eb;
        padding: 3px 8px;
        border-radius: 4px;
      }

      .preview-area {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
        padding: 20px;
        min-height: 600px;
        overflow: visible;
      }

      .preview-footer {
        display: flex;
        justify-content: space-between;
        margin-top: 20px;
      }

      .right-buttons {
        display: flex;
        gap: 10px;
      }

      button {
        padding: 8px 16px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        background-color: #4f46e5;
        color: white;
        transition: background-color 0.2s;
      }

      button:hover {
        background-color: #4338ca;
      }

      .back-btn {
        background-color: #6b7280;
      }

      .back-btn:hover {
        background-color: #4b5563;
      }

      .grid-btn {
        background-color: #059669;
      }

      .grid-btn:hover {
        background-color: #047857;
      }
    `,
  ],
})
export class LayoutPreviewComponent implements OnInit {
  layout?: DominoLayout;
  showGrid: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private layoutService: DominoLayoutService
  ) {}

  ngOnInit(): void {
    // Get layout ID from route params
    this.route.params.subscribe((params) => {
      const layoutId = params['id'];
      if (layoutId) {
        this.layout = this.layoutService.getLayout(layoutId);
        console.log('Loaded layout:', this.layout);
      }
    });
  }

  toggleGridLines(): void {
    this.showGrid = !this.showGrid;
  }

  goBack(): void {
    window.history.back();
  }

  useInTest(): void {
    if (this.layout) {
      const testQuestion = this.layoutService.convertToTestQuestion(
        this.layout,
        1
      );
      console.log('Generated test question:', testQuestion);

      // Add to mock data for testing
      this.layoutService.addLayoutToMockTests(this.layout);

      alert(
        `Layout "${this.layout.name}" added to test questions! Check the console for details.`
      );
    }
  }
}
