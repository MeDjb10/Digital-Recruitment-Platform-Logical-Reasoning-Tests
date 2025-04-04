import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';

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
  styleUrl: './multiple-choice-section.component.css'
})
export class MultipleChoiceSectionComponent implements OnInit {
  testType: string = 'Multiple Choice Test';
  timeSpent: string = '25:30';
  score: number = 32;
  correctAnswers: number = 32;
  wrongAnswers: number = 8;
  psychologistComment: string = '';

  aiComments: AIComment[] = [
    { text: 'The candidate shows strong analytical skills in comprehension questions.' },
    { text: 'Performance in logical reasoning questions indicates above-average problem-solving abilities.' },
    { text: 'Time management could be improved for better overall results.' }
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

  constructor() { }

  ngOnInit(): void {
    // Initialize any data or fetch from service
  }

  handleReaction(index: number, isPositive: boolean): void {
    if (this.aiComments[index].reaction === isPositive) {
      this.aiComments[index].reaction = undefined;
    } else {
      this.aiComments[index].reaction = isPositive;
    }
  }
}
