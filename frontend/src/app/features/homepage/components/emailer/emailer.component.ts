import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-emailer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './emailer.component.html',
  styleUrl: './emailer.component.css',
})
export class EmailerComponent {
  contactForm: FormGroup;
  submitted = false;
  loading = false;
  errorMessage = '';

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      message: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  // Getter methods for easier form field validation
  get f() {
    return this.contactForm.controls;
  }

  onSubmit() {
    // Mark all fields as touched to trigger validation
    Object.keys(this.contactForm.controls).forEach((key) => {
      const control = this.contactForm.get(key);
      control?.markAsTouched();
    });

    if (this.contactForm.valid) {
      this.loading = true;
      this.errorMessage = '';

      // Simulate API call - replace with actual endpoint in production
      setTimeout(() => {
        // Simulate successful submission
        this.submitted = true;
        this.loading = false;

        // Reset form after 5 seconds
        setTimeout(() => {
          this.submitted = false;
          this.contactForm.reset();
        }, 5000);
      }, 1500);

      // Uncomment for real HTTP implementation
      /*
      this.http.post('/api/contact', this.contactForm.value)
        .subscribe({
          next: () => {
            this.submitted = true;
            this.loading = false;
            setTimeout(() => {
              this.submitted = false;
              this.contactForm.reset();
            }, 5000);
          },
          error: (error) => {
            this.loading = false;
            this.errorMessage = 'An error occurred. Please try again later.';
            console.error('Contact form submission error:', error);
          }
        });
      */
    }
  }
}
