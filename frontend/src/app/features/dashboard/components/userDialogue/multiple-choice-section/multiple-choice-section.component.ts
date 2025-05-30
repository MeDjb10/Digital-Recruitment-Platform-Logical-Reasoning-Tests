import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  trigger,
  transition,
  style,
  animate,
  stagger,
  query,
} from '@angular/animations';
import { TestService } from '../../../../../core/services/test.service';

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
        animate(
          '0.4s ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
    trigger('staggeredFadeIn', [
      transition(':enter', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(20px)' }),
            stagger('100ms', [
              animate(
                '0.4s ease-out',
                style({ opacity: 1, transform: 'translateY(0)' })
              ),
            ]),
          ],
          { optional: true }
        ),
      ]),
    ]),
  ],
})
export class MultipleChoiceSectionComponent implements OnInit {
  @Input() attemptId!: string;

  // Enhanced properties based on backend data
  testType: string = 'Multiple Choice Assessment';
  testName: string = '';
  timeSpent: string = '0:00';
  score: number = 0;
  totalQuestions: number = 0;
  percentageScore: number = 0;
  correctAnswers: number = 0;
  wrongAnswers: number = 0;
  skippedQuestions: number = 0;
  averageTimePerQuestion: number = 0;
  completionRate: number = 0;
  accuracyRate: number = 0;
  efficiencyScore: number = 0;
  difficulty: string = '';
  testDuration: number = 0;
  testCategory: string = '';

  // Performance metrics
  performance: {
    level: string;
    color: string;
    description: string;
    score: number;
    recommendation: string;
  } = {
    level: 'Calculating...',
    color: '#6b7280',
    description: 'Performance analysis in progress',
    score: 0,
    recommendation: 'Analysis in progress...',
  };

  // Detailed analytics
  testAnalytics: {
    startTime: string;
    endTime: string;
    totalDuration: number;
    browser: string;
    device: string;
    screenResolution: string;
    averageQuestionTime: string;
    questionsRevisited: number;
    fastestQuestion: { number: number; time: string };
    slowestQuestion: { number: number; time: string };
  } = {
    startTime: '',
    endTime: '',
    totalDuration: 0,
    browser: '',
    device: '',
    screenResolution: '',
    averageQuestionTime: '',
    questionsRevisited: 0,
    fastestQuestion: { number: 0, time: '0:00' },
    slowestQuestion: { number: 0, time: '0:00' },
  };

  psychologistComment: string = '';
  isLoading = true;

