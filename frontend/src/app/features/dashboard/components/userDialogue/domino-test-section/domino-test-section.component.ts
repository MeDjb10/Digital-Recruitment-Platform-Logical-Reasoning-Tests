import { Component, OnInit, ViewChild, Input } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { ButtonModule } from 'primeng/button';
import {
  ApexAxisChartSeries,
  ApexTitleSubtitle,
  ApexDataLabels,
  ApexChart,
  ApexPlotOptions,
  ApexLegend,
  NgApexchartsModule,
  ChartComponent,
  ApexNonAxisChartSeries,
} from 'ng-apexcharts';
import { TestService } from '../../../../../core/services/test.service';
import { AiService } from '../../../../../core/services/ai.service';
import { User } from '../../../../../core/models/user.model';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { TooltipModule } from 'primeng/tooltip';

interface MetricsRequest {
  test_type: string;
  questionsAnswered: number;
  correct_answers: number;
  timeSpent: number;
  halfCorrect: number;
  reversed: number;
  questionsSkipped: number;
  answerChanges: number;
  flaggedQuestions: number;
  desired_position: string;
  education_level: string;
  attemptId: string; // Add optional attemptId field
}

interface ClassificationResponse {
  prediction: string;
  confidence: number;
}

interface ManualClassification {
  value: string;
  classifiedBy: string;
  classifiedAt: Date;
}

export type ChartOptions = {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  title: ApexTitleSubtitle;
  plotOptions: ApexPlotOptions;
  legend: ApexLegend;
  colors: string[];
};

@Component({
  selector: 'app-domino-test-section',
  standalone: true, // Add standalone: true
  imports: [
    CommonModule,
    FormsModule,
    ChartModule,
    NgApexchartsModule,
    ButtonModule,
    TooltipModule,
  ],
  templateUrl: './domino-test-section.component.html',
  styleUrl: './domino-test-section.component.css',
})
export class DominoTestSectionComponent implements OnInit {
  @ViewChild('chart') chart!: ChartComponent;
  @Input() attemptId!: string;
  @Input() userInfo: User | null = null;
  public chartOptions: Partial<ChartOptions>;
  // Enhanced properties based on backend data
  testType: string = 'Logical Reasoning Assessment';
  testName: string = '';
  timeSpent: string = '0:00';
  score: number = 0;
  totalQuestions: number = 0;
  percentageScore: number = 0;
  halfCorrect: number = 0;
  flaggedQuestions: number = 0;
  questionsAnswered: number = 0;
  skippedQuestions: number = 0;
  inversedAnswers: number = 0;
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

  timeChartData: any;
  isAiAnalysisVisible: boolean = false;
  isLoading: boolean = true;
  chartInitialized: boolean = false;

  // Add new properties
  manualClassification: ManualClassification | null = null;
  aiClassification: string = '';
  aiConfidence: number = 0;
  aiComment: string = '';
  isLoadingAnalysis: boolean = false;
  classificationLabels: string[] = [
    'Very Strong',
    'Strong',
    'Average',
    'Weak',
    'Very Weak',
  ];
  userPosition: string = ''; // This should be populated from user data
  userEducation: string = ''; // This should be populated from user data
  showClassificationDropdown = true;
  currentUser: User | null | undefined ; // This should be populated from auth service
  psychologistComment: string = '';
  isSavingComment: boolean = false;

