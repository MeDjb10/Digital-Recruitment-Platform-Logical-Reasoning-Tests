import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { SliderModule } from 'primeng/slider';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-question-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TextareaModule,
    DropdownModule,
    ButtonModule,
    SliderModule,
    InputGroupModule,
    InputTextModule,
    TooltipModule,
  ],
  templateUrl: './question-form.component.html',
  styleUrls: ['./question-form.component.css'],
})
export class QuestionFormComponent implements OnInit {
  @Input() title: string = '';
  @Input() difficulty: 'easy' | 'medium' | 'hard' | 'expert' = 'medium';
  @Input() instruction: string = '';
  @Input() pattern: string = '';
  @Input() timeLimit: number = 60;
  @Input() scoreWeight: number = 3;

  @Output() titleChange = new EventEmitter<string>();
  @Output() difficultyChange = new EventEmitter<string>();
  @Output() instructionChange = new EventEmitter<string>();
  @Output() patternChange = new EventEmitter<string>();
  @Output() timeLimitChange = new EventEmitter<number>();
  @Output() scoreWeightChange = new EventEmitter<number>();

  showAdvancedOptions = false;

  difficultyOptions = [
    { label: 'Easy', value: 'easy', icon: 'pi pi-circle-fill easy-indicator' },
    {
      label: 'Medium',
      value: 'medium',
      icon: 'pi pi-circle-fill medium-indicator',
    },
    { label: 'Hard', value: 'hard', icon: 'pi pi-circle-fill hard-indicator' },
    {
      label: 'Expert',
      value: 'expert',
      icon: 'pi pi-circle-fill expert-indicator',
    },
  ];

  constructor() {}

  ngOnInit(): void {}

  onTitleChange(value: string): void {
    this.title = value;
    this.titleChange.emit(value);
  }

  onDifficultyChange(value: string): void {
    this.difficulty = value as 'easy' | 'medium' | 'hard' | 'expert';
    this.difficultyChange.emit(value);
  }

  onInstructionChange(value: string): void {
    this.instruction = value;
    this.instructionChange.emit(value);
  }

  onPatternChange(value: string): void {
    this.pattern = value;
    this.patternChange.emit(value);
  }

  onTimeLimitChange(value: number): void {
    this.timeLimit = value;
    this.timeLimitChange.emit(value);
  }

  onScoreWeightChange(value: number): void {
    this.scoreWeight = value;
    this.scoreWeightChange.emit(value);
  }

  toggleAdvancedOptions(): void {
    this.showAdvancedOptions = !this.showAdvancedOptions;
  }
}
