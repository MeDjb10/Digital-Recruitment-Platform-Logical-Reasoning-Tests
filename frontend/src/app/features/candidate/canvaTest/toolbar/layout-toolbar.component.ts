import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';

export interface CustomTemplate {
  id: string;
  name: string;
  dominos: any[];
  arrows?: any[];
  thumbnail?: string;
}

@Component({
  selector: 'app-layout-toolbar',
  templateUrl: './layout-toolbar.component.html',
  styleUrls: ['./layout-toolbar.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, CheckboxModule]
})
export class LayoutToolbarComponent implements OnInit {
  // Inputs from parent
  @Input() layoutType: 'row' | 'grid' | 'rhombus' | 'custom' | 'rhombus-large' | 'spiral' = 'grid';
  @Input() gridRows: number = 3;
  @Input() gridCols: number = 3;
  @Input() snapToGrid: boolean = true;
  @Input() showGrid: boolean = true;
  @Input() gridSize: number = 20;
  @Input() customTemplates: CustomTemplate[] = [];
  @Input() isGridBasedLayout: boolean = true;
  @Input() dominoCount: number = 0;
  @Input() creationMode: 'domino' | 'arrow' = 'domino';

  // Outputs to parent
  @Output() layoutTypeChange = new EventEmitter<'row' | 'grid' | 'rhombus' | 'custom' | 'rhombus-large' | 'spiral'>();
  @Output() gridDimensionsChange = new EventEmitter<{rows: number, cols: number}>();
  @Output() displayOptionsChange = new EventEmitter<{snapToGrid: boolean, showGrid: boolean, gridSize: number}>();
  @Output() applyGrid = new EventEmitter<void>();
  
  @Output() addDomino = new EventEmitter<void>();
  @Output() addArrow = new EventEmitter<void>();
  @Output() clearCanvas = new EventEmitter<void>();
  @Output() generateAutoLayout = new EventEmitter<void>();
  @Output() generatePreview = new EventEmitter<void>();
  @Output() importJson = new EventEmitter<Event>();
  @Output() exportJson = new EventEmitter<void>();
  
  @Output() openSaveTemplateDialog = new EventEmitter<void>();
  @Output() applyTemplate = new EventEmitter<string>();
  @Output() deleteTemplate = new EventEmitter<string>();

  constructor() {}

  ngOnInit(): void {
  }

  // Layout type methods
  setLayoutType(type: 'row' | 'grid' | 'rhombus' | 'custom' | 'rhombus-large' | 'spiral'): void {
    this.layoutType = type;
    this.layoutTypeChange.emit(type);
  }

  // Grid dimensions methods
  onGridDimensionsChange(): void {
    this.gridDimensionsChange.emit({
      rows: this.gridRows,
      cols: this.gridCols
    });
  }

  // Display options methods
  onDisplayOptionsChange(): void {
    this.displayOptionsChange.emit({
      snapToGrid: this.snapToGrid,
      showGrid: this.showGrid,
      gridSize: this.gridSize
    });
  }

  // Grid apply methods
  onApplyGrid(): void {
    this.applyGrid.emit();
  }

  // Action buttons methods
  onAddDomino(): void {
    this.addDomino.emit();
  }

  onAddArrow(): void {
    this.addArrow.emit();
  }

  onClearCanvas(): void {
    this.clearCanvas.emit();
  }

  onGenerateAutoLayout(): void {
    this.generateAutoLayout.emit();
  }

  onGeneratePreview(): void {
    this.generatePreview.emit();
  }

  onImportJson(event: Event): void {
    this.importJson.emit(event);
  }

  onExportJson(): void {
    this.exportJson.emit();
  }

  // Template methods
  onOpenSaveTemplateDialog(): void {
    this.openSaveTemplateDialog.emit();
  }

  onApplyTemplate(templateId: string): void {
    this.applyTemplate.emit(templateId);
  }

  onDeleteTemplate(templateId: string): void {
    this.deleteTemplate.emit(templateId);
  }
}