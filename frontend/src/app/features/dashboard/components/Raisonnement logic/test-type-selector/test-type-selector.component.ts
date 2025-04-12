import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-test-type-selector',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './test-type-selector.component.html',
  styleUrls: ['./test-type-selector.component.css'],
})
export class TestTypeSelectorComponent {
  constructor(private router: Router) {}

  selectTestType(type: string) {
    // Navigate to test creation with the selected type as a query parameter
    this.router.navigate(['/dashboard/RaisonnementLogique/Tests/create'], {
      queryParams: { type },
    });
  }
}
