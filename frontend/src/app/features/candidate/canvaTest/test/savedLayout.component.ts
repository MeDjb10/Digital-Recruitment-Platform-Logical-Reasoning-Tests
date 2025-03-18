import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DominoLayout, DominoLayoutService } from '../services/domino-layout.service';


@Component({
  selector: 'app-saved-layouts',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="saved-layouts-container">
      <h2>Saved Domino Layouts</h2>

      <div class="layout-actions">
        <button routerLink="/admin/layout-builder">Create New Layout</button>
      </div>

      <div class="layouts-grid">
        <div *ngFor="let layout of layouts" class="layout-card">
          <div class="layout-header">
            <h3>{{ layout.name }}</h3>
            <span class="layout-type">{{ layout.type }}</span>
          </div>
          <div class="layout-details">
            <p>{{ layout.description || 'No description' }}</p>
            <p>{{ layout.dominos.length }} dominos</p>
            <p>Created: {{ layout.createdAt | date }}</p>
          </div>
          <div class="layout-actions">
            <button (click)="editLayout(layout)">Edit</button>
            <button (click)="useInTest(layout)">Use in Test</button>
            <button (click)="deleteLayout(layout.id)" class="delete-btn">
              Delete
            </button>
          </div>
        </div>
        <div
          class="layout-actions"
          style="margin-top: 20px; text-align: right;"
        >
          <button
            (click)="clearCustomQuestions()"
            style="background-color: #ef4444; margin-left: auto;"
          >
            Reset Custom Test Questions
          </button>
        </div>
      </div>

      <div *ngIf="layouts.length === 0" class="no-layouts">
        <p>No saved layouts yet. Click "Create New Layout" to get started.</p>
      </div>
    </div>
  `,
  styles: [
    `
      .saved-layouts-container {
        padding: 20px;
      }

      .layout-actions {
        margin: 20px 0;
      }

      .layouts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
      }

      .layout-card {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        padding: 15px;
      }

      .layout-header {
        display: flex;
        justify-content: space-between;
        border-bottom: 1px solid #eee;
        padding-bottom: 10px;
        margin-bottom: 10px;
      }

      .layout-type {
        background-color: #f0f0f0;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 12px;
      }

      .layout-details p {
        margin: 5px 0;
        color: #555;
      }

      .layout-actions {
        display: flex;
        gap: 10px;
        margin-top: 15px;
      }

      .layout-actions button {
        padding: 6px 12px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        background-color: #4f46e5;
        color: white;
      }

      .delete-btn {
        background-color: #ef4444 !important;
      }

      .no-layouts {
        text-align: center;
        padding: 40px;
        color: #666;
        background-color: #f9f9f9;
        border-radius: 8px;
        margin-top: 20px;
      }
    `,
  ],
})
export class SavedLayoutsComponent implements OnInit {
  layouts: DominoLayout[] = [];

  constructor(private dominoLayoutService: DominoLayoutService) {}

  ngOnInit(): void {
    this.dominoLayoutService.layouts$.subscribe((layouts) => {
      this.layouts = layouts;
    });
  }

  editLayout(layout: DominoLayout): void {
    // Navigate to layout builder with the layout ID
    window.location.href = `/admin/layout-builder?id=${layout.id}`;
  }

  // Update the alert message in useInTest method of savedLayout.component.ts
  useInTest(layout: DominoLayout): void {
    // Add the layout to mock tests
    this.dominoLayoutService.addLayoutToMockTests(layout);

    // Show a success message with better instructions
    alert(`
Layout "${layout.name}" has been added to the D70 Test.

To test it:
1. Navigate to the Test List (/tests)
2. Select the D70 Test
3. Your layout will appear as the last question (#${this.getNextQuestionNumber()})

If the question doesn't appear, refresh the page to load the latest test data.

NOTE: If you've previously completed the test, you'll need to clear your test progress:
1. Start the D70 test
2. Click the "Clear Saved Data" link below the test title
3. Confirm the action to reset progress
  `);
  }

  // Add this helper method to get the next question number
  private getNextQuestionNumber(): number {
    // Get custom questions count from localStorage
    const stored = localStorage.getItem('customD70Questions');
    const customCount = stored ? JSON.parse(stored).length : 0;

    // Add to the base D70 question count (which is 10)
    return 10 + customCount;
  }

  deleteLayout(layoutId: string): void {
    if (confirm('Are you sure you want to delete this layout?')) {
      this.dominoLayoutService.deleteLayout(layoutId);
    }
  }

  clearCustomQuestions(): void {
    if (
      confirm(
        'This will remove all custom questions from the D70 test. Continue?'
      )
    ) {
      localStorage.removeItem('customD70Questions');
      alert(
        'Custom questions removed from D70 test. The test will be reset to its original questions.'
      );
    }
  }
}
