import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { UserService } from '../../../../core/services/user.service';
import { User } from '../../../../core/models/user.model';
import { MenuItem, MessageService } from 'primeng/api';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

// Import PrimeNG modules directly
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { Menu, MenuModule } from 'primeng/menu';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { RippleModule } from 'primeng/ripple';
import { CommonModule } from '@angular/common';
@Component({
  standalone: true,
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  providers: [MessageService],
  styleUrls: ['./users-list.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,

    // PrimeNG modules
    TableModule,
    ButtonModule,
    TooltipModule,
    MenuModule,
    InputTextModule,
    DropdownModule,
    DialogModule,
    ToastModule,
    RippleModule,
  ],
})
export class UsersListComponent implements OnInit, OnDestroy {
  users: User[] = [];
  filteredUsers: User[] = [];
  loading = false;
  loadingAction = false;

  // Pagination
  pagination = {
    page: 1,
    limit: 10,
    total: 0,
  };

  // Search
  searchQuery = '';

  // Filters
  selectedRoleFilter: string = '';
  roleFilterOptions = [
    { labelKey: 'DASHBOARD.USERS_LIST.FILTER_OPTIONS.ALL_ROLES', value: '' },
    { labelKey: 'DASHBOARD.USERS_LIST.ROLES.ADMIN', value: 'admin' },
    { labelKey: 'DASHBOARD.USERS_LIST.ROLES.MODERATOR', value: 'moderator' },
    {
      labelKey: 'DASHBOARD.USERS_LIST.ROLES.PSYCHOLOGIST',
      value: 'psychologist',
    },
    { labelKey: 'DASHBOARD.USERS_LIST.ROLES.CANDIDATE', value: 'candidate' },
  ];
  translatedRoleFilterOptions: any[] = [];

  // Status Menu
  statusMenuItems: MenuItem[] = [];

  // Role Dialog
  showRoleDialog = false;
  selectedUser: User | null = null;
  selectedRole = '';
  roleOptionsBase = [
    { labelKey: 'DASHBOARD.USERS_LIST.ROLES.ADMIN', value: 'admin' },
    { labelKey: 'DASHBOARD.USERS_LIST.ROLES.MODERATOR', value: 'moderator' },
    {
      labelKey: 'DASHBOARD.USERS_LIST.ROLES.PSYCHOLOGIST',
      value: 'psychologist',
    },
    { labelKey: 'DASHBOARD.USERS_LIST.ROLES.CANDIDATE', value: 'candidate' },
  ];
  translatedRoleOptions: any[] = [];

  // Delete dialog
  showDeleteDialog = false;
  deleteCountdown = 3;
  deleteInterval: any;

  // Edit Dialog
  showEditDialog = false;
  editForm: FormGroup;

  currentUserRole: string = '';

