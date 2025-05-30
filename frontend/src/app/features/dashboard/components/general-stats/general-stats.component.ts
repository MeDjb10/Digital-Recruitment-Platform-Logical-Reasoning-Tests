import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  AfterViewInit,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TestService } from '../../../../core/services/test.service';
import { UserService } from '../../../../core/services/user.service';
import { TestAttempt } from '../../../../core/models/attempt.model';
import { User } from '../../../../core/models/user.model';
import { Test } from '../../../../core/models/test.model';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

// PrimeNG Imports
import { TabViewModule } from 'primeng/tabview';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';

// Chart Library - Imported dynamically to avoid SSR issues
import type { ApexOptions } from 'apexcharts';

interface KpiData {
  value: number;
  trend: number;
}

interface Activity {
  id: string;
  candidate: string;
  candidateId: string;
  action: string;
  testType: string;
  testName: string;
  score: number | null;
  date: Date;
  duration: string | null; // Time taken to complete the test
  questionsCount: number | null; // Number of questions in the test
  avatarBg: string;
}

@Component({
  selector: 'app-general-stats',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TabViewModule,
    DropdownModule,
    TableModule,
    ButtonModule,
    SelectButtonModule,
    TagModule,
    TranslateModule,
  ],
  templateUrl: './general-stats.component.html',
  styleUrls: ['./general-stats.component.css'],
})
export class GeneralStatsComponent implements OnInit, AfterViewInit {
  // Make Math available in template
  Math = Math;

  // Indicates if we're in browser environment
  isBrowser: boolean;

  // Chart instances
  private ApexCharts: any;
  private charts: { [key: string]: any } = {};

  // ViewChild references for charts
  @ViewChild('candidatesSparkline') candidatesSparklineEl!: ElementRef;
  @ViewChild('completionsSparkline') completionsSparklineEl!: ElementRef;
  @ViewChild('scoreSparkline') scoreSparklineEl!: ElementRef;
  @ViewChild('conversionSparkline') conversionSparklineEl!: ElementRef;
  @ViewChild('performanceChart') performanceChartEl!: ElementRef;
  @ViewChild('categoryChart') categoryChartEl!: ElementRef;
  @ViewChild('statusChart') statusChartEl!: ElementRef;
  @ViewChild('trendsChart') trendsChartEl!: ElementRef;

  // Time period filter with translation keys
  timePeriods = [
    { label: 'DASHBOARD.ANALYTICS.TIME_PERIODS.LAST_7_DAYS ', value: '7d' },
    { label: 'DASHBOARD.ANALYTICS.TIME_PERIODS.LAST_30_DAYS', value: '30d' },
    { label: 'DASHBOARD.ANALYTICS.TIME_PERIODS.LAST_QUARTER', value: '90d' },
    { label: 'DASHBOARD.ANALYTICS.TIME_PERIODS.YEAR_TO_DATE', value: '365d' },
  ];
  selectedTimePeriod = this.timePeriods[1];

  // Trend view options
  trendOptions = [
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' },
  ];
  selectedTrendView = this.trendOptions[0];

  // Activity filters
  activityFilters = [
    { label: 'All Activities', value: 'all' },
    { label: 'Test Completions', value: 'completed' },
    { label: 'New Registrations', value: 'registered' },
  ];
  selectedActivityFilter = this.activityFilters[0];
  // KPI Metrics
  kpis = {
    candidates: { value: 0, trend: 0 },
    completions: { value: 0, trend: 0 },
    avgScore: { value: 0, trend: 0 },
    conversion: { value: 0, trend: 0 },
  };

  // Loading states
  isLoadingKpis = false;
  isLoadingActivities = false;
  kpisError: string | null = null;
  activitiesError: string | null = null;

  // Recent Activities
  recentActivities: Activity[] = [];

  // Chart data
  private sparklineData = {
    candidates: [32, 45, 38, 59, 48, 63, 72],
    completions: [18, 24, 22, 34, 29, 33, 42],
    score: [74, 76, 73, 79, 75, 72, 76],
    conversion: [48, 53, 49, 52, 47, 51, 54],
  };

