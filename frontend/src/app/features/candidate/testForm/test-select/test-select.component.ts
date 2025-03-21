import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  imports:[ CommonModule,
    FormsModule],
  selector: 'app-test-select',
  templateUrl: './test-select.component.html',
  styleUrls: ['./test-select.component.css'],
})
export class TestSelectComponent implements OnInit {
  constructor(private router: Router) {}

  showProcessDetails = false;

  ngOnInit(): void {
    // Initialize any necessary data
  }

  toggleProcessDetails(): void {
    this.showProcessDetails = !this.showProcessDetails;
  }


  startTest(testType: string): void {
    if (testType === 'personality') {
      // Navigate to personality test
      // this.router.navigate(['/personality-test']);

      // For now we'll just show an alert
      alert('Starting Personality Test...');
    }
  }
}
