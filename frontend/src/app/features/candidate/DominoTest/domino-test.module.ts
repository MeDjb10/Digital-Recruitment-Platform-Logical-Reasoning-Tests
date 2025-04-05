import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

// Page components
import { TestsListComponent } from './pages/tests-list/tests-list.component';
import { DominoTestModernComponent } from './pages/domino-test-modern/domino-test-modern.component';

// Feature components
import { InteractiveDominoComponent } from './components/interactive-domino/interactive-domino.component';
import { SimpleDominoGridComponent } from './components/simple-domino-grid/simpleDominoGrid.component';
import { TestHeaderComponent } from './components/test-header/testHeader.component';
import { TestSidebarComponent } from './components/test-sidebar/testSidebar.component';
import { NavigationControlsComponent } from './components/navigation-controls/navigationControls.component';
import { HelpTooltipComponent } from './components/help-tooltip/helpTooltip.component';

// Services - these will be provided at the module level
import { DominoTestService } from './services/domino-test.service';

// Define routes for this feature module
const routes: Routes = [
  { path: '', component: TestsListComponent },
  { path: ':id', component: DominoTestModernComponent },
  { path: ':id/enhanced', component: DominoTestModernComponent },
  { path: ':id/results', component: TestsListComponent }, // Replace with your actual results component
];

@NgModule({
  declarations: [], // Empty since we're using standalone components
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    // Standalone components can be declared here if you want
    TestsListComponent,
    DominoTestModernComponent,
    InteractiveDominoComponent,
    SimpleDominoGridComponent,
    TestHeaderComponent,
    TestSidebarComponent,
    NavigationControlsComponent,
    HelpTooltipComponent,
  ],
  providers: [DominoTestService],
})
export class DominoTestModule {}