  // Performance data by test type
  private testPerformanceData = {
    categories: [
      'Logical Reasoning',
      'Verbal Reasoning',
      'Numerical',
      'Personality',
      'Situational',
    ],
    avgScores: [72, 68, 65, 88, 79],
    passingRates: [62, 58, 52, 92, 71],
  };

  // Test category distribution
  private categoryDistData = {
    labels: ['Logical', 'Verbal', 'Numerical', 'Personality', 'Situational'],
    series: [38, 25, 20, 10, 7],
  };

  // Test status distribution
  private statusDistData = {
    labels: ['Completed', 'In Progress', 'Abandoned', 'Expired'],
    series: [64, 18, 12, 6],
  };

  // Trend data for performance over time
  private trendData = {
    weekly: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
      candidates: [210, 245, 278, 302, 345, 389],
      completions: [145, 168, 190, 212, 243, 267],
      scores: [72, 74, 71, 75, 78, 76],
    },
    monthly: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      candidates: [820, 932, 1051, 1178, 1324, 1491],
      completions: [612, 702, 792, 894, 1012, 1143],
      scores: [70, 72, 71, 73, 76, 75],
    },
    quarterly: {
      labels: [
        'Q1 2023',
        'Q2 2023',
        'Q3 2023',
        'Q4 2023',
        'Q1 2024',
        'Q2 2024',
      ],
      candidates: [2430, 2710, 3150, 3580, 4120, 4650],
      completions: [1820, 2021, 2312, 2645, 3080, 3425],
      scores: [68, 70, 72, 73, 75, 78],
    },
  };

  // For translated dropdown options
  translatedTimePeriods: any[] = [];
  translatedTrendOptions: any[] = [];
  translatedActivityFilters: any[] = [];
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private translateService: TranslateService,
    private testService: TestService,
    private userService: UserService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }
  ngOnInit() {
    // Load real data from backend
    this.loadKpiData();
    this.loadRecentActivities();

    // Setup translations for dropdown options
    this.updateTranslatedOptions();

    // Subscribe to language changes to update translated options
    this.translateService.onLangChange.subscribe(() => {
      this.updateTranslatedOptions();
    });

    // Dynamically import ApexCharts only in browser environment
    if (this.isBrowser) {
      import('apexcharts').then((module) => {
        this.ApexCharts = module.default;
      });
    }
  }

  ngAfterViewInit() {
    // Only initialize charts in browser environment with delay to ensure module is loaded
    if (this.isBrowser) {
      setTimeout(() => {
        this.initCharts();
      }, 300); // Added longer delay to ensure ApexCharts is loaded
    }
  }

  // Initialize all charts
  private initCharts() {
    if (!this.ApexCharts) return; // Skip if ApexCharts isn't loaded yet

    this.initSparklineCharts();
    this.initPerformanceChart();
    this.initDistributionCharts();
    this.initTrendsChart();
  }

  // Initialize small sparkline charts for KPI cards
  private initSparklineCharts() {
    if (!this.ApexCharts) return;

    const commonOptions = {
      chart: {
        type: 'area' as const,
        height: 30,
        sparkline: { enabled: true },
        animations: { enabled: true },
      },
      stroke: {
        curve: 'smooth' as const,
        width: 2,
      },
      fill: {
        opacity: 0.3,
      },
      tooltip: {
        fixed: { enabled: false },
        x: { show: false },
        marker: { show: false },
      },
    };

    try {
      // Candidates sparkline
      if (this.candidatesSparklineEl?.nativeElement) {
        this.charts['candidates'] = new this.ApexCharts(
          this.candidatesSparklineEl.nativeElement,
          {
            ...commonOptions,
            series: [
              { name: 'Candidates', data: this.sparklineData.candidates },
            ],
            colors: ['#4F46E5'],
          }
        );
        this.charts['candidates']?.render();
      }

      // Completions sparkline
      if (this.completionsSparklineEl?.nativeElement) {
        this.charts['completions'] = new this.ApexCharts(
          this.completionsSparklineEl.nativeElement,
          {
            ...commonOptions,
            series: [
              { name: 'Completions', data: this.sparklineData.completions },
            ],
            colors: ['#10B981'],
          }
        );
        this.charts['completions']?.render();
      }

      // Score sparkline
      if (this.scoreSparklineEl?.nativeElement) {
        this.charts['score'] = new this.ApexCharts(
          this.scoreSparklineEl.nativeElement,
          {
            ...commonOptions,
            series: [{ name: 'Avg. Score', data: this.sparklineData.score }],
            colors: ['#F59E0B'],
          }
        );
        this.charts['score']?.render();
      }

      // Conversion sparkline
      if (this.conversionSparklineEl?.nativeElement) {
        this.charts['conversion'] = new this.ApexCharts(
          this.conversionSparklineEl.nativeElement,
          {
            ...commonOptions,
            series: [
              { name: 'Conversion', data: this.sparklineData.conversion },
            ],
            colors: ['#EC4899'],
          }
        );
        this.charts['conversion']?.render();
      }
    } catch (error) {
      console.error('Error initializing sparkline charts:', error);
    }
  }

  // Initialize performance chart by test type
  private initPerformanceChart() {
    if (!this.ApexCharts || !this.performanceChartEl?.nativeElement) return;

    try {
      this.charts['performance'] = new this.ApexCharts(
        this.performanceChartEl.nativeElement,
        {
          chart: {
            type: 'bar',
            height: 350,
            toolbar: {
              show: false,
            },
            fontFamily: 'inherit',
          },
          plotOptions: {
            bar: {
              horizontal: false,
              columnWidth: '60%',
              borderRadius: 4,
            },
          },
          dataLabels: {
            enabled: false,
          },
          stroke: {
            show: true,
            width: 2,
            colors: ['transparent'],
          },
          xaxis: {
            categories: this.testPerformanceData.categories,
            labels: {
              style: {
                fontSize: '12px',
              },
            },
          },
          yaxis: {
            title: {
              text: 'Percentage (%)',
            },
            min: 0,
            max: 100,
            forceNiceScale: true,
          },
          fill: {
            opacity: 1,
          },
          tooltip: {
            y: {
              formatter: function (val: number) {
                return val + '%';
              },
            },
          },
          legend: {
            position: 'top',
            horizontalAlign: 'right',
          },
          series: [
            {
              name: 'Average Score',
              data: this.testPerformanceData.avgScores,
              color: '#4F46E5',
            },
            {
              name: 'Passing Rate',
              data: this.testPerformanceData.passingRates,
              color: '#10B981',
            },
          ],
        }
      );

      this.charts['performance']?.render();
    } catch (error) {
      console.error('Error initializing performance chart:', error);
    }
  }

  // Initialize distribution charts
  private initDistributionCharts() {
    if (!this.ApexCharts) return;

    try {
      // Test Category Distribution
      if (this.categoryChartEl?.nativeElement) {
        this.charts['category'] = new this.ApexCharts(
          this.categoryChartEl.nativeElement,
          {
            chart: {
              type: 'donut',
              height: 280,
              fontFamily: 'inherit',
            },
            labels: this.categoryDistData.labels,
            series: this.categoryDistData.series,
            colors: ['#4F46E5', '#EC4899', '#F59E0B', '#10B981', '#6366F1'],
            legend: {
              position: 'bottom',
              fontSize: '12px',
            },
            plotOptions: {
              pie: {
                donut: {
                  size: '60%',
                  labels: {
                    show: true,
                    name: {
                      show: true,
                    },
                    value: {
                      show: true,
                      formatter: function (val: any) {
                        return val + '%';
                      },
                    },
                    total: {
                      show: true,
                      formatter: function () {
                        return '100%';
                      },
                    },
                  },
                },
              },
            },
            dataLabels: {
              enabled: false,
            },
            responsive: [
              {
                breakpoint: 480,
                options: {
                  chart: {
                    height: 250,
                  },
                  legend: {
                    position: 'bottom',
                    offsetY: 0,
                  },
                },
              },
            ],
          }
        );
        this.charts['category']?.render();
      }

      // Test Status Distribution
      if (this.statusChartEl?.nativeElement) {
        this.charts['status'] = new this.ApexCharts(
          this.statusChartEl.nativeElement,
          {
            chart: {
              type: 'pie',
              height: 280,
              fontFamily: 'inherit',
            },
            labels: this.statusDistData.labels,
            series: this.statusDistData.series,
            colors: ['#10B981', '#6366F1', '#F59E0B', '#EF4444'],
            legend: {
              position: 'bottom',
              fontSize: '12px',
            },
            plotOptions: {
              pie: {
                expandOnClick: true,
              },
            },
            dataLabels: {
              formatter: function (val: any, opts: any) {
                return opts.w.config.series[opts.seriesIndex] + '%';
              },
            },
            responsive: [
              {
                breakpoint: 480,
                options: {
                  chart: {
                    height: 250,
                  },
                  legend: {
                    position: 'bottom',
                    offsetY: 0,
                  },
                },
              },
            ],
          }
        );
        this.charts['status']?.render();
      }
    } catch (error) {
      console.error('Error initializing distribution charts:', error);
    }
  }

  // Initialize trends chart
  private initTrendsChart() {
    if (!this.ApexCharts || !this.trendsChartEl?.nativeElement) return;

    try {
      const data =
        this.trendData[
          this.selectedTrendView.value as keyof typeof this.trendData
        ];

      this.charts['trends'] = new this.ApexCharts(
        this.trendsChartEl.nativeElement,
        {
          chart: {
            height: 350,
            type: 'line',
            toolbar: {
              show: true,
              tools: {
                download: true,
                selection: false,
                zoom: false,
                zoomin: false,
                zoomout: false,
                pan: false,
                reset: false,
              },
            },
            fontFamily: 'inherit',
            dropShadow: {
              enabled: true,
              top: 3,
              left: 2,
              blur: 4,
              opacity: 0.1,
            },
          },
          stroke: {
            curve: 'smooth',
            width: [3, 3, 2],
          },
          markers: {
            size: 4,
            strokeWidth: 0,
            hover: {
              size: 6,
            },
          },
          grid: {
            borderColor: '#f1f1f1',
          },
          xaxis: {
            categories: data.labels,
            labels: {
              style: {
                fontSize: '12px',
              },
            },
          },
          yaxis: [
            {
              title: {
                text: 'Candidates',
              },
              min: Math.min(...data.candidates) * 0.8,
              max: Math.max(...data.candidates) * 1.1,
              tickAmount: 5,
              axisTicks: {
                show: true,
              },
              axisBorder: {
                show: true,
              },
            },
            {
              title: {
                text: 'Completions',
              },
              opposite: true,
              min: Math.min(...data.completions) * 0.8,
              max: Math.max(...data.completions) * 1.1,
              tickAmount: 5,
              axisTicks: {
                show: true,
              },
              axisBorder: {
                show: true,
              },
            },
            {
              title: {
                text: 'Score (%)',
              },
              min: 0,
              max: 100,
              tickAmount: 5,
              opposite: true,
              axisTicks: {
                show: true,
              },
              axisBorder: {
                show: true,
              },
              labels: {
                offsetX: -15,
                offsetY: 0,
              },
            },
          ],
          tooltip: {
            shared: true,
            intersect: false,
          },
          legend: {
            position: 'top',
            horizontalAlign: 'center',
          },
          series: [
            {
              name: 'Candidates',
              type: 'line',
              data: data.candidates,
              color: '#4F46E5',
            },
            {
              name: 'Completions',
              type: 'line',
              data: data.completions,
              color: '#10B981',
            },
            {
              name: 'Avg. Score',
              type: 'line',
              data: data.scores,
              color: '#F59E0B',
            },
          ],
          responsive: [
            {
              breakpoint: 768,
              options: {
                chart: {
                  height: 300,
                },
                yaxis: [{ show: false }, { show: false }, { show: false }],
                legend: {
                  position: 'bottom',
                },
              },
            },
          ],
        }
      );

      this.charts['trends']?.render();
    } catch (error) {
      console.error('Error initializing trends chart:', error);
    }
  }
  // Update charts when time period changes
  onTimePeriodChange() {
    if (!this.isBrowser) return;

    // Reload all data from backend based on selected time period
    this.loadKpiData();
    this.loadRecentActivities();

    // Update charts with new data
    this.initCharts();
  }

  // Update trend chart when view changes
  onTrendViewChange() {
    if (!this.isBrowser || !this.ApexCharts || !this.charts['trends']) return;

    try {
      const data =
        this.trendData[
          this.selectedTrendView.value as keyof typeof this.trendData
        ];

      this.charts['trends'].updateOptions({
        xaxis: {
          categories: data.labels,
        },
        series: [
          {
            name: 'Candidates',
            data: data.candidates,
          },
          {
            name: 'Completions',
            data: data.completions,
          },
          {
            name: 'Avg. Score',
            data: data.scores,
          },
        ],
      });
    } catch (error) {
      console.error('Error updating trend view:', error);
    }
  } // Load recent test attempts from backend
  loadRecentActivities() {
    this.isLoadingActivities = true;
    this.activitiesError = null;

    // Use the new getRecentAttempts method
    this.testService.getRecentAttempts(15).subscribe({
      next: (attempts: TestAttempt[]) => {
        if (attempts.length > 0) {
          this.loadCandidateInfo(attempts);
        } else {
          // No attempts available, use mock data
          this.generateMockActivities();
          this.isLoadingActivities = false;
        }
      },
      error: (error) => {
        console.error('Error loading recent attempts:', error);
        this.activitiesError = 'Failed to load recent activities';
        this.isLoadingActivities = false;
        // Fallback to mock data if API fails
        this.generateMockActivities();
      },
    });
  }
  // Load candidate information for the attempts
  private loadCandidateInfo(attempts: TestAttempt[]) {
    if (attempts.length === 0) {
      this.recentActivities = [];
      this.isLoadingActivities = false;
      return;
    }

    // Get unique candidate IDs
    const candidateIds = [
      ...new Set(attempts.map((attempt) => attempt.candidateId)),
    ];

    // Fetch candidate information
    const candidateRequests = candidateIds.map((candidateId) =>
      this.userService.getUserById(candidateId).pipe(
        map((userResponse) => userResponse.user),
        catchError(() => of(null))
      )
    );

    // Also get test information for each attempt
    const testIds = [...new Set(attempts.map((attempt) => attempt.testId))];
    const testRequests = testIds.map((testId) =>
      this.testService.getTestById(testId).pipe(
        map((testResponse) => testResponse.data),
        catchError(() => of(null))
      )
    );

    forkJoin([forkJoin(candidateRequests), forkJoin(testRequests)]).subscribe({
      next: ([candidates, tests]) => {
        // Create maps for quick lookup
        const candidateMap = new Map<string, User | null>();
        candidateIds.forEach((id, index) => {
          candidateMap.set(id, candidates[index]);
        });

        const testMap = new Map<string, Test | null>();
        testIds.forEach((id, index) => {
          testMap.set(id, tests[index]);
        });

        // Transform attempts to activities
        this.recentActivities = attempts.map((attempt, index) => {
          const candidate = candidateMap.get(attempt.candidateId);
          const test = testMap.get(attempt.testId);

          const candidateName = candidate
            ? `${candidate.firstName} ${candidate.lastName}`
            : 'Unknown User';

          const testName = test ? test.name : 'Unknown Test';
          const testType = test ? test.type || 'General' : 'General';

          // Determine action based on status
          let action = 'Started test';
          if (attempt.status === 'completed') {
            action = 'Completed test';
          } else if (attempt.status === 'timed-out') {
            action = 'Timed out';
          } else if (attempt.status === 'abandoned') {
            action = 'Abandoned test';
          } // Calculate duration if completed
          let duration: string | null = null;
          if (attempt.endTime && attempt.startTime) {
            const durationMs =
              new Date(attempt.endTime).getTime() -
              new Date(attempt.startTime).getTime();
            const durationMinutes = Math.round(durationMs / (1000 * 60));
            duration = `${durationMinutes}m`;
          }

          // Get questions count from test data
          const testData = testMap.get(attempt.testId);
          const questionsCount = testData?.totalQuestions || null;

          // Generate avatar background color based on candidate ID
          const bgColors = [
            '#4F46E5',
            '#EC4899',
            '#F59E0B',
            '#10B981',
            '#6366F1',
            '#EF4444',
            '#8B5CF6',
            '#0EA5E9',
          ];
          const avatarBg = bgColors[index % bgColors.length];

          return {
            id: attempt._id,
            candidate: candidateName,
            candidateId: attempt.candidateId,
            action,
            testType,
            testName,
            score:
              attempt.status === 'completed'
                ? Math.round(attempt.percentageScore)
                : null,
            date: new Date(attempt.startTime),
            duration,
            questionsCount,
            avatarBg,
          };
        });

        this.isLoadingActivities = false;
      },
      error: (error) => {
        console.error('Error loading candidate/test information:', error);
        this.activitiesError = 'Failed to load complete information';
        this.isLoadingActivities = false; // Create activities with minimal information
        this.recentActivities = attempts.map((attempt, index) => ({
          id: attempt._id,
          candidate: 'Unknown User',
          candidateId: attempt.candidateId,
          action:
            attempt.status === 'completed' ? 'Completed test' : 'Started test',
          testType: 'General',
          testName: 'Unknown Test',
          score:
            attempt.status === 'completed'
              ? Math.round(attempt.percentageScore)
              : null,
          date: new Date(attempt.startTime),
          duration:
            attempt.endTime && attempt.startTime
              ? `${Math.round(
                  (new Date(attempt.endTime).getTime() -
                    new Date(attempt.startTime).getTime()) /
                    (1000 * 60)
                )}m`
              : null,
          questionsCount: null,
          avatarBg: '#4F46E5',
        }));
      },
    });
  }

  // Load KPI data from backend
  loadKpiData() {
    this.isLoadingKpis = true;
    this.kpisError = null;

    // Get all tests to calculate analytics
    this.testService.getAllTests().subscribe({
      next: (testsResponse) => {
        if (testsResponse.data && testsResponse.data.length > 0) {
          this.calculateKpisFromTests(testsResponse.data);
        } else {
          // No tests available, use default values
          this.kpis = {
            candidates: { value: 0, trend: 0 },
            completions: { value: 0, trend: 0 },
            avgScore: { value: 0, trend: 0 },
            conversion: { value: 0, trend: 0 },
          };
          this.isLoadingKpis = false;
        }
      },
      error: (error) => {
        console.error('Error loading KPI data:', error);
        this.kpisError = 'Failed to load KPI data';
        this.isLoadingKpis = false;
        // Set default values on error
        this.kpis = {
          candidates: { value: 0, trend: 0 },
          completions: { value: 0, trend: 0 },
          avgScore: { value: 0, trend: 0 },
          conversion: { value: 0, trend: 0 },
        };
      },
    });
  }

  // Calculate KPIs from test data
  private calculateKpisFromTests(tests: Test[]) {
    let totalAttempts = 0;
    let totalCompletions = 0;
    let totalScore = 0;
    let totalActiveTests = 0;
    let testsWithAttempts = 0;

    tests.forEach((test) => {
      if (test.analytics) {
        totalAttempts += test.analytics.attempts || 0;
        const completions =
          Math.round(
            (test.analytics.attempts * test.analytics.completionRate) / 100
          ) || 0;
        totalCompletions += completions;

        if (test.analytics.averageScore > 0) {
          totalScore += test.analytics.averageScore;
          testsWithAttempts++;
        }
      }
      if (test.isActive) {
        totalActiveTests++;
      }
    });

    // Calculate average score
    const avgScore =
      testsWithAttempts > 0 ? Math.round(totalScore / testsWithAttempts) : 0;

    // Calculate conversion rate (completions / attempts)
    const conversionRate =
      totalAttempts > 0
        ? Math.round((totalCompletions / totalAttempts) * 100)
        : 0;

    // For demo purposes, generate random trends (in real app, compare with previous period)
    this.kpis = {
      candidates: {
        value: totalAttempts,
        trend: Math.round((Math.random() * 20 - 10) * 10) / 10,
      },
      completions: {
        value: totalCompletions,
        trend: Math.round((Math.random() * 20 - 10) * 10) / 10,
      },
      avgScore: {
        value: avgScore,
        trend: Math.round((Math.random() * 10 - 5) * 10) / 10,
      },
      conversion: {
        value: conversionRate,
        trend: Math.round((Math.random() * 10 - 5) * 10) / 10,
      },
    };

    // Update sparkline data based on real data
    this.updateSparklineData();

    this.isLoadingKpis = false;
  }

  // Update sparkline data with realistic variations
  private updateSparklineData() {
    const generateSparklineData = (baseValue: number, points: number = 7) => {
      const data = [];
      for (let i = 0; i < points; i++) {
        const variation = 0.8 + Math.random() * 0.4; // ±20% variation
        data.push(Math.max(0, Math.round(baseValue * variation)));
      }
      return data;
    };

    this.sparklineData = {
      candidates: generateSparklineData(this.kpis.candidates.value / 10),
      completions: generateSparklineData(this.kpis.completions.value / 10),
      score: generateSparklineData(this.kpis.avgScore.value, 7),
      conversion: generateSparklineData(this.kpis.conversion.value, 7),
    };
  }
  // Get severity for status tag coloring  // Method to update translated options when language changes
  updateTranslatedOptions() {
    // Translate time periods
    this.translateTimePeriods();

    // Translate trend options and activity filters
    // You can add translations for these in your translation files if needed
    this.translatedTrendOptions = this.trendOptions.map((option) => ({
      ...option,
      label: option.label, // Use direct label for now or translate if needed
    }));

    this.translatedActivityFilters = this.activityFilters.map((option) => ({
      ...option,
      label: option.label, // Use direct label for now or translate if needed
    }));
  }

  // Method to translate time periods
  translateTimePeriods() {
    this.translatedTimePeriods = this.timePeriods.map((period) => {
      return {
        label: this.translateService.instant(period.label.trim()),
        value: period.value,
      };
    });

    // Update selected time period with translated version
    if (this.selectedTimePeriod) {
      const translatedSelectedOption = this.translatedTimePeriods.find(
        (option) => option.value === this.selectedTimePeriod.value
      );
      if (translatedSelectedOption) {
        this.selectedTimePeriod = translatedSelectedOption;
      }
    }
  }

  // Generate mock activity data (fallback)
  private generateMockActivities() {
    const actions = [
      'Completed test',
      'Started test',
      'Registered',
      'Abandoned test',
      'Viewed results',
    ];
    const testTypes = [
      'Logical Reasoning',
      'Verbal Reasoning',
      'Numerical',
      'Personality',
      'Situational',
    ];
    const namesFirst = [
      'John',
      'Emma',
      'Michael',
      'Sophia',
      'William',
      'Olivia',
      'James',
      'Ava',
      'Alexander',
      'Isabella',
      'Ahmed',
      'Maria',
      'Wei',
      'Fatima',
    ];
    const namesLast = [
      'Smith',
      'Johnson',
      'Williams',
      'Brown',
      'Jones',
      'Garcia',
      'Miller',
      'Davis',
      'Rodriguez',
      'Martinez',
      'Khan',
      'Li',
      'Singh',
      'Kim',
    ];
    const bgColors = [
      '#4F46E5',
      '#EC4899',
      '#F59E0B',
      '#10B981',
      '#6366F1',
      '#EF4444',
      '#8B5CF6',
      '#0EA5E9',
    ];

    // Generate 15 random activities
    this.recentActivities = Array(15)
      .fill(0)
      .map((_, i) => {
        const firstName =
          namesFirst[Math.floor(Math.random() * namesFirst.length)];
        const lastName =
          namesLast[Math.floor(Math.random() * namesLast.length)];
        const action = actions[Math.floor(Math.random() * actions.length)];
        const testType =
          testTypes[Math.floor(Math.random() * testTypes.length)];
        const daysAgo = Math.floor(Math.random() * 14);
        const hoursAgo = Math.floor(Math.random() * 24);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        date.setHours(date.getHours() - hoursAgo);

        // Only include score for completed tests
        const score =
          action === 'Completed test'
            ? Math.floor(50 + Math.random() * 50)
            : null; // Generate random duration for completed tests
        const duration =
          action === 'Completed test'
            ? `${Math.floor(10 + Math.random() * 90)}m` // 10-100 minutes
            : null;

        // Random questions count
        const questionsCount = Math.floor(5 + Math.random() * 26); // 5-30 questions

        return {
          id: (i + 1).toString(),
          candidate: `${firstName} ${lastName}`,
          candidateId: `candidate_${i + 1}`,
          action,
          testType,
          testName: `${testType} Test`,
          score,
          date,
          duration,
          questionsCount,
          avatarBg: bgColors[Math.floor(Math.random() * bgColors.length)],
        };
      });

    // Sort by date (most recent first)
    this.recentActivities.sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}