  private languageChangeSubscription: Subscription;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private messageService: MessageService,
    private fb: FormBuilder,
    private translateService: TranslateService
  ) {
    this.editForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]],
    });

    // Subscribe to language changes to update translated options
    this.languageChangeSubscription =
      this.translateService.onLangChange.subscribe(() => {
        this.updateTranslatedOptions();
        this.setupStatusMenuItems();
      });
  }

  ngOnInit() {
    this.currentUserRole = this.authService.getUserRole() || 'candidate';
    this.updateTranslatedOptions();
    this.loadUsers();
    this.setupStatusMenuItems();
  }

  ngOnDestroy() {
    if (this.languageChangeSubscription) {
      this.languageChangeSubscription.unsubscribe();
    }
  }

  // Update translated options based on current language
  updateTranslatedOptions() {
    // Translate role filter options
    this.translatedRoleFilterOptions = this.roleFilterOptions.map((option) => ({
      label: this.translateService.instant(option.labelKey),
      value: option.value,
    }));

    // Translate role options for dialog
    this.translatedRoleOptions = this.roleOptionsBase.map((option) => ({
      label: this.translateService.instant(option.labelKey),
      value: option.value,
    }));
  }

  loadUsers() {
    this.loading = true;

    const params: any = {
      page: this.pagination.page,
      limit: this.pagination.limit,
    };

    if (this.searchQuery) {
      params.search = this.searchQuery;
    }

    if (this.selectedRoleFilter) {
      params.role = this.selectedRoleFilter;
    }

    this.userService
      .getUsers(params)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          // Transform the data to ensure each user has consistent property names
          this.users = response.users.map((user) => ({
            ...user,
            // Ensure the id property is properly set (MongoDB might use _id)
            id: user.id || user._id || '',
          }));
          this.filteredUsers = [...this.users];
          this.pagination.total = response.pagination.total;
        },
        error: (err) => {
          console.error('Error loading users', err);
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant(
              'DASHBOARD.USERS_LIST.ERRORS.ERROR'
            ),
            detail: this.translateService.instant(
              'DASHBOARD.USERS_LIST.ERRORS.LOAD_FAILED'
            ),
          });
        },
      });
  }

  changePage(event: any) {
    this.pagination.page = event.page + 1;
    this.pagination.limit = event.rows;
    this.loadUsers();
  }

  onSearchChange(event: any) {
    this.searchQuery = event.target.value;
    this.pagination.page = 1;
    this.loadUsers();
  }

  filterByRole(event: any) {
    this.selectedRoleFilter = event.value;
    this.pagination.page = 1;
    this.loadUsers();
  }

  // Setup status menu items with their respective actions
  setupStatusMenuItems() {
    this.statusMenuItems = [
      {
        label: this.translateService.instant(
          'DASHBOARD.USERS_LIST.STATUS_VALUES.ACTIVE'
        ),
        icon: 'pi pi-check-circle',
        command: () => {
          if (this.selectedUser) {
            this.updateUserStatus(this.selectedUser, 'active');
          }
        },
      },
      {
        label: this.translateService.instant(
          'DASHBOARD.USERS_LIST.STATUS_VALUES.INACTIVE'
        ),
        icon: 'pi pi-ban',
        command: () => {
          if (this.selectedUser) {
            this.updateUserStatus(this.selectedUser, 'inactive');
          }
        },
      },
      {
        label: this.translateService.instant(
          'DASHBOARD.USERS_LIST.STATUS_VALUES.SUSPENDED'
        ),
        icon: 'pi pi-pause-circle',
        command: () => {
          if (this.selectedUser) {
            this.updateUserStatus(this.selectedUser, 'suspended');
          }
        },
      },
    ];
  }

  // Simple method to set the selected user
  setSelectedUser(user: User) {
    this.selectedUser = user;
  }

  updateUserStatus(user: User, status: string) {
    this.loadingAction = true;

    this.userService
      .updateUserStatus(user.id, status)
      .pipe(finalize(() => (this.loadingAction = false)))
      .subscribe({
        next: (response) => {
          // Update user in the list
          const index = this.users.findIndex((u) => u.id === user.id);
          if (index !== -1) {
            this.users[index] = { ...this.users[index], status };
            this.filteredUsers = [...this.users];
          }

          this.messageService.add({
            severity: 'success',
            summary: this.translateService.instant(
              'DASHBOARD.USERS_LIST.SUCCESS'
            ),
            detail: this.translateService.instant(
              'DASHBOARD.USERS_LIST.STATUS_UPDATED'
            ),
          });
        },
        error: (err) => {
          console.error('Error updating user status', err);
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant(
              'DASHBOARD.USERS_LIST.ERRORS.ERROR'
            ),
            detail: this.translateService.instant(
              'DASHBOARD.USERS_LIST.ERRORS.STATUS_UPDATE_FAILED'
            ),
          });
        },
      });
  }

  // Role change functions
  onRoleChange(user: User) {
    this.selectedUser = user;
    this.selectedRole = user.role;
    this.showRoleDialog = true;
  }

  cancelRoleChange() {
    this.showRoleDialog = false;
    this.selectedUser = null;
  }

  confirmRoleChange() {
    if (!this.selectedUser) return;

    this.loadingAction = true;

    this.userService
      .assignRole(this.selectedUser.id, this.selectedRole)
      .pipe(
        finalize(() => {
          this.loadingAction = false;
          this.showRoleDialog = false;
        })
      )
      .subscribe({
        next: (response) => {
          // Update user in the list
          const index = this.users.findIndex(
            (u) => u.id === this.selectedUser?.id
          );
          if (index !== -1) {
            this.users[index] = {
              ...this.users[index],
              role: this.selectedRole,
            };
            this.filteredUsers = [...this.users];
          }

          this.messageService.add({
            severity: 'success',
            summary: this.translateService.instant(
              'DASHBOARD.USERS_LIST.SUCCESS'
            ),
            detail: this.translateService.instant(
              'DASHBOARD.USERS_LIST.ROLE_UPDATED'
            ),
          });
        },
        error: (err) => {
          console.error('Error updating role', err);
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant(
              'DASHBOARD.USERS_LIST.ERRORS.ERROR'
            ),
            detail: this.translateService.instant(
              'DASHBOARD.USERS_LIST.ERRORS.ROLE_UPDATE_FAILED'
            ),
          });
        },
      });
  }

  // Delete user functions
  onDeleteClick(user: User) {
    this.selectedUser = user;
    this.showDeleteDialog = true;
    this.deleteCountdown = 3;

    // Start countdown
    this.deleteInterval = setInterval(() => {
      this.deleteCountdown--;
      if (this.deleteCountdown <= 0) {
        clearInterval(this.deleteInterval);
      }
    }, 1000);
  }

  cancelDelete() {
    this.showDeleteDialog = false;
    this.selectedUser = null;
    if (this.deleteInterval) {
      clearInterval(this.deleteInterval);
    }
  }

  confirmDelete() {
    if (!this.selectedUser) return;

    this.loadingAction = true;

    this.userService
      .deleteUser(this.selectedUser.id)
      .pipe(
        finalize(() => {
          this.loadingAction = false;
          this.showDeleteDialog = false;
        })
      )
      .subscribe({
        next: () => {
          // Remove user from the list
          this.users = this.users.filter((u) => u.id !== this.selectedUser?.id);
          this.filteredUsers = [...this.users];

          this.messageService.add({
            severity: 'success',
            summary: this.translateService.instant(
              'DASHBOARD.USERS_LIST.SUCCESS'
            ),
            detail: this.translateService.instant(
              'DASHBOARD.USERS_LIST.USER_DELETED'
            ),
          });
        },
        error: (err) => {
          console.error('Error deleting user', err);
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant(
              'DASHBOARD.USERS_LIST.ERRORS.ERROR'
            ),
            detail: this.translateService.instant(
              'DASHBOARD.USERS_LIST.ERRORS.DELETE_FAILED'
            ),
          });
        },
      });
  }

  // Edit user functions
  onEditInfo(user: User) {
    this.selectedUser = user;
    this.editForm.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
    });
    this.showEditDialog = true;
  }

  cancelEdit() {
    this.showEditDialog = false;
    this.selectedUser = null;
  }

  confirmEdit() {
    if (!this.selectedUser || this.editForm.invalid) {
      // Mark all fields as touched to trigger validation
      Object.keys(this.editForm.controls).forEach((key) => {
        const control = this.editForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.loadingAction = true;

    // Only include password if it's not empty
    const userData: Partial<User> = {
      firstName: this.editForm.value.firstName,
      lastName: this.editForm.value.lastName,
      email: this.editForm.value.email,
    };

    // if (this.editForm.value.password) {
    //   userData.password = this.editForm.value.password;
    // }

    this.userService
      .updateUser(this.selectedUser.id, userData)
      .pipe(
        finalize(() => {
          this.loadingAction = false;
          this.showEditDialog = false;
        })
      )
      .subscribe({
        next: (response) => {
          // Update user in the list  
          const index = this.users.findIndex(
            (u) => u.id === this.selectedUser?.id
          );
          if (index !== -1) {
            this.users[index] = { ...this.users[index], ...userData };
            this.filteredUsers = [...this.users];
          }

          this.messageService.add({
            severity: 'success',
            summary: this.translateService.instant(
              'DASHBOARD.USERS_LIST.SUCCESS'
            ),
            detail: this.translateService.instant(
              'DASHBOARD.USERS_LIST.USER_UPDATED'
            ),
          });
        },
        error: (err) => {
          console.error('Error updating user', err);
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant(
              'DASHBOARD.USERS_LIST.ERRORS.ERROR'
            ),
            detail: this.translateService.instant(
              'DASHBOARD.USERS_LIST.ERRORS.UPDATE_FAILED'
            ),
          });
        },
      });
  }

  // Helper function to format date
  formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';

    const dateObj = new Date(date);
    const currentLang = this.translateService.currentLang;
    const locale = currentLang === 'fr' ? 'fr-FR' : 'en-US';

    return dateObj.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
