import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { Location } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DominoTestSectionComponent } from "../domino-test-section/domino-test-section.component";
import { TabViewModule } from 'primeng/tabview';
import { MultipleChoiceSectionComponent } from "../multiple-choice-section/multiple-choice-section.component";

@Component({
  selector: 'app-completed-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartModule, ButtonModule, DominoTestSectionComponent, TabViewModule, MultipleChoiceSectionComponent],
  templateUrl: './completed-users.component.html',
  styleUrl: './completed-users.component.css'
})
export class CompletedUsersComponent implements OnInit {
  

  testType: string = 'Logical Reasoning Assessment';
  timeSpent: string = '20:52';
  score: number = 32;
  inversedAnswers: number = 3;
  skippedQuestions: number = 2;
  timeChartData: any;

  activeTests = {
    domino: true,
    multipleChoice: true  // Set to false if user hasn't taken this test
  };

  constructor(private location: Location) {}
  
  ngOnInit() {
  }

  goBack(): void {
    this.location.back();
  }

  hasMultipleChoiceTest(): boolean {
    return this.activeTests.multipleChoice;
  }
}
