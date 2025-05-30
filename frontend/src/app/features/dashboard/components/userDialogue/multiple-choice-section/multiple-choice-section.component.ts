import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';
import { TestService } from 'src/app/services/test.service';

interface AIComment {
  text: string;
  reaction?: boolean;
  feedback?: string;
}

@Component({
  selector: 'app-multiple-choice-section',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule],
  templateUrl: './multiple-choice-section.component.html',
  styleUrl: './multiple-choice-section.component.css',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.4s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggeredFadeIn', [
      transition(':enter', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger('100ms', [
            animate('0.4s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class MultipleChoiceSectionComponent implements OnInit {
  @Input() attemptId!: string;

  testType: string = 'Multiple Choice Test';
  timeSpent: string = '25:30';
  score: number = 32;
  correctAnswers: number = 32;
  wrongAnswers: number = 8;
  psychologistComment: string = '';
  isLoading = true;

  aiComments: AIComment[] = [
    { text: 'The candidate shows strong analytical skills in comprehension questions.' },
   ];

  chartOptions = {
    series: [{
      name: 'Performance',
      data: [80, 75, 90, 85, 70]
    }],
    chart: {
      type: 'bar',
      height: 350
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 10
      },
    },
    dataLabels: {
      enabled: false
    },
    colors: ['#4F46E5']
  };

  constructor(private testService: TestService) { }

  ngOnInit(): void {
    if (this.attemptId) {
      this.testService.getAttemptResults(this.attemptId).subscribe({
        next: (response) => {
          console.log('MCQ test results:', response);
          this.initializeData(response.data);
        },
        error: (error) => {
          console.error('Error loading MCQ results:', error);
          this.isLoading = false;
        }
      });
    }
  }

  private initializeData(data: any) {
    if (!data || !data.results) return;

    const results = data.results;
    
    // Update component properties with actual data
    this.timeSpent = this.formatTimeSpent(data.attempt.timeSpent);
    this.score = results.attempt.score;
    this.correctAnswers = results.questions.filter((q: any) => q.response?.isCorrect).length;
    this.wrongAnswers = results.questions.filter((q: any) => !q.response?.isCorrect).length;
    
    // Initialize chart with actual data
    this.updateChartData(results.questions);
  }

  private formatTimeSpent(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private updateChartData(questions: any[]) {
    // Update chart data based on actual results
    this.chartOptions = {
      ...this.chartOptions,
      series: [{
        name: 'Performance',
        data: questions.map((q: any) => q.response?.score || 0)
      }]
    };
  }

  handleReaction(index: number, isPositive: boolean): void {
    if (this.aiComments[index].reaction === isPositive) {
      this.aiComments[index].reaction = undefined;
    } else {
      this.aiComments[index].reaction = isPositive;
    }
  }
}
