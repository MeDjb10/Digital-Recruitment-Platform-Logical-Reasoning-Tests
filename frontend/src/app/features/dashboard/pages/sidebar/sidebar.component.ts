import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-sidebar',
  imports: [RouterModule,CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  
  isExpanded = true;
  tests = [
    {
      name: 'Raisonnement Logique',
      route: 'RaisonnementLogique',
      expanded: false,
      subsections: [
        { name: 'Statistique', route: 'Statistique' },
        { name: 'Users', route: 'Users' },
        { name: 'Tests', route: 'Tests' }
      ]
    },
    {
      name: 'Test B',
      route: 'test-b',
      expanded: false,
      subsections: [
        { name: 'General Stats', route: 'general-stats' },
        { name: 'List of Users', route: 'users' },
        { name: 'List of Tests', route: 'tests' }
      ]
    },
    {
      name: 'Test C',
      route: 'test-c',
      expanded: false,
      subsections: [
        { name: 'General Stats', route: 'general-stats' },
        { name: 'List of Users', route: 'users' },
        { name: 'List of Tests', route: 'tests' }
      ]
    },
    {
      name: 'Test D',
      route: 'test-d',
      expanded: false,
      subsections: [
        { name: 'General Stats', route: 'general-stats' },
        { name: 'List of Users', route: 'users' },
        { name: 'List of Tests', route: 'tests' }
      ]
    }
  ];

  toggleTest(test: any) {
    test.expanded = !test.expanded;
  }
}
