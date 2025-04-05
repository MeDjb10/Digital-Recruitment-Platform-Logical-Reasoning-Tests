import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-not-assigned-users',
  standalone: true,
  imports: [
    CommonModule,
    DropdownModule,
    InputSwitchModule,
    CheckboxModule,
    FormsModule
  ],
  templateUrl: './not-assigned-users.component.html',
  styleUrl: './not-assigned-users.component.css'
})
export class NotAssignedUsersComponent implements OnInit {
  @Input() existingAssignment: any = null;

  psychologists = [
    { name: 'Dr. Smith', id: 1 },
    { name: 'Dr. Johnson', id: 2 },
    // Add more psychologists as needed
  ];

  selectedPsychologist: any = null;
  isPropositionSelected: boolean = false;
  d70Enabled: boolean = false;
  d2000Enabled: boolean = false;

  ngOnInit() {
    if (this.existingAssignment) {
      // Set initial values if there's an existing assignment
      this.selectedPsychologist = this.psychologists.find(p => p.id === this.existingAssignment.psychologistId);
      this.d70Enabled = this.existingAssignment.testType === 'd70';
      this.d2000Enabled = this.existingAssignment.testType === 'd2000';
      this.isPropositionSelected = this.existingAssignment.isProposition;
    }
  }

  onTestToggle(test: 'd70' | 'd2000'): void {
    if (test === 'd70' && this.d70Enabled) {
      this.d2000Enabled = false;
    } else if (test === 'd2000' && this.d2000Enabled) {
      this.d70Enabled = false;
    }
  }

  saveChanges() {
    const updatedAssignment = {
      ...this.existingAssignment,
      psychologistId: this.selectedPsychologist?.id,
      testType: this.d70Enabled ? 'd70' : 'd2000',
      isProposition: this.isPropositionSelected
    };
    // TODO: Implement API call to save changes
    console.log('Saving changes:', updatedAssignment);
  }
}
