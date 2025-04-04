import { Component, OnInit } from '@angular/core';
import { Table } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { HttpClientModule } from '@angular/common/http';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { CompletedUsersComponent } from "../userDialogue/completed-users/completed-users.component";
import { NotAssignedUsersComponent } from "../userDialogue/not-assigned-users/not-assigned-users.component";
import { Router } from '@angular/router';

@Component({
  selector: 'app-users-list-rl',
  standalone: true,
  imports: [
    TableModule,
    TagModule,
    IconFieldModule,
    InputTextModule,
    InputIconModule,
    MultiSelectModule,
    SelectModule,
    HttpClientModule,
    CommonModule,
    TooltipModule,
    ButtonModule,
    FormsModule,
    DropdownModule,
    DialogModule,
    NotAssignedUsersComponent
  ],
  templateUrl: './users-list-rl.component.html',
  styleUrl: './users-list-rl.component.css'
})
export class UsersListRLComponent implements OnInit {
  candidates: any[] = [];
  loading: boolean = false;
  statuses: any[] = [
    { label: 'COMPLETED', value: 'COMPLETED', severity: 'success' },
    { label: 'IN PROGRESS', value: 'IN PROGRESS', severity: 'warn' },
    { label: 'NOT ASSIGNED', value: 'NOT ASSIGNED', severity: 'danger' },
    { label: 'ASSIGNED', value: 'ASSIGNED', severity: 'info' }
  ];
  visible: boolean = false;
  selectedCandidate: any = null;
  dialogHeader: string = '';

  constructor(private router: Router) {}

  ngOnInit() {
    this.candidates = [
      {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      testDate: '2024-01-15 14:30',
      status: 'COMPLETED',
      niveau: 'Licence'
      },
      {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      testDate: '2024-01-16 09:15',
      status: 'IN PROGRESS',
      niveau: 'Ingénieur'
      },
      {
      id: 3,
      name: 'Mike Johnson',
      email: 'mike@example.com',
      testDate: '2024-01-17 11:00',
      status: 'NOT ASSIGNED',
      niveau: 'Licence'
      },
      {
      id: 4,
      name: 'Sarah Williams',
      email: 'sarah@example.com',
      testDate: '2024-01-18 13:45',
      status: 'ASSIGNED',
      niveau: 'Master'
      },
      {
      id: 5,
      name: 'James Brown',
      email: 'james@example.com',
      testDate: '2024-01-19 10:00',
      status: 'COMPLETED',
      niveau: 'Ingénieur'
      },
      {
      id: 6,
      name: 'Emily Davis',
      email: 'emily@example.com',
      testDate: '2024-01-20 15:30',
      status: 'IN PROGRESS',
      niveau: 'Licence'
      },
      {
      id: 7,
      name: 'Robert Wilson',
      email: 'robert@example.com',
      testDate: '2024-01-21 09:00',
      status: 'NOT ASSIGNED',
      niveau: 'Master'
      },
      {
      id: 8,
      name: 'Lisa Anderson',
      email: 'lisa@example.com',
      testDate: '2024-01-22 14:15',
      status: 'ASSIGNED',
      niveau: 'Ingénieur'
      }
    ];
  }

  getSeverity(status: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'assigned':
        return 'info';
      case 'not assigned':
        return 'danger';
      case 'in progress':
        return 'warn';
      default:
        return 'secondary';
    }
  }
  showDetails(candidate: any) {
    this.selectedCandidate = candidate;

    if (candidate.status.toLowerCase() === 'completed') {
      // Navigate to completed test details
      this.router.navigate([`/dashboard/RaisonnementLogique/Users/completed/${candidate.id}`]);
      return;
    }

    switch (candidate.status.toLowerCase()) {
      case 'in progress':
        this.dialogHeader = 'Test Progress';
        break;
      case 'not assigned':
        this.dialogHeader = 'Test Information';
        break;
      case 'assigned':
        this.dialogHeader = 'Assignment Details';
        break;
    }

    this.visible = true;
  }

  onSave() {
    // TODO: Implement save logic here
    console.log('Saving changes for:', this.selectedCandidate);
    this.visible = false;
  }
}
