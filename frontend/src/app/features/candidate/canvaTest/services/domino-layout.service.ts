import { inject, Injectable } from '@angular/core';

import { BehaviorSubject } from 'rxjs';

import { MockDataService } from '../../DominoTest/services/mock-data.service';
import { DominoPosition } from '../../DominoTest/models/domino.model';

export interface DominoLayout {
  id: string;
  name: string;
  description: string;
  type: 'row' | 'grid' | 'rhombus' | 'custom' | 'rhombus-large' | 'spiral';
  dominos: DominoPosition[];
  width: number;
  height: number;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class DominoLayoutService {
  private layoutsSubject = new BehaviorSubject<DominoLayout[]>([]);
  public layouts$ = this.layoutsSubject.asObservable();

  private mockDataService = inject(MockDataService);

  constructor() {
    this.loadLayoutsFromStorage();
  }

  private loadLayoutsFromStorage(): void {
    const storedLayouts = localStorage.getItem('dominoLayouts');
    if (storedLayouts) {
      try {
        const layouts = JSON.parse(storedLayouts);
        this.layoutsSubject.next(layouts);
      } catch (e) {
        console.error('Error parsing stored layouts:', e);
        this.layoutsSubject.next([]);
      }
    }
  }

  saveLayout(layout: Partial<DominoLayout>): void {
    const currentLayouts = this.layoutsSubject.value;

    // Create a new layout
    const newLayout: DominoLayout = {
      id: layout.id || Date.now().toString(),
      name: layout.name || 'Unnamed Layout',
      description: layout.description || '',
      type: layout.type || 'custom',
      dominos: layout.dominos || [],
      width: layout.width || 1000,
      height: layout.height || 700,
      createdAt: layout.createdAt || new Date().toISOString(),
    };

    // Add or update layout
    const index = currentLayouts.findIndex((l) => l.id === newLayout.id);
    if (index >= 0) {
      // Update existing layout
      currentLayouts[index] = newLayout;
    } else {
      // Add new layout
      currentLayouts.push(newLayout);
    }

    // Update storage and subject
    localStorage.setItem('dominoLayouts', JSON.stringify(currentLayouts));
    this.layoutsSubject.next([...currentLayouts]);
  }

  deleteLayout(layoutId: string): void {
    const currentLayouts = this.layoutsSubject.value;
    const filteredLayouts = currentLayouts.filter((l) => l.id !== layoutId);

    localStorage.setItem('dominoLayouts', JSON.stringify(filteredLayouts));
    this.layoutsSubject.next(filteredLayouts);
  }

  getLayout(layoutId: string): DominoLayout | undefined {
    return this.layoutsSubject.value.find((l) => l.id === layoutId);
  }

  // Method to convert layout to test question format
  convertToTestQuestion(layout: DominoLayout, questionId: number): any {
    const maxRow = Math.max(...layout.dominos.map((d) => d.row)) + 1;
    const maxCol = Math.max(...layout.dominos.map((d) => d.col)) + 1;

    // Find the editable domino
    const editableDomino = layout.dominos.find((d) => d.isEditable === true);

    // If no editable domino found, log a warning
    if (!editableDomino) {
      console.warn(
        'No editable domino found in layout. The question will not work correctly.'
      );
    }
    const correctAnswer = {
      dominoId: editableDomino?.id || 0,
      topValue: 1, // Default value - these will need to be set by the admin
      bottomValue: 2,
    };

    // For now, we'll prompt the user to set the correct answer values
    const userSetTop = prompt(
      'What should be the correct TOP value for the answer?',
      '3'
    );
    const userSetBottom = prompt(
      'What should be the correct BOTTOM value for the answer?',
      '4'
    );

    if (userSetTop !== null && userSetBottom !== null) {
      correctAnswer.topValue = parseInt(userSetTop) || 3;
      correctAnswer.bottomValue = parseInt(userSetBottom) || 4;
    }

    // Create a deep copy of the dominos to avoid reference issues
    const dominosCopy = layout.dominos.map((d) => ({
      ...d,
      questionId,
      // Ensure critical properties for custom layouts are preserved
      exactX: d.exactX,
      exactY: d.exactY,
      angle: d.angle,
      scale: d.scale,
      // Ensure isEditable is boolean
      isEditable: !!d.isEditable,
    }));

    return {
      id: questionId,
      instruction:
        layout.description ||
        'Complete the pattern by selecting the correct values for the highlighted domino.',
      title: layout.name,
      dominos: dominosCopy,
      gridLayout: {
        rows: Math.max(4, maxRow),
        cols: Math.max(4, maxCol),
        width: layout.width, // Add width for custom layouts
        height: layout.height, // Add height for custom layouts
      },
      pattern: layout.description,
      dominoLayout: layout.type,
      isCircularPattern: layout.type === 'spiral' || layout.type === 'custom',
      correctAnswer: {
        dominoId: correctAnswer.dominoId,
        topValue: correctAnswer.topValue,
        bottomValue: correctAnswer.bottomValue,
      },
    };
  }

  // New method to add a layout to the mock tests
  // Inside the addLayoutToMockTests method
  addLayoutToMockTests(layout: DominoLayout): void {
    try {
      // Convert the layout to a test question
      const questionId = Date.now(); // Use timestamp as unique question ID
      const mockQuestion = this.convertToTestQuestion(layout, questionId);

      // Store the custom questions in localStorage
      const storageKey = 'customD70Questions';
      let customQuestions = [];
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        customQuestions = JSON.parse(stored);
      }

      customQuestions.push(mockQuestion);
      localStorage.setItem(storageKey, JSON.stringify(customQuestions));

      // Add to in-memory service (this will be lost on refresh)
      this.addToD70Test(mockQuestion);

      console.log('Added layout to custom test questions:', mockQuestion);
      console.log(
        'The layout has been saved to localStorage and added to the D70 test'
      );
    } catch (error) {
      console.error('Error adding layout to mock tests:', error);
    }
  }

  // New method to add a question directly to the D70 test
  private addToD70Test(question: any): void {
    try {
      // Get a reference to the D70 test in the MockDataService
      const d70Test = this.mockDataService['d70Test'];

      if (d70Test) {
        // Update the question ID to ensure it doesn't conflict with existing ones
        const highestId = Math.max(...d70Test.questions.map((q) => q.id));
        question.id = highestId + 1;

        // Add the question to the test
        d70Test.questions.push(question);

        // Update the total question count
        d70Test.totalQuestions = d70Test.questions.length;

        console.log(`Question added to D70 Test with ID: ${question.id}`);
      } else {
        console.warn('D70 Test not found in MockDataService');
      }
    } catch (error) {
      console.error('Error adding question to D70 Test:', error);
    }
  }
}
