// test-complete.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-test-complete',
  standalone: true,
  imports: [CommonModule],  template: `
    <div class="container">
      <div class="completion-card" [class.security-violation]="securityViolated">
        <h1 *ngIf="!securityViolated">Test Completed!</h1>
        <h1 *ngIf="securityViolated" class="violation-title">Test Completed with Security Alert</h1>

        <!-- Security Violation Alert -->
        <div *ngIf="securityViolated" class="security-alert">
          <div class="alert-icon">⚠️</div>
          <div class="alert-content">
            <h3>Security Violation Detected</h3>
            <p>{{ violationReason }}</p>
            <p class="alert-note">This incident has been logged and will be reviewed by administrators.</p>
          </div>
        </div>

        <div class="score-display" [class.violation-score]="securityViolated">
          <div class="score" [class.violation]="securityViolated">{{ score }}%</div>
          <div class="score-label">Your Score</div>
        </div>

        <div class="message">
          <p *ngIf="!securityViolated">Thank you for completing the test.</p>
          <p *ngIf="securityViolated">Your test has been completed and submitted.</p>
          <p>Your results have been saved and will be analyzed.</p>
          <p *ngIf="attemptId" class="attempt-id">Attempt ID: {{ attemptId }}</p>
        </div>

        <button class="return-button" (click)="returnToHome()">
          Return to Home
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background-color: #f9f9f9;
      }

      .completion-card {
        background-color: white;
        border-radius: 10px;
        padding: 40px;
        text-align: center;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
        max-width: 500px;
        width: 100%;
      }

      h1 {
        color: #3a3a3a;
        margin-bottom: 30px;
      }

      .score-display {
        margin: 30px 0;
      }

      .score {
        font-size: 72px;
        font-weight: bold;
        color: #4caf50;
      }

      .score-label {
        color: #666;
        margin-top: 10px;
      }

      .message {
        margin: 30px 0;
        color: #555;
      }

      .return-button {
        background-color: #4caf50;
        color: white;
        border: none;
        padding: 12px 30px;
        border-radius: 5px;
        font-size: 16px;
        cursor: pointer;
        transition: background-color 0.3s;
      }      .return-button:hover {
        background-color: #45a049;
      }

      /* Security violation styles */
      .completion-card.security-violation {
        border: 3px solid #f44336;
        background: linear-gradient(135deg, #fff 0%, #ffebee 100%);
      }

      .violation-title {
        color: #f44336 !important;
      }

      .security-alert {
        background-color: #ffebee;
        border: 2px solid #f44336;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
        display: flex;
        align-items: flex-start;
        gap: 15px;
      }

      .alert-icon {
        font-size: 2rem;
        color: #f44336;
      }

      .alert-content h3 {
        color: #f44336;
        margin: 0 0 10px 0;
        font-size: 1.2rem;
      }

      .alert-content p {
        margin: 5px 0;
        color: #666;
      }

      .alert-note {
        font-style: italic;
        font-size: 0.9rem;
        color: #999 !important;
      }

      .score.violation {
        color: #ff9800 !important;
      }

      .violation-score {
        border: 2px dashed #ff9800;
        border-radius: 10px;
        padding: 20px;
        background-color: #fff3e0;
      }

      .attempt-id {
        font-family: monospace;
        background-color: #f5f5f5;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 0.9rem;
        color: #666;
        border: 1px solid #ddd;
      }
    `,
  ],
})
export class TestCompleteComponent implements OnInit {
  testId: string = '';
  score: number = 0;
  securityViolated: boolean = false;
  violationReason: string = '';
  attemptId: string = '';

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.testId = params['testId'] || 'Unknown';
      this.score = params['score'] || 0;
      this.attemptId = params['attemptId'] || '';
      this.securityViolated = params['securityViolated'] === 'true';
      this.violationReason = params['violationReason'] || '';
    });
  }

  returnToHome() {
    this.router.navigate(['/']);
  }
}
