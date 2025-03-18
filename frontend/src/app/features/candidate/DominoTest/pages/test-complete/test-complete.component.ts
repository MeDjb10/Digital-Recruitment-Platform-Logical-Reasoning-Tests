// test-complete.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-test-complete',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <div class="completion-card">
        <h1>Test Completed!</h1>

        <div class="score-display">
          <div class="score">{{ score }}%</div>
          <div class="score-label">Your Score</div>
        </div>

        <div class="message">
          <p>Thank you for completing the {{ testId }} test.</p>
          <p>Your results have been saved and will be analyzed.</p>
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
      }

      .return-button:hover {
        background-color: #45a049;
      }
    `,
  ],
})
export class TestCompleteComponent implements OnInit {
  testId: string = '';
  score: number = 0;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.testId = params['testId'] || 'Unknown';
      this.score = params['score'] || 0;
    });
  }

  returnToHome() {
    this.router.navigate(['/']);
  }
}
