import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
interface User {
  firstName: string;
  lastName: string;
  role: 'candidate' | 'admin' | 'moderator' | 'psychologue';
  email: string;
}

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [DropdownModule,CommonModule, DialogModule, TableModule, TagModule, InputTextModule, FormsModule, TooltipModule, ButtonModule, ToastModule],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.css',
  providers: [MessageService]
})
export class UsersListComponent implements OnInit {
  constructor(private messageService: MessageService) {}

  users: User[] = [
    { firstName: 'John', lastName: 'Doe', role: 'candidate', email: 'john.doe@example.com' },
    { firstName: 'Jane', lastName: 'Smith', role: 'admin', email: 'jane.smith@example.com' },
    { firstName: 'Mike', lastName: 'Johnson', role: 'moderator', email: 'mike.j@example.com' },
    { firstName: 'Sarah', lastName: 'Williams', role: 'psychologue', email: 'sarah.w@example.com' },
    { firstName: 'Alex', lastName: 'Brown', role: 'candidate', email: 'alex.b@example.com' },
    { firstName: 'Emma', lastName: 'Davis', role: 'candidate', email: 'emma.d@example.com' },
    { firstName: 'James', lastName: 'Wilson', role: 'moderator', email: 'james.w@example.com' },
    { firstName: 'Lisa', lastName: 'Anderson', role: 'psychologue', email: 'lisa.a@example.com' }
  ];

  loading: boolean = false;
  globalFilter: string = '';
  displayDialog2: any;
  displayDialog: any;
  selectedRole: any;

  ngOnInit() {
    this.filteredUsers = this.users;
    this.loading = false;
  }

  getSeverity(role: string): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'danger';
      case 'recruiter':
        return 'warn';
      case 'candidate':
        return 'info';
      default:
        return 'success';
    }
  }

  filteredUsers: any[] = [];
  selectedUser: any = null;
  showRoleDialog: boolean = false;
  showDeleteDialog: boolean = false;

  onSearchChange(event: any) {
    const searchText = event.target.value.toLowerCase();
    this.filteredUsers = this.users.filter(user =>
      user.firstName.toLowerCase().includes(searchText) ||
      user.lastName.toLowerCase().includes(searchText) ||
      user.email.toLowerCase().includes(searchText)
    );
  }

  onRoleChange(user: User) {
    this.selectedUser = user;
    this.showRoleDialog = true;
  }

  onDeleteClick(user: User) {
    this.selectedUser = user;
    this.showDeleteDialog = true;
  }

  confirmRoleChange() {
    // Implement role change logic
    this.showRoleDialog = false;
  }

  cancelRoleChange() {
    this.showRoleDialog = false;
  }

  confirmDelete() {
    if (this.selectedUser) {
      this.loading = true;
      // Simulate API call
      setTimeout(() => {
        this.users = this.users.filter(u => u !== this.selectedUser);
        this.filteredUsers = this.filteredUsers.filter(u => u !== this.selectedUser);
        this.showDeleteDialog = false;
        this.loading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Utilisateur supprimé avec succès'
        });
      }, 1000);
    }
  }

  cancelDelete() {
    this.showDeleteDialog = false;
  }

}