  aiComments: AIComment[] = [
    {
      text: 'The candidate demonstrates strong analytical thinking and comprehensive understanding of the subject matter.',
      reaction: undefined,
      feedback: '',
    },
  ];
  chartOptions = {
    series: [
      {
        name: 'Performance',
        data: [80, 75, 90, 85, 70],
      },
    ],
    chart: {
      type: 'bar' as any,
      height: 350,
      toolbar: {
        show: false,
      },
      animations: {
        enabled: true,
        speed: 800,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 8,
      },
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '12px',
        fontWeight: 'bold',
        colors: ['#ffffff'],
      },
    },
    colors: ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'],
    xaxis: {
      categories: [
        'Reading',
        'Logic',
        'Analysis',
        'Comprehension',
        'Critical Thinking',
      ],
    },
    yaxis: {
      title: {
        text: 'Score (%)',
      },
    },
  };

  constructor(private testService: TestService) {}

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
        },
      });
    }
  }
  private initializeData(data: any) {
    console.log('Received MCQ data structure:', data);

    if (!data) {
      console.error('No data received');
      this.isLoading = false;
      return;
    }

    // Backend returns: { attempt, questions, analytics, summary }
    const { attempt, questions, analytics, summary } = data;

    if (!attempt || !questions) {
      console.error('Missing attempt or questions data:', {
        attempt,
        questions,
      });
      this.isLoading = false;
      return;
    }

    // Update component properties with actual data
    this.testName = attempt.testName || 'Multiple Choice Assessment';
    this.timeSpent = this.formatTimeSpent(attempt.timeSpent);
    this.score = attempt.score || 0;
    this.totalQuestions = analytics.totalQuestions || questions.length;
    this.percentageScore = attempt.percentageScore || 0;
    this.correctAnswers = questions.filter(
      (q: any) => q.response?.isCorrect
    ).length;
    this.wrongAnswers = questions.filter(
      (q: any) => q.response && !q.response.isCorrect && !q.response.isSkipped
    ).length;
    this.skippedQuestions = questions.filter(
      (q: any) => q.response?.isSkipped
    ).length;
    this.completionRate = summary?.completionRate || 0;
    this.accuracyRate = summary?.accuracyRate || 0;
    this.efficiencyScore = summary?.efficiencyScore || 0;
    this.averageTimePerQuestion = attempt.timeSpent / this.totalQuestions;
    this.difficulty = attempt.difficulty || 'medium';

    // Populate detailed analytics
    this.testAnalytics = {
      startTime: new Date(attempt.startTime).toLocaleString(),
      endTime: attempt.endTime
        ? new Date(attempt.endTime).toLocaleString()
        : '',
      totalDuration: attempt.timeSpent,
      browser: attempt.browser || 'Unknown',
      device: attempt.device || 'Unknown',
      screenResolution: attempt.screenResolution || '1920x1080',
      questionsRevisited: analytics.questionsRevisited || 0,
      averageQuestionTime: this.formatTimeSpent(this.averageTimePerQuestion),
      fastestQuestion: this.getFastestQuestion(questions),
      slowestQuestion: this.getSlowestQuestion(questions),
    };

    // Calculate performance level based on percentage score
    this.calculatePerformanceLevel();

    // Initialize chart with actual data
    this.updateChartData(questions);
    this.isLoading = false;
  }

  private calculatePerformanceLevel() {
    if (this.percentageScore >= 90) {
      this.performance = {
        level: 'Excellent',
        color: '#10b981',
        description:
          'Outstanding performance with exceptional comprehension skills',
        score: this.percentageScore,
        recommendation: 'Continue developing advanced analytical thinking',
      };
    } else if (this.percentageScore >= 80) {
      this.performance = {
        level: 'Very Good',
        color: '#059669',
        description: 'Strong comprehension abilities with consistent accuracy',
        score: this.percentageScore,
        recommendation: 'Focus on speed optimization and complex reasoning',
      };
    } else if (this.percentageScore >= 70) {
      this.performance = {
        level: 'Good',
        color: '#3b82f6',
        description: 'Solid comprehension skills with room for improvement',
        score: this.percentageScore,
        recommendation:
          'Practice more complex reading comprehension and analytical skills',
      };
    } else if (this.percentageScore >= 60) {
      this.performance = {
        level: 'Average',
        color: '#f59e0b',
        description: 'Adequate comprehension with potential for development',
        score: this.percentageScore,
        recommendation:
          'Regular practice with reading comprehension exercises recommended',
      };
    } else if (this.percentageScore >= 40) {
      this.performance = {
        level: 'Below Average',
        color: '#f97316',
        description: 'Basic comprehension skills requiring improvement',
        score: this.percentageScore,
        recommendation: 'Focus on fundamental reading and analytical skills',
      };
    } else {
      this.performance = {
        level: 'Needs Improvement',
        color: '#ef4444',
        description:
          'Significant development needed in comprehension abilities',
        score: this.percentageScore,
        recommendation:
          'Consider foundational training in reading comprehension and critical thinking',
      };
    }
  }
  public formatTimeSpent(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  public getFastestQuestion(questions?: any[]): {
    number: number;
    time: string;
  } {
    if (!questions) {
      return this.testAnalytics.fastestQuestion;
    }
    let fastest = { number: 0, time: Number.MAX_VALUE };
    questions.forEach((q, index) => {
      const timeSpent = q.response?.timeSpent || 0;
      if (timeSpent < fastest.time && timeSpent > 0) {
        fastest = { number: index + 1, time: timeSpent };
      }
    });
    return { number: fastest.number, time: this.formatTimeSpent(fastest.time) };
  }

  public getSlowestQuestion(questions?: any[]): {
    number: number;
    time: string;
  } {
    if (!questions) {
      return this.testAnalytics.slowestQuestion;
    }
    let slowest = { number: 0, time: 0 };
    questions.forEach((q, index) => {
      const timeSpent = q.response?.timeSpent || 0;
      if (timeSpent > slowest.time) {
        slowest = { number: index + 1, time: timeSpent };
      }
    });
    return { number: slowest.number, time: this.formatTimeSpent(slowest.time) };
  }
  private updateChartData(questions: any[]) {
    // Calculate performance by category or question type
    const categoryPerformance = this.calculateCategoryPerformance(questions);

    this.chartOptions = {
      ...this.chartOptions,
      series: [
        {
          name: 'Score (%)',
          data: categoryPerformance.scores,
        },
      ],
      xaxis: {
        categories: categoryPerformance.categories,
      },
    };
  }

  private calculateCategoryPerformance(questions: any[]): {
    categories: string[];
    scores: number[];
  } {
    // Group questions by category or use question numbers if no categories
    const categories: string[] = [];
    const scores: number[] = [];

    if (questions.length <= 10) {
      // For smaller tests, show individual question scores
      questions.forEach((q, index) => {
        categories.push(`Q${index + 1}`);
        scores.push(q.response?.isCorrect ? 100 : 0);
      });
    } else {
      // For larger tests, group by sections or calculate section averages
      const sectionSize = Math.ceil(questions.length / 5);
      for (let i = 0; i < 5; i++) {
        const start = i * sectionSize;
        const end = Math.min(start + sectionSize, questions.length);
        const sectionQuestions = questions.slice(start, end);
        const correctCount = sectionQuestions.filter(
          (q) => q.response?.isCorrect
        ).length;
        const sectionScore = (correctCount / sectionQuestions.length) * 100;

        categories.push(`Section ${i + 1}`);
        scores.push(Math.round(sectionScore));
      }
    }

    return { categories, scores };
  }

  handleReaction(index: number, isPositive: boolean): void {
    if (this.aiComments[index].reaction === isPositive) {
      this.aiComments[index].reaction = undefined;
    } else {
      this.aiComments[index].reaction = isPositive;
    }
  }
}