  constructor(
    private location: Location,
    private testService: TestService,
    private aiService: AiService,
    private authService: AuthService // Add AuthService
  ) {
    this.chartOptions = {
      series: [
        {
          data: [] as Array<{
            x: string;
            y: number;
          }>,
        },
      ],
      chart: {
        height: 450,
        type: 'treemap',
        toolbar: { show: false },
      },
      dataLabels: { enabled: true },
      title: { text: '' },
      plotOptions: {
        treemap: {
          distributed: true,
          enableShades: false,
        },
      } as ApexPlotOptions,
      colors: [],
      legend: { show: false },
    };
  }

  
  ngOnInit() {
    this.userEducation = this.userInfo?.educationLevel || '';
    this.userPosition = this.userInfo?.desiredPosition || '';
    if (this.attemptId) {
      this.testService.getAttemptResults(this.attemptId).subscribe({
        next: (response) => {
          console.log('Domino test results:', response);
          this.initializeData(response.data);
        },
        error: (error) => {
          console.error('Error loading domino results:', error);
          this.isLoading = false;
        },
      });
    }
    console.log('test details aaaaaaaaaaaaaaaaaaaaaa:', this.testAnalytics);
    this.currentUser = this.authService.getCurrentUser();
    this.showClassificationDropdown =
      this.currentUser?.role=== 'psychologist' && !this.manualClassification;
  }

  private initializeData(data: any) {
    console.log('Received data structure:', data);

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
    } // Update component properties with actual data
    this.testName = attempt.testName || 'D-2000';
    this.timeSpent = this.formatTimeSpent(attempt.timeSpent);
    this.score = attempt.score || 0;
    this.totalQuestions = analytics.totalQuestions || questions.length;
    this.percentageScore = attempt.percentageScore || 0;
    this.questionsAnswered = analytics.questionsAnswered || 0;
    this.skippedQuestions = analytics.questionsSkipped || 0;
    this.halfCorrect = analytics.halfCorrect || 0;
    this.flaggedQuestions = analytics.flaggedQuestions || 0;
    this.inversedAnswers = questions.filter(
      (q: any) => q.response?.isReversed
    ).length;
    this.completionRate = summary?.completionRate || 0;
    this.accuracyRate = summary?.accuracyRate || 0;
    this.efficiencyScore = summary?.efficiencyScore || 0;
    this.averageTimePerQuestion = attempt.timeSpent / this.totalQuestions;
    this.difficulty = attempt.difficulty || 'medium'; // Populate detailed analytics
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
    console.log(
      "aaaaaaaaaaaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA23:",
      this.testAnalytics
    );

    // Calculate performance level based on percentage score
    this.calculatePerformanceLevel();

    // Initialize charts with actual data
    this.initializeTimeChart(questions);
    this.initializeTreeMap();
    this.isLoading = false;

