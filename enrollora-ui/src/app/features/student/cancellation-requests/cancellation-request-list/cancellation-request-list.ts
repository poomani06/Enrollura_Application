
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EnrollmentResponse } from '../../../enrollments/enrollment.models';
import { EnrollmentService } from '../../../enrollments/enrollment.service';

import {
  CancellationResponse,
  CancellationStatus,
} from '../cancellation-request.model';
import { CancellationRequestService } from '../cancellation-request.service';

@Component({
  selector: 'app-cancellation-request-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cancellation-request-list.html',
  styleUrl: './cancellation-request-list.css',
})
export class CancellationRequestList implements OnInit {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly cancellationService = inject(CancellationRequestService);

  enrollments = signal<EnrollmentResponse[]>([]);
  cancellationRequests = signal<CancellationResponse[]>([]);

  isLoading = signal(false);
  isSubmitting = signal(false);

  errorMessage = signal('');
  successMessage = signal('');

  selectedEnrollmentId = signal<number | null>(null);
  reason = signal('');

  // Only Active enrollments without an existing Pending request
  eligibleEnrollments = computed(() => {
    return this.enrollments().filter((enrollment) => {
      const hasPendingRequest = this.cancellationRequests().some(
        (request) =>
          request.enrollmentId === enrollment.enrollmentId &&
          request.status === CancellationStatus.Pending,
      );

      return enrollment.status === 0 && !hasPendingRequest;
    });
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.enrollmentService.getMyEnrollments(1, 100).subscribe({
      next: (enrollmentResponse) => {
        this.enrollments.set(enrollmentResponse.items);

        this.cancellationService
          .getMyCancellationRequests(1, 100)
          .subscribe({
            next: (requestResponse) => {
              this.cancellationRequests.set(requestResponse.items);
              this.isLoading.set(false);
            },
            error: (error: HttpErrorResponse) => {
              this.handleError(error);
              this.isLoading.set(false);
            },
          });
      },
      error: (error: HttpErrorResponse) => {
        this.handleError(error);
        this.isLoading.set(false);
      },
    });
  }

  submitRequest(): void {
    const enrollmentId = this.selectedEnrollmentId();
    const trimmedReason = this.reason().trim();

    if (enrollmentId === null) {
      this.errorMessage.set('Please select an enrollment.');
      return;
    }

    if (!trimmedReason) {
      this.errorMessage.set('Please enter a cancellation reason.');
      return;
    }

    if (trimmedReason.length > 1000) {
      this.errorMessage.set('Reason cannot exceed 1000 characters.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.cancellationService
      .createCancellationRequest(enrollmentId, {
        reason: trimmedReason,
      })
      .subscribe({
        next: () => {
          this.successMessage.set(
            'Your cancellation request has been submitted successfully.',
          );

          this.selectedEnrollmentId.set(null);
          this.reason.set('');
          this.isSubmitting.set(false);

          this.loadData();
        },
        error: (error: HttpErrorResponse) => {
          this.handleError(error);
          this.isSubmitting.set(false);
        },
      });
  }

  statusLabel(status: CancellationStatus): string {
    switch (status) {
      case CancellationStatus.Pending:
        return 'Pending';
      case CancellationStatus.Approved:
        return 'Approved';
      case CancellationStatus.Rejected:
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }

  private handleError(error: HttpErrorResponse): void {
    const body = error.error;

    this.errorMessage.set(
      body?.detail ||
      body?.message ||
      body?.title ||
      'Something went wrong. Please try again.',
    );
  }
}
