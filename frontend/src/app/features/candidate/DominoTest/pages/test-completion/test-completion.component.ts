import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-test-completion',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './test-completion.component.html',
  styleUrls: ['./test-completion.component.css'],
})
export class TestCompletionComponent implements OnInit {
  testId: string = '';
  testName: string = 'Logical Reasoning Test';
  score: number = 0;
  totalQuestions: number = 0;
  timeSpent: number = 0;
  showScore: boolean = true;

  constructor(private router: Router) {}

  ngOnInit() {
    // Get data passed through router state
    const navigation = this.router.getCurrentNavigation();
    if (navigation && navigation.extras.state) {
      const state = navigation.extras.state as any;
      this.testId = state.testId || this.testId;
      this.testName = state.testName || this.testName;
      this.score = state.score || 0;
      this.totalQuestions = state.totalQuestions || 0;
      this.timeSpent = state.timeSpent || 0;
      this.showScore = typeof state.score === 'number';
    }
  }

  getScoreColor(): string {
    // Return a color based on score
    if (this.score >= 80) {
      return 'linear-gradient(to right, #10b981, #059669)'; // Green - excellent
    } else if (this.score >= 60) {
      return 'linear-gradient(to right, #3b82f6, #2563eb)'; // Blue - good
    } else if (this.score >= 40) {
      return 'linear-gradient(to right, #f59e0b, #d97706)'; // Orange - average
    } else {
      return 'linear-gradient(to right, #ef4444, #b91c1c)'; // Red - needs improvement
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins}m ${secs}s`;
    }

    return `${mins}m ${secs}s`;
  }

  navigateHome() {
    this.router.navigate(['/dashboard']);
  }

  viewDetailedResults() {
    this.router.navigate(['/tests', this.testId, 'results']);
  }
}