    if (data.attempt.manualClassification) {
      this.manualClassification = {
        value: data.attempt.manualClassification.value,
        classifiedBy: data.attempt.manualClassification.classifiedBy,
        classifiedAt: new Date(data.attempt.manualClassification.classifiedAt),
      };
      this.showClassificationDropdown = false;
    }
  }
  private calculatePerformanceLevel() {
    if (this.percentageScore >= 90) {
      this.performance = {
        level: 'Excellent',
        color: '#10b981',
        description:
          'Outstanding performance with exceptional logical reasoning skills',
        score: this.percentageScore,
        recommendation: 'Continue developing advanced problem-solving skills',
      };
    } else if (this.percentageScore >= 80) {
      this.performance = {
        level: 'Very Good',
        color: '#059669',
        description:
          'Strong logical reasoning abilities with consistent accuracy',
        score: this.percentageScore,
        recommendation:
          'Focus on speed optimization and complex pattern recognition',
      };
    } else if (this.percentageScore >= 70) {
      this.performance = {
        level: 'Good',
        color: '#3b82f6',
        description: 'Solid logical reasoning skills with room for improvement',
        score: this.percentageScore,
        recommendation:
          'Practice more complex logical sequences and time management',
      };
    } else if (this.percentageScore >= 60) {
      this.performance = {
        level: 'Average',
        color: '#f59e0b',
        description:
          'Adequate logical reasoning with potential for development',
        score: this.percentageScore,
        recommendation:
          'Regular practice with pattern recognition exercises recommended',
      };
    } else if (this.percentageScore >= 40) {
      this.performance = {
        level: 'Below Average',
        color: '#f97316',
        description: 'Basic logical reasoning skills requiring improvement',
        score: this.percentageScore,
        recommendation:
          'Focus on fundamental logical reasoning concepts and systematic practice',
      };
    } else {
      this.performance = {
        level: 'Needs Improvement',
        color: '#ef4444',
        description:
          'Significant development needed in logical reasoning abilities',
        score: this.percentageScore,
        recommendation:
          'Consider foundational training in logical thinking and problem-solving',
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
  initializeTimeChart(questions: any[]) {
    const questionCount = questions.length;
    // Convert milliseconds to seconds for display
    const data = questions.map((q) =>
      Math.round((q.response?.timeSpent || 0) / 1000)
    );
    const colors = Array(questionCount)
      .fill(0)
      .map(
        () =>
          `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(
            Math.random() * 255
          )}, ${Math.floor(Math.random() * 255)}, 0.7)`
      );

    this.timeChartData = {
      labels: questions.map(
        (q, i) => `Q${q.question?.questionNumber || i + 1}`
      ),
      datasets: [
        {
          label: 'Time Spent (seconds)',
          data: data,
          backgroundColor: colors,
        },
      ],
    };
  }

  initializeTreeMap() {
    if (!this.timeChartData || !this.timeChartData.datasets[0]) {
      console.warn('No time chart data available for treemap');
      return;
    }

    const chartData = this.timeChartData.datasets[0].data.map(
      (time: number, index: number) => ({
        x: `Q${index + 1}`,
        y: time,
      })
    );

    this.chartOptions = {
      series: [
        {
          data: chartData,
        },
      ],
      chart: {
        height: 450,
        type: 'treemap',
        toolbar: {
          show: false,
        },
        animations: {
          enabled: true,
          speed: 800,
          dynamicAnimation: {
            enabled: true,
            speed: 350,
          },
        },
      },
      title: {
        text: 'Time Distribution per Question',
        align: 'center',
        style: {
          fontSize: '16px',
          fontWeight: '600',
          color: '#374151',
        },
      },
      colors: this.timeChartData.datasets[0].backgroundColor,
      plotOptions: {
        treemap: {
          distributed: true,
          enableShades: false,
          colorScale: {
            ranges: [
              {
                from: 0,
                to: 35,
                color: '#10b981', // Green for fast answers
              },
              {
                from: 36,
                to: 60,
                color: '#f59e0b', // Orange for moderate speed
              },
              {
                from: 61,
                to: 100,
                color: '#ef4444', // Red for slow answers
              },
            ],
          },
        },
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '12px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 'bold',
          colors: ['#ffffff'],
        },
        formatter: function (text: string, op: any): string {
          return `${text}\n${Math.round(op.value)}s`;
        },
      },
      legend: {
        show: false,
      },
    };

    // Force chart update after a small delay to ensure DOM is ready
    setTimeout(() => {
      if (this.chart) {
        this.chart.updateOptions(this.chartOptions, true);
      }
    }, 100);
  }

  

  async classifyPerformance() {
    // Add some validation
    if (!this.userPosition || !this.userEducation) {
      console.error('Missing required user data', this.userEducation);
      return;
    }

    const metrics: MetricsRequest = {
      attemptId: this.attemptId,
      test_type: this.testName,
      questionsAnswered: this.questionsAnswered,
      correct_answers: this.score,
      timeSpent: this.testAnalytics.totalDuration || 0,
      halfCorrect: this.halfCorrect || 0,
      reversed: this.inversedAnswers || 0,
      questionsSkipped: this.skippedQuestions || 0,
      answerChanges: this.testAnalytics.questionsRevisited || 0,
      flaggedQuestions: this.flaggedQuestions || 0,
      desired_position: this.userPosition,
      education_level: this.userEducation,
    };

    console.log('Sending metrics:', metrics);

    try {
      this.aiService.classify(metrics).subscribe({
        next: (response: ClassificationResponse) => {
          console.log('Classification success:', response);
          this.aiClassification = response.prediction;
          this.aiConfidence = response.confidence;

          // Update the attempt with the classification
          this.testService
            .updateAiClassification(this.attemptId, {
              prediction: response.prediction,
              confidence: response.confidence,
              timestamp: new Date().toISOString(),
            })
            .subscribe({
              next: (updateResponse) => {
                console.log('Classification saved to attempt:', updateResponse);
              },
              error: (updateError) => {
                console.error('Error saving classification to attempt:', updateError);
              },
            });
        },
        error: (error) => {
          console.error('Error getting AI classification:', error);
          alert('Failed to get AI classification. Please try again.');
        },
      });
    } catch (error) {
      console.error('Error in classifyPerformance:', error);
    }
  }

  onClassificationSelect(classification: string) {
    if (!classification) return;

    const classificationData: ManualClassification = {
      value: classification,
      classifiedBy: this.currentUser?.firstName + ' ' + this.currentUser?.lastName || 'Unknown',
      classifiedAt: new Date(),
    };

    this.testService
      .updateManualClassification(this.attemptId, classification)
      .subscribe({
        next: (response) => {
          this.manualClassification = classificationData;
          this.showClassificationDropdown = false;
        },
        error: (error) => {
          console.error('Error updating manual classification:', error);
          // Handle error - maybe show a notification
        },
      });
  }

  // Utility method to format date for tooltip
  formatClassificationDate(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  get formattedAiComment(): string {
    if (!this.aiComment) return '';
    
    return this.aiComment
      // Replace newlines with <br> tags
      .replace(/\n/g, '<br>')
      // Replace **text** with <strong>text</strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Additional formatting if needed
      .replace(/Assessment Summary:/g, '<h3 class="text-xl font-bold my-4">Assessment Summary:</h3>')
      .replace(/Recommendation:/g, '<h3 class="text-xl font-bold my-4">Recommendation:</h3>');
  }

  async generateReport() {
    if (!this.userPosition || !this.userEducation) {
      console.error('Missing required user data');
      return;
    }

    this.isLoadingAnalysis = true;
    const metrics: MetricsRequest = {
      attemptId: this.attemptId,
      test_type: this.testName,
      questionsAnswered: this.questionsAnswered,
      correct_answers: this.score,
      timeSpent: this.testAnalytics.totalDuration || 0,
      halfCorrect: this.halfCorrect || 0,
      reversed: this.inversedAnswers || 0,
      questionsSkipped: this.skippedQuestions || 0,
      answerChanges: this.testAnalytics.questionsRevisited || 0,
      flaggedQuestions: this.flaggedQuestions || 0,
      desired_position: this.userPosition,
      education_level: this.userEducation,
    };

    try {
      this.aiService.analyze(metrics).subscribe({
        next: (response) => {
          // Remove <think> tags if present in the response
          this.aiComment = response.ai_analysis.replace(/<think>.*?<\/think>/g, '').trim();
          
          this.testService.updateAiComment(this.attemptId, this.aiComment)
            .subscribe({
              next: (updateResponse) => {
                console.log('AI analysis saved:', updateResponse);
                this.isLoadingAnalysis = false;
                this.isAiAnalysisVisible = true;
              },
              error: (updateError) => {
                console.error('Error saving AI analysis:', updateError);
                this.isLoadingAnalysis = false;
              }
            });
        },
        error: (error) => {
          console.error('Error getting AI analysis:', error);
          alert('Failed to generate AI report. Please try again.');
          this.isLoadingAnalysis = false;
        }
      });
    } catch (error) {
      console.error('Error in generateReport:', error);
      this.isLoadingAnalysis = false;
    }
  }

  // Add method to submit psychologist comment
  async submitPsychologistComment() {
    if (!this.psychologistComment.trim()) {
      return;
    }

    this.isSavingComment = true;
    try {
      await this.testService.updatePsychologistComment(
        this.attemptId,
        this.psychologistComment
      ).toPromise();
      
      // Optionally refresh the data or show success message
      this.isSavingComment = false;
    } catch (error) {
      console.error('Error saving psychologist comment:', error);
      this.isSavingComment = false;
      // Optionally show error message
    }
  }
}
