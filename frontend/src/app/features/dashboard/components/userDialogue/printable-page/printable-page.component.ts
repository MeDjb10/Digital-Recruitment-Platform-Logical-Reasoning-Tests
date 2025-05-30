import { Component, Input, OnInit } from '@angular/core';
import { DominoTestSectionComponent } from '../domino-test-section/domino-test-section.component';
import { MultipleChoiceSectionComponent } from '../multiple-choice-section/multiple-choice-section.component';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { TestService } from '../../../../../core/services/test.service';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Configure pdfMake with fonts using proper syntax
const pdfMakeWithFonts = pdfMake as any;
pdfMakeWithFonts.vfs = (pdfFonts as any).pdfMake
  ? (pdfFonts as any).pdfMake.vfs
  : pdfFonts;

interface Performance {
  level: string;
  label: string;
  color: string;
  description: string;
}

@Component({
  selector: 'app-printable-page',
  standalone: true,
  imports: [
    DominoTestSectionComponent,
    MultipleChoiceSectionComponent,
    CommonModule,
    NgApexchartsModule,
  ],
  templateUrl: './printable-page.component.html',
  styleUrl: './printable-page.component.css',
})
export class PrintablePageComponent implements OnInit {
  @Input() attemptId!: string;
  @Input() userInfo: any;
  @Input() testResults: any;
  @Input() dominoAttemptId?: string;
  @Input() mcqAttemptId?: string;

  hasMultipleChoiceTest: boolean = true;
  hasDominoTest: boolean = true;
  isLoading: boolean = false;

  // Store test data for PDF generation
  dominoTestData: any = null;
  multipleChoiceTestData: any = null;

  // User and test information
  candidateInfo: {
    name: string;
    email: string;
    level: string;
    birthday: string;
    testDate: string;
    profileImage: string;
  } = {
    name: 'Loading...',
    email: '',
    level: '',
    birthday: '',
    testDate: '',
    profileImage: 'assets/images/testimonial-avatar.jpg',
  };

  psychologistInfo = {
    name: 'Dr. Sarah Smith',
    title: 'Cognitive Specialist',
    image: 'assets/wom.png',
  };

  constructor(private testService: TestService) {}

  ngOnInit() {
    if (this.userInfo) {
      this.initializeUserInfo();
    }

    // Determine test availability based on input data
    this.hasDominoTest = !!(
      this.dominoAttemptId ||
      (this.testResults && this.testResults.dominoTest)
    );
    this.hasMultipleChoiceTest = !!(
      this.mcqAttemptId ||
      (this.testResults && this.testResults.additionalTest)
    );

    // Load test information from available data
    this.loadAvailableTestData();

    this.isLoading = false;
  }

  private initializeUserInfo() {
    this.candidateInfo = {
      name: this.userInfo.fullName || 'N/A',
      email: this.userInfo.email || '',
      level: this.userInfo.level || 'Candidate',
      birthday: this.userInfo.birthDate
        ? new Date(this.userInfo.birthDate).toLocaleDateString()
        : 'N/A',
      testDate: new Date().toLocaleDateString(),
      profileImage:
        this.userInfo.profileImage || 'assets/images/testimonial-avatar.jpg',
    };
  }

  private loadAvailableTestData() {
    // Load data from testResults if available (passed from parent component)
    if (this.testResults) {
      if (this.testResults.dominoTest) {
        this.loadDominoTestData(this.testResults.dominoTest);
      }
      if (this.testResults.additionalTest) {
        this.loadMultipleChoiceTestData(this.testResults.additionalTest);
      }
    }

    // Load data from individual attempt IDs if available
    if (this.dominoAttemptId) {
      this.loadTestDataFromAttempt(this.dominoAttemptId, 'domino');
    }
    if (this.mcqAttemptId) {
      this.loadTestDataFromAttempt(this.mcqAttemptId, 'mcq');
    }
  }

