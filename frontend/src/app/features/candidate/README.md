# Domino Testing Feature

This module implements the interactive domino logical reasoning tests for the Digital Recruitment Platform.

## Components Structure

### Core Components

- `unified-domino` - The base domino component that renders SVG dominos with interactive capabilities
- `domino-grid` - Handles layout of multiple dominos in different patterns
- `test-question` - Displays a full test question with dominos and instructions
- `test-timer` - Timer component with warning and completion events

### Pages

- `test-selection` - Landing page showing available tests
- `domino-test` - Main test interface with questions, navigation, and submission flow
- `test-completion` - Results page showing score and feedback

## Usage

### Basic Example

```typescript
import { TestSelectionComponent } from "./features/candidate/pages/test-selection/test-selection.component";

// Add to routes
const routes: Routes = [
  { path: "tests", component: TestSelectionComponent },
  // Other routes...
];
```

### Testing a Component Individually

```typescript
import { DominoGridComponent } from "./features/candidate/components/domino-grid/domino-grid.component";

@Component({
  selector: "app-debug",
  template: ` <app-domino-grid [dominos]="myDominos" [showGridLines]="true" [questionId]="1" (answerChanged)="onAnswerChanged($event)"></app-domino-grid> `,
})
export class DebugComponent {
  myDominos = [
    { id: 1, row: 0, col: 0, topValue: 3, bottomValue: 2, isEditable: false },
    { id: 2, row: 0, col: 1, topValue: null, bottomValue: null, isEditable: true },
  ];

  onAnswerChanged(event) {
    console.log("Answer:", event);
  }
}
```

## Configuration

Configuration values are centralized in `utils/constants.ts`. You can modify test parameters,
visual styles, and other settings there.

## Analytics

The test components collect detailed analytics about user interaction:

- Time spent per question
- Number of attempts per domino
- Navigation patterns (question visits)
- Answer changes

This data is submitted along with the test answers for analysis.
