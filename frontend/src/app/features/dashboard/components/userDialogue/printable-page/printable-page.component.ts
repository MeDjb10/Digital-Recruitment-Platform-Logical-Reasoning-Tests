import { Component, Input, OnInit } from '@angular/core';
import { DominoTestSectionComponent } from '../domino-test-section/domino-test-section.component';
import { MultipleChoiceSectionComponent } from '../multiple-choice-section/multiple-choice-section.component';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { TestService } from '../../../../../core/services/test.service';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { User } from '../../../../../core/models/user.model';

// Configure pdfMake with fonts using proper syntax
const pdfMakeWithFonts = pdfMake as any;
if ((pdfFonts as any).pdfMake && (pdfFonts as any).pdfMake.vfs) {
  pdfMakeWithFonts.vfs = (pdfFonts as any).pdfMake.vfs;
} else {
  // Fallback for environments where pdfMake.vfs might be structured differently or directly on pdfFonts
  pdfMakeWithFonts.vfs = (pdfFonts as any).vfs || pdfFonts;
}

interface Performance {
  level: string;
  label: string;
  color: string;
  description: string;
}

interface TestData {
  testName?: string;
  testDescription?: string;
  difficulty?: string;
  duration?: number; // in minutes
  score?: number;
  totalQuestions?: number;
  percentageScore?: number;
  timeSpent?: string;
  questionsAnswered?: number;
  questionsSkipped?: number;
  startTime?: string;
  endTime?: string;
  device?: string;
  browser?: string;
  performance?: Performance;
  correctAnswers?: number; // Specific to MCQ
  wrongAnswers?: number; // Specific to MCQ
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
  private readonly dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };

  @Input() attemptId!: string; // Generic attemptId, potentially used if specific ones aren't
  @Input() userInfo: User | null = null; // User info for candidate details 
  @Input() testResults: any; // { dominoTest: { attempt, test }, additionalTest: { attempt, test } }
  @Input() dominoAttemptId?: string;
  @Input() mcqAttemptId?: string;

  hasMultipleChoiceTest: boolean = false;
  hasDominoTest: boolean = false;
  isLoading: boolean = true;

  dominoTestData: TestData | null = null;
  multipleChoiceTestData: TestData | null = null;

  candidateInfo: {
    name: string;
    email: string;
    level: string;
    birthday: string;
    testDate: string;
    profileImage: string;
  } = {
    name: 'Loading...',
    email: 'N/A',
    level: 'N/A',
    birthday: 'N/A',
    testDate: 'N/A',
    profileImage: 'assets/images/testimonial-avatar.jpg',
  };

  psychologistInfo = {
    name: 'Dr. Evaluation Expert', // Placeholder
    title: 'Cognitive Assessment Specialist', // Placeholder
    image: 'assets/wom.png', // Placeholder
  };

  constructor(private testService: TestService) {}

  ngOnInit() {
    this.isLoading = true;
    this.initializeUserInfo(); // Initialize user info first

    const dataLoadPromises: Promise<void>[] = [];

    if (this.testResults) {
      if (
        this.testResults.dominoTest &&
        this.testResults.dominoTest.attempt &&
        this.testResults.dominoTest.test
      ) {
        console.log(
          'ngOnInit: Loading Domino Test Data from testResults input:',
          this.testResults.dominoTest
        );
        this.loadDominoTestData(this.testResults.dominoTest);
      } else {
        console.log(
          'ngOnInit: Domino test data not found or incomplete in testResults input.'
        );
      }
      if (
        this.testResults.additionalTest &&
        this.testResults.additionalTest.attempt &&
        this.testResults.additionalTest.test
      ) {
        console.log(
          'ngOnInit: Loading MCQ Test Data from testResults input:',
          this.testResults.additionalTest
        );
        this.loadMultipleChoiceTestData(this.testResults.additionalTest);
      } else {
        console.log(
          'ngOnInit: Additional/MCQ test data not found or incomplete in testResults input.'
        );
      }
    } else {
      console.log('ngOnInit: testResults input is not available.');
    }

    // Fallback or direct load if specific attempt IDs are provided and not covered by testResults
    if (this.dominoAttemptId && !this.dominoTestData) {
      console.log(
        'ngOnInit: Attempting to load Domino Test Data from dominoAttemptId:',
        this.dominoAttemptId
      );
      dataLoadPromises.push(
        this.loadTestDataFromAttempt(this.dominoAttemptId, 'domino')
      );
    }
    if (this.mcqAttemptId && !this.multipleChoiceTestData) {
      console.log(
        'ngOnInit: Attempting to load MCQ Test Data from mcqAttemptId:',
        this.mcqAttemptId
      );
      dataLoadPromises.push(
        this.loadTestDataFromAttempt(this.mcqAttemptId, 'mcq')
      );
    }

    // Fallback if only a generic attemptId is provided and no data loaded yet
    if (
      this.attemptId &&
      !this.dominoTestData &&
      !this.multipleChoiceTestData &&
      !this.testResults?.dominoTest &&
      !this.testResults?.additionalTest
    ) {
      console.log(
        'ngOnInit: Attempting to load data using generic attemptId via loadRealDataForPDF:',
        this.attemptId
      );
      dataLoadPromises.push(this.loadRealDataForPDF());
    }

    if (dataLoadPromises.length > 0) {
      Promise.all(dataLoadPromises)
        .then(() => this.finalizeDataLoading())
        .catch((error) => {
          console.error('Error in dataLoadPromises:', error);
          this.isLoading = false;
        });
    } else {
      // Data was loaded synchronously from testResults input or no specific IDs to load
      this.finalizeDataLoading();
    }
  }

  private finalizeDataLoading() {
    // Update testDate one last time if needed and not already set by specific loaders
    if (
      this.candidateInfo.testDate === 'N/A' ||
      this.candidateInfo.testDate === 'Loading...'
    ) {
      const dominoEndDate = this.dominoTestData?.endTime;
      const mcqEndDate = this.multipleChoiceTestData?.endTime;

      if (dominoEndDate && dominoEndDate !== 'N/A') {
        this.candidateInfo.testDate = new Date(
          dominoEndDate
        ).toLocaleDateString();
      } else if (mcqEndDate && mcqEndDate !== 'N/A') {
        this.candidateInfo.testDate = new Date(mcqEndDate).toLocaleDateString();
      }
    }

    this.hasDominoTest = !!this.dominoTestData;
    this.hasMultipleChoiceTest = !!this.multipleChoiceTestData;

    this.isLoading = false;
    console.log('Final Candidate Info for PDF:', this.candidateInfo);
    console.log('Final Domino Test Data for PDF:', this.dominoTestData);
    console.log('Final MCQ Test Data for PDF:', this.multipleChoiceTestData);
  }

  private initializeUserInfo() {
    if (this.userInfo) {
      this.candidateInfo.name =
        `${this.userInfo.firstName || ''} ${
          this.userInfo.lastName || ''
        }`.trim() || 'N/A';
      this.candidateInfo.email = this.userInfo.email || 'N/A';
      this.candidateInfo.level =
        this.userInfo.educationLevel || this.userInfo.role || 'N/A';
      this.candidateInfo.birthday = this.userInfo.dateOfBirth
        ? new Date(this.userInfo.dateOfBirth).toLocaleDateString()
        : 'N/A';
      // testDate is initialized to 'N/A' and will be updated by test data loaders or finalizeDataLoading
      this.candidateInfo.testDate = 'N/A';
      if (this.userInfo.profilePicture) {
        this.candidateInfo.profileImage = this.userInfo.profilePicture;
      }
      console.log('Initialized candidateInfo:', this.candidateInfo);
    } else {
      console.warn(
        'UserInfo not provided to printable-page, candidate details will be N/A.'
      );
      this.candidateInfo = {
        name: 'N/A',
        email: 'N/A',
        level: 'N/A',
        birthday: 'N/A',
        testDate: 'N/A',
        profileImage: 'assets/images/testimonial-avatar.jpg',
      };
    }
  }

  private loadDominoTestData(dominoTestResult: { attempt: any; test: any }) {
    if (
      !dominoTestResult ||
      !dominoTestResult.attempt ||
      !dominoTestResult.test
    ) {
      console.warn(
        'Incomplete domino test data received for PDF:',
        dominoTestResult
      );
      this.dominoTestData = null;
      return;
    }
    const { attempt, test } = dominoTestResult;
    const totalQuestions =
      attempt.metrics?.questionsTotal ?? test.totalQuestions ?? 0;

    this.dominoTestData = {
      testName: test.name || 'Domino Test',
      testDescription: test.description || 'Logical Reasoning Assessment',
      difficulty: test.difficulty || 'N/A',
      duration: test.duration || 0,
      score: attempt.score ?? 0,
      totalQuestions: totalQuestions,
      percentageScore: attempt.percentageScore ?? 0,
      timeSpent: this.formatTimeSpent(attempt.timeSpent || 0),
      questionsAnswered: attempt.metrics?.questionsAnswered ?? 0,
      questionsSkipped: attempt.metrics?.questionsSkipped ?? 0,
      startTime: attempt.startTime
        ? new Date(attempt.startTime).toLocaleString()
        : 'N/A',
      endTime: attempt.endTime
        ? new Date(attempt.endTime).toLocaleString()
        : 'N/A',
      device: attempt.device || 'Unknown',
      browser: attempt.browser || 'Unknown',
      performance: this.calculatePerformanceLevel(attempt.percentageScore || 0),
    };

    if (
      attempt.endTime &&
      (this.candidateInfo.testDate === 'N/A' ||
        this.candidateInfo.testDate === 'Loading...')
    ) {
      this.candidateInfo.testDate = new Date(
        attempt.endTime
      ).toLocaleDateString();
    }
    console.log('Loaded Domino Test Data for PDF:', this.dominoTestData);
  }

  private loadMultipleChoiceTestData(mcqTestResult: {
    attempt: any;
    test: any;
  }) {
    if (!mcqTestResult || !mcqTestResult.attempt || !mcqTestResult.test) {
      console.warn('Incomplete MCQ test data received for PDF:', mcqTestResult);
      this.multipleChoiceTestData = null;
      return;
    }
    const { attempt, test } = mcqTestResult;
    const totalQuestions =
      attempt.metrics?.questionsTotal ?? test.totalQuestions ?? 0;

    this.multipleChoiceTestData = {
      testName: test.name || 'Multiple Choice Test',
      testDescription: test.description || 'Comprehension Assessment',
      difficulty: test.difficulty || 'N/A',
      duration: test.duration || 0,
      score: attempt.score ?? 0,
      totalQuestions: totalQuestions,
      percentageScore: attempt.percentageScore ?? 0,
      timeSpent: this.formatTimeSpent(attempt.timeSpent || 0),
      questionsAnswered: attempt.metrics?.questionsAnswered ?? 0,
      questionsSkipped: attempt.metrics?.questionsSkipped ?? 0,
      startTime: attempt.startTime
        ? new Date(attempt.startTime).toLocaleString()
        : 'N/A',
      endTime: attempt.endTime
        ? new Date(attempt.endTime).toLocaleString()
        : 'N/A',
      device: attempt.device || 'Unknown',
      browser: attempt.browser || 'Unknown',
      performance: this.calculatePerformanceLevel(attempt.percentageScore || 0),
      correctAnswers: attempt.score ?? 0,
      wrongAnswers: totalQuestions - (attempt.score ?? 0),
    };

    if (
      attempt.endTime &&
      (this.candidateInfo.testDate === 'N/A' ||
        this.candidateInfo.testDate === 'Loading...')
    ) {
      this.candidateInfo.testDate = new Date(
        attempt.endTime
      ).toLocaleDateString();
    }
    console.log('Loaded MCQ Test Data for PDF:', this.multipleChoiceTestData);
  }

  private async loadTestDataFromAttempt(
    attemptId: string,
    testType: 'domino' | 'mcq'
  ): Promise<void> {
    this.isLoading = true;
    try {
      const response = await this.testService
        .getAttemptResults(attemptId)
        .toPromise();
      const data = response?.data;
      if (data && data.attempt && data.attempt.testId) {
        // testId is the populated test object
        const attemptResult = {
          attempt: data.attempt,
          test: data.attempt.testId,
        };
        if (testType === 'domino') {
          this.loadDominoTestData(attemptResult);
        } else {
          this.loadMultipleChoiceTestData(attemptResult);
        }
      }
    } catch (error) {
      console.error(
        `Error loading ${testType} test data from attempt ${attemptId}:`,
        error
      );
    } finally {
      // isLoading will be set to false by the caller (ngOnInit) after all promises resolve
    }
  }

  private async loadRealDataForPDF(): Promise<void> {
    if (!this.attemptId) {
      console.warn(
        'loadRealDataForPDF called without a generic attemptId. Data should be loaded via ngOnInit inputs or specific attempt IDs.'
      );
      return;
    }
    try {
      console.log(
        'loadRealDataForPDF: Fetching data for attemptId:',
        this.attemptId
      );
      const response = await this.testService
        .getAttemptResults(this.attemptId)
        .toPromise();
      const data = response?.data;

      if (data && data.attempt && data.attempt.testId) {
        const testDetailsObject = data.attempt.testId; // This is the populated test object

        let testNameFromDetails = '';
        let testTypeFromDetails = '';

        if (
          testDetailsObject &&
          typeof testDetailsObject === 'object' &&
          testDetailsObject !== null
        ) {
          const nameVal = (testDetailsObject as any).name;
          const typeVal = (testDetailsObject as any).type;

          testNameFromDetails =
            typeof nameVal === 'string' ? nameVal.toLowerCase() : '';
          testTypeFromDetails =
            typeof typeVal === 'string' ? typeVal.toLowerCase() : '';

          console.log(
            `loadRealDataForPDF: testName='${nameVal}', testType='${typeVal}' -> nameLower='${testNameFromDetails}', typeLower='${testTypeFromDetails}'`
          );
        } else {
          console.warn(
            'loadRealDataForPDF: testDetailsObject is not a populated object or is null:',
            testDetailsObject
          );
        }

        const attemptResult = {
          attempt: data.attempt,
          test: testDetailsObject,
        };

        if (
          testNameFromDetails.includes('domino') ||
          testTypeFromDetails.includes('domino')
        ) {
          console.log(
            'loadRealDataForPDF: Classified as Domino, loading domino data.'
          );
          this.loadDominoTestData(attemptResult);
        } else {
          console.log(
            'loadRealDataForPDF: Classified as MCQ (or default), loading MCQ data.'
          );
          this.loadMultipleChoiceTestData(attemptResult);
        }
      } else {
        console.warn(
          'No data or incomplete attempt details found in loadRealDataForPDF for attemptId:',
          this.attemptId,
          data
        );
      }
    } catch (error) {
      console.error('Error in loadRealDataForPDF:', error);
    }
  }

  private calculatePerformanceLevel(score: number): Performance {
    if (score >= 90)
      return {
        level: 'Excellent',
        label: 'Excellent Performance',
        color: '#10B981',
        description:
          'Outstanding cognitive abilities demonstrated. Exceptional problem-solving skills and pattern recognition.',
      };
    if (score >= 80)
      return {
        level: 'Very Good',
        label: 'Very Good Performance',
        color: '#3B82F6',
        description:
          'Strong cognitive abilities with excellent analytical thinking and reasoning skills.',
      };
    if (score >= 70)
      return {
        level: 'Good',
        label: 'Good Performance',
        color: '#8B5CF6',
        description:
          'Good cognitive performance with solid problem-solving capabilities.',
      };
    if (score >= 60)
      return {
        level: 'Average',
        label: 'Average Performance',
        color: '#F59E0B',
        description:
          'Average cognitive abilities. Room for improvement in analytical thinking.',
      };
    if (score >= 50)
      return {
        level: 'Below Average',
        label: 'Below Average Performance',
        color: '#EF4444',
        description:
          'Below average performance. Additional training and development recommended.',
      };
    return {
      level: 'Needs Improvement',
      label: 'Needs Improvement',
      color: '#DC2626',
      description:
        'Significant improvement needed. Consider additional training and support.',
    };
  }

  private formatTimeSpent(ms: number): string {
    if (isNaN(ms) || ms < 0) return 'N/A';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  async generatePDF() {
    this.isLoading = true;
    try {
      // Ensure data is loaded if not already by ngOnInit
      // This is a safety net if the component is used in a way that ngOnInit didn't get all data
      // and a generic attemptId was provided for the PDF button to trigger loading.
      if (
        !this.dominoTestData &&
        !this.multipleChoiceTestData &&
        this.attemptId
      ) {
        await this.loadRealDataForPDF();
      }

      if (!this.dominoTestData && !this.multipleChoiceTestData) {
        console.warn(
          'No real test data available for PDF generation. Creating sample data as fallback.'
        );
        this.createSampleData();
      }

      const docDefinition: any = {
        content: [
          {
            table: {
              widths: ['*', 'auto'],
              body: [
                [
                  {
                    text: 'COFAT RECRUITMENT\nPSYCHOLOGICAL ASSESSMENT REPORT',
                    style: 'title',
                  },
                  {
                    text: `Report Date: ${new Date().toLocaleDateString()}\nReport ID: ${this.generateReportId()}`,
                    style: 'reportInfo',
                    alignment: 'right',
                  },
                ],
              ],
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 30],
          },
          {
            text: 'CANDIDATE INFORMATION',
            style: 'sectionHeader',
            margin: [0, 0, 0, 10],
          },
          {
            table: {
              widths: ['30%', '70%'],
              body: [
                ['Full Name:', this.userInfo?.firstName + ' ' + this.userInfo?.lastName],
                ['Email Address:', this.userInfo?.email],
                ['Role/Level:', this.userInfo?.educationLevel],
                ['Date of Birth:',this.userInfo?.dateOfBirth ? new Date(this.userInfo.dateOfBirth).toLocaleDateString('en-US', this.dateOptions) : 'N/A'],
                ['Assessment Date:', this.userInfo?.testAssignment?.examDate ? new Date(this.userInfo?.testAssignment?.examDate).toLocaleDateString('en-US', this.dateOptions) : 'N/A'],
              ],
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 25],
          },
          {
            text: 'EXECUTIVE SUMMARY',
            style: 'sectionHeader',
            margin: [0, 0, 0, 10],
          },
          {
            text: this.generateExecutiveSummary(),
            style: 'normalText',
            margin: [0, 0, 0, 25],
          },
          ...(this.dominoTestData ? this.getDominoTestContent() : []),
          ...(this.multipleChoiceTestData
            ? this.getMultipleChoiceTestContent()
            : []),
          {
            text: 'OVERALL ASSESSMENT & RECOMMENDATIONS',
            style: 'sectionHeader',
            margin: [0, 20, 0, 10],
          },
          {
            text: this.generateDetailedRecommendations(),
            style: 'normalText',
            margin: [0, 0, 0, 20],
          },
          {
            table: {
              widths: ['50%', '50%'],
              body: [
                [
                  {
                    text: [
                      `Evaluated by:\n`,
                      { text: this.psychologistInfo.name, bold: true },
                      `\n${this.psychologistInfo.title}`,
                    ],
                    style: 'footer',
                  },
                  {
                    text: [
                      `Digital Recruitment Platform\n`,
                      'Confidential Assessment Report\n',
                      `Generated: ${new Date().toLocaleString()}`,
                    ],
                    style: 'footer',
                    alignment: 'right',
                  },
                ],
              ],
            },
            layout: 'noBorders',
            margin: [0, 40, 0, 0],
          },
        ],
        styles: {
          title: { fontSize: 16, bold: true, color: '#1e40af' },
          sectionHeader: {
            fontSize: 14,
            bold: true,
            color: '#374151',
            margin: [0, 15, 0, 5],
          },
          header: {
            fontSize: 13,
            bold: true,
            color: '#4b5563',
            margin: [0, 10, 0, 5],
          },
          subheader: {
            fontSize: 12,
            bold: true,
            color: '#6b7280',
            margin: [0, 8, 0, 3],
          },
          normalText: { fontSize: 10, lineHeight: 1.4, color: '#374151' },
          reportInfo: { fontSize: 9, color: '#6b7280' },
          footer: { fontSize: 9, color: '#6b7280', italics: true },
        },
        pageMargins: [40, 60, 40, 60],
      };

      const candidateNameForFile = (
        this.candidateInfo.name || 'Candidate'
      ).replace(/[^a-zA-Z0-9]/g, '_');
      pdfMakeWithFonts
        .createPdf(docDefinition)
        .download(
          `${candidateNameForFile}_Assessment_Report_${
            new Date().toISOString().split('T')[0]
          }.pdf`
        );
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.fallbackToPrint();
    } finally {
      this.isLoading = false;
    }
  }

  private getDominoTestContent(): any[] {
    if (!this.dominoTestData) return [];
    const performance = this.dominoTestData.performance;
    const testName = this.dominoTestData.testName || 'Domino Test';
    const testDescription =
      this.dominoTestData.testDescription || 'Logical Reasoning Assessment';

    return [
      {
        text: `${testName.toUpperCase()} - ${testDescription}`,
        style: 'sectionHeader',
        margin: [0, 20, 0, 10],
      },
      {
        table: {
          widths: ['30%', '70%'],
          body: [
            ['Test Name:', testName],
            ['Description:', testDescription],
            [
              'Difficulty Level:',
              this.capitalize(this.dominoTestData.difficulty || 'N/A'),
            ],
            [
              'Allocated Time:',
              `${this.dominoTestData.duration || 'N/A'} minutes`,
            ],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 15],
      },
      {
        table: {
          widths: ['100%'],
          body: [
            [
              {
                text: `Final Score: ${
                  this.dominoTestData.percentageScore || 0
                }%`,
                style: 'title',
                alignment: 'center',
                fillColor: '#EBF4FF',
                margin: [0, 15, 0, 15],
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 20],
      },
      { text: 'DETAILED RESULTS', style: 'subheader', margin: [0, 0, 0, 10] },
      {
        table: {
          widths: ['40%', '60%'],
          body: [
            [
              'Correct Answers:',
              `${this.dominoTestData.score || '0'}/${
                this.dominoTestData.totalQuestions || '0'
              }`,
            ],
            [
              'Questions Answered:',
              `${this.dominoTestData.questionsAnswered || '0'}/${
                this.dominoTestData.totalQuestions || '0'
              }`,
            ],
            ['Questions Skipped:', this.dominoTestData.questionsSkipped || '0'],
            ['Time Spent:', this.dominoTestData.timeSpent || 'N/A'],
            ['Performance Level:', performance?.level || 'N/A'],
            ['Start Time:', this.dominoTestData.startTime || 'N/A'],
            ['End Time:', this.dominoTestData.endTime || 'N/A'],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 15],
      },
      {
        text: 'PERFORMANCE ANALYSIS',
        style: 'subheader',
        margin: [0, 15, 0, 10],
      },
      {
        text: performance?.description || 'No specific analysis available.',
        style: 'normalText',
        margin: [0, 0, 0, 10],
      },
      { text: 'TECHNICAL DETAILS', style: 'subheader', margin: [0, 15, 0, 10] },
      {
        table: {
          widths: ['40%', '60%'],
          body: [
            ['Device Used:', this.dominoTestData.device || 'Unknown'],
            ['Browser:', this.dominoTestData.browser || 'Unknown'],
            [
              'Completion Rate:',
              `${Math.round(
                ((this.dominoTestData.questionsAnswered || 0) /
                  (this.dominoTestData.totalQuestions || 1)) *
                  100
              )}%`,
            ],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 20],
      },
    ];
  }

  private getMultipleChoiceTestContent(): any[] {
    if (!this.multipleChoiceTestData) return [];
    const performance = this.multipleChoiceTestData.performance;
    const testName =
      this.multipleChoiceTestData.testName || 'Multiple Choice Test';
    const testDescription =
      this.multipleChoiceTestData.testDescription || 'Comprehension Assessment';

    return [
      {
        text: `${testName.toUpperCase()} - ${testDescription}`,
        style: 'sectionHeader',
        margin: [0, 20, 0, 10],
      },
      {
        table: {
          widths: ['30%', '70%'],
          body: [
            ['Test Name:', testName],
            ['Description:', testDescription],
            [
              'Difficulty Level:',
              this.capitalize(this.multipleChoiceTestData.difficulty || 'N/A'),
            ],
            [
              'Allocated Time:',
              `${this.multipleChoiceTestData.duration || 'N/A'} minutes`,
            ],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 15],
      },
      {
        table: {
          widths: ['100%'],
          body: [
            [
              {
                text: `Final Score: ${
                  this.multipleChoiceTestData.percentageScore || 0
                }%`,
                style: 'title',
                alignment: 'center',
                fillColor: '#F0FDF4',
                margin: [0, 15, 0, 15],
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 20],
      },
      { text: 'DETAILED RESULTS', style: 'subheader', margin: [0, 0, 0, 10] },
      {
        table: {
          widths: ['40%', '60%'],
          body: [
            [
              'Correct Answers:',
              this.multipleChoiceTestData.correctAnswers || '0',
            ],
            ['Wrong Answers:', this.multipleChoiceTestData.wrongAnswers || '0'],
            [
              'Total Questions:',
              this.multipleChoiceTestData.totalQuestions || '0',
            ],
            [
              'Questions Answered:',
              `${this.multipleChoiceTestData.questionsAnswered || '0'}/${
                this.multipleChoiceTestData.totalQuestions || '0'
              }`,
            ],
            [
              'Questions Skipped:',
              this.multipleChoiceTestData.questionsSkipped || '0',
            ],
            ['Time Spent:', this.multipleChoiceTestData.timeSpent || 'N/A'],
            ['Performance Level:', performance?.level || 'N/A'],
            ['Start Time:', this.multipleChoiceTestData.startTime || 'N/A'],
            ['End Time:', this.multipleChoiceTestData.endTime || 'N/A'],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 15],
      },
      {
        text: 'PERFORMANCE ANALYSIS',
        style: 'subheader',
        margin: [0, 15, 0, 10],
      },
      {
        text: performance?.description || 'No specific analysis available.',
        style: 'normalText',
        margin: [0, 0, 0, 10],
      },
      { text: 'TECHNICAL DETAILS', style: 'subheader', margin: [0, 15, 0, 10] },
      {
        table: {
          widths: ['40%', '60%'],
          body: [
            ['Device Used:', this.multipleChoiceTestData.device || 'Unknown'],
            ['Browser:', this.multipleChoiceTestData.browser || 'Unknown'],
            [
              'Completion Rate:',
              `${Math.round(
                ((this.multipleChoiceTestData.questionsAnswered || 0) /
                  (this.multipleChoiceTestData.totalQuestions || 1)) *
                  100
              )}%`,
            ],
            [
              'Accuracy Rate:',
              `${Math.round(
                ((this.multipleChoiceTestData.correctAnswers || 0) /
                  (this.multipleChoiceTestData.questionsAnswered || 1)) *
                  100
              )}%`,
            ],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 20],
      },
    ];
  }

  private createSampleData() {
    console.warn('Creating sample data for PDF as real data is unavailable.');
    if (
      this.candidateInfo.name === 'Loading...' ||
      this.candidateInfo.name === 'N/A'
    ) {
      this.candidateInfo = {
        name: 'Sample Candidate',
        email: 'sample@example.com',
        level: 'Candidate',
        birthday: '01/01/1990',
        testDate: new Date().toLocaleDateString(),
        profileImage: 'assets/images/testimonial-avatar.jpg',
      };
    }
    this.dominoTestData = {
      testName: 'Sample Domino Test (D-SAMPLE)',
      testDescription: 'Sample Logical Reasoning Assessment',
      difficulty: 'medium',
      duration: 30,
      score: 15,
      totalQuestions: 25,
      percentageScore: 60,
      timeSpent: '18m 45s',
      questionsAnswered: 22,
      questionsSkipped: 3,
      startTime: new Date(Date.now() - 1800000).toLocaleString(),
      endTime: new Date().toLocaleString(),
      device: 'Sample Device',
      browser: 'Sample Browser',
      performance: this.calculatePerformanceLevel(60),
    };
    this.hasDominoTest = true;
  }

  private generateReportId(): string {
    return `RPT-${Date.now().toString().slice(-8)}`;
  }

  private capitalize(str: string): string {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
  }

  private fallbackToPrint() {
    console.warn('Fallback: Triggering browser print dialog.');
    window.print();
  }

  private generateExecutiveSummary(): string {
    const dominoScore = this.dominoTestData?.percentageScore;
    const mcqScore = this.multipleChoiceTestData?.percentageScore;
    let overallScoreText = 'N/A';
    let summary = `This report summarizes the candidate's performance in the psychological assessments. `;

    if (
      this.dominoTestData &&
      this.multipleChoiceTestData &&
      dominoScore !== undefined &&
      mcqScore !== undefined
    ) {
      const overallScore = Math.round((dominoScore + mcqScore) / 2);
      overallScoreText = `${overallScore}%`;
      summary += `The candidate completed both logical reasoning (${dominoScore}%) and comprehension (${mcqScore}%) assessments, achieving an overall performance score of ${overallScoreText}. `;
    } else if (this.dominoTestData && dominoScore !== undefined) {
      overallScoreText = `${dominoScore}%`;
      summary += `The candidate completed the logical reasoning assessment, achieving a performance score of ${overallScoreText}. `;
    } else if (this.multipleChoiceTestData && mcqScore !== undefined) {
      overallScoreText = `${mcqScore}%`;
      summary += `The candidate completed the comprehension assessment, achieving a performance score of ${overallScoreText}. `;
    } else {
      summary += 'Test data is incomplete for a full summary. ';
    }
    return (
      summary +
      `Overall Score: ${overallScoreText}. Further details are provided in the respective test sections and recommendations.`
    );
  }

  private generateDetailedRecommendations(): string {
    let recommendations = this.generateRecommendations();
    recommendations +=
      '\n\nSpecific Development Areas based on this assessment:\n';

    if (
      this.dominoTestData &&
      this.dominoTestData.percentageScore !== undefined
    ) {
      if (this.dominoTestData.percentageScore < 70)
        recommendations +=
          '• Focus on enhancing logical deduction and pattern identification skills for domino-based tasks.\n';
      if ((this.dominoTestData.questionsSkipped || 0) > 0)
        recommendations +=
          '• Improve time management and decisiveness under pressure for logical tests.\n';
    }

    if (
      this.multipleChoiceTestData &&
      this.multipleChoiceTestData.percentageScore !== undefined
    ) {
      if (this.multipleChoiceTestData.percentageScore < 70)
        recommendations +=
          '• Strengthen reading comprehension and critical analysis for text-based questions.\n';
      if ((this.multipleChoiceTestData.questionsSkipped || 0) > 0)
        recommendations +=
          '• Build confidence in tackling multiple-choice questions within timed conditions.\n';
    }

    if (recommendations.endsWith('assessment:\n')) {
      recommendations +=
        'No specific areas for development highlighted based on available data, or performance was satisfactory.\n';
    }

    recommendations +=
      '\nConsider these points for a tailored development plan. Follow-up assessments can track progress.';
    return recommendations;
  }

  private generateRecommendations(): string {
    const dominoLevel = this.dominoTestData?.performance?.level;
    const mcqLevel = this.multipleChoiceTestData?.performance?.level;
    let baseRec = 'Based on the assessment results: ';

    if (
      dominoLevel === 'Excellent' ||
      mcqLevel === 'Excellent' ||
      dominoLevel === 'Very Good' ||
      mcqLevel === 'Very Good'
    ) {
      baseRec +=
        'The candidate demonstrates strong to excellent cognitive abilities. They are likely well-suited for roles requiring significant analytical thinking, problem-solving, and learning agility. ';
    } else if (dominoLevel === 'Good' || mcqLevel === 'Good') {
      baseRec +=
        'The candidate shows good cognitive capabilities. They should be capable of handling roles with moderate complexity and can further develop with experience and targeted training. ';
    } else if (dominoLevel === 'Average' || mcqLevel === 'Average') {
      baseRec +=
        "The candidate's cognitive performance is average. They may benefit from structured learning and support in roles requiring higher-level analytical skills. ";
    } else {
      baseRec +=
        "The candidate's performance suggests areas for development in cognitive skills. Targeted training and support are recommended. ";
    }
    return baseRec;
  }

  public exportToPDF() {
    this.generatePDF();
  }
}
