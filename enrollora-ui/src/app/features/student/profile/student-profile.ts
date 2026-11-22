import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject,ChangeDetectorRef, } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { StudentService } from '../../admin/students/student.service';
import {
  StudentResponse,
  UpdateMyProfileRequest,
} from '../../admin/students/student.models';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './student-profile.html',
  styleUrl: './student-profile.css',
})
export class StudentProfile implements OnInit {
  private readonly studentService = inject(StudentService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  student: StudentResponse | null = null;

  isLoading = true;
  isEditing = false;
  isSaving = false;

  errorMessage = '';
  successMessage = '';

  profileForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    department: ['', [Validators.required, Validators.maxLength(100)]],
    age: [18, [Validators.required, Validators.min(17), Validators.max(60)]],
    cgpa: [0, [Validators.required, Validators.min(0), Validators.max(10)]],
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
  this.isLoading = true;
  this.errorMessage = '';

  console.log('Loading profile started');

  this.studentService.getMyProfile().subscribe({
    next: (response) => {
  this.student = response;

  this.profileForm.patchValue({
    name: response.name,
    department: response.department,
    age: response.age,
    cgpa: response.cgpa,
  });

  this.isLoading = false;
  this.cdr.markForCheck();
},
error: (error: HttpErrorResponse) => {
  console.error('Failed to load student profile:', error);

  this.errorMessage = this.getErrorMessage(
    error,
    'Unable to load your profile.',
  );

  this.isLoading = false;
  this.cdr.markForCheck();
},
  });
}

  openEdit(): void {
    if (!this.student) {
      return;
    }

    this.successMessage = '';
    this.errorMessage = '';

    this.profileForm.patchValue({
      name: this.student.name,
      department: this.student.department,
      age: this.student.age,
      cgpa: this.student.cgpa,
    });

    this.isEditing = true;
  }

  cancelEdit(): void {
    if (this.isSaving) {
      return;
    }

    if (this.student) {
      this.profileForm.patchValue({
        name: this.student.name,
        department: this.student.department,
        age: this.student.age,
        cgpa: this.student.cgpa,
      });
    }

    this.isEditing = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  updateProfile(): void {
    if (this.profileForm.invalid || this.isSaving) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const formValue = this.profileForm.getRawValue();

    const request: UpdateMyProfileRequest = {
      name: formValue.name.trim(),
      department: formValue.department.trim(),
      age: Number(formValue.age),
      cgpa: Number(formValue.cgpa),
    };

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.studentService.updateMyProfile(request).subscribe({
      next: (response) => {
        this.student = response;

        this.profileForm.patchValue({
          name: response.name,
          department: response.department,
          age: response.age,
          cgpa: response.cgpa,
        });

        this.isEditing = false;
        this.isSaving = false;
        this.successMessage = 'Profile updated successfully.';
      },
      error: (error: HttpErrorResponse) => {
        console.error('Failed to update profile:', error);

        this.errorMessage = this.getErrorMessage(
          error,
          'Unable to update your profile.',
        );

        this.isSaving = false;
      },
    });
  }

  getStatusLabel(status: number): string {
    switch (status) {
      case 0:
        return 'Pending';
      case 1:
        return 'Approved';
      case 2:
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }

  private getErrorMessage(
    error: HttpErrorResponse,
    fallback: string,
  ): string {
    const body = error.error;

    if (typeof body === 'string' && body.trim()) {
      return body;
    }

    if (body?.errors) {
      const validationErrors = Object.values(body.errors).flat();
      return validationErrors.join(' ');
    }

    if (body?.detail) {
      return body.detail;
    }

    if (body?.message) {
      return body.message;
    }

    if (body?.title) {
      return body.title;
    }

    return fallback;
  }
}