  private loadDominoTestData(dominoTestResult: any) {
    const attempt = dominoTestResult.attempt;
    const test = dominoTestResult.test;

    this.dominoTestData = {
      score: attempt.score || 0,
      totalQuestions: test.questionsCount || 20,
      percentageScore: attempt.percentageScore || 0,
      timeSpent: this.formatTimeSpent(attempt.timeSpent || 0),
      performance: this.calculatePerformanceLevel(attempt.percentageScore || 0),
    };
  }

  private loadMultipleChoiceTestData(mcqTestResult: any) {
    const attempt = mcqTestResult.attempt;
    const test = mcqTestResult.test;
    const totalQuestions = test.questionsCount || 40;

    this.multipleChoiceTestData = {
      correctAnswers: attempt.score || 0,
      wrongAnswers: totalQuestions - (attempt.score || 0),
      totalQuestions: totalQuestions,
      percentageScore: attempt.percentageScore || 0,
      timeSpent: this.formatTimeSpent(attempt.timeSpent || 0),
      performance: this.calculatePerformanceLevel(attempt.percentageScore || 0),
    };
  }

  private loadTestDataFromAttempt(
    attemptId: string,
    testType: 'domino' | 'mcq'
  ) {
    this.testService.getAttemptResults(attemptId).subscribe({
      next: (response) => {
        const data = response.data;
        if (data && data.attempt) {
          if (testType === 'domino') {
            this.loadDominoTestData({
              attempt: data.attempt,
              test: { questionsCount: data.questions?.length || 20 },
            });
          } else {
            this.loadMultipleChoiceTestData({
              attempt: data.attempt,
              test: { questionsCount: data.questions?.length || 40 },
            });
          }
        }
      },
      error: (error) => {
        console.error(`Error loading ${testType} test data:`, error);
      },
    });
  }

  private calculatePerformanceLevel(score: number): Performance {
    if (score >= 90) {
      return {
        level: 'Excellent',
        label: 'Excellent Performance',
        color: '#10B981',
        description:
          'Outstanding cognitive abilities demonstrated. Exceptional problem-solving skills and pattern recognition.',
      };
    } else if (score >= 80) {
      return {
        level: 'Very Good',
        label: 'Very Good Performance',
        color: '#3B82F6',
        description:
          'Strong cognitive abilities with excellent analytical thinking and reasoning skills.',
      };
    } else if (score >= 70) {
      return {
        level: 'Good',
        label: 'Good Performance',
        color: '#8B5CF6',
        description:
          'Good cognitive performance with solid problem-solving capabilities.',
      };
    } else if (score >= 60) {
      return {
        level: 'Average',
        label: 'Average Performance',
        color: '#F59E0B',
        description:
          'Average cognitive abilities. Room for improvement in analytical thinking.',
      };
    } else if (score >= 50) {
      return {
        level: 'Below Average',
        label: 'Below Average Performance',
        color: '#EF4444',
        description:
          'Below average performance. Additional training and development recommended.',
      };
    } else {
      return {
        level: 'Needs Improvement',
        label: 'Needs Improvement',
        color: '#DC2626',
        description:
          'Significant improvement needed. Consider additional training and support.',
      };
    }
  }

