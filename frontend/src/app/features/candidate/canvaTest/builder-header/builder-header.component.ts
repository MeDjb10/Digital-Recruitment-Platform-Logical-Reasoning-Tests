import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-builder-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './builder-header.component.html',
  styleUrls: ['./builder-header.component.css']
})
export class BuilderHeaderComponent {
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() testId: string | null = null;
  @Input() isSaving = false;

  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onSave(): void {
    this.save.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}