import { Component } from '@angular/core';
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
export class NotAssignedUsersComponent {
  psychologists = [
    { name: 'Dr. Smith', id: 1 },
    { name: 'Dr. Johnson', id: 2 },
    // Add more psychologists as needed
  ];

  selectedPsychologist: any = null;
  isPropositionSelected: boolean = false;
  d70Enabled: boolean = false;
  d2000Enabled: boolean = false;

  onTestToggle(test: 'd70' | 'd2000'): void {
    if (test === 'd70' && this.d70Enabled) {
      this.d2000Enabled = false;
    } else if (test === 'd2000' && this.d2000Enabled) {
      this.d70Enabled = false;
    }
  }
}
