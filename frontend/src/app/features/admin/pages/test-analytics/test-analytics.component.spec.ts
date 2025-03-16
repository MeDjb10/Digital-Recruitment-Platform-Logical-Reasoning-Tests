import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { TestAnalyticsComponent } from './test-analytics.component';
import { DominoTestService } from '../../../candidate/services/domino-test.service';

describe('TestAnalyticsComponent', () => {
  let component: TestAnalyticsComponent;
  let fixture: ComponentFixture<TestAnalyticsComponent>;
  let mockDominoTestService: jasmine.SpyObj<DominoTestService>;

  beforeEach(() => {
    mockDominoTestService = jasmine.createSpyObj('DominoTestService', [
      'getTestAnalytics',
    ]);
    mockDominoTestService.getTestAnalytics.and.returnValue(
      of({
        testId: 'd70',
        testName: 'Logical Reasoning Test (D-70)',
        totalAttempts: 42,
        averageScore: 75.5,
        averageTimeSpent: 1200,
        questionStats: [
          {
            questionId: 1,
            correctRate: 80,
            averageTimeSpent: 120,
            partialCorrectRate: 10,
            reversedAnswerRate: 5,
          },
        ],
        recentSubmissions: [
          {
            candidateId: 'c1',
            candidateName: 'John Doe',
            score: 85,
            timeSpent: 1100,
            submittedAt: '2023-09-01T10:00:00Z',
          },
        ],
      })
    );

    TestBed.configureTestingModule({
      imports: [RouterTestingModule, FormsModule],
      declarations: [TestAnalyticsComponent],
      providers: [
        { provide: DominoTestService, useValue: mockDominoTestService },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: 'd70' }),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(TestAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load test analytics on init', () => {
    expect(mockDominoTestService.getTestAnalytics).toHaveBeenCalledWith('d70');
    expect(component.analytics).toBeTruthy();
    if (component.analytics) {
      expect(component.analytics.testName).toBe(
        'Logical Reasoning Test (D-70)'
      );
    }
  });

  it('should filter submissions by name', () => {
    component.searchTerm = 'John';
    component.filterSubmissions();
    expect(component.filteredSubmissions.length).toBe(1);

    component.searchTerm = 'Invalid';
    component.filterSubmissions();
    expect(component.filteredSubmissions.length).toBe(0);
  });

  it('should sort submissions', () => {
    // Add more submission data for testing
    if (component.analytics) {
      component.analytics.recentSubmissions = [
        {
          candidateId: 'c1',
          candidateName: 'John Doe',
          score: 85,
          timeSpent: 1100,
          submittedAt: '2023-09-01T10:00:00Z',
        },
        {
          candidateId: 'c2',
          candidateName: 'Jane Smith',
          score: 90,
          timeSpent: 900,
          submittedAt: '2023-09-02T10:00:00Z',
        },
      ];
    }
    if (component.analytics) {
      component.filteredSubmissions = [
        ...component.analytics.recentSubmissions,
      ];
    }

    // Test sorting by score (highest first)
    component.sortOption = 'score-high';
    component.sortSubmissions();
    expect(component.filteredSubmissions[0].score).toBe(90);

    // Test sorting by time (fastest first)
    component.sortOption = 'time-fast';
    component.sortSubmissions();
    expect(component.filteredSubmissions[0].timeSpent).toBe(900);
  });

  it('should format time correctly', () => {
    expect(component.formatTime(3665)).toBe('1h 1m 5s');
    expect(component.formatTime(65)).toBe('1m 5s');
  });
});