  private formatTimeSpent(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  async generatePDF() {
    try {
      // Load real data if we have attemptId but no test data yet
      if (
        this.attemptId &&
        !this.dominoTestData &&
        !this.multipleChoiceTestData
      ) {
        await this.loadRealDataForPDF();
      }

      // Create sample data if no real data is available
      if (!this.dominoTestData && !this.multipleChoiceTestData) {
        this.createSampleData();
      }

      // Define document structure
      const docDefinition = {
        content: [
          // Header
          {
            text: 'PSYCHOLOGICAL ASSESSMENT REPORT',
            style: 'title',
            alignment: 'center',
            margin: [0, 0, 0, 30],
          },

          // Candidate Information
          {
            text: 'CANDIDATE INFORMATION',
            style: 'header',
            margin: [0, 0, 0, 10],
          },
          {
            table: {
              widths: ['30%', '70%'],
              body: [
                ['Name:', this.candidateInfo.name],
                ['Email:', this.candidateInfo.email],
                ['Level:', this.candidateInfo.level],
                ['Test Date:', this.candidateInfo.testDate],
              ],
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 20],
          },

          // Test Results
          ...(this.dominoTestData ? this.getDominoTestContent() : []),
          ...(this.multipleChoiceTestData
            ? this.getMultipleChoiceTestContent()
            : []),

          // Recommendations
          {
            text: 'RECOMMENDATIONS',
            style: 'header',
            margin: [0, 20, 0, 10],
          },
          {
            text: this.generateRecommendations(),
            style: 'normalText',
            margin: [0, 0, 0, 20],
          },

          // Footer
          {
            text: [
              `Evaluated by: ${this.psychologistInfo.name}, ${this.psychologistInfo.title}`,
              '\n',
              `Report generated on: ${new Date().toLocaleDateString()}`,
            ],
            style: 'footer',
            alignment: 'center',
            margin: [0, 40, 0, 0],
          },
        ],
        styles: {
          title: { fontSize: 18, bold: true, color: '#2563EB' },
          header: {
            fontSize: 14,
            bold: true,
            color: '#374151',
            margin: [0, 10, 0, 5],
          },
          normalText: { fontSize: 11, lineHeight: 1.4 },
          footer: { fontSize: 10, italics: true, color: '#6B7280' },
        },
      };

      // Generate and download PDF
      const candidateName = this.candidateInfo.name.replace(
        /[^a-zA-Z0-9]/g,
        '_'
      );
      pdfMakeWithFonts
        .createPdf(docDefinition)
        .download(`${candidateName}_Assessment_Report.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.fallbackToPrint();
    }
  }

  private async loadRealDataForPDF() {
    try {
      console.log(
        'Loading real data for PDF generation, attemptId:',
        this.attemptId
      );
      const response = await this.testService
        .getAttemptResults(this.attemptId)
        .toPromise();
      const data = response?.data;

      if (data && data.attempt) {
        // Update candidate info with real test date
        this.candidateInfo.testDate = new Date(
          data.attempt.startTime
        ).toLocaleDateString(); // Process test data based on test type
        const testName = data.attempt?.testName?.toLowerCase() || '';
        if (testName.includes('domino')) {
          this.hasDominoTest = true;
          const timeSpent = data.attempt.endTime
            ? new Date(data.attempt.endTime).getTime() -
              new Date(data.attempt.startTime).getTime()
            : data.attempt.timeSpent || 0;
          const totalQuestions = data.questions?.length || 20;
          const score = data.attempt.score || 0;
          const percentageScore =
            totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;

          this.dominoTestData = {
            score: score,
            totalQuestions: totalQuestions,
            percentageScore: Math.round(percentageScore),
            timeSpent: this.formatTimeSpent(timeSpent),
            performance: this.calculatePerformanceLevel(percentageScore),
          };
          console.log('Set domino test data:', this.dominoTestData);
        } else {
          this.hasMultipleChoiceTest = true;
          const timeSpent = data.attempt.endTime
            ? new Date(data.attempt.endTime).getTime() -
              new Date(data.attempt.startTime).getTime()
            : data.attempt.timeSpent || 0;
          const totalQuestions = data.questions?.length || 40;
          const score = data.attempt.score || 0;
          const percentageScore =
            totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;

          this.multipleChoiceTestData = {
            correctAnswers: score,
            wrongAnswers: totalQuestions - score,
            totalQuestions: totalQuestions,
            percentageScore: Math.round(percentageScore),
            timeSpent: this.formatTimeSpent(timeSpent),
            performance: this.calculatePerformanceLevel(percentageScore),
          };
          console.log('Set MCQ test data:', this.multipleChoiceTestData);
        }

        // Update test availability flags
        this.hasDominoTest = !!this.dominoTestData;
        this.hasMultipleChoiceTest = !!this.multipleChoiceTestData;
      }
    } catch (error) {
      console.error('Error loading real data for PDF:', error);
    }
  }

  private createSampleData() {
    console.log('Creating sample data for PDF generation');
    this.dominoTestData = {
      score: 15,
      totalQuestions: 20,
      percentageScore: 75,
      timeSpent: '12m 30s',
      performance: this.calculatePerformanceLevel(75),
    };

    this.multipleChoiceTestData = {
      correctAnswers: 32,
      wrongAnswers: 8,
      totalQuestions: 40,
      percentageScore: 80,
      timeSpent: '18m 45s',
      performance: this.calculatePerformanceLevel(80),
    };
  }

  private getDominoTestContent(): any[] {
    const performance = this.dominoTestData.performance;

    return [
      // Test Header
      {
        text: 'DOMINO TEST RESULTS',
        style: 'header',
        margin: [0, 20, 0, 10],
      },

      // Score Highlight
      {
        table: {
          widths: ['100%'],
          body: [
            [
              {
                text: `Score: ${this.dominoTestData.percentageScore || 0}%`,
                style: 'title',
                alignment: 'center',
                fillColor: '#EBF4FF',
                margin: [0, 10, 0, 10],
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 15],
      },

      // Performance Details
      {
        table: {
          widths: ['50%', '50%'],
          body: [
            [
              'Score:',
              `${this.dominoTestData.score || 'N/A'}/${
                this.dominoTestData.totalQuestions || 'N/A'
              }`,
            ],
            ['Time Spent:', this.dominoTestData.timeSpent || 'N/A'],
            ['Performance Level:', performance.level],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 10],
      },

      // Performance Description
      {
        text: performance.description || '',
        style: 'normalText',
        italics: true,
        margin: [0, 0, 0, 20],
      },
    ];
  }

  private getMultipleChoiceTestContent(): any[] {
    const performance = this.multipleChoiceTestData.performance;
    const totalQuestions = this.multipleChoiceTestData.totalQuestions || 40;
    const percentageScore = this.multipleChoiceTestData.percentageScore || 0;

    return [
      // Test Header
      {
        text: 'MULTIPLE CHOICE TEST RESULTS',
        style: 'header',
        margin: [0, 20, 0, 10],
      },

      // Score Highlight
      {
        table: {
          widths: ['100%'],
          body: [
            [
              {
                text: `Score: ${percentageScore}%`,
                style: 'title',
                alignment: 'center',
                fillColor: '#F0FDF4',
                margin: [0, 10, 0, 10],
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 15],
      },

      // Performance Details
      {
        table: {
          widths: ['50%', '50%'],
          body: [
            [
              'Correct Answers:',
              this.multipleChoiceTestData.correctAnswers || 'N/A',
            ],
            [
              'Wrong Answers:',
              this.multipleChoiceTestData.wrongAnswers || 'N/A',
            ],
            ['Time Spent:', this.multipleChoiceTestData.timeSpent || 'N/A'],
            ['Performance Level:', performance.level],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 10],
      },

      // Performance Description
      {
        text: performance.description || '',
        style: 'normalText',
        italics: true,
        margin: [0, 0, 0, 20],
      },
    ];
  }

  private generateRecommendations(): string {
    const dominoPerformance = this.dominoTestData?.performance?.level || '';
    const mcqPerformance =
      this.multipleChoiceTestData?.performance?.level || '';

    let recommendations = '';

    if (dominoPerformance === 'Excellent' || mcqPerformance === 'Excellent') {
      recommendations +=
        'Excellent cognitive abilities demonstrated. Suitable for complex analytical roles and leadership positions. ';
    } else if (
      dominoPerformance === 'Very Good' ||
      mcqPerformance === 'Very Good'
    ) {
      recommendations +=
        'Strong analytical and problem-solving skills. Well-suited for challenging technical and managerial roles. ';
    } else if (dominoPerformance === 'Good' || mcqPerformance === 'Good') {
      recommendations +=
        'Good cognitive performance with solid foundation. Suitable for most professional roles with some mentoring. ';
    } else {
      recommendations +=
        'Additional training and development recommended to enhance cognitive and analytical skills. ';
    }

    recommendations +=
      'Consider role-specific training to maximize potential and performance in target position.';

    return recommendations;
  }

  private fallbackToPrint() {
    console.log('Falling back to browser print...');
    window.print();
  }

  exportToPDF() {
    this.generatePDF();
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString();
  }
}
