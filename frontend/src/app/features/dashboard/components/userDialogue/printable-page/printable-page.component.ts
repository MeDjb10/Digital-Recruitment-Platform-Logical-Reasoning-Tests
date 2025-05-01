import { Component } from '@angular/core';
import { DominoTestSectionComponent } from "../domino-test-section/domino-test-section.component";
import { MultipleChoiceSectionComponent } from "../multiple-choice-section/multiple-choice-section.component";
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
@Component({
  selector: 'app-printable-page',
  imports: [DominoTestSectionComponent, MultipleChoiceSectionComponent,CommonModule,NgApexchartsModule],
  templateUrl: './printable-page.component.html',
  styleUrl: './printable-page.component.css'
})
export class PrintablePageComponent {
  hasMultipleChoiceTest:Boolean = true; // Set to false if user hasn't taken this test
}
