import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-processus',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './processus.component.html',
  styleUrl: './processus.component.css',
})
export class ProcessusComponent {}
