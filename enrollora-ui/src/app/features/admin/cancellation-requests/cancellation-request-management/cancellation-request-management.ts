import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  CancellationRequestService
} from '../../../student/cancellation-requests/cancellation-request.service';

import {
  CancellationResponse,
  CancellationStatus,
  ReviewCancellationRequest
} from '../../../student/cancellation-requests/cancellation-request.model';

@Component({
  selector: 'app-cancellation-request-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cancellation-request-management.html',
  styleUrl: './cancellation-request-management.css'
})
export class CancellationRequestManagement implements OnInit {
  private readonly cancellationService = inject(CancellationRequestService);

  readonly requests = signal<CancellationResponse[]>([]);
  readonly isLoading = signal(false);
  readonly isReviewing = signal(false);

  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly search = signal('');
  readonly statusFilter = signal('');

  readonly pageNumber = signal(1);
  readonly pageSize = 10;
  readonly totalRecords = signal(0);
  readonly totalPages = signal(0);

  readonly selectedRequest = signal<CancellationResponse | null>(null);
  readonly selectedDecision = signal<'approve' | 'reject' | null>(null);
  readonly adminRemarks = signal('');

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const filters: {
      search?: string;
      status?: CancellationStatus;
    } = {};

    if (this.search().trim()) {
      filters.search = this.search().trim();
    }

    if (this.statusFilter() !== '') {
      filters.status = Number(this.statusFilter()) as CancellationStatus;
    }

    this.cancellationService
      .getCancellationRequests(this.pageNumber(), this.pageSize, filters)
      .subscribe({
        next: (response) => {
          this.requests.set(response.items);
          this.totalRecords.set(response.totalRecords);
          this.totalPages.set(response.totalPages);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.errorMessage.set(
            error.error?.detail ||
            error.error?.message ||
            'Unable to load cancellation requests.'
          );
          this.isLoading.set(false);
        }
      });
  }

  applyFilters(): void {
    this.pageNumber.set(1);
    this.loadRequests();
  }

  clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('');
    this.pageNumber.set(1);
    this.loadRequests();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }

    this.pageNumber.set(page);
    this.loadRequests();
  }

  openReview(
    request: CancellationResponse,
    decision: 'approve' | 'reject'
  ): void {
    this.selectedRequest.set(request);
    this.selectedDecision.set(decision);
    this.adminRemarks.set('');
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  cancelReview(): void {
    this.selectedRequest.set(null);
    this.selectedDecision.set(null);
    this.adminRemarks.set('');
  }

  submitReview(): void {
    const request = this.selectedRequest();
    const decision = this.selectedDecision();

    if (!request || !decision) {
      return;
    }

    const review: ReviewCancellationRequest = {
      adminRemarks: this.adminRemarks().trim()
    };

    this.isReviewing.set(true);
    this.errorMessage.set('');

    const action$ =
      decision === 'approve'
        ? this.cancellationService.approveCancellationRequest(
            request.cancellationRequestId,
            review
          )
        : this.cancellationService.rejectCancellationRequest(
            request.cancellationRequestId,
            review
          );

    action$.subscribe({
      next: () => {
        this.successMessage.set(
          decision === 'approve'
            ? 'Cancellation request approved successfully.'
            : 'Cancellation request rejected successfully.'
        );

        this.cancelReview();
        this.isReviewing.set(false);
        this.loadRequests();
      },
      error: (error) => {
        this.errorMessage.set(
          error.error?.detail ||
          error.error?.message ||
          'Unable to review the cancellation request.'
        );
        this.isReviewing.set(false);
      }
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

  readonly CancellationStatus = CancellationStatus;
}