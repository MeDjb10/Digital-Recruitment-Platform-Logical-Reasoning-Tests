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
  id: number;
  candidate: string;
  action: string;
  testType: string;
  score: number | null;
  date: Date;
  status: string;
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

  // Time period filter
  timePeriods = [
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'Last Quarter', value: '90d' },
    { label: 'Last Year', value: '365d' },
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
    candidates: { value: 1847, trend: 12.5 },
    completions: { value: 934, trend: 8.7 },
    avgScore: { value: 76, trend: -2.3 },
    conversion: { value: 51, trend: 5.2 },
  };

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

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    // Generate mock data for activities
    this.generateMockActivities();

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

    // In a real application, this would fetch new data from your API
    // For now, we'll just simulate a change with random variations

    // Update KPIs with random variations
    this.kpis = {
      candidates: {
        value: Math.floor(
          this.kpis.candidates.value * (0.9 + Math.random() * 0.2)
        ),
        trend: Math.round((Math.random() * 20 - 10) * 10) / 10,
      },
      completions: {
        value: Math.floor(
          this.kpis.completions.value * (0.9 + Math.random() * 0.2)
        ),
        trend: Math.round((Math.random() * 20 - 10) * 10) / 10,
      },
      avgScore: {
        value: Math.floor(70 + Math.random() * 10),
        trend: Math.round((Math.random() * 10 - 5) * 10) / 10,
      },
      conversion: {
        value: Math.floor(45 + Math.random() * 15),
        trend: Math.round((Math.random() * 10 - 5) * 10) / 10,
      },
    };

    // Regenerate activities based on the new time period
    this.generateMockActivities();

    // In a real application, you would update the charts with new data
    // For demo purposes, we'll just regenerate similar charts with slight variations
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
  }

  // Generate mock activity data
  generateMockActivities() {
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
    const statuses = [
      'Completed',
      'In Progress',
      'Pending',
      'Failed',
      'Passed',
      'Expired',
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
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const daysAgo = Math.floor(Math.random() * 14);
        const hoursAgo = Math.floor(Math.random() * 24);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        date.setHours(date.getHours() - hoursAgo);

        // Only include score for completed tests
        const score =
          action === 'Completed test' ||
          status === 'Completed' ||
          status === 'Passed' ||
          status === 'Failed'
            ? Math.floor(50 + Math.random() * 50)
            : null;

        return {
          id: i + 1,
          candidate: `${firstName} ${lastName}`,
          action,
          testType,
          score,
          date,
          status,
          avatarBg: bgColors[Math.floor(Math.random() * bgColors.length)],
        };
      });

    // Sort by date (most recent first)
    this.recentActivities.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // Get severity for status tag coloring
  getStatusSeverity(status: string): string {
    const severityMap: { [key: string]: string } = {
      Completed: 'success',
      Passed: 'success',
      Failed: 'danger',
      'In Progress': 'info',
      Pending: 'warning',
      Expired: 'danger',
    };

    return severityMap[status] || 'info';
  }
}
