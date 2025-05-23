import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { Location } from '@angular/common';
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
  ApexNonAxisChartSeries
} from "ng-apexcharts";

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
  imports: [CommonModule, FormsModule, ChartModule, NgApexchartsModule, ButtonModule],
  templateUrl: './domino-test-section.component.html',
  styleUrl: './domino-test-section.component.css'
})
export class DominoTestSectionComponent implements OnInit {
  @ViewChild("chart") chart!: ChartComponent;

  public chartOptions: Partial<ChartOptions>;

  testType: string = 'Logical Reasoning Assessment';
  timeSpent: string = '20:52';
  score: number = 32;
  inversedAnswers: number = 3;
  skippedQuestions: number = 2;
  timeChartData: any;
  Performance: String= "Fort";
  isAiAnalysisVisible: boolean = false;
  constructor(private location: Location) {
    this.chartOptions = {
      series: [{
        data: [] as Array<{
          x: string;
          y: number;
        }>
      }],
      chart: {
        height: 450,
        type: "treemap",
        toolbar: { show: false }
      },
      dataLabels: { enabled: true },
      title: { text: "" },
      plotOptions: {
        treemap: {
          distributed: true,
          enableShades: false
        }
      } as ApexPlotOptions,
      colors: [],
      legend: { show: false }
    };
  }

  aiComments = [
    { text: 'Candidate performed well in logical reasoning. Lorem ipsum dolor sit amet consectetur adipisicing elit. Sunt neque, recusandae ut illum accusantium tempore hic aperiam quidem dolore et excepturi eveniet voluptatum cumque rem qui voluptatibus assumenda culpa ea!', reaction: true, likes: 0, dislikes: 0, feedback: '' },
  ];
  psychologistComment: string = '';

  ngOnInit() {
    this.initializeTimeChart();
    this.initializeTreeMap();
  }

  initializeTimeChart() {
    const questionCount = 40;
    const data = Array(questionCount).fill(0).map(() => Math.floor(Math.random() * 30) + 30); // 30-60 seconds
    const colors = Array(questionCount).fill(0).map(() =>
      `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.7)`
    );

    this.timeChartData = {
      labels: Array(questionCount).fill(0).map((_, i) => `Q${i + 1}`),
      datasets: [{
        label: 'Time Spent (seconds)',
        data: data,
        backgroundColor: colors
      }]
    };
  }

  initializeTreeMap() {
    this.chartOptions = {
      series: [
      {
        data: this.timeChartData.datasets[0].data.map((time: number, index: number) => ({
        x: `Q${index + 1}`,
        y: time
        }))
      }
      ],
      chart: {
      height: 450,
      type: "treemap",
      toolbar: {
        show: false
      }
      },
      title: {
      text: "Time Distribution per Question",
      align: "center",
      style: {
        fontSize: '16px',
        fontWeight: 600
      }
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
          color: '#4CAF50' // Green
          },
          {
          from: 36,
          to: 45,
          color: '#FFA500' // Orange
          },
          {
          from: 46,
          to: 100,
          color: '#F44336' // Red
          }
        ]
        }
      }
      },
      dataLabels: {
      enabled: true,
      style: {
        fontSize: '12px',
        fontFamily: 'sans-serif',
        fontWeight: 'bold'
      },
      formatter: function (text: string, op: any): string {
        return text + ' - ' + Math.round(op.value) + 's';
      }
      },
      legend: {
      show: false
      }
    };
  }

  handleReaction(commentIndex: number, isLike: boolean) {
    if (isLike) {
      this.aiComments[commentIndex].likes++;
    } else {
      this.aiComments[commentIndex].dislikes++;
    }
  }
}
