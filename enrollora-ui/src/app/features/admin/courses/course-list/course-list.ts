import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SaveCourseRequest } from '../course.models';
import { CourseService } from '../course.service';
import { CourseResponse } from '../course.models';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './course-list.html',
  styleUrl: './course-list.css',
})
export class CourseListComponent implements OnInit {
  private courseService = inject(CourseService);

  // Signals
  courses = signal<CourseResponse[]>([]);

  isLoading = signal(false);
  errorMessage = signal('');
  // Add Course
isFormOpen = signal(false);
isSaving = signal(false);
editingCourseId = signal<number | null>(null);
isDeactivating = signal(false);
selectedCourse = signal<CourseResponse | null>(null);
courseForm: SaveCourseRequest = {
  courseName: '',
  duration: '',
  fees: 0,
  capacity: 1,
  isActive: true,
};

successMessage = signal('');
  pageNumber = signal(1);
  pageSize = signal(10);

  totalRecords = signal(0);
  totalPages = signal(0);

  ngOnInit(): void {
    this.loadCourses();
  }

  // Load courses from backend
  loadCourses(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.courseService.getCourses(this.pageNumber(), this.pageSize()).subscribe({
      next: (response) => {
        this.courses.set(response.items);

        this.totalRecords.set(response.totalRecords);
        this.totalPages.set(response.totalPages);

        this.isLoading.set(false);
      },

      error: (error) => {
        console.error('Error loading courses:', error);

        this.errorMessage.set('Unable to load courses.');

        this.isLoading.set(false);
      },
    });
  }

  // Navigate to next page
  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update((page) => page + 1);

      this.loadCourses();
    }
  }

  // Navigate to previous page
  previousPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update((page) => page - 1);

      this.loadCourses();
    }
  }
  openAddForm(): void {
  this.editingCourseId.set(null);

  this.courseForm = {
    courseName: '',
    duration: '',
    fees: 0,
    capacity: 1,
    isActive: true,
  };

  this.errorMessage.set('');
  this.successMessage.set('');
  this.isFormOpen.set(true);
}

closeForm(): void {
  this.isFormOpen.set(false);
}

saveCourse(): void {
  if (
    !this.courseForm.courseName.trim() ||
    !this.courseForm.duration.trim() ||
    this.courseForm.fees < 0 ||
    this.courseForm.capacity < 1
  ) {
    this.errorMessage.set('Please enter valid course details.');
    return;
  }

  this.isSaving.set(true);
this.errorMessage.set('');

const courseId = this.editingCourseId();

const request = courseId !== null
  ? this.courseService.updateCourse(courseId, this.courseForm)
  : this.courseService.createCourse(this.courseForm);

request.subscribe({
  next: () => {
    this.isSaving.set(false);
    this.isFormOpen.set(false);

    this.successMessage.set(
      courseId !== null
        ? 'Course updated successfully.'
        : 'Course added successfully.'
    );

    this.loadCourses();
  },
  error: (error) => {
    console.error('Error saving course:', error);

    this.isSaving.set(false);

    this.errorMessage.set(
      error.error?.detail ||
      error.error?.message ||
      'Unable to save course.'
    );
  },
});
}
openEditForm(course: CourseResponse): void {
  this.errorMessage.set('');
  this.successMessage.set('');

  this.courseService.getCourseById(course.courseId).subscribe({
    next: (response) => {
      this.editingCourseId.set(response.courseId);

      this.courseForm = {
        courseName: response.courseName,
        duration: response.duration,
        fees: response.fees,
        capacity: response.capacity,
        isActive: response.isActive,
      };

      this.isFormOpen.set(true);
    },
    error: (error) => {
      console.error('Error loading course:', error);
      this.errorMessage.set('Unable to load course details.');
    },
  });
}
openDeactivateConfirmation(course: CourseResponse): void {
  this.selectedCourse.set(course);
  this.errorMessage.set('');
}
closeDeactivateConfirmation(): void {
  if (this.isDeactivating()) {
    return;
  }

  this.selectedCourse.set(null);
}
deactivateCourse(): void {
  const course = this.selectedCourse();

  if (!course || this.isDeactivating()) {
    return;
  }

  this.isDeactivating.set(true);
  this.errorMessage.set('');

  this.courseService.deactivateCourse(course.courseId).subscribe({
    next: () => {
      this.isDeactivating.set(false);
      this.selectedCourse.set(null);

      this.loadCourses();
    },

    error: (error) => {
      console.error('Error deactivating course:', error);

      this.isDeactivating.set(false);

      this.errorMessage.set(
        error.error?.detail ||
        error.error?.message ||
        'Unable to deactivate course.',
      );
    },
  });
}
}
