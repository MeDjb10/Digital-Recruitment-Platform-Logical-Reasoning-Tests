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
  template: `
    <div class="test-type-selector-container">
      <div class="header-section">
        <h1>Create a New Test</h1>
        <p class="subtitle">Select the type of test you want to create</p>
      </div>

      <div class="type-cards">
        <div class="type-card" (click)="selectTestType('domino')">
          <div class="card-header">
            <div class="card-icon domino-icon">
              <i class="pi pi-th-large"></i>
            </div>
            <h2>Domino Test</h2>
          </div>
          <div class="card-content">
            <p>
              Create logical reasoning tests with interactive domino patterns
            </p>
            <ul class="features-list">
              <li><i class="pi pi-check"></i> Visual pattern recognition</li>
              <li><i class="pi pi-check"></i> Logical sequence assessment</li>
              <li><i class="pi pi-check"></i> Spatial reasoning skills</li>
            </ul>
            <button class="select-btn">Create Domino Test</button>
          </div>
        </div>

        <div class="type-card" (click)="selectTestType('multiple-choice')">
          <div class="card-header">
            <div class="card-icon mcq-icon">
              <i class="pi pi-list"></i>
            </div>
            <h2>Multiple-Choice Test</h2>
          </div>
          <div class="card-content">
            <p>
              Create tests with text-based questions and multiple answer options
            </p>
            <ul class="features-list">
              <li><i class="pi pi-check"></i> Flexible question types</li>
              <li>
                <i class="pi pi-check"></i> Single or multiple correct answers
              </li>
              <li><i class="pi pi-check"></i> Option randomization</li>
            </ul>
            <button class="select-btn">Create Multiple-Choice Test</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .test-type-selector-container {
        max-width: 1100px;
        margin: 2rem auto;
        padding: 1.5rem;
      }

      .header-section {
        text-align: center;
        margin-bottom: 3rem;
      }

      h1 {
        margin-bottom: 0.5rem;
        color: var(--primary-color, #3b82f6);
        font-size: 2rem;
      }

      .subtitle {
        color: #64748b;
        font-size: 1.1rem;
      }

      .type-cards {
        display: flex;
        justify-content: center;
        gap: 2.5rem;
        flex-wrap: wrap;
      }

      .type-card {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        width: 450px;
        transition: transform 0.2s, box-shadow 0.2s;
        overflow: hidden;
        border: 1px solid #e2e8f0;
      }

      .type-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        cursor: pointer;
      }

      .card-header {
        padding: 1.5rem;
        text-align: center;
        border-bottom: 1px solid #edf2f7;
      }

      .card-content {
        padding: 1.5rem;
      }

      .card-icon {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1rem;
        font-size: 2rem;
      }

      .domino-icon {
        background: #eff6ff;
        color: #2563eb;
      }

      .mcq-icon {
        background: #f0fdf4;
        color: #16a34a;
      }

      h2 {
        margin: 0;
        font-size: 1.5rem;
        color: #1e293b;
      }

      .features-list {
        list-style: none;
        padding: 0;
        margin: 1.5rem 0;
      }

      .features-list li {
        margin-bottom: 0.75rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #475569;
      }

      .features-list i {
        color: #10b981;
      }

      .select-btn {
        width: 100%;
        background: var(--primary-color, #3b82f6);
        color: white;
        border: none;
        padding: 0.875rem 1.5rem;
        border-radius: 6px;
        margin-top: 1rem;
        cursor: pointer;
        font-weight: 500;
        transition: background 0.2s;
        text-align: center;
      }

      .select-btn:hover {
        background: var(--primary-dark-color, #1d4ed8);
      }

      @media (max-width: 1024px) {
        .type-cards {
          flex-direction: column;
          align-items: center;
        }

        .type-card {
          width: 100%;
          max-width: 500px;
        }
      }
    `,
  ],
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
