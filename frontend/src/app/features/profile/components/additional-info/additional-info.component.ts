import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { User } from '../../../../core/models/user.model';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-additional-info',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    InputTextModule, 
    ButtonModule, 
    RouterModule
  ],
  templateUrl: './additional-info.component.html',
  styleUrl: './additional-info.component.css',
})
export class AdditionalInfoComponent {
  @Input() user: User | null = null;
  @Input() showApplyRedirect: boolean = false;

  editedUser: Partial<User> = {};

  ngOnInit() {
    // Initialize editedUser with current user data when component loads
    if (this.user) {
      this.editedUser = { ...this.user };
    }
  }

  ngOnChanges() {
    // Update editedUser when user input changes
    if (this.user) {
      this.editedUser = { ...this.user };
    }
  }
}