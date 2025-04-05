import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-bar.component.html',
  styleUrls: ['./status-bar.component.css'],
})
export class StatusBarComponent {
  @Input() dominosCount = 0;
  @Input() hasEditableDomino = false;
  @Input() hasCorrectAnswer = false;
  @Input() canvasWidth = 0;
  @Input() canvasHeight = 0;
  @Input() hasUnsavedChanges = false;
}
