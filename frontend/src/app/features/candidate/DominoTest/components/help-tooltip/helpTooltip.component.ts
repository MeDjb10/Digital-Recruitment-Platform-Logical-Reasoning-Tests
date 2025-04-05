import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-help-tooltip',
  standalone: true,
  imports: [CommonModule],
  // Update the template with a more descriptive and helpful tooltip:
  template: `
    <div class="help-tooltip" *ngIf="show" [class.animate]="animate">
      <div class="tooltip-content">
        <h4>{{ title }}</h4>
        <p *ngIf="description">{{ description }}</p>
        <ul *ngIf="instructions && instructions.length > 0">
          <li
            *ngFor="let instruction of instructions"
            [innerHTML]="instruction"
          ></li>
        </ul>
        <div class="tooltip-example">
          <div class="example-label">Example:</div>
          <div class="example-domino">
            <div class="domino-half top"><span>3</span></div>
            <div class="domino-half bottom"><span>5</span></div>
          </div>
        </div>
        <button class="close-tooltip" (click)="close.emit()">&times;</button>
      </div>
    </div>
  `,

  // Update the styles with more enhanced styling:
  styles: [
    `
      .help-tooltip {
        position: absolute;
        z-index: 100;
        max-width: 400px;
        width: 90%;
        top: 20px;
        right: 20px;
        transform: translateY(-50px);
        transition: all 0.3s ease;
        opacity: 0;
        pointer-events: auto;
      }

      .help-tooltip.animate {
        opacity: 1;
        transform: translateY(0);
      }

      .tooltip-content {
        background-color: white;
        border-radius: 8px;
        padding: 16px 20px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border: 1px solid #e2e8f0;
        text-align: left;
        position: relative;
      }

      .tooltip-content h4 {
        margin: 0 0 10px 0;
        color: #0f172a;
        font-size: 16px;
        font-weight: 600;
      }

      .tooltip-content p {
        margin: 0 0 12px 0;
        color: #475569;
        font-size: 14px;
        line-height: 1.5;
      }

      .tooltip-content ul {
        margin: 0 0 15px 0;
        padding-left: 20px;
        font-size: 14px;
        color: #475569;
        line-height: 1.5;
      }

      .tooltip-content li {
        margin-bottom: 8px;
      }

      .tooltip-example {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 12px;
        padding: 10px;
        background-color: #f8fafc;
        border-radius: 6px;
      }

      .example-label {
        font-size: 13px;
        color: #64748b;
        font-weight: 500;
      }

      .example-domino {
        width: 40px;
        height: 80px;
        display: flex;
        flex-direction: column;
        border: 2px solid #334155;
        border-radius: 6px;
        overflow: hidden;
      }

      .domino-half {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }

      .domino-half.top {
        background-color: #e2e8f0;
        border-bottom: 1px solid #334155;
      }

      .domino-half.bottom {
        background-color: #f8fafc;
      }

      .close-tooltip {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: none;
        background-color: #f1f5f9;
        color: #64748b;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }

      .close-tooltip:hover {
        background-color: #e2e8f0;
        color: #0f172a;
      }

      :host {
        pointer-events: none;
      }
    `,
  ],
})
export class HelpTooltipComponent {
  @Input() show: boolean = false;
  @Input() animate: boolean = false;
  @Input() title: string = 'Help';
  @Input() description: string = '';
  @Input() instructions: string[] = [];

  @Output() close = new EventEmitter<void>();
}
